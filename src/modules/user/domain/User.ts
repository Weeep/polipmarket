import { UserRole } from "./UserRole";

export type UserProps = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserProps = {
  email: string;
  name?: string;
  image?: string | null;
  role?: UserRole;
};

export class User {
  private constructor(private readonly props: UserProps) {}

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  static create(input: CreateUserProps): User {
    const now = new Date();

    return new User({
      id: "", // Prisma fogja generálni
      email: input.email,
      name: input.name,
      image: input.image ?? null,
      role: input.role ?? UserRole.USER,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  get name() {
    return this.props.name;
  }

  get role() {
    return this.props.role;
  }

  isAdmin() {
    return this.props.role === UserRole.ADMIN;
  }

  toPrimitives() {
    return { ...this.props };
  }
}
