import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../providers/Auth';
import { Login } from '../Login';
import styles from './AuthGate.module.css';

export function AuthGate({ googleClientId, children }) {
  const { status, login } = useAuth();

  if (status === 'loading') {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <Login
        googleClientId={googleClientId}
        onCredential={(credential) => {
          login(credential).catch((err) => console.error('Google sign-in failed', err));
        }}
      />
    );
  }

  return (
    <div className={styles.gate}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

AuthGate.propTypes = {
  googleClientId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
