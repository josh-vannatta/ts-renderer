import React, { FC } from "react";
import { RenderedView } from "../renderer/RenderedView";
import { ExampleRender } from "./ExampleRender";

interface Props {

}

export const ExampleApp: FC<Props> = props => {
    const [ render, setRender ] = React.useState<ExampleRender | undefined>();

    React.useEffect(() => {
        setRender(new ExampleRender());
    }, [ ]);
    
    if (!render)
        return <></>

    return (
        <RenderedView render={render}>
        </RenderedView>
    );
}