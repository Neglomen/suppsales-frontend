"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KsefVisualizerProps {
  xml: string;
}

interface InvoiceParty {
  nip: string;
  name: string;
  address: string;
}

interface InvoiceLine {
  no: number;
  name: string;
  quantity: number;
  unit: string;
  netPrice: number;
  netValue: number;
  vatRate: string;
  grossValue: number;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  saleDate: string;
  currency: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  recipient?: InvoiceParty;
  lines: InvoiceLine[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  paymentMethod: string;
  bankAccount: string;
}

const parseValue = (doc: Document, tagName: string): string => {
  // Próbujemy znaleźć element po samej nazwie taga (ignorując namespace)
  // W XML z namespace, getElementsByTagName może nie działać jak oczekujemy w przeglądarce
  // Dlatego szukamy po localName iterując
  const allElements = doc.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    if (allElements[i].localName === tagName) {
      return allElements[i].textContent || "";
    }
  }
  return "";
};

const parseParty = (doc: Document, roleNode: string): InvoiceParty => {
  // Szukamy węzła Podmiot1 (Sprzedawca) lub Podmiot2 (Nabywca)
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
  
  // Adres
  const adresNode = Array.from(rootNode.getElementsByTagName("*")).find(el => el.localName === "Adres");
  let address = "";
  if (adresNode) {
     const line1 = findIn(adresNode, "AdresL1");
     const line2 = findIn(adresNode, "AdresL2");
     if (line1 || line2) {
         address = `${line1} ${line2}`.trim();
     } else {
         // KSeF Struktura Adresu
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

const parseKsefXml = (xmlStr: string): InvoiceData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "application/xml");

    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
        console.error("XML Parse Error", errorNode);
        return null;
    }

    const invoiceNumber = parseValue(doc, "P_2");
    const issueDate = parseValue(doc, "P_1");
    const saleDate = parseValue(doc, "P_6");
    const currency = parseValue(doc, "KodWaluty") || "PLN";

    const seller = parseParty(doc, "Podmiot1"); // Sprzedawca
    const buyer = parseParty(doc, "Podmiot2");   // Nabywca

    // Linie faktury
    const lines: InvoiceLine[] = [];
    const allElements = doc.getElementsByTagName("*");

    const findIn = (node: Element, tag: string) => {
         const els = node.getElementsByTagName("*");
         for (let i = 0; i < els.length; i++) {
             if (els[i].localName === tag) return els[i].textContent || "";
         }
         return "";
    };

    // Odbiorca (Podmiot3, Podmiot4, itd. z Rolą == 2)
    let recipient: InvoiceParty | undefined = undefined;
    for (let i = 0; i < allElements.length; i++) {
        const tag = allElements[i].localName;
        if (tag.startsWith("Podmiot") && tag.length > 7 && /^\d+$/.test(tag.substring(7))) {
            const num = parseInt(tag.substring(7), 10);
            if (num >= 3) {
                const rola = findIn(allElements[i], "Rola");
                if (rola === "2") {
                    const nip = findIn(allElements[i], "NIP");
                    const name = findIn(allElements[i], "PelnaNazwa") || findIn(allElements[i], "Nazwa") || (findIn(allElements[i], "Imie") + " " + findIn(allElements[i], "Nazwisko")).trim();
                    
                    // Adres
                    const adresNode = Array.from(allElements[i].getElementsByTagName("*")).find(el => el.localName === "Adres");
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
                    recipient = { nip, name, address };
                    break;
                }
            }
        }
    }

    // Znajdź wszystkie FaWiersz
    const lineNodes: Element[] = [];
    for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === "FaWiersz") {
            lineNodes.push(allElements[i]);
        }
    }

    lineNodes.forEach((node, index) => {
        const find = (tag: string) => {
             return findIn(node, tag);
        };

        const name = find("P_7");
        const quantity = parseFloat(find("P_8A") || "0");
        const unit = find("P_8B") || "szt.";
        const netPrice = parseFloat(find("P_9A") || "0");
        const netValue = parseFloat(find("P_11") || "0");
        let vatRate = find("P_12");
        
        // Mapowanie stawek VAT KSeF
        if (vatRate === "1") vatRate = "23%";
        else if (vatRate === "2") vatRate = "8%";
        // ... proste mapowanie, w rzeczywistości może być tekstowe

        // Wyliczamy brutto dla linii (Dla uproszczenia visualizacji, w KSeF sumy są w stopce)
        const vatMult = vatRate === "23%" ? 1.23 : (vatRate === "8%" ? 1.08 : 1.0); // Uproszczenie
        const grossValue = netValue * vatMult;

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

    // Sumy stopki
    // P_15 = Do zapłaty
    const totalGross = parseFloat(parseValue(doc, "P_15") || "0");
    const totalNet = parseFloat(parseValue(doc, "P_13_1") || "0") + parseFloat(parseValue(doc, "P_13_2") || "0"); // Suma podstaw
    
    // Płatność
    const bankAccount = parseValue(doc, "NrRachunku");

    return {
        invoiceNumber,
        issueDate,
        saleDate,
        currency,
        seller,
        buyer,
        recipient,
        lines,
        totalNet,
        totalVat: totalGross - totalNet, 
        totalGross,
        paymentMethod: "Przelew", // Default
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

export function KsefVisualizer({ xml }: KsefVisualizerProps) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!xml) return;
    const parsed = parseKsefXml(xml);
    if (parsed) {
        setData(parsed);
        setError(false);
    } else {
        setError(true);
    }
  }, [xml]);

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-destructive">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>Nie udało się przetworzyć pliku XML faktury do podglądu.</p>
          </div>
      );
  }

  if (!data) {
      return <div className="p-8 text-center text-muted-foreground">Ładowanie wizualizacji...</div>;
  }

  const handlePrint = () => {
    const printContent = document.getElementById("ksef-invoice-sheet");
    if (!printContent) return;

    // Tworzymy iframe do druku
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Kopiujemy style
    // Prostym sposobem jest wstrzyknięcie CSS inline dla wydruku
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Faktura ${data.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { 
                font-family: 'Inter', sans-serif; 
                font-size: 12px; 
                line-height: 1.5; 
                color: #000;
                background: #fff;
                margin: 0;
                padding: 20px;
            }
            .invoice-box {
                max-width: 800px;
                margin: auto;
                padding: 30px;
                border: 1px solid #eee;
            }
            @media print {
                .invoice-box { border: none; padding: 0; max-width: 100%; }
                @page { margin: 1cm; size: A4; }
            }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #333; }
            .meta { text-align: right; }
            .meta div { margin-bottom: 4px; }
            
            .parties { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
            .party { flex: 1; }
            .party-title { font-weight: bold; text-transform: uppercase; color: #666; font-size: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            .party-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px; background: #f8f9fa; border-bottom: 2px solid #eee; font-size: 10px; text-transform: uppercase; color: #555; }
            td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .totals { display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table td { padding: 5px 10px; border-bottom: 1px solid #eee; }
            .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; }
            
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #777; }
            .info-row { display: flex; gap: 20px; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
               <div class="logo">FAKTURA VAT</div>
               <div class="meta">
                 <div>Nr: <strong>${data.invoiceNumber}</strong></div>
                 <div>Data wystawienia: ${data.issueDate}</div>
                 <div>Data sprzedaży: ${data.saleDate}</div>
               </div>
            </div>
            
             <div class="parties">
                <div class="party">
                  <div class="party-title">Sprzedawca</div>
                  <div class="party-name">${data.seller.name}</div>
                  <div>${data.seller.address}</div>
                  <div style="margin-top: 5px">NIP: ${data.seller.nip}</div>
                </div>
                <div class="party">
                  <div class="party-title">Nabywca</div>
                  <div class="party-name">${data.buyer.name}</div>
                  <div>${data.buyer.address}</div>
                  <div style="margin-top: 5px">NIP: ${data.buyer.nip}</div>
                </div>
                ${data.recipient ? `
                <div class="party">
                  <div class="party-title">Odbiorca</div>
                  <div class="party-name">${data.recipient.name}</div>
                  <div>${data.recipient.address}</div>
                  ${data.recipient.nip ? `<div style="margin-top: 5px">NIP: ${data.recipient.nip}</div>` : ''}
                </div>
                ` : ''}
             </div>
            
            <table>
               <thead>
                 <tr>
                    <th style="width: 30px">Lp</th>
                    <th>Nazwa</th>
                    <th class="text-right">Ilość</th>
                    <th class="text-center">Jm</th>
                    <th class="text-right">Cena Netto</th>
                    <th class="text-right">Stawka</th>
                    <th class="text-right">Wartość Netto</th>
                    <th class="text-right">Wartość Brutto</th>
                 </tr>
               </thead>
               <tbody>
                  ${data.lines.map(line => `
                    <tr>
                       <td>${line.no}</td>
                       <td>${line.name}</td>
                       <td class="text-right">${line.quantity}</td>
                       <td class="text-center">${line.unit}</td>
                       <td class="text-right">${formatMoney(line.netPrice, data.currency).replace(data.currency, '')}</td>
                       <td class="text-right">${line.vatRate}</td>
                       <td class="text-right">${formatMoney(line.netValue, data.currency).replace(data.currency, '')}</td>
                       <td class="text-right">${formatMoney(line.grossValue, data.currency).replace(data.currency, '')}</td>
                    </tr>
                  `).join('')}
               </tbody>
            </table>
            
            <div class="totals">
               <table class="totals-table">
                  <tr>
                     <td>Razem Netto:</td>
                     <td class="text-right">${formatMoney(data.totalNet, data.currency)}</td>
                  </tr>
                  <tr>
                     <td>Razem VAT:</td>
                     <td class="text-right">${formatMoney(data.totalVat, data.currency)}</td>
                  </tr>
                  <tr class="grand-total">
                     <td>Do zapłaty:</td>
                     <td class="text-right">${formatMoney(data.totalGross, data.currency)}</td>
                  </tr>
               </table>
            </div>
            
            <div class="footer">
                <div class="info-row">
                    <div><strong>Nr konta:</strong> ${data.bankAccount || "Brak danych w KSeF"}</div>
                    <div><strong>Sposób płatności:</strong> ${data.paymentMethod}</div>
                </div>
                <div style="margin-top: 10px">
                   Dokument wygenerowany z systemu KSeF (XML). Identyfikator wew: ${data.invoiceNumber}
                </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-muted/5">
       <div className="flex justify-between items-center p-4 border-b bg-white">
          <h3 className="font-semibold text-sm">Wizualizacja KSeF</h3>
          <Button onClick={handlePrint} size="sm" variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Drukuj / Zapisz PDF
          </Button>
       </div>
       <div className="flex-1 overflow-auto p-8 flex justify-center">
            {/* Tutaj podgląd HTML zbliżony do wydruku */}
            <div id="ksef-preview-container" className="bg-white shadow-lg p-10 w-[210mm] min-h-[297mm] text-sm text-foreground">
                {/* Header */}
                <div className="flex justify-between mb-10">
                    <div className="text-2xl font-bold">FAKTURA VAT</div>
                    <div className="text-right text-sm">
                        <div className="font-bold mb-1">Nr: {data.invoiceNumber}</div>
                        <div className="text-muted-foreground">Data wystawienia: {data.issueDate}</div>
                        <div className="text-muted-foreground">Data sprzedaży: {data.saleDate}</div>
                    </div>
                </div>
                
                {/* Sprzedawca / Nabywca / Odbiorca */}
                 <div className={cn("grid gap-10 mb-10 bg-muted/30 p-6 rounded-lg", data.recipient ? "grid-cols-3" : "grid-cols-2")}>
                     <div>
                         <div className="text-xs uppercase font-bold text-muted-foreground mb-2">Sprzedawca</div>
                         <div className="font-bold text-base mb-1">{data.seller.name}</div>
                         <div className="whitespace-pre-wrap text-sm">{data.seller.address}</div>
                         <div className="mt-2 text-sm">NIP: <span className="font-mono">{data.seller.nip}</span></div>
                     </div>
                     <div>
                         <div className="text-xs uppercase font-bold text-muted-foreground mb-2">Nabywca</div>
                         <div className="font-bold text-base mb-1">{data.buyer.name}</div>
                         <div className="whitespace-pre-wrap text-sm">{data.buyer.address}</div>
                         <div className="mt-2 text-sm">NIP: <span className="font-mono">{data.buyer.nip}</span></div>
                     </div>
                     {data.recipient && (
                         <div>
                             <div className="text-xs uppercase font-bold text-muted-foreground mb-2">Odbiorca</div>
                             <div className="font-bold text-base mb-1">{data.recipient.name}</div>
                             <div className="whitespace-pre-wrap text-sm">{data.recipient.address}</div>
                             {data.recipient.nip && (
                                 <div className="mt-2 text-sm">NIP: <span className="font-mono">{data.recipient.nip}</span></div>
                             )}
                         </div>
                     )}
                 </div>

                {/* Tabela */}
                <table className="w-full mb-8 text-sm">
                    <thead className="border-b-2 border-muted">
                        <tr>
                            <th className="py-2 text-left w-10">Lp</th>
                            <th className="py-2 text-left">Nazwa</th>
                            <th className="py-2 text-right">Ilość</th>
                            <th className="py-2 text-center">Jm</th>
                            <th className="py-2 text-right">Cena (net)</th>
                            <th className="py-2 text-right">VAT</th>
                            <th className="py-2 text-right">Wartość (net)</th>
                            <th className="py-2 text-right">Wartość (brutto)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/50">
                        {data.lines.map(line => (
                            <tr key={line.no}>
                                <td className="py-3">{line.no}</td>
                                <td className="py-3 font-medium">{line.name}</td>
                                <td className="py-3 text-right">{line.quantity}</td>
                                <td className="py-3 text-center text-muted-foreground">{line.unit}</td>
                                <td className="py-3 text-right text-muted-foreground">{formatMoney(line.netPrice, data.currency).replace(data.currency, '')}</td>
                                <td className="py-3 text-right">{line.vatRate}</td>
                                <td className="py-3 text-right">{formatMoney(line.netValue, data.currency).replace(data.currency, '')}</td>
                                <td className="py-3 text-right font-medium">{formatMoney(line.grossValue, data.currency).replace(data.currency, '')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Podsumowanie */}
                <div className="flex justify-end">
                    <div className="w-1/2 md:w-1/3">
                        <div className="flex justify-between py-2 border-b">
                            <span>Razem Netto:</span>
                            <span>{formatMoney(data.totalNet, data.currency)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span>Razem VAT:</span>
                            <span>{formatMoney(data.totalVat, data.currency)}</span>
                        </div>
                        <div className="flex justify-between py-3 border-t-2 border-black font-bold text-lg mt-1">
                            <span>Do zapłaty:</span>
                            <span>{formatMoney(data.totalGross, data.currency)}</span>
                        </div>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
}
