import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { AflamiMovie } from '../../entities/aflami-movie.entity'
import { User } from '../../entities/user.entity'

type CreateMovieInput = {
  uploaderUserId: string
  uploaderUsername: string
  title: string
  description: string
  categories: string[]
  hasArabicTranslation: boolean
  movieFile: Express.Multer.File
  thumbnailFile?: Express.Multer.File | null
}

type UpdateMovieInput = {
  title: string
  description: string
  categories: string[]
  hasArabicTranslation: boolean
}

@Injectable()
export class AflamiService {
  private readonly supportedVideoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm'])
  private readonly supportedThumbnailExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

  private readonly categoriesList = [
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'History',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'War',
    'Western',
  ]

  private readonly storageRoot = path.resolve(process.cwd(), 'services', 'aflami')
  private readonly moviesDir = path.join(this.storageRoot, 'movies')
  private readonly thumbnailsDir = path.join(this.storageRoot, 'thumbnails')

  constructor(
    @InjectRepository(AflamiMovie) private readonly moviesRepo: Repository<AflamiMovie>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    fs.mkdirSync(this.moviesDir, { recursive: true })
    fs.mkdirSync(this.thumbnailsDir, { recursive: true })
  }

  categories() {
    return this.categoriesList
  }

  async resolveUploader(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('User not found')
    return { uploaderUserId: user.id, uploaderUsername: user.username }
  }

  private sanitizeText(value: string, max: number) {
    return String(value || '').trim().slice(0, max)
  }

