/**
 * NoteNirman 2.0 Feature Flag Registry
 * 
 * Safe runtime flags controlling incremental rollout of 2.0 modules.
 * Default state preserves NoteNirman 1.0 behavior (all 2.0 flags default to false).
 */

export interface FeatureFlags {
  BLOCK_EDITOR: boolean;
  STABLE_IDS: boolean;
  KNOWLEDGE_GRAPH: boolean;
  CANVAS: boolean;
  DATABASES: boolean;
  TASK_SYSTEM: boolean;
  COLLABORATION: boolean;
  CRDT_COLLAB: boolean;
  PDF_INTELLIGENCE: boolean;
  AUDIO_NOTES: boolean;
  AI_AGENTS: boolean;
}

export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  BLOCK_EDITOR: false,
  STABLE_IDS: false,
  KNOWLEDGE_GRAPH: false,
  CANVAS: false,
  DATABASES: false,
  TASK_SYSTEM: false,
  COLLABORATION: false,
  CRDT_COLLAB: false,
  PDF_INTELLIGENCE: false,
  AUDIO_NOTES: false,
  AI_AGENTS: false,
});

let currentFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

export function getFeatureFlags(): Readonly<FeatureFlags> {
  return currentFlags;
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return Boolean(currentFlags[flag]);
}

export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  currentFlags = { ...currentFlags, [flag]: enabled };
}

export function resetFeatureFlags(): void {
  currentFlags = { ...DEFAULT_FEATURE_FLAGS };
}
