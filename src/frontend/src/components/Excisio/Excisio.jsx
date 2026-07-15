import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { useExcisio } from './useExcisio';
import { formatZloty } from './internal/geometry';
import { DRAW_COLORS, DRAW_THICKNESSES } from './internal/plasterMotifs';
import styles from './Excisio.module.css';

const PREP_TOOLS = [
  { id: 'wipe', name: 'Gazik', handler: 'equipWipe', icon: WipeIcon },
  { id: 'syringe', name: 'Strzykawka', handler: 'equipSyringe', icon: SyringeIcon },
  { id: 'scissors', name: 'Nożyczki', handler: 'equipScissors', icon: ScissorsIcon },
];

const CLOSE_TOOLS = [
  { id: 'needleDeep', name: 'Szew głęboki', handler: 'equipNeedleDeep', icon: NeedleIcon },
  { id: 'needleSkin', name: 'Szew skórny', handler: 'equipNeedleSkin', icon: NeedleIcon },
  { id: 'cream', name: 'Maść', handler: 'equipCream', icon: CreamIcon },
];

const TOOL_BADGE_LABEL = { active: 'Weź', held: 'W dłoni', done: '✓', locked: '' };

const PHASE_META = {
  disinfect: { dot: '#63c7e6', border: 'rgba(99,199,230,.4)' },
  anest: { dot: '#f0a94d', border: 'rgba(240,169,77,.4)' },
  cut: { dot: '#a78bfa', border: 'rgba(139,110,246,.4)' },
  suture_deep: { dot: '#c4b5fd', border: 'rgba(139,110,246,.4)' },
  suture_skin: { dot: '#63c7e6', border: 'rgba(99,199,230,.4)' },
  cream: { dot: '#57e0c0', border: 'rgba(87,224,192,.4)' },
  plaster: { dot: '#8beedd', border: 'rgba(87,224,192,.4)' },
};

const TUTORIAL_STEPS = [
  { color: 'rgba(139,110,246,.16)', textColor: '#c4b5fd', text: 'Rozpoznaj czerniaka — <b>większy, asymetryczny</b>, o poszarpanych brzegach i niejednolitym kolorze (ABCDE).' },
  { color: 'rgba(99,199,230,.18)', textColor: '#9ad9ef', text: 'Weź gazik z tacki i <b>odkaź pole</b> — przetrzyj skórę dookoła zmiany.' },
  { color: 'rgba(240,169,77,.18)', textColor: '#f0c98a', text: 'Podaj <b>znieczulenie miejscowe</b> — 3 wkłucia w zdrową skórę dookoła zmiany (nie w czerniaka).' },
  { color: 'rgba(139,110,246,.16)', textColor: '#c4b5fd', text: 'Wycinaj <b>elipsą wzdłuż długiej osi kończyny</b>, równolegle do naczyń chłonnych — rana ładnie się zamknie.' },
  { color: 'rgba(240,169,77,.18)', textColor: '#f0c98a', text: 'Zachowaj margines <b>1–3 mm</b> dookoła całej zmiany — i usuń ją <b>w całości</b>.' },
  { color: 'rgba(196,181,253,.2)', textColor: '#c4b5fd', text: 'Zamknij ranę warstwowo: najpierw <b>szwy głębokie</b> (wchłanialne) — przeciągaj igłą w poprzek rany, równomiernie, by zmniejszyć napięcie skóry.' },
  { color: 'rgba(99,199,230,.18)', textColor: '#9ad9ef', text: 'Potem <b>szwy skórne</b> — prostopadle do rany, symetrycznie i równo rozstawione, by brzegi zeszły się gładko.' },
  { color: 'rgba(87,224,192,.18)', textColor: '#8beedd', text: 'Na koniec <b>posmaruj maścią</b> i gotowe.' },
];

