document.addEventListener('DOMContentLoaded', () => {

// === STATE ===
let state = {
  running: false,
  startTime: null,
  pausedTime: 0,
  elapsedSeconds: 0,
  rhythmCheckTarget: 120,
  cprRound: 0,
  shocks: 0,
  treatments: []
};

let catchupState = {
  elapsedMins: 0,
  elapsedSecs: 0,
  rhythmMins: 2,
  rhythmSecs: 0,
  priorTreatmentCounts: {
    shock: 0,
    disarm: 0,
    adrenaline: 0
  }
};

// === UTILITY FUNCTIONS ===
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getClockTime() {
  const now = new Date();
  return now.toTimeString().substring(0, 5);
}

// === TIMER FUNCTIONS ===
function updateDisplay() {
  const timerEl = document.getElementById('timer');
  const rhythmTimeEl = document.getElementById('rhythmTime');
  const roundEl = document.getElementById('round');
  
  if (timerEl) timerEl.textContent = formatTime(state.elapsedSeconds);
  
  const remaining = Math.max(0, state.rhythmCheckTarget - state.elapsedSeconds);
  if (rhythmTimeEl) rhythmTimeEl.textContent = formatTime(remaining);
  
  if (roundEl) roundEl.textContent = state.cprRound || '—';
  
  updateProgress();
  updateAdrenalineLabel();
}

function updateProgress() {
  const progress = ((state.elapsedSeconds % 120) / 120) * 100;
  const progressRing = document.querySelector('.progress-ring');
  if (progressRing) {
    const circumference = 2 * Math.PI * 103;
    const offset = circumference - (progress / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;
  }
}

function updateAdrenalineLabel() {
  const adrLabel = document.getElementById('adrLabel');
  if (!adrLabel) return;
  
  const adrCount = state.treatments.filter(t => 
    t.name === 'Adrenaline (push)' || t.name === 'Adrenaline (infus)'
  ).length;
  
  if (adrCount === 0) {
    adrLabel.textContent = 'Nil Adr. given';
    adrLabel.style.color = '#E24B4A';
  } else {
    adrLabel.textContent = `${adrCount} Adr. given`;
    adrLabel.style.color = '#1D9E75';
  }
}

function tick() {
  if (!state.running) return;
  
  const now = Date.now();
  state.elapsedSeconds = Math.floor((now - state.startTime + state.pausedTime) / 1000);
  
  if (state.elapsedSeconds >= state.rhythmCheckTarget) {
    state.rhythmCheckTarget += 120;
    state.cprRound++;
    showPanel('rhythmCheckPanel');
  }
  
  updateDisplay();
  requestAnimationFrame(tick);
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.startTime = Date.now();
  
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.classList.add('hidden');
  
  tick();
}

// === PANEL SYSTEM ===
function showPanel(panelId) {
  // Hide all panels
  document.querySelectorAll('.panel-overlay').forEach(p => {
    p.style.display = 'none';
  });
  
  // Show requested panel
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.style.display = 'block';
  }
}

function hideAllPanels() {
  document.querySelectorAll('.panel-overlay').forEach(p => {
    p.style.display = 'none';
  });
}

// === TREATMENT SYSTEM ===
function addTreatment(name, isPrior = false) {
  const treatment = {
    name: name,
    elapsed: state.elapsedSeconds,
    clock: getClockTime(),
    prior: isPrior
  };
  
  state.treatments.push(treatment);
  
  if (name === 'Shock' || name === 'Disarm defib') {
    if (!isPrior) state.shocks++;
  }
  
  updateDisplay();
  updateSummary();
}

function updateSummary() {
  const listEl = document.getElementById('summaryList');
  const elapsedEl = document.getElementById('summaryElapsed');
  const cprEl = document.getElementById('summaryCpr');
  const shocksEl = document.getElementById('summaryShocks');
  
  if (elapsedEl) elapsedEl.textContent = formatTime(state.elapsedSeconds);
  if (cprEl) cprEl.textContent = state.cprRound;
  if (shocksEl) shocksEl.textContent = state.shocks;
  
  if (!listEl) return;
  
  if (state.treatments.length === 0) {
    listEl.innerHTML = '<div style="color:#999;font-style:italic;text-align:center;padding:20px;">No treatments recorded</div>';
    return;
  }
  
  listEl.innerHTML = state.treatments.map(tx => {
    const timeStr = tx.prior ? '< —' : tx.clock;
    const elapsedStr = tx.prior ? '< —' : formatTime(tx.elapsed);
    return `
      <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f5f5f5;">
        <span style="font-weight:500;">${tx.name}</span>
        <span style="color:#666;">${timeStr} (${elapsedStr})</span>
      </div>
    `;
  }).join('');
}

// === CATCHUP FLOW ===
function showCatchupPage(pageNum) {
  const pages = [
    document.getElementById('catchupPage1'),
    document.getElementById('catchupPage2'),
    document.getElementById('catchupPage3'),
    document.getElementById('catchupPage4')
  ];
  
  pages.forEach((page, idx) => {
    if (page) page.style.display = (idx + 1) === pageNum ? 'block' : 'none';
  });
}

function updateCatchupDisplay() {
  const elements = {
    catchupMins: document.getElementById('catchupMins'),
    catchupSecs: document.getElementById('catchupSecs'),
    rhythmMins: document.getElementById('rhythmMins'),
    rhythmSecs: document.getElementById('rhythmSecs'),
    shockVal: document.getElementById('shockVal'),
    disarmVal: document.getElementById('disarmVal'),
    adrenalineVal: document.getElementById('adrenalineVal')
  };
  
  if (elements.catchupMins) elements.catchupMins.textContent = catchupState.elapsedMins;
  if (elements.catchupSecs) elements.catchupSecs.textContent = catchupState.elapsedSecs.toString().padStart(2, '0');
  if (elements.rhythmMins) elements.rhythmMins.textContent = catchupState.rhythmMins;
  if (elements.rhythmSecs) elements.rhythmSecs.textContent = catchupState.rhythmSecs.toString().padStart(2, '0');
  if (elements.shockVal) elements.shockVal.textContent = catchupState.priorTreatmentCounts.shock;
  if (elements.disarmVal) elements.disarmVal.textContent = catchupState.priorTreatmentCounts.disarm;
  if (elements.adrenalineVal) elements.adrenalineVal.textContent = catchupState.priorTreatmentCounts.adrenaline;
}

function adjustCatchupTime(action) {
  const [field, part, dir] = action.split('-');
  
  if (field === 'elapsed') {
    if (part === 'mins') {
      catchupState.elapsedMins += (dir === 'up' ? 1 : -1);
      if (catchupState.elapsedMins < 0) catchupState.elapsedMins = 0;
    } else {
      catchupState.elapsedSecs += (dir === 'up' ? 10 : -10);
      if (catchupState.elapsedSecs >= 60) catchupState.elapsedSecs = 0;
      if (catchupState.elapsedSecs < 0) catchupState.elapsedSecs = 50;
    }
  } else if (field === 'rhythm') {
    if (part === 'mins') {
      catchupState.rhythmMins += (dir === 'up' ? 1 : -1);
      if (catchupState.rhythmMins < 0) catchupState.rhythmMins = 0;
    } else {
      catchupState.rhythmSecs += (dir === 'up' ? 10 : -10);
      if (catchupState.rhythmSecs >= 60) catchupState.rhythmSecs = 0;
      if (catchupState.rhythmSecs < 0) catchupState.rhythmSecs = 50;
    }
  }
  
  updateCatchupDisplay();
}

function finalizeCatchup() {
  state.elapsedSeconds = (catchupState.elapsedMins * 60) + catchupState.elapsedSecs;
  state.rhythmCheckTarget = (catchupState.rhythmMins * 60) + catchupState.rhythmSecs;
  state.pausedTime = state.elapsedSeconds * 1000;
  state.cprRound = Math.floor(state.elapsedSeconds / 120);
  
  if (catchupState.priorTreatmentCounts.shock > 0) {
    for (let i = 0; i < catchupState.priorTreatmentCounts.shock; i++) {
      addTreatment('Shock', true);
    }
  }
  
  if (catchupState.priorTreatmentCounts.disarm > 0) {
    for (let i = 0; i < catchupState.priorTreatmentCounts.disarm; i++) {
      addTreatment('Disarm defib', true);
    }
  }
  
  if (catchupState.priorTreatmentCounts.adrenaline > 0) {
    for (let i = 0; i < catchupState.priorTreatmentCounts.adrenaline; i++) {
      addTreatment('Adrenaline (push)', true);
    }
  }
  
  const bvmActive = document.getElementById('bvmToggle')?.classList.contains('active');
  const lmaActive = document.getElementById('lmaToggle')?.classList.contains('active');
  const ioActive = document.getElementById('ioToggle')?.classList.contains('active');
  
  if (bvmActive) addTreatment('BVM', true);
  if (lmaActive) addTreatment('LMA', true);
  if (ioActive) addTreatment('IO', true);
  
  const modal = document.getElementById('catchupModal');
  if (modal) modal.style.display = 'none';
  
  updateDisplay();
  startTimer();
}

// === EVENT HANDLERS ===

// Catchup navigation
const btnCatchup = document.getElementById('btnCatchup');
if (btnCatchup) {
  btnCatchup.addEventListener('click', () => showCatchupPage(2));
}

const btnCatchupNext = document.getElementById('btnCatchupNext');
if (btnCatchupNext) {
  btnCatchupNext.addEventListener('click', () => {
    catchupState.rhythmMins = catchupState.elapsedMins;
    catchupState.rhythmSecs = catchupState.elapsedSecs;
    updateCatchupDisplay();
    showCatchupPage(3);
  });
}

const btnCatchupNext2 = document.getElementById('btnCatchupNext2');
if (btnCatchupNext2) {
  btnCatchupNext2.addEventListener('click', () => showCatchupPage(4));
}

const btnCatchupBack1 = document.getElementById('btnCatchupBack1');
if (btnCatchupBack1) {
  btnCatchupBack1.addEventListener('click', () => showCatchupPage(1));
}

const btnCatchupBack2 = document.getElementById('btnCatchupBack2');
if (btnCatchupBack2) {
  btnCatchupBack2.addEventListener('click', () => showCatchupPage(2));
}

const btnCatchupBack3 = document.getElementById('btnCatchupBack3');
if (btnCatchupBack3) {
  btnCatchupBack3.addEventListener('click', () => showCatchupPage(3));
}

const btnCatchupConfirm = document.getElementById('btnCatchupConfirm');
if (btnCatchupConfirm) {
  btnCatchupConfirm.addEventListener('click', finalizeCatchup);
}

// Time adjustment
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => adjustCatchupTime(btn.dataset.action));
});

