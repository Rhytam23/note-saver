// @ts-nocheck
// Telegram bot webhook for NoteNirman.
//
// Deploy with --no-verify-jwt: Telegram does not send a Supabase JWT. Requests
// are authenticated instead by the secret token Telegram echoes in the
// X-Telegram-Bot-Api-Secret-Token header (set when the webhook is registered),
// and the reminder scheduler by X-Cron-Secret.
//
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, CRON_SECRET (reminders),
// GEMINI_API_KEY (already used by gemini-proxy; only for /summarize).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
//
// SECURITY: this uses the service-role key, which BYPASSES RLS. Every query on
// public.notes below is therefore scoped with .eq('user_id', <linked user>).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { COMMAND_NAMES, findCommand, renderHelpOverview, renderHelpFor } from './_shared/commands.ts';
import {
  ARCHIVE_TAG, FLASHCARDS_TITLE, INBOX_TITLE, PAGE_SIZE,
  appendTask, applyFilter, extractOpenTasks, formatNoteLine, isArchived, joinHtml, matchTitle,
  normalisePriority, normaliseTag, paginate, parseListArgs, parseTarget, pickByNumber,
  priorityLabel, sortNotes, stampedLine, withTag, withoutTag, isLocked,
} from './_shared/notesLogic.ts';
import {
  MAX_BODY, MAX_TITLE, chunkText, escapeHtml, escapeLike, htmlToMarkdown, htmlToText, maskEmail,
  sanitizeFilename, snippet, textToHtml, timingSafeEqual, titleFromText,
} from './_shared/text.ts';
import { formatLocal, isValidTimezone, parseWhen, startOfLocalDay } from './_shared/reminderTime.ts';
import { checkRate } from './_shared/rateLimit.ts';
import { PAIRING_TTL_MS, codeFromBytes, formatCode } from './_shared/pairing.ts';
import { extractAllFlashcards } from './_shared/generated/flashcards.ts';
import { findBacklinks, resolveOutgoingLinks } from './_shared/generated/noteLinks.ts';
import { NOTE_TEMPLATES } from './_shared/generated/noteTemplates.ts';
import { LOCK_PREFIX } from './_shared/generated/lockPrefix.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GEMINI_MODEL = 'gemini-2.5-flash'; // same model as gemini-proxy

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const LIST_COLS = 'id,title,tags,is_pinned,priority,created_at,updated_at,deleted_at';
const MAX_PENDING_REMINDERS = 50;
const TRASH_DAYS = 30;
// Commands that must not discard a half-finished multi-step command.
const KEEP_STATE = new Set(['priority', 'help', 'confirm', 'cancel', 'status']);

// ---------------------------------------------------------------- Telegram

async function send(chatId, text) {
  for (const part of chunkText(text)) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Plain text (no parse_mode): note content can never break formatting.
      body: JSON.stringify({ chat_id: chatId, text: part, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('sendMessage failed', res.status, await res.text());
  }
}

async function sendDocument(chatId, filename, content, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption.slice(0, 900));
  form.append('document', new Blob([content], { type: 'text/markdown' }), filename);
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: form });
  if (!res.ok) console.error('sendDocument failed', res.status, await res.text());
}

// ---------------------------------------------------------------- sessions

async function getSession(chatId) {
  const { data } = await sb.from('telegram_sessions').select('*').eq('chat_id', chatId).maybeSingle();
  return data ?? { chat_id: chatId, state: 'idle', rate_count: 0 };
}

