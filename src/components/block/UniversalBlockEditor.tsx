import React, { useState, useCallback, useMemo } from 'react';
import type { BlockDocument } from '../../services/blockDocument';
import { createBlockDocument } from '../../services/blockDocument';
import {
  createBlock,
  updateBlock as updateBlockOp,
  deleteBlock as deleteBlockOp,
  duplicateBlock as duplicateBlockOp,
  moveBlock as moveBlockOp,
} from '../../services/blockOperations';
import { indentBlock as indentOp, outdentBlock as outdentOp } from '../../services/blockNesting';
import { BlockRenderer } from './BlockRenderer';
import { BlockToolbar } from './BlockToolbar';
import { BlockSlashMenu, type SlashMenuItem } from './BlockSlashMenu';
import { useCollaboration } from '../../collaboration/useCollaboration';
import type { CollaborationSessionConfig, ICollaborationProvider } from '../../collaboration/collaborationTypes';

interface UniversalBlockEditorProps {
  initialDocument?: BlockDocument;
  noteId?: string;
  initialHtml?: string;
  onDocumentChange?: (doc: BlockDocument) => void;
  collaborationConfig?: CollaborationSessionConfig;
  customCollaborationProvider?: ICollaborationProvider;
}

export const UniversalBlockEditor: React.FC<UniversalBlockEditorProps> = ({
  initialDocument,
  noteId = 'note-default',
  initialHtml = '',
  onDocumentChange,
  collaborationConfig,
  customCollaborationProvider,
}) => {
  const initialBlockDoc = useMemo(() => {
    return initialDocument || createBlockDocument(noteId, initialHtml);
  }, [initialDocument, noteId, initialHtml]);

  const [doc, setDoc] = useState<BlockDocument>(initialBlockDoc);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);

  const handleRemoteDocChange = useCallback((remoteDoc: BlockDocument) => {
    setDoc(remoteDoc);
    onDocumentChange?.(remoteDoc);
  }, [onDocumentChange]);

  const { isCollabEnabled, status, collaborators, updateDocument: updateCollabDoc } = useCollaboration(
    collaborationConfig || null,
    initialBlockDoc,
    handleRemoteDocChange,
    customCollaborationProvider
  );

  const updateState = useCallback(
    (newDoc: BlockDocument) => {
      setDoc(newDoc);
      onDocumentChange?.(newDoc);
      if (isCollabEnabled) {
        updateCollabDoc(newDoc);
      }
    },
    [onDocumentChange, isCollabEnabled, updateCollabDoc]
  );

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  const handleBlockContentChange = (blockId: string, content: string) => {
    const updated = updateBlockOp(doc, blockId, { content });
    updateState(updated);
  };

  const handleAddBlock = () => {
    const { doc: updated, newBlock } = createBlock(doc, {
      type: 'paragraph',
      content: 'New paragraph block',
    });
    updateState(updated);
    setSelectedBlockId(newBlock.id);
  };

  const handleDuplicate = (blockId: string) => {
    const { doc: updated, duplicatedBlock } = duplicateBlockOp(doc, blockId);
    if (duplicatedBlock) {
      updateState(updated);
      setSelectedBlockId(duplicatedBlock.id);
    }
  };

  const handleDelete = (blockId: string) => {
    const updated = deleteBlockOp(doc, blockId);
    updateState(updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleMoveUp = (blockId: string) => {
    const index = doc.blocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      const updated = moveBlockOp(doc, blockId, index - 1);
      updateState(updated);
    }
  };

  const handleMoveDown = (blockId: string) => {
    const index = doc.blocks.findIndex(b => b.id === blockId);
    if (index < doc.blocks.length - 1) {
      const updated = moveBlockOp(doc, blockId, index + 1);
      updateState(updated);
    }
  };

  const handleIndent = (blockId: string) => {
    const updated = indentOp(doc, blockId);
    updateState(updated);
  };

  const handleOutdent = (blockId: string) => {
    const updated = outdentOp(doc, blockId);
    updateState(updated);
  };

  const handleSlashSelect = (item: SlashMenuItem) => {
    const { doc: updated, newBlock } = createBlock(doc, {
      type: item.type,
      content: item.label,
      properties: item.properties,
    });
    updateState(updated);
    setSelectedBlockId(newBlock.id);
    setIsSlashMenuOpen(false);
  };

  return (
    <div className="w-full space-y-3 relative p-2">
      <div className="flex items-center justify-between">
        <BlockToolbar
          selectedBlockId={selectedBlockId}
          onAddBlock={handleAddBlock}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
        />

        <div className="flex items-center gap-2">
          {isCollabEnabled && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-black/10 dark:bg-white/10">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-muted-foreground font-mono text-[10px]">
                {status === 'connected' ? `${collaborators.length} active` : status}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsSlashMenuOpen(prev => !prev)}
            className="px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>/</span> Slash Menu
          </button>
        </div>
      </div>

      {isSlashMenuOpen && (
        <BlockSlashMenu
          onSelect={handleSlashSelect}
          onClose={() => setIsSlashMenuOpen(false)}
        />
      )}

      <div className="min-h-[250px] p-2 border border-white/10 rounded-xl bg-black/5 dark:bg-white/5">
        <BlockRenderer
          document={doc}
          selectedBlockId={selectedBlockId}
          onSelectBlock={handleSelectBlock}
          onBlockContentChange={handleBlockContentChange}
        />
      </div>
    </div>
  );
};
