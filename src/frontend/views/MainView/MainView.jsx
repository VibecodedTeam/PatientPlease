import React from 'react';
import { RoundProvider } from './providers/Round';
import { DocumentTableProvider } from '../../components/Table/providers/DocumentTable';
import { Table } from '../../components/Table';

export function MainView() {
  return (
    <RoundProvider>
      <DocumentTableProvider>
        <Table />
      </DocumentTableProvider>
    </RoundProvider>
  );
}