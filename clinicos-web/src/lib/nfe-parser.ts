
export interface NFeData {
    invoiceNumber: string;
    series: string;
    accessKey: string;
    operationNature: string;
    protocol: string;
    model: string;
    emissionDate: Date | null;
    supplier: {
        name: string;
        cnpj: string;
    };
    items: NFeItem[];
    totalValue: number;
    totals: {
        vBC: number;
        vICMS: number;
        vBCST: number;
        vST: number;
        vProd: number;
        vFrete: number;
        vSeg: number;
        vDesc: number;
        vIPI: number;
        vOutro: number;
        vIBS?: number;
        vCBS?: number;
    };
    transport: {
        modFrete?: number;
        carrierName?: string;
        carrierDocument?: string;
        carrierAddress?: string;
        carrierCity?: string;
        carrierState?: string;
        volQuantity?: number;
        volSpecies?: string;
        volNetWeight?: number;
        volGrossWeight?: number;
    };
}

export interface NFeItem {
    code: string;
    name: string;
    quantity: number;
    unit: string;
    unitValue: number;
    totalValue: number;
    ean: string;
    lotNumber?: string;
    expirationDate?: string;
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
                const transp = xmlDoc.getElementsByTagName("transp")[0];

                const invoiceNumber = getTagValue(ide, "nNF");
                const series = getTagValue(ide, "serie");
                const accessKey = infNFe.getAttribute("Id")?.replace("NFe", "") || "";

                const operationNature = getTagValue(ide, "natOp");
                const model = getTagValue(ide, "mod");
                const dhEmiString = getTagValue(ide, "dhEmi");
                const emissionDate = dhEmiString ? new Date(dhEmiString) : null;

                // Protocol usually in protNFe -> infProt -> nProt
                const protNFe = xmlDoc.getElementsByTagName("protNFe")[0];
                const protocol = protNFe ? getTagValue(protNFe, "nProt") : "";

                const supplierName = getTagValue(emit, "xNome");
                const supplierCNPJ = getTagValue(emit, "CNPJ");

                // --- Totals ---
                const icmsTot = total?.getElementsByTagName("ICMSTot")[0];

                // Try vNFTot first (New Layout), fallback to vNF (Legacy)
                const vNFTot = getTagValue(total, "vNFTot");
                const vNF = icmsTot ? getTagValue(icmsTot, "vNF") : "0";

                const totalValue = vNFTot ? parseFloat(vNFTot) : (vNF ? parseFloat(vNF) : 0);

                const totals = {
                    vBC: parseFloat(getTagValue(icmsTot, "vBC") || "0"),
                    vICMS: parseFloat(getTagValue(icmsTot, "vICMS") || "0"),
                    vBCST: parseFloat(getTagValue(icmsTot, "vBCST") || "0"),
                    vST: parseFloat(getTagValue(icmsTot, "vST") || "0"),
                    vProd: parseFloat(getTagValue(icmsTot, "vProd") || "0"),
                    vFrete: parseFloat(getTagValue(icmsTot, "vFrete") || "0"),
                    vSeg: parseFloat(getTagValue(icmsTot, "vSeg") || "0"),
                    vDesc: parseFloat(getTagValue(icmsTot, "vDesc") || "0"),
                    vIPI: parseFloat(getTagValue(icmsTot, "vIPI") || "0"),
                    vOutro: parseFloat(getTagValue(icmsTot, "vOutro") || "0"),
                    vIBS: 0,
                    vCBS: 0,
                };

                // --- Totals (Tax Reform 2026+) ---
                const ibscbsTot = total?.getElementsByTagName("IBSCBSTot")[0];
                if (ibscbsTot) {
                    // Start by trying to get direct children (vIBS/vCBS might be nested or direct depending on schema version, 
                    // but in the provided XML they are inside <gIBS><vIBS> and <gCBS><vCBS>)

                    const gIBS = ibscbsTot.getElementsByTagName("gIBS")[0];
                    const gCBS = ibscbsTot.getElementsByTagName("gCBS")[0];

                    const vIBS = gIBS ? parseFloat(getTagValue(gIBS, "vIBS") || "0") : 0;
                    const vCBS = gCBS ? parseFloat(getTagValue(gCBS, "vCBS") || "0") : 0;

                    totals.vIBS = vIBS;
                    totals.vCBS = vCBS;

                    // If vNFTot exists, we might want to use it as the totalValue instead of vNF from ICMSTot
                    const vNFTot = getTagValue(total, "vNFTot");
                    if (vNFTot) {
                        // We overwrite the totalValue derived from vNF if vNFTot is present
                        // (But we need to return it effectively. We assigned to a const 'totalValue' earlier)
                    }
                }

                // --- Transport ---
                let transport = {};
                if (transp) {
                    const transporta = transp.getElementsByTagName("transporta")[0];
                    const vol = transp.getElementsByTagName("vol")[0];

                    transport = {
                        modFrete: parseInt(getTagValue(transp, "modFrete") || "0"),
                        carrierName: transporta ? getTagValue(transporta, "xNome") : undefined,
                        carrierDocument: transporta ? (getTagValue(transporta, "CNPJ") || getTagValue(transporta, "CPF")) : undefined,
                        carrierAddress: transporta ? getTagValue(transporta, "xEnder") : undefined,
                        carrierCity: transporta ? getTagValue(transporta, "xMun") : undefined,
                        carrierState: transporta ? getTagValue(transporta, "UF") : undefined,

                        volQuantity: vol ? parseInt(getTagValue(vol, "qVol") || "0") : undefined,
                        volSpecies: vol ? getTagValue(vol, "esp") : undefined,
                        volNetWeight: vol ? parseFloat(getTagValue(vol, "pesoL") || "0") : undefined,
                        volGrossWeight: vol ? parseFloat(getTagValue(vol, "pesoB") || "0") : undefined,
                    };
                }

                // --- Items Data ---
                const dets = xmlDoc.getElementsByTagName("det");
                const items: NFeItem[] = [];

                for (let i = 0; i < dets.length; i++) {
                    const det = dets[i];
                    const prod = det.getElementsByTagName("prod")[0];

                    if (prod) {
                        // Lot / Traceability
                        const rastro = prod.getElementsByTagName("rastro")[0] || det.getElementsByTagName("rastro")[0];
                        let lotNumber = undefined;
                        let expirationDate = undefined;

                        if (rastro) {
                            lotNumber = getTagValue(rastro, "nLote");
                            const dVal = getTagValue(rastro, "dVal"); // YYYY-MM-DD
                            if (dVal) expirationDate = dVal;
                        }

                        items.push({
                            code: getTagValue(prod, "cProd"),
                            name: getTagValue(prod, "xProd"),
                            quantity: parseFloat(getTagValue(prod, "qCom")),
                            unit: getTagValue(prod, "uCom"),
                            unitValue: parseFloat(getTagValue(prod, "vUnCom")),
                            totalValue: parseFloat(getTagValue(prod, "vProd")),
                            ean: getTagValue(prod, "cEAN"),
                            lotNumber,
                            expirationDate
                        });
                    }
                }

                resolve({
                    invoiceNumber,
                    series,
                    accessKey,
                    operationNature,
                    protocol,
                    model,
                    emissionDate,
                    supplier: {
                        name: supplierName,
                        cnpj: supplierCNPJ,
                    },
                    items,
                    totalValue,
                    totals,
                    transport
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
