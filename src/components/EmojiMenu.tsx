import React, { useEffect, useState } from 'react';
import { useSeason } from "../contexts/SeasonalContext";
import { EMOJIS } from "../extensions/EmojiSuggestion";

interface EmojiMenuProps {
    position: { top: number; left: number };
    onSelect: (emoji: string) => void;
    onClose: () => void;
    filterText: string;
}

const EmojiMenu: React.FC<EmojiMenuProps> = ({ position, onSelect, onClose, filterText }) => {
    const { colors } = useSeason();
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredEmojis = EMOJIS.filter(e =>
        e.name.toLowerCase().includes(filterText.toLowerCase())
    ).slice(0, 8);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filterText]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredEmojis.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredEmojis.length) % filteredEmojis.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredEmojis[selectedIndex]) {
                    onSelect(filteredEmojis[selectedIndex].emoji);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredEmojis, selectedIndex, onSelect, onClose]);

    if (filteredEmojis.length === 0) return null;

    return (
        <div
            className={`fixed z-50 w-48 overflow-hidden rounded-lg shadow-xl border backdrop-blur-md ${colors.surface} ${colors.border} ${colors.primaryText}`}
            style={{ top: position.top, left: position.left }}
        >
            <div className="p-1">
                {filteredEmojis.map((e, index) => (
                    <button
                        key={e.name}
                        onClick={() => onSelect(e.emoji)}
                        className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${index === selectedIndex ? colors.hover + ' ' + colors.surface : ''
                            }`}
                    >
                        <span className="text-xl mr-3">{e.emoji}</span>
                        <span className="text-sm font-medium">:{e.name}:</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmojiMenu;
