import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: ['de-DE'],
  })
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.setAttribute('lang', 'en')
})

describe('App preferences', () => {
  it('uses the supported browser language in automatic mode', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /behalte die magie/i })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'de')
  })

  it('switches theme and language from settings', () => {
    render(<App />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Darstellung' }), {
      target: { value: 'dark' },
    })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    fireEvent.change(screen.getByRole('combobox', { name: 'Sprache' }), {
      target: { value: 'en' },
    })
    expect(screen.getByRole('heading', { name: /keep the magic/i })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })
})
