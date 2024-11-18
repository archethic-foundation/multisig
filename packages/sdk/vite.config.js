import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({
    rollupTypes: true
  })],
  build: {
    minify: false,
    lib: {
      name: 'index',
      entry: path.resolve(__dirname, 'lib/main.ts'),
      fileName: (format, name) => `${name}.${format}.js`
    }
  }
})