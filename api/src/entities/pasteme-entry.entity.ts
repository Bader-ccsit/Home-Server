import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('pasteme_entries')
export class PasteMeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 10 })
  visibility!: 'public' | 'private'

  @Column({ name: 'owner_user_id', nullable: true })
  ownerUserId!: string | null

  @Column({ name: 'owner_username', nullable: true })
  ownerUsername!: string | null

  @Column({ type: 'varchar', length: 2000, default: '' })
  textContent!: string

  @Column({ name: 'file_stored_name', nullable: true })
  fileStoredName!: string | null

  @Column({ name: 'file_original_name', nullable: true })
  fileOriginalName!: string | null

  @Column({ name: 'file_mime', nullable: true })
  fileMime!: string | null

  @Column({ type: 'bigint', name: 'file_size_bytes', nullable: true })
  fileSizeBytes!: string | null

  @Column({ type: 'timestamptz', name: 'text_expires_at' })
  textExpiresAt!: Date

  @Column({ type: 'timestamptz', name: 'file_expires_at', nullable: true })
  fileExpiresAt!: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
