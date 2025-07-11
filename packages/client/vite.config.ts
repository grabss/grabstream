import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['@grabstream/core', /^node:/],
      output: {
        preserveModules: false,
        exports: 'named',
        globals: {
          '@grabstream/core': 'GrabstreamCore'
        }
      }
    },
    sourcemap: true,
    minify: true,
    target: 'es2020',
    reportCompressedSize: false
  }
})
