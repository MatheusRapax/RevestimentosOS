import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../permissions';

/**
 * Permissions Guard
 *
 * Enforces role-based permissions on protected routes.
 *
 * Execution Order:
 * 1. JwtAuthGuard - Authenticates user
 * 2. TenantGuard - Validates clinic access, sets clinicId
 * 3. PermissionsGuard - Checks role permissions
 *
 * Requirements:
 * - User must be authenticated (req.user)
 * - Clinic context must be set (req.clinicId from TenantGuard)
 * - Route must have @Permissions decorator
 *
 * Logic:
 * 1. Extract required permissions from route metadata
 * 2. Fetch user's ClinicUser record for current clinic
 * 3. Load role's permissions
 * 4. Check if role has ALL required permissions
 * 5. Allow if yes, throw 403 if no
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. Get required permissions from route metadata
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no permissions required, allow access
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        // 2. Extract request data
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        const clinicId = request.clinicId; // Set by TenantGuard

        if (!userId || !clinicId) {
            throw new ForbiddenException(
                'Authentication and clinic context required',
            );
        }

        // 3. Fetch user's role in current clinic
        const clinicUser = await this.prisma.clinicUser.findFirst({
            where: {
                userId,
                clinicId,
                active: true, // Only active users
            },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        if (!clinicUser) {
            throw new ForbiddenException('User has no role in this clinic');
        }

        // 4. Extract user's permissions
        const userPermissions = clinicUser.role.rolePermissions.map(
            (rp) => rp.permission.key,
        );

        // 5. Check if user has ALL required permissions
        const hasAllPermissions = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasAllPermissions) {
            throw new ForbiddenException(
                'You do not have permission to perform this action',
            );
        }

        return true;
    }
}
