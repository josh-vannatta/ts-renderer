import { CubicBezierCurve3, Curve, LineCurve3, QuadraticBezierCurve3, Vector3 } from "three";
import { VectorUtils } from "./VectorUtils";
import { HasPosition } from "../connections/Connection";

export type Quadratic = QuadraticBezierCurve3;
export type Cubic = CubicBezierCurve3;
export type RightAngle = CubicBezierCurve3;
export type Linear = LineCurve3;

export class CurveUtils {

    public static Linear(a: HasPosition, b: HasPosition, curve?: Curve<Vector3>) {
        if (curve && !this.isLinear(curve))
            curve = undefined;

        if (!curve) {
            curve = new LineCurve3(a.position.clone(), b.position.clone());
        } else {
            curve.v1.copy(a.position);
            curve.v2.copy(b.position);
            return curve;
        }

        return <LineCurve3> curve;
    }

    public static Quadratic(a: HasPosition, b: HasPosition, curve?: Curve<Vector3>) {
        if (curve && !this.isQuadratic(curve))
            curve = undefined;

        const { position: start } = a;
        const { position: end } = b;
        const middle = start.clone().lerp(end, .5);

        if (!curve) {
            curve = new QuadraticBezierCurve3(start.clone(), middle, end.clone());
       } else {
            curve.v0.copy(start);
            curve.v1 = middle;
            curve.v2.copy(end);
        }   

        return <QuadraticBezierCurve3> curve;
    }

    public static Cubic(a: HasPosition, b: HasPosition, curve?: Curve<Vector3>) {
        const { position: start } = a;
        const { position: end } = b;
        
        if (!curve) {
            const middle = start.clone().lerp(end, .5);
            const middle1 = start.clone().lerp(end, .5);
            curve = new CubicBezierCurve3(start.clone(), middle, middle1, end.clone());
       } else {
            curve["v0"].copy(start);
            curve["v3"].copy(end);           
        }   

        return <CubicBezierCurve3> curve;
    }

    public static RightAngle(a: HasPosition, b: HasPosition, curve?: Curve<Vector3>) {   
        curve = this.Cubic(a, b, curve);

        return <CubicBezierCurve3> curve;
    }

    public static update(
        curve: Curve<Vector3>, 
        endpoints: [ HasPosition, HasPosition] ) 
    {        
        if (this.isLinear(curve)) 
            return this.Linear(endpoints[0], endpoints[1], curve);

        if (this.isQuadratic(curve))
            this.Quadratic(endpoints[0], endpoints[1], curve);        

        if (this.isCubic(curve))
            this.Cubic(endpoints[0], endpoints[1], curve);        

        if (this.isRightAngle(curve))
            this.RightAngle(endpoints[0], endpoints[1], curve);    
    }

    public static applyTension(curve: Curve<Vector3>, tensions: [ Vector3, Vector3 ], clamp?: number) {
        if (this.isQuadratic(curve))
            return this.applyQuadraticTension(curve, tensions, clamp);

        if (this.isCubic(curve))
            return this.applyCubicTension(curve, tensions, clamp);

        if (this.isRightAngle(curve))
            return this.applyRightAngleTension(curve, tensions, clamp);
    }

    private static applyCubicTension(curve: CubicBezierCurve3, tensions: [ Vector3, Vector3 ], clamp: number = 1) {        
        let t0 = VectorUtils.reflect(tensions[0], curve.v0, clamp);     
        let t1 = VectorUtils.reflect(tensions[1], curve.v3, clamp);     

        curve.v1.copy(t0.lerp(t1, .1));
        curve.v2.copy(t1.lerp(t0, .1));        
    }

    private static applyQuadraticTension(curve: QuadraticBezierCurve3, tensions: [ Vector3, Vector3 ], clamp: number = 1) {
        let t0 = VectorUtils.reflect(tensions[0], curve.v0, clamp);
        curve.v1.copy(t0);
    }

