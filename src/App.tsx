
import React from 'react';
import './App.css';
import { GLCompute } from './examples/gl_renderable/GLCompute';
import { RotatingTetrahedron } from './examples/gl_renderable/RotatingTetrahedron';
import { GLContext } from './glsl/GLContext';
import GLCanvas from './react/GLCanvas';
import { Loader } from './renderer/Loader';
import { GLBuilder } from './glsl/GLSchema';
import { GLTextureBuffer } from './glsl/GLTextureBuffer';
import { ShaderType } from './glsl/GLShader';
import { GLType } from './glsl/GLProgram';

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
        const context = new GLContext({
            width: 5,
            height: 1,
            offscreen: true,
            extensions: ["EXT_color_buffer_float"]
        });    
        const data = Float32Array.from(Array.from({ length: 150 }, (_, i) => i));
        const textures = GLTextureBuffer.textureCount(context, data.length);
        const vertexShader = GLTextureBuffer.shader(ShaderType.Vertex);    
        const fragmentShader = GLTextureBuffer.shader(ShaderType.Fragment, context, textures)
        
        fragmentShader.addUniform(GLType.Float, "u_time");
        
        for (let i = 0; i < textures; i++) 
            fragmentShader.addMainBody(`fragColor${i} = vec4(u_time);`)
    
        const compute = new GLCompute(context);

        compute.setup({
            data: data,
            fragment: fragmentShader.build(),
            vertex: vertexShader.build()
        }); 
    
        for (let time = 1; time <= 5; time++) {
            compute.render(time);            
            console.log(`Output at time ${time}:`, compute.readData());
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
