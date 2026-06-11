/**
 * Interactive Tutorial Component
 * Displays clickable nodes over app screenshots to guide users
 */

import React, { useState, useEffect } from 'react';
import { Pause, RefreshCw, XCircle, FileText, Plus, Trash2, ChevronDown } from 'lucide-react';

// Static Home Screen Component - Exact replica using real app code
function StaticHomeScreen() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-neutral-100 flex flex-col p-4 overflow-hidden relative">
      {/* Top Controls */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <Pause size={14} className="sm:w-4 sm:h-4" /> Pause
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <RefreshCw size={14} className="sm:w-4 sm:h-4" /> Recalibrate
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <XCircle size={14} className="sm:w-4 sm:h-4" /> Close
        </button>
      </div>

      {/* Top Quick Tools */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-blue-100 text-blue-700">
          Reversibles
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-orange-100 text-orange-700">
          ROSC
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-purple-100 text-purple-700">
          PHEA
        </button>
      </div>

      {/* Main Center Display */}
      <div className="flex-1 bg-white border-4 rounded-3xl relative overflow-hidden transition-colors duration-300 min-h-0 border-emerald-500">
        <div className="h-full flex flex-col items-center px-2 sm:px-3 pt-4 pb-2 sm:pb-3 relative">
          {/* Corner Cards */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between gap-3 sm:gap-4">
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">Total time</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">1:28</span>
            </div>
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">CPR round</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">1</span>
            </div>
          </div>

          {/* Rhythm Check - Centered vertically and responsive size */}
          <div className="flex-1 flex flex-col items-center justify-center w-full pt-14 sm:pt-16">
            <div className="relative flex items-center justify-center w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
                <circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-neutral-50"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-emerald-500"
                  strokeDasharray="879.64"
                  strokeDashoffset="454.77"
                  style={{ pathLength: 1 }}
                />
              </svg>
              
              <div className="flex flex-col items-center z-10 translate-y-3 sm:translate-y-4">
                <div className="text-7xl sm:text-[120px] font-bold tabular-nums tracking-tighter leading-none text-neutral-900">
                  0:58
                </div>
                <div className="text-[14px] sm:text-[18px] uppercase tracking-widest font-bold mt-4 sm:mt-8 text-neutral-400">
                  Rhythm Check
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Main Controls */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 flex-shrink-0">
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <FileText size={18} className="sm:w-6 sm:h-6" />
          Summary
        </button>
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <Plus size={18} className="sm:w-6 sm:h-6" />
          Add Tx
        </button>
      </div>
    </div>
  );
}

// Static Timing Method Screen - replica of catchup step 6
function StaticTimingMethodScreen({ cprFading = false }: { cprFading?: boolean }) {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-neutral-100 flex flex-col p-4 overflow-hidden relative justify-center">
      <div className="space-y-5 px-4 max-w-md mx-auto w-full">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900">Timing Method</h2>
          <p className="text-neutral-500 text-sm">How are you tracking rhythm checks?</p>
        </div>
        <div className="flex flex-col gap-3">
          {/* Record keeping only */}
          <div className="w-full rounded-2xl overflow-hidden border-2 border-neutral-200 bg-white">
            <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
              <div className="w-full max-w-[220px] rounded-xl border border-neutral-200 overflow-hidden text-left bg-white shadow-sm">
                <div className="bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-800 tracking-widest uppercase">Treatment Log</div>
                <div className="px-3 py-2 grid grid-cols-[2fr_1fr_1fr] gap-1 border-b border-neutral-100">
                  <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest">Treatment</span>
                  <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</span>
                  <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest text-right">Ago</span>
                </div>
                <div className="px-3 py-2"><span className="text-[11px] text-neutral-400 italic">No entries yet</span></div>
              </div>
            </div>
            <div className="py-2.5 text-sm font-bold text-center border-t border-neutral-200 bg-white text-neutral-700">No timer — record keeping only</div>
          </div>
          {/* CPR timer */}
          <div className="w-full rounded-2xl overflow-hidden border-2 border-neutral-200 bg-white" style={cprFading ? { animation: 'cprCardFade 2s ease-in-out infinite' } : {}}>
            <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
              <div className="relative w-[100px] h-[100px] flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="5"/>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset="138"/>
                </svg>
                <div className="flex flex-col items-center z-10">
                  <span className="text-[22px] font-bold tabular-nums leading-none text-neutral-900">1:00</span>
                  <span className="text-[7px] font-bold tracking-widest uppercase text-neutral-400 mt-1">Rhythm Check</span>
                </div>
              </div>
            </div>
            <div className="py-2.5 text-sm font-bold text-center border-t border-neutral-200 bg-white text-neutral-700">Inbuilt monitor CPR timer</div>
          </div>
          {/* Elapsed time */}
          <div className="w-full rounded-2xl overflow-hidden border-2 border-neutral-200 bg-white">
            <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
              <div className="relative w-[100px] h-[100px] flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="5"/>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset="207"/>
                </svg>
                <div className="flex flex-col items-center z-10">
                  <span className="text-[16px] font-bold tabular-nums leading-none text-neutral-900">00:05:00</span>
                  <span className="text-[7px] font-bold tracking-widest uppercase text-neutral-400 mt-1">Elapsed Time</span>
                </div>
              </div>
            </div>
            <div className="py-2.5 text-sm font-bold text-center border-t border-neutral-200 bg-white text-neutral-700">Elapsed time — odds/evens</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static Add Tx Menu Component - Rendered inside the central box like in the real app
function StaticAddTxMenu() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-neutral-100 flex flex-col p-4 overflow-hidden relative">
      {/* Top Controls */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <Pause size={14} className="sm:w-4 sm:h-4" /> Pause
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <RefreshCw size={14} className="sm:w-4 sm:h-4" /> Recalibrate
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <XCircle size={14} className="sm:w-4 sm:h-4" /> Close
        </button>
      </div>

      {/* Top Quick Tools */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-blue-100 text-blue-700">
          Reversibles
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-orange-100 text-orange-700">
          ROSC
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-purple-100 text-purple-700">
          PHEA
        </button>
      </div>

      {/* Main Center Display with Add Tx Menu Inside */}
      <div className="flex-1 bg-white border-4 rounded-3xl relative overflow-hidden transition-colors duration-300 min-h-0 border-emerald-500">
        {/* Add Tx Menu Content - STATIC, not scrollable */}
        <div className="h-full overflow-hidden">
          {/* Rhythm Check Section - COLLAPSED */}
          <div>
            <div className="flex items-center justify-between p-4 font-bold bg-rose-50 text-rose-800 border-b border-rose-100">
              <span>Rhythm Check</span>
              <ChevronDown className="transition-transform duration-300 -rotate-90" size={20} />
            </div>
          </div>

          {/* Medications Section - Expanded with SINGLE COLUMN, showing only first 5 medications */}
          <div>
            <div className="flex items-center justify-between p-4 font-bold bg-emerald-50 text-emerald-800 border-b border-emerald-100">
              <span>Medications</span>
              <ChevronDown className="transition-transform duration-300" size={20} />
            </div>
            <div className="bg-white p-3">
              <div className="grid grid-cols-1 gap-2">
                <button className="text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700">Adrenaline push</button>
                <button className="text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700">Adrenaline infusion</button>
                <button className="text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700">Amiodarone</button>
                <button className="text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700">Atropine</button>
                <button className="text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700">Calcium</button>
              </div>
            </div>
          </div>

          {/* Airway Section - Collapsed */}
          <div>
            <div className="flex items-center justify-between p-4 font-bold bg-blue-50 text-blue-800 border-b border-blue-100">
              <span>Airway</span>
              <ChevronDown className="transition-transform duration-300 -rotate-90" size={20} />
            </div>
          </div>

          {/* Other Tx Section - Collapsed */}
          <div>
            <div className="flex items-center justify-between p-4 font-bold bg-neutral-100 text-neutral-800 border-b border-neutral-200">
              <span>Other Tx</span>
              <ChevronDown className="transition-transform duration-300 -rotate-90" size={20} />
            </div>
          </div>

          {/* Custom Treatment Input */}
          <div className="p-3 border-t border-neutral-100 bg-white">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Custom treatment..."
                className="flex-1 bg-white border border-neutral-200 rounded-xl p-3 text-sm"
                disabled
              />
              <button className="bg-emerald-600 text-white px-5 rounded-xl font-bold text-sm">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Main Controls - VISIBLE */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 flex-shrink-0">
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <FileText size={18} className="sm:w-6 sm:h-6" />
          Summary
        </button>
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <Plus size={18} className="sm:w-6 sm:h-6" />
          Add Tx
        </button>
      </div>
    </div>
  );
}

// Static Adrenaline Dosing Component - Extracted from App.tsx medication dose selection
function StaticAdrenalineDose() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-white overflow-y-auto pb-4">
      <div className="p-6 mb-4">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Adrenaline push</h2>
        <p className="text-neutral-500 text-sm mb-2">Patient weight: 100kg</p>
        <p className="text-neutral-500 text-sm mb-6">Patient type: adult</p>
        
        <div className="space-y-3">
          <button className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold flex flex-col items-start gap-1">
            <span className="text-[10px] font-normal uppercase tracking-wide">CARDIAC ARREST</span>
            <span className="text-lg">1mg</span>
          </button>
          
          <div className="w-full flex gap-2 items-center">
            <div className="flex-1 relative flex items-center bg-white border border-neutral-200 rounded-xl min-w-0">
              <input
                type="text"
                placeholder="Custom dose (mg)..."
                className="flex-1 bg-transparent px-4 py-3 text-base outline-none min-w-0 text-right"
                disabled
              />
              <span className="pr-4 text-neutral-400 text-sm font-medium whitespace-nowrap">mg</span>
            </div>
            <button className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 pt-0">
        <button className="text-emerald-600 font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>
      </div>
    </div>
  );
}

