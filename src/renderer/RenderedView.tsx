import React, { FunctionComponent, PropsWithChildren } from 'react';
import { IsInteractive } from './RenderedEntity';
import { Render } from './Render';
import { Scene } from './Scene';

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
    loading: LoadingState
}

const initialContext: IRenderContext = {
    loading: {
        percent: 0,
        feedback: "",
        finished: false
    }
}

export const RenderContext = React.createContext<IRenderContext>(initialContext)

const RenderedView : FunctionComponent<Props> = props => {
    const canvasEl = React.useRef<HTMLDivElement>(null);
    const [ context, setContext] = React.useState<IRenderContext>(initialContext);

    React.useEffect(() => {
        return () => props.render.pause();
    }, [])

    // Bind canvas to render instance 
    React.useEffect(() => {       
        if (!canvasEl.current || !props.render)
            return;        

        props.render.bind(canvasEl.current);
        props.render.start();
        props.render.loader.onLoad((percent, message) => {
            setContext({        
                loading: {
                    ...context.loading,        
                    percent: percent,
                    finished: percent >= 100,
                    feedback: message
                }
            });
        })
    }, [ props.render ]);

    if (!props.render)
        return (<div id="render-view" />);

    const handleClick = () => {
        const selected = props.render.getSelectedEntity();

        props.onSelect?.(selected);
        props.render.deselect();
    }          

    const handleMouseMove = () => {
        props.render.panCamera(false);
    }

    return (
        <RenderContext.Provider value={context}>
            <section className="render-view-container">  
                { props.children }
                <div id="render-view" ref={canvasEl}
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}>
                </div>
            </section>
        </RenderContext.Provider>
    );
}

const MemoizedViewer = React.memo(RenderedView);

export { MemoizedViewer as RenderedView };
