"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, PlusCircle, Trash2, Edit, ArrowUpCircle } from "lucide-react";

import { PackageMappingRule } from "@/types/package-mapping-rule";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SmartPackageFormDialog } from "./smart-package-form-dialog";

export function SmartPackagesTab() {
  const [rules, setRules] = useState<PackageMappingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PackageMappingRule | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PackageMappingRule[]>(
        "/package-mapping-rules"
      );
      setRules(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać reguł mapowania opakowań.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!selectedRule) return;
    await toast.promise(
      api.delete(`/package-mapping-rules/${selectedRule.id}`),
      {
        loading: "Usuwanie reguły...",
        success: () => {
          fetchData();
          setDeleteAlertOpen(false);
          return "Reguła usunięta.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  const renderConditions = (rule: PackageMappingRule) => {
    const badges = [];

    // Kurier
    if (rule.courier_integration_name || rule.courier_service_code) {
      badges.push(
        <Badge key="courier" variant="secondary" className="mr-1 mb-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
          Kurier: {rule.courier_integration_name || "Dowolny"} 
          {rule.courier_service_code ? ` (${rule.courier_service_code})` : ""}
        </Badge>
      );
    }

    // Produkty
    if (rule.product_identifiers && rule.product_identifiers.length > 0) {
      badges.push(
        <Badge key="product" variant="secondary" className="mr-1 mb-1 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">
          Produkty ({rule.product_identifier_type}): {rule.product_identifiers.join(", ")}
          {rule.min_quantity ? ` (min. ${rule.min_quantity} szt.)` : ""}
        </Badge>
      );
    }

    // Waga
    if (rule.min_weight_kg !== null || rule.max_weight_kg !== null) {
      const minStr = rule.min_weight_kg !== null ? `>= ${rule.min_weight_kg}kg` : "";
      const maxStr = rule.max_weight_kg !== null ? `<= ${rule.max_weight_kg}kg` : "";
      badges.push(
        <Badge key="weight" variant="secondary" className="mr-1 mb-1 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20">
          Waga: {[minStr, maxStr].filter(Boolean).join(" i ")}
        </Badge>
      );
    }

    // Łączna ilość
    if (rule.min_total_quantity) {
      badges.push(
        <Badge key="totqty" variant="secondary" className="mr-1 mb-1 bg-green-500/10 text-green-500 hover:bg-green-500/20">
          Łącznie: min. {rule.min_total_quantity} szt.
        </Badge>
      );
    }

    if (badges.length === 0) {
      return <span className="text-muted-foreground text-xs">Bez warunków (zawsze)</span>;
    }

    return <div className="flex flex-wrap">{badges}</div>;
  };

  const columns: ColumnDef<PackageMappingRule>[] = [
    {
      accessorKey: "priority",
      header: "Priorytet",
      cell: ({ row }) => (
        <div className="font-semibold flex items-center gap-1">
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          {row.original.priority}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nazwa reguły",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      header: "Opakowanie docelowe",
      cell: ({ row }) => {
        const pkg = row.original.package_definition;
        if (!pkg) return <span className="text-muted-foreground">Brak opakowania</span>;
        return (
          <div className="font-medium text-primary">
            {pkg.name} <span className="text-xs text-muted-foreground">({pkg.length_cm}x{pkg.width_cm}x{pkg.height_cm} cm)</span>
          </div>
        );
      },
    },
    {
      header: "Warunki dopasowania",
      cell: ({ row }) => renderConditions(row.original),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedRule(row.original);
                setFormOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedRule(row.original);
                setDeleteAlertOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Konfiguruj automatyczne sugerowanie opakowań. Reguły sprawdzane są od najwyższego priorytetu.
        </div>
        <Button
          onClick={() => {
            setSelectedRule(null);
            setFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Dodaj regułę
        </Button>
      </div>
      <DataTable columns={columns} data={rules} isLoading={isLoading} />
      
      <SmartPackageFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={fetchData}
        rule={selectedRule}
      />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć tę regułę?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Reguła "{selectedRule?.name}" zostanie trwale usunięta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
