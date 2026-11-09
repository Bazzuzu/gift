// Tabs (#133): APG Tabs with automatic activation. A click or ←/→ (wrapping), Home / End choose a tab: it gets
// aria-selected and the only tabindex in the row, its panel is shown and the others are hidden. Fires tabs-change
// { tab, panel } on the tab list. Pages are inserted into index.html, so events are delegated.

const tabsOf = (list) => [...list.querySelectorAll('[role="tab"]')];

function select(tab, focus = false) {
  const list = tab.closest('[role="tablist"]');
  for (const other of tabsOf(list)) {
    const chosen = other === tab;
    other.setAttribute('aria-selected', chosen);
    other.tabIndex = chosen ? 0 : -1;
    const panel = document.getElementById(other.getAttribute('aria-controls'));
    if (panel) panel.hidden = !chosen;
  }
  if (focus) tab.focus();
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  list.dispatchEvent(new CustomEvent('tabs-change', { bubbles: true, detail: { tab, panel } }));
}

document.addEventListener('click', (event) => {
  const tab = event.target.closest('[role="tablist"] [role="tab"]');
  if (tab && tab.getAttribute('aria-selected') !== 'true') select(tab);
});

document.addEventListener('keydown', (event) => {
  const tab = event.target.closest?.('[role="tablist"] [role="tab"]');
  if (!tab) return;
  const tabs = tabsOf(tab.closest('[role="tablist"]'));
  const i = tabs.indexOf(tab);
  const next = {
    ArrowRight: tabs[(i + 1) % tabs.length],
    ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
    Home: tabs[0],
    End: tabs[tabs.length - 1],
  }[event.key];
  if (!next) return;
  event.preventDefault();
  select(next, true);
});
