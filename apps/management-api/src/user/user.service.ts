import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, User, TenantUser } from '@ydm-platform/types';

@Injectable()
export class UserService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, tenantId?: string): Promise<User> {
    // Check if email exists
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
      },
    });

    // If tenantId provided, create tenant user
    if (tenantId) {
      await this.prisma.tenantUser.create({
        data: {
          tenantId,
          userId: user.id,
        },
      });
    }

    return user;
  }

  async findAll(tenantId?: string): Promise<User[]> {
    if (tenantId) {
      const tenantUsers = await this.prisma.tenantUser.findMany({
        where: { tenantId },
        include: { user: true },
      });
      return tenantUsers.map((tu) => tu.user);
    }
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async addToTenant(userId: string, tenantId: string): Promise<TenantUser> {
    const existing = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });
    if (existing) {
      throw new BadRequestException('User already in tenant');
    }

    return this.prisma.tenantUser.create({
      data: {
        tenantId,
        userId,
      },
      include: {
        user: true,
      },
    });
  }

  async removeFromTenant(userId: string, tenantId: string): Promise<void> {
    await this.prisma.tenantUser.delete({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });
  }
}
