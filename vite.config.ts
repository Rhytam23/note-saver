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
          // Function form: Vite 8 (Rolldown) no longer accepts the object form.
          manualChunks(id: string) {
            const path = id.split('\\').join('/');
            if (!path.includes('/node_modules/')) return undefined;
            const inPkg = (...names: string[]) => names.some(n => path.includes(`/node_modules/${n}/`));
            if (inPkg('react', 'react-dom', 'framer-motion')) return 'react-vendor';
            if (inPkg('@supabase/supabase-js')) return 'supabase-vendor';
            // Equation rendering is only needed once the editor (already a lazy chunk) opens,
            // and it's large enough (fonts + render engine) to deserve its own cacheable chunk.
            if (inPkg('katex')) return 'katex-vendor';
            if (path.includes('/node_modules/@tiptap/') || path.includes('/node_modules/prosemirror-')) return 'tiptap-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