function phaseHint(phase, equipped, deepCount, skinCount, disinfectPct, creamPct, injCount, deepNeed, skinNeed) {
  const needsTool = (label) => `Weź <b>${label}</b> z tacki.`;
  switch (phase) {
    case 'disinfect':
      return {
        label: `Krok 1 · Odkażanie pola  (${disinfectPct}%)`,
        hint: equipped === 'wipe' ? 'Przecieraj gazikiem <b>szeroko dookoła</b> zmiany — całe pole operacyjne, nie tylko sam czerniak. Puść przy 100%.' : needsTool('gazik'),
      };
    case 'anest':
      return {
        label: `Krok 2 · Znieczulenie  (${Math.min(injCount, 3)}/3)`,
        hint: equipped === 'syringe' ? 'Wstrzyknij znieczulenie w zdrową skórę dookoła zmiany — rozłóż 3 wkłucia równomiernie.' : needsTool('strzykawkę'),
      };
    case 'cut':
      return {
        label: 'Krok 3 · Wycięcie',
        hint: equipped === 'scissors' ? 'Wytnij elipsą wzdłuż długiej osi (równolegle do naczyń). Kółkiem myszy lub +/− przybliżysz obraz.' : needsTool('nożyczki'),
      };
    case 'suture_deep':
      return {
        label: `Krok 4 · Szwy głębokie  (${Math.min(deepCount, deepNeed)}/${deepNeed})`,
        hint: equipped === 'needleDeep'
          ? 'Załóż szwy wchłanialne w głębszej warstwie: przeciągnij igłą <b>w poprzek rany</b> — od jednego brzegu do drugiego. Rozłóż je równomiernie, by zmniejszyć napięcie skóry.'
          : needsTool('igłę ze szwem głębokim'),
      };
    case 'suture_skin':
      return {
        label: `Krok 5 · Szwy skórne  (${Math.min(skinCount, skinNeed)}/${skinNeed})`,
        hint: equipped === 'needleSkin'
          ? 'Zbliż brzegi skóry: przeciągnij igłą w poprzek rany — <b>prostopadle</b>, symetrycznie i równo rozstawione. Precyzja daje ładną, płaską bliznę.'
          : needsTool('igłę ze szwem skórnym'),
      };
    case 'cream':
      return {
        label: `Krok 6 · Opatrunek  (${creamPct}%)`,
        hint: equipped === 'cream' ? 'Posmaruj zszytą ranę maścią z antybiotykiem — przetrzyj wzdłuż całej linii szwów. Puść przy 100%.' : needsTool('maść'),
      };
    default:
      return { label: 'Krok 7 · Plasterek', hint: 'Maść się wchłonęła — wybierz plasterek z tacki i zaklej ranę.' };
  }
}

function buildBreakdown(result) {
  if (!result) return { rows: [], wrong: false, note: '' };
  if (result.wrong) {
    return {
      rows: [{ key: 'exc', name: 'Wycięcie (nieudane)', pct: result.excise || 0, weight: 100, pts: (result.excise || 0).toFixed(1), tone: '#ff6b6b' }],
      wrong: true,
      note: result.oversized
        ? 'Wycięto zdecydowanie za duży obszar zdrowej skóry — zabieg uznano za nieudany, więc liczy się tylko ocena wycięcia; pozostałe etapy przepadają.'
        : 'Czerniak nie został usunięty w całości — zabieg uznano za nieudany, więc liczy się tylko ocena wycięcia; pozostałe etapy przepadają.',
    };
  }
  const fmt = (n) => n.toFixed(1);
  return {
    rows: [
      { key: 'dis', name: 'Odkażanie', pct: result.disinfect || 0, weight: 15, pts: fmt((result.disinfect || 0) * 0.15), tone: '#63c7e6' },
      { key: 'inj', name: 'Znieczulenie', pct: result.inject || 0, weight: 15, pts: fmt((result.inject || 0) * 0.15), tone: '#f0a94d' },
      { key: 'exc', name: 'Wycięcie', pct: result.excise || 0, weight: 45, pts: fmt((result.excise || 0) * 0.45), tone: '#a78bfa' },
      { key: 'sut', name: 'Zszycie', pct: result.suture || 0, weight: 25, pts: fmt((result.suture || 0) * 0.25), tone: '#57e0c0' },
    ],
    wrong: false,
    note: '',
  };
}

