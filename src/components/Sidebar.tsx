import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, Tag, PriorityFilter, NotePriority } from "../types";
import { useSeason } from "../contexts/SeasonalContext";
import { useClickOutside } from "../hooks/useClickOutside";
import { useRouter } from '../contexts/RouterContext';
import {
    TagIcon,
    NotesIcon,
    ChevronDoubleLeftIcon,
    PlusIcon,
    FlagIcon,
    QuestionMarkCircleIcon,
    PaletteIcon,
    ImageIcon,
    CloseIcon,
    LockIcon,
} from './Icons.tsx';
import { getTextColorClass, tagColorOptions } from "../services/colorService";

interface SidebarProps {
    user: User;
    tags: string[];
    customTags: Tag[];
    addOrUpdateCustomTag: (tag: Tag) => void;
    activeTag: string | null;
    setActiveTag: (tag: string | null) => void;
    activePriority: PriorityFilter;
    setActivePriority: (priority: PriorityFilter) => void;
    onClearFilters: () => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onProfileClick: () => void;
    onAddTag: (tagName: string) => void;
    onDeleteCustomTag: (tagName: string) => void;
    onTutorialClick: () => void;
    // Tools: each opens its own modal, rendered by App so it can sit above everything (including a mobile sidebar drawer).
    onOpenTrash: () => void;
    onOpenFlashcards: () => void;
    onOpenReminders: () => void;
    onOpenTemplates: () => void;
    onOpenNotebooks: () => void;
    onOpenGraph: () => void;
}

const sidebarVariants: any = {
    collapsed: { width: '80px', transition: { duration: 0.3, ease: 'easeInOut' } },
    expanded: { width: '280px', transition: { duration: 0.3, ease: 'easeInOut' } },
};

const mobileSidebarVariants: any = {
    hidden: { x: '-100%' },
    visible: { x: '0%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
};

const NavItem: React.FC<{
    isCollapsed: boolean;
    icon: React.ReactNode;
    text: string;
    isActive?: boolean;
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
}> = ({ isCollapsed, icon, text, isActive, onClick, children, className }) => {
    const { colors } = useSeason();
    // Rendered as a div with role="button" rather than a real <button>: some rows (tags) nest
    // their own action button (edit/delete) inside, and a <button> cannot contain a <button>.
    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
            className={`group flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? `bg-accent/10 text-accent font-semibold` : `${colors.hover} ${colors.primaryText}`
                } ${className} ${onClick ? 'cursor-pointer' : ''}`}
        >
            {icon}
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto', transition: { delay: 0.1 } }}
                        exit={{ opacity: 0, width: 0 }}
                        className="ml-4 whitespace-nowrap flex-1 text-left"
                    >
                        {text}
                    </motion.span>
                )}
            </AnimatePresence>
            {!isCollapsed && children}
        </div>
    );
};

