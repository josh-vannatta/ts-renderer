import { BoxGeometry, Clock, Color, Mesh, MeshPhongMaterial, Vector2, Vector3, Vector4 } from 'three';
import { ForceDirectedField, Gravity } from '../../physics/Force';
import { ParticleSystem } from '../../physics/Particles';
import { Physics } from '../../physics/Physics';
import { Controller } from '../../renderer/Controller';
import { InstanceCollection } from '../../renderer/InstancedEntity';
import { VectorUtils } from '../../utils/VectorUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Background, BackgroundSize } from '../entities/Background';
import { Ball } from '../entities/Ball';
import { ComputeXShader, X } from '../entities/ComputeX';
import { Terrain } from '../entities/Terrain';

export class ExampleController extends Controller {
    private physics: Physics;
    private compute: ComputeXShader;

    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { 
        Ball.radius = 2;
        this.physics = new Physics({ collisions: true });
    }

    public onInit() {         
        const background = new Background(BackgroundSize.Moderate, 20);
        
        this._scene.add(background);
        this.initBrickScene();
4
        const data = new Array(40).fill(null).map(n => new X())

        this.compute = new ComputeXShader(data);
        this.compute.run();
        console.log(this.compute.readData())
    }

    public initParticleScene() {
        const particleSystem = new ParticleSystem();

        for (let i = 0; i < 100; i++) {
            const position = new Vector3()

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

        this._scene.add(particleSystem);

    }

    public initBallScene() {
        const ground = new Mesh(
            new BoxGeometry(100, 2, 100, 10, 10),
            new MeshPhongMaterial({ color: "rgb(0,100,150)"})
        );
        const balls = new Array(1).fill(null).map(e => new Ball());
        const instances = new InstanceCollection([], Ball.Instance, 1000);
        const forceDirected = new ForceDirectedField({ amplitude: Ball.radius * 2 });

        Physics.init(ground, { collisions: true, fixed: true });

        this.physics.addForce(forceDirected);
        ground.position.y = -20
        
        balls.forEach((ball, i) => {
            setTimeout(() => {
                ball.position.copy(VectorUtils.random(.2))
                instances.add(ball)
                forceDirected.addObject(ball)
                this.physics.add(ball)
            }, 10 * i) 
        });
        
        this.physics.addForce(new Gravity())
        this._scene.add(ground, instances);
        this.physics.add(ground);

        console.log(Physics.serialize(ground))
    }

    public initBrickScene() {
        this._scene.add(new Terrain());
    }

    protected onUpdate(clock: Clock): void {
        this.physics.update();
    }

    protected onDestroy(): void {
        this.physics.dispose();
    }
}
