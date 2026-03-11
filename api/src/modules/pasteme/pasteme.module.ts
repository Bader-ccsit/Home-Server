import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { PasteMeEntry } from '../../entities/pasteme-entry.entity'
import { PasteMeController } from './pasteme.controller'
import { PasteMeService } from './pasteme.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, PasteMeEntry])],
  controllers: [PasteMeController],
  providers: [PasteMeService],
})
export class PasteMeModule {}
