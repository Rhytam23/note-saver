// This file manually declares modules that are imported in the code
// but missing from the local environment (because npm install cannot be run).
// This silences TypeScript errors in VS Code.

// React manual declarations removed as @types/react is installed.

// Libraries
declare module 'framer-motion';
declare module 'uuid';
declare module '@google/genai';
declare module 'react-quill';
declare module 'jspdf';
declare module 'html2canvas';

// Vite Environment Variables
interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
