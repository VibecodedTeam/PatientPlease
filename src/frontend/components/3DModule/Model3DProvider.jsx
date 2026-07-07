import React, { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { fetchObjModel } from '../../src/libs/model3DClient';

export const Model3DContext = createContext(undefined);

/**
 * Fetches a .obj model via the shared axios lib and parses it with three's OBJLoader,
 * exposing the result to descendants via useModel3D().
 * @param {{ url: string, children: React.ReactNode }} props
 */
export function Model3DProvider({ url, children }) {
  const [state, setState] = useState({ model: null, status: 'idle', error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ model: null, status: 'loading', error: null });

    fetchObjModel(url)
      .then((objText) => {
        if (cancelled) return;
        const model = new OBJLoader().parse(objText);
        setState({ model, status: 'success', error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ model: null, status: 'error', error });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <Model3DContext.Provider value={state}>{children}</Model3DContext.Provider>;
}

Model3DProvider.propTypes = {
  url: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
