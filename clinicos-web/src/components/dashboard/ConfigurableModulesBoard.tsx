import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists, otherwise I'll adjust

interface ModuleType {
  href: string;
  label: string;
  icon: any; // LucideIcon
  color: string;
  moduleGroup: string;
  permission: string;
}

interface Props {
  availableModules: ModuleType[];
}

export default function ConfigurableModulesBoard({ availableModules }: Props) {
  const [shortcuts, setShortcuts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchShortcuts();
  }, []);

  const fetchShortcuts = async () => {
    try {
      const response = await api.get('/dashboard/shortcuts');
      const data = response.data;
      if (Array.isArray(data)) {
        setShortcuts(data);
      }
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveShortcuts = async (newShortcuts: string[]) => {
    try {
      setIsSaving(true);
      await api.put('/dashboard/shortcuts', { shortcuts: newShortcuts });
    } catch (error) {
      console.error('Error saving shortcuts:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShortcut = (href: string) => {
    let newShortcuts;
    if (shortcuts.includes(href)) {
      newShortcuts = shortcuts.filter((s) => s !== href);
    } else {
      if (shortcuts.length >= 12) return; // limit to 12
      newShortcuts = [...shortcuts, href];
    }
    setShortcuts(newShortcuts);
    saveShortcuts(newShortcuts);
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mb-6" />;
  }

  const pinnedModules = shortcuts
    .map((href) => availableModules.find((m) => m.href === href))
    .filter(Boolean) as ModuleType[];

  // Se o usuário não tem nada, mostra pelo menos 1 atalho sugerido para não ficar um buraco estranho?
  // O usuário pediu especificamente "deixar menos poluído". Quando não tem nada: vamos mostrar que ele pode adicionar.

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Seus Atalhos</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
        >
          {isEditing ? (
            <>
              <Check size={16} />
              Concluir
            </>
          ) : (
            <>
              <Pencil size={16} />
              Configurar
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm shadow-blue-50">
          <p className="text-sm text-gray-500 mb-4 flex items-center justify-between">
            <span>Selecione os módulos que deseja na sua tela inicial:</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{shortcuts.length}/12 selecionados</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {availableModules.map((module) => {
              const isSelected = shortcuts.includes(module.href);
              const Icon = module.icon;
              return (
                <button
                  key={module.href}
                  onClick={() => toggleShortcut(module.href)}
                  disabled={isSaving || (!isSelected && shortcuts.length >= 12)}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50'
                  } ${(!isSelected && shortcuts.length >= 12) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl text-white mb-2 ${module.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {module.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
          {pinnedModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group flex flex-col items-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl text-white mb-2 group-hover:scale-110 transition-transform ${module.color}`}
                >
                  <Icon size={24} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">
                  {module.label}
                </span>
              </Link>
            );
          })}

          {pinnedModules.length < 12 && (
            <button
              onClick={() => setIsEditing(true)}
              className="group flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-500 h-full min-h-[104px]"
            >
              <Plus size={24} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Add Atalho</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
