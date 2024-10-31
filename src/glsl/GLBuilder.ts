import * as THREE from "three";
import { GLType } from "./GLProgram";

export type GLUniforms = { [key: string]: THREE.IUniform };
export type GLVaryings = { [key: string]: any }
export type GLStructParams = { [key: string]: (GLType | GLStruct) };
export enum GLVersion {
    WebGL1 = "#version 100",
    WebGL2 = "#version 300 es"
}

export class GLParam {
    constructor(public type: GLType | string, public name: string, public DEFAULT: any = "") {}

    public static Float(name: string = "")       { return new GLParam(GLType.Float,      name, 0.01)}
    public static Int(name: string = "")         { return new GLParam(GLType.Int,        name, 0)}
    public static UInt(name: string = "")        { return new GLParam(GLType.UInt,       name, 0)}
    public static Vec2(name: string = "")        { return new GLParam(GLType.Vec2,       name, new THREE.Vector2())}
    public static Vec3(name: string = "")        { return new GLParam(GLType.Vec3,       name, new THREE.Vector3())}
    public static Vec4(name: string = "")        { return new GLParam(GLType.Vec4,       name, new THREE.Vector4())}
    public static Mat3(name: string = "")        { return new GLParam(GLType.Mat3,       name, new Array(9).fill(0))}
    public static Mat4(name: string = "")        { return new GLParam(GLType.Mat4,       name, new Array(16).fill(0))}
    public static Sampler2D(name: string = "")   { return new GLParam(GLType.Sampler2D,  name, "")}
    public static SamplerCube(name: string = "") { return new GLParam(GLType.SamplerCube,name, "")}
    public static Bool(name: string = "")        { return new GLParam(GLType.Bool,       name, false)}
}

export class GLFunction {
    public returnType: GLType | string;
    public name: GLName;
    public params: GLParam[];
    public body: GLBody;

    constructor(opts: Partial<GLFunction>) {
        this.returnType = opts.returnType ?? GLType.Void;
        this.name = opts.name ?? new GLName("function");
        this.params = opts.params ?? [];
        this.body = opts.body ?? new GLBody('');
    }

    build(): string {
        const params = this.params.map(param => `${param.type} ${param.name}`).join(', ');
        return `
            ${this.returnType} ${this.name}(${params}) {
                ${this.body}
            }
        `;
    }
}

export class GLName {
    constructor(private name: string) {}

    public toString() {
        return this.name.replace(" ", "".replace('\n', ''));
    }
}

export class GLBody {
    constructor(private main: string) {}

    public toString() {
        const lines = this.main.split('\n');

        return lines.filter(l => l.length > 0).join('\n')
    }
}

export class GLStruct {
    constructor(
        public name: string, 
        public definition: GLStructParams
    ) {}

    public propertyCount: number = 0;

    /**
     * Recursively calculate how many vec4s (layouts) are needed based on the number of properties.
     * This will handle both flat and nested structs, with different sizes for each GLType.
     */
    getVec4Count(): number {
        this.propertyCount = 0;
        let count = 0;

        for (const key in this.definition) {
            const value = this.definition[key];
            if (value instanceof GLStruct) {
                count += value.getVec4Count();  // Recursively calculate for nested structs

                this.propertyCount += value.propertyCount;
            } else {
                const typeSize = this.getTypeSize(value);

                this.propertyCount += typeSize;

                count += Math.ceil(typeSize / 4);  // Add the size based on the type
            }
        }

        return count;  // One vec4 can hold 4 floats
    }

