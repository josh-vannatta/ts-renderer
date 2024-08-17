import { Clock, Object3D, Vector3 } from 'three';
import { Collision } from "./Collisions";
import { Force } from "./Force";

// Define the PhysicsData interface
export interface PhysicsData {
    velocity: Vector3;
    mass?: number; // Optional mass property for more complex physics
    fixed?: boolean; // Indicates if the object is fixed in place and should not move
    lifespan?: number; // For objects like particles
    [key: string]: any; // Allow for additional properties
}

export class Physics {
    private forces: Force[] = [];
    private objects: Record<string, Object3D> = {};
    private static MIN_VELOCITY_THRESHOLD = 0.03;  // Minimum velocity to stop bouncing

    constructor() {}

    public addForce(force: Force) {
        this.forces.push(force);
    }

    public add(...objects: Object3D[]) {
        objects.forEach(object => {
            Physics.Init(object, object.userData.physicsData ?? {})            
            this.objects[object.uuid] = object;
        });
    }

    public update(clock: Clock) {
        const delta = clock.getDelta();

        this.entities.forEach(object => {
            const physicsData = object.userData.physicsData as PhysicsData;

            if (physicsData.fixed) return; // Skip updating fixed objects

            this.forces.forEach(force => {
                force.applyForce(object, delta );
            });

            this.entities.forEach(other => {
                if (object !== other) {
                    Collision.resolveCollision(object, other, delta );
                }
            });

            if (physicsData.velocity) {
                object.position.addScaledVector(physicsData.velocity, delta );
            }
        });
    }

    public static Init(object: Object3D, data?: PhysicsData) {
        object.userData.physicsData = {
            velocity: data?.velocity ?? new Vector3(),
            mass: data?.mass ?? 1, // Default mass
            fixed: data?.fixed ?? false, // By default, objects are not fixed
            lifespan: data?.lifespan ?? 0
        } as PhysicsData
    }

    public get entities() {
        return Object.values(this.objects)
    }
}