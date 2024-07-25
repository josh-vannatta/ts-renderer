import { Vector3 } from "three";

export class VectorUtils {
    public static midpoint(...vectors: Vector3[]) {
        let midpoint = new Vector3();
    
        vectors.forEach(vector => {
            midpoint.add(vector);
        });
    
        midpoint.x /= vectors.length;
        midpoint.y /= vectors.length;
        midpoint.z /= vectors.length;
    
        return vectors.length ?  midpoint : undefined;
    }

    public static project(from: Vector3, through: Vector3, scalar: number) {        
        let direction = from.clone().sub(through).normalize();

        return from.clone().sub(direction.multiplyScalar(scalar));
    }

    public static reflect(start: Vector3, midpoint: Vector3, scalar?: number) {
        let dist = start.distanceTo(midpoint);
        let _scalar = scalar ? scalar / dist : 1;

        if (isNaN(_scalar) || _scalar == Infinity)
            _scalar = 1;
            
        return this._reflect(start.clone(), midpoint.clone(), _scalar)
    }
    

    public static _reflect(start: Vector3, midpoint: Vector3, scalar: number) {
        let reflection = new Vector3();
    
        const xAdj = (midpoint.x - start.x) * scalar;
        const yAdj = (midpoint.y - start.y) * scalar;
        const zAdj = (midpoint.z - start.z) * scalar;
    
        reflection.x = midpoint.x + xAdj;
        reflection.y = midpoint.y + yAdj;
        reflection.z = midpoint.z + zAdj;
    
        return reflection;
    }

    public static random(scale: number = 1) {
        return new Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
        ).multiplyScalar(scale);
    }
}