const SectionHeader: React.FC<{ isCollapsed: boolean, icon: React.ReactNode, text: string, onAdd?: () => void }> = ({ isCollapsed, icon, text, onAdd }) => {
    const { colors } = useSeason();
    return (
        <div className={`flex items-center justify-between mb-3 pt-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <h2 className={`text-xs font-semibold uppercase ${colors.secondaryText} ${isCollapsed ? '' : 'pl-4'}`}>
                {isCollapsed ? icon : text}
            </h2>
            {!isCollapsed && onAdd && (
                <button onClick={onAdd} className={`p-1 rounded ${colors.hover}`}>
                    <PlusIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

const UserProfile: React.FC<Pick<SidebarProps, 'user' | 'isCollapsed' | 'onProfileClick'>> = ({ user, isCollapsed, onProfileClick }) => {
    const { colors } = useSeason();
    const userInitial = user.name ? user.name[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : '?');

    return (
        <motion.button
            layout="position"
            onClick={onProfileClick}
            className={`flex items-center w-full space-x-3 ${isCollapsed ? 'justify-center' : ''}`}
        >
            <div className="w-10 h-10 rounded-full bg-link flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" /> : userInitial}
            </div>
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-left overflow-hidden"
                    >
                        <p className={`font-semibold text-sm truncate ${colors.primaryText}`}>{user.name || 'User'}</p>
                        <p className={`text-xs ${colors.secondaryText} truncate`}>{user.email}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    )
}

const SidebarContent: React.FC<Omit<SidebarProps, 'isOpen' | 'setIsOpen'> & { setTagToEdit: (tag: Tag | null) => void }> = (props) => {
    const {
        user,
        tags,
        customTags,
        activeTag,
        setActiveTag,
        activePriority,
        setActivePriority,
        onClearFilters,
        isCollapsed,
        setIsCollapsed,
        onProfileClick,
        onAddTag,
        onTutorialClick,
        setTagToEdit,
        onOpenTrash,
        onOpenFlashcards,
        onOpenReminders,
        onOpenTemplates,
        onOpenNotebooks,
        onOpenGraph,
    } = props;
    const { colors } = useSeason();
    const { pushPath } = useRouter();
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTagName.trim() && !tags.includes(newTagName.trim())) {
            onAddTag(newTagName.trim());
            setNewTagName('');
            setIsAddingTag(false);
        }
    };

    const priorities: { name: 'high' | 'medium' | 'low'; icon: React.ReactNode; text: string }[] = [
        { name: 'high', icon: <FlagIcon className="h-5 w-5 text-red-500" />, text: 'High' },
        { name: 'medium', icon: <FlagIcon className="h-5 w-5 text-amber-500" />, text: 'Medium' },
        { name: 'low', icon: <FlagIcon className="h-5 w-5 text-sky-500" />, text: 'Low' },
    ];

    return (
        <div className={`h-full flex flex-col p-4 ${colors.surface}`}>
            <header className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-6`}>
                {!isCollapsed && <UserProfile user={user} isCollapsed={isCollapsed} onProfileClick={onProfileClick} />}
                {isCollapsed &&
                    <button onClick={onProfileClick}>
                        <UserProfile user={user} isCollapsed={isCollapsed} onProfileClick={onProfileClick} />
                    </button>
                }
                <button onClick={() => setIsCollapsed(!isCollapsed)} className={`p-2 rounded-full ${colors.hover}`}>
                    <ChevronDoubleLeftIcon className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
                </button>
            </header>

            <nav className="space-y-1">
                <NavItem
                    isCollapsed={isCollapsed}
                    icon={<NotesIcon className="h-6 w-6" />}
                    text="Dashboard"
                    onClick={() => {
                        onClearFilters();
                        pushPath('/dashboard');
                    }}
                />
                <NavItem
                    isCollapsed={isCollapsed}
                    icon={<NotesIcon className="h-6 w-6 text-accent" />}
                    text="My Notes"
                    isActive={!activeTag && !activePriority}
                    onClick={() => {
                        onClearFilters();
                        pushPath('/notes');
                    }}
                />
                <NavItem
                    isCollapsed={isCollapsed}
                    icon={<TagIcon className="h-6 w-6 text-sky-500" />}
                    text="Profile & Settings"
                    onClick={() => {
                        pushPath('/profile');
                        onProfileClick();
                    }}
                />
                <NavItem
                    isCollapsed={isCollapsed}
                    icon={<QuestionMarkCircleIcon className="h-6 w-6 text-emerald-500" />}
                    text="Support Center"
                    onClick={() => pushPath('/support')}
                />
            </nav>

            <div className="space-y-1 mt-4">
                <SectionHeader isCollapsed={isCollapsed} icon={<FlagIcon className="h-5 w-5" />} text="Priorities" />
                {priorities.map(p => (
                    <NavItem
                        key={p.name}
                        isCollapsed={isCollapsed}
                        icon={p.icon}
                        text={p.text}
                        isActive={activePriority === p.name}
                        onClick={() => setActivePriority(activePriority === p.name ? null : p.name)}
                    />
                ))}
            </div>

            <div className="flex-1 mt-4 overflow-y-auto overscroll-contain">
                <SectionHeader isCollapsed={isCollapsed} icon={<TagIcon className="h-5 w-5" />} text="Tags" onAdd={() => setIsAddingTag(!isAddingTag)} />
                <AnimatePresence>
                    {isAddingTag && !isCollapsed && (
                        <motion.form
                            key="add-tag-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleAddTag} className="mb-2 px-2"
                        >
                            <input
                                type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="New tag name..."
                                className={`w-full text-sm px-2 py-1 rounded border focus:ring-accent focus:border-accent text-left ${colors.surface} ${colors.border}`}
                                autoFocus
                            />
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="space-y-1">
                    {tags.map(tag => {
                        const customTag = customTags.find(t => t.name === tag) || { name: tag };
                        return (
                            <NavItem
                                key={tag}
                                isCollapsed={isCollapsed}
                                icon={
                                    customTag?.imageUrl ?
                                        <img src={customTag.imageUrl} alt={tag} className="h-6 w-6 rounded-full object-cover" />
                                        : <TagIcon className={`h-6 w-6 ${getTextColorClass(tag, customTags)}`} />
                                }
                                text={tag}
                                isActive={activeTag === tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                            >
                                <button onClick={(e) => { e.stopPropagation(); setTagToEdit(customTag); }} className={`p-1 rounded opacity-0 group-hover:opacity-100 ${colors.hover}`}>
                                    <PaletteIcon className="h-4 w-4" />
                                </button>
                            </NavItem>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-1 mt-4 flex-shrink-0">
                <SectionHeader isCollapsed={isCollapsed} icon={<PlusIcon className="h-5 w-5" />} text="Tools" />
                <NavItem isCollapsed={isCollapsed} icon={<PlusIcon className="h-6 w-6 text-accent" />} text="Templates" onClick={onOpenTemplates} />
                <NavItem isCollapsed={isCollapsed} icon={<TagIcon className="h-6 w-6 text-indigo-500" />} text="Notebooks" onClick={onOpenNotebooks} />
                <NavItem isCollapsed={isCollapsed} icon={<ImageIcon className="h-6 w-6 text-teal-500" />} text="Note Connections" onClick={onOpenGraph} />
                <NavItem isCollapsed={isCollapsed} icon={<FlagIcon className="h-6 w-6 text-amber-500" />} text="Flashcards" onClick={onOpenFlashcards} />
                <NavItem isCollapsed={isCollapsed} icon={<QuestionMarkCircleIcon className="h-6 w-6 text-sky-500" />} text="Reminders" onClick={onOpenReminders} />
                <NavItem isCollapsed={isCollapsed} icon={<LockIcon className="h-6 w-6 text-rose-500" />} text="Trash" onClick={onOpenTrash} />
            </div>

            <footer className="mt-auto flex-shrink-0">
                <NavItem isCollapsed={isCollapsed} icon={<QuestionMarkCircleIcon className="h-6 w-6" />} text="How to Use" onClick={onTutorialClick} />
            </footer>
        </div>
    );
};

const TagCustomizationMenu: React.FC<{ tag: Tag, onUpdate: (tag: Tag) => void, onDelete: (tagName: string) => void, onClose: () => void }> = ({ tag, onUpdate, onDelete, onClose }) => {
    const [editedTag, setEditedTag] = useState<Tag>(tag);
    const { colors } = useSeason();
    const menuRef = useRef<HTMLDivElement>(null);

    useClickOutside(menuRef, onClose);

    const handleColorSelect = (colorName: string) => {
        setEditedTag(prev => ({ ...prev, color: prev.color === colorName ? undefined : colorName }));
    };

    const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedTag(prev => ({ ...prev, imageUrl: e.target.value }));
    };

    const handlePrioritySelect = (priority: NotePriority) => {
        const newPriority = editedTag.defaultPriority === priority ? undefined : priority;
        setEditedTag(prev => ({ ...prev, defaultPriority: newPriority }));
    };

    const handleSave = () => {
        onUpdate(editedTag);
        onClose();
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete the tag "${tag.name}"? This action cannot be undone.`)) {
            onDelete(tag.name);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-6 rounded-lg shadow-xl border w-full max-w-sm ${colors.bgSimple} ${colors.border}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-semibold text-lg ${colors.primaryText}`}>Customize "{tag.name}"</h3>
                    <button onClick={onClose} className={`p-1 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white ${colors.hover}`}><CloseIcon className="h-5 w-5" /></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${colors.secondaryText}`}>Color</label>
                        <div className="grid grid-cols-8 gap-2">
                            {tagColorOptions.map(color => (
                                <button key={color.name} onClick={() => handleColorSelect(color.name)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${color.swatchClass} ${editedTag.color === color.name ? 'ring-2 ring-offset-2 ring-accent dark:ring-offset-slate-800' : ''}`} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="imageUrlInput" className={`block text-sm font-semibold mb-2 ${colors.secondaryText}`}>Image Icon URL</label>
                        <input
                            id="imageUrlInput"
                            type="text" value={editedTag.imageUrl || ''} onChange={handleImageUrlChange}
                            placeholder="https://example.com/icon.png"
                            className={`w-full text-sm px-3 py-2 rounded-lg border focus:ring-accent focus:border-accent ${colors.surface} ${colors.border}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${colors.secondaryText}`}>Default Priority</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['none', 'low', 'medium', 'high'] as NotePriority[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => handlePrioritySelect(p)}
                                    className={`w-full text-sm py-2 rounded-lg capitalize transition-colors ${editedTag.defaultPriority === p
                                        ? 'bg-accent text-primary-bg font-semibold'
                                        : `${colors.surface} ${colors.hover} ${colors.primaryText}`
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
                    >
                        Delete Tag
                    </button>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className={`px-4 py-2 text-sm rounded-lg ${colors.hover} ${colors.primaryText}`}>Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-accent text-primary-bg font-semibold rounded-lg">Save</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = (props) => {
    const { isOpen, setIsOpen, addOrUpdateCustomTag, onDeleteCustomTag } = props;
    const [tagToEdit, setTagToEdit] = useState<Tag | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useClickOutside(sidebarRef, () => {
        if (isOpen) setIsOpen(false);
    });

    return (
        <>
            <motion.aside
                variants={sidebarVariants}
                initial={false}
                animate={props.isCollapsed ? 'collapsed' : 'expanded'}
                className="hidden md:block h-screen sticky top-0 border-r border-divider-light dark:border-divider"
            >
                <SidebarContent {...props} setTagToEdit={setTagToEdit} />
            </motion.aside>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-30 md:hidden"
                        />
                        <motion.aside
                            ref={sidebarRef}
                            variants={mobileSidebarVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed top-0 left-0 h-full z-40 md:hidden"
                            style={{ width: '280px' }}
                        >
                            <SidebarContent {...{ ...props, isCollapsed: false, setIsCollapsed: () => { } }} setTagToEdit={setTagToEdit} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
            {tagToEdit && (
                <TagCustomizationMenu
                    tag={tagToEdit}
                    onUpdate={(updatedTag) => addOrUpdateCustomTag(updatedTag)}
                    onDelete={onDeleteCustomTag}
                    onClose={() => setTagToEdit(null)}
                />
            )}
        </>
    );
};

export default Sidebar;
