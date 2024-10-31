import { GLShader } from './GLShader';

export enum GLType {
    Float = 'float',
    Int = 'int',
    UInt = 'uint',
    Vec2 = 'vec2',
    Vec3 = 'vec3',
    Vec4 = 'vec4',
    Mat3 = 'mat3',
    Mat4 = 'mat4',
    Sampler2D = 'sampler2D',
    SamplerCube = 'samplerCube',
    Bool = 'bool',
    Void = 'void'
}

export interface GLBufferOptions {
    size: number;
    type?: number;
    stride?: number;
    offset?: number;
}


type GLProgramOptions = {
    onLinkError?: (error: string) => void;
};

export class GLProgram {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
    private attributeLocations: Map<string, number> = new Map();
    private onLinkError?: (error: string) => void;

    constructor(gl: WebGL2RenderingContext, vertexShader: GLShader, fragmentShader: GLShader, options: GLProgramOptions = {}) {
        this.gl = gl;
        this.onLinkError = options.onLinkError;
        this.program = this.linkProgram(vertexShader, fragmentShader);
        this.initializeProgram()
    }

    private initializeProgram() {
        if (this.program == null)
            return;

        const attributeCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attributeCount; i++) {
            const info = this.gl.getActiveAttrib(this.program, i);
            if (info) {
                const location = this.gl.getAttribLocation(this.program, info.name);
                this.attributeLocations.set(info.name, location);
            }
        }
    }

    // Link the shaders into a single program and handle errors
    private linkProgram(vertexShader: GLShader, fragmentShader: GLShader): WebGLProgram | null {
        const program = this.gl.createProgram();
        if (!program) throw new Error("Unable to create WebGL program.");

        this.gl.attachShader(program, vertexShader.getShader());
        this.gl.attachShader(program, fragmentShader.getShader());
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program) || "Unknown error";
            this.gl.deleteProgram(program);
            if (this.onLinkError) {
                this.onLinkError(`Program linking error: ${error}`);
            }
            throw new Error(`Program linking error: ${error}`);
        }

        return program;
    }

    // Use the program in the current WebGL context
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        } else {
            throw new Error("Program not available.");
        }
    }

    setBuffer(attributeName: string, data: Float32Array, options: GLBufferOptions) {
        const { size, type = this.gl.FLOAT, stride = 0, offset = 0 } = options;
        
        const buffer = this.gl.createBuffer();

        if (!buffer) {
            throw new Error("Failed to create buffer");
        }
    
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    
        const attributeLocation = this.attributeLocations.get(attributeName);
        if (attributeLocation === undefined) {
            throw new Error(`Attribute ${attributeName} not found in program`);
        }
    
        this.gl.enableVertexAttribArray(attributeLocation);
        this.gl.vertexAttribPointer(
            attributeLocation,
            size,
            type,
            false,
            stride * Float32Array.BYTES_PER_ELEMENT,
            offset * Float32Array.BYTES_PER_ELEMENT
        );
    }
    
    setAttributeLocation(attributeName: string, location: number) {
        this.attributeLocations.set(attributeName, location);
    }

    // Set a uniform value based on the GLSLType
    setUniform(name: string, type: GLType, value: any) {
        const location = this.getUniformLocation(name);

        switch (type) {
            case GLType.Float:
                this.gl.uniform1f(location, value);
                break;
            case GLType.Int:
            case GLType.UInt:
                this.gl.uniform1i(location, value);
                break;
            case GLType.Bool:
                this.gl.uniform1i(location, value ? 1 : 0);
                break;
            case GLType.Vec2:
                this.gl.uniform2fv(location, value);
                break;
            case GLType.Vec3:
                this.gl.uniform3fv(location, value);
                break;
            case GLType.Vec4:
                this.gl.uniform4fv(location, value);
                break;
            case GLType.Mat3:
                this.gl.uniformMatrix3fv(location, false, value);
                break;
            case GLType.Mat4:
                this.gl.uniformMatrix4fv(location, false, value);
                break;
            case GLType.Sampler2D:
            case GLType.SamplerCube:
                this.gl.uniform1i(location, value); // Samplers use integer texture units
                break;
            default:
                throw new Error(`Unsupported uniform type: ${type}`);
        }
    }

    // Get or cache uniform location for efficiency
    private getUniformLocation(name: string): WebGLUniformLocation {
        if (!this.uniformLocations.has(name)) {
            const location = this.gl.getUniformLocation(this.program!, name);
            if (!location) throw new Error(`Uniform ${name} not found in shader program.`);
            this.uniformLocations.set(name, location);
        }
        return this.uniformLocations.get(name)!;
    }

    // Get or cache attribute location for efficiency
    private getAttributeLocation(name: string): number {
        if (!this.attributeLocations.has(name)) {
            const location = this.gl.getAttribLocation(this.program!, name);
            if (location === -1) throw new Error(`Attribute ${name} not found in shader program.`);
            this.attributeLocations.set(name, location);
        }
        return this.attributeLocations.get(name)!;
    }

    // Cleanup program resources
    dispose() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;
            console.info("Disposed shader program.");
        }
    }
}
