import { IRender, Render } from "../renderer/Render";
import { ExampleController } from "./controllers/ExampleController";
import { ExampleScene } from "./ExampleScene";

export interface IExampleRender extends IRender<ExampleScene> {
    background: ExampleController
}

export class ExampleRender extends Render<ExampleScene> implements IExampleRender {
    public background: ExampleController;

    constructor() {
        super(new ExampleScene());

        this.background = new ExampleController(this.camera, this.scene);
    }

    protected setup(): void {
        this.camera.settings.far = 20000;
        this.camera.lookAt({x: 0, y: 2, z: 0});
        this.camera.setPosition({x: -50, y: 0, z: -50}); 
        this.camera.enableControls(); 
        this.lighting.configure(this.lighting.BASIC);
        this.scene.light(this.lighting);        

        this.autoRotate(false)
    }

    public start(): void {
        this.register(this.background)
            .initialize()
            .then(() => this.renderAnimation())
            .catch(console.error);

        this.showStats({})        
    }

    protected onUpdate(): void {
        
    }
}