async function setSession(ctx, patch) {
  Object.assign(ctx.session, patch);
  const { error } = await sb.from('telegram_sessions').upsert({
    chat_id: ctx.chatId,
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('session write failed', error);
}

const IDLE = { state: 'idle', pending_title: null, pending_priority: null, target_note_id: null };
const rememberList = (ctx, ids) => setSession(ctx, { last_list: { ids: ids.slice(0, 200), at: Date.now() } });

// ------------------------------------------------------------------- notes

async function fetchLockedIds(userId) {
  const { data } = await sb.from('notes').select('id').eq('user_id', userId).like('content', `${LOCK_PREFIX}%`);
  return new Set((data ?? []).map((r) => r.id));
}

/** Lists (no content). deleted=true returns the trash instead. */
async function fetchNotes(userId, { deleted = false } = {}) {
  const { data, error } = await sb
    .from('notes').select(LIST_COLS)
    .eq('user_id', userId).eq('deleted', deleted)
    .order('updated_at', { ascending: false }).limit(1000);
  if (error) throw error;
  const locked = await fetchLockedIds(userId);
  return (data ?? []).map((n) => ({ ...n, tags: n.tags ?? [], is_pinned: !!n.is_pinned, locked: locked.has(n.id) }));
}

/** One note WITH content. */
async function fetchOne(userId, id, deleted = false) {
  const { data } = await sb
    .from('notes').select(`${LIST_COLS},content,version`)
    .eq('id', id).eq('user_id', userId).eq('deleted', deleted).maybeSingle();
  if (!data) return null;
  return { ...data, tags: data.tags ?? [], is_pinned: !!data.is_pinned, locked: isLocked(data.content) };
}

/** Every live note WITH content (capped), for search/tasks/quiz/links/backup. */
async function fetchAllWithContent(userId) {
  const { data, error } = await sb
    .from('notes').select(`${LIST_COLS},content`)
    .eq('user_id', userId).eq('deleted', false)
    .order('updated_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((n) => ({ ...n, tags: n.tags ?? [], is_pinned: !!n.is_pinned, locked: isLocked(n.content) }));
}

async function insertNote(userId, { title, content = '', tags = [], priority = 'none', is_pinned = false }) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const { error } = await sb.from('notes').insert({
    id, user_id: userId,
    title: (title || 'Untitled').slice(0, MAX_TITLE),
    content, tags, is_pinned, priority,
    created_at: now, updated_at: now,
    version: 1, deleted: false, deleted_at: null,
  });
  if (error) throw error;
  return id;
}

// UPDATEs never set version/updated_at: the notes_bump_version trigger owns both,
// which is what makes every other device pick the change up.
async function updateNote(userId, id, patch) {
  const { error } = await sb.from('notes').update(patch).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Read-modify-write on content, guarded by the version we read, retried once. */
async function editContent(userId, id, transform) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const note = await fetchOne(userId, id);
    if (!note) return { ok: false, reason: 'missing' };
    if (note.locked) return { ok: false, reason: 'locked', note };
    const { data, error } = await sb
      .from('notes').update({ content: transform(note.content ?? '') })
      .eq('id', id).eq('user_id', userId).eq('version', note.version).select('id');
    if (error) throw error;
    if (data?.length) return { ok: true, note };
  }
  return { ok: false, reason: 'conflict' };
}

/** Find a note by exact title (case-insensitive) or create it. Used for Inbox and Flashcards. */
async function ensureNote(userId, title, { create = true } = {}) {
  const { data } = await sb
    .from('notes').select('id').eq('user_id', userId).eq('deleted', false)
    .ilike('title', escapeLike(title)).order('updated_at', { ascending: false }).limit(1);
  if (data?.length) return data[0].id;
  return create ? insertNote(userId, { title, content: '' }) : null;
}

const noteHeader = (n) =>
  `${n.is_pinned ? '📌 ' : ''}${n.title?.trim() || '(untitled)'}\n` +
  `${priorityLabel(n.priority)}${n.tags?.length ? '  ' + n.tags.map((t) => '#' + t).join(' ') : ''}`;

async function presentNote(ctx, note) {
  if (note.locked) {
    await send(ctx.chatId, `🔒 "${note.title}" is a locked note. Open it in the NoteNirman app to read it.`);
    return;
  }
  const body = htmlToText(note.content ?? '');
  await send(ctx.chatId, `${noteHeader(note)}\n\n${body || '(empty note)'}`);
}

// ---------------------------------------------------------- target lookup

/**
 * Resolves "3" (from the last list) or a title to a note, replying to the user
 * itself when it can't. Returns null after replying.
 */
async function resolveNote(ctx, arg, { deleted = false, useLast = true } = {}) {
  const target = parseTarget(arg);

  if (target.kind === 'none') {
    if (useLast && ctx.session.last_viewed_id) {
      const last = await fetchOne(ctx.userId, ctx.session.last_viewed_id, deleted);
      if (last) return last;
    }
    await send(ctx.chatId, 'Which note? Send a number from /notes, or part of its title.');
    return null;
  }

  let id;
  if (target.kind === 'number') {
    const pick = pickByNumber(ctx.session.last_list ?? null, target.n, Date.now());
    if (!pick.ok) {
      const why = {
        'no-list': 'I have no list yet. Send /notes first, then use a number.',
        expired: 'That list is out of date. Send /notes again, then use a number.',
        range: `There is no number ${target.n} in the last list.`,
      }[pick.reason];
      await send(ctx.chatId, why);
      return null;
    }
    id = pick.id;
  } else {
    const { data } = await sb
      .from('notes').select(LIST_COLS)
      .eq('user_id', ctx.userId).eq('deleted', deleted)
      .ilike('title', `%${escapeLike(target.text)}%`)
      .order('updated_at', { ascending: false }).limit(20);
    const match = matchTitle(data ?? [], target.text);
    if (match.kind === 'none') {
      await send(ctx.chatId, `No note found with "${target.text}" in the title.`);
      return null;
    }
    if (match.kind === 'many') {
      const locked = await fetchLockedIds(ctx.userId);
      const list = match.notes.map((n, i) => formatNoteLine(i + 1, { ...n, tags: n.tags ?? [], locked: locked.has(n.id) }));
      await rememberList(ctx, match.notes.map((n) => n.id));
      await send(ctx.chatId, `Several notes match. Send the command again with a number:\n\n${list.join('\n')}`);
      return null;
    }
    id = match.note.id;
  }

  const note = await fetchOne(ctx.userId, id, deleted);
  if (!note) {
    await send(ctx.chatId, 'That note no longer exists. Send /notes to refresh the list.');
    return null;
  }
  await setSession(ctx, { last_viewed_id: note.id });
  return note;
}

async function showList(ctx, heading, notes, { hint } = {}) {
  if (!notes.length) {
    await send(ctx.chatId, `${heading}\n\nNothing here.`);
    return;
  }
  await rememberList(ctx, notes.map((n) => n.id));
  const lines = notes.slice(0, 40).map((n, i) => formatNoteLine(i + 1, n));
  await send(ctx.chatId, `${heading}\n\n${lines.join('\n')}${hint ? `\n\n${hint}` : ''}`);
}

// ---------------------------------------------------------------- handlers

const handlers = {
  async title(ctx) {
    const title = ctx.arg.slice(0, MAX_TITLE);
    if (!title) {
      await setSession(ctx, { ...IDLE, state: 'awaiting_title' });
      await send(ctx.chatId, 'What is the title?');
      return;
    }
    await setSession(ctx, { ...IDLE, state: 'awaiting_body', pending_title: title });
    await send(ctx.chatId, `Title: "${title}"\n\nNow send the body (or /priority high first, or /cancel).`);
  },

  async quick(ctx) {
    if (!ctx.arg) return send(ctx.chatId, 'Send the text after the command: /quick Buy graph paper');
    const title = titleFromText(ctx.arg);
    await insertNote(ctx.userId, { title, content: textToHtml(ctx.arg.slice(0, MAX_BODY)) });
    await send(ctx.chatId, `Saved "${title}".`);
  },

  async template(ctx) {
    if (!ctx.arg) {
      const lines = NOTE_TEMPLATES.map((t, i) => `${i + 1}. ${t.name} - ${t.description}`);
      return send(ctx.chatId, `Templates:\n\n${lines.join('\n')}\n\nCreate one with /template <number or name>.`);
    }
    const q = ctx.arg.toLowerCase();
    const byNumber = /^\d+$/.test(q) ? NOTE_TEMPLATES[parseInt(q, 10) - 1] : null;
    const tpl = byNumber ?? NOTE_TEMPLATES.find((t) => t.id === q || t.name.toLowerCase().includes(q));
    if (!tpl) return send(ctx.chatId, 'No template matches that. Send /template to see the list.');
    await insertNote(ctx.userId, { title: tpl.title, content: tpl.content, tags: [...tpl.tags] });
    await send(ctx.chatId, `Created "${tpl.title}" from the ${tpl.name} template. Fill it in from the app, or use /append.`);
  },

  async inbox(ctx) {
    if (!ctx.arg) {
      const id = await ensureNote(ctx.userId, INBOX_TITLE, { create: false });
      const note = id ? await fetchOne(ctx.userId, id) : null;
      if (!note) return send(ctx.chatId, 'Your Inbox is empty. Add to it with /inbox <text> or /todo <task>.');
      return presentNote(ctx, note);
    }
    const id = await ensureNote(ctx.userId, INBOX_TITLE);
    const line = stampedLine(ctx.arg.slice(0, 2000), formatLocal(new Date(), ctx.tz));
    const r = await editContent(ctx.userId, id, (c) => joinHtml(c, textToHtml(line), 'end'));
    await send(ctx.chatId, r.ok ? 'Added to your Inbox.' : editFailure(r));
  },

  async notes(ctx) {
    const { filter, page } = parseListArgs(ctx.arg);
    const all = sortNotes(applyFilter(await fetchNotes(ctx.userId), filter));
    const p = paginate(all, page);
    if (!all.length) {
      return send(ctx.chatId, filter.kind === 'all' ? 'No notes yet. Start one with /title.' : 'No notes match that filter.');
    }
    await rememberList(ctx, all.map((n) => n.id));
    const label = filter.kind === 'all' ? 'all' : filter.kind === 'tag' || filter.kind === 'priority' ? filter.value : filter.kind;
    const lines = p.slice.map((n, i) => formatNoteLine(p.offset + i + 1, n));
    const more = p.page < p.pages ? `\n\n/notes ${label === 'all' ? '' : label + ' '}${p.page + 1} for the next page.` : '';
    await send(ctx.chatId,
      `Notes (${label}) - page ${p.page}/${p.pages}, ${all.length} total\n\n${lines.join('\n')}${more}\n\nUse a number with /get, /pin, /priority, /delete.`);
  },

  async recent(ctx) {
    const notes = (await fetchNotes(ctx.userId)).filter((n) => !isArchived(n)).slice(0, 5);
    await showList(ctx, 'Recently changed', notes, { hint: 'Use a number with /get.' });
  },

  async get(ctx) {
    const note = await resolveNote(ctx, ctx.arg, { useLast: false });
    if (note) await presentNote(ctx, note);
  },

  async search(ctx) {
    const q = ctx.arg.trim();
    if (q.length < 2) return send(ctx.chatId, 'Search for what? /search photosynthesis');
    const lower = q.toLowerCase();
    const hits = [];
    for (const n of await fetchAllWithContent(ctx.userId)) {
      if (isArchived(n)) continue;
      const text = n.locked ? '' : htmlToText(n.content ?? '');
      const inTitle = (n.title ?? '').toLowerCase().includes(lower);
      if (inTitle || text.toLowerCase().includes(lower)) hits.push({ n, text, inTitle });
    }
    if (!hits.length) return send(ctx.chatId, `Nothing found for "${q}".`);
    hits.sort((a, b) => Number(b.inTitle) - Number(a.inTitle));
    const top = hits.slice(0, 15);
    await rememberList(ctx, top.map((h) => h.n.id));
    const lines = top.map((h, i) => `${formatNoteLine(i + 1, h.n)}${h.text ? `\n   ${snippet(h.text, q)}` : ''}`);
    await send(ctx.chatId, `${hits.length} result(s) for "${q}"\n\n${lines.join('\n')}\n\nUse a number with /get.`);
  },

  async today(ctx) {
    const cut = startOfLocalDay(new Date(), ctx.tz).toISOString();
    const notes = sortNotes((await fetchNotes(ctx.userId)).filter((n) => !isArchived(n) && n.updated_at >= cut));
    await showList(ctx, 'Changed today', notes);
  },

  async week(ctx) {
    const cut = new Date(Date.now() - 7 * 86400000).toISOString();
    const notes = (await fetchNotes(ctx.userId)).filter((n) => !isArchived(n) && n.updated_at >= cut);
    await showList(ctx, 'Changed in the last 7 days', notes);
  },

  async random(ctx) {
    const pool = (await fetchNotes(ctx.userId)).filter((n) => !n.locked && !isArchived(n));
    if (!pool.length) return send(ctx.chatId, 'No notes to pick from yet.');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const note = await fetchOne(ctx.userId, pick.id);
    if (!note) return send(ctx.chatId, 'Try again.');
    await setSession(ctx, { last_viewed_id: note.id });
    await presentNote(ctx, note);
  },

  async tags(ctx) {
    const counts = new Map();
    for (const n of await fetchNotes(ctx.userId)) {
      for (const t of n.tags) if (t.toLowerCase() !== ARCHIVE_TAG) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    if (!counts.size) return send(ctx.chatId, 'No tags yet. Add one with /tag <tag> <note>.');
    const lines = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `#${t} (${c})`);
    await send(ctx.chatId, `Tags\n\n${lines.join('\n')}\n\nSee one with /notes <tag>.`);
  },

  async links(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    const all = (await fetchAllWithContent(ctx.userId)).map((n) => ({ ...n, deleted: false }));
    const self = all.find((n) => n.id === note.id) ?? { ...note, deleted: false };
    const out = resolveOutgoingLinks(self, all);
    const back = findBacklinks(self, all);
    const outLines = out.map((l) => `  ${l.target ? '→' : '?'} ${l.title}${l.target ? '' : ' (no such note yet)'}`);
    const backLines = back.map((n) => `  ← ${n.title}`);
    await send(ctx.chatId,
      `Links for "${note.title}"\n\nLinks to:\n${outLines.join('\n') || '  (none)'}\n\nLinked from:\n${backLines.join('\n') || '  (none)'}`);
  },

  async priority(ctx) {
    const [first, ...rest] = ctx.arg.split(/\s+/).filter(Boolean);
    const priority = first ? normalisePriority(first) : null;
    if (!priority) return send(ctx.chatId, 'Use: /priority <high|medium|low|none> [number|title]');
    const targetArg = rest.join(' ');
    if (!targetArg && ctx.session.state === 'awaiting_body') {
      await setSession(ctx, { pending_priority: priority });
      return send(ctx.chatId, `Priority set to ${priority}. Now send the body.`);
    }
    const note = await resolveNote(ctx, targetArg);
    if (!note) return;
    await updateNote(ctx.userId, note.id, { priority });
    await send(ctx.chatId, `"${note.title}" is now ${priorityLabel(priority)}.`);
  },

  async pin(ctx) { await togglePin(ctx, true); },
  async unpin(ctx) { await togglePin(ctx, false); },

  async append(ctx) { await beginEdit(ctx, 'awaiting_append', 'What should I add to the end?'); },
  async prepend(ctx) { await beginEdit(ctx, 'awaiting_prepend', 'What should I add to the start?'); },

  async rename(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    await setSession(ctx, { ...IDLE, state: 'awaiting_rename', target_note_id: note.id, last_viewed_id: note.id });
    await send(ctx.chatId, `Send the new title for "${note.title}" (or /cancel).`);
  },

  async tag(ctx) {
    const [first, ...rest] = ctx.arg.split(/\s+/).filter(Boolean);
    const tag = first ? normaliseTag(first) : null;
    if (!tag) return send(ctx.chatId, 'Use: /tag <tag> [number|title]   (a tag is one word)');
    const note = await resolveNote(ctx, rest.join(' '));
    if (!note) return;
    await updateNote(ctx.userId, note.id, { tags: withTag(note.tags, tag) });
    await send(ctx.chatId, `Tagged "${note.title}" with #${tag}.`);
  },

  async archive(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    await updateNote(ctx.userId, note.id, { tags: withTag(note.tags, ARCHIVE_TAG) });
    await send(ctx.chatId, `Archived "${note.title}". /notes archived shows archived notes.`);
  },

  async unarchive(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    await updateNote(ctx.userId, note.id, { tags: withoutTag(note.tags, ARCHIVE_TAG) });
    await send(ctx.chatId, `"${note.title}" is back in your lists.`);
  },

  async copy(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    if (note.locked) return send(ctx.chatId, `"${note.title}" is locked and cannot be copied from here.`);
    await insertNote(ctx.userId, {
      title: `${note.title} (copy)`, content: note.content ?? '', tags: note.tags, priority: note.priority ?? 'none',
    });
    await send(ctx.chatId, `Created "${note.title} (copy)".`);
  },

  async todo(ctx) {
    if (!ctx.arg) return send(ctx.chatId, 'What is the task? /todo Finish worksheet');
    const id = await ensureNote(ctx.userId, INBOX_TITLE);
    const r = await editContent(ctx.userId, id, (c) => appendTask(c, ctx.arg.slice(0, 500)));
    await send(ctx.chatId, r.ok ? 'Task added to your Inbox.' : editFailure(r));
  },

  async tasks(ctx) {
    const groups = [];
    let total = 0;
    for (const n of await fetchAllWithContent(ctx.userId)) {
      if (n.locked || isArchived(n)) continue;
      const open = extractOpenTasks(n.content ?? '');
      if (open.length) { groups.push({ title: n.title, open }); total += open.length; }
    }
    if (!groups.length) return send(ctx.chatId, 'No open tasks. 🎉');
    let shown = 0;
    const lines = [];
    for (const g of groups) {
      lines.push(g.title?.trim() || '(untitled)');
      for (const t of g.open) {
        if (shown >= 40) break;
        lines.push(`  ☐ ${t}`);
        shown++;
      }
      if (shown >= 40) break;
    }
    if (total > shown) lines.push(`\n...and ${total - shown} more.`);
    await send(ctx.chatId, `Open tasks (${total})\n\n${lines.join('\n')}`);
  },

  async card(ctx) {
    const at = ctx.arg.indexOf('::');
    const q = at > 0 ? ctx.arg.slice(0, at).trim() : '';
    const a = at > 0 ? ctx.arg.slice(at + 2).trim() : '';
    if (!q || !a) return send(ctx.chatId, 'Use: /card <question> :: <answer>');
    const id = await ensureNote(ctx.userId, FLASHCARDS_TITLE);
    const line = `<p>${escapeHtml(q)}:: ${escapeHtml(a)}</p>`;
    const r = await editContent(ctx.userId, id, (c) => joinHtml(c, line, 'end'));
    await send(ctx.chatId, r.ok ? 'Flashcard added.' : editFailure(r));
  },

  async quiz(ctx) {
    const notes = (await fetchAllWithContent(ctx.userId))
      .filter((n) => !n.locked && !isArchived(n))
      .map((n) => ({ ...n, deleted: false }));
    const cards = extractAllFlashcards(notes);
    if (!cards.length) return send(ctx.chatId, 'No flashcards yet. Add one with /card <question> :: <answer>.');
    const card = cards[Math.floor(Math.random() * cards.length)];
    await setSession(ctx, { quiz_question: card.question, quiz_answer: card.answer });
    await send(ctx.chatId, `❓ ${card.question}\n\n(from "${card.noteTitle}") Send /answer to reveal.`);
  },

  async answer(ctx) {
    if (!ctx.session.quiz_answer) return send(ctx.chatId, 'No open question. Send /quiz first.');
    const a = ctx.session.quiz_answer;
    await setSession(ctx, { quiz_question: null, quiz_answer: null });
    await send(ctx.chatId, `✅ ${a}`);
  },

  async events(ctx) {
    const now = new Date();
    const { data, error } = await sb
      .from('calendar_events').select('title,start_at,is_all_day,status')
      .eq('user_id', ctx.userId).eq('is_deleted', false)
      .gte('start_at', now.toISOString()).lte('start_at', new Date(now.getTime() + 7 * 86400000).toISOString())
      .order('start_at', { ascending: true }).limit(20);
    if (error) { console.error('events failed', error); return send(ctx.chatId, 'Could not read your calendar.'); }
    if (!data?.length) return send(ctx.chatId, 'No events in the next 7 days.');
    const lines = data.map((e) => {
      const when = formatLocal(new Date(e.start_at), ctx.tz);
      return `${e.is_all_day ? when.slice(0, 10) + ' (all day)' : when}  ${e.title}`;
    });
    await send(ctx.chatId, `Next 7 days (${ctx.tz})\n\n${lines.join('\n')}`);
  },

  async remind(ctx) {
    if (!ctx.arg) return send(ctx.chatId, renderHelpFor('remind'));
    const parsed = parseWhen(ctx.arg, new Date(), ctx.tz);
    if (!parsed) {
      return send(ctx.chatId, 'I could not understand that time, or it is in the past.\nTry: /remind in 2h call mom   or   /remind tomorrow 9am revise');
    }
    if (!parsed.text) return send(ctx.chatId, 'What should I remind you about? /remind tomorrow 9am revise chapter 3');
    const { count } = await sb.from('telegram_reminders').select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId).eq('sent', false);
    if ((count ?? 0) >= MAX_PENDING_REMINDERS) {
      return send(ctx.chatId, `You already have ${MAX_PENDING_REMINDERS} pending reminders. Cancel some with /reminders.`);
    }
    const { error } = await sb.from('telegram_reminders').insert({
      user_id: ctx.userId, chat_id: ctx.chatId, body: parsed.text.slice(0, 500), due_at: parsed.due.toISOString(),
    });
    if (error) throw error;
    await send(ctx.chatId, `⏰ Reminder set for ${formatLocal(parsed.due, ctx.tz)} (${ctx.tz}):\n${parsed.text}`);
  },

  async reminders(ctx) {
    const { data } = await sb.from('telegram_reminders').select('id,body,due_at')
      .eq('user_id', ctx.userId).eq('sent', false).order('due_at', { ascending: true }).limit(MAX_PENDING_REMINDERS);
    const list = data ?? [];
    const cancel = ctx.arg.match(/^cancel\s+(\d+)$/i);
    if (cancel) {
      const item = list[parseInt(cancel[1], 10) - 1];
      if (!item) return send(ctx.chatId, 'No reminder with that number. Send /reminders to see them.');
      await sb.from('telegram_reminders').delete().eq('id', item.id).eq('user_id', ctx.userId);
      return send(ctx.chatId, `Cancelled: ${item.body}`);
    }
    if (!list.length) return send(ctx.chatId, 'No pending reminders. Set one with /remind.');
    const lines = list.map((r, i) => `${i + 1}. ${formatLocal(new Date(r.due_at), ctx.tz)}  ${r.body}`);
    await send(ctx.chatId, `Pending reminders (${ctx.tz})\n\n${lines.join('\n')}\n\n/reminders cancel <number> removes one.`);
  },

  async timezone(ctx) {
    if (!ctx.arg) return send(ctx.chatId, `Your timezone is ${ctx.tz}. Change it with /timezone Asia/Kolkata`);
    if (!isValidTimezone(ctx.arg)) return send(ctx.chatId, 'That is not a valid timezone. Use a name like Asia/Kolkata or Europe/London.');
    await sb.from('telegram_links').update({ timezone: ctx.arg }).eq('user_id', ctx.userId);
    ctx.tz = ctx.arg;
    await send(ctx.chatId, `Timezone set to ${ctx.arg}. Local time now: ${formatLocal(new Date(), ctx.arg)}`);
  },

  async delete(ctx) {
    const note = await resolveNote(ctx, ctx.arg, { useLast: false });
    if (!note) return;
    await setSession(ctx, { ...IDLE, state: 'awaiting_delete_confirm', target_note_id: note.id });
    await send(ctx.chatId, `Delete "${note.title}"? Send /confirm to delete it (you can /undo later) or /cancel.`);
  },

  async confirm(ctx) {
    if (ctx.session.state !== 'awaiting_delete_confirm' || !ctx.session.target_note_id) {
      return send(ctx.chatId, 'Nothing to confirm.');
    }
    const note = await fetchOne(ctx.userId, ctx.session.target_note_id);
    await setSession(ctx, IDLE);
    if (!note) return send(ctx.chatId, 'That note no longer exists.');
    await updateNote(ctx.userId, note.id, { deleted: true, deleted_at: new Date().toISOString() });
    await send(ctx.chatId, `Deleted "${note.title}". Send /undo to bring it back.`);
  },

  async trash(ctx) {
    const cutoff = Date.now() - TRASH_DAYS * 86400000;
    const gone = (await fetchNotes(ctx.userId, { deleted: true }))
      .filter((n) => new Date(n.deleted_at ?? n.updated_at).getTime() >= cutoff)
      .sort((a, b) => (b.deleted_at ?? b.updated_at).localeCompare(a.deleted_at ?? a.updated_at));
    await showList(ctx, `Trash (last ${TRASH_DAYS} days)`, gone, { hint: 'Bring one back with /restore <number>.' });
  },

  async restore(ctx) {
    if (!ctx.arg) return handlers.undo(ctx);
    const note = await resolveNote(ctx, ctx.arg, { deleted: true, useLast: false });
    if (note) await restoreNote(ctx, note);
  },

  async undo(ctx) {
    const { data } = await sb.from('notes').select('id')
      .eq('user_id', ctx.userId).eq('deleted', true).order('deleted_at', { ascending: false, nullsFirst: false }).limit(1);
    const note = data?.length ? await fetchOne(ctx.userId, data[0].id, true) : null;
    if (!note) return send(ctx.chatId, 'Nothing to restore.');
    await restoreNote(ctx, note);
  },

  async export(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    if (note.locked) return send(ctx.chatId, `"${note.title}" is locked and cannot be exported from here.`);
    await sendDocument(ctx.chatId, `${sanitizeFilename(note.title)}.md`, noteToMarkdown(note), `Export: ${note.title}`);
  },

  async backup(ctx) {
    const all = await fetchAllWithContent(ctx.userId);
    if (!all.length) return send(ctx.chatId, 'No notes to back up.');
    const locked = all.filter((n) => n.locked).length;
    const body = all.map((n) => (n.locked ? `# ${n.title}\n\n(locked note - content not included)` : noteToMarkdown(n))).join('\n\n---\n\n');
    await sendDocument(ctx.chatId, `notenirman-backup-${new Date().toISOString().slice(0, 10)}.md`, body,
      `${all.length} notes${locked ? `, ${locked} locked (titles only)` : ''}.`);
  },

  async summarize(ctx) {
    const note = await resolveNote(ctx, ctx.arg);
    if (!note) return;
    if (note.locked) return send(ctx.chatId, `"${note.title}" is locked, so I will not send it anywhere.`);
    const text = htmlToText(note.content ?? '').slice(0, 12000);
    if (!text) return send(ctx.chatId, 'That note is empty.');
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return send(ctx.chatId, 'AI summaries are not set up on this server.');
    await send(ctx.chatId, 'Summarising...');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Summarise this note in at most 120 words, as short bullet points. Do not add facts that are not in it.\n\n${text}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const json = await res.json();
      const out = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim();
      await send(ctx.chatId, out ? `Summary of "${note.title}"\n\n${out}` : 'The AI returned nothing. Try again.');
    } catch (err) {
      console.error('summarize failed', err);
      await send(ctx.chatId, 'The AI summary failed. Please try again in a moment.');
    } finally {
      clearTimeout(timer);
    }
  },

  async status(ctx) {
    const { data: userRes } = await sb.auth.admin.getUserById(ctx.userId);
    const notes = await fetchNotes(ctx.userId);
    const { count } = await sb.from('telegram_reminders').select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId).eq('sent', false);
    const by = (p) => notes.filter((n) => n.priority === p).length;
    await send(ctx.chatId, [
      'NoteNirman bot status',
      `Account: ${maskEmail(userRes?.user?.email)}`,
      `Notes: ${notes.length} (📌 ${notes.filter((n) => n.is_pinned).length} pinned, 🔒 ${notes.filter((n) => n.locked).length} locked, 🗄 ${notes.filter(isArchived).length} archived)`,
      `Priority: 🔴 ${by('high')}  🟠 ${by('medium')}  🟡 ${by('low')}`,
      `Reminders pending: ${count ?? 0}`,
      `Timezone: ${ctx.tz}`,
    ].join('\n'));
  },

  async cancel(ctx) {
    await setSession(ctx, IDLE);
    await send(ctx.chatId, 'Cancelled.');
  },

  async unlink(ctx) {
    await sb.from('telegram_reminders').delete().eq('user_id', ctx.userId);
    await sb.from('telegram_links').delete().eq('chat_id', ctx.chatId);
    await sb.from('telegram_sessions').delete().eq('chat_id', ctx.chatId);
    await send(ctx.chatId, 'Disconnected. Your notes are untouched. To reconnect, send /start for a new code and enter it in NoteNirman > Profile > Telegram.');
  },
};

