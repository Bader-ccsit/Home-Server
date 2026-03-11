import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { ShoppingCartService } from './shopping-cart.service'

@Controller('shopping-cart')
export class ShoppingCartController {
  constructor(private readonly service: ShoppingCartService) {}

  private extractAuthenticatedUserId(req: any): string {
    const reqUserSub = req?.user?.sub
    if (reqUserSub) return String(reqUserSub)

    const authHeader = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Missing bearer token')
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      if (!payload?.sub) throw new BadRequestException('Invalid token payload')
      return String(payload.sub)
    } catch {
      throw new BadRequestException('Invalid token')
    }
  }

  @Get('items')
  async listItems(@Req() req: any) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.service.listItems(userId)
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() body: any) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.service.addItem(userId, String(body?.text || ''))
  }

  @Patch('items/:id')
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.service.updateItem(userId, id, String(body?.text || ''))
  }

  @Delete('items/:id')
  async deleteItem(@Req() req: any, @Param('id') id: string) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.service.deleteItem(userId, id)
  }

  @Delete('items')
  async clearAll(@Req() req: any) {
    const userId = this.extractAuthenticatedUserId(req)
    return await this.service.clearAll(userId)
  }
}
