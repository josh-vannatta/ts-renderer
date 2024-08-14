import { BoxGeometry } from 'three';
import { Emission } from '../../connections/Emission';
import { Controller } from '../../renderer/Controller';
import { CoordinateSpace } from '../../utils/CoordinateSpace';
import { InstanceCollection } from '../../utils/Instancing';
import { State } from '../../utils/StateUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';

class SpaceState extends State {
    duration = 2000;
    updates = {
        scale: { x: 2, y: 2, z: 2}
    }
}

export class ExampleController extends Controller {
    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { }

    public onInit() { 
        const s = 30
        const space = new CoordinateSpace(new BoxGeometry(s,s,s,s,s,s))
        const points = space.generate(() => new Atom())
        const instances = new InstanceCollection(points, Atom.Instance);

        this._scene.background = new Background(BackgroundSize.Moderate, 10);

        this._scene.addEntities(this._scene.background, space, instances);

        space.state.set(new SpaceState())
    }

    protected onUpdate(): void {
        this._scene.lines.forEach(line => 
            line.emit(new Emission(new Atom(), {
                source: this._scene.points[0],
                speed: .2,
                margin: 5,
                instanceCount: 20
            })
        ))
    }
}
