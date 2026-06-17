import * as XLSX from 'xlsx';
import * as fs from 'fs';

function createTemplates() {
  // Planilha de Padrão (Unificada)
  const header = [
    'SKU', // 0
    'Cod. Fornecedor', // 1
    'Nome do Produto (Obrigatório)', // 2
    'Formato (ex: 60x120)', // 3
    'Linha', // 4
    'Uso (ex: Piso, Parede)', // 5
    'Cor', // 6
    'Altura (cm)', // 7
    'Largura (cm)', // 8
    'Profundidade (cm)', // 9
    'Peças por Caixa', // 10
    'm² por Caixa', // 11
    'Peso por Caixa (kg)', // 12
    'Caixas por Palete', // 13
    'Custo por m² (R$)', // 14
    'Custo da Caixa ou Unidade (R$)', // 15
  ];

  const exampleM2 = [
    'REV-123',
    'F-123',
    'Porcelanato Calacata',
    '60x120',
    'Premium',
    'Piso Interno',
    'Branco',
    '',
    '',
    '',
    '4',
    '2,40',
    '32,5',
    '32',
    '50,00',   // Custo por m² (Sistema calculará 50 * 2,4 = 120,00 por caixa)
    '',        // Deixa vazio para auto-calcular
  ];

  const exampleUn = [
    'TOR-456',
    'T-456',
    'Torneira Lavatório Bica Alta',
    '',
    'Metais',
    'Banheiro',
    'Cromado',
    '25',
    '15',
    '5',
    '',
    '',
    '1,2',
    '',
    '',
    '150,00', // Custo da Unidade
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, exampleM2, exampleUn]);
  ws['!cols'] = header.map(h => ({ wch: Math.max(h.length, 15) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, 'Template_Importacao_Produtos.xlsx');
}

createTemplates();
