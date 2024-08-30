import { BufferGeometry, Clock, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Object3D, Vector3 } from 'three';
import { IsInteractive, RenderedEntity, ViewInteractions } from './RenderedEntity';

export class InstanceCollection extends RenderedEntity implements IsInteractive {
    public mesh: InstancedMesh<BufferGeometry>;
    public interactions: ViewInteractions;
    public readonly isRenderedInstances: boolean = true;
    public readonly empty: Matrix4 = new Matrix4();
    public empties: number[] = [];

    constructor(
        public _entities: (InstancedEntity | undefined)[], 
        protected ref: Instance,
        private maxInstances: number = 1000) 
    {
        super();
        this.interactions = new ViewInteractions();
        this.mesh = new InstancedMesh(this.ref.geometry, this.ref.material, this.maxInstances);
        this.add(this.mesh);
        this.empty.setPosition(0,-100000,0);   
    }

    public get entities() {
        return this._entities.filter(e => e != undefined);
    }

    public needsUpdate(update: boolean = true) {
        this.mesh.instanceMatrix.needsUpdate = update;
        this.mesh.geometry.attributes.color.needsUpdate = update;
    }
    
    public onCreate() {
        const colors: Float32Array = new Float32Array(this.maxInstances * 3); // Allocate max size for colors

        // Initialize the instanced mesh
        this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);

        // Pre-allocate colors attribute
        this.mesh.geometry.setAttribute("color", new InstancedBufferAttribute(colors, 3));
        this.ref.material.vertexColors = true;

        for (let i = this._entities.length; i < this.maxInstances; i++) {
            this._entities.push(undefined);
            this.empties.push(i)
            this.mesh.setMatrixAt(i, this.empty);
            this.mesh.geometry.attributes.color.setXYZ(i, 0,0,0);
        }

        this._entities.forEach(entity => {
            if (!!entity) this.addInstance(entity)
        });
        this.empties = this.empties.reverse();
        
        this.needsUpdate();
    }

    public override add(...object: (Object3D | undefined)[]): this {
        if (object.length == 0)
            return this;

        object.forEach((instance, i) => {
            if (Instance.isInstance(instance))
                this.addInstance(instance);
            else    
                super.add(instance);
        });

        return this;
    }

    public override remove(...object: (Object3D | undefined)[]): this {
        if (object.length == 0)
            return this;

        object.forEach((instance, i) => {
            if (Instance.isInstance(instance))
                this.removeInstance(instance);
            else    
                super.remove(instance);
        });

        return this;
    }

    public addInstance(entity: InstancedEntity) {
        // Ensure we're not exceeding the maximum number of instances
        if (this.empties.length == 0) {
            console.warn("Max instances reached. Cannot add more.");
            return;
        }

        const index = this.empties.pop() ?? this._entities.length;

        entity.instance = this.ref.clone(index);
        this._entities[index] = entity;
        this.mesh.setMatrixAt(entity.instance.index, entity.matrix);
        this.updateColor(entity)
        this.needsUpdate();
        entity.onCreate();
    }
    

    public removeInstance(entity: InstancedEntity) {
        this._entities[entity.instance.index] = undefined;
        this.mesh.setMatrixAt(entity.instance.index, this.empty);
        this.mesh.geometry.attributes.color.setXYZ(entity.instance.index, 0,0,0);
        this.empties.push(entity.instance.index);
        this.needsUpdate();
        entity.onDestroy();
    }

    private updateColor(entity: InstancedEntity) {
        this.mesh.geometry.attributes.color.setXYZ(
            entity.instance.index,
            entity.instance.color.r,
            entity.instance.color.g,
            entity.instance.color.b
        );
    }

    public onUpdate(clock: Clock) {
        let needsUpdate = false;

        this._entities.forEach((entity, i) => {
            if (!entity?.instance?.needsUpdate)
                return;

            entity.beforeUpdate();            
            entity.update(clock);
            entity.updateMatrixWorld();
            this.mesh.setMatrixAt(entity.instance.index, entity.matrix);
            this.updateColor(entity)
            needsUpdate = true;
            entity.afterUpdate();            
        });   

        this.needsUpdate(needsUpdate);
    }

    public onDestroy() {
        this._entities.forEach(entity => entity?.onDestroy());
    }

    public getHoveredInstance(intersects: Vector3[]) {
        return this._entities.find(entity => {
            if (!entity)
                return false;

            const dist = intersects[0].distanceTo(entity.worldPosition);
            const doesIntersect = dist <= entity.instance.bounding * entity.averageScale;

            return doesIntersect;   
        });
    }

    public onHover(intersects?: Vector3[]) {}

    public onReset() {       
        this._entities.forEach(entity => {
            if (ViewInteractions.isInstance(entity))
                entity.onReset();
        });
    }

    public onSelect() {}

    public static isInstance(object: any): object is InstanceCollection {
        return object && object.isRenderedInstances == true;
    }
}

export interface InstanceMaterial extends Material {
    color: Color
}

export class Instance {
    public color: Color;
    public index: number;
    public bounding: number;
    public isRenderedInstance: boolean = true;
    public needsUpdate: boolean = true;

    constructor(
        public geometry: BufferGeometry,
        public material: InstanceMaterial) 
    { }

    public clone(index: number): Instance {
        const instance = new Instance(this.geometry, this.material);

        instance.index = index;
        instance.needsUpdate = this.needsUpdate;
        instance.color = new Color(this.material.color);
        instance.bounding = (
            this.geometry.boundingSphere?.radius ?? 
            this.geometry.boundingBox?.max.length() ?? 1
        );

        return instance;
    }

    public static isInstance(object: any): object is InstancedEntity {
        return object.instance && object.instance.isRenderedInstance;
    }
}

export interface InstancedEntity extends RenderedEntity {
    instance: Instance
}
