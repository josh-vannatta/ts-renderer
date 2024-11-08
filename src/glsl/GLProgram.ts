import { GLContext } from './GLContext';
import { GLDrawMode } from './GLRenderable';
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

export class GLProgram {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
    private attributeLocations: Map<string, number> = new Map();
    private onLinkError?: (error: string) => void;

    constructor(private context: GLContext = new GLContext()) {
        this.gl = context.gl;
    }

    public bindGL(context: GLContext) {
        this.gl = context.gl;
        this.context = context;
    }

    // Link the shaders into a single program and handle errors
    public initialize(vertexShader: GLShader, fragmentShader: GLShader) {
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

        this.program = program;

        const attributeCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);

        for (let i = 0; i < attributeCount; i++) {
            const info = this.gl.getActiveAttrib(program, i);

            if (info) {
                const location = this.getAttributeLocation(info.name);

                this.attributeLocations.set(info.name, location);
            }
        }
    }

    // Use the program in the current WebGL context
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        } else {
            throw new Error("Program not available.");
        }
    }


    // Utility to create and return a framebuffer with an attached texture
    createTexture(data: Float32Array) {
        const texture = this.gl.createTexture();

        if (!texture) throw new Error("Failed to create texture");

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA32F,
            this.context.width,
            this.context.height,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            data  
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        return texture;
    }

    setBuffer(attributeName: string, data: Float32Array, options: GLBufferOptions) {
        if (!this.program) throw new Error("Unable to bind GLBuffer: program uninitialized");

        const { size, type = this.gl.FLOAT, stride = 0, offset = 0 } = options;
        const buffer = this.gl.createBuffer();

        if (!buffer) {
            throw new Error("Failed to create GLBuffer");
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

    readData(framebuffer: WebGLFramebuffer, width?: number, height?: number) {
        if (!width)
            width = this.context?.width ?? 0;
        
        if (!height)
            height = this.context?.height ?? 0;

        const pixelData = new Float32Array(width * height * 4);

        try {
            this.bindFrameBuffer(framebuffer);
            this.gl.readPixels(
                0, 0,                  // Start at the lower-left corner
                width, height,         // Read the entire viewport
                this.gl.RGBA,          // RGBA format
                this.gl.FLOAT,         // Each component as a byte
                pixelData              // Output array
            );
    
            this.bindFrameBuffer(undefined);
        } catch (error) {
            console.error("Could not read data: " + error)
        }

        return pixelData;
    }

    createFrameBuffer() {
        return this.gl.createFramebuffer();
    }

    bindFrameBuffer(framebuffer?: WebGLFramebuffer, onBind?: () => void) {
        if (!framebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            return;
        }

        // Bind framebuffer to write texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        onBind?.();
    
        // Check framebuffer status
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);

        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Framebuffer is incomplete: ' + status);
        } 
    }

    bindTexture(writeTexture: WebGLTexture, readTexture: WebGLTexture | null, attachment: number = 0) {
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0 + attachment, this.gl.TEXTURE_2D, writeTexture, 0);

        if (!!readTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, readTexture ?? writeTexture);
        }
    }

    drawArrayBuffer(drawMode: GLDrawMode, length: number, indexBuffer: WebGLBuffer | null) {
        if (indexBuffer && length) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this.gl.drawElements(drawMode, length, this.gl.UNSIGNED_SHORT, 0);
        } else if (length) {
            this.gl.drawArrays(drawMode, 0, length);
        }
    }

    setArrayBuffer(buffer: Uint16Array) {
        const glBuffer = this.gl.createBuffer();

        if (!glBuffer) {
            throw new Error("Failed to create index buffer");
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, glBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, buffer, this.gl.STATIC_DRAW);

        return glBuffer;
    }
    
    setAttributeLocation(attributeName: string, location: number) {
        if (!this.program) throw new Error("Unable to set attribute: program uninitialized");

        this.attributeLocations.set(attributeName, location);
    }

    // Set a uniform value based on the GLSLType
    setUniform(name: string, type: GLType, value: any) {
        if (!this.program) throw new Error("Unable to set uniform: program uninitialized");

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
        if (!this.program) throw new Error("Unable to getAttribute: program uninitialized");

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
        }
    }
}