// Page 4 counters
document.querySelectorAll('.cu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const [tx, dir] = btn.dataset.action.split('-');
    catchupState.priorTreatmentCounts[tx] += (dir === 'plus' ? 1 : -1);
    if (catchupState.priorTreatmentCounts[tx] < 0) catchupState.priorTreatmentCounts[tx] = 0;
    updateCatchupDisplay();
  });
});

// Page 4 toggles
['bvm', 'lma', 'io'].forEach(id => {
  const toggle = document.getElementById(id + 'Toggle');
  if (toggle) {
    toggle.addEventListener('click', () => toggle.classList.toggle('active'));
  }
});

// Main buttons
const btnResetAll = document.getElementById('btnResetAll');
if (btnResetAll) {
  btnResetAll.addEventListener('click', () => {
    if (confirm('Reset all data and start over?')) {
      location.reload();
    }
  });
}

const btnCloseCase = document.getElementById('btnCloseCase');
if (btnCloseCase) {
  btnCloseCase.addEventListener('click', () => {
    if (confirm('Close case and export summary?')) {
      exportPDF();
    }
  });
}

// Banner buttons
const btnReversibles = document.getElementById('btnReversibles');
if (btnReversibles) {
  btnReversibles.addEventListener('click', () => showPanel('rhythmCheckPanel'));
}

