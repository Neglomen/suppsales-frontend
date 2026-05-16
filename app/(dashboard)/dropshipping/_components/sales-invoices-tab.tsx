"use client";

import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { InvoiceableOrderListColumn } from "./invoiceable-order-list-column";
import { SalesInvoiceDetailsColumn } from "./sales-invoice-details-column";

export function SalesInvoicesTab() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full bg-card/30 backdrop-blur-sm rounded-lg border"
    >
      <ResizablePanel defaultSize={65} minSize={40}>
        <SalesInvoiceDetailsColumn selectedOrderId={selectedOrderId} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={35} minSize={25}>
        <InvoiceableOrderListColumn
          selectedOrderId={selectedOrderId}
          onOrderSelect={(order) => setSelectedOrderId(order.id)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
