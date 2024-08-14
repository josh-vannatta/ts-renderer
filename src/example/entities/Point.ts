import { Clock, Mesh, MeshToonMaterial, Object3D, SphereGeometry } from "three";
import { AssetLoader, HasLoadedAssets } from "../../renderer/Loader";
import { HasData, IsInteractive, RenderedEntity } from "../../renderer/RenderedEntity";
import * as Easing from "../../utils/Easing";
import { State } from "../../utils/StateUtils";
import { PointData } from "../ExampleApp";

class BaseState extends State {
    easing = Easing.Quartic.In;
    duration = 300;
    updates = {
        model: {
            material: {
                color: { r: 0, g: 200, b: 210 }
            }
        },
        scale: { x: 1, y: 1, z: 1 },
    }
}

export class HoveredState extends State {
    easing = Easing.Quartic.In;
    duration = 500;
    updates = {
        model: {
            material: {
                color: { r: 200, g: 0, b: 0 }
            }
        },
        scale: { x: 2, y: 2, z: 2 }
    }
}

export class Point extends RenderedEntity implements IsInteractive, HasLoadedAssets, HasData<PointData> {
    public assets: AssetLoader = new AssetLoader();
    public model: Mesh;
    public atom: Object3D;

    constructor(
        public data: PointData = new PointData()
    ) {
        super();
    }
    
    public onCreate(): void {
        this.model = new Mesh(
            new SphereGeometry(1,12,12),
            new MeshToonMaterial({
                color: "rgb(0,200,210)"
            })
        )

        this.add(this.model)
    }

    public onLoad(): void { }

    public onUpdate(clock?: Clock): void { }

    public onHover() {
        this.state.set(new HoveredState())
        this.state.locked = true;
    }
    public onReset() {
        this.state.locked = false;
        this.state.set(new BaseState())
    }
    public onSelect() {
    }
}