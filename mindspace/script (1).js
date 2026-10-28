/* =========================================================
   MindSpace – script.js
   Sections:
   1. Constants & helpers   2. Storage   3. Navigation
   4. Home                  5. Tracker   6. Insights & chart
   7. Quiz                  8. Breathing 9. Habits   10. Init
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. CONSTANTS & HELPERS ---------- */
  var ENTRIES_KEY = 'mindspace.entries.v1';
  var HABITS_KEY = 'mindspace.habits.v1';
  var MOODS = ['Calm', 'Okay', 'Worried', 'Low', 'Positive'];
  var VIEWS = ['home', 'track', 'learn', 'breathe', 'habits', 'privacy'];
  var HABITS = [
    'Got adequate sleep',
    'Did some physical activity',
    'Took a break from studying',
    'Spent time outdoors or did a relaxing activity',
    'Connected with a supportive person'
  ];
  var QUOTES = [
    'You can take things one step at a time.',
    'A short break is still a meaningful break.',
    'Noticing how you feel is a useful first step.',
    "You don't have to make every day perfect."
  ];
  var HABIT_MSGS = [
    'Every small step counts.',
    'Choose what feels realistic today.',
    'Rest is part of a healthy routine.',
    "You can begin again whenever you're ready."
  ];

  function $(id) { return document.getElementById(id); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Local calendar date key, e.g. "2026-10-28" (uses the user's own timezone)
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function makeId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Safe element builder: text always goes in via textContent (never innerHTML)
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var toastTimer = null;
  function toast(msg, warn) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (warn ? ' warn' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3000);
  }

  /* ---------- 2. STORAGE ---------- */
  // If localStorage is blocked/full we keep data in memory so the session still works.
  var memory = {};
  var storageOk = true;

  function readRaw(key) {
    try {
      var v = window.localStorage.getItem(key);
      return v === null ? (memory[key] || null) : v;
    } catch (e) {
      storageOk = false;
      return memory[key] || null;
    }
  }
  function writeRaw(key, value) {
    memory[key] = value;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      storageOk = false;
      return false;
    }
  }

  function validEntry(e) {
    return e && typeof e === 'object' &&
      typeof e.id === 'string' &&
      MOODS.indexOf(e.mood) !== -1 &&
      typeof e.stress === 'number' && e.stress >= 1 && e.stress <= 10 &&
      typeof e.ts === 'number' && isFinite(e.ts) &&
      (e.note === undefined || typeof e.note === 'string');
  }

  function loadEntries() {
    var raw = readRaw(ENTRIES_KEY);
    if (!raw) return [];
    try {
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.filter(validEntry); // silently drop bad records instead of crashing
    } catch (e) {
      return [];
    }
  }
  function saveEntries(list) {
    var ok = writeRaw(ENTRIES_KEY, JSON.stringify(list));
    if (!ok) toast("Couldn't save to this browser's storage. Your entry will last only until you close this page.", true);
    return ok;
  }

  function loadHabits() {
    var raw = readRaw(HABITS_KEY);
    if (!raw) return {};
    try {
      var data = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (e) {
      return {};
    }
  }
  function saveHabits(obj) {
    var ok = writeRaw(HABITS_KEY, JSON.stringify(obj));
    if (!ok) toast("Couldn't save to this browser's storage. Changes last only for this session.", true);
  }

  /* ---------- 3. NAVIGATION ---------- */
  function currentView() {
    var h = (location.hash || '').replace('#', '');
    return VIEWS.indexOf(h) !== -1 ? h : 'home';
  }

  function showView() {
    var name = currentView();

    // Stop the breathing timer if we leave that section
    if (name !== 'breathe') stopBreathing(true);

    VIEWS.forEach(function (v) { $('view-' + v).hidden = (v !== name); });

    var section = $('view-' + name);
    $('page-title').textContent = section.getAttribute('data-title');
    $('page-subtitle').textContent = section.getAttribute('data-subtitle');
    document.title = section.getAttribute('data-title') + ' – MindSpace';

    var links = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < links.length; i++) {
      var active = links[i].getAttribute('data-nav') === name;
      links[i].classList.toggle('active', active);
      if (active) links[i].setAttribute('aria-current', 'page');
      else links[i].removeAttribute('aria-current');
    }

    renderAll();
    window.scrollTo(0, 0);
  }

  /* ---------- 4. HOME ---------- */
  var quoteIndex = 0;
  function dayOfYear() {
    var now = new Date();
    return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  }
  function renderQuote() {
    $('daily-quote').textContent = QUOTES[quoteIndex % QUOTES.length];
  }

  function renderToday() {
    var box = $('today-summary');
    box.textContent = '';
    var entries = loadEntries();
    var today = dateKey();
    var todays = entries.filter(function (e) { return dateKey(new Date(e.ts)) === today; });
    var habitsDone = countHabits(today);

    if (!entries.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('p', null, 'No check-ins yet. Your first one only takes a moment.'));
      var a = el('a', 'btn btn-primary btn-small', 'Make your first check-in');
      a.href = '#track';
      empty.appendChild(a);
      box.appendChild(empty);
    } else {
      var latest = entries.slice().sort(function (a, b) { return b.ts - a.ts; })[0];
      var row = el('div', 'stat-row');
      row.appendChild(stat(todays.length ? 'Done' : 'Not yet', "Today's check-in"));
      row.appendChild(stat(latest.mood, 'Latest mood'));
      row.appendChild(stat(latest.stress + '/10', 'Latest stress rating'));
      box.appendChild(row);
    }
    var hrow = el('div', 'stat-row');
    hrow.appendChild(stat(habitsDone + ' of ' + HABITS.length, 'Habits completed today'));
    box.appendChild(hrow);
    var b = el('a', 'text-link', 'Take a breathing break');
    b.href = '#breathe';
    box.appendChild(b);
  }
  function stat(value, label) {
    var d = el('div', 'stat');
    d.appendChild(el('b', null, value));
    d.appendChild(el('span', null, label));
    return d;
  }

  /* ---------- 5. TRACKER ---------- */
  var saving = false; // blocks double-clicks

  function buildRatingGrid() {
    var grid = $('rating-grid');
    for (var i = 1; i <= 10; i++) {
      var label = el('label', 'rating');
      var input = document.createElement('input');
      input.type = 'radio'; input.name = 'stress'; input.value = String(i);
      input.setAttribute('aria-label', i + ' out of 10');
      label.appendChild(input);
      label.appendChild(el('span', null, String(i)));
      grid.appendChild(label);
    }
  }

  function selectedValue(name) {
    var c = document.querySelector('input[name="' + name + '"]:checked');
    return c ? c.value : null;
  }

  function submitCheckin(ev) {
    ev.preventDefault();
    if (saving) return;

    var mood = selectedValue('mood');
    var stress = parseInt(selectedValue('stress'), 10);
    var note = $('note').value.trim().slice(0, 500);

    var moodOk = MOODS.indexOf(mood) !== -1;
    var stressOk = stress >= 1 && stress <= 10;
    $('mood-error').hidden = moodOk;
    $('rating-error').hidden = stressOk;
    if (!moodOk || !stressOk) {
      (moodOk ? $('rating-grid') : $('mood-grid')).querySelector('input').focus();
      return;
    }

    saving = true;
    $('save-btn').disabled = true;

    var entries = loadEntries();
    entries.push({ id: makeId(), ts: Date.now(), mood: mood, stress: stress, note: note });
    var ok = saveEntries(entries);
    if (ok) toast('Check-in saved. Thank you for noticing how you feel.');

    // Reset the form
    $('checkin-form').reset();
    $('note-count').textContent = '0';
    $('rating-current').textContent = 'No rating selected yet.';

    renderAll();
    setTimeout(function () { saving = false; $('save-btn').disabled = false; }, 400);
  }

  function deleteEntry(id) {
    var list = loadEntries().filter(function (e) { return e.id !== id; });
    saveEntries(list);
    toast('Entry deleted.');
    renderAll();
  }

  function renderHistory() {
    var ul = $('history');
    ul.textContent = '';
    var entries = loadEntries().sort(function (a, b) { return b.ts - a.ts; });
    $('clear-all').hidden = entries.length === 0;

    if (!entries.length) {
      var li = el('li', 'empty');
      li.appendChild(el('p', null, 'No check-ins yet. Your history will appear here after you save one.'));
      ul.appendChild(li);
      return;
    }
    entries.forEach(function (e) {
      var li = el('li', 'entry');
      var main = el('div', 'entry-main');
      var top = el('div', 'entry-top');
      top.appendChild(el('span', 'badge', e.mood));
      top.appendChild(el('strong', null, 'Stress ' + e.stress + '/10'));
      top.appendChild(el('span', 'entry-date', fmtDate(e.ts) + ' · ' + fmtTime(e.ts)));
      main.appendChild(top);
      if (e.note) main.appendChild(el('p', 'entry-note', e.note)); // textContent = safe
      li.appendChild(main);

      var btn = el('button', 'icon-btn');
      btn.type = 'button';
      btn.setAttribute('data-delete', e.id);
      btn.setAttribute('aria-label', 'Delete check-in from ' + fmtDate(e.ts) + ' at ' + fmtTime(e.ts));
      btn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>'; // static markup only
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  /* ---------- 6. INSIGHTS & CHART ---------- */
  function renderInsights() {
    var box = $('insights');
    box.textContent = '';
    var entries = loadEntries().sort(function (a, b) { return a.ts - b.ts; });

    if (!entries.length) {
      var e = el('div', 'empty');
      e.appendChild(el('p', null, 'Your history will appear here after you record a few check-ins.'));
      box.appendChild(e);
      return;
    }

    var DAY = 86400000, now = Date.now();
    var last7 = entries.filter(function (x) { return x.ts > now - 7 * DAY; });
    var prev7 = entries.filter(function (x) { return x.ts <= now - 7 * DAY && x.ts > now - 14 * DAY; });
    var latest = entries[entries.length - 1];

    var row = el('div', 'stat-row');
    row.appendChild(stat(String(entries.length), 'Check-ins recorded (entries, not days)'));
    row.appendChild(stat(latest.stress + '/10', 'Most recent rating'));
    row.appendChild(stat(last7.length ? avg(last7).toFixed(1) + '/10' : '–', 'Average of the last 7 days (' + last7.length + ' ' + (last7.length === 1 ? 'entry' : 'entries') + ')'));
    box.appendChild(row);

    box.appendChild(el('p', 'hint', 'The average is the simple mean of your own ratings from the past 7 days. These are self-reported feelings, not measurements of hormones, brain activity or any condition.'));

    // Neutral week-on-week comparison, only when both weeks have data
    if (last7.length && prev7.length) {
      var a = avg(last7), b = avg(prev7), msg;
      if (Math.abs(a - b) < 0.5) msg = 'Your recorded stress ratings were about the same this week as last week.';
      else if (a > b) msg = 'Your recorded stress ratings were higher this week than last week.';
      else msg = 'Your recorded stress ratings were lower this week than last week.';
      box.appendChild(el('p', null, msg));
    }

    // Simple CSS bar chart of the last 14 entries (no library needed)
    var recent = entries.slice(-14);
    var chart = el('div', 'chart');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', 'Bar chart of your last ' + recent.length + ' stress ratings, each from 1 to 10. The same data is listed in the history below.');
    var axis = el('div', 'chart-axis');
    axis.setAttribute('aria-hidden', 'true');
    axis.appendChild(el('span', null, '10'));
    axis.appendChild(el('span', null, '1'));
    chart.appendChild(axis);
    recent.forEach(function (x) {
      var bar = el('div', 'chart-bar');
      bar.style.height = (x.stress * 10) + '%';
      bar.title = x.stress + '/10 – ' + fmtDate(x.ts) + ' ' + fmtTime(x.ts);
      bar.appendChild(el('span', null, String(x.stress)));
      chart.appendChild(bar);
    });
    box.appendChild(chart);
    box.appendChild(el('p', 'chart-caption', 'Last ' + recent.length + ' check-ins, oldest on the left. Scale 1 (very low) to 10 (very high).'));
  }
  function avg(list) {
    var s = 0;
    list.forEach(function (x) { s += x.stress; });
    return s / list.length;
  }

  /* ---------- 7. QUIZ ---------- */
  var QUIZ = [
    { q: 'What is a main role of the amygdala?',
      o: ['Processing emotionally important information, including possible threats', 'Storing all long-term memories by itself', 'Controlling heartbeat directly', 'Producing cortisol'],
      a: 0, why: 'The amygdala helps process emotionally important information and contributes to stress responses. It works with other regions rather than acting alone.' },
    { q: 'The hippocampus is most closely linked with...',
      o: ['Learning, memory and context', 'Digesting food', 'Making adrenaline', 'Controlling breathing speed'],
      a: 0, why: 'The hippocampus supports learning, memory and context, and is also involved in regulating stress-related processes.' },
    { q: 'Which area supports planning, decision-making and regulating responses?',
      o: ['Prefrontal cortex', 'Adrenal cortex', 'Pituitary gland', 'Amygdala'],
      a: 0, why: 'The prefrontal cortex supports attention, planning, decision-making and regulating our responses.' },
    { q: 'What is the order of the HPA axis?',
      o: ['Hypothalamus → CRH → Pituitary → ACTH → Adrenal cortex → Cortisol', 'Adrenal cortex → ACTH → Pituitary → CRH → Hypothalamus', 'Pituitary → CRH → Hypothalamus → Cortisol', 'Hypothalamus → Cortisol → ACTH → Pituitary'],
      a: 0, why: 'The hypothalamus releases CRH, the pituitary responds with ACTH, and the adrenal cortex responds by releasing cortisol. Feedback regulation also keeps the system in balance.' },
    { q: 'Which statement about stress is most accurate?',
      o: ['Short-term stress can be an adaptive response, while repeated stress without recovery may contribute to strain', 'All stress permanently damages the brain', 'Stress only affects mood', 'Stress responses are identical in everyone'],
      a: 0, why: 'Short-term stress can help us respond to challenges. Repeated or prolonged stress without enough recovery may contribute to strain, but outcomes vary between people.' }
  ];
  var quizIndex = 0, quizScore = 0;

  function renderQuiz() {
    var box = $('quiz');
    box.textContent = '';
    if (quizIndex >= QUIZ.length) {
      box.appendChild(el('p', 'quiz-q', 'You got ' + quizScore + ' out of ' + QUIZ.length + '. Nicely done for taking a moment to learn!'));
      var again = el('button', 'btn btn-secondary', 'Try again');
      again.type = 'button';
      again.setAttribute('data-quiz-restart', '1');
      box.appendChild(again);
      return;
    }
    var item = QUIZ[quizIndex];
    box.appendChild(el('p', 'hint', 'Question ' + (quizIndex + 1) + ' of ' + QUIZ.length));
    box.appendChild(el('p', 'quiz-q', item.q));
    var wrap = el('div', 'quiz-options');
    item.o.forEach(function (text, i) {
      var b = el('button', 'quiz-opt', text);
      b.type = 'button';
      b.setAttribute('data-quiz-opt', String(i));
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
    var fb = el('div', 'quiz-feedback');
    fb.id = 'quiz-fb';
    fb.setAttribute('aria-live', 'polite');
    fb.hidden = true;
    box.appendChild(fb);
  }

  function answerQuiz(i) {
    var item = QUIZ[quizIndex];
    var opts = document.querySelectorAll('.quiz-opt');
    for (var k = 0; k < opts.length; k++) {
      opts[k].disabled = true;
      if (k === item.a) opts[k].classList.add('right');
      else if (k === i) opts[k].classList.add('wrong');
    }
    var correct = i === item.a;
    if (correct) quizScore++;
    var fb = $('quiz-fb');
    fb.hidden = false;
    fb.textContent = '';
    fb.appendChild(el('strong', null, correct ? 'That\'s right. ' : 'Not quite, and that\'s okay. '));
    fb.appendChild(document.createTextNode(item.why));
    var next = el('button', 'btn btn-primary btn-small', quizIndex === QUIZ.length - 1 ? 'See result' : 'Next question');
    next.type = 'button';
    next.setAttribute('data-quiz-next', '1');
    next.style.marginTop = '.6rem';
    fb.appendChild(document.createElement('br'));
    fb.appendChild(next);
  }

  /* ---------- 8. BREATHING ---------- */
  var TOTAL = 60;      // seconds
  var PHASE = 4;       // seconds per breath in/out
  var breathTimer = null;
  var elapsed = 0;

  function fmtTimer(s) { return Math.floor(s / 60) + ':' + pad(s % 60); }

  function setPhase(isIn) {
    var c = $('breath-circle');
    c.classList.remove('in', 'out');
    // Force a reflow so the CSS transition restarts every phase
    void c.offsetWidth;
    c.classList.add(isIn ? 'in' : 'out');
    $('breath-text').textContent = isIn ? 'Breathe in' : 'Breathe out';
    $('breath-live').textContent = isIn ? 'Breathe in' : 'Breathe out';
  }

  function startBreathing() {
    if (breathTimer) return; // never run two timers
    elapsed = 0;
    $('b-start').disabled = true;
    $('b-stop').disabled = false;
    $('breath-timer').textContent = fmtTimer(TOTAL);
    setPhase(true);

    breathTimer = setInterval(function () {
      elapsed++;
      $('breath-timer').textContent = fmtTimer(Math.max(TOTAL - elapsed, 0));
      if (elapsed >= TOTAL) {
        finishBreathing();
        return;
      }
      // every PHASE seconds, flip between in and out
      if (elapsed % PHASE === 0) setPhase((elapsed / PHASE) % 2 === 0);
    }, 1000);
  }

  function clearBreathTimer() {
    if (breathTimer) { clearInterval(breathTimer); breathTimer = null; }
  }

  function resetBreathUI(text) {
    var c = $('breath-circle');
    c.classList.remove('in', 'out');
    $('breath-text').textContent = text;
    $('breath-timer').textContent = fmtTimer(TOTAL);
    $('b-start').disabled = false;
    $('b-stop').disabled = true;
  }

  function stopBreathing(silent) {
    var wasRunning = !!breathTimer;
    clearBreathTimer();
    resetBreathUI('Ready');
    if (wasRunning && !silent) $('breath-live').textContent = 'Stopped. Return to your normal breathing.';
  }

  function finishBreathing() {
    clearBreathTimer();
    resetBreathUI("You've taken a moment for yourself.");
    $('breath-live').textContent = "You've taken a moment for yourself.";
  }

  function restartBreathing() {
    clearBreathTimer();
    resetBreathUI('Ready');
    startBreathing();
  }

  /* ---------- 9. HABITS ---------- */
  function countHabits(key) {
    var day = loadHabits()[key];
    if (!Array.isArray(day)) return 0;
    return HABITS.reduce(function (n, _, i) { return n + (day[i] === true ? 1 : 0); }, 0);
  }

  function renderHabits() {
    var key = dateKey();
    var day = loadHabits()[key];
    if (!Array.isArray(day)) day = [];
    var ul = $('habit-list');
    ul.textContent = '';
    HABITS.forEach(function (name, i) {
      var li = el('li', 'habit');
      var label = el('label');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('data-habit', String(i));
      input.checked = day[i] === true;
      var box = el('span', 'habit-box');
      box.appendChild(el('span', 'habit-check', '✓'));
      box.appendChild(el('span', null, name));
      label.appendChild(input);
      label.appendChild(box);
      li.appendChild(label);
      ul.appendChild(li);
    });
    updateHabitProgress();
  }

  function updateHabitProgress() {
    var n = countHabits(dateKey());
    $('habit-progress').textContent = n + ' of ' + HABITS.length + ' completed';
    $('habit-bar').style.width = (n / HABITS.length * 100) + '%';
    $('habit-msg').textContent = HABIT_MSGS[(n + dayOfYear()) % HABIT_MSGS.length];
  }

  function toggleHabit(i, checked) {
    var all = loadHabits();
    var key = dateKey();
    var day = Array.isArray(all[key]) ? all[key].slice() : [];
    for (var k = 0; k < HABITS.length; k++) day[k] = day[k] === true; // normalise
    day[i] = checked;
    all[key] = day;
    saveHabits(all);
    updateHabitProgress();
  }

  /* ---------- 10. RENDER + INIT ---------- */
  function renderAll() {
    $('today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    renderToday();
    renderInsights();
    renderHistory();
    renderHabits();
  }

  function init() {
    quoteIndex = dayOfYear();
    renderQuote();
    buildRatingGrid();
    renderQuiz();

    // Navigation by URL hash (works with refresh, back button, and all links)
    window.addEventListener('hashchange', showView);

    $('next-quote').addEventListener('click', function () { quoteIndex++; renderQuote(); });

    $('checkin-form').addEventListener('submit', submitCheckin);
    $('checkin-form').addEventListener('change', function (ev) {
      if (ev.target.name === 'stress') {
        $('rating-current').textContent = 'Your rating: ' + ev.target.value + ' out of 10';
        $('rating-error').hidden = true;
      }
      if (ev.target.name === 'mood') $('mood-error').hidden = true;
    });
    $('note').addEventListener('input', function () { $('note-count').textContent = String($('note').value.length); });

    // Event delegation for delete buttons
    $('history').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-delete]');
      if (btn) deleteEntry(btn.getAttribute('data-delete'));
    });

    // Clear all with confirmation dialog (falls back to confirm() on old browsers)
    $('clear-all').addEventListener('click', function () {
      var dlg = $('confirm-dialog');
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else if (window.confirm('Delete all saved check-ins? This cannot be undone.')) clearAll();
    });
    $('confirm-dialog').addEventListener('close', function () {
      if ($('confirm-dialog').returnValue === 'confirm') clearAll();
    });

    // Quiz (delegated)
    $('quiz').addEventListener('click', function (ev) {
      var opt = ev.target.closest('[data-quiz-opt]');
      if (opt) { answerQuiz(parseInt(opt.getAttribute('data-quiz-opt'), 10)); return; }
      if (ev.target.closest('[data-quiz-next]')) { quizIndex++; renderQuiz(); return; }
      if (ev.target.closest('[data-quiz-restart]')) { quizIndex = 0; quizScore = 0; renderQuiz(); }
    });

    // Breathing
    $('b-start').addEventListener('click', startBreathing);
    $('b-stop').addEventListener('click', function () { stopBreathing(false); });
    $('b-restart').addEventListener('click', restartBreathing);

    // Habits (delegated)
    $('habit-list').addEventListener('change', function (ev) {
      var i = ev.target.getAttribute('data-habit');
      if (i !== null) toggleHabit(parseInt(i, 10), ev.target.checked);
    });

    // Stop timer if the tab is closed/hidden for a long time
    window.addEventListener('pagehide', function () { stopBreathing(true); });

    if (!storageOk) toast("Browser storage isn't available, so entries will only last for this session.", true);

    showView();
  }

  function clearAll() {
    saveEntries([]);
    toast('All check-in history deleted.');
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
