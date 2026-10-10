'use client';

import { useState, useRef, useEffect } from 'react';
import type { PatientRecord, AIChatMessage } from '@/lib/types';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Copy,
  Check,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Cloud,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { generateDeterministicAnswer } from '@/lib/ai/assistant';

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${Date.now()}_${messageCounter}`;
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface AskCareBridgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientRecord;
  aiMode: 'gemini' | 'local';
  onOpenConsent: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Which medications are currently listed in my records?',
  'When was my most recent HbA1c result recorded?',
  'Which allergies have been documented?',
  'What changed between these two lab reports?',
  'Which medications have a dosage that still needs confirmation?',
  'Summarise my last three recorded care events.',
  'Prepare a concise summary I can take to my next appointment.',
];

export function AskCareBridgeDrawer({
  isOpen,
  onClose,
  record,
  aiMode,
  onOpenConsent,
}: AskCareBridgeDrawerProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **CareBridge Assistant**. I can answer questions strictly using the clinical records and documents in your health vault.\n\nAsk me about your medications, recent lab trends, recorded allergies, or care events below.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedExcerpts, setExpandedExcerpts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: AIChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: query,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      if (aiMode === 'local') {
        const data = generateDeterministicAnswer(query, record);
        setMessages((prev) => [...prev, {
          id: createMessageId('assistant'), role: 'assistant', content: data.answer,
          citations: data.citations, timestamp: getFormattedTime(),
          uncertainty: data.uncertainty, mode: data.mode,
        }]);
        return;
      }
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          record,
          consented: aiMode === 'gemini',
          forceDeterministic: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Assistant API returned an error');
      }

      const data = await res.json();

      const assistantMsg: AIChatMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: getFormattedTime(),
        uncertainty: data.uncertainty,
        mode: data.mode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Ask CareBridge error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('err'),
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing your question. Please try again or switch to Local Deterministic Mode.',
          timestamp: getFormattedTime(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      showToast('Copied answer to clipboard', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Conversation reset. Ask me anything about your current medications, lab results, allergies, or past visits.`,
        timestamp: 'Just now',
      },
    ]);
    showToast('Conversation cleared', 'info');
  };

  const toggleExcerpt = (citationId: string) => {
    setExpandedExcerpts((prev) => ({
      ...prev,
      [citationId]: !prev[citationId],
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-carebridge-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-[#f8f9f5] shadow-2xl border-l border-[#d6ded5] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e7e0] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14382f] text-[#3eb4a4] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ask-carebridge-title" className="text-base font-bold tracking-tight text-[#14382f]">
                  Ask CareBridge
                </h2>
                <button
                  type="button"
                  onClick={onOpenConsent}
                  className="inline-flex items-center gap-1 rounded-md bg-[#ddf2e8] px-2 py-0.5 text-[10px] font-bold text-[#14382f] hover:bg-[#ccebe0] transition-colors"
                  title="Configure AI Privacy Mode"
                >
                  {aiMode === 'gemini' ? (
                    <>
                      <Cloud className="h-3 w-3 text-[#2b8a7e]" />
                      <span>Gemini AI</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="h-3 w-3 text-[#2b8a7e]" />
                      <span>Local Mode</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#6e7771]">Grounded answers with exact document citations</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg p-2 text-[#6e7771] hover:bg-[#f1f4ee] hover:text-[#14382f] transition-colors"
              title="Reset Conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Assistant"
              className="rounded-lg p-2 text-[#6e7771] hover:bg-[#f1f4ee] hover:text-[#14382f] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-[#14382f] text-[#ddf2e8]'
                      : 'bg-white text-[#1c2420] border border-[#e2e7e0]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Citation Cards */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#e2e7e0] space-y-2">
                      <p className="text-[11px] font-bold text-[#14382f] uppercase tracking-wider flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-[#2b8a7e]" />
                        <span>Supporting Sources ({msg.citations.length}):</span>
                      </p>
                      <div className="space-y-1.5">
                        {msg.citations.map((c) => {
                          const isExpanded = Boolean(expandedExcerpts[c.id]);
                          return (
                            <div
                              key={c.id}
                              className="rounded-xl border border-[#d6ded5] bg-[#f8f9f5] p-2.5 text-[11px] space-y-1 hover:border-[#2b8a7e] transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#14382f] truncate">
                                  {c.title}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                    c.provenanceKind === 'document'
                                      ? 'bg-[#ddf2e8] text-[#14382f]'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {c.provenanceKind === 'document' ? 'From document' : 'Patient-reported'}
                                </span>
                              </div>

                              {c.date && (
                                <p className="text-[#6e7771] text-[10px]">Date: {c.date}</p>
                              )}

                              {c.excerpt && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleExcerpt(c.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-[#2b8a7e] hover:underline"
                                  >
                                    <span>{isExpanded ? 'Hide verbatim excerpt' : 'View verbatim excerpt'}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                  {isExpanded && (
                                    <div className="mt-1.5 rounded-lg border-l-2 border-[#2b8a7e] bg-white p-2 text-[10px] text-[#3b4c44] italic">
                                      &ldquo;{c.excerpt}&rdquo;
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uncertainty / Warning Callout */}
                  {msg.uncertainty && (
                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <span>Evidence is partial, unverified, or not documented in your records.</span>
                    </div>
                  )}

                  {/* Action row */}
                  {!isUser && (
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#6e7771] pt-1">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="inline-flex items-center gap-1 hover:text-[#14382f] transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 border border-[#e2e7e0] shadow-2xs max-w-[80%] text-xs text-[#525d56]">
              <Loader2 className="h-4 w-4 animate-spin text-[#2b8a7e]" />
              <span>CareBridge is reviewing your records...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Question Chips */}
        <div className="border-t border-[#e2e7e0] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6e7771] mb-2">
            Suggested Questions:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="rounded-lg border border-[#d6ded5] bg-[#f8f9f5] px-2.5 py-1 text-[11px] font-medium text-[#14382f] hover:bg-[#ddf2e8] hover:border-[#2b8a7e] disabled:opacity-50 transition-all text-left truncate max-w-full"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input Box */}
        <div className="border-t border-[#e2e7e0] bg-white p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about your health records..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-[#d6ded5] bg-[#f8f9f5] px-3.5 py-2.5 text-xs text-[#1c2420] placeholder-[#6e7771] focus:border-[#2b8a7e] focus:bg-white focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#14382f] text-white shadow-xs hover:bg-[#1a473c] disabled:opacity-40 transition-all"
            >
              <Send className="h-4 w-4 text-[#3eb4a4]" />
            </button>
          </form>
          <p className="text-[10px] text-[#6e7771] text-center mt-2">
            Answers are grounded solely in uploaded records. Not a diagnosis or clinical recommendation.
          </p>
        </div>
      </div>
    </div>
  );
}
