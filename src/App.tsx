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
  startClockTime: null,
  patientWeight: null,
  patientType: null
};

const MEDICATIONS = [
  'Adrenaline push', 'Adrenaline infusion', 'Amiodarone', 
  'Atropine', 'Calcium', 'Glucose', 'Heparin', 'Ketamine', 'Ketamine infusion', 'Lignocaine',
  'Magnesium', 'Midazolam', 'Normal Saline', 'Oxygen', 'Sodium Bicarbonate', 'Suxamethonium'
];

type DoseOption = {
  dose: string;
  population: 'adult' | 'paed' | 'both';
  indication?: string;
};


const DOSE_CONFIG: Record<string, { doses: DoseOption[] }> = {
  'Adrenaline push': { 
    doses: [
      { dose: '1mg', population: 'adult', indication: 'Cardiac arrest' },
      { dose: '0.01mg/kg', population: 'paed', indication: 'Cardiac arrest' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Adrenaline infusion': { 
    doses: [
      { dose: '1mg/500mL', population: 'both' },
      { dose: '3mg/50mL', population: 'both' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Amiodarone': { 
    doses: [
      { dose: '300mg', population: 'adult', indication: 'VF/VT cardiac arrest' },
      { dose: '150mg', population: 'adult', indication: 'VT with output' },
      { dose: '5mg/kg', population: 'paed', indication: 'VF/VT cardiac arrest' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Atropine': { 
    doses: [
      { dose: '600mcg', population: 'adult', indication: 'Bradycardia' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Calcium': { 
    doses: [
      { dose: '10mL 10%', population: 'both', indication: 'Cardiac arrest' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Glucose': { 
    doses: [
      { dose: '100mL 10%', population: 'both' },
      { dose: '50mL 50%', population: 'both' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Heparin': {
    doses: [
      { dose: '5000u', population: 'adult' },
      { dose: 'Other', population: 'both' }
    ]
  },
  'Ketamine': { 
    doses: [
      { dose: '0.5mg/kg', population: 'both', indication: 'CPR-IC' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Ketamine infusion': {
    doses: [
      { dose: '100mg/hr', population: 'both' },
      { dose: '20mg (2mL)', population: 'both' },
      { dose: 'Other', population: 'both' }
    ]
  },
  'Lignocaine': { 
    doses: [
      { dose: '1mg/kg', population: 'both', indication: 'VT with output' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Magnesium': { 
    doses: [
      { dose: '2.5g', population: 'adult', indication: 'Refractory VF' },
      { dose: '50mg/kg', population: 'paed', indication: 'Cardiac arrest' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Midazolam': { 
    doses: [
      { dose: '5mg', population: 'both' },
      { dose: '0.1mg/kg', population: 'both' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Normal Saline': { 
    doses: [
      { dose: '250mL', population: 'both' },
      { dose: '500mL', population: 'both' },
      { dose: '1000mL', population: 'both' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Sodium Bicarbonate': { 
    doses: [
      { dose: '1mMol/kg', population: 'both', indication: 'Cardiac arrest: Hyperkalaemia/OD' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Suxamethonium': { 
    doses: [
      { dose: '1.5mg/kg', population: 'adult', indication: 'Intubation' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Oxygen': {
    doses: [
      { dose: 'Nasal cannulae', population: 'both' },
      { dose: 'BVM', population: 'both' }
    ]
  }
};

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

const calculateDose = (doseStr: string, weight: number | null): string => {
  if (!weight || !doseStr.includes('/kg')) return doseStr;
  
  const match = doseStr.match(/([\d.]+)(mg|g|mcg|ml)\/kg/);
  if (!match) return doseStr;
  
  const [_, amount, unit] = match;
  const calculated = parseFloat(amount) * weight;
  const rounded = Math.round(calculated * 10) / 10;
  
  return `${amount}${unit}/kg (${rounded}${unit})`;
};

const cleanDoseForLog = (doseStr: string): string => {
  // Extract calculated dose from parentheses if present: "0.01mg/kg (0.3mg)" -> "0.3mg"
  const match = doseStr.match(/\(([\d.]+(?:mg|g|mcg|ml|mL))\)/);
  if (match) {
    return match[1];
  }
  return doseStr;
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

  const [showCatchup, setShowCatchup] = useState(() => {
    const saved = localStorage.getItem('theBigOneState');
    if (!saved) return true; // No saved state = show catchup
    try {
      const loaded = JSON.parse(saved);
      return !loaded.running; // Show catchup if timer not running
    } catch (e) {
      return true;
    }
  });
  const [catchupStep, setCatchupStep] = useState(1);
  const [catchupElapsed, setCatchupElapsed] = useState({ mins: 0, secs: 0 });
  const [catchupRhythm, setCatchupRhythm] = useState({ mins: 2, secs: 0 });
  const [weightType, setWeightType] = useState<'adult' | 'paed' | null>(null);
  const [paedWeightMethod, setPaedWeightMethod] = useState<'weight' | 'age' | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [priorCounts, setPriorCounts] = useState({ shock: 0, disarm: 0, adrenaline: 0 });
  const [priorTxs, setPriorTxs] = useState<string[]>([]);
  const [isCaseClosed, setIsCaseClosed] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [disregardAdrenaline, setDisregardAdrenaline] = useState<'pending' | 'confirmed' | null>(null);
  const [disregardAmiodarone, setDisregardAmiodarone] = useState<'pending' | 'confirmed' | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [isShockForced, setIsShockForced] = useState(false);
  const lastBeepSecond = useRef<number | null>(null);
  const hasAutoClosedAt15 = useRef<boolean>(false);

  // Timeout for disregard pending states (3 seconds)
  useEffect(() => {
    if (disregardAdrenaline === 'pending') {
      const timer = setTimeout(() => {
        setDisregardAdrenaline(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [disregardAdrenaline]);

  useEffect(() => {
    if (disregardAmiodarone === 'pending') {
      const timer = setTimeout(() => {
        setDisregardAmiodarone(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [disregardAmiodarone]);

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
    
    // Reset disregard states when new doses given
    if (name.includes('Adrenaline')) {
      setDisregardAdrenaline(null);
    }
    if (name.includes('Amiodarone')) {
      setDisregardAmiodarone(null);
    }
  };

  const adrenalineRoundStatus = useMemo(() => {
    const adrTreatments = state.treatments.filter(t => t.name.includes('Adrenaline'));
    const lastAdr = adrTreatments.pop();
    
    if (!lastAdr) {
      return { text: "", show: false, isDue: false };
    }
    
    if (lastAdr.prior) {
      return { text: "Next adrenaline: unknown", show: true, isDue: false };
    }

    const roundGiven = lastAdr.round || (Math.floor(lastAdr.elapsed / 120) + 1);
    const nextDueRound = roundGiven + 2;
    const isDue = state.cprRound >= nextDueRound;
    
    if (isDue) {
      return { text: "Next adrenaline: Now", show: true, isDue: true };
    } else {
      return { text: `Next adrenaline: Round ${nextDueRound}`, show: true, isDue: false };
    }
  }, [state.treatments, state.cprRound]);

  const amiodaroneStatus = useMemo(() => {
    const amioTreatments = state.treatments.filter(t => t.name.includes('Amiodarone'));
    const lastAmio = amioTreatments[amioTreatments.length - 1];
    
    if (!lastAmio) {
      return { text: "", show: false, isDue: false, countdown: 0, flashRed: false };
    }
    
    if (lastAmio.prior) {
      return { text: "Next amiodarone: unknown", show: true, isDue: false, countdown: 0, flashRed: false };
    }

    const timeSinceLastDose = state.elapsedSeconds - lastAmio.elapsed;
    const timeUntilNext = 300 - timeSinceLastDose; // 5 minutes = 300 seconds
    
    if (timeUntilNext <= 0) {
      return { text: "Next amiodarone: Now", show: true, isDue: true, countdown: timeUntilNext, flashRed: true };
    } else {
      const mins = Math.floor(timeUntilNext / 60);
      const secs = timeUntilNext % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      const flashRed = timeUntilNext <= 30; // Flash red when 30s or less
      return { text: `Next amiodarone: ${timeStr}`, show: true, isDue: false, countdown: timeUntilNext, flashRed };
    }
  }, [state.treatments, state.elapsedSeconds]);


  const pharmaSummary = useMemo(() => {
    const summary: Record<string, { totalDose: number, unit: string, count: number, display: string }> = {};
    
    state.treatments.forEach(tx => {
      for (const med of MEDICATIONS) {
        // Skip Oxygen in pharma summary
        if (med === 'Oxygen') continue;
        
        if (tx.name.startsWith(med)) {
          if (!summary[med]) {
            summary[med] = { totalDose: 0, unit: '', count: 0, display: '' };
          }
          
          // Extract dose from treatment name (everything after medication name)
          const doseStr = tx.name.substring(med.length).trim();
          
          if (doseStr) {
            // For weight-based doses with calculated value: "0.01mg/kg (3.5mg)"
            // Extract the calculated value in parentheses
            const calculatedMatch = doseStr.match(/\(([\d.]+)(mg|mL|mMol|mcg|g|u|%)\)/i);
            if (calculatedMatch) {
              const [_, amount, unit] = calculatedMatch;
              if (!summary[med].unit) summary[med].unit = unit;
              if (summary[med].unit === unit) {
                summary[med].totalDose += parseFloat(amount);
              }
            } else {
              // Direct dose: "1mg", "300mg", "100mL", etc.
              const directMatch = doseStr.match(/([\d.]+)(mg|mL|mMol|mcg|g|u|%)/i);
              if (directMatch) {
                const [_, amount, unit] = directMatch;
                if (!summary[med].unit) summary[med].unit = unit;
                if (summary[med].unit === unit) {
                  summary[med].totalDose += parseFloat(amount);
                }
              }
            }
          }
          summary[med].count++;
          break;
        }
      }
    });
    
    // Format display strings
    Object.keys(summary).forEach(med => {
      const { totalDose, unit, count } = summary[med];
      if (totalDose > 0 && unit) {
        // Round to 2 decimal places and remove trailing zeros
        const roundedDose = parseFloat(totalDose.toFixed(2));
        summary[med].display = `${roundedDose}${unit} (${count})`;
      } else {
        summary[med].display = `${count}`;
      }
    });
    
    return summary;
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
      startClockTime: startClockTime,
      patientWeight: weightInput ? parseFloat(weightInput) : null,
      patientType: weightType
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
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">Total time</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">{formatTime(state.elapsedSeconds)}</span>
            </div>
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">CPR round</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">{state.cprRound}</span>
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

          {/* Adrenaline & Amiodarone Status - Always rendered, visibility controlled */}
          <div className="flex gap-2 sm:gap-3 w-full max-w-[560px] justify-between mb-2 sm:mb-4">
            {/* Adrenaline Warning */}
            <div 
              onClick={() => {
                if (!adrenalineRoundStatus.show || disregardAdrenaline === 'confirmed') return;
                if (disregardAdrenaline === 'pending') {
                  setDisregardAdrenaline('confirmed');
                } else if (disregardAdrenaline !== 'confirmed') {
                  setDisregardAdrenaline('pending');
                }
              }}
              className={`flex-1 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                !adrenalineRoundStatus.show || disregardAdrenaline === 'confirmed' 
                  ? 'opacity-0 pointer-events-none' 
                  : 'opacity-100 cursor-pointer'
              } ${
                disregardAdrenaline === 'pending'
                  ? 'bg-red-50 text-red-700 border-neutral-100'
                  : adrenalineRoundStatus.isDue 
                  ? 'bg-red-50 text-red-700 border-neutral-100 animate-pulse' 
                  : 'bg-neutral-100 text-neutral-900 border-neutral-100'
              }`}
            >
              {disregardAdrenaline === 'pending' ? (
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-center">Disregard?</span>
              ) : (
                <>
                  <span className={`font-bold tracking-widest text-center mb-1.5 sm:mb-3 ${
                    adrenalineRoundStatus.isDue 
                      ? 'text-[10px] sm:text-[12px] text-red-700'
                      : 'text-[10px] sm:text-[12px] text-neutral-900'
                  }`}>
                    {adrenalineRoundStatus.text.split(':')[0] + ':'}
                  </span>
                  <span className={`font-bold text-center leading-none tabular-nums ${
                    adrenalineRoundStatus.isDue
                      ? 'text-[22px] sm:text-[43px] text-red-700'
                      : 'text-[22px] sm:text-[43px] text-neutral-400'
                  }`}>
                    {adrenalineRoundStatus.text.split(':').slice(1).join(':').trim()}
                  </span>
                </>
              )}
            </div>
            
            {/* Amiodarone Warning */}
            <div 
                onClick={() => {
                  if (!amiodaroneStatus.show || disregardAmiodarone === 'confirmed') return;
                  if (disregardAmiodarone === 'pending') {
                    setDisregardAmiodarone('confirmed');
                  } else if (disregardAmiodarone !== 'confirmed') {
                    setDisregardAmiodarone('pending');
                  }
                }}
                className={`flex-1 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                  !amiodaroneStatus.show || disregardAmiodarone === 'confirmed'
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100 cursor-pointer'
                } ${
                  disregardAmiodarone === 'pending'
                    ? 'bg-red-50 text-red-700 border-neutral-100'
                    : amiodaroneStatus.flashRed
                    ? 'bg-red-50 text-red-700 border-neutral-100 animate-pulse' 
                    : 'bg-neutral-100 text-neutral-900 border-neutral-100'
                }`}
              >
                {disregardAmiodarone === 'pending' ? (
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-center">Disregard?</span>
                ) : (
                  <>
                    <span className={`font-bold tracking-widest text-center mb-1.5 sm:mb-3 ${
                      amiodaroneStatus.flashRed
                        ? 'text-[10px] sm:text-[12px] text-red-700'
                        : 'text-[10px] sm:text-[12px] text-neutral-900'
                    }`}>
                      {amiodaroneStatus.text.includes(':') ? amiodaroneStatus.text.split(':')[0] + ':' : amiodaroneStatus.text}
                    </span>
                    {amiodaroneStatus.text.includes(':') && (
                      <span className={`font-bold text-center leading-none tabular-nums ${
                        amiodaroneStatus.flashRed
                          ? 'text-[22px] sm:text-[43px] text-red-700'
                          : 'text-[22px] sm:text-[43px] text-neutral-400'
                      }`}>
                        {amiodaroneStatus.text.split(':').slice(1).join(':').trim()}
                      </span>
                    )}
                  </>
                )}
              </div>
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
              key={`catchup-${catchupStep}-${weightType}-${paedWeightMethod}`}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="bg-white rounded-[28px] p-6 max-w-md w-[90%] shadow-2xl overflow-hidden absolute"
            >
              {catchupStep === 1 && (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-extrabold text-neutral-900">Arrest Started</h2>
                  <p className="text-neutral-500 text-base leading-relaxed">Let's calibrate the timer with the monitor for accurate logging.</p>
                  <button onClick={() => setCatchupStep(2)} className="w-full bg-emerald-600 text-white p-5 rounded-2xl text-lg font-bold btn-base">Calibrate</button>
                </div>
              )}

              {catchupStep === 5 && !weightType && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900">Patient Type</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setWeightType('adult')}
                      className="bg-emerald-600 text-white p-5 rounded-2xl text-base font-bold btn-base"
                    >
                      Adult
                    </button>
                    <button 
                      onClick={() => setWeightType('paed')}
                      className="bg-pink-400 text-white p-5 rounded-2xl text-base font-bold btn-base"
                    >
                      Paediatric
                    </button>
                  </div>
                  <button onClick={() => setCatchupStep(4)} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                </div>
              )}

              {catchupStep === 5 && weightType === 'adult' && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900">Patient Weight (Optional)</h2>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter weight"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCatchupStart()}
                        className="w-40 bg-white border-2 border-emerald-300 rounded-xl px-5 py-3 text-xl font-bold text-center focus:ring-4 focus:ring-emerald-500 outline-none"
                      />
                      {weightInput && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 text-lg font-bold pointer-events-none">kg</span>}
                    </div>
                    <button 
                      onClick={handleCatchupStart}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold btn-base"
                    >
                      {weightInput ? 'Set' : 'Skip'}
                    </button>
                  </div>
                  <button onClick={() => { setWeightType(null); setWeightInput(''); }} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                </div>
              )}

              {catchupStep === 5 && weightType === 'paed' && !paedWeightMethod && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900">Patient Weight</h2>
                  <p className="text-neutral-500 text-sm">Choose how to enter weight</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPaedWeightMethod('weight')}
                      className="bg-pink-400 text-white p-5 rounded-2xl text-base font-bold btn-base"
                    >
                      Enter weight
                    </button>
                    <button 
                      onClick={() => setPaedWeightMethod('age')}
                      className="bg-pink-400 text-white p-5 rounded-2xl text-base font-bold btn-base"
                    >
                      Age based weight
                    </button>
                  </div>
                  <button onClick={() => { setWeightType(null); }} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                </div>
              )}

              {catchupStep === 5 && weightType === 'paed' && paedWeightMethod === 'weight' && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900">Enter Patient Weight</h2>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter weight"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && weightInput && handleCatchupStart()}
                        className="w-40 bg-white border-2 border-pink-300 rounded-xl px-5 py-3 text-xl font-bold text-center focus:ring-4 focus:ring-pink-400 outline-none"
                      />
                      {weightInput && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 text-lg font-bold pointer-events-none">kg</span>}
                    </div>
                    {weightInput && (
                      <button 
                        onClick={handleCatchupStart}
                        className="bg-pink-400 text-white px-6 py-2 rounded-xl font-bold btn-base"
                      >
                        Set
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setPaedWeightMethod(null); setWeightInput(''); }} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                </div>
              )}

              {catchupStep === 5 && weightType === 'paed' && paedWeightMethod === 'age' && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900 mb-3">Select Age</h2>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto p-2">
                    {[
                      ['Newborn', 3], ['1 month', 4], ['3 months', 6], ['6 months', 8],
                      ['9 months', 9], ['1 year', 10], ['18 months', 11], ['2 years', 12],
                      ['3 years', 15], ['4 years', 17], ['5 years', 19], ['6 years', 21],
                      ['7 years', 23], ['8 years', 26], ['9 years', 29], ['10 years', 32],
                      ['11 years', 35], ['12 years', 38]
                    ].map(([age, weight]) => (
                      <button
                        key={age}
                        onClick={() => { setWeightInput(String(weight)); handleCatchupStart(); }}
                        className="w-full bg-pink-400 text-white p-3 rounded-xl text-sm font-bold btn-base flex justify-between items-center"
                      >
                        <span>{age}</span>
                        <span>{weight}kg</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setPaedWeightMethod(null); }} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                </div>
              )}

              {catchupStep === 2 && (
                <div className="text-center space-y-6">
                  <h2 className="text-xl font-bold text-neutral-900 px-4">Enter the elapsed case time on the monitor</h2>
                  <TimePicker value={catchupElapsed} onChange={setCatchupElapsed} />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(1)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => { setCatchupRhythm(catchupElapsed); setCatchupStep(3); }} className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base">Next</button>
                  </div>
                </div>
              )}

              {catchupStep === 3 && (
                <div className="text-center space-y-6">
                  <h2 className="text-xl font-bold text-neutral-900 px-4">What will the case time be when the next rhythm check is due?</h2>
                  <TimePicker 
                    value={catchupRhythm} 
                    onChange={setCatchupRhythm} 
                    maxSeconds={catchupElapsed.mins * 60 + catchupElapsed.secs + 120}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(2)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => setCatchupStep(4)} className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base">Next</button>
                  </div>
                </div>
              )}

              {catchupStep === 4 && (
                <div className="text-center space-y-5">
                  <h2 className="text-xl font-bold text-neutral-900">What treatments have you already applied?</h2>
                  <div className="space-y-2 py-3 px-2">
                    <CounterItem label="Shock" value={priorCounts.shock} onChange={v => setPriorCounts(p => ({ ...p, shock: v }))} />
                    <CounterItem label="Disarm" value={priorCounts.disarm} onChange={v => setPriorCounts(p => ({ ...p, disarm: v }))} />
                    <CounterItem label="Adrenaline" value={priorCounts.adrenaline} onChange={v => setPriorCounts(p => ({ ...p, adrenaline: v }))} />
                    <div className="grid grid-cols-3 gap-2">
                      {['BVM', 'LMA', 'IO'].map(tx => (
                        <button 
                          key={tx}
                          onClick={() => setPriorTxs(p => p.includes(tx) ? p.filter(t => t !== tx) : [...p, tx])}
                          className={`p-3 rounded-xl font-bold text-base ${priorTxs.includes(tx) ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400' : 'bg-neutral-100 text-neutral-600'}`}
                        >
                          {tx}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(3)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => setCatchupStep(5)} className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base">Next</button>
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

function TimePicker({ value, onChange, maxSeconds }: { value: { mins: number, secs: number }, onChange: (v: { mins: number, secs: number }) => void, maxSeconds?: number }) {
  const adjust = (type: 'mins' | 'secs', delta: number) => {
    const newVal = { ...value };
    if (type === 'mins') {
      newVal.mins = Math.max(0, newVal.mins + delta);
    } else {
      newVal.secs = (newVal.secs + delta + 60) % 60;
    }
    
    // Enforce max limit if provided
    if (maxSeconds !== undefined) {
      const totalSeconds = newVal.mins * 60 + newVal.secs;
      if (totalSeconds > maxSeconds) {
        return; // Don't update if exceeds max
      }
    }
    
    onChange(newVal);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex flex-col items-center">
        <button onClick={() => adjust('mins', 1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        <div className="text-5xl font-bold text-neutral-900 tabular-nums my-2">{value.mins}</div>
        <button onClick={() => adjust('mins', -1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
        <span className="text-neutral-400 font-bold uppercase text-xs mt-2">min</span>
      </div>
      <div className="text-5xl font-bold text-neutral-400 mb-8">:</div>
      <div className="flex flex-col items-center">
        <button onClick={() => adjust('secs', 10)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        <div className="text-5xl font-bold text-neutral-900 tabular-nums my-2">{value.secs.toString().padStart(2, '0')}</div>
        <button onClick={() => adjust('secs', -10)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
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
  pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }>,
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
        {type === 'treatment' && <TreatmentSelection addTreatment={addTreatment} state={state} isShockForced={isShockForced} />}
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
  // Helper to split treatment name into medication and dose
  const splitTreatmentName = (name: string): { med: string, dose: string | null } => {
    // Match dose patterns at the end: numbers followed by units (mg, mcg, mL, mMol, g, kg, %)
    const doseMatch = name.match(/^(.+?)\s+([\d.]+(?:mg\/kg|mMol\/kg|mL\/kg|mcg|mg|mL|mMol|g|kg|%|\/\d+mL))$/);
    if (doseMatch) {
      return { med: doseMatch[1], dose: doseMatch[2] };
    }
    return { med: name, dose: null };
  };

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
            const { med, dose } = splitTreatmentName(tx.name);
            
            return (
              <div key={i} className={`grid ${isSummary ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2.1fr_1fr_1.4fr_0.9fr]'} px-4 py-4 items-center gap-1`}>
                <div className="pr-1">
                  <div className={`text-[15px] font-bold ${
                    tx.name.toLowerCase().includes('shock') ? 'text-red-600' : 
                    tx.name.toLowerCase().includes('disarm') ? 'text-blue-600' : 
                    'text-neutral-900'
                  }`}>{med}</div>
                  {dose && <div className="text-[13px] text-neutral-500 font-medium mt-0.5">{dose}</div>}
                </div>
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

function SummaryStats({ state, pharmaSummary }: { state: AppState, pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }> }) {
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
            Object.entries(pharmaSummary).map(([name, info]) => (
              <StatRow key={name} label={name} value={info.display} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryOverlay({ state, pharmaSummary }: { state: AppState, pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }> }) {
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
  stacked?: boolean;
}

function StatRow({ label, value, color = "text-neutral-900", stacked = false }: StatRowProps) {
  if (stacked) {
    return (
      <div className="p-2 px-3">
        <div className="text-neutral-500 text-[16px] font-medium">{label}</div>
        <div className={`text-[14px] font-black tabular-nums ${color} mt-0.5`}>{value}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center p-2 px-3">
      <span className="text-neutral-500 text-[16px] font-medium">{label}</span>
      <span className={`text-[16px] font-black tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function TreatmentSelection({ addTreatment, state, isShockForced }: { addTreatment: (n: string) => void, state: AppState, isShockForced?: boolean }) {
  const [customTx, setCustomTx] = useState('');
  const [selectedMed, setSelectedMed] = useState<string | null>(null);
  const [customDose, setCustomDose] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(isShockForced ? 'rhythmCheck' : null);
  
  const handleMedClick = (med: string) => {
    if (DOSE_CONFIG[med]) {
      setSelectedMed(med);
      setExpandedSection('medications'); // Keep medications section expanded
    } else {
      addTreatment(med);
    }
  };
  
  const handleDoseSelect = (dose: string) => {
    if (selectedMed) {
      const displayDose = calculateDose(dose, state.patientWeight);
      const cleanDose = cleanDoseForLog(displayDose);
      addTreatment(`${selectedMed} ${cleanDose}`);
      setSelectedMed(null);
      setCustomDose('');
    }
  };
  
  const handleCustomDoseAdd = () => {
    if (selectedMed && customDose && DOSE_CONFIG[selectedMed]) {
      // Extract unit from dose options
      const doses = DOSE_CONFIG[selectedMed].doses.map(d => d.dose);
      const unitMatches = doses
        .filter(d => d !== 'Other')
        .map(d => {
          const match = d.match(/(mg\/kg|mMol\/kg|mL\/kg|mcg\/kg|u\/kg|mg|mL|mMol|mcg|g|u|%)$/i);
          return match ? match[1] : null;
        })
        .filter(Boolean);
      
      const unit = unitMatches.length > 0 ? unitMatches[0] : '';
      const doseWithUnit = unit ? `${customDose}${unit}` : customDose;
      
      addTreatment(`${selectedMed} ${doseWithUnit}`);
      setSelectedMed(null);
      setCustomDose('');
    }
  };
  
  const handleBackFromMed = () => {
    // Update both states atomically to prevent flash
    setSelectedMed(null);
    setCustomDose('');
    setExpandedSection(() => 'medications');
  };
  
  if (selectedMed && DOSE_CONFIG[selectedMed]) {
    const allDoses = DOSE_CONFIG[selectedMed].doses;
    const filteredDoses = state.patientType 
      ? allDoses.filter(d => d.population === 'both' || d.population === state.patientType)
      : allDoses;
    
    const doses = filteredDoses.map(d => d.dose);
    const showOther = doses.includes('Other');
    
    return (
      <div className="h-full overflow-y-auto pb-4">
        <div className="p-6 mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedMed}</h2>
          {state.patientWeight && (
            <p className="text-neutral-500 text-sm mb-2">Patient weight: {state.patientWeight}kg</p>
          )}
          {state.patientType && (
            <p className="text-neutral-500 text-sm mb-6">Patient type: {state.patientType}</p>
          )}
          
          <div className="space-y-3">
            {filteredDoses.filter(d => d.dose !== 'Other').map(doseOpt => (
              <button
                key={doseOpt.dose}
                onClick={() => handleDoseSelect(doseOpt.dose)}
                className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base flex flex-col items-start gap-1"
              >
                {doseOpt.indication && (
                  <span className="text-[10px] opacity-60 font-normal uppercase tracking-wide">{doseOpt.indication}</span>
                )}
                <span className="text-lg">{calculateDose(doseOpt.dose, state.patientWeight)}</span>
              </button>
            ))}
            
            {showOther && (() => {
              // Extract common unit from dose strings
              const getUnitFromDoses = (doses: string[]): string => {
                const unitMatches = doses
                  .filter(d => d !== 'Other')
                  .map(d => {
                    // Match common patterns: mg/kg, mL, mg, g, etc.
                    const match = d.match(/(mg\/kg|mMol\/kg|mL\/kg|mcg\/kg|u\/kg|mg|mL|mMol|mcg|g|u|%)$/i);
                    return match ? match[1] : null;
                  })
                  .filter(Boolean);
                
                // Return most common unit or first found
                if (unitMatches.length > 0) {
                  return unitMatches[0] as string;
                }
                return '';
              };
              
              const doses = filteredDoses.map(d => d.dose);
              const unit = getUnitFromDoses(doses);
              const placeholder = unit ? `Custom dose (${unit})...` : 'Custom dose...';
              
              return (
              <div className="w-full flex gap-2 items-center">
                <div className="flex-1 relative flex items-center bg-white border border-neutral-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 min-w-0">
                  <input
                    type="text"
                    value={customDose}
                    onChange={e => setCustomDose(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && customDose && handleCustomDoseAdd()}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent px-4 py-3 text-base outline-none min-w-0 text-right"
                  />
                  {unit && (
                    <span className="pr-4 text-neutral-400 text-sm font-medium whitespace-nowrap">{unit}</span>
                  )}
                </div>
                <button
                  onClick={handleCustomDoseAdd}
                  className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold btn-base disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  disabled={!customDose}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
              );
            })()}
          </div>
        </div>
        
        <div className="p-6 pt-0">
          <button 
            onClick={handleBackFromMed}
            className="text-emerald-600 font-bold flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto pb-4">
      {isShockForced && (
        <div className="bg-[#b91c1c] text-white p-4 text-center font-bold sticky top-0 z-[100] animate-pulse">
           RHYTHM CHECK: SELECT SHOCK STATUS
        </div>
      )}
      
      <TxSection 
        title="Rhythm Check" 
        color="pink" 
        sectionId="rhythmCheck"
        expandedSection={expandedSection}
        onToggle={(id) => setExpandedSection(expandedSection === id ? null : id)}
        items={[
          'Shock — VT', 'Disarm — VF', 'Disarm — PEA', 'Disarm — Asystole', 'Disarm — ROSC'
        ]} 
        onSelect={addTreatment} 
      />

      {!isShockForced && (
        <>
          <TxSection 
            title="Medications" 
            color="emerald" 
            items={MEDICATIONS} 
            onSelect={handleMedClick}
            sectionId="medications"
            expandedSection={expandedSection}
            onToggle={(id) => setExpandedSection(expandedSection === id ? null : id)}
          />
          
          <TxSection 
            title="Airway" 
            color="blue" 
            items={['ETT', 'FONA', 'IGT', 'LMA']} 
            onSelect={addTreatment}
            sectionId="airway"
            expandedSection={expandedSection}
            onToggle={(id) => setExpandedSection(expandedSection === id ? null : id)}
          />
          
          <TxSection 
            title="Other Tx" 
            color="neutral" 
            items={['Shock', 'Corpuls', 'Extrication', 'IO', 'IV access', 'Pacing', 'Reassurance provided']} 
            onSelect={addTreatment}
            sectionId="otherTx"
            expandedSection={expandedSection}
            onToggle={(id) => setExpandedSection(expandedSection === id ? null : id)}
          />
          
          <div className="p-6 border-t border-neutral-100 bg-neutral-50 px-2 sm:px-6 mb-4">
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

function TxSection({ 
  title, 
  color, 
  items, 
  onSelect, 
  initiallyExpanded = false,
  sectionId,
  expandedSection,
  onToggle
}: { 
  title: string;
  color: string;
  items: string[];
  onSelect: (n: string) => void;
  initiallyExpanded?: boolean;
  sectionId?: string;
  expandedSection?: string | null;
  onToggle?: (id: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(!initiallyExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const collapsed = sectionId && expandedSection !== undefined 
    ? expandedSection !== sectionId
    : isCollapsed;
  
  const handleToggle = () => {
    if (sectionId && onToggle) {
      onToggle(sectionId);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };
  
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    pink: 'bg-rose-50 text-rose-800 border-rose-100',
    blue: 'bg-blue-50 text-blue-800 border-blue-100',
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200'
  };

  return (
    <div>
      <div 
        onClick={handleToggle}
        className={`flex items-center justify-between p-4 cursor-pointer font-bold select-none text-left ${colorMap[color]}`}
      >
        <span>{title}</span>
        <ChevronDown className={`transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`} />
      </div>
      <motion.div 
        initial={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
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
