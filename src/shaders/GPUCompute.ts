import { Vector3, Vector4 } from "three";
import { GLSLBuilder, GLSLSchema, GLSLType } from "./GLSLBuilder";

export class GPUComputeShader<T> {
    private device: GPUDevice;
    private computePipeline: GPUComputePipeline;
    private bindGroupLayout: GPUBindGroupLayout;
    private bindGroup: GPUBindGroup;
    private uniformBuffer: GPUBuffer;
    private storageBuffer: GPUBuffer;
    private outputBuffer: GPUBuffer;
    private readBuffer: GPUBuffer;
    private uniformData: Float32Array;
    private bufferData: Float32Array;
    private program: (data: string) => string;
    private initialized: boolean = false;

    constructor(data: T[], private schema: GLSLSchema) {
        schema.getVec4Count();
        this.bufferData = this.serialize(data);
        this.uniformData = new Float32Array(16); // Reserve space for example uniforms
        this.program = () => "";
    }

    // Request GPU device and set up pipeline
    public async init() {
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported on this browser.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Failed to get GPU adapter.");
        }

        this.device = await adapter.requestDevice();

        this.initBuffers();
        this.initPipeline();
        this.initialized = true;
    }

    // Serialize data array into Float32Array format
    private serialize(data: T[]): Float32Array {
        const serializedArrays = data.map((item) => this.schema.serialize(item));

        return serializedArrays.reduce((acc, current) => {
            const combined = new Float32Array(acc.length + current.length);
            combined.set(acc);
            combined.set(current, acc.length);
            return combined;
        }, new Float32Array(0));
    }

    // Parse GLSLStruct to WGSL struct format
    private parseGLSLStructToWGSL(struct: GLSLSchema): string {
        let structDefinition = `struct ${struct.name} {\n`;
        
        for (const [key, type] of Object.entries(struct.definition)) {
            structDefinition += `  ${key}: ${this.mapGLSLTypeToWGSL(type as GLSLType)},\n`;
        }

        structDefinition += `};\n`;
        return structDefinition;
    }

    // Map GLSL types to WGSL types
    private mapGLSLTypeToWGSL(type: GLSLType): string {
        switch (type) {
            case GLSLType.Float:
            case GLSLType.Int:
            case GLSLType.UInt:
            case GLSLType.Bool:
                return "f32";
            case GLSLType.Vec2:
                return "vec2<f32>";
            case GLSLType.Vec3:
                return "vec3<f32>";
            case GLSLType.Vec4:
                return "vec4<f32>";
            case GLSLType.Mat3:
                return "mat3x3<f32>";
            case GLSLType.Mat4:
                return "mat4x4<f32>";
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
    }

    // Initialize GPU buffers for uniforms, input, and output data
    private initBuffers() {
        this.uniformBuffer = this.device.createBuffer({
            size: this.uniformData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    
        // Storage buffer for computation (read-write)
        this.storageBuffer = this.device.createBuffer({
            size: this.bufferData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        // Output buffer for computation results, with MapRead to allow reading
        this.outputBuffer = this.device.createBuffer({
            size: this.bufferData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_READ,
        });

        // Read buffer to retrieve data from outputBuffer for CPU access
        this.readBuffer = this.device.createBuffer({
            size: this.bufferData.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    // Initialize the compute pipeline and create bind group layout
    private initPipeline() {
        const minBindingSize = this.bufferData.byteLength; // Correct binding size

        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform", minBindingSize: 16 } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage", minBindingSize } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage", minBindingSize } },
            ],
        });

        this.computePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
            compute: {
                module: this.device.createShaderModule({
                    code: this.generateShaderCode(),
                }),
                entryPoint: "main",
            },
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.storageBuffer } },
                { binding: 2, resource: { buffer: this.outputBuffer } },
            ],
        });
    }

    // Generate shader code using WGSL format
    private generateShaderCode(): string {
        const structDefinition = this.parseGLSLStructToWGSL(this.schema);

        return GLSLBuilder.autoFormat(`
            ${structDefinition}
            @group(0) @binding(0) var<uniform> u_data: vec4<f32>;
            @group(0) @binding(1) var<storage, read> inputBuffer: array<${this.schema.name}>;
            @group(0) @binding(2) var<storage, read_write> outputBuffer: array<${this.schema.name}>;

            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                let i = id.x;
                if (i < arrayLength(&inputBuffer)) {
                    var data = inputBuffer[i];
                    ${this.program("data")}
                    outputBuffer[i] = data;
                }
            }
        `);
    }

    // Set user-defined compute shader program
    public setProgram(program: (data: string) => string) {
        this.program = program;
    }

    // Run the compute shader
    public async run() {
        if (!this.initialized) {
            throw new Error("Compute shader not initialized. Call init() first.");
        }

        const commandEncoder = this.device.createCommandEncoder();
        this.device.queue.writeBuffer(this.storageBuffer, 0, this.bufferData);

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.bindGroup);

        const dispatchCount = Math.ceil(this.bufferData.length / 64);
        passEncoder.dispatchWorkgroups(dispatchCount);
        passEncoder.end();

        // Copy from outputBuffer to readBuffer to enable CPU access
        commandEncoder.copyBufferToBuffer(
            this.outputBuffer,
            0,
            this.readBuffer,
            0,
            this.bufferData.byteLength
        );

        this.device.queue.submit([commandEncoder.finish()]);
    }

    // Read data from the output buffer
    public async readData(): Promise<T[]> {
        await this.readBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = this.readBuffer.getMappedRange();
        const resultArray = new Float32Array(mappedRange);

        const data = this.deserialize(resultArray);
        this.readBuffer.unmap();

        return data;
    }

    // Deserialize Float32Array back into original structured data
    private deserialize(data: Float32Array): T[] {
        const entities: any[] = [];
        for (let i = 0; i < data.length; i += this.bufferData.length) {
            const subArray = data.subarray(i, i + this.bufferData.length);
            const entity = this.schema.deserialize(subArray);
            entities.push(entity);
        }
        return entities;
    }

    // Update uniform values and write to GPU
    public updateUniform(name: string, value: number | Vector3 | Vector4) {
        if (typeof value === "number") {
            this.uniformData[0] = value;
        } else if (value instanceof Vector3) {
            this.uniformData.set([value.x, value.y, value.z]);
        } else if (value instanceof Vector4) {
            this.uniformData.set([value.x, value.y, value.z, value.w]);
        }
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);
    }
}
