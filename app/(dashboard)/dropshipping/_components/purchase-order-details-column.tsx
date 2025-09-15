"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { PurchaseOrder, PurchaseOrderLineItem } from "@/types/purchase-order";
import { ServiceIntegration } from "@/types/service-integration";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Send,
  FilePlus2,
  AlertCircle,
  Link as LinkIcon,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditAddressDialog } from "../../shipping/_components/EditAddressDialog";

interface PurchaseOrderDetailsColumnProps {
  selectedOrderId: string | null;
}

// Typ pomocniczy dla stanu. Dane z API są w camelCase.
interface EnrichedLineItem extends PurchaseOrderLineItem {
  marketplace_offer_id?: string;
}

const ProductLineItem = ({
  item,
  onIndexChange,
  onMap,
  disabled,
  isMapping,
}: {
  item: EnrichedLineItem;
  onIndexChange: (value: string) => void;
  onMap: () => void;
  disabled: boolean;
  isMapping: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    item.supplierProductIndex || ""
  );
  useEffect(() => {
    setCurrentIndex(item.supplierProductIndex || "");
  }, [item.supplierProductIndex]);

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentIndex(value);
    onIndexChange(value);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={`item-${item.marketplaceLineItemId}`}>
        {item.name} (x{item.quantity})
      </Label>
      <p className="text-xs text-muted-foreground">
        ID Oferty: {item.marketplace_offer_id || "Brak"}
      </p>
      <div className="flex gap-2">
        <Input
          id={`item-${item.marketplaceLineItemId}`}
          placeholder="Wprowadź indeks produktu..."
          value={currentIndex}
          onChange={handleIndexChange}
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onMap}
          disabled={disabled || !currentIndex.trim() || isMapping}
        >
          {isMapping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Zmapuj</span>
        </Button>
      </div>
    </div>
  );
};

