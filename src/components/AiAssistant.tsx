import React, { useState } from 'react';
import { summarizeText, proofreadText, generateIdeas } from '../services/geminiService';
import { DocumentTextIcon, CheckBadgeIcon, LightBulbIcon, SpinnerIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

interface AiAssistantProps {
  noteContent: string;
  onApply: (newContent: string, mode: 'replace' | 'append') => void;
}

type AiAction = 'summarize' | 'proofread' | 'ideas';

const AiAssistant: React.FC<AiAssistantProps> = ({ noteContent, onApply }) => {
  const { colors } = useSeason();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AiAction | null>(null);

  const handleAction = async (action: AiAction) => {
    if (!noteContent.trim()) {
      setError("Please write some content first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLastAction(action);
    try {
      let response = '';
      switch (action) {
        case 'summarize':
          response = await summarizeText(noteContent);
          break;
        case 'proofread':
          response = await proofreadText(noteContent);
          break;
        case 'ideas':
          response = await generateIdeas(noteContent);
          break;
      }
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An AI error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const actionButtons: { action: AiAction, icon: React.ReactNode, label: string }[] = [
    { action: 'summarize', icon: <DocumentTextIcon className="h-4 w-4" />, label: 'Summarize' },
    { action: 'proofread', icon: <CheckBadgeIcon className="h-4 w-4" />, label: 'Proofread' },
    { action: 'ideas', icon: <LightBulbIcon className="h-4 w-4" />, label: 'Ideas' },
  ];

  return (
    <div className={`p-3 rounded-lg border ${colors.border} ${colors.surface}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {actionButtons.map(({ action, icon, label }) => (
          <button
            key={action}
            id={action === 'summarize' ? 'ai-assistant-trigger' : undefined}
            onClick={() => handleAction(action)}
            disabled={isLoading}
            className={`flex items-center justify-center space-x-1.5 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-60 ${colors.hover} ${colors.primaryText}`}
            title={label}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className={`mt-3 flex items-center justify-center text-sm ${colors.secondaryText}`}>
          <SpinnerIcon className="h-4 w-4 mr-2" />
          <span>Thinking...</span>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-error bg-error/10 p-2 rounded-md">{error}</p>}

      {result && (
        <div className="mt-3 space-y-2">
          <div className={`text-xs p-2 rounded-md border max-h-40 overflow-y-auto ${colors.border} ${colors.surface} ${colors.primaryText}`}>
            <p className="whitespace-pre-wrap">{result}</p>
          </div>
          <div className="flex gap-2">
            {lastAction === 'proofread' ? (
              <button
                onClick={() => onApply(result, 'replace')}
                className="flex-1 text-xs py-1.5 bg-accent text-primary-bg font-semibold rounded-md hover:bg-accent/90"
              >
                Replace Note
              </button>
            ) : (
              <button
                onClick={() => onApply(result, 'append')}
                className="flex-1 text-xs py-1.5 bg-accent text-primary-bg font-semibold rounded-md hover:bg-accent/90"
              >
                Append to Note
              </button>
            )}
            {/* Allow append for proofread too, just in case */}
            {lastAction === 'proofread' && (
              <button
                onClick={() => onApply(result, 'append')}
                className={`flex-1 text-xs py-1.5 border font-semibold rounded-md ${colors.border} ${colors.hover} ${colors.primaryText}`}
              >
                Append
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
