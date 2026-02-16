'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoriesPage from "./categorias/page";
import BrandsPage from "./marcas/page";
import { FolderTree, Tag, Settings } from "lucide-react";
import { GeneralSettings } from "./components/general-settings";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function CataloguePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
                <p className="text-gray-500">Gerencie categorias, marcas e configurações de precificação</p>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 font-semibold mb-1">Entenda a Hierarquia de Preços</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm">
                    O sistema calcula o preço de venda automaticamente seguindo esta ordem de prioridade (o primeiro que encontrar vence):
                    <ol className="list-decimal list-inside mt-1 space-y-0.5 ml-1">
                        <li><strong>Preço Manual:</strong> Definido no produto (ignora regras).</li>
                        <li><strong>Markup do Produto:</strong> Definido especificamente no cadastro do item.</li>
                        <li><strong>Markup da Marca:</strong> Definido na marca (ex: Portinari).</li>
                        <li><strong>Markup da Categoria:</strong> Definido na categoria (ex: Pisos).</li>
                        <li><strong>Markup Global:</strong> Padrão do sistema (40%).</li>
                    </ol>
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="categories" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="categories" className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        Categorias
                    </TabsTrigger>
                    <TabsTrigger value="brands" className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Marcas
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categories" className="mt-6">
                    <CategoriesPage isEmbedded={true} />
                </TabsContent>

                <TabsContent value="brands" className="mt-6">
                    <BrandsPage isEmbedded={true} />
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                    <GeneralSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
