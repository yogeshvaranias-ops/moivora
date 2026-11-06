'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const TYPES = ['Wedding','Reception','Engagement','Birthday','Housewarming','Puberty Ceremony','Baby Shower','Ear Piercing Ceremony','Temple Festival','Family Function','Custom Event'];
const EMOJI = ['💍','🥂','💞','🎂','🏡','🌸','🍼','✨','🛕','👨‍👩‍👧','🎉'];
const STATUS = ['Upcoming','Ongoing','Completed','Cancelled'];
const em = t => EMOJI[TYPES.indexOf(t)] || '🎉';
const I = {
  home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users:'<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 12 0v1M17 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>',
  wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4zM3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1"/>',
  trend:'<path d="M3 17l6-6 4 4 8-9M15 6h6v6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>', bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', menu:'<path d="M3 6h18M3 12h18M3 18h18"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  pin:'<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>', back:'<path d="M19 12H5M12 19l-7-7 7-7"/>'
};
Object.assign(I, {
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L21 2M16 7l3 3"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'
});
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

let adminUserView = sessionStorage.getItem('moivora_uv') === '1';
let token = localStorage.getItem('moivora_token'), user = null, events = [], q = '', fType = '', fStatus = '', charts = [], timers = [];
if (!token) location.replace('/');
const view = $('#view');

function logout() { localStorage.removeItem('moivora_token'); location.replace('/'); }
async function api(url, opt = {}) {
  const r = await fetch(url, { method: opt.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(); throw new Error(d.message || 'Please login again.'); }
  if (!r.ok) throw new Error(d.message || 'Something went wrong.');
  return d;
}
function toast(m, err) { const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = m; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 3500); }

