import { Vector3 } from 'three';
import { Emission } from '../../connections/Emission';
import { Camera } from '../../renderer/Camera';
import { Controller } from '../../renderer/Controller';
import { ExampleScene } from '../ExampleScene';
import { Atom } from '../entities/Atom';
import { Background, BackgroundSize } from '../entities/Background';
import { Line } from '../entities/Line';
import { Point } from '../entities/Point';

export class ExampleController extends Controller {
  constructor(
    private _camera: Camera, 
    private _scene: ExampleScene) 
  { super(); }

  public setup() { }

  public onInit() {     
    this._scene.background = new Background(BackgroundSize.Moderate, 10);
    this._scene.points = [ new Point(), new Point() ]
    this._scene.points[0].position.set(-20, 5, 0);
    this._scene.points[1].position.set(20, 0, 0);
    this._scene.line = new Line(this._scene.points);
    this._scene.addEntities(this._scene.background, ...this._scene.points, this._scene.line);
  }

  protected onUpdate(): void {
      this._scene.line.emit(new Emission(new Atom(), {
        source: this._scene.points[0],
        speed: .2,
        margin: 5,
        instanceCount: 20
      }))
  }
}
