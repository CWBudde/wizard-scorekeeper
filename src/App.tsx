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
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="stepper" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
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
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  )
}

function Setup({ onStart }: { onStart: (game: Game) => void }) {
  const [names, setNames] = useState(['', '', ''])
  const [error, setError] = useState('')

  const start = () => {
    const trimmed = names.map((name) => name.trim())
    if (trimmed.some((name) => !name)) {
      setError('Give every player a name before starting.')
      return
    }
    if (new Set(trimmed.map((name) => name.toLocaleLowerCase())).size !== trimmed.length) {
      setError('Player names need to be unique.')
      return
    }
    onStart(createGame(trimmed))
  }

  return (
    <main className="setup-layout">
      <section className="setup-intro">
        <p className="eyebrow">No paper. No arithmetic.</p>
        <h1>Keep the magic.<br />Lose the score sheet.</h1>
        <p className="intro-copy">
          Track predictions, tricks, and scores for a complete game of Wizard.
          Everything stays on this device—even if you close the page.
        </p>
        <div className="rule-row" aria-label="Scoring rules">
          <span><strong>Exact</strong> 20 + 10 per trick</span>
          <span><strong>Missed</strong> −10 per trick</span>
        </div>
      </section>

      <section className="setup-card" aria-labelledby="setup-title">
        <div>
          <p className="eyebrow">New game</p>
          <h2 id="setup-title">Who is playing?</h2>
        </div>

        <div className="player-inputs">
          {names.map((name, index) => (
            <label key={index}>
              <span className={`avatar avatar-${PLAYER_COLORS[index]}`}>{index + 1}</span>
              <span className="sr-only">Player {index + 1} name</span>
              <input
                autoFocus={index === 0}
                type="text"
                maxLength={24}
                placeholder={`Player ${index + 1}`}
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
                  aria-label={`Remove player ${index + 1}`}
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
            + Add player
          </button>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="button" onClick={start}>
          Start game <span aria-hidden="true">→</span>
        </button>
        <p className="setup-note">3–6 players · {Math.floor(60 / names.length)} rounds</p>
      </section>
    </main>
  )
}

function GameBoard({ game, onChange, onNewGame }: {
  game: Game
  onChange: (game: Game) => void
  onNewGame: () => void
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
    const validationError = validateRound(activeRound, draft)
    if (validationError) {
      setError(validationError)
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
        <p className="eyebrow">Game complete</p>
        <h1>{standings.length > 1 && standings[0].total === standings[1].total ? 'It’s a tie!' : `${standings[0].name} wins!`}</h1>
        <p className="intro-copy">All {game.maxRounds} rounds are in. Final standings:</p>
        <div className="podium-list">
          {standings.map((player, index) => (
            <div className={index === 0 ? 'podium-row podium-winner' : 'podium-row'} key={player.id}>
              <span className="rank">{player.rank}</span>
              <span className={`avatar avatar-${PLAYER_COLORS[game.players.findIndex((p) => p.id === player.id)]}`}>
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{player.name}</strong>
              <b>{player.total} pts</b>
            </div>
          ))}
        </div>
        <div className="final-actions">
          <button className="secondary-button" type="button" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Hide history' : 'View history'}
          </button>
          <button className="primary-button" type="button" onClick={onNewGame}>New game →</button>
        </div>
        {showHistory && <History game={game} onEdit={edit} />}
      </main>
    )
  }

  return (
    <main className="content">
      <section className="round-heading">
        <div>
          <p className="eyebrow">{editingRound === null ? 'Current round' : 'Editing score'}</p>
          <h1>Round {activeRound} <span>of {game.maxRounds}</span></h1>
          <p>{game.players.length} players · {activeRound * game.players.length} cards dealt</p>
        </div>
        <div className="progress-wrap" aria-label={`Round ${activeRound} of ${game.maxRounds}`}>
          <div className="progress-bar">
            <span style={{ width: `${(activeRound / game.maxRounds) * 100}%` }} />
          </div>
          <strong>{activeRound} / {game.maxRounds}</strong>
        </div>
        <div className="desktop-actions">
          {editingRound !== null && (
            <button className="secondary-button" type="button" onClick={cancelEditing}>Cancel</button>
          )}
          <button className="primary-button" type="button" onClick={save}>
            {editingRound === null ? `Save round ${activeRound}` : 'Save changes'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="score-card" aria-label={`Scores for round ${activeRound}`}>
        <div className="score-header" aria-hidden="true">
          <span>Player</span><span>Prediction</span><span>Tricks</span><span>Total</span>
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
                {isLeader && <span className="leader-badge">Leader</span>}
              </div>
              <div className="input-cell" data-label="Prediction">
                <Stepper
                  label={`${player.name}'s prediction`}
                  max={activeRound}
                  value={draft[player.id].prediction}
                  onChange={(value) => updateEntry(player.id, 'prediction', value)}
                />
              </div>
              <div className="input-cell" data-label="Tricks">
                <Stepper
                  label={`${player.name}'s tricks`}
                  max={activeRound}
                  value={draft[player.id].tricks}
                  onChange={(value) => updateEntry(player.id, 'tricks', value)}
                />
              </div>
              <div className="total-cell" data-label="Projected total">
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
          <span>Predictions</span>
          <strong>{predictions}</strong>
        </div>
        <div>
          <span>Tricks entered</span>
          <strong className={tricksEntered === activeRound ? 'summary-valid' : ''}>{tricksEntered} / {activeRound}</strong>
        </div>
        <p className={predictions === activeRound ? 'bid-warning' : ''}>
          {predictions === activeRound
            ? 'The predictions equal the available tricks—check your house rule.'
            : 'Scores are calculated automatically.'}
        </p>
      </div>

      {error && <p className="form-error round-error" role="alert">{error}</p>}

      <div className="mobile-actions">
        {editingRound !== null && (
          <button className="secondary-button" type="button" onClick={cancelEditing}>Cancel</button>
        )}
        <button className="primary-button" type="button" onClick={save}>
          {editingRound === null ? `Save round ${activeRound}` : 'Save changes'} →
        </button>
      </div>

      <section className="recent-section">
        <div className="section-title-row">
          <h2>Recent rounds</h2>
          {game.rounds.length > 0 && (
            <button className="text-button" type="button" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide history' : 'View history'} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        {game.rounds.length === 0 ? (
          <p className="empty-state">Your saved rounds will appear here.</p>
        ) : (
          <div className="recent-list">
            {[...game.rounds].reverse().slice(0, 3).map((round) => {
              const totalPoints = Object.values(round.entries).reduce((sum, entry) => sum + entry.score, 0)
              return (
                <button type="button" key={round.round} onClick={() => edit(round.round)}>
                  <strong>R{round.round}</strong>
                  <span>·</span>
                  <span className={totalPoints >= 0 ? 'positive' : 'negative'}>
                    {totalPoints >= 0 ? '+' : ''}{totalPoints} pts
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {showHistory && <History game={game} onEdit={edit} />}
      <p className="autosave-note"><span aria-hidden="true">✓</span> Scores save automatically on this device</p>
    </main>
  )
}

function History({ game, onEdit }: { game: Game; onEdit: (round: number) => void }) {
  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">Score history</h2>
      <div className="history-scroll">
        <table>
          <thead>
            <tr>
              <th>Round</th>
              {game.players.map((player) => <th key={player.id}>{player.name}</th>)}
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((round) => (
              <tr key={round.round}>
                <th>R{round.round}</th>
                {game.players.map((player) => (
                  <td key={player.id} className={round.entries[player.id].score >= 0 ? 'positive' : 'negative'}>
                    {round.entries[player.id].score >= 0 ? '+' : ''}{round.entries[player.id].score}
                  </td>
                ))}
                <td><button type="button" onClick={() => onEdit(round.round)}>Edit</button></td>
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

  useEffect(() => {
    if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
    else localStorage.removeItem(STORAGE_KEY)
  }, [game])

  const newGame = () => {
    if (!game || window.confirm('Start a new game? The current score sheet will be removed.')) {
      setGame(null)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Wizard Scorekeeper home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <strong>Wizard Scorekeeper</strong>
        </a>
        {game && (
          <>
            <span className="game-status"><i /> Game in progress</span>
            <button className="new-game-button" type="button" onClick={newGame}>New game</button>
          </>
        )}
      </header>

      {game ? <GameBoard game={game} onChange={setGame} onNewGame={newGame} /> : <Setup onStart={setGame} />}
    </div>
  )
}
