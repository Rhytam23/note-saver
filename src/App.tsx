import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useNotes } from "./hooks/useNotes";
import type { Note, Tag, User, NotePriority, PriorityFilter } from "./types";
import { useSeason } from "./contexts/SeasonalContext";
import { useRouter } from "./contexts/RouterContext";
import { v4 as uuidv4 } from 'uuid';

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import NoteList from "./components/NoteList";
import NoteEditor from "./components/NoteEditor";
import FloatingActionButton from "./components/FloatingActionButton";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import SeasonalAnimations from "./components/SeasonalAnimations";
import SeasonalLoading from "./components/SeasonalLoading";

// Direct Core Page Imports (Prevents Dynamic Module Import Failures & Production White Screens)
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import FAQ from './components/FAQ';
import NotFound from './components/NotFound';
import AccessDenied from './components/AccessDenied';
import CookiePreferences from './components/CookiePreferences';
import Support from './components/Support';
import PasswordReset from './components/PasswordReset';
import EmailVerification from './components/EmailVerification';
import Maintenance from './components/Maintenance';

// Lazy Load Heavy Modals
const ProfileModal = React.lazy(() => import('./components/ProfileModal'));
const TutorialModal = React.lazy(() => import('./components/TutorialModal'));
const WelcomeIntroAnimation = React.lazy(() => import('./components/WelcomeIntroAnimation'));

// Lazy Load Seasonal Intro Animations
const IndependenceDayIntro = React.lazy(() => import('./components/IndependenceDayIntro'));
const SummerIntroAnimation = React.lazy(() => import('./components/SummerIntroAnimation'));
const WinterIntroAnimation = React.lazy(() => import('./components/WinterIntroAnimation'));
const ChristmasIntroAnimation = React.lazy(() => import('./components/ChristmasIntroAnimation'));
const MonsoonIntroAnimation = React.lazy(() => import('./components/MonsoonIntroAnimation'));
const AutumnIntroAnimation = React.lazy(() => import('./components/AutumnIntroAnimation'));
const SpringIntroAnimation = React.lazy(() => import('./components/SpringIntroAnimation'));
const DiwaliIntroAnimation = React.lazy(() => import('./components/DiwaliIntroAnimation'));
const HoliIntroAnimation = React.lazy(() => import('./components/HoliIntroAnimation'));
const PongalIntroAnimation = React.lazy(() => import('./components/PongalIntroAnimation'));
const NavratriIntroAnimation = React.lazy(() => import('./components/NavratriIntroAnimation'));
const NewYearIntroAnimation = React.lazy(() => import('./components/NewYearIntroAnimation'));

