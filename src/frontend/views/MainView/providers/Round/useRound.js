import { useContext } from 'react';
import { RoundContext } from './RoundProvider';

export function useRound() {
  const context = useContext(RoundContext);
  if (!context) {
    throw new Error('useRound must be used within a RoundProvider');
  }
  return context;
}
