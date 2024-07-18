import { Clock, Group, Mesh, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";
import { HasLoadedAssets, LoadedAssets } from "../../renderer/Loader";
import { appAssets } from "../../App";
import { State } from "../../utils/StateUtils";
import * as Easing from "../../utils/Easing";

class BaseState extends State {
    easing = Easing.Quartic.In;
    duration = 300;
    updates = {
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

export class Point extends RenderedEntity implements IsInteractive, HasLoadedAssets {
    public interactions = new ViewInteractions();
    public loadedAssets: LoadedAssets = new LoadedAssets();
    public model: Mesh;
    public atom: Group;

    constructor() {
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
        
    }

    public onHover() {
        this.state.set(new HoveredState())
    }
    public onReset() {
        this.state.set(new BaseState())
    }
    public onSelect() {
        console.log(this)
    }
}