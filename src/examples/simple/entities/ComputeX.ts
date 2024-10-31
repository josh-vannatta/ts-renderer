import { Matrix4, Vector3, Vector4 } from "three";
import { ComputeShader } from "../../../shaders/ComputeShader";
import { GLSLSchema, GLSLStruct, GLSLType } from "../../../shaders/GLSLBuilder";
import { GPUComputeShader } from "../../../shaders/GPUCompute";

export class Y {
    constructor(
        public value: Vector3
    ) {}
}

export class X {
    constructor(
        public index: number = 1,
        public value: Vector4 = new Vector4(5,5,5,5), 
        public value1: Vector3 = new Vector3(6,6,6),
    ) {}
}

const schema = new GLSLSchema("X", {
    value: GLSLType.Vec4,
    value1: GLSLType.Vec3,
    // index: GLSLType.Float,
})

export class ComputeXShader extends GPUComputeShader<X> {
    constructor(data: X[]) {
        super(data, schema);

        // this.addUniform("foo", GLSLType.Float, 0);
        // this.addUniform("bar", GLSLType.Vec3, new Vector3(1,1,1));

        this.setProgram(data => `
            ${data}.value.y = 19.0;
        `);

        let times = 1
        let vec = new Vector3(1,1,1);

        // this.onCompute(() => {
        //     this.updateUniform("foo", times)
        //     this.updateUniform("bar", vec)
        //     console.log(`ran ${++times} times`)
        // })
    }

}
