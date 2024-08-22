import { Object3D, Vector3 } from "three";// Assuming the PhysicsData interface is in the PhysicsSystem file
import { PhysicsData } from "./Physics";

export abstract class Force {
    public abstract applyForce(object: Object3D, deltaTime: number): void;
}

export class DirectionalForce extends Force {
    private forceVector: Vector3;

    constructor(direction: Partial<Vector3>) {
        super();
        this.forceVector = new Vector3(direction.x, direction.y, direction.z);
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        if (physicsData && physicsData.velocity) {
            // Apply force to velocity if PhysicsData is present
            physicsData.velocity.addScaledVector(this.forceVector, deltaTime);
        } else {
            // Fallback: directly modify the position if no PhysicsData is present
            object.position.addScaledVector(this.forceVector, deltaTime);
        }
    }
}

export class ForceDirectedField extends Force {
    private objects: Object3D[];

    constructor(objects: Object3D[] = [], public threshold = 0.5) {
        super();
        this.objects = objects;
    }

    public addObject(object: Object3D) {
        this.objects.push(object);
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        // Apply repulsive force to avoid overlap with other objects
        this.applyRepulsiveForce(object, deltaTime);
    }

    private applyRepulsiveForce(a: Object3D, deltaTime: number): void {
        this.objects.forEach(b => {
            if (a !== b) {
                const direction = new Vector3().subVectors(a.position, b.position);
                const distance = direction.length();

                if (distance < this.threshold) {
                    const repulsion = direction.normalize().multiplyScalar(this.threshold ?? 1 / distance);

                    // Fallback: directly modify the position if no PhysicsData is present
                    a.position.addScaledVector(repulsion, deltaTime);
            }
            }
        });
    }
}
