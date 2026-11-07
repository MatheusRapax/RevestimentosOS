# Funcionalidades e proteções do RevestimentosOS

Inventário **vivo** do que o sistema faz e de tudo que ele protege. É a fonte para a apresentação em
PowerPoint: nada que existe pode ficar de fora. **Toda feature ou proteção nova entra aqui no mesmo trabalho
em que é implementada** (junto com o Manual do Operador e, quando couber, um doc próprio).

Atualizado em: 2026-11-05 · Versão na `main`: 1.19.0 · Detalhes do manual: tela **Ajuda** do sistema.

**Legenda de status**
- ✅ **No ar** — já está na `main` (1.19.0).
- 🟡 **Pronto, aguardando merge** — implementado e testado em branch; entra na próxima versão.
- 🔜 **Planejado** — combinado, ainda não implementado (ver `docs/FISCAL-PENDENCIAS.md`).

---

## 1. Visão geral

ERP para **lojas de revestimentos** (porcelanato, argamassa, rejunte etc.): orçamento → pedido → pagamento →
separação → entrega → nota fiscal, com estoque, compras, financeiro, comissões e administração multiloja.
Cada loja (tenant) tem seus dados isolados, seus usuários, seus papéis e os módulos que contratou.

---

## 2. Funcionalidades por área

### Comercial
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Clientes | Cadastro com CPF/CNPJ, endereço e código IBGE; base da tributação | ✅ |
| Arquitetos | Cadastro de parceiros (base da comissão) | ✅ |
| Orçamentos | Itens por m² convertidos em caixas, atualizar preços, ambientes de venda, templates | ✅ |
| Orçamento — duplicar item | Copia um item da linha com um clique | ✅ |
| Orçamento — produto avulso no catálogo | Cria o produto real já na hora de orçar | ✅ |
| Orçamento — ocultar desconto na impressão | O cliente vê o preço final sem o desconto por item | ✅ |
| Orçamento — recálculo de markup | Preço acompanha mudança de markup | ✅ |
| Pedidos | Conversão do orçamento, pagamentos, separação, retirada/entrega | ✅ |
| Cada vendedor vê só as suas vendas | Orçamentos, pedidos, entregas, notas fiscais, avarias, painel e resumo do cliente mostram só o que o vendedor fez; a permissão “Ver as vendas de todos os vendedores” libera a equipe inteira | 🟡 |
| Transferir vendas entre vendedores | Passa orçamento e pedido (juntos) de um vendedor para outro, um a um ou o lote de um vendedor que saiu, com motivo, histórico e aviso quando a comissão de mês anterior muda de mãos (`docs/TRANSFERENCIA-DE-VENDAS.md`) | ✅ |
| Conta-corrente do cliente e boleto | Saldo do cliente e geração de boleto só para pedido não pago | ✅ |
| Catálogo de produtos (consulta de vendas) | Consulta para o vendedor, com preço por m², sem expor custo | ✅ |
| Promoções | Campanhas por produto com status e regra para promoções sobrepostas | ✅ |

