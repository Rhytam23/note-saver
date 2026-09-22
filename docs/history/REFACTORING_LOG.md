> **⚠ Superseded / historical record only — do not treat this as current.**
>
> A running log from the original mobile-refactor pass. Superseded by [docs/DECISIONS.md](../DECISIONS.md), which continues the same idea (a dated log of what changed and why) going forward.
>
> Moved here unmodified on 2026-09-22 so the reasoning trail isn't lost.

---

# Mobile Refactoring Log

## UI Optimization
- **Header**: Implemented a toggleable search bar for mobile devices. On smaller screens, the search bar is now hidden behind a search icon to save space, unfolding into a full-width input when activated.
- **Header**: Refined the title and seasonal icon layout to be more compact on mobile.
- **App.tsx**: Added state to manage search visibility and passed necessary props to the Header.

## Dependency Cleanup
- **Vercel Analytics**: Removed from `index.tsx` as it's not suitable for a standalone mobile app package.
- **Vercel SpeedInsights**: Removed from `App.tsx` for the same reason.

## Linting & Type Safety
- **Header.tsx**: Removed unsupported `eid` and `lunar_new_year` icons from the mapping to align with the core `SeasonalTheme` type.
- **App.tsx**: Fixed prop-drilling issues for the new Header search state.

- [x] Refactor AuthScreen for mobile keyboards and smaller viewports. Added padding and centered layout.
- [x] Optimized NoteEditor: Improved header navigation (added back button for mobile) and metadata stacking.
- [x] Enhanced NoteList & NoteCard: Improved touch targets for action buttons (Pin, Export, Delete) and adjusted card density.
- [x] FloatingActionButton: Adjusted for mobile safe-areas (added `.safe-bottom` CSS utility) and touch ergonomics.
- [x] Fixed Header.tsx lint errors: Correctly destructured `isSearchVisible` and `setIsSearchVisible`.
- [x] Silenced IDE `@tailwind` warnings via `.vscode/settings.json`.
- [x] Verified production build stability: `npm run build` passed successfully.
- [ ] Test on physical device/emulator.
- [ ] Implement offline-first storage sync.
