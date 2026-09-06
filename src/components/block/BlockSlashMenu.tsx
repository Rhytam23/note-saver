import React, { useState, useEffect, useRef } from 'react';
import type { BlockType } from '../../types/block';

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  properties?: Record<string, any>;
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  { type: 'paragraph', label: 'Paragraph', description: 'Plain text paragraph', icon: '📝' },
  { type: 'heading', label: 'Heading 1', description: 'Large section heading', icon: 'H1', properties: { level: 1 } },
  { type: 'heading', label: 'Heading 2', description: 'Medium section heading', icon: 'H2', properties: { level: 2 } },
  { type: 'heading', label: 'Heading 3', description: 'Small section heading', icon: 'H3', properties: { level: 3 } },
  { type: 'quote', label: 'Quote', description: 'Capture a quote or statement', icon: '💬' },
  { type: 'callout', label: 'Callout', description: 'Highlight important info', icon: '💡', properties: { emoji: '💡' } },
  { type: 'bulletList', label: 'Bullet List', description: 'Simple bulleted list', icon: '•' },
  { type: 'numberedList', label: 'Numbered List', description: 'Ordered sequential list', icon: '1.' },
  { type: 'checklist', label: 'Checklist / Task', description: 'Track items with checkboxes', icon: '☑️' },
  { type: 'code', label: 'Code Block', description: 'Syntax highlighted code', icon: '💻', properties: { language: 'typescript' } },
  { type: 'table', label: 'Table', description: 'Structured data table', icon: '📊' },
  { type: 'image', label: 'Image', description: 'Embed image from URL', icon: '🖼️' },
  { type: 'divider', label: 'Divider', description: 'Visual horizontal line', icon: '➖' },
  { type: 'toggle', label: 'Toggle List', description: 'Collapsible toggle section', icon: '▶️' },
  { type: 'pdf', label: 'PDF Document', description: 'Structural PDF placeholder', icon: '📄' },
  { type: 'audio', label: 'Audio Clip', description: 'Structural audio placeholder', icon: '🎵' },
  { type: 'database', label: 'Database View', description: 'Structural database placeholder', icon: '🗄️' },
  { type: 'ai', label: 'AI Assistant Block', description: 'Structural AI prompt placeholder', icon: '✨' },
];

interface BlockSlashMenuProps {
  position?: { top: number; left: number };
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}

export const BlockSlashMenu: React.FC<BlockSlashMenuProps> = ({
  position,
  onSelect,
  onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredItems = SLASH_MENU_ITEMS.filter(
    item =>
      item.label.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase()) ||
      item.type.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  const style = position
    ? { top: `${position.top}px`, left: `${position.left}px` }
    : undefined;

  return (
    <div
      ref={menuRef}
      style={style}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-white/20 bg-white/95 dark:bg-gray-900/95 p-2 shadow-2xl backdrop-blur-md text-left text-sm"
    >
      <input
        type="text"
        autoFocus
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter block types..."
        className="w-full px-2 py-1.5 mb-2 text-xs rounded-md bg-black/5 dark:bg-white/10 outline-none font-mono"
      />
      {filteredItems.length === 0 ? (
        <div className="p-3 text-xs opacity-50 text-center">No matching blocks</div>
      ) : (
        filteredItems.map((item, idx) => (
          <div
            key={`${item.type}-${idx}`}
            onClick={() => onSelect(item)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              idx === selectedIndex ? 'bg-accent text-white font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{item.label}</div>
              <div className="text-[10px] opacity-75 truncate">{item.description}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
