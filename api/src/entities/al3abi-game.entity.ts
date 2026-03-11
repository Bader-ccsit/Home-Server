import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('al3abi_games')
export class Al3abiGame {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  title!: string

  @Column({ type: 'varchar', length: 2000, default: '' })
  description!: string

  @Column({ type: 'text', default: '' })
  categories!: string

  @Column({ type: 'varchar', length: 20 })
  mode!: 'retro' | 'family'

  @Column({ name: 'console_key', nullable: true })
  consoleKey!: string | null

  @Column({ name: 'uploader_user_id' })
  uploaderUserId!: string

  @Column({ name: 'uploader_username' })
  uploaderUsername!: string

  @Column({ name: 'rom_file_name' })
  romFileName!: string

  @Column({ name: 'rom_original_name' })
  romOriginalName!: string

  @Column({ name: 'rom_mime' })
  romMime!: string

  @Column({ type: 'bigint', name: 'rom_size_bytes' })
  romSizeBytes!: string

  @Column({ name: 'cover_file_name', nullable: true })
  coverFileName!: string | null

  @Column({ name: 'cover_mime', nullable: true })
  coverMime!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
