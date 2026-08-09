"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productBrands,
  productCategories,
  type Product,
  type ProductStatus,
} from "@/lib/mock-data";
import { statusLabels } from "@/components/products/product-styles";

const formSchema = z.object({
  name: z.string().min(2, "Enter a product name"),
  sku: z.string().min(2, "Enter a SKU"),
  category: z.string().min(1, "Select a category"),
  brand: z.string().min(1, "Select a brand"),
  price: z.coerce.number().min(0, "Must be 0 or more"),
  status: z.enum(["active", "draft", "archived"]),
  description: z.string().min(2, "Enter a short description"),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const defaultValues: FormInput = {
  name: "",
  sku: "",
  category: productCategories[0],
  brand: productBrands[0],
  price: 0,
  status: "active",
  description: "",
};

export function AddProductForm({
  onAdd,
}: {
  onAdd: (product: Omit<Product, "id">) => Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(values: FormOutput) {
    try {
      await onAdd({
        name: values.name,
        sku: values.sku,
        category: values.category,
        brand: values.brand,
        price: values.price,
        status: values.status as ProductStatus,
        description: values.description,
      });
      reset(defaultValues);
    } catch {
      // The parent already surfaced an error toast; keep the form filled
      // in so nothing the user typed is lost.
    }
  }

  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PackagePlus className="size-[18px]" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Add Product
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            New products can be added as a Draft until they&apos;re ready to sell.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-name">Product Name</Label>
          <Input
            id="p-name"
            placeholder="PPR Pressure Pipe & Fitting System — DN20–110"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-sku">SKU</Label>
          <Input id="p-sku" placeholder="PIM-PPR-2011" {...register("sku")} />
          {errors.sku && (
            <p className="text-xs text-danger">{errors.sku.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-price">Price</Label>
          <Input id="p-price" type="number" {...register("price")} />
          {errors.price && (
            <p className="text-xs text-danger">{errors.price.message}</p>
          )}
        </div>

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="brand"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={field.value}
                onValueChange={(value) =>
                  value && field.onChange(value as ProductStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      statusLabels[value as ProductStatus] ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-description">Description</Label>
          <Textarea
            id="p-description"
            placeholder="Short description shown on the catalog and quotations."
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-danger">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset(defaultValues)}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Add Product
          </Button>
        </div>
      </form>
    </div>
  );
}
