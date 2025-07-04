import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'GrabstreamClient',
      fileName: 'index'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
})
