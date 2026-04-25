import React, { useState, useRef } from 'react';
import { motion, Variants } from 'framer-motion';
import { CloseIcon, LogoutIcon, SaveIcon, SpinnerIcon, EditIcon } from './Icons';
import type { User, SeasonalTheme } from '../types';
import { useSeason } from '../contexts/SeasonalContext';
import { supabase } from '../services/supabase';
import DOMPurify from 'dompurify';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (updatedFields: Partial<User>) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
}

const backdropVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: any = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: 30, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

const themeOptions: { value: SeasonalTheme | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Automatic (Seasonal)' },
  { value: 'none', label: 'Default' },
  { value: 'winter', label: 'Winter' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'monsoon', label: 'Monsoon' },
  { value: 'diwali', label: 'Diwali' },
  { value: 'holi', label: 'Holi' },
  { value: 'pongal', label: 'Pongal' },
  { value: 'navratri', label: 'Navratri' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'new_year', label: 'New Year' },
  { value: 'independence_day_in', label: 'Independence Day (IN)' },
];

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onLogout, onUpdateUser, onUpdatePassword }) => {
  const { colors } = useSeason();
  const [name, setName] = useState(user.name || '');
  const [themePreference, setThemePreference] = useState<SeasonalTheme | 'auto'>(user.themePreference || 'auto');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const nameChanged = name.trim() !== (user.name || '');
    const themeChanged = themePreference !== (user.themePreference || 'auto');
    const passwordChanged = newPassword.length > 0;

    if (!nameChanged && !themeChanged && !passwordChanged) return;

    if (passwordChanged) {
      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      if (!currentPassword) {
        alert("Please enter your current password to save changes.");
        return;
      }
    }

    setIsSaving(true);
    try {
      if (passwordChanged) {
        // Verify current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });

        if (signInError) {
          alert("Current password is incorrect.");
          setIsSaving(false);
          return;
        }

        await onUpdatePassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        alert("Password updated successfully.");
      }

      if (nameChanged || themeChanged) {
        const updatedFields: Partial<User> = {};
        if (nameChanged) updatedFields.name = name.trim();
        if (themeChanged) updatedFields.themePreference = themePreference;
        await onUpdateUser(updatedFields);
      }

      onClose();
    } catch (error: any) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setAvatarUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await onUpdateUser({ avatarUrl: publicUrl });
    } catch (error: any) {
      if (error.message?.includes("bucket") || error.statusCode === '404') { // Simple check
        alert("Storage Bucket 'avatars' not found. Please create a Public bucket named 'avatars' in Supabase.");
      } else {
        alert("Error uploading avatar: " + (error.message || "Unknown error"));
      }
    } finally {
      setAvatarUploading(false);
      // Clear input
      if (event.target) event.target.value = '';
    }
  };

  const handleExport = async () => {
    setIsSaving(true);
    try {
      const notesString = localStorage.getItem(`Notenirman-notes-${user.id}`);
      if (!notesString) {
        alert("No notes to export.");
        setIsSaving(false);
        return;
      }

      const notes: any[] = JSON.parse(notesString);
      if (notes.length === 0) {
        alert("No notes to export.");
        setIsSaving(false);
        return;
      }

      // Dynamically import jsPDF to avoid load-time weight
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - margin * 2;

      let cursorY = margin;

      // Title for the whole document
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("My Notes", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Exported on ${new Date().toLocaleDateString()}`, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 20;

      // Helper to check page break
      const checkPageBreak = (spaceNeeded: number) => {
        if (cursorY + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
          return true;
        }
        return false;
      };

      notes.forEach((note, index) => {
        // Strip HTML securely for plain text PDF
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = DOMPurify.sanitize(note.content);
        const plainTextContent = tempDiv.textContent || tempDiv.innerText || "";

        // Note Container Page Break Check (approximate)
        checkPageBreak(60);

        // Separator
        if (index > 0) {
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 10;
        }

        // Note Title
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);

        const titleLines = doc.splitTextToSize(note.title, maxLineWidth);
        doc.text(titleLines, margin, cursorY);
        cursorY += titleLines.length * 7;

        // Metadata (Date & Tags)
        checkPageBreak(10);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const dateStr = new Date(note.createdAt).toLocaleString();
        const tagsStr = note.tags && note.tags.length > 0 ? ` | Tags: ${note.tags.join(", ")}` : "";
        doc.text(`${dateStr}${tagsStr}`, margin, cursorY);
        cursorY += 8;

        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);

        const contentLines = doc.splitTextToSize(plainTextContent, maxLineWidth);

        contentLines.forEach((line: string) => {
          checkPageBreak(7);
          doc.text(line, margin, cursorY);
          cursorY += 6;
        });

        cursorY += 15; // Spacing after note
      });

      doc.save(`Notenirman-notes-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export notes to PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = user.name ? user.name[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : '?');

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        variants={modalVariants}
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-light dark:bg-surface rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-divider-light dark:border-divider backdrop-blur-lg max-h-[90vh]"
      >
        <header className="p-4 flex items-center justify-between border-b border-divider-light dark:border-divider">
          <h2 className={`text-xl font-mono font-bold ${colors.primaryText}`}>Profile</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${colors.hover} ${colors.secondaryText}`}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-link flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden border-2 border-transparent group-hover:border-accent transition-all">
                {avatarUploading ? (
                  <SpinnerIcon className="h-8 w-8 animate-spin" />
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || 'User Avatar'} className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <EditIcon className="h-6 w-6 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <label className={`text-sm font-medium ${colors.secondaryText}`}>Email</label>
              <p className={`${colors.primaryText} mt-1`}>{user.email}</p>
            </div>
          </div>

          <div>
            <label htmlFor="name" className={`text-sm font-medium ${colors.secondaryText}`}>Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-left text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="theme" className={`text-sm font-medium ${colors.secondaryText}`}>Seasonal Theme</label>
            <select
              id="theme"
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value as SeasonalTheme | 'auto')}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-gray-900 dark:text-white"
            >
              {themeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Security Section */}
          <div className="pt-4 border-t border-divider-light dark:border-divider">
            <h3 className={`text-sm font-medium mb-3 ${colors.secondaryText}`}>Security</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password (Required for changes)"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-left text-gray-900 dark:text-white"
              />
              <div className="border-t border-divider-light dark:border-divider my-2"></div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-left text-gray-900 dark:text-white"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-left text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-divider-light dark:border-divider">
            <h3 className={`text-sm font-medium mb-3 ${colors.secondaryText}`}>Data Management</h3>
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              <SaveIcon className="h-5 w-5" />
              <span>Export All Notes (PDF)</span>
            </button>
          </div>
        </div>

        <footer className="p-4 bg-secondary-bg-light dark:bg-secondary-bg/50 border-t border-divider-light dark:border-divider flex justify-between items-center">
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 text-error hover:bg-error/10 font-semibold rounded-lg transition-colors"
          >
            <LogoutIcon className="h-5 w-5" />
            <span>Logout</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-accent text-primary-bg font-semibold rounded-lg transition-shadow duration-200 disabled:opacity-50"
          >
            {isSaving ? <SpinnerIcon className="h-5 w-5" /> : <SaveIcon className="h-5 w-5" />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};

export default ProfileModal;
