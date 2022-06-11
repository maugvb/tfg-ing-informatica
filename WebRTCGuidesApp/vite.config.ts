import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const build = {
  outDir: 'public'
  //minify: false // boolean | 'terser' | 'esbuild'
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ react() ],
  build,
  server: {
    watch: {
      usePolling: true
    },
    host: true,
    proxy: {
      'https://localhost:3000': 'https://localhost:3000'
    },
    https: true,
    port: 3000
  }
})
