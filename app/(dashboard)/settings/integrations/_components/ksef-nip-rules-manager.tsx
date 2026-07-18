"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ruleSchema = z.object({
  seller_nip: z.string().min(10, "NIP musi składać się minimum z 10 znaków"),
  seller_name: z.string().min(1, "Nazwa jest wymagana"),
  category: z.enum(["PURCHASE", "COST", "NONE"]),
});

type RuleSchemaType = z.infer<typeof ruleSchema>;

interface NipRule {
  id: number;
  seller_nip: string;
  seller_name: string;
  category: "PURCHASE" | "COST" | "NONE";
}

export function KsefNipRulesManager() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<RuleSchemaType>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      seller_nip: "",
      seller_name: "",
      category: "PURCHASE",
    },
  });

  const { data: rules = [], isLoading } = useQuery<NipRule[]>({
    queryKey: ["ksef-nip-rules"],
    queryFn: async () => {
      const res = await api.get("/ksef-nip-categories/");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: RuleSchemaType) => {
      const res = await api.post("/ksef-nip-categories/", values);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Dodano nową regułę NIP");
      queryClient.invalidateQueries({ queryKey: ["ksef-nip-rules"] });
      form.reset();
      setIsAdding(false);
    },
    onError: (err) => {
      toast.error(`Błąd: ${getErrorMessage(err)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ksef-nip-categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Usunięto regułę");
      queryClient.invalidateQueries({ queryKey: ["ksef-nip-rules"] });
    },
    onError: (err) => {
      toast.error(`Błąd usuwania: ${getErrorMessage(err)}`);
    },
  });

  const onSubmit = (values: RuleSchemaType) => {
    createMutation.mutate(values);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "PURCHASE":
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Zakupowa</Badge>;
      case "COST":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Kosztowa</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Standardowa</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Reguły Autokategoryzacji <Badge variant="secondary" className="font-mono text-[10px]">{rules.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            Dodaj numery NIP stałych kontrahentów. Faktury pobrane z KSeF od tych sprzedawców otrzymają wybraną kategorię automatycznie.
          </p>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} variant="outline" className="h-8 gap-1.5 border-dashed">
            <Plus className="h-3.5 w-3.5" /> Dodaj regułę
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="p-4 rounded-xl border bg-muted/30 relative">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Nowa Autokategoryzacja</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="seller_nip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="NIP (bez kresek)" {...field} className="h-9 bg-background focus-visible:ring-1" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 bg-background focus-visible:ring-1">
                            <SelectValue placeholder="Wybierz docelową..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PURCHASE"><span className="text-emerald-500 font-medium">Zakupowa (Towar)</span></SelectItem>
                          <SelectItem value="COST"><span className="text-amber-500 font-medium">Kosztowa (Usługi)</span></SelectItem>
                          <SelectItem value="NONE"><span className="text-muted-foreground">Brak klasyfikacji</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="seller_name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nazwa robocza sprzedawcy..." {...field} className="h-9 bg-background focus-visible:ring-1" />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setIsAdding(false); form.reset(); }} className="h-8">Anuluj</Button>
                <Button type="submit" size="sm" className="h-8" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Zapisz NIP
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-xl border border-border/50 bg-background/50 shadow-sm relative">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2 opacity-50" /> <span className="text-sm">Parsowanie...</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-48">
            <Info className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Brak przypisanych reguł dla KSeF</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">Wszystkie nowe faktury pobrane z KSeF otrzymają domyślnie status "Brak przypisania kategorii".</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0 z-10 border-b">
              <tr>
                <th className="font-semibold text-muted-foreground text-xs py-2 px-4 text-left font-mono">NIP Sprzedawcy</th>
                <th className="font-semibold text-muted-foreground text-xs py-2 px-4 text-left">Nazwa własna</th>
                <th className="font-semibold text-muted-foreground text-xs py-2 px-4 text-left">Kwalifikacja</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b last:border-b-0 group hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-medium text-[13px]">{rule.seller_nip}</td>
                  <td className="py-2.5 px-4 text-muted-foreground select-all">{rule.seller_name}</td>
                  <td className="py-2.5 px-4">{getCategoryBadge(rule.category)}</td>
                  <td className="py-2.5 px-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(rule.id)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
