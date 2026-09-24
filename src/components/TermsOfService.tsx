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
                <p className="text-sm opacity-70">Last Updated: September 24, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">1. Terms</h2>
                    <p>
                        By accessing Notenirman, you are agreeing to be bound by these terms of service, all applicable laws and regulations, 
                        and agree that you are responsible for compliance with any applicable local laws.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">2. Use License</h2>
                    <p>
                        Permission is granted to use Notenirman for personal, non-commercial transitory viewing only. 
                        This is the grant of a license, not a transfer of title, and under this license you may not:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Modify or copy the materials;</li>
                        <li>Use the materials for any commercial purpose;</li>
                        <li>Attempt to decompile or reverse engineer any software contained in Notenirman;</li>
                        <li>Remove any copyright or other proprietary notations from the materials.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">3. Disclaimer</h2>
                    <p>
                        The materials on Notenirman are provided on an 'as is' basis. Notenirman makes no warranties, expressed or implied, 
                        and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions 
                        of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">4. AI Features</h2>
                    <p>
                        Notenirman uses Gemini AI to provide writing assistance. While we strive for accuracy, AI-generated content 
                        may contain errors. Users are responsible for reviewing and verifying any content generated or modified by AI.
                    </p>
                </section>

                <section className="space-y-4" id="telegram">
                    <h2 className="text-2xl font-bold">5. Telegram Bot</h2>
                    <p>
                        Notenirman offers an optional Telegram bot for writing and managing your notes. By connecting it you agree to the following, in addition to the rest of these terms.
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Your account, your responsibility.</strong> Connect only your own Telegram account. Anything sent from a
                            chat connected to your account is treated as done by you. Keep your Telegram account and device secure.
                        </li>
                        <li>
                            <strong>Keep your connect code private.</strong> The bot gives you a one-time code that you enter in the app. Never
                            share it or enter a code that someone else gave you: anyone whose Telegram account you connect can read and change your
                            notes until you disconnect it. Always check the Telegram name shown in the app before you confirm.
                        </li>
                        <li>
                            <strong>Emergency notes.</strong> If you send the bot text without a command, it saves the text as a note titled
                            &ldquo;Emergency&rdquo;. You can create up to 3 such notes per day. If you have not changed the title within 24 hours,
                            the note is moved to Trash, where it can be restored for 30 days. To keep a note, give it a proper title in the app,
                            or start it with the /title command.
                        </li>
                        <li>
                            <strong>Fair use.</strong> We limit how fast the bot can be used (currently 30 messages a minute per chat). Do not use
                            the bot to spam, to overload it, or to try to reach anyone else&rsquo;s notes.
                        </li>
                        <li>
                            <strong>No guarantees.</strong> The bot is provided &lsquo;as is&rsquo;. It may be unavailable, delayed or changed at
                            any time, and reminders are not guaranteed to arrive on time. Do not rely on it for anything critical.
                        </li>
                        <li>
                            <strong>Telegram is separate.</strong> Telegram is a third-party service with its own terms and privacy policy, which
                            apply to your use of it. Notenirman is not affiliated with, endorsed by or sponsored by Telegram. Telegram chats with
                            bots are not end-to-end encrypted, so avoid sending highly sensitive information to the bot.
                        </li>
                        <li>
                            <strong>Disconnecting.</strong> You can disconnect at any time from Profile &gt; Telegram in the app or by sending
                            /unlink to the bot. See the Privacy Policy for what is deleted.
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">6. Governing Law</h2>
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
