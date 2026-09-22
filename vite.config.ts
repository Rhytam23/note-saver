import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

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
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
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
              '@tiptap/extension-table',
              '@tiptap/extension-mathematics',
            ],
            // Equation rendering is only needed once the editor (already a lazy chunk) opens,
            // and it's large enough (fonts + render engine) to deserve its own cacheable chunk.
            'katex-vendor': ['katex'],
          },
        },
      },
    },
  };
});
