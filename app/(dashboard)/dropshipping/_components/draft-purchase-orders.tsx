"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { PurchaseOrder, PurchaseOrderLineItem } from "@/types/purchase-order";
import { ServiceIntegration } from "@/types/service-integration";
import { MarketplaceOrder } from "@/types/marketplace-order";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Send,
  PackageSearch,
  Info,
  Save,
  Home,
  Trash2,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { EditAddressDialog } from "../../shipping/_components/EditAddressDialog";

// Komponent podrzędny do podglądu adresu
const AddressPreviewDialog = ({
  marketplaceOrderId,
  isOpen,
  onClose,
  onEdit,
}: {
  marketplaceOrderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (order: MarketplaceOrder) => void;
}) => {
  const { data: marketplaceOrder, isLoading } = useQuery<MarketplaceOrder>({
    queryKey: ["orderDetails", marketplaceOrderId],
    queryFn: async () => (await api.get(`/orders/${marketplaceOrderId}`)).data,
    enabled: !!marketplaceOrderId && isOpen,
  });

  const address = marketplaceOrder?.deliveryAddress;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Podgląd adresu dostawy</DialogTitle>
          <DialogDescription>
            To jest adres, który zostanie zarejestrowany w hurtowni.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !address ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="text-sm space-y-1 py-4">
            <p className="font-semibold">
              {address.firstName} {address.lastName}
            </p>
            <p>{address.street}</p>
            <p>
              {address.zipCode} {address.city}
            </p>
            <p>Tel: {address.phoneNumber}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
          <Button
            onClick={() => onEdit(marketplaceOrder!)}
            disabled={!marketplaceOrder}
          >
            <Edit className="mr-2 h-4 w-4" /> Edytuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Komponent podrzędny dla pojedynczego wiersza
const DraftPurchaseOrderItem = ({
  po,
  onLineItemChange,
  onPreviewAddress,
  onCancel,
}: {
  po: PurchaseOrder;
  onLineItemChange: (poId: string, itemIndex: number, value: string) => void;
  onPreviewAddress: (po: PurchaseOrder) => void;
  onCancel: (poId: string) => void;
}) => {
  const lineItems = po.lineItems || [];
  // ### POPRAWKA: Odwołanie do supplierProductIndex ###
  const areAllIndexesFilled = lineItems.every(
    (item) => !!item.supplierProductIndex?.trim()
  );

  return (
    <AccordionItem value={po.id}>
      <AccordionTrigger>
        <div className="flex justify-between w-full pr-4 items-center">
          <div className="flex flex-col text-left min-w-0">
            <span
              className="font-semibold text-primary truncate"
              title={po.firstItemName}
            >
              {po.firstItemName || "Brak nazwy produktu"}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {po.buyerLogin || "Brak loginu"} (
              {po.marketplaceExternalOrderId ||
                // ### POPRAWKA: Odwołanie do marketplaceOrderId ###
                po.marketplaceOrderId.substring(0, 8) + "..."}
              )
            </span>
          </div>
          {!areAllIndexesFilled && (
            <Badge variant="destructive" className="ml-4 flex-shrink-0">
              Wymaga uwagi
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 space-y-4 bg-muted/50">
        {lineItems.map((item, index) => (
          <div
            key={`${item.marketplaceLineItemId}-${index}`}
            className="space-y-1"
          >
            <Label htmlFor={`${po.id}-${index}`}>
              {item.name} (x{item.quantity})
            </Label>
            <Input
              id={`${po.id}-${index}`}
              placeholder="Wprowadź indeks produktu..."
              // ### POPRAWKA: Odwołanie do supplierProductIndex ###
              defaultValue={item.supplierProductIndex || ""}
              onChange={(e) => onLineItemChange(po.id, index, e.target.value)}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2 border-t mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreviewAddress(po)}
          >
            <Home className="mr-2 h-4 w-4" />
            Pokaż adres
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancel(po.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń z listy
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export function DraftPurchaseOrders() {
  const queryClient = useQueryClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [draftPOs, setDraftPOs] = useState<PurchaseOrder[]>([]);
  const [previewOrder, setPreviewOrder] = useState<PurchaseOrder | null>(null);
  const [orderToEditAddress, setOrderToEditAddress] =
    useState<MarketplaceOrder | null>(null);

  const { data: suppliers } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const queryKeyForDrafts = [
    "purchaseOrders",
    { status: "DRAFT", supplier: selectedSupplierId },
  ];

  const {
    data: fetchedData,
    isLoading,
    isFetching,
  } = useQuery<PurchaseOrder[]>({
    queryKey: queryKeyForDrafts,
    queryFn: async () =>
      (
        await api.get(
          `/purchase-orders?status=DRAFT&supplier_id=${selectedSupplierId}`
        )
      ).data,
    enabled: !!selectedSupplierId,
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
      data: { poId: string; line_items: any[] } // Oczekujemy już snake_case
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
              lineItems: (po.lineItems || []).map((item, i) =>
                i === itemIndex
                  ? { ...item, supplierProductIndex: value }
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
      // Ręczna konwersja na snake_case przed wysłaniem
      const lineItemsSnakeCase = (po.lineItems || []).map((item) => ({
        marketplace_line_item_id: item.marketplaceLineItemId,
        name: item.name,
        quantity: item.quantity,
        supplier_product_index: item.supplierProductIndex,
      }));

      return updatePO({ poId: po.id, line_items: lineItemsSnakeCase });
    });
    Promise.all(promises);
  };

  const handleSendBulk = () => {
    if (selectedSupplierId) {
      handleSaveAllChanges(); // Zapisujemy przed wysłaniem
      sendBulk(parseInt(selectedSupplierId, 10));
    }
  };

  const handleOpenEditAddress = (order: MarketplaceOrder) => {
    setPreviewOrder(null);
    setOrderToEditAddress(order);
  };

  const handleAddressUpdateSuccess = (updatedOrder: MarketplaceOrder) => {
    setOrderToEditAddress(null);
    queryClient.invalidateQueries({
      queryKey: ["orderDetails", updatedOrder.id],
    });
  };

  return (
    <>
      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="supplier-select">Wybierz hurtownię</Label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
            >
              <SelectTrigger id="supplier-select">
                <SelectValue placeholder="Wybierz..." />
              </SelectTrigger>
              <SelectContent>
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
              onClick={handleSaveAllChanges}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Zapisz
            </Button>
            <Button
              onClick={handleSendBulk}
              disabled={isSendingBulk || draftPOs.length === 0}
            >
              {isSendingBulk && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Send className="mr-2 h-4 w-4" />
              Wyślij ({draftPOs.length})
            </Button>
          </div>
        </div>

        {(isLoading || isFetching) && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {selectedSupplierId &&
          !isLoading &&
          !isFetching &&
          draftPOs.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Brak zleceń roboczych
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Brak oczekujących zleceń dla wybranej hurtowni.
              </p>
            </div>
          )}

        {selectedSupplierId && draftPOs.length > 0 && (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Tryb edycji</AlertTitle>
            <AlertDescription>
              Uzupełnij brakujące indeksy, zapisz zmiany, a następnie wyślij
              wszystko do dostawcy.
            </AlertDescription>
          </Alert>
        )}

        <Accordion type="multiple" className="w-full">
          {draftPOs.map((po) => (
            <DraftPurchaseOrderItem
              key={po.id}
              po={po}
              onLineItemChange={handleLineItemChange}
              onPreviewAddress={setPreviewOrder}
              onCancel={cancelPO}
            />
          ))}
        </Accordion>
      </div>

      <AddressPreviewDialog
        // ### POPRAWKA: Odwołanie do marketplaceOrderId ###
        marketplaceOrderId={previewOrder?.marketplaceOrderId || null}
        isOpen={!!previewOrder}
        onClose={() => setPreviewOrder(null)}
        onEdit={handleOpenEditAddress}
      />

      <EditAddressDialog
        isOpen={!!orderToEditAddress}
        onClose={() => setOrderToEditAddress(null)}
        onSuccess={handleAddressUpdateSuccess}
        order={orderToEditAddress}
      />
    </>
  );
}