    /**
     * Serialize the object recursively into a Float32Array, based on the type of each field.
     */
    serialize(data: any): Float32Array {
        const floatArray: number[] = []; // Temporary array to accumulate values
        let propertyCount = 0; // Track the number of properties we've serialized so far
    
        for (const key in this.definition) {
            const value = this.definition[key];
            if (value instanceof GLStruct) {
                // Recursively serialize the nested structure
                const nestedArray = value.serialize(data[key]);
                nestedArray.forEach((val: number) => {
                    if (propertyCount < this.propertyCount) {
                        floatArray.push(val);  // Only push if we're under the property count
                        propertyCount++;
                    }
                });
            } else {
                propertyCount = this.serializeField(floatArray, data[key], value, propertyCount);
            }
    
            if (propertyCount >= this.propertyCount) {
                break; // Stop serialization once we reach the required property count
            }
        }

        if (floatArray.length % 4 != 0)
            for (let i = 0; i < floatArray.length % 4; i++)
                floatArray.push(0)
    
        return new Float32Array(floatArray);
    }
    

    /**
     * Deserialize the Float32Array back into the object recursively, based on the type of each field.
     */
    deserialize(floatArray: Float32Array): any {
        const data: any = {};
        let index = 0;
        let propertyCount = 0;  // Track the number of properties we've deserialized so far
    
        for (const key in this.definition) {
            const value = this.definition[key];
            if (propertyCount >= this.propertyCount) {
                break;  // Stop deserializing once we've reached the property count
            }
    
            if (value instanceof GLStruct) {
                value.getVec4Count()
                const nestedVec4Count = value.propertyCount;
                const subArray = floatArray.subarray(index, index + nestedVec4Count);
                data[key] = value.deserialize(subArray);
                index += nestedVec4Count;
                propertyCount += value.propertyCount; // Update property count with nested struct's properties
            } else {
                [data[key], index] = this.deserializeField(floatArray, index, value);
                propertyCount += this.getTypeSize(value);
            }
        }
    
        return data;
    }
    

