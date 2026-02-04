import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            tap((data) => {
                // Only audit successful responses (2xx)
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    this.createAuditLog(request, data);
                }
            }),
        );
    }

    private createAuditLog(request: any, responseData: any): void {
        try {
            let action = this.mapMethodToAction(request.method);
            const entity = this.extractEntity(request.url);

            // Special handling for Auth
            if (entity === 'Auth') {
                if (request.url.includes('/login')) {
                    action = AuditAction.LOGIN;
                }
            }

            // Skip audit for certain routes
            if (this.shouldSkipAudit(request.url, action)) {
                return;
            }

            const entityId = this.extractEntityId(request, responseData);

            // Try to get userId from request (authenticated) or response (login/register)
            let userId = request.user?.id;
            if (!userId && (entity === 'Auth' || entity === 'User') && responseData?.user?.id) {
                userId = responseData.user.id;
            }

            this.auditService.log({
                clinicId: request.user?.activeClinicId || request.clinicId, // Try request.user first as it might have the active context
                userId: userId,
                action,
                entity,
                entityId,
                ip: request.ip || request.connection?.remoteAddress,
                userAgent: request.headers['user-agent'],
            });
        } catch (error) {
            // Silently fail - audit should never break the request
            console.error('Audit interceptor error:', error);
        }
    }

    private mapMethodToAction(method: string): AuditAction {
        const methodMap: Record<string, AuditAction> = {
            POST: AuditAction.CREATE,
            PATCH: AuditAction.UPDATE,
            PUT: AuditAction.UPDATE,
            DELETE: AuditAction.DELETE,
            GET: AuditAction.VIEW,
        };

        return methodMap[method] || AuditAction.VIEW;
    }

    private extractEntity(url: string): string {
        // Extract entity from URL path
        // Examples:
        // /patients/123 -> Patient
        // /appointments/456 -> Appointment
        // /encounters/789/records -> Encounter

        const segments = url.split('/').filter(Boolean);

        if (segments.length === 0) {
            return 'Unknown';
        }

        // Get the first meaningful segment
        const entitySegment = segments[0];

        // Map plural to singular and capitalize
        const entityMap: Record<string, string> = {
            patients: 'Patient',
            appointments: 'Appointment',
            encounters: 'Encounter',
            procedures: 'Procedure',
            consumables: 'Consumable',
            clinics: 'Clinic',
            users: 'User',
        };

        return entityMap[entitySegment] || this.capitalize(this.singularize(entitySegment));
    }

    private extractEntityId(request: any, responseData: any): string | undefined {
        // Try to get ID from URL params first
        if (request.params?.id) {
            return request.params.id;
        }

        // Try to get ID from response data
        if (responseData?.id) {
            return responseData.id;
        }

        return undefined;
    }

    private shouldSkipAudit(url: string, action: AuditAction): boolean {
        // Skip health checks
        if (url.includes('/health')) {
            return true;
        }

        // Skip audit logs endpoint
        if (url.includes('/audit-logs')) {
            return true;
        }

        // Skip GET requests to list endpoints (only audit individual views)
        if (action === AuditAction.VIEW && !url.match(/\/[a-f0-9-]{36}$/i)) {
            return true;
        }

        return false;
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private singularize(str: string): string {
        if (str.endsWith('ies')) {
            return str.slice(0, -3) + 'y';
        }
        if (str.endsWith('s')) {
            return str.slice(0, -1);
        }
        return str;
    }
}
