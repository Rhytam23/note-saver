import React from 'react';
import './index.css';
import * as ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SeasonalProvider } from './contexts/SeasonalContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <AuthProvider>
      <ThemeProvider>
        <SeasonalProvider>
          <App />
        </SeasonalProvider>
      </ThemeProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
