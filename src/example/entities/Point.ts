import { Clock, Mesh, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";

export class Point extends RenderedEntity implements IsInteractive {
    public interactions = new ViewInteractions();
    
    public onCreate(): void {
        this.add(new Mesh(
            new SphereGeometry(1,12,12),
            new MeshToonMaterial({
                color: "rgb(0,200,210)"
            })
        ))
    }

    public onUpdate(clock?: Clock): void {
        
    }

    public onHover() {
        console.log(this)
    }
    public onReset() {}
    public onSelect() {

        console.log(this)
    }
}