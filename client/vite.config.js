import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), // <--- Solves "events" and "util" error
  ],
  define: {
    // ✅ Merge both fixes here:
    global: 'window',          // Solves "global is not defined"
    "process.env": {},         // Solves Excalidraw crash
  },
})