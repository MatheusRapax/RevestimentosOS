import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';

@Injectable()
export class ClinicsService {
    constructor(private prisma: PrismaService) { }

    async createClinic(createClinicDto: CreateClinicDto, userId: string) {
        const { name } = createClinicDto;

        // Gerar slug a partir do nome
        const slug = this.generateSlug(name);

        // Verificar se slug já existe
        const existingClinic = await this.prisma.clinic.findUnique({
            where: { slug },
        });

        if (existingClinic) {
            throw new ConflictException(
                'Já existe uma clínica com este nome (slug duplicado)',
            );
        }

        // Buscar role CLINIC_ADMIN
        const adminRole = await this.prisma.role.findUnique({
            where: { key: 'CLINIC_ADMIN' },
        });

        if (!adminRole) {
            throw new Error('Role CLINIC_ADMIN não encontrada. Execute o seed.');
        }

        // Criar clínica e associar ao usuário criador com role ADMIN
        const clinic = await this.prisma.clinic.create({
            data: {
                name,
                slug,
                clinicUsers: {
                    create: {
                        userId,
                        roleId: adminRole.id,
                    },
                },
            },
            include: {
                clinicUsers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            id: clinic.id,
            name: clinic.name,
            slug: clinic.slug,
            isActive: clinic.isActive,
            createdAt: clinic.createdAt,
        };
    }

    async getUserClinics(userId: string) {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: { userId },
            include: {
                clinic: true,
            },
        });

        return clinicUsers.map((cu) => ({
            id: cu.clinic.id,
            name: cu.clinic.name,
            slug: cu.clinic.slug,
            isActive: cu.clinic.isActive,
            joinedAt: cu.createdAt,
        }));
    }

    async getClinicById(clinicId: string) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
        });

        if (!clinic) {
            throw new NotFoundException('Clínica não encontrada');
        }

        return clinic;
    }

    async validateUserClinicAccess(
        userId: string,
        clinicId: string,
    ): Promise<boolean> {
        const clinicUser = await this.prisma.clinicUser.findFirst({
            where: {
                userId,
                clinicId,
            },
        });

        return !!clinicUser;
    }

    async getClinicUsers(clinicId: string) {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: { clinicId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return clinicUsers.map(cu => ({
            id: cu.user.id,
            name: cu.user.name,
            email: cu.user.email,
        }));
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async updateClinic(id: string, data: any) {
        return this.prisma.clinic.update({
            where: { id },
            data,
        });
    }
}
