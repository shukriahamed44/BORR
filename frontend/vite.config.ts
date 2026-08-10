import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Product.imageUrl is a root-relative /equipment/<sku>.jpg served by the backend's
    // static folder. In dev that path would hit Vite and 404, so proxy it through.
    proxy: {
      '/equipment': 'http://localhost:3000',
    },
  },
})
