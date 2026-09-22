import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseNode } from '@tiptap/pm/model';

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindState {
  query: string;
  matches: FindMatch[];
  current: number;
  decorations: DecorationSet;
}

export const findPluginKey = new PluginKey<FindState>('findInNote');

export function collectMatches(doc: ProseNode, query: string): FindMatch[] {
  const matches: FindMatch[] = [];
  if (!query) return matches;
  const needle = query.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + needle.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
  });

  return matches;
}

function buildState(doc: ProseNode, query: string, current: number): FindState {
  const matches = collectMatches(doc, query);
  const safeCurrent = matches.length === 0 ? 0 : Math.min(Math.max(current, 0), matches.length - 1);
  const decorations = DecorationSet.create(
    doc,
    matches.map((m, i) =>
      Decoration.inline(m.from, m.to, { class: i === safeCurrent ? 'find-match find-match-current' : 'find-match' })
    )
  );
  return { query, matches, current: safeCurrent, decorations };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findInNote: {
      setFindQuery: (query: string) => ReturnType;
      findStep: (direction: 1 | -1) => ReturnType;
    };
  }
}

/** Highlights every match of a query in the open note and steps between them. Read-only: never edits content. */
const FindInNote = Extension.create({
  name: 'findInNote',

  addCommands() {
    return {
      setFindQuery:
        (query: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { query, current: 0 }));
          return true;
        },
      findStep:
        (direction: 1 | -1) =>
        ({ tr, state, dispatch }) => {
          const current = findPluginKey.getState(state);
          if (!current || current.matches.length === 0) return false;
          const count = current.matches.length;
          const next = (current.current + direction + count) % count;
          const match = current.matches[next];
          if (dispatch) {
            dispatch(
              tr
                .setMeta(findPluginKey, { query: current.query, current: next })
                .setSelection(TextSelection.create(tr.doc, match.from, match.to))
                .scrollIntoView()
            );
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,
        state: {
          init: (_, { doc }) => buildState(doc, '', 0),
          apply: (tr, prev) => {
            const meta = tr.getMeta(findPluginKey) as { query: string; current: number } | undefined;
            if (meta) return buildState(tr.doc, meta.query, meta.current);
            if (tr.docChanged) return buildState(tr.doc, prev.query, prev.current);
            return prev;
          },
        },
        props: {
          decorations: state => findPluginKey.getState(state)?.decorations ?? null,
        },
      }),
    ];
  },
});

export default FindInNote;
