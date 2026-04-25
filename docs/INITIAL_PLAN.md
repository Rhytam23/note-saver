# Initial App Transformation Plan

Project: NoteNirman Mobile App
Date: 2026-03-26

## Objective
Transform the existing React/Vite codebase into a standalone mobile-ready application within the `app/` directory.

## Strategy
1. **Isolated Workspace**: All development stays inside `app/`.
2. **Capacitor Integration**: Universal bridge for native mobile functionality.
3. **Mobile Refactoring**: 
    - Adjust UI for smaller screens.
    - Optimize touch targets.
    - Ensure offline-first considerations where possible.
4. **Build System**: Configure Vite to output to `app/dist` for Capacitor to consume.

## Immediate Steps
- [ ] Initialize Capacitor in `app/`.
- [ ] Install dependencies specifically for the `app/` workspace.
- [ ] Configure `vite.config.ts` for relative base paths.
- [ ] Build and sync with native platforms.
