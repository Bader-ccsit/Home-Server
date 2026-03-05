import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm'
import { User } from './user.entity'

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  code!: string

  @ManyToOne(() => User, u => u.otps)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
