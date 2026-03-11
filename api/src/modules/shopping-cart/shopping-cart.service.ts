import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createSign } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { Repository } from 'typeorm'
import { User } from '../../entities/user.entity'
import { ShoppingCartItem } from '../../entities/shopping-cart-item.entity'

@Injectable()
export class ShoppingCartService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(ShoppingCartItem) private readonly itemsRepo: Repository<ShoppingCartItem>,
  ) {}

  private isDriveDebugEnabled() {
    return String(process.env.SHOPPING_SYNC_GDRIVE_DEBUG || '').trim().toLowerCase() === 'true'
  }

  private resolveExistingPath(inputPath: string) {
    if (!inputPath) return null
    if (path.isAbsolute(inputPath) && fs.existsSync(inputPath)) return inputPath

    const candidates = [
      path.resolve(process.cwd(), inputPath),
      path.resolve(process.cwd(), '..', inputPath),
      path.resolve(__dirname, '..', '..', '..', '..', inputPath),
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }

    return null
  }

  private base64Url(value: Buffer | string) {
    return Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  }

  private createServiceAccountJwt(clientEmail: string, privateKey: string) {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }
    const encodedHeader = this.base64Url(JSON.stringify(header))
    const encodedPayload = this.base64Url(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const signer = createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    const signature = signer.sign(privateKey)
    return `${signingInput}.${this.base64Url(signature)}`
  }

  private async getGoogleAccessToken(clientEmail: string, privateKey: string) {
    const assertion = this.createServiceAccountJwt(clientEmail, privateKey)
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    })

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      throw new Error(`Google token request failed (${tokenRes.status})`)
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string }
    const token = String(tokenJson?.access_token || '').trim()
    if (!token) throw new Error('Google token response did not include access_token')
    return token
  }

  private getGoogleDriveSyncConfig() {
    const fileId = String(process.env.SHOPPING_SYNC_GDRIVE_FILE_ID || '').trim()
    const rawJson = String(process.env.SHOPPING_SYNC_GDRIVE_SERVICE_ACCOUNT_JSON || '').trim()
    const jsonPath = String(process.env.SHOPPING_SYNC_GDRIVE_SERVICE_ACCOUNT_JSON_PATH || '').trim()
    if (!fileId) return null

    let parsed: any = null
    if (rawJson) {
      parsed = JSON.parse(rawJson)
    } else if (jsonPath) {
      const resolvedPath = this.resolveExistingPath(jsonPath)
      if (!resolvedPath) return null
      const fileContent = fs.readFileSync(resolvedPath, 'utf8')
      parsed = JSON.parse(fileContent)
    } else {
      return null
    }

    const clientEmail = String(parsed?.client_email || '').trim()
    const privateKey = String(parsed?.private_key || '').replace(/\\n/g, '\n').trim()
    if (!clientEmail || !privateKey) return null

    return { fileId, clientEmail, privateKey }
  }

  private parseDriveTextToItems(text: string) {
    return String(text || '')
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean)
      .slice(0, 500)
      .map(v => v.slice(0, 300))
  }

  private async syncFromGoogleDrive(userId: string) {
    const cfg = this.getGoogleDriveSyncConfig()
    if (!cfg) return

    const token = await this.getGoogleAccessToken(cfg.clientEmail, cfg.privateKey)
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cfg.fileId)}?alt=media`
    const fileRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!fileRes.ok) {
      throw new Error(`Google Drive read failed (${fileRes.status})`)
    }

    const text = await fileRes.text()
    const lines = this.parseDriveTextToItems(text)
    const user = await this.getUser(userId)

    await this.itemsRepo
      .createQueryBuilder()
      .delete()
      .from(ShoppingCartItem)
      .where('user_id = :userId', { userId })
      .execute()

    if (lines.length === 0) return

    const rows = lines.map(itemText => this.itemsRepo.create({ user, itemText }))
    await this.itemsRepo.save(rows)
  }

  private async syncFromGoogleDriveBestEffort(userId: string) {
    try {
      await this.syncFromGoogleDrive(userId)
    } catch (error: any) {
      if (this.isDriveDebugEnabled()) {
        console.warn('[shopping-cart] Google Drive pull sync failed:', error?.message || error)
      }
      // Keep local DB usable if Google Drive is unavailable or misconfigured.
    }
  }

  private async syncToGoogleDrive(userId: string) {
    const cfg = this.getGoogleDriveSyncConfig()
    if (!cfg) return

    const token = await this.getGoogleAccessToken(cfg.clientEmail, cfg.privateKey)
    const rows = await this.readRows(userId)
    const bodyText = rows
      .slice()
      .reverse()
      .map(r => r.itemText)
      .join('\n')

    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(cfg.fileId)}?uploadType=media`
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: bodyText,
    })

    if (!uploadRes.ok) {
      throw new Error(`Google Drive write failed (${uploadRes.status})`)
    }
  }

  private async syncToGoogleDriveBestEffort(userId: string) {
    try {
      await this.syncToGoogleDrive(userId)
    } catch (error: any) {
      if (this.isDriveDebugEnabled()) {
        console.warn('[shopping-cart] Google Drive push sync failed:', error?.message || error)
      }
      // Keep primary local DB flow successful even when Google Drive sync is unavailable.
    }
  }

  private getFirebaseSyncConfig() {
    const dbUrl = String(process.env.SHOPPING_SYNC_FIREBASE_DB_URL || '').trim().replace(/\/+$/g, '')
    const authToken = String(process.env.SHOPPING_SYNC_FIREBASE_AUTH || '').trim()
    if (!dbUrl) return null
    return { dbUrl, authToken }
  }

  private async readRows(userId: string) {
    return await this.itemsRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    })
  }

  private mapRows(rows: ShoppingCartItem[]) {
    return rows.map(r => ({
      id: r.id,
      text: r.itemText,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  }

  private async syncToFirebase(userId: string) {
    const cfg = this.getFirebaseSyncConfig()
    if (!cfg) return

    const rows = await this.readRows(userId)
    const payload = this.mapRows(rows)
    const authQuery = cfg.authToken ? `?auth=${encodeURIComponent(cfg.authToken)}` : ''
    const url = `${cfg.dbUrl}/shopping_cart/${encodeURIComponent(userId)}.json${authQuery}`

    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  private async syncToFirebaseBestEffort(userId: string) {
    try {
      await this.syncToFirebase(userId)
    } catch {
      // Keep primary local DB flow successful even when external sync is unavailable.
    }
  }

  private async getUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    return user
  }

  async listItems(userId: string) {
    await this.getUser(userId)
    await this.syncFromGoogleDriveBestEffort(userId)
    const rows = await this.readRows(userId)
    return this.mapRows(rows)
  }

  async addItem(userId: string, text: string) {
    const user = await this.getUser(userId)
    const clean = String(text || '').trim()
    if (!clean) throw new BadRequestException('Item text is required')
    if (clean.length > 300) throw new BadRequestException('Item text must be 300 characters or less')

    const row = this.itemsRepo.create({
      user,
      itemText: clean,
    })

    const saved = await this.itemsRepo.save(row)
    await this.syncToFirebaseBestEffort(userId)
    await this.syncToGoogleDriveBestEffort(userId)
    return {
      id: saved.id,
      text: saved.itemText,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    }
  }

  async updateItem(userId: string, itemId: string, text: string) {
    const row = await this.itemsRepo.findOne({ where: { id: itemId, user: { id: userId } }, relations: ['user'] })
    if (!row) throw new HttpException('Item not found', HttpStatus.NOT_FOUND)

    const clean = String(text || '').trim()
    if (!clean) throw new BadRequestException('Item text is required')
    if (clean.length > 300) throw new BadRequestException('Item text must be 300 characters or less')

    row.itemText = clean
    const saved = await this.itemsRepo.save(row)
    await this.syncToFirebaseBestEffort(userId)
    await this.syncToGoogleDriveBestEffort(userId)

    return {
      id: saved.id,
      text: saved.itemText,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    }
  }

  async deleteItem(userId: string, itemId: string) {
    const row = await this.itemsRepo.findOne({ where: { id: itemId, user: { id: userId } }, relations: ['user'] })
    if (!row) throw new HttpException('Item not found', HttpStatus.NOT_FOUND)
    await this.itemsRepo.delete({ id: row.id })
    await this.syncToFirebaseBestEffort(userId)
    await this.syncToGoogleDriveBestEffort(userId)
    return { ok: true }
  }

  async clearAll(userId: string) {
    await this.itemsRepo
      .createQueryBuilder()
      .delete()
      .from(ShoppingCartItem)
      .where('user_id = :userId', { userId })
      .execute()

    await this.syncToFirebaseBestEffort(userId)
    await this.syncToGoogleDriveBestEffort(userId)

    return { ok: true }
  }
}
