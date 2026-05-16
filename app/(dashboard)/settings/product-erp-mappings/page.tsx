import { MappingsDataTable } from "./_components/mappings-data-table";

export default function ProductErpMappingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapowania Produktów ERP</h1>
        <p className="text-muted-foreground">
          Zarządzaj powiązaniami między ofertami z marketplace a symbolami
          produktów w Twoim systemie ERP (np. Subiekt GT).
        </p>
      </div>
      <MappingsDataTable />
    </div>
  );
}
