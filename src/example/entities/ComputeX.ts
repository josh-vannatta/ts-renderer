import { Matrix4, Vector3, Vector4 } from "three";
import { ComputeShader } from "../../shaders/ComputeShader";
import { GLSLStruct, GLSLType } from "../../shaders/GLSLBuilder";

export class Y {
    constructor(
        public value: Vector3
    ) {}
}

export class X {
    constructor(
        public value: Vector4 = new Vector4(1,2,3,4), 
        public value1: Vector3 = new Vector3(5,6,7),
        public child: Y = new Y(new Vector3(5,5,5)),
        public child2: Y = new Y(new Vector3(6,6,6)),
        public child3: Y = new Y(new Vector3(7,7,7)),
        public child4: Y = new Y(new Vector3(8,8,8)),
    ) {}
}

export class ComputeXShader extends ComputeShader<X> {
    constructor(data: X[]) {
        const yStruct = new GLSLStruct("Y", {
            value: GLSLType.Vec3
        })

        super(data, new GLSLStruct("X", {
            value: GLSLType.Vec4,
            value1: GLSLType.Vec3,
            child: yStruct,
            child2: yStruct,
            child3: yStruct,
            child4: yStruct,
        }));

        this.addUniform("foo", GLSLType.Float, 0);

        this.setProgram(data => `
            ${data}.value.x += foo;
            ${data}.value.y += foo;
            ${data}.value.z += foo;
            ${data}.value.w += foo;
        `);

        let times = 20

        this.onCompute(() => {
            this.updateUniform("foo", ++times)
            // console.log(`ran ${++times} times`)
        })
    }

}
