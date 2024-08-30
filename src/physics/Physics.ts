import { Box3, Clock, Euler, EulerOrder, Object3D, Vector3 } from 'three';
import { VectorUtils } from '../utils/VectorUtils';
import { PhysicsWorkerOutput, PhysicsWorkerMessage } from '../workers/physics.worker';
import { Collision } from "./Collisions";
import { Force, ForceOptions } from "./Force";

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

export interface PhysicsOptions {
    collisions: boolean,
    amplitude: number
}

export interface PhysicsWorkerObject {
    uuid: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; order: EulerOrder };
    scale: { x: number; y: number; z: number };
    physicsData: PhysicsData;
    boundingBox: {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
    };
}

export class PhysicsEngine {
    public forces: ForceOptions[] = [];
    public objects: Record<string, Object3D> = {};
    private options: PhysicsOptions;
    private worker: Worker;

    constructor(options?: Partial<PhysicsOptions>) {
        this.options = {
            collisions:  options?.collisions ?? true,
            amplitude: options?.amplitude ?? 1,
        }
        this.initWorker();
    }

    public initWorker() {
        this.worker = new Worker(new URL("../workers/physics.worker.ts", import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<PhysicsWorkerOutput>) => {
            const updates = event.data.updatedObjects;

            // Update the positions and physics data of the objects in the main thread
            updates.forEach(update => {
                const object = this.objects[update.uuid];
                if (object) {
                    Physics.init(object, update.physicsData);
                    object.position.addScaledVector(update.physicsData.velocity, event.data.delta );
                }
            });
        };
    }

    public addForce(...forces: Force[]) {
        this.forces.push(...forces.map(f => f.options));

        const message: PhysicsWorkerMessage = {
            type: "init",
            options: this.options,
            forces: forces.map(f => f.options),
            objects: [],
            delta: 0
        }

        if (!this.worker) 
            this.init()

        this.worker.postMessage(message)
        
    }

    public add(...objects: Object3D[]) {
        objects.forEach(object => {
            Physics.init(object, object.userData.physicsData ?? {})            
            this.objects[object.uuid] = object;
        });

        const message: PhysicsWorkerMessage = {
            type: "init",
            options: this.options,
            forces: [],
            objects: objects.map(o => Physics.serialize(o)),
            delta: 0
        }

        if (!this.worker) 
            this.init()

        this.worker.postMessage(message)
    }

    public init() {
        const message: PhysicsWorkerMessage = {
            type: "init",
            options: this.options,
            forces: [],
            objects: [],
            delta: 0
        }

        if (!this.worker) 
            this.initWorker()

        this.worker.postMessage(message)
    }

    public update() {
        const message: PhysicsWorkerMessage = {
            type: "update",
            options: this.options,
            forces: [],
            objects: Object.values(this.objects).map(o => Physics.serialize(o)),
            delta: .026 * this.options.amplitude
        }

        if (!this.worker)
            this.initWorker();

        this.worker.postMessage(message);
    }

    public dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null!;
        }
    }
}

export class Physics {
    public forces: Force[] = [];
    private objects: Record<string, Object3D> = {};
    private options: PhysicsOptions;

    constructor(options?: Partial<PhysicsOptions>) {
        if (options)
            this.init({ 
                collisions: options?.collisions ?? true,
                amplitude: options?.amplitude ?? 1
            });
     }

    public get initialized() {
        return !!this.options
    }

    public init(options: PhysicsOptions) {
        this.options = options;
        this.forces = [];
        this.objects = {};
    }

    public addForce(...forces: Force[]) {
        forces.forEach(force => {
            this.forces.push(force);
        })
    }

    public add(...objects: Object3D[]) {
        objects.forEach(object => {       
            Physics.init(object, object.userData.physicsData)
            this.objects[object.uuid] = object;
        });
    }

    public update() {
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
            velocity: data?.velocity ? VectorUtils.fromJson(data.velocity) : new Vector3(),
            mass: data?.mass ?? 1, // Default mass
            fixed: data?.fixed ?? false, // By default, objects are not fixed
            lifespan: data?.lifespan ?? 0,
            collisions: data?.collisions ?? true,
            forces: data?.forces ?? []
        } as PhysicsData
    }

    public static serialize(object: Object3D): PhysicsWorkerObject {
        const boundingBox = new Box3().setFromObject(object);

        return {  
            uuid: object.uuid,
            position: { x: object.position.x, y: object.position.y, z: object.position.z },
            rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z, order: object.rotation.order },
            scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
            physicsData: object.userData.physicsData as PhysicsData,
            boundingBox: {
                min: { x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.min.z },
                max: { x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.max.z }
            }
        };
    }
    
    public static deserialize(data: PhysicsWorkerObject): Object3D {
        const object = new Object3D();
        object.uuid = data.uuid;
        object.position.set(data.position.x, data.position.y, data.position.z);
        object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.order);
        object.scale.set(data.scale.x, data.scale.y, data.scale.z);
        object.userData.physicsData = data.physicsData;
        object.userData.boundingBox  = new Box3(
            new Vector3(data.boundingBox.min.x, data.boundingBox.min.y, data.boundingBox.min.z),
            new Vector3(data.boundingBox.max.x, data.boundingBox.max.y, data.boundingBox.max.z)
        );

        return object;
    }

    public static applyForce(object: Object3D, force: Force) {
        if (!object.userData.physicsData)
            Physics.init(object);
        
        object.userData.physicsData.forces.push(force);
    }

    public get entities() {
        return Object.values(this.objects)
    }

    public dispose() {}
}