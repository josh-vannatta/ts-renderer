import { Clock, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { IsInteractive, RenderedEntity, ViewInteractions } from "../../renderer/RenderedEntity";
import { InstancedEntity, Instance } from "../../utils/Instancing";
import { PointData } from "../ExampleApp";
import { State } from "../../utils/StateUtils";

class BaseState extends State {
    duration =  500
    updates = {
        scale: { x: 1, y: 1, z: 1},
        instance: {
            color: { r: 0, g: 200, b: 210 }
        }
    }
}

class HoverState extends State {
    duration =  500
    updates = {
        scale: { x: 2, y: 2, z: 2},
        instance: {
            color: { r: 200, g: 0, b: 0 }
        }
    }
}

export class Atom extends RenderedEntity implements InstancedEntity, IsInteractive {
    public interactions: ViewInteractions = new ViewInteractions();
    public data: PointData = new PointData()
    public instance: Instance = Atom.Instance

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

    onHover(intersections?: Vector3[]): void {
        this.state.set(new HoverState())
    }

    onReset(): void {
        this.state.set(new BaseState())
     }
}