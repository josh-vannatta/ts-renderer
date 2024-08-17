import { SphereGeometry, MeshToonMaterial, Vector3, Clock, Mesh, MeshPhongMaterial } from 'three';
import { Instance, InstancedEntity } from '../../renderer/InstancedEntity';
import { IsInteractive, RenderedEntity } from '../../renderer/RenderedEntity';

// Create the ball instance
const ballGeometry = new SphereGeometry(0.5, 32, 32);
const ballMaterial = new MeshToonMaterial({ color: 0xff6347 }); // Tomato red ball
const ballInstance = new Instance(ballGeometry, ballMaterial);

// Create the ball entity
export class Ball extends RenderedEntity implements IsInteractive, InstancedEntity {
    public instance: Instance = ballInstance;
    public velocity: Vector3 = new Vector3(0, 0, 0);

    public onCreate(): void {
        this.add(new Mesh(
            new SphereGeometry(0.5, 6, 6),
            new MeshPhongMaterial({ color: 0xff6347 })
        ))
        
    }

    public onUpdate(clock: Clock): void { }

    public static get Instance() {
        const ballGeometry = new SphereGeometry(0.5, 32, 32);
        const ballMaterial = new MeshToonMaterial({ color: 0xff6347 }); // Tomato red ball
        return new Instance(ballGeometry, ballMaterial);
    }

    onHover(intersections?: Vector3[]): void {
        
    }

    onSelect(): void {
        
    }

    onReset(): void {
        
    }
}
