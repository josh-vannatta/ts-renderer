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
    protected context: GLContext;
    private indexBuffer: WebGLBuffer | null = null;
    public program: GLProgram;
    protected uniforms: Map<string, { type: GLType, value: any }> = new Map();
    
    private drawMode: GLDrawMode;
    private indexCount: number = 0;

    constructor(drawMode: GLDrawMode = GLDrawMode.TRIANGLES) {
        this.drawMode = drawMode;
        this.program = new GLProgram();
    }

    protected abstract setup(): void;
    protected abstract createVertexShader(): string;
    protected abstract createFragmentShader(): string;

    initialize(glContext: GLContext) {
        this.context = glContext;
        this.program = new GLProgram(this.context);

        const vertexShader = new GLShader(this.context, { 
            type: ShaderType.Vertex, 
            source: this.createVertexShader(),
            autoCompile: true
        });

        const fragmentShader = new GLShader(this.context, { 
            type: ShaderType.Fragment, 
            source: this.createFragmentShader(),
            autoCompile: true
        });

        this.program.initialize(vertexShader, fragmentShader);
        this.program.use();
        this.setup();
    }

    // Utility to create and return a texture
    protected createTexture(data: Float32Array) {
        return this.program.createTexture(data);
    }

    protected setIndexBuffer(indices: Uint16Array) {
        this.indexBuffer = this.program.setArrayBuffer(indices);        
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
        this.program.setUniform(name, type, value);
    }

    protected updateUniforms() {
        this.uniforms.forEach((uniform, name) => {
            this.program?.setUniform(name, uniform.type, uniform.value);
        });
    }

    render(time: number) {
        this.updateUniforms();
        this.program.drawArrayBuffer(this.drawMode, this.indexCount, this.indexBuffer)
        // this.program.bindFrameBuffer(undefined)
    }

    readData(framebuffer?: WebGLFramebuffer): Float32Array {
        if (!this.context || !framebuffer)
            return new Float32Array();

        return this.program.readData(framebuffer);
    }

    dispose() {
        if (this.program) {
            this.program.dispose();
        }

        if (this.indexBuffer) {
            this.context.gl.deleteBuffer(this.indexBuffer);
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
