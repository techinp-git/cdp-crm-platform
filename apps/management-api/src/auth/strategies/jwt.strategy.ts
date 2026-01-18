import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@ydm-platform/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(PrismaService) private prisma: PrismaService
  ) {
    const secret = configService?.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'your-secret-key';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // For super admin, return minimal payload
    if (user.isSuperAdmin) {
      return {
        id: user.id,
        email: user.email,
        isSuperAdmin: true,
      };
    }

    // For tenant users, load permissions
    if (payload.tenantId) {
      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: payload.tenantId,
            userId: user.id,
          },
        },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!tenantUser || tenantUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tenant user not found or inactive');
      }

      const permissions = tenantUser.roles.flatMap((tur) =>
        tur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
      );

      return {
        id: user.id,
        email: user.email,
        tenantId: payload.tenantId,
        isSuperAdmin: false,
        permissions,
        roles: tenantUser.roles.map((tur) => tur.role.slug),
      };
    }

    throw new UnauthorizedException('Invalid token payload');
  }
}
