/**
 * Converte um texto livre (ex.: nome de cliente) em um slug estável,
 * usado como identificador legível para tenants do Connex Insights.
 */
export function slugify(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "tenant";
}
