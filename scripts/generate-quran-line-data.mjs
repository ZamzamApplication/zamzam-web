import { readFileSync, writeFileSync } from 'node:fs'

const sourcePath = new URL('../../api/app/quran_lines_data.py', import.meta.url)
const outputPath = new URL('../src/lib/quran-line-data.ts', import.meta.url)
const source = readFileSync(sourcePath, 'utf8')
const ayahCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
  54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
  49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30,
  20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4,
  5, 6,
]
const starts = []
let offset = 1
for (const count of ayahCounts) {
  starts.push(offset)
  offset += count
}

const values = []
const pageStarts = []
let lastPage = 0
for (const match of source.matchAll(/^\s*\((\d+), (\d+), (\d+), (\d+), (\d+), (\d+)\),$/gm)) {
  const page = Number(match[1])
  if (page !== lastPage) {
    pageStarts.push(starts[Number(match[3]) - 1] + Number(match[4]) - 1)
    lastPage = page
  }
  const endSurah = Number(match[5])
  const endAyah = Number(match[6])
  values.push(starts[endSurah - 1] + endAyah - 1)
}
if (values.length !== 8820) throw new Error(`Expected 8820 Quran lines, found ${values.length}`)
if (pageStarts.length !== 604) throw new Error(`Expected 604 Quran pages, found ${pageStarts.length}`)

const bytes = Buffer.alloc(values.length * 2)
values.forEach((value, index) => bytes.writeUInt16LE(value, index * 2))
const encoded = bytes.toString('base64')
writeFileSync(outputPath, `/** Generated from the QCF4 Madani 15-line Mushaf reference in zamzam-api. */\nexport const QURAN_LINE_END_OFFSETS_BASE64 = '${encoded}'\n`)

const pageBytes = Buffer.alloc(pageStarts.length * 2)
pageStarts.forEach((value, index) => pageBytes.writeUInt16LE(value, index * 2))
const pageOutputPath = new URL('../src/lib/quran-page-data.ts', import.meta.url)
writeFileSync(pageOutputPath, `/** Generated from the QCF4 Madani 15-line Mushaf reference in zamzam-api. */\nexport const QURAN_PAGE_START_OFFSETS_BASE64 = '${pageBytes.toString('base64')}'\n`)