### Nota fiscal (NF-e)
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Emissão com Revisão Fiscal | Conferência antes de ir para a SEFAZ; status atualiza sozinho; XML e DANFE (PDF) | ✅ |
| Perfil do Emitente por CNPJ | Lupa preenche razão social, endereço e IBGE a partir do CNPJ | ✅ |
| Certificado digital A1 | Instalação pela tela e selo “Certificado instalado” | ✅ |
| Perfil do Emitente como fonte da verdade | O cadastro fiscal da loja define o emitente; sincroniza com o serviço fiscal ao salvar | 🟡 |
| Conferência do certificado (SEFAZ) | Validade, CNPJ do certificado × emitente e alcance da SEFAZ, com alertas | 🟡 |
| Revisão em linguagem simples | Tipo de operação, impostos em reais, etiquetas Cliente/Produto/Empresa; códigos só em “detalhes fiscais” | 🟡 |
| Seletor de NCM | Atalhos de revestimento, busca na tabela oficial e conferência do número digitado | 🟡 |
| Cálculo automático de CFOP e impostos | Dentro/fora do estado e consumidor final decididos pelo cadastro, sem perguntar ao operador | ✅ (motor) · 🟡 (tela) |
| Cancelamento de NF-e pela tela | Justificativa de 15 a 255 caracteres; fica “cancelamento em andamento” até a SEFAZ confirmar; recusa por prazo mostra o motivo e a nota segue valendo | 🟡 |
| Nota que não se perde (SEFAZ fora do ar) | “Aguardando a SEFAZ” em andamento, emissão retomada sozinha, botão “Tentar novamente” | 🟡 |
| Conferência automática com o serviço fiscal | A cada 5 min o ERP confere o status das notas e corrige qualquer atualização perdida | 🟡 |
| Nota fiel ao pedido | Desconto, frete, observações, forma de pagamento real, origem do produto e IE do cliente vão na nota | 🟡 |
| Selo “Homologação — sem valor fiscal” | Nota de teste identificada na tela, com série e número guardados | 🟡 |
| Carta de correção, inutilização, contingência, NFC-e, ST | Recursos de ERP fiscal completo | 🔜 |

### Estoque & Logística
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Visão geral do estoque, lotes e reservas | Saldo, alocação por lote e reserva por pedido | ✅ |
| Produtos com custo médio móvel | Custo atualizado a cada entrada (`docs/CUSTO-MEDIO-ESTOQUE.md`) | ✅ |
| Preço de venda por markup | Marca > categoria > global (`docs/PRECIFICACAO-MARKUP.md`) | ✅ |
| Movimentações e entrada por nota | Importa a nota do fornecedor, aponta divergência, lança itens | ✅ |
| Entrada de estoque direto por produto | Entrada sem passar pela nota | ✅ |
| Avarias / RMA | Ocorrência, tratativa com o fornecedor, resolução ou reembolso | ✅ |
| Expedição / Entregas | Romaneio, status automático de entrega | ✅ |
| Importação de planilha de fornecedor | Mapeamento de colunas aprendido por fornecedor (Super Admin: “Mapping Cache IA”) | ✅ |

### Compras
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Fornecedores | Cadastro e histórico | ✅ |
| Pedidos de compra | Criar, enviar, confirmar e gerar a entrada de estoque | ✅ |

### Financeiro
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Dashboard financeiro | Faturamento e visão geral | ✅ |
| Contas a pagar | Despesas, vencimento, pagamento e atalho por compra | ✅ |
| Notas de serviço (tomadas) | Registro de notas de serviço recebidas | ✅ |
| Comissões | Regras por arquiteto/vendedor e relatórios | ✅ |

### Administração (por loja)
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Usuários | Criar usuários, atribuir papel | ✅ |
| Papéis e acessos | Permissões por papel (Administrador, Gerente, Estoquista, Vendedor) e papéis próprios | ✅ |
| Permissões em linguagem de loja | Áreas com explicação, nome claro, o que cada permissão libera, tela que abre, etiqueta “Sensível”, busca e marcar/limpar por área; as antigas de clínica e as sem efeito ficam recolhidas | 🟡 |
| Configurações globais | Taxa de entrega padrão e valores iniciais | ✅ |
| Auditoria | Histórico somente leitura de quem fez o quê | ✅ |
| Templates de orçamento e ambientes de venda | Padronização do orçamento | ✅ |
| Marcas, categorias e markup | Precificação com prioridade e recálculo dos produtos | ✅ |
| Regras de comissão | Percentuais por perfil | ✅ |
| Configuração fiscal da loja | Perfil, certificado, ambiente e regras de emissão | ✅ |
| Desativar/reativar usuário | Bloqueio efetivo de acesso | 🔜 (implementação parcial guardada, falta tela e testes) |

