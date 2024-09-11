import { GLSLBuilder, GLSLStruct, GLSLType } from "./GLSLBuilder";

class ComputeShaderBuilder extends GLSLBuilder {
    constructor(private struct: GLSLStruct) {
        super();
    }

    public get fragment() {        
        const vec4Count = this.struct.getVec4Count();  

        let layouts = '';
        let layoutInit = '';

        for (let i = 0; i < vec4Count; i++) {
            layouts += `layout(location = ${i}) out vec4 fragData${i};\n`;
            layoutInit += `fragData${i} = vec4(0.0, 0.0, 0.0, 0.0);\n`
        }

        return this.autoFormat(`
            #version 300 es

            // CONFIGURATION
            precision highp float;
            uniform sampler2D u_input;
            float u_textureWidth = ${vec4Count * 4}.0;
            in vec2 v_texCoord;

            // STRUCTS
            ${this._structs.join('\n')}
            
            // LAYOUTS
            ${layouts}

            // UNIFORMS
            ${this._uniforms.join('\n')}

            // VARYINGS
            ${this._varyings.join('\n')}

            // FUNCTIONS
            ${this.generateEncodeFunctions(this.struct)}
            ${this.generateDecodeFunctions(this.struct)}
            ${this._functions.join('\n')}
        
            void main() {
                ${layoutInit}   
                vec4 texel = texture(u_input, v_texCoord);
                X data = decodeX(texel, 0);
                ${this._mainBody.join('\n')}
                encodeX(data);  
            }
        `);

    }

    public get vertex() {
        return this.autoFormat(`
            #version 300 es

            in vec2 a_position;
            out vec2 v_texCoord;
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0, 1);
            }
        `);
    }

    generateDecodeFunctions(struct: GLSLStruct): string {
        let decodeFunctions = '';
        let funcs: string[] = [];

        decodeFunctions += `
            ${struct.name} decode${struct.name}(vec4 texel, int texelIndex) {
                ${struct.name} data;
                float texelOffset = 1.0 / u_textureWidth; 
                ${this.generateDecodeBody(struct)}
                return data;
            }
        `;

        for (const key in struct.definition) {
            const value = struct.definition[key];
            if (value instanceof GLSLStruct && !funcs.includes(`decode${value.name}`)) {
                // Generate decode function for nested struct
                decodeFunctions += this.generateDecodeFunctions(value);
                funcs.push(`decode${value.name}`);
            }
        }

        return decodeFunctions;
    }

    generateDecodeBody(struct: GLSLStruct): string {
        let decodeBody = '';
        let index = 0;

        const appendToData = (prop, childProp = '', isArray = false) => {
            let data = `data.${prop}`;

            if (isArray) {
                data += `${childProp}`;
            } else if (childProp) {
                data += `.${childProp}`;
            }

            decodeBody += `${data} = texel.${'rgba'[index % 4]};\n`;

            if (index % 4 === 3) {
                decodeBody += `texelIndex += 1;\n`;
                decodeBody += `texel = texture(u_input, vec2(v_texCoord.x + texelOffset * float(texelIndex), v_texCoord.y));\n`;
            }
            index++;
        };

        for (const propName in struct.definition) {
            const property = struct.definition[propName];
            if (property instanceof GLSLStruct) {
                decodeBody += `
                    vec4 nextTexel = texture(u_input, vec2(float(texelIndex) / u_textureWidth, v_texCoord.y));
                    data.${propName} = decode${property.name}(nextTexel, texelIndex);
                `;
            } else {
                switch (property) {
                    case GLSLType.Float:
                    case GLSLType.Int:
                    case GLSLType.UInt:
                        appendToData(propName);
                        break;
                    case GLSLType.Vec2:
                        appendToData(propName, 'x');
                        appendToData(propName, 'y');
                        break;
                    case GLSLType.Vec3:
                        appendToData(propName, 'x');
                        appendToData(propName, 'y');
                        appendToData(propName, 'z');
                        break;
                    case GLSLType.Vec4:
                        appendToData(propName, 'x');
                        appendToData(propName, 'y');
                        appendToData(propName, 'z');
                        appendToData(propName, 'w');
                        break;
                    case GLSLType.Mat3:
                        for (let row = 0; row < 3; row++) {
                            for (let col = 0; col < 3; col++) {
                                appendToData(propName, `[${row}][${col}]`, true);
                            }
                        }
                        break;
                    case GLSLType.Mat4:
                        for (let row = 0; row < 4; row++) {
                            for (let col = 0; col < 4; col++) {
                                appendToData(propName, `[${row}][${col}]`, true);
                            }
                        }
                        break;
                }
            }
        }

        return decodeBody;
    }

