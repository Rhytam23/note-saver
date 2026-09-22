import React, { useEffect, useReducer } from 'react';
import type { Editor } from '@tiptap/react';
import { useSeason } from '../../contexts/SeasonalContext';

/** Row and column controls that appear only while the cursor is inside a table. */
const TableControls: React.FC<{ editor: Editor }> = ({ editor }) => {
  const { colors } = useSeason();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  if (!editor.isActive('table')) return null;

  const chain = () => editor.chain().focus();
  const button = `px-2 py-1 rounded text-xs border whitespace-nowrap ${colors.border} ${colors.hover}`;

  return (
    <div role="toolbar" aria-label="Table" className={`flex flex-wrap items-center gap-1.5 px-3 py-2 border-b ${colors.border} ${colors.bgSimple}`}>
      <span className={`text-xs mr-1 ${colors.secondaryText}`}>Table</span>
      <button type="button" className={button} onClick={() => chain().addRowAfter().run()}>+ Row</button>
      <button type="button" className={button} onClick={() => chain().addColumnAfter().run()}>+ Column</button>
      <button type="button" className={button} onClick={() => chain().deleteRow().run()}>− Row</button>
      <button type="button" className={button} onClick={() => chain().deleteColumn().run()}>− Column</button>
      <button type="button" className={button} onClick={() => chain().toggleHeaderRow().run()}>Header row</button>
      <button type="button" className={`${button} text-red-500`} onClick={() => chain().deleteTable().run()}>Delete table</button>
    </div>
  );
};

export default TableControls;
