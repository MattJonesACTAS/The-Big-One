/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Pause, 
  Play, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronDown, 
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { AppState, Treatment, OverlayType } from './types';

// --- Constants ---
const INITIAL_STATE: AppState = {
  running: false,
  startTime: null,
  pausedTime: 0,
  elapsedSeconds: 0,
  rhythmCheckTarget: 120, // 2 minutes
  cprRound: 1,
  shocks: 0,
  treatments: [],
  currentOverlay: null,
  catchupElapsed: 0,
  startClockTime: null
};

const MEDICATIONS = [
  'Adrenaline push', 'Adrenaline infus.', 'Amiodarone', 
  'Atropine', 'Calcium', 'Glucose', 'Ketamine', 'Magnesium', 
  'Midazolam', 'Normal Saline', 'Sodium Bicarbonate', 'Suxamethonium'
];

// --- Utilities ---
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeWithSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeHMM = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

const getLocalTime = (date?: Date) => {
  const d = date || new Date();
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getLocalTimeWithSeconds = (date?: Date) => {
  const d = date || new Date();
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('theBigOneState');
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        return {
          ...loaded,
          currentOverlay: null // Reset overlays on reload
        };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  const [showCatchup, setShowCatchup] = useState(!localStorage.getItem('theBigOneState'));
  const [catchupStep, setCatchupStep] = useState(1);
  const [catchupElapsed, setCatchupElapsed] = useState({ mins: 0, secs: 0 });
  const [catchupRhythm, setCatchupRhythm] = useState({ mins: 2, secs: 0 });
  const [priorCounts, setPriorCounts] = useState({ shock: 0, disarm: 0, adrenaline: 0 });
  const [priorTxs, setPriorTxs] = useState<string[]>([]);
  const [isCaseClosed, setIsCaseClosed] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [isShockForced, setIsShockForced] = useState(false);
  const lastBeepSecond = useRef<number | null>(null);
  const hasAutoClosedAt15 = useRef<boolean>(false);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
      setTimeout(() => audioCtx.close(), 200);
    } catch (e) {
      console.warn('Audio context failed', e);
    }
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem('theBigOneState', JSON.stringify(state));
  }, [state]);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (state.running) {
      interval = window.setInterval(() => {
        setState(prev => {
          const now = Date.now();
          const newElapsed = Math.floor((now - (prev.startTime || now) + prev.pausedTime) / 1000);
          
          let nextTarget = prev.rhythmCheckTarget;
          let nextRound = prev.cprRound;
          let nextOverlay = prev.currentOverlay;
          
          const countdown = prev.rhythmCheckTarget - newElapsed;

          // Auto-close overlay ONCE at 15s
          if (countdown === 15 && !hasAutoClosedAt15.current) {
            nextOverlay = null;
            hasAutoClosedAt15.current = true;
          }

          // Force shock at 0:00, but not if it's the very start of the case
          if (countdown <= 0 && prev.elapsedSeconds > 0) {
            nextOverlay = 'treatment';
            setIsShockForced(true);
          }

          // Beep logic between 15 and 10
          if (countdown <= 15 && countdown >= 10 && lastBeepSecond.current !== newElapsed) {
            playBeep();
            lastBeepSecond.current = newElapsed;
          }
          
          if (newElapsed >= prev.rhythmCheckTarget) {
            nextTarget += 120;
            nextRound += 1;
            hasAutoClosedAt15.current = false;
          }
          
          return {
            ...prev,
            elapsedSeconds: newElapsed,
            rhythmCheckTarget: nextTarget,
            cprRound: nextRound,
            currentOverlay: nextOverlay
          };
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [state.running]);

  const togglePause = () => {
    setState(prev => {
      if (prev.running) {
        setShowPauseWarning(false);
        return {
          ...prev,
          running: false,
          pausedTime: prev.pausedTime + (Date.now() - (prev.startTime || Date.now()))
        };
      } else {
        return {
          ...prev,
          running: true,
          startTime: Date.now()
        };
      }
    });
  };

  const confirmPause = () => {
    if (state.running) {
      setShowPauseWarning(true);
    } else {
      togglePause();
    }
  };

  const resetTimer = () => {
    setState(prev => ({
      ...prev,
      rhythmCheckTarget: prev.elapsedSeconds + 120
    }));
    setShowResetWarning(false);
  };

  const addTreatment = (name: string) => {
    const now = new Date();
    const treatment: Treatment = {
      name,
      elapsed: state.elapsedSeconds,
      round: state.cprRound,
      clock: getLocalTime(now),
      clockSeconds: getLocalTimeWithSeconds(now)
    };

    setState(prev => ({
      ...prev,
      treatments: [...prev.treatments, treatment],
      shocks: (name.includes('Shock') && !name.includes('Disarm')) ? prev.shocks + 1 : prev.shocks,
      currentOverlay: name === 'Disarm — ROSC' ? 'rosc' : null
    }));
    setIsShockForced(false);
  };

  const adrenalineRoundStatus = useMemo(() => {
    const adrTreatments = state.treatments.filter(t => t.name.includes('Adrenaline'));
    const lastAdr = adrTreatments.pop();
    
    if (!lastAdr) {
      return { text: "Adrenaline not given", isDue: false };
    }
    
    if (lastAdr.prior) {
      return { text: "Next adrenaline: unknown", isDue: false };
    }

    const roundGiven = lastAdr.round || (Math.floor(lastAdr.elapsed / 120) + 1);
    const nextDueRound = roundGiven + 2;
    const isDue = state.cprRound >= nextDueRound;
    
    if (isDue) {
      return { text: "Adrenaline due", isDue: true };
    } else {
      return { text: `Next adrenaline: CPR round ${nextDueRound}`, isDue: false };
    }
  }, [state.treatments, state.cprRound]);


  const pharmaSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    state.treatments.forEach(tx => {
      for (const med of MEDICATIONS) {
        if (tx.name.includes(med)) {
          counts[med] = (counts[med] || 0) + 1;
          break;
        }
      }
    });
    return counts;
  }, [state.treatments]);

  // --- Catchup Handlers ---
  const handleCatchupStart = () => {
    const elapsedTotal = catchupElapsed.mins * 60 + catchupElapsed.secs;
    const rhythmTotal = catchupRhythm.mins * 60 + catchupRhythm.secs;
    const now = Date.now();
    const startClockTime = now - (elapsedTotal * 1000);

    const initialTxs: Treatment[] = [];
    const baseClock = new Date(startClockTime);
    
    priorTxs.forEach(name => {
      initialTxs.push({
        name,
        elapsed: 0,
        round: 0,
        clock: getLocalTime(baseClock),
        clockSeconds: getLocalTimeWithSeconds(baseClock),
        prior: true
      });
    });

    for (let i = 0; i < priorCounts.shock; i++) {
      initialTxs.push({ name: `Shock #${i+1}`, elapsed: 0, round: 0, clock: getLocalTime(baseClock), clockSeconds: getLocalTimeWithSeconds(baseClock), prior: true });
    }
    for (let i = 0; i < priorCounts.disarm; i++) {
      initialTxs.push({ name: `Disarm #${i+1}`, elapsed: 0, round: 0, clock: getLocalTime(baseClock), clockSeconds: getLocalTimeWithSeconds(baseClock), prior: true });
    }
    for (let i = 0; i < priorCounts.adrenaline; i++) {
      initialTxs.push({ name: `Adrenaline push #${i+1}`, elapsed: 0, round: 0, clock: getLocalTime(baseClock), clockSeconds: getLocalTimeWithSeconds(baseClock), prior: true });
    }

    setState({
      ...INITIAL_STATE,
      running: true,
      startTime: now,
      pausedTime: elapsedTotal * 1000,
      elapsedSeconds: elapsedTotal,
      rhythmCheckTarget: rhythmTotal,
      cprRound: Math.floor(elapsedTotal / 120) + 1,
      shocks: priorCounts.shock,
      treatments: initialTxs,
      catchupElapsed: elapsedTotal,
      startClockTime: startClockTime
    });
    setShowCatchup(false);
  };

  const deleteCase = () => {
    localStorage.removeItem('theBigOneState');
    window.location.reload();
  };

  const closeCase = () => {
    addTreatment('Close case');
    setState(prev => ({ ...prev, running: false }));
    setIsCaseClosed(true);
    setShowCloseWarning(false);
  };

  if (isCaseClosed) {
    return (
      <div className="min-h-screen bg-white p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold text-center text-neutral-900 mb-8">Case Summary</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 px-4 rounded-xl font-bold btn-base border border-emerald-100"
          >
            <FileText size={20} /> Export PDF
          </button>
          <button 
            onClick={() => setShowDeleteWarning(true)}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-700 py-3 px-4 rounded-xl font-bold btn-base border border-red-100"
          >
            <Trash2 size={20} /> Delete Case
          </button>
        </div>

        <SummaryStats state={state} pharmaSummary={pharmaSummary} />
        
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">TREATMENT LOG</div>
        <TreatmentLog treatments={state.treatments} elapsedSeconds={state.elapsedSeconds} catchupElapsed={state.catchupElapsed} isSummary={true} />

        {showDeleteWarning && (
           <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
             <AlertCircle size={48} className="mx-auto text-red-600 mb-4" />
             <h2 className="text-2xl font-bold text-neutral-900 mb-2">Delete this case?</h2>
             <p className="text-neutral-500 mb-8">All data will be lost and you will return to the start screen.</p>
             <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setShowDeleteWarning(false)} className="bg-neutral-100 p-4 rounded-xl font-bold text-neutral-700 btn-base">Cancel</button>
               <button onClick={deleteCase} className="bg-red-600 p-4 rounded-xl font-bold text-white btn-base">Delete</button>
             </div>
           </div>
         </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-100 flex flex-col p-4 max-w-2xl mx-auto overflow-hidden relative">
      {/* Top Controls */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <button onClick={confirmPause} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          {state.running ? <Pause size={14} className="sm:w-4 sm:h-4" /> : <Play size={14} className="sm:w-4 sm:h-4" />} 
          {state.running ? 'Pause' : 'Resume'}
        </button>
        <button onClick={() => setShowResetWarning(true)} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <RotateCcw size={14} className="sm:w-4 sm:h-4" /> Reset
        </button>
        <button onClick={() => setShowCloseWarning(true)} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          <XCircle size={14} className="sm:w-4 sm:h-4" /> Close
        </button>
      </div>

      {/* Top Quick Tools */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'reversibles' ? null : 'reversibles' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors ${state.currentOverlay === 'reversibles' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-700'} ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {state.currentOverlay === 'reversibles' ? 'Close' : 'Reversibles'}
        </button>
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'rosc' ? null : 'rosc' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors ${state.currentOverlay === 'rosc' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-700'} ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {state.currentOverlay === 'rosc' ? 'Close' : 'ROSC'}
        </button>
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'phea' ? null : 'phea' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors ${state.currentOverlay === 'phea' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-700'} ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {state.currentOverlay === 'phea' ? 'Close' : 'PHEA'}
        </button>
      </div>

      {/* Main Center Display */}
      <div className={`flex-1 bg-white border-4 rounded-3xl relative overflow-hidden transition-colors duration-300 ${
        state.currentOverlay === 'reversibles' ? 'border-blue-400' :
        state.currentOverlay === 'rosc' ? 'border-orange-400' :
        state.currentOverlay === 'phea' ? 'border-purple-400' : 'border-emerald-500'
      }`}>
        <div className="h-full flex flex-col items-center justify-between p-4 relative">
          {/* Corner Cards */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between gap-3 sm:gap-4">
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[9px] sm:text-[11px] font-bold text-neutral-400 tracking-widest mb-1.5 sm:mb-3">Total time</span>
              <span className="text-4xl sm:text-7xl font-bold text-neutral-900 tabular-nums leading-none">{formatTime(state.elapsedSeconds)}</span>
            </div>
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[9px] sm:text-[11px] font-bold text-neutral-400 tracking-widest mb-1.5 sm:mb-3">CPR round</span>
              <span className="text-4xl sm:text-7xl font-bold text-neutral-900 leading-none">{state.cprRound}</span>
            </div>
          </div>

          {/* Rhythm Check - Centered vertically and responsive size */}
          <div className="flex-1 flex flex-col items-center justify-center w-full pt-8 sm:pt-10">
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
                <motion.circle
                  cx="150"
                  cy="150"
                  r="140"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="1"
                  className={(state.rhythmCheckTarget - state.elapsedSeconds) <= 15 ? 'text-red-500' : 'text-emerald-500'}
                  animate={{ 
                    strokeDashoffset: 1 - Math.max(0, (state.rhythmCheckTarget - state.elapsedSeconds) / 120)
                  }}
                  style={{ strokeDasharray: 1 }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              
              <div className="flex flex-col items-center z-10 translate-y-3 sm:translate-y-4">
                <div 
                  className={`text-7xl sm:text-[120px] font-bold tabular-nums tracking-tighter leading-none ${
                    (state.rhythmCheckTarget - state.elapsedSeconds) <= 15 ? 'text-red-600' : 'text-neutral-900'
                  }`}
                >
                  {formatTime(Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds))}
                </div>
                <div className="text-[14px] sm:text-[18px] text-neutral-400 uppercase tracking-widest font-bold mt-4 sm:mt-8">
                  Rhythm Check
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {state.currentOverlay && (
              <Overlay 
                key={state.currentOverlay}
                type={state.currentOverlay as OverlayType} 
                onClose={() => setState(p => ({ ...p, currentOverlay: null }))}
                addTreatment={addTreatment}
                state={state}
                pharmaSummary={pharmaSummary}
                isShockForced={isShockForced}
              />
            )}
          </AnimatePresence>

          {/* Adrenaline Status - Responsive sizing */}
          <div 
            className={`w-full max-w-[240px] sm:max-w-[280px] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 transition-all duration-300 border-2 mb-2 sm:mb-4 ${
              adrenalineRoundStatus.isDue 
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' 
                : 'bg-neutral-100 text-neutral-400 border-neutral-100'
            }`}
          >
            <span className="text-sm sm:text-base font-bold tracking-tight">{adrenalineRoundStatus.text}</span>
          </div>
        </div>
      </div>

      {/* Bottom Main Controls */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'summary' ? null : 'summary' }))
          }}
          disabled={isShockForced}
          className={`p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors ${state.currentOverlay === 'summary' ? 'bg-red-100 text-red-800' : 'bg-emerald-600 text-white'}`}
        >
          {state.currentOverlay === 'summary' ? <XCircle size={18} className="sm:w-6 sm:h-6" /> : <FileText size={18} className="sm:w-6 sm:h-6" />}
          {state.currentOverlay === 'summary' ? 'Close' : 'Summary'}
        </button>
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'treatment' ? null : 'treatment' }))
          }}
          disabled={isShockForced}
          className={`p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors ${state.currentOverlay === 'treatment' ? 'bg-red-100 text-red-800' : 'bg-emerald-600 text-white'}`}
        >
          {state.currentOverlay === 'treatment' ? <XCircle size={18} className="sm:w-6 sm:h-6" /> : <Plus size={18} className="sm:w-6 sm:h-6" />}
          {state.currentOverlay === 'treatment' ? 'Close' : 'Add Tx'}
        </button>
      </div>




      {/* Catchup Modal */}
      <AnimatePresence>
        {showCatchup && (
          <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden"
            >
              {catchupStep === 1 && (
                <div className="text-center space-y-6">
                  <h2 className="text-3xl font-extrabold text-neutral-900">Arrest Started</h2>
                  <p className="text-neutral-500 text-lg leading-relaxed">Let's calibrate the timer with the monitor for accurate logging.</p>
                  <button onClick={() => setCatchupStep(2)} className="w-full bg-emerald-600 text-white p-6 rounded-2xl text-xl font-bold btn-base">Calibrate</button>
                </div>
              )}

              {catchupStep === 2 && (
                <div className="text-center space-y-8">
                  <h2 className="text-2xl font-bold text-neutral-900 px-4">Enter the elapsed case time on the monitor</h2>
                  <TimePicker value={catchupElapsed} onChange={setCatchupElapsed} />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(1)} className="bg-neutral-100 text-neutral-700 p-4 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => { setCatchupRhythm(catchupElapsed); setCatchupStep(3); }} className="bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base">Next</button>
                  </div>
                </div>
              )}

              {catchupStep === 3 && (
                <div className="text-center space-y-8">
                  <h2 className="text-2xl font-bold text-neutral-900 px-4">Enter what the elapsed case time will be when the next rhythm check is due</h2>
                  <TimePicker value={catchupRhythm} onChange={setCatchupRhythm} />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(2)} className="bg-neutral-100 text-neutral-700 p-4 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => setCatchupStep(4)} className="bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base">Next</button>
                  </div>
                </div>
              )}

              {catchupStep === 4 && (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Enter already administered Tx</h2>
                  <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto px-2">
                    <CounterItem label="Shock" value={priorCounts.shock} onChange={v => setPriorCounts(p => ({ ...p, shock: v }))} />
                    <CounterItem label="Disarm" value={priorCounts.disarm} onChange={v => setPriorCounts(p => ({ ...p, disarm: v }))} />
                    <CounterItem label="Adrenaline" value={priorCounts.adrenaline} onChange={v => setPriorCounts(p => ({ ...p, adrenaline: v }))} />
                    <div className="grid grid-cols-3 gap-3">
                      {['BVM', 'LMA', 'IO'].map(tx => (
                        <button 
                          key={tx}
                          onClick={() => setPriorTxs(p => p.includes(tx) ? p.filter(t => t !== tx) : [...p, tx])}
                          className={`p-4 rounded-xl font-bold text-lg ${priorTxs.includes(tx) ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400' : 'bg-neutral-100 text-neutral-600'}`}
                        >
                          {tx}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(3)} className="bg-neutral-100 text-neutral-700 p-4 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={handleCatchupStart} className="bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base">Start Timer</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warning Modals */}
      {showCloseWarning && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Close this case?</h2>
            <p className="text-neutral-500 mb-8">This will end the timer and show the final summary.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCloseWarning(false)} className="bg-neutral-100 p-4 rounded-xl font-bold text-neutral-700 btn-base">Cancel</button>
              <button onClick={closeCase} className="bg-emerald-600 p-4 rounded-xl font-bold text-white btn-base">OK</button>
            </div>
          </div>
        </div>
      )}

      {showPauseWarning && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Pause timer?</h2>
            <p className="text-neutral-500 mb-8">The arrest timer will stop until you resume.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowPauseWarning(false)} className="bg-neutral-100 p-4 rounded-xl font-bold text-neutral-700 btn-base">Cancel</button>
              <button onClick={togglePause} className="bg-red-600 p-4 rounded-xl font-bold text-white btn-base">Pause</button>
            </div>
          </div>
        </div>
      )}

      {showResetWarning && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Reset 2-minute cycle?</h2>
            <p className="text-neutral-500 mb-8">This resets the current rhythm check countdown to 2:00.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowResetWarning(false)} className="bg-neutral-100 p-4 rounded-xl font-bold text-neutral-700 btn-base">Cancel</button>
              <button onClick={resetTimer} className="bg-red-600 p-4 rounded-xl font-bold text-white btn-base">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function TimePicker({ value, onChange }: { value: { mins: number, secs: number }, onChange: (v: { mins: number, secs: number }) => void }) {
  const adjust = (type: 'mins' | 'secs', delta: number) => {
    const newVal = { ...value };
    if (type === 'mins') {
      newVal.mins = Math.max(0, newVal.mins + delta);
    } else {
      newVal.secs = (newVal.secs + delta + 60) % 60;
    }
    onChange(newVal);
  };

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center">
        <button onClick={() => adjust('mins', 1)} className="p-3 bg-neutral-100 rounded-lg text-2xl font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        <div className="text-7xl font-bold text-neutral-900 tabular-nums my-4">{value.mins}</div>
        <button onClick={() => adjust('mins', -1)} className="p-3 bg-neutral-100 rounded-lg text-2xl font-bold text-neutral-400 hover:text-neutral-900">▼</button>
        <span className="text-neutral-400 font-bold uppercase text-xs mt-2">min</span>
      </div>
      <div className="text-7xl font-bold text-neutral-400 mb-12">:</div>
      <div className="flex flex-col items-center">
        <button onClick={() => adjust('secs', 10)} className="p-3 bg-neutral-100 rounded-lg text-2xl font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        <div className="text-7xl font-bold text-neutral-900 tabular-nums my-4">{value.secs.toString().padStart(2, '0')}</div>
        <button onClick={() => adjust('secs', -10)} className="p-3 bg-neutral-100 rounded-lg text-2xl font-bold text-neutral-400 hover:text-neutral-900">▼</button>
        <span className="text-neutral-400 font-bold uppercase text-xs mt-2">sec</span>
      </div>
    </div>
  );
}

function CounterItem({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100">
      <span className="text-base font-bold text-neutral-800 ml-2">{label}</span>
      <div className="flex items-center gap-4">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-9 h-9 bg-white shadow-sm border border-neutral-200 rounded-xl font-bold text-xl flex items-center justify-center">−</button>
        <span className="text-xl font-bold tabular-nums w-4 text-center">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-9 h-9 bg-white shadow-sm border border-neutral-200 rounded-xl font-bold text-xl flex items-center justify-center">+</button>
      </div>
    </div>
  );
}

function Overlay({ type, onClose, addTreatment, state, pharmaSummary, isShockForced }: { 
  key?: string,
  type: OverlayType, 
  onClose: () => void, 
  addTreatment: (n: string) => void,
  state: AppState,
  pharmaSummary: Record<string, number>,
  isShockForced: boolean
}) {
  const isTop = ['reversibles', 'rosc', 'phea'].includes(type);
  
  return (
    <motion.div 
      initial={{ y: isTop ? '-100%' : '100%' }}
      animate={{ y: 0 }}
      exit={{ y: isTop ? '-100%' : '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
      className="absolute inset-0 bg-white z-50 flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {type === 'reversibles' && <ReversiblesOverlay />}
        {type === 'rosc' && <ROSCSelection />}
        {type === 'phea' && <PHEASelection />}
        {type === 'summary' && <SummaryOverlay state={state} pharmaSummary={pharmaSummary} />}
        {type === 'treatment' && <TreatmentSelection addTreatment={addTreatment} isShockForced={isShockForced} />}
      </div>
    </motion.div>
  );
}

function ReversiblesOverlay() {
  return (
    <div className="h-full">
      <SectionGroup title="FIELD-REVERSIBLE" color="blue" items={['Hypoxia', 'Hypovolaemia', 'Hypo / Hyperkalaemia', 'Hypo / Hyperthermia', 'Hypoglycaemia', 'Toxins', 'Tension Pneumothorax']} />
      <SectionGroup title="IDENTIFY AND TEMPORISE" color="blue" items={['Tamponade', 'Thrombosis']} />
    </div>
  );
}

function ROSCSelection() {
  return (
    <div className="h-full">
      <SectionGroup title="TEAM LEADER" color="orange" items={['Confirm roles', 'Monitor ECG for rhythm changes', 'Review reversibles']} />
      <SectionGroup title="AIRWAY" color="orange" items={['Response — consider sedation', 'Confirm airway secured', 'Confirm spontaneous ventilations', 'Maintain SpO2 94–98%', 'Maintain ETCO2 35–40mmHg']} />
      <SectionGroup title="GOFER" color="orange" items={['Confirm radial pulse', 'Set BP to automatic cycling', 'Attach SpO2', '12-lead ECG', 'Temp', 'BGL', 'Prepare extrication']} />
      <SectionGroup title="DRUGS & ACCESS" color="orange" items={['Confirm bilateral IV/IO access', 'Maintain SBP ≥100mmHg', 'Prepare sedation medications if required', 'Prepare adrenaline infusion if required']} />
    </div>
  );
}

function PHEASelection() {
  return (
    <div className="h-full pb-10">
      <SectionGroup title="PREPARATION" color="purple" items={['Assign roles', 'Adequate hands and skills mix?', 'C-spine immobilisation required?', 'Optimise patient position', 'Optimise environment', 'Optimise equipment placement']} />
      <SectionGroup title="PRE-OXYGENATION" color="purple" items={['Nasal prongs 15L/min']} />
      <SectionGroup title="MONITORING" color="purple" items={['ECG', 'BP — cycling', 'SpO2', 'EtCO2']} />
      <SectionGroup title="DRUGS & ACCESS EQUIPMENT" color="purple" items={['IV/IO access ×2 if possible', 'IV fluids', 'Ketamine drawn up', 'Suxamethonium drawn up', 'Post PHEA sedation medication/s drawn up']} />
      <SectionGroup title="AIRWAY EQUIPMENT" color="purple" items={['Sufficient oxygen available?', 'Suction', 'BVM', 'OPA / NPA', 'Airtraq — loaded tube, switched on', 'ETT loaded with bougie', 'Laryngoscope checked', 'Syringe', 'Securing method', 'FONA scalpel']} />
      <SectionGroup title="POST-INTUBATION" color="darkPurple" items={['Confirm ETT placement — EtCO2, visualise cords, auscultation, misting, chest rise', 'Colleague confirms placement', 'Secure tube — Thomas block / tube tie', 'Reassessment — ABCs and VSS', 'Sedation plan discussed', 'Deterioration plan discussed', 'Extrication and transport plan discussed']} />
    </div>
  );
}

interface CheckItemProps {
  label: string;
  key?: React.Key;
}

function CheckItem({ label }: CheckItemProps) {
  const [checked, setChecked] = useState(false);
  return (
    <label onClick={() => setChecked(!checked)} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-emerald-50' : 'hover:bg-neutral-50'}`}>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mr-2.5 transition-colors ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300 bg-white'}`}>
        {checked && <CheckCircle2 size={12} className="text-white" />}
      </div>
      <span className={`text-[17px] font-medium ${checked ? 'text-emerald-900' : 'text-neutral-700'}`}>{label}</span>
    </label>
  );
}

function SectionGroup({ title, color, items }: { title: string, color: string, items: string[] }) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    darkPurple: 'bg-purple-800 text-white border-purple-900',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  };
  return (
    <>
      <div className={`p-2.5 px-4 z-10 font-bold text-[16px] tracking-wide border-b uppercase sticky top-0 text-center ${colorMap[color]}`}>{title}</div>
      <div className="p-1 space-y-0.5">
        {items.map(item => <CheckItem key={item} label={item} />)}
      </div>
    </>
  );
}

// --- TREATMENT LOG (EVEN COLUMNS) ---
function TreatmentLog({ treatments, elapsedSeconds, catchupElapsed, isSummary = false }: { treatments: Treatment[], elapsedSeconds: number, catchupElapsed: number, isSummary?: boolean }) {
  return (
    <div className="bg-white rounded-b-xl border border-neutral-100 overflow-hidden shadow-sm">
      {/* Balanced columns: More space for name, even space for times */}
      <div className={`grid ${isSummary ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2.1fr_1fr_1.4fr_0.9fr]'} bg-neutral-100 border-b border-neutral-200 px-4 py-3`}>
        <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-left">Treatment</div>
        <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</div>
        <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Elapsed</div>
        {!isSummary && <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-right">Ago</div>}
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-neutral-100">
        {treatments.length === 0 ? (
          <div className="p-12 text-center text-neutral-300 italic">No treatments recorded</div>
        ) : (
          [...treatments].reverse().map((tx, i) => {
            const timeVal = isSummary ? tx.clockSeconds : tx.clock;
            const timeDisplay = tx.prior ? `< ${timeVal}` : timeVal;
            const elapsedDisplay = tx.prior ? `< ${isSummary ? formatTimeWithSeconds(catchupElapsed) : formatTime(catchupElapsed)}` : (isSummary ? formatTimeWithSeconds(tx.elapsed) : formatTime(tx.elapsed));
            const agoVal = tx.prior ? elapsedSeconds : (elapsedSeconds - tx.elapsed);
            const ago = tx.prior ? `> ${formatTimeHMM(agoVal)}` : formatTimeHMM(agoVal);
            
            return (
              <div key={i} className={`grid ${isSummary ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2.1fr_1fr_1.4fr_0.9fr]'} px-4 py-4 items-center gap-1`}>
                <div className={`text-[15px] font-bold pr-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                  tx.name.toLowerCase().includes('shock') ? 'text-red-600' : 
                  tx.name.toLowerCase().includes('disarm') ? 'text-blue-600' : 
                  'text-neutral-900'
                }`} title={tx.name}>{tx.name}</div>
                <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">{timeDisplay}</div>
                <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">{elapsedDisplay}</div>
                {!isSummary && <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-right">{ago}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SummaryStats({ state, pharmaSummary }: { state: AppState, pharmaSummary: Record<string, number> }) {
  const disarmCount = state.treatments.filter(t => t.name.includes('Disarm')).length;
  
  return (
    <div className="space-y-6">
       <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">ARREST SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm">
          <StatRow label="CPR Rounds" value={state.cprRound} />
          <StatRow label="Shocks given" value={state.shocks} color="text-red-600" />
          <StatRow label="Disarmed" value={disarmCount} color="text-blue-600" />
        </div>
      </div>

      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">PHARMA SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm min-h-[60px]">
          {Object.keys(pharmaSummary).length === 0 ? (
            <div className="p-4 text-neutral-300 italic text-sm">No medications given</div>
          ) : (
            Object.entries(pharmaSummary).map(([name, count]) => (
              <StatRow key={name} label={name} value={count} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryOverlay({ state, pharmaSummary }: { state: AppState, pharmaSummary: Record<string, number> }) {
  return (
    <div className="space-y-6 pb-20">
      <SummaryStats state={state} pharmaSummary={pharmaSummary} />
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider">TREATMENT LOG</div>
        <TreatmentLog treatments={state.treatments} elapsedSeconds={state.elapsedSeconds} catchupElapsed={state.catchupElapsed} />
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  color?: string;
  key?: React.Key;
}

function StatRow({ label, value, color = "text-neutral-900" }: StatRowProps) {
  return (
    <div className="flex justify-between items-center p-2 px-3">
      <span className="text-neutral-500 text-[16px] font-medium">{label}</span>
      <span className={`text-[16px] font-black tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function TreatmentSelection({ addTreatment, isShockForced }: { addTreatment: (n: string) => void, isShockForced?: boolean }) {
  const [customTx, setCustomTx] = useState('');
  
  return (
    <div className="h-full pb-20">
      {isShockForced && (
        <div className="bg-[#b91c1c] text-white p-4 text-center font-bold sticky top-0 z-[100] animate-pulse">
           RHYTHM CHECK: SELECT SHOCK STATUS
        </div>
      )}
      
      <TxSection 
        title="Rhythm Check" 
        color="pink" 
        initiallyExpanded={isShockForced}
        items={[
          'Shock — VT', 'Disarm — VF', 'Disarm — PEA', 'Disarm — Asystole', 'Disarm — ROSC'
        ]} 
        onSelect={addTreatment} 
      />

      {!isShockForced && (
        <>
          <TxSection title="Medications" color="emerald" items={[
            'Adrenaline push', 'Adrenaline infus.', 'Amiodarone', 'Atropine', 'Calcium', 'Glucose', 'Ketamine', 'Magnesium', 'Midazolam', 'Normal Saline', 'Sodium Bicarbonate', 'Suxamethonium'
          ]} onSelect={addTreatment} />
          
          <TxSection title="Airway" color="blue" items={['ETT', 'FONA', 'IGT', 'LMA']} onSelect={addTreatment} />
          
          <TxSection title="Other Tx" color="neutral" items={['Shock', 'Corpuls', 'Extrication', 'IO', 'IV access', 'Pacing']} onSelect={addTreatment} />
          
          <div className="p-6 border-t border-neutral-100 bg-neutral-50 px-2 sm:px-6">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={customTx}
                onChange={e => setCustomTx(e.target.value)}
                placeholder="Custom treatment..."
                className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={() => { if(customTx) { addTreatment(customTx); setCustomTx(''); } }} 
                className="bg-emerald-600 text-white px-6 rounded-xl font-bold btn-base"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TxSection({ title, color, items, onSelect, initiallyExpanded = false }: { title: string, color: string, items: string[], onSelect: (n: string) => void, initiallyExpanded?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(!initiallyExpanded);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    pink: 'bg-rose-50 text-rose-800 border-rose-100',
    blue: 'bg-blue-50 text-blue-800 border-blue-100',
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200'
  };

  return (
    <div>
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between p-4 cursor-pointer font-bold select-none text-left ${colorMap[color]}`}
      >
        <span>{title}</span>
        <ChevronDown className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
      </div>
      <motion.div 
        animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden bg-white"
      >
        <div className="p-3 grid grid-cols-1 gap-2">
          {items.map(item => (
            <button key={item} onClick={() => onSelect(item)} className="w-full text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm text-neutral-700 hover:bg-neutral-100 btn-base">
              {item}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
