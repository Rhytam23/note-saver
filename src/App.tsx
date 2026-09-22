import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useNotes } from "./hooks/useNotes";
import type { Note, NotePriority, PriorityFilter } from "./types";
import { useSeason } from "./contexts/SeasonalContext";
import { useRouter } from "./contexts/RouterContext";
import { v4 as uuidv4 } from 'uuid';

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import NoteList from "./components/NoteList";
import { lazyWithRetry } from "./utils/lazyWithRetry";
const NoteEditor = lazyWithRetry(() => import("./components/NoteEditor"));
import FloatingActionButton from "./components/FloatingActionButton";
import TemplatePicker from "./components/TemplatePicker";
import TrashModal from "./components/TrashModal";
import FlashcardsModal from "./components/FlashcardsModal";
import RemindersModal from "./components/RemindersModal";
import { syncRemindersForUser } from "./services/reminderEngine";
import type { NoteTemplate } from "./services/noteTemplates";
import { buildSharedNote } from "./services/sharedContent";
import PassphraseModal from "./components/PassphraseModal";
import NotebooksModal from "./components/NotebooksModal";
import LinkGraphModal from "./components/LinkGraphModal";
import { isNoteLocked, lockNoteContent, unlockNoteContent } from "./services/noteLock";
import SyncStatusIndicator from "./components/SyncStatusIndicator";
import ErrorBoundary from "./components/ErrorBoundary";
import Footer from "./components/Footer";
import SeasonalAnimations from "./components/SeasonalAnimations";
import SeasonalLoading from "./components/SeasonalLoading";

import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import NotFound from './components/NotFound';
import AccessDenied from './components/AccessDenied';
import CookiePreferences from './components/CookiePreferences';
import Support from './components/Support';
import PasswordReset from './components/PasswordReset';
import EmailVerification from './components/EmailVerification';
import Maintenance from './components/Maintenance';
import { checkForUpdates, type UpdateInfo } from './services/updateService';
import UpdateModal from './components/UpdateModal';
import { detectPlatform } from './services/platform/platformAdapterFactory';

const ProfileModal = lazyWithRetry(() => import('./components/ProfileModal'));
const TutorialModal = lazyWithRetry(() => import('./components/TutorialModal'));
const WelcomeIntroAnimation = lazyWithRetry(() => import('./components/WelcomeIntroAnimation'));

const IndependenceDayIntro = lazyWithRetry(() => import('./components/IndependenceDayIntro'));
const SummerIntroAnimation = lazyWithRetry(() => import('./components/SummerIntroAnimation'));
const WinterIntroAnimation = lazyWithRetry(() => import('./components/WinterIntroAnimation'));
const ChristmasIntroAnimation = lazyWithRetry(() => import('./components/ChristmasIntroAnimation'));
const MonsoonIntroAnimation = lazyWithRetry(() => import('./components/MonsoonIntroAnimation'));
const AutumnIntroAnimation = lazyWithRetry(() => import('./components/AutumnIntroAnimation'));
const SpringIntroAnimation = lazyWithRetry(() => import('./components/SpringIntroAnimation'));
const DiwaliIntroAnimation = lazyWithRetry(() => import('./components/DiwaliIntroAnimation'));
const HoliIntroAnimation = lazyWithRetry(() => import('./components/HoliIntroAnimation'));
const PongalIntroAnimation = lazyWithRetry(() => import('./components/PongalIntroAnimation'));
const NavratriIntroAnimation = lazyWithRetry(() => import('./components/NavratriIntroAnimation'));
const NewYearIntroAnimation = lazyWithRetry(() => import('./components/NewYearIntroAnimation'));

let appSessionIntroEvaluated = false;

