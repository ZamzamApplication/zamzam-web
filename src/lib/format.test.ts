import { describe, expect, it } from 'vitest'

import { mediaUrl } from './format'

describe('mediaUrl', () => {
  it('routes signed upload paths through the same-origin API proxy', () => {
    expect(mediaUrl('/uploads/7/student.webp?token=signed')).toBe(
      '/api/uploads/7/student.webp?token=signed'
    )
  })

  it('normalizes stored upload names through the same-origin API proxy', () => {
    expect(mediaUrl('7/student.webp')).toBe('/api/uploads/7/student.webp')
    expect(mediaUrl('uploads/7/student.webp')).toBe('/api/uploads/7/student.webp')
  })

  it('leaves external profile image URLs unchanged', () => {
    expect(mediaUrl('https://images.example/student.webp')).toBe(
      'https://images.example/student.webp'
    )
  })
})
