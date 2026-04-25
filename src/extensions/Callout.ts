import { Node, mergeAttributes } from '@tiptap/core';

export default Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  addAttributes() {
    return {
      emoji: {
        default: '💡',
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div.callout',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'callout' }),
      ['span', { class: 'callout-icon' }, HTMLAttributes.emoji],
      ['div', { class: 'callout-content' }, 0],
    ];
  },
});
