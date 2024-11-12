import { GLBody, GLBuilder, GLName, GLParam, GLVersion } from "./GLSchema";
import { GLContext } from "./GLContext";
import { GLFunction } from "./GLFunction";
import { GLType } from "./GLProgram";
import { ShaderType } from "./GLShader";

export class GLTextureBuffer {
    private gl: WebGL2RenderingContext;
    private textures: WebGLTexture[][] = [];
    private framebuffers: WebGLFramebuffer[] = [];
    private swapIndex = 0;
    public width: number;
    public height: number;
    private capacity: number; // The max number of vec4's a single texture can hold

    constructor(context: GLContext, data: Float32Array) {
        this.gl = context.gl;
        this.width = context.width;
        this.height = context.height;
        
        // Calculate capacity based on width and height (number of vec4's)
        this.capacity = this.width * this.height * 4; // Total floats per texture

        // Calculate the number of textures needed
        const textureCount = Math.ceil(data.length / this.capacity);
        
        // Initialize textures and framebuffers for ping-pong rendering
        for (let i = 0; i < 2; i++) { // Two sets for ping-ponging
            const textures: WebGLTexture[] = [];

            for (let j = 0; j < textureCount; j++) {
                // Slice the data for each texture, filling the rest with zeros if necessary
                const start = j * this.capacity;
                const end = start + this.capacity;
                const textureData = new Float32Array(this.capacity);
                textureData.set(data.slice(start, end)); // Fill with data, remaining values will be zero
                
                textures.push(this.createTexture(textureData));
            }

            this.textures.push(textures);
            this.framebuffers.push(this.createFramebuffer(textures));
        }
    }

    private createTexture(data: Float32Array): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D, 0, this.gl.RGBA32F,
            this.width, this.height, 0,
            this.gl.RGBA, this.gl.FLOAT, data
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return texture;
    }

    private createFramebuffer(textures: WebGLTexture[]): WebGLFramebuffer {
        const framebuffer = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

        // Attach each texture to a different color attachment point
        textures.forEach((texture, index) => {
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER, 
                this.gl.COLOR_ATTACHMENT0 + index, 
                this.gl.TEXTURE_2D, 
                texture, 
                0
            );
        });

        const drawBuffers = textures.map((_, index) => this.gl.COLOR_ATTACHMENT0 + index);
        this.gl.drawBuffers(drawBuffers);

        if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("Framebuffer is incomplete.");
        }

        return framebuffer;
    }

    public get readFramebuffer(): WebGLFramebuffer {
        return this.framebuffers[this.swapIndex];
    }

    public get writeFramebuffer(): WebGLFramebuffer {
        return this.framebuffers[(this.swapIndex + 1) % this.framebuffers.length];
    }

    public get readTextures(): WebGLTexture[] {
        return this.textures[this.swapIndex];
    }

    public swap() {
        this.swapIndex = (this.swapIndex + 1) % this.textures.length;
    }

    public dispose() {
        this.textures.flat().forEach(texture  => this.gl.deleteTexture(texture));
        this.framebuffers.forEach(framebuffer => this.gl.deleteFramebuffer(framebuffer));
    }

    public static textureCount(context: GLContext, dataLength: number) {
        const capacity = context.width * context.height * 4; 
        return Math.ceil(dataLength / capacity);
    }

    public static shader(type: ShaderType, context?: GLContext, textureCount: number = 0) {
        if (type == ShaderType.Vertex) {
            return new GLBuilder(GLVersion.WebGL2)
                .addInput(GLType.Vec3, "a_position")
                .addMainBody(`gl_Position = vec4(a_position, 1.0);`);
        }

        const builder = new GLBuilder();

        if (!context)
            return builder;
        
        for (let i = 0; i < textureCount; i++) 
            builder.addLayout(`fragColor${i}`, i)  

        builder.addFunction(GLFunction.List.findByIndex("u_textures", textureCount));
        builder.addUniform(GLType.Sampler2D, `u_textures[${textureCount}]`)
        builder.addMainBody(`vec2 uv = gl_FragCoord.xy / vec2(${context.width},${context.height});`)

        return builder;
    }
}
