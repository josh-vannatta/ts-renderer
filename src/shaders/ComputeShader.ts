export abstract class ComputeShader<T> {
    protected gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private framebuffer: WebGLFramebuffer;
    private textures: WebGLTexture[] = [];
    private data: T;
    private currentTextureIndex: number = 0;

    constructor(gl: any, data: T) {
        this.gl = gl;
        this.data = data;

        // Enable extensions
        this.gl.getExtension('OES_texture_float');
        this.gl.getExtension('EXT_color_buffer_float');

        // Create shader program
        this.program = this.createShaderProgram(this.getShader());

        // Create two textures for ping-ponging and framebuffer
        this.textures = [this.encodeDataToTexture(data), this.encodeDataToTexture(data)];
        this.framebuffer = this.createFramebuffer(this.textures[0]);
    }

    // Abstract methods for serialization, deserialization, and shader code
    protected abstract serialize(data: T): Float32Array;
    protected abstract deserialize(data: Float32Array): T;
    protected abstract getShader(): string;

    // Compile and link shader program
    private createShaderProgram(fragmentShaderSource: string): WebGLProgram {
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0, 1);
            }
        `;

        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error('Error linking program: ' + this.gl.getProgramInfoLog(program));
        }

        return program;
    }

    // Compile individual shader (vertex/fragment)
    private compileShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error('Error compiling shader: ' + this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    // Encode data into a texture using the `serialize` method
    private encodeDataToTexture(data: T): WebGLTexture {
        const texture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        const floatData = this.serialize(data);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, floatData.length / 4, 1, 0, this.gl.RGBA, this.gl.FLOAT, floatData);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        return texture;
    }

    // Create framebuffer to render to
    private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
        const framebuffer = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
        return framebuffer;
    }

    // Ping-pong mechanism for rendering between two textures
    public run() {
        const sourceTexture = this.textures[this.currentTextureIndex];
        const destinationTexture = this.textures[1 - this.currentTextureIndex];

        // Set up framebuffer and texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, destinationTexture, 0);
        this.gl.viewport(0, 0, this.serialize(this.data).length / 4, 1);

        this.gl.useProgram(this.program);
        this.gl.bindTexture(this.gl.TEXTURE_2D, sourceTexture);

        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        const positionBuffer = this.gl.createBuffer();
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);        
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // Swap textures
        this.currentTextureIndex = 1 - this.currentTextureIndex;

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    // Read the modified data from the texture
    public readData(): T {
        const floatData = new Float32Array(this.serialize(this.data).length);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.readPixels(0, 0, floatData.length / 4, 1, this.gl.RGBA, this.gl.FLOAT, floatData);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        return this.deserialize(floatData);
    }
}
