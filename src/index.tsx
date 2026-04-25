import React from 'react';
import './index.css';
import * as ReactDOM from 'react-dom/client';
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { SeasonalProvider } from "./contexts/SeasonalContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from "@vercel/analytics/react";



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
          <Analytics />
        </SeasonalProvider>
      </ThemeProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