  private parseCategories(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map(v => String(v || '').trim()).filter(Boolean)
    }
    const raw = String(value || '').trim()
    if (!raw) return []
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map(v => String(v || '').trim()).filter(Boolean)
      } catch {
        return []
      }
    }
    return raw.split(',').map(v => v.trim()).filter(Boolean)
  }

  parseHasArabicTranslation(value: any): boolean {
    const raw = String(value || '').toLowerCase()
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
  }

  private extOf(fileName: string) {
    return path.extname(String(fileName || '')).toLowerCase()
  }

  private validateMovieFile(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Movie file is required')
    const ext = this.extOf(file.originalname)
    const mime = String(file.mimetype || '').toLowerCase()
    if (!this.supportedVideoExtensions.has(ext)) {
      throw new BadRequestException(`Unsupported movie format: ${ext || 'unknown'}`)
    }
    if (!mime.startsWith('video/')) {
      throw new BadRequestException('Uploaded movie is not a valid video file')
    }
  }

  private validateThumbnailFile(file: Express.Multer.File | undefined | null) {
    if (!file) return
    const ext = this.extOf(file.originalname)
    const mime = String(file.mimetype || '').toLowerCase()
    if (!this.supportedThumbnailExtensions.has(ext)) {
      throw new BadRequestException(`Unsupported thumbnail format: ${ext || 'unknown'}`)
    }
    if (!mime.startsWith('image/')) {
      throw new BadRequestException('Uploaded thumbnail is not a valid image file')
    }
  }

  private toMovieDto(movie: AflamiMovie) {
    const categories = movie.categories ? movie.categories.split('|').filter(Boolean) : []
    return {
      id: movie.id,
      title: movie.title,
      description: movie.description,
      categories,
      hasArabicTranslation: movie.hasArabicTranslation,
      uploaderUsername: movie.uploaderUsername,
      movieUrl: `/aflami/movie-file/${encodeURIComponent(movie.id)}`,
      thumbnailUrl: movie.thumbnailFileName ? `/aflami/thumbnail/${encodeURIComponent(movie.id)}` : null,
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt,
    }
  }

  async listMovies(query = '') {
    const q = String(query || '').trim().toLowerCase()
    const rows = await this.moviesRepo.find({ order: { createdAt: 'DESC' } })
    if (!q) return rows.map(row => this.toMovieDto(row))

    return rows
      .filter(row => String(row.title || '').toLowerCase().includes(q))
      .map(row => this.toMovieDto(row))
  }

  async getMovie(id: string) {
    const row = await this.moviesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Movie not found')
    return this.toMovieDto(row)
  }

  async createMovie(input: CreateMovieInput) {
    this.validateMovieFile(input.movieFile)
    this.validateThumbnailFile(input.thumbnailFile)

    const title = this.sanitizeText(input.title, 255)
    const description = this.sanitizeText(input.description, 1500)
    const categories = input.categories.filter(Boolean)

    if (!title) throw new BadRequestException('Movie name is required')
    if (description.length > 1500) throw new BadRequestException('Description must be 1500 characters or less')
    if (categories.length === 0) throw new BadRequestException('At least one category is required')

    const movieExt = this.extOf(input.movieFile.originalname)
    const movieStoredName = `${randomUUID()}${movieExt}`
    const moviePath = path.join(this.moviesDir, movieStoredName)
    fs.writeFileSync(moviePath, input.movieFile.buffer)

    let thumbnailStoredName: string | null = null
    if (input.thumbnailFile) {
      const thumbExt = this.extOf(input.thumbnailFile.originalname)
      thumbnailStoredName = `${randomUUID()}${thumbExt}`
      const thumbPath = path.join(this.thumbnailsDir, thumbnailStoredName)
      fs.writeFileSync(thumbPath, input.thumbnailFile.buffer)
    }

    const row = this.moviesRepo.create({
      title,
      description,
      categories: categories.join('|'),
      hasArabicTranslation: input.hasArabicTranslation,
      uploaderUserId: input.uploaderUserId,
      uploaderUsername: input.uploaderUsername,
      movieFileName: movieStoredName,
      movieOriginalName: input.movieFile.originalname,
      movieMime: input.movieFile.mimetype || 'video/mp4',
      movieSizeBytes: String(input.movieFile.size || 0),
      thumbnailFileName: thumbnailStoredName,
      thumbnailMime: input.thumbnailFile?.mimetype || null,
    })

    const saved = await this.moviesRepo.save(row)
    return this.toMovieDto(saved)
  }

  async updateMovie(id: string, input: UpdateMovieInput) {
    const row = await this.moviesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Movie not found')

    const title = this.sanitizeText(input.title, 255)
    const description = this.sanitizeText(input.description, 1500)
    const categories = input.categories.filter(Boolean)

    if (!title) throw new BadRequestException('Movie name is required')
    if (description.length > 1500) throw new BadRequestException('Description must be 1500 characters or less')
    if (categories.length === 0) throw new BadRequestException('At least one category is required')

    row.title = title
    row.description = description
    row.categories = categories.join('|')
    row.hasArabicTranslation = input.hasArabicTranslation

    const updated = await this.moviesRepo.save(row)
    return this.toMovieDto(updated)
  }

  async deleteMovie(id: string) {
    const row = await this.moviesRepo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Movie not found')

    if (row.movieFileName) {
      const moviePath = path.join(this.moviesDir, row.movieFileName)
      if (fs.existsSync(moviePath)) fs.unlinkSync(moviePath)
    }

    if (row.thumbnailFileName) {
      const thumbPath = path.join(this.thumbnailsDir, row.thumbnailFileName)
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath)
    }

    await this.moviesRepo.delete({ id })
    return { ok: true }
  }

  getMovieFilePath(id: string) {
    return this.moviesRepo.findOne({ where: { id } }).then(row => {
      if (!row) throw new NotFoundException('Movie not found')
      const filePath = path.join(this.moviesDir, row.movieFileName)
      if (!fs.existsSync(filePath)) throw new NotFoundException('Movie file not found')
      return { filePath, mime: row.movieMime, originalName: row.movieOriginalName }
    })
  }

  getThumbnailFilePath(id: string) {
    return this.moviesRepo.findOne({ where: { id } }).then(row => {
      if (!row) throw new NotFoundException('Movie not found')
      if (!row.thumbnailFileName) throw new NotFoundException('Thumbnail not found')
      const filePath = path.join(this.thumbnailsDir, row.thumbnailFileName)
      if (!fs.existsSync(filePath)) throw new NotFoundException('Thumbnail file not found')
      return { filePath, mime: row.thumbnailMime || 'image/jpeg' }
    })
  }

  parseCategoriesFromBody(value: any) {
    return this.parseCategories(value)
  }
}
