'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TermTooltip({ term, explanation }: { term: string, explanation: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} 
        className="text-muted-foreground hover:text-foreground transition-colors ml-1 focus:outline-none"
        title={term}
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-card text-card-foreground border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-lg">{term}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {explanation}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
