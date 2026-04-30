import React, { useState } from 'react';
import { summarizeText, proofreadText, generateIdeas, detectAiContent } from '../services/geminiService';
import { DocumentTextIcon, CheckBadgeIcon, LightBulbIcon, SpinnerIcon, SearchIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';
import DOMPurify from 'dompurify';

interface AiAssistantProps {
  noteContent: string;
  onApply: (newContent: string, mode: 'replace' | 'append') => void;
}

type AiTab = 'summarize' | 'proofread' | 'ideas' | 'detect';

const AiAssistant: React.FC<AiAssistantProps> = ({ noteContent, onApply }) => {
  const { colors } = useSeason();
  const [activeTab, setActiveTab] = useState<AiTab>('summarize');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<AiTab, string | null>>({
    summarize: null,
    proofread: null,
    ideas: null,
    detect: null
  });

  const handleAction = async (tab: AiTab) => {
    if (!noteContent.trim()) {
      setError("Please write some content first.");
      return;
    }
    
    // Switch tab first
    setActiveTab(tab);
    
    // If we already have a result for this tab, don't re-run automatically unless it's a "Scan Again"
    if (results[tab]) return;

    await runAction(tab);
  };

  const formatAiResponse = (text: string) => {
    if (!text) return '';
    return text
      // Convert bold Markdown
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/__(.*?)__/g, '<b>$1</b>')
      // Convert bullet points if they aren't already HTML
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      // Wrap bullet points in <ul> if they are loose
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      // Remove double <ul> if they got nested
      .replace(/<\/ul><ul>/g, '');
  };

  const runAction = async (tab: AiTab) => {
    setIsLoading(true);
    setError(null);
    try {
      let response = '';
      switch (tab) {
        case 'summarize': response = await summarizeText(noteContent); break;
        case 'proofread': response = await proofreadText(noteContent); break;
        case 'ideas': response = await generateIdeas(noteContent); break;
        case 'detect': response = await detectAiContent(noteContent); break;
      }
      
      // Apply the fallback formatter to handle stray Markdown
      const formattedResponse = formatAiResponse(response);
      setResults(prev => ({ ...prev, [tab]: formattedResponse }));
    } catch (err: any) {
      setError(err.message || "An AI error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: AiTab, icon: any, label: string }[] = [
    { id: 'summarize', icon: DocumentTextIcon, label: 'Summary' },
    { id: 'proofread', icon: CheckBadgeIcon, label: 'Proof' },
    { id: 'ideas', icon: LightBulbIcon, label: 'Ideas' },
    { id: 'detect', icon: SearchIcon, label: 'Detect' },
  ];

  return (
    <div className={`flex flex-col rounded-xl border transition-all duration-300 ${colors.border} ${colors.surface} overflow-hidden shadow-2xl backdrop-blur-md`}>
      {/* Tabs Header */}
      <div className={`flex border-b ${colors.border} bg-white/5`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleAction(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 gap-1 transition-all relative ${
              activeTab === tab.id ? colors.primaryText : colors.secondaryText + ' opacity-60 hover:opacity-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]`} />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-4 min-h-[180px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-6">
            <SpinnerIcon className="h-8 w-8 animate-spin text-accent" />
            <span className={`text-xs animate-pulse font-medium ${colors.secondaryText}`}>Neural link established...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-error font-medium mb-2">Detection Error</p>
            <p className={`text-[10px] ${colors.secondaryText}`}>{error}</p>
            <button onClick={() => runAction(activeTab)} className="mt-3 text-[10px] underline text-accent">Retry Connection</button>
          </div>
        ) : !results[activeTab] ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center opacity-60">
            <p className={`text-xs ${colors.secondaryText}`}>No data analyzed for this module.</p>
            <button 
              onClick={() => runAction(activeTab)}
              className={`mt-3 text-xs px-4 py-1.5 rounded-full border ${colors.border} ${colors.hover} ${colors.primaryText}`}
            >
              Analyze Content
            </button>
          </div>
        ) : (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Sanitize and Render HTML Result */}
            <div 
              className={`prose-sm prose-invert text-xs leading-relaxed ${colors.primaryText} max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(results[activeTab] || '') }}
            />

            {/* Actions Footer */}
            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
              {activeTab === 'detect' ? (
                <button
                  onClick={() => runAction('detect')}
                  className={`flex-1 text-[11px] py-2 border font-bold rounded-lg transition-all ${colors.border} ${colors.hover} ${colors.primaryText}`}
                >
                  Scan Again
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onApply(results[activeTab]!, activeTab === 'proofread' ? 'replace' : 'append')}
                    className="flex-[2] text-[11px] py-2 bg-accent text-primary-bg font-bold rounded-lg hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)] transition-all"
                  >
                    {activeTab === 'proofread' ? 'Apply Correction' : 'Append to Note'}
                  </button>
                  <button
                    onClick={() => runAction(activeTab)}
                    className={`flex-1 text-[11px] py-2 border font-bold rounded-lg transition-all ${colors.border} ${colors.hover} ${colors.primaryText}`}
                  >
                    Re-run
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistant;
