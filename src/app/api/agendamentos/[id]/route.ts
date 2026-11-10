import { NextRequest, NextResponse } from "next/server";
import { validarSessaoRouteHandler } from "@/lib/auth";
import { AgendamentoService } from "@/services/agendamento.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agendamentos/[id]
 * Retorna os detalhes de um agendamento específico.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const sessao = await validarSessaoRouteHandler();
  if (!sessao) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Faça login para continuar." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero)) {
      return NextResponse.json(
        { error: "Identificador de agendamento inválido." },
        { status: 400 }
      );
    }

    const agendamento = await AgendamentoService.buscarPorId(idNumero);

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error("Erro interno ao buscar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar o agendamento." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agendamentos/[id]
 * Edita o agendamento em transação, checando conflito sem considerar o próprio ID.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const sessao = await validarSessaoRouteHandler();
  if (!sessao) {
    return NextResponse.json(
      { error: "Acesso não autorizado. Faça login para continuar." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const idNumero = parseInt(id, 10);

    if (isNaN(idNumero)) {
      return NextResponse.json(
        { error: "Identificador de agendamento inválido." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const atualizado = await AgendamentoService.atualizar(idNumero, body);

    return NextResponse.json(atualizado);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "";

    if (mensagem.startsWith("NOT_FOUND:")) {
      return NextResponse.json(
        { error: mensagem.replace("NOT_FOUND: ", "") },
        { status: 404 }
      );
    }

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

    console.error("Erro interno ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar o agendamento." },
      { status: 500 }
    );
  }
}
