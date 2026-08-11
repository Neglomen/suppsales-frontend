"use client";

import { useState } from "react";
import api, { getMediaUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Truck,
  FileText,
  MessageSquare,
  ExternalLink,
  Info,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

interface ProcessingPanelProps {
  returnData: any;
  orderData: any;
  onRefresh: () => void;
}

export function ProcessingPanel({ returnData, orderData, onRefresh }: ProcessingPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Stany potwierdzenia akcji
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    description: string;
    requiresAmount?: boolean;
    defaultAmount?: string;
  } | null>(null);

  const [refundAmountVal, setRefundAmountVal] = useState<string>("");

  // Trigger backend BOK action
  const handleTriggerAction = async (actionType: string, additionalPayload: any = {}) => {
    setActiveAction(actionType);
    try {
      const response = await api.post(`/returns/${returnData.id}/process-action`, {
        action_type: actionType,
        reason: returnData.warehouse_notes || "",
        ...additionalPayload
      });
      toast.success(response.data.message || "Akcja wykonana pomyślnie!");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Nie udało się wykonać akcji.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const type = confirmAction.type;
    setConfirmAction(null);

    if (type === "ALLEGRO_REFUND_FULL") {
      await handleTriggerAction("ALLEGRO_REFUND", {
        refund_type: "FULL",
        amount: parseFloat(orderData?.total_to_pay || 0.0)
      });
    } else if (type === "ALLEGRO_REFUND_PARTIAL") {
      const amt = parseFloat(refundAmountVal);
      if (isNaN(amt) || amt <= 0) {
        toast.error("Podaj prawidłową kwotę zwrotu.");
        return;
      }
      await handleTriggerAction("ALLEGRO_REFUND", {
        refund_type: "PARTIAL",
        amount: amt
      });
      setRefundAmountVal("");
    } else if (type === "WAREHOUSE_RECEIPT") {
      setActiveAction("WAREHOUSE_RECEIPT");
      try {
        await api.post(`/returns/${returnData.id}/receipt`, {
          warehouse_status: "RECEIVED",
          warehouse_notes: "Zwrot przyjęty w systemie przez BOK (Biuro Obsługi Klienta)",
          photos: returnData.photos || [],
          waybill_number: returnData.waybill_number || null,
          items_received: []
        });
        toast.success("Towar został pomyślnie przyjęty na magazyn!");
        onRefresh();
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || "Nie udało się przyjąć towaru.");
      } finally {
        setActiveAction(null);
      }
    } else {
      await handleTriggerAction(type);
    }
  };

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
                      href={getMediaUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all block bg-slate-100 dark:bg-black/40"
                    >
                      <img src={getMediaUrl(url)} alt="Magazyn" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Processing Actions */}
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
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          disabled={activeAction !== null}
                          onClick={() => setConfirmAction({
                            type: "ALLEGRO_REFUND_FULL",
                            title: "Pełny Zwrot Środków",
                            description: `Czy na pewno chcesz zlecić PEŁNY zwrot środków na kwotę ${orderData?.total_to_pay || 0.0} PLN dla klienta ${returnData.buyer_login}?`
                          })}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase px-1 rounded-lg"
                        >
                          Pełny zwrot
                        </Button>
                        <Button
                          size="sm"
                          disabled={activeAction !== null}
                          onClick={() => setConfirmAction({
                            type: "ALLEGRO_REFUND_PARTIAL",
                            title: "Częściowy Zwrot Środków",
                            description: `Czy na pewno chcesz zlecić CZĘŚCIOWY zwrot środków dla klienta ${returnData.buyer_login}? Wprowadź kwotę zwrotu.`,
                            requiresAmount: true
                          })}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase px-1 rounded-lg"
                        >
                          Częściowy
                        </Button>
                      </div>
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
                        onClick={() => setConfirmAction({
                          type: "ALLEGRO_COMMISSION_REFUND",
                          title: "Zwrot Prowizji Allegro",
                          description: `Czy na pewno chcesz złożyć wniosek o zwrot prowizji (rabat transakcyjny) dla tego zwrotu?`
                        })}
                        className="w-full border-primary/20 text-primary hover:bg-primary/10 font-bold text-xs rounded-lg"
                      >
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
                        onClick={() => setConfirmAction({
                          type: "ERP_CORRECTION",
                          title: "Wystawienie Korekty w ERP",
                          description: `Czy na pewno chcesz wygenerować fakturę korygującą (korektę) w zintegrowanym systemie ERP Subiekt dla tego zwrotu?`
                        })}
                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary-foreground font-bold text-xs border border-primary/30 rounded-lg"
                      >
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
                        onClick={() => setConfirmAction({
                          type: "REPLACEMENT",
                          title: "Zlecenie Zamówienia Wymiany",
                          description: `Czy na pewno chcesz utworzyć nowe darmowe zamówienie wymiany (0 PLN) na te same produkty z oryginalnego zamówienia?`
                        })}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg"
                      >
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
                        onClick={() => setConfirmAction({
                          type: "RENEW_WAYBILL",
                          title: "Generowanie Etykiety Zwrotnej",
                          description: `Czy na pewno chcesz wygenerować nową etykietę przesyłki zwrotnej (reshipment waybill) w systemie logistycznym?`
                        })}
                        className="w-full border-indigo-500/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs rounded-lg"
                      >
                        Generuj list przewozowy
                      </Button>
                    )}
                  </div>

                  {/* Warehouse Receipt */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Przyjęcie Magazynowe (Zwrot Towaru)</span>
                      {returnData.warehouse_status === "RECEIVED" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          Przyjęto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground/60 border-slate-200 dark:border-white/10 text-[9px]">Oczekuje</Badge>
                      )}
                    </div>
                    {returnData.warehouse_status !== "RECEIVED" && (
                      <Button
                        size="sm"
                        disabled={activeAction !== null}
                        onClick={() => setConfirmAction({
                          type: "WAREHOUSE_RECEIPT",
                          title: "Przyjęcie Towaru na Magazyn",
                          description: `Czy na pewno chcesz zatwierdzić fizyczny zwrot towaru i przyjąć go na stan magazynowy? Status zwrotu zostanie zmieniony na ODEBRANY.`
                        })}
                        className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-foreground dark:text-white font-bold text-xs rounded-lg"
                      >
                        Przyjmij towar na magazyn
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title}
        className="bg-slate-900 border-white/10"
      >
        <ModalHeader>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            {confirmAction?.title}
          </h3>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {confirmAction?.description}
          </p>
          {confirmAction?.requiresAmount && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Kwota zwrotu (PLN)</label>
              <Input
                type="number"
                step="0.01"
                value={refundAmountVal}
                onChange={(e) => setRefundAmountVal(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
                placeholder="np. 49.99"
                autoFocus
              />
            </div>
          )}
          <p className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
            Uwaga: Jest to operacja wrażliwa i zostanie natychmiast przekazana do zewnętrznych systemów integracji.
          </p>
        </ModalBody>
        <ModalFooter className="bg-slate-950/40">
          <Button
            variant="ghost"
            onClick={() => setConfirmAction(null)}
            className="text-xs text-slate-400 hover:text-white rounded-xl h-8 px-3"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={activeAction !== null || (confirmAction?.requiresAmount && !refundAmountVal.trim())}
            className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl h-8 px-4"
          >
            {activeAction !== null && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            Potwierdzam
          </Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
