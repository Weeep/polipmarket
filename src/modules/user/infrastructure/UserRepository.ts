import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { User } from "../domain/User";
import { userMapper } from "./userMapper";

export class UserRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? userMapper.toDomain(user) : null;
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map(userMapper.toDomain);
  }

  async create(user: User): Promise<User> {
    const data = user.toPrimitives();
    delete (data as any).id;

    const created = await this.prisma.user.create({ data });
    return userMapper.toDomain(created);
  }
}
