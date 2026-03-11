import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { Al3abiGame } from '../../entities/al3abi-game.entity'
import { Al3abiController } from './al3abi.controller'
import { Al3abiService } from './al3abi.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, Al3abiGame])],
  controllers: [Al3abiController],
  providers: [Al3abiService],
})
export class Al3abiModule {}
