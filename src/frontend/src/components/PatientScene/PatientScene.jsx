import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { usePatientScene } from './usePatientScene';
import { screenToNdc } from './internal/screenToNdc';
import { pickDot } from './internal/pickDot';
import { dodajKropkeDlaRegionu } from './internal/dodajKropkeDlaRegionu';
import { deriveAttentionRegions } from './internal/deriveAttentionRegions';
import { MelanomaImagePopup } from '../MelanomaImagePopup';
import styles from './PatientScene.module.css';

const DOT_COLOR = 0xffff00;

export function PatientScene({ documents }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const dotsRef = useRef([]);
  const activeDotRef = useRef(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { model, status } = usePatientScene();

  const closePopup = () => {
    if (activeDotRef.current) {
      activeDotRef.current.material.color.setHex(activeDotRef.current.userData.baseColor);
      activeDotRef.current = null;
    }
    setIsPopupOpen(false);
  };

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1f29);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    // The model is recentered onto the world origin below, so the default target
    // must be (0, 0, 0) too, or the character renders off-center in the viewport.
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = screenToNdc(event.clientX, event.clientY, rect);
      const hit = pickDot(ndc, cameraRef.current, dotsRef.current);
      if (!hit) return;

      // Only one dot is active at a time - revert whichever was active before.
      if (activeDotRef.current && activeDotRef.current !== hit) {
        activeDotRef.current.material.color.setHex(activeDotRef.current.userData.baseColor);
      }
      hit.material.color.set(0xff0000);
      activeDotRef.current = hit;
      setIsPopupOpen(true);
      // eslint-disable-next-line no-console
      console.log(hit.userData.bodyRegion);
    };
    renderer.domElement.addEventListener('click', handleClick);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      controlsRef.current?.dispose();
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || status !== 'success' || !model) return undefined;

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = maxDimension > 0 ? 2 / maxDimension : 1;
    model.scale.set(scale, scale, scale);
    // Position is a translation in parent space, applied on top of (not scaled by)
    // the object's own scale, so the centering offset must be pre-multiplied by it.
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    model.traverse((child) => {
      if (child.isMesh && !child.material) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffdbac,
          roughness: 0.7,
          metalness: 0.1,
        });
      }
      if (child.isMesh && child.userData.isKropka) {
        dotsRef.current.push(child);
      }
    });

    deriveAttentionRegions(documents).forEach((region) => {
      dotsRef.current.push(dodajKropkeDlaRegionu(model, region, DOT_COLOR));
    });

    scene.add(model);
    modelRef.current = model;

    return () => {
      scene.remove(model);
      dotsRef.current = [];
      model.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    };
  }, [model, status, documents]);

  return (
    <>
      <div ref={containerRef} className={styles.container} data-testid="patient-scene-container" />
      {isPopupOpen && <MelanomaImagePopup onClose={closePopup} />}
    </>
  );
}

PatientScene.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      attentionPointRegion: PropTypes.string,
    }),
  ),
};

PatientScene.defaultProps = {
  documents: [],
};
