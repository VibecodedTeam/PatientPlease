import { useContext } from 'react';
import { NightShopContext } from './NightShopProvider';

export function useNightShop() {
  const context = useContext(NightShopContext);
  if (!context) {
    throw new Error('useNightShop must be used within a NightShopProvider');
  }
  return context;
}
