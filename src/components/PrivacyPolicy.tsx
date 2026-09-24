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
                <p className="text-sm opacity-70">Last Updated: September 24, 2026</p>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">1. Introduction</h2>
                    <p>
                        Welcome to Notenirman. We respect your privacy and are committed to protecting your personal data.
                        This privacy policy will inform you as to how we look after your personal data when you use our website,
                        our Windows and Android apps and our optional Telegram bot, and tell you about your privacy rights.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">2. Data We Collect</h2>
                    <p>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Identity Data:</strong> includes your name and email address when you sign in via Google or with email.</li>
                        <li><strong>Note Data:</strong> includes the content of your notes, tags, and images you upload.</li>
                        <li><strong>Usage Data:</strong> includes information about how you use our website.</li>
                        <li><strong>Telegram Data (only if you connect the Telegram bot):</strong> described in section 5.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">3. How We Use Your Data</h2>
                    <p>
                        We use your data only to provide the Notenirman service, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Authenticating your account.</li>
                        <li>Storing and syncing your notes across devices.</li>
                        <li>Providing AI-assisted writing features via Gemini AI.</li>
                        <li>If you connect it, letting you write and manage your notes from Telegram.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">4. Data Security</h2>
                    <p>
                        Your data is stored securely using Supabase (PostgreSQL) and is only accessible by you
                        (and, if you connect it, through the Telegram chat you linked to your account).
                        We do not sell or share your personal data with third parties for marketing purposes.
                    </p>
                    <p>
                        You can lock an individual note with its own passphrase. Its content is then encrypted on your
                        device, and neither we nor the Telegram bot can read it.
                    </p>
                </section>

                <section className="space-y-4" id="telegram">
                    <h2 className="text-2xl font-bold">5. Telegram Bot (optional)</h2>
                    <p>
                        Notenirman has an optional Telegram bot. It does nothing for you unless you choose to connect
                        it to your account. If you never connect it, nothing in this section applies to you.
                    </p>
                    <p><strong>What the bot receives and stores</strong></p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Your Telegram chat ID</strong>, linked to your Notenirman account, so the bot knows whose notes to
                            work with. This link is what &ldquo;connected&rdquo; means.
                        </li>
                        <li>
                            <strong>Your Telegram name and username</strong>, only while you are connecting. They are stored with a
                            one-time connect code so the app can show you whose Telegram account the code belongs to. The code is single
                            use and expires after 10 minutes, and expired codes are deleted automatically.
                        </li>
                        <li>
                            <strong>The messages you send to the bot</strong> in your chat with it. The bot cannot see your other Telegram
                            chats or contacts. What you send is used to run your command, and text that becomes a note is saved as a
                            note in your account, exactly as if you had typed it in the app. A message with no command is saved as a note
                            titled &ldquo;Emergency&rdquo; (see the Terms of Service for how those work).
                        </li>
                        <li>
                            <strong>Reminders you set</strong> (the reminder text and time) and your time zone, so the bot can send them.
                        </li>
                        <li>
                            <strong>Short-lived working data</strong>, such as which step you are in (for example &ldquo;waiting for the note
                            body&rdquo;), the last list of notes shown to you, and a message counter used to limit abuse (30 messages a minute).
                        </li>
                    </ul>
                    <p><strong>Where the data goes</strong></p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>
                            <strong>Telegram.</strong> Messages travel through Telegram and are stored by Telegram under its own terms and
                            privacy policy. Telegram chats with bots are not end-to-end encrypted, so Telegram can access what you send. Do
                            not send passwords, financial details or other highly sensitive information to the bot.
                        </li>
                        <li>
                            <strong>Supabase.</strong> The bot runs on, and your notes and the data above are stored in, the same Supabase
                            project that stores the rest of your account.
                        </li>
                        <li>
                            <strong>Google Gemini.</strong> Only if you use the bot&rsquo;s summarize command, the text of that one note is
                            sent to Google&rsquo;s Gemini service to produce the summary, the same as the in-app AI features.
                        </li>
                        <li>We do not sell this data or use it for advertising.</li>
                    </ul>
                    <p><strong>Locked notes</strong></p>
                    <p>
                        The bot never reads, edits, searches, exports or summarises the content of a locked note. It only shows the note&rsquo;s
                        title and a lock icon.
                    </p>
                    <p><strong>Your choices</strong></p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>
                            You can disconnect at any time from Profile &gt; Telegram in the app, or by sending /unlink to the bot. This deletes
                            the link between your chat and your account, your pending reminders and the working data above. Your notes stay in
                            your account.
                        </li>
                        <li>
                            If your Notenirman account is deleted (you can ask us to do this at the email address below), the link and your
                            reminders are deleted with it.
                        </li>
                        <li>
                            Messages that already sit in your Telegram chat history are held by Telegram; delete them in Telegram if you want them gone.
                        </li>
                    </ul>
                    <p>
                        Notenirman is an independent project and is not affiliated with, endorsed by or sponsored by Telegram.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold">6. Contact Us</h2>
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
