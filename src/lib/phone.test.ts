import { describe, expect, it } from 'vitest'
import { telHref, whatsappHref } from './phone'

describe('phone links', () => {
  it('builds tel links from formatted numbers', () => {
    expect(telHref('010 1234 5678')).toBe('tel:01012345678')
    expect(telHref('+20 101-234-5678')).toBe('tel:+201012345678')
    expect(telHref('  ')).toBe('')
  })

  it('adds the Egyptian country code to local mobiles', () => {
    expect(whatsappHref('01012345678')).toBe('https://wa.me/201012345678')
  })

  it('keeps international numbers as written', () => {
    expect(whatsappHref('+966 50 123 4567')).toBe('https://wa.me/966501234567')
    expect(whatsappHref('00966501234567')).toBe('https://wa.me/966501234567')
  })

  it('skips numbers it cannot place', () => {
    expect(whatsappHref('022345678')).toBe('')
    expect(whatsappHref('123')).toBe('')
    expect(whatsappHref('')).toBe('')
  })
})
