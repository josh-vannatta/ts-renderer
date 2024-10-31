import React, { FC } from "react";
import { Canvas } from "../../react/Canvas";
import { ExampleRender } from "./ExampleRender";
import { PinMenu } from "./menus/PinMenu";

interface Props {
}

export enum PointStatus {
    On = "On",
    Off = "Off",
    Disabled = "Disabled"
}

export class PointData {
    public id: number
    public status: PointStatus = PointStatus.Off;

    constructor (
        public connected: number[] = []
    ) {}

    public update() {
        this.status = 
            this.status == PointStatus.Off ? PointStatus.On : 
            this.status == PointStatus.Disabled ? PointStatus.Off :
            this.status == PointStatus.On ? PointStatus.Disabled :
            PointStatus.On 
    }
}

export const ExampleApp: FC<Props> = props => {

    return (
        <Canvas render={() => new ExampleRender([])} onSelect={e => {}}>
            <PinMenu />
        </Canvas>
    );
}