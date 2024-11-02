import { GLBuilder, GLVersion } from "../../glsl/GLBuilder";
import { GLContext } from "../../glsl/GLContext";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";

export class TriangleStripRenderable extends GLRenderable {
    constructor() {
        super(GLDrawMode.TRIANGLE_STRIP);
    }

    protected setup(): void {
        const stripVertices = new Float32Array([
            -0.5,  0.5, 0.0,   // Top-left
             0.5,  0.5, 0.0,   // Top-right
            -0.5, -0.5, 0.0,   // Bottom-left
             0.5, -0.5, 0.0    // Bottom-right
        ]);

        this.setBuffer("a_position", stripVertices, { size: 3 });
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
                fragColor = vec4(0.6, 0.2, 0.8, 1.0);
            `)
            .build();
    }
}
