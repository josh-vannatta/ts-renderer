import { Clock } from 'three';
import { Render } from './Render';

export abstract class Controller {    
    private parent?: Render<any>;
    public gl: WebGL2RenderingContext | WebGLRenderingContext;
    public animations: any[] = [];
    public streams: string[] = [];
    public destroyed: boolean = false;

    public abstract setup()
    public abstract onInit()

    protected onUpdate(clock: Clock) {} 
    protected onDestroy() {}
    public onCommand() {}
    public update(clock: Clock) {
        this.onUpdate(clock);
    }

    public destroy() {
        this.destroyed = true;
        this.onDestroy();
    }

    protected playAnimation(model, name: string) {
        this.animations.push(model.mesh, name);
    }

    public load(parent: Render<any>) {
        this.parent = parent;
    }

    public get name() {
        return this.constructor.name;
    }

}