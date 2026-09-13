import { setLogLevel } from 'firebase/firestore';

// Firestore can emit noisy WebChannel transport warnings during normal
// reconnects on restrictive networks. Keep real errors visible while
// suppressing warning-level diagnostic noise in the browser console.
setLogLevel('error');
