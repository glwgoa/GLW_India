export type InventoryCategory = {
  id: string;
  name: string;
  /** Sub-categories configured for this category (empty when it has none). */
  subCategories: { id: string; name: string }[];
};
