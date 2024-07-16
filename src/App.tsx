import './App.css'
import { ExampleApp } from './example/ExampleApp'

function App() {
  return (
    <div style={{ display: "flex"}}>
      <div style={{ width: "50%", height: "100%"}}>
        <ExampleApp />
      </div>
      <div style={{ width: "50%", height: "100%"}}>
        <ExampleApp />        
      </div>
    </div>
  )
}

export default App
