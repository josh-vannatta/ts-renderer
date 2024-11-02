type GLContextOptions = {
    width?: number;
    height?: number;
    antialias?: boolean;
    offscreen?: boolean;
    extensions?: string[];
    canvas?: HTMLCanvasElement;
    attributes?: WebGLContextAttributes;
};

export class GLContext {
    private canvas: HTMLCanvasElement | OffscreenCanvas;
    private gl: WebGL2RenderingContext;
    private options: GLContextOptions;

    constructor(options: GLContextOptions = {}) {
        this.options = options;
        this.canvas = this.initializeCanvas();
        this.gl = this.initializeContext();
        this.enableExtensions(this.options.extensions || []);
        this.configureDefaultState();
        this.handleContextLoss();
    }

    public get height() {
        return this.options.height ?? 600
    }
    public get width() {
        return this.options.width ?? 800
    }

    // Initialize the canvas, either as on-screen or offscreen
    private initializeCanvas(): HTMLCanvasElement | OffscreenCanvas {
        const { width = 800, height = 600, offscreen = false } = this.options;

        if (offscreen && typeof OffscreenCanvas !== "undefined") {
            const offscreenCanvas = new OffscreenCanvas(width, height);
            return offscreenCanvas;
        } else if (this.options.canvas) {
            return this.options.canvas;
        } else {
            const canvas = document.createElement("canvas") as HTMLCanvasElement;
            canvas.width = width;
            canvas.height = height;
            document.body.appendChild(canvas); // On-screen rendering
            return canvas;
        }
    }

    // Initialize the WebGL2 context
    private initializeContext(): WebGL2RenderingContext {
        const attributes: WebGLContextAttributes = {
            antialias: this.options.antialias ?? true,
            preserveDrawingBuffer: false,
            ...this.options.attributes
        };

        const gl = this.canvas.getContext("webgl2", attributes) as WebGL2RenderingContext;
        if (!gl) {
            throw new Error("WebGL2 not supported or could not initialize context.");
        }
        return gl;
    }

    // Enable essential WebGL extensions
    private enableExtensions(extensions: string[]) {
        extensions.forEach((ext) => {
            const extension = this.gl.getExtension(ext);
            if (!extension) {
                console.warn(`WebGL extension "${ext}" not supported.`);
            }
        });
    }

    // Set default WebGL state
    private configureDefaultState() {
        this.gl.enable(this.gl.DEPTH_TEST); // Enable depth testing
        this.gl.depthFunc(this.gl.LEQUAL); // Near things obscure far things
        this.gl.enable(this.gl.BLEND);     // Enable alpha blending
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black clear color
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    // Handle context loss and restoration
    private handleContextLoss() {
        this.canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            console.warn("WebGL context lost.");
        });

        this.canvas.addEventListener("webglcontextrestored", () => {
            console.info("WebGL context restored.");
            this.configureDefaultState();
            this.enableExtensions(this.options.extensions || []);
        });
    }

    // Convenience methods for resizing
    resize(width: number, height: number) {
        if (this.canvas instanceof HTMLCanvasElement) {
            this.canvas.width = width;
            this.canvas.height = height;
        } else if (this.canvas instanceof OffscreenCanvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.gl.viewport(0, 0, width, height);
    }

    // Helper for clearing the canvas
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    // Helper for binding the WebGL context
    use() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    // Provide the WebGL2RenderingContext
    get context(): WebGL2RenderingContext {
        return this.gl;
    }

    // Provide the canvas (HTMLCanvasElement or OffscreenCanvas)
    getCanvas(): HTMLCanvasElement | OffscreenCanvas {
        return this.canvas;
    }

    // Error checking utility
    checkErrors(operationName = "WebGL operation") {
        const error = this.gl.getError();
        if (error !== this.gl.NO_ERROR) {
            const errorString = this.getErrorString(error);
            console.error(`Error in ${operationName}: ${errorString}`);
            throw new Error(`WebGL Error: ${errorString}`);
        }
    }

    // Map WebGL error codes to strings for logging
    private getErrorString(error: number): string {
        switch (error) {
            case this.gl.NO_ERROR: return "NO_ERROR";
            case this.gl.INVALID_ENUM: return "INVALID_ENUM";
            case this.gl.INVALID_VALUE: return "INVALID_VALUE";
            case this.gl.INVALID_OPERATION: return "INVALID_OPERATION";
            case this.gl.INVALID_FRAMEBUFFER_OPERATION: return "INVALID_FRAMEBUFFER_OPERATION";
            case this.gl.OUT_OF_MEMORY: return "OUT_OF_MEMORY";
            case this.gl.CONTEXT_LOST_WEBGL: return "CONTEXT_LOST_WEBGL";
            default: return "UNKNOWN_ERROR";
        }
    }
}
