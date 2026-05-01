import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Strike from '@tiptap/extension-strike';
import type { Note, Tag, NotePriority } from "../types";
import { CloseIcon, ChevronDownIcon, SpinnerIcon, ImageIcon, MicrophoneIcon, StopIcon, BoldIcon, ItalicIcon, UnderlineIcon, StrikeIcon, ListCheckIcon, UndoIcon, RedoIcon, LightBulbIcon } from "./Icons";
import AiAssistant from "./AiAssistant";
import CoverImagePicker from "./CoverImagePicker";
import SlashMenu from "./SlashMenu";
import EmojiMenu from "./EmojiMenu";
import SlashCommand from "../extensions/SlashCommand";
import EmojiSuggestion from "../extensions/EmojiSuggestion";
import Callout from "../extensions/Callout";
import { useSeason } from "../contexts/SeasonalContext";
import { getTagColorClasses } from "../services/colorService";
import { useClickOutside } from "../hooks/useClickOutside";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

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

  // Slash Menu State
  const [slashMenuProps, setSlashMenuProps] = useState<{
    position: { top: number; left: number };
    filterText: string;
    range: any;
  } | null>(null);

  // Emoji Menu State
  const [emojiMenuProps, setEmojiMenuProps] = useState<{
    position: { top: number; left: number };
    filterText: string;
    range: any;
  } | null>(null);

  // Tiptap Editor Initialization
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Strike,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => query,
          render: () => {
            return {
              onStart: (props: any) => {
                const { clientRect, query, range } = props;
                if (!clientRect) return;
                const rect = clientRect();
                setSlashMenuProps({
                  position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                  filterText: query,
                  range,
                });
              },
              onUpdate: (props: any) => {
                const { clientRect, query, range } = props;
                if (!clientRect) return;
                const rect = clientRect();
                setSlashMenuProps({
                  position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                  filterText: query,
                  range,
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  setSlashMenuProps(null);
                  return true;
                }
                return false;
              },
              onExit: () => {
                setSlashMenuProps(null);
              },
            };
          },
        },
      }),
      EmojiSuggestion.configure({
        suggestion: {
          items: ({ query }: { query: string }) => query,
          render: () => {
            return {
              onStart: (props: any) => {
                const { clientRect, query, range } = props;
                if (!clientRect) return;
                const rect = clientRect();
                setEmojiMenuProps({
                  position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                  filterText: query,
                  range,
                });
              },
              onUpdate: (props: any) => {
                const { clientRect, query, range } = props;
                if (!clientRect) return;
                const rect = clientRect();
                setEmojiMenuProps({
                  position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX },
                  filterText: query,
                  range,
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  setEmojiMenuProps(null);
                  return true;
                }
                return false;
              },
              onExit: () => {
                setEmojiMenuProps(null);
              },
            };
          },
        },
      }),
      Callout,
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      setEditedNote(prev => prev ? { ...prev, content: editor.getHTML() } : null);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px] ${colors.primaryText}`,
      },
    },
  });

  // Voice Dictation Hook
  const { isListening, transcript, startListening, stopListening, hasRecognitionSupport, resetTranscript } = useSpeechRecognition();

  // Effect to append transcript to content
  useEffect(() => {
    if (!transcript || !editor) return;

    // Use Tiptap command to insert content at the current cursor position
    editor.commands.insertContent(transcript + ' ');
    
    // Clear transcript after inserting to avoid double insertion
    resetTranscript();
  }, [transcript, editor, resetTranscript]);

  // Sync editor content when note prop changes (as fallback if key is not used)
  useEffect(() => {
    if (editor && note && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content);
    }
  }, [note?.id, editor]);

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

  // Auto-save effect
  useEffect(() => {
    if (!editedNote || !note) return;
    
    // Check if there are actual changes
    const hasChanges = 
      editedNote.title !== note.title ||
      editedNote.content !== note.content ||
      editedNote.coverImage !== note.coverImage ||
      editedNote.priority !== note.priority ||
      JSON.stringify(editedNote.tags) !== JSON.stringify(note.tags);

    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 1000); // 1-second debounce for auto-save

      return () => clearTimeout(timeoutId);
    }
  }, [editedNote, note, handleSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedNote(prev => prev ? { ...prev, title: e.target.value } : null);
  };

  const handleContentChange = (content: string) => {
    setEditedNote(prev => prev ? { ...prev, content } : null);
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

  const handleSlashCommand = (id: string) => {
    if (!editor || !slashMenuProps) return;

    const { range } = slashMenuProps;
    editor.chain().focus().deleteRange(range).run();

    switch (id) {
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
      case 'divider': editor.chain().focus().setHorizontalRule().run(); break;
      case 'callout': editor.chain().focus().insertContent({ type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] }).run(); break;
      case 'ai':
        // Trigger AI Assistant (could be a focus or a specific mode)
        const aiButton = document.getElementById('ai-assistant-trigger');
        if (aiButton) aiButton.click();
        break;
    }
    setSlashMenuProps(null);
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
        <header className={`flex-shrink-0 p-3 sm:p-4 flex items-center justify-between border-b ${colors.border}`}>
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className={`p-2 rounded-full md:hidden ${colors.hover}`}>
              <ChevronDownIcon className="h-6 w-6 rotate-90" />
            </button>
            <h2 className="text-lg md:text-xl font-mono font-bold truncate">Edit Note</h2>
          </div>
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
              className="px-3 sm:px-4 py-2 text-sm bg-accent text-primary-bg font-semibold rounded-lg flex items-center disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving && <SpinnerIcon className="h-4 w-4 mr-2" />}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button onClick={onClose} className={`hidden md:flex p-2 rounded-full ${colors.hover}`}>
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
                className={`w-full bg-transparent text-2xl md:text-3xl font-bold font-serif focus:outline-none mb-2 text-left ${colors.primaryText}`}
              />

              {/* Editor Toolbar */}
              <div className={`flex items-center gap-1 mb-4 pb-2 border-b ${colors.border}`}>
                <button
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  className={`p-2 rounded-lg transition-colors ${colors.hover} disabled:opacity-30`}
                  title="Undo (Ctrl+Z)"
                >
                  <UndoIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  className={`p-2 rounded-lg transition-colors ${colors.hover} disabled:opacity-30`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <RedoIcon className="h-5 w-5" />
                </button>
                <div className={`w-px h-6 mx-1 ${colors.border}`} />
                <button
                  onClick={() => editor?.chain().focus().insertContent({ type: 'callout', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important info here...' }] }] }).run()}
                  className={`p-2 rounded-lg transition-colors ${colors.hover}`}
                  title="Insert Callout"
                >
                  <LightBulbIcon className="h-5 w-5" />
                </button>
                <div className={`w-px h-6 mx-1 ${colors.border}`} />
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded-lg transition-colors ${editor?.isActive('bold') ? 'bg-accent/20 text-accent' : colors.hover}`}
                  title="Bold"
                >
                  <BoldIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded-lg transition-colors ${editor?.isActive('italic') ? 'bg-accent/20 text-accent' : colors.hover}`}
                  title="Italic"
                >
                  <ItalicIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  className={`p-2 rounded-lg transition-colors ${editor?.isActive('taskList') ? 'bg-accent/20 text-accent' : colors.hover}`}
                  title="Task List"
                >
                  <ListCheckIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto custom-editor">
                {editor && (
                  <BubbleMenu editor={editor} className={`flex items-center gap-1 p-1 rounded-lg border shadow-xl backdrop-blur-md ${colors.surface} ${colors.border}`}>
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('bold') ? 'text-accent' : colors.primaryText}`}
                    >
                      <BoldIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('italic') ? 'text-accent' : colors.primaryText}`}
                    >
                      <ItalicIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('underline') ? 'text-accent' : colors.primaryText}`}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('strike') ? 'text-accent' : colors.primaryText}`}
                    >
                      <StrikeIcon className="h-4 w-4" />
                    </button>
                    <div className={`w-px h-4 mx-1 ${colors.border}`} />
                    <button
                      onClick={() => editor.chain().focus().toggleTaskList().run()}
                      className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${editor.isActive('taskList') ? 'text-accent' : colors.primaryText}`}
                    >
                      <ListCheckIcon className="h-4 w-4" />
                    </button>
                  </BubbleMenu>
                )}



                <EditorContent editor={editor} className="flex-grow w-full h-full" />
                {isListening && (
                  <div className="absolute bottom-4 left-4 bg-accent/20 backdrop-blur-md px-3 py-1 rounded-full text-sm border border-accent/30 animate-pulse">
                    🎤 {transcript}...
                  </div>
                )}
                <AnimatePresence>
                  {slashMenuProps && (
                    <SlashMenu
                      position={slashMenuProps.position}
                      filterText={slashMenuProps.filterText}
                      onSelect={handleSlashCommand}
                      onClose={() => setSlashMenuProps(null)}
                    />
                  )}
                  {emojiMenuProps && (
                    <EmojiMenu
                      position={emojiMenuProps.position}
                      filterText={emojiMenuProps.filterText}
                      onSelect={(emoji) => {
                        if (editor && emojiMenuProps) {
                          editor.chain().focus().insertContentAt(emojiMenuProps.range, emoji).run();
                        }
                        setEmojiMenuProps(null);
                      }}
                      onClose={() => setEmojiMenuProps(null)}
                    />
                  )}
                </AnimatePresence>
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

          <aside className={`w-full md:w-80 flex-shrink-0 border-t md:border-t-0 md:border-l p-4 sm:p-6 space-y-6 overflow-y-auto ${colors.border} ${colors.bgSimple}`}>
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
