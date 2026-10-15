const KEY = 'harada-v1';
const HUES = [345, 22, 45, 140, 172, 200, 250, 292];
const POS = [0, 1, 2, 3, 5, 6, 7, 8];

const $ = s => document.querySelector(s);
const board = $('#board');
const nav = $('#nav');
let S = load();
let view = 'all';
let timer;

function blank() {
  return {
    goal: '',
    subs: Array(8).fill(''),
    acts: Array.from({ length: 8 }, () => Array(8).fill('')),
    done: Array.from({ length: 8 }, () => Array(8).fill(false))
  };
}
function valid(d) {
  const grid = a => Array.isArray(a) && a.length === 8 && a.every(r => Array.isArray(r) && r.length === 8);
  return d && typeof d.goal === 'string' && Array.isArray(d.subs) && d.subs.length === 8 && grid(d.acts) && grid(d.done);
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (valid(d)) return d; } catch (e) {}
  return blank();
}
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 250);
}

function cell(cls, text, ph, h, attrs) {
  const c = document.createElement('div');
  c.className = 'cell ' + cls;
  if (h != null) c.style.setProperty('--h', h);
  const t = document.createElement('div');
  t.className = 't';
  t.dataset.ph = ph;
  t.textContent = text;
  t.contentEditable = 'plaintext-only';
  if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
  t.spellcheck = false;
  Object.assign(t.dataset, attrs);
  c.append(t);
  return c;
}

function build() {
  board.innerHTML = '';
  for (let p = 0; p < 9; p++) {
    const b = document.createElement('section');
    if (p === 4) {
      b.className = 'block c';
      b.dataset.s = 'c';
      for (let q = 0; q < 9; q++) {
        if (q === 4) b.append(cell('goal', S.goal, 'Tu objetivo', null, { k: 'goal' }));
        else { const i = POS.indexOf(q); b.append(cell('sub', S.subs[i], 'Área ' + (i + 1), HUES[i], { k: 'sub', s: i })); }
      }
    } else {
      const s = POS.indexOf(p);
      b.className = 'block';
      b.dataset.s = s;
      b.style.setProperty('--h', HUES[s]);
      for (let q = 0; q < 9; q++) {
        if (q === 4) { b.append(cell('sub', S.subs[s], 'Área ' + (s + 1), HUES[s], { k: 'sub', s })); continue; }
        const a = POS.indexOf(q);
        const c = cell('act' + (S.done[s][a] ? ' done' : ''), S.acts[s][a], 'Acción', HUES[s], { k: 'act', s, a });
        const k = document.createElement('button');
        k.type = 'button';
        k.className = 'chk';
        k.textContent = '✓';
        k.title = 'Marcar como hecha';
        k.setAttribute('aria-label', 'Marcar como hecha');
        k.dataset.s = s;
        k.dataset.a = a;
        c.append(k);
        b.append(c);
      }
    }
    board.append(b);
  }
  setView(view);
}

const label = i => S.subs[i].trim() || 'Área ' + (i + 1);

function stats() {
  const total = S.done.flat().filter(Boolean).length;
  $('#total').textContent = total + ' de 64 acciones hechas';
  const items = [
    ['all', 'Todo', 262, null],
    ['c', 'Objetivo', 262, null],
    ...S.subs.map((_, i) => [i, label(i), HUES[i], S.done[i].filter(Boolean).length / 8])
  ];
  nav.innerHTML = '';
  items.forEach(([v, txt, h, pr]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--h', h);
    b.textContent = txt;
    b.dataset.v = v;
    b.setAttribute('aria-pressed', String(String(v) === String(view)));
    if (pr != null) { const i = document.createElement('i'); i.style.width = pr * 100 + '%'; b.append(i); }
    nav.append(b);
  });
}

function setView(v) {
  view = v;
  board.dataset.view = v;
  board.querySelectorAll('.block').forEach(b => b.classList.toggle('on', String(b.dataset.s) === String(v)));
  stats();
  fitAll();
}

