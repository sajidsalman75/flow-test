import { describe, it, expect } from 'vitest'
import { validateNodeForm, validateBusinessHour, isValid } from '../utils/validation'

describe('validateNodeForm', () => {
  it('passes with valid input', () => {
    const errors = validateNodeForm({ title: 'Hello', description: 'World', type: 'sendMessage' })
    expect(isValid(errors)).toBe(true)
  })

  it('requires a title', () => {
    const errors = validateNodeForm({ title: '', description: 'World', type: 'sendMessage' })
    expect(errors.title).toBeDefined()
  })

  it('requires a description', () => {
    const errors = validateNodeForm({ title: 'Hello', description: '  ', type: 'sendMessage' })
    expect(errors.description).toBeDefined()
  })

  it('rejects an empty type', () => {
    const errors = validateNodeForm({ title: 'Hello', description: 'World', type: '' })
    expect(errors.type).toBeDefined()
  })

  it('rejects an overly long title', () => {
    const errors = validateNodeForm({ title: 'a'.repeat(81), description: 'World', type: 'sendMessage' })
    expect(errors.title).toBeDefined()
  })
})

describe('validateBusinessHour', () => {
  it('passes with a valid slot', () => {
    const errors = validateBusinessHour({ day: 'Monday', open: '09:00', close: '17:00' })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('flags close time before open time', () => {
    const errors = validateBusinessHour({ day: 'Monday', open: '17:00', close: '09:00' })
    expect(errors.close).toBeDefined()
  })

  it('flags missing fields', () => {
    const errors = validateBusinessHour({ day: '', open: '', close: '' })
    expect(errors.day).toBeDefined()
    expect(errors.open).toBeDefined()
    expect(errors.close).toBeDefined()
  })
})
