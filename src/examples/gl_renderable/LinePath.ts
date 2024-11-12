import { GLBuilder, GLVersion } from "../../glsl/GLSchema";
import { GLContext } from "../../glsl/GLContext";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";

export class LinePath extends GLRenderable {
    constructor() {
        super(GLDrawMode.LINE_STRIP);
    }

    protected setup(): void {
        const pathVertices = new Float32Array([
            -0.5, -0.5, 0.0,   // Start
            -0.25, 0.5, 0.0,   // Up
            0.25, -0.5, 0.0,   // Down
            0.5, 0.5, 0.0      // Up
        ]);

        this.setBuffer("a_position", pathVertices, { size: 3 });
    }

    protected createVertexShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addAttribute(GLType.Vec3, "a_position")
            .addMainBody(`gl_Position = vec4(a_position, 1.0);`)
            .build();
    }

    protected createFragmentShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`fragColor = vec4(0.4, 0.4, 0.8, 1.0);`)
            .build();
    }
}
