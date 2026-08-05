"use client";

import { useEffect, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Loader2,
  Printer,
  AlertCircle,
  Building2,
  User,
  CreditCard,
  ShieldCheck,
  FileCode,
  FileText,
  BadgeAlert,
  ArrowRightLeft,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KsefVisualizerProps {
  xml: string;
}

interface InvoiceParty {
  nip: string;
  name: string;
  address: string;
  country?: string;
  email?: string;
  phone?: string;
  customerNr?: string;
}

interface InvoiceLine {
  no: number;
  lineNoOriginal?: string;
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

interface VatSummaryItem {
  rate: string;
  net: number;
  vat: number;
  gross: number;
}

interface InvoiceData {
  formCode: string;
  systemCode: string;
  ksefNumber?: string;
  invoiceType: string;
  isCorrection: boolean;
  invoiceNumber: string;
  issueDate: string;
  saleDate: string;
  currency: string;

  // Korekty
  correctedInvoiceNumber?: string;
  correctedInvoiceDate?: string;
  correctedKsefNumber?: string;
  correctionReason?: string;
  correctionType?: string;

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
  bankAccount?: string;
  bankName?: string;
  swift?: string;

  // Adnotacje
  splitPayment: boolean;
  cashMethod: boolean;
  selfInvoicing: boolean;
  vatExempt: boolean;
  vatExemptLegalBasis?: string;
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
  let country = "";
  if (adresNode) {
    country = findIn(adresNode, "KodKraju") || "PL";
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
  const customerNr = findIn(rootNode, "NrKlienta");

  return { nip, name, address, country, email, phone, customerNr };
};

const formatBankAccount = (account: string): string => {
  if (!account) return "";
  const cleaned = account.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length === 26) {
    return `PL ${cleaned.replace(/(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})/, "$1 $2 $3 $4 $5 $6 $7")}`;
  }
  return account;
};

const parseKsefXmlData = (xmlStr: string): InvoiceData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "application/xml");

    if (doc.querySelector("parsererror")) return null;

    const formCode = parseTagValue(doc, "KodFormularza") || "FA(2)";
    const systemCode = parseTagValue(doc, "KodSystemowy") || "FA(2)";
    const ksefNumber = parseTagValue(doc, "NrKSeF") || parseTagValue(doc, "ElementKSeF");
    const rawKind = parseTagValue(doc, "RodzajFaktury") || "VAT";
    const invoiceNumber = parseTagValue(doc, "P_2");
    const issueDate = parseTagValue(doc, "P_1");
    const saleDate = parseTagValue(doc, "P_6") || issueDate;
    const currency = parseTagValue(doc, "KodWaluty") || "PLN";

    // Wykrywanie korekty
    let isCorrection = rawKind === "KOR" || rawKind === "FAK";
    let correctedInvoiceNumber = "";
    let correctedInvoiceDate = "";
    let correctedKsefNumber = "";
    let correctionReason = "";
    let correctionType = "";

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
      correctionType = parseTagValue(faKorygowanaNode, "TypKorekty");
    }

    if (!correctionReason) {
      correctionReason = parseTagValue(doc, "PrzyczynaKorekty");
    }

    // Strony
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

    // Pozycje (FaWiersz)
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

      const lineNoOriginal = findIn("NrWierszaFa");
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

      if (vatRateCode === "1" || vatRateCode === "23") {
        vatRate = "23%";
        vatMultiplier = 0.23;
      } else if (vatRateCode === "2" || vatRateCode === "8") {
        vatRate = "8%";
        vatMultiplier = 0.08;
      } else if (vatRateCode === "3" || vatRateCode === "5") {
        vatRate = "5%";
        vatMultiplier = 0.05;
      } else if (vatRateCode === "4" || vatRateCode === "0") {
        vatRate = "0%";
        vatMultiplier = 0.0;
      } else if (vatRateCode?.toLowerCase().includes("zw")) {
        vatRate = "ZW";
        vatMultiplier = 0.0;
      }

      const vatValue = parseFloat(findIn("P_11Vat") || (netValue * vatMultiplier).toFixed(2));
      const grossValue = netValue + vatValue;

      lines.push({
        no: idx + 1,
        lineNoOriginal,
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

    // Podsumowanie VAT
    const net23 = parseFloat(parseTagValue(doc, "P_13_1") || "0");
    const vat23 = parseFloat(parseTagValue(doc, "P_14_1") || "0");
    const net8 = parseFloat(parseTagValue(doc, "P_13_2") || "0");
    const vat8 = parseFloat(parseTagValue(doc, "P_14_2") || "0");
    const net5 = parseFloat(parseTagValue(doc, "P_13_3") || "0");
    const vat5 = parseFloat(parseTagValue(doc, "P_14_3") || "0");
    const netZw = parseFloat(parseTagValue(doc, "P_13_6") || "0");
    const net0 = parseFloat(parseTagValue(doc, "P_13_7") || "0");

    const vatSummary: VatSummaryItem[] = [];
    if (net23 !== 0 || vat23 !== 0) vatSummary.push({ rate: "23%", net: net23, vat: vat23, gross: net23 + vat23 });
    if (net8 !== 0 || vat8 !== 0) vatSummary.push({ rate: "8%", net: net8, vat: vat8, gross: net8 + vat8 });
    if (net5 !== 0 || vat5 !== 0) vatSummary.push({ rate: "5%", net: net5, vat: vat5, gross: net5 + vat5 });
    if (net0 !== 0) vatSummary.push({ rate: "0%", net: net0, vat: 0, gross: net0 });
    if (netZw !== 0) vatSummary.push({ rate: "ZW", net: netZw, vat: 0, gross: netZw });

    const totalGross = parseFloat(parseTagValue(doc, "P_15") || "0");
    let totalNet = vatSummary.reduce((acc, curr) => acc + curr.net, 0);
    if (totalNet === 0) totalNet = lines.reduce((acc, l) => acc + l.netValue, 0);
    let totalVat = vatSummary.reduce((acc, curr) => acc + curr.vat, 0);
    if (totalVat === 0) totalVat = totalGross - totalNet;

    // Płatność
    const rawForma = parseTagValue(doc, "FormaPlatnosci");
    let paymentMethod = "Przelew bankowy";
    if (rawForma === "1") paymentMethod = "Gotówka";
    else if (rawForma === "7") paymentMethod = "Karta płatnicza";
    else if (rawForma === "6") paymentMethod = "Przelew bankowy";
    else if (rawForma === "18") paymentMethod = "Płatność mobilna / BLIK";

    const paymentDueDate = parseTagValue(doc, "TerminPlatnosci") || parseTagValue(doc, "Termin");
    const rawBankAcc = parseTagValue(doc, "NrRB") || parseTagValue(doc, "NrRachunku");
    const bankAccount = formatBankAccount(rawBankAcc);
    const bankName = parseTagValue(doc, "NazwaBanku");
    const swift = parseTagValue(doc, "SWIFT");

    const paidAmount = parseFloat(parseTagValue(doc, "KwotaZaplaty") || parseTagValue(doc, "Zaplacono") || "0");
    const dueAmount = totalGross - paidAmount;

    // Adnotacje
    const splitPayment = parseTagValue(doc, "P_18") === "1";
    const cashMethod = parseTagValue(doc, "P_16") === "1";
    const selfInvoicing = parseTagValue(doc, "P_17") === "1";
    const vatExempt = parseTagValue(doc, "P_19") === "1";
    const vatExemptLegalBasis =
      parseTagValue(doc, "P_19A") || parseTagValue(doc, "P_19B") || parseTagValue(doc, "P_19C");

    return {
      formCode,
      systemCode,
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
      correctionType,
      seller,
      buyer,
      recipient,
      lines,
      vatSummary,
      totalNet,
      totalVat,
      totalGross,
      paidAmount: paidAmount > 0 ? paidAmount : undefined,
      dueAmount: dueAmount !== totalGross ? dueAmount : undefined,
      paymentMethod,
      paymentDueDate,
      bankAccount,
      bankName,
      swift,
      splitPayment,
      cashMethod,
      selfInvoicing,
      vatExempt,
      vatExemptLegalBasis,
    };
  } catch (e) {
    console.error("[KSeF Visualizer] Exception:", e);
    return null;
  }
};

