import { Object3D, Vector3 } from "three";
import { Force } from "./Force";
import { PhysicsData } from "./Physics";

export class Gravity extends Force {
    private acceleration: Vector3;
    
    constructor(
        gravityAcceleration = new Vector3(0, -9.8, 0), 
        private scalar = 2) { // Adjusted to standard gravity
        super();
        this.acceleration = gravityAcceleration;
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        if (physicsData && physicsData.velocity && !physicsData.fixed) {
            const effectiveGravity = this.acceleration.clone().multiplyScalar(deltaTime * this.scalar);

            // Apply gravity considering the mass of the object
            physicsData.velocity.addScaledVector(effectiveGravity, 1 / (physicsData.mass || 1));

            // Update the position based on the current velocity
            object.position.addScaledVector(physicsData.velocity, deltaTime);
        }
    }
}
