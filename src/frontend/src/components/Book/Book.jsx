import React from 'react';
import styles from './Book.module.css';
import { useDocumentTable } from '../Table/providers/DocumentTable';

/**
 * Renders one page per revealed case document. Deliberately has no
 * fallback/placeholder content: when `documents` is empty (still loading, or
 * nothing revealed yet), the book is simply blank.
 */
export function Book() {
  const { documents } = useDocumentTable();

  return (
    <section className={styles.book} aria-label="Patient documents">
      {documents.map((document) => (
        <article key={document.id} className={styles.page}>
          <h2 className={styles.title}>{document.title}</h2>
          {document.imageUrl && (
            <img
              className={styles.image}
              src={document.imageUrl}
              alt={document.imageAltText ?? ''}
            />
          )}
        </article>
      ))}
    </section>
  );
}
