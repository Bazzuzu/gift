// Carousel (#133, #135): the back and next buttons move the shown row by one card. At its end a button over the cards
// (.carousel-frame__steps) hides (data-carousel-end; out of Tab and the accessibility tree); if it had the focus, the
// focus goes to the other button, not to the start of the page. A button beside the row stays and is aria-disabled
// (it keeps the focus; index.html blocks the click). With tabs, every panel has its own row: on tabs-change the
// buttons point (aria-controls) to the shown one. Pages are inserted into index.html, so events are delegated; the
// rows are set up when they appear. Page dots (.carousel-dots, #136): a dot for every item of the shown row, the
// current one marked; the group is named "Page 2 of 4", one page or none — no dots. A loop (data-carousel-loop on the
// box, #138, #139): the buttons stay at the ends and the row goes on round — after the last page the first one comes
// next, before the first the last; the dots show the page itself (its place when the row was set up), not where it
// stands now. A row that does not scroll has no buttons.

const shownRow = (box) => [...box.querySelectorAll('.carousel')].find((row) => !row.closest('[hidden]'));
// One item and the gap after it: what a button moves.
const stepOf = (row, item) => item.offsetWidth + parseFloat(getComputedStyle(row).columnGap);

function showPage(dots, row, end) {
  const items = [...row.querySelectorAll('.carousel__item')];
  // A loop moves the items: every item keeps the number it had when the row was set up.
  items.forEach((item, i) => { item.dataset.carouselIndex ??= i; });
  if (dots.children.length !== items.length) {
    dots.replaceChildren(...items.map(() => Object.assign(document.createElement('span'), { className: 'carousel-dots__dot' })));
  }
  const shown = !items.length ? null
    : row.scrollLeft >= end - 1 ? items.at(-1)
    : items[Math.round(row.scrollLeft / stepOf(row, items[0]))];
  const current = shown ? Number(shown.dataset.carouselIndex) : 0;
  [...dots.children].forEach((dot, i) => dot.toggleAttribute('data-current', i === current));
  dots.setAttribute('aria-label', `Page ${current + 1} of ${items.length}`);
  dots.hidden = items.length < 2;
}

function update(box) {
  const row = shownRow(box);
  if (!row) return;
  const end = row.scrollWidth - row.clientWidth;
  const dots = box.querySelector('.carousel-dots');
  if (dots) showPage(dots, row, end);
  const buttons = [...box.querySelectorAll('[data-carousel-step]')];
  const loop = box.hasAttribute('data-carousel-loop') && end > 1;
  let lost = false;
  for (const button of buttons) {
    button.setAttribute('aria-controls', row.id);
    const back = Number(button.dataset.carouselStep) < 0;
    const atEnd = !loop && (back ? row.scrollLeft <= 0 : row.scrollLeft >= end - 1);
    if (button.closest('.carousel-frame__steps')) {
      button.toggleAttribute('data-carousel-end', atEnd);
      if (atEnd && button === document.activeElement) lost = true;
    } else {
      button.setAttribute('aria-disabled', atEnd);
    }
  }
  // Both hidden (the row fits) — the focus goes to the first card.
  if (lost) (buttons.find((button) => !button.hasAttribute('data-carousel-end')) ?? row.querySelector('a, button'))?.focus();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-carousel-step]');
  if (!button || button.getAttribute('aria-disabled') === 'true' || button.hasAttribute('data-carousel-end')) return;
  const box = button.closest('[data-carousel]');
  const row = shownRow(box);
  const item = row?.querySelector('.carousel__item');
  if (!item) return;
  // One card further, but not past the ends: with snapping, a smooth scroll beyond the end does not move at all.
  // The buttons change when the row gets there (scroll), not at the click: during a smooth scroll they would blink.
  const step = stepOf(row, item);
  const end = row.scrollWidth - row.clientWidth;
  const dir = Number(button.dataset.carouselStep);
  const loop = box.hasAttribute('data-carousel-loop');
  // In a loop the row goes on round: at the end the first item moves to the end (at the start the last one to the
  // start), the view is kept by an instant scroll, then the row scrolls on to it. No copies: ids stay unique. The
  // positions are set, not shifted: the browser may already keep the view itself (scroll anchoring).
  if (loop && dir > 0 && row.scrollLeft >= end - 1) {
    row.append(row.firstElementChild);
    row.scrollTo({ left: end - step, behavior: 'instant' });
    row.scrollTo({ left: end });
  } else if (loop && dir < 0 && row.scrollLeft <= 0) {
    row.prepend(row.lastElementChild);
    row.scrollTo({ left: step, behavior: 'instant' });
    row.scrollTo({ left: 0 });
  } else {
    row.scrollTo({ left: Math.min(Math.max(row.scrollLeft + dir * step, 0), end) });
  }
});

document.addEventListener('scroll', (event) => {
  if (event.target.matches?.('.carousel')) update(event.target.closest('[data-carousel]'));
}, true);

// A tab shows another row of the box, or a panel with carousels that were hidden (unmeasured) until now (#152).
document.addEventListener('tabs-change', (event) => {
  const box = event.target.closest('[data-carousel]');
  if (box) update(box);
  event.detail.panel?.querySelectorAll('[data-carousel]').forEach(update);
});

// Rows arrive with the page (innerHTML), are already there on a standalone page (home-page.html, #154) and change
// width with the window.
new MutationObserver(() => document.querySelectorAll('[data-carousel]').forEach(update))
  .observe(document.body, { childList: true, subtree: true });
addEventListener('resize', () => document.querySelectorAll('[data-carousel]').forEach(update));
document.querySelectorAll('[data-carousel]').forEach(update);
