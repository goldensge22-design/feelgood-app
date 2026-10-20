import { createRoot } from 'react-dom/client';
import App from './App';
import Previous from './previous/App';
import './review.css';

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, info) => console.error(error, info.componentStack),
}).render(<App before={false} previous><Previous /></App>);