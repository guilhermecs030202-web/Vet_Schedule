import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { COOKIE_NAME, verificarTokenJWT, TokenPayload } from "./jwt";

const SALT_ROUNDS = 10;

/**
 * Gera o hash da senha usando bcryptjs.
 */
export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

/**
 * Compara uma senha em texto claro com o hash do banco.
 */
export async function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Obtém e valida o payload da sessão a partir dos cookies da requisição no servidor.
 */
export async function obterSessaoServidor(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verificarTokenJWT(token);
}

/**
 * Revalida a sessão no servidor para ser utilizada dentro de Route Handlers.
 * Retorna o payload do usuário ou null se não autenticado.
 */
export async function validarSessaoRouteHandler(): Promise<TokenPayload | null> {
  return obterSessaoServidor();
}

export * from "./jwt";
