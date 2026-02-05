import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { TenantService } from '../tenant.service';

/**
 * TenantGuard - Multi-Tenancy Access Control
 * 
 * This guard enforces clinic-level isolation in the ClinicOS system.
 * It MUST execute AFTER JwtAuthGuard to ensure req.user exists.
 * 
 * Responsibilities:
 * 1. Resolve clinicId from X-Clinic-Id header or JWT payload
 * 2. Validate user has access to the requested clinic
 * 3. Inject clinicId into request for use in services/controllers
 * 
 * Why a Guard instead of Middleware?
 * - Middleware executes BEFORE guards, so req.user doesn't exist yet
 * - Guards are the correct place for authorization logic in NestJS
 * - This ensures tenant resolution depends on authentication
 * - Provides better error handling and type safety
 * 
 * Request Flow:
 *   JwtAuthGuard (populates req.user)
 *     → TenantGuard (validates clinic access)
 *     → PermissionsGuard (validates RBAC)
 *     → Controller
 * 
 * @throws ForbiddenException if clinicId is missing or user lacks access
 */
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private tenantService: TenantService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Resolve clinicId from X-Clinic-Id header or JWT payload
        const clinicId = this.tenantService.resolveClinicId(request);

        if (!clinicId) {
            throw new ForbiddenException(
                'Contexto de clínica não definido. Use o header X-Clinic-Id ou inclua clinicId no token JWT',
            );
        }

        // Validate user has access to the requested clinic
        const clinic = await this.tenantService.validateUserClinicAccess(
            request.user.id,
            clinicId,
        );

        if (!clinic) {
            console.error(`❌ TenantGuard: Access denied for user ${request.user.id} to clinic ${clinicId}`);
            throw new ForbiddenException(
                'Você não tem acesso a esta clínica ou ela está inativa',
            );
        }
        console.log(`✅ TenantGuard: Access granted to ${clinic.name} (${clinic.id})`);

        // Attach active clinic to user for ModuleGuard
        request.user.activeClinic = clinic;

        // Inject clinicId into request for use in controllers/services
        this.tenantService.setClinicContext(request, clinicId);

        return true;
    }
}
