import { ArrayUtils } from "../utils/ArrayUtils";
import { GLSLBuilder, GLSLSchema, GLSLStruct, GLSLType } from "./GLSLBuilder";

class ComputeShaderBuilder extends GLSLBuilder {
    constructor(private struct: GLSLStruct) {
        super();
    }

    public get fragment() {
        const vec4Count = this.struct.getVec4Count();
    
        let layouts = '';
        let layoutInit = '';
        let uniforms = '';
        
        for (let i = 0; i < vec4Count; i++) {
            layouts += `layout(location = ${i}) out vec4 fragData${i};\n`;
            layoutInit += `fragData${i} = vec4(0.0, 0.0, 0.0, 0.0);\n`;
            uniforms += `uniform sampler2D u_input${i};\n`;
        }
    
        return this.autoFormat(`
            #version 300 es
    
            // CONFIGURATION
            precision highp float;
            in vec2 v_texCoord;
    
            // STRUCTS
            ${this._structs.join('\n')}
            
            // LAYOUTS
            ${layouts}
    
            // UNIFORMS
            ${uniforms}
            ${this._uniforms.join('\n')}
    
            // VARYINGS
            ${this._varyings.join('\n')}
    
            // FUNCTIONS
            ${this.generateEncodeFunctions(this.struct)}
            ${this.generateDecodeFunctions(this.struct)}
            ${this._functions.join('\n')}
        
            void main() {
                ${layoutInit}   
                ${this.struct.name} data = decode${this.struct.name}();
                
                ${this._mainBody.join('\n')}
                encode${this.struct.name}(data);  
            }
        `);
    }    

    public get vertex() {
        return this.autoFormat(`
        #version 300 es

        precision highp float;
        in vec2 a_position;
        out vec2 v_texCoord;
        
        uniform float u_numObjects;  // Number of objects
        uniform float u_numLayers;   // Number of layers (property groups)
        uniform float u_textureWidth;  // Width of the texture (in texels)
        
        void main() {
            // Get the current vertex index
            gl_PointSize = 1.0;
            int vertexID = int(gl_VertexID);
        
            // Compute the object index and the layer index from the vertexID
            int objectIndex = vertexID / int(u_numLayers);  // Integer division to get the object
            int layerIndex = vertexID % int(u_numLayers);   // Modulo to get the layer within the object
        
            // Calculate the texture coordinate for each object and property layer
            float xCoord = (float(objectIndex) * 4.0) / u_textureWidth; // Spread across texture width
            float yCoord = float(layerIndex) / u_numLayers;  // Spread across the layers (y-axis)
        
            // Assign the calculated texture coordinates
            v_texCoord = vec2(xCoord, yCoord);
        
            // Set the position of the vertex
            gl_Position = vec4(a_position, 0.0, 1.0);
        }        
        `);
    }

    generateDecodeFunctions(struct: GLSLStruct): string {
        return `
            ${struct.name} decode${struct.name}() {
                ${struct.name} data;
                vec4 texel = texture(u_input0, v_texCoord);
                ${this.generateDecodeBody(struct, "data", 0)}
                return data;
            }
        `;
    }