const btnROSC = document.getElementById('btnROSC');
if (btnROSC) {
  btnROSC.addEventListener('click', () => showPanel('roscPanel'));
}

const btnPHEA = document.getElementById('btnPHEA');
if (btnPHEA) {
  btnPHEA.addEventListener('click', () => showPanel('pheaPanel'));
}

// Panel close buttons
const closeRhythm = document.getElementById('closeRhythm');
if (closeRhythm) {
  closeRhythm.addEventListener('click', hideAllPanels);
}

const closeRosc = document.getElementById('closeRosc');
if (closeRosc) {
  closeRosc.addEventListener('click', hideAllPanels);
}

const closePhea = document.getElementById('closePhea');
if (closePhea) {
  closePhea.addEventListener('click', hideAllPanels);
}

const closeTx = document.getElementById('closeTx');
if (closeTx) {
  closeTx.addEventListener('click', hideAllPanels);
}

const closeSummary = document.getElementById('closeSummary');
if (closeSummary) {
  closeSummary.addEventListener('click', hideAllPanels);
}

// Treatment accordion
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const isOpen = content.style.display === 'flex';
    
    document.querySelectorAll('.accordion-content').forEach(c => {
      c.style.display = 'none';
    });
    
    if (!isOpen) {
      content.style.display = 'flex';
    }
  });
});

// Treatment buttons
document.querySelectorAll('.tx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const txName = btn.dataset.tx;
    addTreatment(txName);
    hideAllPanels();
  });
});

// Bottom buttons
const btnSummary = document.getElementById('btnSummary');
if (btnSummary) {
  btnSummary.addEventListener('click', () => {
    updateSummary();
    showPanel('summaryPanel');
  });
}

const btnAddTx = document.getElementById('btnAddTx');
if (btnAddTx) {
  btnAddTx.addEventListener('click', () => showPanel('txPanel'));
}

// Timer controls
const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', startTimer);
}

const pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    state.running = false;
    state.pausedTime = state.elapsedSeconds * 1000;
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset timer to 0:00?')) {
      state.elapsedSeconds = 0;
      state.pausedTime = 0;
      state.rhythmCheckTarget = 120;
      state.cprRound = 0;
      updateDisplay();
    }
  });
}

// PDF Export
function exportPDF() {
  const tbody = document.getElementById('pdfTableBody');
  if (!tbody) return;
  
  if (state.treatments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;font-style:italic;">No treatments recorded</td></tr>';
  } else {
    tbody.innerHTML = state.treatments.map(tx => {
      const timeCell = tx.prior ? '< —' : tx.clock;
      const elapsedCell = tx.prior ? '< —' : formatTime(tx.elapsed);
      return `<tr>
        <td>${tx.name}</td>
        <td>${timeCell}</td>
        <td>${elapsedCell}</td>
      </tr>`;
    }).join('');
  }
  
  window.print();
}

// === INITIALIZE ===
const modal = document.getElementById('catchupModal');
if (modal) {
  modal.style.display = 'flex';
  showCatchupPage(1);
  updateCatchupDisplay();
}

updateDisplay();

}); // End DOMContentLoaded
