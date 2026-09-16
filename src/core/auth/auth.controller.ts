import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  // Renova o token (mesma validade de sempre, a partir de agora) enquanto a
  // sessão atual ainda for válida. JwtAuthGuard já rejeita token expirado —
  // isso só funciona se chamado ANTES de expirar, é o que dá o efeito de
  // "sessão desliza enquanto o usuário está ativo".
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req: any) {
    return this.authService.refreshToken(req.user.id, req.user.email);
  }
}
