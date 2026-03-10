import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm'
import { User } from './user.entity'

@Entity('secrets_access_otps')
export class SecretsAccessOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column()
  code!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
