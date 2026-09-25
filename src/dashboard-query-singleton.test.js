import {
  enforceSingleDashboardQueryForm,
  restoreDashboardQueryCards
} from './dashboard-query-singleton.mjs';

const queryCard = (id, title = 'Submit Your Query') => `
  <div id="${id}" class="query-card">
    <h2>${title}</h2>
    <div><input aria-label="Name" /><input aria-label="Email" />
      <textarea aria-label="Message"></textarea>
      <button>Submit Feedback</button>
    </div>
  </div>`;

test('one dashboard query form is preserved without altering the FAQ', () => {
  document.body.innerHTML = `
    <main><section id="home-support">
      ${queryCard('primary')}
      <section id="home-faq"><h2>Frequently asked questions</h2></section>
    </section></main>`;
  const hidden = new Map();
  expect(enforceSingleDashboardQueryForm(document.querySelector('main'), hidden)).toBe(0);
  expect(document.getElementById('primary').style.display).toBe('');
  expect(document.getElementById('home-faq')).not.toBeNull();
  expect(hidden.size).toBe(0);
});

test('only a second matching form is hidden; canonical form remains functional', () => {
  document.body.innerHTML = `
    <main>
      ${queryCard('legacy')}
      <section id="home-support">${queryCard('primary')}
        <section id="home-faq">FAQs</section>
      </section>
      ${queryCard('other', 'Report a broken file')}
    </main>`;
  const hidden = new Map();
  const main = document.querySelector('main');
  expect(enforceSingleDashboardQueryForm(main, hidden)).toBe(1);
  expect(document.getElementById('legacy').style.display).toBe('none');
  expect(document.getElementById('primary').style.display).not.toBe('none');
  expect(document.getElementById('other').style.display).not.toBe('none');
  expect(document.getElementById('primary').querySelector('input')).not.toBeNull();
  expect(document.getElementById('home-faq')).not.toBeNull();
  expect(enforceSingleDashboardQueryForm(main, hidden)).toBe(1);
  expect(hidden.size).toBe(1);
  restoreDashboardQueryCards(hidden);
  expect(document.getElementById('legacy').style.display).toBe('');
  expect(hidden.size).toBe(0);
});

test('never hides an incomplete, unrelated or differently labelled form', () => {
  document.body.innerHTML = `
    <main><section id="home-support">${queryCard('primary')}</section>
      <div id="not-query"><h2>Submit Your Query</h2><button>Submit Feedback</button></div>
      <div id="no-submit"><h2>Submit Your Query</h2>
        <input /><input /><textarea></textarea><button>Send</button></div>
    </main>`;
  const hidden = new Map();
  expect(enforceSingleDashboardQueryForm(document.querySelector('main'), hidden)).toBe(0);
  expect(document.getElementById('not-query').style.display).toBe('');
  expect(document.getElementById('no-submit').style.display).toBe('');
});
