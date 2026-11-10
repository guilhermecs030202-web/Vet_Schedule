import { NextResponse } from "next/server";
import { obterSessaoServidor } from "@/lib/auth";

export async function GET() {
  const sessao = await obterSessaoServidor();

  if (!sessao) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    usuario: sessao,
  });
}

