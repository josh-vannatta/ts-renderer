import { GLBuilder, GLVersion } from "../../glsl/GLBuilder";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";
import { GLTextureBuffer } from "../../glsl/GLTextureBuffer";

export class GLCompute extends GLRenderable {
    private textures: GLTextureBuffer;

    constructor(data: Float32Array) {
        super(GLDrawMode.TRIANGLE_STRIP); 
        this.textures = new GLTextureBuffer(data);
    }
    
    protected setup(): void {
        this.textures.init(this.context);
        this.setBuffer("a_position", this.textures.positionBuffer, { size: 3 });
    }

    protected createVertexShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addAttribute(GLType.Vec3, "a_position")
            .addMainBody(`
                gl_Position = vec4(a_position, 1.0);
            `)
            .build();
    }

    protected createFragmentShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addUniform(GLType.Sampler2D, "u_texture") // Add texture sampler uniform
            .addUniform(GLType.Float, "u_time")         // Time uniform for animated computation
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`
                vec2 uv = gl_FragCoord.xy / vec2(${this.context.width}, ${this.context.height});
                vec4 color = texture(u_texture, uv);
                float gradient = (uv.x + uv.y) * 0.5 + sin(u_time) * 0.5;
                fragColor = vec4(color.r + gradient, color.g - gradient, color.b, 1.0);
            `)
            .build()
    }

    render(time: number) {
        this.textures.write(this.program);
        this.setUniform("u_time", GLType.Float, time);
        this.textures.read(this.program, "u_texture", 0);
        
        super.render(time);

        this.textures.swap();
    }

    readData() {
        return super.readData(this.textures.framebuffer);
    }

    dispose() {
        this.textures.dispose();
        super.dispose();
    }
}
