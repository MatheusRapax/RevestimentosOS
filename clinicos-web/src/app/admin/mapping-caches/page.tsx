'use client';

import { useEffect, useState } from 'react';
import { Loader2, Eye, Trash2, X } from 'lucide-react';

interface MappingCache {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCnpj: string;
  headersHash: string;
  mappingPayload: Record<string, string | null>;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

interface GroupedCaches {
  clinic: { id: string; name: string; slug: string };
  caches: MappingCache[];
}

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  name: 'Nome/Descrição',
  cost: 'Custo',
  unit: 'Unidade',
  format: 'Formato',
  m2PerBox: 'M²/Caixa',
  piecesPerBox: 'Peças/Caixa',
  palletBoxes: 'Caixas/Pallet',
  weight: 'Peso',
  ncm: 'NCM',
  cest: 'CEST',
  cfop: 'CFOP',
  cst: 'CST',
  ean: 'EAN/Código de Barras',
  height: 'Altura',
  width: 'Largura',
  depth: 'Profundidade',
};

const ALL_FIELDS = Object.keys(FIELD_LABELS);

export default function MappingCachesPage() {
  const [groupedCaches, setGroupedCaches] = useState<GroupedCaches[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedCache, setSelectedCache] = useState<MappingCache | null>(null);
  const [editPayload, setEditPayload] = useState<Record<string, string | null>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchCaches = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/mapping-caches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar caches');
      const data = await res.json();
      setGroupedCaches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaches();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cache? Isso forçará a IA a remapear na próxima importação.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/mapping-caches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      
      // Remove from state
      setGroupedCaches((prev) => 
        prev.map(group => ({
          ...group,
          caches: group.caches.filter(c => c.id !== id)
        })).filter(group => group.caches.length > 0)
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenModal = (cache: MappingCache) => {
    setSelectedCache(cache);
    const initialPayload: Record<string, string | null> = {};
    ALL_FIELDS.forEach(field => {
      initialPayload[field] = cache.mappingPayload[field] || null;
    });
    setEditPayload(initialPayload);
  };

  const handleCloseModal = () => {
    setSelectedCache(null);
    setEditPayload({});
  };

  const handleSaveModal = async () => {
    if (!selectedCache) return;
    
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/mapping-caches/${selectedCache.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mappingPayload: editPayload }),
      });
      
      if (!res.ok) throw new Error('Falha ao salvar');
      
      handleCloseModal();
      await fetchCaches(); // refresh data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Mapping Cache</h1>
        <p className="text-sm text-slate-500">
          Gerencie como a IA mapeia planilhas para cada fornecedor por loja.
        </p>
      </div>

      {groupedCaches.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center text-slate-500">
          Nenhum cache encontrado.
        </div>
      ) : (
        <div className="space-y-8">
          {groupedCaches.map((group) => (
            <div key={group.clinic.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                <div>
                  <h2 className="font-semibold text-lg">{group.clinic.name}</h2>
                  <p className="text-xs text-slate-400">/{group.clinic.slug}</p>
                </div>
                <div className="text-xs font-medium bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                  {group.caches.length} cache(s)
                </div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {group.caches.map((cache) => (
                  <div key={cache.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-slate-800">{cache.supplierName}</h3>
                      <p className="text-sm text-slate-500">CNPJ: {cache.supplierCnpj || 'Não informado'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Atualizado em: {new Date(cache.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-500 mb-1">Confiança</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(cache.confidenceScore)}`}>
                          {(cache.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(cache)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleDelete(cache.id)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Drawer */}
      {selectedCache && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={handleCloseModal}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Editar Mapeamento</h2>
                <p className="text-sm text-slate-500">{selectedCache.supplierName}</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {ALL_FIELDS.map(field => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {FIELD_LABELS[field]}
                    </label>
                    <input
                      type="text"
                      value={editPayload[field] || ''}
                      onChange={(e) => setEditPayload(prev => ({ ...prev, [field]: e.target.value || null }))}
                      placeholder="Nome da coluna (ou vazio)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                disabled={isSaving}
                className="flex items-center justify-center min-w-[100px] px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
