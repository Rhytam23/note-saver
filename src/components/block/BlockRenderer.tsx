import React from 'react';
import type { Block } from '../../types/block';
import type { BlockDocument } from '../../services/blockDocument';
import { getStructuredBlockHierarchy } from '../../services/blockNesting';
import { BlockItem } from './BlockItem';

interface BlockRendererProps {
  document: BlockDocument;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  onBlockContentChange?: (blockId: string, content: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  document,
  selectedBlockId,
  onSelectBlock,
  onBlockContentChange,
}) => {
  if (!document || !document.blocks || document.blocks.length === 0) {
    return (
      <div className="p-4 text-center text-sm opacity-50 italic">
        Empty block document. Type `/` for slash menu.
      </div>
    );
  }

  const { rootBlocks, childrenMap } = getStructuredBlockHierarchy(document.blocks);

  const renderRecursive = (block: Block): React.ReactNode => {
    const children = childrenMap.get(block.id);
    return (
      <BlockItem
        key={block.id}
        block={block}
        isSelected={selectedBlockId === block.id}
        onSelect={onSelectBlock}
        onContentChange={onBlockContentChange}
      >
        {children && children.map(child => renderRecursive(child))}
      </BlockItem>
    );
  };

  return (
    <div className="w-full font-sans space-y-1">
      {rootBlocks.map(rootBlock => renderRecursive(rootBlock))}
    </div>
  );
};
