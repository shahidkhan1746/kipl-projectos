import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { SystemLogsService } from '../../system-logs/system-logs.service'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(private readonly logsService?: SystemLogsService) {}

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
      message = 'Internal server error'
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

    // Persist unexpected server errors (5xx) or important failures to the database log
    if (this.logsService && (status >= 500 || status === 429)) {
      const user = (request as any)?.user
      this.logsService.logError({
        source: 'backend',
        level: status >= 500 ? 'error' : 'warn',
        errorName: exception instanceof Error ? exception.name : 'HttpException',
        message: Array.isArray(message) ? message[0] : String(message),
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.originalUrl || request.url,
        method: request.method,
        statusCode: status,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'] as string,
      }).catch(() => undefined)
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
