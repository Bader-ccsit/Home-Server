// Load env early so TypeOrmModule sees DB credentials when the module is evaluated
import { Module } from '@nestjs/common'
// ...existing code...
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { StorageModule } from './storage/storage.module'
import { BaderTubeModule } from './badertube/badertube.module'
import { AflamiModule } from './aflami/aflami.module'
import { SecretsModule } from './secrets/secrets.module'
import { User } from '../entities/user.entity'
import { Otp } from '../entities/otp.entity'
import { StorageUsage } from '../entities/storage.entity'
import { AflamiMovie } from '../entities/aflami-movie.entity'
import { SecretCredential } from '../entities/secret-credential.entity'
import { SecretsAccessOtp } from '../entities/secrets-access-otp.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'root',
      database: process.env.POSTGRES_DB || 'homeserver',
      entities: [User, Otp, StorageUsage, AflamiMovie, SecretCredential, SecretsAccessOtp],
      synchronize: true,
    }),
  AuthModule,
  StorageModule,
  BaderTubeModule,
  AflamiModule,
  SecretsModule,
  ],
})
export class AppModule {}