// ----------------------------------------------------------- handler parts

const editFailure = (r) =>
  ({
    locked: `"${r.note?.title ?? 'That note'}" is locked. Open it in the app to edit it.`,
    missing: 'That note no longer exists.',
    conflict: 'That note was changed on another device at the same moment. Please try again.',
  })[r.reason] ?? 'Could not update the note.';

async function togglePin(ctx, pinned) {
  const note = await resolveNote(ctx, ctx.arg);
  if (!note) return;
  await updateNote(ctx.userId, note.id, { is_pinned: pinned });
  await send(ctx.chatId, pinned ? `📌 Pinned "${note.title}".` : `Unpinned "${note.title}".`);
}

async function beginEdit(ctx, state, prompt) {
  const note = await resolveNote(ctx, ctx.arg);
  if (!note) return;
  if (note.locked) return send(ctx.chatId, editFailure({ reason: 'locked', note }));
  await setSession(ctx, { ...IDLE, state, target_note_id: note.id, last_viewed_id: note.id });
  await send(ctx.chatId, `"${note.title}"\n${prompt} (or /cancel)`);
}

async function restoreNote(ctx, note) {
  await updateNote(ctx.userId, note.id, { deleted: false, deleted_at: null });
  await setSession(ctx, { last_viewed_id: note.id });
  await send(ctx.chatId, `Restored "${note.title}".`);
}

