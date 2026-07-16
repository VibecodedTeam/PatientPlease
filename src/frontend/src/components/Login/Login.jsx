import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './Login.module.css';

const GSI_SCRIPT_ID = 'google-gsi-script';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function Login({ googleClientId, onCredential }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    function initializeGoogleButton() {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
      });
    }

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return undefined;
    }

    let script = document.getElementById(GSI_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = GSI_SCRIPT_ID;
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', initializeGoogleButton);
    return () => script.removeEventListener('load', initializeGoogleButton);
  }, [googleClientId, onCredential]);

  return (
    <div className={styles.login}>
      <h1 className={styles.title}>Zaloguj się</h1>
      <div ref={buttonRef} />
    </div>
  );
}

Login.propTypes = {
  googleClientId: PropTypes.string.isRequired,
  onCredential: PropTypes.func.isRequired,
};
