import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { ChevronLeftIcon } from './Icons';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    const { colors } = useSeason();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`min-h-screen p-6 md:p-12 ${colors.bgSimple} ${colors.primaryText}`}
        >
            <button
                onClick={onBack}
                className="mb-8 flex items-center gap-2 text-accent hover:underline font-medium"
            >
                <ChevronLeftIcon className="h-5 w-5" />
                Back to Home
            </button>

            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-4xl font-serif font-bold mb-4">Privacy Policy</h1>
                <p className="text-sm opacity-70">Last Updated: April 25, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">1. Introduction</h2>
                    <p>
                        Welcome to Note Saver. We respect your privacy and are committed to protecting your personal data. 
                        This privacy policy will inform you as to how we look after your personal data when you visit our website 
                        and tell you about your privacy rights.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">2. Data We Collect</h2>
                    <p>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Identity Data:</strong> includes your name and email address when you sign in via Google.</li>
                        <li><strong>Note Data:</strong> includes the content of your notes, tags, and images you upload.</li>
                        <li><strong>Usage Data:</strong> includes information about how you use our website.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">3. How We Use Your Data</h2>
                    <p>
                        We use your data only to provide the Note Saver service, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Authenticating your account.</li>
                        <li>Storing and syncing your notes across devices.</li>
                        <li>Providing AI-assisted writing features via Gemini AI.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">4. Data Security</h2>
                    <p>
                        Your data is stored securely using Supabase (PostgreSQL) and is only accessible by you. 
                        We do not sell or share your personal data with third parties for marketing purposes.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">5. Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at: 
                        <a href="mailto:rhytambiswas@gmail.com" className="text-accent hover:underline ml-1">rhytambiswas@gmail.com</a>
                    </p>
                </section>
            </div>
        </motion.div>
    );
};

export default PrivacyPolicy;
