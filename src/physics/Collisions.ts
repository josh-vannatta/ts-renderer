import { Object3D, Vector3, Raycaster, Intersection, Box3 } from 'three';
import { PhysicsData } from './Physics';

export class Collision {
    private static readonly MIN_VELOCITY_THRESHOLD = 0.1; 
    private static readonly MIN_DISTANCE_THRESHOLD = 1;  
    private static readonly MAX_SUB_STEPS = 5; 
    private static raycaster = new Raycaster();
    private static vectorPool: Vector3[] = [];
    private static boxPool: Box3[] = [];

    private static getVector(): Vector3 {
        return this.vectorPool.pop() || new Vector3();
    }

    private static getBox(object: Object3D): Box3 {
        if (object.userData.boundingBox)
            return object.userData.boundingBox as Box3;

        return (this.boxPool.pop() || new Box3()).setFromObject(object);
    }

    private static releaseVector(vector: Vector3): void {
        vector.set(0, 0, 0);
        this.vectorPool.push(vector);
    }

    private static releaseBox(box: Box3): void {
        box.makeEmpty(); 
        this.boxPool.push(box);
    }

    public static resolveCollision(objectA: Object3D, objectB: Object3D, delta: number = 1): void {
        const physicsData = objectA.userData.physicsData as PhysicsData;

        if (!physicsData || physicsData?.fixed) return;

        if (physicsData.velocity.length() < Collision.MIN_VELOCITY_THRESHOLD) {
            physicsData.velocity.set(0, 0, 0);
            return; 
        }

        const totalMovement = physicsData.velocity.clone().multiplyScalar(delta);
        
        let stepDelta = delta;
        let steps = 1;

        if (totalMovement.length() > Collision.MIN_DISTANCE_THRESHOLD) {
            steps = Math.min(Collision.MAX_SUB_STEPS, Math.ceil(totalMovement.length()));
            stepDelta = delta / steps;
        }

        for (let i = 0; i < steps; i++) {
            const movement = physicsData.velocity.clone().multiplyScalar(stepDelta);
            const boxA = Collision.getBox(objectA).expandByScalar(2).expandByVector(movement);
            const boxB = Collision.getBox(objectB);

            if (boxA.intersectsBox(boxB)) {
                const direction = movement.clone().normalize();
                
                Collision.raycaster.set(objectA.position, direction);

                const intersections: Intersection[] = Collision.raycaster.intersectObject(objectB, true);

                if (intersections.length > 0) {
                    const relevantIntersections = intersections.filter(
                        intersection => intersection.distance < Collision.MIN_DISTANCE_THRESHOLD
                    );

                    if (relevantIntersections.length > 0) {
                        const intersection = relevantIntersections[0];

                        Collision.handleCollision(objectA, intersection);

                        continue
                    }
                }
            }

            Collision.releaseVector(movement);
            Collision.releaseBox(boxA);
            Collision.releaseBox(boxB);
        }
    }

    private static handleCollision(objectA: Object3D, intersection: Intersection): void {
        const collisionNormal = intersection.face?.normal.clone().normalize() ?? Collision.getVector();
        const physicsData = objectA.userData.physicsData as PhysicsData;

        physicsData.velocity.reflect(collisionNormal);
        physicsData.velocity.multiplyScalar(0.8);
        Collision.releaseVector(collisionNormal);
    }
}