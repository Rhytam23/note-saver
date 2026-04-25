import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { CloseIcon, TagIcon, PinIcon, PaletteIcon, FlagIcon, PlusIcon, KeyboardIcon } from './Icons';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { colors } = useSeason();

    const tutorialSteps = [
        {
            icon: <PlusIcon className="h-6 w-6 text-accent" />,
            title: 'Create a New Note',
            description: "Click the floating '+' button at the bottom right to start a new note. The editor will slide in, ready for your ideas."
        },
        {
            icon: <TagIcon className="h-6 w-6 text-accent" />,
            title: 'Tag Your Notes',
            description: "In the editor, start typing in the 'Add a tag...' field. You can create new tags or select from existing ones to keep your notes organized."
        },
        {
            icon: <PaletteIcon className="h-6 w-6 text-accent" />,
            title: 'Customize Tags',
            description: "In the sidebar, hover over a tag and click the palette icon. You can assign a custom color or even an image URL to make your tags visually distinct."
        },
        {
            icon: <FlagIcon className="h-6 w-6 text-accent" />,
            title: 'Set Priorities',
            description: "Use the priority dropdown in the editor to mark notes as high, medium, or low priority. You can filter by priority using the sidebar."
        },
        {
            icon: <PinIcon className="h-6 w-6 text-accent" filled />,
            title: 'Pin Important Notes',
            description: "Hover over a note card and click the pin icon. Pinned notes will always stay at the top of your list for quick access."
        },
        {
            icon: <KeyboardIcon className="h-6 w-6 text-accent" />,
            title: 'Use Keyboard Shortcuts',
            description: "Speed up your workflow. Use Ctrl/Cmd + N to create a new note, Ctrl/Cmd + S to save, and Esc to close the editor."
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col ${colors.bgSimple} ${colors.border}`}
                    >
                        <header className="p-4 flex items-center justify-between border-b border-divider-light dark:border-divider">
                            <h2 className="text-xl font-mono font-bold">How to Use Notenirman</h2>
                            <button onClick={onClose} className={`p-2 rounded-full ${colors.hover}`}>
                                <CloseIcon className="h-6 w-6" />
                            </button>
                        </header>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {tutorialSteps.map(step => (
                                <div key={step.title} className="flex items-start space-x-4">
                                    <div className={`flex-shrink-0 mt-1 p-3 rounded-full bg-accent/10`}>
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${colors.primaryText}`}>{step.title}</h3>
                                        <p className={`text-sm ${colors.secondaryText}`}>{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <footer className="p-4 bg-secondary-bg-light dark:bg-secondary-bg/50 border-t border-divider-light dark:border-divider flex justify-end">
                            <button onClick={onClose} className="px-4 py-2 bg-accent text-primary-bg font-semibold rounded-lg">Got it!</button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TutorialModal;
