import { IsInteractive, RenderedEntity, ViewInteractions } from '../renderer/RenderedEntity';
import { BufferGeometry, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { mergeBufferGeometries } from './BufferUtils';

export class InstanceMesh_Old extends RenderedEntity {
    public vertices: Mesh[] = [];
    public exceptions: Mesh[] = [];
    private _matrix = new Matrix4();
    private _instance: Mesh | undefined;

    constructor() {
        super();
        this._instance = undefined;
    }

    public onCreate() {}
    public onUpdate() {}

    public static Instance(geometry, material) {
        return new Mesh(geometry, material);
    }

    public addInstance(instance: Mesh) {       
        this.vertices.push(instance);
    }

    public removeInstance(instance: Mesh) {
        this.vertices = this.vertices.filter(ref => ref != instance);
    }

    public clear() {        
        if (this._instance) {
            this.remove(this._instance);
            this.vertices = [];
        }

        return this;
    }

    public build() {        
        let quaternion = new Quaternion();
        let intersects = this.vertices.filter(mesh => 
            !this.exceptions.find(e => e.position.equals(mesh.position)))

        let geometries = intersects.map(mesh => {
            let buffer = mesh.geometry.clone();
            quaternion.setFromEuler(mesh.rotation);
            this._matrix.compose(mesh.position, quaternion, mesh.scale);
            buffer.applyMatrix4(this._matrix);
            return buffer;
        });        
        
        let bufferGeometries = mergeBufferGeometries(geometries);

        if (!bufferGeometries)
            return;

        this._instance = new Mesh(bufferGeometries, this.vertices[0].material);
        this.add(this._instance);                
    }

    public getAll() {
        return this.vertices;
    }

}

export class RenderedInstances extends RenderedEntity implements IsInteractive {
    public mesh: InstancedMesh<BufferGeometry>;
    public interactions: ViewInteractions;
    public readonly isRenderedInstances: boolean = true;

    constructor(
        public readonly renderedEntities: InstancedEntity[], 
        private ref: RenderedInstance) 
    {
        super();
        renderedEntities.forEach((entity, i) => entity.instance = ref.clone(i));
        this.interactions = new ViewInteractions();
    }
    
    public onCreate() {
        const color = this.ref.material.color.clone();
        this.ref.material.color = new Color(0xffffff);
        const colors: Float32Array = new Float32Array(this.renderedEntities.length * 3);

        this.renderedEntities.forEach((entity, i) => {
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
        this.mesh = new InstancedMesh(this.ref.geometry, this.ref.material, this.renderedEntities.length);

        this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        this.add(this.mesh);       
    }

    public onUpdate() {
        let needsUpdate = false;

        this.renderedEntities.forEach(entity => {
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
        this.renderedEntities.forEach(entity => entity.onDestroy());
    }

    public getHoveredInstance(intersects: Vector3[]) {
        return this.renderedEntities.find(entity => {
            const dist = intersects[0].distanceTo(entity.worldPosition);
            const doesIntersect = dist <= entity.instance.bounding * entity.averageScale;

            return doesIntersect;   
        });
    }

    public onHover(intersects?: Vector3[]) {
    }

    public onReset() {       
        this.renderedEntities.forEach(entity => {
            if (ViewInteractions.hasInstance(entity))
                entity.onReset();
        })
    }

    public onSelect() {}

    public static isInstance(object: any): object is RenderedInstances {
        return object && object.isRenderedInstances == true;
    }
}

interface InstanceMaterial extends Material {
    color: Color
}

export class RenderedInstance {
    public color: Color;
    public index: number;
    public bounding: number;
    public isRenderedInstance: boolean = true;
    public needsUpdate: boolean = true;

    constructor(
        public geometry: BufferGeometry,
        public material: InstanceMaterial) 
    { }

    public clone(index: number): RenderedInstance {
        const instance = new RenderedInstance(this.geometry, this.material);

        instance.index = index;
        instance.needsUpdate = this.needsUpdate;
        instance.color = new Color(this.material.color);
        instance.bounding = (
            this.geometry.boundingSphere?.radius ?? 
            this.geometry.boundingBox?.max.length() ?? 1
        );

        return instance;
    }
}

export interface InstancedEntity extends RenderedEntity {
    instance: RenderedInstance
}

export function instanceOfInstancedEntity(object: any): object is InstancedEntity {
    return object.instance && object.instance.isRenderedInstance;
}