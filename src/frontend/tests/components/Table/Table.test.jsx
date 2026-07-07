import React from 'react';
import { render, screen } from '@testing-library/react';
import { Table } from '../../../components/Table/Table';
import styles from '../../../components/Table/Table.module.css';

describe('Table', () => {
  it('renders its children', () => {
    render(
      <Table>
        <span>Patient chart</span>
      </Table>
    );

    expect(screen.getByText('Patient chart')).toBeInTheDocument();
  });

  it('applies the table layout class to its root element', () => {
    render(<Table data-testid="table-root">content</Table>);

    expect(screen.getByTestId('table-root')).toHaveClass(styles.table);
  });
});
