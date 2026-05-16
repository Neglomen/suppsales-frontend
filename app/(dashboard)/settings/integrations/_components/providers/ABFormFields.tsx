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

export const ABFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Hurtownia AB" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="ab_client_code"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Kod klienta AB</FormLabel>
          <FormControl>
            <Input placeholder="Twój kod klienta" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="ab_login"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Login do systemu AB</FormLabel>
          <FormControl>
            <Input placeholder="Login do dealer.ab.pl" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="ab_password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Hasło do systemu AB</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);
