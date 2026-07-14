import { useContext } from 'react';
import { WallInventoryContext } from './WallInventoryProvider';

export function useWallInventory() {
  const context = useContext(WallInventoryContext);
  if (!context) {
    throw new Error('useWallInventory must be used within a WallInventoryProvider');
  }
  return context;
}
