import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { ChevronLeftIcon, ChevronDownIcon } from './Icons';

interface FAQProps {
    onBack: () => void;
}

const faqs = [
    {
        question: "What is Note Saver?",
        answer: "Note Saver is an intelligent, seasonally-aware note-taking application designed to help you organize your thoughts with the power of Gemini AI. It changes its look and feel based on the current season or festival."
    },
    {
        question: "How do I create my first note?",
        answer: "Simply sign in with your Google account, and you'll be taken to your dashboard. Click the '+' floating button at the bottom right to open the editor and start writing!"
    },
    {
        question: "How do I use the AI features?",
        answer: "In the note editor, type a forward slash (/) to open the AI command menu. From there, you can ask the AI to summarize, improve your writing, or generate ideas. You can also highlight any text to see AI formatting options."
    },
    {
        question: "What are 'Seasonal Themes'?",
        answer: "Note Saver automatically detects the time of year and applies a unique theme. For example, in October you might see a Navratri theme, and in December, a Christmas theme. You can also manually switch between light and dark modes using the sun/moon icon in the header."
    },
    {
        question: "How do I organize my notes?",
        answer: "You can add tags to your notes by clicking the 'Tags' button in the editor. You can also set priorities (High, Medium, Low) and 'Pin' important notes to the top of your list for quick access."
    },
    {
        question: "Is my data secure?",
        answer: "Yes! Your notes are stored securely in your private Supabase database. We use Google OAuth for secure login, ensuring only you can access your content."
    },
    {
        question: "How does the AI work?",
        answer: "Note Saver uses Google's Gemini AI to provide features like smart tagging, content summarization, and writing assistance. You can use slash commands (/) in the editor to trigger AI actions."
    },
    {
        question: "Does it work offline?",
        answer: "Note Saver is a web application that requires an internet connection to sync your notes and use AI features. However, we are working on a PWA (Progressive Web App) version for basic offline viewing."
    },
    {
        question: "Can I customize the themes?",
        answer: "The app automatically updates its theme based on the current season (Summer, Monsoon, Winter, etc.) and major festivals (Diwali, Christmas, etc.). You can also manually toggle between Light and Dark modes."
    },
    {
        question: "Is Note Saver free to use?",
        answer: "Yes! Note Saver is currently free to use. Our goal is to provide a beautiful and intelligent space for everyone to capture their ideas."
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
                        Everything you need to know about Note Saver.
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
