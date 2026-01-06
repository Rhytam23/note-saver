# NoteNirman: Crafted Thoughts, Colored by Life 🪔

A beautiful, seasonal, and intelligent note-taking application designed to capture your thoughts with style.

![NoteNirman Hero](public/features/landing_hero.png)

## 🌟 Key Features

*   **Seasonal Themes**: Automatic and manual themes (Diwali, Holi, Monsoon, Winter, etc.) that change the app's look and feel.
*   **Google & Email Auth**: Secure authentication powered by Supabase.
*   **Voice Dictation**: Capture thoughts instantly with browser-native speech-to-text.
*   **Notion-Style Covers**: Add beautiful gradients or solid colors to your notes.
*   **AI Assistant**: Powered by Gemini, get summaries, proofreading, and creative ideas.
*   **Rich Organization**: Tags, Pins, Search, and Priority filtering.
*   **Export**: Export your notes to PDF for safekeeping.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Supabase Account
*   Google Cloud Console Project (for OAuth)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/notenirman.git
    cd notenirman
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory. **DO NOT commit this file.**
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

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS, Framer Motion
*   **Backend / Auth**: Supabase
*   **AI**: Google Gemini API

## 🔒 Security

*   **Authentication**: Managed by Supabase (supports multiple providers).
*   **RLS (Row Level Security)**: All database tables are secured so users can only access their own data.
*   **Environment Variables**: All sensitive keys are kept in `.env` files and ignored from version control.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## 📜 License

This project is licensed under the PolyForm Noncommercial License 1.0.0.
