import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/mock-data";

const PRODUCT_COLUMNS =
  "id, name, sku, category, brand, price, status, description, delivery_time, made_in";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number | string;
  status: Product["status"];
  description: string;
  delivery_time: string | null;
  made_in: string | null;
};

function normalize(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    brand: row.brand,
    price: Number(row.price),
    status: row.status,
    description: row.description,
    deliveryTime: row.delivery_time,
    madeIn: row.made_in,
  };
}

function toRow(input: Omit<Product, "id">) {
  return {
    name: input.name,
    sku: input.sku,
    category: input.category,
    brand: input.brand,
    price: input.price,
    status: input.status,
    description: input.description,
    delivery_time: input.deliveryTime || null,
    made_in: input.madeIn || null,
  };
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
    .insert(toRow(input))
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateProduct(
  id: string,
  input: Omit<Product, "id">
): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(toRow(input))
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw error;
  return normalize(data);
}
