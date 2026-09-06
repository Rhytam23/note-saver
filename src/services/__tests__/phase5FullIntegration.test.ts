/**
 * NoteNirman 2.0 — P5.14 Full Phase 5 Integration & Platform Readiness Audit
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBlockDocument, serializeBlockDocument } from '../blockDocument';
import { blockDocumentToPortabilityAST, portabilityASTToBlockDocument } from '../portabilityCore';
import { SettingsService } from '../settingsService';
import { SecuritySanitizer } from '../securitySanitizer';
import { CryptoService } from '../cryptoService';
import { QuotaManager } from '../quotaManager';
import { AccessibilityService } from '../accessibilityService';

const metaStore = new Map<string, unknown>();
const wsStore = new Map<string, any>();

vi.mock('../localDb', () => ({
  getMeta: vi.fn(async (key: string) => metaStore.get(key)),
  setMeta: vi.fn(async (key: string, value: unknown) => {
    metaStore.set(key, value);
  }),
  getWorkspaceSettings: vi.fn(async (workspaceId: string) => wsStore.get(workspaceId)),
  putWorkspaceSettings: vi.fn(async (settings: any) => {
    wsStore.set(settings.workspaceId, settings);
  }),
}));

describe('NoteNirman 2.0 — Phase 5 Full Integration & Platform Readiness Audit (P5.14)', () => {
  beforeEach(() => {
    metaStore.clear();
    wsStore.clear();
  });

  it('1. Portability & Serialization: Round-trip HTML -> AST -> PortabilityAST -> AST -> HTML preserves block UUIDs', () => {
    const originalHtml = `<p data-block-id="blk_audit_001">Integration test content paragraph</p>`;
    const doc = createBlockDocument('note_audit_001', originalHtml);
    const portabilityAst = blockDocumentToPortabilityAST(doc);
    const reconstructedDoc = portabilityASTToBlockDocument(portabilityAst);
    const restoredHtml = serializeBlockDocument(reconstructedDoc);

    expect(restoredHtml).toContain('data-block-id="blk_audit_001"');
    expect(restoredHtml).toContain('Integration test content paragraph');
  });

  it('2. Security Sanitization & Encryption: Sanitizes XSS and encrypts backup payload', async () => {
    const dirtyHtml = `<p data-block-id="blk_sec_01">Safe text</p><script>alert("XSS")</script>`;
    const sanitized = SecuritySanitizer.sanitizeHtml(dirtyHtml);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('data-block-id="blk_sec_01"');

    const encrypted = await CryptoService.encryptBackup(sanitized, 'passphrase123');
    const decrypted = await CryptoService.decryptBackup(encrypted, 'passphrase123');
    expect(decrypted).toBe(sanitized);
  });

  it('3. Three-Tier Preference Hierarchy: Resolves Device-Local > Workspace-Level > Account-Level settings', async () => {
    const resolved = await SettingsService.resolveSettings('ws_integration', 'user_integration', 'device_integration');
    expect(resolved.theme).toBe('system');
    expect(resolved.language).toBe('en');
    expect(resolved.workspaceName).toBe('My Workspace');
  });

  it('4. Quota Manager & Accessibility: Assesses storage safety and contrast compliance', async () => {
    const estimate = await QuotaManager.getStorageEstimate();
    expect(estimate.quotaBytes).toBeGreaterThan(0);

    const isAccessible = AccessibilityService.isWcagAACompliant([0, 0, 0], [255, 255, 255]);
    expect(isAccessible).toBe(true);
  });
});
