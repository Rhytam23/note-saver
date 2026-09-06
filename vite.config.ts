import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    base: './',
    clearScreen: false,
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
    },
    envPrefix: ['VITE_', 'TAURI_'],
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'framer-motion'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'tiptap-vendor': [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/extension-task-list',
              '@tiptap/extension-task-item',
            ],
          },
        },
      },
    },
  };
});
