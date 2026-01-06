import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './contexts/AuthContext.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';
import { useNotes } from './hooks/useNotes.ts';
import type { Note, Tag, User, NotePriority, PriorityFilter } from './types.ts';
import { useSeason } from './contexts/SeasonalContext.tsx';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header.tsx';
import Sidebar from './components/Sidebar.tsx';
import NoteList from './components/NoteList.tsx';
import NoteEditor from './components/NoteEditor.tsx';
import FloatingActionButton from './components/FloatingActionButton.tsx';
import LandingPage from './components/LandingPage.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import ProfileModal from './components/ProfileModal.tsx';
import TutorialModal from './components/TutorialModal.tsx';
import SeasonalAnimations from './components/SeasonalAnimations.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import Footer from './components/Footer.tsx';
import IndependenceDayIntro from './components/IndependenceDayIntro.tsx';
import SummerIntroAnimation from './components/SummerIntroAnimation.tsx';
import WinterIntroAnimation from './components/WinterIntroAnimation.tsx';
import ChristmasIntroAnimation from './components/ChristmasIntroAnimation.tsx';
import MonsoonIntroAnimation from './components/MonsoonIntroAnimation.tsx';
import AutumnIntroAnimation from './components/AutumnIntroAnimation.tsx';
import SpringIntroAnimation from './components/SpringIntroAnimation.tsx';
import DiwaliIntroAnimation from './components/DiwaliIntroAnimation.tsx';
import HoliIntroAnimation from './components/HoliIntroAnimation.tsx';
import PongalIntroAnimation from './components/PongalIntroAnimation.tsx';
import NavratriIntroAnimation from './components/NavratriIntroAnimation.tsx';
import NewYearIntroAnimation from './components/NewYearIntroAnimation.tsx';