const formatMoney = (val: number, cur: string = "PLN") => {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: cur }).format(val);
};

const formatDateFormatted = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "dd.MM.yyyy", { locale: pl }) : dateStr;
  } catch {
    return dateStr;
  }
};

export function KsefVisualizer({ xml }: KsefVisualizerProps) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!xml) return;
    const parsed = parseKsefXmlData(xml);
    if (parsed) {
      setData(parsed);
      setError(false);
    } else {
      setError(true);
    }
  }, [xml]);

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faktura KSeF ${data.invoiceNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; padding: 40px; margin: 0; box-sizing: border-box; }
            .sheet { max-width: 760px; margin: 0 auto; }
            .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
            .header-title { font-size: 18px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; }
            .badge { display: inline-block; padding: 2px 7px; font-size: 9px; font-weight: 700; border-radius: 4px; background: #e0e7ff; color: #3730a3; margin-top: 4px; }
            .badge-kor { background: #fef3c7; color: #92400e; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; padding: 16px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
            .party-title { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
            .party-name { font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .text-right { text-align: right; }
            .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-box { width: 260px; font-size: 11px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; }
            .grand-total { font-size: 14px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px; }
            @media print { body { padding: 0; } .sheet { border: none; padding: 0; } @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="flex-between">
              <div>
                <div class="header-title">${data.isCorrection ? "Faktura VAT Korygująca" : "Faktura VAT"}</div>
                <div><span class="badge ${data.isCorrection ? "badge-kor" : ""}">${data.formCode} KSeF</span></div>
              </div>
              <div style="text-align: right; font-size: 12px;">
                <div style="font-weight: 700; font-size: 13px;">Nr: ${data.invoiceNumber}</div>
                <div style="color: #64748b; margin-top: 2px;">Data wystawienia: ${formatDateFormatted(data.issueDate)}</div>
                <div style="color: #64748b;">Data sprzedaży: ${formatDateFormatted(data.saleDate)}</div>
              </div>
            </div>

            ${
              data.isCorrection
                ? `
            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; margin-top: 15px; font-size: 11px;">
              <div style="font-weight: 700; color: #92400e;">Korekta do faktury: ${data.correctedInvoiceNumber || "nieokreślona"}</div>
              ${data.correctedInvoiceDate ? `<div style="color: #78350f; margin-top: 2px;">Data faktury pierwotnej: ${formatDateFormatted(data.correctedInvoiceDate)}</div>` : ""}
              ${data.correctedKsefNumber ? `<div style="color: #78350f; margin-top: 2px; font-family: monospace;">Nr KSeF oryginału: ${data.correctedKsefNumber}</div>` : ""}
              ${data.correctionReason ? `<div style="color: #78350f; margin-top: 3px;"><strong>Przyczyna korekty:</strong> ${data.correctionReason}</div>` : ""}
            </div>`
                : ""
            }

            <div class="parties">
              <div>
                <div class="party-title">Sprzedawca</div>
                <div class="party-name">${data.seller.name}</div>
                <div style="color: #475569;">${data.seller.address}</div>
                <div style="margin-top: 6px; font-weight: 700; font-family: monospace;">NIP: ${data.seller.nip}</div>
              </div>
              <div>
                <div class="party-title">Nabywca</div>
                <div class="party-name">${data.buyer.name}</div>
                <div style="color: #475569;">${data.buyer.address}</div>
                <div style="margin-top: 6px; font-weight: 700; font-family: monospace;">NIP: ${data.buyer.nip}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 25px;">Lp</th>
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
                    <td style="font-weight: 600;">${l.name}</td>
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

            <div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
              ${data.bankAccount ? `<div style="margin-bottom: 3px;"><strong>Rachunek bankowy:</strong> ${data.bankAccount}</div>` : ""}
              ${data.paymentDueDate ? `<div style="margin-bottom: 3px;"><strong>Termin płatności:</strong> ${formatDateFormatted(data.paymentDueDate)}</div>` : ""}
              <div><strong>Metoda płatności:</strong> ${data.paymentMethod}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-destructive space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 animate-bounce" />
        <p className="font-semibold text-center text-sm">Nie udało się przetworzyć struktury XML faktury KSeF.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-8 space-x-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        <span className="text-xs font-medium">Ładowanie wizualizacji...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 border-l border-border/40 min-h-0">
      {/* Pasek akcji nagłówka */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            {data.formCode}
          </Badge>
          {data.isCorrection && (
            <Badge variant="destructive" className="gap-1 font-semibold text-xs">
              <BadgeAlert className="h-3.5 w-3.5" />
              FAKTURA KORYGUJĄCA (KFZ / KFS)
            </Badge>
          )}
        </div>

        <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 px-3 gap-1.5 text-xs font-medium">
          <Printer className="h-3.5 w-3.5" />
          Drukuj / Zapisz PDF
        </Button>
      </div>

      {/* Główna treść z zakładkami i czystym szarym tłem dającym margines papierowy */}
      <Tabs defaultValue="visual" className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-6 pt-2 bg-card/80 shrink-0 border-b border-border/30">
          <TabsList className="grid w-[380px] grid-cols-3 h-8">
            <TabsTrigger value="visual" className="text-xs h-7 gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Podgląd A4
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs h-7 gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Tabela VAT
            </TabsTrigger>
            <TabsTrigger value="xml" className="text-xs h-7 gap-1.5">
              <FileCode className="h-3.5 w-3.5" /> XML KSeF
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: PRAWDZIWY ARKUSZ PAPIERU A4 Z BARDZO DUŻYMI MARGINESAMI */}
        <TabsContent value="visual" className="flex-1 overflow-y-auto p-6 sm:p-10 md:p-12 mt-0 pb-20 min-h-0 flex justify-center">
          {/* Biały Arkusz Dokumentu A4 */}
          <div className="w-full max-w-[210mm] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-2xl rounded-lg p-8 sm:p-12 md:p-14 space-y-8 my-auto text-slate-900 dark:text-slate-100">
            
            {/* Nagłówek Faktury */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                  {data.isCorrection ? "Dokument Korygujący z KSeF" : "Faktura VAT z KSeF"}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1 text-slate-900 dark:text-slate-100">
                  {data.invoiceNumber}
                </h1>
                {data.ksefNumber && (
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Nr KSeF: <span className="text-slate-700 dark:text-slate-300">{data.ksefNumber}</span>
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right space-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Data wystawienia: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateFormatted(data.issueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Data sprzedaży: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateFormatted(data.saleDate)}</span>
                </div>
              </div>
            </div>

            {/* KOREKTA - Szczegółowa ramka z danymi faktury korygowanej */}
            {data.isCorrection && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-amber-600" />
                  Szczegóły Korekty
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Faktura pierwotna: </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{data.correctedInvoiceNumber || "brak danych"}</span>
                  </div>
                  {data.correctedInvoiceDate && (
                    <div>
                      <span className="text-amber-700 dark:text-amber-400 font-medium">Data oryginału: </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDateFormatted(data.correctedInvoiceDate)}</span>
                    </div>
                  )}
                  {data.correctedKsefNumber && (
                    <div className="sm:col-span-2">
                      <span className="text-amber-700 dark:text-amber-400 font-medium">Nr KSeF oryginału: </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{data.correctedKsefNumber}</span>
                    </div>
                  )}
                </div>

                {data.correctionReason && (
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-800/50 text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">Przyczyna korekty: </span>
                    <span className="text-amber-950 dark:text-amber-100 font-medium">{data.correctionReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Badges Adnotacji Podatkowych KSeF */}
            {(data.splitPayment || data.cashMethod || data.selfInvoicing || data.vatExempt) && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {data.splitPayment && (
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300">
                    MPP (Podzielona Płatność)
                  </Badge>
                )}
                {data.cashMethod && (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                    Metoda Kasowa
                  </Badge>
                )}
                {data.selfInvoicing && (
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300">
                    Samofakturowanie
                  </Badge>
                )}
                {data.vatExempt && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                    Zwolnienie z VAT {data.vatExemptLegalBasis ? `(${data.vatExemptLegalBasis})` : ""}
                  </Badge>
                )}
              </div>
            )}

            {/* Strony (Sprzedawca / Nabywca / Odbiorca) z czytelnym tłem i marginesem */}
            <div className={cn("grid gap-6", data.recipient ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
              {/* Sprzedawca */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Sprzedawca
                </div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight break-words">{data.seller.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed break-words">{data.seller.address}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500">NIP: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{data.seller.nip}</span>
                </div>
              </div>

              {/* Nabywca */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Nabywca
                </div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight break-words">{data.buyer.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed break-words">{data.buyer.address}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500">NIP: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{data.buyer.nip}</span>
                </div>
              </div>

              {/* Odbiorca */}
              {data.recipient && (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Odbiorca
                  </div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight break-words">{data.recipient.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed break-words">{data.recipient.address}</p>
                  {data.recipient.nip && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-500">NIP: </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{data.recipient.nip}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabela Pozycji */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pozycje Faktury ({data.lines.length}):</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-3 px-3 text-left w-8">Lp</th>
                      <th className="py-3 px-3 text-left">Nazwa towaru / usługi</th>
                      <th className="py-3 px-3 text-right">Ilość</th>
                      <th className="py-3 px-3 text-right">Cena netto</th>
                      <th className="py-3 px-3 text-center">VAT</th>
                      <th className="py-3 px-3 text-right">Wartość netto</th>
                      <th className="py-3 px-3 text-right">Wartość brutto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.lines.map((l) => (
                      <tr key={l.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-slate-500">{l.no}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words">
                          {l.name}
                          {l.pkwiu && <span className="text-[10px] text-slate-500 ml-1.5 font-mono">PKWiU: {l.pkwiu}</span>}
                          {l.reasonForLineCorrection && (
                            <div className="text-[10px] text-amber-600 font-normal mt-0.5">Korekta pozycji: {l.reasonForLineCorrection}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                          {l.quantity} {l.unit}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">{formatMoney(l.netPrice, data.currency)}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {l.vatRate}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-mono whitespace-nowrap">{formatMoney(l.netValue, data.currency)}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                          {formatMoney(l.grossValue, data.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Podsumowanie kwotowe i płatności */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {/* Szczegóły Płatności */}
              <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full sm:w-1/2">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="h-4 w-4 text-indigo-500 shrink-0" /> Szczegóły Płatności
                </p>
                <div>
                  <span className="text-slate-500">Sposób płatności: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{data.paymentMethod}</span>
                </div>
                {data.paymentDueDate && (
                  <div>
                    <span className="text-slate-500">Termin płatności: </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatDateFormatted(data.paymentDueDate)}</span>
                  </div>
                )}
                {data.bankAccount && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 text-[11px]">Numer rachunku bankowego:</p>
                    <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5 break-all">{data.bankAccount}</p>
                    {data.bankName && <p className="text-[10px] text-slate-500 mt-0.5">{data.bankName}</p>}
                  </div>
                )}
              </div>

              {/* Tabela Podsumowania Razem */}
              <div className="w-full sm:w-72 space-y-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Razem Netto:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatMoney(data.totalNet, data.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Razem VAT:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatMoney(data.totalVat, data.currency)}</span>
                </div>
                {data.paidAmount !== undefined && (
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                    <span>Zapłacono:</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatMoney(data.paidAmount, data.currency)}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>Do zapłaty:</span>
                  <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">{formatMoney(data.totalGross, data.currency)}</span>
                </div>
              </div>
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: TABELA VAT I SZCZEGÓŁY */}
        <TabsContent value="summary" className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 mt-0 pb-20 min-h-0 flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-500" /> Podsumowanie Stawek VAT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Stawka VAT</th>
                        <th className="py-2.5 px-3 text-right">Wartość Netto</th>
                        <th className="py-2.5 px-3 text-right">Kwota VAT</th>
                        <th className="py-2.5 px-3 text-right">Wartość Brutto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data.vatSummary.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-bold">{item.rate}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatMoney(item.net, data.currency)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatMoney(item.vat, data.currency)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{formatMoney(item.gross, data.currency)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                        <td className="py-3 px-3">RAZEM</td>
                        <td className="py-3 px-3 text-right font-mono">{formatMoney(data.totalNet, data.currency)}</td>
                        <td className="py-3 px-3 text-right font-mono">{formatMoney(data.totalVat, data.currency)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(data.totalGross, data.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: SUROWY XML */}
        <TabsContent value="xml" className="flex-1 overflow-y-auto p-6 sm:p-10 mt-0 pb-20 min-h-0 flex justify-center">
          <div className="w-full max-w-4xl bg-slate-950 text-slate-100 p-6 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto shadow-2xl">
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{xml}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
