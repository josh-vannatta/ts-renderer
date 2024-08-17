import { BufferGeometry, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Material, Vector3 } from 'three';
import { IsInteractive, RenderedEntity, ViewInteractions } from './RenderedEntity';

export class InstanceCollection extends RenderedEntity implements IsInteractive {
    public mesh: InstancedMesh<BufferGeometry>;
    public interactions: ViewInteractions;
    public readonly isRenderedInstances: boolean = true;

    constructor(
        public readonly entities: InstancedEntity[], 
        private ref: Instance,
        private maxInstances: number = 1000) 
    {
        super();
        entities.forEach((entity, i) => entity.instance = ref.clone(i));
        this.interactions = new ViewInteractions();
    }
    
    public onCreate() {
        const color = this.ref.material.color.clone();
        const colors: Float32Array = new Float32Array(this.entities.length * 3);
        this.ref.material.color = new Color(0xffffff);

        this.entities.forEach((entity, i) => { 
            color.clone().toArray(colors, i * 3);
            entity.onCreate();
            entity.calcWorldPosition = () => {
                var position = entity.position.clone()
                
                position.applyEuler(this.rotation);

                if (this.parent) 
                    position.applyEuler(this.parent.rotation);        

                position.add(this.worldPosition);

                return position;
            }
        });

        this.ref.geometry.setAttribute("color", new InstancedBufferAttribute(colors, 3));
        this.ref.material.vertexColors = true;
        this.mesh = new InstancedMesh(this.ref.geometry, this.ref.material, this.entities.length);

        this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        this.add(this.mesh);       
    }

    public onUpdate() {
        let needsUpdate = false;

        this.entities.forEach(entity => {
            if (!entity.instance.needsUpdate)
                return;

            entity.beforeUpdate();            
            entity.update();
            entity.updateMatrixWorld();
            this.mesh.setMatrixAt(entity.instance.index, entity.matrix);
            this.mesh.geometry.attributes.color.setXYZ(
                entity.instance.index,
                entity.instance.color.r,
                entity.instance.color.g,
                entity.instance.color.b
            );
            needsUpdate = true;
            entity.afterUpdate();            
        });   

        if (!needsUpdate)
            return;        

        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.geometry.attributes.color.needsUpdate = true;
    }

    public onDestroy() {
        this.entities.forEach(entity => entity.onDestroy());
    }

    public getHoveredInstance(intersects: Vector3[]) {
        return this.entities.find(entity => {
            const dist = intersects[0].distanceTo(entity.worldPosition);
            const doesIntersect = dist <= entity.instance.bounding * entity.averageScale;

            return doesIntersect;   
        });
    }

    public onHover(intersects?: Vector3[]) {
    }

    public onReset() {       
        this.entities.forEach(entity => {
            if (ViewInteractions.isInstance(entity))
                entity.onReset();
        })
    }

    public onSelect() {}

    public static isInstance(object: any): object is InstanceCollection {
        return object && object.isRenderedInstances == true;
    }
}

interface InstanceMaterial extends Material {
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