import "reflect-metadata";
import fs from "fs";
import { AppDataSource } from "../lib/data-source";
import { Usuario } from "../entities/Usuario";
import { Agendamento } from "../entities/Agendamento";
import { gerarHashSenha } from "../lib/auth";

// Se o arquivo .env existir localmente, carrega as variáveis (útil ao rodar local sem Docker)
// No container Docker, as variáveis já vêm pré-injetadas pelo docker-compose.yml
if (fs.existsSync(".env")) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(".env");
    }
  } catch {
    // Ignora caso o arquivo não seja necessário ou variáveis já existam
  }
}

async function criarTabelasSeNaoExistirem() {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS \`usuarios\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`senhaHash\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS \`agendamentos\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`clinica\` VARCHAR(150) NOT NULL,
      \`animal\` VARCHAR(100) NOT NULL,
      \`tipoExame\` VARCHAR(100) NOT NULL,
      \`dataColeta\` DATETIME NOT NULL,
      \`status\` ENUM('Agendado', 'Coletado', 'Cancelado') NOT NULL DEFAULT 'Agendado',
      \`observacoes\` TEXT NULL,
      \`criadoEm\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`IDX_dataColeta\` (\`dataColeta\`),
      INDEX \`IDX_status\` (\`status\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function runSeed() {
  console.log("🌱 [Seed] Iniciando processo de seed...");

  const email = process.env.SEED_USER_EMAIL;
  const senha = process.env.SEED_USER_PASSWORD;

  if (!email || !senha) {
    throw new Error(
      "As variáveis SEED_USER_EMAIL e SEED_USER_PASSWORD devem estar obrigatoriamente definidas no arquivo .env"
    );
  }

  // Inicializa a conexão com o banco de dados
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Garante que as tabelas existam sem colisão de sincronização
  await criarTabelasSeNaoExistirem();

  const usuarioRepository = AppDataSource.getRepository(Usuario);
  const agendamentoRepository = AppDataSource.getRepository(Agendamento);

  // 1. Seed do Usuário Fixo
  const usuarioExistente = await usuarioRepository.findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (usuarioExistente) {
    console.log(`ℹ️ [Seed] Usuário já cadastrado no banco: ${email} (nenhum registro duplicado)`);
  } else {
    const senhaHash = await gerarHashSenha(senha);
    const novoUsuario = usuarioRepository.create({
      email: email.toLowerCase().trim(),
      senhaHash,
    });

    await usuarioRepository.save(novoUsuario);
    console.log(`✅ [Seed] Usuário criado com sucesso! E-mail: ${email}`);
  }

  // 2. Seed de Agendamentos de Demonstração
  const forcarReset = process.argv.includes("--reset") || process.env.SEED_RESET === "true";
  const totalAgendamentos = await agendamentoRepository.count();

  if (totalAgendamentos === 0 || forcarReset) {
    if (forcarReset && totalAgendamentos > 0) {
      console.log("🔄 [Seed] Reset solicitado: limpando agendamentos antigos...");
      await agendamentoRepository.clear();
    }

    console.log("🌱 [Seed] Populando agendamentos de exemplo realistas para paginação...");

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);

    const depoisDeAmanha = new Date();
    depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 2);

    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() + 3);

    const criarData = (base: Date, hora: number, minuto: number): Date => {
      const d = new Date(base);
      d.setHours(hora, minuto, 0, 0);
      return d;
    };

    const agendamentosExemplo = [
      // Dia 1 (Amanhã)
      agendamentoRepository.create({
        clinica: "Clínica Veterinária PetCare",
        animal: "Thor (Golden Retriever)",
        tipoExame: "Hemograma completo",
        dataColeta: criarData(amanha, 8, 30),
        status: "Agendado",
        observacoes: "Animal em jejum de 8 horas. Retirar com a Dra. Camila.",
      }),
      agendamentoRepository.create({
        clinica: "Hospital Veterinário São Francisco",
        animal: "Mia (Felino Siamês)",
        tipoExame: "Cultura e antibiograma",
        dataColeta: criarData(amanha, 9, 45),
        status: "Agendado",
        observacoes: "Amostra de secreção ótica refrigerada.",
      }),
      agendamentoRepository.create({
        clinica: "Centro Veterinário Amigo Fiel",
        animal: "Luke (Beagle)",
        tipoExame: "Perfil lipídico veterinário",
        dataColeta: criarData(amanha, 11, 0),
        status: "Agendado",
        observacoes: "Coleta pré-cirúrgica de rotina.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Vet Saúde",
        animal: "Bob (Poodle)",
        tipoExame: "Bioquímico hepático e renal",
        dataColeta: criarData(amanha, 13, 30),
        status: "Cancelado",
        observacoes: "Tutor remarcou para a próxima semana.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Bicho Mimado",
        animal: "Mel (Labrador Retriever)",
        tipoExame: "Urina tipo I e sedimento",
        dataColeta: criarData(amanha, 14, 15),
        status: "Agendado",
        observacoes: "Amostra colhida por cistocentese.",
      }),
      agendamentoRepository.create({
        clinica: "Hospital Veterinário 24h Santa Clara",
        animal: "Zeus (Rottweiler)",
        tipoExame: "Citologia aspirativa",
        dataColeta: criarData(amanha, 15, 30),
        status: "Coletado",
        observacoes: "Amostra de nódulo subcutâneo fixada em lâmina.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Pelos e Patas",
        animal: "Fred (Buldogue Francês)",
        tipoExame: "Painel hormonal T4 livre",
        dataColeta: criarData(amanha, 17, 0),
        status: "Agendado",
        observacoes: "Suspeita clínica de hipotireoidismo.",
      }),

      // Dia 2 (Depois de Amanhã)
      agendamentoRepository.create({
        clinica: "Centro de Diagnóstico Vet Vida",
        animal: "Nina (Gato SRD)",
        tipoExame: "PCR para hemoparasitas",
        dataColeta: criarData(depoisDeAmanha, 8, 45),
        status: "Agendado",
        observacoes: "Paciente com histórico de febre e apatia.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Cantinho dos Bichos",
        animal: "Simba (Spitz Alemão)",
        tipoExame: "Hemograma completo",
        dataColeta: criarData(depoisDeAmanha, 10, 0),
        status: "Agendado",
        observacoes: "Check-up preventivo anual.",
      }),
      agendamentoRepository.create({
        clinica: "Hospital Veterinário Bom Pastor",
        animal: "Luna (Pastor Alemão)",
        tipoExame: "Bioquímico hepático e renal",
        dataColeta: criarData(depoisDeAmanha, 11, 30),
        status: "Coletado",
        observacoes: "Acompanhamento renal pós-cirúrgico.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Estimação",
        animal: "Chico (Gato Persa)",
        tipoExame: "Urina tipo I e sedimento",
        dataColeta: criarData(depoisDeAmanha, 14, 0),
        status: "Cancelado",
        observacoes: "Paciente felino não compareceu ao atendimento.",
      }),
      agendamentoRepository.create({
        clinica: "Consultório Veterinário Dr. Patas",
        animal: "Pipoca (Maltês)",
        tipoExame: "Coprológico parasitológico",
        dataColeta: criarData(depoisDeAmanha, 16, 15),
        status: "Agendado",
        observacoes: "Amostra fresca para pesquisa de giárdia.",
      }),

      // Dia 3 (Em 3 dias)
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Planeta Animal",
        animal: "Bidu (Schnauzer)",
        tipoExame: "Histopatológico",
        dataColeta: criarData(tresDias, 9, 15),
        status: "Agendado",
        observacoes: "Biópsia de lesão cutânea fixada em formol 10%.",
      }),
      agendamentoRepository.create({
        clinica: "Policlínica Veterinária Central",
        animal: "Amora (Shih Tzu)",
        tipoExame: "Hemograma completo",
        dataColeta: criarData(tresDias, 11, 0),
        status: "Agendado",
        observacoes: "Avaliação pré-anestésica para profilaxia odontológica.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Veterinária Mundo Pet",
        animal: "Bella (Yorkshire Terrier)",
        tipoExame: "Cultura e antibiograma",
        dataColeta: criarData(tresDias, 15, 0),
        status: "Agendado",
        observacoes: "Coleta de lavado traqueal para antibiograma.",
      }),
    ];

    await agendamentoRepository.save(agendamentosExemplo);
    console.log(`✅ [Seed] ${agendamentosExemplo.length} agendamentos de exemplo criados com sucesso!`);
  } else {
    console.log(`ℹ️ [Seed] Tabela de agendamentos já contém ${totalAgendamentos} registros. (Use --reset para recriar)`);
  }

  await AppDataSource.destroy();
  console.log("🌱 [Seed] Seed finalizado com sucesso!");
}

runSeed().catch((error) => {
  console.error("❌ [Seed] Erro ao executar seed:", error);
  process.exit(1);
});
