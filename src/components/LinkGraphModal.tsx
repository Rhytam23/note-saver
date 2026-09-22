import React, { useMemo } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import type { Note } from '../types';
import { buildLinkGraph, layoutCircular } from '../services/linkGraph';

interface LinkGraphModalProps {
  notes: Note[];
  onOpenNote: (id: string) => void;
  onClose: () => void;
}

const VIEW = 380;
const RADIUS = 150;

const LinkGraphModal: React.FC<LinkGraphModalProps> = ({ notes, onOpenNote, onClose }) => {
  const { colors } = useSeason();
  const graph = useMemo(() => buildLinkGraph(notes), [notes]);
  const positions = useMemo(() => layoutCircular(graph.nodes, RADIUS), [graph.nodes]);
  const center = VIEW / 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Note connections"
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Note connections</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>

        {graph.nodes.length === 0 ? (
          <p className={`text-sm ${colors.secondaryText}`}>
            No linked notes yet. Type [[Note title]] inside a note to connect it to another one.
          </p>
        ) : (
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-auto" role="img" aria-label="Graph of linked notes">
            <g stroke="currentColor" className={colors.secondaryText} strokeOpacity="0.4" strokeWidth="1">
              {graph.edges.map((edge, i) => {
                const from = positions[edge.from];
                const to = positions[edge.to];
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={center + from.x}
                    y1={center + from.y}
                    x2={center + to.x}
                    y2={center + to.y}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </g>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" className={colors.secondaryText} fill="currentColor" fillOpacity="0.6" />
              </marker>
            </defs>
            {graph.nodes.map(node => {
              const pos = positions[node.id];
              if (!pos) return null;
              const x = center + pos.x;
              const y = center + pos.y;
              return (
                <g
                  key={node.id}
                  transform={`translate(${x} ${y})`}
                  onClick={() => onOpenNote(node.id)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`Open ${node.title}`}
                >
                  <circle r="6" className="fill-accent" />
                  <text
                    y="-10"
                    textAnchor="middle"
                    fontSize="11"
                    className={colors.primaryText}
                    fill="currentColor"
                  >
                    {node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

export default LinkGraphModal;
