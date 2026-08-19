import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
export declare class KbIndexInterceptor implements NestInterceptor {
    private readonly events;
    constructor(events: EventEmitter2);
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any>;
}
