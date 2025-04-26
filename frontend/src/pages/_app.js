// Import notre correctif pour le rendu statique
import '../../static-fix.js';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
} 