import { Controller, Get, Param, Query } from '@nestjs/common'
import { BaderTubeService } from './badertube.service'

@Controller('badertube')
export class BaderTubeController {
  constructor(private readonly service: BaderTubeService) {}

  @Get('search')
  async search(@Query('q') q?: string) {
    return await this.service.search(q || '')
  }

  @Get('trending')
  async trending() {
    return await this.service.trending()
  }

  @Get('recommendations/:videoId')
  async recommendations(@Param('videoId') videoId: string) {
    return await this.service.recommendations(videoId)
  }

  @Get('video/:videoId')
  async video(@Param('videoId') videoId: string) {
    return await this.service.videoDetails(videoId)
  }

  @Get('downloads/:videoId')
  async downloads(@Param('videoId') videoId: string) {
    return await this.service.downloadOptions(videoId)
  }
}