/**
 * Excision-biopsy minigame: disinfect the field, anesthetize around a melanoma, excise it as
 * an ellipse along the limb axis with a 1-3mm margin, close the wound in layers (deep +
 * skin sutures), dress it, and see a weighted score across all 4 stages.
 */
export function Excisio() {
  const { ui, refs, DEEP_NEED, SKIN_NEED, plasterCards, toolStatus, handlers } = useExcisio();
  const phase = phaseHint(ui.phase, ui.equipped, ui.deepCount, ui.skinCount, ui.disinfectPct, ui.creamPct, ui.injCount, DEEP_NEED, SKIN_NEED);
  const meta = PHASE_META[ui.phase] || PHASE_META.disinfect;
  const isPlay = ui.screen === 'play';
  const stageGroup = ui.phase === 'suture_deep' || ui.phase === 'suture_skin' || ui.phase === 'cream' ? 'close' : ui.phase === 'plaster' ? 'none' : 'prep';
  const showTrayPrep = isPlay && !ui.showResult && !ui.showTray && stageGroup === 'prep';
  const showTrayClose = isPlay && !ui.showResult && !ui.showTray && stageGroup === 'close';
  const clearLabel = ui.phase === 'cut' ? 'Wyczyść linię' : ui.phase === 'suture_deep' || ui.phase === 'suture_skin' ? 'Cofnij szew' : ui.phase === 'cream' ? 'Zetrzyj maść' : 'Wyczyść';
  const breakdown = buildBreakdown(ui.result);
  const sutureThumb = ui.result ? (!ui.result.suture ? '👎' : ui.result.suture >= 85 ? '👍' : '') : '';

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.headerTitle}>EXCISIO</span>
          <span className={styles.headerSubtitle}>symulator biopsji wycinającej</span>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Poziom</div>
            <div className={styles.statValue}>{ui.level} · {ui.partName}</div>
          </div>
          <div className={styles.divider} />
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Zarobek</div>
            <div className={styles.statValueAccent}>{formatZloty(ui.cash)}</div>
          </div>
          <button type="button" className={styles.tutorialButton} onClick={handlers.openTutorial}>
            <PoradnikIcon />
            Poradnik
          </button>
        </div>
      </div>

      <div className={styles.stageArea}>
        <div
          ref={refs.viewRef}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerLeave={handlers.onPointerUp}
          className={ui.alarm ? styles.stageShaking : styles.stage}
        >
          <div className={styles.stageGrid}>
            <canvas ref={refs.canvasRef} className={styles.canvasLayer} />

            {ui.redFlash && (
              <div className={styles.redFlashLayer}>
                <div className={styles.redFlashEmoji}>👎</div>
                <div className={styles.redFlashBanner}>Zły szew!</div>
              </div>
            )}

            <div className={styles.hudTopLeft}>
              <div className={styles.phaseBadge} style={{ '--phase-border': meta.border }}>
                <span className={styles.phaseDot} style={{ '--phase-dot': meta.dot }} />
                <span className={styles.phaseLabel}>{phase.label}</span>
              </div>
              <div className={styles.marginNote}>
                Cel: elipsa wzdłuż długiej osi · margines <b>1–3 mm</b>
              </div>
            </div>

            <div className={styles.warnLayer} style={{ opacity: ui.warn ? 1 : 0 }}>
              <div className={styles.warnBanner}>{ui.warn || ' '}</div>
            </div>

            <div className={styles.hintLayer} style={{ opacity: isPlay && !ui.showResult && !ui.revealing ? 1 : 0 }}>
              {/* eslint-disable-next-line react/no-danger */}
              <div className={styles.hintBanner} dangerouslySetInnerHTML={{ __html: phase.hint }} />
            </div>

            {ui.revealing && (
              <div className={styles.revealLayer}>
                <div className={styles.revealPill}>
                  <span className={styles.revealSpinner} />
                  <span className={styles.revealText}>Porównuję z idealnym obrysem…</span>
                </div>
              </div>
            )}

            {showTrayPrep && (
              <ToolTray tools={PREP_TOOLS} onPointerDown={handlers.stopPropagation} toolStatus={toolStatus} handlers={handlers} />
            )}
            {showTrayClose && (
              <ToolTray tools={CLOSE_TOOLS} onPointerDown={handlers.stopPropagation} toolStatus={toolStatus} handlers={handlers} />
            )}

            {ui.showTray && (
              <div className={styles.plasterTrayLayer} onPointerDown={handlers.stopPropagation}>
                <div className={styles.plasterTray}>
                  <div className={styles.plasterTrayHeader}>
                    <div className={styles.plasterTrayHeaderMain}>
                      <div className={styles.plasterIconBox}>
                        <PlasterTrayIcon />
                      </div>
                      <div>
                        <div className={styles.trayEyebrow}>Tacka z plasterkami</div>
                        <div className={styles.trayTitle}>
                          {ui.showCustomDraw ? 'Narysuj własny plasterek' : 'Wybierz plasterek na ranę'}
                        </div>
                      </div>
                    </div>
                    {ui.showCustomDraw ? (
                      <button type="button" className={styles.customDrawBackButton} onClick={handlers.cancelCustomDraw}>
                        ← Wróć do tacki
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.customDrawButton}
                        onClick={handlers.openCustomDraw}
                        title="Narysuj własny plasterek"
                        aria-label="Narysuj własny plasterek"
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </div>

                  {ui.showCustomDraw ? (
                    <div className={styles.customDrawPanel}>
                      <div className={styles.customDrawCanvasStack}>
                        <canvas ref={refs.drawBgCanvasRef} width={448} height={200} className={styles.customDrawCanvas} />
                        <canvas
                          ref={refs.drawCanvasRef}
                          width={448}
                          height={200}
                          className={styles.customDrawCanvas}
                          onPointerDown={handlers.onDrawPointerDown}
                          onPointerMove={handlers.onDrawPointerMove}
                          onPointerUp={handlers.onDrawPointerUp}
                          onPointerLeave={handlers.onDrawPointerUp}
                        />
                      </div>
                      <div className={styles.customDrawPaletteRow}>
                        <span className={styles.customDrawPaletteLabel}>Kolor plasterka</span>
                        <div className={styles.customDrawPalette}>
                          {DRAW_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={ui.plasterColor === color ? styles.drawSwatchActive : styles.drawSwatch}
                              style={{ '--swatch': color }}
                              onClick={() => handlers.setPlasterColor(color)}
                              aria-label={`Kolor plasterka ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={styles.customDrawPaletteRow}>
                        <span className={styles.customDrawPaletteLabel}>Kolor pisaka</span>
                        <div className={styles.customDrawPalette}>
                          {DRAW_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={ui.drawColor === color ? styles.drawSwatchActive : styles.drawSwatch}
                              style={{ '--swatch': color }}
                              onClick={() => handlers.setDrawColor(color)}
                              aria-label={`Kolor pisaka ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={styles.customDrawPaletteRow}>
                        <span className={styles.customDrawPaletteLabel}>Grubość pisaka</span>
                        <div className={styles.customDrawPalette}>
                          {DRAW_THICKNESSES.map((width) => (
                            <button
                              key={width}
                              type="button"
                              className={ui.drawThickness === width ? styles.drawThicknessButtonActive : styles.drawThicknessButton}
                              onClick={() => handlers.setDrawThickness(width)}
                              aria-label={`Grubość pisaka ${width}px`}
                            >
                              <span
                                className={styles.drawThicknessDot}
                                style={{ width, height: width, '--dot-color': ui.drawColor }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.customDrawActions}>
                        <button type="button" className={styles.retryButton} onClick={handlers.clearDrawing}>
                          Wyczyść
                        </button>
                        <button type="button" className={styles.nextButton} onClick={handlers.finishCustomDraw}>
                          Gotowe — przyklej
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.plasterBody}>
                      <div className={styles.plasterScroll} ref={refs.plasterScrollRef}>
                        <div className={styles.plasterGrid}>
                          {plasterCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              title={card.name}
                              className={styles.plasterCardButton}
                              onClick={() => handlers.pickPlaster(card.id)}
                            >
                              {/* eslint-disable-next-line react/no-danger */}
                              <span className={styles.plasterCardImage} dangerouslySetInnerHTML={{ __html: card.svgMarkup }} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.plasterScrollNav}>
                        <button
                          type="button"
                          className={styles.plasterNavButton}
                          onClick={handlers.scrollPlastersUp}
                          aria-label="Przewiń w górę"
                        >
                          ▲
                        </button>
                        <div className={styles.plasterNavTrack} />
                        <button
                          type="button"
                          className={styles.plasterNavButton}
                          onClick={handlers.scrollPlastersDown}
                          aria-label="Przewiń w dół"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.zoomControls}>
          <button type="button" className={styles.zoomButton} onClick={handlers.zoomOut} aria-label="Oddal">−</button>
          <div className={styles.zoomPct}>{Math.round(ui.zoom * 100)}%</div>
          <button type="button" className={styles.zoomButton} onClick={handlers.zoomIn} aria-label="Przybliż">+</button>
          <div className={styles.divider} />
          <button type="button" className={styles.clearButton} onClick={handlers.clearLine}>
            <ClearIcon />
            {clearLabel}
          </button>
        </div>
      </div>

      {ui.alarm && (
        // overlay-portal: melanoma-left-behind alarm must flash the entire screen, not just the operating stage
        <OverlayPortal onDismiss={undefined} dismissOnBackdropClick={false} overlayClassName={styles.alarmOverlay}>
          <div className={styles.alarmContent}>
            <SkullIcon />
            <div className={styles.alarmBanner}>{ui.alarmText}</div>
          </div>
        </OverlayPortal>
      )}

      {ui.screen === 'tutorial' && (
        // overlay-portal: tutorial instructions must render above the whole operating field
        <OverlayPortal onDismiss={undefined} dismissOnBackdropClick={false}>
          <div className={styles.tutorialPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.tutorialHeader}>
              <div className={styles.tutorialIconBox}>
                <ScissorsIcon />
              </div>
              <div>
                <div className={styles.trayEyebrow}>Poradnik</div>
                <h2 className={styles.tutorialTitle}>Technika biopsji wycinającej</h2>
              </div>
            </div>
            <div className={styles.tutorialBody}>
              <div className={styles.tutorialDiagram}>
                <TutorialDiagram />
              </div>
              <div className={styles.tutorialSteps}>
                {TUTORIAL_STEPS.map((step, index) => (
                  <div key={step.text} className={styles.tutorialStepRow}>
                    <span className={styles.tutorialStepNumber} style={{ background: step.color, color: step.textColor }}>
                      {index + 1}
                    </span>
                    {/* eslint-disable-next-line react/no-danger */}
                    <span className={styles.tutorialStepText} dangerouslySetInnerHTML={{ __html: step.text }} />
                  </div>
                ))}
              </div>
            </div>
            <button type="button" className={styles.startButton} onClick={handlers.startGame}>
              Rozumiem — zaczynamy zabieg
            </button>
          </div>
        </OverlayPortal>
      )}

      {ui.showResult && ui.result && (
        // overlay-portal: the result bottom-sheet must render above the whole operating field
        <OverlayPortal onDismiss={undefined} dismissOnBackdropClick={false}>
          <div className={styles.resultPanel} onClick={(event) => event.stopPropagation()} style={{ '--tone': ui.result.tone }}>
            <div className={styles.resultHeader}>
              <div>
                <div className={styles.resultEyebrowRow}>
                  <span className={styles.resultDot} /> Wynik zabiegu
                </div>
                <div className={styles.resultTitle}>{ui.result.title}</div>
                <div className={styles.resultMsg}>{ui.result.msg}</div>
              </div>
              <div className={styles.resultScoreBlock}>
                <div className={styles.resultScoreValue}>
                  {ui.result.score}
                  <span className={styles.resultScorePercent}>%</span>
                </div>
                <div className={styles.resultMoney}>+{ui.result.money}</div>
              </div>
            </div>

            <div className={styles.breakdownHeading}>Wynik łączny z 4 etapów</div>
            <div className={styles.breakdownGrid}>
              <BreakdownColumn label="1 · Odkażanie" pct={ui.result.disinfect || 0} color="#63c7e6" />
              <BreakdownColumn label="2 · Znieczulenie" pct={ui.result.inject || 0} color="#f0a94d" />
              <BreakdownColumn label="3 · Wycięcie" pct={ui.result.excise || 0} color="#a78bfa" />
              <BreakdownColumn label={`4 · Zszycie ${sutureThumb}`} pct={ui.result.suture || 0} color="#57e0c0" />
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryHeading}>Jak liczymy wynik — sumowanie</div>
              <div className={styles.summaryList}>
                {breakdown.rows.map((row) => (
                  <div key={row.key} className={styles.summaryRow}>
                    <span className={styles.summaryDot} style={{ background: row.tone }} />
                    <span className={styles.summaryName}>{row.name}</span>
                    <span className={styles.summaryPct}>{row.pct}%</span>
                    <span className={styles.summaryOp}>×</span>
                    <span className={styles.summaryWeight}>{row.weight}%</span>
                    <span className={styles.summaryOp}>=</span>
                    <span className={styles.summaryPts}>{row.pts}</span>
                  </div>
                ))}
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryTotalLabel}>Razem</span>
                <span className={styles.summaryTotalValue} style={{ '--tone': ui.result.tone }}>{ui.result.score}%</span>
              </div>
              {breakdown.wrong && <div className={styles.summaryWrongNote}>{breakdown.note}</div>}
            </div>

            <div className={styles.resultActions}>
              <button type="button" className={styles.retryButton} onClick={handlers.retry}>Powtórz poziom</button>
              <button type="button" className={styles.nextButton} onClick={handlers.nextLevel}>Następny poziom →</button>
            </div>
          </div>
        </OverlayPortal>
      )}

      {ui.cheer && (
        // overlay-portal: the >=90% celebration must cover the whole screen. It mounts fresh
        // together with (and after, in source order) the result popup above, so both portals
        // land in #overlay-root in the same commit and this one stacks on top per DOM order -
        // an always-mounted portal would keep an earlier DOM position and stay hidden behind it.
        <OverlayPortal onDismiss={undefined} dismissOnBackdropClick={false} overlayClassName={styles.cheerOverlay}>
          <div className={styles.cheerStack}>
            <canvas ref={refs.confettiRef} className={styles.confettiCanvas} />
            <div className={styles.cheerEmoji}>🤩</div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}

function ToolTray({ tools, onPointerDown, toolStatus, handlers }) {
  return (
    <div className={styles.toolTray} onPointerDown={onPointerDown}>
      <div className={styles.toolTrayLabel}>Tacka</div>
      {tools.map((tool) => {
        const status = toolStatus(tool.id);
        const buttonClass =
          status === 'active' ? styles.toolButtonActive : status === 'held' ? styles.toolButtonHeld : status === 'done' ? styles.toolButtonDone : styles.toolButton;
        const badgeClass =
          status === 'active' ? styles.toolBadgeActive : status === 'held' ? styles.toolBadgeHeld : status === 'done' ? styles.toolBadgeDone : styles.toolBadge;
        const Icon = tool.icon;
        return (
          <button key={tool.id} type="button" className={buttonClass} onClick={handlers[tool.handler]}>
            <Icon className={styles.toolIcon} />
            <div className={styles.toolName}>{tool.name}</div>
            <div className={badgeClass}>{TOOL_BADGE_LABEL[status]}</div>
          </button>
        );
      })}
    </div>
  );
}

function BreakdownColumn({ label, pct, color }) {
  return (
    <div>
      <div className={styles.breakdownRowHeader}>
        <span>{label}</span>
        <span className={styles.breakdownValue}>{pct}%</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

ToolTray.propTypes = {
  tools: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      handler: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
    })
  ).isRequired,
  onPointerDown: PropTypes.func.isRequired,
  toolStatus: PropTypes.func.isRequired,
  handlers: PropTypes.objectOf(PropTypes.func).isRequired,
};

BreakdownColumn.propTypes = {
  label: PropTypes.string.isRequired,
  pct: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

function WipeIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h8" opacity=".45" />
    </svg>
  );
}
function SyringeIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3l4 4" />
      <path d="M19 5l-9 9" />
      <path d="M13.5 7.5l3 3" />
      <path d="M10 14l-6 6" />
      <path d="M4 20l-1.6 1.6" />
      <path d="M6.4 16.4l1.6 1.6" />
    </svg>
  );
}
function ScissorsIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
    </svg>
  );
}
function NeedleIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21q6-1 10-5" />
      <path d="M13 16a6 6 0 1 1 7-7" />
    </svg>
  );
}
function CreamIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="9" width="12" height="12" rx="2" />
      <path d="M9 9V6h6v3M12 6V3.5" />
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function PoradnikIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.1 8.1 20 20M8.1 15.9 20 4M14.5 12.5 20 20M14.5 11.5 20 4" />
    </svg>
  );
}
function PlasterTrayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="10" rx="4" transform="rotate(-30 12 12)" />
      <circle cx="12" cy="12" r="1.4" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}
