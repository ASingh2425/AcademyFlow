import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'academyflow'
const COLLECTION = 'store'

let client = null
let db = null

const DEFAULT_DATA = {
  tests: [],
  submissions: [],
  students: [],
  pendingVerifications: [],
}

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set — falling back to local data.json')
    return false
  }
  try {
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    await client.connect()
    db = client.db(DB_NAME)
    // Ensure the store document exists
    const exists = await db.collection(COLLECTION).findOne({ _id: 'main' })
    if (!exists) {
      await db.collection(COLLECTION).insertOne({ _id: 'main', ...DEFAULT_DATA })
    }
    console.log('✅  Connected to MongoDB Atlas')
    return true
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message)
    db = null
    return false
  }
}

export async function readData() {
  if (!db) return readLocalData()
  try {
    const doc = await db.collection(COLLECTION).findOne({ _id: 'main' })
    if (!doc) return { ...DEFAULT_DATA }
    return {
      tests: doc.tests ?? [],
      submissions: doc.submissions ?? [],
      students: doc.students ?? [],
      pendingVerifications: doc.pendingVerifications ?? [],
    }
  } catch (err) {
    console.error('readData error:', err.message)
    return { ...DEFAULT_DATA }
  }
}

export async function writeData(data) {
  if (!db) return writeLocalData(data)
  try {
    await db.collection(COLLECTION).replaceOne(
      { _id: 'main' },
      { _id: 'main', ...data },
      { upsert: true }
    )
  } catch (err) {
    console.error('writeData error:', err.message)
  }
}

// ─── Local JSON fallback (dev without MongoDB) ────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, 'data.json')

function readLocalData() {
  if (!existsSync(DATA_PATH)) return { ...DEFAULT_DATA }
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
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

function writeLocalData(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

export function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
