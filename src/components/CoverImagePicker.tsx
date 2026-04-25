import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from "../contexts/SeasonalContext";
import { CloseIcon, ImageIcon } from "./Icons";

interface CoverImagePickerProps {
    onSelect: (imageUrl: string) => void;
    onClose: () => void;
    activeCover?: string;
}

const GRADIENTS = [
    { name: 'Peach', value: 'linear-gradient(to right, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' },
    { name: 'Ocean', value: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' },
    { name: 'Mint', value: 'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)' },
    { name: 'Sunset', value: 'linear-gradient(to right, #fa709a 0%, #fee140 100%)' },
    { name: 'Plum', value: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)' },
    { name: 'Deep Space', value: 'linear-gradient(to right, #434343 0%, black 100%)' },
    { name: 'Midnight', value: 'linear-gradient(to bottom, #0f2027, #203a43, #2c5364)' },
    { name: 'Mango', value: 'linear-gradient(to right, #f7971e, #ffd200)' },
];

const SOLID_COLORS = [
    { name: 'Gray', value: '#9ca3af' },
    { name: 'Red', value: '#f87171' },
    { name: 'Yellow', value: '#facc15' },
    { name: 'Green', value: '#4ade80' },
    { name: 'Blue', value: '#60a5fa' },
    { name: 'Purple', value: '#c084fc' },
    { name: 'Pink', value: '#f472b6' },
    { name: 'Dark', value: '#1f2937' },
];

const CoverImagePicker: React.FC<CoverImagePickerProps> = ({ onSelect, onClose, activeCover }) => {
    const { colors } = useSeason();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-xl shadow-2xl border ${colors.bgSimple} ${colors.border} ${colors.primaryText}`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Cover Image
                </h3>
                <button onClick={onClose} className={`p-1 rounded-full ${colors.hover}`}>
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Remove Option */}
                {activeCover && (
                    <button
                        onClick={() => onSelect('')}
                        className={`w-full py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
                    >
                        Remove Cover
                    </button>
                )}

                {/* Gradients */}
                <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colors.secondaryText}`}>Gradients</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {GRADIENTS.map((g) => (
                            <button
                                key={g.name}
                                onClick={() => onSelect(g.value)}
                                className="h-16 rounded-lg shadow-sm transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                style={{ background: g.value }}
                                title={g.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Solid Colors */}
                <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colors.secondaryText}`}>Colors</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {SOLID_COLORS.map((c) => (
                            <button
                                key={c.name}
                                onClick={() => onSelect(c.value)}
                                className="h-10 rounded-lg shadow-sm transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                style={{ background: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay click to close handling should be done by parent or wrapper */}
        </motion.div>
    );
};

export default CoverImagePicker;
