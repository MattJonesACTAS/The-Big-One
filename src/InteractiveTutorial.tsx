/**
 * Interactive Tutorial Component
 * Displays clickable nodes over app screenshots to guide users
 */

import React, { useState, useEffect, useRef } from 'react';

interface TutorialElement {
  id: string;
  x: number;
  y: number;
  number: number;
  title: string;
  description: string;
  // Further pages after `description` (a multi-page note: Next, then Got it on the last)
  // (an entry may be a plain string, or { title, text } to give that page its own heading)
  morePages?: (string | { title: string; text: string })[];
}

interface TutorialScreen {
  title: string;
  nextScreen: string | null;
  elements: TutorialElement[];
}

interface TutorialScreens {
  [key: string]: TutorialScreen;
}

interface InteractiveTutorialProps {
  onTimingNodesComplete?: () => void;
  onCatchupNodeStatusChange?: (screen: string, cleared: boolean) => void;
  catchupStep?: number;
  // Set (to the chosen mode's name) while the "you've chosen ..." page is showing
  modeIntroLabel?: string | null;
  onModeIntroNext?: () => void;
  // The mode being learned, so the setup screens number themselves to match its (shorter or longer) sequence
  mode?: 'log' | 'minimal' | 'elapsed' | null;
  // Back on the very first slide leaves the tutorial
  onExit?: () => void;
  // Bumped by the mode page's Back button: steps back to the last intro slide,
  // so the tutorial moves forward and backward along one line
  introRewind?: number;
}

// EXPERIMENT: true shows each mode's "Learn more" as ONE scrollable page
// (all three sections on it); false goes back to three separate pages
// (What It Does / Limitations / When to Use It, with Next). Same text either way.
const ABOUT_SINGLE_PAGE = true;

