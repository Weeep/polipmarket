export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
  }
}

export class ForbiddenUserActionError extends Error {
  constructor() {
    super("Forbidden user action");
  }
}
