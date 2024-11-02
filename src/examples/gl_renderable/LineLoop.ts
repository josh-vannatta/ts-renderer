import { GLBuilder, GLVersion } from "../../glsl/GLBuilder";
import { GLContext } from "../../glsl/GLContext";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable"; 

export class LineLoop extends GLRenderable {
    constructor() {
        super(GLDrawMode.LINE_LOOP);
    }

    protected setup(): void {
        const loopVertices = new Float32Array([
            -0.5,  0.5, 0.0,   // Top-left
             0.5,  0.5, 0.0,   // Top-right
             0.5, -0.5, 0.0,   // Bottom-right
            -0.5, -0.5, 0.0    // Bottom-left
        ]);

        this.setBuffer("a_position", loopVertices, { size: 3 });
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
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`
                fragColor = vec4(1.0, 0.5, 0.2, 1.0);
            `)
            .build();
    }
}
