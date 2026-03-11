import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { ShoppingCartItem } from '../../entities/shopping-cart-item.entity'
import { ShoppingCartController } from './shopping-cart.controller'
import { ShoppingCartService } from './shopping-cart.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, ShoppingCartItem])],
  controllers: [ShoppingCartController],
  providers: [ShoppingCartService],
})
export class ShoppingCartModule {}