    private static applyRightAngleTension(curve: CubicBezierCurve3, tensions: [ Vector3, Vector3 ], clamp?: number) {
        const { v0, v1, v2, v3 } = curve;
        let mid = v0.clone().lerp(v3, .5);
        let reflect0 = VectorUtils.reflect(tensions[0], curve.v0);
        let reflect1 = VectorUtils.reflect(tensions[1], curve.v3);  
        let bias0 = Math.abs(reflect0.x - v0.x) > Math.abs(reflect0.z - v0.z);
        let bias1 = Math.abs(reflect1.x - v3.x) > Math.abs(reflect1.z - v3.z);          
        
        const mid0 = new Vector3(
            bias0 ? v3.x : v0.x, 
            v0.y, 
            !bias0 ? v3.z : v0.z
        );

        const mid1 = new Vector3(
            bias1 ? v0.x : v3.x, 
            v3.y, 
            !bias1 ? v0.z : v3.z
        );

        // When no prior tensions, bias towards opposite endpoint
        if (tensions[0].equals(v0))
            mid0.copy(mid1);

        if (tensions[1].equals(v3))
            mid1.copy(mid0);

        // When tensions are between v0 & v3 (meaning reflection angle is <90)
        // reflect tension x & z across v0 again
        let xtDir = Math.sign(v0.x - tensions[0].x);
        let xvDir = Math.sign(v3.x - v0.x);
        let ztDir = Math.sign(v0.z - tensions[0].z);
        let zvDir = Math.sign(v3.z - v0.z);

        if (xtDir != 0 && xvDir != 0 && xtDir + xvDir == 0) {
            let offset = v0.x + (v0.x - tensions[0].x);
            offset = clamp ? v0.x - xvDir * clamp : offset;
            mid0.x = mid1.x = reflect0.x < offset? reflect0.x : offset;
            mid1.z = v3.z;
        }

        if (ztDir != 0 && zvDir != 0 && ztDir + zvDir == 0) {
            let offset = v0.z + (v0.z - tensions[0].z);
            offset = clamp ? v0.z - zvDir * clamp : offset;
            mid0.z = mid1.z = reflect0.z < offset ? reflect0.z : offset;
            mid1.x = v3.x;
        }                

        // if tension [x || z] is halfway between v0 & v3, lerp value
        if (mid0.z == v0.z && mid0.z == v3.z)            
            mid0.x = mid.x;

        if (mid0.x == v0.x && mid0.x == v3.x)
            mid0.z = mid.z;

        if (mid1.z == v0.z && mid1.z == v3.z)
            mid1.x = mid.x;

        if (mid1.x == v0.x && mid1.x == v3.x)
            mid1.z = mid.z;    

        v1.copy(mid0);
        v2.copy(mid1);
    }

    public static getTension(curves: Curve<Vector3>[], bias: 1 | 0) {
        const tensions: Vector3[] = [];

        curves.forEach(curve => {
            if (this.isLinear(curve))
                tensions.push(curve.v1.clone().lerp(curve.v2, .5));

            if (this.isQuadratic(curve))
                tensions.push(curve.v1);

            if (this.isCubic(curve) || this.isRightAngle(curve))
                tensions.push(bias == 0 ? curve.v2 : curve.v1);
        });

        if (tensions.length == 0)
            return;        

        return VectorUtils.midpoint(...tensions);
    }

    public static isLinear(curve: Curve<Vector3>): curve is LineCurve3 {
        return curve.type == 'LineCurve3';
    }

    public static isQuadratic(curve: Curve<Vector3>): curve is QuadraticBezierCurve3 {
        return curve.type == 'QuadraticBezierCurve3';
    }

    public static isCubic(curve: Curve<Vector3>): curve is CubicBezierCurve3 {
        return curve.type == 'CubicBezierCurve3';
    }

    public static isRightAngle(curve: Curve<Vector3>): curve is CubicBezierCurve3 {
        return curve.type == 'RightAngleCurve';
    }
}