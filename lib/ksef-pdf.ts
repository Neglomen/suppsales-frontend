import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface InvoiceParty {
  nip: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
}

export interface InvoiceLine {
  no: number;
  name: string;
  quantity: number;
  unit: string;
  netPrice: number;
  netValue: number;
  vatRate: string;
  vatValue: number;
  grossValue: number;
  pkwiu?: string;
  reasonForLineCorrection?: string;
}

export interface VatSummaryItem {
  rate: string;
  net: number;
  vat: number;
  gross: number;
}

export interface InvoiceData {
  formCode: string;
  ksefNumber?: string;
  invoiceType: string;
  isCorrection: boolean;
  invoiceNumber: string;
  issueDate: string;
  saleDate: string;
  currency: string;
  correctedInvoiceNumber?: string;
  correctedInvoiceDate?: string;
  correctedKsefNumber?: string;
  correctionReason?: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  recipient?: InvoiceParty;
  lines: InvoiceLine[];
  vatSummary: VatSummaryItem[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod: string;
  paymentDueDate?: string;
  bankAccount: string;
  bankName?: string;
  swift?: string;
  splitPayment: boolean;
  cashMethod: boolean;
  selfInvoicing: boolean;
  vatExempt: boolean;
}

const parseTagValue = (node: Element | Document, tagName: string): string => {
  const elements = node.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].localName === tagName) {
      return (elements[i].textContent || "").trim();
    }
  }
  return "";
};

const parsePartyNode = (doc: Document, roleNode: string): InvoiceParty => {
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
      if (els[i].localName === tag) return (els[i].textContent || "").trim();
    }
    return "";
  };

  const nip = findIn(rootNode, "NIP") || findIn(rootNode, "PESEL");
  let name = findIn(rootNode, "PelnaNazwa") || findIn(rootNode, "Nazwa");
  if (!name) {
    const imie = findIn(rootNode, "Imie");
    const nazwisko = findIn(rootNode, "Nazwisko");
    name = `${imie} ${nazwisko}`.trim();
  }

  const adresNode = Array.from(rootNode.getElementsByTagName("*")).find(
    (el) => el.localName === "Adres"
  );
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
      address = `${ulica} ${nrDomu}${nrLok ? "/" + nrLok : ""}, ${kod} ${miasto}`;
    }
  }

  const email = findIn(rootNode, "Email");
  const phone = findIn(rootNode, "Telefon");

  return { nip, name, address, email, phone };
};

const formatBankAccount = (account: string): string => {
  if (!account) return "";
  const cleaned = account.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length === 26) {
    return `PL ${cleaned.replace(/(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})/, "$1 $2 $3 $4 $5 $6 $7")}`;
  }
  return account;
};

