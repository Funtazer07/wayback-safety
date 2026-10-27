import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// SCRUM-62's isolated prototype does not require Supabase, maps, location or a service worker.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'reminder-preview-dist',
    rolldownOptions: { input: 'walk-reminder-preview.html' },
  },
})
