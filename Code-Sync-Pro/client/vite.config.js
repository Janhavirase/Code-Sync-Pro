import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills' // 👈 Import this

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ⬇️ ADD THIS NEW PLUGIN
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  // Optional: Ensure global is defined (some libraries look for this)
  define: {
    global: 'window',
  },
})