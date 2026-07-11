import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { memberships: true } });
    if (!user || user.deletedAt || !(await compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email, companyId: user.memberships[0]?.companyId, role: user.memberships[0]?.role };
    return { accessToken: await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL', '15m') }), refreshToken: await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_TTL', '30d') }) };
  }
}
