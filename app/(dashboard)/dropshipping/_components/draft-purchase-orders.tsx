"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { PurchaseOrder, PurchaseOrderLineItem } from "@/types/purchase-order";
import { ServiceIntegration } from "@/types/service-integration";
import { MarketplaceOrder } from "@/types/marketplace-order";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Send,
  PackageSearch,
  Save,
  Trash2,
  MapPin,
  Package,
  Building2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { EditAddressDialog } from "../../shipping/_components/EditAddressDialog";
import { cn } from "@/lib/utils";

// Pomocnik do pobierania danych z PO (obsługa camelCase i snake_case)
function getPOData(po: PurchaseOrder) {
  const marketplaceOrder = (po as any).marketplace_order;
  const supplierIntegration = (po as any).supplier_integration;

  const buyerLogin =
    po.buyerLogin ||
    po.buyer_login ||
    marketplaceOrder?.buyer_login ||
    null;

  const firstItemName =
    po.firstItemName ||
    po.first_item_name ||
    (marketplaceOrder?.line_items?.[0]?.offer as any)?.name ||
    null;

  const externalId =
    po.marketplaceExternalOrderId ||
    po.marketplace_external_order_id ||
    marketplaceOrder?.external_order_id ||
    null;

  const address = marketplaceOrder?.delivery_address || null;
  const supplierName = supplierIntegration?.name || po.supplier_integration?.name || "";
  const lineItems: PurchaseOrderLineItem[] = po.lineItems || po.line_items || [];
  const moId = po.marketplaceOrderId || po.marketplace_order_id || "";

  return { buyerLogin, firstItemName, externalId, address, supplierName, lineItems, moId };
}

