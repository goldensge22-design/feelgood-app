import { createRoot } from 'react-dom/client';
import App from './App';
import Reviewed from './official/App';
import './review.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(<App before={false}><Reviewed /></App>);
