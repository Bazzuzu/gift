// Menu (#110, #113, #114): a popover (menu.css) opened by a button with popovertarget — role="listbox" to choose a value,
// or role="menu" with link items (actions, e.g. tel:). Placed under the button, or under the field it sits in
// (.input__field), from its left edge (at the right edge of the screen — from the button's right edge); above it when
// it does not fit below and there is more room above; never taller than the room. Coordinates are in the document (position: absolute in the top layer),
// so the menu scrolls with the page by itself: moving a fixed menu from scroll events lags a frame and jitters (#111).
// Keyboard like a select: on the button ↓ / ↑ open; in the menu ↑ / ↓, Home / End, first letters ("ne" — Netherlands,
// a repeated letter — the next option on it); Enter, Space or a click chooses; Escape, Tab or a click outside closes,
// the focus returns to the button (Tab then goes on). A listbox: the chosen value is data-value on the button and
// aria-selected on the option; a menu: an item does its action (Enter or Space follows the link) and the menu closes.
// Events on a listbox (they bubble):
//   menu-open   { opener }          before it shows: a component may build its options
//   menu-change { opener, option }  after a choice: the component shows the value (button label, phone template)
// Pages are inserted into index.html, so events are delegated.

const TYPEAHEAD_MS = 500; // letters typed within this time make one search
let opener = null; // the button of the open menu
let typed = '';
let typedAt = 0;

const menuOf = (button) => {
  const menu = document.getElementById(button?.getAttribute('popovertarget'));
  return menu?.classList.contains('menu') ? menu : null;
};
const options = (menu) => [...menu.querySelectorAll('.menu__option')];
const isListbox = (menu) => menu.getAttribute('role') === 'listbox';
// First letters search the caption ("Customer Service"), or the label, or the whole text.
const nameOf = (option) => (option.querySelector('.menu__caption, .menu__label') ?? option).textContent.trim().toLowerCase();

// While hidden the menu's height is 0: it goes below.
function place() {
  const menu = menuOf(opener);
  if (!menu) return;
  const anchor = (opener.closest('.input__field') ?? opener).getBoundingClientRect();
  const height = document.documentElement.clientHeight;
  const below = height - anchor.bottom;
  const up = menu.scrollHeight > below && anchor.top > below + 1; // equal room (to a fraction of a pixel) — below
  menu.style.setProperty('--menu-room', `${up ? anchor.top : below}px`);
  menu.style.setProperty('--menu-anchor-width', `${anchor.width}px`);
  const left = anchor.left + menu.offsetWidth > document.documentElement.clientWidth
    ? Math.max(0, anchor.right - menu.offsetWidth) // no room on the right: the right edges meet
    : anchor.left;
  menu.style.left = `${left + scrollX}px`;
  menu.style.top = up ? 'auto' : `${anchor.bottom + scrollY}px`;
  menu.style.bottom = up ? `${height - anchor.top - scrollY}px` : 'auto';
}

// The page scroll moves the menu by itself; a scroll inside another container (a wide table) needs a new place.
const onScroll = (event) => {
  if (event.target !== document && !event.target.classList?.contains('menu')) place();
};

function close() {
  menuOf(opener)?.hidePopover();
  opener?.focus();
}

// A flag that is not downloaded yet keeps its place without the broken image icon (error does not bubble: capture).
document.addEventListener('error', (event) => {
  if (event.target.matches?.('.menu__flag')) event.target.classList.add('is-missing');
}, true);

// The click comes before the popovertarget toggle: remember which button opens the menu.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[popovertarget]');
  if (menuOf(button)) opener = button;

  const option = event.target.closest('.menu:popover-open .menu__option');
  if (!option || !opener) return;
  if (!isListbox(option.closest('.menu'))) {
    close(); // a menu item: the link does its action
    return;
  }
  opener.dataset.value = option.dataset.value;
  for (const other of options(option.closest('.menu'))) other.setAttribute('aria-selected', other === option);
  option.dispatchEvent(new CustomEvent('menu-change', { bubbles: true, detail: { opener, option } }));
  close();
});

// Toggle events do not bubble: listen in the capture phase.
document.addEventListener('beforetoggle', (event) => {
  const menu = event.target;
  if (!menu.classList?.contains('menu') || event.newState !== 'open' || menuOf(opener) !== menu) return;
  menu.dispatchEvent(new CustomEvent('menu-open', { bubbles: true, detail: { opener } }));
  if (isListbox(menu)) {
    for (const option of options(menu)) option.setAttribute('aria-selected', option.dataset.value === opener.dataset.value);
  }
  place(); // before the first paint; the toggle event checks the room again with the real height
}, true);

document.addEventListener('toggle', (event) => {
  const menu = event.target;
  if (!menu.classList?.contains('menu') || menuOf(opener) !== menu) return;
  const open = event.newState === 'open';
  opener.setAttribute('aria-expanded', open);
  if (open) {
    place();
    (menu.querySelector('[aria-selected="true"]') ?? options(menu)[0])?.focus(); // also scrolls the list to it
    addEventListener('scroll', onScroll, true);
    addEventListener('resize', place);
  } else {
    removeEventListener('scroll', onScroll, true);
    removeEventListener('resize', place);
    // Escape or a click on an empty spot: focus back to the button (a click on another control keeps its focus).
    if (menu.contains(document.activeElement) || document.activeElement === document.body) opener.focus();
  }
}, true);

document.addEventListener('keydown', (event) => {
  // ↑ / ↓ on the button open the menu, like a select.
  const button = event.target.closest?.('[popovertarget]');
  if (menuOf(button) && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault();
    opener = button;
    menuOf(button).showPopover();
    return;
  }

  const menu = event.target.closest?.('.menu:popover-open');
  if (!menu) return;
  const list = options(menu);
  const index = list.indexOf(document.activeElement);
  const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1 }[event.key];
  if (move !== undefined) {
    event.preventDefault();
    list[Math.max(0, Math.min(move, list.length - 1))].focus();
  } else if (event.key === ' ' && document.activeElement.matches('a.menu__option')) {
    event.preventDefault(); // Space on a link item does the action, like Enter, instead of scrolling
    document.activeElement.click();
  } else if (event.key === 'Tab') {
    close(); // no preventDefault: Tab goes on from the button
  } else if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.timeStamp - typedAt > TYPEAHEAD_MS) typed = '';
    typed += event.key.toLowerCase();
    typedAt = event.timeStamp;
    const search = /^(.)\1*$/.test(typed) ? typed[0] : typed;
    const from = search.length === 1 ? index + 1 : index;
    const match = [...list.slice(from), ...list.slice(0, from)].find((option) => nameOf(option).startsWith(search));
    match?.focus();
  }
});