export function PurchaseOrderDetailsColumn({
  selectedOrderId,
}: PurchaseOrderDetailsColumnProps) {
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<EnrichedLineItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [isEditAddressOpen, setEditAddressOpen] = useState(false);

  const { data: order, isLoading: isMarketplaceOrderLoading } =
    useQuery<MarketplaceOrder>({
      queryKey: ["orderDetails", selectedOrderId],
      queryFn: async () => (await api.get(`/orders/${selectedOrderId}`)).data,
      enabled: !!selectedOrderId,
    });

  const { data: suppliers, isLoading: areSuppliersLoading } = useQuery<
    ServiceIntegration[]
  >({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const { data: purchaseOrders, isLoading: isPoLoading } = useQuery<
    PurchaseOrder[]
  >({
    queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
    queryFn: async () =>
      (
        await api.get(
          `/purchase-orders?marketplace_order_id=${selectedOrderId}`
        )
      ).data,
    enabled: !!selectedOrderId,
  });

  const activePurchaseOrder = useMemo(
    () =>
      purchaseOrders?.find(
        (po) => po.status === "DRAFT" || po.status === "SENT_TO_SUPPLIER"
      ),
    [purchaseOrders]
  );
  const cancelledPurchaseOrders = useMemo(
    () => purchaseOrders?.filter((po) => po.status === "CANCELLED") || [],
    [purchaseOrders]
  );

  useEffect(() => {
    if (suppliers && suppliers.length === 1 && !selectedSupplierId) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
  }, [suppliers, selectedSupplierId]);

  useEffect(() => {
    const updateLineItems = async () => {
      if (activePurchaseOrder) {
        setLineItems(activePurchaseOrder.lineItems || []);
        return;
      }
      if (!order) {
        setLineItems([]);
        return;
      }
      const baseItems = (order.lineItems || []).map((item) => ({
        marketplaceLineItemId: item.id,
        name: item.offer.name,
        quantity: item.quantity,
        supplierProductIndex: null,
        marketplace_offer_id: item.offer.id || undefined,
      }));
      if (selectedSupplierId) {
        const offerIds = baseItems
          .map((item) => item.marketplace_offer_id)
          .filter(Boolean) as string[];
        if (offerIds.length === 0) {
          setLineItems(baseItems);
          return;
        }
        try {
          const { data: mappings } = await api.get<Record<string, string>>(
            "/product-supplier-mappings/by-offers",
            {
              params: {
                supplier_integration_id: selectedSupplierId,
                offer_ids: offerIds,
              },
              paramsSerializer: { indexes: null },
            }
          );
          const mappedItems = baseItems.map((item) => ({
            ...item,
            supplierProductIndex: item.marketplace_offer_id
              ? mappings[item.marketplace_offer_id] || null
              : null,
          }));
          setLineItems(mappedItems);
        } catch (e) {
          console.error("Failed to fetch product mappings", e);
          toast.error("Nie udało się pobrać mapowań produktów.");
          setLineItems(baseItems);
        }
      } else {
        setLineItems(baseItems);
      }
    };
    updateLineItems();
  }, [order, activePurchaseOrder, selectedSupplierId]);

  // ### KLUCZOWA ZMIANA: Funkcja pomocnicza do tworzenia payloadu w snake_case ###
  const getPayloadForCreation = () => {
    if (!order || !selectedSupplierId) return null;
    return {
      marketplace_order_id: order.id,
      supplier_integration_id: parseInt(selectedSupplierId, 10),
      line_items: lineItems.map((item) => ({
        marketplace_line_item_id: item.marketplaceLineItemId,
        name: item.name,
        quantity: item.quantity,
        supplier_product_index: item.supplierProductIndex,
      })),
    };
  };

  // ### KLUCZOWA ZMIANA: Mutacja przyjmuje dane w snake_case ###
  const { mutate: createPurchaseOrder, isPending: isCreating } = useMutation({
    mutationFn: (data: NonNullable<ReturnType<typeof getPayloadForCreation>>) =>
      api.post<PurchaseOrder>("/purchase-orders", data),
    onSuccess: (response) => {
      toast.success("Utworzono robocze zamówienie do dostawcy.");
      queryClient.setQueryData(
        ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
        [response.data] // response.data jest w camelCase
      );
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { status: "DRAFT" }],
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.detail?.[0]?.msg ||
        err.response?.data?.detail ||
        "Nie udało się utworzyć zamówienia.";
      toast.error(message);
    },
  });

  const { mutate: sendPurchaseOrder, isPending: isSending } = useMutation({
    mutationFn: (poId: string) => api.post(`/purchase-orders/${poId}/send`),
    onSuccess: () => {
      toast.success("Zamówienie zostało wysłane do dostawcy.");
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
      });
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się wysłać zamówienia."
      ),
  });

  const {
    mutateAsync: createAndSendMutation,
    isPending: isCreatingAndSending,
  } = useMutation({
    mutationFn: async (
      data: NonNullable<ReturnType<typeof getPayloadForCreation>>
    ) => {
      const createResponse = await api.post<PurchaseOrder>(
        "/purchase-orders",
        data
      );
      const newPO = createResponse.data;
      await api.post(`/purchase-orders/${newPO.id}/send`);
      return newPO;
    },
    onSuccess: () => {
      toast.success("Zamówienie zostało utworzone i wysłane do dostawcy.");
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Wystąpił błąd."),
  });

  const { mutate: mapProduct, isPending: isMapping } = useMutation({
    mutationFn: (data: {
      marketplace_offer_id: string;
      supplier_product_index: string;
      supplier_integration_id: number;
    }) => api.post("/product-supplier-mappings", data),
    onSuccess: () => toast.success("Produkt został pomyślnie zmapowany."),
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się zapisać mapowania."
      ),
  });

  const handleCreateAndSend = () => {
    const payload = getPayloadForCreation();
    if (payload) {
      createAndSendMutation(payload);
    }
  };

  const handleCreateDraft = () => {
    const payload = getPayloadForCreation();
    if (payload) {
      createPurchaseOrder(payload);
    }
  };

  const handleLineItemIndexChange = (index: number, value: string) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, supplierProductIndex: value } : item
      )
    );
  };

  const handleMapClick = (item: EnrichedLineItem) => {
    if (
      item.marketplace_offer_id &&
      item.supplierProductIndex &&
      selectedSupplierId
    ) {
      mapProduct({
        marketplace_offer_id: item.marketplace_offer_id,
        supplier_product_index: item.supplierProductIndex,
        supplier_integration_id: parseInt(selectedSupplierId, 10),
      });
    }
  };

  const handleAddressUpdateSuccess = (updatedOrder: MarketplaceOrder) => {
    queryClient.invalidateQueries({
      queryKey: ["orderDetails", selectedOrderId],
    });
    setEditAddressOpen(false);
  };

  if (!selectedOrderId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <FilePlus2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Wybierz zamówienie</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Wybierz zamówienie z listy po prawej, aby utworzyć zlecenie do
            dostawcy.
          </p>
        </div>
      </div>
    );
  }

  const isLoadingAnything =
    isPoLoading || areSuppliersLoading || isMarketplaceOrderLoading;

  if (isLoadingAnything) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">
          Nie znaleziono zamówienia
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Nie udało się załadować szczegółów wybranego zamówienia.
        </p>
      </div>
    );
  }

  const address = order.deliveryAddress;
  const email = order.buyerEmail || "";
  const isDraft = activePurchaseOrder?.status === "DRAFT";
  const isSentOrCompleted =
    activePurchaseOrder &&
    (activePurchaseOrder.status === "SENT_TO_SUPPLIER" ||
      activePurchaseOrder.status === "COMPLETED");

  return (
    <>
      <div className="p-4 space-y-4 h-full overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Adres dostawy</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditAddressOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {address ? (
              <>
                <p className="font-semibold">
                  {address.firstName} {address.lastName}
                </p>
                <p>{address.street}</p>
                <p>
                  {address.zipCode} {address.city}
                </p>
                <p>Tel: {address.phoneNumber}</p>
                <p>E-mail: {email}</p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Brak adresu dostawy w zamówieniu.
              </p>
            )}
          </CardContent>
        </Card>

        {cancelledPurchaseOrders.length > 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Historia zleceń</CardTitle>
              <CardDescription>
                Poniższe zlecenia dla tego zamówienia zostały anulowane.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {cancelledPurchaseOrders.map((po) => (
                  <li key={po.id}>
                    Zlecenie #{po.id.substring(0, 8)} anulowane{" "}
                    {new Date(po.updated_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Zlecenie do dostawcy</CardTitle>
                <CardDescription>
                  Przygotuj dane i wyślij zamówienie do hurtowni.
                </CardDescription>
              </div>
              {activePurchaseOrder && (
                <Badge variant={isDraft ? "secondary" : "default"}>
                  {activePurchaseOrder.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activePurchaseOrder && (
              <div className="space-y-2">
                <Label htmlFor="supplier">Wybierz hurtownię</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                  disabled={areSuppliersLoading}
                >
                  <SelectTrigger id="supplier">
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
            )}
            <Separator />
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <ProductLineItem
                  key={item.marketplaceLineItemId || index}
                  item={{
                    ...item,
                    marketplace_offer_id:
                      order.lineItems[index]?.offer.id || undefined,
                  }}
                  onIndexChange={(value) =>
                    handleLineItemIndexChange(index, value)
                  }
                  onMap={() =>
                    handleMapClick({
                      ...item,
                      marketplace_offer_id:
                        order.lineItems[index]?.offer.id || undefined,
                    })
                  }
                  disabled={(!!activePurchaseOrder && !isDraft) || isMapping}
                  isMapping={isMapping}
                />
              ))}
            </div>
            {isSentOrCompleted && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Zlecenie w trakcie realizacji</AlertTitle>
                <AlertDescription>
                  To zlecenie zostało już przetworzone. Nie można go edytować.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 pt-4">
          {isDraft ? (
            <Button
              onClick={() => sendPurchaseOrder(activePurchaseOrder!.id)}
              disabled={isSending}
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wyślij zlecenie
            </Button>
          ) : isSentOrCompleted ? (
            <p className="col-span-2 text-sm text-center text-muted-foreground">
              To zlecenie jest w trakcie realizacji.
            </p>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCreateDraft}
                disabled={isCreating || !selectedSupplierId}
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Utwórz wersję roboczą
              </Button>
              <Button
                onClick={handleCreateAndSend}
                disabled={isCreatingAndSending || !selectedSupplierId}
              >
                {isCreatingAndSending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Send className="mr-2 h-4 w-4" />
                Utwórz i wyślij
              </Button>
            </>
          )}
        </div>
      </div>
      <EditAddressDialog
        isOpen={isEditAddressOpen}
        onClose={() => setEditAddressOpen(false)}
        onSuccess={handleAddressUpdateSuccess}
        order={order}
      />
    </>
  );
}
