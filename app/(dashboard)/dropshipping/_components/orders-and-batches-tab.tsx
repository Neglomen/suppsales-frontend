"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftPurchaseOrders } from "./draft-purchase-orders";
import { HistoryTable } from "./history-and-settings";
import { DropshippingOrdersTab } from "./dropshipping-orders-tab";
import { FileText, History, ShoppingBag } from "lucide-react";

export function OrdersAndBatchesTab() {
  return (
    <div className="space-y-4 p-2 sm:p-4">
      <Tabs defaultValue="drafts" className="w-full space-y-4">
        <TabsList className="border border-white/10 bg-slate-900/60 p-1 rounded-2xl glass shadow-md flex flex-wrap h-auto gap-1 self-start shrink-0">
          <TabsTrigger
            value="drafts"
            className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200"
          >
            <FileText className="h-4 w-4" />
            Robocze Zlecenia
          </TabsTrigger>

          <TabsTrigger
            value="batches"
            className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200"
          >
            <History className="h-4 w-4" />
            Wysłane Partie Zleceń
          </TabsTrigger>

          <TabsTrigger
            value="all"
            className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200"
          >
            <ShoppingBag className="h-4 w-4" />
            Wszystkie Zlecenia Hurtowe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="mt-0 focus:outline-none">
          <DraftPurchaseOrders />
        </TabsContent>

        <TabsContent value="batches" className="mt-0 focus:outline-none">
          <HistoryTable />
        </TabsContent>

        <TabsContent value="all" className="mt-0 focus:outline-none">
          <DropshippingOrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
