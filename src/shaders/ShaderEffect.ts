// ShaderEffect.ts
import * as THREE from 'three';
import { FragmentShaderBuilder, GLSLBuilder, GLSLUniforms, GLSLVaryings, VertexShaderBuilder } from './GLSLBuilder';

type Param = string | number;

export abstract class ShaderEffect  {
    private uniforms: GLSLUniforms;
    private varyings: GLSLVaryings;
    private _initialized: boolean = false;
    public vertexBuilder: VertexShaderBuilder;
    public fragmentBuilder: FragmentShaderBuilder;

    constructor() {
        this.vertexBuilder = new VertexShaderBuilder();
        this.fragmentBuilder = new FragmentShaderBuilder();
    }

    abstract getVertexShader(): string;
    abstract getFragmentShader(): string;
    abstract getUniforms(): GLSLUniforms;
    abstract getVaryings(): GLSLVaryings;

    public init() {
        this.uniforms = this.getUniforms();
        this.varyings = this.getVaryings();
        this.fragmentBuilder.addUniforms(this.uniforms);
        this.vertexBuilder.addUniforms(this.uniforms);
        this.fragmentBuilder.addVaryings(this.varyings);
        this.vertexBuilder.addVaryings(this.varyings);
        this.fragmentBuilder.addMainBody(this.getFragmentShader());
        this.vertexBuilder.addMainBody(this.getVertexShader());
        this._initialized = true;
    }

    get index() {
        return this.vertexBuilder.index;
    }

    set index(index: number) {
        this.vertexBuilder.setIndex(index);
        this.fragmentBuilder.setIndex(index);
    }

    get vertex(): string {
        if (!this._initialized)
            this.init()

        return this.vertexBuilder.build()
    }

    get fragment(): string {
        if (!this._initialized)
            this.init()

        return this.fragmentBuilder.build();
    }

    public get material(): THREE.ShaderMaterial {
        if (!this._initialized)
            this.init()

        return new THREE.ShaderMaterial({
            vertexShader: this.vertex,
            fragmentShader: this.fragment,
            uniforms: this.uniforms,
        });
    }

    setUniform(name: string, value: any): void {
        if (!this._initialized)
            this.init()

        if (this.uniforms[name]) {
            this.uniforms[name].value = value;
        } else {
            console.warn(`Uniform ${name} does not exist.`);
        }
    }

    getUniformValue(name: string): any {
        if (!this._initialized)
            this.init()

        return this.uniforms[name]?.value;
    }

    getUniformsForComposite(): string {
        if (!this._initialized)
            this.init()

        return Object.keys(this.uniforms)
            .map(key => `uniform ${this.vertexBuilder.getType(this.uniforms[key])} ${key};`)
            .join('\n');
    }

    setColor(x: Param) {
        return `builder_setColor(${this.formatParam(x)}, ${this.index})`
    }

    // Mathematical functions
    abs(x: Param): string {
        return `abs(${this.formatParam(x)})`;
    }

    sign(x: Param): string {
        return `sign(${this.formatParam(x)})`;
    }

    floor(x: Param): string {
        return `floor(${this.formatParam(x)})`;
    }

    ceil(x: Param): string {
        return `ceil(${this.formatParam(x)})`;
    }

    fract(x: Param): string {
        return `fract(${this.formatParam(x)})`;
    }

