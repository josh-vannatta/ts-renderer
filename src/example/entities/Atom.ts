import { Clock, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";
import { InstancedEntity, Instance } from "../../utils/Instancing";

export class Atom extends RenderedEntity implements InstancedEntity, IsInteractive {
    public interactions: ViewInteractions = new ViewInteractions();
    public instance: Instance = Atom.Instance;

    public onCreate(): void { }
    public onUpdate(clock?: Clock): void {}

    public static get Instance() {
        return new Instance(            
            new SphereGeometry(.6,12,12),
            new MeshToonMaterial({
                color: "rgb(0,200,210)"
            })
        );
    }

    onSelect(): void { }

    onHover(intersections?: Vector3[]): void {}

    onReset(): void { }
}