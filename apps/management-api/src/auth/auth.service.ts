import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, AuthResponse, JwtPayload } from '@ydm-platform/types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password, tenantId } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For super admin, no tenant required
    if (user.isSuperAdmin) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        isSuperAdmin: true,
      };

      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          isSuperAdmin: true,
        },
      };
    }

    // For regular users, find tenant user
    let tenantUser;
    if (tenantId) {
      tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: user.id,
          },
        },
        include: {
          tenant: true,
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
    } else {
      // Find first active tenant for user
      tenantUser = await this.prisma.tenantUser.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
        include: {
          tenant: true,
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
    }

    if (!tenantUser || tenantUser.status !== 'ACTIVE' || tenantUser.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid tenant or user not active');
    }

    // Collect permissions
    const permissions = tenantUser.roles.flatMap((tur) =>
      tur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: tenantUser.tenantId,
      isSuperAdmin: false,
      roles: tenantUser.roles.map((tur) => tur.role.slug),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        isSuperAdmin: false,
        tenantId: tenantUser.tenantId,
        roles: tenantUser.roles.map((tur) => tur.role.slug),
        permissions,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token');
      }

      if (user.isSuperAdmin) {
        const newPayload: JwtPayload = {
          sub: user.id,
          email: user.email,
          isSuperAdmin: true,
        };
        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            isSuperAdmin: true,
          },
        };
      }

      if (!payload.tenantId) {
        throw new UnauthorizedException('Invalid token');
      }

      const tenantUser = await this.prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: payload.tenantId,
            userId: user.id,
          },
        },
        include: {
          tenant: true,
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
        throw new UnauthorizedException('Invalid token');
      }

      const permissions = tenantUser.roles.flatMap((tur) =>
        tur.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
      );

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: tenantUser.tenantId,
        isSuperAdmin: false,
        roles: tenantUser.roles.map((tur) => tur.role.slug),
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          isSuperAdmin: false,
          tenantId: tenantUser.tenantId,
          roles: tenantUser.roles.map((tur) => tur.role.slug),
          permissions,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
