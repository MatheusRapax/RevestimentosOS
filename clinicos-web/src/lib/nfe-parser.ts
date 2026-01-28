
export interface NFeData {
    invoiceNumber: string;
    series: string;
    accessKey: string;
    emissionDate: Date | null;
    supplier: {
        name: string;
        cnpj: string;
    };
    items: NFeItem[];
    totalValue: number;
}

export interface NFeItem {
    code: string;
    name: string;
    quantity: number;
    unit: string;
    unitValue: number;
    totalValue: number;
    ean: string;
    // NCM, CFOP, etc could be added here
}

export async function parseNFeXML(file: File): Promise<NFeData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const xmlText = e.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                // Helper to safely get text content
                const getTagValue = (parent: Element | Document, tagName: string): string => {
                    const element = parent.getElementsByTagName(tagName)[0];
                    return element ? element.textContent || "" : "";
                };

                // Check if valid NFe
                const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
                if (!infNFe) {
                    throw new Error("Arquivo XML inválido: Tag infNFe não encontrada.");
                }

                // --- Header Data ---
                const ide = xmlDoc.getElementsByTagName("ide")[0];
                const emit = xmlDoc.getElementsByTagName("emit")[0];
                const total = xmlDoc.getElementsByTagName("total")[0];

                const invoiceNumber = getTagValue(ide, "nNF");
                const series = getTagValue(ide, "serie");
                const accessKey = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
                const dhEmiString = getTagValue(ide, "dhEmi");
                const emissionDate = dhEmiString ? new Date(dhEmiString) : null;

                const supplierName = getTagValue(emit, "xNome");
                const supplierCNPJ = getTagValue(emit, "CNPJ");

                const vNF = getTagValue(total, "vNF");
                const totalValue = vNF ? parseFloat(vNF) : 0;

                // --- Items Data ---
                const dets = xmlDoc.getElementsByTagName("det");
                const items: NFeItem[] = [];

                for (let i = 0; i < dets.length; i++) {
                    const det = dets[i];
                    const prod = det.getElementsByTagName("prod")[0];

                    if (prod) {
                        items.push({
                            code: getTagValue(prod, "cProd"),
                            name: getTagValue(prod, "xProd"),
                            quantity: parseFloat(getTagValue(prod, "qCom")),
                            unit: getTagValue(prod, "uCom"),
                            unitValue: parseFloat(getTagValue(prod, "vUnCom")),
                            totalValue: parseFloat(getTagValue(prod, "vProd")),
                            ean: getTagValue(prod, "cEAN"),
                        });
                    }
                }

                resolve({
                    invoiceNumber,
                    series,
                    accessKey,
                    emissionDate,
                    supplier: {
                        name: supplierName,
                        cnpj: supplierCNPJ,
                    },
                    items,
                    totalValue
                });

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error("Erro ao ler o arquivo."));
        };

        reader.readAsText(file);
    });
}
