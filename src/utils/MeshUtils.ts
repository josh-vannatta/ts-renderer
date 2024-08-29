import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, Scene, Vector3 } from "three";
import { VectorUtils } from "./VectorUtils";

export class MeshUtils {
    public static box = new Box3()

    public static toJson(object: Object3D) {
        MeshUtils.box.makeEmpty();
        MeshUtils.box.setFromObject(object);

        return {
            uuid: object.uuid,
            boundingBox: {
                min: VectorUtils.toJson(MeshUtils.box.min),
                max: VectorUtils.toJson(MeshUtils.box.max),
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
            const cb: Vector3 = MeshUtils.getBounding(child);

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