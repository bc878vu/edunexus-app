// Shared, framework-neutral navigation contract for the React app and SSR pages.
// Keep destination/label changes in this one module.
export const MAIN_ITEMS = Object.freeze([
  { id: 'home', label: 'Home', href: '/' },
  { id: 'academic', label: 'Academic Hub', href: '/?page=academic' },
  { id: 'exam-prep', label: 'Exam Prep', href: '/?page=exam-prep' },
  { id: 'cgpa', label: 'CGPA Calc', href: '/?page=cgpa' },
  { id: 'articles', label: 'Articles', href: '/?page=articles' },
  { id: 'forum', label: 'Discussion', href: '/?page=forum' },
  { id: 'portfolio', label: 'Portfolio', href: '/?page=portfolio' },
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
