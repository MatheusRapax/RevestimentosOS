'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Permissão como a API devolve: os campos antigos mais o texto claro do catálogo. */
export interface PermissaoDaApi {
  id: string;
  key: string;
  description?: string | null;
  categoria?: string;
  categoriaTitulo?: string;
  assunto?: string;
  titulo?: string;
  detalhe?: string;
  tela?: string | null;
  sensivel?: boolean;
  situacao?: 'ativa' | 'so_tela' | 'sem_efeito' | 'antiga';
  descrita?: boolean;
  ordem?: number;
}

interface Props {
  permissoes: PermissaoDaApi[];
  /** Conjunto de identificadores marcados (use o mesmo `idDe` ao montar e ao salvar). */
  selecionadas: Set<string>;
  idDe: (p: PermissaoDaApi) => string;
  onAlterar: (ids: string[], marcar: boolean) => void;
}

const DESCRICAO_CATEGORIA: Record<string, string> = {
  vendas: 'Clientes, arquitetos, orçamentos, pedidos e promoções: o dia a dia do vendedor.',
  estoque: 'Catálogo de produtos, marcas, categorias, saldos e movimentações do estoque.',
  compras: 'Fornecedores e pedidos de compra.',
  entregas: 'Expedição, entregas e ocorrências de avaria ou devolução.',
  financeiro: 'Contas, cobranças, pagamentos e comissões de vendedores e arquitetos.',
  fiscal: 'Emitir, cancelar e configurar a NF-e.',
  administracao: 'Usuários, papéis, configurações da loja, ambientes de venda e auditoria.',
  antigas: 'Sobras do modelo de clínica. Não abrem nenhuma tela da loja; ficam guardadas só por segurança.',
};

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Grupo {
  id: string;
  titulo: string;
  itens: PermissaoDaApi[];
}

function agrupar(lista: PermissaoDaApi[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const p of lista) {
    const id = p.categoria ?? 'outras';
    if (!mapa.has(id)) mapa.set(id, { id, titulo: p.categoriaTitulo ?? 'Outras', itens: [] });
    mapa.get(id)!.itens.push(p);
  }
  const grupos = [...mapa.values()];
  grupos.forEach((g) => g.itens.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
  return grupos.sort((a, b) => (a.itens[0]?.ordem ?? 0) - (b.itens[0]?.ordem ?? 0));
}

/**
 * Seleção de permissões de um papel, em linguagem de loja: categorias com explicação, nome claro
 * de cada permissão, o que ela libera e qual tela abre. A chave técnica só aparece ao passar o mouse.
 */
export function PermissionPicker({ permissoes, selecionadas, idDe, onAlterar }: Props) {
  const [busca, setBusca] = useState('');

  const { principais, semEfeito, antigas } = useMemo(() => {
    const q = normalizar(busca.trim());
    const passa = (p: PermissaoDaApi) =>
      !q ||
      normalizar([p.titulo, p.detalhe, p.assunto, p.tela, p.categoriaTitulo, p.key, p.description].filter(Boolean).join(' ')).includes(q);
    const filtradas = permissoes.filter(passa);
    return {
      principais: agrupar(filtradas.filter((p) => p.situacao !== 'antiga' && p.situacao !== 'sem_efeito')),
      semEfeito: filtradas.filter((p) => p.situacao === 'sem_efeito'),
      antigas: filtradas.filter((p) => p.situacao === 'antiga'),
    };
  }, [permissoes, busca]);

  const marcadas = (lista: PermissaoDaApi[]) => lista.filter((p) => selecionadas.has(idDe(p))).length;

  const Linha = ({ p }: { p: PermissaoDaApi }) => {
    const id = idDe(p);
    const ligada = selecionadas.has(id);
    return (
      <label
        title={`Chave técnica: ${p.key}`}
        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
          ligada ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={ligada}
          onChange={() => onAlterar([id], !ligada)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-gray-900">{p.titulo || p.description || p.key}</span>
            {p.sensivel && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                <AlertTriangle className="h-3 w-3" /> Sensível
              </span>
            )}
            {p.situacao === 'so_tela' && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                Hoje só esconde a tela
              </span>
            )}
            {p.descrita === false && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-800">Nova</span>
            )}
          </div>
          {p.detalhe && <p className="mt-0.5 text-xs text-gray-600">{p.detalhe}</p>}
          {p.tela && <p className="mt-0.5 text-xs text-blue-700">Abre: {p.tela}</p>}
          {p.descrita === false && <p className="mt-0.5 font-mono text-[11px] text-gray-400">{p.key}</p>}
        </div>
      </label>
    );
  };

  const ListaPorAssunto = ({ itens }: { itens: PermissaoDaApi[] }) => {
    let atual = '';
    return (
      <div className="space-y-2">
        {itens.map((p) => {
          const cabecalho = p.assunto && p.assunto !== atual ? p.assunto : null;
          if (p.assunto) atual = p.assunto;
          return (
            <React.Fragment key={p.id}>
              {cabecalho && (
                <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{cabecalho}</p>
              )}
              <Linha p={p} />
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const Recolhida = ({ titulo, explicacao, lista }: { titulo: string; explicacao: string; lista: PermissaoDaApi[] }) => {
    if (lista.length === 0) return null;
    const n = marcadas(lista);
    return (
      <details className="rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-gray-700">
          <span>
            {titulo} <span className="font-normal text-gray-500">({lista.length})</span>
            {n > 0 && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">{n} marcada(s)</span>}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </summary>
        <div className="space-y-3 border-t border-dashed border-gray-300 p-3">
          <p className="text-xs text-gray-600">{explicacao}</p>
          <ListaPorAssunto itens={lista} />
        </div>
      </details>
    );
  };

  const nadaEncontrado = principais.length === 0 && semEfeito.length === 0 && antigas.length === 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar permissão (ex.: orçamento, nota fiscal, estoque)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <b>Sensível</b> marca o que mexe com dinheiro, estoque, nota fiscal ou acessos, ou que apaga dados.
          Dê só a quem precisa.
        </span>
      </p>

      {nadaEncontrado && <p className="py-6 text-center text-sm text-gray-500">Nenhuma permissão encontrada para “{busca}”.</p>}

      {principais.map((g) => {
        const ids = g.itens.map(idDe);
        const n = marcadas(g.itens);
        return (
          <section key={g.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{g.titulo}</h3>
                <p className="text-xs text-gray-500">{DESCRICAO_CATEGORIA[g.id] ?? ''}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  {n} de {g.itens.length}
                </span>
                <button type="button" className="text-blue-700 hover:underline" onClick={() => onAlterar(ids, true)}>
                  Marcar todas
                </button>
                <button type="button" className="text-gray-600 hover:underline" onClick={() => onAlterar(ids, false)}>
                  Limpar
                </button>
              </div>
            </div>
            <ListaPorAssunto itens={g.itens} />
          </section>
        );
      })}

      <Recolhida
        titulo="Permissões que ainda não controlam nada"
        explicacao="Existem no cadastro, mas o sistema ainda não consulta estas permissões: marcá-las ou não hoje não muda o que a pessoa consegue fazer. Serão ligadas em uma próxima versão."
        lista={semEfeito}
      />
      <Recolhida
        titulo="Permissões antigas (sem uso na loja)"
        explicacao={DESCRICAO_CATEGORIA.antigas}
        lista={antigas}
      />
    </div>
  );
}
