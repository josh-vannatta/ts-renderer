import { GLContext } from './GLContext';
import { GLProgram, GLType } from './GLProgram';

export class GLTextureBuffer {
    private textures: WebGLTexture[] = [];
    private currentTextureIndex = 0;
    public framebuffer: WebGLFramebuffer;
    private context: GLContext;
    
    constructor(private data: Float32Array) {}

    public init(context: GLContext) {
        this.context = context;
        this.framebuffer = this.context.gl.createFramebuffer()!;
        this.textures = [this.texture, this.texture];
    }

    /**
     * Creates a texture with specified parameters.
     */
    private get texture(): WebGLTexture {
        const gl = this.context.gl;
        const texture = gl.createTexture()!;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            this.context.width,
            this.context.height,
            0,
            gl.RGBA,
            gl.FLOAT,
            this.data
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    /**
     * Binds the current write texture to the framebuffer.
     */
    write(program: GLProgram) {
        const gl = this.context.gl;
        program.bindFrameBuffer(this.framebuffer, () => {
            const writeTexture = this.getWriteTexture();
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, writeTexture, 0);
        });
    }

    /**
     * Binds the current read texture to a sampler uniform in the shader program.
     */
    read(program: GLProgram, uniformName: string, unit: number = 0) {
        const gl = this.context.gl;
        const readTexture = this.getReadTexture();

        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        program.setUniform(uniformName, GLType.Sampler2D, unit);
    }

    /**
     * Swaps read and write textures for ping-pong rendering.
     */
    swap() {
        this.currentTextureIndex = (this.currentTextureIndex + 1) % 2;
    }

    // Retrieve the current read texture
    private getReadTexture(): WebGLTexture {
        return this.textures[this.currentTextureIndex];
    }

    // Retrieve the current write texture
    private getWriteTexture(): WebGLTexture {
        return this.textures[(this.currentTextureIndex + 1) % 2];
    }

    /**
     * Calculates a position buffer for a full-screen quad, used in rendering the entire viewport.
     */
    get positionBuffer(): Float32Array {
        return new Float32Array([
            -1.0, -1.0, 0.0, // Bottom-left corner
             1.0, -1.0, 0.0, // Bottom-right corner
            -1.0,  1.0, 0.0, // Top-left corner
             1.0,  1.0, 0.0  // Top-right corner
        ]);
    }

    /**
     * Releases texture and framebuffer resources.
     */
    dispose() {
        const gl = this.context.gl;
        this.textures.forEach(texture => gl.deleteTexture(texture));
        gl.deleteFramebuffer(this.framebuffer);
    }
}
