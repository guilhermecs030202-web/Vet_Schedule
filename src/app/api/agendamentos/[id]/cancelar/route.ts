import { NextRequest, NextResponse } from "next/server";
import { validarSessaoRouteHandler } from "@/lib/auth";
import { AgendamentoService } from "@/services/agendamento.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/agendamentos/[id]/cancelar
 * Muda o status do agendamento para 'Cancelado'.
 * Regras:
 * 1. Nunca remove o registro do banco.
 * 2. Bloqueia cancelamento se já estiver com status Cancelado (HTTP 400).
 */
export async function PATCH(
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

    const cancelado = await AgendamentoService.cancelar(idNumero);

    return NextResponse.json({
      message: "Agendamento cancelado com sucesso.",
      agendamento: cancelado,
    });
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

    console.error("Erro interno ao cancelar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o cancelamento do agendamento." },
      { status: 500 }
    );
  }
}
