// Input modality (#104): data-modality="keyboard | pointer" on <html>, so text fields can show a 1 px focus border on
// a click or a tap and the 2 px one when the focus comes from the keyboard. Browsers treat every focus of a text field
// as :focus-visible, so CSS alone cannot tell the two apart. Typing does not switch the mode (the border would jump while
// typing); only navigation keys do: Tab always, arrows and other navigation keys outside text fields. Without this
// script the attribute is absent and fields keep the 2 px border.

const NAVIGATION = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);
const typing = (element) => element.matches?.('input:not([type="button"], [type="checkbox"], [type="radio"]), textarea, [contenteditable]');
const set = (mode) => { document.documentElement.dataset.modality = mode; };

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' || (NAVIGATION.has(event.key) && !typing(event.target))) set('keyboard');
}, true);
document.addEventListener('pointerdown', () => set('pointer'), true);
