import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULES_KEY } from '../decorators/module.decorator';

@Injectable()
export class ModuleGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredModules = this.reflector.getAllAndOverride<string[]>(MODULES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredModules) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // If user is Super Admin, they might bypass, but usually we want to respect the Tenant context they are acting in.
        // Assuming strict tenant context:
        if (!user || !user.activeClinic) {
            // In some flows, activeClinic might not be set (e.g. pure super admin routes not scoped to a clinic).
            // If the route requires a module, it implies it's a tenant route.
            throw new ForbiddenException('Clinic context required for module access');
        }

        const clinicModules = user.activeClinic.modules || [];

        // logic: User must have proper rights. 
        // Here we check if the CLINIC has the module enabled.
        const hasModule = requiredModules.some((module) => clinicModules.includes(module));

        if (!hasModule) {
            throw new ForbiddenException(`Module ${requiredModules.join(', ')} is disabled for this tenant`);
        }

        return true;
    }
}
