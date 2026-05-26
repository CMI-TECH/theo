"use client";

import { useState } from "react";

export interface PlanDay {
  num: number;
  label: string;    // "Terça, 27/05"
  duration: number; // minutes
  module: string;
  description?: string;
  course?: string;
}

export function StudyPlanSection({ days }: { days: PlanDay[] }) {
  const [expanded, setExpanded] = useState(false);

  if (days.length === 0) return null;

  const visible = expanded ? days : days.slice(0, 3);
  const hidden  = days.length - 3;

  return (
    <div className="border-t border-gray-50 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <span className="text-base leading-none">📅</span>
          Plano de estudos
          <span className="text-[10px] text-gray-400 font-normal">({days.length} dia{days.length !== 1 ? "s" : ""})</span>
        </p>
        {days.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
          >
            {expanded ? "▲ ver menos" : `▼ +${hidden} dias`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {visible.map((day) => (
          <div
            key={day.num}
            className="flex items-start gap-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/40 rounded-xl px-3 py-2.5 border border-blue-100/70"
          >
            {/* Day number bubble */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center mt-0.5 shadow-sm">
              {day.num}
            </div>

            <div className="min-w-0 flex-1">
              {/* Date + duration */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-blue-800">{day.label}</span>
                <span className="text-[9px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                  {day.duration}min
                </span>
              </div>
              {/* Module name */}
              <p className="text-[11px] text-gray-700 font-medium mt-0.5 leading-tight">
                {day.module}
              </p>
              {/* Description */}
              {day.description && (
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 leading-tight">
                  {day.description}
                </p>
              )}
              {/* Course */}
              {day.course && (
                <p className="text-[9px] text-blue-500 mt-0.5 truncate flex items-center gap-0.5">
                  <span>🎓</span> {day.course}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
