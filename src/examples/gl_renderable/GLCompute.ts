import { GLContext } from "../../glsl/GLContext";
import { GLProgram, GLType } from "../../glsl/GLProgram";
import { GLShader, ShaderType } from "../../glsl/GLShader";
import { GLTextureBuffer } from "../../glsl/GLTextureBuffer";

export class GLCompute {
    private context: GLContext;
    private program: GLProgram;
    private textures: GLTextureBuffer;
    private length: number;

    constructor(context: GLContext) {
        const emptyData = new Float32Array(new Array(context.width * context.height * 4).fill(0));
        this.context = context;
        this.program = new GLProgram(context);
        this.textures = new GLTextureBuffer(context, emptyData);
        this.length = context.width * context.height;
    }

    public setup(config: { data: Float32Array, vertex: string, fragment: string }) {
        this.textures = new GLTextureBuffer(this.context, config.data);
        this.length = config.data.length;

        const vertexShader = new GLShader(this.context, {
            type: ShaderType.Vertex,
            source: config.vertex,
            autoCompile: true
        });

        const fragmentShader = new GLShader(this.context, {
            type: ShaderType.Fragment,
            source: config.fragment,
            autoCompile: true
        });

        this.program.initialize(vertexShader, fragmentShader);
        this.program.use();

        // Set up a full-screen quad for rendering
        this.program.setBuffer("a_position", new Float32Array([
            -1.0, -1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0,  1.0, 0.0
        ]), { size: 3 });
    }

    public render(time: number) {
        const { gl } = this.context;

        // Set uniform for time
        this.program.setUniform("u_time", GLType.Float, time);

        // Bind each texture in the current texture set to a unique texture unit
        this.textures.readTextures.forEach((texture, index) => {
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            this.program.setUniform(`u_textures[${index}]`, GLType.Sampler2D, index);
        });

        // Set up framebuffer for writing
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.textures.writeFramebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Swap textures for the next render pass
        this.textures.swap();
    }

    public readData(): Float32Array {
        const { gl } = this.context;

        const totalPixels = this.textures.width * this.textures.height * 4;
        const combinedData = new Float32Array(totalPixels * this.textures.readTextures.length);

        this.textures.readTextures.forEach((_, index) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.textures.writeFramebuffer);
            const textureData = new Float32Array(totalPixels);
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + index);
            gl.readPixels(0, 0, this.textures.width, this.textures.height, gl.RGBA, gl.FLOAT, textureData);
            combinedData.set(textureData, index * totalPixels);
        });

        return combinedData.slice(0, this.length);
    }

    public dispose() {
        this.program.dispose();
        this.textures.dispose();
    }
}
