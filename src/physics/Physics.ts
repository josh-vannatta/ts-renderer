import { Clock, Object3D, Vector3 } from 'three';
import { Collision } from "./Collisions";
import { Force } from "./Force";

// Define the PhysicsData interface
export interface PhysicsData {
    velocity: Vector3;
    mass?: number; // Optional mass property for more complex physics
    fixed?: boolean; // Indicates if the object is fixed in place and should not move
    lifespan?: number; // For objects like particles
    forces?: Force[];
    collisions?: boolean;
    [key: string]: any; // Allow for additional properties
}

export class Physics {
    private forces: Force[] = [];
    private objects: Record<string, Object3D> = {};

    constructor(
        private options = {
            collisions: true,
        }
    ) {}

    public addForce(...forces: Force[]) {
        forces.forEach(force => {
            this.forces.push(force);
        })
    }

    public add(...objects: Object3D[]) {
        objects.forEach(object => {
            Physics.Init(object, object.userData.physicsData ?? {})            
            this.objects[object.uuid] = object;
        });
    }

    public update(clock: Clock) {
        const delta = .008

        this.entities.forEach(object => {
            const physicsData = object.userData.physicsData as PhysicsData;

            if (physicsData.fixed) return; // Skip updating fixed objects

            this.entities.forEach(other => {
                if (object !== other && this.options.collisions && physicsData.collisions) {
                    Collision.resolveCollision(object, other, delta );
                }
            });

            this.forces.forEach(force => {
                force.applyForce(object, delta );
            });

            physicsData?.forces?.forEach(force => force.applyForce(object, delta));

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
            lifespan: data?.lifespan ?? 0,
            collisions: data?.collisions ?? true,
            forces: data?.forces ?? []
        } as PhysicsData
    }

    public static ApplyForce(object: Object3D, force: Force) {
        if (!object.userData.physicsData)
            Physics.Init(object);
        
        object.userData.physicsData.forces.push(force);
    }

    public get entities() {
        return Object.values(this.objects)
    }
}