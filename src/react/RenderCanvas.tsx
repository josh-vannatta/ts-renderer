import React, { FunctionComponent, PropsWithChildren } from 'react';
import { IsInteractive } from '../renderer/RenderedEntity';
import { Render } from '../renderer/Render';
import { Scene } from '../renderer/Scene';
import { EventSource } from '../utils/EventSource';
import { ViewEvent, ViewEvents } from '../renderer/View';

interface Props extends PropsWithChildren {
    render: Render<Scene>,
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

export const RenderContext = React.createContext<IRenderContext>(initialContext)

const RenderCanvas : FunctionComponent<Props> = props => {
    const canvasEl = React.useRef<HTMLDivElement>(null);
    const [ loading, setLoading] = React.useState<LoadingState>(initialContext.loading);
    const [ tracked, setTracked ] = React.useState<Record<string, EventSource<ViewEvent>>>({})

    // Bind canvas to render instance 
    React.useEffect(() => {       
        if (!canvasEl.current || !props.render || props.render.isPaused)
            return;        

        props.render.bind(canvasEl.current);
        props.render.start();
        props.render.loader.onLoad((percent, message) => {
            setLoading({    
                ...loading,        
                percent: percent,
                finished: percent >= 100,
                feedback: message
            });
        })

        return () => {
            props.render.stop();
            canvasEl.current?.removeChild(props.render.canvas)
        }
    }, [ props.render ]);

    if (!props.render)
        return (<div id="render-view" />);

    const handleClick = () => {
        const selected = props.render.getSelectedEntity();

        props.onSelect?.(selected);
        props.render.deselect();

        if (selected) {
            let eventSource = props.render.track(selected);

            if (!eventSource)
                return;

            tracked[eventSource.entity.id] = eventSource.events

            setTracked({ ...tracked })
        }
    }          

    const stopTracking = (id: number) => {
        props.render.stopTracking(id)

        if (!tracked[id])
            return;

        delete tracked[id]

        setTracked({ ...tracked })
    }

    const handleMouseMove = () => {
        props.render.panCamera(false);
    }

    return (
        <RenderContext.Provider value={{loading, tracked, stopTracking }}>
            <section style={{ display: "block", overflow: "hidden"}}>  
                { props.children }
                <div id="render-view" ref={canvasEl}
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}>
                </div>
            </section>
        </RenderContext.Provider>
    );
}

const MemoizedViewer = React.memo(RenderCanvas);

export { MemoizedViewer as RenderCanvas };