function noteToMarkdown(n) {
  const meta = [n.priority && n.priority !== 'none' ? `Priority: ${n.priority}` : '', n.tags?.length ? `Tags: ${n.tags.join(', ')}` : '']
    .filter(Boolean).join(' | ');
  return `# ${n.title?.trim() || 'Untitled'}\n\n${meta ? meta + '\n\n' : ''}${htmlToMarkdown(n.content ?? '')}`.trim() + '\n';
}

// ---------------------------------------------- free text (multi-step input)

async function handleFreeText(ctx, text) {
  const s = ctx.session;

  if (s.state === 'awaiting_title') {
    const title = text.slice(0, MAX_TITLE);
    await setSession(ctx, { state: 'awaiting_body', pending_title: title });
    return send(ctx.chatId, `Title: "${title}"\n\nNow send the body (or /cancel).`);
  }

  if (s.state === 'awaiting_body' && s.pending_title) {
    // Read these BEFORE resetting the session: setSession mutates ctx.session in place.
    const { pending_title: title, pending_priority: priority } = s;
    await insertNote(ctx.userId, {
      title,
      content: textToHtml(text.slice(0, MAX_BODY)),
      priority: priority ?? 'none',
    });
    await setSession(ctx, IDLE);
    return send(ctx.chatId, `Saved "${title}". It will appear on all your devices.`);
  }

  if ((s.state === 'awaiting_append' || s.state === 'awaiting_prepend') && s.target_note_id) {
    const where = s.state === 'awaiting_prepend' ? 'start' : 'end';
    const r = await editContent(ctx.userId, s.target_note_id, (c) => joinHtml(c, textToHtml(text.slice(0, MAX_BODY)), where));
    await setSession(ctx, IDLE);
    return send(ctx.chatId, r.ok ? `Added to the ${where} of "${r.note.title}".` : editFailure(r));
  }

  if (s.state === 'awaiting_rename' && s.target_note_id) {
    const note = await fetchOne(ctx.userId, s.target_note_id);
    await setSession(ctx, IDLE);
    if (!note) return send(ctx.chatId, 'That note no longer exists.');
    await updateNote(ctx.userId, note.id, { title: text.slice(0, MAX_TITLE) });
    return send(ctx.chatId, `Renamed to "${text.slice(0, MAX_TITLE)}".`);
  }

  if (s.state === 'awaiting_delete_confirm') {
    return send(ctx.chatId, 'Send /confirm to delete the note, or /cancel.');
  }

  return send(ctx.chatId, 'To write a note, send /title <title> first, then the body. /help lists everything.');
}

