
import './App.css';
import React from 'react';
import { Loader } from './renderer/Loader';
import { GLContext } from './glsl/GLContext';
import { GLCompute } from './examples/gl_renderable/GLCompute';
import GLCanvas from './react/GLCanvas';
import { RotatingTetrahedron } from './examples/gl_renderable/RotatingTetrahedron';

export enum Assets {
    Robot = "Robot",
    Atom = "Atom",
}

Loader.load({
   [Assets.Robot]: {
        location: "/robot.glb",
        scale: { x: 10, y: 10, z: 10},
    },
    [Assets.Atom]: {
      location: "/atom.gltf",
      position: { x: 0, y: 0, z: 0},
      color: "rgb(255,255,255)",
      scale: { x: 1.2, y: 1.2, z: 1.2},
      rotation: 0
  }
});

const containerStyle = {
    width: "800px", 
    height: "600px",
    border: "1px solid #3ab8c3",
    margin: 16
}

function App() {
    React.useEffect(() => {
        const data = new Float32Array(new Array(5 * 4).fill(2));
        const glContext = new GLContext({
            width: 5,
            height: 1,
            offscreen: true,
            extensions: ["EXT_color_buffer_float", "EXT_float_blend"]
        });
        const compute = new GLCompute(data);

        compute.initialize(glContext);
        compute.render(1);
        compute.render(2);
        console.log(compute.readData())
    }, [])

    return (
        <div style={{ display: "flex"}}>
            <div style={containerStyle}>
                <GLCanvas renderables={[
                    new RotatingTetrahedron(),
                    // new PointsGrid(),
                ]}/>
            </div>
        </div>
    )
}

export default App
