declare module 'framer-motion';
declare module 'uuid';
declare module '@google/genai';
declare module 'react-quill';
declare module 'jspdf';
declare module 'html2canvas';

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

