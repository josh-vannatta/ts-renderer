import { Object3D, Vector3 } from "three";// Assuming the PhysicsData interface is in the PhysicsSystem file
import { PhysicsData } from "./Physics";

export abstract class Force {
    public abstract applyForce(object: Object3D, deltaTime: number): void;
}

export class GeneralForce extends Force {
    private forceVector: Vector3;

    constructor(forceVector: Vector3) {
        super();
        this.forceVector = forceVector;
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
    private forces: Force[];
    public threshold = 0.5;

    constructor(objects: Object3D[] = [], forces: Force[] = []) {
        super();
        this.objects = objects;
        this.forces = forces;
    }

    public addObject(object: Object3D) {
        this.objects.push(object);
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        // Apply general forces to the object
        this.forces.forEach(force => {
            force.applyForce(object, deltaTime);
        });

        // Apply repulsive force to avoid overlap with other objects
        this.applyRepulsiveForce(object, deltaTime);
    }

    private applyRepulsiveForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        this.objects.forEach(otherObject => {
            if (object !== otherObject) {
                const direction = new Vector3().subVectors(object.position, otherObject.position);
                const distance = direction.length();

                if (distance < this.threshold) {
                    const repulsion = direction.normalize().multiplyScalar(1 / distance);

                    if (physicsData && physicsData.velocity) {
                        // Apply repulsive force to velocity if PhysicsData is present
                        physicsData.velocity.addScaledVector(repulsion, deltaTime);
                    } else {
                        // Fallback: directly modify the position if no PhysicsData is present
                        object.position.addScaledVector(repulsion, deltaTime);
                    }
                }
            }
        });
    }
}
