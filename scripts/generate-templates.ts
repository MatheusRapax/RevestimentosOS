import * as XLSX from 'xlsx';

/**
 * Gera o Template Padrão Oficial de Importação de Produtos (16 colunas).
 * Marca e Preço de Venda são definidos fora da planilha (no sistema).
 * A coluna "Unidade de Medida" determina o comportamento de venda.
 *
 * Col  0: SKU
 * Col  1: Nome do Produto
 * Col  2: Unidade de Medida (M2 / UN / CX / ML / PC)
 * Col  3: Custo (R$)
 * Col  4: Formato
 * Col  5: Acabamento / Cor
 * Col  6: M2 por Caixa
 * Col  7: Peças por Caixa
 * Col  8: Caixas por Palete
 * Col  9: M2 por Palete
 * Col 10: Peso por Caixa (kg)
 * Col 11: Uso
 * Col 12: Linha / Coleção
 * Col 13: Largura (cm)
 * Col 14: Altura (cm)
 * Col 15: Profundidade (cm)
 */
function createUnifiedTemplate() {
  const header = [
    'SKU (Obrigatório)',                              // 0
    'Nome do Produto (Obrigatório)',                  // 1
    'Unidade de Medida (M2/UN/CX/ML/PC) (Obrigatório)', // 2
    'Custo (R$) (Obrigatório)',                       // 3
    'Formato (ex: 60x120)',                           // 4
    'Acabamento / Cor',                              // 5
    'M2 por Caixa',                                  // 6
    'Peças por Caixa',                               // 7
    'Caixas por Palete',                             // 8
    'M2 por Palete',                                 // 9
    'Peso por Caixa (kg)',                           // 10
    'Uso (ex: Piso, Parede, Externo)',               // 11
    'Linha / Coleção',                               // 12
    'Largura (cm)',                                  // 13
    'Altura (cm)',                                   // 14
    'Profundidade (cm)',                             // 15
  ];

  // Exemplo 1: Porcelanato (M2) — custo por m², sistema calcula custo da caixa
  const exampleM2 = [
    'REV-001',
    'Porcelanato Calacata Oro',
    'M2',
    '50,00',  // Custo por m². Sistema calcula: 50 × 2,16 m²/cx = R$ 108,00/cx
    '60x120',
    'Polido',
    '2,16',   // M2 por Caixa
    '3',      // Peças por Caixa
    '30',     // Caixas por Palete
    '64,80',  // M2 por Palete
    '28,5',   // Peso por Caixa (kg)
    'Piso Interno',
    'Mármore',
    '',       // Largura (não aplicável)
    '',
    '',
  ];

  // Exemplo 2: Torneira (Unitário)
  const exampleUN = [
    'MET-001',
    'Torneira Lavatório Bica Alta',
    'UN',
    '150,00', // Custo por unidade
    '',
    'Cromado',
    '',       // M2/Cx (não aplicável)
    '',
    '',
    '',
    '1,2',
    'Banheiro',
    'Metais',
    '15',
    '25',
    '5',
  ];

  // Exemplo 3: Piso em caixa (CX) — custo por caixa, M2/Cx informativo
  const exampleCX = [
    'PIS-001',
    'Piso Vinílico Click 4mm',
    'CX',
    '180,00', // Custo por caixa
    '18x122',
    'Carvalho Natural',
    '2,23',   // M2/Cx (informativo para orçamentos)
    '14',
    '40',
    '89,20',
    '12,0',
    'Piso Interno',
    'Vinílico',
    '',
    '',
    '',
  ];

  const instructions = [
    ['INSTRUÇÕES DE PREENCHIMENTO'],
    [''],
    ['UNIDADE DE MEDIDA — Valores aceitos:'],
    ['  M2   → Produto vendido por m² (ex: porcelanatos, pisos, revestimentos de parede)'],
    ['  UN   → Produto vendido por unidade (ex: torneiras, vasos sanitários, boxes)'],
    ['  CX   → Produto vendido por caixa (ex: pisos vinílicos, piso laminado)'],
    ['  ML   → Produto vendido por metro linear (ex: rodapés, perfis)'],
    ['  PC   → Produto vendido por peça (ex: espelhos, panelas de embutir)'],
    [''],
    ['CUSTO (R$):'],
    ['  → Se Unidade = M2 e "M2 por Caixa" estiver preenchido: informe o custo por m².'],
    ['    O sistema calculará automaticamente o custo da caixa (custo/m² × M2/Caixa).'],
    ['  → Para todos os outros tipos (UN, CX, etc.): informe o custo unitário/por caixa.'],
    [''],
    ['PREÇO DE VENDA:'],
    ['  → Não é informado aqui. O sistema calcula o preço de venda automaticamente'],
    ['    usando o motor de Markup configurado na Marca ou Categoria do produto.'],
    [''],
    ['MARCA:'],
    ['  → Não é informada aqui. A marca é selecionada no formulário de importação,'],
    ['    antes do upload do arquivo, e é aplicada a todos os produtos da planilha.'],
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.aoa_to_sheet([header, exampleM2, exampleUN, exampleCX]);
  wsData['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 35 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 26 },
    { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Produtos');

  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instruções');

  XLSX.writeFile(wb, 'Template_Importacao_Produtos.xlsx');
  console.log('✅ Template gerado: Template_Importacao_Produtos.xlsx');
}

createUnifiedTemplate();
