import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, XCircleIcon } from './Icons';

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
  <div className={`flex items-center text-xs transition-colors ${isValid ? 'text-success' : 'text-secondary-text'}`}>
    {isValid ? <CheckCircleIcon className="h-4 w-4 mr-1.5" /> : <XCircleIcon className="h-4 w-4 mr-1.5" />}
    {text}
  </div>
);

const PasswordReset: React.FC = () => {
  const { colors } = useSeason();
  const { pushPath } = useRouter();
  const { updatePassword } = useAuth() as any;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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

    if (!isPasswordStrong) {
      setError('Password does not meet all requirement criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (updatePassword) {
        await updatePassword(password);
      } else {
        // Fallback supabase update
        const { supabase } = await import('../services/supabase');
        const { error: resetErr } = await supabase.auth.updateUser({ password });
        if (resetErr) throw resetErr;
      }
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl border backdrop-blur-lg ${colors.surface} ${colors.border}`}
      >
        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <h2 className={`text-2xl font-bold ${colors.primaryText}`}>Password Reset Complete</h2>
            <p className={`text-sm ${colors.secondaryText}`}>
              Your password has been successfully updated. You can now log in with your new password.
            </p>
            <button
              onClick={() => pushPath('/login')}
              className="w-full py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all text-sm shadow-md"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className={`text-2xl font-bold font-mono ${colors.primaryText}`}>Create New Password</h1>
              <p className={`text-xs ${colors.secondaryText}`}>
                Please enter and confirm your new secure password.
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-error/10 text-error text-xs p-3 rounded-lg text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className={`block text-xs font-semibold ${colors.secondaryText} mb-1`}>New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-accent focus:border-accent text-sm ${colors.surface} ${colors.border} ${colors.primaryText}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-8 ${colors.secondaryText}`}
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${colors.secondaryText} mb-1`}>Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-accent focus:border-accent text-sm ${colors.surface} ${colors.border} ${colors.primaryText}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                <PasswordRequirement isValid={passwordValidations.length} text="8+ characters" />
                <PasswordRequirement isValid={passwordValidations.uppercase} text="1 uppercase" />
                <PasswordRequirement isValid={passwordValidations.lowercase} text="1 lowercase" />
                <PasswordRequirement isValid={passwordValidations.number} text="1 number" />
                <PasswordRequirement isValid={passwordValidations.symbol} text="1 symbol" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all text-sm shadow-md disabled:opacity-50 mt-4"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PasswordReset;