// Karta pojedynczego zlecenia roboczego - Kompaktowy Design
const DraftPOCard = ({
  po,
  onLineItemChange,
  onEditAddress,
  onCancel,
}: {
  po: PurchaseOrder;
  onLineItemChange: (poId: string, itemIndex: number, value: string) => void;
  onEditAddress: (po: PurchaseOrder) => void;
  onCancel: (poId: string) => void;
}) => {
  const { buyerLogin, firstItemName, externalId, address, supplierName, lineItems } = getPOData(po);

  const areAllIndexesFilled = lineItems.every(
    (item) => !!(item.supplierProductIndex || item.supplier_product_index)?.trim()
  );

  return (    <Card className="rounded-xl border border-border/30 bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300 hover:border-indigo-500/20 p-3 flex flex-col gap-2">
      {/* Górna linia: Nagłówek i Akcje */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span className="font-bold text-xs text-foreground truncate max-w-[220px] sm:max-w-[320px]" title={firstItemName || undefined}>
            {firstItemName || "Brak nazwy"}
          </span>
          {externalId && (
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              #{externalId}
            </span>
          )}
          {buyerLogin && (
            <span className="text-[10px] text-indigo-500 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25 font-medium shrink-0">
              {buyerLogin}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!areAllIndexesFilled ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold uppercase tracking-wide">
              Brak indeksu ⚠️
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20 font-bold uppercase tracking-wide">
              Gotowe ✨
            </Badge>
          )}
          {/* Akcje jako ikony w nagłówku */}
          <div className="flex items-center border-l border-border/30 pl-2 ml-1 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg"
              onClick={() => onEditAddress(po)}
              title="Edytuj adres dostawy"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-rose-550 hover:bg-rose-500/10 rounded-lg"
              onClick={() => onCancel(po.id)}
              title="Usuń zlecenie"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div> {/* Druga linia: Kompaktowe informacje o dostawie */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground border-t border-border/30 pt-1.5">
        <div className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span>Hurtownia: <strong className="text-foreground font-semibold">{supplierName || "Nieznana"}</strong></span>
        </div>
        <span className="text-muted-foreground/40">•</span>
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="truncate">
            Odbiorca: <strong className="text-foreground font-semibold">{address ? `${address.first_name} ${address.last_name} (${address.city})` : "Brak adresu"}</strong>
          </span>
        </div>
      </div>

      {/* Pozycje zamówienia */}
      <div className="space-y-1 border-t border-border/30 pt-1.5 bg-slate-950/5 dark:bg-slate-950/40 rounded-lg p-2">
        {lineItems.map((item, index) => {
          const hasIndex = !!(item.supplierProductIndex || item.supplier_product_index)?.trim();
          return (
            <div key={`${item.marketplaceLineItemId || item.marketplace_line_item_id}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded border border-indigo-500/20 shrink-0">
                  {item.quantity}x
                </span>
                <span className="font-semibold text-muted-foreground truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="relative w-44 sm:w-52 flex-shrink-0">
                <Input
                  placeholder="Indeks hurtowni..."
                  defaultValue={item.supplierProductIndex || item.supplier_product_index || ""}
                  onChange={(e) => onLineItemChange(po.id, index, e.target.value)}
                  className={cn(
                    "h-7 text-[11px] bg-background border-border rounded-md pr-6 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all duration-200",
                    hasIndex ? "border-emerald-500/30" : "border-rose-500/30"
                  )}
                />
                <span className="absolute right-2 top-1.5 select-none pointer-events-none text-[10px]">
                  {hasIndex ? <span className="text-emerald-500">✓</span> : <span className="text-rose-500">✗</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export function DraftPurchaseOrders() {
  const queryClient = useQueryClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [draftPOs, setDraftPOs] = useState<PurchaseOrder[]>([]);
  const [editingOrder, setEditingOrder] = useState<MarketplaceOrder | null>(null);
  const [loadingAddressForPoId, setLoadingAddressForPoId] = useState<string | null>(null);

  const { data: suppliers } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const queryKeyForDrafts = ["purchaseOrders", { status: "DRAFT" }];

  const {
    data: fetchedData,
    isLoading,
    isFetching,
  } = useQuery<PurchaseOrder[]>({
    queryKey: queryKeyForDrafts,
    queryFn: async () =>
      (
        await api.get(
          `/purchase-orders?status=DRAFT`
        )
      ).data,
  });

  useEffect(() => {
    if (fetchedData) {
      setDraftPOs(fetchedData);
    }
  }, [fetchedData]);

  useEffect(() => {
    if (suppliers && suppliers.length === 1 && !selectedSupplierId) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
  }, [suppliers, selectedSupplierId]);

  const { mutate: cancelPO } = useMutation({
    mutationFn: (poId: string) => api.delete(`/purchase-orders/${poId}`),
    onSuccess: () => {
      toast.success("Zlecenie zostało usunięte z listy roboczej.");
      queryClient.invalidateQueries({ queryKey: queryKeyForDrafts });
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Błąd podczas usuwania zlecenia."
      ),
  });

  const { mutate: sendBulk, isPending: isSendingBulk } = useMutation({
    mutationFn: (supplierId: number) =>
      api.post(`/purchase-orders/bulk-send/${supplierId}`),
    onSuccess: () => {
      toast.success("Zlecenie wysyłki zbiorczej zostało przyjęte.");
      queryClient.invalidateQueries({ queryKey: queryKeyForDrafts });
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Błąd wysyłki zbiorczej."),
  });

  const { mutate: updatePO, isPending: isUpdating } = useMutation({
    mutationFn: (
      data: { poId: string; line_items: any[] }
    ) =>
      api.put(`/purchase-orders/${data.poId}`, { line_items: data.line_items }),
    onSuccess: () => {
      toast.success("Zmiany zostały zapisane.", { id: "save-toast" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyForDrafts });
    },
    onError: (err: any, variables) =>
      toast.error(
        `Błąd zapisu dla PO #${variables.poId.substring(0, 8)}: ${
          err.response?.data?.detail?.[0]?.msg || "Błąd"
        }`,
        { id: "save-toast" }
      ),
  });

  const handleLineItemChange = (
    poId: string,
    itemIndex: number,
    value: string
  ) => {
    setDraftPOs((prev) =>
      prev.map((po) =>
        po.id === poId
          ? {
              ...po,
              lineItems: (po.lineItems || po.line_items || []).map((item, i) =>
                i === itemIndex
                  ? { ...item, supplierProductIndex: value, supplier_product_index: value }
                  : item
              ),
              line_items: (po.lineItems || po.line_items || []).map((item, i) =>
                i === itemIndex
                  ? { ...item, supplierProductIndex: value, supplier_product_index: value }
                  : item
              ),
            }
          : po
      )
    );
  };

  const handleSaveAllChanges = () => {
    toast.loading("Zapisywanie zmian...", { id: "save-toast" });
    const promises = draftPOs.map((po) => {
      const lineItemsSnakeCase = (po.lineItems || po.line_items || []).map((item) => ({
        marketplace_line_item_id: item.marketplaceLineItemId || item.marketplace_line_item_id,
        name: item.name,
        quantity: item.quantity,
        supplier_product_index: item.supplierProductIndex !== undefined ? item.supplierProductIndex : item.supplier_product_index,
      }));

      return updatePO({ poId: po.id, line_items: lineItemsSnakeCase });
    });
    Promise.all(promises);
  };

  const handleSendBulk = () => {
    if (selectedSupplierId) {
      handleSaveAllChanges();
      sendBulk(parseInt(selectedSupplierId, 10));
    }
  };

  const handleEditAddress = async (po: PurchaseOrder) => {
    const moId = po.marketplaceOrderId || po.marketplace_order_id;
    if (!moId) {
      toast.error("Brak ID zamówienia - nie można edytować adresu.");
      return;
    }
    setLoadingAddressForPoId(po.id);
    try {
      const response = await api.get(`/orders/${moId}`);
      setEditingOrder(response.data);
    } catch {
      toast.error("Nie udało się załadować zamówienia do edycji.");
    } finally {
      setLoadingAddressForPoId(null);
    }
  };

  const handleAddressUpdateSuccess = (updatedOrder: MarketplaceOrder) => {
    setEditingOrder(null);
    queryClient.invalidateQueries({
      queryKey: ["orderDetails", updatedOrder.id],
    });
  };

  const filteredPOs = selectedSupplierId
    ? draftPOs.filter(
        (po) =>
          String(po.supplierIntegrationId || po.supplier_integration_id || (po as any).supplier_integration?.id) === selectedSupplierId
      )
    : draftPOs;

  return (
    <>
      <div className="p-4 space-y-4">
        
        {/* Toolbar */}
        <div className="p-3 rounded-xl border border-border/30 bg-muted/20 flex flex-col md:flex-row gap-3 items-stretch justify-between">
          <div className="flex-1 max-w-sm">
            <Label htmlFor="supplier-select" className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Filtruj po hurtowni
            </Label>
            <Select
              value={selectedSupplierId}
              onValueChange={(v) => setSelectedSupplierId(v === "all" ? "" : v)}
            >
              <SelectTrigger id="supplier-select" className="h-8 text-xs bg-background border-border rounded-lg focus:ring-indigo-500/20 text-foreground">
                <SelectValue placeholder="Pokaż wszystkie hurtownie" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border">
                <SelectItem value="all">Wszystkie hurtownie</SelectItem>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAllChanges}
              disabled={isUpdating}
              className="h-8 rounded-lg border-border hover:bg-accent/10 text-xs font-semibold px-3 text-foreground"
            >
              {isUpdating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
              )}
              Zapisz indeksy
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulk}
              disabled={isSendingBulk || filteredPOs.length === 0 || !selectedSupplierId}
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white font-semibold text-xs shadow-md shadow-indigo-500/5 px-3"
              title={!selectedSupplierId ? "Wybierz hurtownię, aby wysłać" : ""}
            >
              {isSendingBulk ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Wyślij ({filteredPOs.length})
            </Button>
          </div>
        </div>

        {/* Loading */}
        {(isLoading || isFetching) && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-indigo-500 h-6 w-6" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isFetching && draftPOs.length === 0 && (
          <div className="text-center py-14 border-2 border-dashed rounded-2xl border-border bg-muted/10 flex flex-col items-center justify-center">
            <div className="p-3 bg-muted rounded-full border border-border mb-3 text-muted-foreground">
              <PackageSearch className="h-8 w-8" />
            </div>
            <h3 className="text-xs font-bold text-foreground">
              Brak zleceń roboczych
            </h3>
            <p className="mt-1.5 text-[11px] text-slate-450 max-w-xs">
              Zlecenia dropshippingowe pojawią się tutaj po oznaczeniu zamówień flagą dropship w Stacji Nabijania lub po ich ręcznym wygenerowaniu.
            </p>
          </div>
        )}

        {/* Info banner */}
        {filteredPOs.length > 0 && (
          <Alert className="border-indigo-500/10 bg-indigo-500/5 rounded-xl py-2 flex items-start gap-2.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <AlertTitle className="text-indigo-300 font-bold text-xs">
                Wersje robocze ({filteredPOs.length} zleceń)
              </AlertTitle>
              <AlertDescription className="text-slate-350 text-[10px] mt-0.5">
                Wpisz brakujące indeksy hurtowni (oznaczone ramką i krzyżykiem) bezpośrednio w kartach zleceń.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Lista kart */}
        <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin">
          {filteredPOs.map((po) => (
            <DraftPOCard
              key={po.id}
              po={po}
              onLineItemChange={handleLineItemChange}
              onEditAddress={handleEditAddress}
              onCancel={cancelPO}
            />
          ))}
        </div>

        {/* Loading indicator dla edycji adresu */}
        {loadingAddressForPoId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-2.5 shadow-2xl">
              <Loader2 className="animate-spin text-indigo-500 h-4 w-4" />
              <span className="text-xs font-semibold text-foreground">Ładowanie danych adresu...</span>
            </div>
          </div>
        )}
      </div>

      <EditAddressDialog
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSuccess={handleAddressUpdateSuccess}
        order={editingOrder}
      />
    </>
  );
}
