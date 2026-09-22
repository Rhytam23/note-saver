import React from 'react';
import './index.css';
import * as ReactDOM from 'react-dom/client';
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { SeasonalProvider } from "./contexts/SeasonalContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from "@vercel/analytics/react";
import { RouterProvider } from "./contexts/RouterContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { detectPlatform } from "./services/platform/platformAdapterFactory";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-google-client-id';
const isWeb = detectPlatform() === 'web';

// Offline app shell for the website. The installed apps already ship their files.
if (isWeb && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker not registered:', err));
  });
}

root.render(
  <ErrorBoundary>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <ThemeProvider>
          <SeasonalProvider>
            <RouterProvider>
              <App />
              {isWeb && <Analytics />}
            </RouterProvider>
          </SeasonalProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </ErrorBoundary>
);
