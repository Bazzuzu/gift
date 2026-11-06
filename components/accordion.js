// Accordion (#149, APG Accordion): a click on a question (Enter and Space on the button) opens or closes its answer —
// aria-expanded on the button, hidden on the answer, the icon expand-less (open) or expand-more (closed). Each question
// opens on its own. Pages are inserted into index.html, so the click is delegated.

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.accordion__toggle');
  if (!toggle) return;
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', open);
  const answer = document.getElementById(toggle.getAttribute('aria-controls'));
  if (answer) answer.hidden = !open;
  const icon = toggle.querySelector('.accordion__icon .icon');
  icon?.classList.toggle('icon--expand-less', open);
  icon?.classList.toggle('icon--expand-more', !open);
});
