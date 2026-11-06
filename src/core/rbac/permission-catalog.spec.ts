import * as fs from 'fs';
import * as path from 'path';
import { PERMISSIONS } from './permissions';
import {
  CATALOGO,
  CATEGORIAS,
  enriquecerPermissao,
} from './permission-catalog';

// Chaves semeadas no banco (prisma/seed.ts): linhas do tipo { key: 'x.y', description: '...' }
const seed = fs.readFileSync(
  path.join(__dirname, '../../../prisma/seed.ts'),
  'utf8',
);
const chavesDoSeed = [
  ...new Set(
    [...seed.matchAll(/\{\s*key:\s*'([^']+)',\s*description:/g)].map(
      (m) => m[1],
    ),
  ),
];

const TERMOS_DE_CLINICA =
  /pacient|cl[ií]nica|prontu[aá]ri|atendimento|consult[oó]rio|especialidade|procedimento/i;

describe('catálogo de permissões', () => {
  it('toda permissão do sistema tem texto no catálogo (as do código e as do seed)', () => {
    const doCodigo = Object.values(PERMISSIONS) as string[];
    const faltando = [...new Set([...doCodigo, ...chavesDoSeed])].filter(
      (k) => !CATALOGO[k],
    );
    expect(faltando).toEqual([]);
    expect(chavesDoSeed.length).toBeGreaterThan(80); // garante que o seed foi lido
  });

  it('todo item tem categoria existente, título e descrição preenchidos', () => {
    const categorias = new Set(CATEGORIAS.map((c) => c.id));
    for (const [chave, info] of Object.entries(CATALOGO)) {
      expect(categorias.has(info.categoria)).toBe(true);
      expect(info.titulo.trim()).not.toBe('');
      expect(info.detalhe.trim()).not.toBe('');
      expect(info.assunto.trim()).not.toBe('');
      if (info.sensivel !== undefined)
        expect(typeof info.sensivel).toBe('boolean');
      expect(chave).toBe(chave.trim());
    }
  });

  it('só as permissões "antigas" falam em clínica; as demais usam linguagem de loja', () => {
    for (const [chave, info] of Object.entries(CATALOGO)) {
      const texto = `${info.assunto} ${info.titulo} ${info.detalhe}`;
      if (info.situacao === 'antiga') {
        expect(info.categoria).toBe('antigas');
      } else {
        expect({ chave, ok: !TERMOS_DE_CLINICA.test(texto) }).toEqual({
          chave,
          ok: true,
        });
        expect(info.categoria).not.toBe('antigas');
      }
    }
  });

  it('verbos padronizados: nada de "Deletar" (usa "Excluir") nem "Realizar"', () => {
    for (const info of Object.values(CATALOGO)) {
      expect(info.titulo).not.toMatch(/^(Deletar|Realizar|Atualizar produtos)/);
    }
  });

  it('ações destrutivas ou de dinheiro/estoque/nota/acesso são marcadas como sensíveis', () => {
    for (const [chave, info] of Object.entries(CATALOGO)) {
      if (info.situacao === 'antiga') continue;
      if (/\.(delete|cancel)$/.test(chave)) expect(info.sensivel).toBe(true);
    }
    for (const chave of [
      'stock.adjust',
      'fiscal.config',
      'fiscal.emit',
      'fiscal.cancel',
      'role.manage',
      'PROFESSIONAL_MANAGE',
      'commission.manage',
      'finance.payment',
    ]) {
      expect(CATALOGO[chave].sensivel).toBe(true);
    }
  });

  it('as permissões que hoje não controlam nada (ou só escondem o menu) estão assinaladas', () => {
    // levantamento de 2026-11-06: quando uma delas passar a valer no servidor, mude a situação aqui
    for (const k of [
      'order.create',
      'order.update',
      'order.cancel',
      'purchase.create',
      'supplier.create',
      'brand.read',
      'category.update',
      'user.invite',
    ]) {
      expect(CATALOGO[k].situacao).toBe('sem_efeito');
    }
    for (const k of [
      'order.read',
      'purchase.read',
      'supplier.read',
      'audit.read',
    ]) {
      expect(CATALOGO[k].situacao).toBe('so_tela');
    }
  });

  describe('enriquecerPermissao', () => {
    it('acrescenta categoria, título e tela sem perder os campos originais', () => {
      const r = enriquecerPermissao({
        id: 'p1',
        key: 'fiscal.config',
        description: 'Configurar Módulo Fiscal',
      });
      expect(r.id).toBe('p1');
      expect(r.description).toBe('Configurar Módulo Fiscal');
      expect(r.categoriaTitulo).toBe('Nota fiscal');
      expect(r.titulo).toBe('Configurar o módulo fiscal');
      expect(r.tela).toBe('Administração › Configuração Fiscal');
      expect(r.sensivel).toBe(true);
      expect(r.descrita).toBe(true);
    });

    it('permissão nova sem texto aparece em Administração › Outras, com a descrição do banco', () => {
      const r = enriquecerPermissao({
        key: 'relatorio.exportar',
        description: 'Exportar relatórios',
      });
      expect(r.descrita).toBe(false);
      expect(r.assunto).toBe('Outras');
      expect(r.titulo).toBe('Exportar relatórios');
      expect(r.situacao).toBe('ativa');
    });

    it('ordena por categoria na ordem do catálogo', () => {
      const a = enriquecerPermissao({ key: 'customer.read' });
      const b = enriquecerPermissao({ key: 'stock.view' });
      const c = enriquecerPermissao({ key: 'fiscal.emit' });
      const d = enriquecerPermissao({ key: 'patient.read' });
      expect(a.ordem).toBeLessThan(b.ordem);
      expect(b.ordem).toBeLessThan(c.ordem);
      expect(c.ordem).toBeLessThan(d.ordem); // "antigas" por último
    });
  });
});
