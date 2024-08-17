import { BoxGeometry, Clock, Mesh, MeshBasicMaterial, MeshPhongMaterial, MeshToonMaterial, PlaneGeometry, SphereGeometry, Vector3 } from 'three';
import { ConnectionPath } from '../../connections/ConnectionPath';
import { Emission } from '../../connections/Emission';
import { Gravity } from '../../physics/Gravity';
import { Controller } from '../../renderer/Controller';
import { InstanceCollection } from '../../renderer/InstancedEntity';
import { State } from '../../utils/StateUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';
import { Line } from '../entities/Line';
import { ExplosionSystem } from '../entities/Explosion';
import { Ball } from '../entities/Ball';
import { Physics } from '../../physics/Physics';
import { Collision } from '../../physics/Collisions';
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
        const balls = new Array(20).fill(null).map(i => new Ball());
        // const ballInstances = new InstanceCollection(balls, Ball.Instance)
        const gravity = new Gravity()

        balls.forEach(ball => {
            ball.castShadow = true
            const vx = (Math.random() - 0.5) * 2;
            const vz = (Math.random() - 0.5) * 2;

            ball.userData.physicsData = {
                velocity: VectorUtils.random(5),
                mass: 1,
                fixed: false 
            }

            ball.position.y = 10;
            ball.position.x = vx;
            ball.position.z = vz;
        })

        ground.receiveShadow = true
        ground.userData.physicsData = {
            velocity: new Vector3(),
            mass: 20,
            fixed: true // Mark it as fixed
        }
        ground.position.y = -10

        this.physics = new Physics()
        this.physics.add(...balls, ground)
        this.physics.addForce(gravity);

        this._scene.add(background, ground, ...balls);
    }

    protected onUpdate(clock: Clock): void {
        this.physics.update(clock);
    }
}
