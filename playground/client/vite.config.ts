import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sveltekit } from '@sveltejs/kit/vite'
import autoprefixer from 'autoprefixer'
import { defineConfig } from 'vite'

const grabstreamClientPackageJson = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../packages/client/package.json'),
    'utf-8'
  )
)
console.log(grabstreamClientPackageJson.version)

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use 'grabcss/scss/mediaquery' as mediaquery;
          @use '${resolve(__dirname, 'src/styles/variables')}' as variables;
        `
      }
    },
    postcss: {
      plugins: [autoprefixer()]
    }
  },
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  define: {
    __GRABSTREAM_CLIENT_VERSION__: JSON.stringify(
      grabstreamClientPackageJson.version
    )
  }
})
