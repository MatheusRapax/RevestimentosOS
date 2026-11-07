// Catálogo de permissões: o texto que o usuário da loja lê na tela de Papéis e Acessos.
// Fonte ÚNICA: as duas telas de papéis (loja e Super Admin) recebem estes campos junto de cada permissão.
// Um teste (`permission-catalog.spec.ts`) garante que toda permissão nova entre aqui com texto claro.

export type CategoriaPermissao =
  | 'vendas'
  | 'estoque'
  | 'compras'
  | 'entregas'
  | 'financeiro'
  | 'fiscal'
  | 'administracao'
  | 'antigas';

/**
 * Situação real da permissão hoje (levantada no código em 2026-11-06):
 * - ativa: controla o servidor e/ou a tela como descrito;
 * - so_tela: só esconde o item do menu; a API ainda não confere (deve ser ligada no servidor);
 * - sem_efeito: nada no sistema consulta esta permissão ainda;
 * - antiga: sobra do modelo de clínica (agenda, pacientes, prontuário...), sem uso na loja.
 */
export type SituacaoPermissao = 'ativa' | 'so_tela' | 'sem_efeito' | 'antiga';

export interface InfoPermissao {
  categoria: CategoriaPermissao;
  /** Assunto dentro da categoria (ex.: "Orçamentos"). */
  assunto: string;
  /** Nome curto, em linguagem de loja. */
  titulo: string;
  /** O que a pessoa consegue fazer com ela. */
  detalhe: string;
  /** Tela do menu que ela libera, quando existe. */
  tela?: string;
  /** Ação que mexe com dinheiro, estoque, nota fiscal, acessos ou apaga dados. */
  sensivel?: boolean;
  situacao: SituacaoPermissao;
}

export interface CategoriaInfo {
  id: CategoriaPermissao;
  titulo: string;
  descricao: string;
  ordem: number;
}

export const CATEGORIAS: CategoriaInfo[] = [
  {
    id: 'vendas',
    titulo: 'Vendas',
    descricao:
      'Clientes, arquitetos, orçamentos, pedidos e promoções: o dia a dia do vendedor.',
    ordem: 1,
  },
  {
    id: 'estoque',
    titulo: 'Estoque e produtos',
    descricao:
      'Catálogo de produtos, marcas, categorias, saldos e movimentações do estoque.',
    ordem: 2,
  },
  {
    id: 'compras',
    titulo: 'Compras',
    descricao: 'Fornecedores e pedidos de compra.',
    ordem: 3,
  },
  {
    id: 'entregas',
    titulo: 'Entregas e avarias',
    descricao: 'Expedição, entregas e ocorrências de avaria ou devolução.',
    ordem: 4,
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro e comissões',
    descricao:
      'Contas, cobranças, pagamentos e comissões de vendedores e arquitetos.',
    ordem: 5,
  },
  {
    id: 'fiscal',
    titulo: 'Nota fiscal',
    descricao: 'Emitir, cancelar e configurar a NF-e.',
    ordem: 6,
  },
  {
    id: 'administracao',
    titulo: 'Administração',
    descricao:
      'Usuários, papéis, configurações da loja, ambientes de venda e auditoria.',
    ordem: 7,
  },
  {
    id: 'antigas',
    titulo: 'Permissões antigas (sem uso na loja)',
    descricao:
      'Sobras do modelo de clínica. Não abrem nenhuma tela da loja; ficam guardadas só por segurança.',
    ordem: 8,
  },
];

type Extras = Partial<Pick<InfoPermissao, 'tela' | 'sensivel' | 'situacao'>>;
const p = (
  categoria: CategoriaPermissao,
  assunto: string,
  titulo: string,
  detalhe: string,
  extras: Extras = {},
): InfoPermissao => ({
  categoria,
  assunto,
  titulo,
  detalhe,
  situacao: 'ativa',
  ...extras,
});

const SEM = { situacao: 'sem_efeito' as const };
const TELA = { situacao: 'so_tela' as const };
const ANTIGA = { situacao: 'antiga' as const };

