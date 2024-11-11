
import React from 'react';
import './App.css';
import { GLCompute } from './examples/gl_renderable/GLCompute';
import { RotatingTetrahedron } from './examples/gl_renderable/RotatingTetrahedron';
import { GLContext } from './glsl/GLContext';
import GLCanvas from './react/GLCanvas';
import { Loader } from './renderer/Loader';

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
        const contextOptions = {
            width: 15,
            height: 1,
            offscreen: true,
            extensions: ["EXT_color_buffer_float"]
        };
        const context = new GLContext(contextOptions);    
        const vertexShaderSource = `#version 300 es
        precision highp float;
        in vec3 a_position;
        void main() {
            gl_Position = vec4(a_position, 1.0);
        }`;
    
        const fragmentShaderSource = `#version 300 es
        precision highp float;
        uniform sampler2D u_textures[4];
        uniform float u_time;
        layout(location = 0) out vec4 fragColor0;
        layout(location = 1) out vec4 fragColor1;
        layout(location = 2) out vec4 fragColor2;
        layout(location = 3) out vec4 fragColor3;
        void main() {
            vec2 uv = gl_FragCoord.xy / vec2(${context.width},${context.height});
            fragColor0 = texture(u_textures[0], uv) + u_time;
            fragColor1 = texture(u_textures[1], uv) + u_time;
            fragColor2 = texture(u_textures[2], uv) + u_time;
            fragColor3 = texture(u_textures[3], uv) + u_time;
        }`;
    
        const initialData = new Float32Array(new Array(200).fill(0));
        const compute = new GLCompute(context);

        for (let i = 0; i < initialData.length; i++) {
            initialData[i] = i;
        }
    
        compute.setup({
            data: initialData,
            fragment: fragmentShaderSource,
            vertex: vertexShaderSource
        }); 
    
        // Render loop
        for (let time = 1; time <= 5; time++) {
            compute.render(time);
    
            const outputData = compute.readData();
            
            console.log(`Output at time ${time}:`, outputData);
        }
    
        compute.dispose();
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
