"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Layers,
  Settings2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface OfferConfigModalProps {
  offer: any;
  basePrice: number;
  baseStock: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OfferConfigModal({
  offer,
  basePrice,
  baseStock,
  open,
  onOpenChange,
  onSuccess,
}: OfferConfigModalProps) {
  const [externalOfferId, setExternalOfferId] = useState("");
  const [channelSku, setChannelSku] = useState("");

  // Individual Sync Toggles
  const [syncStockEnabled, setSyncStockEnabled] = useState<boolean>(true);
  const [syncPriceEnabled, setSyncPriceEnabled] = useState<boolean>(true);

  // Price Rule States
  const [priceRule, setPriceRule] = useState<string>("BASE");
  const [markupAmount, setMarkupAmount] = useState<number>(5);
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [fixedPrice, setFixedPrice] = useState<number>(0);

  // Stock Rule States
  const [syncRule, setSyncRule] = useState<string>("ERP_MIRROR");
  const [safetyBuffer, setSafetyBuffer] = useState<number>(0);
  const [maxAuctionQty, setMaxAuctionQty] = useState<number>(5);
  const [stockPercentage, setStockPercentage] = useState<number>(50);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (offer) {
      setExternalOfferId(offer.external_offer_id || "");
      setChannelSku(offer.channel_sku || "");

      setSyncStockEnabled(offer.sync_stock_enabled ?? true);
      setSyncPriceEnabled(offer.sync_price_enabled ?? true);

      setPriceRule(offer.price_rule || "BASE");
      setMarkupAmount(offer.price_markup_amount ?? 5);
      setMarkupPercent(offer.price_markup_percent ?? 10);
      setFixedPrice(offer.override_price ?? basePrice);

      setSyncRule(offer.sync_rule || "ERP_MIRROR");
      setSafetyBuffer(offer.safety_buffer ?? 0);
      setMaxAuctionQty(offer.max_auction_quantity ?? 5);
      setStockPercentage(offer.stock_percentage ?? 50);
    }
  }, [offer, basePrice]);

  // Calculate live preview price
  const calculatePreviewPrice = () => {
    let price = Number(basePrice) || 0;
    if (priceRule === "FIXED") {
      return Number(fixedPrice) || 0;
    } else if (priceRule === "ADD_AMOUNT") {
      return price + (Number(markupAmount) || 0);
    } else if (priceRule === "SUB_AMOUNT") {
      return Math.max(0.01, price - (Number(markupAmount) || 0));
    } else if (priceRule === "ADD_PERCENT") {
      return price * (1 + (Number(markupPercent) || 0) / 100);
    } else if (priceRule === "SUB_PERCENT") {
      return Math.max(0.01, price * (1 - (Number(markupPercent) || 0) / 100));
    }
    return price;
  };

  // Calculate live preview stock from ERP
  const calculatePreviewStock = () => {
    let stock = Number(baseStock) || 0;
    if (syncRule === "BUFFER") {
      return Math.max(0, stock - (Number(safetyBuffer) || 0));
    } else if (syncRule === "FIXED_CAP") {
      return stock > 0 ? Math.min(stock, Number(maxAuctionQty) || 1) : 0;
    } else if (syncRule === "PERCENTAGE") {
      return Math.floor((stock * (Number(stockPercentage) || 0)) / 100);
    }
    return stock;
  };

  const handleSave = async () => {
    if (!offer) return;
    try {
      setIsLoading(true);
      await api.put(`/inventory/channel-offers/${offer.id}`, {
        external_offer_id: externalOfferId,
        channel_sku: channelSku,

        sync_stock_enabled: syncStockEnabled,
        sync_price_enabled: syncPriceEnabled,

        price_rule: priceRule,
        price_markup_amount: Number(markupAmount) || 0,
        price_markup_percent: Number(markupPercent) || 0,
        override_price: priceRule === "FIXED" ? Number(fixedPrice) : null,

        sync_rule: syncRule,
        safety_buffer: Number(safetyBuffer) || 0,
        max_auction_quantity: Number(maxAuctionQty) || null,
        stock_percentage: Number(stockPercentage) || null,
      });

      toast.success("Konfiguracja oferty została zapisana i wywołano synchronizację.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się zapisać konfiguracji.");
    } finally {
      setIsLoading(false);
    }
  };

  const previewPrice = calculatePreviewPrice().toFixed(2);
  const previewStock = calculatePreviewStock();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Konfiguracja Powiązanej Oferty</DialogTitle>
              <DialogDescription className="mt-0.5">
                Zmień numer ID oferty oraz skonfiguruj automatyczne reguły ceny i stanów.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* SECTION 1: Identifiers */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Hash className="h-4 w-4 text-primary" /> Identyfikatory Oferty w Kanałach
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">ID Oferty (Wybierz / Zmień)</Label>
                <Input
                  value={externalOfferId}
                  onChange={(e) => setExternalOfferId(e.target.value)}
                  placeholder="np. 201743817 lub 18092225226"
                  className="font-mono text-sm mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Identyfikator aukcji w Allegro/Empik.
                </p>
              </div>
              <div>
                <Label className="text-xs">Symbol Oferty Sprzedawcy (Shop SKU)</Label>
                <Input
                  value={channelSku}
                  onChange={(e) => setChannelSku(e.target.value)}
                  placeholder="np. 17863365459"
                  className="font-mono text-sm mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Symbol SKU przypisany w panelu sprzedawcy.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICE RULES */}
          <div className="p-4 rounded-xl border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <DollarSign className="h-4 w-4 text-emerald-500" /> Reguła Wyliczania Ceny
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Cena na aukcji:</div>
                <div className="text-base font-bold text-emerald-500">{previewPrice} PLN</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <Switch checked={syncPriceEnabled} onCheckedChange={setSyncPriceEnabled} id="sync-price-switch" />
                <Label htmlFor="sync-price-switch" className="text-xs font-semibold cursor-pointer">
                  Włącz automatyczną synchronizację ceny dla tej aukcji
                </Label>
              </div>
              <Badge variant={syncPriceEnabled ? "default" : "secondary"} className="text-[10px]">
                {syncPriceEnabled ? "Cena: Aktywna" : "Cena: Wyłączona"}
              </Badge>
            </div>

            {syncPriceEnabled && (
              <RadioGroup value={priceRule} onValueChange={setPriceRule} className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Option BASE */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "BASE" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("BASE")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Cena Bazowa (1:1)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Zawsze równa cenie magazynowej ({basePrice} PLN).
                </p>
              </div>

              {/* Option FIXED (Stała Cena) */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "FIXED" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("FIXED")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <DollarSign className="h-3.5 w-3.5" /> Stała Cena (Sztywna)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Ustawia stałą kwotę niezależnie od bazy.</p>
              </div>

              {/* Option ADD_AMOUNT */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "ADD_AMOUNT" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("ADD_AMOUNT")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" /> Narzut Kwotowy (+zł)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Dodaje kwotę (np. +5.00 zł).</p>
              </div>

              {/* Option SUB_AMOUNT (Minus kwotowy / Rabat) */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "SUB_AMOUNT" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("SUB_AMOUNT")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <TrendingDown className="h-3.5 w-3.5" /> Minus Kwotowy (-zł)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Odejmuje kwotę (np. -10.00 zł).</p>
              </div>

              {/* Option ADD_PERCENT */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "ADD_PERCENT" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("ADD_PERCENT")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Percent className="h-3.5 w-3.5" /> Narzut Procentowy (+%)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Dolicza % na prowizję (np. +15%).</p>
              </div>

              {/* Option SUB_PERCENT */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  priceRule === "SUB_PERCENT" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => setPriceRule("SUB_PERCENT")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <TrendingDown className="h-3.5 w-3.5" /> Rabat Procentowy (-%)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Obniża cenę o % (np. -5%).</p>
              </div>
            </RadioGroup>
            )}

            {/* Price Rule Input Fields */}
            {syncPriceEnabled && priceRule === "FIXED" && (
              <div className="pt-1 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Stała cena na aukcji (PLN):</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(Number(e.target.value))}
                  className="w-36 font-mono text-sm"
                />
              </div>
            )}

            {syncPriceEnabled && priceRule === "ADD_AMOUNT" && (
              <div className="pt-1 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Dodatkowa kwota (PLN):</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={markupAmount}
                  onChange={(e) => setMarkupAmount(Number(e.target.value))}
                  className="w-36 font-mono text-sm"
                />
              </div>
            )}

            {syncPriceEnabled && priceRule === "SUB_AMOUNT" && (
              <div className="pt-1 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Kwota rabatu / odejmowana (PLN):</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={markupAmount}
                  onChange={(e) => setMarkupAmount(Number(e.target.value))}
                  className="w-36 font-mono text-sm"
                />
              </div>
            )}

            {syncPriceEnabled && priceRule === "ADD_PERCENT" && (
              <div className="pt-1 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Narzut procentowy (%):</Label>
                <Input
                  type="number"
                  step="1"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))}
                  className="w-36 font-mono text-sm"
                />
              </div>
            )}

            {syncPriceEnabled && priceRule === "SUB_PERCENT" && (
              <div className="pt-1 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Rabat procentowy (%):</Label>
                <Input
                  type="number"
                  step="1"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))}
                  className="w-36 font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* SECTION 3: STOCK RULES */}
          <div className="p-4 rounded-xl border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Layers className="h-4 w-4 text-blue-500" /> Reguła Wyliczania Stanu (Ilości)
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Ilość na aukcji:</div>
                <div className="text-base font-bold text-blue-500">{previewStock} szt.</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <Switch checked={syncStockEnabled} onCheckedChange={setSyncStockEnabled} id="sync-stock-switch" />
                <Label htmlFor="sync-stock-switch" className="text-xs font-semibold cursor-pointer">
                  Włącz automatyczną synchronizację stanu dla tej aukcji
                </Label>
              </div>
              <Badge variant={syncStockEnabled ? "default" : "secondary"} className="text-[10px]">
                {syncStockEnabled ? "Stan: Aktywny" : "Stan: Wyłączony"}
              </Badge>
            </div>

            {syncStockEnabled && (
              <>
                <RadioGroup value={syncRule} onValueChange={setSyncRule} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      syncRule === "ERP_MIRROR" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSyncRule("ERP_MIRROR")}
                  >
                    <span className="font-semibold text-xs block mb-1">🔄 Lustro z ERP (1:1)</span>
                    <p className="text-[11px] text-muted-foreground">Stan na aukcji = 100% stanu z ERP Subiekt GT ({baseStock} szt.).</p>
                  </div>

                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      syncRule === "BUFFER" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSyncRule("BUFFER")}
                  >
                    <span className="font-semibold text-xs block mb-1">🛡️ Bufor ERP (-N)</span>
                    <p className="text-[11px] text-muted-foreground">Stan na aukcji = (Stan ERP - N szt. bufora zapasu).</p>
                  </div>

                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      syncRule === "FIXED_CAP" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSyncRule("FIXED_CAP")}
                  >
                    <span className="font-semibold text-xs block mb-1">📌 Limit Max z ERP</span>
                    <p className="text-[11px] text-muted-foreground">Stan na aukcji = min(Stan ERP, N szt. limitu max).</p>
                  </div>

                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      syncRule === "PERCENTAGE" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSyncRule("PERCENTAGE")}
                  >
                    <span className="font-semibold text-xs block mb-1">📊 Procent ze stanu (X%)</span>
                    <p className="text-[11px] text-muted-foreground">Stan na aukcji = X% ogólnego stanu magazynowego z ERP.</p>
                  </div>
                </RadioGroup>

                {syncRule === "BUFFER" && (
                  <div className="pt-1 flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Rezerwa / Bufor ze stanu ERP (szt.):</Label>
                    <Input
                      type="number"
                      min="1"
                      value={safetyBuffer}
                      onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                      className="w-36 font-mono text-sm"
                    />
                  </div>
                )}

                {syncRule === "FIXED_CAP" && (
                  <div className="pt-1 flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Maksymalny limit na aukcji (szt.):</Label>
                    <Input
                      type="number"
                      min="1"
                      value={maxAuctionQty}
                      onChange={(e) => setMaxAuctionQty(Number(e.target.value))}
                      className="w-36 font-mono text-sm"
                    />
                  </div>
                )}

                {syncRule === "PERCENTAGE" && (
                  <div className="pt-1 flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Procent ze stanu ERP (%):</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={stockPercentage}
                      onChange={(e) => setStockPercentage(Number(e.target.value))}
                      className="w-36 font-mono text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-primary hover:bg-primary/90">
            {isLoading ? "Zapisywanie..." : "Zapisz i Prześlij na Aukcję"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