    generateEncodeFunctions(struct: GLSLStruct): string {
        let encodeFunctions = '';
        let funcs: string[] = [];

        encodeFunctions += `
            void encode${struct.name}(${struct.name} data) {
                ${this.generateEncodeBody(struct, "data")}
            }
        `;

        for (const key in struct.definition) {
            const value = struct.definition[key];
            if (value instanceof GLSLStruct && !funcs.includes(`encode${value.name}`)) {
                // Generate encode function for nested struct
                encodeFunctions += this.generateEncodeFunctions(value);
                funcs.push(`encode${value.name}`);
            }
        }

        return encodeFunctions;
    }

    generateEncodeBody(struct: GLSLStruct, data: string): string {
        let encodeBody = '';
        let index = 0;

        const appendToFrag = (prop, subProp = '', isArray = false) => {
            let dataValue = `${data}.${prop}`;

            if (isArray) {
                dataValue += `${subProp}`;
            } else if (subProp) {
                dataValue += `.${subProp}`;
            }

            encodeBody += `fragData${Math.floor(index / 4)}.${'rgba'[index % 4]} = ${dataValue};\n`;
            index++;
        };

        for (const propName in struct.definition) {
            const property = struct.definition[propName];
            if (property instanceof GLSLStruct) {
                encodeBody += `
                    encode${property.name}(${data}.${propName});
                `;
            } else {
                switch (property) {
                    case GLSLType.Float:
                    case GLSLType.Int:
                    case GLSLType.UInt:
                        appendToFrag(propName);
                        break;
                    case GLSLType.Vec2:
                        appendToFrag(propName, 'x');
                        appendToFrag(propName, 'y');
                        break;
                    case GLSLType.Vec3:
                        appendToFrag(propName, 'x');
                        appendToFrag(propName, 'y');
                        appendToFrag(propName, 'z');
                        break;
                    case GLSLType.Vec4:
                        appendToFrag(propName, 'x');
                        appendToFrag(propName, 'y');
                        appendToFrag(propName, 'z');
                        appendToFrag(propName, 'w');
                        break;
                    case GLSLType.Mat3:
                        for (let row = 0; row < 3; row++) {
                            for (let col = 0; col < 3; col++) {
                                appendToFrag(propName, `[${row}][${col}]`, true);
                            }
                        }
                        break;
                    case GLSLType.Mat4:
                        for (let row = 0; row < 4; row++) {
                            for (let col = 0; col < 4; col++) {
                                appendToFrag(propName, `[${row}][${col}]`, true);
                            }
                        }
                        break;
                }
            }
        }

        return encodeBody;
    }
}

export class ComputeShader<T> {
    private program: WebGLProgram;
    private framebuffer: WebGLFramebuffer;
    private textures: WebGLTexture[] = [];
    private currentTextureIndex: number = 0;
    public compiled: boolean = false;
    private vec4Count: number = 4;
    private positionBuffer: WebGLBuffer | null = null;

    protected shader: ComputeShaderBuilder = new ComputeShaderBuilder(this.struct);
    private static glContext: WebGL2RenderingContext;
    private _compute: () => string;

    constructor(private data: T[], private struct: GLSLStruct) {
        this.vec4Count = struct.getVec4Count();
    }

    public setProgram(compute: () => string) {
        this._compute = compute;
    }

    private get gl() {
        if (!ComputeShader.glContext) {
            const offscreenCanvas = new OffscreenCanvas(2048, 2048);
            ComputeShader.glContext = offscreenCanvas.getContext('webgl2') ?? new WebGL2RenderingContext();
        }
        return ComputeShader.glContext;
    }

    public get bufferSize() {
        return this.vec4Count * 4 * this.data.length
    }

    private compile() {
        this.shader.addStruct(this.struct);
        this.shader.addMainBody(this._compute?.() ?? "");
        this.gl.getExtension('OES_texture_float');
        this.gl.getExtension('EXT_color_buffer_float');

        this.program = this.createShaderProgram();
        this.framebuffer = this.createFramebuffer();
        this.compiled = true;

        console.log(this.shader.fragment)
    }

