"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_NAMES } from "@/lib/brands";
import type { TransactionDirection } from "@/types/transaction";
import type { Profile } from "@/types/profile";

const DIRECTION_LABEL: Record<TransactionDirection, string> = {
  received: "Received",
  paid: "Paid",
};

function nowForInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewTransactionDialog({
  profile,
  onAdded,
}: {
  profile: Profile;
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState<TransactionDirection>("received");
  const [brand, setBrand] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    const amountRaw = formData.get("amount") as string;
    const amount = Number(amountRaw);
    if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const transactionDate = formData.get("transactionDate") as string;
    if (!transactionDate) {
      toast.error("Set a date and time");
      return;
    }
    const transactionId = (formData.get("transactionId") as string) || null;
    const notes = (formData.get("notes") as string) || null;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").insert({
      direction,
      amount,
      transaction_id: transactionId,
      transaction_date: new Date(transactionDate).toISOString(),
      brand: brand || null,
      notes,
      source: "manual",
      created_by: profile.id,
    });
    setSubmitting(false);

    if (error) {
      toast.error(`Could not add transaction: ${error.message}`);
      return;
    }

    toast.success("Transaction added");
    setOpen(false);
    setDirection("received");
    setBrand("");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add transaction
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>Record a manual payment made or received.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={direction} onValueChange={(v) => v && setDirection(v as TransactionDirection)}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => DIRECTION_LABEL[value as TransactionDirection]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Date &amp; time</Label>
            <Input
              id="transactionDate"
              name="transactionDate"
              type="datetime-local"
              defaultValue={nowForInput()}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input id="transactionId" name="transactionId" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Bank A/c</Label>
              <Select value={brand} onValueChange={(v) => setBrand(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select brand"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BRAND_NAMES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Description</Label>
            <Textarea id="notes" name="notes" placeholder="Optional" rows={2} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Adding..." : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
