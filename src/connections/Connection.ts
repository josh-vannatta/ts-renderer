import { BufferGeometry, Curve, Line, Mesh, Vector3 } from "three";
import { CurveUtils } from "../utils/CurveUtils";
import { Path } from "./Path";

export type ConnectionEndpoints = [ HasPosition, HasPosition] ;

export interface HasPosition {
    position: Vector3;
    uuid: string;
}

export abstract class Connection<ConnectionCurve extends Curve<Vector3> = Curve<Vector3>> extends Path<ConnectionCurve> {
    public line: Line<BufferGeometry> | Mesh<BufferGeometry>;

    constructor(public readonly endpoints: ConnectionEndpoints) {
        super(endpoints);
    }

    protected abstract createLine(points?: Vector3[]): Line<BufferGeometry> | Mesh<BufferGeometry>; 

    public static Curves = CurveUtils
    
    public onCreate() {
        super.onCreate();
        this.rebuildLine();
    }

    public onUpdate() {
        if (this._needsUpdate) {        
            this.updateLineGeometry();      
        }

        super.onUpdate();
    }    

    private rebuildLine() {
        if (this.line)
            this.remove(this.line);            

        const points = this.curve.getPoints(this._fidelity);
        this.line = this.createLine(points);
        this.add(this.line);
    }

    private updateLineGeometry() {
        if (!this.line["isLine"]) 
            return this.rebuildLine();

        const points = this.curve.getPoints(this._fidelity);
        const { attributes } = this.line.geometry;

        points.forEach((point, j) => {
            attributes.position.setX(j, point.x);
            attributes.position.setY(j, point.y);
            attributes.position.setZ(j, point.z);
        });  

        attributes.position.needsUpdate = true;
    }

    public set fidelity(fidelity: number) {
        if (!this.line)
            return;

        this.remove(this.line);
        super.fidelity = fidelity;
    }
}