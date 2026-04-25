import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

const EmojiSuggestionPluginKey = new PluginKey('emojiSuggestion');

export const EMOJIS = [
    { name: 'smile', emoji: '😊' },
    { name: 'heart', emoji: '❤️' },
    { name: 'sun', emoji: '☀️' },
    { name: 'sparkles', emoji: '✨' },
    { name: 'fire', emoji: '🔥' },
    { name: 'rocket', emoji: '🚀' },
    { name: 'lamp', emoji: '🪔' },
    { name: 'party', emoji: '🎉' },
    { name: 'check', emoji: '✅' },
    { name: 'warning', emoji: '⚠️' },
    { name: 'lightbulb', emoji: '💡' },
    { name: 'memo', emoji: '📄' },
    { name: 'pushpin', emoji: '📌' },
];

export default Extension.create({
    name: 'emojiSuggestion',

    addOptions() {
        return {
            suggestion: {
                char: ':',
                command: ({ editor, range, props }: any) => {
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(range, props.emoji)
                        .run();
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                pluginKey: EmojiSuggestionPluginKey,
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
