import { Clock, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";
import { InstancedEntity, Instance } from "../../utils/Instancing";
import { HasLoadedAssets, LoadedAssets } from "../../renderer/Loader";

export class Atom extends RenderedEntity implements InstancedEntity, HasLoadedAssets, IsInteractive {
    public interactions: ViewInteractions = new ViewInteractions();
    public instance: Instance = Atom.Instance;
    public loadedAssets: LoadedAssets = new LoadedAssets();

    public onCreate(): void {}
    public onUpdate(clock?: Clock): void {}

    public onLoad(): void {
        const asset = this.loadedAssets.getAsset("Atom");
        
        if (asset)
            this.add(asset);
    }

    public static get Instance() {
        return new Instance(            
            new SphereGeometry(.6,12,12),
            new MeshToonMaterial({
                color: "rgb(0,200,210)"
            })
        );
    }

    onSelect(): void {
        
    }

    onHover(intersections?: Vector3[]): void {
        
    }

    onReset(): void {
        
    }
}