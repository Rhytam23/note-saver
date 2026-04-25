import React from 'react';
import type { Note, Tag, PriorityFilter } from '../types.ts';
import NoteCard from './NoteCard.tsx';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext.tsx';

interface NoteListProps {
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  customTags: Tag[];
  activeTag: string | null;
  activePriority: PriorityFilter;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useSeason();
  return (
    <motion.h2
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-xs font-semibold uppercase ${colors.secondaryText} tracking-wider pb-2 mb-4 border-b ${colors.border}`}
    >
      {children}
    </motion.h2>
  );
};

const getEmptyStateMessage = (activeTag: string | null, activePriority: PriorityFilter): { title: string; subtitle: string } => {
  if (activeTag && activePriority) {
    return {
      title: "No Matching Notes",
      subtitle: `No ${activePriority}-priority notes found in the "${activeTag}" tag.`
    };
  }
  if (activeTag) {
    return {
      title: "No Notes in Tag",
      subtitle: `No notes found with the tag "${activeTag}".`
    };
  }
  if (activePriority) {
    return {
      title: `No ${activePriority.charAt(0).toUpperCase() + activePriority.slice(1)} Priority Notes`,
      subtitle: `You have no notes marked with ${activePriority} priority.`
    };
  }
  return {
    title: "No notes yet.",
    subtitle: "Click the '+' button to create your first note."
  };
};


const NoteList: React.FC<NoteListProps> = ({ pinnedNotes, unpinnedNotes, customTags, activeTag, activePriority, onSelectNote, onDeleteNote, onTogglePin }) => {
  const { colors } = useSeason();
  if (pinnedNotes.length === 0 && unpinnedNotes.length === 0) {
    const { title, subtitle } = getEmptyStateMessage(activeTag, activePriority);
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center ${colors.secondaryText}`}>
        <h2 className="text-2xl font-serif">{title}</h2>
        <p className="mt-2">{subtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {pinnedNotes.length > 0 && (
          <motion.section
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SectionHeader>Pinned</SectionHeader>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {pinnedNotes.map(note => (
                <NoteCard key={note.id} note={note} customTags={customTags} onSelectNote={onSelectNote} onDeleteNote={onDeleteNote} onTogglePin={onTogglePin} />
              ))}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && <SectionHeader>Notes</SectionHeader>}
        {unpinnedNotes.length > 0 && (
          <motion.div
            layout
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {unpinnedNotes.map(note => (
                <NoteCard key={note.id} note={note} customTags={customTags} onSelectNote={onSelectNote} onDeleteNote={onDeleteNote} onTogglePin={onTogglePin} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default NoteList;