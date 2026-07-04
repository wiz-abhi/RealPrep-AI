import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest libs out of the entry chunk so the landing/login
        // pages don't ship the Azure Speech SDK, charts, and code-editor deps.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'azure-speech': ['microsoft-cognitiveservices-speech-sdk'],
          'charts': ['recharts'],
          'code-editor': ['prismjs', 'react-simple-code-editor'],
        },
      },
    },
  },
})
