import React, { FC } from "react";
import { RenderCanvas } from "../react/RenderCanvas";
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
    constructor (
        public id: number,
        public status: PointStatus,
        public connected: number[] = []
    ) {}
}

export const ExampleApp: FC<Props> = props => {
    const [ points, setPoints ] = React.useState([
        new PointData(0, PointStatus.On, [ 1 ]),
        new PointData(1, PointStatus.Off),
    ])
    const [ render, setRender ] = React.useState(new ExampleRender(points));

    React.useEffect(() => {
        const getStatus = (status: PointStatus) => (
            status == PointStatus.Off ? PointStatus.On : 
            status == PointStatus.Disabled ? PointStatus.On :
            PointStatus.Disabled
        )

        const a = setInterval(() => {
            points[0].status = getStatus(points[0].status);
            points[1].status = getStatus(points[1].status);
            setPoints([ ...points ])
        }, 1000)

        return () => {
            clearInterval(a)
        }
    }, [ ]);
    
    if (!render)
        return <></>

    return (
        <RenderCanvas render={render} onSelect={e => {}}>
            <PinMenu />
        </RenderCanvas>
    );
}