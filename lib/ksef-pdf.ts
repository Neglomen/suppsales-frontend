import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface InvoiceParty {
  nip: string;
  name: string;
  address: string;
}

export interface InvoiceLine {
  no: number;
  name: string;
  quantity: number;
  unit: string;
  netPrice: number;
  netValue: number;
  vatRate: string;
  grossValue: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  saleDate: string;
  currency: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  lines: InvoiceLine[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  paymentMethod: string;
  bankAccount: string;
}

const parseValue = (doc: Document, tagName: string): string => {
  const allElements = doc.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    if (allElements[i].localName === tagName) {
      return allElements[i].textContent || "";
    }
  }
  return "";
};

const parseParty = (doc: Document, roleNode: string): InvoiceParty => {
  let rootNode: Element | null = null;
  const allElements = doc.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    if (allElements[i].localName === roleNode) {
      rootNode = allElements[i];
      break;
    }
  }

  if (!rootNode) return { nip: "", name: "", address: "" };

  const findIn = (node: Element, tag: string) => {
    const els = node.getElementsByTagName("*");
    for (let i = 0; i < els.length; i++) {
      if (els[i].localName === tag) return els[i].textContent || "";
    }
    return "";
  };

  const nip = findIn(rootNode, "NIP");
  const name = findIn(rootNode, "PelnaNazwa") || (findIn(rootNode, "Imie") + " " + findIn(rootNode, "Nazwisko"));
  
  const adresNode = Array.from(rootNode.getElementsByTagName("*")).find(el => el.localName === "Adres");
  let address = "";
  if (adresNode) {
     const line1 = findIn(adresNode, "AdresL1");
     const line2 = findIn(adresNode, "AdresL2");
     if (line1 || line2) {
         address = `${line1} ${line2}`.trim();
     } else {
         const ulica = findIn(adresNode, "Ulica");
         const nrDomu = findIn(adresNode, "NrDomu");
         const nrLok = findIn(adresNode, "NrLokalu");
         const kod = findIn(adresNode, "KodPocztowy");
         const miasto = findIn(adresNode, "Miejscowosc");
         address = `${ulica} ${nrDomu}${nrLok ? '/' + nrLok : ''}, ${kod} ${miasto}`;
     }
  }

  return { nip, name, address };
};

export const parseKsefXml = (xmlStr: string): InvoiceData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "application/xml");

    const errorNode = doc.querySelector("parsererror");
    if (errorNode) return null;

    const invoiceNumber = parseValue(doc, "P_2");
    const issueDate = parseValue(doc, "P_1");
    const saleDate = parseValue(doc, "P_6");
    const currency = parseValue(doc, "KodWaluty") || "PLN";

    const seller = parseParty(doc, "Podmiot1");
    const buyer = parseParty(doc, "Podmiot2");

    const lines: InvoiceLine[] = [];
    const allElements = doc.getElementsByTagName("*");
    
    const lineNodes: Element[] = [];
    for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === "FaWiersz") {
            lineNodes.push(allElements[i]);
        }
    }

    let totalNetLines = 0;
    
    lineNodes.forEach((node, index) => {
        const find = (tag: string) => {
             const els = node.getElementsByTagName("*");
             for (let i=0; i<els.length; i++) {
                 if(els[i].localName === tag) return els[i].textContent || "";
             }
             return "";
        };

        const name = find("P_7");
        const quantity = parseFloat(find("P_8A") || "0");
        const unit = find("P_8B") || "szt.";
        const netPrice = parseFloat(find("P_9A") || "0");
        const netValue = parseFloat(find("P_11") || "0");
        let vatRate = find("P_12");
        
        if (vatRate === "1") vatRate = "23%";
        else if (vatRate === "2") vatRate = "8%";

        const vatMult = vatRate === "23%" ? 1.23 : (vatRate === "8%" ? 1.08 : 1.0);
        const grossValue = netValue * vatMult;

        totalNetLines += netValue;

        if (name) {
            lines.push({
                no: index + 1,
                name,
                quantity,
                unit,
                netPrice,
                netValue,
                vatRate,
                grossValue
            });
        }
    });

    const totalGross = parseFloat(parseValue(doc, "P_15") || "0");
    const totalNet = parseFloat(parseValue(doc, "P_13_1") || "0") + parseFloat(parseValue(doc, "P_13_2") || "0");
    const bankAccount = parseValue(doc, "NrRachunku");

    return {
        invoiceNumber,
        issueDate,
        saleDate,
        currency,
        seller,
        buyer,
        lines,
        totalNet: totalNet || totalNetLines,
        totalVat: totalGross - (totalNetLines || totalNet || 0),
        totalGross,
        paymentMethod: "Przelew",
        bankAccount
    };
  } catch (e) {
    console.error("KSeF Parse Exception", e);
    return null;
  }
};

const formatMoney = (val: number, cur: string) => {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: cur }).format(val);
};

