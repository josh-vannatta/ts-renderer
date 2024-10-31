import { SphereGeometry, MeshToonMaterial, Vector3, Clock, Mesh, MeshPhongMaterial } from 'three';
import { Instance, InstancedEntity } from '../../../renderer/InstancedEntity';
import { IsInteractive, RenderedEntity } from '../../../renderer/RenderedEntity';
import { PointData } from '../ExampleApp';

// Create the ball entity
export class Ball extends RenderedEntity implements IsInteractive, InstancedEntity {
    public instance: Instance = Ball.Instance;
    public data: PointData = new PointData()
    public static radius = 1;

    constructor(public size = Ball.radius) {
        super()
    }

    public onCreate(): void {
        let seg = this.size * 10;

        if (seg > 15)
            seg = 15;

        this.add(new Mesh(
            new SphereGeometry(this.size, seg, seg),
            new MeshPhongMaterial({ color: 0xff6347 })
        ))
    }

    public onUpdate(clock: Clock): void { }

    public static get Instance() {
        const ballGeometry = new SphereGeometry(Ball.radius, 32, 32);
        const ballMaterial = new MeshPhongMaterial({ color: 0xff6347 }); // Tomato red ball
        return new Instance(ballGeometry, ballMaterial);
    }

    onHover(intersections?: Vector3[]): void {
        
    }

    onSelect(): void {
        
    }

    onReset(): void {
        
    }
}
