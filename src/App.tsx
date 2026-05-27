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
  Stethoscope,
  ArrowRight,
  Sliders,
  RefreshCw,
  Hand
} from 'lucide-react';
import { AppState, Treatment, OverlayType } from './types';
import InteractiveTutorial from './InteractiveTutorial';
import TutorialOverlay from './TutorialOverlay';

// --- Constants ---
const INITIAL_STATE: AppState = {
  running: false,
  startTime: null,
  pausedTime: 0,
  elapsedSeconds: 0,
  rhythmCheckTarget: 120, // 2 minutes
  rhythmCheckOvertime: 0, // Counts up from 0 to 6 after rhythm check hits 0:00
  rhythmCheckPaused: false, // When true, rhythm check stays frozen even while running
  cprRound: 1,
  shocks: 0,
  treatments: [],
  currentOverlay: null,
  catchupElapsed: 0,
  startClockTime: null,
  patientWeight: null,
  patientType: null,
  reversiblesChecked: [],
  roscChecked: [],
  pheaChecked: [],
  isROSCMode: false,
  vitals: { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' }
};

const MEDICATIONS = [
  'Adrenaline push', 'Adrenaline infusion', 'Amiodarone', 
  'Atropine', 'Calcium', 'Glucose 10%', 'Heparin', 'Ketamine push', 'Ketamine infusion', 'Lignocaine',
  'Magnesium', 'Midazolam', 'Morphine', 'Normal Saline', 'Oxygen', 'Sodium Bicarbonate', 'Suxamethonium'
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
  'Glucose 10%': { 
    doses: [
      { dose: '2.5mL/kg', population: 'both', calculated: true },
      { dose: 'Other', population: 'both' }
    ],
    customUnit: 'mls'
  },
  'Heparin': {
    doses: [
      { dose: '5000u', population: 'adult' },
      { dose: 'Other', population: 'both' }
    ]
  },
  'Ketamine push': { 
    doses: [
      { dose: '0.5mg/kg', population: 'both', indication: 'CPR induced consciousness' },
      { dose: '1mg/kg', population: 'adult', indication: 'Intubation induction with Suxamethonium' },
      { dose: '2mg/kg', population: 'adult', indication: 'Intubation when suxamethonium is contraindicated' },
      { dose: '1mg/kg', population: 'both', indication: 'Post intubation analgosedation' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Ketamine infusion': {
    doses: [
      { dose: 'mg/h', population: 'both' }
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
      { dose: '0.05mg/kg', population: 'both', indication: 'Post intubation sedation with ketamine - push dose' },
      { dose: 'mg/h', population: 'adult', indication: 'Post intubation sedation morph/midaz infusion' },
      { dose: 'mg', population: 'adult', indication: 'Post intubation sedation with morphine - push dose' }
    ] 
  },
  'Morphine': {
    doses: [
      { dose: 'mg/h', population: 'adult', indication: 'Post intubation sedation morph/midaz infusion' },
      { dose: 'mg', population: 'adult', indication: 'Post intubation sedation with midazolam - push dose' }
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
      { dose: '1mMol/kg', population: 'both', indication: 'Cardiac arrest: Hyperkalaemia/OD', calculated: true },
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
  
  const match = doseStr.match(/([\d.]+)(mg|g|mcg|ml|mL|mMol)\/kg/i);
  if (!match) return doseStr;
  
  const [_, amount, unit] = match;
  const calculated = parseFloat(amount) * (typeof weight === 'number' ? weight : parseFloat(String(weight)));
  const rounded = Math.round(calculated * 10) / 10;
  
  return `${amount}${unit}/kg (${rounded}${unit})`;
};

const cleanDoseForLog = (doseStr: string): string => {
  // Extract calculated dose from parentheses if present: "0.01mg/kg (0.3mg)" -> "0.3mg"
  const match = doseStr.match(/\(([\d.]+(?:mg|g|mcg|ml|mL|mls|mMol))\)/i);
  if (match) {
    return match[1];
  }
  return doseStr;
};

const formatGlucose10Dose = (doseStr: string): string => {
  // For Glucose 10%, format as (xxxml/xxg) - 0.1g per mL
  // Extract mL amount from various formats: "200mls", "200mL", "200ml", "2.5mL/kg (200mL)"
  console.log('formatGlucose10Dose input:', doseStr);
  const mlMatch = doseStr.match(/([\d.]+)\s*(?:ml|mls|mL|mLs)/i);
  console.log('formatGlucose10Dose match:', mlMatch);
  if (mlMatch) {
    const mls = parseFloat(mlMatch[1]);
    const grams = Math.round(mls * 0.1 * 10) / 10; // 0.1g per mL, rounded to 1 decimal
    const result = `(${mls}ml/${grams}g)`;
    console.log('formatGlucose10Dose output:', result);
    return result;
  }
  console.log('formatGlucose10Dose no match, returning:', doseStr);
  return doseStr;
};

const formatSodiumBicarbonateDose = (doseStr: string): string => {
  // For Sodium Bicarbonate 8.4%, format as (xxxmMol/xxxml) - 1mMol/mL concentration
  // Extract mMol amount from various formats: "80mMol", "1mMol/kg (80mMol)"
  console.log('formatSodiumBicarbonateDose input:', doseStr);
  const mmolMatch = doseStr.match(/([\d.]+)\s*(?:mmol|mMol|MMOL)/i);
  console.log('formatSodiumBicarbonateDose match:', mmolMatch);
  if (mmolMatch) {
    const mmol = parseFloat(mmolMatch[1]);
    const mls = Math.round(mmol * 10) / 10; // 1mMol = 1mL, rounded to 1 decimal
    const result = `(${mmol}mMol/${mls}ml)`;
    console.log('formatSodiumBicarbonateDose output:', result);
    return result;
  }
  console.log('formatSodiumBicarbonateDose no match, returning:', doseStr);
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
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [elapsedTimestamp, setElapsedTimestamp] = useState<number | null>(null);
  const [cprTimestamp, setCprTimestamp] = useState<number | null>(null);
  const [isCaseClosed, setIsCaseClosed] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [disregardAdrenaline, setDisregardAdrenaline] = useState<'pending' | 'confirmed' | null>(null);
  const [disregardAmiodarone, setDisregardAmiodarone] = useState<'pending' | 'confirmed' | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showTimerAdjust, setShowTimerAdjust] = useState(false);
  const [timerAdjustValue, setTimerAdjustValue] = useState({ mins: 2, secs: 0 });
  const [roscButtonFlashing, setRoscButtonFlashing] = useState(false);
  const [showLoggedNotification, setShowLoggedNotification] = useState(false);
  const loggedTreatmentRef = useRef<string>('');
  const [isShockForced, setIsShockForced] = useState(false);
  const [rearrested, setRearrested] = useState(false);
  const [hasShownForcedShock, setHasShownForcedShock] = useState(false);
  const lastBeepSecond = useRef<number | null>(null);
  const hasAutoClosedAt10 = useRef<boolean>(false);
  const previousCountdown = useRef<number | null>(null);
  
  // Tutorial mode state
  const [tutorialMode, setTutorialMode] = useState(false);
  const [tutorialScreen, setTutorialScreen] = useState({ index: -1, complete: false, nodeIndex: 0 });
  const [tutorialNodeIndex, setTutorialNodeIndex] = useState(0);

  // Add CSS classes to body for tutorial button flashing
  useEffect(() => {
    console.log('Tutorial screen tracking:', tutorialScreen);
    console.log('Current overlay:', state.currentOverlay);
    console.log('Treatments length:', state.treatments.length);
    
    // Node 7 (addTxBtn) complete - flash Add Tx button (index 8 = waiting for treatment screen)
    if (tutorialMode && tutorialScreen.index === 8 && state.currentOverlay === null) {
      document.body.classList.add('tutorial-flash-add-tx');
    } else {
      document.body.classList.remove('tutorial-flash-add-tx');
    }

    // Node 8 (addTxSubmenu) complete - flash Adrenaline and dose buttons (index 9)
    if (tutorialMode && tutorialScreen.index === 9) {
      document.body.classList.add('tutorial-flash-adrenaline');
      document.body.classList.add('tutorial-flash-dose');
    } else {
      document.body.classList.remove('tutorial-flash-adrenaline');
      document.body.classList.remove('tutorial-flash-dose');
    }

    // Node 10 (summaryBtn) complete - flash Summary button (index 11 = waiting for summary overlay)
    if (tutorialMode && tutorialScreen.index === 11 && state.currentOverlay === null) {
      document.body.classList.add('tutorial-flash-summary');
    } else {
      document.body.classList.remove('tutorial-flash-summary');
    }

    // Node 13 (closeOverlay) complete - flash summary close button (index 13 = waiting on summary)
    if (tutorialMode && tutorialScreen.index === 13 && state.currentOverlay === 'summary') {
      document.body.classList.add('tutorial-flash-summary-close');
    } else {
      document.body.classList.remove('tutorial-flash-summary-close');
    }

    // Node 13 (closeCase) complete - flash Close Case button (index 14 = waiting on home)
    if (tutorialMode && tutorialScreen.index === 14 && state.currentOverlay === null) {
      document.body.classList.add('tutorial-flash-close');
    } else {
      document.body.classList.remove('tutorial-flash-close');
    }

    // Tutorial done - flash Delete Case button
    if (tutorialMode && tutorialScreen.complete) {
      document.body.classList.add('tutorial-flash-delete');
    } else {
      document.body.classList.remove('tutorial-flash-delete');
    }
    
    return () => {
      document.body.classList.remove('tutorial-flash-add-tx');
      document.body.classList.remove('tutorial-flash-adrenaline');
      document.body.classList.remove('tutorial-flash-dose');
      document.body.classList.remove('tutorial-flash-summary');
      document.body.classList.remove('tutorial-flash-summary-close');
      document.body.classList.remove('tutorial-flash-close');
      document.body.classList.remove('tutorial-flash-delete');
    };
  }, [tutorialMode, tutorialScreen, state.treatments.length, state.currentOverlay]);

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

  // Force scroll reset and layout recalculation on mount
  useEffect(() => {
    // Aggressive scroll reset for mobile browsers
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Force mobile browser to recalculate viewport - multiple passes
    const setVh = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    };
    
    // Set immediately
    setVh();
    
    // Set after layout stabilizes
    requestAnimationFrame(() => {
      setVh();
      requestAnimationFrame(() => {
        setVh();
        // Final set after 100ms to catch any late layout changes
        setTimeout(setVh, 100);
      });
    });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVh);
      return () => window.visualViewport.removeEventListener('resize', setVh);
    }
  }, []);

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
          let nextOvertime = prev.rhythmCheckOvertime;
          let nextPaused = prev.rhythmCheckPaused;
          
          // Only update rhythm check if not paused
          if (!prev.rhythmCheckPaused) {
            const countdown = prev.rhythmCheckTarget - newElapsed;

            // Auto-close overlay ONCE at 10s
            if (countdown === 10 && !hasAutoClosedAt10.current) {
              nextOverlay = null;
              hasAutoClosedAt10.current = true;
            }

            // Beep logic only between 10 and 5 seconds
            if (countdown <= 10 && countdown > 5 && lastBeepSecond.current !== newElapsed) {
              playBeep();
              lastBeepSecond.current = newElapsed;
            }

            // Handle rhythm check reaching 0:00 and overtime
            if (countdown <= 0) {
              // Calculate overtime (how many seconds past the target)
              nextOvertime = newElapsed - prev.rhythmCheckTarget;
              
              // When overtime reaches 6 seconds, force shock entry and reset immediately
              if (nextOvertime >= 6) {
                // Force shock overlay (don't wait for user to complete it)
                if (!showCatchup) {
                  nextOverlay = 'treatment';
                  setIsShockForced(true);
                }
                
                // Reset immediately regardless of shock entry
                nextTarget = newElapsed + 120;
                nextRound += 1;
                nextOvertime = 0;
                hasAutoClosedAt10.current = false;
                setHasShownForcedShock(false); // Reset for next cycle
              }
            } else {
              nextOvertime = 0; // Reset overtime when not past target
            }
            
            // Update previous countdown for next iteration
            previousCountdown.current = countdown;
          }
          
          return {
            ...prev,
            elapsedSeconds: newElapsed,
            rhythmCheckTarget: nextTarget,
            rhythmCheckOvertime: nextOvertime,
            rhythmCheckPaused: nextPaused,
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
      // Toggle rhythm check pause, but keep elapsed timer running
      if (!prev.rhythmCheckPaused) {
        // Pausing rhythm check - freeze the countdown by capturing current value
        const currentCountdown = Math.max(0, prev.rhythmCheckTarget - prev.elapsedSeconds);
        setShowPauseWarning(false);
        return {
          ...prev,
          rhythmCheckPaused: true,
          frozenCountdown: currentCountdown  // Store the frozen countdown value
        };
      } else {
        // Unpausing rhythm check - adjust target to maintain the frozen countdown
        const newTarget = prev.elapsedSeconds + (prev.frozenCountdown || 0);
        return {
          ...prev,
          rhythmCheckPaused: false,
          rhythmCheckTarget: newTarget,
          frozenCountdown: undefined  // Clear frozen value
        };
      }
    });
  };

  const confirmPause = () => {
    // Simply toggle the pause state without resetting the timer
    togglePause();
  };

  const resetTimer = () => {
    setState(prev => ({
      ...prev,
      rhythmCheckTarget: prev.elapsedSeconds + 120,
      rhythmCheckOvertime: 0
    }));
    setShowResetWarning(false);
  };

  const applyTimerAdjustment = () => {
    const totalSeconds = timerAdjustValue.mins * 60 + timerAdjustValue.secs;
    
    if (totalSeconds > 0) {
      setState(prev => ({
        ...prev,
        rhythmCheckTarget: prev.elapsedSeconds + totalSeconds,
        rhythmCheckOvertime: 0
      }));
    }
    
    setShowTimerAdjust(false);
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

    setState(prev => {
      const isShockOrDisarm = name.includes('Shock') || name.includes('Disarm');
      const isROSC = name === 'Disarm - ROSC';
      const wasRhythmCheckPaused = prev.rhythmCheckPaused;
      
      // Auto-add OPA before BVM
      const newTreatments = [...prev.treatments];
      if (name === 'BVM') {
        const opaTreatment: Treatment = {
          name: 'OPA',
          elapsed: state.elapsedSeconds,
          round: state.cprRound,
          clock: getLocalTime(now),
          clockSeconds: getLocalTimeWithSeconds(now)
        };
        newTreatments.push(opaTreatment);
      }
      newTreatments.push(treatment);
      
      return {
        ...prev,
        treatments: newTreatments,
        shocks: (name.includes('Shock') && !name.includes('Disarm')) ? prev.shocks + 1 : prev.shocks,
        currentOverlay: null,
        // Reset rhythm check to 2:00 for ROSC or when unpausing via other shock/disarm
        rhythmCheckTarget: (isROSC || (isShockOrDisarm && wasRhythmCheckPaused)) 
          ? prev.elapsedSeconds + 120 
          : prev.rhythmCheckTarget,
        rhythmCheckOvertime: (isROSC || (isShockOrDisarm && wasRhythmCheckPaused)) ? 0 : prev.rhythmCheckOvertime,
        // Pause for ROSC, unpause for other shock/disarm
        rhythmCheckPaused: isShockOrDisarm ? isROSC : prev.rhythmCheckPaused,
        // For ROSC, freeze the countdown at 2:00
        frozenCountdown: isROSC ? 120 : prev.frozenCountdown,
        // Enter ROSC mode when ROSC logged, exit when any shock/disarm logged
        isROSCMode: isROSC ? true : isShockOrDisarm ? false : prev.isROSCMode,
        // Clear ROSC checklist when ROSC is logged again (new ROSC event)
        roscChecked: isROSC ? [] : prev.roscChecked
      };
    });
    
    // Make ROSC button flash when ROSC is selected
    if (name === 'Disarm - ROSC') {
      setRoscButtonFlashing(true);
    }
    
    setIsShockForced(false);

    // If this treatment was logged from a rearrest, show timer adjustment popup
    if (rearrested && (name.includes('Shock') || name.includes('Disarm'))) {
      setRearrested(false);
      setShowTimerAdjust(true);
    }
    
    // Show notification with treatment name
    if (name !== 'Disarm - ROSC') {
      loggedTreatmentRef.current = name;
      setShowLoggedNotification(true);
      setTimeout(() => setShowLoggedNotification(false), 2000);
    }
    
    // Reset the forced shock flag when Shock/Disarm is applied (rhythm check resets to 2:00)
    if (name.includes('Shock') || name.includes('Disarm')) {
      setHasShownForcedShock(false);
      previousCountdown.current = null; // Reset countdown tracking
    }
    
    // Reset disregard states when new doses given
    if (name.includes('Adrenaline')) {
      setDisregardAdrenaline(null);
    }
    if (name.includes('Amiodarone')) {
      setDisregardAmiodarone(null);
    }
  };

  const toggleChecklistItem = (checklist: 'reversibles' | 'rosc' | 'phea', label: string) => {
    setState(prev => {
      const key = `${checklist}Checked` as 'reversiblesChecked' | 'roscChecked' | 'pheaChecked';
      const current = prev[key];
      const updated = current.includes(label)
        ? current.filter(item => item !== label)
        : [...current, label];
      return { ...prev, [key]: updated };
    });
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
      return { text: "Next adrenaline: THIS ROUND", show: true, isDue: true };
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
      // Show negative countdown when overdue
      const overdueTime = Math.abs(timeUntilNext);
      const mins = Math.floor(overdueTime / 60);
      const secs = overdueTime % 60;
      const timeStr = `-${mins}:${secs.toString().padStart(2, '0')}`;
      return { text: `Next amiodarone: ${timeStr}`, show: true, isDue: true, countdown: timeUntilNext, flashRed: true };
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
      // Special handling for morph/midaz infusion
      if (tx.name.startsWith('Morph/midaz infusion')) {
        const medName = 'Morph/midaz infusion';
        if (!summary[medName]) {
          summary[medName] = { totalDose: 0, unit: '', count: 0, display: '' };
        }
        
        const doseStr = tx.name.substring(medName.length).trim();
        if (doseStr) {
          const directMatch = doseStr.match(/([\d.]+)(mg\/h|mg|mL|mMol|mcg|g|u|%)/i);
          if (directMatch) {
            const [_, amount, unit] = directMatch;
            if (!summary[medName].unit) summary[medName].unit = unit;
            if (summary[medName].unit === unit) {
              summary[medName].totalDose += parseFloat(amount);
            }
          }
        }
        summary[medName].count++;
        return; // Skip regular medication processing for this treatment
      }
      
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
  const handleCatchupStart = (overrideWeight?: string) => {
    console.log('handleCatchupStart called', { overrideWeight, weightInput });
    
    // Clear localStorage for a completely fresh start
    localStorage.clear();
    sessionStorage.clear();
    
    let adjustedElapsed = catchupElapsed.mins * 60 + catchupElapsed.secs;
    let adjustedRhythm = catchupRhythm.mins * 60 + catchupRhythm.secs;
    
    // If rhythm check is too short (<= 6 seconds), start with full 2:00 instead
    if (adjustedRhythm <= 6) {
      adjustedRhythm = 120;
    }
    
    // Use override weight if provided, otherwise use weightInput state
    const finalWeight = overrideWeight || weightInput;
    
    // Parse weight, checking for valid number or ">100" special case
    let parsedWeight: any = null;
    if (finalWeight) {
      const weightStr = String(finalWeight).trim();
      if (weightStr) {
        const parsed = parseFloat(weightStr);
        if (!isNaN(parsed) && parsed > 0) {
          parsedWeight = parsed;
        }
      }
    }
    
    console.log('Parsed weight:', parsedWeight);
    
    // Adjust times based on elapsed time since they were entered
    if (elapsedTimestamp) {
      const timeSinceElapsed = Math.floor((Date.now() - elapsedTimestamp) / 1000);
      adjustedElapsed += timeSinceElapsed;
    }
    
    if (cprTimestamp) {
      const timeSinceCpr = Math.floor((Date.now() - cprTimestamp) / 1000);
      adjustedRhythm = Math.max(0, adjustedRhythm - timeSinceCpr);
    }
    
    const now = Date.now();
    const startClockTime = now - (adjustedElapsed * 1000);

    const initialTxs: Treatment[] = [];
    const baseClock = new Date(startClockTime);
    
    priorTxs.forEach(name => {
      // Auto-add OPA before BVM
      if (name === 'BVM') {
        initialTxs.push({
          name: 'OPA',
          elapsed: 0,
          round: 0,
          clock: getLocalTime(baseClock),
          clockSeconds: getLocalTimeWithSeconds(baseClock),
          prior: true
        });
      }
      
      initialTxs.push({
        name,
        elapsed: 0,
        round: 0,
        clock: getLocalTime(baseClock),
        clockSeconds: getLocalTimeWithSeconds(baseClock),
        prior: true
      });
    });

    // Auto-add "Pads on" before shocks/disarms in catchup
    if (priorCounts.shock > 0 || priorCounts.disarm > 0) {
      initialTxs.push({ 
        name: 'Pads on', 
        elapsed: 0, 
        round: 0, 
        clock: getLocalTime(baseClock), 
        clockSeconds: getLocalTimeWithSeconds(baseClock), 
        prior: true 
      });
    }

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
      pausedTime: adjustedElapsed * 1000,
      elapsedSeconds: adjustedElapsed,
      rhythmCheckTarget: adjustedElapsed + adjustedRhythm, // Target time = current elapsed + countdown
      cprRound: Math.max(1, priorCounts.shock + priorCounts.disarm), // Round = total shocks + disarms (min 1)
      shocks: priorCounts.shock,
      treatments: initialTxs,
      catchupElapsed: adjustedElapsed,
      startClockTime: startClockTime,
      patientWeight: parsedWeight,
      patientType: weightType
    });
    console.log('State set with weight:', parsedWeight, 'and type:', weightType);
    
    // Reset all UI states for clean new case
    setShowCatchup(false);
    setDisregardAdrenaline(null);
    setDisregardAmiodarone(null);
    setShowLoggedNotification(false);
    setIsShockForced(false);
    setHasShownForcedShock(false);
    setCatchupStep(1);
    setWeightType(null);
    setPaedWeightMethod(null);
    setWeightInput('');
    setPriorCounts({ shock: 0, disarm: 0, adrenaline: 0 });
    setPriorTxs([]);
    // setPhotoTimestamp(null); // Removed - not defined
    setElapsedTimestamp(null);
    setCprTimestamp(null);
    previousCountdown.current = adjustedRhythm; // Initialize countdown to prevent immediate trigger
  };

  const deleteCase = () => {
    localStorage.clear();
    sessionStorage.clear();
    
    // Unregister service worker and force true hard reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Force hard reload with cache bypass
    window.location.href = window.location.pathname + '?nocache=' + Date.now();
    setTimeout(() => {
      window.location.reload(true);
    }, 100);
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
            data-button="delete-case"
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

        {/* Tutorial Overlay - also show on case summary */}
        {tutorialMode && (
          <TutorialOverlay
            appState={state}
            isShockForced={isShockForced}
            isCaseClosed={isCaseClosed}
            globalNodeIndex={tutorialNodeIndex}
            onNodeChange={(nodeIndex, done) => {
              setTutorialNodeIndex(nodeIndex);
              setTutorialScreen({ index: nodeIndex, complete: done, nodeIndex });
            }}
            onExit={() => {
              setTutorialMode(false);
              setTutorialNodeIndex(0);
              setState(INITIAL_STATE);
              setShowCatchup(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div data-main-container style={{ height: 'calc(var(--vh, 1vh) * 100)' }} className="bg-neutral-100 flex flex-col p-4 max-w-2xl mx-auto overflow-hidden relative">
      {/* Top Controls */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button onClick={confirmPause} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
          {(state.running && !state.rhythmCheckPaused) ? <Pause size={14} className="sm:w-4 sm:h-4" /> : <Play size={14} className="sm:w-4 sm:h-4" />} 
          {(state.running && !state.rhythmCheckPaused) ? 'Pause' : 'Play'}
        </button>
        <button 
          onClick={() => {
            const currentCountdown = Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds);
            const mins = Math.floor(currentCountdown / 60);
            const secs = currentCountdown % 60;
            setTimerAdjustValue({ mins, secs });
            setShowTimerAdjust(true);
          }} 
          className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base"
        >
          <RefreshCw size={14} className="sm:w-4 sm:h-4" /> Recalibrate
        </button>
        <button onClick={() => setShowCloseWarning(true)} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base" data-button="close-case">
          <XCircle size={14} className="sm:w-4 sm:h-4" /> Close Case
        </button>
      </div>

      {/* Top Quick Tools */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'reversibles' ? null : 'reversibles' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors text-center ${state.currentOverlay === 'reversibles' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-700'} ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {state.currentOverlay === 'reversibles' ? 'Close' : '4H 4T'}
        </button>
        <button 
          onClick={() => {
            if (isShockForced) return;
            setRoscButtonFlashing(false);
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'rosc' ? null : 'rosc' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors ${
            state.currentOverlay === 'rosc' ? 'bg-red-100 text-red-800' : 
            roscButtonFlashing ? 'bg-red-600 text-white animate-pulse' :
            'bg-orange-100 text-orange-700'
          } ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
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
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'vitals' ? null : 'vitals' }))
          }}
          disabled={isShockForced}
          className={`p-4 sm:p-6 rounded-xl text-sm sm:text-xl font-bold btn-base transition-colors text-center ${state.currentOverlay === 'vitals' ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-700'} ${isShockForced ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {state.currentOverlay === 'vitals' ? 'Close' : 'VSS'}
        </button>
      </div>

      {/* Main Center Display */}
      <div data-green-box className={`flex-1 bg-white border-4 rounded-3xl relative overflow-hidden transition-colors duration-300 min-h-0 ${
        state.currentOverlay === 'reversibles' ? 'border-blue-400' :
        state.currentOverlay === 'rosc' ? 'border-orange-400' :
        state.currentOverlay === 'phea' ? 'border-purple-400' :
        state.currentOverlay === 'vitals' ? 'border-sky-400' : 'border-emerald-500'
      }`}>
        <div className="h-full flex flex-col items-center px-2 sm:px-3 pt-4 pb-2 sm:pb-3 relative">
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
          <div className="flex-1 flex flex-col items-center justify-center w-full pt-14 sm:pt-16">
            <div className="relative flex items-center justify-center w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]">

              {/* ROSC Mode - full circle is tap target */}
              {state.isROSCMode ? (
                <button
                  onClick={() => {
                    setState(prev => ({
                      ...prev,
                      isROSCMode: false,
                      rhythmCheckPaused: false,
                      frozenCountdown: undefined,
                      rhythmCheckTarget: prev.elapsedSeconds + 120,
                      rhythmCheckOvertime: 0,
                      currentOverlay: 'treatment'
                    }));
                    setRearrested(true);
                    setIsShockForced(true);
                  }}
                  className="absolute inset-0 w-full h-full rounded-full btn-base flex flex-col items-center justify-center"
                >
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeWidth="6" className="text-neutral-50" />
                    <motion.circle
                      cx="150" cy="150" r="140"
                      fill="none" stroke="currentColor" strokeWidth="6"
                      strokeLinecap="round" pathLength="1"
                      className="text-emerald-500"
                      animate={{ strokeDashoffset: 0 }}
                      style={{ strokeDasharray: 1 }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                  </svg>
                  <span className="z-10 text-[36px] sm:text-[60px] font-bold tracking-tighter leading-none text-emerald-600 text-center">PRESS IF REARREST</span>
                  <span className="z-10 absolute bottom-[35px] sm:bottom-[51px] text-[13px] sm:text-[16px] font-bold tracking-widest uppercase text-neutral-400">ROSC</span>
                </button>
              ) : (
                <>
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
                  className={
                    state.rhythmCheckPaused ? 'text-emerald-500' :
                    state.rhythmCheckOvertime > 0 ? 'text-red-500' :
                    (state.rhythmCheckTarget - state.elapsedSeconds) <= 10 && 
                    (state.rhythmCheckTarget - state.elapsedSeconds) > 5 ? 'text-red-500' : 'text-emerald-500'
                  }
                  animate={{ 
                    strokeDashoffset: state.rhythmCheckPaused
                      ? 1 - Math.max(0, (state.frozenCountdown || 0) / 120) // Show frozen progress
                      : state.rhythmCheckOvertime > 0 
                        ? 1 - (state.rhythmCheckOvertime / 6) // Count down from 6 to 0
                        : 1 - Math.max(0, (state.rhythmCheckTarget - state.elapsedSeconds) / 120)
                  }}
                  style={{ strokeDasharray: 1 }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              
              <div className="flex flex-col items-center z-10 translate-y-3 sm:translate-y-4">
                <div 
                  className={`text-7xl sm:text-[120px] font-bold tabular-nums tracking-tighter leading-none ${
                    state.rhythmCheckPaused ? 'text-neutral-900' :
                    state.rhythmCheckOvertime > 0 ? 'text-red-600' :
                    (state.rhythmCheckTarget - state.elapsedSeconds) <= 10 && 
                    (state.rhythmCheckTarget - state.elapsedSeconds) > 5 ? 'text-red-600' : 'text-neutral-900'
                  }`}
                >
                  {state.rhythmCheckPaused 
                    ? formatTime(state.frozenCountdown || 0)
                    : state.rhythmCheckOvertime > 0 
                      ? formatTime(6 - state.rhythmCheckOvertime)
                      : formatTime(Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds))
                  }
                </div>
                <div className={`text-[14px] sm:text-[18px] uppercase tracking-widest font-bold mt-4 sm:mt-8 ${
                  state.rhythmCheckOvertime > 0 ? 'text-red-600 animate-pulse' : 'text-neutral-400'
                }`}>
                  Rhythm Check
                </div>
              </div>
              </>
              )}
            </div>
          </div>

          <AnimatePresence>
            {state.currentOverlay && state.currentOverlay !== 'tutorial' && (
              <Overlay 
                key={state.currentOverlay}
                type={state.currentOverlay as OverlayType} 
                onClose={() => setState(p => ({ ...p, currentOverlay: null }))}
                addTreatment={addTreatment}
                state={state}
                pharmaSummary={pharmaSummary}
                isShockForced={isShockForced}
                toggleChecklistItem={toggleChecklistItem}
                onVitalsChange={(v) => setState(p => ({ ...p, vitals: v }))}
              />
            )}
          </AnimatePresence>

          {/* Tutorial Overlay - renders on top of real app */}
          {tutorialMode && (
            <TutorialOverlay
              appState={state}
              isShockForced={isShockForced}
              isCaseClosed={isCaseClosed}
              globalNodeIndex={tutorialNodeIndex}
              onNodeChange={(nodeIndex, done) => {
                setTutorialNodeIndex(nodeIndex);
                setTutorialScreen({ index: nodeIndex, complete: done, nodeIndex });
              }}
              onExit={() => {
                setTutorialMode(false);
                setTutorialNodeIndex(0);
                setState(INITIAL_STATE);
                setShowCatchup(true);
              }}
            />
          )}

          {/* Adrenaline & Amiodarone Status - Always rendered, visibility controlled */}
          <div className="flex gap-2 sm:gap-3 w-full max-w-[560px] justify-between mb-0">
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
              className={`flex-1 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 min-h-[90px] sm:min-h-[120px] ${
                !adrenalineRoundStatus.show || disregardAdrenaline === 'confirmed' 
                  ? 'opacity-0 pointer-events-none' 
                  : 'opacity-100 cursor-pointer'
              } ${
                disregardAdrenaline === 'pending'
                  ? 'bg-red-200 text-red-900 border-neutral-100'
                  : adrenalineRoundStatus.isDue 
                  ? 'bg-red-200 text-red-900 border-neutral-100 animate-pulse' 
                  : 'bg-neutral-100 text-neutral-900 border-neutral-100'
              }`}
            >
              {disregardAdrenaline === 'pending' ? (
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-center">Disregard?</span>
              ) : (
                <>
                  <span className={`font-bold tracking-widest text-center mb-1.5 sm:mb-3 ${
                    adrenalineRoundStatus.isDue 
                      ? 'text-[10px] sm:text-[12px] text-red-900'
                      : 'text-[10px] sm:text-[12px] text-neutral-900'
                  }`}>
                    {adrenalineRoundStatus.text.split(':')[0] + ':'}
                  </span>
                  <span className={`font-bold text-center leading-none tabular-nums ${
                    adrenalineRoundStatus.isDue
                      ? 'text-[22px] sm:text-[43px] text-red-900'
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
                className={`flex-1 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 min-h-[90px] sm:min-h-[120px] ${
                  !amiodaroneStatus.show || disregardAmiodarone === 'confirmed'
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100 cursor-pointer'
                } ${
                  disregardAmiodarone === 'pending'
                    ? 'bg-red-200 text-red-900 border-neutral-100'
                    : amiodaroneStatus.flashRed
                    ? 'bg-red-200 text-red-900 border-neutral-100 animate-pulse' 
                    : 'bg-neutral-100 text-neutral-900 border-neutral-100'
                }`}
              >
                {disregardAmiodarone === 'pending' ? (
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-center">Disregard?</span>
                ) : (
                  <>
                    <span className={`font-bold tracking-widest text-center mb-1.5 sm:mb-3 ${
                      amiodaroneStatus.flashRed
                        ? 'text-[10px] sm:text-[12px] text-red-900'
                        : 'text-[10px] sm:text-[12px] text-neutral-900'
                    }`}>
                      {amiodaroneStatus.text.includes(':') ? amiodaroneStatus.text.split(':')[0] + ':' : amiodaroneStatus.text}
                    </span>
                    {amiodaroneStatus.text.includes(':') && (
                      <span className={`font-bold text-center leading-none tabular-nums ${
                        amiodaroneStatus.flashRed
                          ? 'text-[22px] sm:text-[43px] text-red-900'
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4 flex-shrink-0">
        <button 
          onClick={() => {
            if (isShockForced) return;
            setState(p => ({ ...p, currentOverlay: p.currentOverlay === 'summary' ? null : 'summary' }))
          }}
          disabled={isShockForced}
          className={`p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors ${state.currentOverlay === 'summary' ? 'bg-red-100 text-red-800' : 'bg-emerald-600 text-white'}`}
          data-button="summary"
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
          data-button="add-tx"
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
              key={catchupStep}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="bg-white rounded-[28px] p-6 max-w-md w-[90%] shadow-2xl overflow-hidden absolute"
            >
              {catchupStep === 1 && (
                <div className="text-center space-y-6">
                  {/* Header with gradient accent */}
                  <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      It's The Big One!
                    </h1>
                    <p className="text-lg font-medium text-neutral-600">
                      Your cardiac arrest management tool
                    </p>
                  </div>
                  
                  {/* Description with subtle background */}
                  <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                    <p className="text-neutral-600 text-sm leading-relaxed">
                      Before we start, the app needs to be calibrated to the current case
                    </p>
                  </div>
                  
                  {/* Buttons with improved styling */}
                  <div className="space-y-3 pt-2">
                    <button 
                      onClick={() => {
                        setCatchupStep(2);
                        setUseManualEntry(true);
                        setCatchupRhythm({ mins: 0, secs: 0 });
                      }} 
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white p-5 rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                    >
                      Calibrate
                    </button>
                    <button 
                      onClick={() => {
                        // Enter tutorial mode - start app with preset values
                        const now = Date.now();
                        setState({
                          ...INITIAL_STATE,
                          running: true,
                          startTime: now,
                          pausedTime: 0,
                          elapsedSeconds: 0,
                          rhythmCheckTarget: 120,
                          cprRound: 1,
                          shocks: 0,
                          treatments: [],
                          catchupElapsed: 0,
                          startClockTime: now,
                          patientWeight: 100,
                          patientType: 'adult'
                        });
                        setShowCatchup(false);
                        setTutorialMode(true);
                      }} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl text-base font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                    >
                      Tutorial
                    </button>
                  </div>
                </div>
              )}

              {catchupStep === 2 && (
                <div className="space-y-6 px-4 max-w-md mx-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-neutral-900">Patient Details</h2>
                    <p className="text-neutral-500 text-sm">Select patient type for dosage calculations</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Adult Card */}
                    <button 
                      onClick={() => {
                        setWeightType('adult');
                        setPaedWeightMethod(null);
                        setWeightInput('');
                      }}
                      className={`relative p-6 rounded-2xl transition-all duration-200 ${
                        weightType === 'adult' 
                          ? 'bg-emerald-500 text-white shadow-lg scale-105' 
                          : 'bg-white text-neutral-700 border-2 border-neutral-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`text-5xl ${weightType === 'adult' ? 'opacity-100' : 'opacity-60'}`}>
                          👤
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">Adult</div>
                          <div className={`text-xs mt-1 ${weightType === 'adult' ? 'text-emerald-100' : 'text-neutral-400'}`}>
                            40-200 kg
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Paediatric Card */}
                    <button 
                      onClick={() => {
                        setWeightType('paed');
                        if (!paedWeightMethod) setPaedWeightMethod('age');
                        setWeightInput('');
                      }}
                      className={`relative p-6 rounded-2xl transition-all duration-200 ${
                        weightType === 'paed' 
                          ? 'bg-pink-400 text-white shadow-lg scale-105' 
                          : 'bg-white text-neutral-700 border-2 border-neutral-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`text-5xl ${weightType === 'paed' ? 'opacity-100' : 'opacity-60'}`}>
                          👶
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">Paediatric</div>
                          <div className={`text-xs mt-1 ${weightType === 'paed' ? 'text-pink-100' : 'text-neutral-400'}`}>
                            Newborn-12 yrs
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {/* Weight Selection - Adult */}
                  {weightType === 'adult' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200"
                    >
                      <label className="block text-sm font-bold text-emerald-900 mb-3">Patient Weight</label>
                      <select
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="w-full bg-white border-2 border-emerald-300 rounded-xl px-4 py-4 text-base font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value="">Select weight</option>
                        <option value="40">40 kg</option>
                        <option value="50">50 kg</option>
                        <option value="60">60 kg</option>
                        <option value="70">70 kg</option>
                        <option value="80">80 kg</option>
                        <option value="90">90 kg</option>
                        <option value="100">100 kg</option>
                        <option value="110">110 kg</option>
                        <option value="120">120 kg</option>
                        <option value="130">130 kg</option>
                        <option value="140">140 kg</option>
                        <option value="150">150 kg</option>
                        <option value="160">160 kg</option>
                        <option value="170">170 kg</option>
                        <option value="180">180 kg</option>
                        <option value="190">190 kg</option>
                        <option value="200">200 kg</option>
                      </select>
                    </motion.div>
                  )}
                  
                  {/* Weight Selection - Paediatric */}
                  {weightType === 'paed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-pink-50 rounded-2xl p-6 border-2 border-pink-200 space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-bold text-pink-900 mb-3">Select weight by age</label>
                        <select
                          value={paedWeightMethod === 'age' ? weightInput : ''}
                          onChange={(e) => {
                            setPaedWeightMethod('age');
                            setWeightInput(e.target.value);
                          }}
                          className="w-full bg-white border-2 border-pink-300 rounded-xl px-4 py-4 text-base font-semibold focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all"
                        >
                          <option value="">Choose age</option>
                          {[
                            ['Newborn', 3], ['1 month', 4], ['3 months', 6], ['6 months', 8],
                            ['9 months', 9], ['1 year', 10], ['18 months', 11], ['2 years', 12],
                            ['3 years', 15], ['4 years', 17], ['5 years', 19], ['6 years', 21],
                            ['7 years', 23], ['8 years', 26], ['9 years', 29], ['10 years', 32],
                            ['11 years', 35], ['12 years', 38]
                          ].map(([age, weight]) => (
                            <option key={age} value={weight}>{age} ({weight} kg)</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-pink-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-pink-50 px-3 text-xs font-bold text-pink-400">OR</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-pink-900 mb-3">Custom Weight</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Enter weight"
                            value={paedWeightMethod === 'weight' ? weightInput : ''}
                            onChange={(e) => {
                              setPaedWeightMethod('weight');
                              setWeightInput(e.target.value);
                            }}
                            className="w-full bg-white border-2 border-pink-300 rounded-xl px-4 py-4 pr-12 text-base font-semibold focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold pointer-events-none">kg</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => setCatchupStep(1)} 
                      className="bg-neutral-100 text-neutral-700 py-4 rounded-xl font-bold hover:bg-neutral-200 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => weightInput && setCatchupStep(3)}
                      disabled={!weightInput}
                      className={`py-4 rounded-xl font-bold transition-all ${
                        weightInput
                          ? weightType === 'adult'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                            : 'bg-pink-400 text-white hover:bg-pink-500 shadow-md'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {catchupStep === 4 && (
                <div className="text-center space-y-6">
                  {/* Manual entry UI */}
                  <h2 className="text-xl font-bold text-neutral-900 px-4">Enter elapsed time</h2>
                  <p className="text-neutral-600 text-sm px-4">This is the time at the top right corner of the monitor</p>
                  <TimePicker value={catchupElapsed} onChange={setCatchupElapsed} />
                  
                  {/* Navigation buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setCatchupStep(3);
                        setUseManualEntry(false);
                      }} 
                      className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base"
                    >
                      Back
                    </button>
                      <button 
                        onClick={() => { 
                          // Set timestamp for elapsed time entry
                          setElapsedTimestamp(Date.now());
                          setCatchupRhythm({ mins: 0, secs: 0 }); 
                          setCatchupStep(5);
                        }} 
                        className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              {catchupStep === 5 && (
                <div className="text-center space-y-6">
                  <h2 className="text-xl font-bold text-neutral-900 px-4">Enter current CPR timer</h2>
                  <p className="text-neutral-600 text-sm px-4">This is the countdown above the diamond on the monitor</p>
                  <TimePicker 
                    value={catchupRhythm} 
                    onChange={setCatchupRhythm} 
                    maxSeconds={120}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(4)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button 
                      onClick={() => {
                        // Set timestamp for CPR timer entry
                        setCprTimestamp(Date.now());
                        handleCatchupStart();
                      }}
                      className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base"
                    >
                      Start Case
                    </button>
                  </div>
                </div>
              )}

              {catchupStep === 3 && (
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
                    <button onClick={() => setCatchupStep(2)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => setCatchupStep(4)} className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base">Next</button>
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

      {showTimerAdjust && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Adjust Rhythm Check Timer</h2>
            <p className="text-neutral-500 mb-6">Match the app's rhythm check timer to the monitor's CPR timer</p>
            
            <div className="mb-8">
              <TimePicker 
                value={timerAdjustValue}
                onChange={setTimerAdjustValue}
                maxSeconds={120}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setShowTimerAdjust(false);
                  setTimerAdjustValue({ mins: 2, secs: 0 });
                }} 
                className="bg-neutral-100 p-4 rounded-xl font-bold text-neutral-700 btn-base"
              >
                Cancel
              </button>
              <button 
                onClick={applyTimerAdjustment} 
                className="bg-emerald-600 p-4 rounded-xl font-bold text-white btn-base"
              >
                Set Timer
              </button>
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

      {/* Treatment Logged Notification Banner */}
      <AnimatePresence>
        {showLoggedNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 bg-emerald-600 text-white py-3 px-4 text-center font-bold shadow-lg z-[2000]"
          >
            ✓ {loggedTreatmentRef.current} logged
          </motion.div>
        )}
      </AnimatePresence>
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
      const totalSecs = newVal.mins * 60 + newVal.secs + delta;
      if (totalSecs < 0) return; // Don't go below 0:00
      newVal.mins = Math.floor(totalSecs / 60);
      newVal.secs = totalSecs % 60;
    }
    
    // Enforce max limit if provided
    if (maxSeconds !== undefined) {
      const totalSeconds = newVal.mins * 60 + newVal.secs;
      if (totalSeconds > maxSeconds) {
        return;
      }
    }
    
    onChange(newVal);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Minutes column */}
      <div className="flex flex-col items-center">
        <button onClick={() => adjust('mins', 1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        <div className="text-5xl font-bold text-neutral-900 tabular-nums my-2">{value.mins}</div>
        <button onClick={() => adjust('mins', -1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
        <span className="text-neutral-400 font-bold uppercase text-xs mt-2">min</span>
      </div>
      
      <div className="text-5xl font-bold text-neutral-400 mb-8">:</div>
      
      {/* Seconds column with three sets of arrows */}
      <div className="flex flex-col items-center">
        <div className="flex gap-2">
          <button onClick={() => adjust('secs', 10)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
          <button onClick={() => adjust('secs', 1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
        </div>
        
        <div className="text-5xl font-bold text-neutral-900 tabular-nums my-2">{value.secs.toString().padStart(2, '0')}</div>
        
        <div className="flex gap-2">
          <button onClick={() => adjust('secs', -10)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
          <button onClick={() => adjust('secs', -1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
        </div>
        
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

function Overlay({ type, onClose, addTreatment, state, pharmaSummary, isShockForced, toggleChecklistItem, onVitalsChange }: { 
  key?: string,
  type: OverlayType, 
  onClose: () => void, 
  addTreatment: (n: string) => void,
  state: AppState,
  pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }>,
  isShockForced: boolean,
  toggleChecklistItem: (checklist: 'reversibles' | 'rosc' | 'phea', label: string) => void,
  onVitalsChange: (v: AppState['vitals']) => void
}) {
  const isTop = ['reversibles', 'rosc', 'phea', 'vitals'].includes(type);
  
  return (
    <motion.div 
      initial={{ y: isTop ? '-100%' : '100%' }}
      animate={{ y: 0 }}
      exit={{ y: isTop ? '-100%' : '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
      className="absolute inset-0 bg-white z-50 flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {type === 'reversibles' && <ReversiblesOverlay checkedItems={state.reversiblesChecked} onToggle={(label) => toggleChecklistItem('reversibles', label)} />}
        {type === 'rosc' && <ROSCSelection checkedItems={state.roscChecked} onToggle={(label) => toggleChecklistItem('rosc', label)} />}
        {type === 'phea' && <PHEASelection checkedItems={state.pheaChecked} onToggle={(label) => toggleChecklistItem('phea', label)} />}
        {type === 'vitals' && <VitalsOverlay vitals={state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' }} onChange={onVitalsChange} />}
        {type === 'summary' && <SummaryOverlay state={state} pharmaSummary={pharmaSummary} />}
        {type === 'treatment' && <TreatmentSelection addTreatment={addTreatment} state={state} isShockForced={isShockForced} />}
      </div>
    </motion.div>
  );
}

function VitalsOverlay({ vitals, onChange }: { vitals: AppState['vitals'], onChange: (v: AppState['vitals']) => void }) {
  const update = (key: keyof AppState['vitals'], val: string) => onChange({ ...vitals, [key]: val });
  const fields: { key: keyof AppState['vitals'], label: string }[] = [
    { key: 'hr',   label: 'Heart Rate'    },
    { key: 'rr',   label: 'Resp Rate'     },
    { key: 'spo2', label: 'SpO₂'          },
    { key: 'etco2',label: 'EtCO₂'         },
    { key: 'bpSys',label: 'BP Systolic'   },
    { key: 'bpDia',label: 'BP Diastolic'  },
    { key: 'gcs',  label: 'GCS'           },
    { key: 'bgl',  label: 'BGL'           },
    { key: 'temp', label: 'Temperature'   },
  ];
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2.5 px-4 font-bold text-[16px] tracking-wide border-b uppercase sticky top-0 text-center bg-sky-50 text-sky-800 border-sky-200">Vital Signs</div>
      <div className="p-3 space-y-2">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100">
            <span className="text-[15px] font-bold text-neutral-800">{label}</span>
            <input
              type="text"
              inputMode="decimal"
              value={vitals[key]}
              onChange={e => update(key, e.target.value)}
              className="w-24 text-right text-[18px] font-bold text-sky-700 bg-transparent border-b-2 border-sky-200 focus:border-sky-500 outline-none py-1 tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReversiblesOverlay({ checkedItems, onToggle }: { checkedItems: string[], onToggle: (label: string) => void }) {
  return (
    <div className="h-full">
      <SectionGroup title="PREHOSPITAL CORRECTABLE" color="blue" items={['Hypoxia', 'Hypovolaemia', 'Hypothermia', 'Hyperkalaemia', 'Tension Pneumothorax', 'Some toxins']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="HOSPITAL ONLY CORRECTABLE" color="blue" items={['Hypokalaemia', 'Hydrogen Ion Excess', 'Thrombosis Coronary/Pulmonary', 'Tamponade']} checkedItems={checkedItems} onToggle={onToggle} />
    </div>
  );
}

function ROSCSelection({ checkedItems, onToggle }: { checkedItems: string[], onToggle: (label: string) => void }) {
  return (
    <div className="h-full">
      <SectionGroup title="TEAM LEADER" color="orange" items={['Confirm roles', 'Monitor ECG for rhythm changes', 'Review reversibles']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="AIRWAY" color="orange" items={['Response — consider sedation', 'Confirm airway secured', 'Confirm spontaneous ventilations', 'Maintain SpO2 94–98%', 'Maintain ETCO2 35–40mmHg']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="GOFER" color="orange" items={['Confirm radial pulse', 'Set BP to automatic cycling', 'Attach SpO2', '12-lead ECG', 'Temp', 'BGL', 'Prepare extrication']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="DRUGS & ACCESS" color="orange" items={['Confirm bilateral IV/IO access', 'Maintain SBP ≥100mmHg', 'Prepare sedation medications if required', 'Prepare adrenaline infusion if required']} checkedItems={checkedItems} onToggle={onToggle} />
    </div>
  );
}

function PHEASelection({ checkedItems, onToggle }: { checkedItems: string[], onToggle: (label: string) => void }) {
  return (
    <div className="h-full pb-10">
      <SectionGroup title="PREPARATION" color="purple" items={['Adequate hands and skills mix?', 'Assign roles', 'C-spine immobilisation required?', 'Optimise patient position', 'Optimise environment', 'Optimise equipment placement']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="PRE-OXYGENATION" color="purple" items={['Nasal prongs 15L/min']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="MONITORING" color="purple" items={['ECG', 'BP — cycling', 'SpO2', 'EtCO2']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="DRUGS & ACCESS EQUIPMENT" color="purple" items={['IV/IO access ×2 if possible', 'IV fluids', 'Ketamine drawn up', 'Suxamethonium drawn up', 'Post PHEA sedation medication/s drawn up']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="AIRWAY EQUIPMENT AND BRIEF" color="purple" items={['Sufficient oxygen available?', 'Suction', 'OPA/NPA', 'LMA', 'BVM', 'Airtraq', 'ETT', 'Syringe', 'Securing method', 'Laryngoscope checked', 'FONA scalpel', 'External laryngeal manipulation discussed', 'Fall back plan discussed']} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup 
        title="POST-INTUBATION" 
        color="darkPurple" 
        items={[
          { label: 'Confirm ETT placement', subItems: ['EtCO2', 'Visualise cords', 'Auscultation', 'Misting', 'Chest rise'] },
          'Colleague confirms placement',
          'Secure tube — Thomas block / tube tie',
          'Reassessment — ABCs and VSS',
          'Sedation plan discussed',
          'Deterioration plan discussed',
          'Extrication and transport plan discussed'
        ]} 
        checkedItems={checkedItems} 
        onToggle={onToggle}
      />
    </div>
  );
}

interface CheckItemProps {
  label: string;
  key?: React.Key;
  subItems?: string[];
  color?: string;
  checked: boolean;
  onToggle: (label: string) => void;
}

function CheckItem({ label, subItems, color = 'emerald', checked, onToggle }: CheckItemProps) {
  const colorMap: Record<string, { bg: string, text: string, border: string, checkBg: string }> = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-500', checkBg: 'bg-orange-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-500', checkBg: 'bg-purple-500' },
    darkPurple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-500', checkBg: 'bg-purple-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-500', checkBg: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-500', checkBg: 'bg-emerald-500' }
  };
  
  const colors = colorMap[color];
  
  return (
    <div>
      <label onClick={() => onToggle(label)} className={`flex items-start p-2 rounded-lg cursor-pointer transition-colors ${checked ? colors.bg : 'hover:bg-neutral-50'}`}>
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mr-2.5 mt-0.5 transition-colors flex-shrink-0 ${checked ? `${colors.checkBg} ${colors.border}` : 'border-neutral-300 bg-white'}`}>
          {checked && <CheckCircle2 size={12} className="text-white" />}
        </div>
        <div className="flex-1">
          <span className={`text-[17px] font-medium ${checked ? colors.text : 'text-neutral-700'}`}>{label}</span>
          {subItems && subItems.length > 0 && (
            <ul className="mt-2 ml-0 space-y-1">
              {subItems.map((item, idx) => (
                <li key={idx} className={`text-[16px] flex items-start ${checked ? colors.text : 'text-neutral-600'}`}>
                  <span className="mr-2 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>
    </div>
  );
}

function SectionGroup({ 
  title, 
  color, 
  items, 
  checkedItems, 
  onToggle 
}: { 
  title: string, 
  color: string, 
  items: (string | { label: string, subItems: string[] })[], 
  checkedItems: string[], 
  onToggle: (label: string) => void 
}) {
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
        {items.map((item, idx) => {
          if (typeof item === 'string') {
            return <CheckItem key={item} label={item} color={color} checked={checkedItems.includes(item)} onToggle={onToggle} />;
          } else {
            return <CheckItem key={idx} label={item.label} subItems={item.subItems} color={color} checked={checkedItems.includes(item.label)} onToggle={onToggle} />;
          }
        })}
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
  const v = state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' };
  const hasVitals = Object.values(v).some(val => val !== '');
  const vitalRows = [
    { label: 'Heart Rate',     value: v.hr,   unit: 'bpm'    },
    { label: 'Resp Rate',      value: v.rr,   unit: 'br/min' },
    { label: 'SpO₂',           value: v.spo2, unit: '%'      },
    { label: 'EtCO₂',          value: v.etco2,unit: 'mmHg'   },
    { label: 'Blood Pressure', value: v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : v.bpSys || v.bpDia || '', unit: 'mmHg' },
    { label: 'GCS',            value: v.gcs,  unit: '/ 15'   },
    { label: 'BGL',            value: v.bgl,  unit: 'mmol/L' },
    { label: 'Temperature',    value: v.temp, unit: '°C'     },
  ].filter(r => r.value !== '');

  return (
    <div className="space-y-6 pb-20">
      <SummaryStats state={state} pharmaSummary={pharmaSummary} />
      <div className="rounded-xl overflow-hidden border border-neutral-100">
          <div className="bg-sky-50 text-sky-800 px-4 py-3 font-bold text-sm tracking-wider">VITAL SIGNS</div>
          {vitalRows.length > 0 ? vitalRows.map(({ label, value, unit }, i) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3 ${i < vitalRows.length - 1 ? 'border-b border-neutral-100' : ''}`}>
              <span className="text-[14px] font-semibold text-neutral-500">{label}</span>
              <span className="text-[17px] font-bold text-neutral-900 tabular-nums">
                {value} <span className="text-[12px] font-medium text-neutral-400">{unit}</span>
              </span>
            </div>
          )) : (
            <div className="px-4 py-3 text-[14px] text-neutral-400 italic">No vital signs recorded yet.</div>
          )}
        </div>
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
  const [customInputValues, setCustomInputValues] = useState<Record<string, string>>({});
  
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
      console.log('handleDoseSelect - selectedMed:', selectedMed);
      console.log('handleDoseSelect - dose:', dose);
      const displayDose = calculateDose(dose, state.patientWeight);
      console.log('handleDoseSelect - displayDose:', displayDose);
      let cleanDose = cleanDoseForLog(displayDose);
      console.log('handleDoseSelect - cleanDose:', cleanDose);
      
      // For Glucose 10%, add gram calculation
      if (selectedMed === 'Glucose 10%') {
        console.log('handleDoseSelect - formatting Glucose 10%');
        cleanDose = formatGlucose10Dose(cleanDose);
      }
      
      // For Sodium Bicarbonate, add mls calculation
      if (selectedMed === 'Sodium Bicarbonate') {
        console.log('handleDoseSelect - formatting Sodium Bicarbonate');
        cleanDose = formatSodiumBicarbonateDose(cleanDose);
      }
      
      console.log('handleDoseSelect - final cleanDose:', cleanDose);
      const finalTreatment = `${selectedMed} ${cleanDose}`;
      console.log('handleDoseSelect - adding treatment:', finalTreatment);
      addTreatment(finalTreatment);
      setSelectedMed(null);
      setCustomDose('');
    }
  };
  
  const handleCustomDoseAdd = () => {
    if (selectedMed && customDose && DOSE_CONFIG[selectedMed]) {
      // Use customUnit if specified, otherwise extract unit from dose options
      const customUnit = DOSE_CONFIG[selectedMed].customUnit;
      let unit = '';
      
      if (customUnit) {
        unit = customUnit;
      } else {
        // Extract unit from dose options
        const doses = DOSE_CONFIG[selectedMed].doses.map(d => d.dose);
        const unitMatches = doses
          .filter(d => d !== 'Other')
          .map(d => {
            const match = d.match(/(mg\/kg|mMol\/kg|mL\/kg|mcg\/kg|u\/kg|mg|mL|mMol|mcg|g|u|%)$/i);
            return match ? match[1] : null;
          })
          .filter(Boolean);
        
        unit = unitMatches.length > 0 ? unitMatches[0] : '';
      }
      
      let doseWithUnit = unit ? `${customDose}${unit}` : customDose;
      
      // For Glucose 10%, add gram calculation
      if (selectedMed === 'Glucose 10%') {
        doseWithUnit = formatGlucose10Dose(doseWithUnit);
      }
      
      // For Sodium Bicarbonate, add mls calculation
      if (selectedMed === 'Sodium Bicarbonate') {
        doseWithUnit = formatSodiumBicarbonateDose(doseWithUnit);
      }
      
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
    
    // Check if a dose is a unit-only custom input (e.g., "mg/h", "mg")
    const isCustomInput = (dose: string) => {
      return dose === 'mg/h' || dose === 'mg' || dose === 'mL/h' || dose === 'mcg/h';
    };
    
    const regularDoses = filteredDoses.filter(d => d.dose !== 'Other' && !isCustomInput(d.dose));
    const customInputDoses = filteredDoses.filter(d => isCustomInput(d.dose));
    const doses = filteredDoses.map(d => d.dose);
    const showOther = doses.includes('Other');
    
    const handleCustomInputAdd = (doseOpt: DoseOption) => {
      const key = `${doseOpt.dose}-${doseOpt.indication}`;
      const value = customInputValues[key];
      if (value) {
        // Check if this is the shared morph/midaz infusion treatment
        if (doseOpt.indication === 'Post intubation sedation morph/midaz infusion') {
          addTreatment(`Morph/midaz infusion ${value}${doseOpt.dose}`);
        } else {
          handleDoseSelect(`${value}${doseOpt.dose}`);
        }
        setCustomInputValues({ ...customInputValues, [key]: '' });
      }
    };
    
    return (
      <div className="h-full overflow-y-auto pb-4">
        <div className="p-6 mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedMed}</h2>
          {state.patientWeight && (
            <p className="text-neutral-500 text-sm mb-2">
              Patient weight: {state.patientWeight === '>100' ? '>100' : state.patientWeight}kg
            </p>
          )}
          {state.patientType && (
            <p className="text-neutral-500 text-sm mb-6">Patient type: {state.patientType}</p>
          )}
          
          <div className="space-y-3">
            {regularDoses.map(doseOpt => (
              <button
                key={doseOpt.dose}
                onClick={() => handleDoseSelect(doseOpt.dose)}
                className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base flex flex-col items-start gap-1"
                data-dose={doseOpt.indication || calculateDose(doseOpt.dose, state.patientWeight)}
              >
                {doseOpt.indication && (
                  <span className="text-[10px] font-normal uppercase tracking-wide">{doseOpt.indication}</span>
                )}
                <span className="text-lg">{calculateDose(doseOpt.dose, state.patientWeight)}</span>
              </button>
            ))}
            
            {customInputDoses.map(doseOpt => {
              const key = `${doseOpt.dose}-${doseOpt.indication}`;
              return (
                <div key={key} className="w-full">
                  {doseOpt.indication && (
                    <label className="block text-xs text-neutral-600 mb-1 font-medium">
                      {doseOpt.indication}
                    </label>
                  )}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative flex items-center bg-white border-2 border-emerald-500 rounded-xl focus-within:ring-2 focus-within:ring-emerald-600 min-w-0">
                      <input
                        type="text"
                        value={customInputValues[key] || ''}
                        onChange={e => setCustomInputValues({ ...customInputValues, [key]: e.target.value })}
                        onKeyPress={e => e.key === 'Enter' && customInputValues[key] && handleCustomInputAdd(doseOpt)}
                        placeholder={`Enter dose...`}
                        className="flex-1 bg-transparent px-4 py-3 text-base outline-none min-w-0 text-right"
                      />
                      <span className="pr-4 text-neutral-400 text-sm font-medium whitespace-nowrap">{doseOpt.dose}</span>
                    </div>
                    <button
                      onClick={() => handleCustomInputAdd(doseOpt)}
                      className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold btn-base disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      disabled={!customInputValues[key]}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
            
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
              // Use customUnit if specified, otherwise extract from dose options
              const unit = DOSE_CONFIG[selectedMed].customUnit || getUnitFromDoses(doses);
              const placeholder = unit ? `Custom dose (${unit})...` : 'Custom dose...';
              
              // Calculate secondary unit for live display
              const getSecondaryUnit = () => {
                if (!customDose || isNaN(parseFloat(customDose))) return null;
                const value = parseFloat(customDose);
                
                if (selectedMed === 'Glucose 10%') {
                  const grams = Math.round(value * 0.1 * 10) / 10;
                  return `/ ${grams}g`;
                }
                
                if (selectedMed === 'Sodium Bicarbonate') {
                  const mls = Math.round(value * 10) / 10;
                  return `/ ${mls}ml`;
                }
                
                return null;
              };
              
              const secondaryUnit = getSecondaryUnit();
              
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
                  {(unit || secondaryUnit) && (
                    <span className="pr-4 text-neutral-400 text-sm font-medium whitespace-nowrap">
                      {unit}{secondaryUnit ? ` ${secondaryUnit}` : ''}
                    </span>
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
          { name: 'Shock - VF', color: 'red' },
          { name: 'Shock - pVT', color: 'red' },
          { name: 'Disarm - Asystole', color: 'blue' },
          { name: 'Disarm - PEA', color: 'blue' },
          { name: 'Disarm - ROSC', color: 'emerald' }
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
            items={['Corpuls', 'Extrication', 'IO', 'IV access', 'Pacing', 'Reassurance provided']} 
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
  items: (string | { name: string; color?: string })[];
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
  
  const textColorMap: Record<string, string> = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600'
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
          {items.map(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            const itemColor = typeof item === 'string' ? null : item.color;
            const textColorClass = itemColor ? textColorMap[itemColor] : 'text-neutral-700';
            
            return (
              <button 
                key={itemName} 
                onClick={() => onSelect(itemName)} 
                className={`w-full text-left p-3 bg-neutral-50 rounded-xl font-bold text-sm hover:bg-neutral-100 btn-base ${textColorClass}`}
                data-medication={itemName}
              >
                {itemName}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
