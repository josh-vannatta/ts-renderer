import { Mesh, MeshToonMaterial, TubeGeometry } from "three";
import { Connection, ConnectionEndpoints } from "../../connections/Connection";

export class Line extends Connection {
    constructor(endpoints: ConnectionEndpoints) {
        super(endpoints);

        this.fidelity = 40;
    }

    public createLine() {
        return new Mesh(
            new TubeGeometry(this.curve, this.fidelity, .5, 8),
            new MeshToonMaterial({ color: "rgb(0,100,210)" })
        );       
    }    
z
    protected computeCurve() {
        const curve = Connection.Curves.Cubic(this.endpoints[0], this.endpoints[1]);    

        curve.v2.y = this.endpoints[0].position.y
        curve.v2.x = this.endpoints[1].position.x

        return curve;
    }
}