const App: React.FC = () => {
  const { user, loading, logout, updateUser, updatePassword } = useAuth() as any;
  const { theme, toggleTheme } = useTheme() as any;
  const { notes, addNote, updateNote, deleteNote, customTags, addOrUpdateCustomTag, deleteCustomTag } = useNotes(user?.id);
  const { theme: seasonalTheme, colors } = useSeason();

  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePriority, setActivePriority] = useState<PriorityFilter>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isTutorialOpen, setTutorialOpen] = useState(false);

  // Intro Animation States
  const [showIndependenceDayIntro, setShowIndependenceDayIntro] = useState(false);
  const [showNavratriBanner, setShowNavratriBanner] = useState(false);
  const [showSummerIntro, setShowSummerIntro] = useState(false);
  const [showWinterIntro, setShowWinterIntro] = useState(false);
  const [showChristmasIntro, setShowChristmasIntro] = useState(false);
  const [showMonsoonIntro, setShowMonsoonIntro] = useState(false);
  const [showAutumnIntro, setShowAutumnIntro] = useState(false);
  const [showSpringIntro, setShowSpringIntro] = useState(false);
  const [showDiwaliIntro, setShowDiwaliIntro] = useState(false);
  const [showHoliIntro, setShowHoliIntro] = useState(false);
  const [showPongalIntro, setShowPongalIntro] = useState(false);
  const [showNavratriIntro, setShowNavratriIntro] = useState(false);
  const [showNewYearIntro, setShowNewYearIntro] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setView('app');
    } else {
      if (view === 'app') {
        setView('landing');
      }
    }
  }, [user, loading, view]);

  useEffect(() => {
    // Reset all flags first
    setShowIndependenceDayIntro(false);
    setShowSummerIntro(false);
    setShowWinterIntro(false);
    setShowChristmasIntro(false);
    setShowMonsoonIntro(false);
    setShowAutumnIntro(false);
    setShowSpringIntro(false);
    setShowDiwaliIntro(false);
    setShowHoliIntro(false);
    setShowPongalIntro(false);
    setShowNavratriIntro(false);
    setShowNewYearIntro(false);
    setShowNavratriBanner(false);

    // Independence Day Intro
    if (seasonalTheme === 'independence_day_in') {
      setShowIndependenceDayIntro(true);
    }

    // Navratri Banner (Legacy check, maybe keep if navratri theme acts differently)
    if (seasonalTheme === 'navratri') {
      // Logic for banner vs intro - let's prioritizing INTRO for 'navratri' theme now
      setShowNavratriIntro(true);
      // Also show legacy banner if needed? Maybe skip banner if full intro exists.
      // Let's keep banner logic separate if user wants both, but for now Intro is key.
    }

    // Season Intros
    if (seasonalTheme === 'summer') setShowSummerIntro(true);
    if (seasonalTheme === 'winter') setShowWinterIntro(true);
    if (seasonalTheme === 'christmas') setShowChristmasIntro(true);
    if (seasonalTheme === 'monsoon') setShowMonsoonIntro(true);
    if (seasonalTheme === 'autumn') setShowAutumnIntro(true);
    if (seasonalTheme === 'spring') setShowSpringIntro(true);
    if (seasonalTheme === 'diwali') setShowDiwaliIntro(true);
    if (seasonalTheme === 'holi') setShowHoliIntro(true);
    if (seasonalTheme === 'pongal') setShowPongalIntro(true);
    if (seasonalTheme === 'new_year') setShowNewYearIntro(true);

  }, [seasonalTheme]);

  // ... (rest of helper functions like allTags, filteredNotes, etc.) ...
  // ... (handlers like handleAddNewNote, etc.) ...

  // (Assuming identical implementation for helper functions and handlers as before)
  // Re-implementing just the changed parts of the component related to state and effect

  // Memoize filtered notes helpers
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tagSet.add(tag));
      }
    });
    customTags.forEach(tag => tagSet.add(tag.name));
    return Array.from(tagSet).sort();
  }, [notes, customTags]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '');
      const term = searchTerm.toLowerCase();

      // Safe check for content
      let contentMatch = false;
      try {
        const plainText = stripHtml(content).toLowerCase();
        contentMatch = plainText.includes(term);
      } catch (e) {
        // Fallback if HTML parsing fails
        contentMatch = content.toLowerCase().includes(term);
      }

      const searchMatch = title.includes(term) || contentMatch;

      const tagMatch = !activeTag || (note.tags && Array.isArray(note.tags) && note.tags.includes(activeTag));
      const priorityMatch = !activePriority || note.priority === activePriority;
      return searchMatch && tagMatch && priorityMatch;
    });
  }, [notes, searchTerm, activeTag, activePriority]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.isPinned).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filteredNotes]);

  const handleSelectNote = (id: string | null) => {
    setSelectedNoteId(id);
  };

  const handleAddNewNote = useCallback(() => {
    let notePriority: NotePriority = 'none';
    if (activeTag) {
      const tagInfo = customTags.find(t => t.name === activeTag);
      if (tagInfo && tagInfo.defaultPriority) {
        notePriority = tagInfo.defaultPriority;
      }
    }

    const newNote: Note = {
      id: uuidv4(),
      title: 'New Note',
      content: '',
      tags: activeTag ? [activeTag] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      priority: notePriority,
    };
    addNote(newNote);
    setSelectedNoteId(newNote.id);
  }, [activeTag, customTags, addNote]);


  const handleSaveNote = (noteToSave: Note) => {
    noteToSave.tags.forEach(tag => {
      if (!allTags.includes(tag)) {
        addOrUpdateCustomTag({ name: tag });
      }
    });

    const existingNote = notes.find(n => n.id === noteToSave.id);
    if (existingNote) {
      updateNote({ ...noteToSave, updatedAt: new Date().toISOString() });
    } else {
      addNote(noteToSave);
    }
    setSelectedNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  const handleTogglePin = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote({ ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() });
    }
  };

  const handleClearFilters = () => {
    setActiveTag(null);
    setActivePriority(null);
    setSearchTerm('');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        if (view === 'app') {
          handleAddNewNote();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [view, handleAddNewNote]);

  const stripHtml = (html: string) => {
    if (!html || typeof html !== 'string') return "";
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    } catch (e) {
      console.warn("Error parsing HTML for search:", e);
      return "";
    }
  };

  if (loading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center ${colors.bgSimple}`}>
        <span className="text-4xl animate-pulse" role="img" aria-label="lamp">🪔</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`flex flex-col min-h-screen font-sans antialiased transition-colors duration-500 ${theme === 'dark' ? 'dark' : ''} ${colors.bgSimple}`}>
        <SpeedInsights />
        <SeasonalAnimations />
        <AnimatePresence>
          {showIndependenceDayIntro && seasonalTheme === 'independence_day_in' && (
            <IndependenceDayIntro onAnimationComplete={() => setShowIndependenceDayIntro(false)} />
          )}
          {showSummerIntro && seasonalTheme === 'summer' && (
            <SummerIntroAnimation onAnimationComplete={() => setShowSummerIntro(false)} />
          )}
          {showWinterIntro && seasonalTheme === 'winter' && (
            <WinterIntroAnimation onAnimationComplete={() => setShowWinterIntro(false)} />
          )}
          {showChristmasIntro && seasonalTheme === 'christmas' && (
            <ChristmasIntroAnimation onAnimationComplete={() => setShowChristmasIntro(false)} />
          )}
          {showMonsoonIntro && seasonalTheme === 'monsoon' && (
            <MonsoonIntroAnimation onAnimationComplete={() => setShowMonsoonIntro(false)} />
          )}
          {showAutumnIntro && seasonalTheme === 'autumn' && (
            <AutumnIntroAnimation onAnimationComplete={() => setShowAutumnIntro(false)} />
          )}
          {showSpringIntro && seasonalTheme === 'spring' && (
            <SpringIntroAnimation onAnimationComplete={() => setShowSpringIntro(false)} />
          )}
          {showDiwaliIntro && seasonalTheme === 'diwali' && (
            <DiwaliIntroAnimation onAnimationComplete={() => setShowDiwaliIntro(false)} />
          )}
          {showHoliIntro && seasonalTheme === 'holi' && (
            <HoliIntroAnimation onAnimationComplete={() => setShowHoliIntro(false)} />
          )}
          {showPongalIntro && seasonalTheme === 'pongal' && (
            <PongalIntroAnimation onAnimationComplete={() => setShowPongalIntro(false)} />
          )}
          {showNavratriIntro && seasonalTheme === 'navratri' && (
            <NavratriIntroAnimation onAnimationComplete={() => setShowNavratriIntro(false)} />
          )}

          {showNewYearIntro && seasonalTheme === 'new_year' && (
            <NewYearIntroAnimation onAnimationComplete={() => setShowNewYearIntro(false)} />
          )}

          {showNavratriBanner && seasonalTheme === 'navratri' && (
            <motion.div
              key="navratri-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] p-3 rounded-full shadow-lg text-sm font-semibold border backdrop-blur-md ${colors.surface} ${colors.border} ${colors.primaryText}`}
            >
              🌼 Celebrating Navaratri — the triumph of light and devotion.
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {view === 'landing' && <LandingPage key="landing" onGetStarted={() => setView('auth')} theme={theme} toggleTheme={toggleTheme} />}
          {view === 'auth' && <AuthScreen key="auth" onBackToHome={() => setView('landing')} />}
        </AnimatePresence>

        {view === 'app' && user && (
          <div className="flex-1 flex w-full relative z-10">
            <Sidebar
              user={user}
              tags={allTags}
              customTags={customTags}
              addOrUpdateCustomTag={addOrUpdateCustomTag}
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              activePriority={activePriority}
              setActivePriority={setActivePriority}
              onClearFilters={handleClearFilters}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              isOpen={isMobileSidebarOpen}
              setIsOpen={setMobileSidebarOpen}
              onProfileClick={() => setProfileModalOpen(true)}
              onAddTag={(tag) => addOrUpdateCustomTag({ name: tag })}
              onDeleteCustomTag={deleteCustomTag}
              onTutorialClick={() => setTutorialOpen(true)}
            />
            <div className="flex-1 flex flex-col min-w-0">
              <Header
                theme={theme}
                toggleTheme={toggleTheme}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onMenuClick={() => setMobileSidebarOpen(true)}
              />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <NoteList
                  pinnedNotes={pinnedNotes}
                  unpinnedNotes={unpinnedNotes}
                  customTags={customTags}
                  activeTag={activeTag}
                  activePriority={activePriority}
                  onSelectNote={handleSelectNote}
                  onDeleteNote={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              </main>
              <Footer />
              <FloatingActionButton onClick={handleAddNewNote} />
              <AnimatePresence>
                {selectedNoteId && (
                  <NoteEditor
                    note={notes.find(n => n.id === selectedNoteId) || null}
                    onSave={handleSaveNote}
                    onClose={() => setSelectedNoteId(null)}
                    allTags={allTags}
                    customTags={customTags}
                  />
                )}
                {isProfileModalOpen && (
                  <ProfileModal
                    user={user}
                    onClose={() => setProfileModalOpen(false)}
                    onLogout={() => {
                      logout();
                      setProfileModalOpen(false);
                    }}
                    onUpdateUser={updateUser}
                    onUpdatePassword={updatePassword}
                  />
                )}
                {isTutorialOpen && (
                  <TutorialModal isOpen={isTutorialOpen} onClose={() => setTutorialOpen(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {view === 'landing' && <Footer />}
      </div>
    </ErrorBoundary>
  );
};

export default App;