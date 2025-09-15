// src/app/(dashboard)/settings/product-mappings/page.tsx
import { MappingsDataTable } from "./_components/mappings-data-table";

export default function ProductMappingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapowania Produktów</h1>
        <p className="text-muted-foreground">
          Zarządzaj powiązaniami między produktami z marketplace a indeksami w
          hurtowniach.
        </p>
      </div>
      <MappingsDataTable />
    </div>
  );
}
