"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, ShieldCheck, Zap, Lock, Sliders, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface ChannelOffer {
  id: string;
  external_offer_id: string;
  sync_rule?: string;
  safety_buffer?: number;
  max_auction_quantity?: number;
  override_price?: number;
}

interface StockRuleModalProps {
  offer: ChannelOffer | null;
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StockRuleModal({
  offer,
  productName,
  open,
  onOpenChange,
  onSuccess,
}: StockRuleModalProps) {
  const [syncRule, setSyncRule] = useState<string>("ERP_MIRROR");
  const [safetyBuffer, setSafetyBuffer] = useState<number>(0);
  const [maxAuctionQuantity, setMaxAuctionQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (offer) {
      setSyncRule(offer.sync_rule || "ERP_MIRROR");
      setSafetyBuffer(offer.safety_buffer || 0);
      setMaxAuctionQuantity(offer.max_auction_quantity ? offer.max_auction_quantity.toString() : "");
    }
  }, [offer, open]);

  const handleSave = async () => {
    if (!offer) return;
    try {
      setIsSaving(true);
      toast.loading("Zapisywanie reguły stanów...", { id: "save-stock-rule" });
      await api.put(`/inventory/channel-offers/${offer.id}/rule`, {
        sync_rule: syncRule,
        safety_buffer: safetyBuffer,
        max_auction_quantity: maxAuctionQuantity ? parseInt(maxAuctionQuantity, 10) : null,
      });
      toast.success("Zaktualizowano regułę i przeliczono stan dla aukcji!", { id: "save-stock-rule" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Nie udało się zapisać reguły.", { id: "save-stock-rule" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Reguła Pilnowania Stanu na Aukcji
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {productName ? `${productName} ` : ""}
                {offer ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Aukcja Allegro: {offer.external_offer_id}</code> : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Label className="text-sm font-semibold">Wybierz sposób wyliczania ilości na aukcji:</Label>

          <RadioGroup value={syncRule} onValueChange={setSyncRule} className="space-y-3">
            {/* Rule 1: ERP Mirror */}
            <div
              onClick={() => setSyncRule("ERP_MIRROR")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                syncRule === "ERP_MIRROR"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="ERP_MIRROR" id="rule-erp" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  Pełne Lustro Magazynu / Subiekt GT (1:1)
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ilość na aukcji dokładnie odpowiada aktualnej ilości w magazynie centralnym.
                </p>
              </div>
            </div>

            {/* Rule 2: Safety Buffer */}
            <div
              onClick={() => setSyncRule("BUFFER")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                syncRule === "BUFFER"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="BUFFER" id="rule-buffer" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Bufor Bezpieczeństwa (Odejmij N sztuk)
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Zawsze wystawiaj na aukcji o wyznaczoną liczbę mniej niż posiadasz w magazynie.
                </p>
                {syncRule === "BUFFER" && (
                  <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label htmlFor="buffer-val" className="text-xs">Zapas bezpieczeństwa (szt.):</Label>
                    <Input
                      id="buffer-val"
                      type="number"
                      min="1"
                      value={safetyBuffer}
                      onChange={(e) => setSafetyBuffer(parseInt(e.target.value, 10) || 0)}
                      className="w-24 h-8 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Rule 3: Fixed Cap */}
            <div
              onClick={() => setSyncRule("FIXED_CAP")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                syncRule === "FIXED_CAP"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="FIXED_CAP" id="rule-fixed" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  Stały Limit na Aukcji (Max N sztuk)
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nie pokazuj kupującym całości magazynu. Trzymaj np. max 5 sztuk na aukcji, dopóki towar nie sięgnie zera.
                </p>
                {syncRule === "FIXED_CAP" && (
                  <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Label htmlFor="max-val" className="text-xs">Maksymalny limit na aukcji (szt.):</Label>
                    <Input
                      id="max-val"
                      type="number"
                      min="1"
                      placeholder="np. 5"
                      value={maxAuctionQuantity}
                      onChange={(e) => setMaxAuctionQuantity(e.target.value)}
                      className="w-24 h-8 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? "Zapisywanie..." : "Zapisz i Zastosuj Regułę"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
