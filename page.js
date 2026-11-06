// Behavior of every sandbox page — the sandbox (index.html) and the standalone pages, e.g. home-page.html (#154).
// The breakpoint from the tokens size.breakpoint.* (custom properties do not work in @media): data-breakpoint on <html>,
// also written into .sandbox-breakpoint when the page has one. aria-disabled buttons stay focusable, so the page blocks
// their click; sandbox forms do not submit.

const root = document.documentElement;
const style = getComputedStyle(root);
const queries = ['mobile', 'tablet', 'desktop'].map((name) => [name, matchMedia(`(min-width: ${style.getPropertyValue(`--size-breakpoint-${name}`).trim()})`)]);
function setBreakpoint() {
  const name = queries.filter(([, query]) => query.matches).pop()[0];
  root.dataset.breakpoint = name;
  const label = document.querySelector('.sandbox-breakpoint');
  if (label) label.textContent = name;
}
queries.forEach(([, query]) => query.addEventListener('change', setBreakpoint));
setBreakpoint();

document.addEventListener('click', (event) => {
  if (event.target.closest('[aria-disabled="true"]')) event.preventDefault();
}, true);
document.addEventListener('submit', (event) => event.preventDefault());
