import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 *
 * Declares required permissions for a route.
 * Used in conjunction with PermissionsGuard.
 *
 * @param permissions - Array of required permission keys
 *
 * @example
 * @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
 * async createProfessional() { }
 */
export const Permissions = (...permissions: Permission[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
