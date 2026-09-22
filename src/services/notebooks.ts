import type { Tag } from '../types';

/**
 * Notebooks (subject → chapter) are not a new data type — they are tags whose name
 * starts with this prefix, with "/" separating subject and chapter. This reuses the
 * existing tag sync, storage and note-filtering exactly as they are, so no schema
 * change or migration is needed and every existing tag code path keeps working.
 */
export const NOTEBOOK_TAG_PREFIX = 'notebook:';

export interface NotebookChapter {
  /** The literal tag name, e.g. "notebook:Physics/Waves". Pass this to the existing tag filter. */
  tagName: string;
  chapter: string;
}

export interface Notebook {
  subject: string;
  chapters: NotebookChapter[];
}

export function isNotebookTag(tagName: string): boolean {
  return tagName.startsWith(NOTEBOOK_TAG_PREFIX) && tagName.length > NOTEBOOK_TAG_PREFIX.length;
}

export function buildNotebookTagName(subject: string, chapter: string): string {
  const cleanSubject = subject.trim().replace(/\//g, ' ');
  const cleanChapter = chapter.trim().replace(/\//g, ' ');
  return cleanChapter ? `${NOTEBOOK_TAG_PREFIX}${cleanSubject}/${cleanChapter}` : `${NOTEBOOK_TAG_PREFIX}${cleanSubject}`;
}

/** Groups every notebook tag into subjects, each with its chapters, alphabetically sorted. */
export function groupNotebooks(tags: Pick<Tag, 'name'>[]): Notebook[] {
  const bySubject = new Map<string, NotebookChapter[]>();

  for (const tag of tags) {
    if (!isNotebookTag(tag.name)) continue;
    const rest = tag.name.slice(NOTEBOOK_TAG_PREFIX.length);
    const slash = rest.indexOf('/');
    const subject = slash === -1 ? rest : rest.slice(0, slash);
    const chapter = slash === -1 ? '' : rest.slice(slash + 1);
    if (!subject) continue;

    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject)!.push({ tagName: tag.name, chapter: chapter || subject });
  }

  return [...bySubject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, chapters]) => ({
      subject,
      chapters: chapters.sort((a, b) => a.chapter.localeCompare(b.chapter)),
    }));
}