// ---------------------------------------------------------------- linking

/**
 * /start: an unlinked chat gets a one-time pairing code to type into NoteNirman
 * (Profile > Telegram). The app shows the Telegram name/username that asked for
 * the code and makes the user confirm, so a stranger can't get their chat linked
 * to someone else's account by talking that person into entering the stranger's code.
 * Any text after /start (old deep links) is ignored on purpose.
 */
async function handleStart(chatId, from) {
  const { data: link } = await sb.from('telegram_links').select('user_id').eq('chat_id', chatId).maybeSingle();
  if (link) {
    return send(chatId, 'This chat is already connected. Send /help to see what I can do.');
  }

  const displayName = [from?.first_name, from?.last_name].filter(Boolean).join(' ').slice(0, 100) || null;
  // One live code per chat: drop the previous one, then create a fresh one.
  await sb.from('telegram_pairing_codes').delete().eq('chat_id', chatId);
  let code = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = codeFromBytes(crypto.getRandomValues(new Uint8Array(32)));
    const { error } = await sb.from('telegram_pairing_codes').insert({
      code: candidate,
      chat_id: chatId,
      tg_name: displayName,
      tg_username: from?.username ?? null,
      expires_at: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
    });
    if (!error) code = candidate;
    else console.error('pairing code insert failed', error);
  }
  if (!code) return send(chatId, 'Could not create a code right now. Please try again in a moment.');

  await send(chatId, [
    'Your connect code:',
    '',
    formatCode(code),
    '',
    'Valid for 10 minutes. In NoteNirman, open Profile > Telegram, enter this code and confirm.',
    '',
    'Only enter it yourself. Never give this code to anyone else - whoever uses it can read your notes.',
  ].join('\n'));
}

