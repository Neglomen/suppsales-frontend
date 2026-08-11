"use client";

import { useState, useMemo } from "react";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileCheck2, Truck, Wrench, PackageCheck, CreditCard, Banknote, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface SalesCorrectionModalProps {
  order: MarketplaceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SalesCorrectionModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: SalesCorrectionModalProps) {
  const [correctionType, setCorrectionType] = useState<"FULL" | "PARTIAL_QUANTITY" | "PARTIAL_VALUE">("FULL");
  const [reason, setReason] = useState("Zwrot towaru przez klienta");
  const [paymentType, setPaymentType] = useState<string>("przelew");
  const [paymentDueDate, setPaymentDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Zwracany koszt przesyłki
  const origShippingCost = useMemo(() => {
    if (!order || !order.details_payload) return 0;
    const payload = order.details_payload;
    if (order.service_integration?.provider_type === "EMPIK") {
      return payload.shipping_price ? parseFloat(payload.shipping_price) : 0;
    }
    if (order.service_integration?.provider_type === "ALLEGRO") {
      return payload.delivery?.cost?.amount ? parseFloat(payload.delivery.cost.amount) : 0;
    }
    return payload.delivery_price ? parseFloat(payload.delivery_price) : 0;
  }, [order]);

  const [correctShipping, setCorrectShipping] = useState(false);
  const [correctedShippingCost, setCorrectedShippingCost] = useState(0);

  // Usługi dodatkowe (np. z Allegro / Empik)
  const additionalServicesList = useMemo(() => {
    if (!order || !order.details_payload) return [];
    const payload = order.details_payload;
    const services: { id: string; name: string; price: number }[] = [];
    if (Array.isArray(payload.additional_services)) {
      payload.additional_services.forEach((s: any, idx: number) => {
        services.push({
          id: s.id || `SERV_${idx}`,
          name: s.name || s.definition_id || "Usługa dodatkowa",
          price: Number(s.price?.amount || s.price || 0),
        });
      });
    }
    return services;
  }, [order]);

  const [selectedServices, setSelectedServices] = useState<Record<string, { enabled: boolean; price: number }>>({});

  // Pozycje produktów
  const lineItems = order?.line_items || [];
  const [itemCorrections, setItemCorrections] = useState<
    Record<string, { quantity: number; price: number }>
  >({});

  const handleQuantityChange = (symbol: string, val: number) => {
    setItemCorrections((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        quantity: Math.max(0, val),
        price: prev[symbol]?.price ?? 0,
      },
    }));
  };

  const handlePriceChange = (symbol: string, val: number) => {
    setItemCorrections((prev) => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        quantity: prev[symbol]?.quantity ?? 1,
        price: Math.max(0, val),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!order) return;

    setIsSubmitting(true);
    try {
      // 1. Towary podstawowe
      const formattedItems: any[] = lineItems.map((item: any, idx: number) => {
        const symbol = item.offer?.id || `ITEM_${idx}`;
        const origQty = Number(item.quantity || 1);
        const origPrice = Number(item.price?.amount || 0);

        let correctedQty = origQty;
        let correctedPrice = origPrice;

        if (correctionType === "FULL") {
          correctedQty = 0;
        } else if (correctionType === "PARTIAL_QUANTITY") {
          const userQty = itemCorrections[symbol]?.quantity;
          correctedQty = userQty !== undefined ? userQty : origQty;
        } else if (correctionType === "PARTIAL_VALUE") {
          const userPrice = itemCorrections[symbol]?.price;
          correctedPrice = userPrice !== undefined ? userPrice : origPrice;
        }

        return {
          product_symbol: item.offer?.name || symbol,
          original_quantity: origQty,
          corrected_quantity: correctedQty,
          original_gross_price: origPrice,
          corrected_gross_price: correctedPrice,
          vat_rate: 23.0,
        };
      });

      // 2. Korekta transportu/dostawy (jeśli włączona lub korekta całkowita)
      if ((correctionType === "FULL" && origShippingCost > 0) || correctShipping) {
        const targetShipping = correctionType === "FULL" ? 0 : correctedShippingCost;
        formattedItems.push({
          product_symbol: "Transport / Usługa dostawy",
          original_quantity: 1,
          corrected_quantity: targetShipping === 0 ? 0 : 1,
          original_gross_price: origShippingCost,
          corrected_gross_price: targetShipping,
          vat_rate: 23.0,
        });
      }

      // 3. Korekta usług dodatkowych
      additionalServicesList.forEach((serv) => {
        const servState = selectedServices[serv.id];
        if (correctionType === "FULL" || servState?.enabled) {
          const targetPrice = correctionType === "FULL" ? 0 : servState?.price ?? 0;
          formattedItems.push({
            product_symbol: `$USŁUGA_${serv.name}`,
            original_quantity: 1,
            corrected_quantity: targetPrice === 0 ? 0 : 1,
            original_gross_price: serv.price,
            corrected_gross_price: targetPrice,
            vat_rate: 23.0,
          });
        }
      });

      const issueDateStr = new Date().toISOString().split("T")[0];

      let finalPaymentType = "gotówka";
      if (paymentType === "przelew") {
        finalPaymentType = "przelew";
      } else if (["karta", "PayU", "Przelewy24"].includes(paymentType)) {
        finalPaymentType = "karta";
      }

      let finalDueDate: string | null = null;
      if (finalPaymentType === "przelew" || finalPaymentType === "karta") {
        finalDueDate = paymentDueDate && paymentDueDate.trim() ? paymentDueDate : issueDateStr;
      }

      const payload = {
        original_sales_document_number: order.erp_sales_document_number || "",
        original_order_number: order.external_order_id,
        correction_type: correctionType,
        issue_date: issueDateStr,
        correction_reason: reason,
        payment_type: finalPaymentType,
        payment_due_date: finalDueDate,
        line_items: formattedItems,
      };

      const res = await api.post(
        `/sales-invoices/orders/${order.id}/create-sales-correction`,
        payload
      );

      const taskId = res.data?.task_id;
      if (taskId) {
        toast.loading("Wystawianie Korekty w Subiekt GT...", { id: "kfs-toast" });
        
        const pollTaskStatus = (tId: string): Promise<{ document_number: string; message?: string }> => {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 3 * 60 * 1000;
            const interval = setInterval(async () => {
              try {
                if (Date.now() - startTime > timeout) {
                  clearInterval(interval);
                  reject(new Error("Przekroczono limit czasu oczekiwania na wystawienie korekty."));
                  return;
                }
                const statusRes = await api.get(`/tasks/${tId}/status`);
                const data = statusRes.data;
                if (data.status === "SUCCESS") {
                  clearInterval(interval);
                  const docNumber = data.result?.result?.subiekt_document_number || data.result?.subiekt_document_number;
                  resolve({
                    document_number: docNumber || "KFS",
                    message: data.result?.result?.message || data.result?.message,
                  });
                } else if (data.status === "FAILURE" || data.status === "FAILED" || data.status === "ERROR") {
                  clearInterval(interval);
                  const errorMsg = data.result?.error || data.result?.result?.error || "Nie udało się utworzyć korekty w Subiekcie.";
                  reject(new Error(errorMsg));
                }
              } catch (err) {
                // cichy retry
              }
            }, 1500);
          });
        };

        const resultData = await pollTaskStatus(taskId);
        toast.success(`Wystawiono Korektę Faktury (KFS): ${resultData.document_number}`, { id: "kfs-toast" });
      } else {
        toast.success("Zlecono utworzenie Korekty Faktury Sprzedaży (KFS) w Subiekcie!");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || err.response?.data?.detail || "Nie udało się wystawić korekty w Subiekcie.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg), { id: "kfs-toast" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col bg-card glass-dark rounded-2xl border shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <FileCheck2 className="h-6 w-6 text-indigo-500 shrink-0" />
            Wystaw Korektę Faktury (KFS) – Subiekt GT
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-1">
            <span>Zamówienie #{order.external_order_id}</span>
            <span>•</span>
            <span>Faktura:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {order.erp_sales_document_number || "Brak dokumentu"}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Treść modalu ze skrolowaniem */}
        <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-6 max-h-[62vh]">
          {/* Wybór typu korekty */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Wariant korekty:</Label>
            <RadioGroup
              value={correctionType}
              onValueChange={(v: any) => setCorrectionType(v)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem value="FULL" id="r-full" className="peer sr-only" />
                <Label
                  htmlFor="r-full"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover/50 p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-500/10 cursor-pointer transition-all text-center h-full"
                >
                  <span className="font-bold text-sm">Całkowita</span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Anulowanie / Zwrot 100% (towary + koszty)
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="PARTIAL_QUANTITY" id="r-qty" className="peer sr-only" />
                <Label
                  htmlFor="r-qty"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover/50 p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-500/10 cursor-pointer transition-all text-center h-full"
                >
                  <span className="font-bold text-sm">Ilościowa</span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Zwrot wybranych sztuk towaru
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="PARTIAL_VALUE" id="r-val" className="peer sr-only" />
                <Label
                  htmlFor="r-val"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover/50 p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-500/10 cursor-pointer transition-all text-center h-full"
                >
                  <span className="font-bold text-sm">Wartościowa</span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Korekta ceny jednostkowej / Rabat
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Forma zwrotu środków & Termin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-xl p-3 bg-muted/20">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                Forma zwrotu środków (Subiekt GT):
              </Label>
              <Select value={paymentType} onValueChange={(val) => setPaymentType(val)}>
                <SelectTrigger className="h-10 text-sm bg-card">
                  <SelectValue placeholder="Wybierz formę zwrotu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="przelew">Tradycyjny przelew bankowy (przelew)</SelectItem>
                  <SelectItem value="gotówka">Gotówka (gotówka)</SelectItem>
                  <SelectItem value="karta">Karta płatnicza / Online (karta)</SelectItem>
                  <SelectItem value="PayU">Bramka PayU</SelectItem>
                  <SelectItem value="Przelewy24">Bramka Przelewy24</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(paymentType === "przelew" || paymentType === "karta" || paymentType === "PayU" || paymentType === "Przelewy24") && (
              <div className="space-y-2">
                <Label htmlFor="payment-due-date" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  Planowany termin zwrotu (payment_due_date):
                </Label>
                <Input
                  id="payment-due-date"
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="h-10 text-sm bg-card font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Wymagane w formacie YYYY-MM-DD. Domyślnie data dzisiejsza.
                </p>
              </div>
            )}
          </div>

          {/* Powód korekty */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-foreground">
              Przyczyna korekty (wymagane w KSeF / Subiekcie):
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. Zwrot towaru z powodu wady, odstąpienie od umowy w 14 dni..."
              className="h-20 text-sm resize-none"
            />
          </div>

          {/* Pozycje towarowe */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Towary z zamówienia ({lineItems.length}):</span>
            </Label>
            <div className="border rounded-xl p-3 space-y-3 bg-muted/20">
              {lineItems.map((item: any, idx: number) => {
                const symbol = item.offer?.id || `ITEM_${idx}`;
                const name = item.offer?.name || "Towar bez nazwy";
                const origQty = Number(item.quantity || 1);
                const origPrice = Number(item.price?.amount || 0);

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground leading-snug break-words">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pierwotnie na FS: <span className="font-medium text-foreground">{origQty} szt.</span> ×{" "}
                        <span className="font-medium text-foreground">{origPrice.toFixed(2)} PLN</span>
                      </p>
                    </div>

                    {correctionType === "PARTIAL_QUANTITY" && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Label className="text-xs shrink-0 text-muted-foreground">Nowa ilość:</Label>
                        <Input
                          type="number"
                          min={0}
                          max={origQty}
                          defaultValue={itemCorrections[symbol]?.quantity ?? origQty}
                          onChange={(e) =>
                            handleQuantityChange(symbol, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-24 text-xs font-mono text-center"
                        />
                      </div>
                    )}

                    {correctionType === "PARTIAL_VALUE" && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Label className="text-xs shrink-0 text-muted-foreground">Nowa cena brutto:</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          defaultValue={itemCorrections[symbol]?.price ?? origPrice}
                          onChange={(e) =>
                            handlePriceChange(symbol, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-28 text-xs font-mono text-center"
                        />
                      </div>
                    )}

                    {correctionType === "FULL" && (
                      <Badge variant="destructive" className="text-xs shrink-0 self-end sm:self-center">
                        Korekta do 0 szt. (-100%)
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Transport i Usługi Dodatkowe */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-400" />
              Korekta Transportu i Usług Dodatkowych:
            </Label>

            {/* Koszt Transportu */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Koszt Dostawy / Transportu</p>
                    <p className="text-xs text-muted-foreground">
                      Pierwotna cena na fakturze: <span className="font-semibold text-foreground">{origShippingCost.toFixed(2)} PLN</span>
                    </p>
                  </div>
                </div>

                {correctionType === "FULL" ? (
                  <Badge variant="destructive" className="text-xs">
                    Pełny zwrot kosztu przesyłki (-{origShippingCost.toFixed(2)} PLN)
                  </Badge>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="chk-shipping"
                        checked={correctShipping}
                        onCheckedChange={(c) => setCorrectShipping(!!c)}
                      />
                      <Label htmlFor="chk-shipping" className="text-xs cursor-pointer font-medium">
                        Koryguj przesyłkę
                      </Label>
                    </div>

                    {correctShipping && (
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground shrink-0">Nowy koszt:</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={origShippingCost}
                          value={correctedShippingCost}
                          onChange={(e) => setCorrectedShippingCost(parseFloat(e.target.value) || 0)}
                          className="h-8 w-24 text-xs font-mono text-center"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Usługi Dodatkowe */}
            {additionalServicesList.length > 0 && (
              <div className="border rounded-xl p-3 bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-indigo-400" />
                  Usługi dodatkowe przypisane do zamówienia:
                </p>

                {additionalServicesList.map((serv) => {
                  const state = selectedServices[serv.id];
                  return (
                    <div
                      key={serv.id}
                      className="flex items-center justify-between gap-4 border-t border-border/30 pt-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{serv.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Pierwotnie: {serv.price.toFixed(2)} PLN
                        </p>
                      </div>

                      {correctionType === "FULL" ? (
                        <Badge variant="destructive" className="text-xs">
                          Zwrot usługi (-{serv.price.toFixed(2)} PLN)
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`serv-${serv.id}`}
                            checked={state?.enabled || false}
                            onCheckedChange={(c) =>
                              setSelectedServices((prev) => ({
                                ...prev,
                                [serv.id]: {
                                  enabled: !!c,
                                  price: prev[serv.id]?.price ?? 0,
                                },
                              }))
                            }
                          />
                          {state?.enabled && (
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs text-muted-foreground shrink-0">Nowa cena:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                max={serv.price}
                                value={state?.price ?? 0}
                                onChange={(e) =>
                                  setSelectedServices((prev) => ({
                                    ...prev,
                                    [serv.id]: {
                                      enabled: true,
                                      price: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                className="h-8 w-24 text-xs font-mono text-center"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border/40 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wysyłanie do Subiekta...
              </>
            ) : (
              "Wystaw KFS w Subiekcie"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
