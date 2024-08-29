import { Object3D, Vector3 } from "three";
import { Force } from "./Force";
import { PhysicsData } from "./Physics";

export class Gravity extends Force {
    constructor(
        private acceleration = new Vector3(0, -9.8, 0), 
        private amplitude = 1
    ) { 
        super();
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        if (physicsData && physicsData.velocity && !physicsData.fixed) {
            const effectiveGravity = this.acceleration.clone().multiplyScalar(deltaTime * this.amplitude);

            physicsData.velocity.addScaledVector(effectiveGravity, 1 / (physicsData.mass || 1));
            // object.position.addScaledVector(physicsData.velocity, deltaTime);
        }
    }
}
