import './App.css'
import { ExampleApp } from './example/ExampleApp'
import { Loader } from './renderer/Loader'
import { AssetRecord } from './utils/AssetRegister'

const assets: AssetRecord = {
    "Atom": {
      location: "/atom.gltf",
      name: "Atom",
      position: { x: 0, y: 0, z: 0},
      color: "rgb(0,0,0)",
      scale: { x: 1, y: 1, z: 1},
      rotation: 90
  }
}

// Loader.register(assets);

const containerStyle = {
  width: "calc(50% - 32px)", 
  height: "100%",
  border: "1px solid #3ab8c3",
  margin: 16
}

function App() {
  return (
    <div style={{ display: "flex"}}>
      <div style={containerStyle}>
        <ExampleApp />
      </div>
      <div style={containerStyle}>
        <ExampleApp />        
      </div>
    </div>
  )
}

export default App
