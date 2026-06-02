import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, Zap, Volume2, VolumeX, Share2, Swords, Target, Home, RotateCcw } from 'lucide-react';
import './styles.css';
import {
  WORD_PACKS,
  DEFAULT_CUSTOM_WORDS,
  battleCodeFor,
  cleanWords,
  decodeChallenge,
  encodeChallenge,
  extractBattleToken,
  getPackById,
  resolveChallenge,
} from './gameData.js';

const APP_VERSION = '1.0.0';

function fmt(ms) {
  return Number.isFinite(Number(ms)) ? `${(Number(ms) / 1000).toFixed(3)}s` : '—';
}

function compactName(name) {
  return String(name || 'Mystery Typer').trim().slice(0, 22) || 'Mystery Typer';
}

function makeBattleId() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 18);
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function wordRecordFallback(word) {
  return { word, playerName: 'No record yet', ms: Infinity, packName: '', createdAt: '' };
}

function buildWordRecordsFromSeeds() {
  return [];
}

function App() {
  const [playerName, setPlayerName] = React.useState(localStorage.getItem('tbb:name') || 'Thomas');
  const [soundOn, setSoundOn] = React.useState(true);
  const [packId, setPackId] = React.useState(WORD_PACKS[0].id);
  const [customMode, setCustomMode] = React.useState(false);
  const [customText, setCustomText] = React.useState(DEFAULT_CUSTOM_WORDS.join('\n'));
  const [currentBattleId, setCurrentBattleId] = React.useState(makeBattleId());
  const [challengeInput, setChallengeInput] = React.useState('');
  const [pendingWords, setPendingWords] = React.useState(null);
  const [pendingCustom, setPendingCustom] = React.useState(false);
  const [phase, setPhase] = React.useState('menu');
  const [mode, setMode] = React.useState('battle');
  const [countdown, setCountdown] = React.useState(3);
  const [wordIndex, setWordIndex] = React.useState(0);
  const [typed, setTyped] = React.useState('');
  const [times, setTimes] = React.useState([]);
  const [practiceWord, setPracticeWord] = React.useState('blade');
  const [practiceBest, setPracticeBest] = React.useState(() => JSON.parse(localStorage.getItem('tbb:practiceBest') || '{}'));
  const [leaderboard, setLeaderboard] = React.useState({ globalTop: [], newestWordRecords: [], wordRecords: [], runCount: 0, blobConfigured: false });
  const [battleRuns, setBattleRuns] = React.useState([]);
  const [targetRival, setTargetRival] = React.useState(null);
  const [apiStatus, setApiStatus] = React.useState('checking');
  const [toast, setToast] = React.useState(null);
  const [liveMs, setLiveMs] = React.useState(0);
  const [shake, setShake] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const inputRef = React.useRef(null);
  const startRef = React.useRef(null);
  const audioRef = React.useRef(null);
  const busyRef = React.useRef(false);

  const currentPack = getPackById(packId) || WORD_PACKS[0];
  const selectedWords = customMode ? cleanWords(customText) : currentPack.words;
  const battleWords = pendingWords || selectedWords;
  const runWords = mode === 'practice' ? Array.from({ length: 5 }, () => practiceWord) : battleWords;
  const currentWord = runWords[wordIndex] || '';
  const battleCode = battleCodeFor(battleWords);
  const isCustomRun = pendingWords ? pendingCustom : customMode;
  const totalMs = times.reduce((sum, item) => sum + item.ms, 0);
  const progress = currentWord ? Math.round((typed.length / currentWord.length) * 100) : 0;
  const bestPracticeTry = times.length ? Math.min(...times.map((item) => item.ms)) : practiceBest[practiceWord];
  const currentRecord = (leaderboard.wordRecords || []).find((record) => record.word === practiceWord) || wordRecordFallback(practiceWord);
  const challengePayload = React.useMemo(() => ({
    type: isCustomRun ? 'custom' : 'pack',
    packId: isCustomRun ? null : currentPack.id,
    words: battleWords,
    battleId: currentBattleId,
    custom: isCustomRun,
    host: compactName(playerName),
  }), [battleWords, currentBattleId, currentPack.id, isCustomRun, playerName]);
  const shareUrl = `${window.location.origin}${window.location.pathname}?battle=${encodeChallenge(challengePayload)}`;

  React.useEffect(() => {
    localStorage.setItem('tbb:name', playerName);
  }, [playerName]);

  React.useEffect(() => {
    localStorage.setItem('tbb:practiceBest', JSON.stringify(practiceBest));
  }, [practiceBest]);

  React.useEffect(() => {
    loadLeaderboard();
    const token = new URLSearchParams(window.location.search).get('battle');
    if (token) loadChallenge(token, true);
  }, []);

  React.useEffect(() => {
    if (phase !== 'menu') return;
    setCurrentBattleId(makeBattleId());
    setPendingWords(null);
    setPendingCustom(false);
    setTargetRival(null);
  }, [packId, customMode, customText]);

  React.useEffect(() => {
    if (phase !== 'countdown') return undefined;
    setCountdown(3);
    let value = 3;
    const timer = setInterval(() => {
      value -= 1;
      if (value <= 0) {
        clearInterval(timer);
        setPhase('running');
        beep('start');
        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      } else {
        setCountdown(value);
        beep('tick');
      }
    }, 650);
    return () => clearInterval(timer);
  }, [phase]);

  React.useEffect(() => {
    let frame;
    const loop = () => {
      setLiveMs(phase === 'running' && startRef.current ? performance.now() - startRef.current : 0);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  React.useEffect(() => {
    if (phase === 'running') inputRef.current?.focus({ preventScroll: true });
  }, [phase, wordIndex]);

  async function loadLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard', { cache: 'no-store' });
      const json = await response.json();
      if (json.ok) {
        setLeaderboard(json);
        setApiStatus(json.blobConfigured ? 'online' : 'preview');
      } else {
        setLeaderboard((current) => ({ ...current, ...json }));
        setApiStatus('preview');
      }
    } catch {
      setApiStatus('preview');
    }
  }

  async function loadBattleRuns(battleId = currentBattleId) {
    if (!battleId) return;
    try {
      const response = await fetch(`/api/battle?battleId=${encodeURIComponent(battleId)}`, { cache: 'no-store' });
      const json = await response.json();
      if (json.ok) setBattleRuns(json.runs || []);
    } catch {
      // local preview only
    }
  }

  function getAudioContext() {
    if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioRef.current;
  }

  function tone(freq, duration = 0.06, type = 'sine', gainValue = 0.035, slideTo = null) {
    if (!soundOn) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.04);
    } catch {
      // ignore audio lock
    }
  }

  function beep(kind) {
    if (kind === 'key') tone(520, 0.035, 'square', 0.018, 760);
    if (kind === 'bad') {
      tone(140, 0.08, 'sawtooth', 0.045, 80);
      setShake(true);
      setTimeout(() => setShake(false), 170);
    }
    if (kind === 'word') {
      tone(660, 0.06, 'triangle', 0.04, 990);
      setTimeout(() => tone(990, 0.08, 'triangle', 0.035, 1320), 55);
    }
    if (kind === 'finish') [440, 660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.13, 'triangle', 0.045, f * 1.2), i * 90));
    if (kind === 'record') [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.055, f * 1.18), i * 75));
    if (kind === 'tick') tone(300, 0.07, 'square', 0.03, 520);
    if (kind === 'start') tone(220, 0.15, 'sawtooth', 0.035, 880);
  }

  function showToast(message) {
    setToast({ message, id: Date.now() });
    setTimeout(() => setToast(null), 1500);
  }

  function goHome() {
    setPhase('menu');
    setMode('battle');
    setWordIndex(0);
    setTyped('');
    setTimes([]);
    setPendingWords(null);
    setPendingCustom(false);
    setTargetRival(null);
    setSubmitted(false);
    startRef.current = null;
    busyRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startBattle(words = selectedWords, custom = customMode, battleId = currentBattleId, rival = null) {
    const clean = cleanWords(words);
    if (clean.length !== 10) {
      showToast('Du trenger akkurat 10 gyldige ord.');
      return;
    }
    setPendingWords(clean);
    setPendingCustom(custom);
    setCurrentBattleId(battleId || makeBattleId());
    setTargetRival(rival);
    setMode('battle');
    setPhase('countdown');
    setWordIndex(0);
    setTyped('');
    setTimes([]);
    setSubmitted(false);
    setBattleRuns([]);
    startRef.current = null;
    busyRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (battleId) setTimeout(() => loadBattleRuns(battleId), 100);
  }

  function startPractice(word) {
    const clean = cleanWords([word])[0];
    if (!clean) return;
    setPracticeWord(clean);
    setMode('practice');
    setPhase('countdown');
    setWordIndex(0);
    setTyped('');
    setTimes([]);
    setSubmitted(false);
    setTargetRival(null);
    startRef.current = null;
    busyRef.current = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadChallenge(rawValue, autoStart = false) {
    const payload = resolveChallenge(rawValue, battleWords, isCustomRun, currentPack.id);
    if (!payload?.words?.length) {
      showToast('Ugyldig battle-lenke eller kode.');
      return;
    }
    const words = cleanWords(payload.words);
    const custom = Boolean(payload.custom || payload.type === 'custom');
    const nextBattleId = String(payload.battleId || makeBattleId()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const pack = payload.packId ? getPackById(payload.packId) : null;
    if (pack && !custom) {
      setPackId(pack.id);
      setCustomMode(false);
    } else {
      setCustomMode(true);
      setCustomText(words.join('\n'));
    }
    setPendingWords(words);
    setPendingCustom(custom || !pack);
    setCurrentBattleId(nextBattleId);
    setChallengeInput('');
    showToast(`Lastet ${words.length} ord`);
    if (autoStart) setTimeout(() => startBattle(words, custom || !pack, nextBattleId, null), 80);
    else setTimeout(() => loadBattleRuns(nextBattleId), 80);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Battle-lenke kopiert');
    } catch {
      showToast('Kopier lenken manuelt');
    }
  }

  function finishWord(ms) {
    if (busyRef.current) return;
    busyRef.current = true;
    const cleanMs = Math.max(45, Math.round(ms));
    const result = { word: currentWord, ms: cleanMs };
    const nextTimes = [...times, result];
    setTimes(nextTimes);
    setToast({ message: `${currentWord} · ${fmt(cleanMs)}`, id: Date.now(), wordPop: true });
    setTimeout(() => setToast(null), 850);
    beep('word');
    startRef.current = null;

    if (wordIndex >= runWords.length - 1) {
      setTimeout(() => {
        setPhase('done');
        busyRef.current = false;
        if (mode === 'practice') {
          const best = Math.min(...nextTimes.map((item) => item.ms));
          setPracticeBest((current) => ({ ...current, [currentWord]: Math.min(current[currentWord] || Infinity, best) }));
          beep(best < currentRecord.ms ? 'record' : 'finish');
        } else {
          beep('finish');
        }
      }, 250);
      return;
    }

    setTimeout(() => {
      setWordIndex((current) => current + 1);
      setTyped('');
      busyRef.current = false;
      inputRef.current?.focus({ preventScroll: true });
    }, 170);
  }

  function onType(event) {
    const next = event.target.value.toLowerCase();
    if (phase !== 'running' || busyRef.current) return;
    if (next.length < typed.length) {
      setTyped(next);
      return;
    }
    if (!currentWord.startsWith(next)) {
      beep('bad');
      return;
    }
    if (!startRef.current && next.length > 0) startRef.current = performance.now();
    if (next.length > typed.length) beep('key');
    setTyped(next);
    if (next === currentWord) finishWord(performance.now() - startRef.current);
  }

  async function submitBattleRun() {
    if (submitted || mode !== 'battle' || times.length !== 10) return;
    setSubmitted(true);
    const body = {
      playerName: compactName(playerName),
      packId: isCustomRun ? null : currentPack.id,
      custom: isCustomRun,
      battleId: currentBattleId,
      words: runWords,
      wordTimes: times,
      userAgent: navigator.userAgent,
      appVersion: APP_VERSION,
    };

    try {
      const response = await fetch('/api/submit-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || 'Kunne ikke lagre score');
      showToast(json.stored ? 'Score lagret online' : 'Score ferdig lokalt');
      await Promise.all([loadLeaderboard(), loadBattleRuns(currentBattleId)]);
    } catch (error) {
      setSubmitted(false);
      showToast(error.message || 'Kunne ikke lagre online');
    }
  }

  async function submitPracticeRecord() {
    if (submitted || mode !== 'practice' || times.length === 0) return;
    setSubmitted(true);
    const bestTime = Math.min(...times.map((t) => t.ms));
    const body = {
      mode: 'practice',
      playerName: compactName(playerName),
      words: [practiceWord],
      wordTimes: [{ word: practiceWord, ms: bestTime }],
      userAgent: navigator.userAgent,
      appVersion: APP_VERSION,
    };

    try {
      const response = await fetch('/api/submit-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || 'Kunne ikke lagre score');
      showToast(json.stored ? 'Record lagret online' : 'Record ferdig lokalt');
      await loadLeaderboard();
    } catch (error) {
      setSubmitted(false);
      showToast(error.message || 'Kunne ikke lagre online');
    }
  }

  React.useEffect(() => {
    if (phase === 'done' && mode === 'battle' && times.length === 10 && !submitted) submitBattleRun();
    if (phase === 'done' && mode === 'practice' && times.length > 0 && !submitted) submitPracticeRecord();
  }, [phase, mode, times.length, submitted]);

  const visibleBattleRows = React.useMemo(() => {
    const serverRows = battleRuns.map((run) => ({ ...run, source: 'server' }));
    const yourFinishedRun = phase === 'done' && mode === 'battle' && times.length === 10 ? [{
      id: 'local-you',
      playerName: compactName(playerName),
      totalMs,
      packName: isCustomRun ? 'Custom Battle' : currentPack.name,
      words: runWords,
      wordTimes: times,
      source: 'local',
    }] : [];
    return [...yourFinishedRun, ...serverRows]
      .sort((a, b) => Number(a.totalMs) - Number(b.totalMs))
      .slice(0, 12);
  }, [battleRuns, currentPack.name, isCustomRun, mode, phase, playerName, runWords, times, totalMs]);

  const newestTicker = leaderboard.newestWordRecords || [];
  const rivalForResults = targetRival || visibleBattleRows.find((row) => row.playerName !== compactName(playerName));

  return (
    <div className="app-shell">
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />

      <header className="topbar" onClick={goHome}>
        <div className="header-inner">
          <div>
            <div className="eyebrow">Trykk på toppen for hjem</div>
            <h1>Type Battle Blitz</h1>
          </div>
          <button className="ghost-button" onClick={(event) => { event.stopPropagation(); setSoundOn((current) => !current); }}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} {soundOn ? 'SFX On' : 'SFX Off'}
          </button>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-row">
            {newestTicker.length > 0 ? (
              [...newestTicker, ...newestTicker].map((record, index) => (
                <button key={`${record.word}-${record.createdAt}-${index}`} className="ticker-pill" onClick={(event) => { event.stopPropagation(); startPractice(record.word); }}>
                  ⚡ {record.word.toUpperCase()} record: {record.playerName} · {record.ms}ms · TRY IT
                </button>
              ))
            ) : (
              <div className="ticker-pill" style={{ pointerEvents: 'none' }}>⚡ Be the first to set word records! Pick a word and start practicing.</div>
            )}
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel main-panel">
          {toast && <div key={toast.id} className={toast.wordPop ? 'word-pop toast' : 'toast'}>{toast.message}</div>}

          {phase !== 'menu' && (
            <div className="play-header">
              <button className="secondary-button" onClick={goHome}><Home size={18} /> Tilbake</button>
              <div className="battle-chip">{mode === 'practice' ? `Practice · ${practiceWord}` : `${targetRival ? `vs ${targetRival.playerName} · ` : ''}${battleCode}`}</div>
            </div>
          )}

          {phase === 'menu' && (
            <div className="menu-grid">
              <div className="hero-card">
                <div className="eyebrow">The hook</div>
                <h2>Fastest fingers on one word.</h2>
                <p>Timeren starter kun når første riktige bokstav skrives, og stopper på siste riktige bokstav. Ti ord = ti små dueller + én total battle score.</p>
              </div>

              <div className="two-col">
                <label className="field">
                  <span>Player name</span>
                  <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
                </label>
                <div className="field">
                  <span>Share battle</span>
                  <button className="share-button" onClick={copyShareLink}><Share2 size={18} /> Kopier battle-lenke · {battleCode}</button>
                </div>
              </div>

              <div className="join-card">
                <div className="join-head">
                  <h3>Join shared battle</h3>
                  <span>{apiStatus === 'online' ? 'Online Blob' : 'Preview/local'}</span>
                </div>
                <div className="join-row">
                  <input value={challengeInput} onChange={(event) => setChallengeInput(event.target.value)} placeholder="Lim inn full lenke, token, eller TB-kode" />
                  <button className="primary-button small" onClick={() => loadChallenge(challengeInput, true)}>Load + play</button>
                </div>
                <p>Full lenke fungerer for custom ord. TB-koder fungerer for innebygde pakker.</p>
              </div>

              <div className="toggle-row">
                <button className={!customMode ? 'tab active' : 'tab'} onClick={() => setCustomMode(false)}>Word packs</button>
                <button className={customMode ? 'tab active pink' : 'tab'} onClick={() => setCustomMode(true)}>Custom 10 words</button>
              </div>

              {!customMode ? (
                <div className="pack-grid">
                  {WORD_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      className={pack.id === packId ? 'pack-card selected' : 'pack-card'}
                      onClick={() => setPackId(pack.id)}
                      onDoubleClick={() => startBattle(pack.words, false, currentBattleId, null)}
                    >
                      <div className="pack-top"><span>{pack.emoji}</span><b>10 words</b></div>
                      <h3>{pack.name}</h3>
                      <p>{pack.vibe}</p>
                      <div className="word-line">{pack.words.join(' · ')}</div>
                      <small>Double-click starter listen</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="custom-card">
                  <textarea value={customText} onChange={(event) => setCustomText(event.target.value)} />
                  <div className="custom-preview">Preview: <b>{cleanWords(customText).join(' · ')}</b><br /><span>Custom battles lagres kun under battle-lenken, ikke Global Top 10.</span></div>
                </div>
              )}

              <div className="practice-card">
                <div>
                  <h3>Practice mode</h3>
                  <p>Trykk på et ord for 5 forsøk. Beste forsøk teller.</p>
                </div>
                <div className="practice-grid">
                  {selectedWords.map((word) => (
                    <button key={word} onClick={() => startPractice(word)}>
                      <b>{word}</b>
                      <span>Best: {fmt(practiceBest[word])}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sticky-start">
                <button className="mega-button" onClick={() => startBattle(selectedWords, customMode, currentBattleId, null)}>
                  <Zap size={24} /> START SELECTED BATTLE
                </button>
                <span>{customMode ? 'Custom: ingen Global Top 10.' : 'Innebygd pakke: teller på Global Top 10.'}</span>
              </div>
            </div>
          )}

          {phase === 'countdown' && (
            <div className="countdown-screen">
              <div className="count-orb"><span>{countdown}</span></div>
              <h2>Get ready...</h2>
              <p>Timeren starter når første riktige bokstav lander.</p>
            </div>
          )}

          {phase === 'running' && (
            <div className="running-screen">
              <div className="stats-row">
                <div>
                  <div className="eyebrow">{mode === 'practice' ? 'Record Attack' : isCustomRun ? 'Custom Battle' : currentPack.name}</div>
                  <h2>{mode === 'practice' ? `${practiceWord} · ${wordIndex + 1}/5` : `Word ${wordIndex + 1}/10`}</h2>
                </div>
                <div className="stat-boxes">
                  <div><span>{mode === 'practice' ? 'Best try' : 'Total'}</span><b>{mode === 'practice' ? fmt(bestPracticeTry) : fmt(totalMs + liveMs)}</b></div>
                  <div><span>Current</span><b>{startRef.current ? fmt(liveMs) : 'ready'}</b></div>
                  <div><span>{mode === 'practice' ? 'Record gap' : 'Code'}</span><b className={mode === 'practice' && Number.isFinite(bestPracticeTry) ? (bestPracticeTry <= currentRecord.ms ? 'green' : 'red') : ''}>{mode === 'practice' && Number.isFinite(bestPracticeTry) ? (bestPracticeTry <= currentRecord.ms ? `-${fmt(currentRecord.ms - bestPracticeTry)}` : `+${fmt(bestPracticeTry - currentRecord.ms)}`) : battleCode}</b></div>
                </div>
              </div>

              <div className={shake ? 'type-card shake' : 'type-card'}>
                <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                <div className="big-word">
                  {currentWord.split('').map((letter, index) => (
                    <span key={`${letter}-${index}`} className={index < typed.length ? 'done' : index === typed.length ? 'next' : 'rest'}>{letter}</span>
                  ))}
                </div>
                <input ref={inputRef} value={typed} onChange={onType} autoCapitalize="off" autoComplete="off" spellCheck="false" placeholder="type here" />
                <p>Feil bokstaver blokkeres. Backspace er lov. Anti-cheat er ikke aktivert i denne versjonen.</p>
              </div>

              {mode === 'battle' ? (
                <div className="run-word-grid">
                  {runWords.map((word, index) => {
                    const done = times[index];
                    const active = index === wordIndex;
                    return <div key={`${word}-${index}`} className={done ? 'done' : active ? 'active' : ''}><b>{word}</b><span>{done ? fmt(done.ms) : active ? 'LIVE' : '—'}</span></div>;
                  })}
                </div>
              ) : (
                <div className="practice-live">
                  <b>World record: {fmt(currentRecord.ms)} by {currentRecord.playerName}</b>
                  {times.length > 0 && <div>{times.map((item, index) => <span key={`${item.ms}-${index}`} className={item.ms <= currentRecord.ms ? 'fast' : 'slow'}>Try {index + 1}: {fmt(item.ms)}</span>)}</div>}
                </div>
              )}
            </div>
          )}

          {phase === 'done' && mode === 'practice' && (
            <div className="done-screen">
              {Math.min(...times.map((t) => t.ms)) <= currentRecord.ms && <Confetti />}
              <div className={Math.min(...times.map((t) => t.ms)) <= currentRecord.ms ? 'result-card victory' : 'result-card'}>
                <div className="eyebrow">Record attack complete</div>
                <h2>{fmt(Math.min(...times.map((t) => t.ms)))}</h2>
                {Math.min(...times.map((t) => t.ms)) <= currentRecord.ms ? <p className="green">⭐ Du slo rekorden til {currentRecord.playerName}!</p> : <p className="red">Du er {fmt(Math.min(...times.map((t) => t.ms)) - currentRecord.ms)} bak rekorden.</p>}
                <div className="attempts">{times.map((item, index) => <span key={`${item.ms}-${index}`} className={item.ms <= currentRecord.ms ? 'fast' : 'slow'}>Try {index + 1}: {fmt(item.ms)}</span>)}</div>
              </div>
              <div className="button-row">
                <button className="primary-button" onClick={() => startPractice(practiceWord)}><RotateCcw size={18} /> Try again</button>
                <button className="secondary-button" onClick={goHome}>Back</button>
                <button className="secondary-button" onClick={() => startBattle(selectedWords, customMode, currentBattleId, null)}>Full battle</button>
              </div>
            </div>
          )}

          {phase === 'done' && mode === 'battle' && (
            <div className="done-screen">
              <div className="result-card">
                <div className="eyebrow">Battle complete</div>
                <h2>{fmt(totalMs)}</h2>
                <p>{compactName(playerName)} finished 10 words. {submitted ? 'Online save attempted.' : 'Saving...'}</p>
                {isCustomRun && <p className="pink">Custom challenge: ikke Global Top 10.</p>}
              </div>

              <div className="result-list">
                {times.map((item, index) => {
                  const record = (leaderboard.wordRecords || []).find((r) => r.word === item.word) || wordRecordFallback(item.word);
                  const rivalMs = rivalForResults?.wordTimes?.[index]?.ms;
                  const worldWin = item.ms <= record.ms;
                  const youWin = Number.isFinite(rivalMs) && item.ms < rivalMs;
                  const rivalWin = Number.isFinite(rivalMs) && rivalMs < item.ms;
                  return (
                    <div key={`${item.word}-${index}`} className={worldWin ? 'word-result world' : youWin ? 'word-result won' : 'word-result'}>
                      <div className="rank-dot">{worldWin ? '⭐' : index + 1}</div>
                      <div className="word-meta"><b>{item.word}</b><span>Fastest ever: {fmt(record.ms)} by {record.playerName}</span></div>
                      <div className="compare-grid">
                        <div className={worldWin || youWin ? 'mine win' : 'mine'}><span>You</span><b>{fmt(item.ms)}</b></div>
                        <div className={rivalWin ? 'rival win' : 'rival'}><span>{rivalForResults?.playerName || 'Rival'}</span><b>{fmt(rivalMs)}</b></div>
                        <div><span>Record</span><b>{fmt(record.ms)}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="button-row">
                <button className="primary-button" onClick={() => startBattle(runWords, isCustomRun, currentBattleId, targetRival)}><RotateCcw size={18} /> Rematch</button>
                <button className="secondary-button" onClick={goHome}>Change words</button>
                <button className="secondary-button" onClick={copyShareLink}><Share2 size={18} /> Share</button>
              </div>
            </div>
          )}
        </section>

        <aside className="side-stack">
          <section className="panel side-panel">
            <div className="side-head"><h2>Battle Board</h2><span>{battleCode}</span></div>
            <div className="board-list">
              {visibleBattleRows.map((row, index) => (
                <div key={`${row.id || row.playerName}-${index}`} className={targetRival?.id === row.id ? 'board-row target' : 'board-row'}>
                  <div className="board-main">
                    <div className={index === 0 ? 'place first' : 'place'}>#{index + 1}</div>
                    <div><b>{row.playerName}</b><span>{row.source === 'demo' ? 'demo rival' : row.source === 'local' ? 'your run' : 'online player'}</span></div>
                    <strong>{fmt(row.totalMs)}</strong>
                  </div>
                  {row.playerName !== compactName(playerName) && <button onClick={() => startBattle(runWords, isCustomRun, currentBattleId, row)}><Swords size={15} /> Challenge {row.playerName}</button>}
                </div>
              ))}
            </div>
          </section>

          <section className="panel side-panel">
            <div className="side-head"><h2>Global Top 10</h2><Trophy size={20} /></div>
            <p className="mini-note">Kun innebygde pakker teller her. Custom blir aldri global.</p>
            <div className="board-list">
              {(leaderboard.globalTop || []).length > 0 ? (
                (leaderboard.globalTop || []).map((run, index) => (
                  <div key={`${run.id}-${index}`} className="top-row">
                    <div><b>{index + 1}. {run.playerName}</b><span>{run.packName}</span></div>
                    <strong>{fmt(run.totalMs)}</strong>
                    <button onClick={() => {
                      const pack = getPackById(run.packId);
                      if (pack) {
                        setPackId(pack.id);
                        setCustomMode(false);
                        startBattle(pack.words, false, makeBattleId(), null);
                      }
                    }}>Challenge same list</button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', color: '#999' }}>No records yet. Be the first!</div>
              )}
            </div>
          </section>

          <section className="panel side-panel">
            <div className="side-head"><h2>Newest beaten words</h2><Target size={20} /></div>
            <div className="record-list">
              {newestTicker.length > 0 ? (
                newestTicker.slice(0, 8).map((record, index) => (
                  <button key={`${record.word}-${record.createdAt}`} onClick={() => startPractice(record.word)}>
                    <span>{index + 1}. <b>{record.word}</b></span>
                    <strong>{record.playerName} · {fmt(record.ms)}</strong>
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', color: '#999' }}>No word records yet. Set some records!</div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Confetti() {
  return <div className="confetti-layer">{Array.from({ length: 42 }).map((_, i) => <i key={i} style={{ left: `${(i * 17) % 100}%`, animationDelay: `${(i % 9) * 0.08}s`, background: i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#facc15' : '#22d3ee' }} />)}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
