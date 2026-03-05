import { Client } from 'minio'
import * as fs from 'fs'
import * as path from 'path'

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

const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), 'data')
if (!fs.existsSync(LOCAL_STORAGE_ROOT)) fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true })

export async function ensureUserBucket(userId: string) {
  const bucket = `user-${userId}`
  if (minioClient) {
    const exists = await minioClient.bucketExists(bucket).catch(() => false)
    if (!exists) await minioClient.makeBucket(bucket)
    return { type: 'minio', bucket }
  }
  const dir = path.join(LOCAL_STORAGE_ROOT, bucket)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return { type: 'local', bucket: dir }
}

export async function uploadObject(userId: string, objectName: string, streamOrBuffer: any, size?: number) {
  const info = await ensureUserBucket(userId)
  if (info.type === 'minio' && minioClient) {
    // streamOrBuffer should be a Readable stream
    await minioClient.putObject(info.bucket, objectName, streamOrBuffer, size || -1)
    return { url: `${process.env.MINIO_ENDPOINT || ''}/${info.bucket}/${objectName}` }
  }
  // local
  const filePath = path.join(info.bucket, objectName)
  if (streamOrBuffer instanceof Buffer) {
    fs.writeFileSync(filePath, streamOrBuffer)
  } else if (streamOrBuffer.pipe) {
    const out = fs.createWriteStream(filePath)
    await new Promise((res, rej) => {
      streamOrBuffer.pipe(out)
      out.on('finish', res)
      out.on('error', rej)
    })
  }
  return { url: `file://${filePath}` }
}

export async function listObjects(userId: string) {
  const info = await ensureUserBucket(userId)
  if (info.type === 'minio' && minioClient) {
    return new Promise<string[]>((resolve, reject) => {
      const objects: string[] = []
      const stream = minioClient!.listObjects(info.bucket, '', true)
      stream.on('data', obj => objects.push(obj.name))
      stream.on('end', () => resolve(objects))
      stream.on('error', reject)
    })
  }
  const files = fs.readdirSync(info.bucket)
  return files
}
