import { sveltekit } from '@sveltejs/kit/vite'
import autoprefixer from 'autoprefixer'
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: {
      plugins: [autoprefixer()]
    }
  },
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
