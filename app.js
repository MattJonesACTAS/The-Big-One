// === STATE ===
let state = {
  running: false,
  startTime: null,
  pausedTime: 0,
  elapsedSeconds: 0,
  rhythmCheckTarget: 120, // 2 minutes
  cprRound: 1,
  shocks: 0,
  treatments: [],
  currentOverlay: null
};

// === ELEMENTS ===
const el = {
  mainTimer: document.getElementById('mainTimer'),
  totalElapsed: document.getElementById('totalElapsed'),
  cprRound: document.getElementById('cprRound'),
  adrWarning: document.getElementById('adrWarning'),
  mainDisplay: document.getElementById('mainDisplay'),
  centralBox: document.getElementById('centralBox'),
  
  overlays: {
    reversibles: document.getElementById('overlayReversibles'),
    rosc: document.getElementById('overlayRosc'),
    phea: document.getElementById('overlayPhea'),
    summary: document.getElementById('overlaySummary'),
    treatment: document.getElementById('overlayTreatment')
  },
  
  buttons: {
    reversibles: document.getElementById('btnReversibles'),
    rosc: document.getElementById('btnRosc'),
    phea: document.getElementById('btnPhea'),
    summary: document.getElementById('btnSummary'),
    addTx: document.getElementById('btnAddTx'),
    pause: document.getElementById('btnPause'),
    reset: document.getElementById('btnReset')
  }
};

// === OVERLAY SYSTEM ===
const topOverlays = ['reversibles', 'rosc', 'phea'];
const bottomOverlays = ['summary', 'treatment'];

function showOverlay(name) {
  // If clicking same overlay, close it
  if (state.currentOverlay === name) {
    closeOverlay();
    return;
  }
  
  // Hide main display
  el.mainDisplay.style.visibility = 'hidden';
  
  // Handle old overlay
  if (state.currentOverlay) {
    const oldOverlay = el.overlays[state.currentOverlay];
    const oldBtn = el.buttons[state.currentOverlay];
    
    // Keep it visible briefly while new one slides over
    setTimeout(() => {
      oldOverlay.style.display = 'none';
      oldBtn.classList.remove('active');
      if (oldBtn.id !== 'btnAddTx') {
        oldBtn.textContent = oldBtn.id.replace('btn', '').replace(/([A-Z])/g, ' $1').trim();
      } else {
        oldBtn.textContent = 'Add Tx';
      }
    }, 150);
  }
  
  // Show new overlay with animation
  const overlay = el.overlays[name];
  const btn = el.buttons[name];
  
  overlay.classList.remove('slide-out-up', 'slide-out-down');
  
  if (topOverlays.includes(name)) {
    overlay.classList.add('slide-in-down');
  } else {
    overlay.classList.add('slide-in-up');
  }
  
  overlay.style.display = 'block';
  btn.classList.add('active');
  btn.textContent = 'Close';
  
  state.currentOverlay = name;
}

function closeOverlay() {
  if (!state.currentOverlay) return;
  
  const overlay = el.overlays[state.currentOverlay];
  const btn = el.buttons[state.currentOverlay];
  const isTop = topOverlays.includes(state.currentOverlay);
  
  // Remove slide-in, add slide-out
  overlay.classList.remove('slide-in-down', 'slide-in-up');
  overlay.classList.add(isTop ? 'slide-out-up' : 'slide-out-down');
  
  // Wait for animation, then hide
  overlay.addEventListener('animationend', function hideAfterAnim() {
    overlay.style.display = 'none';
    overlay.classList.remove('slide-out-up', 'slide-out-down');
    overlay.removeEventListener('animationend', hideAfterAnim);
  }, { once: true });
  
  // Reset button
  btn.classList.remove('active');
  if (btn.id === 'btnAddTx') {
    btn.textContent = 'Add Tx';
  } else if (btn.id === 'btnSummary') {
    btn.textContent = 'Running summary';
  } else {
    btn.textContent = btn.id.replace('btn', '').replace(/([A-Z])/g, ' $1').trim();
  }
  
  // Show main display after animation
  setTimeout(() => {
    el.mainDisplay.style.visibility = 'visible';
  }, 300);
  
  state.currentOverlay = null;
}

