/**
 * TutorialOverlay - Global sequential tutorial nodes with multi-page support
 */

import React, { useState, useEffect, useRef } from 'react';

interface NodePage {
  title: string;
  description: string;
}

export type TutorialMode = 'elapsed' | 'minimal' | 'log';

// What the app hands each node's flashWhileCurrent so it can decide what to pulse
export interface TutorialFlashContext {
  state: any;
  showRecalibrateMenu: boolean;
  showWeightChange: boolean;
  weightUnchanged: boolean;
  adrenalineHandled: boolean;
  intervalUnchanged: boolean;
  showElapsedRecalibrate: boolean;
}

export interface GlobalNode {
  id: string;
  type: 'popup' | 'positioned';
  x?: number;
  y?: number;
  displayNumber?: number;
  // Optional: CSS selector of the element this marker points at. When it's found
  // the marker sits on it (so it follows the real layout on any screen size);
  // otherwise it falls back to the x/y percentages.
  anchor?: string;
  pages: NodePage[];
  condition?: (appState: any, isShockForced?: boolean, initialPatientWeight?: number | null, intervalBaseline?: string | null) => boolean;
  // While this node is the one the tutorial is waiting on (i.e. the previous
  // node has been dismissed and this one's condition isn't met yet), which
  // body classes to switch on so the right button pulses. Returns class names.
  flashWhileCurrent?: (ctx: TutorialFlashContext) => string[];
}

type RawNode = Omit<GlobalNode, 'displayNumber'>;

// How long the rhythm check popup shows on its own before its tutorial slide covers it
const RHYTHM_REVEAL_DELAY_MS = 1500;

// The VSS tab node's pages; only the last line of the second page differs by mode.
function vssTabPages(whereShown: string): NodePage[] {
  return [{
    title: 'VSS Tab',
    description: "The VSS tab works differently to the checklists.\n\nIts main purpose is to record your most recent set of vital signs before handover.\n\nThat way, you can have them all in one place.\n\nThe VSS tab does not record values over time; it only displays the most recent entry for each vital sign."
  }, {
    title: 'VSS Tab',
    description: "As you type a value, a green tick appears next to it, confirming that a change has been made.\n\nEntering a new value replaces the old one.\n\n" + whereShown
  }, {
    title: 'Give it a Go',
    description: 'Open the VSS tab, record a vital sign, and close the tab to continue.'
  }];
}
// True once at least one vital sign has been entered on the VSS tab
const VITALS_SAVED = (s: any) => Object.values(s.vitals ?? {}).some((v: any) => String(v ?? '').trim() !== '');

