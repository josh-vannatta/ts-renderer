import { Clock, Group, Mesh, MeshToonMaterial, SphereGeometry } from "three";
import { HasLoadedAssets, LoadedAssets } from "../../renderer/Loader";
import { HasData, IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";
import * as Easing from "../../utils/Easing";
import { State } from "../../utils/StateUtils";
import { PointData, PointStatus } from "../ExampleApp";

const baseUpdates = {
    atom: {
        scale: { x: 1, y: 1, z: 1 },
    },
    model: {
        material: {
            color: { r: 0, g: 200, b: 210 }
        }
    },
    scale: { x: 1, y: 1, z: 1 },
}

class BaseState extends State {
    easing = Easing.Quartic.In;
    duration = 300;
    updates = baseUpdates
}

class HoveredState extends State {
    easing = Easing.Quartic.In;
    duration = 500;
    updates = {
        atom: {
            scale: { x: .2, y: .2, z: .2 }
        },
        model: {
            material: {
                color: { r: 200, g: 0, b: 0 }
            }
        },
        scale: { x: 5, y: 5, z: 5 }
    }
}

class OnState extends State {
    easing = Easing.Quartic.In;
    duration = 500;
    updates = {
        ...baseUpdates,
        model: {
            material: {
                color: { r: 200, g: 0, b: 0 }
            }
        },
    }
}

class OffState extends State {
    easing = Easing.Quartic.In;
    duration = 500;
    updates = {
        ...baseUpdates,
        model: {
            material: {
                color: { r: 0, g: 200, b: 0 }
            }
        },
    }
}

class DisabledState extends BaseState {
    easing = Easing.Quartic.In;
    duration = 500;
    updates = {
        ...baseUpdates,
        model: {
            material: {
                color: { r: 0, g: 0, b: 200 }
            }
        },
    }
}

export class Point extends RenderedEntity implements IsInteractive, HasLoadedAssets, HasData<PointData> {
    public interactions = new ViewInteractions();
    public loadedAssets: LoadedAssets = new LoadedAssets();
    public model: Mesh;
    public atom: Group;

    constructor(
        public data: PointData
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

    public onLoad(): void {
        const asset = this.loadedAssets.getAsset("Atom");

        if (asset){
            this.add(asset);
            this.atom = asset;
        }
    }

    public onUpdate(clock?: Clock): void {
        if (this.interactions.hovered || this.interactions.selected)
            return;

        if (this.data.status == PointStatus.On)
            this.state.set(new OnState())
        if (this.data.status == PointStatus.Off)
            this.state.set(new OffState())
        if (this.data.status == PointStatus.Disabled)
            this.state.set(new DisabledState())        
    }

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