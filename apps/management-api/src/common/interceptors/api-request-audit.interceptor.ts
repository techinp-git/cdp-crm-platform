import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditLogService } from '../../audit-log/audit-log.service';

function safePath(req: any): string {
  const url = String(req?.originalUrl || req?.url || '');
  // strip query for entityId
  return url.split('?')[0] || url;
}

@Injectable()
export class ApiRequestAuditInterceptor implements NestInterceptor {
  constructor(@Inject(AuditLogService) private auditLog: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const res: any = http.getResponse();

    const method = String(req?.method || '').toUpperCase();
    const path = safePath(req);

    // Avoid recursion / noise
    if (
      path.startsWith('/audit-logs') ||
      path.startsWith('/auth') ||
      path.startsWith('/health') ||
      path.startsWith('/swagger') ||
      path.startsWith('/api-docs')
    ) {
      return next.handle();
    }

    const startedAt = Date.now();
    const tenantId = req?.tenantId || req?.user?.tenantId; // request.tenantId from TenantContextInterceptor when available
    const actorUserId = req?.user?.id;
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    const writeLog = async (statusCode: number, errorMessage?: string) => {
      const durationMs = Date.now() - startedAt;
      try {
        await this.auditLog.create({
          tenantId: tenantId || undefined,
          actorUserId: actorUserId || undefined,
          action: method,
          entity: 'api_request',
          entityId: path,
          payload: {
            path,
            method,
            statusCode,
            durationMs,
            query: req?.query || null,
            params: req?.params || null,
            errorMessage: errorMessage || null,
          },
          ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
          userAgent: typeof userAgent === 'string' ? userAgent : null,
        });
      } catch {
        // Never break requests due to logging
      }
    };

    return next.handle().pipe(
      tap(() => {
        const statusCode = Number(res?.statusCode || 200);
        void writeLog(statusCode);
      }),
      catchError((err) => {
        const statusCode = Number(err?.status || err?.statusCode || res?.statusCode || 500);
        const msg =
          typeof err?.message === 'string'
            ? err.message
            : typeof err?.response?.message === 'string'
              ? err.response.message
              : null;
        void writeLog(statusCode, msg || undefined);
        return throwError(() => err);
      }),
    );
  }
}

