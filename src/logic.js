(function(){
  'use strict';
  var TOTAL=120, PMAX=4, circ=2*Math.PI*94.5;
  var MEDS_LIST = ["Adrenaline push", "Adrenaline infus.", "Amiodarone", "Atropine", "Calcium", "Glucose", "Ketamine", "Magnesium", "Midazolam", "Normal Saline", "Sodium Bicarbonate", "Suxamethonium"];

  var ring=document.getElementById('ring'),
      display=document.getElementById('display'),
      startBtn=document.getElementById('startBtn'),
      resetBtn=document.getElementById('resetBtn'),
      countupDisplay=document.getElementById('countupDisplay'),
      cycleCount=document.getElementById('cycleCount'),
      txBtn=document.getElementById('txBtn'),
      txPanel=document.getElementById('txPanel'),
      previewTbody=document.createElement('tbody'),
      logTbody=document.getElementById('logTbody'),
      masterResetBtn=document.getElementById('masterResetBtn'),
      logOverlay=document.getElementById('logOverlay'),
      warnOverlay=document.getElementById('warnOverlay'),
      exportOverlay=document.getElementById('exportOverlay'),
      miniWrap=document.getElementById('miniWrap'),
      miniCd=document.getElementById('miniCountdown'),
      fullLogBtn=document.getElementById('fullLogBtn'),
      closeLogBtn=document.getElementById('closeLogBtn'),
      pauseBtn=document.getElementById('pauseBtn'),
      warnConfirmBtn=document.getElementById('warnConfirmBtn'),
      warnCancelBtn=document.getElementById('warnCancelBtn'),
      closeExportBtn=document.getElementById('closeExportBtn'),
      exportMeta=document.getElementById('exportMeta'),
      exportTbody=document.getElementById('exportTbody'),
      exportSummaryWrap=document.getElementById('exportSummaryWrap'),
      exportSummary=document.getElementById('exportSummary'),
      mgmtSummaryLabel=document.getElementById('mgmtSummaryLabel'),
      liveSummaryWrap=document.getElementById('liveSummaryWrap'),
      liveSummary=document.getElementById('liveSummary'),
      liveArrestSummary=document.getElementById('liveArrestSummary'),
      fullLogLabel2=document.getElementById('fullLogLabel2');

  ring.style.strokeDasharray=circ;
  ring.style.strokeDashoffset=0;

  var remaining=TOTAL,running=false,tmr=null,rounds=0;
  var elapsed=0,everStarted=false,masterConfirming=false;
  var txLog=[],txCounts={},txOpen=false,audioCtx=null;
  var revOverlay,revMiniWrap,revMiniCd;
  var roscOverlay,roscBtn;
  var rsiOverlay;
  var elapsedTmr=null; // separate timer to keep elapsed running during ROSC pause
  function openRosc(){ if(roscOverlay){ roscOverlay.classList.add('open'); history.pushState({app:true},'',''); } }

  function tickElapsedOnly(){
    elapsed++;
    countupDisplay.textContent=fmt(elapsed);
    saveSession();
  }

  function on(el,fn){ if(el) el.addEventListener('click',fn); }

  function getAudio(){
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(){
    try{
      var c=getAudio(),o=c.createOscillator(),g=c.createGain();
      o.connect(g);g.connect(c.destination);
      o.type='sine';o.frequency.setValueAtTime(880,c.currentTime);
      g.gain.setValueAtTime(1,c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.3);
      o.start(c.currentTime);o.stop(c.currentTime+0.3);
    }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate(500); }catch(e){}
  }

  function flash(){
    display.classList.remove('flashing');
    void display.offsetWidth;
    display.classList.add('flashing');
    display.addEventListener('animationend',function h(){
      display.classList.remove('flashing');
      display.removeEventListener('animationend',h);
    });
  }

  function fmt(s){ return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
  function fmtH(s){ var m=Math.floor(s/60); return Math.floor(m/60)+':'+String(m%60).padStart(2,'0'); }
  function fmtHMS(s){ var m=Math.floor(s/60); return Math.floor(m/60)+':'+String(m%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }

  function stopTimers(){
    clearInterval(tmr); clearInterval(elapsedTmr);
    running=false; elapsedTmr=null;
  }

  function updateUI(){
    display.textContent=fmt(remaining);
    countupDisplay.textContent=fmt(elapsed);
    ring.style.strokeDashoffset=circ*(1-remaining/TOTAL);
    var end=remaining>=10&&remaining<=15;
    display.classList.toggle('ending',end);
    ring.classList.toggle('ending',end);
    var vis=everStarted&&!display.classList.contains('hidden');
    if(vis){ miniCd.textContent=fmt(remaining); miniCd.classList.toggle('ending',end); miniWrap.classList.add('show'); }
    else{ miniWrap.classList.remove('show'); }
    // Sync reversibles mini-timer
    if(typeof revMiniCd !== 'undefined' && revMiniCd && revMiniWrap){
      if(everStarted){ revMiniCd.textContent=fmt(remaining); revMiniCd.classList.toggle('ending',end); revMiniWrap.classList.add('show'); }
      else{ revMiniWrap.classList.remove('show'); }
    }
  }

  function startTick(){
    clearInterval(tmr); clearInterval(elapsedTmr); elapsedTmr=null;
    running=true;
    tmr=setInterval(tick,1000);
  }
  function stopTick(){
    clearInterval(tmr); running=false;
    clearInterval(elapsedTmr);
    elapsedTmr=setInterval(tickElapsedOnly,1000);
  }

  function tick(){
    elapsed++;remaining--;
    if(remaining===0){
      var now0=new Date();
      rhythmCueElapsed=elapsed;
      rhythmCueClock=String(now0.getHours()).padStart(2,'0')+':'+String(now0.getMinutes()).padStart(2,'0');
      showShockPrompt();
    }
    if(remaining<0){rounds++;cycleCount.textContent=rounds+1;remaining=TOTAL;updateAdrLabel();}
    if(remaining>=10&&remaining<=15){
      beep();flash();
      // Force back to main screen only once at 15 seconds
      if(remaining===15){
        [logOverlay,warnOverlay].forEach(function(ov){ if(ov&&ov.classList.contains('open')) ov.classList.remove('open'); });
        closeTab();
        closeSummaryPanel();
      }
    }
    updateUI();updateAgo();updateAdrLabel();updateLastTxBar();
    saveSession();
  }

  // SESSION PERSISTENCE
  function saveSession(){
    if(!everStarted) return;
    try{
      localStorage.setItem('cprSession', JSON.stringify({
        elapsed:elapsed, remaining:remaining, rounds:rounds,
        everStarted:everStarted, txLog:txLog, txCounts:txCounts,
        adrDueRound:adrDueRound, savedAt:Date.now()
      }));
    }catch(e){}
  }

  function clearSession(){
    try{ localStorage.removeItem('cprSession'); }catch(e){}
  }

  function restoreSession(s){
    elapsed=s.elapsed||0;
    remaining=s.remaining||TOTAL;
    rounds=s.rounds||0;
    everStarted=true;
    txLog=s.txLog||[];
    txCounts=s.txCounts||{};
    adrDueRound=s.adrDueRound||null;
    // Compensate for time away
    var away=Math.round((Date.now()-(s.savedAt||Date.now()))/1000);
    elapsed+=away;
    // Advance remaining by time away
    var fullCycles=Math.floor(away/TOTAL);
    rounds+=fullCycles;
    var rem=remaining-(away%TOTAL);
    while(rem<=0){ rem+=TOTAL; rounds++; }
    remaining=rem;
    cycleCount.textContent=rounds+1;
    startBtn.classList.add('hidden');
    display.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.innerHTML='Pause';
    renderFull();renderLiveSummary();updateAdrLabel();
    startTick();
    updateUI();
    requestWakeLock();
  }

  function checkSavedSession(){
    try{
      var raw=localStorage.getItem('cprSession');
      if(!raw) return false;
      var s=JSON.parse(raw);
      if(!s||!s.everStarted) return false;
      // Only offer resume if saved less than 2 hours ago
      if(Date.now()-s.savedAt > 7200000){ clearSession(); return false; }
      return s;
    }catch(e){ return false; }
  }

  // CATCH-UP step flow
  var catchupOverlay=document.getElementById('catchupOverlay');
  var catchupShocks=0, catchupDisarms=0, catchupLma=0, catchupIo=0, catchupAdr=0;
  var elMins=0, elSecs=0, cdMins=0, cdSecs=0;

  function pad(n){ return String(n).padStart(2,'0'); }
  function updateElDisplay(){ document.getElementById('elMinsVal').textContent=elMins; document.getElementById('elSecsVal').textContent=pad(elSecs); }
  function updateCdDisplay(){ document.getElementById('cdMinsVal').textContent=cdMins; document.getElementById('cdSecsVal').textContent=pad(cdSecs); }
  function updateCounterDisplay(){
    document.getElementById('shockVal').textContent=catchupShocks;
    document.getElementById('disarmVal').textContent=catchupDisarms;
    document.getElementById('adrVal').textContent=catchupAdr;
  }

  var currentStep=0;
  var catchupSlider=document.getElementById('catchupSlider');
  function showStep(n){
    currentStep=n;
    if(catchupSlider){
      catchupSlider.style.transform='translateX(-'+(n*25)+'%)';
    }
  }

  // Swipe navigation on catchup wrap
  (function(){
    var wrap=document.querySelector('.catchup-wrap');
    if(!wrap) return;
    var tx=0, ty=0;
    wrap.addEventListener('touchstart',function(e){ tx=e.touches[0].clientX; ty=e.touches[0].clientY; },{passive:true});
    wrap.addEventListener('touchend',function(e){
      var dx=e.changedTouches[0].clientX-tx;
      var dy=e.changedTouches[0].clientY-ty;
      if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy)*1.2) return; // not a horizontal swipe
      if(dx<0){
        // swipe left — next step (0→1, 1→2, 2→3)
        if(currentStep<3){ showStep(currentStep+1); history.pushState({app:true},'',''); }
      } else {
        // swipe right — previous step
        if(currentStep>0) showStep(currentStep-1);
      }
    },{passive:true});
  })();

  // Step 0 — mode selection
  on(document.getElementById('configureBtn'),function(){ showStep(1); history.pushState({app:true},'',''); });

  // Step 1 — elapsed time
  on(document.getElementById('elMinsUp'),function(){ elMins++; updateElDisplay(); });
  on(document.getElementById('elMinsDown'),function(){ if(elMins>0){ elMins--; updateElDisplay(); } });
  on(document.getElementById('elSecsUp'),function(){
    elSecs+=10; if(elSecs>=60){ elSecs=0; elMins++; } updateElDisplay();
  });
  on(document.getElementById('elSecsDown'),function(){
    elSecs-=10; if(elSecs<0){ if(elMins>0){ elMins--; elSecs=50; } else { elSecs=0; } } updateElDisplay();
  });
  var elapsedSnapshotTime=null;
  var coachedSnapshotTime=null;

  on(document.getElementById('step1NextBtn'),function(){
    elapsedSnapshotTime=Date.now();
    // Pre-populate COACHED due time with same value as elapsed
    cdMins=elMins; cdSecs=elSecs;
    updateCdDisplay();
    showStep(2);
    history.pushState({app:true},'','');
  });
  on(document.getElementById('step1BackBtn'),function(){ showStep(0); });

  // Step 2 — COACHED due elapsed time
  on(document.getElementById('cdMinsUp'),function(){
    var max=(elMins*60)+elSecs+120;
    if((cdMins*60)+cdSecs<max){ cdMins++; updateCdDisplay(); }
  });
  on(document.getElementById('cdMinsDown'),function(){ if(cdMins>0){ cdMins--; updateCdDisplay(); } });
  on(document.getElementById('cdSecsUp'),function(){
    var max=(elMins*60)+elSecs+120;
    if((cdMins*60)+cdSecs>=max) return;
    cdSecs+=10; if(cdSecs>=60){ cdSecs=0; cdMins++; } updateCdDisplay();
  });
  on(document.getElementById('cdSecsDown'),function(){
    var min=(elMins*60)+elSecs;
    if((cdMins*60)+cdSecs<=min) return;
    cdSecs-=10; if(cdSecs<0){ if(cdMins>0){ cdMins--; cdSecs=50; } else { cdSecs=0; } } updateCdDisplay();
  });
  on(document.getElementById('step2NextBtn'),function(){
    coachedSnapshotTime=Date.now();
    showStep(3);
    history.pushState({app:true},'','');
  });
  on(document.getElementById('step2BackBtn'),function(){ showStep(1); });

  // Step 3 — prior interventions
  on(document.getElementById('shockPlus'),function(){ catchupShocks++; updateCounterDisplay(); });
  on(document.getElementById('shockMinus'),function(){ if(catchupShocks>0){ catchupShocks--; updateCounterDisplay(); } });
  on(document.getElementById('disarmPlus'),function(){ catchupDisarms++; updateCounterDisplay(); });
  on(document.getElementById('disarmMinus'),function(){ if(catchupDisarms>0){ catchupDisarms--; updateCounterDisplay(); } });
  on(document.getElementById('adrPlus'),function(){
    catchupAdr++;
    updateCounterDisplay();
  });
  on(document.getElementById('adrMinus'),function(){ if(catchupAdr>0){ catchupAdr--; updateCounterDisplay(); } });
  var lmaToggle=document.getElementById('lmaToggle');
  var ioToggle=document.getElementById('ioToggle');
  on(lmaToggle,function(){ catchupLma=catchupLma?0:1; lmaToggle.classList.toggle('active',!!catchupLma); });
  on(ioToggle,function(){ catchupIo=catchupIo?0:1; ioToggle.classList.toggle('active',!!catchupIo); });  on(document.getElementById('step3BackBtn'),function(){ showStep(2); });

  function doActualStart(offsetSecs, coachedRemaining){
    elapsed=offsetSecs;
    remaining=coachedRemaining;
    rounds=Math.floor(offsetSecs/TOTAL);
    cycleCount.textContent=rounds+1;
    everStarted=true;
    getAudio();running=true;
    startBtn.classList.add('hidden');
    display.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.classList.remove('paused');
    pauseBtn.innerHTML='Pause';
    clearInterval(elapsedTmr); elapsedTmr=null;
    running=true;
    startTick(); updateUI(); updateAdrLabel();
  }

  function applyCatchupEntries(offsetSecs){
    var now=new Date();
    var clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    var clockFull=clock+':'+String(now.getSeconds()).padStart(2,'0');
    var entries=[];
    for(var s=0;s<catchupShocks;s++) entries.push('Shock');
    for(var d=0;d<catchupDisarms;d++) entries.push('Disarm');
    for(var a=0;a<catchupAdr;a++) entries.push('Adrenaline push');
    for(var l=0;l<catchupLma;l++) entries.push('LMA');
    for(var totIo=0;totIo<catchupIo;totIo++) entries.push('IO access');
    if(!entries.length) return;
    entries.reverse().forEach(function(name){
      txCounts[name]=(txCounts[name]||0)+1;
      txLog.unshift({name:name,dose:txCounts[name],clock:clock,clockFull:clockFull,sinceStart:0,loggedAt:0,prior:true,priorOffset:offsetSecs});
    });
    if(catchupAdr>0){ adrDueRound=(rounds+1)+2; }
    renderFull(); renderLiveSummary(); updateAdrLabel();
  }

  on(document.getElementById('catchupConfirmBtn'),function(){
    var baseSecs=(elMins*60)+elSecs;
    // Drift since step 1 Next was pressed
    var drift=elapsedSnapshotTime?Math.round((Date.now()-elapsedSnapshotTime)/1000):0;
    var offsetSecs=baseSecs+drift;
    // COACHED: user entered the elapsed time at which COACHED is due
    var coachedDrift=coachedSnapshotTime?Math.round((Date.now()-coachedSnapshotTime)/1000):0;
    var dueElapsedSecs=(cdMins*60)+cdSecs;
    var coachedRemaining=dueElapsedSecs-offsetSecs-coachedDrift;
    if(coachedRemaining<=0||coachedRemaining>TOTAL) coachedRemaining=TOTAL;
    applyCatchupEntries(offsetSecs);
    catchupOverlay.classList.remove('open'); document.body.style.overflow='';
    doActualStart(offsetSecs,coachedRemaining);
  });

  // Show opening step on load — only if no saved session
  showStep(0);
  updateAdrLabel();
  if(!checkSavedSession()){ catchupOverlay.classList.add('open'); document.body.style.overflow='hidden'; }

  on(startBtn,function(){
    catchupShocks=0;catchupDisarms=0;catchupLma=0;catchupIo=0;catchupAdr=0;
    if(lmaToggle){ lmaToggle.classList.remove('active'); }
    if(ioToggle){ ioToggle.classList.remove('active'); }
    elapsedSnapshotTime=null; coachedSnapshotTime=null;
    elMins=0;elSecs=0;cdMins=0;cdSecs=0;
    updateElDisplay();updateCdDisplay();updateCounterDisplay();
    showStep(0);
    catchupOverlay.classList.add('open'); document.body.style.overflow='hidden';
  });

  // PAUSE — tap once to show confirm, tap again to confirm
  var pauseConfirming=false, pauseConfirmTimer=null;
  var resumeConfirming=false, resumeConfirmTimer=null;
  var resetConfirming=false, resetConfirmTimer=null;
  on(pauseBtn,function(){
    if(pauseConfirming){
      // Second tap — confirm pause
      clearTimeout(pauseConfirmTimer);
      pauseConfirming=false;
      pauseBtn.classList.remove('confirming');
      pauseBtn.innerHTML='Play';
      stopTick();
    } else if(resumeConfirming){
      // Second tap — confirm resume
      clearTimeout(resumeConfirmTimer);
      resumeConfirming=false;
      pauseBtn.classList.remove('confirming');
      pauseBtn.innerHTML='Pause';
      startTick();
    } else if(!running){
      // First tap while paused — ask to confirm resume
      resumeConfirming=true;
      pauseBtn.classList.add('confirming');
      pauseBtn.innerHTML='CONFIRM';
      resumeConfirmTimer=setTimeout(function(){
        resumeConfirming=false;
        pauseBtn.classList.remove('confirming');
        pauseBtn.innerHTML='Play';
      },3000);
    } else {
      // First tap while running — ask to confirm pause
      pauseConfirming=true;
      pauseBtn.classList.add('confirming');
      pauseBtn.innerHTML='CONFIRM';
      pauseConfirmTimer=setTimeout(function(){
        pauseConfirming=false;
        pauseBtn.classList.remove('confirming');
        pauseBtn.innerHTML='Pause';
      },3000);
    }
  });

  // COACHED reset — tap once to show confirm on button, tap again to confirm
  on(resetBtn,function(){
    if(resetConfirming){
      // Second tap — confirm restart
      clearTimeout(resetConfirmTimer);
      resetConfirming=false;
      resetBtn.classList.remove('confirming','reset-btn-icon');
      resetBtn.classList.add('reset-btn-icon');
      resetBtn.innerHTML='Refresh';
      stopTick();
      remaining=TOTAL;
      pauseConfirming=false;
      resumeConfirming=false;
      clearTimeout(pauseConfirmTimer);
      clearTimeout(resumeConfirmTimer);
      pauseBtn.classList.remove('confirming');
      pauseBtn.innerHTML='Play';
      updateUI();
    } else {
      // First tap — ask to confirm
      resetConfirming=true;
      resetBtn.classList.add('confirming');
      resetBtn.classList.remove('reset-btn-icon');
      resetBtn.innerHTML='CONFIRM';
      resetConfirmTimer=setTimeout(function(){
        resetConfirming=false;
        resetBtn.classList.remove('confirming');
        resetBtn.classList.add('reset-btn-icon');
        resetBtn.innerHTML='Refresh';
      },3000);
    }
  });

  // MASTER reset
  on(masterResetBtn,function(){
    if(!masterConfirming){
      masterConfirming=true;
      masterResetBtn.textContent='Confirm reset all';
      masterResetBtn.classList.add('red');
      setTimeout(function(){ if(masterConfirming) cancelMaster(); },4000);
    } else { doMasterReset(); }
  });
  function cancelMaster(){
    masterConfirming=false;
    masterResetBtn.textContent='Reset all';
    masterResetBtn.classList.remove('red');
  }
  function doMasterReset(){
    clearInterval(tmr);running=false;remaining=TOTAL;
    elapsed=0;everStarted=false;rounds=0;
    cycleCount.textContent='—';
    txLog=[];txCounts={};catchupShocks=0;catchupDisarms=0;catchupLma=0;catchupIo=0;catchupAdr=0;
    if(lmaToggle){ lmaToggle.classList.remove('active'); }
    if(ioToggle){ ioToggle.classList.remove('active'); }
    adrDueRound=null;
    clearSession();
    updateAdrLabel();
    updateLastTxBar();
    renderFull();
    cancelMaster();
    startBtn.classList.remove('hidden');
    display.classList.add('hidden');
    resetBtn.classList.add('hidden');
    resetBtn.classList.add('reset-btn-icon');
    resetBtn.classList.remove('confirming');
    resetBtn.innerHTML='Refresh';
    resetConfirming=false; clearTimeout(resetConfirmTimer);
    pauseBtn.classList.add('hidden');
    pauseBtn.classList.remove('confirming');
    pauseBtn.innerHTML='Pause';
    pauseConfirming=false; clearTimeout(pauseConfirmTimer);
    closeTx();updateUI();
    // Return to opening screen
    elapsedSnapshotTime=null; coachedSnapshotTime=null;
    elMins=0;elSecs=0;cdMins=0;cdSecs=0;
    updateElDisplay();updateCdDisplay();updateCounterDisplay();
    showStep(0);
    catchupOverlay.classList.add('open'); document.body.style.overflow='hidden';
  }

  // FULL LOG
  var summaryPanelOpen=false;
  var summaryPanel=document.getElementById('summaryPanel');
  var summaryLogTbody=document.getElementById('summaryLogTbody');
  var summaryLogTable=document.getElementById('summaryLogTable');
  var liveSummaryWrap2=document.getElementById('liveSummaryWrap2');
  var liveArrestSummary2=document.getElementById('liveArrestSummary2');
  var liveSummary2=document.getElementById('liveSummary2');
  var mgmtSummaryLabel2=document.getElementById('mgmtSummaryLabel2');
  var fullLogLabel3=document.getElementById('fullLogLabel3');
  var centralBoxNormal=document.getElementById('centralBoxNormal');

  on(fullLogBtn,function(){
    if(summaryPanelOpen){
      closeSummaryPanel();
    } else {
      closeTab();
      closeTx();
      renderInlineSummary();
      centralBoxNormal.style.visibility='hidden';
      summaryPanel.style.display='block';
      summaryPanelOpen=true;
      fullLogBtn.textContent='Close';
      fullLogBtn.classList.add('active');
    }
  });
  on(closeLogBtn,function(){ logOverlay.classList.remove('open'); });

  var warnTitle=document.getElementById('warnTitle');
  var warnBody=document.getElementById('warnBody');

  function showWarning(fromCeaseResus){
    if(fromCeaseResus){
      warnTitle.textContent='Close case?';
      warnBody.innerHTML='Closing the case will <strong>stop all timers</strong> and take you to the final Tx log. This cannot be undone.';
      warnConfirmBtn.textContent='Close case';
    } else {
      warnTitle.textContent='Stop all timers?';
      warnBody.innerHTML='This will <strong>stop all timers</strong> immediately. This cannot be undone — you will not be able to resume timing after export.';
      warnConfirmBtn.textContent='Stop timers \u0026 export';
    }
    warnOverlay.classList.add('open');
  }

  // CEASE RESUSCITATION
  on(document.getElementById('ceaseResus'),function(){
    closeTx();
    showWarning(true);
  });

  on(warnCancelBtn,function(){
    warnOverlay.classList.remove('open');
    warnConfirmBtn.style.background='';
  });
  on(warnConfirmBtn,function(){
    if(warnConfirmBtn.textContent==='Discard and restart'){
      warnConfirmBtn.style.background='';
      warnOverlay.classList.remove('open');
      exportOverlay.classList.remove('open');
      doMasterReset();
      return;
    }
    if(warnConfirmBtn.textContent==='Close case'){
      doLog('Case completed');
    }
    stopTimers();
    buildExportView();
    warnOverlay.classList.remove('open');
    warnConfirmBtn.style.background='';
    logOverlay.classList.remove('open');
    exportOverlay.classList.add('open');
    history.pushState({app:true},'','');
  });

  // Delete case button
  var deleteCaseBtn=document.getElementById('deleteCaseBtn');
  on(deleteCaseBtn,function(){
    warnTitle.textContent='Discard case data?';
    warnBody.innerHTML='Closing this summary will <strong>discard all data</strong> from this case. This cannot be undone.';
    warnConfirmBtn.textContent='Discard and restart';
    warnConfirmBtn.style.background='#C0392B';
    warnOverlay.classList.add('open');
    history.pushState({app:true},'','');
  });

  // SHARE
  var shareBtn=document.getElementById('shareBtn');
  on(shareBtn,function(){
    var text=buildShareText();
    if(navigator.share){
      navigator.share({ title:'CPR Tx Log', text:text }).catch(function(){});
    } else {
      // Fallback — copy to clipboard
      if(navigator.clipboard){
        navigator.clipboard.writeText(text).then(function(){
          shareBtn.textContent='Copied!';
          setTimeout(function(){ shareBtn.textContent='Share'; },2000);
        });
      } else {
        alert(text);
      }
    }
  });

  // PDF — opens print dialog in a new window
  on(document.getElementById('copyBtn'),function(){
    var lines=['THE BIG ONE — CASE SUMMARY',''];
    lines.push('ARREST SUMMARY');
    var shockC=0,disarmC=0;
    txLog.forEach(function(e){ if(e.name.match(/^Shock/i)) shockC++; else if(e.name.match(/^Disarm/i)) disarmC++; });
    lines.push('Total elapsed: '+fmtHMS(elapsed));
    lines.push('CPR rounds: '+(everStarted?rounds+1:'—'));
    if(shockC) lines.push('Shocks given: '+shockC);
    if(disarmC) lines.push('Disarmed: '+disarmC);
    lines.push('');
    var medC={};
    txLog.forEach(function(e){ if(MEDS_LIST.indexOf(e.name)!==-1) medC[e.name]=(medC[e.name]||0)+1; });
    var medKeys=Object.keys(medC).sort(function(a,b){ return a.localeCompare(b); });
    if(medKeys.length){
      lines.push('PHARMA SUMMARY');
      medKeys.forEach(function(k){ lines.push(k+': '+medC[k]); });
      lines.push('');
    }
    lines.push('TREATMENT LOG');
    txLog.slice().reverse().forEach(function(e){
      lines.push(e.clock+' ('+fmtHMS(e.sinceStart||0)+') — '+e.name+(e.dose>1?' #'+e.dose:''));
    });
    var text=lines.join('\n');
    navigator.clipboard.writeText(text).then(function(){
      var btn=document.getElementById('copyBtn');
      btn.textContent='Copied';
      setTimeout(function(){ btn.textContent='Copy'; },2000);
    }).catch(function(){
      prompt('Copy this summary:',text);
    });
  });
  on(document.getElementById('pdfBtn'),function(){
    var w=window.open('','_blank');
    if(!w) return;
    w.document.write(buildPdfHtml());
    w.document.close();
    w.focus();
  });

  function buildPdfHtml(){
    var shockC=0,noshockC=0,medC={};
    var MEDS_P=['Adrenaline push','Adrenaline infus.','Amiodarone','Atropine','Calcium','Glucose','Ketamine','Magnesium','Midazolam','Normal Saline','Sodium Bicarbonate','Suxamethonium'];
    txLog.forEach(function(e){
      if(e.name.match(/^Shock\b/i)) shockC++;
      else if(e.name.match(/^Disarm/i)) noshockC++;
      else if(MEDS_P.indexOf(e.name)!==-1) medC[e.name]=(medC[e.name]||0)+1;
    });
    var arrestRows=
      '<tr><td>Total elapsed</td><td>'+fmtHMS(elapsed)+'</td></tr>'+
      '<tr><td>CPR rounds</td><td>'+(everStarted?rounds+1:'—')+'</td></tr>'+
      (shockC?'<tr><td>Shocks given</td><td>'+shockC+'</td></tr>':'')+
      (noshockC?'<tr><td>Disarmed</td><td>'+noshockC+'</td></tr>':'');
    var medRows=Object.keys(medC).sort().map(function(k){
      return '<tr><td>'+k+'</td><td>'+medC[k]+'</td></tr>';
    }).join('');
    var logRows=txLog.map(function(e){
      var name=e.name+(e.dose>1?' #'+e.dose:'');
      var col=e.name.match(/^Shock\b/i)?'#A32D2D':e.name.match(/^Disarm/i)?'#185FA5':'#1a1a1a';
      var timeStr=e.clock||'—';
      var elapsedStr=fmtHMS(e.sinceStart||0);
      return '<tr><td style="color:'+col+'">'+name+'</td><td>'+timeStr+'</td><td>'+elapsedStr+'</td></tr>';
    }).join('');
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Case summary</title><style>'+
      '*{box-sizing:border-box;}'+
      'body{font-family:-apple-system,Arial,sans-serif;padding:56px 40px 48px;color:#1a1a1a;max-width:620px;margin:0 auto;}'+
      '.meta{font-size:12px;color:#888;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #1D9E75;}'+
      '.meta-title{font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}'+
      'h2{font-size:10px;color:#888;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-bottom:1px solid #e0e0e0;padding-bottom:6px;margin:28px 0 0;}'+
      'table{width:100%;border-collapse:collapse;margin-top:4px;}'+
      'td{padding:10px 6px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;}'+
      'td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums;color:#888;}'+
      'td:first-child{color:#1a1a1a;}'+
      'thead th{font-size:10px;color:#aaa;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:8px 6px 6px;border-bottom:1px solid #ddd;text-align:left;}'+
      'thead th:not(:first-child){text-align:right;}'+
      '@media print{@page{margin:1cm;}}'+ 
    '</style></head><body>'+
    '<div class="meta">'+
      '<div class="meta-title">Case summary</div>'+
      new Date().toLocaleString('en-AU')+
    '</div>'+
    '<h2>Arrest summary</h2><table><tbody>'+arrestRows+'</tbody></table>'+
    (medRows?'<h2>Pharma summary</h2><table><tbody>'+medRows+'</tbody></table>':'')+
    (txLog.length?'<h2>Treatment log</h2><table>'+
      '<thead><tr><th>Treatment</th><th>Time</th><th>Elapsed</th></tr></thead>'+
      '<tbody>'+logRows+'</tbody></table>':'')+
    '<script>window.onload=function(){window.print();};<\/script>'+
    '</body></html>';
  }

  function buildShareText(){
    var lines=[];
    lines.push('=== CPR TX LOG ===');
    lines.push('Total elapsed: '+fmt(elapsed));
    lines.push('CPR rounds: '+(everStarted?String(rounds+1):'—'));
    lines.push('');

    // Summary
    var MEDS_S=['Adrenaline push','Adrenaline infus.','Amiodarone','Atropine','Calcium','Glucose','Ketamine','Magnesium','Midazolam','Normal Saline','Sodium Bicarbonate','Suxamethonium'];
    var medCountSummary={}, shockC=0, noshockC=0;
    txLog.forEach(function(e){
      if(e.name.match(/^Shock\b/i)) shockC++;
      else if(e.name.match(/^Disarm/i)) noshockC++;
      else if(MEDS_S.indexOf(e.name)!==-1) medCountSummary[e.name]=(medCountSummary[e.name]||0)+1;
    });
    if(shockC||noshockC||Object.keys(medCountSummary).length){
      lines.push('--- SUMMARY ---');
      if(shockC) lines.push('Shocks given: '+shockC);
      if(noshockC) lines.push('Disarmed: '+noshockC);
      Object.keys(medCountSummary).sort().forEach(function(k){ lines.push(k+': '+medCountSummary[k]); });
      lines.push('');
    }

    // Full log
    if(txLog.length){
      lines.push('--- FULL LOG ---');
      lines.push('Treatment          Time  Since start');
      txLog.forEach(function(e){
        var name=(e.name+' #'+e.dose).padEnd(18,' ');
        lines.push(name+'  '+e.clock+'  '+fmtH(e.sinceStart));
      });
    } else {
      lines.push('No treatments logged.');
    }
    lines.push('');
    lines.push('==================');
    return lines.join('\n');
  }

  function buildExportView(){
    var shockC=0, noshockC=0, medC={};
    txLog.forEach(function(e){
      if(e.name.match(/^Shock\b/i)) shockC++;
      else if(e.name.match(/^Disarm/i)) noshockC++;
      else if(MEDS_LIST.indexOf(e.name)!==-1) medC[e.name]=(medC[e.name]||0)+1;
    });

    var html = '';

    // ARREST SUMMARY
    html += '<div class="summary-section-header">ARREST SUMMARY</div>';
    html += '<div class="summary-row"><span class="label">Total elapsed</span><span class="value">' + fmtHMS(elapsed) + '</span></div>';
    html += '<div class="summary-row"><span class="label">CPR rounds</span><span class="value">' + (everStarted ? rounds + 1 : '—') + '</span></div>';
    if(shockC > 0) {
      html += '<div class="summary-row"><span class="label">Shocks given</span><span class="value">' + shockC + '</span></div>';
    }
    if(noshockC > 0) {
      html += '<div class="summary-row"><span class="label">Disarmed</span><span class="value">' + noshockC + '</span></div>';
    }

    // PHARMA SUMMARY
    var medKeys = Object.keys(medC).sort();
    if (medKeys.length) {
      html += '<div class="summary-section-header">PHARMA SUMMARY</div>';
      medKeys.forEach(function(k) {
        html += '<div class="summary-row"><span class="label">' + k + '</span><span class="value">' + medC[k] + '</span></div>';
      });
    }

    // TREATMENT LOG
    html += '<div class="summary-section-header">TREATMENT LOG</div>';
    if (txLog.length) {
      html += '<table class="export-tbl" style="width:100%; border-collapse: collapse;">';
      html += '<thead><tr><th style="text-align:left;color:#999;font-weight:400;font-size:12px;padding:0 0 8px 16px;">Treatment</th><th style="text-align:right;color:#999;font-weight:400;font-size:12px;padding:0 0 8px 0;">Time</th><th style="text-align:right;color:#999;font-weight:400;font-size:12px;padding:0 16px 8px 0;">Elapsed</th></tr></thead>';
      html += '<tbody>';
      txLog.forEach(function(e) {
        var doseBadge = e.name === 'Case completed' ? '' : ' #' + e.dose;
        var clock = e.clockFull || (e.clock ? '< ' + e.clock : '');
        var elapsedVal = e.sinceStart !== undefined ? fmtHMS(e.sinceStart) : (e.priorOffset !== undefined ? '> ' + fmtH(e.priorOffset) : '');
        
        html += '<tr style="border-bottom:0.5px solid #eee;">' +
                  '<td style="padding:10px 0 10px 16px;font-size:15px;color:#333;">' + e.name + doseBadge + '</td>' +
                  '<td style="padding:10px 0;font-size:15px;color:#333;text-align:right;">' + clock + '</td>' +
                  '<td style="padding:10px 16px 10px 0;font-size:15px;color:#333;text-align:right;">' + elapsedVal + '</td>' +
                '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<div style="padding:12px 16px;color:#999;font-size:14px;">No treatments logged.</div>';
    }

    exportSummary.innerHTML = html;
    exportMeta.innerHTML = ''; // Not using this separate area anymore
  }

  function closeSummaryPanel(){
    if(summaryPanelOpen){
      summaryPanel.style.display='none';
      centralBoxNormal.style.visibility='visible';
      summaryPanelOpen=false;
      fullLogBtn.textContent='Running summary';
      fullLogBtn.classList.remove('active');
    }
  }

  on(txBtn,function(){
    if(txOpen){
      closeTx();
    } else {
      closeTab();
      closeSummaryPanel();
      txOpen=true;
      centralBoxNormal.style.visibility='hidden';
      txPanel.style.display='block';
      txBtn.classList.add('active');
      txBtn.textContent='Close';
    }
  });
  function closeTx(){
    txOpen=false;
    txPanel.style.display='none';
    centralBoxNormal.style.visibility='visible';
    txBtn.classList.remove('active');
    txBtn.textContent='Add Tx';
    // Collapse all accordion sections
    document.querySelectorAll('.tx-acc-header').forEach(function(h){ h.classList.remove('open'); });
    document.querySelectorAll('.tx-acc-body').forEach(function(b){ b.style.display='none'; });
  }
  var rhythmCueElapsed=null;
  var rhythmCueClock=null;
  var rhythmPrompt=document.getElementById('rhythmPrompt');
  function showShockPrompt(){
    rhythmPrompt.style.display='flex';
    history.pushState({app:true},'','');
  }
  function hideShockPrompt(){
    rhythmPrompt.style.display='none';
  }
  document.querySelectorAll('[data-shock-tx]').forEach(function(b){
    on(b,function(){
      var name=b.getAttribute('data-shock-tx');
      var now=new Date();
      var clock=rhythmCueClock||(String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'));
      var clockFull=clock+':'+String(now.getSeconds()).padStart(2,'0');
      var logElapsed=rhythmCueElapsed!==null?rhythmCueElapsed:elapsed;
      txCounts[name]=(txCounts[name]||0)+1;
      txLog.unshift({name:name,dose:txCounts[name],clock:clock,clockFull:clockFull,sinceStart:logElapsed,loggedAt:logElapsed});
      rhythmCueElapsed=null; rhythmCueClock=null;
      // Handle side effects (ROSC etc) via doLog-like logic
      if(name==='Disarm - ROSC'){
        document.querySelectorAll('#roscList .rev-item').forEach(function(i){ i.classList.remove('rev-checked'); });
        remaining=TOTAL; stopTick();
        pauseBtn.classList.remove('confirming'); pauseBtn.innerHTML='Play';
        adrDueRound=null; updateAdrLabel(); updateUI();
        
        openTab('rosc');
      } else if(name.match(/^Shock/i)||name.match(/^Disarm/i)){
        document.querySelectorAll('#roscList .rev-item').forEach(function(i){ i.classList.remove('rev-checked'); });
      }
      if(name==='Adrenaline push'){ adrDueRound=(rounds+1)+2; updateAdrLabel(); }
      renderFull(); renderLiveSummary(); closeTx();
      if(summaryPanelOpen) renderInlineSummary();
      updateLastTxBar(); saveSession();
      hideShockPrompt();
    });
  });
  on(document.getElementById('rhythmPromptSkip'),function(){
    rhythmCueElapsed=null; rhythmCueClock=null;
    hideShockPrompt();
  });
  document.querySelectorAll('.tx-acc-header').forEach(function(h){
    on(h,function(){
      var bodyId=h.getAttribute('data-target');
      var body=document.getElementById(bodyId);
      var isOpen=h.classList.contains('open');
      // Close all
      document.querySelectorAll('.tx-acc-header').forEach(function(hh){ hh.classList.remove('open'); });
      document.querySelectorAll('.tx-acc-body').forEach(function(bb){ bb.style.display='none'; });
      // Open this one if it was closed
      if(!isOpen){
        h.classList.add('open');
        body.style.display='block';
      }
    });
  });

  // Other free-text entry
  var otherTxInput=document.getElementById('otherTxInput');
  var otherTxSubmit=document.getElementById('otherTxSubmit');
  function submitOtherTx(){
    var val=otherTxInput.value.trim();
    if(!val) return;
    doLog(val);
    otherTxInput.value='';
  }
  on(otherTxSubmit,function(){ submitOtherTx(); });
  otherTxInput.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submitOtherTx(); } });
  document.querySelectorAll('[data-tx]').forEach(function(b){
    on(b,function(){ doLog(b.getAttribute('data-tx')); });
  });

  var lastTxBar=document.getElementById('lastTxBar');
  var lastTxName=document.getElementById('lastTxName');
  var lastTxAgo=document.getElementById('lastTxAgo');

  function updateLastTxBar(){
    if(!lastTxBar) return;
    var nonPrior=txLog.filter(function(e){ return !e.prior; });
    if(!nonPrior.length){
      lastTxName.textContent='No treatment logged';
      lastTxName.style.color='var(--txt3)';
      lastTxAgo.textContent='';
      return;
    }
    var e=nonPrior[0];
    lastTxName.textContent=e.name+(e.dose>1?' #'+e.dose:'');
    lastTxName.style.color='var(--txt)';
    if(e.name.match(/^Shock\b/i)) lastTxName.style.color='#A32D2D';
    else if(e.name.match(/^Disarm/i)) lastTxName.style.color='#185FA5';
    lastTxAgo.textContent=e.clock||'';
  }
  var adrDueRound=null;
  var adrDueLabel=document.getElementById('adrDueLabel');

  function updateAdrLabel(){
    if(!adrDueLabel) return;
    var cur=rounds+1;
    adrDueLabel.style.display='block';
    if(adrDueRound===null){
      adrDueLabel.style.color='#E24B4A';
      adrDueLabel.style.animation='';
      adrDueLabel.textContent='Nil Adr. given';
    } else if(cur>=adrDueRound){
      adrDueLabel.style.color='#E24B4A';
      adrDueLabel.textContent='Adr due round '+adrDueRound;
      if(cur>=adrDueRound){
        adrDueLabel.style.animation='adr-label-flash 1s ease-in-out infinite';
      } else {
        adrDueLabel.style.animation='';
      }
    } else {
      adrDueLabel.style.color='#E24B4A';
      adrDueLabel.textContent='Adr due round '+adrDueRound;
    }
  }

  function doLog(name){
    var now=new Date();
    var clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    var clockFull=clock+':'+String(now.getSeconds()).padStart(2,'0');
    txCounts[name]=(txCounts[name]||0)+1;
    txLog.unshift({name:name,dose:txCounts[name],clock:clock,clockFull:clockFull,sinceStart:everStarted?elapsed:0,loggedAt:elapsed});
    if(name==='Adrenaline push'){ adrDueRound=(rounds+1)+2; updateAdrLabel(); }
    if(name==='Disarm - ROSC'){
      document.querySelectorAll('#roscList .rev-item').forEach(function(i){ i.classList.remove('rev-checked'); });
      if(roscBtn) roscBtn.style.display='block';
      remaining=TOTAL;
      stopTick();
      pauseBtn.classList.add('paused');
      pauseBtn.innerHTML='Play';
      adrDueRound=null;
      updateAdrLabel();
      updateUI();
      
      openTab('rosc');
    } else if(name.match(/^Shock/i)||name.match(/^Disarm/i)){
      // Reset ROSC checklist only - do not reset COACHED timer
      document.querySelectorAll('#roscList .rev-item').forEach(function(i){ i.classList.remove('rev-checked'); });
    }
    renderFull();renderLiveSummary();closeTx();
    if(summaryPanelOpen) renderInlineSummary();
    updateLastTxBar();
    saveSession();
  }

  // Tx row tap — show action popup
  var txActionPopup=document.getElementById('txActionPopup');
  var txActionName=document.getElementById('txActionName');
  var txActionIdx=null;
  var changingTxIdx=null;

  function showTxActionPopup(idx){
    txActionIdx=idx;
    txActionName.textContent=txLog[idx].name+(txLog[idx].dose>1?' #'+txLog[idx].dose:'');
    txActionPopup.style.display='flex';
  }
  function hideTxActionPopup(){
    txActionPopup.style.display='none';
    txActionIdx=null;
  }

  [document.getElementById('logTbody'), document.getElementById('summaryLogTbody')].forEach(function(tbody){
    tbody.addEventListener('click',function(e){
      var row=e.target.closest('tr[data-idx]');
      if(row) showTxActionPopup(parseInt(row.getAttribute('data-idx')));
    });
  });

  on(document.getElementById('txActionCancel'),function(){ hideTxActionPopup(); });

  on(document.getElementById('txActionDelete'),function(){
    if(txActionIdx===null) return;
    var i=txActionIdx;
    txCounts[txLog[i].name]=Math.max(0,(txCounts[txLog[i].name]||1)-1);
    txLog.splice(i,1);
    renderFull();renderLiveSummary();
    if(summaryPanelOpen) renderInlineSummary();
    saveSession();
    hideTxActionPopup();
  });

  on(document.getElementById('txActionChange'),function(){
    changingTxIdx=txActionIdx;
    document.getElementById('txActionScreen').style.display='none';
    document.getElementById('txChangeScreen').style.display='block';
  });

  on(document.getElementById('txChangeCancelBtn'),function(){
    document.getElementById('txChangeScreen').style.display='none';
    document.getElementById('txActionScreen').style.display='block';
    // Reset popup accordion
    document.querySelectorAll('.pop-acc-header').forEach(function(h){ h.classList.remove('open'); });
    document.querySelectorAll('#txChangeScreen .tx-acc-body').forEach(function(b){ b.style.display='none'; });
  });

  // Popup accordion
  document.querySelectorAll('.pop-acc-header').forEach(function(h){
    on(h,function(){
      var bodyId=h.getAttribute('data-target');
      var body=document.getElementById(bodyId);
      var isOpen=h.classList.contains('open');
      document.querySelectorAll('.pop-acc-header').forEach(function(hh){ hh.classList.remove('open'); });
      document.querySelectorAll('#txChangeScreen .tx-acc-body').forEach(function(bb){ bb.style.display='none'; });
      if(!isOpen){ h.classList.add('open'); body.style.display='block'; }
    });
  });

  // Change Tx selection
  document.querySelectorAll('[data-change-tx]').forEach(function(b){
    on(b,function(){
      if(changingTxIdx===null) return;
      var name=b.getAttribute('data-change-tx');
      var old=txLog[changingTxIdx];
      txCounts[old.name]=Math.max(0,(txCounts[old.name]||1)-1);
      txCounts[name]=(txCounts[name]||0)+1;
      txLog[changingTxIdx]=Object.assign({},old,{name:name,dose:txCounts[name]});
      changingTxIdx=null;
      renderFull();renderLiveSummary();
      if(summaryPanelOpen) renderInlineSummary();
      updateLastTxBar();saveSession();
      // Reset popup
      document.getElementById('txChangeScreen').style.display='none';
      document.getElementById('txActionScreen').style.display='block';
      document.querySelectorAll('.pop-acc-header').forEach(function(h){ h.classList.remove('open'); });
      document.querySelectorAll('#txChangeScreen .tx-acc-body').forEach(function(b){ b.style.display='none'; });
      hideTxActionPopup();
    });
  });

  function rowHtml(e,i){
    var doseBadge=e.name==='Case completed'?'':'<span class="dose">#'+e.dose+'</span>';
    var nmClass='nm';
    if(e.name.match(/^Shock\b/i)) nmClass='nm shock';
    else if(e.name.match(/^Disarm\b/i)) nmClass='nm disarm';
    if(e.prior){
      var priorClock=e.clock?'&lt; '+e.clock:'&lt; —';
      var priorAgo=e.priorOffset!==undefined?'&gt; '+fmtH(e.priorOffset):'&gt; —';
      var priorElapsed=e.priorOffset!==undefined?'&lt; '+fmtH(e.priorOffset):'&lt; —';
      return '<tr data-idx="'+i+'" style="cursor:pointer;">'+
        '<td class="'+nmClass+'">'+e.name+doseBadge+'</td>'+
        '<td class="r" style="color:var(--txt3);font-size:13px;">'+priorClock+'</td>'+
        '<td class="r" style="color:var(--txt3);font-size:13px;">'+priorElapsed+'</td>'+
        '<td class="r" style="color:var(--txt3);font-size:13px;">'+priorAgo+'</td>'+
      '</tr>';
    }
    return '<tr data-idx="'+i+'" style="cursor:pointer;">'+
      '<td class="'+nmClass+'">'+e.name+doseBadge+'</td>'+
      '<td class="r">'+e.clock+'</td>'+
      '<td class="r">'+fmtH(e.sinceStart)+'</td>'+
      '<td class="ago">'+fmtH(elapsed-e.loggedAt)+'</td>'+
    '</tr>';
  }

  function renderLiveSummary(){
    var medCountObj={};
    txLog.forEach(function(e){
      if(MEDS_LIST.indexOf(e.name)!==-1) medCountObj[e.name]=(medCountObj[e.name]||0)+1;
    });
    var medKeys=Object.keys(medCountObj).sort(function(a,b){ return a.localeCompare(b); });
    var rows = medKeys.length ? '<table class="summary-tbl"><tbody>'+medKeys.map(function(k){
      return '<tr><td class="s-label">'+k+'</td><td class="s-val">'+medCountObj[k]+'</td></tr>';
    }).join('')+'</tbody></table>' : '';

    // Arrest summary
    var shockC=0,disarmC=0;
    txLog.forEach(function(e){
      if(e.name.match(/^Shock\b/i)) shockC++;
      else if(e.name.match(/^Disarm/i)) disarmC++;
    });
    var arrestHtml='<table class="summary-tbl"><tbody>'+
      '<tr><td class="s-label">CPR rounds</td><td class="s-val">'+(everStarted?rounds+1:'—')+'</td></tr>'+
      (shockC?'<tr><td class="s-label" style="color:#A32D2D;font-weight:600;">Shocks given</td><td class="s-val" style="color:#A32D2D;font-weight:600;">'+shockC+'</td></tr>':'')+
      (disarmC?'<tr><td class="s-label" style="color:#185FA5;font-weight:600;">Disarmed</td><td class="s-val" style="color:#185FA5;font-weight:600;">'+disarmC+'</td></tr>':'')+
      '</tbody></table>';
    if(liveArrestSummary) liveArrestSummary.innerHTML=arrestHtml;
    if(everStarted) liveSummaryWrap.style.display='block';
    if(rows){
      liveSummary.innerHTML=rows;
      if(mgmtSummaryLabel) mgmtSummaryLabel.style.display='block';
      fullLogLabel2.style.display='block';
    } else {
      liveSummary.innerHTML='';
      if(mgmtSummaryLabel) mgmtSummaryLabel.style.display='none';
      fullLogLabel2.style.display='none';
    }
  }

  function renderInlineSummary(){
    var medCountObj={};
    var shockC=0,disarmC=0;
    txLog.forEach(function(e){
      if(e.name.match(/^Shock\b/i)) shockC++;
      else if(e.name.match(/^Disarm/i)) disarmC++;
      else if(MEDS_LIST.indexOf(e.name)!==-1) medCountObj[e.name]=(medCountObj[e.name]||0)+1;
    });
    var arrestHtml='<table class="summary-tbl"><tbody>'+
      '<tr><td class="s-label">CPR rounds</td><td class="s-val">'+(everStarted?rounds+1:'—')+'</td></tr>'+
      (shockC?'<tr><td class="s-label" style="color:#A32D2D;font-weight:600;">Shocks given</td><td class="s-val" style="color:#A32D2D;font-weight:600;">'+shockC+'</td></tr>':'')+
      (disarmC?'<tr><td class="s-label" style="color:#185FA5;font-weight:600;">Disarmed</td><td class="s-val" style="color:#185FA5;font-weight:600;">'+disarmC+'</td></tr>':'')+
      '</tbody></table>';
    liveArrestSummary2.innerHTML=arrestHtml;
    liveSummaryWrap2.style.display='block';
    var medKeys=Object.keys(medCountObj).sort(function(a,b){ return a.localeCompare(b); });
    if(medKeys.length){
      mgmtSummaryLabel2.style.display='block';
      liveSummary2.innerHTML='<table class="summary-tbl"><tbody>'+medKeys.map(function(k){
        return '<tr><td class="s-label">'+k+'</td><td class="s-val">'+medCountObj[k]+'</td></tr>';
      }).join('')+'</tbody></table>';
    } else {
      mgmtSummaryLabel2.style.display='none';
      liveSummary2.innerHTML='';
    }
    if(txLog.length){
      fullLogLabel3.style.display='block';
      summaryLogTable.style.display='table';
      summaryLogTbody.innerHTML=txLog.map(function(e,i){ return rowHtml(e,i); }).join('');
    } else {
      fullLogLabel3.style.display='none';
      summaryLogTable.style.display='none';
    }
  }
  function renderFull(){
    if(!txLog.length){ logTbody.innerHTML='<tr><td colspan="5" class="log-empty">No treatments logged yet</td></tr>'; return; }
    logTbody.innerHTML=txLog.map(function(e,i){ return rowHtml(e,i); }).join('');
  }
  function updateAgo(){
    [logTbody].forEach(function(tb){
      tb.querySelectorAll('tr[data-idx]').forEach(function(row){
        var e=txLog[parseInt(row.getAttribute('data-idx'))];
        var agoCell=row.querySelector('.ago');
        if(e&&agoCell) agoCell.textContent=fmtH(elapsed-e.loggedAt);
      });
    });
  }

  // Check for saved session on load — auto-resume if found
  var savedSessionOnLoad=checkSavedSession();
  if(savedSessionOnLoad){
    catchupOverlay.classList.remove('open'); document.body.style.overflow='';
    restoreSession(savedSessionOnLoad);
  }

  // TAB PANEL — Reversibles / ROSC / PHEA
  var tabBtns={rev:document.getElementById('revBtn'),rosc:document.getElementById('roscBtn'),rsi:document.getElementById('pheaBtn')};
  var tabLabels={rev:'Reversibles',rosc:'ROSC',rsi:'PHEA'};
  var tabColors={rev:'#4A90D9',rosc:'#E6A020',rsi:'#5B4A8A',default:'#1D9E75'};
  var activeTab=null;

  var tabOverlayMap={rev:'tabOverlayRev',rosc:'tabOverlayRosc',rsi:'tabOverlayRsi'};

  function openTab(name){
    if(activeTab===name){
      closeTab();
    } else {
      closeSummaryPanel();
      closeTx();
      Object.keys(tabOverlayMap).forEach(function(k){
        document.getElementById(tabOverlayMap[k]).style.display='none';
        tabBtns[k].classList.remove('active');
        tabBtns[k].textContent=tabLabels[k];
      });
      centralBoxNormal.style.visibility='hidden';
      document.getElementById(tabOverlayMap[name]).style.display='block';
      tabBtns[name].classList.add('active');
      tabBtns[name].textContent='Close';
      centralBox.style.borderColor=tabColors[name];
      activeTab=name;
      history.pushState({app:true},'','');
    }
  }

  function closeTab(){
    Object.keys(tabOverlayMap).forEach(function(k){
      document.getElementById(tabOverlayMap[k]).style.display='none';
      tabBtns[k].classList.remove('active');
      tabBtns[k].textContent=tabLabels[k];
    });
    centralBoxNormal.style.visibility='visible';
    centralBox.style.borderColor=tabColors.default;
    activeTab=null;
  }

  on(document.getElementById('revBtn'),function(){ openTab('rev'); });
  on(document.getElementById('roscBtn'),function(){ openTab('rosc'); });
  on(document.getElementById('pheaBtn'),function(){ openTab('rsi'); });

  // Checklist item toggles
  ['tabOverlayRev','tabOverlayRosc','tabOverlayRsi'].forEach(function(id){
    document.getElementById(id).addEventListener('click',function(e){
      var item=e.target.closest('.rev-item');
      if(item) item.classList.toggle('rev-checked');
    });
  });

  // BACK BUTTON
  history.pushState({app:true},'','');

  window.addEventListener('popstate',function(e){
    history.pushState({app:true},'','');
    if(warnOverlay.classList.contains('open')){ warnOverlay.classList.remove('open'); }
    else if(exportOverlay.classList.contains('open')){
      warnTitle.textContent='Discard case data?';
      warnBody.innerHTML='Closing this summary will <strong>discard all data</strong> from this case. This cannot be undone.';
      warnConfirmBtn.textContent='Discard and restart';
      warnConfirmBtn.style.background='#C0392B';
      warnOverlay.classList.add('open');
    }
    else if(rhythmPrompt&&rhythmPrompt.style.display!=='none'){ hideShockPrompt(); }
    else if(activeTab){ closeTab(); }
    else if(logOverlay.classList.contains('open')){ logOverlay.classList.remove('open'); }
    else if(catchupOverlay.classList.contains('open')){
      var curStepArr=[1,2,3].filter(function(stepIdx){ var el=document.getElementById('catchupStep'+stepIdx); return el&&el.style.display!=='none'; });
      var curSt = curStepArr.length ? curStepArr[0] : 0;
      if(curSt>=1) showStep(curSt>1?curSt-1:0);
    }
  });

  window.addEventListener('focus',function(){
    history.pushState({app:true},'','');
  });

  updateUI();

  // WAKE LOCK
  var wlObj=null;
  function requestWakeLock(){
    if('wakeLock' in navigator){
      navigator.wakeLock.request('screen').then(function(wl){
        wlObj=wl;
        wl.addEventListener('release',function(){
          if(everStarted&&!document.hidden) requestWakeLock();
        });
      }).catch(function(){});
    }
  }
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&everStarted) requestWakeLock();
  });
})();
