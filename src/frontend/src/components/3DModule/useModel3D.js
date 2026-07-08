import { useContext } from 'react';
import { Model3DContext } from './Model3DProvider';

/**
 * @returns {{ model: import('three').Group | null, status: 'idle'|'loading'|'success'|'error', error: Error | null }}
 */
export function useModel3D() {
  const context = useContext(Model3DContext);
  if (context === undefined) {
    throw new Error('useModel3D must be used within a Model3DProvider');
  }
  return context;
}
