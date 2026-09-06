import React from 'react';

interface BlockToolbarProps {
  selectedBlockId: string | null;
  onAddBlock?: () => void;
  onDuplicate?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onIndent?: (blockId: string) => void;
  onOutdent?: (blockId: string) => void;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  selectedBlockId,
  onAddBlock,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
}) => {
  return (
    <div className="flex items-center gap-1 p-1.5 rounded-xl border border-white/20 bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-md text-xs">
      <button
        onClick={onAddBlock}
        className="px-2.5 py-1 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center gap-1"
        title="Add new block"
      >
        <span>+</span> Add Block
      </button>

      {selectedBlockId && (
        <>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={() => onDuplicate?.(selectedBlockId)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Duplicate block"
          >
            📋 Duplicate
          </button>
          <button
            onClick={() => onMoveUp?.(selectedBlockId)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Move block up"
          >
            ⬆️ Up
          </button>
          <button
            onClick={() => onMoveDown?.(selectedBlockId)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Move block down"
          >
            ⬇️ Down
          </button>
          <button
            onClick={() => onIndent?.(selectedBlockId)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Indent block"
          >
            ➡️ Indent
          </button>
          <button
            onClick={() => onOutdent?.(selectedBlockId)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Outdent block"
          >
            ⬅️ Outdent
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={() => onDelete?.(selectedBlockId)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete block"
          >
            🗑️ Delete
          </button>
        </>
      )}
    </div>
  );
};
