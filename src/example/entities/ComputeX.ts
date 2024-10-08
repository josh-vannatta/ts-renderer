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

        this.shader.addUniforms({
            x: { value: 5 }
        });

        this.setProgram(data => `
            ${data}.value.x += 1.0;
            ${data}.value.y += 1.0;
            ${data}.value.z += 1.0;
            ${data}.value.w += 1.0;

            ${data}.value1.x += 1.0;
            ${data}.value1.y += 1.0;
            ${data}.value1.z += 1.0;

            ${data}.child.value.x = 9.0;
            ${data}.child.value.y = 10.0;
            ${data}.child.value.z = 11.0;
            ${data}.child2.value.x = 12.0;
            ${data}.child2.value.y = 13.0;
            ${data}.child2.value.z = 14.0;
            ${data}.child3.value.x = 15.0;
            ${data}.child3.value.y = 16.0;
            ${data}.child3.value.z = 17.0;
            ${data}.child4.value.x = 18.0;
            ${data}.child4.value.y = 19.0;
            ${data}.child4.value.z = 20.0;
        `);

        let times = 0

        this.onCompute(() => {
            // console.log(`ran ${++times} times`)
        })
    }

}
