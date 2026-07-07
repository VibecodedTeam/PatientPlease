import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../providers/Auth';
import { Login } from '../Login';
import styles from './AuthGate.module.css';

export function AuthGate({ googleClientId, children }) {
  const { status, user, login, logout } = useAuth();

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
      <header className={styles.header}>
        <span>{user.name}</span>
        <button type="button" onClick={() => logout()}>
          Logout
        </button>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

AuthGate.propTypes = {
  googleClientId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
