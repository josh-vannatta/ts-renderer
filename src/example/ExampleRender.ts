import { Lighting } from "../renderer/Lighting";
import { IRender, Render } from "../renderer/Render";
import { ExampleController } from "./controllers/ExampleController";
import { PointData } from "./ExampleApp";
import { ExampleScene } from "./ExampleScene";

export interface IExampleRender extends IRender<ExampleScene> {
    controller: ExampleController
}

export class ExampleRender extends Render<ExampleScene> implements IExampleRender {
    public controller: ExampleController;

    constructor(points: PointData[]) {
        super(new ExampleScene());
        this.controller = new ExampleController(points, this.scene);
    }

    protected onSetup(): void {
        this.camera.setup({
            far: 20000,
            focus: {x: 0, y: -20, z: 0},
            position: {x: -100, y: 20, z: -100},
            controls: true
        })
        this.lighting.setup(Lighting.Basic);
    }

    public onStart(): void {
        this.initialize(this.controller)
            .then(() => this.renderAnimation())
            .catch(console.error);

        this.showStats()        
    }

    protected onUpdate(): void {
    }
}