// A narrow compatibility guard for duplicate legacy dashboard query cards.
// It never deletes React-managed elements or touches submitted Firestore data.
// Prefer the current home-support form and leave unrelated forms untouched.
const QUERY_HEADING = 'Submit Your Query';

export function enforceSingleDashboardQueryForm(main, hiddenCards = new Map()) {
  if (!main || typeof main.querySelectorAll !== 'function') return 0;

  const cards = [...main.querySelectorAll('h2')]
    .filter((heading) => heading.textContent?.trim() === QUERY_HEADING)
    .map((heading) => heading.parentElement)
    .filter((card) => card &&
      card.querySelectorAll('input').length >= 2 &&
      card.querySelector('textarea') &&
      [...card.querySelectorAll('button')].some((button) =>
        button.textContent?.trim() === 'Submit Feedback'));

  const current = cards.find((card) => card.closest('#home-support')) || cards[0];

  for (const card of cards) {
    if (card === current) {
      // Restore the current form if it was previously a duplicate.
      if (hiddenCards.has(card)) {
        card.style.display = hiddenCards.get(card);
        hiddenCards.delete(card);
      }
    } else if (!hiddenCards.has(card)) {
      hiddenCards.set(card, card.style.display);
      card.style.display = 'none';
    }
  }
  return cards.length - (current ? 1 : 0);
}

export function restoreDashboardQueryCards(hiddenCards) {
  for (const [card, display] of hiddenCards) card.style.display = display;
  hiddenCards.clear();
}