// Static Home With Alerts Component - matches tutorial requirements
function StaticHomeWithAlerts() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-neutral-100 flex flex-col p-4 overflow-hidden relative">
      {/* Top Controls */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <Pause size={14} className="sm:w-4 sm:h-4" /> Pause
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <RefreshCw size={14} className="sm:w-4 sm:h-4" /> Recalibrate
        </button>
        <button className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <XCircle size={14} className="sm:w-4 sm:h-4" /> Close
        </button>
      </div>

      {/* Top Quick Tools */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-blue-100 text-blue-700">
          Reversibles
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-orange-100 text-orange-700">
          ROSC
        </button>
        <button className="p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors bg-purple-100 text-purple-700">
          PHEA
        </button>
      </div>

      {/* Main Center Display with Alerts */}
      <div className="flex-1 bg-white border-4 rounded-3xl relative overflow-hidden transition-colors duration-300 min-h-0 border-emerald-500">
        <div className="h-full flex flex-col items-center px-2 sm:px-3 pt-4 pb-2 sm:pb-3 relative">
          {/* Corner Cards */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between gap-3 sm:gap-4">
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">Total time</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">3:42</span>
            </div>
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">CPR round</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">2</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex-1 flex flex-col items-center justify-center w-full pt-14 sm:pt-16">
            <div className="relative flex items-center justify-center w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="6" className="text-neutral-50" />
                <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-emerald-500" strokeDasharray="879.64" strokeDashoffset="659.73" style={{ pathLength: 1 }} />
              </svg>
              <div className="flex flex-col items-center z-10 translate-y-3 sm:translate-y-4">
                <div className="text-7xl sm:text-[120px] font-bold tabular-nums tracking-tighter leading-none text-neutral-900">1:15</div>
                <div className="text-[14px] sm:text-[18px] uppercase tracking-widest font-bold mt-4 sm:mt-8 text-neutral-400">Rhythm Check</div>
              </div>
            </div>
          </div>

          {/* Alert Banners at bottom - NEW FORMAT */}
          <div className="absolute bottom-3 left-3 right-3 space-y-2">
            <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="font-bold text-amber-900 text-sm">Adrenaline due</span>
              </div>
              <span className="text-amber-700 text-xs font-semibold">Next: 4:14</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Main Controls */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 flex-shrink-0">
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <FileText size={18} className="sm:w-6 sm:h-6" />
          Summary
        </button>
        <button className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-emerald-600 text-white">
          <Plus size={18} className="sm:w-6 sm:h-6" />
          Add Tx
        </button>
      </div>
    </div>
  );
}

// Static Summary Component - Extracted from SummaryOverlay in App.tsx
function StaticSummary() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-white overflow-y-auto pb-20">
      {/* Arrest Summary */}
      <div className="mb-6">
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">ARREST SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm">
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">CPR Rounds</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">1</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Shocks given</span>
            <span className="text-[16px] font-black tabular-nums text-red-600">0</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Disarmed</span>
            <span className="text-[16px] font-black tabular-nums text-blue-600">0</span>
          </div>
        </div>
      </div>

      {/* Pharma Summary */}
      <div className="mb-6">
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">PHARMA SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm min-h-[60px]">
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Adrenaline push</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">0.1mg (1)</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Amiodarone</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">50mg (1)</span>
          </div>
        </div>
      </div>

      {/* Treatment Log */}
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">TREATMENT LOG</div>
        <div className="bg-white rounded-b-xl border border-neutral-100 overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2.1fr_1fr_1.4fr_0.9fr] bg-neutral-100 border-b border-neutral-200 px-4 py-3">
            <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-left">Treatment</div>
            <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</div>
            <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Elapsed</div>
            <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-right">Ago</div>
          </div>
          
          <div className="divide-y divide-neutral-100">
            <div className="grid grid-cols-[2.1fr_1fr_1.4fr_0.9fr] px-4 py-4 items-center gap-1">
              <div className="pr-1">
                <div className="text-[15px] font-bold text-neutral-900">Adrenaline 1mg</div>
              </div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">14:42</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(3:14 elapsed)</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-right">2 min ago</div>
            </div>
            <div className="grid grid-cols-[2.1fr_1fr_1.4fr_0.9fr] px-4 py-4 items-center gap-1">
              <div className="pr-1">
                <div className="text-[15px] font-bold text-neutral-900">Amiodarone 300mg</div>
              </div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">14:41</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(3:13 elapsed)</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-right">3 min ago</div>
            </div>
            <div className="grid grid-cols-[2.1fr_1fr_1.4fr_0.9fr] px-4 py-4 items-center gap-1">
              <div className="pr-1">
                <div className="text-[15px] font-bold text-neutral-900">Adrenaline 1mg</div>
              </div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">14:40</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(3:12 elapsed)</div>
              <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-right">4 min ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static Case Summary Component - Extracted from closed case view in App.tsx  
function StaticCaseSummary() {
  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)', width: '100%' }} className="bg-white overflow-y-auto p-6 max-w-2xl mx-auto space-y-6 pb-24">
      <h1 className="text-4xl font-bold text-center text-neutral-900 mb-8">Case Summary</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <button className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 px-4 rounded-xl font-bold border border-emerald-100">
          <FileText size={20} /> Export PDF
        </button>
        <button className="flex items-center justify-center gap-2 bg-red-50 text-red-700 py-3 px-4 rounded-xl font-bold border border-red-100">
          <Trash2 size={20} /> Delete Case
        </button>
      </div>

      {/* Arrest Summary */}
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">ARREST SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm">
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">CPR Rounds</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">1</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Shocks given</span>
            <span className="text-[16px] font-black tabular-nums text-red-600">0</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Disarmed</span>
            <span className="text-[16px] font-black tabular-nums text-blue-600">0</span>
          </div>
        </div>
      </div>

      {/* Pharma Summary */}
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">PHARMA SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm min-h-[60px]">
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Adrenaline push</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">0.1mg (1)</span>
          </div>
          <div className="flex justify-between items-center p-2 px-3">
            <span className="text-neutral-500 text-[16px] font-medium">Amiodarone</span>
            <span className="text-[16px] font-black tabular-nums text-neutral-900">50mg (1)</span>
          </div>
        </div>
      </div>

      {/* Final Treatment Log */}
      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">FINAL TREATMENT LOG</div>
      <div className="bg-white rounded-b-xl border border-neutral-100 overflow-hidden shadow-sm">
        <div className="grid grid-cols-[2fr_1fr_1fr] bg-neutral-100 border-b border-neutral-200 px-4 py-3">
          <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-left">Treatment</div>
          <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</div>
          <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Elapsed</div>
        </div>
        
        <div className="divide-y divide-neutral-100">
          <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-4 items-center gap-1">
            <div className="pr-1">
              <div className="text-[15px] font-bold text-neutral-900">Close case</div>
            </div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">08:09:01</div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(00:00:29 elapsed)</div>
          </div>
          <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-4 items-center gap-1">
            <div className="pr-1">
              <div className="text-[15px] font-bold text-neutral-900">Amiodarone</div>
              <div className="text-[13px] text-neutral-500 font-medium mt-0.5">50mg</div>
            </div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">08:08:42</div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(00:00:10 elapsed)</div>
          </div>
          <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-4 items-center gap-1">
            <div className="pr-1">
              <div className="text-[15px] font-bold text-neutral-900">Adrenaline push</div>
              <div className="text-[13px] text-neutral-500 font-medium mt-0.5">0.1mg</div>
            </div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">08:08:37</div>
            <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">(00:00:05 elapsed)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TutorialElement {
  id: string;
  x: number;
  y: number;
  number: number;
  title: string;
  description: string;
}

