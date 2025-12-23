import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'map-vendor': ['leaflet', 'react-leaflet', 'leaflet-control-geocoder', 'leaflet.markercluster']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    open: false
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    // This ensures all routes fall back to index.html for client-side routing
    middlewareMode: false,
    strictPort: false
  }
})
