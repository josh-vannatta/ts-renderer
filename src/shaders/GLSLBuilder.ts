import * as THREE from "three";

export type GLSLUniforms = { [key: string]: THREE.IUniform };
export type GLSLVaryings = { [key: string]: any }
export type GLSLStructParams = { [key: string]: (GLSLType | GLSLStruct) };

 // GLSLTypes.ts
export enum GLSLType {
    Float = 'float',
    Int = 'int',
    UInt = 'uint',
    Vec2 = 'vec2',
    Vec3 = 'vec3',
    Vec4 = 'vec4',
    Mat3 = 'mat3',
    Mat4 = 'mat4',
    Sampler2D = 'sampler2D',
    SamplerCube = 'samplerCube',
    Bool = 'bool',
    Void = 'void'
}

export class GLSLParam {
    constructor(public type: GLSLType | string, public name: string, public DEFAULT: any = "") {}

    public static Float(name: string = "")       { return new GLSLParam(GLSLType.Float,      name, 0.01)}
    public static Int(name: string = "")         { return new GLSLParam(GLSLType.Int,        name, 0)}
    public static UInt(name: string = "")        { return new GLSLParam(GLSLType.UInt,       name, 0)}
    public static Vec2(name: string = "")        { return new GLSLParam(GLSLType.Vec2,       name, new THREE.Vector2())}
    public static Vec3(name: string = "")        { return new GLSLParam(GLSLType.Vec3,       name, new THREE.Vector3())}
    public static Vec4(name: string = "")        { return new GLSLParam(GLSLType.Vec4,       name, new THREE.Vector4())}
    public static Mat3(name: string = "")        { return new GLSLParam(GLSLType.Mat3,       name, new Array(9).fill(0))}
    public static Mat4(name: string = "")        { return new GLSLParam(GLSLType.Mat4,       name, new Array(16).fill(0))}
    public static Sampler2D(name: string = "")   { return new GLSLParam(GLSLType.Sampler2D,  name, "")}
    public static SamplerCube(name: string = "") { return new GLSLParam(GLSLType.SamplerCube,name, "")}
    public static Bool(name: string = "")        { return new GLSLParam(GLSLType.Bool,       name, false)}
}

export class GLSLFunction {
    public returnType: GLSLType | string;
    public name: GLSLName;
    public params: GLSLParam[];
    public body: GLSLBody;

