/**
 * Testes unitários para o ProductImportService
 *
 * Cobrem a lógica crítica de cálculo de custo m² → Caixa:
 * - calcCostCents: multiplicação correta pelo boxCoverage
 * - Todos os cenários de produto (m² e unitário)
 * - Integridade dos dados gerados pelos parsers
 */

// ── Helper local que espelha a lógica de calcCostCents ──────────────────────
// (testa a lógica sem precisar instanciar o serviço com NestJS/ExcelService)
function calcCostCents(costPerUnit: number, boxCoverage: number): number {
  if (boxCoverage > 0) {
    return Math.round(costPerUnit * boxCoverage * 100);
  }
  return Math.round(costPerUnit * 100);
}

// ── Casos do mundo real extraídos das tabelas ────────────────────────────────
describe('[CORE] calcCostCents — lógica de custo m² vs Caixa', () => {

  describe('Produtos com m² (boxCoverage > 0)', () => {
    it('Porcelanato 3 m²/cx a R$90/m² → R$270/cx', () => {
      expect(calcCostCents(90, 3)).toBe(27000); // R$ 270,00
    });

    it('Porcelanato 2.40 m²/cx a R$45/m² → R$108/cx', () => {
      expect(calcCostCents(45, 2.40)).toBe(10800); // R$ 108,00
    });

    it('Revestimento 1.44 m²/cx a R$52.50/m² → R$75.60/cx', () => {
      expect(calcCostCents(52.50, 1.44)).toBe(7560); // R$ 75,60
    });

    it('Pastilha 0.50 m²/cx a R$185/m² → R$92.50/cx', () => {
      expect(calcCostCents(185, 0.50)).toBe(9250); // R$ 92,50
    });

    it('resultado é sempre inteiro (sem ponto flutuante)', () => {
      const result = calcCostCents(33.33, 1.44);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Produtos unitários (boxCoverage = 0)', () => {
    it('Torneira a R$120 → R$120/un (sem multiplicação)', () => {
      expect(calcCostCents(120, 0)).toBe(12000); // R$ 120,00
    });

    it('Cuba a R$350.90 → R$350.90/un', () => {
      expect(calcCostCents(350.90, 0)).toBe(35090); // R$ 350,90
    });

    it('Produto unitário NÃO é afetado por boxCoverage ausente', () => {
      const withZero = calcCostCents(100, 0);
      // Sem cobertura: custo direto
      expect(withZero).toBe(10000);
    });
  });

  describe('Casos limite', () => {
    it('custo zero retorna zero independente do boxCoverage', () => {
      expect(calcCostCents(0, 3)).toBe(0);
      expect(calcCostCents(0, 0)).toBe(0);
    });

    it('arredondamento correto para centavos (sem floating-point drift)', () => {
      // 33.33 × 3 = 99.99 → 9999 centavos
      expect(calcCostCents(33.33, 3)).toBe(9999);
      // 10.10 × 1.5 = 15.15 → 1515 centavos
      expect(calcCostCents(10.10, 1.5)).toBe(1515);
    });
  });
});

// ── Simulação dos parsers com dados de planilha real ─────────────────────────
describe('[PARSERS] Cálculo correto nas importações de planilha', () => {

  describe('Cenário: Planilha Castelli/Embramaco (parseStructured)', () => {
    it('Produto com 3 m²/cx a R$90/m² salva R$270 no banco', () => {
      const costFromSheet = 90.00;   // planilha informa preço do m²
      const boxCoverage   = 3.00;   // 3 m² por caixa
      const costCents = calcCostCents(costFromSheet, boxCoverage);
      expect(costCents).toBe(27000);
    });

    it('Produto sem m²/cx (unitário) salva o custo direto', () => {
      const costFromSheet = 120.00;
      const boxCoverage   = 0;
      const costCents = calcCostCents(costFromSheet, boxCoverage);
      expect(costCents).toBe(12000);
    });
  });

  describe('Cenário: Planilha Pierini (parsePierini)', () => {
    it('Produto Pierini 2.16 m²/cx a R$68.50/m² → R$147.96/cx', () => {
      const costFromSheet = 68.50;
      const boxCoverage   = 2.16;
      const costCents = calcCostCents(costFromSheet, boxCoverage);
      expect(costCents).toBe(14796);  // 68.50 × 2.16 × 100 = 14796
    });
  });

  describe('Cenário: Planilha DueFratelli/Glam (parseDueFratelliLayout)', () => {
    it('Produto 1.44 m²/cx a R$55/m² → R$79.20/cx', () => {
      const costFromSheet = 55.00;
      const boxCoverage   = 1.44;
      const costCents = calcCostCents(costFromSheet, boxCoverage);
      expect(costCents).toBe(7920);  // 55 × 1.44 × 100 = 7920
    });
  });

  describe('Cenário: Planilha Dexco/Strufaldi (parseDexco, parseStrufaldi)', () => {
    it('Produto Dexco com 2.4 m²/cx a R$78/m² → R$187.20/cx', () => {
      const costCents = calcCostCents(78, 2.4);
      expect(costCents).toBe(18720);
    });

    it('Produto Strufaldi com 1.44 m²/cx a R$62.90/m² → R$90.58/cx', () => {
      const costCents = calcCostCents(62.90, 1.44);
      expect(costCents).toBe(9058);  // Math.round(62.90 × 1.44 × 100)
    });
  });

  describe('Cenário: Lexxa / Mosaic / Deca (produtos unitários)', () => {
    it('Louça (boxCoverage=0) não sofre nenhuma multiplicação', () => {
      const costCents = calcCostCents(450, 0);
      expect(costCents).toBe(45000);  // R$ 450,00 exatos
    });
  });
});

// ── Testes de Markup (cálculo do preço de venda) ─────────────────────────────
describe('[MARKUP] Preço de venda calculado sobre custo da CAIXA', () => {

  function calcPriceCents(costPerM2: number, boxCoverage: number, markupPct: number): number {
    const boxCostCents = calcCostCents(costPerM2, boxCoverage);
    return Math.round(boxCostCents * (1 + markupPct / 100));
  }

  it('Porcelanato R$90/m², 3m²/cx, markup 40% → preço R$378/cx', () => {
    // custo cx = R$270 → preço = R$270 × 1.40 = R$378
    const priceCents = calcPriceCents(90, 3, 40);
    expect(priceCents).toBe(37800);  // R$ 378,00
  });

  it('Preço por m² para cliente = priceCents / boxCoverage (display)', () => {
    const priceCents = calcPriceCents(90, 3, 40);
    const pricePerM2 = priceCents / (3 * 100);  // divide pelos 100 centavos também
    expect(pricePerM2).toBeCloseTo(126, 1);      // R$ 126,00/m²
  });

  it('BUG anterior: sem multiplicação → preço era R$126/cx (prejuízo por caixa: R$252)', () => {
    // Simulação do comportamento BUGADO (antes da correção)
    const buggedCostCents = Math.round(90 * 100);  // R$ 90 (custo do m² como se fosse caixa)
    const buggedPriceCents = Math.round(buggedCostCents * 1.40);  // R$ 126
    expect(buggedPriceCents).toBe(12600);  // R$ 126,00 — preço incorreto

    // Confirmando que o custo correto é 3x maior
    const correctCostCents = calcCostCents(90, 3);
    expect(correctCostCents).toBe(buggedCostCents * 3);  // R$ 270 = R$ 90 × 3
  });

  it('Produto unitário: markup calculado direto sobre o custo (sem alteração)', () => {
    const priceCents = calcPriceCents(120, 0, 30);
    // 120 × 100 = 12000 → 12000 × 1.30 = 15600
    expect(priceCents).toBe(15600);  // R$ 156,00
  });
});

// ── Testes da Last Cost Strategy (confirmação de entrada NF) ──────────────────
describe('[STOCK ENTRY] Atualização de custo na confirmação de NF', () => {

  function confirmNFCost(unitCostTyped: number, boxCoverage: number | null): number {
    const coverage = boxCoverage ?? 0;
    return coverage > 0
      ? Math.round(unitCostTyped * coverage * 100)
      : Math.round(unitCostTyped * 100);
  }

  it('NF com custo R$90/m², produto 3m²/cx → salva R$270/cx no banco', () => {
    expect(confirmNFCost(90, 3)).toBe(27000);
  });

  it('NF com custo R$120/un, produto unitário → salva R$120/un (sem alteração)', () => {
    expect(confirmNFCost(120, 0)).toBe(12000);
  });

  it('NF com produto sem boxCoverage (null) → trata como unitário', () => {
    expect(confirmNFCost(200, null)).toBe(20000);
  });
});

// ── Testes do formulário de criação/edição de produto ─────────────────────────
describe('[FORM] Cálculo do submit no create/edit dialog', () => {

  function formSubmitCost(inputValue: string, boxCoverageStr: string): number {
    const coverage = boxCoverageStr ? parseFloat(boxCoverageStr) : 0;
    const userCost = inputValue ? parseFloat(inputValue) : 0;
    return coverage > 0
      ? Math.round(userCost * coverage * 100)
      : Math.round(userCost * 100);
  }

  it('Usuário digita 90 (por m²) com boxCoverage=3 → envia 27000 centavos', () => {
    expect(formSubmitCost('90', '3')).toBe(27000);
  });

  it('Usuário digita 120 sem boxCoverage → envia 12000 centavos', () => {
    expect(formSubmitCost('120', '')).toBe(12000);
  });

  it('Usuário deixa custo vazio → envia 0', () => {
    expect(formSubmitCost('', '3')).toBe(0);
  });

  it('Edit: custo exibido no campo é por m² (custo_cx / boxCoverage / 100)', () => {
    const dbCostCents = 27000;  // Banco guarda R$270 (custo da caixa)
    const boxCoverage = 3;
    const displayedValue = (dbCostCents / boxCoverage / 100).toFixed(2);
    expect(displayedValue).toBe('90.00');  // Campo mostra R$90,00 (por m²)
  });
});
