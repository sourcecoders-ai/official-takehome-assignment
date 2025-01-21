// https://vitejs.dev/config/
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 8080,
      host: true,
      allowedHosts: ['miguels-macbook-pro', 'localhost'],
      proxy: {
        '/api': {
          target: 'http://backend:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'process.env': env
    }
  }
})
