import { BufferGeometry, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh } from "three";
import { Instance, InstancedEntity } from "../renderer/InstancedEntity";
import { HasPosition } from "./Connection";
import { Emission } from "./Emission";

const HIDDEN_DISTANCE = 10000;

type Comparitor = {
    entity: HasPosition,
    distance: number
}

export class EmissionInstances {
    public instances: InstancedMesh<BufferGeometry>;
    public entity: InstancedEntity;
    public emissions: (Emission | undefined)[];
    public active: number;
    public comparitors: Comparitor[] = [];

    constructor(emission: Emission) {
        if (!Instance.isInstance(emission.entity))
            throw new Error("Emission must be InstancedEntity to use EmissionInstances");         

        this.emissions = new Array(emission.instanceCount).fill(undefined);
        this.entity = emission.entity.clone();
        this.active = 0;
        this.initialize(emission);        
    }

    public initialize(emission: Emission) {
        const { material, geometry } = this.entity.instance;
        const color = material.color.clone();
        const colors: Float32Array = new Float32Array(this.emissions.length * 3);
        
        this.entity.instance.color = color;
        this.emissions.forEach((e, i) => color.toArray(colors, i * 3));
        geometry.setAttribute("color", new InstancedBufferAttribute(colors, 3));
        material.vertexColors = true;
        material.color = new Color(0xffffff);

        this.instances = new InstancedMesh(geometry, material, this.emissions.length);
        this.instances.instanceMatrix.setUsage(DynamicDrawUsage);
    }

    public update() {
        if (this.active <= 0)
            return;

        this.comparitors.forEach(c => c.distance = HIDDEN_DISTANCE);

        this.emissions.forEach((emission, i) => {       
            const { color } = this.entity.instance;

            if (!emission) {           
                this.entity.position.set(0,0,-HIDDEN_DISTANCE);
            } else {
                this.handleUpdate(emission, i);
            }
            
            this.entity.updateMatrixWorld();
            this.instances.setMatrixAt(i, this.entity.matrix);
            this.instances.geometry.attributes.color.setXYZ(i, color.r, color.g, color.b);
        });   

        this.instances.instanceMatrix.needsUpdate = true;
        this.instances.geometry.attributes.color.needsUpdate = true;
        this.active = this.active < 0 ? 0 : this.active;
    }

    public setComparitor(index: number, entity: HasPosition) {
        if (!this.comparitors[index])
            this.comparitors[index] = { entity, distance: HIDDEN_DISTANCE };
        else 
            this.comparitors[index].entity = entity;
    }

    public overlapping(comparitor: number, emission: Emission) {
        if (!this.comparitors[comparitor])
            return false;

        return this.comparitors[comparitor].distance < emission.margin;
    }

    public add(emission: Emission) {
        this.emissions.find((existing, i) => {
            if (!existing) {
                this.handleCreate(emission, i);
                this.active++;
                return true;
            }

            return false;
        });                
    }

    public handleCreate(emission: Emission, i: number) {
        this.emissions[i] = emission;
        emission.entity = this.entity;
        emission.emit();
    }

    public handleUpdate(emission: Emission, i: number) {
        emission.update();

        this.comparitors.forEach(comparitor => {
            const dist = emission.entity.position.distanceTo(comparitor.entity.position);

            if (comparitor.distance > dist)
                comparitor.distance = dist;
        });

        if (emission.hasExpired) {
            emission.entity.position.set(0,0,-HIDDEN_DISTANCE);
            this.emissions[i] = undefined;
            this.active--;
        }        
    }

    public get type() {
        return this.entity.constructor.name;
    }
}