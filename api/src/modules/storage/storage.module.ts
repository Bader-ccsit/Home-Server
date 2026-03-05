import { Module } from '@nestjs/common'
import { StorageService } from './storage.service'
import { StorageController } from './storage.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageUsage } from '../../entities/storage.entity'
import { User } from '../../entities/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([StorageUsage, User])],
  providers: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