const App: React.FC = () => {
  const { user, loading, logout, updateUser, updatePassword } = useAuth() as any;
  const { theme, toggleTheme } = useTheme() as any;
  const { notes, addNote, updateNote, deleteNote, customTags, addOrUpdateCustomTag, deleteCustomTag } = useNotes(user?.id);
  const { theme: seasonalTheme, colors } = useSeason();
  const { path, pushPath } = useRouter();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePriority, setActivePriority] = useState<PriorityFilter>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isTutorialOpen, setTutorialOpen] = useState(false);

  // Sync profile route with modal
  useEffect(() => {
    if (path === '/profile' && user) {
      setProfileModalOpen(true);
    }
  }, [path, user]);

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

  // Welcome Animation State with notenirman_landing_seen persistence & reduced motion
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    const landingSeen = localStorage.getItem('notenirman_landing_seen') || localStorage.getItem('hasSeenWelcome');
    return !landingSeen;
  });

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem('notenirman_landing_seen', 'true');
    localStorage.setItem('hasSeenWelcome', 'true');
  }, []);

  // Enforce zero animation replay for authenticated users
  useEffect(() => {
    if (user) {
      setShowWelcome(false);
      localStorage.setItem('notenirman_landing_seen', 'true');
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [user]);

  useEffect(() => {
    if (showWelcome) return;

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

    if (seasonalTheme === 'independence_day_in') setShowIndependenceDayIntro(true);
    if (seasonalTheme === 'navratri') setShowNavratriIntro(true);
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
  }, [seasonalTheme, showWelcome]);

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

      let contentMatch = false;
      try {
        const plainText = stripHtml(content).toLowerCase();
        contentMatch = plainText.includes(term);
      } catch (e) {
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

  const handleQuickAccess = useCallback(() => {
    localStorage.setItem('notenirman_landing_seen', 'true');
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);

    if (user) {
      pushPath('/notes');
      handleAddNewNote();
    } else {
      pushPath('/login');
    }
  }, [user, pushPath, handleAddNewNote]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        if (user && ['/', '/dashboard', '/notes', '/profile'].includes(path)) {
          handleAddNewNote();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [path, user, handleAddNewNote]);

  const stripHtml = (html: string) => {
    if (!html || typeof html !== 'string') return "";
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    } catch (e) {
      return "";
    }
  };

  // Define Protected Routes
  const isProtectedRoute = ['/dashboard', '/notes', '/profile'].includes(path);
  const isAppRoute = (path === '/' && user) || (isProtectedRoute && user);

  if (loading) {
    return <SeasonalLoading />;
  }

  const renderContent = () => {
    // Protected route check for unauthenticated users
    if (isProtectedRoute && !user) {
      return <AccessDenied key="403" />;
    }

    // Main App View for Authenticated Users on App Routes
    if (isAppRoute) {
      return (
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
              isSearchVisible={isSearchVisible}
              setIsSearchVisible={setIsSearchVisible}
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
            <Footer variant="simple" />
            <FloatingActionButton onClick={handleAddNewNote} />
            <AnimatePresence>
              {selectedNoteId && (
                <NoteEditor
                  key={selectedNoteId}
                  note={notes.find(n => n.id === selectedNoteId) || null}
                  onSave={handleSaveNote}
                  onClose={() => setSelectedNoteId(null)}
                  allTags={allTags}
                  customTags={customTags}
                />
              )}
              {isProfileModalOpen && (
                <Suspense fallback={null}>
                  <ProfileModal
                    user={user}
                    onClose={() => {
                      setProfileModalOpen(false);
                      if (path === '/profile') pushPath('/dashboard');
                    }}
                    onLogout={() => {
                      logout();
                      setProfileModalOpen(false);
                      pushPath('/login');
                    }}
                    onUpdateUser={updateUser}
                    onUpdatePassword={updatePassword}
                  />
                </Suspense>
              )}
              {isTutorialOpen && (
                <Suspense fallback={null}>
                  <TutorialModal isOpen={isTutorialOpen} onClose={() => setTutorialOpen(false)} />
                </Suspense>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }

    // Specific Route Switch
    switch (path) {
      case '/':
        return (
          <LandingPage
            key="landing"
            onGetStarted={() => pushPath('/login')}
            theme={theme}
            toggleTheme={toggleTheme}
            onQuickAccess={handleQuickAccess}
            setView={(v) => {
              if (v === 'auth') pushPath('/login');
              else if (v === 'privacy') pushPath('/privacy');
              else if (v === 'terms') pushPath('/terms');
              else if (v === 'faq') pushPath('/support');
              else pushPath('/');
            }}
          />
        );

      case '/login':
        return <AuthScreen key="login" mode="login" onBackToHome={() => pushPath('/')} />;

      case '/register':
        return <AuthScreen key="register" mode="register" onBackToHome={() => pushPath('/')} />;

      case '/forgot-password':
        return <AuthScreen key="forgot" mode="forgot-password" onBackToHome={() => pushPath('/login')} />;

      case '/reset-password':
        return <PasswordReset key="reset-password" />;

      case '/verify-email':
        return <EmailVerification key="verify-email" />;

      case '/privacy':
        return <PrivacyPolicy key="privacy" onBack={() => pushPath('/')} />;

      case '/terms':
        return <TermsOfService key="terms" onBack={() => pushPath('/')} />;

      case '/cookies':
        return <CookiePreferences key="cookies" />;

      case '/support':
        return <Support key="support" />;

      case '/403':
        return <AccessDenied key="403" />;

      case '/maintenance':
        return <Maintenance key="maintenance" />;

      case '/404':
        return <NotFound key="404" />;

      default:
        return <NotFound key="404-default" />;
    }
  };

  return (
    <ErrorBoundary>
      <div className={`flex flex-col min-h-screen font-sans antialiased transition-colors duration-500 ${theme === 'dark' ? 'dark' : ''} ${colors.bgSimple}`}>
        <SpeedInsights />
        <SeasonalAnimations />
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {showWelcome && (
              <WelcomeIntroAnimation onAnimationComplete={handleWelcomeComplete} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!showWelcome && showIndependenceDayIntro && seasonalTheme === 'independence_day_in' && (
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
                🌸 Celebrating Navaratri — the triumph of light and devotion.
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>

        {renderContent()}
      </div>
    </ErrorBoundary>
  );
};

export default App;
