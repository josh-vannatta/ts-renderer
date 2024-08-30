import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, Scene, Vector3 } from "three";
import { VectorUtils } from "./VectorUtils";


export type ObjectJSON = {
    uuid: string,
    position: Partial<Vector3>,
    boundingBox: { min: Partial<Vector3>, max: Partial<Vector3>},
}

export class ObjectRef {
    public uuid: string;
    public position: Vector3;
    public boundingBox: Box3;
    public userData: any;

    constructor(opts: ObjectJSON) {
        this.uuid = opts.uuid;
        this.position = VectorUtils.fromJson(opts.position)
        this.boundingBox = new Box3(
            VectorUtils.fromJson(opts.boundingBox.min),
            VectorUtils.fromJson(opts.boundingBox.max),
        );
        this.userData = {};
    }
}

export class ObjectUtils {
    public static box = new Box3()

    public static toJson(object: Object3D): ObjectJSON {
        ObjectUtils.box.makeEmpty();
        ObjectUtils.box.setFromObject(object);

        return {
            uuid: object.uuid,
            boundingBox: {
                min: VectorUtils.toJson(ObjectUtils.box.min),
                max: VectorUtils.toJson(ObjectUtils.box.max),
            },
            position: VectorUtils.toJson(object.position),
        }
    }

    public static setColor(mesh: Mesh | Group, color?: string): Mesh | Group {    
        mesh.children.forEach((child: any)  => {
            child.material = new MeshStandardMaterial({
                color: color ?? "#ddefff"
            });
            child.children.forEach(gc => {
                gc.material = new MeshStandardMaterial({
                    color: color ?? "#ddefff"
                });                
            });
        });
    
        return mesh;
    }

    public static getBounding(mesh: Mesh): Vector3 {        
        if (mesh.geometry?.boundingBox?.max) {
            const bound = mesh.geometry.boundingBox.max.multiply(mesh.scale).applyEuler(mesh.rotation);

            return new Vector3(Math.abs(bound.x), Math.abs(bound.y), Math.abs(bound.z));
        }
        
        let children = new Vector3(1,1,1);
    
        mesh.children.forEach((child: any)  => {
            const cb: Vector3 = ObjectUtils.getBounding(child);

            if (cb.x > children.x)
                children.x += cb.x;

            if (cb.y > children.y)
                children.y += cb.y;

            if (cb.z > children.z)
                children.z += cb.z;
        });

        children = children.multiply(mesh.scale).applyEuler(mesh.rotation);
        
        return new Vector3(Math.abs(children.x), Math.abs(children.y), Math.abs(children.z));
    }
}