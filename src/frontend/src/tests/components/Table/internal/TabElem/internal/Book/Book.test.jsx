import React from 'react';
import { render, screen } from '@testing-library/react';
import { Book } from '../../../../../../../components/Table/internal/TabElem/internal/Book/Book';

describe('Book', () => {
  it('renders default titles and a default story paragraph', () => {
    render(<Book />);

    expect(screen.getByText('General Patient Story')).toBeInTheDocument();
    expect(screen.getByText('Clinical Symptoms')).toBeInTheDocument();
    expect(screen.getByText(/has presented for evaluation/)).toBeInTheDocument();
  });

  it('renders the default symptoms list', () => {
    render(<Book />);

    expect(screen.getByText('Itching')).toBeInTheDocument();
    expect(screen.getByText('2 weeks')).toBeInTheDocument();
    expect(screen.getByText('Redness')).toBeInTheDocument();
    expect(screen.getByText('Swelling')).toBeInTheDocument();
  });

  it('renders custom titles, story paragraphs, and symptoms when provided as props', () => {
    render(
      <Book
        storyTitle="Patient Narrative"
        storyParagraphs={['A short custom story.']}
        symptomsTitle="Reported Symptoms"
        symptoms={[{ name: 'Bleeding', duration: '1 day' }]}
      />,
    );

    expect(screen.getByText('Patient Narrative')).toBeInTheDocument();
    expect(screen.getByText('A short custom story.')).toBeInTheDocument();
    expect(screen.getByText('Reported Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Bleeding')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.queryByText('Itching')).not.toBeInTheDocument();
  });
});
