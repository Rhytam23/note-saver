import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { ChevronLeftIcon, CheckCircleIcon, MailIcon } from './Icons';

const EmailVerification: React.FC = () => {
  const { colors } = useSeason();
  const { pushPath, query } = useRouter();
  const [resent, setResent] = useState(false);
  const email = query.email || 'your registered email';

  const handleResend = () => {
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans ${colors.bgSimple}`}>
      <button
        onClick={() => pushPath('/login')}
        className={`absolute top-6 left-6 flex items-center space-x-2 ${colors.secondaryText} hover:text-accent transition-colors`}
      >
        <ChevronLeftIcon className="h-6 w-6" />
        <span className="font-medium">Back to Login</span>
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-md p-8 rounded-2xl shadow-xl border backdrop-blur-lg ${colors.surface} ${colors.border} text-center space-y-6`}
      >
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
            <MailIcon className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className={`text-2xl font-serif font-bold ${colors.primaryText}`}>
            Verify Your Email
          </h1>
          <p className={`text-sm ${colors.secondaryText}`}>
            We sent a verification link to <span className="font-semibold text-accent">{email}</span>.
            <br />
            Please click the link in your inbox to confirm your account and start using NoteNirman.
          </p>
        </div>

        {resent && (
          <div className="p-3 bg-success/10 text-success text-xs font-semibold rounded-lg flex items-center justify-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-success" />
            <span>Verification email re-sent successfully!</span>
          </div>
        )}

        <div className="pt-2 flex flex-col space-y-3">
          <button
            onClick={() => pushPath('/login')}
            className="w-full py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all text-sm shadow-md"
          >
            Go to Log In
          </button>
          <button
            onClick={handleResend}
            disabled={resent}
            className={`w-full py-2.5 border ${colors.border} ${colors.primaryText} ${colors.hover} text-xs font-semibold rounded-xl transition-all disabled:opacity-50`}
          >
            {resent ? 'Email Sent' : "Didn't receive email? Resend link"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