### Super Admin (plataforma)
Painel separado: **Lojas (tenants)**, **Usuários**, **Auditoria global**, **Papéis e permissões**,
**Mapping Cache IA** e **Fiscal (Global)** — para quem opera a plataforma, não a loja.

### Experiência de uso
| Funcionalidade | O que entrega | Status |
|---|---|---|
| Manual do Operador (tela Ajuda) | Passo a passo por módulo, busca e navegação lateral | ✅ |
| Novidades de versão | Janela “Novidades da Versão” na primeira entrada após cada versão nova | ✅ |
| Sessão que não cai no meio do trabalho | Renovação enquanto há uso; se expirar, login em janela sem perder a tela | ✅ |
| Exportação para Excel | Listas exportáveis (ex.: Pedidos) | ✅ |
| Responsividade | Telas ajustadas para tela pequena | ✅ |

---

## 3. Segurança e proteções

### 3.1 Acesso e isolamento
| Proteção | Como funciona | Status |
|---|---|---|
| Login com senha criptografada | Senhas guardadas com hash `bcrypt`, nunca em texto | ✅ |
| Token com validade e renovação | JWT de 8 h; renovado enquanto o usuário usa; reautenticação em janela (`docs/SESSAO-RENOVACAO-TOKEN.md`) | ✅ |
| Isolamento entre lojas (multiloja) | `TenantGuard` resolve a loja e confirma que o usuário pertence a ela antes de qualquer dado | ✅ |
| Permissões por papel | `PermissionsGuard` exige a permissão da ação; sem ela, “Acesso Restrito” | ✅ |
| Módulos por loja | `ModuleGuard`: a loja só acessa o que contratou (vendas, estoque, compras, financeiro, RMA, entregas, promoções, arquitetos, admin) | ✅ |
| Área Super Admin protegida | `SuperAdminGuard` separa operação da plataforma da operação da loja | ✅ |
| Usuário não altera o próprio papel | Evita elevar o próprio acesso | ✅ |
| Catálogo de permissões com teste | Toda permissão nova precisa de texto claro (o teste falha sem ele); permissão ativa não pode usar termo de clínica | 🟡 |
| Venda de outro vendedor não abre | Acessar orçamento, pedido, entrega ou nota de outro vendedor pelo endereço direto responde “não encontrado”, em todas as ações (ver, editar, aprovar, converter, cancelar) | 🟡 |
| Transferência de vendas só com permissão e com rastro | Exige `sales.transfer`; destino precisa ser usuário ativo com acesso a vendas; motivo obrigatório; tudo numa transação; histórico (`SalesTransfer`) e registro no orçamento; mês anterior exige confirmação | ✅ |
| Permissões sensíveis sinalizadas | Dinheiro, estoque, nota fiscal, acessos e exclusões aparecem marcados na hora de dar acesso | 🟡 |

### 3.2 Rastreabilidade
| Proteção | Como funciona | Status |
|---|---|---|
| Auditoria de ações | `AuditInterceptor` registra operações bem-sucedidas (quem, quando, o quê, dados enviados) | ✅ |
| Log enxuto em produção | Requisições só são logadas fora de produção | ✅ |

### 3.3 Entrada de dados e rede
| Proteção | Como funciona | Status |
|---|---|---|
| Validação estrita de entrada | `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`: campo desconhecido é recusado | ✅ |
| CORS restrito | Só as origens do sistema podem chamar a API | ✅ |
| Webhook fiscal assinado | `POST /fiscal/webhook` valida assinatura HMAC-SHA256 do corpo bruto | ✅ — **atenção:** ver pendência abaixo |