export const parseKsefXml = (xmlStr: string): InvoiceData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "application/xml");

    if (doc.querySelector("parsererror")) return null;

    const formCode = parseTagValue(doc, "KodFormularza") || "FA(2)";
    const ksefNumber = parseTagValue(doc, "NrKSeF") || parseTagValue(doc, "ElementKSeF");
    const rawKind = parseTagValue(doc, "RodzajFaktury") || "VAT";
    const invoiceNumber = parseTagValue(doc, "P_2");
    const issueDate = parseTagValue(doc, "P_1");
    const saleDate = parseTagValue(doc, "P_6") || issueDate;
    const currency = parseTagValue(doc, "KodWaluty") || "PLN";

    let isCorrection = rawKind === "KOR" || rawKind === "FAK";
    let correctedInvoiceNumber = "";
    let correctedInvoiceDate = "";
    let correctedKsefNumber = "";
    let correctionReason = "";

    const faKorygowanaNode = Array.from(doc.getElementsByTagName("*")).find(
      (el) => el.localName === "FaKorygowana"
    );

    if (faKorygowanaNode) {
      isCorrection = true;
      correctedInvoiceNumber =
        parseTagValue(faKorygowanaNode, "NrFaKorygowanej") ||
        parseTagValue(faKorygowanaNode, "NrFaktury") ||
        parseTagValue(faKorygowanaNode, "P_2");
      correctedInvoiceDate = parseTagValue(faKorygowanaNode, "DataWystFaKorygowanej");
      correctedKsefNumber =
        parseTagValue(faKorygowanaNode, "NrKSeFFaKorygowanej") ||
        parseTagValue(faKorygowanaNode, "NrKSeF");
    }

    if (!correctionReason) {
      correctionReason = parseTagValue(doc, "PrzyczynaKorekty");
    }

    const seller = parsePartyNode(doc, "Podmiot1");
    const buyer = parsePartyNode(doc, "Podmiot2");

    let recipient: InvoiceParty | undefined = undefined;
    const allElements = doc.getElementsByTagName("*");
    for (let i = 0; i < allElements.length; i++) {
      const tag = allElements[i].localName;
      if (tag.startsWith("Podmiot") && tag.length > 7 && /^\d+$/.test(tag.substring(7))) {
        const num = parseInt(tag.substring(7), 10);
        if (num >= 3) {
          const rolaNode = Array.from(allElements[i].getElementsByTagName("*")).find(
            (el) => el.localName === "Rola"
          );
          if (rolaNode && rolaNode.textContent?.trim() === "2") {
            recipient = parsePartyNode(doc, tag);
            break;
          }
        }
      }
    }

    const lines: InvoiceLine[] = [];
    const lineNodes: Element[] = [];
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName === "FaWiersz") {
        lineNodes.push(allElements[i]);
      }
    }

    lineNodes.forEach((node, idx) => {
      const findIn = (tag: string) => {
        const els = node.getElementsByTagName("*");
        for (let j = 0; j < els.length; j++) {
          if (els[j].localName === tag) return (els[j].textContent || "").trim();
        }
        return "";
      };

      const name = findIn("P_7");
      if (!name) return;

      const qtyStr = findIn("P_8B");
      const quantity = qtyStr ? parseFloat(qtyStr) : 1;
      const unit = findIn("P_8A") || "szt.";
      const netPrice = parseFloat(findIn("P_9A") || "0");
      const netValue = parseFloat(findIn("P_11") || "0");
      let vatRateCode = findIn("P_12");
      const pkwiu = findIn("P_6A");
      const reasonForLineCorrection = findIn("PrzyczynaKorekty");

      let vatRate = "23%";
      let vatMultiplier = 0.23;
      if (vatRateCode === "1" || vatRateCode === "23") { vatRate = "23%"; vatMultiplier = 0.23; }
      else if (vatRateCode === "2" || vatRateCode === "8") { vatRate = "8%"; vatMultiplier = 0.08; }
      else if (vatRateCode === "3" || vatRateCode === "5") { vatRate = "5%"; vatMultiplier = 0.05; }
      else if (vatRateCode === "4" || vatRateCode === "0") { vatRate = "0%"; vatMultiplier = 0; }
      else if (vatRateCode?.toLowerCase().includes("zw")) { vatRate = "ZW"; vatMultiplier = 0; }

      const vatValue = parseFloat(findIn("P_11Vat") || (netValue * vatMultiplier).toFixed(2));
      const grossValue = netValue + vatValue;

      lines.push({
        no: idx + 1,
        name,
        quantity,
        unit,
        netPrice,
        netValue,
        vatRate,
        vatValue,
        grossValue,
        pkwiu,
        reasonForLineCorrection,
      });
    });

    const net23 = parseFloat(parseTagValue(doc, "P_13_1") || "0");
    const vat23 = parseFloat(parseTagValue(doc, "P_14_1") || "0");
    const net8 = parseFloat(parseTagValue(doc, "P_13_2") || "0");
    const vat8 = parseFloat(parseTagValue(doc, "P_14_2") || "0");

    const vatSummary: VatSummaryItem[] = [];
    if (net23 !== 0 || vat23 !== 0) vatSummary.push({ rate: "23%", net: net23, vat: vat23, gross: net23 + vat23 });
    if (net8 !== 0 || vat8 !== 0) vatSummary.push({ rate: "8%", net: net8, vat: vat8, gross: net8 + vat8 });

    const totalGross = parseFloat(parseTagValue(doc, "P_15") || "0");
    let totalNet = vatSummary.reduce((acc, curr) => acc + curr.net, 0) || lines.reduce((acc, l) => acc + l.netValue, 0);
    let totalVat = vatSummary.reduce((acc, curr) => acc + curr.vat, 0) || (totalGross - totalNet);

    const rawForma = parseTagValue(doc, "FormaPlatnosci");
    let paymentMethod = "Przelew bankowy";
    if (rawForma === "1") paymentMethod = "Gotówka";
    else if (rawForma === "7") paymentMethod = "Karta płatnicza";
    else if (rawForma === "6") paymentMethod = "Przelew bankowy";

    const paymentDueDate = parseTagValue(doc, "TerminPlatnosci") || parseTagValue(doc, "Termin");
    const rawBankAcc = parseTagValue(doc, "NrRB") || parseTagValue(doc, "NrRachunku");
    const bankAccount = formatBankAccount(rawBankAcc);
    const bankName = parseTagValue(doc, "NazwaBanku");
    const swift = parseTagValue(doc, "SWIFT");

    const splitPayment = parseTagValue(doc, "P_18") === "1";
    const cashMethod = parseTagValue(doc, "P_16") === "1";
    const selfInvoicing = parseTagValue(doc, "P_17") === "1";
    const vatExempt = parseTagValue(doc, "P_19") === "1";

    return {
      formCode,
      ksefNumber,
      invoiceType: isCorrection ? "KOR" : rawKind,
      isCorrection,
      invoiceNumber,
      issueDate,
      saleDate,
      currency,
      correctedInvoiceNumber,
      correctedInvoiceDate,
      correctedKsefNumber,
      correctionReason,
      seller,
      buyer,
      recipient,
      lines,
      vatSummary,
      totalNet,
      totalVat,
      totalGross,
      paymentMethod,
      paymentDueDate,
      bankAccount,
      bankName,
      swift,
      splitPayment,
      cashMethod,
      selfInvoicing,
      vatExempt,
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

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "850px";
  iframe.style.height = "auto";

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
                * { box-sizing: border-box; }
                body { margin: 0; padding: 40px; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #0f172a; width: 850px; font-size: 12px; }
                .sheet { width: 100%; margin: 0 auto; background: #ffffff; padding: 10px; }
                .header-title { font-size: 20px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; }
                .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; background: #e0e7ff; color: #3730a3; margin-top: 4px; }
                .badge-kor { background: #fef3c7; color: #92400e; }
                .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
                .party-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
                .party-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0f172a; word-break: break-word; }
                table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 12px; }
                th { background: #f1f5f9; text-align: left; padding: 9px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
                td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                .text-right { text-align: right; }
                .totals { display: flex; justify-content: flex-end; margin-top: 24px; }
                .totals-box { width: 280px; font-size: 12px; }
                .total-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; }
                .grand-total { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; }
            </style>
        </head>
        <body>
            <div id="invoice-container" class="sheet">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <div class="header-title">${data.isCorrection ? "Faktura VAT Korygująca" : "Faktura VAT"}</div>
                        <div><span class="badge ${data.isCorrection ? "badge-kor" : ""}">${data.formCode} KSeF</span></div>
                        ${data.ksefNumber ? `<div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 6px;">Nr KSeF: ${data.ksefNumber}</div>` : ""}
                    </div>
                    <div style="text-align: right; font-size: 13px;">
                        <div style="font-weight: 700; font-size: 14px;">Nr: ${data.invoiceNumber}</div>
                        <div style="color: #64748b; margin-top: 3px;">Data wystawienia: ${data.issueDate}</div>
                        <div style="color: #64748b;">Data sprzedaży: ${data.saleDate}</div>
                    </div>
                </div>

                ${
                  data.isCorrection
                    ? `
                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 12px;">
                  <div style="font-weight: 700; color: #92400e; font-size: 13px;">Faktura Korygowana: ${data.correctedInvoiceNumber || "nieokreślona"}</div>
                  ${data.correctedInvoiceDate ? `<div style="color: #78350f; margin-top: 3px;">Data oryginału: ${data.correctedInvoiceDate}</div>` : ""}
                  ${data.correctedKsefNumber ? `<div style="color: #78350f; margin-top: 3px; font-family: monospace;">Nr KSeF oryginału: ${data.correctedKsefNumber}</div>` : ""}
                  ${data.correctionReason ? `<div style="color: #78350f; margin-top: 6px; font-weight: 600;">Przyczyna korekty: ${data.correctionReason}</div>` : ""}
                </div>`
                    : ""
                }
                
                <div class="parties">
                    <div>
                        <div class="party-title">Sprzedawca</div>
                        <div class="party-name">${data.seller.name}</div>
                        <div style="color: #475569; margin-bottom: 6px;">${data.seller.address}</div>
                        <div style="font-weight: 700; font-family: monospace;">NIP: ${data.seller.nip}</div>
                    </div>
                    <div>
                        <div class="party-title">Nabywca</div>
                        <div class="party-name">${data.buyer.name}</div>
                        <div style="color: #475569; margin-bottom: 6px;">${data.buyer.address}</div>
                        <div style="font-weight: 700; font-family: monospace;">NIP: ${data.buyer.nip}</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px;">Lp</th>
                            <th>Nazwa towaru / usługi</th>
                            <th class="text-right">Ilość</th>
                            <th class="text-right">Cena netto</th>
                            <th class="text-right">VAT</th>
                            <th class="text-right">Wartość netto</th>
                            <th class="text-right">Wartość brutto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.lines
                          .map(
                            (l) => `
                        <tr>
                            <td>${l.no}</td>
                            <td style="font-weight: 600;">
                              ${l.name}
                              ${l.reasonForLineCorrection ? `<div style="font-size: 10px; color: #b45309; font-weight: normal; margin-top: 2px;">Korekta: ${l.reasonForLineCorrection}</div>` : ""}
                            </td>
                            <td class="text-right">${l.quantity} ${l.unit}</td>
                            <td class="text-right">${formatMoney(l.netPrice, data.currency)}</td>
                            <td class="text-right">${l.vatRate}</td>
                            <td class="text-right">${formatMoney(l.netValue, data.currency)}</td>
                            <td class="text-right" style="font-weight: 700;">${formatMoney(l.grossValue, data.currency)}</td>
                        </tr>`
                          )
                          .join("")}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="totals-box">
                        <div class="total-row"><span>Suma netto:</span> <span>${formatMoney(data.totalNet, data.currency)}</span></div>
                        <div class="total-row"><span>Suma VAT:</span> <span>${formatMoney(data.totalVat, data.currency)}</span></div>
                        <div class="total-row grand-total"><span>Do zapłaty:</span> <span>${formatMoney(data.totalGross, data.currency)}</span></div>
                    </div>
                </div>
                
                <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #475569;">
                    ${data.bankAccount ? `<div style="margin-bottom: 4px;"><strong>Rachunek bankowy:</strong> ${data.bankAccount}</div>` : ""}
                    ${data.paymentDueDate ? `<div style="margin-bottom: 4px;"><strong>Termin płatności:</strong> ${data.paymentDueDate}</div>` : ""}
                    <div><strong>Metoda płatności:</strong> ${data.paymentMethod}</div>
                </div>
            </div>
        </body>
        </html>
    `);
  doc.close();

  await new Promise((res) => setTimeout(res, 150));

  try {
    const invoiceContainer = doc.getElementById("invoice-container");
    if (!invoiceContainer) throw new Error("No container");

    const canvas = await html2canvas(invoiceContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Dynamiczna wielostronicowa obsługa z marginesami A4
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const marginX = 12; // 12mm margines boczny
    const marginY = 12; // 12mm margines górny/dolny

    const printableWidth = pageWidth - marginX * 2; // 186mm
    const printableHeight = pageHeight - marginY * 2; // 273mm

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let positionY = marginY;

    // Pierwsza strona z marginesem 12mm
    pdf.addImage(imgData, "JPEG", marginX, positionY, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    // Kolejne strony jeśli faktura jest długa (wielopozycyjna lub rozbudowana korekta)
    while (heightLeft > 0) {
      positionY = marginY - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", marginX, positionY, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }

    const fullBase64 = pdf.output("datauristring");
    return fullBase64.split(",")[1];
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
};
