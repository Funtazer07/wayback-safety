import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url))

// These substitutions belong only to the standalone preview. The normal app keeps its own config.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: './useLocationUpdates.ts',
        replacement: path('./src/features/walk/preview/PreviewLocation.ts'),
      },
      { find: './useNow.ts', replacement: path('./src/features/walk/preview/PreviewClock.ts') },
      {
        find: '../map/CityMap.tsx',
        replacement: path('./src/features/walk/preview/PreviewCityMap.tsx'),
      },
    ],
  },
  build: {
    outDir: 'preview-dist',
    rolldownOptions: { input: path('./check-in-preview.html') },
  },
})
