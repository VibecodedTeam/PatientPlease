import React from 'react';
import { render, screen } from '@testing-library/react';
import { Information_1 } from './Information_1';
import styles from './Information_1.module.css';

describe('Information_1', () => {
  it('renders the given title', () => {
    render(<Information_1 title="Clinical Notes" items={[]} patientInfo={{}} />);

    expect(screen.getByText('Clinical Notes')).toBeInTheDocument();
  });

  it('renders each info item prefixed with a dash', () => {
    render(
      <Information_1
        title="Clinical Notes"
        items={['Lesion on left forearm', 'Mild itching reported']}
        patientInfo={{}}
      />
    );

    expect(screen.getByText('- Lesion on left forearm')).toBeInTheDocument();
    expect(screen.getByText('- Mild itching reported')).toBeInTheDocument();
  });

  it('renders patient info labels and values next to the item list', () => {
    render(
      <Information_1
        title="Clinical Notes"
        items={[]}
        patientInfo={{ Name: 'Jane Doe', Age: '42' }}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies the card layout class to its root element', () => {
    render(<Information_1 data-testid="card-root" title="t" items={[]} patientInfo={{}} />);

    expect(screen.getByTestId('card-root')).toHaveClass(styles.card);
  });
});