### 3.4 Emissão fiscal — proteções
| Proteção | Como funciona | Status |
|---|---|---|
| **Trava de homologação** | Nenhuma nota com valor fiscal sai fora de homologação: `FISCAL_ALLOW_PRODUCTION` ausente = bloqueado, aplicada em salvar configuração, emitir e setup | 🟡 |
| Pré-flight antes de emitir | Valida pedido, emitente, cliente, itens e totais antes de qualquer chamada externa | ✅ |
| Perfil do emitente completo | Sem CRT, endereço ou IBGE coerente com a UF, o setup e a sincronização são recusados | 🟡 |
| Sem valores padrão silenciosos | Nada de CRT “3”, UF “SP” ou município de São Paulo assumidos; falta de dado = bloqueio com instrução | 🟡 |
| Divergência de CNPJ barrada | Se o CNPJ do perfil não bate com o do tenant fiscal, nada é alterado; avisa que é preciso recriar | 🟡 |
| Divergência formulário × perfil barrada | Setup do certificado que contradiz o perfil é recusado | 🟡 |
| Alertas de certificado | Vencido, CNPJ diferente do emitente ou ambiente que não é homologação | 🟡 |
| Avisos de cadastro suspeito | IE “ISENTO” para quem vende mercadoria; logradouro com “/” | 🟡 |
| Operação nunca escolhida à mão | Dentro/fora do estado vem do cadastro; o operador não consegue forçar CFOP errado | 🟡 |
| Produto só com NCM e origem | Origem sem valor padrão, para não errar imposto por omissão | 🟡 |
| Códigos fiscais só para quem tem permissão | “Ver detalhes fiscais” exige `fiscal.config` | 🟡 |
| Deduplicação de emissão | O serviço fiscal deduplica por pedido; reenvio não gera segunda nota | ✅ |
| Webhook fiscal sem segredo fixo | Em produção o webhook exige segredo próprio (sem ele, recusa); assinatura comparada em tempo constante | 🟡 |
| Tributo que o serviço não emite bloqueia | CST/CSOSN fora da lista aceita pelo regime não é enviado: o operador vê a causa em vez de uma nota errada | 🟡 |
| Atualização atrasada não desfaz nada | Webhook ou consulta atrasada não reabre nota cancelada nem rebaixa nota autorizada | 🟡 |
| Cancelamento só com permissão | `fiscal.cancel` e escopo por loja; nada de cancelar nota de outra loja | 🟡 |
| Pagamento e total conferem | O total pago enviado é o do pedido (frete não é somado duas vezes); pagamento menor que o total avisa, **maior bloqueia** a emissão | 🟡 |

### 3.5 Pontos de atenção de segurança (a resolver antes de produção)
- **Segredo do webhook:** corrigido (em produção exige `FISCAL_WEBHOOK_SECRET` próprio e recusa o valor de exemplo). 🟡
  Antes de produção, **definir a variável no servidor** e cadastrar o mesmo segredo no webhook do NexosFiscal.
- **Permissões que só valem na tela:** pedidos, compras, fornecedores, despesas, catálogo e auditoria não conferem permissão
  no servidor (só o módulo da loja); 27 permissões não controlam nada hoje e 4 só escondem o menu. Levantamento e proposta em
  `docs/PERMISSOES.md`. Depende de decidir quem faz o quê por papel antes de ligar no servidor. 🔜
- **Alterar as configurações da loja** (`PATCH /settings`, ex.: taxa de entrega) hoje só exige o módulo
  Administração, sem permissão específica de papel. Correção pronta no stash `wip usuarios-desativar backend`
  (`clinic.settings.manage`); falta testar e mergear. 🔜
- Alíquotas fiscais do seed são genéricas e precisam de revisão do contador antes de nota real. 🔜
- Confirmação explícita ao ligar produção e registro de quem liberou. 🔜

---

## 4. Como manter este documento

1. Terminou uma feature ou proteção? Acrescente a linha na tabela certa, com o status.
2. Mergeou na `main`? Troque 🟡 por ✅.
3. Registre também no Manual do Operador (`clinicos-web/src/app/dashboard/ajuda/page.tsx`) e, se for grande, em
   um doc próprio em `docs/`.
4. Na hora de montar o PowerPoint (skill `apresentacao-pptx`), use as seções 2 e 3 como roteiro: cada área vira
   um bloco e a seção 3 vira o bloco “Segurança e confiabilidade”.
