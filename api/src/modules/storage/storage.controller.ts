import { Controller, Post, UseInterceptors, UploadedFile, Req, Get } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { StorageService } from './storage.service'

@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {}

  // upload single file, expects Authorization header with Bearer <token> (token handling not implemented here)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    // For simplicity assume user id is provided in header X-User-Id when no auth
    const userId = req.headers['x-user-id'] || (req.user && req.user.sub)
    if (!userId) throw new Error('Missing user id')
    const res = await this.storage.upload(String(userId), file.originalname, file.buffer, file.size)
    return res
  }

  @Get('list')
  async list(@Req() req: any) {
    const userId = req.headers['x-user-id'] || (req.user && req.user.sub)
    if (!userId) throw new Error('Missing user id')
    return await this.storage.list(String(userId))
  }
}
