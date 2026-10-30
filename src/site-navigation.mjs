// Shared, framework-neutral navigation contract for the React app and SSR pages.
// Keep destination/label changes in this one module.
export const MAIN_ITEMS = Object.freeze([
  { id: 'home', label: 'Home', href: '/' },
  { id: 'academic', label: 'Academic Hub', href: '/?page=academic' },
  { id: 'mcq-bank', label: 'MCQ Bank', href: '/mcq-bank' },
  { id: 'paper-reviews', label: 'Paper Reviews', href: '/paper-reviews' },
  { id: 'test-papers', label: 'Test Papers', href: '/test-papers' },
  { id: 'cgpa', label: 'CGPA Calc', href: '/?page=cgpa' },
  { id: 'articles', label: 'Articles', href: '/?page=articles' },
  { id: 'forum', label: 'Discussion', href: '/?page=forum' },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio' },
  { id: 'about', label: 'About', href: '/?page=about' },
  { id: 'contact', label: 'Contact', href: '/?page=contact' }
].map(Object.freeze));

export const MOBILE_ITEMS = Object.freeze([
  ...MAIN_ITEMS.slice(0, 5),
  { id: 'planner', label: 'Study Planner', href: '/?page=planner' },
  { id: 'flashcards', label: 'AI Flashcards', href: '/?page=flashcards' },
  { id: 'aiquiz', label: 'AI Quiz', href: '/?page=aiquiz' },
  ...MAIN_ITEMS.slice(5)
].map(Object.freeze));
