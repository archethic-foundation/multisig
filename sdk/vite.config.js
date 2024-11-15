import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({
    rollupTypes: true
  })],
  build: {
    lib: {
      formats: ['es'],
      entry: path.resolve(__dirname, 'lib/main.ts'),
      name: 'ae-multisig',
      fileName: (format) => `ae-multisig.${format}.js`
    }
  }
})