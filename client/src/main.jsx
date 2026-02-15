import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './index.css'  // <--- MAKE SURE THIS LINE EXISTS!
// 🛑 ADD THIS LINE TO FIX THE BROKEN UI:
import "@excalidraw/excalidraw/index.css";
createRoot(document.getElementById('root')).render(
  
    <App />
 
)
