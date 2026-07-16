import { useContext } from 'react';
import { BiopsyMinigameContext } from './BiopsyMinigameProvider';

export function useBiopsyMinigame() {
  const context = useContext(BiopsyMinigameContext);
  if (!context) {
    throw new Error('useBiopsyMinigame must be used within a BiopsyMinigameProvider');
  }
  return context;
}