    mod(x: Param, y: Param): string {
        return `mod(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    min(x: Param, y: Param): string {
        return `min(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    max(x: Param, y: Param): string {
        return `max(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    clamp(x: Param, minVal: Param, maxVal: Param): string {
        return `clamp(${this.formatParam(x)}, ${this.formatParam(minVal)}, ${this.formatParam(maxVal)})`;
    }

    mix(x: Param, y: Param, a: Param): string {
        return `mix(${this.formatParam(x)}, ${this.formatParam(y)}, ${this.formatParam(a)})`;
    }

    step(edge: Param, x: Param): string {
        return `step(${this.formatParam(edge)}, ${this.formatParam(x)})`;
    }

    smoothstep(edge0: Param, edge1: Param, x: Param): string {
        return `smoothstep(${this.formatParam(edge0)}, ${this.formatParam(edge1)}, ${this.formatParam(x)})`;
    }

    // Geometric Functions
    length(x: Param): string {
        return `length(${this.formatParam(x)})`;
    }

    distance(p1: Param, p2: Param): string {
        return `distance(${this.formatParam(p1)}, ${this.formatParam(p2)})`;
    }

    dot(x: Param, y: Param): string {
        return `dot(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    cross(x: Param, y: Param): string {
        return `cross(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    normalize(x: Param): string {
        return `normalize(${this.formatParam(x)})`;
    }

    faceforward(N: Param, I: Param, Nref: Param): string {
        return `faceforward(${this.formatParam(N)}, ${this.formatParam(I)}, ${this.formatParam(Nref)})`;
    }

    reflect(I: Param, N: Param): string {
        return `reflect(${this.formatParam(I)}, ${this.formatParam(N)})`;
    }

    refract(I: Param, N: Param, eta: Param): string {
        return `refract(${this.formatParam(I)}, ${this.formatParam(N)}, ${this.formatParam(eta)})`;
    }

    // Matrix Functions
    matrixCompMult(x: Param, y: Param): string {
        return `matrixCompMult(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    inverse(m: string): string {
        return `inverse(${this.formatParam(m)})`;
    }

    transpose(m: string): string {
        return `transpose(${this.formatParam(m)})`;
    }

    // Vector Relational Functions
    lessThan(x: Param, y: Param): string {
        return `lessThan(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    lessThanEqual(x: Param, y: Param): string {
        return `lessThanEqual(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    greaterThan(x: Param, y: Param): string {
        return `greaterThan(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    greaterThanEqual(x: Param, y: Param): string {
        return `greaterThanEqual(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    equal(x: Param, y: Param): string {
        return `equal(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    notEqual(x: Param, y: Param): string {
        return `notEqual(${this.formatParam(x)}, ${this.formatParam(y)})`;
    }

    any(bvec: string): string {
        return `any(${this.formatParam(bvec)})`;
    }

    all(bvec: string): string {
        return `all(${this.formatParam(bvec)})`;
    }

    not(bvec: string): string {
        return `not(${this.formatParam(bvec)})`;
    }

    // Texture Lookup Functions
    texture2D(sampler2D: string, vec2: string): string {
        return `texture2D(${this.formatParam(sampler2D)}, ${this.formatParam(vec2)})`;
    }

    texture2DLod(sampler2D: string, vec2: string, lod: Param): string {
        return `texture2DLod(${this.formatParam(sampler2D)}, ${this.formatParam(vec2)}, ${this.formatParam(lod)})`;
    }

    textureCube(samplerCube: string, vec3: string): string {
        return `textureCube(${this.formatParam(samplerCube)}, ${this.formatParam(vec3)})`;
    }

    // Derivative Functions
    dFdx(p: Param): string {
        return `dFdx(${this.formatParam(p)})`;
    }

    dFdy(p: Param): string {
        return `dFdy(${this.formatParam(p)})`;
    }

    fwidth(p: Param): string {
        return `fwidth(${this.formatParam(p)})`;
    }

    // Noise Functions (deprecated)
    noise1(x: Param): string {
        return `noise1(${this.formatParam(x)})`;
    }

    noise2(x: Param): string {
        return `noise2(${this.formatParam(x)})`;
    }

    noise3(x: Param): string {
        return `noise3(${this.formatParam(x)})`;
    }

    noise4(x: Param): string {
        return `noise4(${this.formatParam(x)})`;
    }

    // Fragment Processing Functions
    discard(): string {
        return `discard`;
    }

    // Utility method to handle different parameter types (number, string, etc.)
    private formatParam(param: Param): string {
        if (typeof param === 'number') {
            return param.toString();
        }
        return param;
    }
}
