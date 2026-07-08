import { useContext } from 'react';
import { PatientSceneContext } from './PatientSceneProvider';

/**
 * @returns {{ model: import('three').Group | null, status: 'idle'|'loading'|'success'|'error', error: Error | null }}
 */
export function usePatientScene() {
  const context = useContext(PatientSceneContext);
  if (context === undefined) {
    throw new Error('usePatientScene must be used within a PatientSceneProvider');
  }
  return context;
}