    private createShaderProgram(): WebGLProgram {
        const vertexShader = this.compileShader(this.shader.vertex, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(this.shader.fragment, this.gl.FRAGMENT_SHADER);
        const program = this.gl.createProgram()!;

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error('Error linking program: ' + this.gl.getProgramInfoLog(program));
        }

        return program;
    }

    private compileShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type)!;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error('Error compiling shader: ' + this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    private createTexture(floatData: Float32Array, i: number) {
        const texture = this.gl.createTexture()!;
        const target = this.gl.TEXTURE_2D;
        const level = 0;
        const internalformat = this.gl.RGBA32F;
        const width = this.vec4Count * 4;
        const height = 1;
        const border = 0;
        const format = this.gl.RGBA;
        const type = this.gl.FLOAT;
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(target, level, internalformat, width, height, border, format, type, floatData);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.textures.push(texture); 
    }

    private createFramebuffer(): WebGLFramebuffer {
        const framebuffer = this.gl.createFramebuffer()!;
        const width = this.vec4Count; 
        const floatData = this.serialize(this.data)
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.textures = [];  
    
        for (let i = 0; i < width; i++) {
            this.createTexture(floatData, i);
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER, 
                this.gl.COLOR_ATTACHMENT0 + i, 
                this.gl.TEXTURE_2D, 
                this.textures[i], 
                0
            );
        }
    
        for (let i = 0; i < width; i++) 
            this.createTexture(floatData, i);
    
        // Check if the framebuffer is complete
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);

        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete', status);
        }
    
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        return framebuffer;
    }
    
    
    public run() {
        if (!this.compiled) this.compile();
    
        const width = this.vec4Count; 
        const dataLength = this.data.length * 4;   
        const sourceTextures = this.currentTextureIndex * width; 
        const destinationTextures = (this.currentTextureIndex + 1) % 2 * width; 
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        for (let i = 0; i < width; i++) {
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER, 
                this.gl.COLOR_ATTACHMENT0 + i, 
                this.gl.TEXTURE_2D, 
                this.textures[destinationTextures + i], 
                0
            );
        }
    
        const buffers = new Array(width).fill(null).map((_, i) => this.gl.COLOR_ATTACHMENT0 + i);
        
        this.gl.drawBuffers(buffers);
        this.gl.viewport(0, 0, dataLength, 1);
        this.gl.useProgram(this.program);
    
        for (let i = 0; i < width; i++) {
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[sourceTextures + i]);
            // this.gl.uniform1i(this.gl.getUniformLocation(this.program, `u_input${i}`), i); 
        }
    
        if (!this.positionBuffer) {
            const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
            
            this.positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0); 
        } else {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        }
    
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.currentTextureIndex = (this.currentTextureIndex + 1) % 2;
    }
    
    
    public readData(): T[] {
        const width = this.vec4Count;
        const dataLength = this.data.length;
        const allFloatData = new Float32Array(dataLength * width * 4);  

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    
        for (let i = 0; i < width; i++) {
            const floatData = new Float32Array(dataLength * 4); 
    
            this.gl.readBuffer(this.gl.COLOR_ATTACHMENT0 + i);
            this.gl.readPixels(0, 0, dataLength, 1, this.gl.RGBA, this.gl.FLOAT, floatData);
    
            for (let j = 0; j < dataLength; j++) {
                for (let k = 0; k < 4; k++) {
                    allFloatData[j * width * 4 + i * 4 + k] = floatData[j * 4 + k];
                }
            }
        }
    
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        console.log(allFloatData)

        return this.deserialize(allFloatData);
    }    
    
    protected serialize(data: T[]): Float32Array {
        const floatData = new Float32Array(this.bufferSize);
        let i = 0;

        data.forEach(data => this.struct.serialize(data).forEach(value => floatData[i++] = value)) 

        return floatData;
    }

    protected deserialize(data: Float32Array): T[] {
        const entities: any[] = [];

        for (let i = 0; i < data.length; i += this.vec4Count * 4) {
            const subArray = data.subarray(i, i + this.vec4Count * 4);
            const entity = this.struct.deserialize(subArray);

            entities.push(entity)
        }

        return entities;
    }
}
