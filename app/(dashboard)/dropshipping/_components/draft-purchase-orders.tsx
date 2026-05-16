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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Send,
  PackageSearch,
  Info,
  Save,
  Trash2,
  MapPin,
  ChevronDown,
  User,
  Package,
  Building2,
  Pencil,
} from "lucide-react";
import { EditAddressDialog } from "../../shipping/_components/EditAddressDialog";

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

// Karta pojedynczego zlecenia roboczego
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
  const [erpOpen, setErpOpen] = useState(false);
  const { buyerLogin, firstItemName, externalId, address, supplierName, lineItems } = getPOData(po);

  const areAllIndexesFilled = lineItems.every(
    (item) => !!(item.supplierProductIndex || item.supplier_product_index)?.trim()
  );

  return (
    <div className="rounded-2xl border border-border/15 bg-card/60 glass-dark shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:shadow-primary/10 hover:border-primary/20">
      {/* Header karty */}
      <div className="px-4 py-3 flex items-start justify-between gap-3 bg-muted/20 border-b border-border/10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate" title={firstItemName || undefined}>
              {firstItemName || "Brak nazwy produktu"}
            </p>
            {externalId && (
              <p className="text-xs text-muted-foreground font-mono">#{externalId}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!areAllIndexesFilled && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Brak indeksu</Badge>
          )}
          {areAllIndexesFilled && (
            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Gotowe do wysłania</Badge>
          )}
        </div>
      </div>

      {/* Informacje o zamówieniu */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {buyerLogin && (
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-foreground/80">{buyerLogin}</span>
          </div>
        )}
        {supplierName && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{supplierName}</span>
          </div>
        )}
        {address && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {address.first_name} {address.last_name}, {address.city}
            </span>
          </div>
        )}
        <div className="text-muted-foreground/60 col-span-2 flex items-center gap-1.5">
          <Package className="h-3 w-3" />
          <span>{lineItems.length} produkt{lineItems.length !== 1 ? "y" : ""}</span>
        </div>
      </div>

      {/* Rozwijana sekcja ERP */}
      <Collapsible open={erpOpen} onOpenChange={setErpOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium border-t border-border/10 bg-muted/10 hover:bg-primary/5 transition-colors duration-200 group"
          >
            <span className="text-muted-foreground group-hover:text-primary transition-colors">
              Indeksy hurtowni ({lineItems.filter(i => !!(i.supplierProductIndex || i.supplier_product_index)?.trim()).length}/{lineItems.length} uzupełnione)
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${erpOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-2.5 bg-background/30 border-t border-border/5">
            {lineItems.map((item, index) => (
              <div key={`${item.marketplaceLineItemId || item.marketplace_line_item_id}-${index}`} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {item.name} <span className="text-primary/70">×{item.quantity}</span>
                </Label>
                <Input
                  placeholder="Indeks produktu w hurtowni..."
                  defaultValue={item.supplierProductIndex || item.supplier_product_index || ""}
                  onChange={(e) => onLineItemChange(po.id, index, e.target.value)}
                  className="h-8 text-xs bg-background/60 border-border/20 focus-visible:ring-primary/30"
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Akcje */}
      <div className="px-4 py-2.5 flex items-center justify-end gap-2 border-t border-border/10 bg-background/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => onEditAddress(po)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edytuj adres
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          onClick={() => onCancel(po.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Usuń
        </Button>
      </div>
    </div>
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

  // Ładuj WSZYSTKIE zlecenia robocze bez potrzeby wybrania hurtowni
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
    onSuccess: (_, poId) => {
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

  // Filtrowanie po wybranej hurtowni (opcjonalne)
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="supplier-select" className="text-xs text-muted-foreground mb-1.5 block">
              Filtruj po hurtowni (lub zostaw puste by zobaczyć wszystkie)
            </Label>
            <Select
              value={selectedSupplierId}
              onValueChange={(v) => setSelectedSupplierId(v === "all" ? "" : v)}
            >
              <SelectTrigger id="supplier-select" className="h-9 text-sm">
                <SelectValue placeholder="Wszystkie hurtownie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
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
              className="h-9"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Zapisz indeksy
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulk}
              disabled={isSendingBulk || filteredPOs.length === 0 || !selectedSupplierId}
              className="h-9"
              title={!selectedSupplierId ? "Wybierz hurtownię by wysłać" : ""}
            >
              {isSendingBulk && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Send className="mr-2 h-4 w-4" />
              Wyślij ({filteredPOs.length})
            </Button>
          </div>
        </div>

        {/* Loading */}
        {(isLoading || isFetching) && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isFetching && draftPOs.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-2xl border-border/30">
            <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-muted-foreground">
              Brak zleceń roboczych
            </h3>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Aby dodać zlecenie, wybierz zamówienia z listy po prawej i kliknij "Utwórz zlecenia robocze".
            </p>
          </div>
        )}

        {/* Info banner */}
        {filteredPOs.length > 0 && (
          <Alert className="border-primary/20 bg-primary/5 rounded-xl py-2.5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-semibold text-sm">
              {filteredPOs.length} zlecenie{filteredPOs.length > 1 ? "ń" : ""} robocze{filteredPOs.length > 1 ? "" : ""}
            </AlertTitle>
            <AlertDescription className="text-muted-foreground text-xs">
              Uzupełnij indeksy produktów (z katalogu hurtowni) i użyj "Wyślij" po wybraniu hurtowni.
            </AlertDescription>
          </Alert>
        )}

        {/* Lista kart */}
        <div className="space-y-3">
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
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-6 flex items-center gap-3 shadow-2xl">
              <Loader2 className="animate-spin text-primary h-5 w-5" />
              <span className="text-sm">Ładowanie danych adresu...</span>
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