// === TIMER SYSTEM ===
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  // Calculate elapsed time
  if (state.running) {
    const now = Date.now();
    state.elapsedSeconds = Math.floor((now - state.startTime + state.pausedTime) / 1000);
  }
  
  // Update total elapsed
  el.totalElapsed.textContent = formatTime(state.elapsedSeconds);
  
  // Calculate countdown to next rhythm check
  const countdown = state.rhythmCheckTarget - state.elapsedSeconds;
  
  if (countdown <= 0) {
    el.mainTimer.textContent = '0:00';
    el.mainTimer.style.color = '#a32d2d';
    
    // Auto-advance to next rhythm check
    if (state.running) {
      state.rhythmCheckTarget += 120;
      state.cprRound++;
      el.cprRound.textContent = state.cprRound;
    }
  } else {
    el.mainTimer.textContent = formatTime(countdown);
    el.mainTimer.style.color = countdown <= 30 ? '#a32d2d' : '#1a1a1a';
  }
  
  // Adrenaline warning
  const lastAdr = state.treatments.filter(t => t.name.includes('Adrenaline')).pop();
  if (lastAdr) {
    const sinceAdr = state.elapsedSeconds - lastAdr.elapsed;
    if (sinceAdr >= 180) {
      el.adrWarning.textContent = 'Adrenaline due';
    } else if (sinceAdr >= 120) {
      el.adrWarning.textContent = `Adrenaline in ${formatTime(180 - sinceAdr)}`;
    } else {
      el.adrWarning.textContent = '';
    }
  }
}

function startTimer() {
  if (state.running) return;
  
  state.running = true;
  state.startTime = Date.now();
  
  setInterval(() => {
    if (state.running) {
      updateDisplay();
    }
  }, 100);
  
  el.buttons.pause.textContent = 'Pause timer';
}

function togglePause() {
  if (state.running) {
    state.running = false;
    state.pausedTime += Date.now() - state.startTime;
    el.buttons.pause.textContent = 'Resume timer';
  } else {
    state.running = true;
    state.startTime = Date.now();
    el.buttons.pause.textContent = 'Pause timer';
  }
}

function resetTimer() {
  if (!confirm('Reset timer? This will clear all data.')) return;
  
  state.running = false;
  state.startTime = null;
  state.pausedTime = 0;
  state.elapsedSeconds = 0;
  state.rhythmCheckTarget = 120;
  state.cprRound = 1;
  state.shocks = 0;
  state.treatments = [];
  
  updateDisplay();
  el.cprRound.textContent = '1';
  el.adrWarning.textContent = '';
  el.buttons.pause.textContent = 'Pause timer';
}

// === TREATMENT SYSTEM ===
function addTreatment(name) {
  const treatment = {
    name: name,
    elapsed: state.elapsedSeconds,
    clock: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  };
  
  state.treatments.push(treatment);
  
  // Track shocks
  if (name === 'Shock') {
    state.shocks++;
  }
  
  closeOverlay();
  updateDisplay();
}

// === EVENT LISTENERS ===
el.buttons.reversibles.addEventListener('click', () => showOverlay('reversibles'));
el.buttons.rosc.addEventListener('click', () => showOverlay('rosc'));
el.buttons.phea.addEventListener('click', () => showOverlay('phea'));
el.buttons.summary.addEventListener('click', () => showOverlay('summary'));
el.buttons.addTx.addEventListener('click', () => showOverlay('treatment'));

el.buttons.pause.addEventListener('click', togglePause);
el.buttons.reset.addEventListener('click', resetTimer);

// Treatment buttons
document.querySelectorAll('.tx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    addTreatment(btn.dataset.tx);
  });
});

// === INITIALIZE ===
startTimer();
updateDisplay();
