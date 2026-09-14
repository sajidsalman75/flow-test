import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    // Vuetify + Vue Flow push the single JS/CSS bundle past Vite's default
    // 500kb warning threshold even after minification/gzip; this is a
    // known, expected trade-off for a component library that size, not a
    // code-splitting regression to chase down here.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Vitest externalizes node_modules deps to Node's native loader by
    // default, which chokes on the per-component .css files Vuetify's
    // auto-import emits ("Unknown file extension .css"). Inlining it
    // routes those imports through Vite's own CSS handling instead.
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
})
