import { Emission } from '../../connections/Emission';
import { Controller } from '../../renderer/Controller';
import { VectorUtils } from '../../utils/VectorUtils';
import { PointData } from '../ExampleApp';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';
import { Line } from '../entities/Line';
import { Point } from '../entities/Point';

export class ExampleController extends Controller {
    constructor(
        private _data: PointData[],
        private _scene: ExampleScene) 
    { super(); }

    public setup() { }

    public onInit() { 
        this._scene.background = new Background(BackgroundSize.Moderate, 10);

        this._data.forEach(data => {
            const point = new Point(data);

            point.position.copy(VectorUtils.random(20));
            this._scene.points.push(point);
        })

        this._scene.points.forEach(point => {
            point.data.connected.forEach(el => {
                const line = new Line([  point, this._scene.points[el] ])

                this._scene.lines.push(line);
            })
        })

        this._scene.addEntities(
            this._scene.background, 
            ...this._scene.points, 
            ...this._scene.lines
        );
    }

    protected onUpdate(): void {
        this._scene.lines.forEach(line => 
            line.emit(new Emission(new Atom(), {
                source: this._scene.points[0],
                speed: .2,
                margin: 5,
                instanceCount: 20
            })
        ))
    }
}
