import { GLContext } from './GLContext';
import { GLShader, ShaderType } from './GLShader';
import { GLBufferOptions, GLProgram, GLType } from './GLProgram';

export enum GLDrawMode {
    POINTS = WebGL2RenderingContext.POINTS,
    LINES = WebGL2RenderingContext.LINES,
    LINE_STRIP = WebGL2RenderingContext.LINE_STRIP,
    LINE_LOOP = WebGL2RenderingContext.LINE_LOOP,
    TRIANGLES = WebGL2RenderingContext.TRIANGLES,
    TRIANGLE_STRIP = WebGL2RenderingContext.TRIANGLE_STRIP,
    TRIANGLE_FAN = WebGL2RenderingContext.TRIANGLE_FAN
}

export abstract class GLRenderable {
    protected gl: WebGL2RenderingContext;
    protected context: GLContext;
    private indexBuffer: WebGLBuffer | null = null;
    public program: GLProgram | null = null;
    protected uniforms: Map<string, { type: GLType, value: any }> = new Map();
    
    private drawMode: GLDrawMode;
    private indexCount: number | null = null;

    constructor(drawMode: GLDrawMode = GLDrawMode.TRIANGLES) {
        this.drawMode = drawMode;
    }

    protected abstract setup(): void;
    protected abstract createVertexShader(): string;
    protected abstract createFragmentShader(): string;

    initialize(glContext: GLContext) {
        this.context = glContext;
        this.gl = glContext.context;
        this.program = this.createProgram();
        this.setup();
    }

    private createProgram(): GLProgram {
        const vertexShader = new GLShader(this.gl, { 
            type: ShaderType.Vertex, 
            source: this.createVertexShader(),
            autoCompile: true
        });
        const fragmentShader = new GLShader(this.gl, { 
            type: ShaderType.Fragment, 
            source: this.createFragmentShader(),
            autoCompile: true
        });
        const program = new GLProgram(this.gl, vertexShader, fragmentShader);
        program.use();
        return program;
    }

    // Utility to create and return a framebuffer with an attached texture
    protected createTexture(data?: Float32Array, index = 0) {
        const framebuffer = this.gl.createFramebuffer();

        if (!framebuffer) throw new Error("Failed to create framebuffer");

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

        const texture = this.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA32F,
            this.gl.drawingBufferWidth,
            this.gl.drawingBufferHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            data || null // If data is provided, initialize texture with it
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0 + index,
            this.gl.TEXTURE_2D,
            texture,
            0
        );

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        
        return { framebuffer, texture };
    }

    setIndexBuffer(indices: Uint16Array) {
        this.indexBuffer = this.gl.createBuffer();
        if (!this.indexBuffer) {
            throw new Error("Failed to create index buffer");
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
        
        this.indexCount = indices.length;
    }

    protected setBuffer(attributeName: string, data: Float32Array, options: GLBufferOptions) {
        this.program?.setBuffer(attributeName, data, options);
        
        if (!this.indexBuffer) {
            this.indexCount = data.length / options.size;
        }
    }

    protected setUniform(name: string, type: GLType, value: any) {
        this.uniforms.set(name, { type, value });
        this.program?.setUniform(name, type, value);
    }

    protected updateUniforms() {
        this.uniforms.forEach((uniform, name) => {
            this.program?.setUniform(name, uniform.type, uniform.value);
        });
    }

    render(time: number) {
        this.updateUniforms();

        if (this.indexBuffer && this.indexCount) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(this.drawMode, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
        } else if (this.indexCount) {
            this.gl.drawArrays(this.drawMode, 0, this.indexCount);
        }
    }

    readData(framebuffer: WebGLFramebuffer | undefined): Uint8Array {
        const width = this.gl.drawingBufferWidth;
        const height = this.gl.drawingBufferHeight;
        const pixelData = new Uint8Array(width * height * 4);

        if (framebuffer != undefined)
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

        // Read pixels from the currently bound framebuffer
        this.gl.readPixels(
            0, 0,                  // Start at the lower-left corner
            width, height,         // Read the entire viewport
            this.gl.RGBA,          // RGBA format
            this.gl.UNSIGNED_BYTE, // Each component as a byte
            pixelData              // Output array
        );

        if (framebuffer != undefined)
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        return pixelData;
    }

    dispose() {
        if (this.program) {
            this.program.dispose();
            this.program = null;
        }

        if (this.indexBuffer) {
            this.gl.deleteBuffer(this.indexBuffer);
            this.indexBuffer = null;
        }
    }

    setDrawMode(mode: GLDrawMode) {
        this.drawMode = mode;
    }

    setIndexCount(count: number) {
        this.indexCount = count;
    }
}
