// This hook is obsolete and has been replaced by the ThemeContext.
// Keeping the file prevents import errors in older components, but its logic is removed
// to ensure the new, more stable theme management system is used exclusively.
export function useDarkMode() {
  // Return a dummy value that matches the old signature to avoid breaking anything
  // that might still be importing this file during transition.
  return ['light', () => {}] as const;
}
