import { useContext } from 'react';
import { GameSessionContext } from './GameSessionProvider';

export function useGameSession() {
  const context = useContext(GameSessionContext);
  if (!context) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return context;
}