    /**
     * Return the size (in floats) of a GLType.
     */
    private getTypeSize(type: GLType): number {
        switch (type) {
            case GLType.Float:
            case GLType.Int:
            case GLType.UInt:
            case GLType.Bool:
                return 1;
            case GLType.Vec2:
                return 2;
            case GLType.Vec3:
                return 3;
            case GLType.Vec4:
                return 4;
            case GLType.Mat3:
                return 9;
            case GLType.Mat4:
                return 16;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
    }

    /**
     * Serialize a single field into the Float32Array based on its GLType.
     */
    serializeField(floatArray: number[], value: any, type: GLType, propertyCount: number): number {
        const appendToFloatArray = (val: number) => {
            if (propertyCount < this.propertyCount) {
                floatArray.push(val); // Push only if within propertyCount limit
                propertyCount++;
            }
        };
    
        switch (type) {
            case GLType.Float:
            case GLType.Int:
            case GLType.UInt:
            case GLType.Bool:
                appendToFloatArray(value);
                break;
            case GLType.Vec2:
                appendToFloatArray(value.x);
                appendToFloatArray(value.y);
                break;
            case GLType.Vec3:
                appendToFloatArray(value.x);
                appendToFloatArray(value.y);
                appendToFloatArray(value.z);
                break;
            case GLType.Vec4:
                appendToFloatArray(value.x);
                appendToFloatArray(value.y);
                appendToFloatArray(value.z);
                appendToFloatArray(value.w);
                break;
            case GLType.Mat3:
                for (let i = 0; i < 9; i++) {
                    appendToFloatArray(value.elements[i]);
                }
                break;
            case GLType.Mat4:
                for (let i = 0; i < 16; i++) {
                    appendToFloatArray(value.elements[i]);
                }
                break;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
        
        return propertyCount;
    }
    
    /**
     * Deserialize a single field from the Float32Array based on its GLType.
     */
    deserializeField(floatArray: Float32Array, index: number, type: GLType): [any, number] {
        let value: any;
    
        switch (type) {
            case GLType.Float:
            case GLType.Int:
            case GLType.UInt:
            case GLType.Bool:
                value = floatArray[index++];
                break;
            case GLType.Vec2:
                value = { x: floatArray[index++], y: floatArray[index++] };
                break;
            case GLType.Vec3:
                value = { x: floatArray[index++], y: floatArray[index++], z: floatArray[index++] };
                break;
            case GLType.Vec4:
                value = { x: floatArray[index++], y: floatArray[index++], z: floatArray[index++], w: floatArray[index++] };
                break;
            case GLType.Mat3:
                value = { elements: floatArray.slice(index, index + 9) };
                index += 9;
                break;
            case GLType.Mat4:
                value = { elements: floatArray.slice(index, index + 16) };
                index += 16;
                break;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
    
        return [value, index];
    }
    
}

export class GLSchema extends GLStruct {}
export class GLBuilder {
    protected _attributes: string[] = [];
    protected _uniforms: string[] = [];
    protected _inputs: string[] = [];      // Inputs to shaders, especially in WebGL 2.0
    protected _outputs: string[] = [];     // Outputs, used for fragment shaders in WebGL 2.0
    protected _varyings: string[] = [];    // Varying variables
    protected _functions: string[] = [];
    protected _structs: string[] = [];
    protected _mainBody: GLBody[] = [];
    protected _maxEffects: number = 1;
    private _structNames: Record<string, boolean> = {};
    public index: number = 0;
    private version: GLVersion;
    private precision: string;

    constructor(version: GLVersion = GLVersion.WebGL2) {
        this.version = version;
        this.precision = version === GLVersion.WebGL1 ? "precision mediump float;" : "precision highp float;";
    }

    setMaxEffects(max: number) {
        this._maxEffects = max > 0 ? max : 0;
    }

    setIndex(index: number) {
        this.index = index > 0 ? index : 0;
    }

    setVersion(version: GLVersion) {
        this.version = version;
        this.precision = version === GLVersion.WebGL1 ? "precision mediump float;" : "precision highp float;";
    }

    addAttribute(type: GLType, name: string): this {
        const qualifier = this.version === GLVersion.WebGL1 ? "attribute" : "in";
        this._attributes.push(`${qualifier} ${type} ${name};`);
        return this;
    }

    addUniform(type: GLType, name: string): this {
        this._uniforms.push(`uniform ${type} ${name};`);
        return this;
    }

    addVarying(type: GLType, name: string): this {
        const qualifier = this.version === GLVersion.WebGL1 ? "varying" : "out";
        this._varyings.push(`${qualifier} ${type} ${name};`);
        return this;
    }

    addInput(type: GLType, name: string): this {
        const qualifier = this.version === GLVersion.WebGL2 ? "in" : "varying";
        this._inputs.push(`${qualifier} ${type} ${name};`);
        return this;
    }

    addOutput(type: GLType, name: string): this {
        if (this.version === GLVersion.WebGL2) {
            this._outputs.push(`out ${type} ${name};`);
        }
        return this;
    }

    addFunction(glslFunction: Partial<GLFunction>): this {
        this._functions.push(new GLFunction(glslFunction).build());
        return this;
    }

    addMainBody(code: string): this {
        this._mainBody.push(new GLBody(code));
        return this;
    }

    build(): string {
        return GLBuilder.autoFormat(`
            #version ${this.version === GLVersion.WebGL2 ? '300 es' : '100'}
            ${this.precision}
            ${this._structs.join('\n')}
            ${this._attributes.join('\n')}
            ${this._uniforms.join('\n')}
            ${this._inputs.join('\n')}
            ${this._outputs.join('\n')}
            ${this._varyings.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                ${this._mainBody.join('\n')}
            }
        `);
    }

    autoFormat(code: string) {
        return GLBuilder.autoFormat(code);
    }

    static autoFormat(code: string) {
        const lines = code.trim().split('\n');
        let indentLevel = 0;
        const indentSize = 4;

        const formattedLines = lines.map((line) => {
            let trimmedLine = line.trim();

            if (trimmedLine.endsWith('}') || trimmedLine.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;

            if (trimmedLine.endsWith('{')) {
                indentLevel += 1;
            }

            return indentedLine;
        });

        return formattedLines.filter(line => line !== '').join('\n');
    }
}

export class GLFragmentBuilder extends GLBuilder {
    constructor() {
        super();
        this.addDefaultFunctions();
    }

    build(): string {
        return this.autoFormat(`
            const int MAX_EFFECTS = ${this._maxEffects};
            vec4 builder_colors[MAX_EFFECTS];
            uint builder_sampleMask[MAX_EFFECTS];
            
            ${this._structs.join('\n')}

            precision mediump float;
            varying vec2 vUv;
            varying vec3 vNormal;
            ${this._varyings.join('\n')}
            ${this._attributes.join('\n')}
            ${this._uniforms.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                builder_initColors();

                ${this._mainBody.join('\n')}
                builder_composeColors(${this.index});
            }
        `);
    }

    addDefaultFunctions() {
        this.addFunction({
            name: new GLName("builder_initColors"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_colors[i] = vec4(0.0);
                }
            `)
        });

        this.addFunction({
            name: new GLName("builder_setColor"),
            params: [ GLParam.Vec4("color"), GLParam.Int("index") ],
            body: new GLBody(`builder_colors[index] = builder_colors[index] + color;`)
        });

        this.addFunction({
            name: new GLName( "builder_composeColors"),
            params: [ GLParam.Int("index")],
            body: new GLBody(`
                vec4 composedColor = vec4(0.0);

                for (int i = 0; i <= index; i++) {
                    composedColor += builder_colors[i];
                }

                gl_FragColor = composedColor / float(index + 1);
            `)
        });
    }

    public addFragCoordFunctions() {
        this.addFunction({
            name: new GLName("builder_initFragData"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_fragData[i] = vec4(0.0);
                }
            `)
        });
        
        this.addFunction({
            name: new GLName("builder_setFragData"),
            params: [GLParam.Vec4("data"), GLParam.Int("index")],
            body: new GLBody(`builder_fragData[index] = builder_fragData[index] + data;`)
        });
        
        this.addFunction({
            name: new GLName("builder_composeFragData"),
            params: [GLParam.Int("index")],
            body: new GLBody(`
                vec4 composedData = vec4(0.0);
        
                for (int i = 0; i <= index; i++) {
                    composedData += builder_fragData[i];
                }
        
                gl_FragData[index] = composedData / float(index + 1);
            `)
        });
    }

    public addSampleMaskFunctions() {
        this.addFunction({
            name: new GLName("builder_initSampleMask"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_sampleMask[i] = 0u;
                }
            `)
        });
        
        this.addFunction({
            name: new GLName("builder_setSampleMask"),
            params: [
                GLParam.UInt("mask"),  // uint mask parameter
                GLParam.Int("effect"), // effect index
            ],
            body: new GLBody(`
                builder_sampleMask[effect] |= mask;
            `)
        });
        
        this.addFunction({
            name: new GLName("builder_composeSampleMask"),
            params: [
                GLParam.Int("effect")
            ],
            body: new GLBody(`
                uint composedMask = 0u;
                for (int i = 0; i <= effect; i++) {
                    composedMask |= builder_sampleMask[i];
                }
                gl_SampleMask[0] = composedMask;
            `)
        });
    }
}


export class GLVertexBuilder extends GLBuilder {
    constructor() {
        super();
        this.addDefaultFunctions();
    }

    build(): string {
        return this.autoFormat(`
            const int MAX_EFFECTS = ${this._maxEffects};
            vec4 builder_positions[MAX_EFFECTS];  
            float builder_pointSizes[MAX_EFFECTS];
            
            ${this._structs.join('\n')}

            precision mediump float;
            varying vec2 vUv;
            varying vec3 vNormal;
            ${this._varyings.join('\n')}
            ${this._attributes.join('\n')}
            ${this._uniforms.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                vUv = uv;
                builder_initPosition();
                builder_initPointSize();

                ${this._mainBody.join('\n')}
                builder_composePosition(${this.index});
                builder_composePointSize(${this.index});
            }
        `);
    }

    addDefaultFunctions() {
        // Initialize builder_positions[]
        this.addFunction({
            name: new GLName("builder_initPosition"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_positions[i] = vec4(0.0);
                }
            `)
        });

        // Set builder_positions[effect] for a specific effect
        this.addFunction({
            name: new GLName("builder_setPosition"),
            params: [ GLParam.Vec4("position"), GLParam.Int("index") ],
            body: new GLBody(`
                builder_positions[index] = builder_positions[index] + position;
            `)
        });

        // Compose all builder_positions[] into gl_Position
        this.addFunction({
            name: new GLName("builder_composePosition"),
            params: [ GLParam.Int("index") ],
            body: new GLBody(`
                vec4 composedPosition = vec4(0.0);
                for (int i = 0; i <= index; i++) {
                    composedPosition += builder_positions[i];
                }
                gl_Position = composedPosition / float(index + 1);
            `)
        });

        // Initialize builder_pointSizes[]
        this.addFunction({
            name: new GLName("builder_initPointSize"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_pointSizes[i] = 0.0;
                }
            `)
        });

        // Set builder_pointSizes[effect] for a specific effect
        this.addFunction({
            name: new GLName("builder_setPointSize"),
            params: [ GLParam.Float("pointSize"), GLParam.Int("index") ],
            body: new GLBody(`
                builder_pointSizes[index] = builder_pointSizes[index] + pointSize;
            `)
        });

        // Compose all builder_pointSizes[] into gl_PointSize
        this.addFunction({
            name: new GLName("builder_composePointSize"),
            params: [ GLParam.Int("index") ],
            body: new GLBody(`
                float composedPointSize = 0.0;
                for (int i = 0; i <= index; i++) {
                    composedPointSize += builder_pointSizes[i];
                }
                gl_PointSize = composedPointSize / float(index + 1);
            `)
        });
    }

    addClipDistanceFunctions() {
        // Initialize builder_clipDistances[][]
        this.addFunction({
            name: new GLName("builder_initClipDistance"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    for (int j = 0; j < MAX_CLIP_PLANES; j++) {
                        builder_clipDistances[i][j] = 0.0;
                    }
                }
            `)
        });

        // Set builder_clipDistances[effect][planeIndex] for a specific effect and clip plane
        this.addFunction({
            name: new GLName("builder_setClipDistance"),
            params: [
                GLParam.Float("clipDistance"),
                GLParam.Int("index"),
                GLParam.Int("planeIndex")
            ],
            body: new GLBody(`
                builder_clipDistances[index][planeIndex] = builder_clipDistances[index][planeIndex] + clipDistance;
            `)
        });

        // Compose all builder_clipDistances[][] into gl_ClipDistance[]
        this.addFunction({
            name: new GLName("builder_composeClipDistance"),
            params: [ GLParam.Int("index") ],
            body: new GLBody(`
                for (int j = 0; j < MAX_CLIP_PLANES; j++) {
                    float composedClipDistance = 0.0;
                    for (int i = 0; i <= index; i++) {
                        composedClipDistance += builder_clipDistances[i][j];
                    }
                    gl_ClipDistance[j] = composedClipDistance / float(index + 1);
                }
            `)
        });
    }

    public addCullDistanceFunctions() {
        this.addFunction({
            name: new GLName("builder_initCullDistances"),
            body: new GLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_cullDistances[i] = 0.0;
                }
            `)
        });
        
        this.addFunction({
            name: new GLName("builder_setCullDistance"),
            params: [GLParam.Float("distance"), GLParam.Int("index")],
            body: new GLBody(`builder_cullDistances[index] = builder_cullDistances[index] + distance;`)
        });
        
        this.addFunction({
            name: new GLName("builder_composeCullDistances"),
            params: [GLParam.Int("index")],
            body: new GLBody(`
                float composedCullDistance = 0.0;
        
                for (int i = 0; i <= index; i++) {
                    composedCullDistance += builder_cullDistances[i];
                }
        
                gl_CullDistance[index] = composedCullDistance;
            `)
        });
    }
}
