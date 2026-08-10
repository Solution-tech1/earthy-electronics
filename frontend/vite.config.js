import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0 / IPv4 & IPv6)
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
