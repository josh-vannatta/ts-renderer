// Build from vertices, scalar
// Add vertex (index) => void
//    create undefined record
// ForEach (coordinate, cb: (position) => entity)
// Add entity (coordinate, index) => void
//    (handle instances / render)
// Get entity (coordinate) => entity

import { BufferGeometry, Clock, Material, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { RenderedEntity } from "../renderer/RenderedEntity";

export class CoordinateSpace extends RenderedEntity {
    private _mesh: Mesh;
    private _entities: RenderedEntity[][];
    public coords: Record<string, number> = {}

    constructor(geometry: BufferGeometry) {
        super();

        this._mesh = new Mesh(geometry, new MeshBasicMaterial({
            transparent: true,
            opacity: 0
        }));
        this._entities = [];

        this.forEach((vector, i) => {
            this.coords[`${vector.x}.${vector.y}.${vector.z}`] = i
        })
    }

    public generate<T extends RenderedEntity>(callback: (vector: Vector3, index: number) => T): T[] {
        const entities: T[] = [];
        
        this.forEach((vertex,index) => {
            let entity = callback(vertex, index);
            
            entity.position.copy(vertex);
            entities.push(entity);
        });

        this._entities.push(entities);

        return entities;
    }

    public getPosition(x: number, y?: number, z?: number) {
        const positions = this._mesh.geometry.getAttribute('position');

        if (!y || !z) {
            if (x >= positions.count)
                return undefined;

            return new Vector3().fromBufferAttribute( positions, x );
        }

        try {
            const index = this.coords[`${x}.${y}.${z}`]

            return new Vector3().fromBufferAttribute( positions, index );
        } catch {
            return undefined;
        }
    }

    public getEntities(x: number, y?: number, z?: number) {
        if (y == undefined || z == undefined) {
            return this._entities.map(e => e[x]);
        }

        try {
            const index = this.coords[`${x}.${y}.${z}`]

            return this._entities.map(e => e[index]);
        } catch {
            return undefined;
        }
    }
    
    public forEach(callback: (vector: Vector3, index: number) => void) {
        const positions = this._mesh.geometry.getAttribute('position');
        const vertex = new Vector3();
        const entities: RenderedEntity[] = [];

        for ( let i = 0; i < positions.count; i ++ ) {
            vertex.fromBufferAttribute( positions, i );
            callback(this._mesh.localToWorld(vertex), i);
        }

        return entities;
    }

    public onUpdate(clock?: Clock): void {
        if (this.state.finished)
            return;

        this._entities.forEach(collection => {
            this.forEach((vertex, index) => {
                collection[index].position.copy(vertex);
            });
        })
        
    }

    public onCreate(): void {
        this.add(this._mesh);
        // this.scale.set(5,5,5)
    }

    public onDestroy(): void {
        
    }


}