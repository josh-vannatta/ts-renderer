import { GLSLStruct } from "./GLSLBuilder";

class ComputeShaderBuilder {
    constructor(private struct: GLSLStruct) {}

    build(): string {
        // Generate WGSL shader code dynamically based on the struct
        const wgslShader = `
        struct ${this.struct.name} {
            ${this.generateStructDefinition(this.struct)}
        };

        @group(0) @binding(0) var<storage, read_write> inputData: array<vec4>;
        @group(0) @binding(1) var<uniform> uParams: vec4;

        fn decode${this.struct.name}(texelIndex: i32) -> ${this.struct.name} {
            var data: ${this.struct.name};
            let texel = inputData[texelIndex];
            ${this.generateDecodeBody(this.struct)}
            return data;
        }

        fn encode${this.struct.name}(data: ${this.struct.name}, texelIndex: i32) {
            ${this.generateEncodeBody(this.struct)}
        }

        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = i32(global_id.x);
            var data = decode${this.struct.name}(index);
            ${this.struct.name}Process(data);  // Call user-defined process function
            encode${this.struct.name}(data, index);
        }
        `;

        return wgslShader;
    }

    private generateStructDefinition(struct: GLSLStruct): string {
        let definition = '';
        for (const key in struct.definition) {
            const value = struct.definition[key];
            if (value instanceof GLSLStruct) {
                definition += `${this.generateStructDefinition(value)};\n`;
            } else {
                definition += `${value} ${key};\n`;
            }
        }
        return definition;
    }

    private generateDecodeBody(struct: GLSLStruct): string {
        let body = '';
        let index = 0;
        for (const key in struct.definition) {
            const value = struct.definition[key];
            if (value instanceof GLSLStruct) {
                body += `data.${key} = decode${value.name}(texelIndex);\n`;
            } else {
                body += `data.${key} = texel.${'xyzw'[index % 4]};\n`;
                if (++index % 4 === 0) body += `texelIndex += 1; texel = inputData[texelIndex];\n`;
            }
        }
        return body;
    }

    private generateEncodeBody(struct: GLSLStruct): string {
        let body = '';
        let index = 0;
        for (const key in struct.definition) {
            const value = struct.definition[key];
            if (value instanceof GLSLStruct) {
                body += `encode${value.name}(data.${key}, texelIndex);\n`;
            } else {
                body += `inputData[texelIndex].${'xyzw'[index % 4]} = data.${key};\n`;
                if (++index % 4 === 0) body += `texelIndex += 1;\n`;
            }
        }
        return body;
    }
}


export class ComputeShader<T> {
    private pipeline: GPUComputePipeline;
    private uniformBuffer: GPUBuffer;
    private storageBuffer: GPUBuffer;
    private bindGroup: GPUBindGroup;
    private static device: GPUDevice | null = null;
    private static adapter: GPUAdapter | null = null;

    constructor(private data: T[], private struct: GLSLStruct) {
        this.compile();
    }

    // Static method to initialize the WebGPU device and adapter if they don't exist
    private static async initDevice() {
        if (!ComputeShader.device) {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) throw new Error('Failed to request WebGPU adapter');
            ComputeShader.adapter = adapter;

            const device = await adapter.requestDevice();
            if (!device) throw new Error('Failed to request WebGPU device');
            ComputeShader.device = device;
        }
    }

    private get device(): GPUDevice {
        if (!ComputeShader.device) {
            throw new Error('WebGPU device is not initialized');
        }
        return ComputeShader.device;
    }

    // Compiles the compute pipeline and sets up buffers
    private async compile() {
        // Ensure the device is initialized before compiling the shader
        await ComputeShader.initDevice();

        const shaderCode = new ComputeShaderBuilder(this.struct).build();
        const shaderModule = this.device.createShaderModule({
            code: shaderCode
        });

        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        // Uniform and storage buffer setup
        this.uniformBuffer = this.device.createBuffer({
            size: 16, // Example: vec4 size for uniform data
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.storageBuffer = this.device.createBuffer({
            size: this.struct.getVec4Count() * this.data.length * 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.storageBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }
            ]
        });
    }

    public run() {
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(this.data.length);

        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }

    public readData(): Promise<T[]> {
        const readBuffer = this.device.createBuffer({
            size: this.storageBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.storageBuffer, 0, readBuffer, 0, this.storageBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        return new Promise((resolve) => {
            readBuffer.mapAsync(GPUMapMode.READ).then(() => {
                const mappedArray = new Float32Array(readBuffer.getMappedRange());
                const result = this.deserialize(mappedArray);
                readBuffer.unmap();
                resolve(result);
            });
        });
    }

    private serialize(data: T[]): Float32Array {
        const floatArray = new Float32Array(this.struct.getVec4Count() * data.length * 4);
        let index = 0;
        data.forEach(item => {
            const serialized = this.struct.serialize(item);
            serialized.forEach(value => floatArray[index++] = value);
        });
        return floatArray;
    }

    private deserialize(data: Float32Array): T[] {
        const deserializedData: T[] = [];
        for (let i = 0; i < data.length; i += this.struct.getVec4Count() * 4) {
            const slice = data.slice(i, i + this.struct.getVec4Count() * 4);
            deserializedData.push(this.struct.deserialize(slice));
        }
        return deserializedData;
    }
}
