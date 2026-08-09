"use client";

import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Truck,
  FileText,
  Copy,
  MessageSquare,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProcessingPanelProps {
  returnData: any;
  orderData: any;
  onRefresh: () => void;
}

export function ProcessingPanel({ returnData, orderData, onRefresh }: ProcessingPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Trigger backend BOK action
  const handleTriggerAction = async (actionType: string) => {
    setActiveAction(actionType);
    try {
      const response = await api.post(`/returns/${returnData.id}/process-action`, {
        action_type: actionType,
        reason: returnData.warehouse_notes || ""
      });
      toast.success(response.data.message || "Akcja wykonana pomyślnie!");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Nie udało się wykonać akcji.");
    } finally {
      setActiveAction(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano szablon do schowka!");
  };

  // Predefined templates
  const refundAmount = returnData.details_payload?.refund?.amount?.amount || orderData?.total_to_pay || "—";
  const notes = returnData.warehouse_notes || "brak szczegółów";
  const waybill = returnData.reshipment_waybill || "—";

  const templateFullRefund = `Dzień dobry,
Informujemy, że otrzymaliśmy paczkę zwrotną. Zwrot środków na kwotę ${refundAmount} PLN został pomyślnie zlecony za pośrednictwem Allegro Pay/PayU i powinien pojawić się na Twoim koncie w ciągu 2-3 dni roboczych.

Pozdrawiamy,
Dział Obsługi Klienta`;

  const templatePartialRefund = `Dzień dobry,
Informujemy, że otrzymaliśmy paczkę zwrotną. Po weryfikacji stanu faktycznego towaru na magazynie stwierzono ślady użytkowania lub braki w akcesoriach (Uwagi magazyniera: ${notes}). 

W związku z powyższym, zwrot środków został pomniejszony o koszt przywrócenia towaru do stanu pierwotnego. Zlecenie częściowego zwrotu zostało przekazane do realizacji.

Pozdrawiamy,
Dział Obsługi Klienta`;

  const templateRejected = `Dzień dobry,
Po weryfikacji technicznej odesłanego produktu zmuszeni jesteśmy odrzucić zgłoszenie reklamacyjne / zwrot z powodu uszkodzeń powstałych z winy użytkownika (Uwagi magazyniera: ${notes}).

Paczka zostaje odesłana na Twój adres. Numer śledzenia przesyłki zwrotnej to: ${waybill}.

Pozdrawiamy,
Dział Obsługi Klienta`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Warehouse Info Summarized */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 border-b border-slate-200/40 dark:border-white/5">
              <Info className="h-3.5 w-3.5 text-primary/70" />
              <span>Status weryfikacji magazynowej</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/5">
                <span className="text-muted-foreground">Decyzja magazynu</span>
                <Badge
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                    returnData.warehouse_status === "RECEIVED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : returnData.warehouse_status === "PARTIAL"
                      ? "bg-yellow-500/10 text-amber-600 dark:text-yellow-400 border border-yellow-500/20"
                      : returnData.warehouse_status === "REJECTED"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 border border-slate-200/50 dark:border-white/10"
                  )}
                >
                  {returnData.warehouse_status === "RECEIVED"
                    ? "Kompletna"
                    : returnData.warehouse_status === "PARTIAL"
                    ? "Niezgodna/Częściowa"
                    : returnData.warehouse_status === "REJECTED"
                    ? "Odrzucona"
                    : "Oczekiwanie"}
                </Badge>
              </div>

              {returnData.waybill_number && (
                <div className="flex justify-between py-1 border-b border-slate-200/40 dark:border-white/5">
                  <span className="text-muted-foreground">Zeskanowany list</span>
                  <span className="font-mono font-bold text-foreground">{returnData.waybill_number}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-muted-foreground">Notatki magazyniera:</span>
                <p className="text-foreground/80 bg-slate-100 dark:bg-black/30 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 leading-relaxed italic">
                  "{returnData.warehouse_notes || "Brak notatek z magazynu."}"
                </p>
              </div>
            </div>

            {/* Documented photos */}
            {returnData.photos && returnData.photos.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider font-mono">Zdjęcia z magazynu</span>
                <div className="flex flex-wrap gap-2">
                  {returnData.photos.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all block bg-slate-100 dark:bg-black/40"
                    >
                      <img src={url} alt="Magazyn" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Processing Actions and templates (split-span-2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Processing Operations Card */}
        <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 border-b border-slate-200/40 dark:border-white/5">
              <FileText className="h-3.5 w-3.5 text-primary/70" />
              <span>Operacje Finansowe i Logistyczne BOK</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Finanse */}
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-4">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Rozliczenie Finansowe
                </p>

                <div className="space-y-3">
                  {/* Allegro Refund */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Zwrot Allegro (PayU)</span>
                      {returnData.refund_status === "SUCCESS" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          Zlecono ({returnData.refund_external_id?.slice(0, 10)})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Oczekuje</Badge>
                      )}
                    </div>
                    {returnData.refund_status !== "SUCCESS" && (
                      <Button
                        size="sm"
                        disabled={activeAction !== null}
                        onClick={() => handleTriggerAction("ALLEGRO_REFUND")}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        {activeAction === "ALLEGRO_REFUND" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Zleć zwrot Allegro
                      </Button>
                    )}
                  </div>

                  {/* Commission Refund */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Zwrot prowizji Allegro</span>
                      {returnData.commission_refund_status === "APPROVED" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          Zatwierdzony
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Niezłożony</Badge>
                      )}
                    </div>
                    {returnData.commission_refund_status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeAction !== null}
                        onClick={() => handleTriggerAction("ALLEGRO_COMMISSION_REFUND")}
                        className="w-full border-primary/20 text-primary hover:bg-primary/10 font-bold text-xs"
                      >
                        {activeAction === "ALLEGRO_COMMISSION_REFUND" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Złóż wniosek o prowizję
                      </Button>
                    )}
                  </div>

                  {/* ERP Invoice Correction */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Korekta Faktury w ERP</span>
                      {returnData.erp_correction_number ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold">
                          {returnData.erp_correction_number}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Nieutworzona</Badge>
                      )}
                    </div>
                    {!returnData.erp_correction_number && (
                      <Button
                        size="sm"
                        disabled={activeAction !== null}
                        onClick={() => handleTriggerAction("ERP_CORRECTION")}
                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary-foreground font-bold text-xs border border-primary/30"
                      >
                        {activeAction === "ERP_CORRECTION" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Wystaw korektę w Subiekcie
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Logistyka */}
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-4">
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Logistyka i Wysyłki
                </p>

                <div className="space-y-3">
                  {/* Replacement Order */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Zamówienie Wymiany</span>
                      {returnData.replacement_order_id ? (
                        <a
                          href={`/orders/${returnData.replacement_order_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline font-bold flex items-center gap-0.5"
                        >
                          WYM (Pokaż)
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Brak</Badge>
                      )}
                    </div>
                    {!returnData.replacement_order_id && (
                      <Button
                        size="sm"
                        disabled={activeAction !== null}
                        onClick={() => handleTriggerAction("REPLACEMENT")}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                      >
                        {activeAction === "REPLACEMENT" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Zleć wymianę (0 PLN)
                      </Button>
                    )}
                  </div>

                  {/* Reshipment Waybill */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Ponowna Wysyłka (Waybill)</span>
                      {returnData.reshipment_waybill ? (
                        <span className="font-mono text-[10px] text-foreground font-bold">
                          {returnData.reshipment_waybill}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Brak listu</Badge>
                      )}
                    </div>
                    {!returnData.reshipment_waybill && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activeAction !== null}
                        onClick={() => handleTriggerAction("RENEW_WAYBILL")}
                        className="w-full border-indigo-500/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs"
                      >
                        {activeAction === "RENEW_WAYBILL" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Generuj list przewozowy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messaging Templates Card */}
        <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 border-b border-slate-200/40 dark:border-white/5">
              <MessageSquare className="h-3.5 w-3.5 text-primary/70" />
              <span>Szablony wiadomości dla klienta</span>
            </div>

            <div className="space-y-4">
              
              {/* Szablon 1: Full Refund */}
              <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">1. Potwierdzenie przyjęcia i pełny zwrot</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(templateFullRefund)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-sans bg-slate-100 dark:bg-black/30 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 leading-relaxed">
                  {templateFullRefund}
                </pre>
              </div>

              {/* Szablon 2: Partial Refund */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">2. Zwrot częściowy (potrącenie za braki)</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(templatePartialRefund)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-sans bg-slate-100 dark:bg-black/30 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 leading-relaxed">
                  {templatePartialRefund}
                </pre>
              </div>

              {/* Szablon 3: Rejected */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">3. Odrzucenie reklamacji (zwrot towaru do klienta)</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    onClick={() => copyToClipboard(templateRejected)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-sans bg-slate-100 dark:bg-black/30 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 leading-relaxed">
                  {templateRejected}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
