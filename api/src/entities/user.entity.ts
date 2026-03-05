import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Otp } from './otp.entity'
import { StorageUsage } from './storage.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ unique: true })
  username!: string

  @Column({ unique: true })
  email!: string

  @Column({ name: 'password_hash' })
  passwordHash!: string

  @Column({ default: false })
  activated!: boolean

  @OneToMany(() => Otp, o => o.user)
  otps?: Otp[]

  @OneToMany(() => StorageUsage, s => s.user)
  storage?: StorageUsage[]
}
