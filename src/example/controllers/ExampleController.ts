import { BoxGeometry, Clock, Color, Mesh, MeshBasicMaterial, MeshPhongMaterial, SphereGeometry, Vector3 } from 'three';
import { ParticleSystem } from '../../physics/Particles';
import { Controller } from '../../renderer/Controller';
import { VectorUtils } from '../../utils/VectorUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Background, BackgroundSize } from '../entities/Background';
import { Ball } from '../entities/Ball';
import { Instance, InstanceCollection } from '../../renderer/InstancedEntity';
import { Physics } from '../../physics/Physics';
import { Gravity } from '../../physics/Gravity';
import { ForceDirectedField } from '../../physics/Force';

export class ExampleController extends Controller {
    private physics: Physics;

    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { 
        Ball.radius = 1;
        this.physics = new Physics();
    }

    public onInit() {         
        const background = new Background(BackgroundSize.Moderate, 20);
        const particleSystem = new ParticleSystem();

        for (let i = 0; i < 100; i++) {
            const position = VectorUtils.random(10)

            setTimeout(() => {
                for (let i = 0; i < 100; i++) {
                    particleSystem.spawnParticle({
                        position: position,
                        velocity: VectorUtils.random(8),
                        lifespan: 10, 
                        color: new Color(Math.random(), Math.random(), Math.random())  
                    });
                }
            }, 1000 * i)
        }

        this._scene.add(background, particleSystem);
    }

    public initBallScene() {
        const ground = new Mesh(
            new BoxGeometry(100, 2, 100, 10, 10),
            new MeshPhongMaterial({ color: "rgb(0,100,150)"})
        );
        const balls = new Array(50).fill(null).map(e => new Ball());
        const instances = new InstanceCollection([], Ball.Instance);

        this.physics.addForce(new Gravity(), new ForceDirectedField(balls, Ball.radius * 2));

        Physics.init(ground, { collisions: true, fixed: true });

        ground.position.y = -20

        balls.forEach((ball, i) => {
            setTimeout(() => {
                ball.position.copy(VectorUtils.random(1))
                this.physics.add(ball);
                instances.addInstance(ball)
            }, (100 * i))
        });

        this._scene.add(ground, instances);
    }

    protected onUpdate(clock: Clock): void {
        this.physics.update(clock);
    }
}