// -------------------------------------------------------------- reminders

async function runScheduledJobs() {
  await sb.from('telegram_pairing_codes').delete().lt('expires_at', new Date().toISOString());

  // The app linked these chats; tell each one, once, that it worked.
  const { data: fresh } = await sb.from('telegram_links').select('user_id,chat_id').eq('welcomed', false).limit(20);
  for (const link of fresh ?? []) {
    const { data: claimed } = await sb.from('telegram_links').update({ welcomed: true })
      .eq('user_id', link.user_id).eq('welcomed', false).select('user_id');
    if (!claimed?.length) continue;
    const { data: userRes } = await sb.auth.admin.getUserById(link.user_id);
    await send(link.chat_id,
      `Connected to NoteNirman (${maskEmail(userRes?.user?.email)}). ✅

Start a note with /title <title>, then send the body. /notes lists your notes, /get <title> reads one, /help shows everything.`);
  }

  const { data } = await sb.from('telegram_reminders').select('id,chat_id,body')
    .eq('sent', false).lte('due_at', new Date().toISOString()).order('due_at', { ascending: true }).limit(50);
  for (const r of data ?? []) {
    // Claim first so two overlapping runs can never send the same reminder twice.
    const { data: claimed } = await sb.from('telegram_reminders').update({ sent: true }).eq('id', r.id).eq('sent', false).select('id');
    if (claimed?.length) await send(r.chat_id, `⏰ Reminder: ${r.body}`);
  }
}

