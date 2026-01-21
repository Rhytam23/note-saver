import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext.tsx';
import {
    H1Icon, H2Icon, H3Icon,
    ListBulletIcon, ListOrderedIcon,
    BlockquoteIcon, CodeBracketIcon,
    SparklesIcon
} from './Icons.tsx';

interface SlashCommand {
    id: string;
    label: string;
    subLabel?: string;
    icon: React.ReactNode;
    action: string;
}

interface SlashMenuProps {
    position: { top: number; left: number };
    onSelect: (commandId: string) => void;
    onClose: () => void;
    filterText: string;
}

const COMMANDS: SlashCommand[] = [
    { id: 'h1', label: 'Heading 1', subLabel: 'Big section heading', icon: <H1Icon className="h-4 w-4" />, action: 'format-h1' },
    { id: 'h2', label: 'Heading 2', subLabel: 'Medium section heading', icon: <H2Icon className="h-4 w-4" />, action: 'format-h2' },
    { id: 'h3', label: 'Heading 3', subLabel: 'Small section heading', icon: <H3Icon className="h-4 w-4" />, action: 'format-h3' },
    { id: 'bullet', label: 'Bullet List', subLabel: 'Create a simple bulleted list', icon: <ListBulletIcon className="h-4 w-4" />, action: 'format-bullet' },
    { id: 'ordered', label: 'Numbered List', subLabel: 'Create a list with numbering', icon: <ListOrderedIcon className="h-4 w-4" />, action: 'format-ordered' },
    { id: 'quote', label: 'Quote', subLabel: 'Capture a quote', icon: <BlockquoteIcon className="h-4 w-4" />, action: 'format-quote' },
    { id: 'code', label: 'Code Block', subLabel: 'Capture a code snippet', icon: <CodeBracketIcon className="h-4 w-4" />, action: 'format-code' },
    { id: 'ai', label: 'Ask AI', subLabel: 'Generate content with AI', icon: <SparklesIcon className="h-4 w-4" />, action: 'trigger-ai' },
];

const SlashMenu: React.FC<SlashMenuProps> = ({ position, onSelect, onClose, filterText }) => {
    const { colors } = useSeason();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const filteredCommands = COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(filterText.toLowerCase()) ||
        (cmd.subLabel && cmd.subLabel.toLowerCase().includes(filterText.toLowerCase()))
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [filterText]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex].id);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, selectedIndex, onSelect, onClose]);

    if (filteredCommands.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className={`fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg shadow-xl border ${colors.bgSimple} ${colors.border} ${colors.primaryText}`}
            style={{ top: position.top, left: position.left }}
        >
            <div className="p-1">
                {filteredCommands.map((cmd, index) => (
                    <button
                        key={cmd.id}
                        onClick={() => onSelect(cmd.id)}
                        className={`w-full flex items-center px-2 py-2 text-left rounded-md transition-colors ${index === selectedIndex ? colors.hover + ' ' + colors.surface : ''
                            }`}
                    >
                        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded border ${colors.border} bg-white dark:bg-gray-800 mr-3`}>
                            {cmd.icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{cmd.label}</p>
                            <p className={`text-xs ${colors.secondaryText}`}>{cmd.subLabel}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SlashMenu;
