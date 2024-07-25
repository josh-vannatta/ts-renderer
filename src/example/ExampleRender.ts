import { IRender, Render } from "../renderer/Render";
import { ExampleController } from "./controllers/ExampleController";
import { PointData } from "./ExampleApp";
import { ExampleScene } from "./ExampleScene";

export interface IExampleRender extends IRender<ExampleScene> {
    controller: ExampleController
}

export class ExampleRender extends Render<ExampleScene> implements IExampleRender {
    public id = Math.random() * 1000
    public controller: ExampleController;

    constructor(points: PointData[]) {
        super(new ExampleScene());
        this.controller = new ExampleController(points, this.scene);
    }

    protected onSetup(): void {
        this.camera.settings.far = 20000;
        this.camera.lookAt({x: 0, y: 2, z: 0});
        this.camera.setPosition({x: -50, y: 0, z: -50}); 
        this.camera.enableControls(); 
        this.lighting.configure(this.lighting.BASIC);
        this.scene.light(this.lighting);        

        this.autoRotate(false)
    }

    public onStart(): void {
        this.register(this.controller)
            .initialize()
            .then(() => this.renderAnimation())
            .catch(console.error);

        this.showStats({})        
    }

    protected onUpdate(): void {
    }
}