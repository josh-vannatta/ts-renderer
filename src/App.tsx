import './App.css'
import { RotatingTetrahedron } from './examples/rotatingTriangle/RotatingTetrahedron';
import GLCanvas from './react/GLCanvas';
import { Loader } from './renderer/Loader'

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
    return (
        <div style={{ display: "flex"}}>
            <div style={containerStyle}>
                <GLCanvas renderables={[
                    gl => new RotatingTetrahedron(gl),
                ]}/>
            </div>
        </div>
    )
}

export default App
