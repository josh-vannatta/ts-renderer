import { GLBuilder, GLVersion } from "../../glsl/GLBuilder";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";

export class GLCompute extends GLRenderable {
    private framebuffer: WebGLFramebuffer | undefined;
    private texture: WebGLTexture | null = null;

    constructor(private data: Float32Array) {
        super(GLDrawMode.POINTS); // Use POINTS draw mode for compute-like operations
    }

    // Initialize framebuffer with optional data to be packed into the texture
    protected setup(): void {
        const { framebuffer, texture } = this.createTexture(this.data);
        this.framebuffer = framebuffer;
        this.texture = texture;
    }

    // Vertex shader created with GLBuilder
    protected createVertexShader(): string {
        const builder = new GLBuilder(GLVersion.WebGL2);
        builder.addMainBody(`
            gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        `);
        return builder.build();
    }

    // Fragment shader created with GLBuilder
    protected createFragmentShader(): string {
        const builder = new GLBuilder(GLVersion.WebGL2);
        builder
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`
                fragColor = vec4(1.0,1.0,1.0,1.0);
            `);
        return builder.build();
    }

    // Render function targeting the framebuffer
    render(time: number) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer ?? null);
        super.render(time);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    readData(): Uint8Array {
        return super.readData(this.framebuffer)
    }
}
