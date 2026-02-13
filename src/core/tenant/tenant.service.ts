import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
    constructor(private prisma: PrismaService) { }

    /**
     * Resolve clinicId from JWT payload or request header
     */
    resolveClinicId(req: any): string | null {
        // Prioridade 1: clinicId no JWT payload
        if (req.user?.clinicId) {
            return req.user.clinicId;
        }

        // Prioridade 2: Header X-Clinic-Id
        const headerClinicId = req.headers['x-clinic-id'];
        if (headerClinicId) {
            return headerClinicId;
        }

        return null;
    }

    /**
     * Validate if user has access to the clinic
     */
    async validateUserClinicAccess(
        userId: string,
        clinicId: string,
    ): Promise<any> {
        const clinicUser = await this.prisma.clinicUser.findFirst({
            where: {
                userId,
                clinicId,
                clinic: {
                    isActive: true,
                },
            },
            include: {
                clinic: true, // Include full clinic data including modules
            }
        });

        return clinicUser?.clinic || null;
    }

    /**
     * Fetch a clinic directly by ID (Used for Super Admin bypass)
     */
    async getClinic(clinicId: string) {
        return this.prisma.clinic.findUnique({
            where: { id: clinicId },
        });
    }

    /**
     * Set clinic context in request
     */
    setClinicContext(req: any, clinicId: string): void {
        req.clinicId = clinicId;
    }
}
