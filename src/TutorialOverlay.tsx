/**
 * TutorialOverlay - Global sequential tutorial nodes with multi-page support
 */

import React, { useState, useEffect } from 'react';

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
  condition?: (appState: any, isShockForced?: boolean) => boolean;
}

const ALL_NODES: GlobalNode[] = [
  // --- Intro (3 pages) ---
  {
    id: 'intro', type: 'popup',
    pages: [
      {
        title: 'Welcome!',
        description: 'The Big One is a cognitive aid for use during cardiac arrests.\n\nWith times and medications tracked automatically, you can focus on situational awareness and team leadership.'
      },
      {
        title: 'Getting Started',
        description: "On opening The Big One, you'll need to calibrate the app by entering:\n\n• Adult or paediatric patient\n\n• Estimated patient weight\n\n• The interventions that have already been applied\n\n• The elapsed case time on the monitor\n\n• The time shown on the monitor's CPR count down\n\nYou'll then be brought to the home screen which we'll look at first."
      },
      {
        title: 'Navigating the Tutorial',
        description: "In this tutorial you'll see blue numbered icons hovering over different elements of the app.\n\nClick on the icons to learn about these features.\n\nYou'll need to clear all icons and complete any instructions to progress through the tutorial."
      }
    ],
    condition: (s) => s.running && s.currentOverlay === null
  },
  // --- Home screen nodes ---
  {
    id: 'totalTime', type: 'positioned', x: 19.8, y: 22, displayNumber: 1,
    pages: [{ title: 'Total Time', description: "The total time indicates how long ago the monitor was turned on.\n\nDuring opening configuration, you will be prompted to extract this time from the monitor and enter it into the app.\n\nYou'll find this time in the top right corner of the monitor screen." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'cprRound', type: 'positioned', x: 80.2, y: 22, displayNumber: 2,
    pages: [{ title: 'CPR Round', description: "The current round of CPR.\n\nThe CPR round counter will update every time the rhythm check counter reaches 0:00." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'timer', type: 'positioned', x: 50, y: 52, displayNumber: 3,
    pages: [
      {
        title: 'Rhythm Check Timer',
        description: "The countdown to the next rhythm check.\n\nDuring opening configuration, you will be prompted to extract this time from the monitor and enter it into the app.\n\nYou'll find this time counting down from 2:00 in its own central banner on the monitor screen."
      },
      {
        title: 'Timer Behaviour',
        description: "When the timer reaches 00:10 you will be forced back to the home screen so that you don't miss the rhythm check.\n\nWhen the timer reaches 0:00, it allows 6 seconds for the rhythm check, then restarts from 2:00.\n\nYou will then be forced to record whether you shocked or disarmed."
      }
    ],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'pause', type: 'positioned', x: 19.0, y: 4.2, displayNumber: 4,
    pages: [{ title: 'Pause Button', description: 'Pause and resume the rhythm check timer.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'recalibrate', type: 'positioned', x: 51.0, y: 4.2, displayNumber: 5,
    pages: [{ title: 'Recalibrate Button', description: 'The app estimates a rhythm check of 6 seconds.\n\nRecalibrate the timer if your last rhythm check was longer.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'tabs', type: 'positioned', x: 50, y: 10.75, displayNumber: 6,
    pages: [{ title: 'Checklists', description: 'Quick access to checklists for:\n\n• Reversible causes of arrest\n\n• ROSC\n\n• Prehospital emergency anaesthesia (PHEA)' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'addTxBtn', type: 'positioned', x: 75, y: 95.4, displayNumber: 7,
    pages: [{ title: 'Add Treatment Button', description: 'This opens the treatments (Tx) menu for logging interventions in real time.\n\nPress the \u2018+ Add Tx\u2019 button so we can log our first Tx.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  // --- Treatment screen (2 pages) ---
  {
    id: 'addTxSubmenu', type: 'positioned', x: 50, y: 40, displayNumber: 1,
    pages: [
      {
        title: 'Add Tx Submenu',
        description: "The Add Tx submenu has four categories of treatments you can log:\n\n• Rhythm Check (shocks and disarms)\n\n• Medications\n\n• Airway\n\n• Other Tx\n\nYou can also free type custom interventions."
      },
      {
        title: 'Medications',
        description: "All medications will have one or more dosage options to choose from for different indications.\n\nThese dosages are pre-calculated if they are weight based.\n\nLog a 1mg adrenaline push to progress."
      }
    ],
    condition: (s, sf) => s.currentOverlay === 'treatment' && !sf
  },
  // --- Home with medication alerts ---
  {
    id: 'adrenalineAlert', type: 'positioned', x: 28.4, y: 82.82, displayNumber: 1,
    pages: [{ title: 'Medication alerts', description: 'When you log adrenaline or amiodarone, an alert will appear on the home screen to help you keep track of when the next dose is due.' }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.length > 0 && s.rhythmCheckOvertime === 0 && !sf
  },
  {
    id: 'summaryBtn', type: 'positioned', x: 26.6, y: 95.4, displayNumber: 2,
    pages: [{ title: 'Summary Button', description: "Next, let's have a look at the running case summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.treatments.length > 0 && s.rhythmCheckOvertime === 0 && !sf
  },
  // --- Summary overlay (3-page node + close) ---
  {
    id: 'summaryInfo', type: 'positioned', x: 50, y: 50, displayNumber: 1,
    pages: [
      {
        title: 'Arrest Summary',
        description: 'The top of the running summary lists the number of CPR rounds, along with the number of shocks and disarms.'
      },
      {
        title: 'Pharma Summary',
        description: 'In the middle, the pharma summary lists all logged medications, with a cumulative tally of the total dose given of each drug.'
      },
      {
        title: 'Treatment Log',
        description: 'At the bottom we have a chronological record of all logged interventions.\n\nTimestamps show the time of day, the elapsed time on the monitor, and how long ago each Tx was logged.'
      }
    ],
    condition: (s) => s.currentOverlay === 'summary'
  },
  {
    id: 'closeOverlay', type: 'positioned', x: 26.6, y: 95.4, displayNumber: 2,
    pages: [{ title: 'Return to Home', description: 'Press the close button to return to the home page.' }],
    condition: (s) => s.currentOverlay === 'summary'
  },
  // --- Home after summary ---
  {
    id: 'closeCase', type: 'positioned', x: 82.2, y: 4.2, displayNumber: 1,
    pages: [{ title: 'Close Case Button', description: "When you've either stopped resuscitative efforts or handed your patient over at hospital, you can close the case.\n\nLet's close the case and see the final summary page." }],
    condition: (s, sf) => s.running && s.currentOverlay === null && s.rhythmCheckOvertime === 0 && !sf
  },
  // --- Case summary ---
  {
    id: 'finalStats', type: 'positioned', x: 50, y: 61.64, displayNumber: 1,
    pages: [{ title: 'Final Case Data', description: 'Now the case is over, the treatment log shows times to the second, not just to the minute.' }],
    condition: (s) => !s.running
  },
  {
    id: 'export', type: 'positioned', x: 27, y: 14, displayNumber: 2,
    pages: [{ title: 'Export PDF', description: 'Here you can export the case summary and Tx log to a PDF, which you can then download or email for later review.' }],
    condition: (s) => !s.running
  },
  {
    id: 'delete', type: 'positioned', x: 73, y: 14, displayNumber: 3,
    pages: [{ title: 'Delete Case', description: "Once you've finished with the case and exported to PDF if needed, you can delete all case data.\n\nDelete the case to finish the tutorial." }],
    condition: (s) => !s.running
  }
];

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

  const globalNodeIndex = externalNodeIndex;
  const tutorialDone = globalNodeIndex >= ALL_NODES.length;

  const advanceNode = () => {
    const newVal = internalNodeIndex + 1;
    setInternalNodeIndex(newVal);
    if (onNodeChange) onNodeChange(newVal, newVal >= ALL_NODES.length);
  };

  const currentNode = tutorialDone ? null : ALL_NODES[globalNodeIndex];

  const inRhythmCheckWindow = appState.running && (
    isShockForced || appState.rhythmCheckOvertime > 0
  );

  const conditionMet = !inRhythmCheckWindow && currentNode
    ? (currentNode.condition ? currentNode.condition(appState, isShockForced) : true)
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
        <button
          onClick={handleNodeClick}
          style={{
            position: 'absolute',
            left: `${currentNode.x}%`, top: `${currentNode.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '50px', height: '50px', borderRadius: '50%',
            backgroundColor: '#3b82f6', color: 'white',
            fontSize: '20px', fontWeight: '700', border: 'none',
            cursor: 'pointer', zIndex: 10001, pointerEvents: 'auto',
            animation: 'tutorialPulse 2s infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {currentNode.displayNumber}
        </button>
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
        @keyframes tutorialPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        }
        @keyframes slideInPage {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function renderDescription(text: string) {
  const segments = text.split('\n\n');

  // Group consecutive bullets into arrays, non-bullets stay as single items
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
    <div style={{ color: '#666', marginBottom: '24px', lineHeight: '1.5', textAlign: 'left' }}>
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
                  {bullet}
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
            {group.items[0]}
          </p>
        );
      })}
    </div>
  );
}
