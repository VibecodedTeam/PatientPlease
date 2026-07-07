import React from 'react';
import { RoundProvider } from './providers/Round';
import { DocumentTableProvider } from '../../components/TableFol/DocumentTableFol';
import { Table } from '../../components/TableFol';

export function MainView() {
  return (
    <RoundProvider>
      <DocumentTableProvider>
        <Table />
      </DocumentTableProvider>
    </RoundProvider>
  );
}