function SkullIcon() {
  return (
    <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#ffdede" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C7 2 4 5.5 4 10c0 2.4 1.1 4 2.5 5V19a1 1 0 0 0 1 1H9v-2.2h1.2V20h3.6v-2.2H15V20h1.5a1 1 0 0 0 1-1v-4c1.4-1 2.5-2.6 2.5-5 0-4.5-3-8-8-8Z" />
      <circle cx="9" cy="10.5" r="1.7" fill="#ffdede" stroke="none" />
      <circle cx="15" cy="10.5" r="1.7" fill="#ffdede" stroke="none" />
      <path d="M12 13.4l-.9 1.7h1.8Z" fill="#ffdede" stroke="none" />
    </svg>
  );
}
function TutorialDiagram() {
  return (
    <svg width="158" height="182" viewBox="0 0 168 192">
      <defs>
        <radialGradient id="exLes2" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#2a2a2f" />
          <stop offset="100%" stopColor="#0c0c0e" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="168" height="192" rx="14" fill="#dfe7ef" />
      <path d="M40 6 Q34 60 40 96 Q34 140 40 186" fill="none" stroke="#8895a6" strokeWidth="1.6" />
      <path d="M128 6 Q134 60 128 96 Q134 140 128 186" fill="none" stroke="#8895a6" strokeWidth="1.6" />
      <ellipse cx="84" cy="96" rx="34" ry="74" fill="#aec4de" />
      <path
        d="M84 70 C95 68 99 80 95 90 C101 100 90 112 80 108 C70 112 66 98 72 88 C68 78 76 70 84 70 Z"
        fill="url(#exLes2)"
      />
      <line x1="84" y1="14" x2="84" y2="178" stroke="#111" strokeWidth="2.2" />
      <path d="M84 14 l-4 7 h8 z M84 178 l-4 -7 h8 z" fill="#111" />
      <line x1="50" y1="96" x2="118" y2="96" stroke="#111" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="50" cy="96" r="2.4" fill="#111" />
      <circle cx="118" cy="96" r="2.4" fill="#111" />
      <circle cx="84" cy="178" r="5" fill="#111" />
      <rect x="84" y="176" width="26" height="5" rx="2" fill="#111" />
    </svg>
  );
}
