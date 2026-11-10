import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "vet_auth_token";
export const TOKEN_EXPIRATION = "8h";
export const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 horas em segundos

export interface TokenPayload {
  id: number;
  email: string;
}

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "default_dev_secret_key_change_in_production_min_32_chars";
  return new TextEncoder().encode(secret);
}

/**
 * Cria um JWT assinado usando jose com expiração de 8 horas.
 */
export async function criarTokenJWT(payload: TokenPayload): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({ id: payload.id, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(secretKey);
}

/**
 * Verifica e decodifica o JWT usando jose.
 * Retorna o payload se válido ou null se inválido/expirado.
 */
export async function verificarTokenJWT(token: string): Promise<TokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (typeof payload.id === "number" && typeof payload.email === "string") {
      return {
        id: payload.id,
        email: payload.email,
      };
    }

    return null;
  } catch {
    return null;
  }
}

