import { useEffect, useState } from 'react'
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  createGame,
  emptyDraft,
  rankedPlayers,
  scoreEntry,
  scoreRound,
  toDraft,
  totalForPlayer,
  validateRound,
  type EntryDraft,
  type Game,
} from './domain'
import {
  translate,
  type LanguagePreference,
  type Translator,
} from './i18n'
import {
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  readLanguagePreference,
  readThemePreference,
  resolveLanguage,
  resolveTheme,
  type ThemePreference,
} from './preferences'

const STORAGE_KEY = 'wizard-scorekeeper-game-v1'
const PLAYER_COLORS = ['blue', 'coral', 'violet', 'green', 'amber', 'rose']

function readStoredGame(): Game | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Game) : null
  } catch {
    return null
  }
}

function Stepper({
  label,
  value,
  max,
  onChange,
  t,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
  t: Translator
}) {
  return (
    <div className="stepper" aria-label={label}>
      <button
        type="button"
        aria-label={t('decrease', { label })}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value || '0', 10)
          onChange(Math.min(max, Math.max(0, Number.isNaN(next) ? 0 : next)))
        }}
      />
      <button
        type="button"
        aria-label={t('increase', { label })}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  )
}

function Settings({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  t,
}: {
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  language: LanguagePreference
  onLanguageChange: (language: LanguagePreference) => void
  t: Translator
}) {
  return (
    <details className="settings-menu">
      <summary aria-label={t('settings')} title={t('settings')}>
        <span aria-hidden="true">⚙</span>
        <span className="settings-label">{t('settings')}</span>
      </summary>
      <div className="settings-panel">
        <label>
          <span>{t('appearance')}</span>
          <select
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemePreference)}
          >
            <option value="auto">{t('auto')}</option>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </label>
        <label>
          <span>{t('language')}</span>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as LanguagePreference)}
          >
            <option value="auto">{t('auto')}</option>
            <option value="en">{t('english')}</option>
            <option value="de">{t('german')}</option>
          </select>
        </label>
      </div>
    </details>
  )
}

