/**
 * Generyczny interfejs dla paginowanych odpowiedzi z naszego API.
 * `T` reprezentuje typ elementów w tablicy `items`.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
