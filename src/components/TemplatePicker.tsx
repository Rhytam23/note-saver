import React from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import { NOTE_TEMPLATES, type NoteTemplate } from '../services/noteTemplates';

interface TemplatePickerProps {
  onSelect: (template: NoteTemplate) => void;
  onClose: () => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect, onClose }) => {
  const { colors } = useSeason();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Start from a template"
    >
      <div
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Start from a template</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {NOTE_TEMPLATES.map(template => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => onSelect(template)}
                className={`w-full text-left p-3 rounded-lg border ${colors.border} ${colors.hover}`}
              >
                <span className="block font-medium">{template.name}</span>
                <span className={`block text-sm ${colors.secondaryText}`}>{template.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TemplatePicker;