function fit(t) {
  t.style.fontSize = '';
  t.style.overflowWrap = '';
  if (!t.textContent.trim()) return;
  const cs = getComputedStyle(t);
  const aw = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = t.clientHeight;
  let hi = parseFloat(cs.fontSize), lo = 4;
  if (aw <= 0 || ah <= 0) return;
  const r = document.createRange();
  r.selectNodeContents(t);
  const ok = px => {
    t.style.fontSize = px + 'px';
    const b = r.getBoundingClientRect();
    return b.height <= ah + .5 && b.width <= aw + .5;
  };
  if (ok(hi)) return;
  for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; ok(m) ? lo = m : hi = m; }
  if (!ok(lo)) t.style.overflowWrap = 'anywhere';
  t.style.fontSize = lo + 'px';
}
function fitAll() { board.querySelectorAll('.t').forEach(fit); }

nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });

board.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (!d.k) return;
  const txt = t.textContent.replace(/\n/g, ' ');
  if (d.k === 'goal') S.goal = txt;
  else if (d.k === 'sub') {
    S.subs[d.s] = txt;
    board.querySelectorAll('.t[data-k="sub"][data-s="' + d.s + '"]').forEach(x => {
      if (x !== t && x.textContent !== txt) x.textContent = txt;
      fit(x);
    });
    stats();
  } else S.acts[d.s][d.a] = txt;
  fit(t);
  save();
});

board.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.k) { e.preventDefault(); e.target.blur(); }
});

board.addEventListener('click', e => {
  const k = e.target.closest('.chk');
  if (k) {
    const { s, a } = k.dataset;
    S.done[s][a] = !S.done[s][a];
    k.parentElement.classList.toggle('done', S.done[s][a]);
    stats();
    save();
    return;
  }
  const t = e.target.closest('.cell')?.querySelector('.t');
  if (t && e.target !== t) t.focus();
});

board.addEventListener('focusin', e => {
  const t = e.target;
  if (view === 'all' && t.dataset.k && matchMedia('(max-width: 640px)').matches) {
    setView(t.closest('.block').dataset.s);
  }
});

async function exportPdfFromPage() {
  if (!window.html2canvas || !window.jspdf) {
    window.print();
    return;
  }

  const root = document.documentElement;
  const previous = {
    overflowX: root.style.overflowX,
    overflowY: root.style.overflowY,
    width: root.style.width,
    height: root.style.height,
    scrollBehavior: root.style.scrollBehavior
  };

  root.style.overflowX = 'visible';
  root.style.overflowY = 'visible';
  root.style.width = 'auto';
  root.style.height = 'auto';
  root.style.scrollBehavior = 'auto';

  try {
    const canvas = await window.html2canvas(document.body, {
      backgroundColor: '#fbf9fd',
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save('harada-copia.pdf');
  } catch (error) {
    console.error('Error creando PDF:', error);
    window.print();
  } finally {
    root.style.overflowX = previous.overflowX;
    root.style.overflowY = previous.overflowY;
    root.style.width = previous.width;
    root.style.height = previous.height;
    root.style.scrollBehavior = previous.scrollBehavior;
  }
}

$('#bak').onclick = () => exportPdfFromPage();
$('#imp').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { const d = JSON.parse(r.result); if (!valid(d)) throw 0; S = d; save(); build(); }
    catch (x) { alert('El archivo no tiene el formato del método Harada.'); }
  };
  r.readAsText(f);
  e.target.value = '';
};
let rstTimer;
function resetLabel() {
  const b = $('#rst');
  delete b.dataset.sure;
  b.textContent = 'Reiniciar';
}
$('#rst').onclick = () => {
  const b = $('#rst');
  if (!b.dataset.sure) {
    b.dataset.sure = '1';
    b.textContent = 'Pulsa otra vez para borrar todo';
    rstTimer = setTimeout(resetLabel, 3500);
    return;
  }
  clearTimeout(rstTimer);
  clearTimeout(timer);
  resetLabel();
  S = blank();
  view = 'all';
  try { localStorage.removeItem(KEY); } catch (e) {}
  build();
};

build();
new ResizeObserver(fitAll).observe(board);
if (document.fonts) document.fonts.ready.then(fitAll);