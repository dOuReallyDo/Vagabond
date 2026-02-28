import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'VagabondWidget',
      fileName: (format) => `vagabond-widget.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Ensure to externalize react if you expect the host to provide it.
      // For this MVP, we bundle it to ensure compatibility.
      // external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
