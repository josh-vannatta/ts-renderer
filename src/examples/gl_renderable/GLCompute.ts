import { GLBuilder, GLVersion } from "../../glsl/GLBuilder";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";

export class GLCompute extends GLRenderable {
    private framebuffer: WebGLFramebuffer;
    private textures: WebGLTexture[] = [];
    private currentTextureIndex = 0;

    constructor(private data: Float32Array) {
        super(GLDrawMode.TRIANGLE_STRIP); // TRIANGLES draw mode for a full-screen quad
    }

    protected setup(): void {
        this.textures = [this.createTexture(this.data), this.createTexture(this.data)];
        this.framebuffer = this.gl.createFramebuffer()!;

        // Define vertices for a full-screen quad
        const quadVertices = new Float32Array([
            -1.0, -1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0,  1.0, 0.0
        ]);

        this.setBuffer("a_position", quadVertices, { size: 3 });
    }

    protected createVertexShader(): string {
        const builder = new GLBuilder(GLVersion.WebGL2);
        builder
            .addAttribute(GLType.Vec3, "a_position")
            .addMainBody(`
                gl_Position = vec4(a_position, 1.0);
            `);
        return builder.build();
    }

    protected createFragmentShader(): string {
        const builder = new GLBuilder(GLVersion.WebGL2);
        builder
            .addUniform(GLType.Sampler2D, "u_texture") // Add texture sampler uniform
            .addUniform(GLType.Float, "u_time")         // Time uniform for animated computation
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`
                vec2 uv = gl_FragCoord.xy / vec2(${this.context.width}, ${this.context.height});
                
                // Sample the current color from the texture
                vec4 color = texture(u_texture, uv);
                
                // Apply a computation (e.g., a gradient shift with time)
                float gradient = (uv.x + uv.y) * 0.5 + sin(u_time) * 0.5;
                
                // Output modified color as a simple computation result
                fragColor = vec4(color.r + gradient, color.g - gradient, color.b, 1.0);
            `);
        return builder.build();
    }
    render(time: number) {
        const readTextureIndex = this.currentTextureIndex;
        const writeTextureIndex = (this.currentTextureIndex + 1) % 2;
    
        // Bind framebuffer to write texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.textures[writeTextureIndex], 0);
    
        // Check framebuffer status
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is incomplete:', status);
            return;
        }
    
        // Set the read texture as the active texture for sampling
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[readTextureIndex]);
        this.program?.setUniform("u_texture", GLType.Sampler2D, 0);
    
        console.log(`Rendering with read texture index ${readTextureIndex} and write texture index ${writeTextureIndex}`);
        super.render(time);
    
        // Unbind the framebuffer to avoid accidental writes
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
        // Swap read and write textures for the next frame
        this.currentTextureIndex = writeTextureIndex;
    }
    

    readData() {
        return super.readData(this.framebuffer);
    }
}
