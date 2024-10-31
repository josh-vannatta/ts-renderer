import React, { FunctionComponent } from 'react';
import { RenderContext } from '../../../react/Canvas';
import { Point } from '../entities/Point';
import { Trackable } from '../../../react/Trackable';

interface Props { 
}

export const PinMenu: FunctionComponent<Props> = props => {
    const render = React.useContext(RenderContext);
    const pinStyles = { 
        background: "#444", 
        padding: "4px 12px", 
        border: "1px solid #222", 
        display: 'flex', 
        borderRadius: 4 
    }

    const handleClose = (id) => {
        render.stopTracking(id)
    }

    const Pin = ({  e, id }) => (
        <div style={pinStyles}>
            <div style={{ paddingRight: 8}}> {e.data?.id} {e.data?.status }</div>
            <span onClick={() => handleClose(id)}>X</span>
        </div>
    )

    return (
        <div style={{ position: 'relative' }}>
            {Object.keys(render.tracked).map((id, i) =>
                <Trackable 
                    key={id} 
                    visible
                    entity={render.tracked[id]}
                    render={(e: Point)=> <Pin e={e} id={id} />}
                />
            )}            
        </div>
    );
}