interface TutorialScreen {
  title: string;
  image: string;
  nextScreen: string | null;
  elements: TutorialElement[];
}

interface TutorialScreens {
  [key: string]: TutorialScreen;
}

interface InteractiveTutorialProps {
  onClose: () => void;
  onTimingNodesComplete?: () => void;
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ onClose, onTimingNodesComplete }) => {
  const [currentScreen, setCurrentScreen] = useState('intro1');
  const [exploredElements, setExploredElements] = useState<Set<string>>(new Set());
  const [showingInfoBox, setShowingInfoBox] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<TutorialElement | null>(null);

  const screens: TutorialScreens = {
    intro1: {
      title: 'Welcome',
      image: '',
      nextScreen: 'intro2',
      elements: [],
    },
    intro2: {
      title: 'Navigating the Tutorial',
      image: '',
      nextScreen: 'intro3',
      elements: [],
    },
    intro3: {
      title: 'Getting Started',
      image: '',
      nextScreen: 'intro4',
      elements: [],
    },
    intro4: {
      title: 'Time Keeping',
      image: '',
      nextScreen: 'timingMethod',
      elements: [],
    },
    timingMethod: {
      title: 'Time Keeping',
      image: '',
      nextScreen: 'home1',
      elements: [
        { id: 'timingLog',     x: 50, y: 25, number: 1, title: 'Tx log only',   description: "This option means the app will only help you record the times of interventions.\n\nIt will not assist you to keep track of times." },
        { id: 'timingCPR',     x: 50, y: 47, number: 3, title: 'CPR timer',     description: "Choose this option if you are using the monitor's inbuilt CPR timer, found above the compression depth diamond on the CPR screen.\n\nFor the tutorial we will use this option, because it's likely the one you're least familiar with.\n\nChoose 'CPR Timer' to progress in the tutorial." },
        { id: 'timingElapsed', x: 50, y: 70, number: 2, title: 'Elapsed time',  description: "Choose this option if you are using the elapsed time found at the top right corner of the monitor.\n\nYou can then choose whether you are performing rhythm checks on even or odd minutes." },
      ],
    },
    home1: {
      title: 'CPR Timer Home Screen',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      nextScreen: 'addTxMenu',
      elements: [
        { id: 'cprRound', x: 80.2, y: 22, number: 4, title: 'CPR Round', description: "The current round of CPR" },
        { id: 'timer', x: 50, y: 52, number: 5, title: 'Rhythm Check Timer', description: "The countdown to the next rhythm check. When the timer reaches 0:00, it pauses for 6 seconds to allow for the rhythm check, then restarts from 2:00." },
        { id: 'pause', x: 19.0, y: 4.2, number: 6, title: 'Pause Button', description: "Pause and resume the rhythm check timer" },
        { id: 'recalibrate', x: 51.0, y: 4.2, number: 7, title: 'Recalibrate Button', description: "The app estimates a rhythm check of 6 seconds. Recalibrate the timer to match reality if your rhythm checks are longer." },
        { id: 'tabs', x: 50, y: 10.75, number: 8, title: 'Checklists', description: "Quick access to checklists for the reversible causes of arrest, ROSC and Prehospital emergency anaesthesia (PHEA)" },
        { id: 'addTxBtn', x: 75, y: 95.4, number: 9, title: 'Add Treatment Button', description: "Tap here to log treatments and interventions during the arrest" },
      ],
    },
    addTxMenu: {
      title: 'Add Treatment Menu',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/2.png?raw=true',
      nextScreen: 'adrenalineDose',
      elements: [
        { id: 'addTxSubmenu', x: 50, y: 45.9, number: 10, title: 'Add Tx submenu', description: "After pressing the Add Tx button, you will be brought to a submenu containing multiple kinds of treatments you can log" },
      ],
    },
    adrenalineDose: {
      title: 'Adrenaline Dosing',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/4.png?raw=true',
      nextScreen: 'home2',
      elements: [
        { id: 'medications', x: 53.2, y: 44.2, number: 11, title: 'Medications', description: "Each medication will bring up one or multiple age/weight based dosage options depending on the indication. Custom doses can also be added. Let's log adrenaline and amiodarone." },
      ],
    },
    home2: {
      title: 'Medication Alerts',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'home2_summary',
      elements: [
        { id: 'adrenalineAlert', x: 28.4, y: 82.82, number: 12, title: 'Medication alerts', description: "When you log adrenaline or amiodarone, an alert will appear on the home screen to help you keep track of when the next dose is due." },
      ],
    },
    home2_summary: {
      title: 'Summary Navigation',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'summary',
      elements: [
        { id: 'summaryBtn', x: 26.6, y: 95.4, number: 13, title: 'Summary Button', description: "Next, let's have a look at the running case summary page" },
      ],
    },
    summary: {
      title: 'Active Case Summary',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/6.png?raw=true',
      nextScreen: 'home2_close',
      elements: [
        { id: 'pharmaSummary', x: 50, y: 50, number: 14, title: 'Medication Summary', description: "All medications logged will appear here, with an accumulative tally of the total amount of each drug given." },
        { id: 'treatmentLog', x: 50, y: 70.9, number: 15, title: 'Treatment Log', description: "Chronological record of all logged interventions. Timestamps show the exact time, the elapsed time on the monitor, and how long ago each Tx was logged." },
      ],
    },
    home2_close: {
      title: 'Close Case Navigation',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'caseSummary',
      elements: [
        { id: 'close', x: 82.2, y: 4.2, number: 16, title: 'Close Button', description: "Let's say we've either stopped resuscitative efforts or we've handed our patient over at hospital. We can now close the case." },
      ],
    },
    caseSummary: {
      title: 'Closed Case Summary',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/8.png?raw=true',
      nextScreen: null,
      elements: [
        { id: 'finalStats', x: 50, y: 61.64, number: 17, title: 'Final Case Data', description: "Now the case is over, the treatment log shows times to the second, not just to the minute" },
        { id: 'export', x: 27, y: 14, number: 18, title: 'Export PDF', description: "Export the case summary and Tx log to a pdf, which you can then email for later review." },
        { id: 'delete', x: 73, y: 14, number: 19, title: 'Delete Case', description: "Permanently delete the case information from the app" },
      ],
    },
  };

  const currentScreenData = screens[currentScreen];
  const requiredElements = new Set(currentScreenData.elements.map(el => el.id));
  const allExplored = Array.from(requiredElements).every(id => exploredElements.has(id));

  // Notify parent when all timing method nodes explored so it can flash the CPR button
  useEffect(() => {
    if (currentScreen === 'timingMethod' && allExplored && onTimingNodesComplete) {
      onTimingNodesComplete();
    }
  }, [currentScreen, allExplored]);

  // Preload all tutorial images when component mounts
  useEffect(() => {
    const imagesToPreload = [
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/2.png?raw=true',
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/4.png?raw=true',
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/6.png?raw=true',
      'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/8.png?raw=true',
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleElementClick = (element: TutorialElement) => {
    setActiveExplanation(element);
    setExploredElements(prev => new Set([...prev, element.id]));
    setShowingInfoBox(true);
  };

  const handleCloseExplanation = () => {
    setActiveExplanation(null);
    setShowingInfoBox(false);
  };

  const handleNext = () => {
    if (currentScreenData.nextScreen) {
      setCurrentScreen(currentScreenData.nextScreen);
      setExploredElements(new Set()); // Reset for next screen
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: ['intro1', 'intro2', 'intro3', 'intro4', 'home1', 'timingMethod', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'transparent' : '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: ['intro1', 'intro2', 'intro3', 'intro4', 'home1', 'timingMethod', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'stretch' : 'center',
      justifyContent: ['intro1', 'intro2', 'intro3', 'intro4', 'home1', 'timingMethod', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'stretch' : 'center',
      padding: ['intro1', 'intro2', 'intro3', 'intro4', 'home1', 'timingMethod', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? '0' : '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 9999,
      overflowY: 'auto',
      pointerEvents: currentScreen === 'timingMethod' ? 'none' : 'auto',
    }}>
      {/* Render static components for non-catchup screens only */}
      {currentScreen === 'home1' && <StaticHomeScreen />}
      {currentScreen === 'addTxMenu' && <StaticAddTxMenu />}
      {currentScreen === 'adrenalineDose' && <StaticAdrenalineDose />}
      {(currentScreen === 'home2' || currentScreen === 'home2_summary' || currentScreen === 'home2_close') && <StaticHomeWithAlerts />}
      {currentScreen === 'summary' && <StaticSummary />}
      {currentScreen === 'caseSummary' && <StaticCaseSummary />}
      
      {/* Intro pages: dark overlay over the live catchup behind */}
      {(currentScreen === 'intro1' || currentScreen === 'intro2' || currentScreen === 'intro3' || currentScreen === 'intro4') && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '320px',
            width: '85%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '16px' }}>
              {currentScreen === 'intro1' && 'Welcome!'}
              {currentScreen === 'intro2' && 'Navigating the Tutorial'}
              {currentScreen === 'intro3' && 'Getting Started'}
              {currentScreen === 'intro4' && 'Time Keeping'}
            </h2>
            {renderIntroDescription(
              currentScreen === 'intro1'
                ? "The Big One is a cognitive aid for use during cardiac arrests.\n\nWith times and medications tracked automatically, you can focus on situational awareness and team leadership."
                : currentScreen === 'intro2'
                ? "In this tutorial you'll see blue numbered icons hovering over different elements of the app.\n\nClick on the icons to learn about these features.\n\nYou'll need to clear all icons and complete any instructions to progress through the tutorial."
                : currentScreen === 'intro3'
                ? "On opening The Big One, you'll need to set up the case by entering:\n\n• Adult or paediatric patient\n\n• Estimated patient weight\n\n• The interventions that have already been performed"
                : "After you've entered the patient information and Tx you've already performed, you'll need to choose one of three options for keeping track of rhythm check times."
            )}
            <button
              onClick={handleNext}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {currentScreenData.elements.map((element) => {
        const isExplored = exploredElements.has(element.id);
        if (isExplored) return null;
        
        // Progressive reveal: only show the next node in sequence
        const exploredNumbers = currentScreenData.elements
          .filter(el => exploredElements.has(el.id))
          .map(el => el.number);
        const allNumbers = currentScreenData.elements.map(el => el.number);
        const minNumber = Math.min(...allNumbers);
        const nextNumber = exploredNumbers.length > 0 
          ? Math.max(...exploredNumbers) + 1 
          : minNumber;
        
        // Only render this node if it's the next in sequence
        if (element.number !== nextNumber) return null;
        
        return (
          <div
            key={element.id}
            onClick={() => handleElementClick(element)}
            style={{
              position: 'absolute',
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: '43px',
              height: '43px',
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '2px solid #10b981',
              animation: 'ripple 2s infinite',
              opacity: 0.6,
            }} />
            
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '26px',
              height: '26px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '3px solid #10b981',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: '700',
              color: '#10b981',
            }}>
              {element.number}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }
        @keyframes buttonPulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          50% {
            transform: translateX(-50%) scale(1.05);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          }
        }
        @keyframes cprCardFade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* Next button - centered bottom with pulsing animation (for non-intro screens) */}
      {/* Special case for home1: Add Tx button with flashing text */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'home1' && (
        <button
          onClick={handleNext}
          className="text-base sm:text-xl"
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: 'calc((100% - 32px - 12px) / 2)',
            height: '48px',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            outline: 'none',
            borderRadius: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          aria-label="Continue to Add Treatment screen"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'textFlash 2s infinite',
          }}>
            <Plus size={18} className="sm:w-6 sm:h-6" />
            Add Tx
          </div>
        </button>
      )}
      
      <style>{`
        @keyframes textFlash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      
      {/* Special case for home2_summary: show exact replica of Summary button */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'home2_summary' && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            bottom: 'calc(3.5% + 5px)',
            left: 'calc(5% + 15px)',
            width: '41.8%',
            padding: '14.4px 20px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            animation: 'buttonPulse 2s infinite',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Summary
        </button>
      )}
      
      {/* Special case for addTxMenu: clickable Adrenaline push button matching the list item */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'addTxMenu' && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            top: 'calc(30.5% - 2px)',
            left: '29px',
            right: '29px',
            height: '50px',
            backgroundColor: '#f5f5f5',
            color: '#000',
            border: 'none',
            outline: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: '14px',
            textAlign: 'left',
          }}
        >
          <div style={{
            animation: 'textFlash 2s infinite',
          }}>
            Adrenaline push
          </div>
        </button>
      )}
      
      {/* Special case for adrenalineDose: clickable dose button */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'adrenalineDose' && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            top: '30%',
            left: '16px',
            right: '16px',
            height: '70px',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            border: '2px solid #10b981',
            outline: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            textAlign: 'left',
            paddingLeft: '20px',
          }}
        >
          <div style={{
            animation: 'textFlash 2s infinite',
          }}>
            1mg (Adult cardiac arrest)
          </div>
        </button>
      )}
      
      {/* Special case for home2_summary: Summary button overlay */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'home2_summary' && (
        <button
          onClick={handleNext}
          className="text-base sm:text-xl"
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            width: 'calc((100% - 32px - 12px) / 2)',
            height: '48px',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            outline: 'none',
            borderRadius: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'textFlash 2s infinite',
          }}>
            <FileText size={18} className="sm:w-6 sm:h-6" />
            Summary
          </div>
        </button>
      )}
      
      {/* Special case for home2_close: Close button overlay */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && currentScreen === 'home2_close' && (
        <button
          onClick={handleNext}
          className="text-xs sm:text-sm"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: 'calc((100% - 32px - 12px) / 3)',
            height: '44px',
            backgroundColor: '#e5e5e5',
            color: '#000',
            border: 'none',
            outline: 'none',
            borderRadius: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'textFlash 2s infinite',
          }}>
            <XCircle size={14} className="sm:w-4 sm:h-4" />
            Close
          </div>
        </button>
      )}
      
      {/* For summary and caseSummary screens: use regular Next button */}
      {allExplored && !showingInfoBox && currentScreenData.nextScreen && (currentScreen === 'summary' || currentScreen === 'home2') && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px 48px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            zIndex: 10001,
          }}
        >
          <div style={{ animation: 'textFlash 2s infinite' }}>
            Next
          </div>
        </button>
      )}
      
      {/* Regular Next button for non-special screens */}
      {allExplored && currentScreenData.nextScreen && currentScreen !== 'intro1' && currentScreen !== 'intro2' && currentScreen !== 'intro3' && currentScreen !== 'intro4' && currentScreen !== 'timingMethod' && currentScreen !== 'home1' && currentScreen !== 'addTxMenu' && currentScreen !== 'adrenalineDose' && currentScreen !== 'home2' && currentScreen !== 'home2_summary' && currentScreen !== 'home2_close' && currentScreen !== 'summary' && currentScreen !== 'caseSummary' && (
        <button
          onClick={handleNext}
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 36px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '17px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            animation: 'buttonPulse 2s infinite',
          }}
        >
          Next
        </button>
      )}

      {/* Finish button - appears on final screen in top-right */}
      {currentScreen === 'caseSummary' && allExplored && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}
        >
          Finish
        </button>
      )}

      {activeExplanation && (
        <div
          onClick={handleCloseExplanation}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '20px',
              color: '#1a1a1a',
              textAlign: 'center',
            }}>
              {activeExplanation.title}
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#444',
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}>
              {activeExplanation.description}
            </p>
            <button
              onClick={handleCloseExplanation}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function renderIntroDescription(text: string) {
  const segments = text.split('\n\n');
  const groups: Array<{ type: 'text' | 'bullets'; items: string[] }> = [];
  for (const seg of segments) {
    if (seg.startsWith('•')) {
      const last = groups[groups.length - 1];
      if (last?.type === 'bullets') {
        last.items.push(seg);
      } else {
        groups.push({ type: 'bullets', items: [seg] });
      }
    } else {
      groups.push({ type: 'text', items: [seg] });
    }
  }
  return (
    <div style={{ color: '#555', marginBottom: '20px', lineHeight: '1.6', textAlign: 'left' }}>
      {groups.map((group, gi) => {
        const isLast = gi === groups.length - 1;
        if (group.type === 'bullets') {
          return (
            <div key={gi} style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: isLast ? 0 : '0.9em',
            }}>
              {group.items.map((bullet, bi) => (
                <p key={bi} style={{ margin: 0, marginBottom: bi < group.items.length - 1 ? '0.46em' : 0, whiteSpace: 'pre-line' }}>
                  {bullet}
                </p>
              ))}
            </div>
          );
        }
        return (
          <p key={gi} style={{ margin: 0, marginBottom: isLast ? 0 : '0.9em', whiteSpace: 'pre-line' }}>
            {group.items[0]}
          </p>
        );
      })}
    </div>
  );
}

export default InteractiveTutorial;
