import { createRoot } from 'react-dom/client';
import App from './App';
import Before from './before/App';
import './review.css';

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(<App before><Before /></App>);