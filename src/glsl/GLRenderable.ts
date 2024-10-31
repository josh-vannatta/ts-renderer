import { GLContext } from './GLContext';
import { GLShader, ShaderType } from './GLShader';
import { GLBufferOptions, GLProgram, GLType } from './GLProgram';

export abstract class GLRenderable {
    protected gl: WebGL2RenderingContext;
    private indexBuffer: WebGLBuffer | null = null;
    protected program: GLProgram;
    protected uniforms: Map<string, { type: GLType, value: any }> = new Map();
    
    // New properties to manage primitive type and draw count
    private drawMode: number; // gl.TRIANGLES, gl.POINTS, etc.
    private indexCount: number | null = null; // Set automatically based on indices or vertices

    constructor(glContext: GLContext, drawMode: number = glContext.context.TRIANGLES) {
        this.gl = glContext.context;
        this.program = this.createProgram();
        this.drawMode = drawMode; // Default to gl.TRIANGLES
    }

    // Abstract methods for subclasses to implement custom shaders
    protected abstract createVertexShader(): string;
    protected abstract createFragmentShader(): string;

    // Create and link shaders into a GLProgram
    private createProgram(): GLProgram {
        const vertexShaderCode = this.createVertexShader();
        const vertexShader = new GLShader(this.gl, { 
            type: ShaderType.Vertex, 
            source: vertexShaderCode, 
            autoCompile: true
        });
        const fragmentShaderCode = this.createFragmentShader();
        const fragmentShader = new GLShader(this.gl, { 
            type: ShaderType.Fragment, 
            source: fragmentShaderCode,
            autoCompile: true
        });
        const program = new GLProgram(this.gl, vertexShader, fragmentShader);
        
        program.use();
        return program;
    }

    // Method to set the index buffer with dynamic index count
    setIndexBuffer(indices: Uint16Array) {
        this.indexBuffer = this.gl.createBuffer();
        if (!this.indexBuffer) {
            throw new Error("Failed to create index buffer");
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
        
        this.indexCount = indices.length; // Set index count dynamically based on input
    }

    // Set a buffer for an attribute (e.g., position buffer)
    protected setBuffer(attributeName: string, data: Float32Array, options: GLBufferOptions) {
        this.program.setBuffer(attributeName, data, options);
        
        // Set indexCount based on vertex count if no index buffer is used
        if (!this.indexBuffer) {
            this.indexCount = data.length / options.size; // Calculate count based on data length and element size
        }
    }

    // Add or update a uniform in the program
    protected setUniform(name: string, type: GLType, value: any) {
        this.uniforms.set(name, { type, value });
        this.program.setUniform(name, type, value);
    }

    // Method to update uniforms each frame (if needed)
    protected updateUniforms() {
        this.uniforms.forEach((uniform, name) => {
            this.program.setUniform(name, uniform.type, uniform.value);
        });
    }

    // Render function with dynamic draw based on index buffer and draw mode
    render(time: number) {
        this.updateUniforms();

        if (this.indexBuffer && this.indexCount) {
            // Draw with indices if index buffer is set
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(this.drawMode, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
        } else if (this.indexCount) {
            // Draw without indices
            this.gl.drawArrays(this.drawMode, 0, this.indexCount);
        }
    }

    dispose() {
        this.program.dispose();
    }
}
