'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  NCM_SUGESTOES,
  NcmResultado,
  buscarNcm,
  consultarNcm,
  formatNcm,
} from '@/lib/fiscal-labels';

interface NcmPickerProps {
  /** NCM atual (8 dígitos) ou '' */
  value: string;
  onChange: (ncm: string) => void;
}

/**
 * Escolha do NCM sem digitar código de cabeça: atalhos de revestimentos, busca por
 * nome na tabela oficial e, se o contador passou o número, digitação dos 8 dígitos
 * (conferida na tabela oficial).
 */
export function NcmPicker({ value, onChange }: NcmPickerProps) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<NcmResultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [descricao, setDescricao] = useState<string | null>(null);
  const [naoExiste, setNaoExiste] = useState(false);
  const seq = useRef(0);

  // descrição oficial do código escolhido
  useEffect(() => {
    setNaoExiste(false);
    if (!/^\d{8}$/.test(value)) {
      setDescricao(null);
      return;
    }
    const atalho = NCM_SUGESTOES.find((s) => s.codigo === value);
    setDescricao(atalho?.nome ?? null);
    let vivo = true;
    consultarNcm(value).then((r) => {
      if (!vivo) return;
      if (r) setDescricao((atual) => atual ?? r.descricao);
    });
    return () => {
      vivo = false;
    };
  }, [value]);

  // busca (por nome) ou conferência (8 dígitos) do que foi digitado
  useEffect(() => {
    const termo = texto.trim();
    const minha = ++seq.current;
    setNaoExiste(false);
    if (termo.length < 3) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      const somenteDigitos = termo.replace(/\D/g, '');
      if (/^[\d.\s]+$/.test(termo) && somenteDigitos.length === 8) {
        const r = await consultarNcm(somenteDigitos);
        if (minha !== seq.current) return;
        setResultados(r ? [r] : []);
        setNaoExiste(!r);
      } else {
        const lista = await buscarNcm(termo);
        if (minha !== seq.current) return;
        setResultados(lista);
      }
      setBuscando(false);
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  const escolher = (codigo: string, desc?: string) => {
    onChange(codigo);
    if (desc) setDescricao(desc);
    setTexto('');
    setResultados([]);
  };

  const mostrandoLista = texto.trim().length >= 3;

  return (
    <div className="space-y-2">
      {/\d{8}/.test(value) && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-900">
              Classificação escolhida: <span className="font-mono">{formatNcm(value)}</span>
            </p>
            {descricao && <p className="text-xs text-green-800">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-green-700 hover:text-green-900"
            aria-label="Trocar classificação"
            title="Trocar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!/\d{8}/.test(value) && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-8"
              placeholder="Buscar pelo nome (ex.: cimento) ou digitar o NCM do contador"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            {buscando && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>

          {mostrandoLista ? (
            <div className="max-h-48 overflow-y-auto rounded-md border bg-white">
              {resultados.map((r) => (
                <button
                  key={r.codigo}
                  type="button"
                  onClick={() => escolher(r.codigo, r.descricao)}
                  className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                >
                  <span className="shrink-0 font-mono text-xs text-slate-500">{formatNcm(r.codigo)}</span>
                  <span className="text-slate-800">{r.descricao}</span>
                </button>
              ))}
              {!buscando && resultados.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {naoExiste
                    ? 'Esse NCM não existe na tabela oficial. Confira o número com o contador.'
                    : 'Nada encontrado com esse nome. A tabela oficial usa termos técnicos; tente os atalhos abaixo ou peça o NCM ao contador.'}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-1 text-xs text-slate-500">Atalhos comuns de revestimento:</p>
              <div className="max-h-48 overflow-y-auto rounded-md border bg-white">
                {NCM_SUGESTOES.map((s) => (
                  <button
                    key={s.codigo}
                    type="button"
                    onClick={() => escolher(s.codigo, s.nome)}
                    className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="shrink-0 font-mono text-xs text-slate-500">{formatNcm(s.codigo)}</span>
                    <span className="text-slate-800">{s.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
