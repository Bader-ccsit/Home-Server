import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { StorageUsage } from '../../entities/storage.entity'
import { AflamiMovie } from '../../entities/aflami-movie.entity'
import { SecretCredential } from '../../entities/secret-credential.entity'
import { ShoppingCartItem } from '../../entities/shopping-cart-item.entity'
import { Al3abiGame } from '../../entities/al3abi-game.entity'
import { PasteMeEntry } from '../../entities/pasteme-entry.entity'
import { Otp } from '../../entities/otp.entity'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, StorageUsage, AflamiMovie, SecretCredential, ShoppingCartItem, Al3abiGame, PasteMeEntry, Otp])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
