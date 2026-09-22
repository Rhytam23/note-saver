import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { NOTE_TEMPLATES } from '../noteTemplates';

describe('note templates', () => {
  it('has unique ids and titles', () => {
    const ids = NOTE_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    NOTE_TEMPLATES.forEach(t => expect(t.title.trim()).not.toBe(''));
  });

  it.each(NOTE_TEMPLATES.map(t => [t.name, t] as const))('%s loads into the editor without losing structure', (_name, template) => {
    const editor = new Editor({
      extensions: [StarterKit, TaskList, TaskItem, Table, TableRow, TableHeader, TableCell],
      content: template.content,
    });
    const html = editor.getHTML();
    expect(html.length).toBeGreaterThan(20);
    if (template.content.includes('<table')) expect(html).toContain('<table');
    if (template.content.includes('taskList')) expect(html).toContain('data-type="taskList"');
    if (template.content.includes('<h2>')) expect(html).toContain('<h2>');
    editor.destroy();
  });
});
