import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verificarTokenJWT } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas de API liberadas de autenticação
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const usuario = token ? await verificarTokenJWT(token) : null;

  // Se o usuário já estiver logado e tentar acessar a página de login, redireciona para a raiz
  if (pathname === "/login") {
    if (usuario) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Se não estiver autenticado:
  if (!usuario) {
    // Para rotas de API protegidas, responde com HTTP 401 Unauthorized
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    // Para páginas protegidas, redireciona para /login
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico, outros arquivos públicos
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