const App: React.FC = () => {
  const { user, loading, logout, updateUser, updatePassword } = useAuth() as any;
  const { theme, toggleTheme } = useTheme() as any;
  const { notes, addNote, updateNote, deleteNote, customTags, addOrUpdateCustomTag, deleteCustomTag, syncStatus, pendingCount, conflicts, resolveConflict } = useNotes(user?.id);
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
  const [isTemplatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [isTrashOpen, setTrashOpen] = useState(false);
  const [isFlashcardsOpen, setFlashcardsOpen] = useState(false);
  const [isRemindersOpen, setRemindersOpen] = useState(false);
  const [isNotebooksOpen, setNotebooksOpen] = useState(false);
  const [isGraphOpen, setGraphOpen] = useState(false);

  // Passphrase-locked notes. Decrypted text lives only here, in memory, for this tab session —
  // it is never written back to `notes` or to storage. Re-locking a note re-encrypts before save.
  const [unlockedNotes, setUnlockedNotes] = useState<Record<string, { plain: string; passphrase: string }>>({});
  const [viewLockGate, setViewLockGate] = useState<{ noteId: string } | null>(null);
  const [createLockFor, setCreateLockFor] = useState<Note | null>(null);
  const [removeLockFor, setRemoveLockFor] = useState<Note | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) setUnlockedNotes({});
  }, [user]);
  const [isTutorialOpen, setTutorialOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (path === '/profile' && user) {
      setProfileModalOpen(true);
    }
  }, [path, user]);

  useEffect(() => {
    let isMounted = true;
    checkForUpdates().then(info => {
      if (isMounted && info && info.hasUpdate) {
        setUpdateInfo(info);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Reminders only fire while the app is open (see reminderEngine.ts); keep them scheduled
  // for whatever is currently due, and re-check whenever the app regains focus.
  useEffect(() => {
    if (!user) return;
    void syncRemindersForUser(user.id);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncRemindersForUser(user.id);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

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

  const [showWelcome, setShowWelcome] = useState(false);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notenirman_landing_seen', 'true');
      localStorage.setItem('hasSeenWelcome', 'true');
      sessionStorage.setItem('notenirman_session_intro_seen', 'true');
    }
  }, []);

  useEffect(() => {
    // 1. Wait until authentication loading state resolves
    if (loading) return;

    // 2. If intro state was already evaluated in this runtime session, skip
    if (appSessionIntroEvaluated) {
      setShowWelcome(false);
      return;
    }

    appSessionIntroEvaluated = true;

    // 3. Determine if user should see the first-visit intro
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const landingSeen = typeof window !== 'undefined' && (
      localStorage.getItem('notenirman_landing_seen') === 'true' ||
      localStorage.getItem('hasSeenWelcome') === 'true' ||
      sessionStorage.getItem('notenirman_session_intro_seen') === 'true'
    );

    // Skip intro if user is authenticated, already seen, reduced motion enabled, or accessing non-root entry path
    if (user || prefersReducedMotion || landingSeen || path !== '/') {
      setShowWelcome(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('notenirman_landing_seen', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        sessionStorage.setItem('notenirman_session_intro_seen', 'true');
      }
    } else {
      // Show intro ONCE for new unauthenticated user entering via root '/'
      setShowWelcome(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('notenirman_landing_seen', 'true');
        localStorage.setItem('hasSeenWelcome', 'true');
        sessionStorage.setItem('notenirman_session_intro_seen', 'true');
      }
    }
  }, [loading, user, path]);

  useEffect(() => {
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

    // Intro animations are for first-visit unauthenticated users ONLY.
    // Authenticated users and returning visitors must NEVER see seasonal intro screens.
    const landingSeen = typeof window !== 'undefined' && (
      localStorage.getItem('notenirman_landing_seen') === 'true' ||
      localStorage.getItem('hasSeenWelcome') === 'true' ||
      sessionStorage.getItem('notenirman_session_intro_seen') === 'true'
    );

    if (showWelcome || user || appSessionIntroEvaluated || landingSeen) {
      return;
    }

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
  }, [seasonalTheme, showWelcome, user]);

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
      } catch {
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

  const openNoteById = (id: string | null) => {
    setSelectedNoteId(id);
  };

  const handleSelectNote = (id: string | null) => {
    if (!id) {
      openNoteById(null);
      return;
    }
    const note = notes.find(n => n.id === id);
    if (note && isNoteLocked(note) && !unlockedNotes[id]) {
      setLockError(null);
      setViewLockGate({ noteId: id });
      return;
    }
    openNoteById(id);
  };

  const handleToggleLock = (note: Note) => {
    setLockError(null);
    if (isNoteLocked(note)) {
      setRemoveLockFor(note);
    } else {
      setCreateLockFor(note);
    }
  };

  const handleSaveFromEditor = (noteToSave: Note) => {
    const session = unlockedNotes[noteToSave.id];
    if (!session) {
      handleSaveNote(noteToSave);
      return;
    }
    // The editor is working with decrypted text; re-encrypt before it ever reaches storage or sync.
    void lockNoteContent(noteToSave.content, session.passphrase).then(locked => {
      handleSaveNote({ ...noteToSave, content: locked });
      setUnlockedNotes(prev => ({ ...prev, [noteToSave.id]: { ...prev[noteToSave.id], plain: noteToSave.content } }));
    });
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

  const handleCreateLinkedNote = useCallback((title: string) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      title,
      content: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      priority: 'none',
    };
    addNote(newNote);
    setSelectedNoteId(newNote.id);
  }, [addNote]);

  // "Share to NoteNirman" from another app opens the site with the shared content in the URL.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const draft = buildSharedNote(window.location.search);
    if (!draft) return;

    const now = new Date().toISOString();
    const sharedNote: Note = {
      id: uuidv4(),
      title: draft.title,
      content: draft.content,
      tags: [],
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      priority: 'none',
    };
    addNote(sharedNote);
    setSelectedNoteId(sharedNote.id);
    window.history.replaceState({}, '', window.location.pathname);
  }, [user, addNote]);

  const handleAddFromTemplate = useCallback((template: NoteTemplate) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      title: template.title,
      content: template.content,
      tags: template.tags,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      priority: 'none',
    };
    addNote(newNote);
    setSelectedNoteId(newNote.id);
    setTemplatePickerOpen(false);
  }, [addNote]);

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

  const handleLockCreateSubmit = (passphrase: string) => {
    if (!createLockFor) return;
    const note = createLockFor;
    void lockNoteContent(note.content, passphrase).then(locked => {
      handleSaveNote({ ...note, content: locked });
      setUnlockedNotes(prev => {
        const next = { ...prev };
        delete next[note.id];
        return next;
      });
      setCreateLockFor(null);
    });
  };

  const handleLockViewSubmit = (passphrase: string) => {
    if (!viewLockGate) return;
    const note = notes.find(n => n.id === viewLockGate.noteId);
    if (!note) { setViewLockGate(null); return; }
    unlockNoteContent(note.content, passphrase)
      .then(plain => {
        setUnlockedNotes(prev => ({ ...prev, [note.id]: { plain, passphrase } }));
        setViewLockGate(null);
        openNoteById(note.id);
      })
      .catch(() => setLockError('That passphrase is not correct.'));
  };

  const handleLockRemoveSubmit = (passphrase: string) => {
    if (!removeLockFor) return;
    const note = removeLockFor;
    unlockNoteContent(note.content, passphrase)
      .then(plain => {
        handleSaveNote({ ...note, content: plain });
        setUnlockedNotes(prev => {
          const next = { ...prev };
          delete next[note.id];
          return next;
        });
        setRemoveLockFor(null);
      })
      .catch(() => setLockError('That passphrase is not correct.'));
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
    } catch {
      return "";
    }
  };

  const isProtectedRoute = ['/dashboard', '/notes', '/profile'].includes(path);
  const isAppRoute = (path === '/' && user) || (isProtectedRoute && user);

  if (loading) {
    return <SeasonalLoading />;
  }

  const renderContent = () => {
    if (isProtectedRoute && !user) {
      return <AccessDenied key="403" />;
    }

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
            onOpenTrash={() => setTrashOpen(true)}
            onOpenFlashcards={() => setFlashcardsOpen(true)}
            onOpenReminders={() => setRemindersOpen(true)}
            onOpenTemplates={() => setTemplatePickerOpen(true)}
            onOpenNotebooks={() => setNotebooksOpen(true)}
            onOpenGraph={() => setGraphOpen(true)}
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
                onToggleLock={handleToggleLock}
              />
            </main>
            <Footer variant="simple" />
            {isTrashOpen && user && <TrashModal userId={user.id} onClose={() => setTrashOpen(false)} />}
            {isFlashcardsOpen && user && <FlashcardsModal userId={user.id} notes={notes} onClose={() => setFlashcardsOpen(false)} />}
            {isRemindersOpen && user && <RemindersModal userId={user.id} notes={notes} onClose={() => setRemindersOpen(false)} />}
            {isNotebooksOpen && (
              <NotebooksModal
                customTags={customTags}
                onAddChapter={tag => addOrUpdateCustomTag(tag)}
                onOpenChapter={tagName => { setActiveTag(tagName); setNotebooksOpen(false); }}
                onClose={() => setNotebooksOpen(false)}
              />
            )}
            {isGraphOpen && (
              <LinkGraphModal
                notes={notes}
                onOpenNote={id => { setGraphOpen(false); handleSelectNote(id); }}
                onClose={() => setGraphOpen(false)}
              />
            )}
            {isTemplatePickerOpen && (
              <TemplatePicker onSelect={handleAddFromTemplate} onClose={() => setTemplatePickerOpen(false)} />
            )}
            <FloatingActionButton onClick={handleAddNewNote} />
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingCount}
              conflicts={conflicts}
              onResolveConflict={resolveConflict}
            />
            {viewLockGate && (
              <PassphraseModal
                mode="unlock"
                title="Enter passphrase to open this note"
                error={lockError}
                onSubmit={handleLockViewSubmit}
                onCancel={() => setViewLockGate(null)}
              />
            )}
            {createLockFor && (
              <PassphraseModal
                mode="create"
                title="Lock this note"
                onSubmit={handleLockCreateSubmit}
                onCancel={() => setCreateLockFor(null)}
              />
            )}
            {removeLockFor && (
              <PassphraseModal
                mode="unlock"
                title="Enter passphrase to remove the lock"
                error={lockError}
                onSubmit={handleLockRemoveSubmit}
                onCancel={() => setRemoveLockFor(null)}
              />
            )}
            <AnimatePresence>
              {selectedNoteId && (
                <Suspense fallback={<SeasonalLoading />}>
                  <NoteEditor
                    key={selectedNoteId}
                    note={(() => {
                      const raw = notes.find(n => n.id === selectedNoteId) || null;
                      const session = raw && unlockedNotes[raw.id];
                      return raw && session ? { ...raw, content: session.plain } : raw;
                    })()}
                    onSave={handleSaveFromEditor}
                    onClose={() => setSelectedNoteId(null)}
                    allTags={allTags}
                    customTags={customTags}
                    notes={notes}
                    onOpenNote={handleSelectNote}
                    onCreateLinkedNote={handleCreateLinkedNote}
                  />
                </Suspense>
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
        {detectPlatform() === 'web' && <SpeedInsights />}
        <SeasonalAnimations />
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {showWelcome && !user && (
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

        <AnimatePresence>
          {updateInfo && (
            <UpdateModal updateInfo={updateInfo} onClose={() => setUpdateInfo(null)} />
          )}
        </AnimatePresence>

        {renderContent()}
      </div>
    </ErrorBoundary>
  );
};

export default App;
