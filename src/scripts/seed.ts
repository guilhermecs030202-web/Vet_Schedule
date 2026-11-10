import "reflect-metadata";
import { AppDataSource } from "../lib/data-source";
import { Usuario } from "../entities/Usuario";
import { Agendamento } from "../entities/Agendamento";
import { gerarHashSenha } from "../lib/auth";

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

  // 2. Seed de Agendamentos de Demonstração (apenas se a tabela estiver vazia)
  const totalAgendamentos = await agendamentoRepository.count();

  if (totalAgendamentos === 0) {
    console.log("🌱 [Seed] Populando agendamentos de exemplo...");

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);

    const data1 = new Date(amanha);
    data1.setHours(9, 0, 0, 0);

    const data2 = new Date(amanha);
    data2.setHours(14, 0, 0, 0);

    const data3 = new Date(amanha);
    data3.setHours(16, 30, 0, 0);

    const agendamentosExemplo = [
      agendamentoRepository.create({
        clinica: "Clínica Veterinária PetCare",
        animal: "Thor (Golden Retriever)",
        tipoExame: "Hemograma completo",
        dataColeta: data1,
        status: "Agendado",
        observacoes: "Animal em jejum de 8 horas. Retirar com a Dra. Camila.",
      }),
      agendamentoRepository.create({
        clinica: "Hospital Veterinário São Francisco",
        animal: "Mia (Felino Siamês)",
        tipoExame: "Cultura e antibiograma",
        dataColeta: data2,
        status: "Agendado",
        observacoes: "Amostra de secreção ótica refrigerada.",
      }),
      agendamentoRepository.create({
        clinica: "Clínica Vet Saúde",
        animal: "Bob (Poodle)",
        tipoExame: "Bioquímico hepático e renal",
        dataColeta: data3,
        status: "Cancelado",
        observacoes: "Tutor remarcou para a próxima semana.",
      }),
    ];

    await agendamentoRepository.save(agendamentosExemplo);
    console.log(`✅ [Seed] ${agendamentosExemplo.length} agendamentos de exemplo criados!`);
  } else {
    console.log(`ℹ️ [Seed] Tabela de agendamentos já contém ${totalAgendamentos} registros.`);
  }

  await AppDataSource.destroy();
  console.log("🌱 [Seed] Seed finalizado com sucesso!");
}

runSeed().catch((error) => {
  console.error("❌ [Seed] Erro ao executar seed:", error);
  process.exit(1);
});
