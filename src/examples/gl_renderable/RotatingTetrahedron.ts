import { GLBuilder, GLVersion } from "../../glsl/GLSchema";
import { GLType } from "../../glsl/GLProgram";
import { GLRenderable } from "../../glsl/GLRenderable";

const Uniforms = {
    u_time: "u_time",
    u_lightDir: "u_lightDir",
};

export class RotatingTetrahedron extends GLRenderable {
    protected setup(): void {
        const tetrahedronVertices = new Float32Array([
            // Vertex positions     // Normals for lighting
            0.0, 0.5, 0.0,         0.0, 0.707, 0.707,    // Top vertex
           -0.5, -0.5, -0.5,      -0.577, -0.577, -0.577, // Bottom-left-back vertex
            0.5, -0.5, -0.5,       0.577, -0.577, -0.577,  // Bottom-right-back vertex
            0.0, -0.5, 0.5,        0.0, -0.707, 0.707     // Bottom-front vertex
        ]);

        // Indices for the faces of the tetrahedron (4 faces)
        const tetrahedronIndices = new Uint16Array([
            0, 1, 2,  // Back face
            0, 1, 3,  // Left face
            0, 2, 3,  // Right face
            1, 2, 3   // Bottom face
        ]);

        // Set buffers with position (vec3) and normal data (vec3)
        this.setBuffer("a_position", tetrahedronVertices, { size: 3, stride: 6 });
        this.setBuffer("a_normal", tetrahedronVertices, { size: 3, stride: 6, offset: 3 });

        // Set the index buffer for the tetrahedron faces
        this.setIndexBuffer(tetrahedronIndices);
    }

    // Custom vertex shader with 3D rotation and lighting calculations
    protected createVertexShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addAttribute(GLType.Vec3, "a_position")
            .addAttribute(GLType.Vec3, "a_normal")
            .addUniform(GLType.Float, Uniforms.u_time)
            .addUniform(GLType.Vec3, Uniforms.u_lightDir)
            .addVarying(GLType.Vec3, "v_normal")
            .addVarying(GLType.Vec3, "v_lightDir")
            .addMainBody(`
                float angle = u_time;
                mat3 rotation = mat3(
                    cos(angle), 0.0, sin(angle),
                    0.0, 1.0, 0.0,
                    -sin(angle), 0.0, cos(angle)
                );

                vec3 rotatedPosition = rotation * a_position;
                vec3 rotatedNormal = rotation * a_normal;

                v_normal = rotatedNormal;
                v_lightDir = normalize(u_lightDir);

                gl_Position = vec4(rotatedPosition, 1.0);
            `)
            .build();
    }

    // Custom fragment shader with lighting for 3D effect
    protected createFragmentShader(): string {
        return new GLBuilder(GLVersion.WebGL2)
            .addInput(GLType.Vec3, "v_normal")
            .addInput(GLType.Vec3, "v_lightDir")
            .addOutput(GLType.Vec4, "fragColor")
            .addMainBody(`
                float lightIntensity = max(dot(normalize(v_normal), v_lightDir), 0.0);
                vec3 color = vec3(0.4, 0.6, 0.8) * lightIntensity;
                fragColor = vec4(color, 1.0);
            `)
            .build();
    }

    render(time: number) {
        this.setUniform(Uniforms.u_time, GLType.Float, time * 0.001);
        this.setUniform(Uniforms.u_lightDir, GLType.Vec3, new Float32Array([0.5, 1.0, 0.3]));
        super.render(time); 
    }
}
