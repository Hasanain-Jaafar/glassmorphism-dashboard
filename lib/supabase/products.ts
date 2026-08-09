import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/mock-data";

const PRODUCT_COLUMNS = "id, name, sku, category, brand, price, status, description";

type ProductRow = Omit<Product, "price"> & { price: number | string };

function normalize(row: ProductRow): Product {
  return { ...row, price: Number(row.price) };
}

export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function insertProduct(
  input: Omit<Product, "id">
): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(input)
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw error;
  return normalize(data);
}
