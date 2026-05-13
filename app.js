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
  currentOverlay: null,
  catchupElapsed: 0,  // Elapsed time from catchup
  startClockTime: null  // Clock time when case started
};

// === STATE PERSISTENCE ===
function saveState() {
  const stateToSave = {
    ...state,
    startTime: state.startTime ? state.startTime : null,
    startClockTime: state.startClockTime ? state.startClockTime.getTime() : null
  };
  localStorage.setItem('theBigOneState', JSON.stringify(stateToSave));
}

function loadState() {
  const saved = localStorage.getItem('theBigOneState');
  if (saved) {
    const loaded = JSON.parse(saved);
    state = {
      ...loaded,
      startTime: loaded.startTime,
      startClockTime: loaded.startClockTime ? new Date(loaded.startClockTime) : null,
      currentOverlay: null
    };
    
    // Update display with loaded state
    updateDisplay();
    el.cprRound.textContent = state.cprRound;
    
    // Restart timer if it was running
    if (state.running) {
      startTimer();
    }
  }
}

function clearState() {
  localStorage.removeItem('theBigOneState');
}

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
    treatment: document.getElementById('overlayTreatment'),
    caseSummary: document.getElementById('overlayCaseSummary')
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
    'summary': 'Summary',
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
  // Update rounds, shocks, disarmed counts
  document.getElementById('sumRounds').textContent = state.cprRound;
  document.getElementById('sumShocks').textContent = state.shocks;
  
  // Count disarm treatments
  const disarmCount = state.treatments.filter(t => t.name.includes('Disarm')).length;
  document.getElementById('sumDisarmed').textContent = disarmCount;
  
  // Pharma summary - count all medication types
  const medications = [
    'Adrenaline push', 'Adrenaline infus.', 'Amiodarone', 
    'Atropine', 'Calcium', 'Glucose', 'Ketamine', 'Magnesium', 
    'Midazolam', 'Normal Saline', 'Sodium Bicarbonate', 'Suxamethonium'
  ];
  
  const pharmaCounts = {};
  state.treatments.forEach(tx => {
    // Check if treatment name includes any medication name
    for (const med of medications) {
      if (tx.name.includes(med)) {
        pharmaCounts[med] = (pharmaCounts[med] || 0) + 1;
        break; // Only count once per treatment
      }
    }
  });
  
  const pharmaDiv = document.getElementById('sumPharmaSummary');
  if (Object.keys(pharmaCounts).length === 0) {
    pharmaDiv.innerHTML = '<div style="padding: 12px 18px; color:#999; font-style:italic;">No medications given</div>';
  } else {
    pharmaDiv.innerHTML = Object.entries(pharmaCounts).map(([name, count]) => 
      `<div class="summary-row"><span>${name}</span><span>${count}</span></div>`
    ).join('');
  }
  
  // Treatment log table - most recent first
  const tbody = document.getElementById('sumTreatmentsTable');
  if (state.treatments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; font-style:italic; padding: 20px;">No treatments recorded</td></tr>';
  } else {
    // Reverse array to show most recent first
    const reversedTreatments = [...state.treatments].reverse();
    
    tbody.innerHTML = reversedTreatments.map(tx => {
      let timeDisplay, elapsedDisplay, ago;
      
      if (tx.prior) {
        // Prior treatments show < symbol with catchup times
        timeDisplay = '&lt; ' + tx.clock;
        elapsedDisplay = '&lt; ' + formatTime(state.catchupElapsed);
        ago = '&gt; ' + formatTime(state.elapsedSeconds);
      } else {
        timeDisplay = tx.clock;
        elapsedDisplay = formatTime(tx.elapsed);
        ago = '&gt; ' + formatTime(state.elapsedSeconds - tx.elapsed);
      }
      
      return `<tr>
        <td style="font-weight: 600; color: #1a1a1a;">${tx.name}</td>
        <td style="color: #999;">${timeDisplay}</td>
        <td style="color: #999;">${elapsedDisplay}</td>
        <td style="color: #999;">${ago}</td>
      </tr>`;
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
      saveState();
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
  saveState();
}

function resetTimer() {
  // Only reset the rhythm check countdown to 2:00
  state.rhythmCheckTarget = state.elapsedSeconds + 120;
  updateDisplay();
  saveState();
}

// === TREATMENT SYSTEM ===
function addTreatment(name) {
  const treatment = {
    name: name,
    elapsed: state.elapsedSeconds,
    clock: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  };
  
  state.treatments.push(treatment);
  
  // Track shocks
  if (name === 'Shock') {
    state.shocks++;
  }
  
  saveState();
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

// Custom treatment input
const customTxInput = document.getElementById('customTx');
const btnAddCustomTx = document.getElementById('btnAddCustomTx');
if (customTxInput && btnAddCustomTx) {
  btnAddCustomTx.addEventListener('click', () => {
    const value = customTxInput.value.trim();
    if (value) {
      addTreatment(value);
      customTxInput.value = '';
    }
  });
  
  customTxInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const value = customTxInput.value.trim();
      if (value) {
        addTreatment(value);
        customTxInput.value = '';
      }
    }
  });
}

