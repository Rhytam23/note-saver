// Registers the NoteNirman bot with Telegram: webhook + the full "/" command
// menu (generated from the same registry that powers /help, so they can't drift).
//
// Run it on YOUR machine so the bot token never passes through anyone else:
//
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
//   TELEGRAM_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/telegram-bot \
//   npm run bot:register
//
// Add --dry-run to print what would be sent without calling Telegram.
// Needs Node 22.18+ (runs the .ts registry directly via built-in type stripping).

const dryRun = process.argv.includes('--dry-run');

let toTelegramMenu;
try {
  ({ toTelegramMenu } = await import('../supabase/functions/_shared/commands.ts'));
} catch (err) {
  console.error('Could not load the command registry. This script needs Node 22.18 or newer.\n', err.message);
  process.exit(1);
}

const menu = toTelegramMenu();
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const url = process.env.TELEGRAM_FUNCTION_URL;

if (!dryRun) {
  const missing = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_FUNCTION_URL'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    console.error('TELEGRAM_WEBHOOK_SECRET must be 16-256 characters of A-Z a-z 0-9 _ - (Telegram\'s rule). Use a long random string.');
    process.exit(1);
  }
  if (!/^https:\/\//.test(url)) {
    console.error('TELEGRAM_FUNCTION_URL must be an https:// URL.');
    process.exit(1);
  }
}

const payloads = [
  ['setWebhook', { url: url ?? '<function url>', secret_token: secret ? '<hidden>' : '<secret>', allowed_updates: ['message'] }],
  ['setMyCommands', { commands: menu }],
  ['setMyDescription', { description: 'Write, find and manage your NoteNirman notes from Telegram. Connect from NoteNirman > Profile > Connect Telegram.' }],
  ['setMyShortDescription', { short_description: 'Your NoteNirman notes, in Telegram.' }],
];

if (dryRun) {
  console.log(`${menu.length} commands would be registered:`);
  for (const c of menu) console.log(`  /${c.command} - ${c.description}`);
  process.exit(0);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(`${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

const me = await call('getMe', {});
console.log(`Bot: @${me.username}`);
for (const [method, body] of payloads) {
  const real =
    method === 'setWebhook' ? { url, secret_token: secret, allowed_updates: ['message'] } : body;
  await call(method, real);
  console.log(`ok  ${method}${method === 'setMyCommands' ? ` (${menu.length} commands)` : ''}`);
}
console.log('\nDone. Set VITE_TELEGRAM_BOT_USERNAME=' + me.username + ' in Vercel so the app can show "Connect Telegram".');
