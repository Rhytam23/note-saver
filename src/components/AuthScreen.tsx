import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronLeftIcon, GoogleIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

interface AuthScreenProps {
  onBackToHome: () => void;
}

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
  <div className={`flex items-center text-xs transition-colors ${isValid ? 'text-success' : 'text-secondary-text'}`}>
    {isValid ? <CheckCircleIcon className="h-4 w-4 mr-1.5" /> : <XCircleIcon className="h-4 w-4 mr-1.5" />}
    {text}
  </div>
);

const AuthScreen: React.FC<AuthScreenProps> = ({ onBackToHome }) => {
  const { colors } = useSeason();
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isResetLinkSent, setIsResetLinkSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loginWithEmail, signup, loading, resetPassword } = useAuth() as any;
  const { theme } = useTheme() as any;

  const passwordValidations = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const isPasswordStrong = Object.values(passwordValidations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Forgot Password Flow
    if (isForgotPasswordView) {
      try {
        await resetPassword(email.trim().toLowerCase());
        setIsResetLinkSent(true);
      } catch (err: any) {
        setError(err.message || 'Failed to send reset link.');
      }
      return;
    }

    // Signup Validation
    if (!isLoginView && !isPasswordStrong) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    try {
      if (isLoginView) {
        await loginWithEmail(email.trim().toLowerCase(), password);
      } else {
        await signup(name.trim(), email.trim().toLowerCase(), password);
        setIsVerificationSent(true);
        setError(null);
      }
    } catch (err: any) {
      // Improve error message for unverified email
      if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email address to log in. Check your inbox!');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      await login();
      // Google login redirects, so no need to handle success here immediately
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    }
  };

  if (isVerificationSent || isResetLinkSent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-md p-8 rounded-2xl shadow-lg border backdrop-blur-lg ${colors.bgSimple} ${colors.border} text-center`}
        >
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-success" />
            </div>
          </div>
          <h2 className={`text-2xl font-bold ${colors.primaryText} mb-4`}>
            {isResetLinkSent ? 'Check your Inbox' : 'Verify your Email'}
          </h2>
          <p className={`${colors.secondaryText} mb-6`}>
            {isResetLinkSent ? (
              <>We sent a password reset link to <span className="font-semibold text-accent">{email}</span>.</>
            ) : (
              <>We sent a confirmation link to <span className="font-semibold text-accent">{email}</span>.</>
            )}
            <br />
            {isResetLinkSent ? 'Click the link to create a new password.' : 'Please click the link in your email to activate your account.'}
          </p>

          <button
            onClick={() => {
              setIsVerificationSent(false);
              setIsResetLinkSent(false);
              setIsForgotPasswordView(false);
              setIsLoginView(true);
            }}
            className="text-link hover:underline text-sm font-medium"
          >
            Back to Log In
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative font-sans min-h-screen">
      <button
        onClick={onBackToHome}
        className={`absolute top-6 left-6 flex items-center space-x-2 ${colors.secondaryText} hover:text-accent transition-colors z-50`}
      >
        <ChevronLeftIcon className="h-6 w-6" />
        <span className="font-medium">Back</span>
      </button>

      <motion.div
        initial={{
          opacity: 0,
          y: -800,
          scaleX: 0.1,
          scaleY: 0.1,
          borderRadius: "50px"
        }}
        animate={{
          opacity: 1,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          borderRadius: "16px"
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          mass: 1,
          delay: 0
        }}
        className={`w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-lg border backdrop-blur-lg ${colors.bgSimple} ${colors.border} mt-12 sm:mt-0`}
      >
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-mono font-bold ${colors.primaryText} mb-2 flex items-center justify-center`}>
            {isForgotPasswordView ? 'Reset Password' : (isLoginView ? 'Welcome Back' : 'Join Notenirman')}
          </h1>
          <p className={colors.secondaryText}>
            {isForgotPasswordView ? 'Enter your email to receive a reset link.' : (isLoginView ? 'Sign in to access your notes.' : 'Create an account to start your journey.')}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-error/10 text-error text-sm p-3 rounded-lg mb-6 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {!isLoginView && !isForgotPasswordView && (
            <div>
              <label className={`block text-sm font-medium ${colors.secondaryText}`} htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-accent focus:border-accent text-left ${colors.surface} ${colors.border} ${colors.primaryText}`}
                required
              />
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${colors.secondaryText}`} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-accent focus:border-accent text-left ${colors.surface} ${colors.border} ${colors.primaryText}`}
              required
            />
          </div>

          {!isForgotPasswordView && (
            <div className="relative">
              <label className={`block text-sm font-medium ${colors.secondaryText}`} htmlFor="password">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-accent focus:border-accent text-left ${colors.surface} ${colors.border} ${colors.primaryText}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-9 ${colors.secondaryText}`}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          )}

          {!isLoginView && !isForgotPasswordView && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
              <PasswordRequirement isValid={passwordValidations.length} text="8+ characters" />
              <PasswordRequirement isValid={passwordValidations.uppercase} text="1 uppercase" />
              <PasswordRequirement isValid={passwordValidations.lowercase} text="1 lowercase" />
              <PasswordRequirement isValid={passwordValidations.number} text="1 number" />
              <PasswordRequirement isValid={passwordValidations.symbol} text="1 symbol" />
            </div>
          )}

          {isLoginView && !isForgotPasswordView && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordView(true);
                  setError(null);
                }}
                className="text-xs text-link hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent text-primary-bg font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isForgotPasswordView ? 'Send Reset Link' : (isLoginView ? 'Log In' : 'Sign Up'))}
          </button>

          {isForgotPasswordView && (
            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordView(false);
                setError(null);
              }}
              className={`w-full mt-2 py-2 px-4 ${colors.surface} ${colors.border} border rounded-lg ${colors.primaryText} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
            >
              Back to Log In
            </button>
          )}
        </form>

        {!isForgotPasswordView && (
          <>
            <div className="my-6 flex items-center">
              <div className={`flex-grow border-t ${colors.border}`}></div>
              <span className={`mx-4 text-xs ${colors.secondaryText}`}>OR</span>
              <div className={`flex-grow border-t ${colors.border}`}></div>
            </div>

            <button
              onClick={handleGoogleAuth}
              className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </button>

            <p className="mt-8 text-center text-sm">
              <span className={colors.secondaryText}>{isLoginView ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                onClick={() => {
                  setIsLoginView(!isLoginView);
                  setError(null);
                }}
                className="ml-1 font-semibold text-link hover:underline"
              >
                {isLoginView ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </>
        )}

        <p className="mt-4 text-center text-xs text-secondary-text opacity-70">
          Protected by Supabase Authentication. <br />
          Your data is secure and private.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
