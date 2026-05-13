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

function getOverlayKey(buttonName) {
  const map = {
    'reversibles': 'reversibles',
    'rosc': 'rosc',
    'phea': 'phea',
    'summary': 'summary',
    'addTx': 'treatment'
  };
  return map[buttonName];
}

function getButtonText(buttonName) {
  const map = {
    'reversibles': 'Reversibles',
    'rosc': 'ROSC',
    'phea': 'PHEA',
    'summary': 'Running summary',
    'addTx': 'Add Tx'
  };
  return map[buttonName];
}

function showOverlay(name) {
  if (state.currentOverlay === name) {
    closeOverlay();
    return;
  }
  
  el.mainDisplay.style.visibility = 'hidden';
  
  if (state.currentOverlay) {
    const oldOverlay = el.overlays[getOverlayKey(state.currentOverlay)];
    const oldBtn = el.buttons[state.currentOverlay];
    
    setTimeout(() => {
      oldOverlay.style.display = 'none';
      oldBtn.classList.remove('active');
      oldBtn.textContent = getButtonText(state.currentOverlay);
    }, 150);
  }
  
  const overlay = el.overlays[getOverlayKey(name)];
  const btn = el.buttons[name];
  
  overlay.classList.remove('slide-out-up', 'slide-out-down');
  
  if (topOverlays.includes(getOverlayKey(name))) {
    overlay.classList.add('slide-in-down');
  } else {
    overlay.classList.add('slide-in-up');
  }
  
  overlay.style.display = 'block';
  btn.classList.add('active');
  btn.textContent = 'Close';
  
  // Update Running Summary when opened
  if (name === 'summary') {
    updateRunningSummary();
  }
  
  state.currentOverlay = name;
}

function updateRunningSummary() {
  document.getElementById('sumElapsed').textContent = formatTime(state.elapsedSeconds);
  document.getElementById('sumRounds').textContent = state.cprRound;
  document.getElementById('sumShocks').textContent = state.shocks;
  
  const list = document.getElementById('sumTreatmentsList');
  if (state.treatments.length === 0) {
    list.innerHTML = '<div style="color:#999; font-style:italic;">No treatments recorded</div>';
  } else {
    list.innerHTML = state.treatments.map(tx => {
      const timeDisplay = tx.prior ? '< —' : (tx.clock + ' (' + formatTime(tx.elapsed) + ')');
      return `<div class="treatment-item">
        <span class="treatment-name">${tx.name}</span>
        <span class="treatment-time">${timeDisplay}</span>
      </div>`;
    }).join('');
  }
}

function closeOverlay() {
  if (!state.currentOverlay) return;
  
  const overlayKey = getOverlayKey(state.currentOverlay);
  const overlay = el.overlays[overlayKey];
  const btn = el.buttons[state.currentOverlay];
  const isTop = topOverlays.includes(overlayKey);
  
  overlay.classList.remove('slide-in-down', 'slide-in-up');
  overlay.classList.add(isTop ? 'slide-out-up' : 'slide-out-down');
  
  overlay.addEventListener('animationend', function hideAfterAnim() {
    overlay.style.display = 'none';
    overlay.classList.remove('slide-out-up', 'slide-out-down');
    overlay.removeEventListener('animationend', hideAfterAnim);
  }, { once: true });
  
  btn.classList.remove('active');
  btn.textContent = getButtonText(state.currentOverlay);
  
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
el.buttons.addTx.addEventListener('click', () => showOverlay('addTx'));

el.buttons.pause.addEventListener('click', togglePause);
el.buttons.reset.addEventListener('click', resetTimer);

// Treatment buttons
document.querySelectorAll('.tx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    addTreatment(btn.dataset.tx);
  });
});

// === INITIALIZE (moved to end after catchup code) ===

// === CATCHUP FLOW ===
let catchupState = {
  elapsedMins: 0,
  elapsedSecs: 0,
  rhythmMins: 2,
  rhythmSecs: 0,
  priorTreatments: []
};

const catchupEl = {
  modal: document.getElementById('catchupModal'),
  page1: document.getElementById('catchupPage1'),
  page2: document.getElementById('catchupPage2'),
  page3: document.getElementById('catchupPage3'),
  page4: document.getElementById('catchupPage4'),
  catchupMins: document.getElementById('catchupMins'),
  catchupSecs: document.getElementById('catchupSecs'),
  rhythmMins: document.getElementById('rhythmMins'),
  rhythmSecs: document.getElementById('rhythmSecs')
};

function showCatchupPage(pageNum) {
  catchupEl.page1.style.display = pageNum === 1 ? 'block' : 'none';
  catchupEl.page2.style.display = pageNum === 2 ? 'block' : 'none';
  catchupEl.page3.style.display = pageNum === 3 ? 'block' : 'none';
  catchupEl.page4.style.display = pageNum === 4 ? 'block' : 'none';
}

function updateCatchupDisplay() {
  catchupEl.catchupMins.textContent = catchupState.elapsedMins;
  catchupEl.catchupSecs.textContent = catchupState.elapsedSecs.toString().padStart(2, '0');
  catchupEl.rhythmMins.textContent = catchupState.rhythmMins;
  catchupEl.rhythmSecs.textContent = catchupState.rhythmSecs.toString().padStart(2, '0');
}

