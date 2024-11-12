import { GLContext } from '../../glsl/GLContext';
import { GLType } from '../../glsl/GLProgram';
import { GLRenderable } from '../../glsl/GLRenderable';
import { GLBuilder, GLVersion } from "../../glsl/GLSchema";
import { GLDrawMode } from '../../glsl/GLRenderable';

export class Lines extends GLRenderable {
    constructor() {
        super(GLDrawMode.LINES);
    }

    protected setup(): void {
        const lineVertices = new Float32Array([
            -0.5,  0.5, 0.0,   // Point 1
             0.5,  0.5, 0.0,   // Point 2
            -0.5, -0.5, 0.0,   // Point 3
             0.5, -0.5, 0.0    // Point 4
        ]);

        this.setBuffer("a_position", lineVertices, { size: 3 });
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
                fragColor = vec4(0.2, 0.8, 0.4, 1.0);
            `)
            .build();
    }
}
