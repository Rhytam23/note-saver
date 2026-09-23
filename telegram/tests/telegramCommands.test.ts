import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMMANDS,
  COMMAND_NAMES,
  findCommand,
  renderHelpFor,
  renderHelpOverview,
  toTelegramMenu,
} from '../bot/_shared/commands';
import { buildGenerated, buildDeployCopies, findOrphans, GENERATED_DIR } from '../scripts/sync-bot-shared.mjs';

const root = join(__dirname, '..', '..');

describe('telegram command registry', () => {
  it('has unique names that satisfy Telegram\'s rules', () => {
    const names = COMMANDS.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z0-9_]{1,32}$/);
  });

  it('stays within Telegram\'s menu limits', () => {
    const menu = toTelegramMenu();
    expect(menu.length).toBeGreaterThan(0);
    expect(menu.length).toBeLessThanOrEqual(100);
    for (const item of menu) {
      expect(item.description.length).toBeGreaterThanOrEqual(3);
      expect(item.description.length).toBeLessThanOrEqual(256);
    }
  });

  it('gives every command usage, help text and an example that starts with the command', () => {
    for (const c of COMMANDS) {
      expect(c.usage.startsWith(`/${c.name}`), c.name).toBe(true);
      expect(c.help.length, c.name).toBeGreaterThan(5);
      expect(c.example.startsWith(`/${c.name}`), c.name).toBe(true);
    }
  });

  it('includes every command the product promises', () => {
    const promised = [
      'title', 'notes', 'get', 'priority', 'pin', 'unpin', 'append', 'prepend', 'rename', 'tag', 'tags', 'search',
      'delete', 'confirm', 'cancel', 'quick', 'todo', 'tasks', 'today', 'week', 'random', 'links', 'events', 'card',
      'quiz', 'answer', 'trash', 'restore', 'undo', 'copy', 'export', 'backup', 'summarize', 'remind', 'reminders',
      'timezone', 'status', 'archive', 'unarchive', 'template', 'inbox', 'help', 'unlink', 'start', 'recent',
    ];
    for (const name of promised) expect(COMMAND_NAMES.has(name), name).toBe(true);
  });

  it('has a handler in the bot function for every command the router dispatches', () => {
    const source = readFileSync(join(root, 'telegram/bot/index.ts'), 'utf8');
    // /start and /help are answered before the linked-account check, so they have no entry in `handlers`.
    for (const c of COMMANDS.filter(c => c.name !== 'start' && c.name !== 'help')) {
      expect(new RegExp(`async ${c.name}\\(ctx\\)`).test(source), `handler for /${c.name}`).toBe(true);
    }
  });

  it('renders overview and per-command help from the same registry', () => {
    const overview = renderHelpOverview();
    for (const c of COMMANDS.filter(c => c.name !== 'start')) expect(overview).toContain(`/${c.name}`);
    expect(renderHelpFor('/priority')).toContain('/priority <high|medium|low|none>');
    expect(renderHelpFor('nonsense')).toBeNull();
    expect(findCommand('/NOTES')?.name).toBe('notes');
  });
});

describe('generated and deployable copies', () => {
  it('generated app modules match src/ (run `npm run bot:sync` if this fails)', () => {
    for (const [name, expected] of Object.entries(buildGenerated())) {
      const actual = readFileSync(join(GENERATED_DIR, name), 'utf8').replace(/\r\n/g, '\n');
      expect(actual, name).toBe(expected);
    }
  });

  it('supabase/ holds an exact copy of telegram/bot and telegram/database (run `npm run bot:sync`)', () => {
    const copies = Object.entries(buildDeployCopies());
    expect(copies.length).toBeGreaterThan(5);
    for (const [target, expected] of copies) {
      expect(existsSync(target), target).toBe(true);
      expect(readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), target).toBe(expected);
    }
    expect(findOrphans()).toEqual([]);
  });
});
