import { Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '../auth/decorators/public.decorator'
import { StorageService } from './storage.service'

@Public()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async get(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const { stream, filename } = await this.storage.readLocal(key, Number(exp), sig)
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    stream.pipe(res)
  }
}
