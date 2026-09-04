
export function unmask(value: string): string {
    return value.replace(/\D/g, '');
}

export function maskCPF(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskCNPJ(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskPhone(value: string): string {
    const r = value.replace(/\D/g, '');
    if (r.length > 10) {
        return r
            .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else {
        return r
            .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    }
}

export function maskCEP(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
}

export function maskDate(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{4})\d+?$/, '$1');
}

export function maskCurrency(value: string): string {
    const numericValue = parseInt(value.replace(/\D/g, ''), 10);
    if (isNaN(numericValue)) return 'R$ 0,00';

    // Divide by 100 to get the decimal value
    const amount = numericValue / 100;

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount);
}

/**
 * L1: formatação para exibição — aceita valor cru (só dígitos) ou já mascarado
 * e sempre devolve o formato canônico. As máscaras acima já são idempotentes
 * (removem \D antes de reaplicar), então serve para dados do seed e da tela.
 */
export function formatDocument(value?: string | null, type?: string): string {
    const digits = (value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (type === 'PJ' || digits.length > 11) return maskCNPJ(digits);
    return maskCPF(digits);
}

export function formatPhone(value?: string | null): string {
    const digits = (value || '').replace(/\D/g, '');
    return digits ? maskPhone(digits) : '';
}

export function maskAccessKey(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .substring(0, 54); // 44 digits + 10 spaces
}
