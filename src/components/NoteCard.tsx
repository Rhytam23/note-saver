import React, { useState, useRef } from 'react';
import type { Note, Tag, NotePriority } from '../types';
import { DeleteIcon, TagIcon, ExportIcon, PinIcon, FlagIcon, LockIcon, UnlockIcon } from './Icons';
import { isNoteLocked } from '../services/noteLock';
import { motion, AnimatePresence } from 'framer-motion';
import { exportNote, stripHtml } from '../services/exportService';
import { useClickOutside } from '../hooks/useClickOutside';
import { getTagColorClasses, getSafeCoverStyle } from '../services/colorService';
import { useSeason } from '../contexts/SeasonalContext';

interface NoteCardProps {
  note: Note;
  customTags: Tag[];
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleLock?: (note: Note) => void;
}

const cardVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

const priorityStyles: Record<NotePriority, { iconClass: string; title: string }> = {
  high: { iconClass: 'text-red-500', title: 'High Priority' },
  medium: { iconClass: 'text-amber-500', title: 'Medium Priority' },
  low: { iconClass: 'text-sky-500', title: 'Low Priority' },
  none: { iconClass: 'hidden', title: '' },
};

const NoteCard: React.FC<NoteCardProps> = ({ note, customTags, onSelectNote, onDeleteNote, onTogglePin, onToggleLock }) => {
  const { colors } = useSeason();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(exportMenuRef, () => {
    if (isExportMenuOpen) {
      setIsExportMenuOpen(false);
    }
  });

  const handleDelete = (e: any) => {
    e.stopPropagation();
    onDeleteNote(note.id);
  };

  const handleTogglePin = (e: any) => {
    e.stopPropagation();
    onTogglePin(note.id);
  };

  const handleToggleExportMenu = (e: any) => {
    e.stopPropagation();
    setIsExportMenuOpen(prev => !prev);
  };

  const handleExport = (e: any, format: 'txt' | 'md' | 'pdf') => {
    e.stopPropagation();
    exportNote(note, format);
    setIsExportMenuOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const locked = isNoteLocked(note);

  const plainContent = React.useMemo(() => {
    if (locked || !note.content) return "";
    return stripHtml(note.content);
  }, [locked, note.content]);

  const handleToggleLock = (e: any) => {
    e.stopPropagation();
    onToggleLock?.(note);
  };

  return (
    <motion.div
      layout
      variants={cardVariants}
      exit="exit"
      whileHover={{ scale: 1.03, rotateX: 5, boxShadow: '0 15px 25px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onSelectNote(note.id)}
      className={`rounded-xl shadow-lg hover:shadow-2xl cursor-pointer flex flex-col justify-between border relative transition-shadow duration-300 dark:shadow-neumorphic backdrop-blur-lg ${colors.bgSimple} ${colors.border}`}
      style={{ perspective: '1000px' }}
    >
      {note.coverImage && (
        <div
          className="h-32 w-full rounded-t-xl bg-cover bg-center border-b border-white/5"
          style={getSafeCoverStyle(note.coverImage)}
        />
      )}
      <div className="p-4 sm:p-6 flex-1">
        <h3 className={`text-base sm:text-lg font-serif font-bold ${colors.primaryText} truncate flex items-center`}>
          {note.priority && note.priority !== 'none' && (
            <span title={priorityStyles[note.priority].title}>
              <FlagIcon
                className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 ${priorityStyles[note.priority].iconClass}`}
                filled
              />
            </span>
          )}
          <span className="truncate">{note.title}</span>
        </h3>
        {locked ? (
          <p className={`${colors.secondaryText} mt-2 text-xs sm:text-sm italic flex items-center gap-1.5`}>
            <LockIcon className="h-3.5 w-3.5" /> Locked note
          </p>
        ) : plainContent && (
          <p className={`${colors.secondaryText} mt-2 text-xs sm:text-sm leading-relaxed line-clamp-3 sm:line-clamp-4`}>
            {plainContent}
          </p>
        )}
      </div>
      <div className={`px-6 py-4 bg-transparent border-t ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center overflow-hidden">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {note.tags.map(tag => {
                const customTag = customTags.find(t => t.name === tag);
                return (
                  <span key={tag} className={`inline-flex items-center text-xs px-2 py-1 rounded-full whitespace-nowrap ${getTagColorClasses(tag, customTags)}`}>
                    {customTag?.imageUrl ? (
                      <img src={customTag.imageUrl} alt={tag} className="h-4 w-4 rounded-full object-cover mr-1.5" />
                    ) : (
                      <TagIcon className="h-4 w-4 mr-1.5" />
                    )}
                    {tag}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="relative flex items-center space-x-1 sm:space-x-0">
            {onToggleLock && (
              <button
                onClick={handleToggleLock}
                className={`p-2 sm:p-1 rounded-full ${colors.secondaryText} hover:bg-accent/10 hover:text-accent transition-colors duration-200`}
                aria-label={locked ? 'Unlock note' : 'Lock note'}
                title={locked ? 'Unlock note' : 'Lock note with a passphrase'}
              >
                {locked ? <UnlockIcon className="h-5 w-5" /> : <LockIcon className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={handleTogglePin}
              className={`p-2 sm:p-1 rounded-full ${colors.secondaryText} transition-colors duration-200 ${note.isPinned ? 'text-accent' : 'hover:bg-accent/10 hover:text-accent'}`}
              aria-label={note.isPinned ? "Unpin note" : "Pin note"}
              title={note.isPinned ? "Unpin this note" : "Pin this note to top"}
            >
              <PinIcon className="h-5 w-5" filled={note.isPinned} />
            </button>
            <button
              onClick={handleToggleExportMenu}
              className={`p-2 sm:p-1 rounded-full ${colors.secondaryText} hover:bg-success/10 hover:text-success transition-colors duration-200`}
              aria-label="Export note"
            >
              <ExportIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className={`p-2 sm:p-1 rounded-full ${colors.secondaryText} hover:bg-error/10 hover:text-error transition-colors duration-200`}
              aria-label="Delete note"
            >
              <DeleteIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className={`text-xs text-left ${colors.secondaryText} mt-2`}>{formatDate(note.updatedAt)}</p>
      </div>
      <AnimatePresence>
        {isExportMenuOpen && (
          <motion.div
            ref={exportMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
            exit={{ opacity: 0, scale: 0.95, y: 5, transition: { duration: 0.1, ease: 'easeIn' } }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-4 bottom-[68px] w-48 origin-bottom-right rounded-md shadow-lg border z-20 ${colors.bgSimple} ${colors.border}`}
          >
            <button onClick={(e) => handleExport(e, 'txt')} className={`block w-full text-left px-4 py-2 text-sm ${colors.primaryText} ${colors.hover}`}>Export as Text (.txt)</button>
            <button onClick={(e) => handleExport(e, 'md')} className={`block w-full text-left px-4 py-2 text-sm ${colors.primaryText} ${colors.hover}`}>Export as Markdown (.md)</button>
            <button onClick={(e) => handleExport(e, 'pdf')} className={`block w-full text-left px-4 py-2 text-sm ${colors.primaryText} ${colors.hover}`}>Export as PDF (.pdf)</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NoteCard;