// Collapsible treatment sections
document.querySelectorAll('#overlayTreatment .section-header').forEach(header => {
  // Initialize as collapsed
  header.classList.add('collapsed');
  
  header.addEventListener('click', () => {
    const sectionName = header.dataset.section;
    const section = document.querySelector(`.tx-section[data-section="${sectionName}"]`);
    
    if (section) {
      const isCollapsed = header.classList.contains('collapsed');
      
      if (isCollapsed) {
        // Expand
        section.style.maxHeight = section.scrollHeight + 'px';
        section.classList.remove('collapsed');
        header.classList.remove('collapsed');
      } else {
        // Collapse
        section.style.maxHeight = '0';
        section.classList.add('collapsed');
        header.classList.add('collapsed');
      }
    }
  });
});

// Initialize sections as collapsed
document.querySelectorAll('.tx-section').forEach(section => {
  section.classList.add('collapsed');
  section.style.maxHeight = '0';
});

// === INITIALIZE (moved to end after catchup code) ===

// === CATCHUP FLOW ===
let catchupState = {
  elapsedMins: 0,
  elapsedSecs: 0,
  rhythmMins: 2,
  rhythmSecs: 0,
  priorTreatments: [],
  priorTreatmentCounts: {
    shock: 0,
    disarm: 0,
    adrenaline: 0
  }
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
  
  // Store catchup info for prior treatments
  state.catchupElapsed = elapsedTotal;
  const now = new Date();
  state.startClockTime = new Date(now.getTime() - (elapsedTotal * 1000));
  
  // Add simple prior treatments (BVM, LMA, IO)
  catchupState.priorTreatments.forEach(txName => {
    state.treatments.push({
      name: txName,
      elapsed: 0,
      clock: state.startClockTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      prior: true
    });
  });
  
  // Add counted treatments (Shock, Disarm, Adrenaline)
  for (let i = 0; i < catchupState.priorTreatmentCounts.shock; i++) {
    state.treatments.push({
      name: `Shock #${i + 1}`,
      elapsed: 0,
      clock: state.startClockTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      prior: true
    });
    state.shocks++;
  }
  
  for (let i = 0; i < catchupState.priorTreatmentCounts.disarm; i++) {
    state.treatments.push({
      name: `Disarm #${i + 1}`,
      elapsed: 0,
      clock: state.startClockTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      prior: true
    });
  }
  
  for (let i = 0; i < catchupState.priorTreatmentCounts.adrenaline; i++) {
    state.treatments.push({
      name: `Adrenaline push #${i + 1}`,
      elapsed: 0,
      clock: state.startClockTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      prior: true
    });
  }
  
  catchupEl.modal.style.display = 'none';
  startTimer();
  saveState();
});

// Time picker buttons
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    adjustCatchupTime(btn.dataset.action);
  });
});

// === INITIALIZE ===
loadState();
updateCatchupDisplay();
updateDisplay();

// Prior treatment selection - simple buttons (BVM, LMA, IO)
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
    
    updatePriorTxDisplay();
  });
});

// Counter buttons
document.querySelectorAll('.counter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const [tx, dir] = action.split('-');
    
    if (dir === 'plus') {
      catchupState.priorTreatmentCounts[tx]++;
    } else if (dir === 'minus' && catchupState.priorTreatmentCounts[tx] > 0) {
      catchupState.priorTreatmentCounts[tx]--;
    }
    
    document.getElementById(`count${tx.charAt(0).toUpperCase() + tx.slice(1)}`).textContent = 
      catchupState.priorTreatmentCounts[tx];
    
    updatePriorTxDisplay();
  });
});

function updatePriorTxDisplay() {
  const total = catchupState.priorTreatments.length + 
    catchupState.priorTreatmentCounts.shock + 
    catchupState.priorTreatmentCounts.disarm + 
    catchupState.priorTreatmentCounts.adrenaline;
  
  // Counter removed from UI
}

// === PDF EXPORT ===
function exportPDF() {
  // Populate PDF view
  document.getElementById('pdfDate').textContent = new Date().toLocaleDateString('en-AU');
  document.getElementById('pdfElapsed').textContent = formatTime(state.elapsedSeconds);
  document.getElementById('pdfRounds').textContent = state.cprRound;
  document.getElementById('pdfShocks').textContent = state.shocks;
  
  // Populate treatment table
  const tbody = document.getElementById('pdfTableBody');
  if (state.treatments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; font-style:italic;">No treatments recorded</td></tr>';
  } else {
    tbody.innerHTML = state.treatments.map(tx => {
      const timeCell = tx.prior ? '&lt; —' : tx.clock;
      const elapsedCell = tx.prior ? '&lt; —' : formatTime(tx.elapsed);
      return `<tr>
        <td>${tx.name}</td>
        <td>${timeCell}</td>
        <td>${elapsedCell}</td>
      </tr>`;
    }).join('');
  }
  
  // Trigger print dialog
  window.print();
}

