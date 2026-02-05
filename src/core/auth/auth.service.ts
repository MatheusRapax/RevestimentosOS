import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { email, password, name } = registerDto;

        // Verificar se usuário já existe
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        // Hash da senha
        const hashedPassword = await this.hashPassword(password);

        // Criar usuário
        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        // Gerar token JWT
        const token = await this.generateToken(user.id, user.email);

        // Buscar clínicas do usuário (vazio para novo usuário)
        const clinics = await this.getUserClinics(user.id);

        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isActive: user.isActive,
            },
            clinics,
        };
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { email, password } = loginDto;

        // Buscar usuário
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        // Verificar se usuário está ativo
        if (!user.isActive) {
            throw new UnauthorizedException('Usuário inativo');
        }

        // Validar senha
        const isPasswordValid = await this.comparePasswords(
            password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        // Gerar token JWT
        const token = await this.generateToken(user.id, user.email);

        // Buscar clínicas do usuário
        const clinics = await this.getUserClinics(user.id);

        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isActive: user.isActive,
                isSuperAdmin: user.isSuperAdmin,
            },
            clinics,
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            return null;
        }

        // Retornar usuário sem a senha, mas COM as clinicas (para manter sessão atualizada)
        const { password, ...userWithoutPassword } = user;
        const clinics = await this.getUserClinics(user.id);

        return {
            ...userWithoutPassword,
            clinics
        };
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    private async comparePasswords(
        plainPassword: string,
        hashedPassword: string,
    ): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    private async getUserClinics(userId: string) {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: { userId },
            include: {
                clinic: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                        modules: true,
                    },
                },
            },
        });

        return clinicUsers.map((cu) => cu.clinic);
    }

    private async generateToken(userId: string, email: string): Promise<string> {
        const payload = { sub: userId, email };
        return this.jwtService.signAsync(payload);
    }
}
