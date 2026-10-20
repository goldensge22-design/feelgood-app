import { createRoot } from 'react-dom/client';
import App from './enhancement/App';
import './enhancement/enhancement.css';

createRoot(document.getElementById('root')!).render(<App />);
document.documentElement.dataset.nuviaReady = 'true';
