import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: any = 'Internal server error'
    let error: string | undefined = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || exception.message
        error = (res as any).error
      } else {
        message = res || exception.message
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      )
    } else {
      this.logger.error(
        `Unknown Exception: ${JSON.stringify(exception)}`,
        '',
        `${request.method} ${request.url}`,
      )
    }

    const payload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
      ...(error && { error }),
    }

    response.status(status).json(payload)
  }
}