// === CASE SUMMARY ===
function showCaseSummary() {
  // Show custom warning modal
  document.getElementById('closeCaseWarning').style.display = 'flex';
}

// Close case warning handlers
document.getElementById('closeCaseCancel').addEventListener('click', () => {
  document.getElementById('closeCaseWarning').style.display = 'none';
});

document.getElementById('closeCaseConfirm').addEventListener('click', () => {
  document.getElementById('closeCaseWarning').style.display = 'none';
  
  // Add "Close case" as a treatment
  const closeTreatment = {
    name: 'Close case',
    elapsed: state.elapsedSeconds,
    clock: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  };
  state.treatments.push(closeTreatment);
  
  // Stop the timer
  state.running = false;
  saveState();
  
  // Populate case summary (same as running summary)
  document.getElementById('caseElapsed').textContent = formatTime(state.elapsedSeconds);
  document.getElementById('caseRounds').textContent = state.cprRound;
  document.getElementById('caseShocks').textContent = state.shocks;
  
  const disarmCount = state.treatments.filter(t => t.name.includes('Disarm')).length;
  document.getElementById('caseDisarmed').textContent = disarmCount;
  
  // Pharma summary
  const medications = [
    'Adrenaline push', 'Adrenaline infus.', 'Amiodarone', 
    'Atropine', 'Calcium', 'Glucose', 'Ketamine', 'Magnesium', 
    'Midazolam', 'Normal Saline', 'Sodium Bicarbonate', 'Suxamethonium'
  ];
  
  const pharmaCounts = {};
  state.treatments.forEach(tx => {
    for (const med of medications) {
      if (tx.name.includes(med)) {
        pharmaCounts[med] = (pharmaCounts[med] || 0) + 1;
        break;
      }
    }
  });
  
  const pharmaDiv = document.getElementById('casePharmaSummary');
  if (Object.keys(pharmaCounts).length === 0) {
    pharmaDiv.innerHTML = '<div style="padding: 12px 18px; color:#999; font-style:italic;">No medications given</div>';
  } else {
    pharmaDiv.innerHTML = Object.entries(pharmaCounts).map(([name, count]) => 
      `<div class="summary-row"><span>${name}</span><span>${count}</span></div>`
    ).join('');
  }
  
  // Treatment log
  const tbody = document.getElementById('caseTreatmentsTable');
  if (state.treatments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; font-style:italic; padding: 20px;">No treatments recorded</td></tr>';
  } else {
    const reversedTreatments = [...state.treatments].reverse();
    
    tbody.innerHTML = reversedTreatments.map(tx => {
      let timeDisplay, elapsedDisplay, ago;
      
      if (tx.prior) {
        timeDisplay = '&lt; ' + tx.clock;
        elapsedDisplay = '&lt; ' + formatTime(state.catchupElapsed);
        ago = '&gt; ' + formatTime(state.elapsedSeconds);
      } else {
        timeDisplay = tx.clock;
        elapsedDisplay = formatTime(tx.elapsed);
        ago = '&gt; ' + formatTime(state.elapsedSeconds - tx.elapsed);
      }
      
      return `<tr>
        <td style="font-weight: 600; color: #1a1a1a;">${tx.name}</td>
        <td style="color: #999;">${timeDisplay}</td>
        <td style="color: #999;">${elapsedDisplay}</td>
        <td style="color: #999;">${ago}</td>
      </tr>`;
    }).join('');
  }
  
  // Hide main app, show case summary
  document.getElementById('app').style.display = 'none';
  el.overlays.caseSummary.style.display = 'block';
}

document.getElementById('btnCloseCase').addEventListener('click', showCaseSummary);

document.getElementById('btnExportPdf').addEventListener('click', exportPDF);

// Delete case button - show warning modal
document.getElementById('btnDeleteCase').addEventListener('click', () => {
  document.getElementById('deleteCaseWarning').style.display = 'flex';
});

// Delete case warning handlers
document.getElementById('deleteCaseCancel').addEventListener('click', () => {
  document.getElementById('deleteCaseWarning').style.display = 'none';
});

document.getElementById('deleteCaseConfirm').addEventListener('click', () => {
  document.getElementById('deleteCaseWarning').style.display = 'none';
  
  // Clear all state
  state.running = false;
  state.startTime = null;
  state.pausedTime = 0;
  state.elapsedSeconds = 0;
  state.rhythmCheckTarget = 120;
  state.cprRound = 1;
  state.shocks = 0;
  state.treatments = [];
  state.catchupElapsed = 0;
  state.startClockTime = null;
  
  clearState();
  
  // Reset UI
  updateDisplay();
  el.cprRound.textContent = '1';
  el.adrWarning.textContent = '';
  el.buttons.pause.textContent = 'Pause timer';
  
  // Hide case summary
  el.overlays.caseSummary.style.display = 'none';
  document.getElementById('app').style.display = 'block';
  
  // Show catchup modal page 1
  catchupEl.modal.style.display = 'flex';
  catchupEl.pages.forEach(p => p.style.display = 'none');
  catchupEl.page1.style.display = 'block';
});
