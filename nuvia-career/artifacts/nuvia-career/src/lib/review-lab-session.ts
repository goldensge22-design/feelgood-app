import { createContext } from 'react';

export const ReviewLabSession = createContext<(() => Promise<string|null>)|null>(null);
export const ReviewAiAccount = createContext<string|null>(null);
