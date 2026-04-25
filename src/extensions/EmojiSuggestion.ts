import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const EMOJIS = [
    { name: 'smile', emoji: 'ðŸ˜Š' },
    { name: 'heart', emoji: 'â¤ï¸' },
    { name: 'sun', emoji: 'â˜€ï¸' },
    { name: 'sparkles', emoji: 'âœ¨' },
    { name: 'fire', emoji: 'ðŸ”¥' },
    { name: 'rocket', emoji: 'ðŸš€' },
    { name: 'lamp', emoji: 'ðŸª”' },
    { name: 'party', emoji: 'ðŸŽ‰' },
    { name: 'check', emoji: 'âœ…' },
    { name: 'warning', emoji: 'âš ï¸' },
    { name: 'lightbulb', emoji: 'ðŸ’¡' },
    { name: 'memo', emoji: 'ðŸ“' },
    { name: 'pushpin', emoji: 'ðŸ“Œ' },
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
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
