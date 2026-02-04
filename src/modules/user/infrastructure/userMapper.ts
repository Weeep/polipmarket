import { User } from "../domain/User";
import { UserRole } from "../domain/UserRole";

export const userMapper = {
  toDomain(raw: any): User {
    return User.fromPersistence({
      id: raw.id,
      email: raw.email,
      name: raw.name,
      image: raw.image,
      role: raw.role as UserRole,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  },

  toPersistence(user: User) {
    return user.toPrimitives();
  },
};
