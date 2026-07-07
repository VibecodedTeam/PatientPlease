import React from 'react';
import PropTypes from 'prop-types';
import styles from './Information_2.module.css';

const DEFAULT_STORY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "General Patient Story".
 * @param {string} props.story - Narrative text, later populated from backend data.
 */
export function Information_2({
  title = 'General Patient Story',
  story = DEFAULT_STORY,
  className = '',
  ...rest
}) {
  const rootClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={rootClassName} {...rest}>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.body}>{story}</div>
      </div>
    </div>
  );
}

Information_2.propTypes = {
  title: PropTypes.string,
  story: PropTypes.string,
  className: PropTypes.string,
};
