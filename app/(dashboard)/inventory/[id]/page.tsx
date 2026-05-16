"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { LinkOfferDialog } from "../_components/link-offer-dialog";
import { SyncLogsCard } from "./_components/sync-logs-card";

const formSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  stock_quantity: z.coerce.number().min(0, "Ilość nie może być ujemna"),
  base_price: z.coerce.number().min(0, "Cena nie może być ujemna").optional(),
});

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/inventory/${params.id}`);
      setProduct(res.data);
      form.reset({
        name: res.data.name,
        stock_quantity: res.data.stock_quantity,
        base_price: res.data.base_price || 0,
      });
    } catch (error) {
      console.error("Failed to fetch product", error);
      toast.error("Nie udało się załadować produktu.");
      router.push("/inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);
      await api.put(`/inventory/${params.id}`, values);
      toast.success("Dane produktu zostały zaktualizowane, a stany w kanałach zostaną zsynchronizowane.");
      fetchProduct();
    } catch (error) {
      toast.error("Nie udało się zapisać zmian.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeOffer = async (offerId: str) => {
    if (!confirm("Czy na pewno chcesz usunąć to powiązanie?")) return;
    try {
      await api.delete(`/inventory/${params.id}/channel-offers/${offerId}`);
      toast.success("Powiązanie zostało usunięte.");
      fetchProduct();
    } catch (error) {
      toast.error("Nie udało się usunąć powiązania.");
    }
  };

  if (isLoading) return <div className="p-8">Ładowanie...</div>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" onClick={() => router.push("/inventory")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
          Edycja produktu: {product?.sku}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dane produktu i stany</CardTitle>
            <CardDescription>Edytuj ilość lub cenę. Zapisanie wywoła synchronizację na powiązanych aukcjach.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="stock_quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stan magazynowy</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="base_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena bazowa</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Zapisywanie..." : "Zapisz i synchronizuj"}</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Powiązane oferty</CardTitle>
              <CardDescription>Aukcje na których ten produkt jest wystawiony.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsLinkDialogOpen(true)}>Dodaj powiązanie</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integracja</TableHead>
                  <TableHead>ID Oferty</TableHead>
                  <TableHead>Status Synchro</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product?.channel_offers?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Brak powiązanych ofert</TableCell></TableRow>
                ) : (
                  product?.channel_offers?.map((offer: any) => (
                    <TableRow key={offer.id}>
                      <TableCell>{offer.service_integration_id}</TableCell>
                      <TableCell>{offer.external_offer_id}</TableCell>
                      <TableCell>{offer.sync_status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeOffer(offer.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <SyncLogsCard productId={params.id as string} />

      <LinkOfferDialog 
        productId={params.id as string} 
        open={isLinkDialogOpen} 
        onOpenChange={setIsLinkDialogOpen} 
        onSuccess={fetchProduct} 
      />
    </div>
  );
}
