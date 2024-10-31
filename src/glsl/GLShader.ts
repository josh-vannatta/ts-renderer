export enum ShaderType {
    Vertex = "vertex",
    Fragment = "fragment",
}

type ShaderOptions = {
    type: ShaderType;
    source?: string | Promise<string>; // Optional source to allow deferred compilation
    onCompileError?: (error: string) => void;
    autoCompile?: boolean;  // Flag to automatically compile upon creation if source is provided
};

export class GLShader {
    private gl: WebGL2RenderingContext;
    private shader: WebGLShader | null = null;
    private type: ShaderType;
    private source: string | null = null;
    private onCompileError?: (error: string) => void;

    constructor(gl: WebGL2RenderingContext, options: ShaderOptions) {
        this.gl = gl;
        this.type = options.type;
        this.onCompileError = options.onCompileError;
        
        // If source is provided, set it and optionally compile
        if (options.source) {
            this.setSource(options.source);
            if (options.autoCompile) this.compile();
        }
    }

    // Set the shader source and optionally compile if autoCompile flag is set
    setSource(source: string | Promise<string>): this {
        if (source instanceof Promise) {
            source.then((src) => this.source = src);
        } else {
            this.source = source;
        }
        return this;
    }

    // Compile the shader from the stored source, with error handling
    compile(): this {
        if (!this.source) {
            throw new Error(`No GLSL source code provided for ${this.type} shader.`);
        }

        console.log(this.source)

        const shaderType = this.type === ShaderType.Vertex ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER;
        this.shader = this.compileShader(shaderType, this.source);
        
        if (!this.shader) {
            throw new Error(`Failed to compile ${this.type} shader.`);
        }
        return this;
    }

    // Compile and handle errors with detailed logging
    private compileShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error(`Unable to create shader of type ${type}`);
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader) || "Unknown error";
            this.gl.deleteShader(shader);
            if (this.onCompileError) {
                this.onCompileError(`Shader compile error (${this.type}): ${error}`);
            }
            throw new Error(`Shader compile error (${this.type}): ${error}`);
        }

        return shader;
    }

    getShader(): WebGLShader {
        if (!this.shader) {
            throw new Error(`${this.type} shader has not been compiled.`);
        }
        return this.shader;
    }

    // Method to dispose of shader resources, with status logging
    dispose() {
        if (this.shader) {
            this.gl.deleteShader(this.shader);
            this.shader = null;
            console.info(`Disposed ${this.type} shader.`);
        }
    }

    // Convenience method for async loading of GLSL source from a URL
    static async loadSourceFromURL(url: string): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader source from URL: ${url}`);
        }
        return await response.text();
    }

    // Helper method to quickly set, compile, and retrieve the shader for chaining
    static async fromURL(
        gl: WebGL2RenderingContext, 
        type: ShaderType, 
        url: string, 
        onCompileError?: (error: string) => void
    ): Promise<GLShader> {
        const shader = new GLShader(gl, { type, onCompileError });
        const source = await GLShader.loadSourceFromURL(url);
        shader.setSource(source).compile();
        return shader;
    }
}
