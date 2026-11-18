import bcrypt from "bcryptjs";

// Password hashing, kept free of request-scoped imports so it is unit-testable.
export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
