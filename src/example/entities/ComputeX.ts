import { Color, Matrix4, Vector2, Vector3, Vector4 } from "three";
import { ComputeShader } from "../../shaders/ComputeShader";
import { GLSLStruct, GLSLStructParams, GLSLType } from "../../shaders/GLSLBuilder";

export class X {
    constructor(
        public value: Vector4 = new Vector4(1,2,3,4), 
        public value1: Vector3 = new Vector3(1,2,3),
        public value2: Matrix4 = new Matrix4(
            1,2,3,4,
            5,6,7,8,
            9,10,11,12,
            13,14,15,16
        )
    ) {}
}

export class ComputeXShader extends ComputeShader<X> {
    constructor(data: X[]) {
        const struct = new GLSLStruct("X", {
            value: GLSLType.Vec4,
            value1: GLSLType.Vec3,
            value2: GLSLType.Mat4
        })

        super(data, struct);

        this.shader.addUniforms({
            x: { value: 5 }
        });

        this.setProgram((data) => `
            ${data}.value1.x += 1.0;
            ${data}.value1.y += 1.0;
            ${data}.value1.z += 1.0;
        `);
    }
}
