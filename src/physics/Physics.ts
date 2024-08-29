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

interface Options {
    collisions: boolean,
    amplitude: number
}

export class Physics {
    private forces: Force[] = [];
    private objects: Record<string, Object3D> = {};
    private options: Options;

    constructor(options?: Partial<Options>) {
        this.options = {
            collisions:  options?.collisions ?? true,
            amplitude: options?.amplitude ?? 1,
        }
    }

    public addForce(...forces: Force[]) {
        forces.forEach(force => {
            this.forces.push(force);
        })
    }

    public add(...objects: Object3D[]) {
        objects.forEach(object => {
            Physics.init(object, object.userData.physicsData ?? {})            
            this.objects[object.uuid] = object;
        });
    }

    public update(clock: Clock) {
        const delta = .026 * this.options.amplitude

        this.entities.forEach(object => {
            const physicsData = object.userData.physicsData as PhysicsData;

            if (physicsData.fixed) return; // Skip updating fixed objects

            this.forces.forEach(force => {
                force.applyForce(object, delta );
            });

            physicsData?.forces?.forEach(force => force.applyForce(object, delta));

            this.entities.forEach(other => {
                if (object !== other && this.options.collisions && physicsData.collisions) {
                    Collision.resolveCollision(object, other, delta );
                }
            });

            if (physicsData.velocity) {
                object.position.addScaledVector(physicsData.velocity, delta );
            }
        });
    }

    public static init(object: Object3D, data?: Partial<PhysicsData>) {
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
            Physics.init(object);
        
        object.userData.physicsData.forces.push(force);
    }

    public get entities() {
        return Object.values(this.objects)
    }
}