/* ---------- date helpers ---------- */
const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = t => { const [h, m] = String(t).split(':'); return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`; };
const at = e => new Date(`${e.event_date}T${String(e.event_time || '00:00').slice(0, 5)}`);
function rel(e) {
  const days = Math.round((new Date(e.event_date + 'T00:00') - new Date(new Date().toDateString())) / 864e5);
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 0 ? `in ${days} days` : `${-days} days ago`;
}
function countdown(el, e) {
  const draw = () => {
    let s = Math.max(0, Math.floor((at(e) - Date.now()) / 1000));
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    el.innerHTML = ['Days', 'Hours', 'Mins', 'Secs'].map((l, i) => `<div><b>${String(v[i]).padStart(2, '0')}</b><small>${l}</small></div>`).join('');
  };
  draw(); timers.push(setInterval(draw, 1000));
}
function countUp(el, to, money) {
  const fmt = v => money ? inr(Math.round(v)) : Math.round(v).toLocaleString('en-IN');
  if (reduce || !to) return el.textContent = fmt(to);
  const t0 = performance.now(), dur = 1100;
  (function f(t) { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}

/* ---------- chrome: sidebar, topbar, theme ---------- */
function setUserView(on) {
  adminUserView = on; on ? sessionStorage.setItem('moivora_uv', '1') : sessionStorage.removeItem('moivora_uv');
  renderNav(); renderChrome();
}
function renderNav() {
  const admin = user && user.role === 'admin';
  const NAV = admin && !adminUserView ? [['#/admin', 'shield', 'Admin']] : [['#/dashboard', 'home', 'Dashboard'], ['#/events', 'cal', 'Events'], ['#/moi', 'wallet', 'Moi']];
  if (admin && adminUserView) NAV.push(['#/admin', 'shield', 'Back to Admin']);
  $('#nav').innerHTML = NAV.map(([h, i, l]) => `<a class="nav" href="${h}" data-h="${h}">${ic(i)}<span>${l}</span></a>`).join('');
}
$('#logout').innerHTML = ic('out') + '<span>Logout</span>';
$('#logout').onclick = logout;
$('#burger').innerHTML = ic('menu'); $('#gsIc').innerHTML = ic('search'); $('#bell').innerHTML = ic('bell');
$('#burger').onclick = () => innerWidth <= 900 ? document.body.classList.toggle('open') : document.body.classList.toggle('collapsed');
$('#scrim').onclick = () => document.body.classList.remove('open');
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('moivora_theme', t); $('#theme').innerHTML = ic(t === 'dark' ? 'sun' : 'moon'); }
setTheme(localStorage.getItem('moivora_theme') || 'dark');
$('#theme').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); route(); };
$$('.dd > button').forEach(b => b.onclick = ev => { ev.stopPropagation(); const d = b.parentElement, o = d.classList.contains('open'); $$('.dd').forEach(x => x.classList.remove('open')); if (!o) d.classList.add('open'); });
document.addEventListener('click', () => $$('.dd').forEach(x => x.classList.remove('open')));
$('#gs').addEventListener('input', e => { q = e.target.value; if (location.hash !== '#/events') location.hash = '#/events'; else renderGrid(); });

function renderChrome() {
  document.body.classList.toggle('adm', user.role === 'admin' && !adminUserView);
  document.body.classList.toggle('uv', user.role === 'admin' && adminUserView);
  $('#avatar').textContent = (user.full_name || '?')[0].toUpperCase();
  $('#userMenu').innerHTML = `<div class="row"><div><b>${esc(user.full_name)}</b><small>${esc(user.identifier)} · ${esc(user.role)}</small></div></div><button class="row" id="um-out">${ic('out')} Logout</button>`;
  $('#um-out').onclick = logout;
  const soon = events.filter(e => ['Upcoming', 'Ongoing'].includes(e.status) && at(e) >= Date.now() - 864e5 && at(e) - Date.now() < 7 * 864e5);
  $('#bell').innerHTML = ic('bell') + (soon.length ? `<span class="badge">${soon.length}</span>` : '');
  $('#bellMenu').innerHTML = soon.length ? soon.map(e => `<a class="row" href="#/events/${e.id}"><span class="dot">${em(e.type)}</span><div><b>${esc(e.name)}</b><small>${rel(e)} · ${fmtTime(e.event_time)}</small></div></a>`).join('') : '<div class="empty">No events in the next 7 days</div>';
}
async function loadEvents() { events = await api('/api/events'); if (user) renderChrome(); }

/* ---------- router ---------- */
function route() {
  charts.forEach(c => c.destroy()); charts = []; timers.forEach(clearInterval); timers = [];
  document.body.classList.remove('open');
  const isAdmin = user && user.role === 'admin';
  if (isAdmin) {
    if (location.hash === '#/admin' && adminUserView) setUserView(false);
    else if (!adminUserView && location.hash !== '#/admin') { location.replace('#/admin'); return; }
  }
  const h = location.hash || '#/dashboard', m = h.match(/^#\/events\/(\d+)$/);
  $$('.nav[data-h]').forEach(a => a.classList.toggle('on', h.startsWith(a.dataset.h)));
  const go = m ? eventPage(m[1]) : h === '#/events' ? eventsPage() : h === '#/moi' ? moiPage() : h === '#/admin' ? adminPage() : dashboard();
  go.catch(e => { view.innerHTML = `<div class="panel empty"><span class="big">⚠️</span>${esc(e.message)}</div>`; });
}
addEventListener('hashchange', route);

/* ---------- dashboard ---------- */
async function dashboard() {
  view.innerHTML = '<div class="stats">' + '<div class="sk"></div>'.repeat(6) + '</div><div class="grid2"><div class="sk" style="height:300px"></div><div class="sk" style="height:300px"></div></div>';
  const d = await api('/api/dashboard'), t = d.totals;
  const cards = [['Total Events', t.events, 'cal', '#7c3aed'], ['Contributors', t.contributors, 'users', '#2563eb'], ['Moi Collected', t.moi, 'wallet', '#d99a1d', 1], ['Total Expenses', t.expenses, 'trend', '#e11d48', 1], ['Total Balance', t.balance, 'wallet', '#059669', 1], ['Upcoming Events', t.upcoming, 'clock', '#c026d3']];
  const next = d.upcoming[0];
  view.innerHTML = `<div class="page">
    <div class="head"><div><h1>Welcome, ${esc(user.full_name.split(' ')[0])} 👋</h1><p class="muted">Celebrate Moments. Manage Memories.</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="qa-new">${ic('plus')} New event</button><button class="btn" id="qa-moi">${ic('plus')} Add moi</button><a class="btn ghost" href="#/events">${ic('cal')} View events</a></div></div>
    <div class="stats">${cards.map(([l, v, i, c, mny], k) => `<div class="stat" style="--c:${c};animation:rise .5s ${k * .06}s both"><div class="i">${ic(i)}</div><span>${l}</span><b data-n="${v}" data-m="${mny ? 1 : 0}">0</b></div>`).join('')}</div>
    <div class="grid2">
      <div class="panel"><h2>Monthly collection</h2><div class="chart"><canvas id="cMonth"></canvas></div></div>
      <div class="panel"><h2>Event-wise collection</h2>${d.byEvent.length ? '<div class="chart"><canvas id="cEvent"></canvas></div>' : '<div class="empty"><span class="big">📊</span>No moi collected yet</div>'}</div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>Next event</h2>${next ? `<div class="item"><span class="dot">${em(next.type)}</span><div class="t"><b>${esc(next.name)}</b><small>${fmtDate(next.event_date)} · ${fmtTime(next.event_time)}</small></div></div><div class="cd" id="cd"></div>` : '<div class="empty"><span class="big">🗓️</span>No upcoming events. Create one!</div>'}
        <h2 style="margin-top:18px">Upcoming events</h2>${d.upcoming.length ? d.upcoming.map(e => `<a class="item" style="text-decoration:none;color:inherit" href="#/events/${e.id}"><span class="dot">${em(e.type)}</span><div class="t"><b>${esc(e.name)}</b><small>${esc(e.location)}</small></div><span class="chip">${rel(e)}</span></a>`).join('') : '<p class="muted">Nothing scheduled.</p>'}</div>
      <div class="panel"><h2>Recent contributors</h2>${d.recentContributors.length ? d.recentContributors.map(c => `<div class="item"><span class="dot">🙏</span><div class="t"><b>${esc(c.name)}</b><small>${esc(c.event)} · ${fmtDate(c.date)}</small></div><span class="cr">${inr(c.amount)}</span></div>`).join('') : '<div class="empty"><span class="big">🙏</span>No contributors yet</div>'}
        <h2 style="margin-top:18px">Recent transactions</h2>${d.transactions.length ? d.transactions.map(x => `<div class="item"><span class="dot">${x.kind === 'credit' ? '⬆️' : '⬇️'}</span><div class="t"><b>${esc(x.title)}</b><small>${fmtDate(x.date)}</small></div><span class="${x.kind === 'credit' ? 'cr' : 'db'}">${x.kind === 'credit' ? '+' : '-'}${inr(x.amount)}</span></div>`).join('') : '<p class="muted">No transactions yet.</p>'}</div>
    </div></div>`;
  $$('[data-n]').forEach(el => countUp(el, +el.dataset.n, +el.dataset.m));
  $('#qa-new').onclick = () => openForm(); $('#qa-moi').onclick = () => openMoiForm();
  if (next) countdown($('#cd'), next);
  if (typeof Chart === 'undefined') return;
  const cs = getComputedStyle(document.body), muted = cs.getPropertyValue('--muted').trim(), line = cs.getPropertyValue('--line').trim();
  Chart.defaults.color = muted; Chart.defaults.font.family = 'Sora, sans-serif';
  const tick = { callback: v => '₹' + Number(v).toLocaleString('en-IN') };
  charts.push(new Chart($('#cMonth'), { type: 'bar', data: { labels: d.monthly.map(m => m.label), datasets: [{ data: d.monthly.map(m => m.total), backgroundColor: '#f5c451', borderRadius: 8, maxBarThickness: 44 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => inr(c.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: line }, ticks: tick } } } }));
  if (d.byEvent.length) charts.push(new Chart($('#cEvent'), { type: 'doughnut', data: { labels: d.byEvent.map(e => e.name), datasets: [{ data: d.byEvent.map(e => e.total), backgroundColor: ['#f5c451', '#8b5cf6', '#38bdf8', '#34d399', '#fb7185', '#f97316'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ' ' + inr(c.parsed) } } } } }));
}

/* ---------- events list ---------- */
const card = (e, i) => `<article class="ev" style="--h:${(TYPES.indexOf(e.type) + 1) * 32};animation-delay:${Math.min(i, 8) * .05}s">
  <div class="cover"${e.image ? ` style="background-image:url('${e.image}')"` : ''}>${e.image ? '' : `<span class="em">${em(e.type)}</span>`}<span class="st s-${e.status}">${e.status}</span></div>
  <div class="body"><span class="chip">${esc(e.type)}</span><h3>${esc(e.name)}</h3>
  <p>${ic('cal')}${fmtDate(e.event_date)} · ${fmtTime(e.event_time)}</p><p>${ic('pin')}${esc(e.location)}</p>
  <div class="acts"><a class="btn sm" href="#/events/${e.id}">${ic('eye')} View</a><button class="btn sm ghost" data-edit="${e.id}" aria-label="Edit">${ic('edit')}</button><button class="btn sm ghost danger" data-del="${e.id}" aria-label="Delete">${ic('trash')}</button></div></div></article>`;
function renderGrid() {
  const g = $('#grid'); if (!g) return;
  const k = q.trim().toLowerCase();
  const list = events.filter(e => (!fType || e.type === fType) && (!fStatus || e.status === fStatus) && (!k || [e.name, e.host_name, e.location, e.type].join(' ').toLowerCase().includes(k)));
  g.innerHTML = list.length ? list.map(card).join('') : `<div class="panel empty" style="grid-column:1/-1"><span class="big">🎊</span>${events.length ? 'No events match your search.' : 'No events yet. Create your first function!'}</div>`;
}
async function eventsPage() {
  view.innerHTML = '<div class="events">' + '<div class="sk" style="height:300px"></div>'.repeat(3) + '</div>';
  await loadEvents();
  view.innerHTML = `<div class="page"><div class="head"><div><h1>Events</h1><p class="muted">${events.length} function${events.length === 1 ? '' : 's'}</p></div><button class="btn" id="new">${ic('plus')} New event</button></div>
    <div class="bar"><input id="eq" type="search" placeholder="Search by name, host, place…" value="${esc(q)}" aria-label="Search events">
    <select id="et" aria-label="Filter by type"><option value="">All types</option>${TYPES.map(t => `<option ${t === fType ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select id="es" aria-label="Filter by status"><option value="">All status</option>${STATUS.map(t => `<option ${t === fStatus ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="events" id="grid"></div></div>`;
  $('#new').onclick = () => openForm();
  $('#eq').oninput = e => { q = e.target.value; $('#gs').value = q; renderGrid(); };
  $('#et').onchange = e => { fType = e.target.value; renderGrid(); };
  $('#es').onchange = e => { fStatus = e.target.value; renderGrid(); };
  $('#gs').value = q; renderGrid();
}
view.addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
  if (ed) openForm(events.find(x => x.id == ed.dataset.edit));
  if (dl) removeEvent(+dl.dataset.del);
});

/* ---------- event details ---------- */
async function eventPage(id) {
  const e = await api('/api/events/' + id);
  view.innerHTML = `<div class="page"><a class="btn sm ghost" href="#/events" style="margin-bottom:16px">${ic('back')} All events</a>
    <div class="hero" style="--h:${(TYPES.indexOf(e.type) + 1) * 32}${e.image ? `;background-image:url('${e.image}')` : ''}"><div><span class="chip">${esc(e.type)}</span> <span class="chip s-${e.status}">${e.status}</span><h1 style="margin-top:10px">${esc(e.name)}</h1></div></div>
    <div class="grid2"><div class="panel"><h2>Details</h2><div class="kv">
      <div><small>Date</small><b>${fmtDate(e.event_date)} (${rel(e)})</b></div><div><small>Time</small><b>${fmtTime(e.event_time)}</b></div>
      <div><small>Location</small><b>${esc(e.location)}</b></div><div><small>Host</small><b>${esc(e.host_name)}</b></div>
      <div><small>Contact</small><b>${esc(e.contact)}</b></div></div>
      ${e.description ? `<p style="margin-top:16px;line-height:1.6">${esc(e.description)}</p>` : ''}
      <div class="acts" style="margin-top:18px"><button class="btn" id="d-edit">${ic('edit')} Edit</button><button class="btn ghost" id="d-moi">${ic('plus')} Add moi</button><button class="btn ghost danger" id="d-del">${ic('trash')} Delete</button><button class="btn ghost" onclick="print()">Print</button></div></div>
    <div class="panel"><h2>Countdown</h2><div class="cd" id="cd"></div>
      <div class="kv" style="margin-top:14px"><div><small>Contributors</small><b>${e.contributors}</b></div><div><small>Moi collected</small><b>${inr(e.moi)}</b></div><div><small>Expenses</small><b>${inr(e.expenses)}</b></div><div><small>Balance</small><b>${inr(e.moi - e.expenses)}</b></div></div></div></div></div>`;
  countdown($('#cd'), e);
  $('#d-edit').onclick = () => openForm(e); $('#d-moi').onclick = () => openMoiForm(null, e.id);
  $('#d-del').onclick = () => removeEvent(e.id, true);
}

/* ---------- modal: form + confirm ---------- */
const modal = $('#modal');
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
function confirmBox(msg, label = 'Delete', icon = '🗑️') {
  return new Promise(res => {
    modal.innerHTML = `<div class="dlg sm" role="alertdialog" aria-modal="true"><div style="font-size:42px">${icon}</div><h2 style="margin:10px 0">${esc(msg)}</h2><p class="muted">${label === 'Delete' ? 'This cannot be undone.' : 'Please confirm.'}</p><div class="acts" style="justify-content:center;margin-top:20px"><button class="btn ghost" id="no">Cancel</button><button class="btn" id="yes" style="background:var(--err);color:#fff">${label}</button></div></div>`;
    modal.hidden = false; $('#no').focus();
    $('#no').onclick = () => { closeModal(); res(false); }; $('#yes').onclick = () => { closeModal(); res(true); };
  });
}
async function removeEvent(id, fromDetail) {
  if (!await confirmBox('Delete this event?')) return;
  try { await api('/api/events/' + id, { method: 'DELETE' }); toast('Event deleted.'); await loadEvents(); fromDetail ? location.hash = '#/events' : route(); }
  catch (e) { toast(e.message, 1); }
}
function resizeImage(file) {
  return new Promise((ok, bad) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => bad(new Error('Could not read that image.')); img.src = url;
  });
}
function openForm(ev) {
  const e = ev || { type: 'Wedding', status: 'Upcoming' }; let img = e.image || null, busy = false;
  const v = k => esc(e[k] ?? '');
  modal.innerHTML = `<form class="dlg" id="fm" novalidate role="dialog" aria-modal="true"><h2 style="font-family:var(--disp);font-size:24px;margin:0">${ev ? 'Edit event' : 'New event'}</h2>
    <div class="f">
    <label class="w">Event name<input name="name" value="${v('name')}" maxlength="150" autocomplete="off"></label>
    <label>Event type<select name="type">${TYPES.map(t => `<option ${t === e.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Status<select name="status">${STATUS.map(t => `<option ${t === e.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Date<input type="date" name="event_date" value="${v('event_date')}"></label>
    <label>Time<input type="time" name="event_time" value="${String(e.event_time || '').slice(0, 5)}"></label>
    <label class="w">Location<input name="location" value="${v('location')}" maxlength="255"></label>
    <label>Host name<input name="host_name" value="${v('host_name')}" maxlength="100"></label>
    <label>Contact number<input name="contact" value="${v('contact')}" inputmode="numeric" maxlength="13"></label>
    <label class="w">Description<textarea name="description" maxlength="2000">${v('description')}</textarea></label>
    <div class="w"><div class="prev" id="prev" tabindex="0" role="button">Click to add event image</div><input type="file" id="file" accept="image/png,image/jpeg,image/webp" hidden></div></div>
    <p class="ferr" id="ferr" role="alert"></p>
    <div class="acts" style="justify-content:flex-end"><button type="button" class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${ev ? 'Save changes' : 'Create event'}</button></div></form>`;
  modal.hidden = false; $('[name=name]').focus();
  const prev = () => { $('#prev').style.backgroundImage = img ? `url('${img}')` : ''; $('#prev').textContent = img ? '' : 'Click to add event image'; }; prev();
  $('#prev').onclick = () => $('#file').click(); $('#prev').onkeydown = k => { if (k.key === 'Enter') $('#file').click(); };
  $('#file').onchange = async f => { try { img = await resizeImage(f.target.files[0]); prev(); } catch (x) { $('#ferr').textContent = x.message; } };
  $('#cancel').onclick = closeModal;
  $('#fm').onsubmit = async s => {
    s.preventDefault(); if (busy) return;
    const body = Object.fromEntries(new FormData(s.target)); body.image = img; body.contact = body.contact.replace(/[\s-]/g, '').replace(/^\+91/, '');
    const bad = !body.name.trim() ? 'Enter the event name.' : !body.event_date ? 'Pick the event date.' : !body.event_time ? 'Pick the event time.' : !body.location.trim() ? 'Enter the location.' : !body.host_name.trim() ? 'Enter the host name.' : !/^[6-9]\d{9}$/.test(body.contact) ? 'Enter a valid 10-digit contact number.' : '';
    if (bad) return $('#ferr').textContent = bad;
    busy = true; $('#save').textContent = 'Saving…';
    try {
      await api(ev ? '/api/events/' + ev.id : '/api/events', { method: ev ? 'PUT' : 'POST', body });
      closeModal(); toast(ev ? 'Event updated.' : 'Event created.'); await loadEvents(); route();
    } catch (x) { busy = false; $('#save').textContent = ev ? 'Save changes' : 'Create event'; $('#ferr').textContent = x.message; }
  };
}

/* ---------- moi / contributors ---------- */
const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
let mf = { q: '', event: '', method: '', from: '', to: '', sort: 'date_desc' }, moi = [];
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const optList = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
async function moiPage() {
  view.innerHTML = '<div class="sk" style="height:70px;margin-bottom:16px"></div><div class="sk" style="height:300px"></div>';
  await loadEvents();
  view.innerHTML = `<div class="page"><div class="head"><div><h1>Moi</h1><p class="muted" id="moiSum">&nbsp;</p></div><button class="btn" id="newMoi">${ic('plus')} Add moi</button></div>
    <div class="bar"><input id="mq" type="search" placeholder="Search name or mobile" value="${esc(mf.q)}" aria-label="Search contributors">
    <select id="me" aria-label="Filter by event"><option value="">All events</option>${events.map(e => `<option value="${e.id}" ${e.id == mf.event ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
    <select id="mm" aria-label="Filter by payment method"><option value="">All methods</option>${optList(METHODS, mf.method)}</select>
    <input type="date" id="mfrom" value="${mf.from}" aria-label="From date"><input type="date" id="mto" value="${mf.to}" aria-label="To date">
    <select id="ms" aria-label="Sort"><option value="date_desc">Newest first</option><option value="amount_desc" ${mf.sort === 'amount_desc' ? 'selected' : ''}>Amount: high to low</option><option value="amount_asc" ${mf.sort === 'amount_asc' ? 'selected' : ''}>Amount: low to high</option></select></div>
    <div class="panel" style="padding:0"><div class="tw" id="moiTbl"></div></div></div>`;
  let t; const go = () => loadMoi().catch(e => toast(e.message, 1));
  $('#newMoi').onclick = () => openMoiForm();
  $('#mq').oninput = e => { mf.q = e.target.value.trim(); clearTimeout(t); t = setTimeout(go, 250); };
  $('#me').onchange = e => { mf.event = e.target.value; go(); }; $('#mm').onchange = e => { mf.method = e.target.value; go(); };
  $('#mfrom').onchange = e => { mf.from = e.target.value; go(); }; $('#mto').onchange = e => { mf.to = e.target.value; go(); };
  $('#ms').onchange = e => { mf.sort = e.target.value; go(); };
  $('#moiTbl').onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const c = moi.find(x => x.id == b.dataset.id);
    ({ h: showHistory, r: receipt, e: x => openMoiForm(x), d: removeMoi })[b.dataset.a](c);
  };
  await loadMoi();
}
async function loadMoi() {
  const d = await api('/api/contributions?' + new URLSearchParams({ search: mf.q, event_id: mf.event, method: mf.method, from: mf.from, to: mf.to, sort: mf.sort }));
  moi = d.rows; if (!$('#moiTbl')) return;
  $('#moiSum').textContent = `${d.count} contribution${d.count === 1 ? '' : 's'} · ${inr(d.total)}`;
  const btn = (a, i, l, id, cls = '') => `<button class="ibtn sm ${cls}" data-a="${a}" data-id="${id}" aria-label="${l}" title="${l}">${ic(i)}</button>`;
  $('#moiTbl').innerHTML = moi.length ? `<table class="tbl"><thead><tr><th>Contributor</th><th>Place</th><th>Event</th><th>Method</th><th>Date</th><th class="r">Amount</th><th></th></tr></thead><tbody>${moi.map(c =>
    `<tr><td><b>${esc(c.contributor_name)}</b><small>${esc(c.mobile || '')}${c.relationship ? (c.mobile ? ' · ' : '') + esc(c.relationship) : ''}</small></td><td>${esc(c.place || '-')}</td><td>${esc(c.event_name)}</td><td><span class="chip">${esc(c.payment_method)}</span></td><td>${fmtDate(c.contribution_date)}</td><td class="r cr">${inr(c.amount)}</td>
    <td><div class="ra">${btn('h', 'hist', 'History', c.id)}${btn('r', 'print', 'Receipt', c.id)}${btn('e', 'edit', 'Edit', c.id)}${btn('d', 'trash', 'Delete', c.id, 'danger')}</div></td></tr>`).join('')}</tbody></table>`
    : `<div class="empty"><span class="big">🙏</span>${mf.q || mf.event || mf.method || mf.from || mf.to ? 'No entries match these filters.' : 'No moi entries yet. Add your first one!'}</div>`;
}
async function removeMoi(c) {
  if (!await confirmBox('Delete this moi entry?')) return;
  try { await api('/api/contributions/' + c.id, { method: 'DELETE' }); toast('Entry deleted.'); loadMoi(); } catch (e) { toast(e.message, 1); }
}
function openMoiForm(c, eventId) {
  if (!events.length) { toast('Create an event first, then add moi.', 1); location.hash = '#/events'; return; }
  const e = c || { event_id: eventId || '', payment_method: 'Cash', contribution_date: today() }; let busy = false;
  const v = k => esc(e[k] ?? '');
  modal.innerHTML = `<form class="dlg" id="mf" novalidate role="dialog" aria-modal="true"><h2 style="font-family:var(--disp);font-size:24px;margin:0">${c ? 'Edit moi' : 'Add moi'}</h2>
    <div class="f">
    <label class="w">Contributor name<input name="contributor_name" value="${v('contributor_name')}" maxlength="100" autocomplete="off"></label>
    <label>Mobile number<input name="mobile" value="${v('mobile')}" inputmode="numeric" maxlength="13" placeholder="Optional"></label>
    <label>Place / village<input name="place" value="${v('place')}" maxlength="100"></label>
    <label>Relationship<input name="relationship" value="${v('relationship')}" maxlength="60" placeholder="Uncle, friend…"></label>
    <label>Event<select name="event_id"><option value="">Select event</option>${events.map(x => `<option value="${x.id}" ${x.id == e.event_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" inputmode="decimal" value="${v('amount')}"></label>
    <label>Payment method<select name="payment_method">${optList(METHODS, e.payment_method)}</select></label>
    <label>Date<input type="date" name="contribution_date" value="${v('contribution_date')}"></label>
    <label class="w">Remarks<input name="remarks" value="${v('remarks')}" maxlength="255"></label></div>
    <p class="ferr" id="ferr" role="alert"></p>
    <div class="acts" style="justify-content:flex-end"><button type="button" class="btn ghost" id="cancel">Cancel</button><button class="btn" id="save">${c ? 'Save changes' : 'Save'}</button></div></form>`;
  modal.hidden = false; $('[name=contributor_name]').focus(); $('#cancel').onclick = closeModal;
  $('#mf').onsubmit = async s => {
    s.preventDefault(); if (busy) return;
    const b = Object.fromEntries(new FormData(s.target)); b.mobile = b.mobile.replace(/[\s-]/g, '').replace(/^\+91/, '');
    const bad = b.contributor_name.trim().length < 2 ? 'Enter the contributor name.' : b.mobile && !/^[6-9]\d{9}$/.test(b.mobile) ? 'Enter a valid 10-digit mobile number, or leave it empty.' : !b.event_id ? 'Select an event.' : !(Number(b.amount) > 0) ? 'Enter a valid amount.' : !b.contribution_date ? 'Pick the date.' : '';
    if (bad) return $('#ferr').textContent = bad;
    busy = true; $('#save').disabled = true; $('#save').textContent = 'Saving…';
    try {
      await api(c ? '/api/contributions/' + c.id : '/api/contributions', { method: c ? 'PUT' : 'POST', body: b });
      closeModal(); toast(c ? 'Entry updated.' : 'Moi saved. Thank you! 🙏');
      location.hash === '#/moi' ? loadMoi() : route();
    } catch (x) { busy = false; $('#save').disabled = false; $('#save').textContent = c ? 'Save changes' : 'Save'; $('#ferr').textContent = x.message; }
  };
}
async function showHistory(c) {
  const d = await api('/api/contributions/history?' + new URLSearchParams({ name: c.contributor_name, mobile: c.mobile || '' }));
  modal.innerHTML = `<div class="dlg" role="dialog" aria-modal="true"><h2 style="font-family:var(--disp);font-size:24px;margin:0">${esc(c.contributor_name)}</h2>
    <p class="muted">${esc([c.mobile, c.place].filter(Boolean).join(' · '))}</p>
    <div class="kv" style="margin:14px 0"><div><small>Total given</small><b>${inr(d.total)}</b></div><div><small>Contributions</small><b>${d.count}</b></div></div>
    ${d.rows.map(r => `<div class="item"><span class="dot">🙏</span><div class="t"><b>${esc(r.event_name)}</b><small>${fmtDate(r.contribution_date)} · ${esc(r.payment_method)}</small></div><span class="cr">${inr(r.amount)}</span></div>`).join('')}
    <div class="acts" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" id="x">Close</button></div></div>`;
  modal.hidden = false; $('#x').onclick = closeModal; $('#x').focus();
}
function receipt(c) {
  const r = (a, b) => b ? `<div class="row2"><span>${a}</span><span>${esc(b)}</span></div>` : '';
  modal.innerHTML = `<div class="dlg rc" role="dialog" aria-modal="true"><div class="rh"><b>MOIVORA</b><small>Moi receipt</small></div>
    ${r('Receipt no.', 'MOI-' + String(c.id).padStart(6, '0'))}${r('Event', c.event_name)}${r('Date', fmtDate(c.contribution_date))}${r('Received from', c.contributor_name)}${r('Place', c.place)}${r('Mobile', c.mobile)}${r('Payment', c.payment_method)}${r('Remarks', c.remarks)}
    <div class="ramt">${inr(c.amount)}</div><p class="thx">Thank you for your blessings 🙏</p>
    <div class="acts noprint" style="justify-content:center;margin-top:16px"><button class="btn ghost" id="x">Close</button><button class="btn" id="pr">${ic('print')} Print</button></div></div>`;
  modal.hidden = false; $('#x').onclick = closeModal;
  $('#pr').onclick = () => { document.body.classList.add('printing'); print(); document.body.classList.remove('printing'); };
}

/* ---------- admin panel ---------- */
async function adminPage() {
  if (!user || user.role !== 'admin') { view.innerHTML = '<div class="panel empty"><span class="big">🔒</span>This page is for admins only.</div>'; return; }
  view.innerHTML = '<div class="stats">' + '<div class="sk"></div>'.repeat(6) + '</div><div class="sk" style="height:300px"></div>';
  const [s, users] = await Promise.all([api('/api/admin/stats'), api('/api/admin/users')]);
  const cards = [['Total users', s.users, 'users', '#7c3aed'], ['Active users', s.active, 'users', '#059669'], ['New (7 days)', s.recent, 'trend', '#2563eb'], ['Events', s.events, 'cal', '#c026d3'], ['Contributions', s.contributions, 'wallet', '#d99a1d'], ['Total moi (all users)', s.moi, 'wallet', '#e11d48', 1]];
  const when = d => d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Never';
  view.innerHTML = `<div class="page"><div class="head"><div><h1>Admin</h1><p class="muted">Platform overview. Contributor details stay private, only totals are shown.</p></div><button class="btn ghost" id="uv">${ic('eye')} User view</button></div>
    <div class="stats">${cards.map(([l, v, i, c, m], k) => `<div class="stat" style="--c:${c};animation:rise .5s ${k * .06}s both"><div class="i">${ic(i)}</div><span>${l}</span><b data-n="${v}" data-m="${m ? 1 : 0}">0</b></div>`).join('')}</div>
    <div class="bar"><input id="uq" type="search" placeholder="Search users by name, email or mobile" aria-label="Search users"></div>
    <div class="panel" style="padding:0"><div class="tw" id="uTbl"></div></div></div>`;
  $$('[data-n]').forEach(el => countUp(el, +el.dataset.n, +el.dataset.m));
  const draw = () => {
    const k = $('#uq').value.trim().toLowerCase(), list = users.filter(u => !k || (u.full_name + ' ' + u.identifier).toLowerCase().includes(k));
    $('#uTbl').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Events</th><th>Joined</th><th>Last login</th><th>Status</th><th></th></tr></thead><tbody>${list.map(u => `<tr><td><b>${esc(u.full_name)}</b><small>${esc(u.identifier)}</small></td><td><span class="chip">${u.role}</span></td><td>${u.events}</td><td>${fmtDate(u.created_at.slice(0, 10))}</td><td>${when(u.last_login)}</td>
      <td><span class="${u.is_active ? 'cr' : 'db'}">${u.is_active ? 'Active' : 'Disabled'}</span></td>
      <td><div class="ra">${u.id === user.id ? '<small>You</small>' : `<button class="btn sm ghost" data-st="${u.id}">${ic('ban')} ${u.is_active ? 'Disable' : 'Enable'}</button>`}<button class="btn sm ghost" data-rp="${u.id}">${ic('key')} Reset password</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No users found.</div>';
  };
  draw(); $('#uq').oninput = draw; $('#uv').onclick = () => { setUserView(true); location.hash = '#/dashboard'; };
  $('#uTbl').onclick = async e => {
    const st = e.target.closest('[data-st]'), rp = e.target.closest('[data-rp]');
    try {
      if (st) {
        const u = users.find(x => x.id == st.dataset.st);
        if (!await confirmBox(`${u.is_active ? 'Disable' : 'Enable'} ${u.full_name}?`, u.is_active ? 'Disable' : 'Enable', u.is_active ? '🚫' : '✅')) return;
        await api(`/api/admin/users/${u.id}/status`, { method: 'PATCH', body: { is_active: !u.is_active } }); toast('User updated.'); route();
      } else if (rp) {
        const u = users.find(x => x.id == rp.dataset.rp);
        if (!await confirmBox(`Reset password for ${u.full_name}?`, 'Reset', '🔑')) return;
        const d = await api(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
        modal.innerHTML = `<div class="dlg sm" role="dialog" aria-modal="true"><div style="font-size:42px">🔑</div><h2 style="margin:10px 0">Temporary password</h2><p class="muted">Share it with ${esc(u.full_name)}. It is shown only once.</p>
          <p style="font-size:26px;font-weight:700;letter-spacing:.08em;color:var(--gold);margin:16px 0;user-select:all">${esc(d.password)}</p><div class="acts" style="justify-content:center"><button class="btn ghost" id="cp">Copy</button><button class="btn" id="x">Done</button></div></div>`;
        modal.hidden = false; $('#x').onclick = closeModal; $('#cp').onclick = () => navigator.clipboard.writeText(d.password).then(() => toast('Copied.'));
      }
    } catch (x) { toast(x.message, 1); }
  };
}

/* ---------- boot ---------- */
(async () => {
  try { user = await api('/api/auth/me'); await loadEvents(); } catch (e) { return; }
  renderNav(); renderChrome(); route();
})();