    generateDecodeBody(struct: GLSLStruct, variable: string, index: number): string {
        let decodeBody = '';

        const appendToData = (prop, childProp = '', isArray = false) => {
            let data = `${variable}.${prop}`;

            if (isArray) {
                data += `${childProp}`;
            } else if (childProp) {
                data += `.${childProp}`;
            }

            decodeBody += `${data} = texel.${'rgba'[index % 4]};\n`;

            if (index % 4 === 3) {
                decodeBody += `texel = texture(u_input${Math.floor(index / 4) + 1}, v_texCoord);\n`;
            }
            index++;
        };

        for (const propName in struct.definition) {
            const property = struct.definition[propName];
            if (property instanceof GLSLStruct) {
                decodeBody += this.generateDecodeBody(property, `${variable}.${propName}`, index);
                index += property.getVec4Count() * 4 -1;
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
        return `
            void encode${struct.name}(${struct.name} data) {
                ${this.generateEncodeBody(struct, "data", 0)}
            }
        `;
    }

    generateEncodeBody(struct: GLSLStruct, data: string, index = 0): string {
        let encodeBody = '';

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
                encodeBody += this.generateEncodeBody(property, `${data}.${propName}`, index);
                index += property.getVec4Count() * 4 - 1;
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
    private uniforms: Map<string, { type: GLSLType, value: any, location: WebGLUniformLocation | null }> = new Map();

    protected shader: ComputeShaderBuilder = new ComputeShaderBuilder(this.struct);
    private static glContext: WebGL2RenderingContext;

    private _compute: (() => void)[] = []
    private _mainBody: string = "";

    constructor(private data: T[], private struct: GLSLSchema) {
        this.vec4Count = struct.getVec4Count();
        this.addUniform("u_textureWidth", GLSLType.Float, data.length * 4)
        this.addUniform("u_numObjects", GLSLType.Float, data.length)
        this.addUniform("u_numLayers", GLSLType.Float, this.vec4Count)
    }

    public addUniform(name: string, type: GLSLType, value: any) {
        // Store the uniform with its initial value, type, and a placeholder for location
        this.uniforms.set(name, { type, value, location: null });
        this.shader.addUniform(type, name);
    }

    public updateUniform(name: string, value: any) {
        const uniform = this.uniforms.get(name);
        if (!uniform) {
            throw new Error(`Uniform ${name} not found`);
        }
        uniform.value = value;
    }
    
    private initUniforms() {
        this.uniforms.forEach((uniform, name) => {
            const location = this.gl.getUniformLocation(this.program, name);
            if (!location) {
                console.error(`Uniform location for ${name} not found`);
            }
            uniform.location = location;
        });
    }
    
    private setUniforms() {
        this.uniforms.forEach((uniform, name) => {
            const { type, value, location } = uniform;

            switch (type) {
                case GLSLType.Float:
                    this.gl.uniform1f(location, value);
                    break;
                case GLSLType.Int:
                case GLSLType.UInt:
                    this.gl.uniform1i(location, value);
                    break;
                case GLSLType.Vec2:
                    this.gl.uniform2f(location, value.x, value.y);
                    break;
                case GLSLType.Vec3:
                    this.gl.uniform3f(location, value.x, value.y, value.z);
                    break;
                case GLSLType.Vec4:
                    this.gl.uniform4f(location, value.x, value.y, value.z, value.w);
                    break;
                case GLSLType.Mat3:
                    this.gl.uniformMatrix3fv(location, false, value.elements);
                    break;
                case GLSLType.Mat4:
                    this.gl.uniformMatrix4fv(location, false, value.elements);
                    break;
                case GLSLType.Sampler2D:
                    this.gl.uniform1i(location, value); // Used for textures
                    break;
                case GLSLType.Bool:
                    this.gl.uniform1i(location, value ? 1 : 0);
                    break;
                default:
                    throw new Error(`Unsupported uniform type: ${type}`);
            }
        });
    }


    public onCompute(computeFunction: () => void) {
        this._compute.push(computeFunction);
    }

    public setProgram(program: (data: string) => string) {
        this._mainBody = program("data");
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
        this.shader.addMainBody(this._mainBody);
        this.gl.getExtension('OES_texture_float');
        this.gl.getExtension('EXT_color_buffer_float');

        console.log(this.shader.fragment)
        console.log(this.shader.vertex)

        this.program = this.createShaderProgram();
        this.initUniforms();
        this.framebuffer = this.createFramebuffer();
        this.compiled = true;
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
        const width = floatData.length / 4;
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
        const subArray = ArrayUtils.subFloat32(floatData, 4);
        const textureData: Float32Array[] = [];

        for (let i = 0; i < width; i++) {
            const data: Float32Array[] = [];

            for (let j = 0; j < this.data.length; j++)
                data.push(subArray[i + j * width])

            textureData.push(ArrayUtils.concatFloat32(...data));
        }

        this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.textures = [];  
    
        for (let i = 0; i < width; i++) {
            this.createTexture(textureData[i], i);
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER, 
                this.gl.COLOR_ATTACHMENT0 + i, 
                this.gl.TEXTURE_2D, 
                this.textures[i], 
                0
            );
        }
    
        for (let i = 0; i < width; i++) {
            this.createTexture(textureData[i], i);
        }

        console.log(textureData)

        // Check if the framebuffer is complete
        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);

        if (status !== this.gl.FRAMEBUFFER_COMPLETE) 
            console.error('Framebuffer is not complete', status);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        return framebuffer;
    }
    
    public positionArray() {
        const numObjects = this.data.length;
        const numProperties = this.struct.propertyCount;
        const numTexelsPerObject = Math.ceil(numProperties / 4);  // Number of texel layers needed per object
        const positions = new Float32Array(numObjects * numTexelsPerObject * 2);
    
        for (let i = 0; i < numObjects; i++) {
            for (let j = 0; j < numTexelsPerObject; j++) {
                const index = (i * numTexelsPerObject + j) * 2;
    
                // x position normalized [-1, 1] across numObjects
                positions[index] = (i / (numObjects - 1)) * 2.0 - 1.0;  // Normalized X
                
                // y position normalized [-1, 1] across numTexelsPerObject
                positions[index + 1] = (j / (numTexelsPerObject - 1)) * 2.0 - 1.0;  // Normalized Y
            }
        }

        console.log(positions)
    
        // return new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        return positions;
    }
    
    public run() {
        if (!this.compiled) this.compile();

        this._compute.forEach(compute => compute());
    
        const width = this.vec4Count; 
        const dataLength = this.data.length * 4;   
        const sourceTextures = this.currentTextureIndex * width; 
        const destinationTextures = (this.currentTextureIndex + 1) % 2 * width; 

        this.updateUniform("u_textureWidth", dataLength);        
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
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, `u_input${i}`), i); 
        }
        
        this.setUniforms();

        if (!this.positionBuffer) {
            const position = this.gl.getAttribLocation(this.program, 'a_position');
            
            this.positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positionArray(), this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(position);
            this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0); 
        } else {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        }
    
        this.gl.drawArrays(this.gl.POINTS, 0, this.data.length * width);
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

    public dispose() {
        // Delete textures
        this.textures.forEach(texture => {
            this.gl.deleteTexture(texture);
        });
        this.textures = [];
    
        // Delete framebuffer
        if (this.framebuffer) {
            this.gl.deleteFramebuffer(this.framebuffer);
            this.framebuffer = null as any;
        }
    
        // Delete shaders and program
        if (this.program) {
            const attachedShaders = this.gl.getAttachedShaders(this.program);
            if (attachedShaders) {
                attachedShaders.forEach(shader => {
                    this.gl.detachShader(this.program, shader);
                    this.gl.deleteShader(shader);
                });
            }
            this.gl.deleteProgram(this.program);
            this.program = null as any;
        }
    
        // Delete position buffer
        if (this.positionBuffer) {
            this.gl.deleteBuffer(this.positionBuffer);
            this.positionBuffer = null;
        }
    
        console.log("Compute shader resources have been disposed.");
    }
    
}
