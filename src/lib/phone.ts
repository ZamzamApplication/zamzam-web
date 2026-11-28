/** Links for calling or messaging a phone number stored as free text. */

export function telHref(phone: string) {
  const cleaned = phone.trim().replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : ''
}

/**
 * wa.me needs the full international number without "+" or leading zeros.
 * Local Egyptian mobiles (01xxxxxxxxx) get the 20 country code; anything
 * written with + or 00 is used as given. Returns '' when it can't tell.
 */
export function whatsappHref(phone: string) {
  const trimmed = phone.trim()
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (/^01\d{9}$/.test(digits)) {
    digits = `20${digits.slice(1)}`
  } else if (digits.startsWith('0')) {
    return ''
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : ''
}
