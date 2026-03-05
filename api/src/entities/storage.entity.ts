import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity'

@Entity('storage_usage')
export class StorageUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User, u => u.storage)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ type: 'bigint', default: 0 })
  usedBytes!: string
}
