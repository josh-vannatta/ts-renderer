import { Render } from './Render';

export abstract class Controller {    
    private parent?: Render<any>;
    public animations: any[] = [];
    public streams: string[] = [];

    public abstract setup()
    public abstract onInit()

    protected onUpdate() {} 
    public onCommand() {}
    public update() {
        this.onUpdate();
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