import { BoxGeometry, Clock } from 'three';
import { Emission } from '../../connections/Emission';
import { Controller } from '../../renderer/Controller';
import { CoordinateSpace } from '../../utils/CoordinateSpace';
import { InstanceCollection } from '../../utils/Instancing';
import { State } from '../../utils/StateUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';
import { Point } from '../entities/Point';
import { Line } from '../entities/Line';
import { ConnectionPath } from '../../connections/ConnectionPath';
import { Gravity } from '../../physics/Gravity';

class SpaceState extends State {
    duration = 2000;
    updates = {
        scale: { x: 2, y: 2, z: 2}
    }
}

export class ExampleController extends Controller {
    private a: Atom;
    private b: Atom;
    private path: ConnectionPath;
    private gravity: Gravity;

    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { }

    public onInit() { 
        // const s = 10 
        // const space = new CoordinateSpace(new BoxGeometry(s,s,s,s,s,s))
        // const points = space.generate(() => new Atom())
        // space.state.set(new SpaceState())

        this.gravity = new Gravity();
        this.gravity.scalar = .1
        
        const a = new Atom();
        const b = new Atom();
        const c = new Atom();
        const instances = new InstanceCollection([a,b,c], Atom.Instance);
        const line_a = new Line([a, b])
        const line_b = new Line([b, c])

        this.path = new ConnectionPath(line_a, line_b)
        this.a = a;
        this.b = c;

        this.gravity.add(a, b, c)

        a.position.z = -20;
        b.position.z = -10;
        // a.position.y = 20;
        // b.position.y = -20;

        this._scene.background = new Background(BackgroundSize.Moderate, 10);

        this._scene.add(this._scene.background, instances, line_a, line_b);
    }

    protected onUpdate(clock: Clock): void {
        this.gravity.update(clock)
        // if (this.a.position.y < 20) {
        //     this.a.position.y += .01;
        // }

        this.path.emit(new Emission(new Atom(), {
            source: this.b,
            destination: this.a,
            speed: .2,
            margin: 5,
            instanceCount: 20
        }))
    }
}