// "Learn more" on each mode card: three pages per mode - what it does, its
// limitations, and when to use it. Headings are the section names.
const MODE_ABOUT_PAGES: Record<'log' | 'minimal' | 'elapsed', { title: string; text: string }[]> = {
  minimal: [
    { title: 'What It Does', text: "• Assists you in keeping track of your next rhythm check, next adrenaline dose, and next amiodarone dose.\n\n• Needs little input from you and, if anything, reduces distractions on the job." },
    { title: 'Limitations', text: "• Does not help with your case sheet beyond the times you logged rhythm checks, adrenaline, and amiodarone." },
    { title: 'When to Use It', text: "• Cardiac arrest cases where you only need the timers." },
  ],
  log: [
    { title: 'What It Does', text: "• You create a detailed log of the case in real time.\n\n• Tallies the total doses you log, useful at handover.\n\n• Provides a summary of what you logged, for case sheets." },
    { title: 'Limitations', text: "• Does not track rhythm checks or redosing.\n\n• Requires repeated attention, which could be distracting." },
    { title: 'When to Use It', text: "• Complex non-cardiac arrest jobs (such as PHEA).\n\n• Arrests where you manage the timings yourself.\n\n• Scribing during a sim." },
  ],
  elapsed: [
    { title: 'What It Does', text: "• Combines all the capabilities of 'Timers only' and 'Tx log only' modes." },
    { title: 'Limitations', text: "• Requires practice, as it is the most complex mode.\n\n• Like 'Tx log only', requires repeated attention." },
    { title: 'When to Use It', text: "• Cardiac arrest cases where you want both the timers and a detailed log." },
  ],
};

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ onTimingNodesComplete, onCatchupNodeStatusChange, catchupStep, modeIntroLabel, onModeIntroNext, mode, onExit, introRewind }) => {
  const [currentScreen, setCurrentScreen] = useState('intro1');
  const [exploredElements, setExploredElements] = useState<Set<string>>(new Set());
  // Which notes have been read on each page, so going Back to a page that was
  // already cleared doesn't make anyone read its notes again.
  const readByScreen = useRef<Record<string, string[]>>({});
  const [showingInfoBox, setShowingInfoBox] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<TutorialElement | null>(null);
  const [explanationPage, setExplanationPage] = useState(0);

  const screens: TutorialScreens = {
    intro1: {
      title: 'Welcome',
      nextScreen: 'introWhen',
      elements: [],
    },
    introWhen: {
      title: 'When to Use the App',
      nextScreen: 'intro2',
      elements: [],
    },
    intro2: {
      title: 'Navigating the Tutorial',
      nextScreen: 'timingMethod',
      elements: [],
    },
    patientDetails: {
      title: 'Patient Details',
      nextScreen: null, // progression driven by real catchupStep, not by Next click
      elements: [
        { id: 'patientType', x: 50, y: 50, number: 2, title: 'Patient Type', description: "First you will need to select either adult or paediatric mode, then the patient's weight.",
          morePages: [{ title: "Give it a Go", text: "Make any selection you like, then we'll move onto the next page." }] },
      ],
    },
    previousTreatments: {
      title: 'Previous Treatments',
      nextScreen: null, // progression driven by real catchupStep, not by Next click
      elements: [
        { id: 'previousTx', x: 50, y: 50, number: 3, title: 'Previous Treatments', description: "Next, you will need to enter what treatments (Tx) you've already applied before you opened the app.\n\nThe most common cardiac arrest Tx's are listed front and centre for quick access, but you can add any Tx you like from the full list.",
          morePages: [{ title: "Give it a Go", text: "Add two treatments, then press '{nextButton}'." }] },
      ],
    },
    timingMethod: {
      title: 'App Mode',
      // This page is now where each app mode's own tutorial is chosen (the
      // intro leads straight here), so it no longer steps on to the next
      // screen by itself - the real Next button on the page does that.
      nextScreen: null,
      elements: [
        // The old Getting Started page and the App Mode instruction, combined.
        { id: 'modeChoice', x: 50, y: 50, number: 1, title: 'Getting Started',
          description: "On opening The Big One, you'll need to choose one of three modes.\n\nEach mode has its own tutorial, and it's advised to complete them from top to bottom.\n\nOnce you've seen every mode, it will be up to you to choose which one works best for you.",
          morePages: ["Each mode option has a 'Learn More' button.\n\nClick on these to gain further insight into each mode's capabilities and when it might be most useful.", { title: "Give it a Go", text: "Choose a mode to begin its tutorial." }] },
      ],
    },
    rhythmCheckTiming: {
      title: 'Rhythm Check Timing',
      nextScreen: 'enterElapsedTime',
      elements: [
        { id: 'rhythmCheckTiming', x: 50, y: 50, number: 4, title: 'Rhythm Check Timing', description: "To keep track of when the next rhythm check is due, The Big One uses the 'odds/evens' method.\n\nTo calibrate the app, you will need to enter whether you are performing rhythm checks on odd minutes, even minutes, or halfway in between them.",
          morePages: [{ title: "Give it a Go", text: "Choose an option to continue." }] },
      ],
    },
    enterElapsedTime: {
      title: 'Enter Current Elapsed Time',
      nextScreen: null, // progression is driven by the real catchupStep, not by a Next click
      elements: [
        { id: 'enterElapsedTime', x: 50, y: 50, number: 5, title: 'Enter Current Elapsed Time', description: "You will need to make the app's elapsed timer match the monitor's.",
          morePages: [{ title: "Give it a Go", text: "Enter any time you like to move forward." }] },
      ],
    },
  };

  // The setup screens are numbered as they appear in the chosen mode's own
  // sequence. Tx log & timers and Tx log only match the numbers written on
  // the nodes above; Timers only skips patient details and previous
  // treatments, so its interval and elapsed-time screens are 2 and 3.
  const NUMBER_OVERRIDES: Record<string, number> = mode === 'minimal' ? { rhythmCheckTiming: 2, enterElapsedTime: 3 } : {};
  const rawScreenData = screens[currentScreen];
  const currentScreenData = {
    ...rawScreenData,
    elements: rawScreenData.elements.map(el => NUMBER_OVERRIDES[el.id] != null ? { ...el, number: NUMBER_OVERRIDES[el.id] } : el),
  };
  const requiredElements = new Set(currentScreenData.elements.map(el => el.id));
  const allExplored = Array.from(requiredElements).every(id => exploredElements.has(id));

  // Notify parent when all timing method nodes explored so it can flash the Elapsed Time button
  useEffect(() => {
    if (currentScreen === 'timingMethod' && allExplored && onTimingNodesComplete) {
      onTimingNodesComplete();
    }
  }, [currentScreen, allExplored]);

  // Notify parent whether the current page's node(s) have been cleared, so the
  // real Continue/Next button on that page can be gated until the user has
  // actually read it (timingMethod uses its own onTimingNodesComplete above
  // since the Elapsed Time button there is gated separately).
  useEffect(() => {
    const gatedScreens = ['patientDetails', 'previousTreatments', 'enterElapsedTime'];
    if (gatedScreens.includes(currentScreen) && onCatchupNodeStatusChange) {
      console.log('[TUTORIAL DEBUG] screen:', currentScreen, 'allExplored:', allExplored, 'exploredElements:', Array.from(exploredElements), 'requiredElements:', Array.from(requiredElements));
      onCatchupNodeStatusChange(currentScreen, allExplored);
    }
  }, [currentScreen, allExplored]);

  // Sync internal screen with the real catchup step once we're past the intro pages.
  // Patient Details / Previous Treatments / Timing Method are the real catchup
  // screens underneath, so progression is driven by the user's real taps there,
  // not by an internal 'Next' click.
  useEffect(() => {
    if (catchupStep === undefined) return;
    const stepToScreen: Record<number, string> = { 2: 'patientDetails', 3: 'previousTreatments', 6: 'timingMethod', 7: 'rhythmCheckTiming', 4: 'enterElapsedTime' };
    const targetScreen = stepToScreen[catchupStep];
    const catchupLinkedScreens = ['patientDetails', 'previousTreatments', 'timingMethod', 'rhythmCheckTiming', 'enterElapsedTime'];
    if (targetScreen && catchupLinkedScreens.includes(currentScreen) && currentScreen !== targetScreen) {
      setCurrentScreen(targetScreen);
      setExploredElements(new Set(readByScreen.current[targetScreen] ?? []));
    }
  }, [catchupStep, currentScreen]);

  const handleElementClick = (element: TutorialElement) => {
    setActiveExplanation(element);
    setExplanationPage(0);
    if (!element.morePages?.length) markRead(element.id);
    setShowingInfoBox(true);
  };

  const markRead = (id: string) => {
    readByScreen.current[currentScreen] = Array.from(new Set([...(readByScreen.current[currentScreen] ?? []), id]));
    setExploredElements(prev => new Set([...prev, id]));
  };

  const handleCloseExplanation = () => {
    // Closing a multi-page note only counts as reading it from its last page
    if (activeExplanation?.morePages?.length && explanationPage === activeExplanation.morePages.length) {
      markRead(activeExplanation.id);
    }
    setActiveExplanation(null);
    setShowingInfoBox(false);
    setExplanationPage(0);
  };

  // The mode page (where the tutorial really sits after the intro slides)
  // asks to go back: show the last intro slide again.
  const lastRewind = useRef(introRewind ?? 0);
  useEffect(() => {
    const n = introRewind ?? 0;
    if (n !== lastRewind.current) {
      lastRewind.current = n;
      setCurrentScreen('intro2');
    }
  }, [introRewind]);

  // Back through the intro slides: Welcome's Back leaves the tutorial
  const handleIntroBack = () => {
    if (currentScreen === 'intro1') onExit?.();
    else if (currentScreen === 'introWhen') setCurrentScreen('intro1');
    else if (currentScreen === 'intro2') setCurrentScreen('introWhen');
  };

  const handleNext = () => {
    if (currentScreenData.nextScreen) {
      setCurrentScreen(currentScreenData.nextScreen);
      setExploredElements(new Set(readByScreen.current[currentScreenData.nextScreen] ?? [])); // notes already read on that page stay read
    }
  };

  return (
    <div data-tutorial-ui="true" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: ['intro1', 'introWhen', 'intro2', 'intro3', 'patientDetails', 'previousTreatments', 'timingMethod', 'rhythmCheckTiming', 'enterElapsedTime', 'home1', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'transparent' : '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: ['intro1', 'introWhen', 'intro2', 'intro3', 'patientDetails', 'previousTreatments', 'timingMethod', 'rhythmCheckTiming', 'enterElapsedTime', 'home1', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'stretch' : 'center',
      justifyContent: ['intro1', 'introWhen', 'intro2', 'intro3', 'patientDetails', 'previousTreatments', 'timingMethod', 'rhythmCheckTiming', 'enterElapsedTime', 'home1', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? 'stretch' : 'center',
      padding: ['intro1', 'introWhen', 'intro2', 'intro3', 'patientDetails', 'previousTreatments', 'timingMethod', 'rhythmCheckTiming', 'enterElapsedTime', 'home1', 'addTxMenu', 'adrenalineDose', 'home2', 'home2_summary', 'home2_close', 'summary', 'caseSummary'].includes(currentScreen) ? '0' : '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 9999,
      overflowY: 'auto',
      pointerEvents: ['timingMethod', 'rhythmCheckTiming', 'patientDetails', 'previousTreatments', 'enterElapsedTime'].includes(currentScreen) ? 'none' : 'auto',
    }}>
      {/* Render static components for non-catchup screens only */}
      
      {/* Intro pages: dark overlay over the live catchup behind */}
      {(currentScreen === 'intro1' || currentScreen === 'introWhen' || currentScreen === 'intro2') && (
        <div data-tutorial-ui="true" style={{
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
            maxHeight: '100%',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '16px' }}>
              {currentScreen === 'intro1' && 'Welcome!'}
              {currentScreen === 'introWhen' && 'When to Use the App'}
              {currentScreen === 'intro2' && 'Navigating the Tutorial'}
            </h2>
            {renderIntroDescription(
              currentScreen === 'intro1'
                ? "The Big One is a cognitive aid for use during cardiac arrests or any other big job.\n\nIt is designed to assist you to keep track of:\n\n• Rhythm check intervals\n\n• Medication re-dosing intervals\n\n• The times events occurred, making case sheets easy and accurate\n\nBy offloading this cognitive load, you can focus on situational awareness and team leadership."
                : currentScreen === 'introWhen'
                ? "Imagine you're first on scene to a cardiac arrest or another complex job that will require multiple crews.\n\nYou perform the initial necessary interventions, then eventually more crews arrive.\n\nYou then take a step back, assume the role of Team Leader, assign roles to other crew members, and go hands off for the rest of the case.\n\nThat is when The Big One can be used."
                : "In this tutorial you'll see red numbered icons hovering over different elements of the app.\n\nClick on the icons to learn about these features.\n\nYou'll need to clear all icons and complete any instructions to progress through the tutorial."
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleIntroBack}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
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
        </div>
      )}

      {/* Once a mode has been chosen: what comes next. Same look as the intro pages.
          ("Learn more" on the mode cards is ModeAboutSlide, below, which the real
          app's mode page uses as well.) */}
      {modeIntroLabel && (
        <div data-tutorial-ui="true" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '320px',
            width: '85%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            maxHeight: '100%',
            overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '16px' }}>
              Calibration
            </h2>
            {renderIntroDescription(`You've chosen '${modeIntroLabel}' mode.\n\nNext, you'll need to calibrate the app to the current case.`)}
            <button
              onClick={onModeIntroNext}
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
              transform: 'translate(-50%, -50%)',
              width: '50px',
              height: '50px',
              cursor: 'pointer',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: 'white',
              animation: 'nodeBreath 2s ease-in-out infinite',
            }}>
              {element.number}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes nodeBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

      {activeExplanation && (
        <div
          onClick={handleCloseExplanation}
          data-tutorial-ui="true"
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
              maxHeight: '100%',
              overflowY: 'auto',
            }}
          >
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a1a1a',
              textAlign: 'center',
            }}>
              {(() => { const pg = explanationPage > 0 ? activeExplanation.morePages![explanationPage - 1] : null; const t = (pg && typeof pg !== 'string' && pg.title) ? pg.title : activeExplanation.title; return t.charAt(0).toUpperCase() + t.slice(1); })()}
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#444',
              textAlign: 'left',
              whiteSpace: 'pre-line',
            }}>
              {renderWithItalics((explanationPage === 0 ? activeExplanation.description : (() => { const pg = activeExplanation.morePages![explanationPage - 1]; return typeof pg === 'string' ? pg : pg.text; })()).replace('{nextButton}', mode === 'log' ? 'Start Case' : 'Next'))}
            </p>
            {activeExplanation.morePages?.length ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                {[0, ...activeExplanation.morePages.map((_, i) => i + 1)].map(i => (
                  <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === explanationPage ? '#10b981' : '#d1d5db' }} />
                ))}
              </div>
            ) : null}
            <button
              onClick={() => (activeExplanation.morePages?.length && explanationPage < activeExplanation.morePages.length)
                ? setExplanationPage(explanationPage + 1)
                : handleCloseExplanation()}
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
              {activeExplanation.morePages?.length && explanationPage < activeExplanation.morePages.length ? 'Next' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Plain dot points under a subheading (no grey box), with a hanging indent so
// wrapped lines line up under the text rather than under the dot.
function renderPlainBullets(text: string) {
  const items = text.split('\n\n').map(t => t.replace(/^•\s*/, ''));
  return (
    <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', color: '#555', fontSize: '16px', lineHeight: '1.6', textAlign: 'left' }}>
      {items.map((t, i) => (
        <li key={i} style={{ marginBottom: i < items.length - 1 ? '0.4em' : 0 }}>{renderWithItalics(t)}</li>
      ))}
    </ul>
  );
}

// "Learn more" on a mode card. Used by the mode page in the tutorial AND in
// the real app, so it lives here as its own component. Opens over everything;
// "Got it" just closes it, leaving the card as it was.
export function ModeAboutSlide({ mode, onClose }: { mode: 'log' | 'minimal' | 'elapsed'; onClose: () => void }) {
  const pages = MODE_ABOUT_PAGES[mode];
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = scrollRef.current;
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };
  useEffect(() => {
    setPage(0);
    const t = window.setTimeout(check, 50);
    return () => window.clearTimeout(t);
  }, [mode]);
  const buttonStyle: React.CSSProperties = {
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
    flexShrink: 0,
  };
  return (
    <div data-tutorial-ui="true" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 10000,
      pointerEvents: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '320px',
        width: '85%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        maxHeight: '100%',
        overflowY: 'auto',
        ...(ABOUT_SINGLE_PAGE ? { display: 'flex', flexDirection: 'column' as const, overflowY: 'hidden' as const } : {}),
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
          {ABOUT_SINGLE_PAGE ? 'Learn More' : pages[page].title}
        </h2>
        {ABOUT_SINGLE_PAGE ? (
          <>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '14px' }}>
              <div ref={scrollRef} onScroll={check} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {pages.map((pg, i, all) => (
                  <div key={i} style={{ marginBottom: i < all.length - 1 ? '18px' : 0 }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 6px 0' }}>{pg.title}</h3>
                    {renderPlainBullets(pg.text)}
                  </div>
                ))}
              </div>
              {more && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '36px', pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(255,255,255,0), #ffffff)' }} />
              )}
            </div>
            <button onClick={onClose} style={buttonStyle}>Got It</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>{renderPlainBullets(pages[page].text)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
              {pages.map((_, i) => (
                <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === page ? '#10b981' : '#d1d5db' }} />
              ))}
            </div>
            <button onClick={() => (page < pages.length - 1 ? setPage(page + 1) : onClose())} style={buttonStyle}>
              {page < pages.length - 1 ? 'Next' : 'Got It'}
            </button>
          </>
        )}
      </div>
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
    <div style={{ color: '#555', marginBottom: '20px', lineHeight: '1.6', textAlign: 'left', fontSize: '16px' }}>
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
            {renderWithItalics(group.items[0])}
          </p>
        );
      })}
    </div>
  );
}

export default InteractiveTutorial;
