import { Object3D, Vector3, Raycaster, Intersection, Box3 } from 'three';
import { PhysicsData } from './Physics';

export class Collision {
    private static raycaster = new Raycaster();
    private static readonly MIN_VELOCITY_THRESHOLD = 0.1;  // Minimum velocity to stop bouncing
    private static readonly MIN_DISTANCE_THRESHOLD = 0.02;  // Minimum distance to stop bouncing
    private static readonly MAX_SUB_STEPS = 5; // Maximum sub-steps per frame

    private static vectorPool: Vector3[] = [];
    private static boxPool: Box3[] = [];

    private static getVector(): Vector3 {
        return this.vectorPool.pop() || new Vector3();
    }

    private static getBox(): Box3 {
        return this.boxPool.pop() || new Box3();
    }

    private static releaseVector(vector: Vector3): void {
        vector.set(0, 0, 0); // Reset the vector
        this.vectorPool.push(vector);
    }

    private static releaseBox(box: Box3): void {
        box.makeEmpty(); // Reset the box
        this.boxPool.push(box);
    }

    public static resolveCollision(objectA: Object3D, objectB: Object3D, delta: number = 1): void {
        const physicsData = objectA.userData.physicsData as PhysicsData;

        if (physicsData?.fixed) return;

        if (physicsData?.velocity?.length() < Collision.MIN_VELOCITY_THRESHOLD) {
            physicsData.velocity.set(0, 0, 0);
            return; // No need to check collisions if the object has no movement
        }

        const totalMovement = physicsData.velocity.clone().multiplyScalar(delta);
        let subStepDelta = delta;
        let subSteps = 1;

        // If the object is moving fast, increase the number of sub-steps
        if (totalMovement.length() > Collision.MIN_DISTANCE_THRESHOLD) {
            subSteps = Math.min(Collision.MAX_SUB_STEPS, Math.ceil(totalMovement.length() / Collision.MIN_DISTANCE_THRESHOLD));
            subStepDelta = delta / subSteps;
        }

        for (let i = 0; i < subSteps; i++) {
            const movement = physicsData.velocity.clone().multiplyScalar(subStepDelta);
            const sweptBox = Collision.getBox().setFromObject(objectA).expandByVector(movement);
            const boxB = Collision.getBox().setFromObject(objectB);

            if (sweptBox.intersectsBox(boxB)) {
                const direction = movement.clone().normalize();
                Collision.raycaster.set(objectA.position, direction);

                const intersections: Intersection[] = Collision.raycaster.intersectObject(objectB, true);

                if (intersections.length > 0) {
                    const relevantIntersections = intersections.filter(
                        intersection => intersection.distance > Collision.MIN_DISTANCE_THRESHOLD
                    );

                    if (relevantIntersections.length > 0) {
                        const intersection = relevantIntersections[0];

                        if (intersection.distance < 0.5) {
                            Collision.handleCollision(objectA, intersection);
                        }
                    }
                }
            }

            // Release pooled objects after each sub-step
            Collision.releaseVector(movement);
            Collision.releaseBox(sweptBox);
            Collision.releaseBox(boxB);
        }
    }

    private static handleCollision(objectA: Object3D, intersection: Intersection): void {
        const collisionNormal = intersection.face?.normal.clone().normalize() ?? Collision.getVector();
        const physicsData = objectA.userData.physicsData;

        if (physicsData && physicsData.velocity) {
            physicsData.velocity.reflect(collisionNormal);
            physicsData.velocity.multiplyScalar(0.8);
            objectA.position.addScaledVector(collisionNormal, 0.05);

            // Release the collision normal back to the pool
            Collision.releaseVector(collisionNormal);
        }
    }
}
