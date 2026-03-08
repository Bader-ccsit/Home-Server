import { Module } from '@nestjs/common'
import { BaderTubeController } from './badertube.controller'
import { BaderTubeService } from './badertube.service'

@Module({
  controllers: [BaderTubeController],
  providers: [BaderTubeService],
})
export class BaderTubeModule {}
