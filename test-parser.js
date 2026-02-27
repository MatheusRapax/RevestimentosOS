const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const xmlText = fs.readFileSync('nfe_teste_duplicatas.xml', 'utf-8');
const dom = new JSDOM(xmlText, { contentType: 'text/xml' });
const xmlDoc = dom.window.document;

const getTagValue = (parent, tagName) => {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent || "" : "";
};

const cobr = xmlDoc.getElementsByTagName("cobr")[0];
const installments = [];
if (cobr) {
    const dups = cobr.getElementsByTagName("dup");
    for (let i = 0; i < dups.length; i++) {
        const dup = dups[i];
        const nDup = getTagValue(dup, "nDup");
        const dVenc = getTagValue(dup, "dVenc");
        const vDup = parseFloat(getTagValue(dup, "vDup") || "0");
        installments.push({ number: nDup, dueDate: dVenc, value: vDup });
    }
}

console.log('Parsed installments:', installments);
