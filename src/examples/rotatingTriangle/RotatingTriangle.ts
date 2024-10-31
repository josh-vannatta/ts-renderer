import { GLBuilder } from "../../glsl/GLBuilder";
import { GLContext } from "../../glsl/GLContext";
import { GLType } from "../../glsl/GLProgram";
import { GLRenderable } from "../../glsl/GLRenderable";

const Uniforms = {
    u_time: "u_time"
}

export class RotatingTriangle extends GLRenderable {
    constructor(glContext: GLContext) {
        super(glContext);

        const triangleVertices = new Float32Array([
            0.0, 0.5,   // Top vertex
           -0.5, -0.5,  // Bottom-left vertex
            0.5, -0.5   // Bottom-right vertex
        ]);
        
        this.setBuffer("a_position", triangleVertices, { size: 2 });
    }

    // Custom vertex shader with rotation logic
    protected createVertexShader(): string {
        const builder = new GLBuilder();

        builder.addAttribute(GLType.Vec2, "a_position");
        builder.addUniform(GLType.Float, Uniforms.u_time);
        builder.addMainBody(`
            float angle = u_time;
            mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            gl_Position = vec4(rotation * a_position, 0.0, 1.0);
        `);

        return builder.build();
    }

    // Custom fragment shader with a static color
    protected createFragmentShader(): string {
        const builder = new GLBuilder();
        
        builder.addMainBody(`
            gl_FragColor = vec4(0.4, 0.6, 0.8, 1.0);
        `);
        
        return builder.build();
    }

    render(time: number) {
        this.setUniform(Uniforms.u_time, GLType.Float, time * 0.001);
        super.render(time); 
    }
}
