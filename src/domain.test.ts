import { describe, expect, it, vi } from 'vitest'
import {
  createGame,
  rankedPlayers,
  scoreEntry,
  validateRound,
  type Game,
} from './domain'

describe('Wizard scoring', () => {
  it('awards 20 points plus 10 per trick for an exact prediction', () => {
    expect(scoreEntry(0, 0)).toBe(20)
    expect(scoreEntry(3, 3)).toBe(50)
  })

  it('deducts 10 points per missed trick', () => {
    expect(scoreEntry(3, 1)).toBe(-20)
    expect(scoreEntry(0, 2)).toBe(-20)
  })

  it('derives the round count from the 60-card deck', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'id') })
    expect(createGame(['A', 'B', 'C']).maxRounds).toBe(20)
    expect(createGame(['A', 'B', 'C', 'D']).maxRounds).toBe(15)
    expect(createGame(['A', 'B', 'C', 'D', 'E', 'F']).maxRounds).toBe(10)
    vi.unstubAllGlobals()
  })

  it('requires played tricks to match the round number', () => {
    expect(
      validateRound(3, {
        a: { prediction: 1, tricks: 1 },
        b: { prediction: 1, tricks: 1 },
        c: { prediction: 0, tricks: 0 },
      }),
    ).toContain('add up to 3')
  })

  it('ranks tied players at the same position', () => {
    const game: Game = {
      id: 'game',
      createdAt: '',
      maxRounds: 1,
      players: [
        { id: 'a', name: 'Mia' },
        { id: 'b', name: 'Noah' },
        { id: 'c', name: 'Lea' },
      ],
      rounds: [
        {
          round: 1,
          entries: {
            a: { prediction: 0, tricks: 0, score: 20 },
            b: { prediction: 0, tricks: 0, score: 20 },
            c: { prediction: 1, tricks: 1, score: 30 },
          },
        },
      ],
    }
    expect(rankedPlayers(game).map(({ name, rank }) => [name, rank])).toEqual([
      ['Lea', 1],
      ['Mia', 2],
      ['Noah', 2],
    ])
  })
})
