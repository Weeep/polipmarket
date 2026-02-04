import { prisma } from "@/lib/prisma";
import { User } from "../domain/User";
import { UserRepository } from "../infrastructure/UserRepository";

type Input = {
  email: string;
  name?: string;
};

export async function createFakeUser(input: Input) {
  return prisma.$transaction(async (tx) => {
    const userEntity = User.create({
      email: input.email,
      name: input.name,
    });

    const userRepo = new UserRepository(tx as any);
    const user = await userRepo.create(userEntity);

    await tx.wallet.create({
      data: {
        userId: user.id,
        balance: 1000,
        locked: 0,
      },
    });

    return user;
  });
}
