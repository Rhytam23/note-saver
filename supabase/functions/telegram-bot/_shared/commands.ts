// Single source of truth for every bot command. It drives /help, /help <cmd>,
// the router's "unknown command" check, and Telegram's setMyCommands menu, so
// the three can never drift apart. Pure data: no Deno or Node APIs.

export type CommandGroup =
  | 'Write'
  | 'Browse'
  | 'Edit'
  | 'Tasks and study'
  | 'Calendar and reminders'
  | 'Trash and recovery'
  | 'Export and AI'
  | 'Account';

export interface BotCommand {
  /** Telegram rule: 1-32 chars, lowercase letters, digits, underscore. */
  name: string;
  group: CommandGroup;
  /** Usage line shown in /help <cmd>, e.g. "/priority <high|medium|low|none> [note]". */
  usage: string;
  /** 3-256 chars (Telegram limit). Shown in the "/" autocomplete menu. */
  description: string;
  /** Longer explanation for /help <cmd>. */
  help: string;
  example: string;
}

export const COMMANDS: BotCommand[] = [
  // ---- Write ----
  {
    name: 'title', group: 'Write', usage: '/title <title>',
    description: 'Start a new note: set its title, then send the body',
    help: 'Sets the title of a new note. Your NEXT message is saved as the body. Send /priority before the body to set its priority, or /cancel to discard.',
    example: '/title Physics revision',
  },
  {
    name: 'quick', group: 'Write', usage: '/quick <text>',
    description: 'Save a one-message note (first words become the title)',
    help: 'Saves a note in one message. The title is the first few words; the whole text is the body.',
    example: '/quick Buy graph paper before Friday',
  },
  {
    name: 'template', group: 'Write', usage: '/template [number|name]',
    description: 'List note templates, or create a note from one',
    help: 'With no argument, lists the same templates the app offers. With a number or name, creates a note from it (open it in the app to fill it in, or use /append).',
    example: '/template exam',
  },
  {
    name: 'inbox', group: 'Write', usage: '/inbox [text]',
    description: 'Show your Inbox note, or add a timestamped line to it',
    help: 'A single catch-all note called "Inbox". With text, adds a timestamped line; with no text, shows it. /todo items land in the same note.',
    example: '/inbox Ask teacher about lab report',
  },
  // ---- Browse ----
  {
    name: 'notes', group: 'Browse', usage: '/notes [high|medium|low|pinned|archived|tag] [page]',
    description: 'List your notes (pinned and high priority first)',
    help: 'Numbered list, 10 per page. Pinned first, then by priority, then newest. Add a filter word: high, medium, low, pinned, archived, or a tag name. Then use the number with /get, /pin and friends.',
    example: '/notes high 2',
  },
  {
    name: 'recent', group: 'Browse', usage: '/recent',
    description: 'Show your 5 most recently changed notes',
    help: 'The five notes you touched last, on any device.',
    example: '/recent',
  },
  {
    name: 'get', group: 'Browse', usage: '/get <number|title>',
    description: 'Read a note by number or title',
    help: 'Shows a note. Use a number from the last list, or part of the title (case-insensitive). Locked notes are never shown here.',
    example: '/get physics',
  },
  {
    name: 'search', group: 'Browse', usage: '/search <text>',
    description: 'Search titles and note text',
    help: 'Finds notes whose title or text contains your words. Locked notes match on title only.',
    example: '/search photosynthesis',
  },
  {
    name: 'today', group: 'Browse', usage: '/today',
    description: 'Notes created or changed today',
    help: 'Uses your /timezone to decide when "today" starts.',
    example: '/today',
  },
  {
    name: 'week', group: 'Browse', usage: '/week',
    description: 'Notes created or changed in the last 7 days',
    help: 'Everything you touched in the past week.',
    example: '/week',
  },
  {
    name: 'random', group: 'Browse', usage: '/random',
    description: 'Show a random note (good for revision)',
    help: 'Picks one unlocked, non-archived note at random.',
    example: '/random',
  },
  {
    name: 'tags', group: 'Browse', usage: '/tags',
    description: 'List your tags with note counts',
    help: 'Then /notes <tag> to see the notes under one.',
    example: '/tags',
  },
  {
    name: 'links', group: 'Browse', usage: '/links <number|title>',
    description: 'Show a note\'s [[wiki links]] and backlinks',
    help: 'Lists notes this note links to with [[Title]], and notes that link back to it.',
    example: '/links Physics revision',
  },
  // ---- Edit ----
  {
    name: 'priority', group: 'Edit', usage: '/priority <high|medium|low|none> [number|title]',
    description: 'Set a note\'s priority',
    help: 'With no note given, applies to the note you are writing (after /title) or the last note you viewed.',
    example: '/priority high 3',
  },
  {
    name: 'pin', group: 'Edit', usage: '/pin [number|title]',
    description: 'Pin a note to the top',
    help: 'Pinned notes are listed first everywhere, including the app.',
    example: '/pin 2',
  },
  {
    name: 'unpin', group: 'Edit', usage: '/unpin [number|title]',
    description: 'Unpin a note',
    help: 'Removes the pin.',
    example: '/unpin 2',
  },
  {
    name: 'append', group: 'Edit', usage: '/append [number|title]',
    description: 'Add text to the end of a note',
    help: 'Then send the text as your next message. Locked notes cannot be edited here.',
    example: '/append Physics revision',
  },
  {
    name: 'prepend', group: 'Edit', usage: '/prepend [number|title]',
    description: 'Add text to the start of a note',
    help: 'Then send the text as your next message. Locked notes cannot be edited here.',
    example: '/prepend 4',
  },
  {
    name: 'rename', group: 'Edit', usage: '/rename [number|title]',
    description: 'Change a note\'s title',
    help: 'Then send the new title as your next message.',
    example: '/rename 4',
  },
  {
    name: 'tag', group: 'Edit', usage: '/tag <tag> [number|title]',
    description: 'Add a tag to a note',
    help: 'Tags are single words. With no note given, uses the last note you viewed.',
    example: '/tag exam 3',
  },
  {
    name: 'archive', group: 'Edit', usage: '/archive [number|title]',
    description: 'Archive a note (hidden from lists)',
    help: 'Adds the reserved tag "archived". Archived notes are hidden from the bot\'s lists; /notes archived shows them. The app shows the tag too.',
    example: '/archive 5',
  },
  {
    name: 'unarchive', group: 'Edit', usage: '/unarchive [number|title]',
    description: 'Bring an archived note back',
    help: 'Removes the "archived" tag.',
    example: '/unarchive 1',
  },
  {
    name: 'copy', group: 'Edit', usage: '/copy [number|title]',
    description: 'Duplicate a note',
    help: 'Creates "<title> (copy)" with the same text, tags and priority. Locked notes cannot be copied here.',
    example: '/copy 2',
  },
  // ---- Tasks and study ----
  {
    name: 'todo', group: 'Tasks and study', usage: '/todo <text>',
    description: 'Add a checkbox task to your Inbox note',
    help: 'Adds an unchecked task to the "Inbox" note. Tick it off in the app.',
    example: '/todo Finish chemistry worksheet',
  },
  {
    name: 'tasks', group: 'Tasks and study', usage: '/tasks',
    description: 'List your unchecked tasks across all notes',
    help: 'Read-only: ticking tasks off happens in the app.',
    example: '/tasks',
  },
  {
    name: 'card', group: 'Tasks and study', usage: '/card <question> :: <answer>',
    description: 'Add a flashcard to your Flashcards note',
    help: 'Writes "Question:: Answer" into a note called "Flashcards", the same format the app\'s flashcard mode reads.',
    example: '/card Powerhouse of the cell :: Mitochondria',
  },
  {
    name: 'quiz', group: 'Tasks and study', usage: '/quiz',
    description: 'Get a random flashcard question',
    help: 'Picks a flashcard from any of your notes. Send /answer to reveal the answer.',
    example: '/quiz',
  },
  {
    name: 'answer', group: 'Tasks and study', usage: '/answer',
    description: 'Reveal the answer to the last quiz question',
    help: 'Only works right after /quiz.',
    example: '/answer',
  },
  // ---- Calendar and reminders ----
  {
    name: 'events', group: 'Calendar and reminders', usage: '/events',
    description: 'Show calendar events in the next 7 days',
    help: 'Read-only. Recurring events show their first occurrence only.',
    example: '/events',
  },
  {
    name: 'remind', group: 'Calendar and reminders', usage: '/remind <when> <text>',
    description: 'Set a reminder sent to this chat',
    help: 'When can be: "in 30m", "in 2h", "in 3d", "tomorrow 9am", "today 18:30", "friday 5pm", "at 21:00", or "2026-10-01 14:00". Times use your /timezone (default UTC).',
    example: '/remind tomorrow 9am revise chapter 3',
  },
  {
    name: 'reminders', group: 'Calendar and reminders', usage: '/reminders [cancel <number>]',
    description: 'List pending reminders, or cancel one',
    help: '/reminders shows them numbered; /reminders cancel 2 removes the second.',
    example: '/reminders cancel 1',
  },
  {
    name: 'timezone', group: 'Calendar and reminders', usage: '/timezone <Area/City>',
    description: 'Set your timezone for reminders and "today"',
    help: 'Use an IANA name such as Asia/Kolkata or Europe/London.',
    example: '/timezone Asia/Kolkata',
  },
  // ---- Trash and recovery ----
  {
    name: 'delete', group: 'Trash and recovery', usage: '/delete [number|title]',
    description: 'Delete a note (asks you to confirm)',
    help: 'Moves the note to trash on every device after you send /confirm. You can bring it back with /restore or /undo.',
    example: '/delete 6',
  },
  {
    name: 'confirm', group: 'Trash and recovery', usage: '/confirm',
    description: 'Confirm the pending delete',
    help: 'Only does something right after /delete.',
    example: '/confirm',
  },
  {
    name: 'trash', group: 'Trash and recovery', usage: '/trash',
    description: 'List notes deleted in the last 30 days',
    help: 'Numbered, so you can /restore one.',
    example: '/trash',
  },
  {
    name: 'restore', group: 'Trash and recovery', usage: '/restore [number|title]',
    description: 'Restore a deleted note',
    help: 'With no argument, restores the most recently deleted note.',
    example: '/restore 1',
  },
  {
    name: 'undo', group: 'Trash and recovery', usage: '/undo',
    description: 'Restore the note you deleted last',
    help: 'Shortcut for /restore with no argument.',
    example: '/undo',
  },
  // ---- Export and AI ----
  {
    name: 'export', group: 'Export and AI', usage: '/export [number|title]',
    description: 'Send a note as a Markdown file',
    help: 'Locked notes cannot be exported here.',
    example: '/export 2',
  },
  {
    name: 'backup', group: 'Export and AI', usage: '/backup',
    description: 'Send all your notes as one Markdown file',
    help: 'Locked notes are listed by title only; their content is never included.',
    example: '/backup',
  },
  {
    name: 'summarize', group: 'Export and AI', usage: '/summarize [number|title]',
    description: 'AI summary of one note (uses Gemini)',
    help: 'Sends the text of that ONE note to Google Gemini to summarise it. Locked notes are never sent. Only use it on notes you are happy to share with Gemini.',
    example: '/summarize Physics revision',
  },
  // ---- Account ----
  {
    name: 'status', group: 'Account', usage: '/status',
    description: 'Show your account, note counts and settings',
    help: 'Linked account (email partly hidden), totals by priority, pinned, archived and locked notes, pending reminders, and timezone.',
    example: '/status',
  },
  {
    name: 'cancel', group: 'Account', usage: '/cancel',
    description: 'Cancel whatever I am waiting for',
    help: 'Discards a half-written note, a pending edit, or a pending delete.',
    example: '/cancel',
  },
  {
    name: 'unlink', group: 'Account', usage: '/unlink',
    description: 'Disconnect this chat from your account',
    help: 'Your notes are untouched. Reconnect any time: send /start to get a new code and enter it in NoteNirman > Profile > Telegram.',
    example: '/unlink',
  },
  {
    name: 'help', group: 'Account', usage: '/help [command]',
    description: 'Show all commands, or details for one',
    help: 'Without an argument lists every command by group. With a command name, shows how to use it.',
    example: '/help priority',
  },
  {
    name: 'start', group: 'Account', usage: '/start',
    description: 'Get a code to connect this chat to NoteNirman',
    help: 'Gives you a one-time code (valid 10 minutes). Enter it in NoteNirman > Profile > Telegram and confirm. Never share the code: whoever uses it can read your notes.',
    example: '/start',
  },
];

