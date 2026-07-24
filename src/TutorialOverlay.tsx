/**
 * TutorialOverlay - Global sequential tutorial nodes with multi-page support
 */

import React, { useState, useEffect, useRef } from 'react';

interface NodePage {
  title: string;
  description: string;
}

interface GlobalNode {
  id: string;
  type: 'popup' | 'positioned';
  x?: number;
  y?: number;
  displayNumber?: number;
  pages: NodePage[];
  condition?: (appState: any, isShockForced?: boolean, initialPatientWeight?: number | null) => boolean;
}

const RAW_NODES: Omit<GlobalNode, 'displayNumber'>[] = [
  // --- Home screen nodes ---
  {
    id: 'homeIntro', type: 'popup',
    pages: [{ title: 'Home Page', description: "You've now made it to the home page for your case, let's take a look around." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'timer', type: 'positioned', x: 50, y: 52,
    pages: [
      {
        title: 'Elapsed Timer',
        description: "Earlier we chose 'Time keeping assistance' as our app mode.\n\nNow we have the elapsed case time available right in front of us, mirroring the monitor's.\n\nThis can be particularly useful when:\n\n• You're working in cramped spaces where equipment positioning is tight\n\n• You're extricating with the Corpuls running and the monitor is packaged with the patient."
      },
      {
        title: 'No Timer Option',
        description: "If you had selected the 'No timer' option instead, the app would only help you keep a log of interventions you apply during the case.\n\nIt would not assist you to keep track of rhythm checks."
      }
    ],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'recalibrate', type: 'positioned', x: 25.4, y: 4.2,
    pages: [{ title: 'Recalibrate Button', description: "The recalibrate button allows you to change how the app functions.\n\nHere you can:\n\n• Fine tune the elapsed timer if you didn't get it quite right\n\n• Change the patient's weight\n\n• Change time keeping method\n\nChange the patient's weight to move forward." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  {
    id: 'tabs', type: 'positioned', x: 50, y: 10.97,
    pages: [{ title: 'Checklists', description: 'Quick access to checklists for:\n\n• Reversible causes of arrest\n\n• ROSC\n\n• Prehospital emergency anaesthesia (PHEA)\n\n• Vital signs survey\n\nYou will notice the reversibles checklist is already flashing red. That is a visual cue to encourage purposeful addressing of these early.' }],
    condition: (s, sf, initialWeight) => s.running && s.currentOverlay === null && !sf && initialWeight != null && s.patientWeight !== initialWeight
  },
  {
    id: 'addTxBtn', type: 'positioned', x: 74.65, y: 95.29,
    pages: [{ title: 'Add Treatment Button', description: 'This opens the treatments (Tx) menu for logging interventions in real time.\n\nPress the \u2018+ Add Tx\u2019 button so we can log our first Tx.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  // --- Treatment screen ---
  {
    id: 'addTxSubmenu', type: 'positioned', x: 50, y: 36.08,
    pages: [
      {
        title: 'Add Tx Submenu',
        description: "The Add Tx submenu has four categories of treatments you can log:\n\n• Rhythm Check (shocks and disarms)\n\n• Medications\n\n• Airway\n\n• Other Tx\n\nYou can also free type custom interventions."
      },
      {
        title: 'Medications',
        description: "All medications will have one or more dosage options to choose from for different indications.\n\nThese dosages are pre-calculated if they are weight based.\n\nLog an adrenaline push dose to progress."
      }
    ],
    condition: (s, sf) => s.currentOverlay === 'treatment' && !sf
  },
  // --- Home with medication alerts ---
  {
    id: 'adrenalineAlert', type: 'positioned', x: 28.05, y: 83.32,
    pages: [{ title: 'Medication Alerts', description: 'When you log adrenaline or amiodarone, an alert will appear on the home screen to help you keep track of when the next dose is due.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.length > 0 && !sf
  },
  {
    id: 'summaryBtn', type: 'positioned', x: 26.6, y: 95.4,
    pages: [{ title: 'Summary Button', description: "Next, let's have a look at the running case summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.length > 0 && !sf
  },
  // --- Summary overlay ---
  {
    id: 'summaryInfo', type: 'positioned', x: 50, y: 50,
    pages: [
      {
        title: 'Arrest Summary',
        description: 'The top of the running summary lists the number of CPR rounds, along with the number of shocks and disarms.'
      },
      {
        title: 'Vital Signs Survey',
        description: "Next, we have the vital signs survey.\n\nAny vital signs entered via the VSS tab will appear here for quick reference during the case and at handover."
      },
      {
        title: 'Pharma Summary',
        description: 'Next, we have the pharmacological summary, which lists all logged medications with a cumulative tally of the total dose given of each drug.'
      },
      {
        title: 'Treatment Log',
        description: "At the bottom we have a chronological record of all logged interventions.\n\nTimestamps show the time of day and how long ago each Tx was logged."
      },
      {
        title: 'Editing Treatments',
        description: "Treatments in the Tx log can be deleted or reordered by pressing the button with three dots to the left of the treatment name.\n\nMoving a Tx is useful if you realise partway through a case that something was actually given a bit earlier or later than when you logged it - for example, remembering a dose given a few minutes ago that you hadn't recorded at the time.\n\nMove or delete the Adrenaline push entry you added earlier to continue."
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'closeOverlay', type: 'positioned', x: 26.6, y: 95.4,
    pages: [{ title: 'Return to Home', description: 'Press the close button to return to the home page.' }],
    condition: (s) => s.currentOverlay === 'summary'
      && (!s.treatments.some(t => t.name.startsWith('Adrenaline push'))
          || s.treatments.some(t => t.name.startsWith('Adrenaline push') && t.timeUnknown))
  },
  // --- Home after summary ---
  {
    id: 'endCase', type: 'positioned', x: 75.22, y: 4.2,
    pages: [{ title: 'End Case Button', description: "When you've either stopped resuscitative efforts or handed your patient over at hospital, you can end the case.\n\nLet's end the case and see the final summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && !sf
  },
  // --- Case summary ---
  {
    id: 'finalStats', type: 'positioned', x: 50, y: 61.64,
    pages: [{ title: 'Final Case Data', description: 'Now the case is over, the treatment log shows times to the second, not just to the minute.' }],
    condition: (s) => !s.running
  },
  {
    id: 'export', type: 'positioned', x: 27.23, y: 14.45,
    pages: [{ title: 'Export PDF', description: 'Here you can export the case summary and Tx log to a PDF, which you can then download or email for later review.' }],
    condition: (s) => !s.running
  },
  {
    id: 'delete', type: 'positioned', x: 73.46, y: 14.45,
    pages: [{ title: 'Close Case', description: "Once you've finished with this case, you can close the case which resets the app.\n\nThe three most recent closed cases are accessible on the opening screen if you want to look back on them later - but since this is just the tutorial, this particular case won't be saved.\n\nClose the case to finish the tutorial and we'll see you at The Big One!" }],
    condition: (s) => !s.running
  }
];

// displayNumber is derived automatically from array position rather than
// hand-typed on each node, so adding/removing/reordering a node can never
// silently produce a duplicate or skipped number again. Only 'positioned'
// nodes get a visible number (popups like homeIntro don't).
// BASE_TUTORIAL_NUMBER is the last number used by InteractiveTutorial.tsx's
// catchup-flow nodes (Patient Type=1 ... Enter Current Elapsed Time=6) — this
// picks up right after that.
const BASE_TUTORIAL_NUMBER = 6;
let positionedCount = 0;
const ALL_NODES: GlobalNode[] = RAW_NODES.map(node => {
  if (node.type !== 'positioned') return node;
  positionedCount += 1;
  return { ...node, displayNumber: BASE_TUTORIAL_NUMBER + positionedCount };
});

interface Props {
  appState: any;
  isShockForced?: boolean;
  onExit: () => void;
  onNodeChange?: (globalNodeIndex: number, tutorialDone: boolean) => void;
  isCaseClosed?: boolean;
  globalNodeIndex?: number;
}

export default function TutorialOverlay({ appState, isShockForced, onExit, onNodeChange, isCaseClosed, globalNodeIndex: externalNodeIndex = 0 }: Props) {
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

  const inRhythmCheckWindow = appState.running && isShockForced;

  const conditionMet = !inRhythmCheckWindow && currentNode
    ? (currentNode.condition ? currentNode.condition(appState, isShockForced, initialWeightRef.current) : true)
    : false;

  // Auto-show popup when condition met
  useEffect(() => {
    if (currentNode?.type === 'popup' && conditionMet && !activePopup) {
      setActivePopup(currentNode);
      setCurrentPageIndex(0);
      setPageAnimKey(k => k + 1);
    }
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>

      {/* Dark backdrop */}
      {showDarkOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9999, pointerEvents: 'auto'
        }} />
      )}

      {/* Positioned node circle */}
      {currentNode?.type === 'positioned' && conditionMet && !activePositioned && !tutorialDone && (
        <div
          onClick={handleNodeClick}
          style={{
            position: 'absolute',
            left: `${currentNode.x}%`, top: `${currentNode.y}%`,
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
          overflow: 'hidden'
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
            {isLastPage ? 'Got it' : 'Next'}
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
