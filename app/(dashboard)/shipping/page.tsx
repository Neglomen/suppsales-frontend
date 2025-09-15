// src/app/(dashboard)/shipping/page.tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrderListColumn } from "./_components/order-list-column";
import { OrderDetailsColumn } from "./_components/order-details-column";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function ShippingPage() {
  // ### ZMIANA: Przechowujemy tylko ID ###
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleShipmentCreated = (orderId: string) => {
    queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    setSelectedOrderId(null);
  };

  const handleOrderUpdated = (updatedOrder: MarketplaceOrder) => {
    // ### ZMIANA: Unieważniamy cache zamiast ręcznie go aktualizować ###
    // To zmusi oba komponenty do pobrania najświeższych danych
    queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    queryClient.invalidateQueries({
      queryKey: ["orderDetails", updatedOrder.id],
    });

    // Opcjonalnie, możemy od razu wstawić zaktualizowane dane do cache szczegółów
    queryClient.setQueryData(["orderDetails", updatedOrder.id], updatedOrder);
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full max-h-[calc(100vh-3.5rem)] rounded-lg border"
    >
      <ResizablePanel defaultSize={70} minSize={40}>
        <OrderDetailsColumn
          selectedOrderId={selectedOrderId} // Przekazujemy ID
          onShipmentCreated={handleShipmentCreated}
          onOrderUpdated={handleOrderUpdated}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} minSize={25}>
        <OrderListColumn
          selectedOrderId={selectedOrderId} // Przekazujemy ID
          onOrderSelect={(order) => setSelectedOrderId(order.id)} // Ustawiamy ID
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
