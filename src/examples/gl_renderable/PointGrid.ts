import { GLBuilder, GLVersion } from "../../glsl/GLSchema";
import { GLContext } from "../../glsl/GLContext";
import { GLType } from "../../glsl/GLProgram";
import { GLDrawMode, GLRenderable } from "../../glsl/GLRenderable";

export class PointsGrid extends GLRenderable {
    constructor() {
        super(GLDrawMode.POINTS);
    }

    protected setup(): void {
        const gridPoints = new Float32Array([
            -0.5, 0.5, 0.0,   0.5, 0.5, 0.0,
            -0.5, -0.5, 0.0,  0.5, -0.5, 0.0,
            0.0, 0.0, 0.0     // Center point
        ]);

        this.setBuffer("a_position", gridPoints, { size: 3 });
    }

    protected createVertexShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addAttribute(GLType.Vec3, "a_position")
            .addMainBody(`
                gl_PointSize = 5.0; // Adjust point size
                gl_Position = vec4(a_position, 1.0);
            `)
            .build();
    }

    protected createFragmentShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`fragColor = vec4(0.4, 0.8, 0.4, 1.0);`)
            .build();
    }
}
