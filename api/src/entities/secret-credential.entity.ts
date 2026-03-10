import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'

@Entity('secret_credentials')
export class SecretCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ name: 'credential_name' })
  credentialName!: string

  @Column({ name: 'username_encrypted', type: 'text' })
  usernameEncrypted!: string

  @Column({ name: 'password_encrypted', type: 'text' })
  passwordEncrypted!: string

  @Column({ name: 'details_encrypted', type: 'text', nullable: true })
  detailsEncrypted!: string | null

  @Column({ type: 'varchar', length: 10, default: 'low' })
  importance!: 'high' | 'low'

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
