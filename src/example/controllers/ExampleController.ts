import { BoxGeometry, Clock, Mesh, MeshPhongMaterial, Vector3 } from 'three';
import { ConnectionPath } from '../../connections/ConnectionPath';
import { DirectionalForce, ForceDirectedField } from '../../physics/Force';
import { Gravity } from '../../physics/Gravity';
import { Physics } from '../../physics/Physics';
import { Controller } from '../../renderer/Controller';
import { State } from '../../utils/StateUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';
import { Ball } from '../entities/Ball';
import { VectorUtils } from '../../utils/VectorUtils';

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
    private physics: Physics;

    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { }

    public onInit() { 
        const background = new Background(BackgroundSize.Moderate, 20);
        const ground = new Mesh(
            new BoxGeometry(51, 2, 51), 
            new MeshPhongMaterial({ color: "rgb(0,100,150)" })
        );
        const radius = 1;
        const balls = new Array(30).fill(null).map(i => new Ball(radius));
        // const instances = new InstanceCollection(balls, Ball.Instance)

        balls.forEach(ball => {            
            ball.position.copy(VectorUtils.random(radius));
            ball.position.y += 10;
            ball.castShadow = true
        })

        const forceDirected = new ForceDirectedField(balls, radius * 2);

        ground.receiveShadow = true
        ground.userData.physicsData = {
            velocity: new Vector3(),
            mass: 20,
            fixed: true // Mark it as fixed
        }
        ground.position.y = -20

        this.gravity = new Gravity();
        this.physics = new Physics({ collisions: true })
        this.physics.add(...balls, ground)
        this.physics.addForce(forceDirected);

        setTimeout(() => {
            this.physics.addForce(new Gravity())
        }, 2000)

        this._scene.add(background, ground, ...balls);
    }

    protected onUpdate(clock: Clock): void {
        this.physics.update(clock);
    }
}
