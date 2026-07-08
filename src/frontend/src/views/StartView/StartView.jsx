import React, { useState, useEffect, useRef } from 'react';
import './StartView.module.css';

const ICONS = {
  A: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4 C10 4 6 10 6 16 C6 22 10 28 16 28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 4 C22 4 26 9 26 13 C26 17 22 19 16 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  B: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 5 C21 6 24 9 25 13 C26 17 23 18 24 21 C25 24 21 26 16 26 C11 26 7 24 7 19 C7 15 9 13 8 10 C7 7 11 4 16 5 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  C: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9" />
      <circle cx="20" cy="12" r="5" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="20" r="5" fill="currentColor" opacity="0.35" />
      <circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.15" />
    </svg>
  ),
  D: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="5" y1="11" x2="5" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="27" y1="11" x2="27" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="11" y1="13" x2="11" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="13" x2="16" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="21" y1="13" x2="21" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  E: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 16 A8 8 0 1 1 12.5 22.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.5 22.8 L8.5 21.8 L11 25.5 Z" fill="currentColor" />
    </svg>
  ),
};

const ABCDE = [
  {
    letter: 'A',
    word: 'Asymmetry',
    desc: 'One half of the mole doesn\u2019t match the other in shape or size.',
  },
  {
    letter: 'B',
    word: 'Border',
    desc: 'Edges are ragged, notched, or blurred instead of smooth.',
  },
  {
    letter: 'C',
    word: 'Color',
    desc: 'Uneven shading \u2014 shades of brown, black, tan, or even red and blue.',
  },
  {
    letter: 'D',
    word: 'Diameter',
    desc: 'Larger than 6mm across, roughly the size of a pencil eraser.',
  },
  {
    letter: 'E',
    word: 'Evolving',
    desc: 'Changing in size, shape, color, or starting to itch or bleed.',
  },
];

const STATS = [
  {
    num: '1 in 5',
    label: 'Americans will develop skin cancer by age 70',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="21" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 25c0-4 3-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 18c3.2.5 6 3.2 6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: '99%',
    label: 'survival rate when caught early',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4 L27 8 V16 C27 22 22 26 16 28 C10 26 5 22 5 16 V8 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M11 16 L15 20 L21 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '~90%',
    label: 'cases linked to UV exposure',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="16" y1="26" x2="16" y2="30" />
          <line x1="2" y1="16" x2="6" y2="16" />
          <line x1="26" y1="16" x2="30" y2="16" />
          <line x1="6.3" y1="6.3" x2="9.1" y2="9.1" />
          <line x1="22.9" y1="22.9" x2="25.7" y2="25.7" />
          <line x1="6.3" y1="25.7" x2="9.1" y2="22.9" />
          <line x1="22.9" y1="9.1" x2="25.7" y2="6.3" />
        </g>
      </svg>
    ),
  },
];

const CAPTIONS = [
  '\u25b6 Spotting the signs \u2014 00:04',
  '\u25b6 The ABCDE check \u2014 00:11',
  '\u25b6 When to see a dermatologist \u2014 00:19',
];

function SunGraphic() {
  return (
    <svg className="sca-sun" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="200" cy="200" r="70" stroke="currentColor" strokeWidth="1.4" />
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16;
        return (
          <line
            key={i}
            x1="200"
            y1="200"
            x2="200"
            y2="60"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            transform={`rotate(${angle} 200 200)`}
          />
        );
      })}
    </svg>
  );
}

export function StartView() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [captionIndex, setCaptionIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCaptionIndex((i) => (i + 1) % CAPTIONS.length);
      }, 2600);
    } else {
      clearInterval(intervalRef.current);
      setCaptionIndex(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  return (
    <div className={`sca-page${isPlaying ? ' is-playing' : ''}`}>
      <section className="sca-hero">
        <SunGraphic />

        <div
          className="sca-hero-bg-dot dot-tl"
          style={{ width: 260, height: 260, marginTop: -60, marginLeft: -80 }}
        />
        <div
          className="sca-hero-bg-dot dot-br"
          style={{ width: 180, height: 180, marginBottom: -40, marginRight: -40 }}
        />

        <div className="sca-hero-content">
          <span className="sca-eyebrow">Skin Cancer Awareness</span>

          <h1 className="sca-headline">
            Know your skin.
            <br />
            Catch it <em>early</em>.
          </h1>

          <p className="sca-subhead">
            Most skin cancers are caused by sun exposure you can control — and
            nearly all are treatable when found in time. It starts with knowing
            what to look for.
          </p>

          <div className="sca-stage">
            <span className="sca-ring r1" />
            <span className="sca-ring r2" />
            <span className="sca-ring r3" />

            <span className="sca-mole m1" />
            <span className="sca-mole irregular m2" />
            <span className="sca-mole m3" />
            <span className="sca-mole irregular m4" />

            <button
              className="sca-play-btn"
              onClick={() => setIsPlaying((p) => !p)}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'Pause awareness video' : 'Play awareness video'}
            >
              <span className="sca-play-icon" />
            </button>
          </div>

          <p className="sca-caption">{isPlaying ? CAPTIONS[captionIndex] : ''}</p>
        </div>
      </section>

      <section className="sca-section" aria-labelledby="abcde-heading">
        <div className="sca-section-head">
          <span className="sca-eyebrow">The self-check</span>
          <h2 className="sca-section-title" id="abcde-heading">
            The ABCDE rule
          </h2>
          <p className="sca-section-sub">
            Dermatologists use this five-point checklist to tell a harmless
            mole from one that needs a closer look. Run through it once a
            month.
          </p>
        </div>

        <div className="sca-abcde">
          {ABCDE.map((item) => (
            <div className="sca-abcde-card" key={item.letter}>
              <span className="sca-abcde-icon">{ICONS[item.letter]}</span>
              <div className="sca-abcde-letter">{item.letter}</div>
              <div className="sca-abcde-word">{item.word}</div>
              <div className="sca-abcde-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sca-stats">
        <div className="sca-stats-inner">
          {STATS.map((s) => (
            <div key={s.label}>
              <span className="sca-stat-icon">{s.icon}</span>
              <div className="sca-stat-num">{s.num}</div>
              <div className="sca-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sca-cta">
        <span className="sca-eyebrow">Take five minutes</span>
        <h2 className="sca-cta-title">Check one mole you’ve been ignoring.</h2>
        <p className="sca-cta-text">
          A skin check takes less time than the video above. If something
          matches two or more letters of the ABCDE rule, book a dermatologist
          appointment — it’s worth the five minutes.
        </p>
        <button
          className="sca-cta-btn"
          onClick={() => window.open('https://www.aad.org/find-a-derm', '_blank')}
        >
          Find a dermatologist
        </button>
        <p className="sca-foot-note">
          This page is educational and not a substitute for professional
          medical advice.
        </p>
      </section>
    </div>
  );
}