import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { Organization } from "@/types/organization";

// === NOWA FUNKCJA POMOCNICZA ===
/**
 * Pobiera z dużego obiektu (source) tylko te klucze, które istnieją
 * w małym obiekcie (target) - w tym przypadku, w polach formularza.
 * @param source Pełny obiekt Organization z API.
 * @param target Obiekt z polami formularza (np. form.getValues()).
 * @returns Nowy obiekt zawierający tylko pasujące klucze.
 */
const filterObjectByKeys = <T extends Record<string, any>>(
  source: Record<string, any>,
  target: T
): T => {
  const result: Partial<T> = {};
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key as keyof T] = source[key];
    }
  }
  return result as T;
};
// =============================

export const useOrganizationForm = <T extends Record<string, any>>(
  form: UseFormReturn<T>,
  endpoint: string = "/organization"
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: T) => api.patch<Organization>(endpoint, values),
    onSuccess: (response) => {
      toast.success("Zmiany zostały zapisane.");
      const updatedData = response.data;
      queryClient.setQueryData(["organization"], updatedData);

      // === KLUCZOWA POPRAWKA ===
      // Filtrujemy dane z API, aby pasowały do "kształtu" formularza
      const formSpecificData = filterObjectByKeys(
        updatedData,
        form.getValues()
      );
      form.reset(formSpecificData);
      // =============================
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const onSubmit = (values: T) => {
    mutate(values);
  };

  return { onSubmit, isPending };
};