export const COMMAND_NAMES: ReadonlySet<string> = new Set(COMMANDS.map((c) => c.name));

export function findCommand(name: string): BotCommand | undefined {
  const key = name.replace(/^\//, '').toLowerCase();
  return COMMANDS.find((c) => c.name === key);
}

/** Payload for Telegram's setMyCommands. */
export function toTelegramMenu(): { command: string; description: string }[] {
  return COMMANDS.map((c) => ({ command: c.name, description: c.description }));
}

export function renderHelpOverview(): string {
  const groups = new Map<CommandGroup, BotCommand[]>();
  for (const c of COMMANDS) {
    if (c.name === 'start') continue;
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group)!.push(c);
  }
  const lines = ['NoteNirman bot', '', 'Start a note with /title, then send the body. Plain messages are ignored.', ''];
  for (const [group, cmds] of groups) {
    lines.push(group);
    for (const c of cmds) lines.push(`  /${c.name} - ${c.description}`);
    lines.push('');
  }
  lines.push('Send /help <command> for details, e.g. /help priority.');
  lines.push('Telegram chats are not end-to-end encrypted. Do not send secrets.');
  return lines.join('\n');
}

export function renderHelpFor(name: string): string | null {
  const c = findCommand(name);
  if (!c) return null;
  return `${c.usage}\n\n${c.help}\n\nExample: ${c.example}`;
}
