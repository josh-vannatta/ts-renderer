import { Scene } from "../renderer/Scene";
import { Background } from "./entities/Background";
import { Line } from "./entities/Line";
import { Point } from "./entities/Point";

export class ExampleScene extends Scene {
    background: Background
    lines: Line[] = [];
    points: Point[] = [];

    protected onClear(): void {
        this.lines = []
        this.points = []
    }
}