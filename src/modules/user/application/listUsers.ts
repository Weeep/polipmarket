import { User } from "../domain/User";
import { UserRepository } from "../infrastructure/UserRepository";

export async function listUsers(): Promise<User[]> {
  const repo = new UserRepository();
  return repo.findAll();
}
