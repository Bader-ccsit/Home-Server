import { Module } from '@nestjs/common'
import { HmlnyController } from './hmlny.controller'
import { HmlnyService } from './hmlny.service'

@Module({
  controllers: [HmlnyController],
  providers: [HmlnyService],
})
export class HmlnyModule {}
