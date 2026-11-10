import { NextRequest, NextResponse } from "next/server";
import { validarSessaoRouteHandler } from "@/lib/auth";
import { AgendamentoService } from "@/services/agendamento.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/agendamentos
 * Lista agendamentos ordenados por dataColeta ASC com filtros opcionais (status e data).
 */
export async function GET(request: NextRequest) {
  const sessao = await validarSessaoRouteHandler();
  if (!sessao) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Faça login para continuar." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;
    const data = searchParams.get("data") || undefined;

    const agendamentos = await AgendamentoService.listar({ status, data });

    return NextResponse.json(agendamentos);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "";

    if (mensagem.startsWith("VALIDATION_ERROR:")) {
      return NextResponse.json(
        { error: mensagem.replace("VALIDATION_ERROR: ", "") },
        { status: 400 }
      );
    }

    console.error("Erro interno ao listar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a consulta de agendamentos." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agendamentos
 * Cria um agendamento com validação Zod e bloqueio de conflito (60 min) em transação.
 */
export async function POST(request: NextRequest) {
  const sessao = await validarSessaoRouteHandler();
  if (!sessao) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Faça login para continuar." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const novoAgendamento = await AgendamentoService.criar(body);

    return NextResponse.json(novoAgendamento, { status: 201 });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "";

    if (mensagem.startsWith("VALIDATION_ERROR:")) {
      return NextResponse.json(
        { error: mensagem.replace("VALIDATION_ERROR: ", "") },
        { status: 400 }
      );
    }

    if (mensagem.startsWith("CONFLICT:")) {
      return NextResponse.json(
        { error: mensagem.replace("CONFLICT: ", "") },
        { status: 409 }
      );
    }

    console.error("Erro interno ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a criação do agendamento." },
      { status: 500 }
    );
  }
}
