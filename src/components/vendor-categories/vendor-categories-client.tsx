"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { VendorCategoryRow, VendorSubCategoryRow } from "@/types/vendor";

export function VendorCategoriesClient({
  initialCategories,
  initialSubCategories,
}: {
  initialCategories: VendorCategoryRow[];
  initialSubCategories: VendorSubCategoryRow[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [subCategories, setSubCategories] = useState(initialSubCategories);
  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vendor_categories")
      .insert({ name })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(`Could not add category: ${error.message}`);
      return;
    }
    setCategories((prev) => [...prev, data as VendorCategoryRow].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategory("");
  }

  async function deleteCategory(category: VendorCategoryRow) {
    if (!window.confirm(`Delete "${category.name}"? Its sub-categories will be removed too.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("vendor_categories").delete().eq("id", category.id);
    if (error) {
      toast.error(`Could not delete category: ${error.message}`);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    setSubCategories((prev) => prev.filter((s) => s.category_id !== category.id));
    toast.success("Category deleted");
  }

  async function addSubCategory(categoryId: string) {
    const name = (newSubCategory[categoryId] ?? "").trim();
    if (!name) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vendor_sub_categories")
      .insert({ category_id: categoryId, name })
      .select()
      .single();
    if (error) {
      toast.error(`Could not add sub-category: ${error.message}`);
      return;
    }
    setSubCategories((prev) => [...prev, data as VendorSubCategoryRow]);
    setNewSubCategory((prev) => ({ ...prev, [categoryId]: "" }));
  }

  async function deleteSubCategory(subCategory: VendorSubCategoryRow) {
    const supabase = createClient();
    const { error } = await supabase.from("vendor_sub_categories").delete().eq("id", subCategory.id);
    if (error) {
      toast.error(`Could not delete sub-category: ${error.message}`);
      return;
    }
    setSubCategories((prev) => prev.filter((s) => s.id !== subCategory.id));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Vendor categories</h1>
        <p className="text-sm text-muted-foreground">
          Manage the category and sub-category options shown in the vendor form. Developer only.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="New category name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
          className="max-w-xs"
        />
        <Button size="sm" onClick={addCategory} disabled={submitting || !newCategory.trim()}>
          <Plus />
          Add category
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const subs = subCategories.filter((s) => s.category_id === category.id);
            return (
              <Card key={category.id}>
                <CardHeader className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Delete category"
                    onClick={() => deleteCategory(category)}
                  >
                    <Trash2 />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((sub) => (
                        <Badge key={sub.id} variant="secondary" className="gap-1 pr-1">
                          {sub.name}
                          <button
                            type="button"
                            aria-label={`Remove ${sub.name}`}
                            onClick={() => deleteSubCategory(sub)}
                            className="rounded-full hover:bg-muted-foreground/20"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New sub-category"
                      value={newSubCategory[category.id] ?? ""}
                      onChange={(e) =>
                        setNewSubCategory((prev) => ({ ...prev, [category.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && addSubCategory(category.id)}
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Add sub-category"
                      onClick={() => addSubCategory(category.id)}
                      disabled={!(newSubCategory[category.id] ?? "").trim()}
                    >
                      <Plus />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