// ------------------------------------------------------------------ router

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');

  // Scheduler path (pg_cron via pg_net): authenticated by its own secret.
  const cron = req.headers.get('x-cron-secret');
  if (cron !== null) {
    if (!CRON_SECRET || !timingSafeEqual(cron, CRON_SECRET)) return new Response('forbidden', { status: 403 });
    try { await runScheduledJobs(); } catch (err) { console.error('scheduled jobs failed', err); }
    return new Response('ok');
  }

  const provided = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!WEBHOOK_SECRET || !BOT_TOKEN || !timingSafeEqual(provided, WEBHOOK_SECRET)) {
    return new Response('forbidden', { status: 403 });
  }

  // Always answer 200 once authenticated: a non-200 makes Telegram redeliver the
  // same update, which would create duplicate notes.
  let chatId = null;
  try {
    const update = await req.json();
    const msg = update?.message;
    if (!msg || msg.chat?.type !== 'private' || typeof msg.text !== 'string') return new Response('ok');
    chatId = msg.chat.id;
    const text = msg.text.trim();
    if (!text) return new Response('ok');

    const [rawCommand, ...rest] = text.split(/\s+/);
    const command = rawCommand.startsWith('/') ? rawCommand.slice(1).split('@')[0].toLowerCase() : null;
    const arg = rest.join(' ').trim();

    if (command === 'start') { await handleStart(chatId, msg.from); return new Response('ok'); }
    if (command === 'help') {
      const detail = arg ? renderHelpFor(arg) : null;
      await send(chatId, arg ? detail ?? `No command called "${arg}". Send /help for the list.` : renderHelpOverview());
      return new Response('ok');
    }

    const { data: link } = await sb.from('telegram_links').select('user_id,timezone').eq('chat_id', chatId).maybeSingle();
    if (!link) {
      await send(chatId, 'This chat is not connected to a NoteNirman account yet. Send /start to get a connect code, then enter it in NoteNirman > Profile > Telegram.');
      return new Response('ok');
    }

    const session = await getSession(chatId);
    const ctx = { chatId, userId: link.user_id, tz: link.timezone || 'UTC', arg, session };

    const rate = checkRate(
      session.rate_window_start ? { windowStart: Number(session.rate_window_start), count: session.rate_count ?? 0 } : null,
      Date.now(),
    );
    await setSession(ctx, { rate_window_start: rate.next.windowStart, rate_count: rate.next.count });
    if (!rate.allowed) {
      if (rate.firstBlock) await send(chatId, 'Slow down a little - too many messages. Try again in a minute.');
      return new Response('ok');
    }

    if (command) {
      if (!COMMAND_NAMES.has(command)) {
        await send(chatId, `Unknown command /${command}. Send /help to see what I can do.`);
        return new Response('ok');
      }
      if (ctx.session.state !== 'idle' && !KEEP_STATE.has(command)) {
        const dropped = ctx.session.state === 'awaiting_body' ? ctx.session.pending_title : null;
        await setSession(ctx, IDLE);
        if (dropped) await send(chatId, `(Discarded the unfinished note "${dropped}".)`);
      }
      await handlers[command](ctx);
    } else {
      await handleFreeText(ctx, text);
    }
  } catch (err) {
    console.error('telegram-bot error', err);
    if (chatId) { try { await send(chatId, 'Something went wrong on my side. Please try again.'); } catch { /* ignore */ } }
  }
  return new Response('ok');
});
