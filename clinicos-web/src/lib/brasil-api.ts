export interface CepResponse {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    service: string;
}

export interface CnpjResponse {
    cnpj: string;
    matriz_filial: string;
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: number;
    data_situacao_cadastral: string;
    motivo_situacao_cadastral: number;
    nome_cidade_exterior: string;
    codigo_natureza_juridica: number;
    data_inicio_atividade: string;
    cnae_fiscal: number;
    cnae_fiscal_descricao: string;
    descricao_tipo_logradouro: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cep: string;
    uf: string;
    municipio: string;
    ddd_telefone_1: string;
    ddd_telefone_2: string;
    ddd_fax: string;
    email: string | null;
    qsa: any[];
}

/**
 * Busca informações de um CEP na BrasilAPI
 * @param cep CEP (apenas números ou com máscara, será formatado internamente)
 */
export async function fetchCepInfo(cep: string): Promise<CepResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`CEP ${cleanCep} não encontrado.`);
            }
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

/**
 * Busca informações de um CNPJ na BrasilAPI
 * @param cnpj CNPJ (apenas números ou com máscara, será formatado internamente)
 */
export async function fetchCnpjInfo(cnpj: string): Promise<CnpjResponse | null> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return null;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`CNPJ ${cleanCnpj} não encontrado.`);
            }
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        return null;
    }
}
