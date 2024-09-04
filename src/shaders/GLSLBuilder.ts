import dedent from "dedent-js";
import * as THREE from "three";


export type GLSLUniforms = { [key: string]: THREE.IUniform };
export type GLSLVaryings = { [key: string]: any }

 // GLSLTypes.ts
export enum GLSLType {
    Float = 'float',
    Vec2 = 'vec2',
    Vec3 = 'vec3',
    Vec4 = 'vec4',
    Mat3 = 'mat3',
    Mat4 = 'mat4',
    Int = 'int',
    Sampler2D = 'sampler2D',
    SamplerCube = 'samplerCube',
    Bool = 'bool',
    Void = 'void'
}

export class GLSLParam {
    constructor(public type: GLSLType, public name: string) {}

    public static Float(name: string) { return new GLSLParam(GLSLType.Float, name)}
    public static Vec2(name: string) { return new GLSLParam(GLSLType.Vec2, name)}
    public static Vec3(name: string) { return new GLSLParam(GLSLType.Vec3, name)}
    public static Vec4(name: string) { return new GLSLParam(GLSLType.Vec4, name)}
    public static Mat3(name: string) { return new GLSLParam(GLSLType.Mat3, name)}
    public static Mat4(name: string) { return new GLSLParam(GLSLType.Mat4, name)}
    public static Int(name: string) { return new GLSLParam(GLSLType.Int, name)}
    public static Sampler2D(name: string) { return new GLSLParam(GLSLType.Sampler2D, name)}
    public static SamplerCube(name: string) { return new GLSLParam(GLSLType.SamplerCube, name)}
    public static Bool(name: string) { return new GLSLParam(GLSLType.Bool, name)}
}

export class GLSLFunction {
    public returnType: GLSLType;
    public name: string;
    public parameters: GLSLParam[];
    public body: GLSLBody;

    constructor(opts: Partial<GLSLFunction>) {
        this.returnType = opts.returnType ?? GLSLType.Void;
        this.name = opts.name ?? "name";
        this.parameters = opts.parameters ?? [];
        this.body = opts.body ?? new GLSLBody('');
    }

    build(): string {
        const params = this.parameters.map(param => `${param.type} ${param.name}`).join(', ');
        return `
            ${this.returnType} ${this.name}(${params}) {
                ${this.body}
            }
        `;
    }
}

export class GLSLBody {
    constructor(private main: string) {}

    public toString() {
        const lines = this.main.split('\n');

        return lines.filter(l => l.length > 0).join('\n')
    }
}

export class GLSLBuilder {
    protected _attributes: string[] = [];
    protected _uniforms: string[] = [];
    protected _varyings: string[] = [];
    protected _functions: string[] = [];
    protected _mainBody: GLSLBody[] = [];
    protected _maxEffects: number = 1;
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
        return this.autoIndentGLSL(`
            ${this._attributes.join('\n')}
            ${this._uniforms.join('\n')}
            ${this._varyings.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                ${this._mainBody.join('\n')}
            }
        `);
    }

    autoIndentGLSL(code: string) {
        const lines = code.split('\n');

        let indentLevel = 0;
        
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
        return this.autoIndentGLSL(`
            const int MAX_EFFECTS = ${this._maxEffects};

            precision mediump float;
            vec4 builder_colors[MAX_EFFECTS];
            
            ${this._uniforms.join('\n')}
            ${this._varyings.join('\n')}
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
            name: "builder_initColors",
            body: new GLSLBody(`
                for (int i = 0; i < MAX_EFFECTS; i++) {
                    builder_colors[i] = vec4(0.0);
                }
            `)
        });

        this.addFunction({
            name: "builder_setColor",
            parameters: [ GLSLParam.Vec4("color"), GLSLParam.Int("effect") ],
            body: new GLSLBody(`builder_colors[effect] = builder_colors[effect] + color;`)
        });

        this.addFunction({
            name: "builder_composeColors",
            parameters: [ GLSLParam.Int("effect")],
            body: new GLSLBody(`
                vec4 composedColor = vec4(0.0);

                for (int i = 0; i <= effect; i++) {
                    composedColor += builder_colors[i];
                }

                gl_FragColor = composedColor / float(effect + 1);
            `)
        });
    }
}


export class VertexShaderBuilder extends GLSLBuilder {
    build(): string {
        return this.autoIndentGLSL(`
            const int MAX_EFFECTS = ${this._maxEffects};

            precision mediump float;

            ${this._uniforms.join('\n')}
            ${this._varyings.join('\n')}
            ${this._functions.join('\n')}

            void main() {
                ${this._mainBody.join('\n')}
            }
        `);
    }
}
