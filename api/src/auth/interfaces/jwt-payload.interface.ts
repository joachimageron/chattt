export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}
