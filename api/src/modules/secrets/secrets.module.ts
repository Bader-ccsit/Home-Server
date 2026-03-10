import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { SecretCredential } from '../../entities/secret-credential.entity'
import { SecretsAccessOtp } from '../../entities/secrets-access-otp.entity'
import { SecretsController } from './secrets.controller'
import { SecretsService } from './secrets.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, SecretCredential, SecretsAccessOtp])],
  controllers: [SecretsController],
  providers: [SecretsService],
})
export class SecretsModule {}
