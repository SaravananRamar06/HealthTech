// src/components/record/LabTrend.tsx - Lab results table with longitudinal trend visualization
// Owner: P1 / P4

import type { LabResult } from '@/lib/types';
import { SourceBadge } from './SourceBadge';
import { Activity, TrendingDown, TrendingUp, Minus, XCircle } from 'lucide-react';

interface LabTrendProps {
  labs: LabResult[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}

export function LabTrend({ labs, onRemove, readOnly = false }: LabTrendProps) {
  if (!labs || labs.length === 0) {
    return <p className="text-sm text-[#6e7771] italic py-2">No lab results recorded.</p>;
  }

  // Group labs by test name
  const byTest = new Map<string, LabResult[]>();
  for (const lab of labs) {
    const list = byTest.get(lab.test) || [];
    list.push(lab);
    byTest.set(lab.test, list);
  }

  // Sort each group chronologically
  for (const list of byTest.values()) {
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  return (
    <div className="space-y-4">
      {Array.from(byTest.entries()).map(([testName, testLabs]) => {
        const latest = testLabs[testLabs.length - 1];
        const previous = testLabs.length > 1 ? testLabs[testLabs.length - 2] : null;
        const hasTrend = testLabs.length > 1;

        // Sparkline coordinates calculation
        const values = testLabs.map((l) => l.value);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const valRange = maxVal - minVal || 1;
        const svgW = 120;
        const svgH = 34;
        const padding = 6;

        const points = testLabs.map((l, idx) => {
          const x = padding + (idx / (testLabs.length - 1 || 1)) * (svgW - padding * 2);
          const y = svgH - padding - ((l.value - minVal) / valRange) * (svgH - padding * 2);
          return { x, y, val: l.value, date: l.date };
        });

        const pathD = points.length === 1
          ? `M ${points[0].x} ${points[0].y} L ${svgW - padding} ${points[0].y}`
          : points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

        const isDrop = previous ? latest.value < previous.value : false;
        const isRise = previous ? latest.value > previous.value : false;

        return (
          <div
            key={testName}
            className="rounded-xl border border-[#e2e7e0] bg-white p-4 shadow-2xs transition-all hover:border-[#b8c9bf] hover:shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2ec] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ddf2e8] text-[#14382f]">
                  <Activity className="h-4 w-4 text-[#2b8a7e]" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#14382f] block">{testName}</span>
                  {latest.refRange && (
                    <span className="text-[11px] text-[#6e7771]">Ref Range: {latest.refRange}</span>
                  )}
                </div>
              </div>

              {/* Longitudinal trend badge & mini sparkline */}
              {hasTrend && previous && (
                <div className="flex items-center gap-3">
                  {/* SVG Sparkline */}
                  <div className="hidden sm:block">
                    <svg width={svgW} height={svgH} className="overflow-visible">
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#2b8a7e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={i === points.length - 1 ? 3.5 : 2.5}
                          fill={i === points.length - 1 ? '#14382f' : '#2b8a7e'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Trend Indicator */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-[#d6ded5] bg-[#f8f9f5] px-2.5 py-1 text-xs">
                    {isDrop && <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />}
                    {isRise && <TrendingUp className="h-3.5 w-3.5 text-amber-600" />}
                    {!isDrop && !isRise && <Minus className="h-3.5 w-3.5 text-zinc-500" />}
                    <span className="text-[#525d56] font-medium">Trend:</span>
                    <span className="font-mono text-[#6e7771]">{previous.value}</span>
                    <span className="text-[#a0aaa3]">→</span>
                    <span className="font-mono font-bold text-[#14382f]">
                      {latest.value} {latest.unit}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Individual test entries */}
            <div className="space-y-2">
              {testLabs.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#525d56] bg-[#f8f9f5] rounded-lg p-2.5 border border-[#ebf0ea]"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-[#14382f]">
                      {l.value} <span className="text-xs font-normal text-[#6e7771]">{l.unit}</span>
                    </span>
                    <span className="text-[#a0aaa3]">·</span>
                    <span className="font-medium text-[#404a44]">{l.date}</span>
                    <SourceBadge provenance={l.provenance} />
                  </div>

                  {!readOnly && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(l.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#859088] hover:text-rose-700 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
