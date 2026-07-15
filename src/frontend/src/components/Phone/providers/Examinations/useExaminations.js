import { useContext } from 'react';
import { ExaminationsContext } from './ExaminationsProvider';

export function useExaminations() {
  const context = useContext(ExaminationsContext);
  if (!context) {
    throw new Error('useExaminations must be used within an ExaminationsProvider');
  }
  return context;
}
