"use client";

import { Shipment } from "@/types/shipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Loader2, Package, Truck } from "lucide-react";
import { useShippingConfig } from "../_hooks/use-shipping-config";
import { useState } from "react";
import api from "@/lib/api";
import { downloadFileFromBase64 } from "@/lib/utils";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface ShipmentHistoryProps {
  shipments: Shipment[];
  isLoading: boolean;
  error: Error | null;
}

export function ShipmentHistory({
  shipments,
  isLoading,
  error,
}: ShipmentHistoryProps) {
  // Pobieramy konfigurację, aby móc wyświetlić nazwę kuriera na podstawie ID integracji
  const { data: config, isLoading: isConfigLoading } = useShippingConfig();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getCourierName = (integrationId: number) => {
    if (isConfigLoading || !config) return `Kurier #${integrationId}`;
    return (
      config.couriers.find((c) => c.id === integrationId)?.name ||
      `Nieznany kurier #${integrationId}`
    );
  };

  const handleDownloadLabel = async (shipment: Shipment) => {
    setDownloadingId(shipment.id);
    try {
      const { data } = await api.get(
        `/shipping/shipments/${shipment.id}/label`
      );

      const fileName = `etykieta-${
        shipment.tracking_number || shipment.id
      }.${data.label_format.toLowerCase()}`;
      const mimeType =
        data.label_format === "PDF" ? "application/pdf" : "text/plain";

      downloadFileFromBase64(data.label_data, fileName, mimeType);
      toast.success("Pobrano etykietę!");
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail || "Nie udało się pobrać etykiety."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia Przesyłek</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Ładowanie historii...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            Błąd Historii Przesyłek
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center p-6 text-sm text-destructive">
          <AlertCircle className="mr-2 h-4 w-4" />
          Nie udało się załadować historii przesyłek.
        </CardContent>
      </Card>
    );
  }

  // Komponent nie renderuje nic, jeśli nie ma przesyłek
  if (!shipments || shipments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia Przesyłek</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipments.map((shipment, index: number) => (
          <div
            key={`${shipment.id}-${index}`}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md"
          >
            <div className="flex-1 mb-2 sm:mb-0">
              <div className="flex items-center text-sm font-semibold">
                <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{shipment.tracking_number || "Oczekuje na numer"}</span>
              </div>
              <div className="text-xs text-muted-foreground pl-6">
                {new Date(shipment.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex-shrink-0">
                <Truck className="h-4 w-4 mr-2" />
                {getCourierName(shipment.courier_integration_id)}
              </Badge>
              {/* === NOWY PRZYCISK === */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadLabel(shipment)}
                disabled={downloadingId === shipment.id}
              >
                {downloadingId === shipment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Pobierz</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
