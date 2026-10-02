'use client';

import React, { useState } from 'react';

export interface AttendanceBarChartProps {
  data: {
    day: string;
    date: string;
    count: number;
  }[];
}

export function AttendanceBarChart({ data }: AttendanceBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Belum ada data visualisasi 7 hari terakhir.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 5); // At least 5 for pleasant scale

  return (
    <div className="w-full">
      <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-2 px-2 relative">
        {/* Horizontal grid lines */}
        <div className="absolute inset-x-0 top-8 border-b border-slate-100 border-dashed pointer-events-none" />
        <div className="absolute inset-x-0 top-24 border-b border-slate-100 border-dashed pointer-events-none" />
        <div className="absolute inset-x-0 top-40 border-b border-slate-100 border-dashed pointer-events-none" />

        {data.map((item, index) => {
          const heightPct = Math.round((item.count / maxVal) * 100);
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={item.date}
              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-12 z-20 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap transform -translate-x-1/2 left-1/2 animate-fade-in pointer-events-none">
                  <p className="font-bold">{item.count} Karyawan Hadir</p>
                  <p className="text-[10px] text-slate-300">{item.day}, {item.date}</p>
                </div>
              )}

              {/* Bar */}
              <div className="w-full max-w-[40px] flex flex-col items-center justify-end h-full">
                <div
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                  className={`w-full rounded-t-xl transition-all duration-300 ${
                    isHovered
                      ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                      : 'bg-gradient-to-t from-blue-600/80 to-blue-400'
                  }`}
                />
              </div>

              {/* Day Label */}
              <div className="mt-3 text-center">
                <span className="block text-xs font-semibold text-slate-700">
                  {item.day.slice(0, 3)}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
