import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AiAccessGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean;
}
