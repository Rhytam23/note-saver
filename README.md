# NoteNirman: Crafted Thoughts, Colored by Life 🪔

A thoughtfully designed note-taking app with seasonal theming, voice input, and AI-assisted writing.

![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-orange.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vite](https://img.shields.io/badge/Vite-4.0-purple)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-green)

<div align="center">
  <img src="wintertheme" alt="NoteNirman Landing Page" width="100%">
  <br/>
  <br/>
  <img src="landing_page" alt="Winter Seasonal Theme" width="60%">
</div>

---

## 📑 Table of Contents
- [Why I built this](#why-i-built-this)
- [Features](#-features)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Tech Stack](#-tech-stack)
- [Contributing](#-contributing)
- [Security](#-security)

---

## Why I built this
I built NoteNirman to explore how software can feel seasonal and personal, not just functional. I wanted a space where the interface adapts to the world outside—celebrating festivals like Diwali or the calm of Monsoon—while still being a powerful tool for capturing ideas.

---

## 🌟 Features

### Core Features
*   **Seasonal Themes**: The app adapts its visual theme (colors, backgrounds, animations) based on the season or festival. Themes can be switched manually, with an optional automatic selection based on the calendar.
*   **Voice Dictation**: Browser-native speech-to-text integration for quick note capture (supports English).
*   **AI Assistant**: Uses Google Gemini to summarize long notes, proofread text, and offer creative suggestions on demand. (Client-side integration; no background data processing).

### Additional Features
*   **Animated Auth**: "Unfolding" login animation with secure Google & Email auth.
*   **Notion-Style Covers**: Customizable headers with gradients or solid colors.
*   **Organization**: Tags, Pins, Search, and Priority filtering.
*   **Export**: Simple PDF export for offline backup.
*   **Analytics**: Basic traffic insights via Vercel Analytics.

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+)
*   **Supabase Account** (Auth & Database)
*   **Google Cloud Console Project** (OAuth Client ID)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Rhytam23/notenirman.git
    cd notenirman
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory. **DO NOT commit this file.**
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GOOGLE_CLIENT_ID=your_google_client_id
    VITE_GEMINI_API_KEY=your_gemini_api_key
    ```

4.  **Run Locally:**
    ```bash
    npm run dev
    ```

> **Troubleshooting Tip:** If Google Sign-In fails locally (redirects to error or nothing happens), double-check that `http://localhost:5173` is added to your **Authorized Redirect URIs** in the Google Cloud Console.

### 🗄️ Database Setup (Supabase)

To run the app, you need to create the `notes` table in your Supabase SQL Editor:

```sql
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  content text,
  tags text[],
  is_pinned boolean default false,
  priority text default 'low', // 'high', 'medium', 'low', 'none'
  cover_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.notes enable row level security;

-- Create Policy: Users can only see their own notes
create policy "Users can crud their own notes"
on public.notes for all
using (auth.uid() = user_id);
```

---

## 🛠️ Tech Stack

*   **React + Vite**: Chosen for fast development iteration and performance.
*   **Supabase**: Handles Authentication and Database (PostgreSQL with RLS) so we don't need a custom backend.
*   **Tailwind CSS**: For rapid, utility-first styling.
*   **Framer Motion**: Used sparingly for key interactions (like the login unfold and welcome animations).
*   **Google Gemini API**: Direct API calls accessing keys via environment variables.

---

## 📂 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/            # Global state (Auth, Theme, Season)
├── hooks/               # Encapsulated logic (useAuth, useNotes)
├── services/            # API clients (Supabase)
└── App.tsx              # Main routing and layout
```

> *Note: Some component structures are evolving. You might find some logic in `App.tsx` that is slowly being refactored into custom hooks.*

---

## 🤝 Contributing
This is primarily a personal portfolio project, but suggestions and issues are welcome! If you find a bug or have an idea, feel free to open an issue or a PR.

---

## 🔒 Security
*   **Authentication**: Handled entirely by Supabase.
*   **Data Access**: We use Row Level Security (RLS) policies in Postgres. This ensures users can only access their own data.
*   **Keys**: API keys are stored in environment variables.

## 📜 License
MIT License.
