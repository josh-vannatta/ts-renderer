import { Clock, MeshToonMaterial, SphereGeometry } from "three";
import { RenderedEntity } from "../../renderer/RenderedEntity";
import { InstancedEntity, Instance } from "../../utils/Instancing";

export class Atom extends RenderedEntity implements InstancedEntity {
    public instance: Instance = Atom.Instance;

    public onCreate(): void {
        
    }

    public onUpdate(clock?: Clock): void {
        
    }

    public static get Instance() {
        return new Instance(            
            new SphereGeometry(.6,12,12),
            new MeshToonMaterial({
                color: "rgb(0,200,210)"
            })
        );
    }
}