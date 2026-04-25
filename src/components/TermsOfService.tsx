import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { ChevronLeftIcon } from './Icons';

interface TermsOfServiceProps {
    onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
                <h1 className="text-4xl font-serif font-bold mb-4">Terms of Service</h1>
                <p className="text-sm opacity-70">Last Updated: April 25, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">1. Terms</h2>
                    <p>
                        By accessing Note Saver, you are agreeing to be bound by these terms of service, all applicable laws and regulations, 
                        and agree that you are responsible for compliance with any applicable local laws.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">2. Use License</h2>
                    <p>
                        Permission is granted to use Note Saver for personal, non-commercial transitory viewing only. 
                        This is the grant of a license, not a transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Modify or copy the materials;</li>
                        <li>Use the materials for any commercial purpose;</li>
                        <li>Attempt to decompile or reverse engineer any software contained in Note Saver;</li>
                        <li>Remove any copyright or other proprietary notations from the materials.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">3. Disclaimer</h2>
                    <p>
                        The materials on Note Saver are provided on an 'as is' basis. Note Saver makes no warranties, expressed or implied, 
                        and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions 
                        of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">4. AI Features</h2>
                    <p>
                        Note Saver uses Gemini AI to provide writing assistance. While we strive for accuracy, AI-generated content 
                        may contain errors. Users are responsible for reviewing and verifying any content generated or modified by AI.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">5. Governing Law</h2>
                    <p>
                        These terms and conditions are governed by and construed in accordance with the laws of India and you 
                        irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
                    </p>
                </section>
            </div>
        </motion.div>
    );
};

export default TermsOfService;