    constructor(opts: Partial<GLSLFunction>) {
        this.returnType = opts.returnType ?? GLSLType.Void;
        this.name = opts.name ?? new GLSLName("function");
        this.params = opts.params ?? [];
        this.body = opts.body ?? new GLSLBody('');
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

export class GLSLName {
    constructor(private name: string) {}

    public toString() {
        return this.name.replace(" ", "".replace('\n', ''));
    }
}

export class GLSLBody {
    constructor(private main: string) {}

    public toString() {
        const lines = this.main.split('\n');

        return lines.filter(l => l.length > 0).join('\n')
    }
}

export class GLSLStruct {
    constructor(
        public name: string, 
        public definition: GLSLStructParams
    ) {}

    /**
     * Recursively calculate how many vec4s (layouts) are needed based on the number of properties.
     * This will handle both flat and nested structs, with different sizes for each GLSLType.
     */
    getVec4Count(): number {
        let count = 0;

        for (const key in this.definition) {
            const value = this.definition[key];
            if (value instanceof GLSLStruct) {
                count += value.getVec4Count();  // Recursively calculate for nested structs
            } else {
                count += this.getTypeSize(value);  // Add the size based on the type
            }
        }

        return Math.ceil(count / 4);  // One vec4 can hold 4 floats
    }

    /**
     * Serialize the object recursively into a Float32Array, based on the type of each field.
     */
    serialize(data: any): Float32Array {
        const arrayLength = this.getVec4Count() * 4;  // Number of floats
        const floatArray = new Float32Array(arrayLength);
        let index = 0;

        for (const key in this.definition) {
            const value = this.definition[key];
            if (value instanceof GLSLStruct) {
                const nestedArray = value.serialize(data[key]);
                nestedArray.forEach((val: number) => floatArray[index++] = val);
            } else {
                index = this.serializeField(floatArray, index, data[key], value);
            }
        }

        return floatArray;
    }

    /**
     * Deserialize the Float32Array back into the object recursively, based on the type of each field.
     */
    deserialize(floatArray: Float32Array): any {
        const data: any = {};
        let index = 0;

        for (const key in this.definition) {
            const value = this.definition[key];
            if (value instanceof GLSLStruct) {
                const subArray = floatArray.subarray(index, index + value.getVec4Count() * 4);
                data[key] = value.deserialize(subArray);
                index += subArray.length;
            } else {
                [data[key], index] = this.deserializeField(floatArray, index, value);
            }
        }

        return data;
    }

    /**
     * Return the size (in floats) of a GLSLType.
     */
    private getTypeSize(type: GLSLType): number {
        switch (type) {
            case GLSLType.Float:
            case GLSLType.Int:
            case GLSLType.UInt:
            case GLSLType.Bool:
                return 1;
            case GLSLType.Vec2:
                return 2;
            case GLSLType.Vec3:
                return 3;
            case GLSLType.Vec4:
                return 4;
            case GLSLType.Mat3:
                return 9;
            case GLSLType.Mat4:
                return 16;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
    }

    /**
     * Serialize a single field into the Float32Array based on its GLSLType.
     */
    private serializeField(floatArray: Float32Array, index: number, value: any, type: GLSLType): number {
        switch (type) {
            case GLSLType.Float:
            case GLSLType.Int:
            case GLSLType.UInt:
            case GLSLType.Bool:
                floatArray[index++] = value;
                break;
            case GLSLType.Vec2:
                floatArray[index++] = value.x;
                floatArray[index++] = value.y;
                break;
            case GLSLType.Vec3:
                floatArray[index++] = value.x;
                floatArray[index++] = value.y;
                floatArray[index++] = value.z;
                break;
            case GLSLType.Vec4:
                floatArray[index++] = value.x;
                floatArray[index++] = value.y;
                floatArray[index++] = value.z;
                floatArray[index++] = value.w;
                break;
            case GLSLType.Mat3:
                for (let i = 0; i < 9; i++) {
                    floatArray[index++] = value.elements[i];
                }
                break;
            case GLSLType.Mat4:
                for (let i = 0; i < 16; i++) {
                    floatArray[index++] = value.elements[i];
                }
                break;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }
        return index;
    }

    /**
     * Deserialize a single field from the Float32Array based on its GLSLType.
     */
    private deserializeField(floatArray: Float32Array, index: number, type: GLSLType): [any, number] {
        let value: any;

        switch (type) {
            case GLSLType.Float:
            case GLSLType.Int:
            case GLSLType.UInt:
            case GLSLType.Bool:
                value = floatArray[index++];
                break;
            case GLSLType.Vec2:
                value = { x: floatArray[index++], y: floatArray[index++] };
                break;
            case GLSLType.Vec3:
                value = { x: floatArray[index++], y: floatArray[index++], z: floatArray[index++] };
                break;
            case GLSLType.Vec4:
                value = { x: floatArray[index++], y: floatArray[index++], z: floatArray[index++], w: floatArray[index++] };
                break;
            case GLSLType.Mat3:
                value = { elements: floatArray.slice(index, index + 9) };
                index += 9;
                break;
            case GLSLType.Mat4:
                value = { elements: floatArray.slice(index, index + 16) };
                index += 16;
                break;
            default:
                throw new Error(`Unsupported GLSL type: ${type}`);
        }

        return [value, index];
    }
}

export class GLSLBuilder {
    protected _attributes: string[] = [];
    protected _uniforms: string[] = [];
    protected _varyings: string[] = [];
    protected _functions: string[] = [];
    protected _structs: string[] = [];
    protected _mainBody: GLSLBody[] = [];
    protected _maxEffects: number = 1;
    private _structNames: Record<string, boolean> = {};
    public index: number = 0;

    setMaxEffects(max: number) {
        this._maxEffects = max > 0 ? max : 0;
    }

    setIndex(index: number) {
        this.index = index > 0 ? index : 0;
    }

    addAttribute(type: GLSLType, name: string): this {
        this._attributes.push(`attribute ${type} ${name};`);
        return this;
    }

    addUniform(type: GLSLType, name: string): this {
        this._uniforms.push(`uniform ${type} ${name};`);
        return this;
    }

    addVarying(type: GLSLType, name: string): this {
        this._varyings.push(`varying ${type} ${name};`);
        return this;
    }

    addFunction(glslFunction: Partial<GLSLFunction>): this {
        this._functions.push(new GLSLFunction(glslFunction).build());
        return this;
    }

    addMainBody(code: string): this {
        this._mainBody.push(new GLSLBody(code));
        return this;
    }

    addUniforms(uniforms: GLSLUniforms): this {
        for (const [key, uniform] of Object.entries(uniforms)) {
            const type = this.getType(uniform.value);
            this.addUniform(type, key);
        }
        return this;
    }

    addVaryings(uniforms: GLSLVaryings): this {
        for (const [key, varying] of Object.entries(uniforms)) {
            const type = this.getType(varying);
            this.addVarying(type, key);
        }
        return this;
    }

    addStruct<T extends GLSLStruct>(struct: T): this {
        const structName = struct.name;

        if (this._structNames[structName])
            return this;
        
        let structString = `struct ${structName} {\n`;

        for (const key in struct.definition) {
            const paramType = struct.definition[key];

            if (paramType instanceof GLSLStruct) {
                // Recursively add nested struct definitions
                this.addStruct(paramType as GLSLStruct);
                structString += `    ${paramType.name} ${key};\n`; // Use the nested struct name
            } else {
                structString += `    ${paramType} ${key};\n`;
            }
        }

        structString += `};\n`;

        this._structs.push(structString);
        this._structNames[structName] = true;
        
        return this;
    }

    getType(value: any): GLSLType {
        if (value instanceof THREE.Color) return GLSLType.Vec3;
        if (value instanceof THREE.Vector2) return GLSLType.Vec2;
        if (value instanceof THREE.Vector3) return GLSLType.Vec3;
        if (value instanceof THREE.Vector4) return GLSLType.Vec4;
        if (value instanceof THREE.Matrix3) return GLSLType.Mat3;
        if (value instanceof THREE.Matrix4) return GLSLType.Mat4;
        if (typeof value === 'number') return GLSLType.Float;
        if (typeof value === 'boolean') return GLSLType.Bool;
        if (value instanceof THREE.Texture) return GLSLType.Sampler2D;
        // Extend this with more types as needed
        return GLSLType.Float;
    }

    build() : string {
        return this.autoFormat(`
            ${this._structs.join('\n')}
            
            ${this._attributes.join('\n')}
            ${this._uniforms.join('\n')}
            ${this._varyings.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                ${this._mainBody.join('\n')}
            }
        `);
    }

    autoFormat(code: string) {
        let lines = code.split('\n');

        let indentLevel = 0;

        if (lines.length > 0 && lines[0].length == 0)
            lines.shift()
            
        const indentSize = 4; // Number of spaces per indent level
        const indentedLines = lines.map((line) => {
            let trimmedLine = line.trim();

            if (trimmedLine.length == 0)
                return ''
    
            if (trimmedLine.endsWith('}') || trimmedLine.startsWith('}')) 
                indentLevel = Math.max(0, indentLevel - 1);
    
            const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;
    
            if (trimmedLine.endsWith('{')) 
                indentLevel += 1;
    
            return indentedLine;
        });
    
        return indentedLines.join('\n');
    }
}

export class FragmentShaderBuilder extends GLSLBuilder {
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
            name: new GLSLName("builder_initColors"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_colors[i] = vec4(0.0);
                }
            `)
        });

        this.addFunction({
            name: new GLSLName("builder_setColor"),
            params: [ GLSLParam.Vec4("color"), GLSLParam.Int("index") ],
            body: new GLSLBody(`builder_colors[index] = builder_colors[index] + color;`)
        });

        this.addFunction({
            name: new GLSLName( "builder_composeColors"),
            params: [ GLSLParam.Int("index")],
            body: new GLSLBody(`
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
            name: new GLSLName("builder_initFragData"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_fragData[i] = vec4(0.0);
                }
            `)
        });
        
        this.addFunction({
            name: new GLSLName("builder_setFragData"),
            params: [GLSLParam.Vec4("data"), GLSLParam.Int("index")],
            body: new GLSLBody(`builder_fragData[index] = builder_fragData[index] + data;`)
        });
        
        this.addFunction({
            name: new GLSLName("builder_composeFragData"),
            params: [GLSLParam.Int("index")],
            body: new GLSLBody(`
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
            name: new GLSLName("builder_initSampleMask"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_sampleMask[i] = 0u;
                }
            `)
        });
        
        this.addFunction({
            name: new GLSLName("builder_setSampleMask"),
            params: [
                GLSLParam.UInt("mask"),  // uint mask parameter
                GLSLParam.Int("effect"), // effect index
            ],
            body: new GLSLBody(`
                builder_sampleMask[effect] |= mask;
            `)
        });
        
        this.addFunction({
            name: new GLSLName("builder_composeSampleMask"),
            params: [
                GLSLParam.Int("effect")
            ],
            body: new GLSLBody(`
                uint composedMask = 0u;
                for (int i = 0; i <= effect; i++) {
                    composedMask |= builder_sampleMask[i];
                }
                gl_SampleMask[0] = composedMask;
            `)
        });
    }
}


export class VertexShaderBuilder extends GLSLBuilder {
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
            name: new GLSLName("builder_initPosition"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_positions[i] = vec4(0.0);
                }
            `)
        });

