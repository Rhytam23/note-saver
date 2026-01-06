import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Tiptap removed due to incompatibility with current build setup
// import { useEditor, EditorContent } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Placeholder from '@tiptap/extension-placeholder';
import type { Note, Tag, NotePriority } from '../types.ts';
import { CloseIcon, ChevronDownIcon, SpinnerIcon, ImageIcon, MicrophoneIcon, StopIcon } from './Icons.tsx';
import AiAssistant from './AiAssistant.tsx';
import CoverImagePicker from './CoverImagePicker.tsx';
// SlashMenu removed temporarily
// import SlashMenu from './SlashMenu.tsx';
import { useSeason } from '../contexts/SeasonalContext.tsx';
import { getTagColorClasses } from '../services/colorService.ts';
import { useClickOutside } from '../hooks/useClickOutside.ts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';

// Add custom styling for the editor to match app theme
import '../index.css';

interface NoteEditorProps {
  note: Note | null;
  onSave: (note: Note) => void;
  onClose: () => void;
  allTags: string[];
  customTags: Tag[];
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onClose, allTags, customTags }) => {
  const { colors } = useSeason();
  const [editedNote, setEditedNote] = useState<Note | null>(note);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tag & Priority State
  const [isTagSuggestionsOpen, setIsTagSuggestionsOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Voice Dictation Hook
  const { isListening, transcript, startListening, stopListening, hasRecognitionSupport, resetTranscript } = useSpeechRecognition();

  // Effect to append transcript to content
  useEffect(() => {
    if (!transcript) return;

    // We update the edited note with the transcript. 
    // This is simple "live" appending. For more complex cursor handling, we'd need a different approach.
    setEditedNote(prev => {
      if (!prev) return null;
      // Check if the transcript is already at the end to prevent duplication in React 18 strict mode
      if (prev.content.endsWith(transcript)) return prev;

      // This is a simplified approach: we append the *latest segment* 
      // Real implementation often requires comparing against previous transcript state

      // BETTER APPROACH: Only update when transcript *changes* significantly or on stop. 
      // But for this simple hook, let's just use the transcript buffer.

      // Actually, the hook accumulates transcript. So we should append it *once* when it changes?
      // Let's rely on the user stopping, OR better:
      // Use a separate "previousTranscript" ref to append only new parts?
      // For simplicity: We will display the transcript in a temporary "overlay" or just append it.
      // Let's TRY appending only when listening stops to be safe? 
      // No, user wants real time.

      // Let's try this: 
      // We WON'T update `editedNote.content` automatically in this effect to avoid loops.
      // We will show the transcript in the UI, and then append it on stop?
      return prev;
    });
  }, [transcript]);

  // Append final transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript && editedNote) {
      const newContent = (editedNote.content ? editedNote.content + ' ' : '') + transcript;
      setEditedNote(prev => prev ? { ...prev, content: newContent } : null);
      resetTranscript();
    }
  }, [isListening, transcript]); // Only trigger when isListening goes false


  const tagInputContainerRef = useRef<HTMLDivElement>(null);
  const priorityContainerRef = useRef<HTMLDivElement>(null);
  const coverPickerRef = useRef<HTMLDivElement>(null);

  useClickOutside(tagInputContainerRef, () => setIsTagSuggestionsOpen(false));
  useClickOutside(priorityContainerRef, () => setIsPriorityOpen(false));
  useClickOutside(coverPickerRef, () => setShowCoverPicker(false));

  useEffect(() => {
    setEditedNote(note);
  }, [note]);

  const handleSave = useCallback(() => {
    if (!editedNote) return;
    setIsSaving(true);
    setTimeout(() => {
      onSave(editedNote);
      setIsSaving(false);
    }, 500);
  }, [editedNote, onSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedNote(prev => prev ? { ...prev, title: e.target.value } : null);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedNote(prev => prev ? { ...prev, content: e.target.value } : null);
  };

  const handleCoverSelect = (coverImage: string) => {
    setEditedNote(prev => prev ? { ...prev, coverImage } : null);
    setShowCoverPicker(false);
  };

  const handleAIAssist = (newContent: string, mode: 'replace' | 'append') => {
    setEditedNote(prev => {
      if (!prev) return null;
      if (mode === 'replace') {
        return { ...prev, content: newContent };
      } else {
        // Append with a newline if content exists
        const separator = prev.content ? '\n\n' : '';
        return { ...prev, content: prev.content + separator + newContent };
      }
    });
  }

  const handleAddTag = (tagName: string) => {
    if (!editedNote) return;
    const trimmedTagName = tagName.trim();
    if (trimmedTagName && !editedNote.tags.includes(trimmedTagName)) {
      setEditedNote({
        ...editedNote,
        tags: [...editedNote.tags, trimmedTagName].sort(),
      });
    }
    setTagInput('');
    setIsTagSuggestionsOpen(false);
  };

  const handleRemoveTag = (tagName: string) => {
    if (!editedNote) return;
    setEditedNote({ ...editedNote, tags: editedNote.tags.filter(t => t !== tagName) });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput.trim());
    }
  };

  const handlePriorityChange = (priority: NotePriority) => {
    if (!editedNote) return;
    setEditedNote({ ...editedNote, priority });
  };

  if (!editedNote) return null;

  const availableTags = allTags.filter(t => !editedNote.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()));
  const trimmedTagInput = tagInput.trim();
  const isNewTag = trimmedTagInput && !allTags.some(t => t.toLowerCase() === trimmedTagInput.toLowerCase());

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100vh" }}
        animate={{ y: 0 }}
        exit={{ y: "100vh" }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`relative w-full h-full md:w-[95%] md:h-[90%] lg:w-4/5 xl:w-2/3 md:rounded-2xl shadow-2xl flex flex-col border overflow-hidden ${colors.surface} ${colors.border} ${colors.primaryText}`}
      >
        <header className={`flex-shrink-0 p-4 flex items-center justify-between border-b ${colors.border}`}>
          <h2 className="text-xl font-mono font-bold">Edit Note</h2>
          <div className="flex items-center space-x-2">
            {/* Voice Dictation Button */}
            {hasRecognitionSupport && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse' : colors.hover}`}
                title={isListening ? "Stop Recording" : "Start Voice Dictation"}
              >
                {isListening ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
              </button>
            )}

            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-accent text-primary-bg font-semibold rounded-lg flex items-center disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving && <SpinnerIcon className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save & Close'}
            </button>
            <button onClick={onClose} className={`p-2 rounded-full ${colors.hover}`}>
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <main className="flex-1 flex flex-col min-h-0 relative overflow-y-auto">

            {/* Cover Image Banner */}
            {editedNote.coverImage ? (
              <div className="relative w-full h-40 md:h-52 flex-shrink-0 group">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ background: editedNote.coverImage.includes('gradient') || editedNote.coverImage.startsWith('#') ? editedNote.coverImage : `url(${editedNote.coverImage})` }}
                />
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowCoverPicker(true)}
                    className="bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-md border border-white/20 flex items-center gap-2"
                  >
                    <ImageIcon className="h-3 w-3" /> Change Cover
                  </button>
                </div>
              </div>
            ) : (
              /* Add Cover Button (Show when no cover) */
              <div className="px-6 pt-6 pb-0 group">
                <button
                  onClick={() => setShowCoverPicker(true)}
                  className={`text-xs flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity ${colors.secondaryText}`}
                >
                  <ImageIcon className="h-4 w-4" /> Add Cover
                </button>
              </div>
            )}

            <div className="p-4 md:p-6 flex-1 flex flex-col">
              <input
                type="text"
                value={editedNote.title}
                onChange={handleTitleChange}
                placeholder="Heading"
                className={`w-full bg-transparent text-2xl md:text-3xl font-bold font-serif focus:outline-none mb-4 text-left ${colors.primaryText}`}
              />

              <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto">
                <textarea
                  value={editedNote.content + (isListening ? (editedNote.content ? ' ' : '') + transcript + '...' : '')}
                  onChange={handleContentChange}
                  placeholder="Start writing..."
                  className={`flex-grow w-full h-full resize-none bg-transparent focus:outline-none ${colors.primaryText} leading-relaxed text-lg p-2`}
                />
              </div>

              {/* Cover Picker Popover */}
              <AnimatePresence>
                {showCoverPicker && (
                  <div ref={coverPickerRef}>
                    <CoverImagePicker
                      onSelect={handleCoverSelect}
                      onClose={() => setShowCoverPicker(false)}
                      activeCover={editedNote.coverImage}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </main>

          <aside className={`w-full md:w-80 flex-shrink-0 border-t md:border-t-0 md:border-l p-4 space-y-6 overflow-y-auto ${colors.border} ${colors.bgSimple}`}>
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>AI Assistant</h3>
              <AiAssistant noteContent={editedNote.content} onApply={handleAIAssist} />
            </div>

            {/* Tags Section */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Tags</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {editedNote.tags.map(tag => (
                  <span key={tag} className={`flex items-center text-xs px-2 py-1 rounded-full ${getTagColorClasses(tag, customTags)}`}>
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 opacity-70 hover:opacity-100">
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative" ref={tagInputContainerRef}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onFocus={() => setIsTagSuggestionsOpen(true)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add a tag..."
                  className={`w-full text-sm px-3 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-accent focus:border-accent text-left ${colors.surface} ${colors.border} ${colors.primaryText} placeholder:text-secondary-text-light dark:placeholder:text-secondary-text`}
                />
                <AnimatePresence>
                  {isTagSuggestionsOpen && trimmedTagInput && (
                    <motion.ul
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 bg-white dark:bg-gray-800 ${colors.border}`}
                    >
                      {availableTags.map(tag => (
                        <li key={tag} onClick={() => handleAddTag(tag)} className={`px-3 py-2 text-sm cursor-pointer ${colors.primaryText} ${colors.hover}`}>
                          {tag}
                        </li>
                      ))}
                      {isNewTag && (
                        <li onClick={() => handleAddTag(trimmedTagInput)} className={`px-3 py-2 text-sm cursor-pointer ${colors.primaryText} ${colors.hover}`}>
                          Create "<strong>{trimmedTagInput}</strong>"
                        </li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Priority Section */}
            <div className="relative" ref={priorityContainerRef}>
              <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Priority</h3>
              <button onClick={() => setIsPriorityOpen(prev => !prev)} className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-colors hover:border-accent/50 ${colors.surface} ${colors.border} ${colors.primaryText}`}>
                <span className="capitalize">{editedNote.priority}</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isPriorityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-lg z-10 bg-white dark:bg-gray-800 ${colors.border}`}
                  >
                    {(['none', 'low', 'medium', 'high'] as NotePriority[]).map(p => (
                      <a key={p} href="#" onClick={(e) => { e.preventDefault(); handlePriorityChange(p); setIsPriorityOpen(false); }} className={`block px-3 py-2 text-sm capitalize ${colors.primaryText} ${colors.hover}`}>
                        {p}
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`text-xs ${colors.secondaryText} space-y-1`}>
              <p>Created: {new Date(editedNote.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(editedNote.updatedAt).toLocaleString()}</p>
            </div>

          </aside>
        </div>
      </motion.div>
    </div>
  );
};

export default NoteEditor;