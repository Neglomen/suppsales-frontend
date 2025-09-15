"use client";

import { Home, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Definicje typów dla propsów komponentu
interface PickupPoint {
  name: string;
  address: {
    street: string;
    zipCode: string;
    city: string;
  };
}

interface DeliveryAddress {
  recipientName: string;
  street: string;
  zipCode: string;
  city: string;
}

interface AddressInfoProps {
  pickupPoint?: PickupPoint | null;
  deliveryAddress?: DeliveryAddress | null;
  onEdit: () => void;
}

export function AddressInfo({
  pickupPoint,
  deliveryAddress,
  onEdit,
}: AddressInfoProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 font-medium mb-1">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-muted-foreground" />
          <span>Adres Dostawy</span>
        </div>
        {/* Przycisk edycji jest widoczny tylko dla adresów domowych, nie dla punktów odbioru */}
        {!pickupPoint && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 text-primary" />
            <span className="sr-only">Edytuj adres</span>
          </Button>
        )}
      </div>
      <div className="pl-6 text-muted-foreground">
        {pickupPoint ? (
          <>
            <p className="font-semibold text-foreground">{pickupPoint.name}</p>
            <p>{pickupPoint.address.street}</p>
            <p>
              {pickupPoint.address.zipCode} {pickupPoint.address.city}
            </p>
            <Badge variant="outline" className="mt-2">
              Odbiór w punkcie
            </Badge>
          </>
        ) : deliveryAddress ? (
          <>
            <p className="font-semibold text-foreground">
              {deliveryAddress.recipientName}
            </p>
            <p>{deliveryAddress.street}</p>
            <p>
              {deliveryAddress.zipCode} {deliveryAddress.city}
            </p>
          </>
        ) : (
          <p>Brak adresu dostawy.</p>
        )}
      </div>
    </div>
  );
}