        // Set builder_positions[effect] for a specific effect
        this.addFunction({
            name: new GLSLName("builder_setPosition"),
            params: [ GLSLParam.Vec4("position"), GLSLParam.Int("index") ],
            body: new GLSLBody(`
                builder_positions[index] = builder_positions[index] + position;
            `)
        });

        // Compose all builder_positions[] into gl_Position
        this.addFunction({
            name: new GLSLName("builder_composePosition"),
            params: [ GLSLParam.Int("index") ],
            body: new GLSLBody(`
                vec4 composedPosition = vec4(0.0);
                for (int i = 0; i <= index; i++) {
                    composedPosition += builder_positions[i];
                }
                gl_Position = composedPosition / float(index + 1);
            `)
        });

        // Initialize builder_pointSizes[]
        this.addFunction({
            name: new GLSLName("builder_initPointSize"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_pointSizes[i] = 0.0;
                }
            `)
        });

        // Set builder_pointSizes[effect] for a specific effect
        this.addFunction({
            name: new GLSLName("builder_setPointSize"),
            params: [ GLSLParam.Float("pointSize"), GLSLParam.Int("index") ],
            body: new GLSLBody(`
                builder_pointSizes[index] = builder_pointSizes[index] + pointSize;
            `)
        });

        // Compose all builder_pointSizes[] into gl_PointSize
        this.addFunction({
            name: new GLSLName("builder_composePointSize"),
            params: [ GLSLParam.Int("index") ],
            body: new GLSLBody(`
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
            name: new GLSLName("builder_initClipDistance"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    for (int j = 0; j < MAX_CLIP_PLANES; j++) {
                        builder_clipDistances[i][j] = 0.0;
                    }
                }
            `)
        });

        // Set builder_clipDistances[effect][planeIndex] for a specific effect and clip plane
        this.addFunction({
            name: new GLSLName("builder_setClipDistance"),
            params: [
                GLSLParam.Float("clipDistance"),
                GLSLParam.Int("index"),
                GLSLParam.Int("planeIndex")
            ],
            body: new GLSLBody(`
                builder_clipDistances[index][planeIndex] = builder_clipDistances[index][planeIndex] + clipDistance;
            `)
        });

        // Compose all builder_clipDistances[][] into gl_ClipDistance[]
        this.addFunction({
            name: new GLSLName("builder_composeClipDistance"),
            params: [ GLSLParam.Int("index") ],
            body: new GLSLBody(`
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
            name: new GLSLName("builder_initCullDistances"),
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_cullDistances[i] = 0.0;
                }
            `)
        });
        
        this.addFunction({
            name: new GLSLName("builder_setCullDistance"),
            params: [GLSLParam.Float("distance"), GLSLParam.Int("index")],
            body: new GLSLBody(`builder_cullDistances[index] = builder_cullDistances[index] + distance;`)
        });
        
        this.addFunction({
            name: new GLSLName("builder_composeCullDistances"),
            params: [GLSLParam.Int("index")],
            body: new GLSLBody(`
                float composedCullDistance = 0.0;
        
                for (int i = 0; i <= index; i++) {
                    composedCullDistance += builder_cullDistances[i];
                }
        
                gl_CullDistance[index] = composedCullDistance;
            `)
        });
    }
}
