import React, { FunctionComponent } from 'react';
import { IsInteractive } from '../renderer/RenderedEntity';
import { ViewEvent } from '../renderer/View';
import { EventObserver, EventSource } from '../utils/EventSource';

interface Position {
    x: number,
    y: number
}

class TrackedEntity {
    constructor(
        public entity?: IsInteractive, 
        public position: Position = { x: 0, y: 0 }) 
    {}
}

interface Props { 
    visible?: boolean,
    render: (t: any) => JSX.Element,
    entity: EventSource<ViewEvent>,
}

export const Trackable: FunctionComponent<Props> = props => {
    const ref = React.useRef<any>();
    const [ pin, setPin ] = React.useState<TrackedEntity | undefined>();
    const [ observer ] = React.useState(new EventObserver<ViewEvent>("trackable"))

    React.useEffect(() => {
        if (pin == undefined)
            return;

        if (pin.entity == undefined)
            observer.onUpdate((event) => {
                setPin(new TrackedEntity(event.entity, event.view))
            })
        else 
            observer.onUpdate((event) => {
                if (!ref.current)
                    return;

                ref.current.style.zIndex = 100000 - Math.floor(event.view.z);
                ref.current.style.left = event.view.x + "px";
                ref.current.style.top = event.view.y + "px";
            })

        return () => {observer.onUpdate(() => {})}
    }, [ pin ])
   
    React.useEffect(() => {
        props.entity.addObserver(observer);
        setPin(new TrackedEntity())

        return () => {
            props.entity.removeObserver(observer)
            setPin(undefined)
        }
    }, [ props.entity ])

    if (!pin || !pin.entity || !props.visible)
        return;
    
    return (
        <div ref={ref} style={{ position: "absolute"}}>
            {props.render(pin.entity)}
        </div>
    );
}