const ELAPSED_RAW: RawNode[] = [
  // --- Home screen nodes ---
  {
    id: 'homeIntro', type: 'popup',
    pages: [{ title: 'Home Page', description: "You've now made it to the home page for your case, let's take a look around." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'elapsedCorner', type: 'positioned', x: 24, y: 24.5, anchor: '[data-tutorial-anchor="elapsed-card"]',
    pages: [
      {
        title: 'Elapsed Timer',
        description: "Earlier we entered the monitor's elapsed case time.\n\nNow we have that same timer right in front of us, matching the monitor's."
      }
    ],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'timer', type: 'positioned', x: 50, y: 52, anchor: '[data-tutorial-anchor="rhythm-ring"]',
    pages: [
      {
        title: 'Rhythm Check Countdown',
        description: "This shows a countdown to your next rhythm check.\n\nWhen the countdown reaches 0:20, the app will force you back to the home screen.\n\nThis is to prompt you to prepare the team for the next rhythm check."
      },
      {
        title: "Let's See It in Action",
        description: "We're going to pretend that the timer has just reached 0:20, and we've been forced back to the home screen.\n\nLet's see what happens next."
      }
    ],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  // --- Rhythm check walkthrough: a full worked example, forced back to home
  // at 0:20 and the popup at 0:00 exactly as it works for real. Nothing here
  // is a numbered node - each one is a plain popup that appears the moment
  // its condition is met, the same way the Home Page welcome message does.
  // App.tsx resets the countdown to 0:20 the instant this node is entered
  // (i.e. the moment the "timer" node's last page is dismissed), and again
  // to 0:04 at the "Well Done" node below - everything else, including the
  // one visible fast-forward animation in between, is the real timer and
  // the real popup running unmodified. Nothing here shows or activates
  // anything until that real countdown genuinely reaches 0:00 on its own.
  {
    id: 'rhythmDemoFirstPopup', type: 'popup',
    pages: [{
      title: 'Select the Outcome',
      description: "When the countdown reached 0:00, the 'rhythm check popup' appeared.\n\nYou use it to log what the outcome of the rhythm check was.\n\nThere are three kinds of outcome:\n\n• Shock or disarm (red and blue)\n\n• ROSC (green)\n\n• Delay Rhythm Check (amber)\n\nWe'll come back to Delay and ROSC shortly."
    }, {
      title: 'Give it a Go',
      description: "Choose any red or blue option to continue."
    }],
    condition: (s, sf) => sf === true
  },
  {
    id: 'rhythmDemoAfterFirst', type: 'popup',
    pages: [{
      title: 'Well Done',
      description: "Let's do that again, but this time choose 'Delay Rhythm Check' instead."
    }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'rhythmDemoDelayPopup', type: 'popup',
    pages: [{
      title: 'Delaying a Rhythm Check',
      description: "Choose this option if the rhythm check needs to be delayed."
    }, {
      title: 'Give it a Go',
      description: "Select 'Delay Rhythm Check' to continue."
    }],
    condition: (s, sf) => sf === true
  },
  {
    id: 'rhythmDemoRhythmCheckNow', type: 'popup',
    pages: [{
      title: 'Delayed Rhythm Check',
      description: "The rhythm check counter has been replaced with a 'Rhythm check now' button.\n\nOnce the team is ready for the rhythm check, press the button.\n\nThe rhythm check popup will reappear, and you can choose an outcome.\n\nThe rhythm check schedule (odds/evens) will automatically update, and the rhythm check timer will restart."
    }, {
      title: 'Give it a Go',
      description: "Press the 'Rhythm check now' button to continue."
    }],
    condition: (s) => s.rhythmCheckDelayedAt != null && s.currentOverlay === null
  },
  {
    id: 'rhythmDemoRoscPopup', type: 'popup',
    pages: [{
      title: 'ROSC',
      description: "Let's try the last remaining outcome, ROSC."
    }],
    condition: (s, sf) => sf === true
  },
  {
    id: 'rhythmDemoRoscMode', type: 'popup',
    pages: [{
      title: 'ROSC Mode',
      description: "Once ROSC is logged, the app switches into ROSC mode: rhythm checks and drug timers stop.\n\nIf the patient rearrests, press the central rearrest button.\n\nThe rhythm check popup will reappear, the rhythm check schedule (odds/evens) will automatically update, and the rhythm check timer will restart."
    }, {
      title: 'Give it a Go',
      description: "Press the 'Press if rearrest' button to continue."
    }],
    condition: (s) => s.isROSCMode === true && s.currentOverlay === null
  },
  {
    id: 'rhythmDemoLastPopup', type: 'popup',
    pages: [{
      title: "You've Seen It All",
      description: "That's every option the rhythm check popup offers."
    }, {
      title: "Give it a Go",
      description: "Choose any rhythm check outcome you like to finish up, then we'll carry on with the rest of the tutorial."
    }],
    condition: (s, sf) => sf === true
  },
  {
    id: 'recalibrate', type: 'positioned', x: 25.4, y: 4.2, anchor: '[data-button="recalibrate"]',
    pages: [{ title: 'Recalibrate Button', description: "The recalibrate button allows you to change how the app functions.\n\nHere you can:\n\n• Fine tune the elapsed timer if you didn't get it quite right\n\n• Change the rhythm check interval\n\n• Change the patient's weight\n\n• Change the app mode" }, { title: 'Give it a Go', description: "Change the patient's weight to move forward." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'tabs', type: 'positioned', x: 37.5, y: 10.97, anchor: '[data-button="rosc"]',
    pages: [{ title: 'Checklists', description: 'Quick access to checklists for:\n\n• Reversible causes of arrest\n\n• ROSC\n\n• PHEA\n\nYou will notice the 4H 4T checklist starts out flashing red.\n\nThis encourages early management of the reversible causes of arrest.\n\nThe ROSC checklist works the same way: it goes red when ROSC mode is activated.' }, { title: 'Give it a Go', description: 'Open the 4H 4T checklist and tick one off to continue.' }],
    condition: (s, sf, initialWeight) => s.running && s.currentOverlay === null && !sf && initialWeight != null && s.patientWeight !== initialWeight
  },
  {
    // Appears over the checklist's own Close button once something has been ticked: until now
    // the tutorial said nothing about how to get out of the checklist again.
    id: 'closeChecklist', type: 'positioned', x: 12.5, y: 10.97, anchor: '[data-button="reversibles"]',
    pages: [
      { title: 'Closing a Checklist', description: "When you've finished with a checklist, press its 'Close' button to return to the home screen.\n\nWhatever you've ticked is kept." },
      { title: 'Give it a Go', description: 'Close the checklist to continue.' }
    ],
    condition: (s, sf) => s.running && s.currentOverlay === 'reversibles' && !sf && s.reversiblesChecked.length > 0
  },
  {
    // Introduces the VSS tab once the 4H 4T checklist has been ticked and closed.
    // The last line on the second page differs by mode (see vssTabPages).
    id: 'vssTab', type: 'positioned', x: 87.5, y: 10.97, anchor: '[data-button="vitals"]',
    pages: vssTabPages("Your values appear on the running summary and the case summary, which we'll see later."),
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf && s.reversiblesChecked.length > 0
  },
  {
    id: 'addTxBtn', type: 'positioned', x: 74.65, y: 95.29, anchor: '[data-button="add-tx"]',
    pages: [{ title: 'Add Treatment Button', description: 'This opens the treatments (Tx) menu for logging interventions in real time.' }, { title: 'Give it a Go', description: 'Press the \'+ Add Tx\' button so we can log our first Tx.' }],
    // Doesn't show until the previous node's own instruction has actually
    // been followed - a vital sign actually saved on the VSS tab (after a real
    // tick on the 4H 4T checklist), not just having read about it.
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf && s.reversiblesChecked.length > 0 && VITALS_SAVED(s)
  },
  // --- Treatment screen ---
  {
    id: 'addTxSubmenu', type: 'positioned', x: 50, y: 36.08, anchor: '[data-tx-section="airway"]',
    pages: [
      {
        title: 'Add Tx Submenu',
        description: "The Add Tx submenu has four categories of treatments you can log:\n\n• Rhythm Check (shocks and disarms)\n\n• Medications\n\n• Airway\n\n• Other Tx\n\nYou can also free type custom interventions."
      },
      {
        title: 'Successful / Unsuccessful',
        description: "For some interventions in Airway and Other Tx, you can choose to log them as successful or unsuccessful to keep your record keeping accurate."
      },
      {
        title: 'Medications',
        description: "All medications will have one or more dosage options to choose from for different indications.\n\nThese dosages are pre-calculated if they are weight based."
      }, {
        title: 'Give it a Go',
        description: "Log an adrenaline push dose to progress."
      }
    ],
    condition: (s, sf) => s.currentOverlay === 'treatment' && !sf
  },
  // --- Home with medication alerts ---
  {
    id: 'adrenalineAlert', type: 'positioned', x: 28.05, y: 83.32, anchor: '[data-tutorial-anchor="adrenaline-timer"]',
    pages: [{ title: 'Medication Timer', description: 'When you log adrenaline or amiodarone, a timer will appear on the home screen to help you keep track of when the next dose is due.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.some((t: any) => t.name.startsWith('Adrenaline push')) && !sf
  },
  {
    id: 'summaryBtn', type: 'positioned', x: 26.6, y: 95.4, anchor: '[data-button="summary"]',
    pages: [{ title: 'Summary Button', description: "Next, let's have a look at the running case summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.length > 0 && !sf
  },
  // --- Summary overlay ---
  {
    id: 'arrestSummaryInfo', type: 'positioned', x: 50, y: 35, anchor: '[data-tutorial-anchor="arrest-summary-banner"]',
    pages: [
      {
        title: 'Arrest Summary',
        description: 'The top of the running summary lists the number of CPR rounds, along with the number of shocks and disarms.'
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'vitalSignsInfo', type: 'positioned', x: 50, y: 50, anchor: '[data-tutorial-section="vitalSigns"]',
    pages: [
      {
        title: 'Vital Signs Survey',
        description: "Next, we have the vital signs survey.\n\nAny vital signs entered via the VSS tab will appear here for quick reference during the case and at handover."
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'pharmaSummaryInfo', type: 'positioned', x: 50, y: 50, anchor: '[data-tutorial-section="pharmaSummary"]',
    pages: [
      {
        title: 'Pharma Summary',
        description: 'Next, we have the pharmacological summary, which lists all logged medications with a cumulative tally of the total dose logged of each drug.'
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'treatmentLogInfo', type: 'positioned', x: 50, y: 52, anchor: '[data-tutorial-section="treatmentLog"]',
    pages: [
      {
        title: 'Treatment Log',
        description: "At the bottom we have a chronological record of all logged interventions.\n\nTimestamps show the time of day and how long ago each Tx was logged."
      },
      {
        title: 'Editing Treatments',
        description: "Treatments in the Tx log can be edited, reordered, or deleted by pressing the button to the left of the treatment name.\n\n'Edit' lets you correct what was logged while keeping its original time and position in the log.\n\nFor example, you can change the drug you gave, the dose you gave, or change it to something else completely."
      },
      {
        title: 'Editing Treatments',
        description: "'Reorder' lets you shift a Tx to its correct position in the log.\n\nThis is useful if you realise that you missed logging something that happened earlier.\n\nBe aware that when you reorder a Tx, the app can't know when it actually happened, so its time is wiped."
      },
      {
        title: 'Give it a Go',
        description: "Edit, reorder, or delete the adrenaline push entry you logged earlier to continue."
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'closeOverlay', type: 'positioned', x: 26.6, y: 95.4, anchor: '[data-button="summary"]',
    pages: [{ title: 'Return to Home', description: 'Press the close button to return to the home page.' }],
    condition: (s) => s.currentOverlay === 'summary'
      && (!s.treatments.some(t => t.name.startsWith('Adrenaline push'))
          || s.treatments.some(t => t.name.startsWith('Adrenaline push') && (t.timeUnknown || t.edited)))
  },
  // --- Home after summary ---
  {
    id: 'endCase', type: 'positioned', x: 75.22, y: 4.2, anchor: '[data-button="end-case"]',
    pages: [{ title: 'End Case Button', description: "When you've either stopped resuscitative efforts or handed your patient over at hospital, you can end the case." }, { title: 'Give it a Go', description: "Let's end the case and see the final summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  // --- Case summary ---
  {
    id: 'finalStats', type: 'positioned', x: 50, y: 61.64, anchor: '[data-tutorial-anchor="closed-treatment-log-banner"]',
    pages: [{ title: 'Final Case Data', description: 'Now the case is over, the treatment log shows times to the second, not just to the minute.' }],
    condition: (s) => !s.running
  },
  {
    id: 'export', type: 'positioned', x: 27.23, y: 15.45, anchor: '[data-button="export-pdf"]',
    pages: [{ title: 'Export PDF', description: 'Here you can export the case summary and Tx log to a PDF, which you can then download or email for later review.' }],
    condition: (s) => !s.running
  },
  {
    id: 'delete', type: 'positioned', x: 73.46, y: 15.45, anchor: '[data-button="close-case"]',
    pages: [{ title: 'Close Case', description: "Once you've finished with this case, you can close the case which resets the app.\n\nThe three most recent closed cases are accessible on the opening screen if you want to look back on them later - but since this is just the tutorial, this particular case won't be saved." }, { title: 'Give it a Go', description: "Close the case to finish the tutorial, and we'll see you at The Big One!" }],
    condition: (s) => !s.running
  }
];

// Which button(s) pulse while the tutorial is waiting on each node. Attached
// by id so the node text above stays exactly as written.
const FLASH: Record<string, (ctx: TutorialFlashContext) => string[]> = {
  // recalibrate dismissed, waiting for the weight to actually change
  tabs: (c) => {
    if (!c.weightUnchanged) return [];
    if (!c.showRecalibrateMenu && !c.showWeightChange) return ['tutorial-flash-recalibrate'];
    if (c.showRecalibrateMenu) return ['tutorial-flash-weight'];
    return [];
  },
  // Add Tx button dismissed, waiting for it to be pressed
  addTxSubmenu: (c) => c.state.currentOverlay === null ? ['tutorial-flash-add-tx'] : [],
  // submenu dismissed, waiting for adrenaline to be logged
  adrenalineAlert: () => ['tutorial-flash-adrenaline', 'tutorial-flash-dose'],
  // Summary button dismissed, waiting for it to be pressed
  arrestSummaryInfo: (c) => c.state.currentOverlay === null ? ['tutorial-flash-summary'] : [],
  // treatment log dismissed, waiting for the adrenaline entry to be edited
  closeOverlay: (c) => (c.state.currentOverlay === 'summary' && !c.adrenalineHandled) ? ['tutorial-flash-adrenaline-tx'] : [],
  // Return to Home dismissed, waiting for the summary to be closed
  endCase: (c) => c.state.currentOverlay === 'summary' ? ['tutorial-flash-summary-close'] : [],
  // End Case dismissed, waiting for it to be pressed
  finalStats: (c) => c.state.currentOverlay === null ? ['tutorial-flash-end'] : [],
};

export const TUTORIAL_FLASH_CLASSES = [
  'tutorial-flash-recalibrate', 'tutorial-flash-weight', 'tutorial-flash-add-tx',
  'tutorial-flash-adrenaline', 'tutorial-flash-dose', 'tutorial-flash-summary',
  'tutorial-flash-adrenaline-tx', 'tutorial-flash-summary-close', 'tutorial-flash-end',
  'tutorial-flash-close',
, 'tutorial-flash-recalibrate-timer'];

const ELAPSED_NODES: RawNode[] = ELAPSED_RAW.map(n => FLASH[n.id] ? { ...n, flashWhileCurrent: FLASH[n.id] } : n);
const nodeById = (id: string): RawNode => {
  const n = ELAPSED_NODES.find(x => x.id === id);
  if (!n) throw new Error(`tutorial node ${id} not found`);
  return n;
};
const withOverrides = (id: string, overrides: Partial<RawNode>): RawNode => ({ ...nodeById(id), ...overrides });

const ADRENALINE_LOGGED = (s: any) => s.treatments.some((t: any) => t.name.startsWith('Adrenaline push'));
const ADRENALINE_HANDLED = (s: any) => !ADRENALINE_LOGGED(s)
  || s.treatments.some((t: any) => t.name.startsWith('Adrenaline push') && (t.timeUnknown || t.edited));

// --- Timers only: the same timers and the same rhythm check walkthrough as
// Tx log & timers, but no Summary button/overlay, no dose picker, no weight,
// and only rhythm check outcomes + adrenaline/amiodarone in Add Tx.
const MINIMAL_NODES: RawNode[] = [
  nodeById('homeIntro'),
  nodeById('elapsedCorner'),
  nodeById('timer'),
  withOverrides('rhythmDemoFirstPopup', {
    pages: [{
      title: 'Select the Outcome',
      description: "When the countdown reached 0:00, the 'rhythm check popup' appeared.\n\nYou use it to log what the outcome of the rhythm check was.\n\nThere are three kinds of outcome:\n\n• No ROSC (red)\n\n• ROSC (green)\n\n• Delay Rhythm Check (amber)\n\nWe'll come back to Delay and ROSC shortly."
    }, {
      title: 'Give it a Go',
      description: "Choose 'No ROSC' to continue."
    }]
  }),
  nodeById('rhythmDemoAfterFirst'),
  nodeById('rhythmDemoDelayPopup'),
  nodeById('rhythmDemoRhythmCheckNow'),
  nodeById('rhythmDemoRoscPopup'),
  nodeById('rhythmDemoRoscMode'),
  nodeById('rhythmDemoLastPopup'),
  withOverrides('recalibrate', {
    pages: [{
      title: 'Recalibrate Button',
      description: "The recalibrate button allows you to change how the app functions.\n\nHere you can:\n\n• Fine tune the elapsed timer if you didn't get it quite right\n\n• Change the rhythm check interval\n\n• Change the app mode"
    }, { title: 'Give it a Go', description: "Change the rhythm check interval to move forward." }]
  }),
  // no patient weight in this mode, so the checklists wait for a real rhythm check interval change instead
  withOverrides('tabs', {
    condition: (s, sf, _w, intervalBaseline) => s.running && s.currentOverlay === null && !sf && intervalBaseline != null && s.rhythmInterval !== intervalBaseline,
    flashWhileCurrent: (c) => {
      if (!c.intervalUnchanged) return [];
      if (!c.showRecalibrateMenu && !c.showElapsedRecalibrate) return ['tutorial-flash-recalibrate'];
      if (c.showRecalibrateMenu) return ['tutorial-flash-recalibrate-timer'];
      return [];
    }
  }),
  nodeById('closeChecklist'),
  withOverrides('vssTab', { pages: vssTabPages("Your values appear on the case summary when the case is closed, which we'll see later.") }),
  withOverrides('addTxBtn', {
    pages: [{
      title: 'Add Treatment Button',
      description: "This opens the treatments (Tx) menu.\n\nIn this mode it only offers what the timers need: rhythm check outcomes, adrenaline, and amiodarone."
    }, {
      title: 'Give it a Go',
      description: "Press the '+ Add Tx' button so we can start an adrenaline timer."
    }]
  }),
  withOverrides('addTxSubmenu', {
    // Timers only has no Airway section, so this marker stays on the submenu itself
    anchor: '[data-tutorial-anchor="add-tx-submenu"]',
    pages: [{
      title: 'Add Tx Submenu',
      description: "The Add Tx submenu has two categories:\n\n• Rhythm Check (No ROSC and ROSC)\n\n• Medications (adrenaline and amiodarone)\n\nThere are no doses to choose in this mode."
    }, {
      title: 'Give it a Go',
      description: "Press 'Adrenaline' to start its timer."
    }]
  }),
  withOverrides('adrenalineAlert', {
    pages: [{
      title: 'Medication Timer',
      description: 'When you press adrenaline or amiodarone, a timer will appear on the home screen to help you keep track of when the next dose is due.'
    }]
  }),
  withOverrides('endCase', { flashWhileCurrent: undefined }),
  withOverrides('finalStats', {
    pages: [{
      title: 'Final Case Data',
      description: "Although you didn't see a Tx log while you worked, this mode recorded the times you logged rhythm checks, adrenaline, and amiodarone.\n\nHere they are, with times to the second."
    }]
  }),
  nodeById('export'),
  nodeById('delete'),
];

// --- Tx log only: no timers at all, and the home page *is* the running
// summary (no Summary button or overlay), so the summary sections are shown
// right there on the home page.
const LOG_HOME = (s: any, sf?: boolean) => s.running && s.currentOverlay === null && !sf;
const LOG_NODES: RawNode[] = [
  nodeById('homeIntro'),
  withOverrides('recalibrate', {
    pages: [{
      title: 'Recalibrate Button',
      description: "The recalibrate button allows you to change how the app functions.\n\nHere you can:\n\n• Change the patient's weight\n\n• Change the app mode"
    }, {
      title: 'Give it a Go',
      description: "Change the patient's weight to move forward."
    }]
  }),
  nodeById('tabs'),
  nodeById('closeChecklist'),
  withOverrides('vssTab', { pages: vssTabPages("Your values appear on the home page summary and the case summary, which we'll see later.") }),
  nodeById('addTxBtn'),
  nodeById('addTxSubmenu'),
  withOverrides('arrestSummaryInfo', {
    pages: [{
      title: 'Arrest Summary',
      description: 'In this mode, the home page is the running case summary.\n\nThe top of the running summary lists the number of CPR rounds, along with the number of shocks and disarms.'
    }],
    condition: (s, sf) => LOG_HOME(s, sf) && ADRENALINE_LOGGED(s),
    // waiting for adrenaline to be logged
    flashWhileCurrent: () => ['tutorial-flash-adrenaline', 'tutorial-flash-dose']
  }),
  withOverrides('vitalSignsInfo', { condition: (s, sf) => LOG_HOME(s, sf) }),
  withOverrides('pharmaSummaryInfo', { condition: (s, sf) => LOG_HOME(s, sf) }),
  withOverrides('treatmentLogInfo', { condition: (s, sf) => LOG_HOME(s, sf) }),
  withOverrides('endCase', {
    condition: (s, sf) => LOG_HOME(s, sf) && ADRENALINE_HANDLED(s),
    // waiting for the adrenaline entry to be edited
    flashWhileCurrent: (c) => (c.state.currentOverlay === null && !c.adrenalineHandled) ? ['tutorial-flash-adrenaline-tx'] : []
  }),
  nodeById('finalStats'),
  nodeById('export'),
  nodeById('delete'),
];

const RAW_BY_MODE: Record<TutorialMode, RawNode[]> = {
  elapsed: ELAPSED_NODES,
  minimal: MINIMAL_NODES,
  log: LOG_NODES,
};

// The last number used by InteractiveTutorial.tsx's setup-flow nodes for each
// mode (elapsed: App Mode 1, Patient Type 2, Previous Treatments 3, Rhythm
// Check Timing 4, Elapsed Time 5; Timers only: App Mode 1, Rhythm Check
// Timing 2, Elapsed Time 3; Tx log only: App Mode 1, Patient Type 2,
// Previous Treatments 3). The live nodes pick up right after it.
const BASE_NUMBER: Record<TutorialMode, number> = { elapsed: 5, minimal: 3, log: 3 };

// displayNumber is derived automatically from array position rather than
// hand-typed on each node, so adding/removing/reordering a node can never
// silently produce a duplicate or skipped number. Only 'positioned' nodes
// get a visible number (popups don't).
const nodeCache: Partial<Record<TutorialMode, GlobalNode[]>> = {};
export function getTutorialNodes(mode: TutorialMode): GlobalNode[] {
  const cached = nodeCache[mode];
  if (cached) return cached;
  let count = 0;
  const built: GlobalNode[] = RAW_BY_MODE[mode].map(node => {
    if (node.type !== 'positioned') return node;
    count += 1;
    return { ...node, displayNumber: BASE_NUMBER[mode] + count };
  });
  nodeCache[mode] = built;
  return built;
}

interface Props {
  appState: any;
  isShockForced?: boolean;
  onExit: () => void;
  onNodeChange?: (globalNodeIndex: number, tutorialDone: boolean) => void;
  isCaseClosed?: boolean;
  globalNodeIndex?: number;
  mode?: TutorialMode;
  // True while one of the app's own menus (Recalibrate, Change Mode, warnings...) is open: the
  // waiting node's marker then hides behind it instead of floating on top
  appModalOpen?: boolean;
  intervalBaseline?: string | null;
}

export default function TutorialOverlay({ appState, isShockForced, onExit, onNodeChange, isCaseClosed, globalNodeIndex: externalNodeIndex = 0, mode = 'elapsed', appModalOpen = false, intervalBaseline = null }: Props) {
  const ALL_NODES = getTutorialNodes(mode);
  const [internalNodeIndex, setInternalNodeIndex] = useState(externalNodeIndex);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activePopup, setActivePopup] = useState<GlobalNode | null>(null);
  const [activePositioned, setActivePositioned] = useState<GlobalNode | null>(null);
  const [pageAnimKey, setPageAnimKey] = useState(0);

  // Captures the patient weight as it was when the tutorial started, so the
  // 'tabs' node can require a real weight change (not just visiting the page)
  // before it appears.
  const initialWeightRef = useRef<number | null>(appState.patientWeight ?? null);

  const globalNodeIndex = externalNodeIndex;
  const tutorialDone = globalNodeIndex >= ALL_NODES.length;

  const advanceNode = () => {
    const newVal = internalNodeIndex + 1;
    setInternalNodeIndex(newVal);
    if (onNodeChange) onNodeChange(newVal, newVal >= ALL_NODES.length);
  };

  const currentNode = tutorialDone ? null : ALL_NODES[globalNodeIndex];

  // Where an anchored marker actually is on screen right now (see GlobalNode.anchor)
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const selector = currentNode?.type === 'positioned' ? currentNode.anchor : undefined;
    if (!selector) { setAnchorPos(null); return; }
    let frame = 0;
    const follow = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        setAnchorPos(prev => (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5) ? prev : { x, y });
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => { cancelAnimationFrame(frame); setAnchorPos(null); };
  }, [currentNode?.id]);

  // Four of the rhythm-check walkthrough's popups are specifically meant to
  // show layered over the real forced popup (their own condition checks for
  // isShockForced being true) - everything else keeps stepping aside while
  // that window is open, as before.
  const showsDuringRhythmCheck = currentNode?.id === 'rhythmDemoFirstPopup'
    || currentNode?.id === 'rhythmDemoDelayPopup'
    || currentNode?.id === 'rhythmDemoRoscPopup'
    || currentNode?.id === 'rhythmDemoLastPopup';
  const inRhythmCheckWindow = appState.running && isShockForced && !showsDuringRhythmCheck;

  const conditionMet = !inRhythmCheckWindow && currentNode
    ? (currentNode.condition ? currentNode.condition(appState, isShockForced, initialWeightRef.current, intervalBaseline) : true)
    : false;

  // Auto-show popup when condition met. The four slides that sit over the real
  // rhythm check popup wait RHYTHM_REVEAL_DELAY_MS first, so the user sees that
  // popup arrive before the slide covers it. While waiting, taps are blocked
  // (see revealPending below) so an outcome can't be chosen before the slide shows.
  const [revealPending, setRevealPending] = useState(false);
  useEffect(() => {
    if (!(currentNode?.type === 'popup' && conditionMet && !activePopup)) {
      setRevealPending(false);
      return;
    }
    const show = () => {
      setRevealPending(false);
      setActivePopup(currentNode);
      setCurrentPageIndex(0);
      setPageAnimKey(k => k + 1);
    };
    if (!showsDuringRhythmCheck) { show(); return; }
    setRevealPending(true);
    const t = setTimeout(show, RHYTHM_REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [currentNode?.id, conditionMet]);

  // Dismiss active popup during rhythm check window
  useEffect(() => {
    if (inRhythmCheckWindow && activePositioned) {
      setActivePositioned(null);
      setCurrentPageIndex(0);
    }
  }, [inRhythmCheckWindow, activePositioned]);

  const activeNode = activePopup || activePositioned;
  const activePages = activeNode?.pages ?? [];
  const currentPage = activePages[currentPageIndex];
  const isLastPage = currentPageIndex >= activePages.length - 1;

  const handleNext = () => {
    setCurrentPageIndex(prev => prev + 1);
    setPageAnimKey(k => k + 1);
  };

  const handleGotIt = () => {
    setCurrentPageIndex(0);
    setActivePopup(null);
    setActivePositioned(null);
    advanceNode();
  };

  const handleNodeClick = () => {
    if (currentNode?.type === 'positioned' && conditionMet) {
      setActivePositioned(currentNode);
      setCurrentPageIndex(0);
      setPageAnimKey(k => k + 1);
    }
  };

  const showDarkOverlay = activePopup !== null || activePositioned !== null;

  return (
    <div data-tutorial-ui="true" style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>

      {/* Invisible tap blocker while a rhythm check slide is waiting to appear */}
      {revealPending && (
        <div data-tutorial-reveal-blocker="true" style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'auto' }} />
      )}

      {/* Dark backdrop */}
      {showDarkOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9999, pointerEvents: 'auto'
        }} />
      )}

      {/* Positioned node circle */}
      {currentNode?.type === 'positioned' && conditionMet && !activePositioned && !tutorialDone && !appModalOpen && (
        <div
          onClick={handleNodeClick}
          style={{
            position: 'absolute',
            left: anchorPos ? `${anchorPos.x}px` : `${currentNode.x}%`,
            top: anchorPos ? `${anchorPos.y}px` : `${currentNode.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '50px', height: '50px',
            cursor: 'pointer', zIndex: 10001, pointerEvents: 'auto',
          }}
        >
          <div style={{
            width: '50px', height: '50px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px', fontWeight: '700', color: 'white',
            animation: 'nodeBreath 2s ease-in-out infinite',
          }}>
            {currentNode.displayNumber}
          </div>
        </div>
      )}

      {/* Popup modal */}
      {activeNode && currentPage && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', borderRadius: '20px',
          padding: '32px', maxWidth: '400px', width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 10000, pointerEvents: 'auto',
          // Scrolls only if it would otherwise run off the screen
          maxHeight: 'calc(100% - 40px)', overflowX: 'hidden', overflowY: 'auto'
        }}>
          {/* Sliding page content */}
          <div key={pageAnimKey} style={{ animation: 'slideInPage 0.25s ease-out' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#000', textAlign: 'center' }}>
              {currentPage.title}
            </h2>
            {renderDescription(currentPage.description)}
          </div>

          {/* Page dots */}
          {activePages.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
              {activePages.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: i === currentPageIndex ? '#059669' : '#d1d5db',
                  transition: 'background-color 0.2s'
                }} />
              ))}
            </div>
          )}

          <button
            onClick={isLastPage ? handleGotIt : handleNext}
            style={{
              width: '100%', backgroundColor: '#059669', color: 'white',
              padding: '16px', borderRadius: '12px', border: 'none',
              fontSize: '16px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            {isLastPage ? 'Got It' : 'Next'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes nodeBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes slideInPage {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function renderWithItalics(text: string) {
  const parts = text.split('The Big One');
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && <em>The Big One</em>}
    </React.Fragment>
  ));
}

function renderDescription(text: string) {
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
    <div style={{ color: '#666', marginBottom: '24px', lineHeight: '1.5', textAlign: 'left', fontSize: '16px' }}>
      {groups.map((group, gi) => {
        const isLast = gi === groups.length - 1;
        if (group.type === 'bullets') {
          return (
            <div key={gi} style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: isLast ? 0 : '0.9em'
            }}>
              {group.items.map((bullet, bi) => (
                <p key={bi} style={{
                  margin: 0,
                  marginBottom: bi < group.items.length - 1 ? '0.46em' : 0,
                  whiteSpace: 'pre-line'
                }}>
                  {renderWithItalics(bullet)}
                </p>
              ))}
            </div>
          );
        }
        return (
          <p key={gi} style={{
            margin: 0,
            marginBottom: isLast ? 0 : '0.9em',
            whiteSpace: 'pre-line'
          }}>
            {renderWithItalics(group.items[0])}
          </p>
        );
      })}
    </div>
  );
}
