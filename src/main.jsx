import React from 'react'
import ReactDOM from 'react-dom/client'
import * as ProctorModule from './proctor/index.js'
import './proctor/proctor.css'

const Proctor = ProctorModule.default || ProctorModule.ProctorCompactionTest

function App() {
  if (!Proctor) {
    return <div style={{padding: 24, fontFamily: 'Arial'}}>Proctor module export not found. Check src/proctor/index.js.</div>
  }
  return <Proctor />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
