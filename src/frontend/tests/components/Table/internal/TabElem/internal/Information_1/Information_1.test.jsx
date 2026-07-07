import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_1 } from '../../../../../../../components/Table/internal/TabElem/internal/Information_1/Information_1';
import styles from '../../../../../../../components/Table/internal/TabElem/internal/Information_1/Information_1.module.css';

describe('Information_1', () => {
  it('renders the given title', () => {
    render(<Information_1 title="Clinical Notes" notes={[]} />);

    expect(screen.getByText('Clinical Notes')).toBeInTheDocument();
  });

  it('renders each note item', () => {
    render(
      <Information_1
        title="Clinical Notes"
        notes={['Lesion on left forearm', 'Mild itching reported']}
      />,
    );

    expect(screen.getByText('Lesion on left forearm')).toBeInTheDocument();
    expect(screen.getByText('Mild itching reported')).toBeInTheDocument();
  });

  it('renders patient name and age next to the note list', () => {
    render(<Information_1 title="Clinical Notes" patientName="Jane Doe" patientAge="42" notes={[]} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Age', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('42', { exact: false })).toBeInTheDocument();
  });

  it('applies the card layout class to its root element', () => {
    render(<Information_1 data-testid="card-root" title="t" notes={[]} />);

    expect(screen.getByTestId('card-root')).toHaveClass(styles.card);
  });
});
