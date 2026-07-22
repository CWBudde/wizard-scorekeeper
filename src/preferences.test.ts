import { describe, expect, it } from 'vitest'
import { resolveLanguage, resolveTheme } from './preferences'

describe('preferences', () => {
  it('follows the device theme in auto mode', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })

  it('lets an explicit theme override the device theme', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('selects German or English from the browser languages', () => {
    expect(resolveLanguage('auto', ['de-DE'])).toBe('de')
    expect(resolveLanguage('auto', ['fr-FR', 'en-GB'])).toBe('en')
  })

  it('falls back to English for unsupported browser languages', () => {
    expect(resolveLanguage('auto', ['fr-FR', 'it-IT'])).toBe('en')
  })

  it('lets an explicit language override the browser language', () => {
    expect(resolveLanguage('de', ['en-US'])).toBe('de')
  })
})
