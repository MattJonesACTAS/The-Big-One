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
  X,
  Clock,
  Zap,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  Sliders,
  RefreshCw,
  Hand,
  User
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
  patientAge: null,
  reversiblesChecked: [],
  roscChecked: [],
  pheaChecked: [],
  isROSCMode: false,
  vitals: { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' }
};

const MEDICATIONS = [
  'Adrenaline push', 'Adrenaline infusion', 'Amiodarone', 
  'Atropine', 'Calcium', 'Glucose 10%', 'Heparin', 'Ketamine push', 'Ketamine infusion', 'Lignocaine',
  'Magnesium', 'Midazolam', 'Morphine', 'Normal saline', 'Oxygen', 'Sodium bicarbonate', 'Suxamethonium'
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
      { dose: '1mg/500mL', population: 'both', indication: 'Gravity fed — adult & paed' },
      { dose: '3mg/50mL', population: 'both', indication: 'Infusion pump — adult or large paed (≥21kg)' },
      { dose: '300mcg/50mL', population: 'paed', indication: 'Infusion pump — small paed (≤20kg)' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Amiodarone': { 
    doses: [
      { dose: '300mg', population: 'adult', indication: 'VF/pVT cardiac arrest' },
      { dose: '150mg', population: 'adult', indication: 'VT/AF/A.flutter with output' },
      { dose: '5mg/kg', population: 'paed', indication: 'VF/pVT cardiac arrest', calculated: true },
      { dose: '2.5mg/kg', population: 'paed', indication: 'VF/pVT cardiac arrest (repeat)', calculated: true },
      { dose: '5mg/kg', population: 'paed', indication: 'VT with output', calculated: true },
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
      { dose: '10mg/kg', population: 'both', indication: 'Cardiac arrest / With cardiac output', calculated: true },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Glucose 10%': { 
    doses: [
      { dose: '2.5mL/kg', population: 'both', calculated: true, indication: 'Hypoglycaemia' },
      { dose: 'Other', population: 'both' }
    ],
    customUnit: 'mls'
  },
  'Heparin': {
    doses: [
      { dose: '5000u', population: 'adult', indication: 'STEMI' },
      { dose: 'Other', population: 'both' }
    ]
  },
  'Ketamine push': { 
    doses: [
      { dose: '0.5mg/kg', population: 'both', indication: 'CPR induced consciousness' },
      { dose: '1mg/kg', population: 'adult', indication: 'Intubation induction with Suxamethonium / Post intubation analgosedation' },
      { dose: '1mg/kg', population: 'paed', indication: 'Post intubation analgosedation' },
      { dose: '2mg/kg', population: 'adult', indication: 'Intubation when suxamethonium is contraindicated' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Ketamine infusion': {
    doses: [
      { dose: 'mg/h', population: 'both', indication: 'Post intubation analgosedation' }
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
      { dose: '2.5g', population: 'adult', indication: 'pVT secondary to prolonged QT' },
      { dose: '50mg/kg', population: 'paed', indication: 'pVT secondary to prolonged QT' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Midazolam': { 
    doses: [
      { dose: '0.05mg/kg', population: 'both', indication: 'Post intubation sedation with ketamine' },
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
  'Normal saline': { 
    doses: [
      { dose: '250mL', population: 'both' },
      { dose: '500mL', population: 'both' },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Sodium bicarbonate': { 
    doses: [
      { dose: '1mMol/kg', population: 'both', indication: 'Cardiac arrest: Hyperkalaemia/OD / Cardioactive drug OD with output', calculated: true },
      { dose: '0.5mMol/kg', population: 'both', indication: 'Hyperkalaemia with output', calculated: true },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Suxamethonium': { 
    doses: [
      { dose: '1.5mg/kg', population: 'adult', indication: 'Intubation', calculated: true },
      { dose: 'Other', population: 'both' }
    ] 
  },
  'Oxygen': {
    doses: [
      { dose: 'Nasal cannulae', population: 'both' },
      { dose: 'NRB', population: 'both' },
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
  // Round to 2 decimal places, then strip trailing zeros
  const rounded = parseFloat((Math.round(calculated * 100) / 100).toFixed(2));
  
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
  const mlMatch = doseStr.match(/([\d.]+)\s*(?:ml|mls|mL|mLs)/i);
  if (mlMatch) {
    const mls = parseFloat(mlMatch[1]);
    const grams = Math.round(mls * 0.1 * 10) / 10;
    return `${mls}mL/${grams}g`;
  }
  return doseStr;
};

const formatSodiumBicarbonateDose = (doseStr: string): string => {
  const mmolMatch = doseStr.match(/([\d.]+)\s*(?:mmol|mMol|MMOL)/i);
  if (mmolMatch) {
    const mmol = parseFloat(mmolMatch[1]);
    return `${mmol}mMol`;
  }
  return doseStr;
};

const formatCalciumDose = (doseStr: string, weight: number | null): string => {
  if (!weight) return doseStr;
  const calculatedMg = Math.min(10 * (typeof weight === 'number' ? weight : parseFloat(String(weight))), 1000);
  return calculatedMg >= 1000 ? `1g` : `${calculatedMg}mg`;
};

export default function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    return localStorage.getItem('disclaimerAccepted') === 'true';
  });
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    setDisclaimerAccepted(true);
  };

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
  const [catchupTxMode, setCatchupTxMode] = useState(false);
  const [catchupElapsed, setCatchupElapsed] = useState({ hrs: 0, mins: 0, secs: 0 });
  const [catchupRhythm, setCatchupRhythm] = useState({ mins: 2, secs: 0 });
  const [weightType, setWeightType] = useState<'adult' | 'paed' | null>(null);
  const [paedWeightMethod, setPaedWeightMethod] = useState<'weight' | 'age' | null>(null);
  const [paedAgeLabel, setPaedAgeLabel] = useState<string>('');
  const [weightInput, setWeightInput] = useState('');
  const [priorCounts, setPriorCounts] = useState({ shock: 0, disarm: 0, adrenaline: 0 });
  const [priorTxs, setPriorTxs] = useState<string[]>([]);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [elapsedTimestamp, setElapsedTimestamp] = useState<number | null>(null);
  const [cprTimestamp, setCprTimestamp] = useState<number | null>(null);
  const [timingMode, setTimingMode] = useState<'cpr' | 'elapsed' | 'log' | null>(null);
  const [rhythmInterval, setRhythmInterval] = useState<'evens' | 'odds' | 'half-evens' | 'half-odds' | null>(null);
  const [demoTick, setDemoTick] = useState(0); // drives animated timers on mode selection screen
  const [isCaseClosed, setIsCaseClosed] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [disregardAdrenaline, setDisregardAdrenaline] = useState<'pending' | 'confirmed' | null>(null);
  const [disregardAmiodarone, setDisregardAmiodarone] = useState<'pending' | 'confirmed' | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showTimerAdjust, setShowTimerAdjust] = useState(false);
  const [timerAdjustValue, setTimerAdjustValue] = useState({ mins: 2, secs: 0 });
  const [showElapsedRecalibrate, setShowElapsedRecalibrate] = useState(false);
  const [showRecalibrateMenu, setShowRecalibrateMenu] = useState(false);
  const [showWeightChange, setShowWeightChange] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [showRearrestIntervalPicker, setShowRearrestIntervalPicker] = useState(false);
  const [rearrestElapsed, setRearrestElapsed] = useState<number>(0);
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
  const [showInteractiveTutorial, setShowInteractiveTutorial] = useState(false);
  const [timingNodesComplete, setTimingNodesComplete] = useState(false);
  const [tutorialScreen, setTutorialScreen] = useState({ index: -1, complete: false, nodeIndex: 0 });
  const [tutorialNodeIndex, setTutorialNodeIndex] = useState(0);

  // Correct timer drift when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.running && !state.rhythmCheckPaused) {
        setState(prev => {
          if (!prev.startTime || !prev.running || prev.rhythmCheckPaused) return prev;
          const correctedElapsed = Math.floor((Date.now() - prev.startTime + prev.pausedTime) / 1000);
          if (Math.abs(correctedElapsed - prev.elapsedSeconds) < 2) return prev;
          return { ...prev, elapsedSeconds: correctedElapsed };
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.running, state.rhythmCheckPaused]);

  // Inject tutorial CPR button flash CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'tutorial-cpr-flash-style';
    style.textContent = `
      @keyframes tutorialCprFade {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      body.tutorial-flash-cpr-btn [data-tutorial="cpr-btn"] {
        animation: tutorialCprFade 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('tutorial-cpr-flash-style')?.remove(); };
  }, []);
  useEffect(() => {
    console.log('Tutorial screen tracking:', tutorialScreen);
    console.log('Current overlay:', state.currentOverlay);
    console.log('Treatments length:', state.treatments.length);

    // Tutorial: flash CPR button when all timing nodes explored
    if (showInteractiveTutorial && timingNodesComplete) {
      document.body.classList.add('tutorial-flash-cpr-btn');
    } else {
      document.body.classList.remove('tutorial-flash-cpr-btn');
    }
    
    // Node 5 (addTxBtn) complete - flash Add Tx button (index 6 = waiting for treatment screen)
    if (tutorialMode && tutorialScreen.index === 6 && state.currentOverlay === null) {
      document.body.classList.add('tutorial-flash-add-tx');
    } else {
      document.body.classList.remove('tutorial-flash-add-tx');
    }

    // Node 6 (addTxSubmenu) complete - flash Adrenaline and dose buttons (index 7)
    if (tutorialMode && tutorialScreen.index === 7) {
      document.body.classList.add('tutorial-flash-adrenaline');
      document.body.classList.add('tutorial-flash-dose');
    } else {
      document.body.classList.remove('tutorial-flash-adrenaline');
      document.body.classList.remove('tutorial-flash-dose');
    }

    // Node 8 (summaryBtn) complete - flash Summary button (index 9 = waiting for summary overlay)
    if (tutorialMode && tutorialScreen.index === 9 && state.currentOverlay === null) {
      document.body.classList.add('tutorial-flash-summary');
    } else {
      document.body.classList.remove('tutorial-flash-summary');
    }

    // Node 10 (closeOverlay) complete - flash summary close button (index 11 = waiting on summary)
    if (tutorialMode && tutorialScreen.index === 11 && state.currentOverlay === 'summary') {
      document.body.classList.add('tutorial-flash-summary-close');
    } else {
      document.body.classList.remove('tutorial-flash-summary-close');
    }

    // Node 11 (closeCase) complete - flash Close Case button (index 12 = waiting on home)
    if (tutorialMode && tutorialScreen.index === 12 && state.currentOverlay === null) {
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
      document.body.classList.remove('tutorial-flash-cpr-btn');
      document.body.classList.remove('tutorial-flash-add-tx');
      document.body.classList.remove('tutorial-flash-adrenaline');
      document.body.classList.remove('tutorial-flash-dose');
      document.body.classList.remove('tutorial-flash-summary');
      document.body.classList.remove('tutorial-flash-summary-close');
      document.body.classList.remove('tutorial-flash-close');
      document.body.classList.remove('tutorial-flash-delete');
    };
  }, [tutorialMode, tutorialScreen, state.treatments.length, state.currentOverlay, showCatchup, catchupStep, showInteractiveTutorial, timingNodesComplete]);

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
  // Demo tick for animated timers on timing mode selection screen
  useEffect(() => {
    if (catchupStep !== 6) return;
    const interval = window.setInterval(() => setDemoTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [catchupStep]);

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
          if (!prev.rhythmCheckPaused && timingMode !== 'log') {
            const countdown = prev.rhythmCheckTarget - newElapsed;

            // Auto-close overlay ONCE at 10s (not in tutorial)
            if (countdown === 10 && !hasAutoClosedAt10.current && !tutorialMode) {
              nextOverlay = null;
              hasAutoClosedAt10.current = true;
            }

            // Beep logic: in elapsed mode beep at 5s to 0s; in CPR mode beep at 10s to 5s
            const beepStart = timingMode === 'elapsed' ? 5 : 10;
            const beepEnd = timingMode === 'elapsed' ? 0 : 5;
            if (countdown <= beepStart && countdown > beepEnd && lastBeepSecond.current !== newElapsed) {
              playBeep();
              lastBeepSecond.current = newElapsed;
            }

            // Handle rhythm check reaching 0:00
            if (countdown <= 0) {
              if (timingMode === 'elapsed' && rhythmInterval) {
                // Elapsed mode: fire overlay immediately at rhythm check time, no overtime phase
                if (countdown === 0) {
                  if (!showCatchup && !tutorialMode) {
                    nextOverlay = 'treatment';
                    setIsShockForced(true);
                  }
                  nextTarget = calcNextIntervalTarget(newElapsed, rhythmInterval);
                  nextRound += 1;
                  nextOvertime = 0;
                  hasAutoClosedAt10.current = false;
                  setHasShownForcedShock(false);
                }
              } else {
                // CPR mode: 6-second overtime phase before forcing overlay
                nextOvertime = newElapsed - prev.rhythmCheckTarget;
                
                if (nextOvertime >= 6) {
                  if (!showCatchup && !tutorialMode) {
                    nextOverlay = 'treatment';
                    setIsShockForced(true);
                  }
                  nextTarget = newElapsed + 120;
                  nextRound += 1;
                  nextOvertime = 0;
                  hasAutoClosedAt10.current = false;
                  setHasShownForcedShock(false);
                }
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
      clockSeconds: getLocalTimeWithSeconds(now),
      ...(catchupTxMode ? { prior: true } : {})
    };

    if (catchupTxMode) {
      setState(prev => ({ ...prev, treatments: [...prev.treatments, treatment] }));
      setCatchupTxMode(false);
      return;
    }

    setState(prev => {
      const isShockOrDisarm = name.includes('Shock') || name.includes('Disarm');
      const isROSC = name === 'Disarm - ROSC';
      const isRearrest = name === 'Rearrest';
      const wasRhythmCheckPaused = prev.rhythmCheckPaused;
      // Increment round if shock/disarm logged out of turn (before timer hit 0)
      const isOutOfTurn = isShockOrDisarm && !isROSC && (prev.rhythmCheckTarget - prev.elapsedSeconds) > 0;
      
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
        cprRound: isOutOfTurn ? prev.cprRound + 1 : prev.cprRound,
        currentOverlay: isRearrest ? 'treatment' : null,
        // Reset rhythm check to 2:00 for ROSC or when unpausing via other shock/disarm
        rhythmCheckTarget: (isROSC || (isShockOrDisarm && wasRhythmCheckPaused)) 
          ? prev.elapsedSeconds + 120 
          : prev.rhythmCheckTarget,
        rhythmCheckOvertime: (isROSC || (isShockOrDisarm && wasRhythmCheckPaused)) ? 0 : prev.rhythmCheckOvertime,
        // Pause for ROSC, unpause for other shock/disarm; Rearrest exits ROSC mode
        rhythmCheckPaused: isShockOrDisarm ? isROSC : prev.rhythmCheckPaused,
        // For ROSC, freeze the countdown at 2:00
        frozenCountdown: isROSC ? 120 : prev.frozenCountdown,
        // Enter ROSC mode when ROSC logged, exit when any shock/disarm or rearrest logged
        isROSCMode: isROSC ? true : (isShockOrDisarm || isRearrest) ? false : prev.isROSCMode,
        // Clear ROSC checklist when ROSC is logged again (new ROSC event)
        roscChecked: isROSC ? [] : prev.roscChecked
      };
    });
    
    // Rearrest from Add Tx menu: stop flashing, set forced overlay, mark as rearrest
    if (name === 'Rearrest') {
      setRoscButtonFlashing(false);
      setRearrested(true);
      setIsShockForced(true);
      return; // Skip the rest — overlay stays open for rhythm check outcome
    }

    // Make ROSC button flash when ROSC is selected
    if (name === 'Disarm - ROSC') {
      setRoscButtonFlashing(true);
    }
    
    setIsShockForced(false);

    // If this treatment was logged from a rearrest, show interval picker (elapsed) or timer adjust (CPR); log mode needs nothing
    if (rearrested && (name.includes('Shock') || name.includes('Disarm'))) {
      setRearrested(false);
      if (name === 'Disarm - ROSC') {
        // ROSC again — go straight back to ROSC mode, no interval picker needed
      } else if (timingMode === 'elapsed') {
        setRearrestElapsed(state.elapsedSeconds);
        setShowRearrestIntervalPicker(true);
      } else if (timingMode !== 'log') {
        setShowTimerAdjust(true);
      }
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
    if (name.includes('Adrenaline push')) {
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
    const adrTreatments = state.treatments.filter(t => t.name.includes('Adrenaline push'));
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
    const allAmioTreatments = state.treatments.filter(t => t.name.includes('Amiodarone'));

    // Protocol: first amiodarone dose starts the 5-min timer, second (final) dose clears it.
    // We can't rely on dose string matching because cleanDoseForLog strips mg/kg to just
    // the calculated value (e.g. "5mg/kg (42mg)" -> "Amiodarone 42mg").
    // So we use count: 1 dose = show timer, 2+ doses = hide permanently.
    if (allAmioTreatments.length >= 2) {
      return { text: '', show: false, isDue: false, countdown: 0, flashRed: false };
    }

    const amioTreatments = allAmioTreatments;
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
        const roundedDose = parseFloat(totalDose.toFixed(2));
        if (med === 'Glucose 10%' && unit === 'mL') {
          const grams = Math.round(roundedDose * 0.1 * 10) / 10;
          summary[med].display = `${roundedDose}mL/${grams}g (${count})`;
        } else {
          summary[med].display = `${roundedDose}${unit} (${count})`;
        }
      } else {
        summary[med].display = `${count}`;
      }
    });
    
    return summary;
  }, [state.treatments]);

  // --- Elapsed time interval calculator ---
  const calcNextIntervalTarget = (elapsedSecs: number, interval: 'evens' | 'odds' | 'half-evens' | 'half-odds'): number => {
    const intervalMap = {
      'evens':      { period: 120, offset: 0   }, // 2:00, 4:00, 6:00...
      'odds':       { period: 120, offset: 60  }, // 1:00, 3:00, 5:00...
      'half-evens': { period: 120, offset: 30  }, // 2:30, 4:30, 6:30...
      'half-odds':  { period: 120, offset: 90  }, // 1:30, 3:30, 5:30...
    };
    const { period, offset } = intervalMap[interval];
    const phase = ((elapsedSecs - offset) % period + period) % period;
    const next = elapsedSecs + (period - phase);
    return next;
  };

  // --- Catchup Handlers ---
  const handleCatchupStart = (overrideWeight?: string) => {
    
    // Clear localStorage for a completely fresh start
    localStorage.clear();
    sessionStorage.clear();
    
    let adjustedElapsed = catchupElapsed.hrs * 3600 + catchupElapsed.mins * 60 + catchupElapsed.secs;
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
    
    // Adjust times based on elapsed time since they were entered
    if (elapsedTimestamp) {
      const timeSinceElapsed = Math.floor((Date.now() - elapsedTimestamp) / 1000);
      adjustedElapsed += timeSinceElapsed;
    }
    
    // Only apply CPR timestamp adjustment in CPR timer mode
    if (timingMode === 'cpr' && cprTimestamp) {
      const timeSinceCpr = Math.floor((Date.now() - cprTimestamp) / 1000);
      adjustedRhythm = Math.max(0, adjustedRhythm - timeSinceCpr);
    }
    
    const now = Date.now();
    const startClockTime = now - (adjustedElapsed * 1000);
    
    // Calculate rhythm check target based on timing mode
    let rhythmCheckTarget: number;
    if (timingMode === 'elapsed' && rhythmInterval) {
      rhythmCheckTarget = calcNextIntervalTarget(adjustedElapsed, rhythmInterval);
    } else {
      rhythmCheckTarget = adjustedElapsed + adjustedRhythm;
    }

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
    
    // Include any treatments added via the Full Tx list button
    const extraPriorTxs = state.treatments.filter(t => t.prior);
    const allInitialTxs = [...extraPriorTxs, ...initialTxs];

    setState({
      ...INITIAL_STATE,
      running: true,
      startTime: now,
      pausedTime: adjustedElapsed * 1000,
      elapsedSeconds: adjustedElapsed,
      rhythmCheckTarget: rhythmCheckTarget,
      cprRound: Math.max(1, priorCounts.shock + priorCounts.disarm),
      shocks: priorCounts.shock,
      treatments: allInitialTxs,
      catchupElapsed: adjustedElapsed,
      startClockTime: startClockTime,
      patientWeight: parsedWeight || (tutorialMode ? 70 : null),
      patientType: weightType || (tutorialMode ? 'adult' : null),
      patientAge: (weightType === 'paed' && paedWeightMethod === 'age' && paedAgeLabel) ? paedAgeLabel : null,
    });
    
    // Reset all UI states for clean new case
    setShowCatchup(false);
    setCatchupTxMode(false);
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
    previousCountdown.current = adjustedRhythm;
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

        <ArrestSummarySection state={state} />

        {(() => {
          const v = state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' };
          const vitalRows = [
            { label: 'HR',     value: v.hr,   unit: 'bpm'    },
            { label: 'RR',      value: v.rr,   unit: 'br/min' },
            { label: 'SpO₂',           value: v.spo2, unit: '%'      },
            { label: 'EtCO₂',          value: v.etco2,unit: 'mmHg'   },
            { label: 'BP', value: v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : v.bpSys || v.bpDia || '', unit: 'mmHg' },
            { label: 'GCS',            value: v.gcs,  unit: '/ 15'   },
            { label: 'BGL',            value: v.bgl,  unit: 'mmol/L' },
            { label: 'Temp',    value: v.temp, unit: '°C'     },
          ].filter(r => r.value !== '');
          return (
            <div className="rounded-xl overflow-hidden border border-neutral-100">
              <div className="bg-sky-50 text-sky-800 px-4 py-3 font-bold text-sm tracking-wider text-center">VITAL SIGNS</div>
              {vitalRows.length > 0 ? vitalRows.map(({ label, value, unit }, i) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3 ${i < vitalRows.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                  <span className="text-[14px] font-semibold text-neutral-500">{label}</span>
                  <span className="text-[17px] font-bold text-neutral-900 tabular-nums">
                    {value} <span className="text-[12px] font-medium text-neutral-400">{unit}</span>
                  </span>
                </div>
              )) : (
                <div className="px-4 py-3 text-[14px] text-neutral-400 italic">No vital signs recorded.</div>
              )}
            </div>
          );
        })()}

        <PharmaSummarySection pharmaSummary={pharmaSummary} />
        
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">TREATMENT LOG</div>
        <TreatmentLog treatments={state.treatments} elapsedSeconds={state.elapsedSeconds} catchupElapsed={state.catchupElapsed} isSummary={true} timingMode={timingMode} />

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

      {/* Interactive Tutorial pre-screen */}
      {showInteractiveTutorial && (
        <InteractiveTutorial
          onClose={() => {
            setShowInteractiveTutorial(false);
            setTimingNodesComplete(false);
            setTutorialMode(true);
          }}
          onTimingNodesComplete={() => setTimingNodesComplete(true)}
        />
      )}

      {/* Disclaimer Modal */}
      {!disclaimerAccepted && (
        <div className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h1 className="text-2xl font-bold text-neutral-900 mb-1">The Big One <span className="text-sm font-medium text-neutral-400">v1.1</span></h1>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-6">Important — please read before use</p>
            <div className="space-y-4 text-[14px] text-neutral-600 leading-relaxed mb-6">
              <p><strong className="text-neutral-900">Supplementary cognitive aid only.</strong> This application is a consolidated digital alternative to the pen, paper, and stopwatch a clinician would typically use during cardiac arrest management. The Big One tracks multiple timers, records interventions, and displays pre-configured guideline-derived information. It is a documentation, timing, and situational awareness tool only, not a clinical decision-making system, and does not replace clinical judgement, professional training, or your service's approved clinical guidelines and procedures. This application is intended for use by trained clinicians only.</p>
              <p><strong className="text-neutral-900">Clinical responsibility remains with the treating clinician.</strong> All patient assessment, treatment decisions, and medication administration remain the responsibility of the treating clinician(s). Users must apply their own professional judgement and follow current local clinical guidelines at all times.</p>
              <p><strong className="text-neutral-900">Guideline alignment and verification.</strong> This application is configured to align with ACTAS Clinical Management Guidelines (CMG) v1.0.5.4. Users are responsible for verifying that information displayed by this application aligns with their service's current approved protocols.</p>
              <p><strong className="text-neutral-900">Independent application.</strong> This application is independently developed and is not affiliated with, endorsed by, or approved by any ambulance service, health authority, or regulatory body unless explicitly stated.</p>
            </div>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={disclaimerChecked}
                onChange={e => setDisclaimerChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-emerald-600 flex-shrink-0 cursor-pointer"
              />
              <span className="text-[14px] text-neutral-700 font-medium">I confirm that I am a trained clinician and understand that this application is a supplementary aid only. Clinical and professional responsibility remains with the treating clinician.</span>
            </label>
            <button
              onClick={handleAcceptDisclaimer}
              disabled={!disclaimerChecked}
              className={`w-full py-4 rounded-xl font-bold text-[16px] transition-colors ${disclaimerChecked ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
            >
              Continue to The Big One
            </button>
          </div>
        </div>
      )}
      {/* Top Controls */}
      <div className={`grid gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0 ${timingMode === 'log' ? 'grid-cols-2' : timingMode === 'elapsed' ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {timingMode !== 'log' && timingMode !== 'elapsed' && (
          <button onClick={confirmPause} className="bg-neutral-200 p-2.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 btn-base">
            {(state.running && !state.rhythmCheckPaused) ? <Pause size={14} className="sm:w-4 sm:h-4" /> : <Play size={14} className="sm:w-4 sm:h-4" />} 
            {(state.running && !state.rhythmCheckPaused) ? 'Pause' : 'Play'}
          </button>
        )}
        <button 
          onClick={() => setShowRecalibrateMenu(true)} 
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
        {timingMode === 'log' ? (
          /* Log mode: scrollable running summary is the home screen */
          <div className="h-full flex flex-col relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <ArrestSummarySection state={state} />
              {(() => {
                const v = state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' };
                const vitalRows = [
                  { label: 'HR',     value: v.hr,   unit: 'bpm'    },
                  { label: 'RR',      value: v.rr,   unit: 'br/min' },
                  { label: 'SpO₂',           value: v.spo2, unit: '%'      },
                  { label: 'EtCO₂',          value: v.etco2,unit: 'mmHg'   },
                  { label: 'BP', value: v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : v.bpSys || v.bpDia || '', unit: 'mmHg' },
                  { label: 'GCS',            value: v.gcs,  unit: '/ 15'   },
                  { label: 'BGL',            value: v.bgl,  unit: 'mmol/L' },
                  { label: 'Temp',    value: v.temp, unit: '°C'     },
                ].filter(r => r.value !== '');
                return (
                  <div className="rounded-xl overflow-hidden border border-neutral-100">
                    <div className="bg-sky-50 text-sky-800 px-4 py-3 font-bold text-sm tracking-wider text-center">VITAL SIGNS</div>
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
                );
              })()}
              <PharmaSummarySection pharmaSummary={pharmaSummary} />
              <div>
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">TREATMENT LOG</div>
                <TreatmentLog treatments={state.treatments} elapsedSeconds={state.elapsedSeconds} catchupElapsed={state.catchupElapsed} timingMode={timingMode} onDelete={(idx) => setState(prev => ({ ...prev, treatments: prev.treatments.filter((_, i) => i !== idx) }))} />
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
                  timingMode={timingMode}
                  onDeleteTreatment={(idx) => setState(prev => ({ ...prev, treatments: prev.treatments.filter((_, i) => i !== idx) }))}
                />
              )}
            </AnimatePresence>
          </div>
        ) : (
        <div className="h-full flex flex-col items-center px-2 sm:px-3 pt-4 pb-2 sm:pb-3 relative">
          {/* Corner Cards */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between gap-3 sm:gap-4">
            {timingMode !== 'cpr' && timingMode !== 'elapsed' && (
              <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
                <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">Total time</span>
                <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">{formatTime(state.elapsedSeconds)}</span>
              </div>
            )}
            {timingMode === 'elapsed' && !state.isROSCMode && (
              <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px]">
                <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">Next check</span>
                <span className={`text-[22px] sm:text-[43px] font-bold tabular-nums leading-none ${(state.rhythmCheckTarget - state.elapsedSeconds) <= 10 ? 'text-red-500' : 'text-neutral-400'}`}>
                  {formatTime(Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds))}
                </span>
              </div>
            )}
            {!state.isROSCMode && (
            <div className="bg-neutral-100 border border-neutral-100 shadow-sm rounded-xl sm:rounded-2xl py-4 px-4 sm:py-7 sm:px-8 flex flex-col items-center min-w-[100px] sm:min-w-[140px] ml-auto">
              <span className="text-[10px] sm:text-[12px] font-bold text-neutral-900 tracking-widest mb-1.5 sm:mb-3">CPR round</span>
              <span className="text-[22px] sm:text-[43px] font-bold text-neutral-400 tabular-nums leading-none">{state.cprRound}</span>
            </div>
            )}
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
                    setRoscButtonFlashing(false);
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
                    (state.rhythmCheckTarget - state.elapsedSeconds) <= 10 ? 'text-red-500' : 'text-emerald-500'
                  }
                  animate={{ 
                    strokeDashoffset: state.rhythmCheckPaused
                      ? 1 - Math.max(0, (state.frozenCountdown || 0) / 120)
                      : state.rhythmCheckOvertime > 0 
                        ? 1 - (state.rhythmCheckOvertime / 6)
                        : timingMode === 'elapsed' && rhythmInterval
                          ? (() => {
                              // Progress ring fills from previous interval boundary to next
                              const intervalMap: Record<string, { period: number; offset: number }> = {
                                'evens':      { period: 120, offset: 0  },
                                'odds':       { period: 120, offset: 60 },
                                'half-evens': { period: 120, offset: 30 },
                                'half-odds':  { period: 120, offset: 90 },
                              };
                              const { period, offset } = intervalMap[rhythmInterval];
                              const phase = ((state.elapsedSeconds - offset) % period + period) % period;
                              return 1 - (phase / period);
                            })()
                          : 1 - Math.max(0, (state.rhythmCheckTarget - state.elapsedSeconds) / 120)
                  }}
                  style={{ strokeDasharray: 1 }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              
              <div className="flex flex-col items-center z-10 translate-y-3 sm:translate-y-4">
                <div 
                  className={`font-bold tabular-nums tracking-tighter leading-none ${
                    timingMode === 'elapsed' ? 'text-[40px] sm:text-[62px]' : 'text-7xl sm:text-[120px]'
                  } ${
                    state.rhythmCheckPaused ? 'text-neutral-900' :
                    state.rhythmCheckOvertime > 0 ? 'text-red-600' :
                    (state.rhythmCheckTarget - state.elapsedSeconds) <= 10 ? 'text-red-600' : 'text-neutral-900'
                  }`}
                >
                  {timingMode === 'elapsed'
                    ? formatTimeWithSeconds(state.elapsedSeconds)
                    : state.rhythmCheckPaused 
                      ? formatTime(state.frozenCountdown || 0)
                      : state.rhythmCheckOvertime > 0 
                        ? formatTime(6 - state.rhythmCheckOvertime)
                        : formatTime(Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds))
                  }
                </div>
                <div className={`uppercase tracking-widest font-bold mt-4 sm:mt-8 ${timingMode === 'elapsed' ? 'translate-y-0.5' : ''} ${
                  timingMode === 'elapsed' ? 'text-[11px] sm:text-[14px]' : 'text-[14px] sm:text-[18px]'
                } ${
                  state.rhythmCheckOvertime > 0 ? 'text-red-600 flash-red' : 'text-neutral-400'
                }`}>
                  {timingMode === 'elapsed' ? 'Elapsed Time' : 'Rhythm Check'}
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
                timingMode={timingMode}
                onDeleteTreatment={(idx) => setState(prev => ({ ...prev, treatments: prev.treatments.filter((_, i) => i !== idx) }))}
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
        )} {/* end else (non-log mode) */}
      </div>

      {/* Bottom Main Controls */}
      <div className={`grid gap-3 sm:gap-4 mt-3 sm:mt-4 flex-shrink-0 ${timingMode === 'log' ? (state.isROSCMode ? 'grid-cols-2' : 'grid-cols-1') : 'grid-cols-2'}`}>
        {timingMode !== 'log' && (
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
        )}
        {timingMode === 'log' && state.isROSCMode && (
          <button
            onClick={() => {
              setState(prev => ({
                ...prev,
                isROSCMode: false,
                currentOverlay: 'treatment'
              }));
              setRoscButtonFlashing(false);
              setRearrested(true);
              setIsShockForced(true);
            }}
            className="p-3 sm:p-5 rounded-2xl text-base sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 btn-base transition-colors bg-orange-500 text-white"
          >
            Re-arrest
          </button>
        )}
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
              key={catchupTxMode ? 'catchupTx' : catchupStep}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className={`bg-white rounded-[28px] max-w-md w-[90%] shadow-2xl overflow-hidden overflow-x-hidden ${catchupTxMode ? '' : 'p-6 absolute'}`}
              style={catchupTxMode ? { height: '68vh' } : {}}
            >
              {catchupTxMode && (
                <div className="flex flex-col h-full overflow-hidden" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div className="flex-1 overflow-hidden" style={{ width: '100%' }}>
                    <TreatmentSelection
                      addTreatment={(name) => { addTreatment(name); }}
                      state={{ ...state, patientType: weightType as any, patientWeight: weightInput ? parseFloat(weightInput) : state.patientWeight }}
                      isShockForced={false}
                      patientTypeOverride={weightType}
                    />
                  </div>
                  <div className="flex-shrink-0 p-4 border-t border-neutral-100">
                    <button onClick={() => setCatchupTxMode(false)} className="w-full bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold">
                      Back
                    </button>
                  </div>
                </div>
              )}
              {!catchupTxMode && catchupStep === 1 && (
                <div className="text-center space-y-6">
                  {/* Header with gradient accent */}
                  <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      It's The Big One!
                    </h1>
                    <p className="text-lg font-medium text-neutral-600 whitespace-nowrap">
                      Your cardiac arrest management tool
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
                        setShowCatchup(true);
                        setCatchupStep(6);
                        setTimingMode(null);
                        setTimingNodesComplete(false);
                        setState(prev => ({ ...prev, patientType: 'adult', patientWeight: 70 }));
                        setShowInteractiveTutorial(true);
                      }} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl text-base font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                    >
                      Tutorial
                    </button>
                  </div>

                  <div className="text-[11px] text-neutral-400 text-center pt-2 space-y-0.5">
                    <p>The Big One v1.1</p>
                    <p>ACTAS CMG v1.0.5.4</p>
                    <p>Last reviewed May 2026</p>
                  </div>
                </div>
              )}

              {!catchupTxMode && catchupStep === 2 && (
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
                        <div className="h-14 flex items-end justify-center">
                          <svg width="52" height="46" viewBox="0 0 52 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="26" cy="10" r="10" fill={weightType === 'adult' ? 'white' : '#10b981'} />
                            <path d="M6 46c0-11.046 8.954-24 20-24s20 12.954 20 24" fill={weightType === 'adult' ? 'white' : '#10b981'} />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">Adult</div>
                          <div className={`text-xs mt-1 ${weightType === 'adult' ? 'text-emerald-100' : 'text-neutral-400'}`}>
                            35 - 200 kg
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
                        <div className="h-14 flex items-end justify-center">
                          <svg width="66" height="46" viewBox="0 0 66 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Carer - exact same coordinates as adult icon, slightly lighter */}
                            <circle cx="26" cy="10" r="10" fill={weightType === 'paed' ? 'rgba(255,255,255,0.6)' : '#c4cad1'} />
                            <path d="M6 46c0-11.046 8.954-24 20-24s20 12.954 20 24" fill={weightType === 'paed' ? 'rgba(255,255,255,0.6)' : '#c4cad1'} />
                            {/* Child - moved closer */}
                            <circle cx="44" cy="23" r="6" fill={weightType === 'paed' ? 'white' : '#f472b6'} />
                            <path d="M32 46c0-6.627 5.373-14 12-14s12 7.373 12 14" fill={weightType === 'paed' ? 'white' : '#f472b6'} />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">Paediatric</div>
                          <div className={`text-xs mt-1 ${weightType === 'paed' ? 'text-pink-100' : 'text-neutral-400'}`}>
                            24hrs - 11 yrs
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
                        <option value="35">35 kg</option>
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
                            const opt = e.target.options[e.target.selectedIndex];
                            setPaedAgeLabel(opt.text.split(' (')[0]);
                          }}
                          className="w-full bg-white border-2 border-pink-300 rounded-xl px-4 py-4 text-base font-semibold focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all"
                        >
                          <option value="">Choose age</option>
                          {[
                            ['Newborn', 3], ['3 months', 5], ['6 months', 7],
                            ['12 months', 11], ['2 years', 13],
                            ['3 years', 15], ['4 years', 17], ['5 years', 19], ['6 years', 21],
                            ['7 years', 23], ['8 years', 25], ['9 years', 27], ['10 years', 30],
                            ['11 years', 33]
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
                  <h2 className="text-xl font-bold text-neutral-900 px-4">Enter elapsed time</h2>
                  <p className="text-neutral-600 text-sm px-4">This is the time at the top right corner of the monitor</p>
                  <ElapsedTimePicker value={catchupElapsed} onChange={setCatchupElapsed} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setCatchupStep(timingMode === 'elapsed' ? 7 : 6);
                        setUseManualEntry(false);
                      }} 
                      className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => { 
                        setElapsedTimestamp(Date.now());
                        if (timingMode === 'elapsed') {
                          handleCatchupStart();
                        } else {
                          setCatchupRhythm({ mins: 0, secs: 0 });
                          setCatchupStep(5);
                        }
                      }} 
                      className={'p-3 rounded-xl font-bold btn-base text-white bg-emerald-600'}
                    >
                      {timingMode === 'elapsed' ? 'Start Case' : 'Next'}
                    </button>
                  </div>
                </div>
              )}

              {!catchupTxMode && catchupStep === 5 && (
                <div className="text-center space-y-6">
                  <h2 className="text-xl font-bold text-neutral-900 px-4">Enter current CPR timer</h2>
                  <p className="text-neutral-600 text-sm px-4">This is the countdown above the diamond on the monitor</p>
                  <TimePicker 
                    value={catchupRhythm} 
                    onChange={setCatchupRhythm} 
                    maxSeconds={120}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setCatchupStep(6); setTimingMode(null); }} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button 
                      onClick={() => {
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

              {catchupStep === 7 && (
                <div className="space-y-6 px-4 max-w-md mx-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-neutral-900">Rhythm Check Timing</h2>
                    <p className="text-neutral-500 text-sm">When are rhythm checks due?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'evens',      label: 'Evens',      example: '2:00, 4:00...' },
                      { key: 'odds',       label: 'Odds',       example: '1:00, 3:00...' },
                      { key: 'half-evens', label: 'Half evens', example: '2:30, 4:30...' },
                      { key: 'half-odds',  label: 'Half odds',  example: '1:30, 3:30...' },
                    ] as const).map(({ key, label, example }) => (
                      <button
                        key={key}
                        onClick={() => setRhythmInterval(key)}
                        className={`p-4 rounded-2xl transition-all duration-200 ${
                          rhythmInterval === key
                            ? 'bg-emerald-500 text-white shadow-lg scale-105'
                            : 'bg-white text-neutral-700 border-2 border-neutral-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="font-bold text-base">{label}</div>
                        <div className={`text-xs mt-1 ${rhythmInterval === key ? 'text-emerald-100' : 'text-neutral-400'}`}>{example}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => { setCatchupStep(6); setTimingMode(null); }} className="bg-neutral-100 text-neutral-700 py-4 rounded-xl font-bold hover:bg-neutral-200 transition-colors">Back</button>
                    <button
                      onClick={() => rhythmInterval && setCatchupStep(4)}
                      disabled={!rhythmInterval}
                      className={`py-4 rounded-xl font-bold transition-all ${
                        rhythmInterval
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {!catchupTxMode && catchupStep === 3 && (
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
                    <button
                      onClick={() => setCatchupTxMode(true)}
                      className="w-full p-3 rounded-xl font-bold text-base bg-neutral-100 text-neutral-600 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Full Tx list
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCatchupStep(2)} className="bg-neutral-100 text-neutral-700 p-3 rounded-xl font-bold btn-base">Back</button>
                    <button onClick={() => { setCatchupStep(6); setTimingMode(null); }} className="bg-emerald-600 text-white p-3 rounded-xl font-bold btn-base">Next</button>
                  </div>
                </div>
              )}

              {!catchupTxMode && catchupStep === 6 && (
                <div className="space-y-5 px-4 max-w-md mx-auto">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-neutral-900">Timing Method</h2>
                    <p className="text-neutral-500 text-sm">How are you tracking rhythm checks?</p>
                  </div>

                  <div className="flex flex-col gap-3">

                    {/* Record keeping only */}
                    <button
                      onClick={() => setTimingMode('log')}
                      disabled={showInteractiveTutorial}
                      className={`w-full rounded-2xl overflow-hidden border-2 transition-all duration-200 ${timingMode === 'log' ? 'border-emerald-500' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
                        <div className="w-full max-w-[220px] rounded-xl border border-neutral-200 overflow-hidden text-left bg-white shadow-sm">
                          <div className="bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-800 tracking-widest uppercase">Treatment Log</div>
                          <div className="px-3 py-2 grid grid-cols-[2fr_1fr_1fr] gap-1 border-b border-neutral-100">
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest">Treatment</span>
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</span>
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest text-right">Ago</span>
                          </div>
                          <div className="px-3 py-2 grid grid-cols-[2fr_1fr_1fr] gap-1">
                            <span className="text-[11px] text-neutral-400 italic">No entries yet</span>
                          </div>
                        </div>
                      </div>
                      <div className={`py-2.5 text-sm font-bold text-center border-t border-neutral-200 ${timingMode === 'log' ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-700'}`}>
                        <div>No timer</div>
                        <div className="font-medium">(record keeping only)</div>
                      </div>
                    </button>

                    {/* CPR timer */}
                    <button
                      onClick={() => {
                        setTimingMode('cpr');
                        if (showInteractiveTutorial) {
                          setShowInteractiveTutorial(false);
                          setTutorialMode(true);
                        }
                      }}
                      disabled={showInteractiveTutorial && !timingNodesComplete}
                      data-tutorial="cpr-btn"
                      className={`w-full rounded-2xl overflow-hidden border-2 transition-all duration-200 ${timingMode === 'cpr' ? 'border-emerald-500' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
                        <div className="relative w-[100px] h-[100px] flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="5"/>
                            <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray="276.5"
                              strokeDashoffset={276.5 * (1 - ((120 - (demoTick % 120)) / 120))}
                            />
                          </svg>
                          <div className="flex flex-col items-center z-10">
                            <span className="text-[22px] font-bold tabular-nums leading-none text-neutral-900">
                              {`${Math.floor((120 - (demoTick % 120)) / 60)}:${String((120 - (demoTick % 120)) % 60).padStart(2,'0')}`}
                            </span>
                            <span className="text-[7px] font-bold tracking-widest uppercase text-neutral-400 mt-1">Rhythm Check</span>
                          </div>
                        </div>
                      </div>
                      <div className={`py-2.5 text-sm font-bold text-center border-t border-neutral-200 ${timingMode === 'cpr' ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-700'}`}>
                        Monitor's inbuilt CPR timer
                      </div>
                    </button>

                    {/* Elapsed time */}
                    <button
                      onClick={() => setTimingMode('elapsed')}
                      disabled={showInteractiveTutorial}
                      className={`w-full rounded-2xl overflow-hidden border-2 transition-all duration-200 ${timingMode === 'elapsed' ? 'border-emerald-500' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="bg-neutral-50 px-5 pt-5 pb-3 flex flex-col items-center">
                        <div className="relative w-[100px] h-[100px] flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="5"/>
                            <circle cx="50" cy="50" r="44" fill="none" stroke="#10b981" strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray="276.5"
                              strokeDashoffset={276.5 * (1 - ((demoTick % 120) / 120))}
                            />
                          </svg>
                          <div className="flex flex-col items-center z-10">
                            <span className="text-[16px] font-bold tabular-nums leading-none text-neutral-900">
                              {(() => {
                                const total = 120 + (demoTick % 3600);
                                const h = Math.floor(total / 3600);
                                const m = Math.floor((total % 3600) / 60);
                                const s = total % 60;
                                return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                              })()}
                            </span>
                            <span className="text-[7px] font-bold tracking-widest uppercase text-neutral-400 mt-1">Elapsed Time</span>
                          </div>
                        </div>
                      </div>
                      <div className={`py-2.5 text-sm font-bold text-center border-t border-neutral-200 ${timingMode === 'elapsed' ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-700'}`}>
                        <div>Monitor's elapsed case time</div>
                        <div className="font-medium">(odds/evens method)</div>
                      </div>
                    </button>

                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button disabled={showInteractiveTutorial} onClick={() => setCatchupStep(3)} className={`bg-neutral-100 py-4 rounded-xl font-bold transition-colors ${showInteractiveTutorial ? 'text-neutral-300 cursor-default' : 'text-neutral-700 hover:bg-neutral-200'}`}>Back</button>
                    <button
                      onClick={() => {
                        if (timingMode === 'cpr') { setCatchupRhythm({ mins: 0, secs: 0 }); setCatchupStep(5); }
                        else if (timingMode === 'elapsed') setCatchupStep(7);
                        else if (timingMode === 'log') handleCatchupStart();
                      }}
                      disabled={!timingMode}
                      className={`py-4 rounded-xl font-bold transition-all ${timingMode ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                    >
                      {timingMode === 'log' ? 'Start Case' : 'Next'}
                    </button>
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

      {showRearrestIntervalPicker && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-neutral-900">Rhythm Check Timing</h2>
              <p className="text-neutral-500 text-sm">Rearrest at {formatTimeWithSeconds(rearrestElapsed)}</p>
              <p className="text-neutral-500 text-sm">When are rhythm checks due?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'evens',      label: 'Evens',      example: '2:00, 4:00...' },
                { key: 'odds',       label: 'Odds',       example: '1:00, 3:00...' },
                { key: 'half-evens', label: 'Half evens', example: '2:30, 4:30...' },
                { key: 'half-odds',  label: 'Half odds',  example: '1:30, 3:30...' },
              ] as const).map(({ key, label, example }) => (
                <button
                  key={key}
                  onClick={() => setRhythmInterval(key)}
                  className={`p-4 rounded-2xl transition-all duration-200 ${
                    rhythmInterval === key
                      ? 'bg-emerald-500 text-white shadow-lg scale-105'
                      : 'bg-white text-neutral-700 border-2 border-neutral-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="font-bold text-base">{label}</div>
                  <div className={`text-xs mt-1 ${rhythmInterval === key ? 'text-emerald-100' : 'text-neutral-400'}`}>{example}</div>
                </button>
              ))}
            </div>

            <button
              disabled={!rhythmInterval}
              onClick={() => {
                if (!rhythmInterval) return;
                const newTarget = calcNextIntervalTarget(rearrestElapsed, rhythmInterval);
                setState(prev => ({
                  ...prev,
                  rhythmCheckTarget: newTarget,
                  rhythmCheckOvertime: 0,
                  rhythmCheckPaused: false
                }));
                setShowRearrestIntervalPicker(false);
              }}
              className={`w-full p-4 rounded-xl font-bold transition-all ${
                rhythmInterval
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {showRecalibrateMenu && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-4">
            <h2 className="text-2xl font-bold text-neutral-900 text-center">Recalibrate</h2>
            {timingMode !== 'log' && (
            <button
              onClick={() => {
                setShowRecalibrateMenu(false);
                if (timingMode === 'elapsed') {
                  setShowElapsedRecalibrate(true);
                } else {
                  const currentCountdown = Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds);
                  const mins = Math.floor(currentCountdown / 60);
                  const secs = currentCountdown % 60;
                  setTimerAdjustValue({ mins, secs });
                  setShowTimerAdjust(true);
                }
              }}
              className="w-full p-4 rounded-2xl bg-neutral-100 text-neutral-800 font-bold text-center"
            >
              <div className="text-base">Recalibrate timer</div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">{timingMode === 'elapsed' ? 'Adjust the current elapsed time or rhythm check' : 'Adjust the current rhythm check countdown'}</div>
            </button>
            )}
            <button
              onClick={() => {
                setNewWeightInput(String(state.patientWeight ?? ''));
                setShowRecalibrateMenu(false);
                setShowWeightChange(true);
              }}
              className="w-full p-4 rounded-2xl bg-neutral-100 text-neutral-800 font-bold text-center"
            >
              <div className="text-base">Change patient weight</div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Currently {state.patientWeight}kg</div>
            </button>
            <button onClick={() => setShowRecalibrateMenu(false)} className="w-full p-3 rounded-xl bg-white border border-neutral-200 text-neutral-500 font-bold">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showWeightChange && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 text-center">Change Weight</h2>
            {state.patientType === 'adult' ? (
              <select
                value={newWeightInput}
                onChange={e => setNewWeightInput(e.target.value)}
                className="w-full bg-white border-2 border-emerald-300 rounded-xl px-4 py-4 text-base font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">Select weight</option>
                <option value="35">35 kg</option>
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
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={newWeightInput}
                  onChange={e => setNewWeightInput(e.target.value)}
                  className="w-full border-2 border-pink-300 rounded-xl px-4 py-4 pr-12 text-base font-semibold focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none"
                  placeholder="Enter weight"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold pointer-events-none">kg</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowWeightChange(false)} className="p-3 rounded-xl bg-neutral-100 font-bold text-neutral-700">Cancel</button>
              <button
                onClick={() => {
                  const w = parseFloat(newWeightInput);
                  if (!isNaN(w) && w > 0) {
                    setState(prev => ({ ...prev, patientWeight: w }));
                  }
                  setShowWeightChange(false);
                }}
                disabled={!newWeightInput}
                className="p-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showElapsedRecalibrate && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-neutral-900">Recalibrate Elapsed Time</h2>
              <p className="text-neutral-500 text-sm">Adjust elapsed time and rhythm check interval</p>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 text-center">Elapsed Time</p>
              <TimePicker
                value={{ mins: Math.floor(state.elapsedSeconds / 60), secs: state.elapsedSeconds % 60 }}
                onChange={(v) => {
                  const newElapsed = v.mins * 60 + v.secs;
                  const newTarget = calcNextIntervalTarget(newElapsed, rhythmInterval || 'evens');
                  setState(prev => ({
                    ...prev,
                    elapsedSeconds: newElapsed,
                    startTime: Date.now(),
                    pausedTime: newElapsed * 1000,
                    rhythmCheckTarget: newTarget,
                    rhythmCheckOvertime: 0
                  }));
                }}
                maxSeconds={5999}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 text-center">Rhythm Check Interval</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'evens',      label: 'Evens',      example: '2:00, 4:00...' },
                  { key: 'odds',       label: 'Odds',       example: '1:00, 3:00...' },
                  { key: 'half-evens', label: 'Half evens', example: '2:30, 4:30...' },
                  { key: 'half-odds',  label: 'Half odds',  example: '1:30, 3:30...' },
                ] as const).map(({ key, label, example }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setRhythmInterval(key);
                      const newTarget = calcNextIntervalTarget(state.elapsedSeconds, key);
                      setState(prev => ({ ...prev, rhythmCheckTarget: newTarget, rhythmCheckOvertime: 0 }));
                    }}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      rhythmInterval === key
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-white text-neutral-700 border-2 border-neutral-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="font-bold text-sm">{label}</div>
                    <div className={`text-xs mt-0.5 ${rhythmInterval === key ? 'text-emerald-100' : 'text-neutral-400'}`}>{example}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowElapsedRecalibrate(false)}
              className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base"
            >
              Done
            </button>
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

function ElapsedTimePicker({ value, onChange }: { value: { hrs: number, mins: number, secs: number }, onChange: (v: { hrs: number, mins: number, secs: number }) => void }) {
  const adjust = (type: 'hrs' | 'mins' | 'secs', delta: number) => {
    const totalSecs = value.hrs * 3600 + value.mins * 60 + value.secs + (
      type === 'hrs' ? delta * 3600 : type === 'mins' ? delta * 60 : delta
    );
    if (totalSecs < 0) return;
    onChange({
      hrs: Math.floor(totalSecs / 3600),
      mins: Math.floor((totalSecs % 3600) / 60),
      secs: totalSecs % 60,
    });
  };

  const col = (label: string, val: number, type: 'hrs' | 'mins' | 'secs', bigStep?: number) => (
    <div className="flex flex-col items-center">
      <div className="flex gap-1">
        {bigStep && <button onClick={() => adjust(type, bigStep)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>}
        <button onClick={() => adjust(type, 1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▲</button>
      </div>
      <div className="text-5xl font-bold text-neutral-900 tabular-nums my-2">{val.toString().padStart(2, '0')}</div>
      <div className="flex gap-1">
        {bigStep && <button onClick={() => adjust(type, -bigStep)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>}
        <button onClick={() => adjust(type, -1)} className="p-2 bg-neutral-100 rounded-lg text-lg font-bold text-neutral-400 hover:text-neutral-900">▼</button>
      </div>
      <span className="text-neutral-400 font-bold uppercase text-xs mt-2">{label}</span>
    </div>
  );

  const sep = <div className="text-5xl font-bold text-neutral-400 mb-8">:</div>;

  return (
    <div className="flex items-center justify-center gap-3">
      {col('hr', value.hrs, 'hrs')}
      {sep}
      {col('min', value.mins, 'mins')}
      {sep}
      {col('sec', value.secs, 'secs', 10)}
    </div>
  );
}

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

function Overlay({ type, onClose, addTreatment, state, pharmaSummary, isShockForced, toggleChecklistItem, onVitalsChange, timingMode, onDeleteTreatment }: { 
  key?: string,
  type: OverlayType, 
  onClose: () => void, 
  addTreatment: (n: string) => void,
  state: AppState,
  pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }>,
  isShockForced: boolean,
  toggleChecklistItem: (checklist: 'reversibles' | 'rosc' | 'phea', label: string) => void,
  onVitalsChange: (v: AppState['vitals']) => void,
  timingMode?: string | null,
  onDeleteTreatment?: (idx: number) => void
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
        {type === 'rosc' && <ROSCSelection checkedItems={state.roscChecked} onToggle={(label) => toggleChecklistItem('rosc', label)} patientType={state.patientType} patientWeight={state.patientWeight} />}
        {type === 'phea' && <PHEASelection checkedItems={state.pheaChecked} onToggle={(label) => toggleChecklistItem('phea', label)} />}
        {type === 'vitals' && <VitalsOverlay vitals={state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' }} onChange={onVitalsChange} />}
        {type === 'summary' && <SummaryOverlay state={state} pharmaSummary={pharmaSummary} timingMode={timingMode} onDelete={onDeleteTreatment} />}
        {type === 'treatment' && <TreatmentSelection addTreatment={addTreatment} state={state} isShockForced={isShockForced} />}
      </div>
    </motion.div>
  );
}

function VitalsOverlay({ vitals, onChange }: { vitals: AppState['vitals'], onChange: (v: AppState['vitals']) => void }) {
  const update = (key: keyof AppState['vitals'], val: string) => onChange({ ...vitals, [key]: val });
  const fields: { key: keyof AppState['vitals'], label: string }[] = [
    { key: 'hr',   label: 'HR'           },
    { key: 'rr',   label: 'RR'           },
    { key: 'spo2', label: 'SpO₂'         },
    { key: 'etco2',label: 'EtCO₂'        },
    { key: 'bpSys',label: 'Systolic BP'  },
    { key: 'bpDia',label: 'Diastolic BP' },
    { key: 'gcs',  label: 'GCS'          },
    { key: 'bgl',  label: 'BGL'          },
    { key: 'temp', label: 'Temp'         },
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

function ROSCSelection({ checkedItems, onToggle, patientType, patientWeight }: {
  checkedItems: string[];
  onToggle: (label: string) => void;
  patientType: 'adult' | 'paed' | null;
  patientWeight: number | string | null;
}) {
  const isPaed = patientType === 'paed';
  const weight = typeof patientWeight === 'number' ? patientWeight : parseFloat(String(patientWeight));

  // Ventilation rate by weight (paed)
  const rrTarget = isPaed
    ? weight <= 12 ? '30–45/min (once every 1–2 seconds)'
    : weight <= 19 ? '20–40/min (once every 1.5–3 seconds)'
    : '20–30/min (once every 2–3 seconds)'
    : '8–10/min (once every 6–8 seconds)';

  // SBP target by weight (paed) or adult
  const sbpTarget = !isPaed
    ? 'Maintain SBP ≥100mmHg'
    : weight <= 3 ? 'Maintain SBP 60–100mmHg'
    : weight <= 12 ? 'Maintain SBP 70–110mmHg'
    : 'Maintain SBP 90–110mmHg';

  const teamLeaderItems = isPaed
    ? ['Confirm roles', 'Monitor ECG for rhythm changes', 'Review reversibles', 'Aggressively check and address correctable causes']
    : ['Confirm roles', 'Monitor ECG for rhythm changes', 'Review reversibles'];

  const airwayItems = isPaed
    ? [
        'Do not perform RSI (not authorised)',
        'If ETT placed during arrest — maintain sedation, prevent dislodgement',
        'Confirm spontaneous ventilations',
        'Maintain SpO₂ 94–98%',
        'Maintain EtCO₂ 35–40mmHg',
        `Ventilate at ${rrTarget}`,
      ]
    : [
        'Response — consider sedation',
        'Confirm airway secured',
        'Confirm spontaneous ventilations',
        'Maintain SpO₂ 94–98%',
        'Maintain EtCO₂ 35–40mmHg',
        `Ventilate at ${rrTarget}`,
      ];

  const goferItems = isPaed
    ? ['Confirm radial pulse', 'Set BP to automatic cycling', 'Attach SpO₂', 'Temp (32–37.5°C acceptable)', 'BGL', 'Prepare extrication']
    : ['Confirm radial pulse', 'Set BP to automatic cycling', 'Attach SpO₂', '12-lead ECG', 'Temp (actively correct if <32°C or >39°C)', 'BGL', 'Prepare extrication'];

  const drugsItems = isPaed
    ? [sbpTarget, 'Confirm bilateral IV/IO access', 'Prepare sedation medications if required', 'Prepare adrenaline infusion if required']
    : ['Confirm bilateral IV/IO access', 'Maintain SBP ≥100mmHg', 'Prepare sedation medications if required', 'Prepare adrenaline infusion if required'];

  return (
    <div className="h-full">
      <SectionGroup title="TEAM LEADER" color="orange" items={teamLeaderItems} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="AIRWAY" color="orange" items={airwayItems} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="GOFER" color="orange" items={goferItems} checkedItems={checkedItems} onToggle={onToggle} />
      <SectionGroup title="DRUGS & ACCESS" color="orange" items={drugsItems} checkedItems={checkedItems} onToggle={onToggle} />
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
function TreatmentLog({ treatments, elapsedSeconds, catchupElapsed, isSummary = false, timingMode, onDelete }: { treatments: Treatment[], elapsedSeconds: number, catchupElapsed: number, isSummary?: boolean, timingMode?: string | null, onDelete?: (index: number) => void }) {
  const [pendingDelete, setPendingDelete] = React.useState<number | null>(null);

  const splitTreatmentName = (name: string): { med: string, dose: string | null } => {
    // Oxygen: split route onto second line
    if (name.startsWith('Oxygen ')) {
      return { med: 'Oxygen', dose: name.slice(7) };
    }
    // Sodium bicarbonate: abbreviate in Tx log
    if (name.startsWith('Sodium bicarbonate')) {
      const rest = name.slice('Sodium bicarbonate'.length).trim();
      return { med: 'Sodium bic.', dose: rest || null };
    }
    // Shock/Disarm: split on ' - '
    if (name.startsWith('Shock - ')) {
      return { med: 'Shock', dose: name.slice(8) };
    }
    if (name.startsWith('Disarm - ')) {
      return { med: 'Disarm', dose: name.slice(9) };
    }
    // Match known medication names first, then treat remainder as dose
    const knownMeds = [
      'Adrenaline infusion', 'Adrenaline push', 'Amiodarone', 'Atropine',
      'Calcium', 'Glucose 10%', 'Heparin', 'Ketamine infusion', 'Ketamine push',
      'Lignocaine', 'Magnesium', 'Midazolam', 'Morphine', 'Normal saline',
      'Suxamethonium', 'Morph/midaz infusion'
    ];
    for (const med of knownMeds) {
      if (name.startsWith(med + ' ')) {
        let dose = name.slice(med.length).trim();
        // For weight-based doses "0.01mg/kg (0.13mg)", show only the calculated value
        const calcMatch = dose.match(/\(([\d.]+(?:mg|mL|mMol|mcg|g))\)/i);
        if (calcMatch) dose = calcMatch[1];
        return { med, dose: dose || null };
      }
    }
    return { med: name, dose: null };
  };

  const isCpr = timingMode === 'cpr';
  const isElapsedMode = timingMode === 'elapsed';
  const showElapsed = !isCpr && !isElapsedMode && timingMode !== 'log';
  const showAgo = !isSummary;

  const gridCols = isSummary
    ? (showElapsed ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr]')
    : (showElapsed ? 'grid-cols-[2.1fr_1fr_1.4fr_0.9fr]' : 'grid-cols-[2.1fr_1fr_0.9fr]');

  return (
    <div className="bg-white rounded-b-xl border border-neutral-100 overflow-hidden shadow-sm">
      <div className={`grid ${gridCols} gap-1 bg-neutral-100 border-b border-neutral-200 px-4 py-3`}>
        <div className={`text-[11px] font-black text-neutral-800 uppercase tracking-widest text-left ${onDelete ? 'pl-5' : ''}`}>Treatment</div>
        <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Time</div>
        {showElapsed && <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-center">Elapsed</div>}
        {showAgo && <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest text-right">Ago</div>}
      </div>

      <div className="divide-y divide-neutral-100">
        {treatments.length === 0 ? (
          <div className="p-12 text-center text-neutral-300 italic">No treatments recorded</div>
        ) : (
          [...treatments].reverse().map((tx, i) => {
            const realIndex = treatments.length - 1 - i;
            const timeVal = isSummary ? tx.clockSeconds : tx.clock;
            const timeDisplay = tx.prior ? `< ${timeVal}` : timeVal;
            const elapsedDisplay = tx.prior ? `< ${isSummary ? formatTimeWithSeconds(catchupElapsed) : formatTime(catchupElapsed)}` : (isSummary ? formatTimeWithSeconds(tx.elapsed) : formatTime(tx.elapsed));
            const agoVal = tx.prior ? elapsedSeconds : (elapsedSeconds - tx.elapsed);
            const ago = tx.prior ? `> ${formatTimeHMM(agoVal)}` : formatTimeHMM(agoVal);
            const { med, dose } = splitTreatmentName(tx.name);

            return (
              <div key={i} className={`grid ${gridCols} px-4 py-4 items-center gap-1`}>
                <div className="pr-1 flex items-center gap-3">
                  {onDelete && (
                    <button
                      onClick={() => setPendingDelete(realIndex)}
                      className="-ml-1.5 w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-red-100 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <X size={8} />
                    </button>
                  )}
                  <div>
                    <div className={`text-[15px] font-bold ${
                      tx.name.toLowerCase().includes('shock') ? 'text-red-600' :
                      tx.name.toLowerCase().includes('disarm') ? 'text-blue-600' :
                      'text-neutral-900'
                    }`}>{med}</div>
                    {dose && <div className="text-[13px] text-neutral-500 font-medium mt-0.5">{dose}</div>}
                  </div>
                </div>
                <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">{timeDisplay}</div>
                {showElapsed && <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-center">{elapsedDisplay}</div>}
                {showAgo && <div className="text-[16px] text-neutral-800 font-medium tabular-nums text-right">{ago}</div>}
              </div>
            );
          })
        )}
      </div>

      {pendingDelete !== null && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <p className="font-bold text-neutral-900 text-lg">Delete treatment?</p>
              <p className="text-neutral-500 text-sm">{treatments[pendingDelete]?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPendingDelete(null)} className="py-3 rounded-xl bg-neutral-100 font-bold text-neutral-700">Cancel</button>
              <button onClick={() => { onDelete?.(pendingDelete); setPendingDelete(null); }} className="py-3 rounded-xl bg-red-500 font-bold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStats({ state, pharmaSummary }: { state: AppState, pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }> }) {
  const disarmCount = state.treatments.filter(t => t.name.includes('Disarm')).length;
  const patientLabel = state.patientType === 'adult'
    ? `Adult · ${state.patientWeight === '>100' ? '>100' : state.patientWeight}kg`
    : state.patientType === 'paed'
    ? state.patientAge ? `Paediatric · ${state.patientAge} · ${state.patientWeight}kg` : `Paediatric · ${state.patientWeight}kg`
    : null;

  return (
    <div className="space-y-6">
      {patientLabel && (
        <div className="rounded-xl overflow-hidden border border-neutral-100">
          <div className="bg-neutral-50 text-neutral-500 px-4 py-3 font-bold text-xs tracking-wider text-center">PATIENT</div>
          <div className="bg-white px-4 py-3">
            <span className="text-[17px] font-bold text-neutral-900 text-center block">{patientLabel}</span>
          </div>
        </div>
      )}
       <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">ARREST SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm">
          <StatRow label="CPR Rounds" value={state.cprRound} />
          <StatRow label="Shocks given" value={state.shocks} color="text-red-600" />
          <StatRow label="Disarmed" value={disarmCount} color="text-blue-600" />
        </div>
      </div>

      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">PHARMA SUMMARY</div>
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

function ArrestSummarySection({ state }: { state: AppState }) {
  const disarmCount = state.treatments.filter(t => t.name.includes('Disarm')).length;
  const patientLabel = state.patientType === 'adult'
    ? `Adult · ${state.patientWeight === '>100' ? '>100' : state.patientWeight}kg`
    : state.patientType === 'paed'
    ? state.patientAge ? `Paediatric · ${state.patientAge} · ${state.patientWeight}kg` : `Paediatric · ${state.patientWeight}kg`
    : null;
  return (
    <div className="space-y-6">
      {patientLabel && (
        <div className="rounded-xl overflow-hidden border border-neutral-100">
          <div className="bg-neutral-50 text-neutral-500 px-4 py-3 font-bold text-xs tracking-wider text-center">PATIENT</div>
          <div className="bg-white px-4 py-3">
            <span className="text-[17px] font-bold text-neutral-900 text-center block">{patientLabel}</span>
          </div>
        </div>
      )}
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">ARREST SUMMARY</div>
        <div className="bg-white border-x border-b border-neutral-100 rounded-b-lg divide-y divide-neutral-50 shadow-sm">
          <StatRow label="CPR Rounds" value={state.cprRound} />
          <StatRow label="Shocks given" value={state.shocks} color="text-red-600" />
          <StatRow label="Disarmed" value={disarmCount} color="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function PharmaSummarySection({ pharmaSummary }: { pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }> }) {
  return (
    <div>
      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">PHARMA SUMMARY</div>
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
  );
}

function SummaryOverlay({ state, pharmaSummary, timingMode, onDelete }: { state: AppState, pharmaSummary: Record<string, { totalDose: number, unit: string, count: number, display: string }>, timingMode?: string | null, onDelete?: (idx: number) => void }) {
  const v = state.vitals ?? { hr: '', rr: '', gcs: '', bpSys: '', bpDia: '', spo2: '', etco2: '', bgl: '', temp: '' };
  const hasVitals = Object.values(v).some(val => val !== '');
  const vitalRows = [
    { label: 'HR',     value: v.hr,   unit: 'bpm'    },
    { label: 'RR',      value: v.rr,   unit: 'br/min' },
    { label: 'SpO₂',           value: v.spo2, unit: '%'      },
    { label: 'EtCO₂',          value: v.etco2,unit: 'mmHg'   },
    { label: 'BP', value: v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : v.bpSys || v.bpDia || '', unit: 'mmHg' },
    { label: 'GCS',            value: v.gcs,  unit: '/ 15'   },
    { label: 'BGL',            value: v.bgl,  unit: 'mmol/L' },
    { label: 'Temp',    value: v.temp, unit: '°C'     },
  ].filter(r => r.value !== '');

  return (
    <div className="space-y-6 pb-20">
      <ArrestSummarySection state={state} />
      <div className="rounded-xl overflow-hidden border border-neutral-100">
        <div className="bg-sky-50 text-sky-800 px-4 py-3 font-bold text-sm tracking-wider text-center">VITAL SIGNS</div>
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
      <PharmaSummarySection pharmaSummary={pharmaSummary} />
      <div>
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-t-lg font-bold text-sm tracking-wider text-center">TREATMENT LOG</div>
        <TreatmentLog treatments={state.treatments} elapsedSeconds={state.elapsedSeconds} catchupElapsed={state.catchupElapsed} timingMode={timingMode} onDelete={onDelete} />
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

function TreatmentSelection({ addTreatment, state, isShockForced, patientTypeOverride, noScroll }: { addTreatment: (n: string) => void, state: AppState, isShockForced?: boolean, patientTypeOverride?: string | null, noScroll?: boolean }) {
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

      const displayDose = calculateDose(dose, state.patientWeight);
      let cleanDose = cleanDoseForLog(displayDose);
      
      // For Glucose 10%, add gram calculation
      if (selectedMed === 'Glucose 10%') {
        cleanDose = formatGlucose10Dose(cleanDose);
      }
      
      // For Sodium Bicarbonate, add mls calculation
      if (selectedMed === 'Sodium bicarbonate') {
        cleanDose = formatSodiumBicarbonateDose(cleanDose);
      }
      
      // For Calcium, add mg and mL calculation with max cap
      if (selectedMed === 'Calcium') {
        cleanDose = formatCalciumDose(cleanDose, state.patientWeight);
      }
      
      // For Amiodarone paed, apply max dose caps
      if (selectedMed === 'Amiodarone' && state.patientType === 'paed') {
        const weight = typeof state.patientWeight === 'number' ? state.patientWeight : parseFloat(String(state.patientWeight));
        const mgMatch = cleanDose.match(/([\d.]+)mg/);
        if (mgMatch) {
          const calculated = parseFloat(mgMatch[1]);
          const doseOpt = DOSE_CONFIG['Amiodarone'].doses.find(d => d.dose === dose);
          if (doseOpt?.indication?.includes('repeat')) {
            const capped = Math.min(calculated, 150);
            cleanDose = `${capped}mg`;
          } else if (doseOpt?.dose?.includes('/kg')) {
            const capped = Math.min(calculated, 300);
            cleanDose = `${capped}mg`;
          }
        }
      }
      const finalTreatment = `${selectedMed} ${cleanDose}`;
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
      if (selectedMed === 'Sodium bicarbonate') {
        doseWithUnit = formatSodiumBicarbonateDose(doseWithUnit);
      }
      
      // For Calcium, add mg and mL calculation with max cap
      if (selectedMed === 'Calcium') {
        doseWithUnit = formatCalciumDose(doseWithUnit, state.patientWeight);
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
    const effectivePatientType = patientTypeOverride ?? state.patientType;
    const filteredDoses = effectivePatientType 
      ? allDoses.filter(d => d.population === 'both' || d.population === effectivePatientType)
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
    
    // Display dose on button — calculated dose first, formula in brackets
    const getButtonDisplayDose = (doseOpt: { dose: string; indication?: string }) => {
      const weight = typeof state.patientWeight === 'number' ? state.patientWeight : parseFloat(String(state.patientWeight));
      
      // Glucose 10%: show mL/dose with formula
      if (selectedMed === 'Glucose 10%' && doseOpt.dose.includes('/kg')) {
        const base = calculateDose(doseOpt.dose, state.patientWeight);
        const mlMatch = base.match(/\(([\d.]+)mL\)/i);
        if (mlMatch) {
          const mls = parseFloat(mlMatch[1]);
          const grams = Math.round(mls * 0.1 * 10) / 10;
          return `${mls}mL/${grams}g (${doseOpt.dose})`;
        }
        return base;
      }
      
      // Calcium: show calculated dose first, formula after
      if (selectedMed === 'Calcium' && doseOpt.dose.includes('/kg')) {
        const calculatedMg = Math.min(10 * weight, 1000);
        const doseDisplay = calculatedMg >= 1000 ? `1g` : `${calculatedMg}mg`;
        return `${doseDisplay} (10mg/kg)`;
      }
      
      // Amiodarone paed: cap display at 300mg for arrest, 150mg for VT with output
      if (selectedMed === 'Amiodarone' && doseOpt.dose.includes('/kg') && (effectivePatientType ?? state.patientType) === 'paed') {
        const base = calculateDose(doseOpt.dose, state.patientWeight);
        const mgMatch = base.match(/\(([\d.]+)mg\)/);
        if (mgMatch) {
          const calculated = parseFloat(mgMatch[1]);
          if (doseOpt.indication?.includes('cardiac arrest') && !doseOpt.indication?.includes('repeat')) {
            const capped = Math.min(calculated, 300);
            return `${capped}mg (5mg/kg${calculated > 300 ? ' - 300mg max' : ''})`;
          }
          if (doseOpt.indication?.includes('repeat')) {
            const capped = Math.min(calculated, 150);
            return `${capped}mg (2.5mg/kg${calculated > 150 ? ' - 150mg max' : ''})`;
          }
          if (doseOpt.indication?.includes('VT with output')) {
            const capped = Math.min(calculated, 150);
            return `${capped}mg (5mg/kg${calculated > 150 ? ' - 150mg max' : ''})`;
          }
        }
      }
      
      // Weight-based: reorder to "Xcalculated (formula)"
      if (doseOpt.dose.includes('/kg')) {
        const base = calculateDose(doseOpt.dose, state.patientWeight);
        const calcMatch = base.match(/\(([\d.]+)(mg|mL|mMol|mcg|g)\)/i);
        if (calcMatch) {
          return `${calcMatch[1]}${calcMatch[2]} (${doseOpt.dose})`;
        }
        return base;
      }
      
      // Fixed dose: just return as-is
      return doseOpt.dose;
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
                key={`${doseOpt.dose}-${doseOpt.indication}`}
                onClick={() => handleDoseSelect(doseOpt.dose)}
                className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold btn-base flex flex-col items-start gap-1 text-left"
                data-dose={doseOpt.indication || getButtonDisplayDose(doseOpt)}
              >
                <span className="text-lg">{getButtonDisplayDose(doseOpt)}</span>
                {doseOpt.indication && (
                  <>
                    <span className="w-full border-t border-white opacity-30 my-1" />
                    {doseOpt.indication.split(' / ').map((ind, i) => (
                      <span key={i} className="text-[11px] font-normal text-white opacity-90 leading-tight block">
                        {"- "}{ind.split(/(pVT)/).map((part, j) =>
                          part === 'pVT'
                            ? <span key={j}>pVT</span>
                            : part
                        )}
                      </span>
                    ))}
                  </>
                )}
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
                
                if (selectedMed === 'Sodium bicarbonate') {
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
    <div className={`w-full ${noScroll ? 'pb-4' : 'h-full overflow-y-auto pb-4'}`}>
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
          state.isROSCMode
            ? { name: 'Rearrest', color: 'orange' }
            : { name: 'Disarm - ROSC', color: 'emerald' }
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
          
          <div className="py-3 px-2 border-t border-neutral-100 bg-neutral-50 mb-4">
            <div className="flex gap-2 w-full">
              <input 
                type="text" 
                value={customTx}
                onChange={e => setCustomTx(e.target.value)}
                placeholder="Custom treatment..."
                className="flex-1 min-w-0 bg-white border border-neutral-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={() => { if(customTx) { addTreatment(customTx); setCustomTx(''); } }} 
                className="bg-emerald-600 text-white px-4 rounded-xl font-bold btn-base flex-shrink-0"
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
  items: (string | { name: string; color?: string; displayName?: string })[];
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
    emerald: 'text-emerald-600',
    orange: 'text-orange-600'
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
            const displayName = typeof item === 'string' ? item : (item.displayName ?? item.name);
            const textColorClass = itemColor ? (textColorMap[itemColor] ?? 'text-neutral-700') : 'text-neutral-700';
            const bgClass = itemColor === 'orange' ? 'bg-orange-50 hover:bg-orange-100' : 'bg-neutral-50 hover:bg-neutral-100';
            
            return (
              <button 
                key={itemName} 
                onClick={() => onSelect(itemName)} 
                className={`w-full text-left p-3 rounded-xl font-bold text-sm btn-base ${textColorClass} ${bgClass}`}
                data-medication={itemName}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