function adjustCatchupTime(action) {
  switch(action) {
    case 'mins-up':
      catchupState.elapsedMins++;
      break;
    case 'mins-down':
      if (catchupState.elapsedMins > 0) catchupState.elapsedMins--;
      break;
    case 'secs-up':
      catchupState.elapsedSecs += 10;
      if (catchupState.elapsedSecs >= 60) {
        catchupState.elapsedSecs = 0;
        catchupState.elapsedMins++;
      }
      break;
    case 'secs-down':
      catchupState.elapsedSecs -= 10;
      if (catchupState.elapsedSecs < 0) {
        if (catchupState.elapsedMins > 0) {
          catchupState.elapsedSecs = 50;
          catchupState.elapsedMins--;
        } else {
          catchupState.elapsedSecs = 0;
        }
      }
      break;
    case 'rhythm-mins-up':
      const totalElapsed = catchupState.elapsedMins * 60 + catchupState.elapsedSecs;
      const maxTarget = totalElapsed + 120;
      if ((catchupState.rhythmMins + 1) * 60 + catchupState.rhythmSecs <= maxTarget) {
        catchupState.rhythmMins++;
      }
      break;
    case 'rhythm-mins-down':
      const minTarget = catchupState.elapsedMins * 60 + catchupState.elapsedSecs;
      if (catchupState.rhythmMins * 60 + catchupState.rhythmSecs > minTarget && catchupState.rhythmMins > 0) {
        catchupState.rhythmMins--;
      }
      break;
    case 'rhythm-secs-up':
      const totalE = catchupState.elapsedMins * 60 + catchupState.elapsedSecs;
      const maxT = totalE + 120;
      const newSecs = catchupState.rhythmSecs + 10;
      if (newSecs >= 60) {
        if ((catchupState.rhythmMins + 1) * 60 <= maxT) {
          catchupState.rhythmSecs = 0;
          catchupState.rhythmMins++;
        }
      } else if (catchupState.rhythmMins * 60 + newSecs <= maxT) {
        catchupState.rhythmSecs = newSecs;
      }
      break;
    case 'rhythm-secs-down':
      const minT = catchupState.elapsedMins * 60 + catchupState.elapsedSecs;
      const newS = catchupState.rhythmSecs - 10;
      if (newS < 0) {
        if (catchupState.rhythmMins > 0 && (catchupState.rhythmMins - 1) * 60 + 50 >= minT) {
          catchupState.rhythmSecs = 50;
          catchupState.rhythmMins--;
        }
      } else if (catchupState.rhythmMins * 60 + newS >= minT) {
        catchupState.rhythmSecs = newS;
      }
      break;
  }
  updateCatchupDisplay();
}

// Catchup button handlers
document.getElementById('btnStartFresh').addEventListener('click', () => {
  catchupEl.modal.style.display = 'none';
  startTimer();
});

document.getElementById('btnCatchup').addEventListener('click', () => {
  showCatchupPage(2);
});

document.getElementById('btnCatchupNext').addEventListener('click', () => {
  // Initialize rhythm check to elapsed time
  catchupState.rhythmMins = catchupState.elapsedMins;
  catchupState.rhythmSecs = catchupState.elapsedSecs;
  updateCatchupDisplay();
  showCatchupPage(3);
});

document.getElementById('btnCatchupNext2').addEventListener('click', () => {
  showCatchupPage(4);
});

document.getElementById('btnCatchupBack1').addEventListener('click', () => {
  showCatchupPage(1);
});

document.getElementById('btnCatchupBack2').addEventListener('click', () => {
  showCatchupPage(2);
});

document.getElementById('btnCatchupBack3').addEventListener('click', () => {
  showCatchupPage(3);
});

document.getElementById('btnCatchupConfirm').addEventListener('click', () => {
  // Set state from catchup values
  const elapsedTotal = catchupState.elapsedMins * 60 + catchupState.elapsedSecs;
  const rhythmTotal = catchupState.rhythmMins * 60 + catchupState.rhythmSecs;
  
  state.pausedTime = elapsedTotal * 1000;
  state.rhythmCheckTarget = rhythmTotal;
  state.cprRound = Math.floor(elapsedTotal / 120) + 1;
  
  // Add prior treatments
  catchupState.priorTreatments.forEach(txName => {
    state.treatments.push({
      name: txName,
      elapsed: 0,
      clock: '—',
      prior: true
    });
    
    if (txName === 'Shock') {
      state.shocks++;
    }
  });
  
  catchupEl.modal.style.display = 'none';
  startTimer();
});

// Time picker buttons
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    adjustCatchupTime(btn.dataset.action);
  });
});

// === INITIALIZE ===
updateCatchupDisplay();
updateDisplay();

// Prior treatment selection
document.querySelectorAll('.prior-tx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const txName = btn.dataset.tx;
    
    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      catchupState.priorTreatments = catchupState.priorTreatments.filter(t => t !== txName);
    } else {
      btn.classList.add('selected');
      catchupState.priorTreatments.push(txName);
    }
    
    const display = document.getElementById('priorTxSelected');
    if (catchupState.priorTreatments.length > 0) {
      display.textContent = `Selected: ${catchupState.priorTreatments.length} treatment(s)`;
    } else {
      display.textContent = '';
    }
  });
});