export const generateKsefPdfBase64 = async (xmlStr: string): Promise<string | null> => {
    const data = parseKsefXml(xmlStr);
    if (!data) return null;

    // Tworzymy iframe, żeby odizolować się od głównego DOM, gdzie Tailwind v4 ustawia zmienne z 'oklch' (co crashuje html2canvas)
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "800px";
    // Ustawiamy wysokość na tyle dużą, żeby zmieściła zawartość faktury bez scrolla (np. min 1200px)
    iframe.style.height = "1600px"; 
    
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        return null;
    }

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 40px;
                    font-family: sans-serif;
                    background-color: #ffffff;
                    color: #000000;
                    width: 800px;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            <div id="invoice-container">
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                    <div style="font-size: 24px; font-weight: bold;">FAKTURA VAT</div>
                    <div style="text-align: right; font-size: 14px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">Nr: ${data.invoiceNumber}</div>
                        <div>Data wystawienia: ${data.issueDate}</div>
                        <div>Data sprzedaży: ${data.saleDate}</div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px;">
                    <div style="flex: 1; padding: 15px; background: #fafafa; border-radius: 8px;">
                        <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #666; margin-bottom: 10px;">Sprzedawca</div>
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${data.seller.name}</div>
                        <div style="font-size: 14px; margin-bottom: 10px;">${data.seller.address}</div>
                        <div style="font-size: 14px;">NIP: <span style="font-family: monospace;">${data.seller.nip}</span></div>
                    </div>
                    <div style="flex: 1; padding: 15px; background: #fafafa; border-radius: 8px;">
                        <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #666; margin-bottom: 10px;">Nabywca</div>
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${data.buyer.name}</div>
                        <div style="font-size: 14px; margin-bottom: 10px;">${data.buyer.address}</div>
                        <div style="font-size: 14px;">NIP: <span style="font-family: monospace;">${data.buyer.nip}</span></div>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
                    <thead style="border-bottom: 2px solid #ddd;">
                        <tr>
                            <th style="text-align: left; padding: 10px 5px;">Lp</th>
                            <th style="text-align: left; padding: 10px 5px;">Nazwa</th>
                            <th style="text-align: right; padding: 10px 5px;">Ilość</th>
                            <th style="text-align: center; padding: 10px 5px;">Jm</th>
                            <th style="text-align: right; padding: 10px 5px;">Cena netto</th>
                            <th style="text-align: right; padding: 10px 5px;">VAT</th>
                            <th style="text-align: right; padding: 10px 5px;">Wartość netto</th>
                            <th style="text-align: right; padding: 10px 5px;">Wartość brutto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.lines.map(line => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 5px;">${line.no}</td>
                            <td style="padding: 10px 5px; font-weight: 500;">${line.name}</td>
                            <td style="padding: 10px 5px; text-align: right;">${line.quantity}</td>
                            <td style="padding: 10px 5px; text-align: center; color: #666;">${line.unit}</td>
                            <td style="padding: 10px 5px; text-align: right; color: #666;">${formatMoney(line.netPrice, data.currency).replace(data.currency, '').trim()}</td>
                            <td style="padding: 10px 5px; text-align: right;">${line.vatRate}</td>
                            <td style="padding: 10px 5px; text-align: right;">${formatMoney(line.netValue, data.currency).replace(data.currency, '').trim()}</td>
                            <td style="padding: 10px 5px; text-align: right; font-weight: 500;">${formatMoney(line.grossValue, data.currency).replace(data.currency, '').trim()}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                
                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 300px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;">
                            <span>Razem Netto:</span>
                            <span>${formatMoney(data.totalNet, data.currency)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;">
                            <span>Razem VAT:</span>
                            <span>${formatMoney(data.totalVat, data.currency)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 15px 0 0 0; border-top: 2px solid #000; font-size: 18px; font-weight: bold; margin-top: 5px;">
                            <span>Do zapłaty:</span>
                            <span>${formatMoney(data.totalGross, data.currency)}</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #777;">
                    <div style="display: flex; gap: 30px; margin-bottom: 10px;">
                        <div><strong style="color: #333;">Nr konta:</strong> ${data.bankAccount || "Brak danych w KSeF"}</div>
                        <div><strong style="color: #333;">Sposób płatności:</strong> ${data.paymentMethod}</div>
                    </div>
                    <div>Dokument wygenerowany automatycznie z systemu KSeF (XML). Identyfikator wew: ${data.invoiceNumber}</div>
                </div>
            </div>
        </body>
        </html>
    `);
    doc.close();

    // Dajemy chwilę na wyrenderowanie klatki
    await new Promise(res => setTimeout(res, 100));

    try {
        const invoiceContainer = doc.getElementById("invoice-container");
        if (!invoiceContainer) throw new Error("No container");

        const canvas = await html2canvas(invoiceContainer, { 
            scale: 2,
            useCORS: true,
            logging: false,
            // Próbujemy upewnić się, że nie wyciekają żadne style z rodzica okna
            backgroundColor: "#ffffff",
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        const fullBase64 = pdf.output('datauristring');
        return fullBase64.split(',')[1];
    } finally {
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
};
