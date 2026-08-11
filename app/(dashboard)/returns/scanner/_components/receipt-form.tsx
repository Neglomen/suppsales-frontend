"use client";

import { useState } from "react";
import api, { getMediaUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Check,
  Camera,
  Trash,
  AlertTriangle,
  CheckCircle2,
  Package,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 mb-3.5 border-b border-slate-200 dark:border-white/5">
      {icon && <span className="text-primary/70">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}

interface ReceiptFormProps {
  data: any; // return or order details
  type: "RETURN" | "ORDER";
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReceiptForm({ data, type, onSuccess, onCancel }: ReceiptFormProps) {
  const [warehouseStatus, setWarehouseStatus] = useState<"RECEIVED" | "PARTIAL" | "REJECTED">("RECEIVED");
  const [warehouseNotes, setWarehouseNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Post-receipt action state
  const [receiptResult, setReceiptResult] = useState<any | null>(null);

  // Extract items for checklist
  const returnPayload = data.details_payload || {};
  const returnItems = returnPayload.items || returnPayload.lineItems || returnPayload.products || returnPayload.returnedItems || [];
  const orderItems = data.line_items || [];
  
  // Use return items if type is RETURN, else use order items as a starting checklist
  const initialChecklist = type === "RETURN" && returnItems.length > 0
    ? returnItems.map((item: any, idx: number) => ({
        id: idx,
        name: item.name || item.offer?.name || item.product?.name || item.title || `Produkt #${idx + 1}`,
        sku: item.sku || item.offer?.id || item.product_id || "",
        expectedQty: item.quantity ?? item.qty ?? 1,
        receivedQty: item.quantity ?? item.qty ?? 1,
        reason: item.reason?.userComment 
          ? `${item.reason.userComment} (${item.reason.type || ""})`
          : item.reason?.type || (typeof item.reason === "string" ? item.reason : null),
        isVerified: true
      }))
    : orderItems.map((item: any, idx: number) => ({
        id: idx,
        name: item.name || `Pozycja #${idx + 1}`,
        sku: item.sku || "",
        expectedQty: item.quantity ?? 1,
        receivedQty: item.quantity ?? 1,
        reason: null,
        isVerified: false
      }));

  const [checklist, setChecklist] = useState<any[]>(initialChecklist);

  // Date calculation & 14 days warning alert
  const purchasedAtStr = type === "RETURN" ? data.order?.purchased_at : data.purchased_at;
  const createdAtExternalStr = type === "RETURN" ? data.created_at_external : new Date().toISOString();

  const purchasedAt = purchasedAtStr ? new Date(purchasedAtStr) : null;
  const createdAtExternal = createdAtExternalStr ? new Date(createdAtExternalStr) : null;

  let daysDiff = 0;
  let isOver14Days = false;
  if (purchasedAt && createdAtExternal) {
    const diffTime = Math.abs(createdAtExternal.getTime() - purchasedAt.getTime());
    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOver14Days = daysDiff > 14;
  }

  const orderId = type === "RETURN" ? data.order?.id : data.id;
  const externalOrderId = type === "RETURN" ? data.order?.external_order_id : data.external_order_id;

  // Handle file upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      
      try {
        const response = await api.post<{ url: string }>("/returns/upload-photo", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadedUrls.push(response.data.url);
      } catch (err) {
        toast.error(`Błąd przesyłania zdjęcia: ${files[i].name}`);
      }
    }

    setPhotos((prev) => [...prev, ...uploadedUrls]);
    setIsUploading(false);
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const updateQty = (id: number, val: number) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, receivedQty: Math.max(0, val) } : item
      )
    );
  };

  const toggleVerify = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isVerified: !item.isVerified } : item
      )
    );
  };

  // Submit warehouse reception
  const handleSubmitReceipt = async () => {
    setIsSubmitting(true);
    try {
      let returnId = data.id;

      // 1. If type is ORDER, we need to create the Return first
      if (type === "ORDER") {
        const createResponse = await api.post<any>("/returns", {
          order_id: data.id,
          reference_number: data.external_order_id,
          status: "CREATED"
        });
        returnId = createResponse.data.id;
      }

      // 2. Submit receipt data
      const response = await api.post(`/returns/${returnId}/receipt`, {
        warehouse_status: warehouseStatus,
        warehouse_notes: warehouseNotes,
        photos: photos,
        waybill_number: data.waybill_number || null,
        items_received: checklist.map(item => ({
          sku: item.sku,
          quantity: item.receivedQty,
          verified: item.isVerified
        }))
      });

      toast.success("Zwrot został pomyślnie przyjęty w systemie!");
      setReceiptResult(response.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Nie udało się zapisać przyjęcia zwrotu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (receiptResult) {
    return (
      <Card className="bg-white/60 dark:bg-[#0a0c16]/80 border-emerald-500/20 backdrop-blur-xl shadow-2xl">
        <CardContent className="p-6 text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Zwrot przyjęty na magazyn</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm mx-auto">
              Paczka zwrotna #{receiptResult.external_return_id || receiptResult.id.slice(0, 8)} została pomyślnie zarejestrowana. Dział BOK otrzymał powiadomienie o przyjęciu zwrotu towaru.
            </p>
          </div>

          <div className="max-w-xs mx-auto pt-2">
            <Button
              onClick={onSuccess}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground gap-2 py-5 rounded-xl text-xs font-bold shadow-md shadow-primary/20"
            >
              Zakończ i skanuj kolejną paczkę
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
      <CardContent className="p-5 space-y-6">
        <SectionHeader title="Weryfikacja zawartości przesyłki" icon={<Package className="h-3.5 w-3.5" />} />

        {/* Metadane zwrotu i zamówienia */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-muted-foreground">Powiązane zamówienie</span>
            {orderId ? (
              <a
                href={`/orders/${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline flex items-center gap-1"
              >
                {externalOrderId || "Szczegóły zamówienia"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-muted-foreground/50">Brak powiązania</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-mono uppercase tracking-wider text-[9px]">Data zakupu</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {purchasedAt ? format(purchasedAt, "dd.MM.yyyy HH:mm") : "—"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-mono uppercase tracking-wider text-[9px]">Data zgłoszenia</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {createdAtExternal ? format(createdAtExternal, "dd.MM.yyyy HH:mm") : "—"}
              </span>
            </div>
          </div>

          {/* 14 days warning alert */}
          {isOver14Days && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-start gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Przekroczony termin 14 dni</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5 leading-relaxed">
                  Czas od zakupu do zgłoszenia zwrotu wynosi **{daysDiff} dni** (regulaminowy termin to 14 dni).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 1. Item checklist */}
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Checklista produktów</p>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all",
                  item.isVerified
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground leading-snug">{item.name}</p>
                  {item.sku && (
                    <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-mono mt-1 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-muted-foreground">
                      SKU: {item.sku}
                    </Badge>
                  )}
                  {item.reason && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 italic font-medium leading-relaxed bg-amber-50 dark:bg-amber-500/5 p-1.5 rounded-lg border border-amber-200 dark:border-amber-500/10">
                      Powód: {item.reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/40 dark:border-white/5">
                  {/* Qty edit */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Otrzymano:</span>
                    <input
                      type="number"
                      value={item.receivedQty}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 h-7 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-center text-xs font-bold text-foreground font-mono focus:border-primary focus:ring-0 focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground/50">/ {item.expectedQty}</span>
                  </div>

                  {/* Verify button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleVerify(item.id)}
                    className={cn(
                      "h-8 w-8 rounded-lg border shrink-0",
                      item.isVerified
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Warehouse Verification Status */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Stan przyjęcia paczki</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWarehouseStatus("RECEIVED")}
              className={cn(
                "text-xs py-3 sm:py-5 rounded-xl font-bold border leading-snug",
                warehouseStatus === "RECEIVED"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                  : "bg-slate-50 dark:bg-white/5 border-slate-150 dark:border-white/5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 hover:text-foreground"
              )}
            >
              Kompletna (OK)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWarehouseStatus("PARTIAL")}
              className={cn(
                "text-xs py-3 sm:py-5 rounded-xl font-bold border leading-snug",
                warehouseStatus === "PARTIAL"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/15"
                  : "bg-slate-50 dark:bg-white/5 border-slate-150 dark:border-white/5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 hover:text-foreground"
              )}
            >
              Niezgodna / Częściowa
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWarehouseStatus("REJECTED")}
              className={cn(
                "text-xs py-3 sm:py-5 rounded-xl font-bold border leading-snug",
                warehouseStatus === "REJECTED"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
                  : "bg-slate-50 dark:bg-white/5 border-slate-150 dark:border-white/5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 hover:text-foreground"
              )}
            >
              Odrzucona (Wada/Brak)
            </Button>
          </div>
        </div>

        {/* 3. Photos upload */}
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Dokumentacja zdjęciowa</p>
          <div className="flex flex-wrap gap-2.5">
            {photos.map((url, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-250 dark:border-white/10 bg-slate-100 dark:bg-black/40 group">
                <img src={getMediaUrl(url)} alt="Return photo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash className="h-4 w-4 text-rose-400" />
                </button>
              </div>
            ))}

            <label className={cn(
              "w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-white/10",
              isUploading && "opacity-50 pointer-events-none"
            )}>
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground mt-1 font-bold">Dodaj</span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment" // Uruchamia tylny aparat na smartfonach
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 4. Notes */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Uwagi i notatki magazynu</p>
          <Textarea
            value={warehouseNotes}
            onChange={(e) => setWarehouseNotes(e.target.value)}
            placeholder="Wpisz uwagi dotyczące stanu paczki, towarów lub ewentualnych braków..."
            rows={3}
            className="bg-slate-50 dark:bg-black/25 border-slate-200 dark:border-white/10 text-xs rounded-xl focus:border-primary resize-none placeholder:text-muted-foreground/45 text-foreground"
          />
        </div>

        {/* 5. Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSubmitReceipt}
            disabled={isSubmitting || checklist.length === 0}
            className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs shadow-md shadow-primary/10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Zatwierdź Przyjęcie"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
