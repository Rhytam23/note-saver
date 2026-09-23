/**
 * "Emergency notes": a plain message with no command is saved as a note titled
 * "Emergency" so nothing typed in a hurry is lost. The user has 24 hours to give it a
 * real title in the app, otherwise the scheduler moves it to the trash. At most three
 * can be created per rolling 24 hours. Marked with a reserved tag, like archive.
 */
export const EMERGENCY_TITLE = 'Emergency';
export const EMERGENCY_TAG = 'emergency';
export const EMERGENCY_DAILY_LIMIT = 3;
export const EMERGENCY_TTL_MS = 24 * 60 * 60 * 1000;

export function emergencySavedMessage(appUrl: string): string {
  return [
    `We are keeping this note with the title "${EMERGENCY_TITLE}".`,
    `Go to the NoteNirman app (${appUrl}) and change the title to the one you want.`,
    `If you don't change it within 24 hours, the note will be deleted.`,
    `You can create only ${EMERGENCY_DAILY_LIMIT} emergency notes per day.`,
  ].join('\n');
}

export function emergencyLimitMessage(): string {
  return `You have already used your ${EMERGENCY_DAILY_LIMIT} emergency notes for today, so this message was not saved. Start a proper note with /title <title>, or try again tomorrow.`;
}

export function emergencyDeletedMessage(count: number): string {
  const what = count === 1 ? 'note' : 'notes';
  return `${count} "${EMERGENCY_TITLE}" ${what} was not renamed within 24 hours, so ${count === 1 ? 'it was' : 'they were'} moved to the trash. Send /trash to see ${count === 1 ? 'it' : 'them'} and /restore to bring ${count === 1 ? 'it' : 'them'} back.`;
}

/** A note is still an unrenamed emergency note (the only kind that is ever auto-deleted). */
export function isUnrenamedEmergency(note: { title?: string | null; tags?: string[] | null }): boolean {
  return (note.title ?? '').trim() === EMERGENCY_TITLE && (note.tags ?? []).includes(EMERGENCY_TAG);
}
