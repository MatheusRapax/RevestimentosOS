import * as XLSX from 'xlsx';
import * as fs from 'fs';

function createTemplates() {
  // Planilha de M2
  const m2Header = [
    'SKU (Obrigatório)',
    'Nome do Produto (Obrigatório)',
    'Marca (Obrigatório)',
    'Custo (R$) (Obrigatório)',
    'M2 por Caixa (Obrigatório)',
    'Peças por Caixa',
    'Caixas por Palete',
    'Peso por Caixa (kg)',
    'Formato (ex: 60x120)',
    'Linha',
    'Uso (ex: Piso, Parede)',
  ];

  const m2Example = [
    'REV-123',
    'Porcelanato Calacata',
    'Castelli',
    '45,00',
    '2,40',
    '4',
    '32',
    '32,5',
    '60x120',
    'Premium',
    'Piso Interno',
  ];

  const wbM2 = XLSX.utils.book_new();
  const wsM2 = XLSX.utils.aoa_to_sheet([m2Header, m2Example]);
  wsM2['!cols'] = m2Header.map(h => ({ wch: Math.max(h.length, 15) }));
  XLSX.utils.book_append_sheet(wbM2, wsM2, 'Produtos_M2');
  XLSX.writeFile(wbM2, 'Template_Importacao_Produtos_M2.xlsx');


  // Planilha de Unidade
  const unHeader = [
    'SKU (Obrigatório)',
    'Nome do Produto (Obrigatório)',
    'Marca (Obrigatório)',
    'Custo (R$) (Obrigatório)',
    'Unidade de Medida (UN, CX, ML, PC)',
    'Peso Bruto (kg)',
    'Largura (cm)',
    'Altura (cm)',
    'Profundidade (cm)',
    'Cor',
  ];

  const unExample = [
    'TOR-456',
    'Torneira Lavatório Bica Alta',
    'Deca',
    '120,00',
    'UN',
    '1,2',
    '5,0',
    '25,0',
    '15,0',
    'Cromado',
  ];

  const wbUn = XLSX.utils.book_new();
  const wsUn = XLSX.utils.aoa_to_sheet([unHeader, unExample]);
  wsUn['!cols'] = unHeader.map(h => ({ wch: Math.max(h.length, 15) }));
  XLSX.utils.book_append_sheet(wbUn, wsUn, 'Produtos_Unidade');
  XLSX.writeFile(wbUn, 'Template_Importacao_Produtos_Unidade.xlsx');

  console.log('Templates criados com sucesso!');
}

createTemplates();
