"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SuusFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Kurier SUUS" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="suus_login"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Login SUUS</FormLabel>
          <FormControl>
            <Input placeholder="Twój login do WebAPI" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="suus_password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Hasło SUUS</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="suus_order_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Domyślny typ zlecenia (orderType)</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value || "B2B"}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz domyślny typ zlecenia" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="B2B">B2B (Krajowe i zagraniczne)</SelectItem>
              <SelectItem value="B2C">B2C (Tylko krajowe)</SelectItem>
              <SelectItem value="DYNAMIC">Automatyczny (B2B dla firm, inaczej B2C)</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>
            SUUS wymaga B2B dla zleceń międzynarodowych.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

