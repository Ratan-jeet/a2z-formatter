import SparkMD5 from 'spark-md5'

export const HASH_ALGOS = [
  { id: 'md5', label: 'MD5' },
  { id: 'sha-1', label: 'SHA-1' },
  { id: 'sha-256', label: 'SHA-256' },
  { id: 'sha-384', label: 'SHA-384' },
  { id: 'sha-512', label: 'SHA-512' },
]

export const HASH_SAMPLE = 'Hello A2Z Formatter'

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashText(raw, algo) {
  const text = String(raw)
  if (!text.length) throw new Error('Input is empty')

  if (algo === 'md5') {
    return SparkMD5.hash(text)
  }

  const subtleAlgo = algo.toUpperCase()
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest(subtleAlgo, data)
  return bufferToHex(digest)
}

export async function hashFile(file, algo, onProgress) {
  if (!file) throw new Error('No file selected')

  if (algo === 'md5') {
    const buffer = await file.arrayBuffer()
    onProgress?.(1)
    return SparkMD5.ArrayBuffer.hash(buffer)
  }

  const subtleAlgo = algo.toUpperCase()
  const chunkSize = 2 * 1024 * 1024
  let offset = 0
  const chunks = []

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize)
    const buf = await slice.arrayBuffer()
    chunks.push(new Uint8Array(buf))
    offset += chunkSize
    onProgress?.(Math.min(1, offset / file.size))
  }

  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let pos = 0
  for (const chunk of chunks) {
    merged.set(chunk, pos)
    pos += chunk.length
  }

  const digest = await crypto.subtle.digest(subtleAlgo, merged)
  onProgress?.(1)
  return bufferToHex(digest)
}
