import { Clock, Object3D } from "three";
import { Assets } from "../../App";
import { HasLoadedAssets, LoadedEntity } from "../../renderer/Loader";
import { IsInteractive, RenderedEntity } from "../../renderer/RenderedEntity";
import { PointData } from "../ExampleApp";

export enum RobotActions {
    Wave = "Wave",
    Walk = "Walking",
    Dance = "Dance"
}

export class Robot extends RenderedEntity implements HasLoadedAssets, IsInteractive {
    data: PointData = new PointData()
    robot: LoadedEntity;

    public onCreate(): void {}

    public onUpdate(clock?: Clock): void { }

    onLoad(): void {
        this.robot = this.loader.get(Assets.Robot);
        this.add(this.robot);
        this.animate(this.robot, RobotActions.Walk)
    }

    onSelect(): void {
        this.animate(this.robot, RobotActions.Dance)
    }

    onHover(): void {
    }

    onReset(): void {
        this.animate(this.robot, RobotActions.Walk)
    }
}