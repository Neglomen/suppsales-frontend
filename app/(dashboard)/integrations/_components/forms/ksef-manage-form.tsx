import { UseFormReturn } from "react-hook-form";
import { IntegrationUpdateSchemaType } from "@/lib/zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, ShieldCheck, FileDigit } from "lucide-react";

export function KsefManageForm({
  form,
}: {
  form: UseFormReturn<IntegrationUpdateSchemaType>;
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa Profilu KSeF</FormLabel>
            <FormControl>
              <Input {...field} placeholder="KSeF Faktury Zakupowe" />
            </FormControl>
            <FormDescription>Nazwa rozpoznawcza widoczna na listach systemowych.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <h4 className="font-semibold pt-2 pb-1 border-b">Platforma Ministerstwa Finansów</h4>

      <div className="space-y-4 p-4 rounded-lg bg-card/60 border border-violet-500/10 shadow-sm relative overflow-hidden">
        {/* Subtle premium accent lighting */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <FormField
          control={form.control}
          name="environment"
          render={({ field }) => (
            <FormItem className="relative z-10">
              <FormLabel className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-violet-500 hidden dark:block" />
                <ShieldCheck className="w-4 h-4 text-violet-600 block dark:hidden" />
                Środowisko Serwera
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={(field.value as string) || "prod"}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Wybierz podłączane środowisko KSeF" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="prod">🚀 Produkcyjne (Rzeczywiste e-Faktury)</SelectItem>
                  <SelectItem value="test">🧪 Testowe (Bramka izolowana)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nip"
          render={({ field }) => (
            <FormItem className="relative z-10">
              <FormLabel className="flex items-center gap-1.5">
                <FileDigit className="w-4 h-4 text-violet-500 hidden dark:block" />
                <FileDigit className="w-4 h-4 text-violet-600 block dark:hidden" />
                NIP Reprezentanta
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Wpisz ciąg liczb np. 1234567890" 
                  className="bg-background tracking-wider" 
                  {...field} 
                  value={typeof field.value === "string" ? field.value : ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ksef_token"
          render={({ field }) => (
            <FormItem className="relative z-10">
              <FormLabel className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-violet-500 hidden dark:block" />
                <KeyRound className="w-4 h-4 text-violet-600 block dark:hidden" />
                Token Autoryzacyjny MF
              </FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Skopiuj ciąg znaków z Aplikacji Podatnika" 
                  className="bg-background font-mono text-sm" 
                  {...field} 
                  value={typeof field.value === "string" ? field.value : ""} 
                />
              </FormControl>
              <FormDescription className="text-xs mt-1.5 leading-relaxed opacity-85">
                Dla bezpieczeństwa odblokuj token dopiero przed zapisem. Otrzymany ciąg od Ministerstwa Finansów przypisany do konta dostępowego NIP.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

    </div>
  );
}
