import { IsInteractive, RenderedEntity, ObservedProperties, ViewInteractions } from './RenderedEntity';
import * as AnimationUtils from '../utils/AnimationUtils';
import Stats from 'stats.js';
import { Loader } from './Loader';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { Lighting } from './Lighting';
import { Renderer } from './Renderer';
import { IView, ViewEvent as ViewEvent, View, ViewEvents } from './View';
import { Controller } from './Controller';
import { EventObserver, EventSource } from '../utils/EventSource';

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
    onStart(): void;
    panCamera(pan: boolean): void;
    autoRotate(rotate: boolean): void;
}

interface EntityEventStream {
    events: ViewEvents,
    entity: IsInteractive
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

    private interacted: IsInteractive[] = [];
    private canvasDom: HTMLElement;
    private playCount: number = 0;
    private stats: Stats;
    private observed: Record<string, EntityEventStream> = {}
    private observer: EventObserver<RenderedEntity>
    public selected: IsInteractive | undefined;
    public autorotate: boolean = false;

    constructor(scene: RenderedScene) {
        this.loader = new Loader();
        this.renderer = new Renderer();
        this.camera = new Camera();
        this.lighting = new Lighting();
        this.view = new View(this.camera);
        this.scene = scene;
        this.loader.setLoaded(0, "Initializing...");
    }

    private _started = false;
    public start() {
        if (this._started)
            return;

        this.onStart();
        this._started = true;
    }

    private _setup = false;
    public setup() {
        if (this._setup)
            return;
        this.onSetup();
        this._setup = true;
    }
    
    protected abstract onSetup(): void;
    public abstract onStart(): void;

    public unbind(canvas: HTMLElement) {
        this.renderer.unbind(canvas);
    }

    public bind(canvas: HTMLElement): void {
        this.canvas = this.renderer.bind(canvas);
        this.camera.bind(this.canvas);
        this.view.bind(this.canvas);
        this.canvasDom = canvas;
        this.initObservers();        
    }

    public deselect() {
        this.interacted = [];
    }

    public getSelectedEntity(): IsInteractive | undefined {
        this.selected = this.interacted.find(model => model.interactions.isSelected);

        if (this.selected != undefined)
            return this.selected;
        else 
            return undefined;
    }

    public getHoveredEntity(): IsInteractive | undefined {
        let hovered = this.interacted.find(model => model.interactions.isHovered);

        if (hovered != undefined)
            return hovered;
        else 
            return undefined;
    }

    public stop(): void {
        this.scene.instance.clear();
        this.scene.clear();
        this.controllers.forEach(c => c.destroy());
        this.isPaused = false;
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

    private _onContextLoss = () => {}

    public onContextLoss(callback: () => void) {
        this._onContextLoss = callback;
    }

    protected renderAnimation() {     
        this.renderer.webGl.setAnimationLoop(() => {
            if (this.renderer.webGl.getContext().isContextLost()) {
                this._onContextLoss();
                console.log(this.renderer.webGl.getContext().drawingBufferHeight)
                return;
            }

            if (this.isPaused || !this.loader.isLoaded) {
                return;
            }
    
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
        })
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
        this.view.update();
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
            controller.update(this.renderer.clock);
        });
    }  
    
    protected onUpdate() {}

    private handleHover() {        
        if (this.renderer.clock.getElapsedTime() < .5) return;        
 
        this.deselect();
        this.interacted = this.view.intersect(this.scene.activeEntities);
        this.view.setHovered(this.interacted.length > 0);
    }

    private handleSelect() {
        this.interacted.forEach((entity: IsInteractive) => {
            entity.onSelect(); 
            entity.interactions.selected = true;
        })
    }

    private initObservers() {
        let camera = new EventObserver<Camera>("Render");

        camera.onUpdate(() => {
            Object.values(this.observed).forEach(observation => {
                observation.events.notify({
                    entity: observation.entity,
                    view: this.view.getScreenPosition(observation.entity)
                })
            })
        })

        this.camera.addObserver(camera);
        this.observer = new EventObserver<RenderedEntity>('render');

        this.observer.onUpdate(entity => {
            if (!this.observed[entity.id])
                return;

            if (!ViewInteractions.isInstance(entity))
                return

            this.observed[entity.id].events.notify({
                entity,
                view: this.view.getScreenPosition(entity)
            })
        })
    }

    public track<T extends IsInteractive>(entity: T | undefined) {
        if (!entity)
            return undefined;

        if (!!this.observed[entity.id])
            return undefined

        var events = new EventSource<ViewEvent>();

        entity.addObserver(this.observer);
        
        this.observed[entity.id] = { entity, events };
        this.observed[entity.id].events.notify({
            entity,
            view: this.view.getScreenPosition(entity)
        })

        return this.observed[entity.id];
    }

    public stopTracking<T extends IsInteractive>(id: number) {
        if (!this.observed[id])
            return;

        this.observed[id].events.clear()
        this.observed[id].entity.removeObserver(this.observer);

        delete this.observed[id]
    }

    protected register(...controllers: Controller[]) {
        controllers.forEach(controller => {
            controller.gl = this.renderer.gl;

            if (!this.controllers.includes(controller))
                this.controllers.push(controller);
        });

        return this;
    }

    protected initialize(...controllers: Controller[]) {
        if (controllers.length)
            this.register(...controllers)

        this.controllers.forEach(controller => {          
            controller.setup();            
            controller.load(this);  
        });        

        const start = () => {
            this.onSetup();     
            this.scene.light(this.lighting);        
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

    public autoRotate(rotate?: boolean): void {        
        this.autorotate = rotate ?? true;
    }
}

export { Fonts, Render };