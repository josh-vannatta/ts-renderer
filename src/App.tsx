import './App.css'
import { ExampleApp } from './example/ExampleApp'
import { Loader } from './renderer/Loader'
import { AssetRecord } from './utils/AssetRegister'

export const appAssets: AssetRecord = {
    "Atom": {
      location: "/atom.gltf",
      position: { x: 0, y: 0, z: 0},
      color: "rgb(255,255,255)",
      scale: { x: 1.2, y: 1.2, z: 1.2},
      rotation: 0
  }
}

Loader.register(appAssets);

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
