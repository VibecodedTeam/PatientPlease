import { useContext } from 'react';
import { ResultsContext } from './ResultsProvider';

export function useResults() {
  const context = useContext(ResultsContext);
  if (!context) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
}
