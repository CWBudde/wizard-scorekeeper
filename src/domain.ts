export type Player = {
  id: string
  name: string
}

export type RoundEntry = {
  prediction: number
  tricks: number
  score: number
}

export type PlayedRound = {
  round: number
  entries: Record<string, RoundEntry>
}

export type Game = {
  id: string
  createdAt: string
  players: Player[]
  maxRounds: number
  rounds: PlayedRound[]
}

export type EntryDraft = Record<string, { prediction: number; tricks: number }>

export const MAX_PLAYERS = 6
export const MIN_PLAYERS = 3
export const DECK_SIZE = 60

export function scoreEntry(prediction: number, tricks: number): number {
  return prediction === tricks
    ? 20 + tricks * 10
    : Math.abs(prediction - tricks) * -10
}

export function createGame(names: string[]): Game {
  const players = names.map((name, index) => ({
    id: `player-${index + 1}-${crypto.randomUUID()}`,
    name: name.trim(),
  }))

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    players,
    maxRounds: Math.floor(DECK_SIZE / players.length),
    rounds: [],
  }
}

export function emptyDraft(players: Player[]): EntryDraft {
  return Object.fromEntries(
    players.map((player) => [player.id, { prediction: 0, tricks: 0 }]),
  )
}

export function toDraft(round: PlayedRound): EntryDraft {
  return Object.fromEntries(
    Object.entries(round.entries).map(([id, entry]) => [
      id,
      { prediction: entry.prediction, tricks: entry.tricks },
    ]),
  )
}

export function scoreRound(round: number, draft: EntryDraft): PlayedRound {
  return {
    round,
    entries: Object.fromEntries(
      Object.entries(draft).map(([id, entry]) => [
        id,
        { ...entry, score: scoreEntry(entry.prediction, entry.tricks) },
      ]),
    ),
  }
}

export function totalForPlayer(game: Game, playerId: string): number {
  return game.rounds.reduce(
    (total, round) => total + (round.entries[playerId]?.score ?? 0),
    0,
  )
}

export function rankedPlayers(game: Game): Array<Player & { total: number; rank: number }> {
  const sorted = game.players
    .map((player) => ({ ...player, total: totalForPlayer(game, player.id) }))
    .sort((a, b) => b.total - a.total)

  let previousTotal: number | undefined
  let previousRank = 0

  return sorted.map((player, index) => {
    const rank = index > 0 && player.total === previousTotal ? previousRank : index + 1
    previousTotal = player.total
    previousRank = rank
    return { ...player, rank }
  })
}

export function validateRound(round: number, draft: EntryDraft): string | null {
  const tricks = Object.values(draft).reduce((sum, entry) => sum + entry.tricks, 0)
  if (tricks !== round) {
    return `The tricks must add up to ${round}. They currently add up to ${tricks}.`
  }
  return null
}
