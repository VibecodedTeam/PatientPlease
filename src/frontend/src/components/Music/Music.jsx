import React, { useEffect, useRef, useState } from 'react';
import { TRACKS } from './internal/tracks';
import { pickRandomStartIndex, nextIndex } from './internal/playbackQueue';
import styles from './Music.module.css';

export function Music() {
  const [trackIndex] = useState(() => pickRandomStartIndex(TRACKS.length));
  const [currentIndex, setCurrentIndex] = useState(trackIndex);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current?.play().catch(() => {});
  }, [currentIndex]);

  const handleEnded = () => {
    setCurrentIndex((previousIndex) => nextIndex(previousIndex, TRACKS.length));
  };

  return (
    <audio
      ref={audioRef}
      className={styles.hiddenAudio}
      src={TRACKS[currentIndex]}
      onEnded={handleEnded}
    />
  );
}
