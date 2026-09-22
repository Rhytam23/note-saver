import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { ChevronLeftIcon, ChevronDownIcon } from './Icons';

interface FAQProps {
    onBack: () => void;
}

const faqs = [
    {
        question: "What is Notenirman?",
        answer: "Notenirman is an offline-first notes app for Windows, Android and the web. It has a block-style editor with tables, equations, flashcards and templates, seasonal themes tied to Indian festivals, and an optional Gemini AI assistant. Notes are written to your device first and sync when you're back online."
    },
    {
        question: "Does Notenirman work offline?",
        answer: "Yes. Every note is saved to your device first (not just cached), so you can keep reading and writing with no connection at all. Changes sync automatically once you're back online, and the web version keeps working offline after your first visit."
    },
    {
        question: "How do I create my first note?",
        answer: "Sign in with your email or a Google account, then click the '+' button to open the editor and start writing. You can also start from a template — Cornell notes, class notes, an exam revision plan, an assignment tracker or a daily planner."
    },
    {
        question: "How do I use the AI features?",
        answer: "Type a forward slash (/) in the editor to insert content or trigger AI, or open the AI Assistant panel beside the editor to summarize a note, proofread it, get ideas, or check for AI-generated text. AI features use Google's Gemini and are optional — the app works fully without them."
    },
    {
        question: "Can I add tables and equations to my notes?",
        answer: "Yes. Type / and choose Table to insert rows and columns, or choose Equation to write LaTeX math that renders inline or as its own block."
    },
    {
        question: "Does Notenirman have flashcards?",
        answer: "Yes. Write a line as \"Question:: Answer\" in any note and it becomes a flashcard, reviewed with spaced repetition so cards you know well come back less often."
    },
    {
        question: "Can I link notes to each other?",
        answer: "Yes. Type [[Note title]] inside a note to link to another one. Each note also shows which other notes link back to it, and a connections view lets you see the whole map of linked notes at a glance."
    },
    {
        question: "Can I import a PDF or scan a photo of my notes?",
        answer: "Yes. The editor can pull the real text out of a PDF, or run on-device OCR on a photo or screenshot to extract text from handwriting or a whiteboard. Both run in your browser; your file is never uploaded to a server for this."
    },
    {
        question: "What are 'Seasonal Themes'?",
        answer: "Notenirman changes its colours and background with the season and with Indian festivals — Diwali, Holi, Navratri, Pongal and more, alongside the usual four seasons. You can let it follow the calendar automatically or pick a theme yourself."
    },
    {
        question: "How do I organize my notes?",
        answer: "Tag notes with colours, set a priority (High, Medium, Low), and pin the ones you use most. You can also group notes into notebooks by subject and chapter, or link related notes to each other directly."
    },
    {
        question: "Is my data secure, and can I lock a note?",
        answer: "Your notes sync to a private Supabase database tied to your account, reached over an encrypted connection. You can also lock any individual note with its own passphrase (AES-256 encryption) so its content is unreadable without it — note that a locked note cannot be recovered if you forget that passphrase."
    },
    {
        question: "What happens if I delete a note by accident?",
        answer: "Deleted notes go to Trash, not straight to permanent deletion. They stay recoverable there for 30 days before being removed from your device."
    },
    {
        question: "Can I get my notes out of Notenirman?",
        answer: "Yes. Export any note as PDF, Markdown or plain text, or back up your entire workspace to a single file and restore it later. You can also import Markdown, HTML, text or CSV files from other note apps."
    },
    {
        question: "Is Notenirman free to use?",
        answer: "Yes, Notenirman is free to use."
    }
];

const FAQItem: React.FC<{ question: string, answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { colors } = useSeason();

    return (
        <div className={`border-b ${colors.border} py-4`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between text-left focus:outline-none"
            >
                <span className={`text-lg font-medium ${colors.primaryText}`}>{question}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDownIcon className={`h-5 w-5 ${colors.secondaryText}`} />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <p className={`mt-4 text-sm leading-relaxed ${colors.secondaryText}`}>
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FAQ: React.FC<FAQProps> = ({ onBack }) => {
    const { colors } = useSeason();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`min-h-screen p-6 md:p-12 ${colors.bgSimple}`}
        >
            <button
                onClick={onBack}
                className="mb-8 flex items-center gap-2 text-accent hover:underline font-medium"
            >
                <ChevronLeftIcon className="h-5 w-5" />
                Back to Home
            </button>

            <div className="max-w-3xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h1 className={`text-4xl md:text-5xl font-serif font-bold ${colors.primaryText}`}>
                        Frequently Asked <span className="text-accent">Questions</span>
                    </h1>
                    <p className={`${colors.secondaryText} text-lg`}>
                        Everything you need to know about Notenirman.
                    </p>
                </div>

                <div className={`bg-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 border ${colors.border} shadow-xl`}>
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} {...faq} />
                    ))}
                </div>

                <div className="text-center p-8 bg-accent/10 rounded-2xl border border-accent/20">
                    <h3 className={`text-xl font-bold ${colors.primaryText} mb-2`}>Still have questions?</h3>
                    <p className={`${colors.secondaryText} mb-6`}>We're here to help you get the most out of your notes.</p>
                    <a 
                        href="mailto:rhytambiswas@gmail.com"
                        className="inline-block bg-accent text-primary-bg font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        </motion.div>
    );
};

export default FAQ;
