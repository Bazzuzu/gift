// Viewport test: reads 100lvh / 100svh / 100dvh / 100vh from probes, the window and the visual viewport, and how far
// the badges stand above the bottom of each unit; switches the mode of the hero (?mode=vh|svh|dvh, dvh by default).
const html = document.documentElement;
const MODES = ['vh', 'svh', 'dvh'];
const px = (name) => document.querySelector(`.vt-probe--${name}`).getBoundingClientRect().height;
const out = document.querySelector('.vt-data');
const badges = document.querySelector('.hero__badges');

function update() {
  const lvh = px('lvh'), svh = px('svh'), dvh = px('dvh'), vh = px('vh'), safe = px('safe');
  const bottom = badges.getBoundingClientRect().bottom;
  const vv = window.visualViewport;
  const r = Math.round;
  out.innerHTML = [
    `<p><b>lvh</b> ${r(lvh)} · <b>svh</b> ${r(svh)} · <b>dvh</b> ${r(dvh)} · <b>vh</b> ${r(vh)}</p>`,
    `<p><b>panel now</b> (lvh − dvh) ${r(lvh - dvh)} · <b>panel max</b> (lvh − svh) ${r(lvh - svh)}</p>`,
    `<p><b>innerHeight</b> ${r(innerHeight)} · <b>visualViewport</b> ${vv ? r(vv.height) : '—'} · <b>safe-area</b> ${r(safe)}</p>`,
    `<p><b>badges above</b> dvh ${r(dvh - bottom)} · svh ${r(svh - bottom)} · lvh ${r(lvh - bottom)}</p>`,
    `<p><b>hero bottom</b> ${r(document.querySelector('.hero').getBoundingClientRect().bottom)} · <b>screen</b> ${screen.height} · <b>clientHeight</b> ${html.clientHeight}</p>`,
    `<p><b>fit</b> ${html.dataset.fit} · <b>scrollY</b> ${r(scrollY)} · ${html.dataset.breakpoint} · ${innerWidth} wide</p>`,
  ].join('');
}

function setMode(mode) {
  html.dataset.mode = MODES.includes(mode) ? mode : 'dvh';
  for (const b of document.querySelectorAll('[data-set-mode]')) b.setAttribute('aria-pressed', String(b.dataset.setMode === html.dataset.mode));
  const url = new URL(location.href);
  url.searchParams.set('mode', html.dataset.mode);
  history.replaceState(null, '', url);
  const fit = document.querySelector('.vt-fit');
  if (fit) fit.href = `${fit.getAttribute('href').split('?')[0]}?mode=${html.dataset.mode}`;
  requestAnimationFrame(update);
}

document.addEventListener('click', (event) => {
  const mode = event.target.closest('[data-set-mode]');
  if (mode) setMode(mode.dataset.setMode);
  const lines = event.target.closest('[data-toggle="lines"]');
  if (lines) {
    html.dataset.lines = html.dataset.lines === 'off' ? 'on' : 'off';
    lines.setAttribute('aria-pressed', String(html.dataset.lines !== 'off'));
  }
  const panel = event.target.closest('[data-toggle="panel"]');
  if (panel) {
    html.dataset.panel = html.dataset.panel === 'min' ? 'full' : 'min';
    panel.setAttribute('aria-pressed', String(html.dataset.panel !== 'min'));
  }
});

setMode(new URLSearchParams(location.search).get('mode'));
addEventListener('resize', update);
addEventListener('scroll', update, { passive: true });
window.visualViewport?.addEventListener('resize', update);
setInterval(update, 300); // the panels of some browsers change the units without a resize event
