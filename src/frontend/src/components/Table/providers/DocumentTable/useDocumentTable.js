import { useContext } from 'react';
import { DocumentTableContext } from './DocumentTableProvider';

export function useDocumentTable() {
  const context = useContext(DocumentTableContext);
  if (!context) {
    throw new Error('useDocumentTable must be used within a DocumentTableProvider');
  }
  return context;
}