/** Cada chave do sistema, com o texto da tela. A ordem aqui é a ordem exibida. */
export const CATALOGO: Record<string, InfoPermissao> = {
  // ── Vendas ───────────────────────────────────────────────────────────────
  'customer.read': p(
    'vendas',
    'Clientes',
    'Ver clientes',
    'Abre a lista e a ficha dos clientes, com o resumo de compras.',
    { tela: 'Comercial › Clientes' },
  ),
  'customer.create': p(
    'vendas',
    'Clientes',
    'Cadastrar clientes',
    'Cria clientes novos.',
  ),
  'customer.update': p(
    'vendas',
    'Clientes',
    'Editar clientes',
    'Altera dados, endereço e dados fiscais do cliente.',
  ),
  'customer.delete': p(
    'vendas',
    'Clientes',
    'Excluir clientes',
    'Remove um cliente do cadastro.',
    { sensivel: true },
  ),

  'architect.read': p(
    'vendas',
    'Arquitetos',
    'Ver arquitetos',
    'Abre a lista e a ficha dos arquitetos parceiros.',
    { tela: 'Comercial › Arquitetos' },
  ),
  'architect.create': p(
    'vendas',
    'Arquitetos',
    'Cadastrar arquitetos',
    'Cria arquitetos parceiros novos.',
  ),
  'architect.update': p(
    'vendas',
    'Arquitetos',
    'Editar arquitetos',
    'Altera os dados do arquiteto.',
  ),
  'architect.delete': p(
    'vendas',
    'Arquitetos',
    'Excluir arquitetos',
    'Remove um arquiteto do cadastro.',
    { sensivel: true },
  ),

  'quote.read': p(
    'vendas',
    'Orçamentos',
    'Ver orçamentos',
    'Abre orçamentos, modelos de orçamento, o PDF e a disponibilidade em estoque.',
    { tela: 'Comercial › Orçamentos' },
  ),
  'quote.create': p(
    'vendas',
    'Orçamentos',
    'Criar orçamentos',
    'Cria um orçamento novo ou duplica um existente.',
  ),
  'quote.update': p(
    'vendas',
    'Orçamentos',
    'Editar orçamentos',
    'Altera itens e preços, atualiza preços, aprova, reserva estoque, rejeita e reabre.',
  ),
  'quote.send': p(
    'vendas',
    'Orçamentos',
    'Enviar orçamentos ao cliente',
    'Marca o orçamento como enviado.',
  ),
  'quote.convert': p(
    'vendas',
    'Orçamentos',
    'Converter orçamento em pedido',
    'Transforma um orçamento aprovado em pedido de venda.',
  ),
  'quote.delete': p(
    'vendas',
    'Orçamentos',
    'Excluir orçamentos',
    'Apaga um orçamento.',
    { sensivel: true },
  ),

  'order.read': p(
    'vendas',
    'Pedidos',
    'Ver pedidos',
    'Abre a lista de pedidos e os detalhes de cada um.',
    { tela: 'Comercial › Pedidos', ...TELA },
  ),
  'order.create': p(
    'vendas',
    'Pedidos',
    'Criar pedidos',
    'Cria pedidos de venda.',
    SEM,
  ),
  'order.update': p(
    'vendas',
    'Pedidos',
    'Atualizar pedidos',
    'Registra pagamento, separação, entrega e os demais andamentos do pedido.',
    SEM,
  ),
  'order.cancel': p(
    'vendas',
    'Pedidos',
    'Cancelar pedidos',
    'Cancela um pedido.',
    { sensivel: true, ...SEM },
  ),
  'order.confirm': p(
    'vendas',
    'Pedidos',
    'Confirmar pedidos',
    'Confirma um pedido de venda.',
    SEM,
  ),
  'sales.report.read': p(
    'vendas',
    'Relatórios',
    'Ver relatórios de vendas',
    'Abre relatórios de vendas.',
    SEM,
  ),

  'promotion.read': p(
    'vendas',
    'Promoções',
    'Ver promoções',
    'Abre a lista de campanhas e promoções.',
    { tela: 'Comercial › Promoções' },
  ),
  'promotion.create': p(
    'vendas',
    'Promoções',
    'Criar promoções',
    'Cria campanhas de promoção.',
  ),
  'promotion.update': p(
    'vendas',
    'Promoções',
    'Editar promoções',
    'Altera preço, período e produtos de uma promoção.',
  ),
  'promotion.delete': p(
    'vendas',
    'Promoções',
    'Excluir promoções',
    'Apaga uma promoção.',
    { sensivel: true },
  ),

  // ── Estoque e produtos ───────────────────────────────────────────────────
  'product.read': p(
    'estoque',
    'Produtos',
    'Ver catálogo de produtos',
    'Consulta produtos, preços por m² e disponibilidade (sem mostrar custo).',
    { tela: 'Comercial › Catálogo de Produtos' },
  ),
  'product.create': p(
    'estoque',
    'Produtos',
    'Cadastrar e importar produtos',
    'Cria produtos e importa planilhas de produtos.',
  ),
  'product.update': p(
    'estoque',
    'Produtos',
    'Editar produtos e dados fiscais',
    'Altera cadastro, preço e dados fiscais (NCM, origem) dos produtos.',
    { tela: 'Estoque & Logística › Produtos' },
  ),
  'product.delete': p(
    'estoque',
    'Produtos',
    'Excluir produtos',
    'Remove um produto do catálogo.',
    { sensivel: true },
  ),

  'brand.read': p(
    'estoque',
    'Marcas',
    'Ver marcas',
    'Consulta as marcas cadastradas.',
    SEM,
  ),
  'brand.create': p(
    'estoque',
    'Marcas',
    'Cadastrar marcas',
    'Cria marcas novas.',
    SEM,
  ),
  'brand.update': p(
    'estoque',
    'Marcas',
    'Editar marcas',
    'Altera o nome e o markup da marca.',
    SEM,
  ),
  'brand.delete': p(
    'estoque',
    'Marcas',
    'Excluir marcas',
    'Desativa uma marca.',
    { sensivel: true, ...SEM },
  ),
  'category.read': p(
    'estoque',
    'Categorias',
    'Ver categorias',
    'Consulta as categorias de produto.',
    SEM,
  ),
  'category.create': p(
    'estoque',
    'Categorias',
    'Cadastrar categorias',
    'Cria categorias novas.',
    SEM,
  ),
  'category.update': p(
    'estoque',
    'Categorias',
    'Editar categorias',
    'Altera o nome e o markup da categoria.',
    SEM,
  ),
  'category.delete': p(
    'estoque',
    'Categorias',
    'Excluir categorias',
    'Desativa uma categoria.',
    { sensivel: true, ...SEM },
  ),
  'catalogue.settings': p(
    'estoque',
    'Catálogo',
    'Configurar o catálogo',
    'Altera o markup global e as demais configurações de preço do catálogo.',
    { tela: 'Administração › Config. de Catálogo', sensivel: true },
  ),

  'stock.view': p(
    'estoque',
    'Saldos e movimentações',
    'Ver saldos e movimentações',
    'Abre a visão geral do estoque, o histórico de movimentações e os alertas.',
    { tela: 'Estoque & Logística › Visão Geral e Movimentações' },
  ),
  'stock.adjust': p(
    'estoque',
    'Saldos e movimentações',
    'Lançar entradas, saídas e ajustes',
    'Altera o saldo do estoque.',
    { sensivel: true },
  ),

  // ── Compras ──────────────────────────────────────────────────────────────
  'supplier.read': p(
    'compras',
    'Fornecedores',
    'Ver fornecedores',
    'Abre a lista e a ficha dos fornecedores.',
    { tela: 'Compras › Fornecedores', ...TELA },
  ),
  'supplier.create': p(
    'compras',
    'Fornecedores',
    'Cadastrar fornecedores',
    'Cria fornecedores novos.',
    SEM,
  ),
  'supplier.update': p(
    'compras',
    'Fornecedores',
    'Editar fornecedores',
    'Altera os dados do fornecedor.',
    SEM,
  ),
  'supplier.delete': p(
    'compras',
    'Fornecedores',
    'Excluir fornecedores',
    'Remove um fornecedor.',
    { sensivel: true, ...SEM },
  ),
  'purchase.read': p(
    'compras',
    'Pedidos de compra',
    'Ver pedidos de compra',
    'Abre os pedidos de compra e as entradas geradas por eles.',
    { tela: 'Compras › Pedidos de Compra', ...TELA },
  ),
  'purchase.create': p(
    'compras',
    'Pedidos de compra',
    'Criar pedidos de compra',
    'Cria pedidos de compra ao fornecedor.',
    SEM,
  ),
  'purchase.update': p(
    'compras',
    'Pedidos de compra',
    'Editar pedidos de compra',
    'Altera itens, envia e confirma o pedido de compra.',
    SEM,
  ),
  'purchase.cancel': p(
    'compras',
    'Pedidos de compra',
    'Cancelar pedidos de compra',
    'Cancela um pedido de compra.',
    { sensivel: true, ...SEM },
  ),

  // ── Entregas e avarias ───────────────────────────────────────────────────
  'delivery.read': p(
    'entregas',
    'Entregas',
    'Ver entregas',
    'Abre a expedição e os detalhes de cada entrega.',
    { tela: 'Estoque & Logística › Expedição / Entregas' },
  ),
  'delivery.create': p(
    'entregas',
    'Entregas',
    'Agendar entregas',
    'Cria uma entrega para um pedido.',
  ),
  'delivery.update': p(
    'entregas',
    'Entregas',
    'Atualizar entregas',
    'Muda o status e os dados da entrega.',
  ),
  'rma.read': p(
    'entregas',
    'Avarias e devoluções',
    'Ver avarias e devoluções',
    'Abre as ocorrências de avaria e devolução.',
    { tela: 'Estoque & Logística › Avarias (RMA)' },
  ),
  'rma.manage': p(
    'entregas',
    'Avarias e devoluções',
    'Registrar e tratar avarias',
    'Abre ocorrências e muda o andamento (reportar, resolver, reembolsar).',
  ),

  // ── Financeiro e comissões ───────────────────────────────────────────────
  'finance.read': p(
    'financeiro',
    'Financeiro',
    'Ver o financeiro',
    'Abre a visão geral, as contas a pagar e as notas de serviço.',
    { tela: 'Financeiro › Visão Geral, Contas a Pagar e Notas de Serviço' },
  ),
  'finance.create': p(
    'financeiro',
    'Financeiro',
    'Criar lançamentos financeiros',
    'Cria lançamentos e despesas.',
    SEM,
  ),
  'finance.update': p(
    'financeiro',
    'Financeiro',
    'Editar lançamentos financeiros',
    'Altera lançamentos e despesas existentes.',
    SEM,
  ),
  'finance.charge': p(
    'financeiro',
    'Financeiro',
    'Gerar cobranças',
    'Gera cobranças e faturas.',
    { sensivel: true },
  ),
  'finance.payment': p(
    'financeiro',
    'Financeiro',
    'Registrar pagamentos',
    'Registra e dá baixa em pagamentos.',
    { sensivel: true },
  ),
  'commission.report.read': p(
    'financeiro',
    'Comissões',
    'Ver relatórios de comissão',
    'Abre as comissões de vendedores e de arquitetos.',
    { tela: 'Financeiro › Comissões Vendedores e Arquitetos' },
  ),
  'commission.read': p(
    'financeiro',
    'Comissões',
    'Ver regras de comissão',
    'Consulta as regras de comissão cadastradas.',
  ),
  'commission.manage': p(
    'financeiro',
    'Comissões',
    'Criar e alterar regras de comissão',
    'Define percentuais de comissão por perfil.',
    { tela: 'Administração › Regras de Comissão', sensivel: true },
  ),

  // ── Nota fiscal ──────────────────────────────────────────────────────────
  'fiscal.view': p(
    'fiscal',
    'Notas fiscais',
    'Baixar XML e DANFE',
    'Baixa o XML e o PDF (DANFE) das notas emitidas.',
  ),
  'fiscal.emit': p(
    'fiscal',
    'Notas fiscais',
    'Emitir notas fiscais',
    'Revisa e emite a NF-e do pedido e pede nova tentativa de uma nota que ficou esperando a SEFAZ.',
    { sensivel: true },
  ),
  'fiscal.cancel': p(
    'fiscal',
    'Notas fiscais',
    'Cancelar notas fiscais',
    'Pede à SEFAZ o cancelamento de uma nota autorizada.',
    { sensivel: true },
  ),
  'fiscal.config': p(
    'fiscal',
    'Configuração fiscal',
    'Configurar o módulo fiscal',
    'Certificado digital, dados do emitente, regras de emissão e ambiente.',
    { tela: 'Administração › Configuração Fiscal', sensivel: true },
  ),

  // ── Administração ────────────────────────────────────────────────────────
  PROFESSIONAL_MANAGE: p(
    'administracao',
    'Usuários',
    'Convidar e editar usuários',
    'Convida pessoas, edita o cadastro e ativa ou desativa usuários da loja.',
    { sensivel: true },
  ),
  PROFESSIONAL_READ: p(
    'administracao',
    'Usuários',
    'Ver a lista de usuários',
    'Consulta os usuários da loja.',
  ),
  'role.read': p(
    'administracao',
    'Papéis e acessos',
    'Ver papéis e acessos',
    'Abre a tela de papéis e a lista de usuários com o papel de cada um.',
    { tela: 'Administração › Papéis e Acessos' },
  ),
  'role.manage': p(
    'administracao',
    'Papéis e acessos',
    'Gerenciar papéis e usuários',
    'Cria papéis, muda as permissões de cada papel e troca o papel de um usuário.',
    { tela: 'Administração › Usuários', sensivel: true },
  ),
  'audit.read': p(
    'administracao',
    'Auditoria',
    'Ver a auditoria',
    'Abre o histórico de quem fez o quê no sistema.',
    { tela: 'Administração › Auditoria', ...TELA },
  ),
  'clinic.settings.manage': p(
    'administracao',
    'Configurações da loja',
    'Alterar configurações da loja',
    'Taxa de entrega padrão e modelos (templates) de orçamento.',
    {
      tela: 'Administração › Configurações Globais e Templates',
      sensivel: true,
    },
  ),
  'clinic.read': p(
    'administracao',
    'Configurações da loja',
    'Ver dados da loja',
    'Consulta os dados cadastrais da loja.',
    SEM,
  ),
  'clinic.update': p(
    'administracao',
    'Configurações da loja',
    'Editar dados da loja',
    'Altera os dados cadastrais da loja.',
    { sensivel: true, ...SEM },
  ),
  'clinic.delete': p(
    'administracao',
    'Configurações da loja',
    'Excluir a loja',
    'Remove a loja do sistema.',
    { sensivel: true, ...SEM },
  ),
  'environment.read': p(
    'administracao',
    'Ambientes de venda',
    'Ver ambientes de venda',
    'Abre os ambientes usados nos orçamentos (sala, cozinha...).',
    { tela: 'Administração › Ambientes' },
  ),
  'environment.create': p(
    'administracao',
    'Ambientes de venda',
    'Cadastrar ambientes',
    'Cria ambientes novos.',
  ),
  'environment.update': p(
    'administracao',
    'Ambientes de venda',
    'Editar ambientes',
    'Altera o nome do ambiente.',
  ),
  'environment.delete': p(
    'administracao',
    'Ambientes de venda',
    'Excluir ambientes',
    'Remove um ambiente (a exclusão é definitiva).',
    { sensivel: true },
  ),
  'user.read': p(
    'administracao',
    'Usuários (cadastro antigo)',
    'Ver usuários',
    'Substituída por “Ver a lista de usuários”.',
    SEM,
  ),
  'user.create': p(
    'administracao',
    'Usuários (cadastro antigo)',
    'Criar usuários',
    'Substituída por “Convidar e editar usuários”.',
    SEM,
  ),
  'user.update': p(
    'administracao',
    'Usuários (cadastro antigo)',
    'Editar usuários',
    'Substituída por “Convidar e editar usuários”.',
    SEM,
  ),
  'user.delete': p(
    'administracao',
    'Usuários (cadastro antigo)',
    'Remover usuários',
    'Substituída por “Convidar e editar usuários”.',
    { sensivel: true, ...SEM },
  ),
  'user.invite': p(
    'administracao',
    'Usuários (cadastro antigo)',
    'Convidar usuários',
    'Substituída por “Convidar e editar usuários”.',
    SEM,
  ),
  CLINIC_ADMIN: p(
    'administracao',
    'Configurações da loja',
    'Administrador da loja (acesso total antigo)',
    'Marca de administrador do modelo antigo.',
    { sensivel: true, ...SEM },
  ),

  // ── Antigas (clínica) ────────────────────────────────────────────────────
  'appointment.read': p(
    'antigas',
    'Agenda',
    'Ver agendamentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'appointment.create': p(
    'antigas',
    'Agenda',
    'Criar agendamentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'appointment.update': p(
    'antigas',
    'Agenda',
    'Editar agendamentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'appointment.delete': p(
    'antigas',
    'Agenda',
    'Excluir agendamentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'appointment.cancel': p(
    'antigas',
    'Agenda',
    'Cancelar agendamentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'appointment.checkin': p(
    'antigas',
    'Agenda',
    'Confirmar chegada',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'schedule.block': p(
    'antigas',
    'Agenda',
    'Bloquear horários',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'encounter.read': p(
    'antigas',
    'Atendimentos',
    'Ver atendimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'encounter.start': p(
    'antigas',
    'Atendimentos',
    'Iniciar atendimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'encounter.update': p(
    'antigas',
    'Atendimentos',
    'Editar atendimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'encounter.close': p(
    'antigas',
    'Atendimentos',
    'Finalizar atendimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'patient.read': p(
    'antigas',
    'Pacientes',
    'Ver pacientes',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'patient.create': p(
    'antigas',
    'Pacientes',
    'Cadastrar pacientes',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'patient.update': p(
    'antigas',
    'Pacientes',
    'Editar pacientes',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'patient.delete': p(
    'antigas',
    'Pacientes',
    'Excluir pacientes',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'record.read': p(
    'antigas',
    'Prontuários',
    'Ver prontuários',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'record.create': p(
    'antigas',
    'Prontuários',
    'Criar prontuários',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'record.update': p(
    'antigas',
    'Prontuários',
    'Editar prontuários',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'procedure.read': p(
    'antigas',
    'Procedimentos',
    'Ver procedimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'procedure.create': p(
    'antigas',
    'Procedimentos',
    'Criar procedimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'procedure.update': p(
    'antigas',
    'Procedimentos',
    'Editar procedimentos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'consumable.read': p(
    'antigas',
    'Consumíveis',
    'Ver consumíveis',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'consumable.add': p(
    'antigas',
    'Consumíveis',
    'Adicionar consumíveis',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'specialty.read': p(
    'antigas',
    'Especialidades',
    'Ver especialidades',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'specialty.create': p(
    'antigas',
    'Especialidades',
    'Criar especialidades',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'specialty.update': p(
    'antigas',
    'Especialidades',
    'Editar especialidades',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'specialty.delete': p(
    'antigas',
    'Especialidades',
    'Excluir especialidades',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'notice.read': p(
    'antigas',
    'Avisos',
    'Ver avisos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'notice.create': p(
    'antigas',
    'Avisos',
    'Criar avisos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'notice.update': p(
    'antigas',
    'Avisos',
    'Editar avisos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'notice.delete': p(
    'antigas',
    'Avisos',
    'Excluir avisos',
    'Do modelo de clínica.',
    ANTIGA,
  ),
  'stock.read': p(
    'antigas',
    'Estoque (antigo)',
    'Ver estoque (antigo)',
    'Substituída por “Ver saldos e movimentações”.',
    ANTIGA,
  ),
  'stock.create': p(
    'antigas',
    'Estoque (antigo)',
    'Criar itens de estoque (antigo)',
    'Substituída por “Lançar entradas, saídas e ajustes”.',
    ANTIGA,
  ),
  'stock.update': p(
    'antigas',
    'Estoque (antigo)',
    'Editar itens de estoque (antigo)',
    'Substituída por “Lançar entradas, saídas e ajustes”.',
    ANTIGA,
  ),
};

/** Permissão que o catálogo ainda não conhece (nova): aparece em "Outras", com a chave, até ser descrita. */
const DESCONHECIDA: InfoPermissao = {
  categoria: 'administracao',
  assunto: 'Outras',
  titulo: '',
  detalhe: '',
  situacao: 'ativa',
};

export interface PermissaoEnriquecida {
  categoria: CategoriaPermissao;
  categoriaTitulo: string;
  assunto: string;
  titulo: string;
  detalhe: string;
  tela: string | null;
  sensivel: boolean;
  situacao: SituacaoPermissao;
  /** false = permissão nova ainda sem texto no catálogo */
  descrita: boolean;
  ordem: number;
}

const ORDEM_CATEGORIA = new Map(CATEGORIAS.map((c) => [c.id, c.ordem]));
const TITULO_CATEGORIA = new Map(CATEGORIAS.map((c) => [c.id, c.titulo]));
const POSICAO = new Map(Object.keys(CATALOGO).map((k, i) => [k, i]));

/** Acrescenta os textos claros a uma permissão do banco ({ id, key, description }). */
export function enriquecerPermissao<
  T extends { key: string; description?: string | null },
>(perm: T): T & PermissaoEnriquecida {
  const info = CATALOGO[perm.key];
  const base = info ?? {
    ...DESCONHECIDA,
    titulo: perm.description || perm.key,
    detalhe: perm.description || '',
  };
  return {
    ...perm,
    categoria: base.categoria,
    categoriaTitulo: TITULO_CATEGORIA.get(base.categoria) ?? base.categoria,
    assunto: base.assunto,
    titulo: base.titulo,
    detalhe: base.detalhe,
    tela: base.tela ?? null,
    sensivel: Boolean(base.sensivel),
    situacao: base.situacao,
    descrita: Boolean(info),
    ordem:
      (ORDEM_CATEGORIA.get(base.categoria) ?? 99) * 1000 +
      (POSICAO.get(perm.key) ?? 999),
  };
}
