import { CubicBezierCurve3, Mesh, MeshToonMaterial, TubeGeometry, Vector3 } from "three";
import { Connection } from "../../connections/Connection";
import { CurveUtils } from "../../utils/CurveUtils";

export class Line extends Connection<CubicBezierCurve3> {
    public createLine(points: Vector3[]) {
        return new Mesh(
            new TubeGeometry(this.curve, this.fidelity, .5, 8),
            new MeshToonMaterial({ color: "rgb(0,100,210)" })
        );       
    }    

    protected computeCurve(): CubicBezierCurve3 {
        return CurveUtils.RightAngle(this.endpoints[0], this.endpoints[1]);    
    }
}