import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://finance-app-five-navy.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      // yahoo-finance2 is consumed exclusively by the Vercel serverless
      // function under frontend/api/. Marking it external prevents Vite from
      // pulling it into the client bundle while keeping it resolvable for
      // the serverless deployment, which uses the same frontend/package.json.
      external: ['yahoo-finance2'],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dates': ['date-fns'],
        },
      },
    },
  },
})
