import { useContext } from 'react';
import { StatisticsContext } from './StatisticsProvider';

export function useStatistics() {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error('useStatistics must be used within a StatisticsProvider');
  }
  return context;
}
