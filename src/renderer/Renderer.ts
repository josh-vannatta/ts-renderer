import { WebGLRenderer, Clock, AnimationMixer, AnimationClip, Object3D, PCFSoftShadowMap, WebGLRendererParameters} from 'three';
import { Camera } from './Camera';
import { Scene } from './Scene';

interface Clip {
    animation: AnimationClip,
    mixer: number
}

export class Renderer {
    public static BASIC_SETUP = { 
        alpha: true, 
        antialias: true,
        gammaInput: true,
        powerPreference: "high-performance",
        gammaOutput: true 
    }
    private webGL: WebGLRenderer;
    public clock: Clock;
    public delta: number;
    private animations: Array<Clip> = [];
    private animationMixers: AnimationMixer[] = [];
    public canvas: HTMLCanvasElement
    public parent: HTMLElement;

    constructor(opts: WebGLRendererParameters = Renderer.BASIC_SETUP) {        
        this.webGL = new WebGLRenderer(opts);
        this.webGL.setClearColor( 0x000000, 0);
        this.clock = new Clock();
        this.canvas = this.webGL.domElement;
        this.webGL.shadowMap.enabled = true;
        this.webGL.shadowMap.type = PCFSoftShadowMap;
        this.delta = 0;
    }

    public get gl() {
        return this.webGL.getContext();
    }

    public unbind(element: HTMLElement) {
        try {
            element.removeChild(element);

        } catch {}
    }

    public bind(element: HTMLElement) {
        element.appendChild( this.canvas );
        
        this.parent = element;
        this.canvas.style.minHeight = '100%';
        this.canvas.style.minWidth = '100%';
        this.canvas.style.transition = '0s';

        this.update();    
        return this.canvas;
    }

    public update() {
        this.webGL.setSize(
            this.canvas.clientWidth,
            this.canvas.clientHeight
        );
    }

    public playAnimation(mesh: Object3D, name: string) {
        let mixer = new AnimationMixer(mesh);
        let index = this.animationMixers.findIndex(mixer => {
            return mixer.getRoot() == mesh;
        });
        if (index == -1) {
            this.animationMixers.push(mixer);
            index = this.animationMixers.length -1;
        }
        this.animations.push({
            animation: AnimationClip.findByName(mesh.animations, name),
            mixer: index
        });
    }
    
    // public addPostProcessing(process) {
    //     this.postProcessing.push(process);
    // }
    
    public render(scene: Scene, camera: Camera): void {
        this.delta = this.clock.getDelta();
        this.animations.forEach((clip: Clip)=>
            this.animationMixers[clip.mixer].clipAction(clip.animation).play());

        // this.postProcessing.forEach(process => {
        //     process.render(scene, camera.getAll());
        // })
        this.webGL.render(scene.instance, camera.lense);
    }

    public get webGl() {
        return this.webGL;
    }
}