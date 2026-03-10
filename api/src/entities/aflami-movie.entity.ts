import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('aflami_movies')
export class AflamiMovie {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  title!: string

  @Column({ type: 'varchar', length: 1500, default: '' })
  description!: string

  @Column({ type: 'text', default: '' })
  categories!: string

  @Column({ type: 'boolean', default: false, name: 'has_arabic_translation' })
  hasArabicTranslation!: boolean

  @Column({ name: 'uploader_user_id' })
  uploaderUserId!: string

  @Column({ name: 'uploader_username' })
  uploaderUsername!: string

  @Column({ name: 'movie_file_name' })
  movieFileName!: string

  @Column({ name: 'movie_original_name' })
  movieOriginalName!: string

  @Column({ name: 'movie_mime' })
  movieMime!: string

  @Column({ type: 'bigint', name: 'movie_size_bytes' })
  movieSizeBytes!: string

  @Column({ name: 'thumbnail_file_name', nullable: true })
  thumbnailFileName!: string | null

  @Column({ name: 'thumbnail_mime', nullable: true })
  thumbnailMime!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