function Setup({ onStart, t }: { onStart: (game: Game) => void; t: Translator }) {
  const [names, setNames] = useState(['', '', ''])
  const [error, setError] = useState('')

  const start = () => {
    const trimmed = names.map((name) => name.trim())
    if (trimmed.some((name) => !name)) {
      setError(t('namesRequired'))
      return
    }
    if (new Set(trimmed.map((name) => name.toLocaleLowerCase())).size !== trimmed.length) {
      setError(t('namesUnique'))
      return
    }
    onStart(createGame(trimmed))
  }

  return (
    <main className="setup-layout">
      <section className="setup-intro">
        <p className="eyebrow">{t('setupEyebrow')}</p>
        <h1>{t('setupTitleFirst')}<br />{t('setupTitleSecond')}</h1>
        <p className="intro-copy">{t('setupIntro')}</p>
        <div className="rule-row" aria-label={t('scoringRules')}>
          <span><strong>{t('exact')}</strong> {t('exactRule')}</span>
          <span><strong>{t('missed')}</strong> {t('missedRule')}</span>
        </div>
      </section>

      <section className="setup-card" aria-labelledby="setup-title">
        <div>
          <p className="eyebrow">{t('newGameEyebrow')}</p>
          <h2 id="setup-title">{t('whoPlaying')}</h2>
        </div>

        <div className="player-inputs">
          {names.map((name, index) => (
            <label key={index}>
              <span className={`avatar avatar-${PLAYER_COLORS[index]}`}>{index + 1}</span>
              <span className="sr-only">{t('playerName', { number: index + 1 })}</span>
              <input
                autoFocus={index === 0}
                type="text"
                maxLength={24}
                placeholder={t('playerPlaceholder', { number: index + 1 })}
                value={name}
                onChange={(event) => {
                  setNames(names.map((current, nameIndex) =>
                    nameIndex === index ? event.target.value : current,
                  ))
                  setError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') start()
                }}
              />
              {names.length > MIN_PLAYERS && (
                <button
                  className="remove-player"
                  type="button"
                  aria-label={t('removePlayer', { number: index + 1 })}
                  onClick={() => setNames(names.filter((_, nameIndex) => nameIndex !== index))}
                >
                  ×
                </button>
              )}
            </label>
          ))}
        </div>

        {names.length < MAX_PLAYERS && (
          <button className="text-button" type="button" onClick={() => setNames([...names, ''])}>
            {t('addPlayer')}
          </button>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="button" onClick={start}>
          {t('startGame')} <span aria-hidden="true">→</span>
        </button>
        <p className="setup-note">
          {t('playersAndRounds', { players: names.length, rounds: Math.floor(60 / names.length) })}
        </p>
      </section>
    </main>
  )
}

function GameBoard({ game, onChange, onNewGame, t }: {
  game: Game
  onChange: (game: Game) => void
  onNewGame: () => void
  t: Translator
}) {
  const [editingRound, setEditingRound] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState('')
  const currentRound = game.rounds.length + 1
  const activeRound = editingRound ?? currentRound
  const isComplete = currentRound > game.maxRounds && editingRound === null
  const [draft, setDraft] = useState<EntryDraft>(() => emptyDraft(game.players))

  const standings = rankedPlayers(game)
  const leaderTotal = standings[0]?.total ?? 0
  const tricksEntered = Object.values(draft).reduce((sum, entry) => sum + entry.tricks, 0)
  const predictions = Object.values(draft).reduce((sum, entry) => sum + entry.prediction, 0)

  const updateEntry = (playerId: string, field: 'prediction' | 'tricks', value: number) => {
    setDraft((current) => ({
      ...current,
      [playerId]: { ...current[playerId], [field]: value },
    }))
    setError('')
  }

  const save = () => {
    if (validateRound(activeRound, draft)) {
      setError(t('tricksError', { round: activeRound, tricks: tricksEntered }))
      return
    }

    const savedRound = scoreRound(activeRound, draft)
    const rounds = editingRound === null
      ? [...game.rounds, savedRound]
      : game.rounds.map((round) => round.round === editingRound ? savedRound : round)
    onChange({ ...game, rounds })
    setEditingRound(null)
    setDraft(emptyDraft(game.players))
    setError('')
  }

  const edit = (roundNumber: number) => {
    const round = game.rounds.find((item) => item.round === roundNumber)
    if (!round) return
    setDraft(toDraft(round))
    setEditingRound(roundNumber)
    setShowHistory(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    setEditingRound(null)
    setDraft(emptyDraft(game.players))
    setError('')
  }

  if (isComplete) {
    return (
      <main className="content final-layout">
        <p className="eyebrow">{t('gameComplete')}</p>
        <h1>{standings.length > 1 && standings[0].total === standings[1].total
          ? t('tie')
          : t('wins', { name: standings[0].name })}</h1>
        <p className="intro-copy">{t('finalStandings', { rounds: game.maxRounds })}</p>
        <div className="podium-list">
          {standings.map((player, index) => (
            <div className={index === 0 ? 'podium-row podium-winner' : 'podium-row'} key={player.id}>
              <span className="rank">{player.rank}</span>
              <span className={`avatar avatar-${PLAYER_COLORS[game.players.findIndex((p) => p.id === player.id)]}`}>
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{player.name}</strong>
              <b>{t('points', { total: player.total })}</b>
            </div>
          ))}
        </div>
        <div className="final-actions">
          <button className="secondary-button" type="button" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? t('hideHistory') : t('viewHistory')}
          </button>
          <button className="primary-button" type="button" onClick={onNewGame}>{t('newGame')} →</button>
        </div>
        {showHistory && <History game={game} onEdit={edit} t={t} />}
      </main>
    )
  }

  const saveButtonText = editingRound === null
    ? t('saveRound', { round: activeRound })
    : t('saveChanges')

  return (
    <main className="content">
      <section className="round-heading">
        <div>
          <p className="eyebrow">{editingRound === null ? t('currentRound') : t('editingScore')}</p>
          <h1>{t('round', { round: activeRound })} <span>{t('roundOf', { rounds: game.maxRounds })}</span></h1>
          <p>{t('cardsDealt', { players: game.players.length, cards: activeRound * game.players.length })}</p>
        </div>
        <div className="progress-wrap" aria-label={t('roundProgress', { round: activeRound, rounds: game.maxRounds })}>
          <div className="progress-bar">
            <span style={{ width: `${(activeRound / game.maxRounds) * 100}%` }} />
          </div>
          <strong>{activeRound} / {game.maxRounds}</strong>
        </div>
        <div className="desktop-actions">
          {editingRound !== null && (
            <button className="secondary-button" type="button" onClick={cancelEditing}>{t('cancel')}</button>
          )}
          <button className="primary-button" type="button" onClick={save}>
            {saveButtonText} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="score-card" aria-label={t('scoresForRound', { round: activeRound })}>
        <div className="score-header" aria-hidden="true">
          <span>{t('player')}</span><span>{t('prediction')}</span><span>{t('tricks')}</span><span>{t('total')}</span>
        </div>
        {game.players.map((player, index) => {
          const currentTotal = totalForPlayer(game, player.id)
          const projected = scoreEntry(draft[player.id].prediction, draft[player.id].tricks)
          const isLeader = game.rounds.length > 0 && currentTotal === leaderTotal
          return (
            <div className={isLeader ? 'score-row leader-row' : 'score-row'} key={player.id}>
              <div className="player-cell">
                <span className={`avatar avatar-${PLAYER_COLORS[index]}`}>
                  {player.name.slice(0, 1).toUpperCase()}
                </span>
                <strong>{player.name}</strong>
                {isLeader && <span className="leader-badge">{t('leader')}</span>}
              </div>
              <div className="input-cell" data-label={t('prediction')}>
                <Stepper
                  t={t}
                  label={t('playerPrediction', { name: player.name })}
                  max={activeRound}
                  value={draft[player.id].prediction}
                  onChange={(value) => updateEntry(player.id, 'prediction', value)}
                />
              </div>
              <div className="input-cell" data-label={t('tricks')}>
                <Stepper
                  t={t}
                  label={t('playerTricks', { name: player.name })}
                  max={activeRound}
                  value={draft[player.id].tricks}
                  onChange={(value) => updateEntry(player.id, 'tricks', value)}
                />
              </div>
              <div className="total-cell" data-label={t('projectedTotal')}>
                <strong>{currentTotal + projected}</strong>
                <span className={projected >= 0 ? 'positive' : 'negative'}>
                  {projected >= 0 ? '+' : ''}{projected}
                </span>
              </div>
            </div>
          )
        })}
      </section>

      <div className="round-summary">
        <div>
          <span>{t('predictions')}</span>
          <strong>{predictions}</strong>
        </div>
        <div>
          <span>{t('tricksEntered')}</span>
          <strong className={tricksEntered === activeRound ? 'summary-valid' : ''}>{tricksEntered} / {activeRound}</strong>
        </div>
        <p className={predictions === activeRound ? 'bid-warning' : ''}>
          {predictions === activeRound ? t('bidWarning') : t('automaticScores')}
        </p>
      </div>

      {error && <p className="form-error round-error" role="alert">{error}</p>}

      <div className="mobile-actions">
        {editingRound !== null && (
          <button className="secondary-button" type="button" onClick={cancelEditing}>{t('cancel')}</button>
        )}
        <button className="primary-button" type="button" onClick={save}>{saveButtonText} →</button>
      </div>

      <section className="recent-section">
        <div className="section-title-row">
          <h2>{t('recentRounds')}</h2>
          {game.rounds.length > 0 && (
            <button className="text-button" type="button" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? t('hideHistory') : t('viewHistory')} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {game.rounds.length === 0 ? (
          <p className="empty-state">{t('emptyRounds')}</p>
        ) : (
          <div className="recent-list">
            {[...game.rounds].reverse().slice(0, 3).map((round) => {
              const totalPoints = Object.values(round.entries).reduce((sum, entry) => sum + entry.score, 0)
              return (
                <button type="button" key={round.round} onClick={() => edit(round.round)}>
                  <strong>{t('roundShort', { round: round.round })}</strong>
                  <span>·</span>
                  <span className={totalPoints >= 0 ? 'positive' : 'negative'}>
                    {t('points', { total: `${totalPoints >= 0 ? '+' : ''}${totalPoints}` })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {showHistory && <History game={game} onEdit={edit} t={t} />}
      <p className="autosave-note"><span aria-hidden="true">✓</span> {t('autosave')}</p>
    </main>
  )
}

function History({ game, onEdit, t }: { game: Game; onEdit: (round: number) => void; t: Translator }) {
  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">{t('scoreHistory')}</h2>
      <div className="history-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('round', { round: '' }).trim()}</th>
              {game.players.map((player) => <th key={player.id}>{player.name}</th>)}
              <th><span className="sr-only">{t('actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((round) => (
              <tr key={round.round}>
                <th>{t('roundShort', { round: round.round })}</th>
                {game.players.map((player) => (
                  <td key={player.id} className={round.entries[player.id].score >= 0 ? 'positive' : 'negative'}>
                    {round.entries[player.id].score >= 0 ? '+' : ''}{round.entries[player.id].score}
                  </td>
                ))}
                <td><button type="button" onClick={() => onEdit(round.round)}>{t('edit')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function App() {
  const [game, setGame] = useState<Game | null>(readStoredGame)
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(readLanguagePreference)
  const language = resolveLanguage(languagePreference)
  const t: Translator = (key, values) => translate(language, key, values)

  useEffect(() => {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
    else localStorage.removeItem(STORAGE_KEY)
  }, [game])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveTheme(themePreference, mediaQuery.matches)
    }

    applyTheme()
    if (themePreference === 'auto') mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [themePreference])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference)
    document.documentElement.setAttribute('lang', language)
    document.querySelector('title')?.replaceChildren(translate(language, 'brand'))
  }, [language, languagePreference])

  const newGame = () => {
    if (!game || window.confirm(t('confirmNewGame'))) setGame(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label={t('brandHome')}>
          <span className="brand-mark" aria-hidden="true">W</span>
          <strong>{t('brand')}</strong>
        </a>
        {game && <span className="game-status"><i /> {t('gameInProgress')}</span>}
        <div className="topbar-actions">
          <Settings
            theme={themePreference}
            onThemeChange={setThemePreference}
            language={languagePreference}
            onLanguageChange={setLanguagePreference}
            t={t}
          />
          {game && (
            <button className="new-game-button" type="button" onClick={newGame}>{t('newGame')}</button>
          )}
        </div>
      </header>

      {game
        ? <GameBoard game={game} onChange={setGame} onNewGame={newGame} t={t} />
        : <Setup onStart={setGame} t={t} />}
    </div>
  )
}
