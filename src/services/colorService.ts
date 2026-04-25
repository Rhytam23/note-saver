import type { Tag } from '../types';

export const tagColorOptions = [
    { name: 'sky', textClass: 'text-sky-400', bgClass: 'bg-sky-500/10', borderClass: 'border-sky-500/20', swatchClass: 'bg-sky-400' },
    { name: 'emerald', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20', swatchClass: 'bg-emerald-400' },
    { name: 'amber', textClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20', swatchClass: 'bg-amber-400' },
    { name: 'pink', textClass: 'text-pink-400', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/20', swatchClass: 'bg-pink-400' },
    { name: 'purple', textClass: 'text-purple-400', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/20', swatchClass: 'bg-purple-400' },
    { name: 'indigo', textClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20', swatchClass: 'bg-indigo-400' },
    { name: 'rose', textClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20', swatchClass: 'bg-rose-400' },
    { name: 'slate', textClass: 'text-slate-400', bgClass: 'bg-slate-500/10', borderClass: 'border-slate-500/20', swatchClass: 'bg-slate-400' },
];

const getColorByName = (name: string) => {
    return tagColorOptions.find(c => c.name === name);
};

const getColorByHash = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % tagColorOptions.length);
    return tagColorOptions[index];
};

export const getTagColorClasses = (tagName: string, customTags: Tag[]): string => {
    const customTag = customTags.find(t => t.name === tagName);
    const colorName = customTag?.color;
    
    const color = colorName ? getColorByName(colorName) : getColorByHash(tagName);
    
    if (color) {
        return `${color.bgClass} ${color.textClass} ${color.borderClass}`;
    }
    // Fallback
    const fallbackColor = tagColorOptions[0];
    return `${fallbackColor.bgClass} ${fallbackColor.textClass} ${fallbackColor.borderClass}`;
};

export const getTextColorClass = (tagName: string, customTags: Tag[]): string => {
    const customTag = customTags.find(t => t.name === tagName);
    const colorName = customTag?.color;
    
    const color = colorName ? getColorByName(colorName) : getColorByHash(tagName);

    return color ? color.textClass : tagColorOptions[0].textClass;
};
