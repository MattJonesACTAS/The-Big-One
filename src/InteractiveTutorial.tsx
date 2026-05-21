/**
 * Interactive Tutorial Component
 * Displays clickable nodes over app screenshots to guide users
 */

import React, { useState, useEffect } from 'react';

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
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ onClose }) => {
  const [currentScreen, setCurrentScreen] = useState('intro1');
  const [exploredElements, setExploredElements] = useState<Set<string>>(new Set());
  const [activeExplanation, setActiveExplanation] = useState<TutorialElement | null>(null);

  const screens: TutorialScreens = {
    intro1: {
      title: 'Welcome to The Big One',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      nextScreen: 'intro2',
      elements: [],
    },
    intro2: {
      title: 'Getting Started',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      nextScreen: 'home1',
      elements: [],
    },
    home1: {
      title: 'CPR Timer Home Screen',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      nextScreen: 'home1_addTx',
      elements: [
        { id: 'totalTime', x: 19.8, y: 22, number: 1, title: 'Total Time', description: "Total time the monitor has been turned on" },
        { id: 'cprRound', x: 80.2, y: 22, number: 2, title: 'CPR Round', description: "The current round of CPR" },
        { id: 'timer', x: 50, y: 52, number: 3, title: 'Rhythm Check Timer', description: "The countdown to the next rhythm check. When the timer reaches 0:00, it pauses for 6 seconds to allow for the rhythm check, then restarts from 2:00." },
        { id: 'pause', x: 19.0, y: 4.2, number: 4, title: 'Pause Button', description: "Pause and resume the rhythm check timer" },
        { id: 'recalibrate', x: 51.0, y: 4.2, number: 5, title: 'Recalibrate Button', description: "The app estimates a rhythm check of 6 seconds. Recalibrate the timer to match reality if your rhythm checks are longer." },
        { id: 'tabs', x: 50, y: 10.75, number: 6, title: 'Checklists', description: "Quick access to checklists for the reversible causes of arrest, ROSC and Prehospital emergency anaesthesia (PHEA)" },
      ],
    },
    home1_addTx: {
      title: 'Add Treatment Navigation',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/1.png?raw=true',
      nextScreen: 'addTxMenu',
      elements: [
        { id: 'addTxBtn', x: 75, y: 95.4, number: 1, title: 'Add Treatment Button', description: "Let's look at the Add Tx button first" },
      ],
    },
    addTxMenu: {
      title: 'Add Treatment Menu',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/2.png?raw=true',
      nextScreen: 'adrenalineDose',
      elements: [
        { id: 'addTxSubmenu', x: 50, y: 45.9, number: 1, title: 'Add Tx submenu', description: "After pressing the Add Tx button, you will be brought to a submenu containing multiple kinds of treatments you can log" },
      ],
    },
    adrenalineDose: {
      title: 'Adrenaline Dosing',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/4.png?raw=true',
      nextScreen: 'home2',
      elements: [
        { id: 'medications', x: 53.2, y: 44.2, number: 1, title: 'Medications', description: "Each medication will bring up one or multiple age/weight based dosage options depending on the indication. Custom doses can also be added. Let's log adrenaline and amiodarone." },
      ],
    },
    home2: {
      title: 'Medication Alerts',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'home2_summary',
      elements: [
        { id: 'adrenalineAlert', x: 28.4, y: 82.82, number: 1, title: 'Medication alerts', description: "When you log adrenaline or amiodarone, an alert will appear on the home screen to help you keep track of when the next dose is due." },
      ],
    },
    home2_summary: {
      title: 'Summary Navigation',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'summary',
      elements: [
        { id: 'summaryBtn', x: 26.6, y: 95.4, number: 1, title: 'Summary Button', description: "Next, let's have a look at the running case summary page" },
      ],
    },
    summary: {
      title: 'Active Case Summary',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/6.png?raw=true',
      nextScreen: 'home2_close',
      elements: [
        { id: 'pharmaSummary', x: 50, y: 50, number: 1, title: 'Medication Summary', description: "All medications logged will appear here, with an accumulative tally of the total amount of each drug given." },
        { id: 'treatmentLog', x: 50, y: 70.9, number: 2, title: 'Treatment Log', description: "Chronological record of all logged interventions. Timestamps show the exact time, the elapsed time on the monitor, and how long ago each Tx was logged." },
      ],
    },
    home2_close: {
      title: 'Close Case Navigation',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/5.png?raw=true',
      nextScreen: 'caseSummary',
      elements: [
        { id: 'close', x: 82.2, y: 4.2, number: 1, title: 'Close Button', description: "Let's say we've either stopped resuscitative efforts or we've handed our patient over at hospital. We can now close the case." },
      ],
    },
    caseSummary: {
      title: 'Closed Case Summary',
      image: 'https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/8.png?raw=true',
      nextScreen: null,
      elements: [
        { id: 'finalStats', x: 50, y: 61.64, number: 1, title: 'Final Case Data', description: "Now the case is over, the treatment log shows times to the second, not just to the minute" },
        { id: 'export', x: 27, y: 14, number: 2, title: 'Export PDF', description: "Export the case summary and Tx log to a pdf, which you can then email for later review." },
        { id: 'delete', x: 73, y: 14, number: 3, title: 'Delete Case', description: "Permanently delete the case information from the app" },
      ],
    },
  };

  const currentScreenData = screens[currentScreen];
  const requiredElements = new Set(currentScreenData.elements.map(el => el.id));
  const allExplored = Array.from(requiredElements).every(id => exploredElements.has(id));

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
  };

  const handleCloseExplanation = () => {
    setActiveExplanation(null);
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
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      zIndex: 9999,
      overflowY: 'auto',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#000',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <img
          src={currentScreenData.image}
          alt={currentScreenData.title}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />

        {/* Intro message boxes for intro1 and intro2 screens */}
        {(currentScreen === 'intro1' || currentScreen === 'intro2') && (
          <div style={{
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
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '85%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{
                color: '#1a1a1a',
                fontSize: '16px',
                lineHeight: '1.6',
                textAlign: 'center',
                marginBottom: '20px',
              }}>
                {currentScreen === 'intro1' && 
                  "The Big One is a tool that you can use when acting as the team leader during cardiac arrest cases to help you stay on top of everything."
                }
                {currentScreen === 'intro2' && 
                  "On opening the app, you'll need to enter some times from the monitor and details about the patient. You'll then be brought to the home screen."
                }
              </div>
              
              {/* Next button at bottom of box */}
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
        `}</style>
      </div>

      {/* Next button - centered bottom with pulsing animation (for non-intro screens) */}
      {allExplored && currentScreenData.nextScreen && currentScreen !== 'intro1' && currentScreen !== 'intro2' && (
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
              lineHeight: '1.5',
              color: '#444',
              textAlign: 'center',
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

export default InteractiveTutorial;
