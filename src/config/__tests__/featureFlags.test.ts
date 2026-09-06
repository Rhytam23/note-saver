import { describe, it, expect, beforeEach } from 'vitest';
import { getFeatureFlags, isFeatureEnabled, setFeatureFlag, resetFeatureFlags } from '../featureFlags';

describe('Feature Flags Registry Suite', () => {

  beforeEach(() => {
    resetFeatureFlags();
  });

  it('should have all 2.0 flags disabled by default', () => {
    const flags = getFeatureFlags();
    expect(flags.BLOCK_EDITOR).toBe(false);
    expect(flags.STABLE_IDS).toBe(false);
    expect(flags.KNOWLEDGE_GRAPH).toBe(false);
    expect(flags.CANVAS).toBe(false);
    expect(flags.DATABASES).toBe(false);
    expect(flags.TASK_SYSTEM).toBe(false);
    expect(flags.COLLABORATION).toBe(false);
    expect(flags.CRDT_COLLAB).toBe(false);
    expect(flags.PDF_INTELLIGENCE).toBe(false);
    expect(flags.AUDIO_NOTES).toBe(false);
    expect(flags.AI_AGENTS).toBe(false);
  });

  it('should allow setting and querying individual feature flags', () => {
    expect(isFeatureEnabled('BLOCK_EDITOR')).toBe(false);
    setFeatureFlag('BLOCK_EDITOR', true);
    expect(isFeatureEnabled('BLOCK_EDITOR')).toBe(true);

    expect(isFeatureEnabled('KNOWLEDGE_GRAPH')).toBe(false);
    setFeatureFlag('KNOWLEDGE_GRAPH', true);
    expect(isFeatureEnabled('KNOWLEDGE_GRAPH')).toBe(true);
  });

  it('should reset flags back to conservative defaults', () => {
    setFeatureFlag('CANVAS', true);
    setFeatureFlag('DATABASES', true);
    expect(isFeatureEnabled('CANVAS')).toBe(true);

    resetFeatureFlags();
    expect(isFeatureEnabled('CANVAS')).toBe(false);
    expect(isFeatureEnabled('DATABASES')).toBe(false);
  });

});
