import React, { FunctionComponent, PropsWithChildren } from 'react';
import { IsInteractive } from '../renderer/RenderedEntity';
import { Render } from '../renderer/Render';
import { Scene } from '../renderer/Scene';
import { EventSource } from '../utils/EventSource';
import { ViewEvent, ViewEvents } from '../renderer/View';

interface Props extends PropsWithChildren {
    render: () => Render<Scene>,
    onSelect?: (entity: IsInteractive | undefined) => void
}

interface LoadingState {
    percent: number, 
    feedback?: string,
    finished: boolean,
}

interface IRenderContext {
    loading: LoadingState,
    stopTracking: (id: number) => void,
    tracked: Record<number, ViewEvents>
}

const initialContext: IRenderContext = {
    loading: {
        percent: 0,
        feedback: "",
        finished: false
    },
    stopTracking: (id: number) => {},
    tracked: {}
}

const renders: Record<number, Render<Scene>> = {

}

export const RenderContext = React.createContext<IRenderContext>(initialContext)

const Canvas : FunctionComponent<Props> = props => {
    const canvasEl = React.useRef<HTMLDivElement>(null);
    const [ loading, setLoading] = React.useState<LoadingState>(initialContext.loading);
    const [ tracked, setTracked ] = React.useState<Record<string, EventSource<ViewEvent>>>({})
    const [ id ] = React.useState(Date.now())

    // Bind canvas to render instance 
    React.useEffect(() => {       
        if (!canvasEl.current || !props.render)
            return;        

        renders[id] = props.render();
        renders[id].bind(canvasEl.current);
        renders[id].start();
        renders[id].loader.onLoad((percent, message) => {
            setLoading({    
                ...loading,        
                percent: percent,
                finished: percent >= 100,
                feedback: message
            });
        })

        return () => {
            if (canvasEl.current)
                renders[id].unbind(canvasEl.current)
                
            renders[id].stop();
            canvasEl.current?.removeChild(renders[id].canvas)
            delete renders[id]
        }
    }, [ props.render ]);

    if (!props.render)
        return (<div id={"render-view-" + id}/>);

    const handleClick = () => {
        const selected = renders[id].getSelectedEntity();

        props.onSelect?.(selected);
        renders[id].deselect();

        if (selected) {
            let eventSource = renders[id].track(selected);

            if (!eventSource)
                return;

            tracked[eventSource.entity.id] = eventSource.events

            setTracked({ ...tracked })
        }
    }          

    const stopTracking = (entity: number) => {
        renders[id].stopTracking(entity)

        if (!tracked[entity])
            return;

        delete tracked[entity]

        setTracked({ ...tracked })
    }

    const handleMouseMove = () => {
        renders[id].panCamera(false);
    }

    return (
        <RenderContext.Provider value={{loading, tracked, stopTracking }}>
            <section style={{ display: "block", overflow: "hidden"}}>  
                { props.children }
                <div id={"render-view-" + id} ref={canvasEl}
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}>
                </div>
            </section>
        </RenderContext.Provider>
    );
}

const MemoizedViewer = React.memo(Canvas);

export { MemoizedViewer as Canvas };
