import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/data-source";
import { Usuario } from "@/entities/Usuario";
import { compararSenha, criarTokenJWT, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validacao = loginSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 400 }
      );
    }

    const { email, senha } = validacao.data;
    const dataSource = await getDataSource();
    const usuarioRepo = dataSource.getRepository(Usuario);

    const usuario = await usuarioRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Se o usuário não existe, retorne mensagem genérica
    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const senhaCorreta = await compararSenha(senha, usuario.senhaHash);

    // Se a senha estiver incorreta, retorne a mesma mensagem genérica
    if (!senhaCorreta) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Gera o token JWT com expiração de 8h
    const token = await criarTokenJWT({
      id: usuario.id,
      email: usuario.email,
    });

    const response = NextResponse.json({
      message: "Login realizado com sucesso",
      usuario: {
        id: usuario.id,
        email: usuario.email,
      },
    });

    // Define o cookie httpOnly e sameSite: lax
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Erro na rota de login:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno no servidor" },
      { status: 500 }
    );
  }
}

