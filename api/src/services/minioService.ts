// Minimal consolidated minio/local filesystem service
import { Client } from 'minio'
import * as fs from 'fs'
import * as path from 'path'
import * as mime from 'mime'

function guessMimeType(filePath: string): string {
  const m: any = mime as any
  const fromDirect = typeof m?.getType === 'function' ? m.getType(filePath) : null
  const fromDefault = typeof m?.default?.getType === 'function' ? m.default.getType(filePath) : null
  if (fromDirect || fromDefault) return fromDirect || fromDefault

  const ext = path.extname(filePath || '').toLowerCase()
  const fallback: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }
  return fallback[ext] || 'application/octet-stream'
}

const USE_MINIO = !!process.env.MINIO_ENDPOINT && !!process.env.MINIO_ROOT_USER

let minioClient: Client | null = null
if (USE_MINIO) {
  const ep = process.env.MINIO_ENDPOINT || 'localhost:9000'
  const [host, port] = ep.split(':')
  minioClient = new Client({
    endPoint: host,
    port: Number(port || 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
  })
}

// Default local storage root: ../services/minio relative to api working dir
const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), '..', 'services', 'minio')
if (!fs.existsSync(LOCAL_STORAGE_ROOT)) fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true })

function safeJoin(base: string, p: string) {
  const target = path.normalize(path.join(base, p || ''))
  if (!target.startsWith(base)) throw new Error('Invalid path')
  return target
}

export async function ensureUserDir(username: string) {
  const dirName = String(username)
  if (minioClient) {
    // still return a logical bucket name for compatibility
    const bucket = `user-${dirName}`
    const exists = await minioClient.bucketExists(bucket).catch(() => false)
    if (!exists) await minioClient.makeBucket(bucket)
    return { type: 'minio', bucket }
  }
  const dir = path.join(LOCAL_STORAGE_ROOT, dirName)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return { type: 'local', bucket: dir }
}

export async function uploadObject(username: string, objectPath: string, streamOrBuffer: any, size?: number) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio' && minioClient) {
    await minioClient.putObject(info.bucket, objectPath, streamOrBuffer, size || -1)
    return { url: `${process.env.MINIO_ENDPOINT || ''}/${info.bucket}/${objectPath}` }
  }
  // local filesystem: ensure parent dirs
  const base = info.bucket
  const filePath = safeJoin(base, objectPath)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (streamOrBuffer instanceof Buffer) {
    fs.writeFileSync(filePath, streamOrBuffer)
  } else if (streamOrBuffer && (streamOrBuffer.pipe || typeof streamOrBuffer.on === 'function')) {
    const out = fs.createWriteStream(filePath)
    await new Promise<void>((res, rej) => {
      streamOrBuffer.pipe(out)
      out.on('finish', () => res())
      out.on('error', rej)
    })
  }
  return { url: `/storage/download?username=${encodeURIComponent(username)}&path=${encodeURIComponent(objectPath)}` }
}

export async function listObjects(username: string, folder = '') {
  const info = await ensureUserDir(username)
  if (info.type === 'minio' && minioClient) {
    // For simplicity, list all object names and filter by prefix
    return new Promise<any[]>((resolve, reject) => {
      const objects: any[] = []
      const stream = minioClient!.listObjects(info.bucket, folder || '', false)
      stream.on('data', obj => objects.push({ name: obj.name, size: obj.size }))
      stream.on('end', () => resolve(objects))
      stream.on('error', reject)
    })
  }
  const base = info.bucket
  const dir = safeJoin(base, folder || '')
  if (!fs.existsSync(dir)) return []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  return items.map(d => {
    const full = path.join(dir, d.name)
    const stat = fs.statSync(full)
    return {
      name: d.name,
      path: path.relative(base, full).replace(/\\/g, '/'),
      isDir: d.isDirectory(),
      size: stat.size,
      mtime: stat.mtimeMs,
    }
  })
}

export async function downloadObject(username: string, objectPath: string) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio' && minioClient) {
    return minioClient.getObject(info.bucket, objectPath)
  }
  const filePath = safeJoin(info.bucket, objectPath)
  if (!fs.existsSync(filePath)) throw new Error('Not found')
  return fs.createReadStream(filePath)
}

export async function statObject(username: string, objectPath: string) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio' && minioClient) {
    // Not implementing stat for MinIO here
    return null
  }
  const filePath = safeJoin(info.bucket, objectPath)
  if (!fs.existsSync(filePath)) return null
  const st = fs.statSync(filePath)
  return { size: st.size, mtime: st.mtimeMs, isDirectory: st.isDirectory(), mime: st.isDirectory() ? null : guessMimeType(filePath) }
}

export async function mkdir(username: string, folderPath: string) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio') throw new Error('Not implemented for MinIO')
  const dir = safeJoin(info.bucket, folderPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return true
}

export async function deleteObject(username: string, objectPath: string) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio') {
    await minioClient!.removeObject(info.bucket, objectPath)
    return true
  }
  const target = safeJoin(info.bucket, objectPath)
  if (!fs.existsSync(target)) throw new Error('Not found')
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    // recursive delete
    fs.rmSync(target, { recursive: true, force: true })
  } else fs.unlinkSync(target)
  return true
}

export async function renameObject(username: string, oldPath: string, newPath: string) {
  const info = await ensureUserDir(username)
  if (info.type === 'minio') throw new Error('Not implemented for MinIO')
  const a = safeJoin(info.bucket, oldPath)
  const b = safeJoin(info.bucket, newPath)
  if (!fs.existsSync(a)) throw new Error('Not found')
  const dir = path.dirname(b)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.renameSync(a, b)
  return true
}

export async function searchObjects(username: string, query: string) {
  const info = await ensureUserDir(username)
  const results: any[] = []
  if (info.type === 'minio') throw new Error('Not implemented for MinIO')
  function walk(dir: string, rel = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const r = path.join(rel, e.name).replace(/\\/g, '/')
      const full = path.join(dir, e.name)
      if (e.name.toLowerCase().includes(query.toLowerCase())) {
        const st = fs.statSync(full)
        results.push({ path: r, name: e.name, isDirectory: e.isDirectory(), size: st.size, mtime: st.mtimeMs })
      }
      if (e.isDirectory()) walk(full, r)
    }
  }
  walk(info.bucket, '')
  return results
}
