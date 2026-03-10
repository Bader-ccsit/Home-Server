import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AflamiController } from './aflami.controller'
import { AflamiService } from './aflami.service'
import { AflamiMovie } from '../../entities/aflami-movie.entity'
import { User } from '../../entities/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AflamiMovie, User])],
  controllers: [AflamiController],
  providers: [AflamiService],
})
export class AflamiModule {}
