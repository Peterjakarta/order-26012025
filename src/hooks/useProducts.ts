import { useStore } from '../store/StoreContext';

export function useProducts() {
  return useStore();
}