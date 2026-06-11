import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data.json')

const DEFAULT_DATA = {
  tests: [],
  submissions: [],
  students: [],
  pendingVerifications: [],
}

function ensureFile() {
  if (!existsSync(DATA_PATH)) {
    writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2))
  }
}

export function readData() {
  ensureFile()
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
    // Always return a complete data shape, even if the file is partial
    return {
      tests: raw.tests ?? [],
      submissions: raw.submissions ?? [],
      students: raw.students ?? [],
      pendingVerifications: raw.pendingVerifications ?? [],
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

// Synchronous write with a simple mutex flag to prevent interleaved writes.
// For a flat-file store at this scale, synchronous writes are safe and avoid
// the async Promise approach that caused node to exit prematurely.
let writing = false

export function writeData(data) {
  // If a write is in progress, wait briefly then retry (busy-wait, max 1s)
  if (writing) {
    const deadline = Date.now() + 1000
    while (writing && Date.now() < deadline) {
      // spin – file writes are <5ms so this is fine for a dev/small-scale server
    }
  }
  writing = true
  try {
    ensureFile()
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
  } finally {
    writing = false
  }
}

export function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
