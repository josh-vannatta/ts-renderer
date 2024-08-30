import { Object3D, Vector3 } from "three";// Assuming the PhysicsData interface is in the PhysicsSystem file
import { PhysicsData } from "./Physics";

export type ForceOptions = {
    type?: string,
    magnitude?: Partial<Vector3>,
    amplitude?: number
}

export type EnforcedForceOptions = {
    type: string,
    magnitude: Vector3,
    amplitude: number
}

export abstract class Force {
    public options: EnforcedForceOptions;
    public objects: Object3D[] = [];

    constructor(options: ForceOptions) {
        this.options = {
            type: options.type ?? "Force",
            magnitude: new Vector3(options?.magnitude?.x, options?.magnitude?.y, options?.magnitude?.z),
            amplitude: options.amplitude ?? 1
        }
    }

    public get magnitude() {
        return this.options.magnitude.clone();
    }

    public get amplitude() {
        return this.options.amplitude
    }

    public get type() {
        return this.options.type
    }

    public addObject(...object: Object3D[]) {
        this.objects.push(...object);
    }

    public static defaultOptions: ForceOptions = { type: "Force", magnitude: new Vector3(), amplitude: 1 }

    public abstract applyForce(object: Object3D, deltaTime: number): void;

    public static deserialize(...opts: ForceOptions[]): Force[] {
        const forces: Force[] = []

        opts.forEach(force => {
            switch (force.type) {
                case "Gravity": 
                    forces.push(new Gravity(force)); 
                    break;
                case "Direction": 
                    forces.push(new DirectionalForce(force)); 
                    break;
                case "ForceDirected": 
                    forces.push(new ForceDirectedField(force));  
                    break;

                default: 
                    forces.push(new DirectionalForce(force)); 
                    break;
            }
        })


        return forces;
    }
}

export class DirectionalForce extends Force {
    constructor(opts: ForceOptions) {
        super({
            ...opts,
            type: "Direction"
        });
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        if (physicsData && physicsData.velocity) {
            // Apply force to velocity if PhysicsData is present
            physicsData.velocity.addScaledVector(this.magnitude, deltaTime);
        } else {
            // Fallback: directly modify the position if no PhysicsData is present
            object.position.addScaledVector(this.magnitude, deltaTime);
        }
    }
}

export class ForceDirectedField extends Force {
    constructor(public opts: ForceOptions) {
        super({ ...opts, type: "ForceDirected" });
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        // Apply repulsive force to avoid overlap with other objects
        this.applyRepulsiveForce(object, deltaTime);
    }

    private applyRepulsiveForce(a: Object3D, deltaTime: number): void {
        this.objects.forEach(b => {
            if (a.uuid !== b.uuid) {
                const direction = new Vector3().subVectors(a.position, b.position);
                const distance = direction.length();

                if (distance < this.amplitude) {
                    const repulsion = direction.normalize().multiplyScalar(this.amplitude ?? 1 / distance);

                    // Fallback: directly modify the position if no PhysicsData is present
                    a.position.addScaledVector(repulsion, deltaTime);
                }
            }
        });
    }
}


export class Gravity extends Force {
    constructor(opts: ForceOptions = { magnitude: new Vector3(0,-9.8,0)}) { 
        super({
            ...opts,
            type: "Gravity"
        });
    }

    public applyForce(object: Object3D, deltaTime: number): void {
        const physicsData = object.userData.physicsData as PhysicsData;

        if (physicsData && physicsData.velocity && !physicsData.fixed) {
            const effectiveGravity = this.magnitude.multiplyScalar(deltaTime * this.amplitude);

            physicsData.velocity.addScaledVector(effectiveGravity, 1 / (physicsData.mass || 1));
            // object.position.addScaledVector(physicsData.velocity, deltaTime);
        }
    }
}