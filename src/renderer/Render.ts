import { IsInteractive } from './RenderedEntity';
import * as AnimationUtils from '../utils/AnimationUtils';
import Stats from 'stats.js';
import { Loader } from './Loader';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { Lighting } from './Lighting';
import { Renderer } from './Renderer';
import { IView, View } from './View';
import { Controller } from './Controller';

let Fonts = {};

export interface IRender<RenderedScene extends Scene> {
    isPaused: boolean;
    canvas: HTMLCanvasElement;
    selected: IsInteractive | undefined;
    readonly loader: Loader;
    readonly scene: RenderedScene;
    readonly view: IView;

    bind(canvas: HTMLCanvasElement): void;
    getSelectedEntity(): IsInteractive | undefined;
    getHoveredEntity(): IsInteractive | undefined;
    deselect(): void;
    pause(): void;
    run(): void;
    resume(): void;
    start(): void;
    panCamera(pan: boolean): void;
    autoRotate(rotate: boolean): void;
}

abstract class Render<RenderedScene extends Scene> implements IRender<RenderedScene> {
    public assets: any[] = [];
    public isPaused = false;
    public readonly loader: Loader;    
    public readonly scene: RenderedScene;
    public readonly view: View;
    public canvas : HTMLCanvasElement;
    
    protected camera: Camera;
    protected controllers: Controller[] = []; 
    protected lighting: Lighting;
    protected renderer: Renderer;

    private activeObjects: IsInteractive[] = [];
    private canvasDom: HTMLElement;
    private playCount: number = 0;
    private stats: Stats;
    public selected: IsInteractive | undefined;
    public autorotate: boolean = true;

    constructor(scene: RenderedScene) {
        this.loader = new Loader();
        this.renderer = new Renderer();
        this.camera = new Camera();
        this.lighting = new Lighting();
        this.view = new View();
        this.scene = scene;
        this.loader.setLoaded(0, "Initializing...");
    }
    
    protected abstract setup(): void;
    public abstract start(): void;

    public bind(canvas: HTMLElement): void {
        this.canvas = this.renderer.bind(canvas);
        this.camera.bind(this.canvas);
        this.view.bind(this.canvas);
        this.canvasDom = canvas;
    }

    public deselect() {
        this.activeObjects = [];
    }

    public getSelectedEntity(): IsInteractive | undefined {
        this.selected = this.activeObjects.find(model => model.interactions.isSelected);

        if (this.selected != undefined)
            return this.selected;
        else 
            return undefined;
    }

    public getHoveredEntity(): IsInteractive | undefined {
        let hovered = this.activeObjects.find(model => model.interactions.isHovered);

        if (hovered != undefined)
            return hovered;
        else 
            return undefined;
    }
    
    public pause(): void {
        this.isPaused = true;
        this.playCount = 0;
    }
    
    public run(): void {        
        this.isPaused = false;        
        this.playCount++;   
    }
    
    public resume(): void {
        this.isPaused = false;
        this.playCount++;

        if (this.playCount == 1)
            this.renderAnimation();
    }

    public showStats(offset?: { xOffset?: number, yOffset?: number }): void {
        if (!this.stats){
            this.stats = new Stats();
            this.stats.showPanel(0);
            this.canvasDom.appendChild(this.stats.dom);
            this.stats.dom.style.top = `${offset?.yOffset ?? 0}px`;
            this.stats.dom.style.left = `${offset?.xOffset ?? 0}px`;
        }
    }

    protected renderAnimation() {       
        if (this.isPaused || !this.loader.isLoaded) 
            return;

        requestAnimationFrame(() => this.renderAnimation());

        if (this.stats)
            this.stats.begin();       
            
        this.updateSceneData();
        this.onUpdate();
        AnimationUtils.update(); 
        this.renderScene();   
        
        if (this.panTimeout <= 0) {
            this.camera.controls.autoRotate = !this.selected && this.autorotate;
        } else {
            this.panTimeout--;
        }

        if (this.stats)
            this.stats.end();
    }

    protected renderFrame() {
        this.updateSceneData();
        this.renderScene();
    }

    protected updateSceneData() {

        try {            
            this.updateControllers();
            this.scene.update(this.renderer.clock);
        } catch(e) {
            console.error(e);
        }
    }

    private renderScene() {            
        this.renderer.update();
        this.camera.update();
        this.view.update(this.camera);
        this.renderer.render(this.scene, this.camera);  
    }

    private updateControllers() {          
        this.controllers.forEach(controller => {
            for (let i = 0; i < controller.animations.length; i += 2) {
                this.renderer.playAnimation(
                    controller.animations[i], 
                    controller.animations[i+1]
                );
            }
            controller.animations = [];
            controller.update();
        });
    }  
    
    protected onUpdate() {}

    private handleHover() {        
        if (this.renderer.clock.getElapsedTime() < .5) return;        
 
        this.deselect();
        let intersects = this.view.intersect(this.scene.activeEntities, this.camera);
        
        this.activeObjects.push(...intersects);
        this.activeObjects.sort((a, b) => {
            let distA = this.camera.distanceTo(a.position), 
                distB = this.camera.distanceTo(b.position),
                diff = b.interactions.zIndex - a.interactions.zIndex;

            return diff != 0 ? distA - distB + diff * 10000 : distA - distB;
        })

        this.view.setHovered(this.activeObjects.length > 0);
    }

    private handleSelect() {
        this.activeObjects.forEach((model: IsInteractive) => {
            model.onSelect(); 
            model.interactions.selected = true;
        })
    }

    protected register(...controllers: Controller[]) {
        controllers.forEach(controller => {
            if (!this.controllers.includes(controller))
                this.controllers.push(controller);
        });

        return this;
    }

    protected initialize() {
        this.controllers.forEach(controller => {          
            controller.setup();            
            controller.load(this);  
        });        

        const start = () => {
            this.setup();     
            this.run();                
            this.loader.setLoaded(100, 'Ready!');   
            this.view.on('mousemove', evt => this.handleHover())
            this.view.on('click', evt => this.handleSelect());
            this.controllers.forEach(controller => controller.onInit());  
            return true;
        }

        return this.loader.loadAssets()
            .then(start)
            .catch(start);
    }

    protected loadFonts(fontList: string[]) {
        fontList.forEach(font => {
            this.loader.loadFont(font)  
                .then(loadedFont => Fonts[font] = loadedFont)
                .catch(error => console.error(error));            
        });
    }
    
    public panTimeout = 0;

    public panCamera(pan: boolean): void {
        this.panTimeout = 100;
        this.camera.controls.autoRotate = pan && this.autorotate;   
    }

    public autoRotate(rotate: boolean): void {        
        this.autorotate = rotate;
    }
}

export { Fonts, Render };