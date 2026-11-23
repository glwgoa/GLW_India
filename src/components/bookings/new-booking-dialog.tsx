"use client";

import { TimeInput } from "@/components/ui/time-input";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOOKING_CATEGORIES,
  DINNER_CRUISE_CATEGORY_NAME,
  GOA_TRIP_CATEGORY_NAME,
  DUDHSAGAR_SUB_CATEGORY_NAME,
  GOA_TRIP_PICKUP_LOCATIONS,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_ADD_ONS,
  YACHT_CATEGORY_NAME,
  hasKidsPriceFields,
  needsCustomerContact,
} from "@/lib/booking-yacht";
import {
  YACHT_PACKAGES,
  computeYachtB2b,
  packageKey,
  packageLabel,
  parsePackageKey,
} from "@/lib/yacht-packages";
import { BRAND_NAMES } from "@/lib/brands";
import { ADV_PAID_TO_OPTIONS } from "@/lib/booking-display";
import { isPrivileged, isStaffRole } from "@/lib/auth/roles";
import { LEAD_SOURCES, phoneDigits } from "@/lib/lead-source";
import type { BookingProduct, KommoLead, TransportType } from "@/types/booking";
import type { Profile } from "@/types/profile";

const DRAFT_TTL_MS = 60 * 60 * 1000;
const LEAD_COLUMNS = "id, kommo_lead_id, brand, contact_name, phone, phone_digits, source, utm_campaign, gclid, created_at";

function leadLabel(lead: KommoLead) {
  const when = new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${lead.contact_name || lead.phone || "Unnamed lead"} · ${lead.brand ?? "No brand"} · ${lead.source ?? "—"} · ${when}`;
}
/** Fields whose value lives in React state, so they are restored via state rather than the DOM. */
const CONTROLLED_FIELDS = new Set(["salePrice", "kidsPrice", "startTime", "endTime"]);

type BookingDraft = {
  savedAt: number;
  state: {
    vendorId: string;
    brand: string;
    employeeId: string;
    category: string;
    productId: string;
    salePrice: string;
    kidsPrice: string;
    addOns: string[];
    transportType: string;
    advPaidTo?: string;
    subCategory?: string;
    pickupLocation?: string;
    source?: string;
    linkedLead?: KommoLead | null;
  };
  fields: Record<string, string>;
};

function readDraft(key: string): BookingDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BookingDraft;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};

export function NewBookingDialog({
  vendors,
  products,
  employees,
  profile,
  initialProductId,
  trigger = <Button size="sm" />,
  triggerContent = (
    <>
      <Plus />
      Add booking
    </>
  ),
  onAdded,
}: {
  vendors: { id: string; name: string }[];
  products: BookingProduct[];
  /** Only admin/developer can assign which employee made the booking. */
  employees?: { id: string; full_name: string }[];
  profile?: Profile;
  /** Pre-select a product (and its sale price) when the dialog opens. */
  initialProductId?: string;
  /** Custom trigger element; defaults to a small "Add booking" button. */
  trigger?: React.ReactElement;
  triggerContent?: React.ReactNode;
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [category, setCategory] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.category ?? "";
  });
  const [productId, setProductId] = useState<string>(initialProductId ?? "");
  const [salePrice, setSalePrice] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.sale_price != null ? String(product.sale_price) : "";
  });
  const [kidsPrice, setKidsPrice] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.kids_sale_price != null ? String(product.kids_sale_price) : "";
  });
  const [addOns, setAddOns] = useState<string[]>([]);
  const [transportType, setTransportType] = useState<string>("");
  const [advPaidTo, setAdvPaidTo] = useState<string>("");
  const [yachtPackage, setYachtPackage] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>(
    () => products.find((p) => p.id === initialProductId)?.sub_category ?? "",
  );
  const [pickupLocation, setPickupLocation] = useState<string>("");
  // Lead source: a linked Kommo lead wins; otherwise staff pick a source by hand.
  const [source, setSource] = useState<string>("");
  const [linkedLead, setLinkedLead] = useState<KommoLead | null>(null);
  const [recentLeads, setRecentLeads] = useState<KommoLead[] | null>(null);
  // Phone digits whose auto-match the user unlinked, so blur doesn't re-link it.
  const [dismissedDigits, setDismissedDigits] = useState<string | null>(null);

  // Draft memory: unsaved form contents are kept in this browser for 1 hour.
  // Skipped when the dialog is opened for a specific product (initialProductId).
  const draftKey = `glw:new-booking-draft:${profile?.id ?? "anon"}`;
  const draftEnabled = !initialProductId;
  const formRef = useRef<HTMLFormElement>(null);
  const restoringRef = useRef(false);
  const [pendingFields, setPendingFields] = useState<Record<string, string> | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  function saveDraft() {
    if (!draftEnabled || restoringRef.current || !formRef.current) return;
    const fields: Record<string, string> = {};
    for (const el of Array.from(formRef.current.elements)) {
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        el.name &&
        !CONTROLLED_FIELDS.has(el.name) &&
        el.value
      ) {
        fields[el.name] = el.value;
      }
    }
    // Nothing entered yet — don't create an empty draft.
    if (Object.keys(fields).length === 0 && !category && !productId && !brand && !vendorId && !source && !linkedLead) return;
    const draft: BookingDraft = {
      savedAt: Date.now(),
      state: { vendorId, brand, employeeId, category, productId, salePrice, kidsPrice, addOns, transportType, advPaidTo, subCategory, pickupLocation, source, linkedLead },
      fields,
    };
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Storage unavailable (private mode / quota) — drafts are best-effort.
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setDraftRestored(false);
    if (!draftEnabled) return;
    const draft = readDraft(draftKey);
    if (!draft) return;
    restoringRef.current = true;
    const d = draft.state;
    setVendorId(d.vendorId);
    setBrand(d.brand);
    setEmployeeId(d.employeeId);
    setCategory(d.category);
    setProductId(d.productId);
    setSalePrice(d.salePrice);
    setKidsPrice(d.kidsPrice);
    setAddOns(d.addOns);
    setTransportType(d.transportType);
    setAdvPaidTo(d.advPaidTo ?? "");
    setSubCategory(d.subCategory ?? "");
    setPickupLocation(d.pickupLocation ?? "");
    setSource(d.source ?? "");
    setLinkedLead(d.linkedLead ?? null);
    setPendingFields(draft.fields);
    setDraftRestored(true);
  }

  // Once the dialog and its conditional fields have rendered, put the typed values back.
  useEffect(() => {
    if (!open || !pendingFields) return;
    const frame = requestAnimationFrame(() => {
      const form = formRef.current;
      if (form) {
        for (const [name, value] of Object.entries(pendingFields)) {
          const el = form.elements.namedItem(name);
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value;
        }
      }
      setPendingFields(null);
      restoringRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pendingFields]);

  // Save whenever a dropdown / state-backed field changes while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(saveDraft, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendorId, brand, employeeId, category, productId, salePrice, kidsPrice, addOns, transportType, advPaidTo, subCategory, pickupLocation, source, linkedLead]);

  function discardDraft() {
    clearDraft();
    formRef.current?.reset();
    setVendorId("");
    setBrand("");
    setEmployeeId("");
    setProductId("");
    setCategory("");
    setSalePrice("");
    setKidsPrice("");
    setAddOns([]);
    setTransportType("");
    setAdvPaidTo("");
    setSubCategory("");
    setPickupLocation("");
    resetLead();
    setDraftRestored(false);
  }

  function resetLead() {
    setSource("");
    setLinkedLead(null);
    setRecentLeads(null);
    setDismissedDigits(null);
  }

  function linkLead(lead: KommoLead) {
    setLinkedLead(lead);
    // Fill the brand from the lead when it is still empty.
    if (!brand && lead.brand && (BRAND_NAMES as readonly string[]).includes(lead.brand)) setBrand(lead.brand);
  }

  /** Auto-match the typed contact number to the latest Kommo lead with the same last 10 digits. */
  async function matchLeadByPhone(contact: string) {
    const digits = phoneDigits(contact);
    if (!digits || linkedLead || digits === dismissedDigits) return;
    const { data } = await createClient()
      .from("kommo_leads")
      .select(LEAD_COLUMNS)
      .eq("phone_digits", digits)
      .order("created_at", { ascending: false })
      .limit(1);
    const lead = (data?.[0] as KommoLead | undefined) ?? null;
    if (lead) {
      linkLead(lead);
      toast.success(`Linked to Kommo lead: ${lead.contact_name || lead.phone}`);
    }
  }

  async function loadRecentLeads() {
    if (recentLeads) return;
    const { data, error } = await createClient()
      .from("kommo_leads")
      .select(LEAD_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(`Could not load leads: ${error.message}`);
      return;
    }
    setRecentLeads((data ?? []) as KommoLead[]);
  }

  function unlinkLead() {
    if (linkedLead?.phone_digits) setDismissedDigits(linkedLead.phone_digits);
    setLinkedLead(null);
  }

  const isGoaTrip = category === GOA_TRIP_CATEGORY_NAME;
  // Goa Trip sub-categories come from the products stocked under it.
  const goaTripSubCategories = Array.from(
    new Set(
      products
        .filter((p) => p.category === GOA_TRIP_CATEGORY_NAME && p.sub_category)
        .map((p) => p.sub_category as string),
    ),
  ).sort();
  const filteredProducts = (category ? products.filter((p) => p.category === category) : products).filter(
    (p) => !isGoaTrip || !subCategory || p.sub_category === subCategory,
  );
  const isYacht = category === YACHT_CATEGORY_NAME;
  const isDinnerCruise = category === DINNER_CRUISE_CATEGORY_NAME;
  const isSunsetCruise = category === SUNSET_CRUISE_CATEGORY_NAME;
  const isPerGuestPricing = isDinnerCruise || isSunsetCruise || isGoaTrip;
  // Dudhsagar trips only take kids below 5yrs — no 5-10yrs count or price.
  const showOlderKids = !(isGoaTrip && subCategory === DUDHSAGAR_SUB_CATEGORY_NAME);
  const showKidsPriceFields = hasKidsPriceFields(category);
  const showContactNumber = needsCustomerContact(category);
  const isPickupDrop = transportType === "pickup_drop";
  const canAssignEmployee = !!profile && isPrivileged(profile.role);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setProductId("");
    setSalePrice("");
    setKidsPrice("");
    setAddOns([]);
    setTransportType("");
    setSubCategory("");
    setPickupLocation("");
  }

  function handleSubCategoryChange(value: string) {
    setSubCategory(value);
    setProductId("");
    setSalePrice("");
    setKidsPrice("");
  }

  function handleProductChange(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product?.sale_price != null) {
      setSalePrice(String(product.sale_price));
    }
    setKidsPrice(product?.kids_sale_price != null ? String(product.kids_sale_price) : "");
    if (product?.category === GOA_TRIP_CATEGORY_NAME) setSubCategory(product.sub_category ?? "");
    if (product?.vendor_id) {
      setVendorId(product.vendor_id);
    }
  }

  function toggleAddOn(addOn: string) {
    setAddOns((prev) => (prev.includes(addOn) ? prev.filter((a) => a !== addOn) : [...prev, addOn]));
  }

  async function handleSubmit(formData: FormData) {
    const date = formData.get("bookingDate") as string;
    if (!date) {
      toast.error("Set a booking date");
      return;
    }

    if (isDinnerCruise && isPickupDrop && !pickupLocation) {
      toast.error("Select a pickup/drop location");
      return;
    }
    if (isGoaTrip && !pickupLocation) {
      toast.error("Select a pickup location");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const customerName = formData.get("customerName") as string;
    const customerContact = (formData.get("customerContact") as string) || null;
    const priceRaw = formData.get("salePrice") as string;
    const kidsPriceRaw = formData.get("kidsPrice") as string;
    const kidsBelow5CountRaw = formData.get("kidsBelow5Count") as string;
    const enquiryDate = (formData.get("enquiryDate") as string) || null;
    const advanceRaw = formData.get("advanceAmount") as string;
    const transactionId = (formData.get("transactionId") as string) || null;
    const agentName = ((formData.get("agentName") as string) || "").trim() || null;
    const agentCommissionRaw = formData.get("agentCommission") as string;
    const gstRateRaw = formData.get("gstRate") as string;
    const gstStatus = (formData.get("gstStatus") as string) || null;
    const agentNumber = ((formData.get("agentNumber") as string) || "").trim() || null;
    const startTime = (formData.get("startTime") as string) || null;
    const endTime = (formData.get("endTime") as string) || null;
    const guestCountRaw = formData.get("guestCount") as string;
    const kidsCountRaw = formData.get("kidsCount") as string;
    const pickupDropPriceRaw = formData.get("pickupDropPrice") as string;
    const pickupDropGuestCountRaw = formData.get("pickupDropGuestCount") as string;

    let yachtB2b: number | null = null;
    const pkg = isYacht ? parsePackageKey(yachtPackage) : null;
    if (isYacht) {
      if (!pkg) {
        toast.error("Select the sailing + anchorage package");
        return;
      }
      if (!startTime) {
        toast.error("Set a start time (it decides Evening or Morning rates)");
        return;
      }
      const result = computeYachtB2b(
        products.find((p) => p.id === productId),
        startTime,
        pkg,
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      yachtB2b = result.b2b;
    }

    const { error } = await supabase.from("bookings").insert({
      customer_name: customerName,
      customer_contact: showContactNumber ? customerContact : null,
      brand: brand || null,
      kommo_lead_id: linkedLead?.id ?? null,
      source: linkedLead?.source ?? (source || null),
      utm_campaign: linkedLead?.utm_campaign ?? null,
      gclid: linkedLead?.gclid ?? null,
      assigned_vendor_id: vendorId || null,
      assigned_employee_id:
        canAssignEmployee && employeeId
          ? employeeId
          : (profile && isStaffRole(profile.role))
            ? profile.id
            : null,
      created_by: profile?.id ?? null,
      item_id: productId || null,
      sale_price: priceRaw ? Number(priceRaw) : null,
      kids_price: showKidsPriceFields && showOlderKids && kidsPriceRaw ? Number(kidsPriceRaw) : null,
      kids_below_5_count: showKidsPriceFields && kidsBelow5CountRaw ? Number(kidsBelow5CountRaw) : null,
      advance_amount: advanceRaw ? Number(advanceRaw) : null,
      adv_paid_to: advPaidTo || null,
      transaction_id: transactionId,
      agent_name: agentName,
      agent_number: agentNumber,
      agent_commission: agentCommissionRaw ? Number(agentCommissionRaw) : null,
      gst_rate: gstRateRaw ? Number(gstRateRaw) : null,
      gst_status: gstRateRaw ? gstStatus : null,
      booking_date: new Date(date).toISOString(),
      enquiry_date: enquiryDate,
      status: "pending",
      guest_count: guestCountRaw ? Number(guestCountRaw) : null,
      pickup_location: isGoaTrip ? pickupLocation : isDinnerCruise && isPickupDrop ? pickupLocation || null : null,
      kids_count: isPerGuestPricing && showOlderKids && kidsCountRaw ? Number(kidsCountRaw) : null,
      ...(isYacht
        ? {
            start_time: startTime,
            end_time: endTime,
            sailing_hours: pkg?.sailing ?? null,
            anchorage_hours: pkg?.anchorage ?? null,
            b2b_price: yachtB2b,
            add_ons: addOns.length > 0 ? addOns : null,
          }
        : {}),
      ...(isDinnerCruise
        ? {
            transport_type: transportType || null,
            pickup_drop_price: isPickupDrop && pickupDropPriceRaw ? Number(pickupDropPriceRaw) : null,
            pickup_drop_guest_count:
              isPickupDrop && pickupDropGuestCountRaw ? Number(pickupDropGuestCountRaw) : null,
          }
        : {}),
    });

    setSubmitting(false);

    if (error) {
      toast.error(`Could not create booking: ${error.message}`);
      return;
    }

    toast.success("Booking created");
    clearDraft();
    setDraftRestored(false);
    setOpen(false);
    setVendorId("");
    setBrand("");
    setEmployeeId("");
    setProductId(initialProductId ?? "");
    const resetProduct = products.find((p) => p.id === initialProductId);
    setCategory(resetProduct?.category ?? "");
    setSalePrice(resetProduct?.sale_price != null ? String(resetProduct.sale_price) : "");
    setKidsPrice(resetProduct?.kids_sale_price != null ? String(resetProduct.kids_sale_price) : "");
    setAddOns([]);
    setTransportType("");
    setAdvPaidTo("");
    setSubCategory("");
    setPickupLocation("");
    resetLead();
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{triggerContent}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            Create a booking, optionally for a specific product with a sale price.
          </DialogDescription>
        </DialogHeader>
        {draftRestored && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span>Draft restored from your last unfinished booking.</span>
            <Button type="button" variant="ghost" size="xs" onClick={discardDraft}>
              Clear draft
            </Button>
          </div>
        )}
        <form
          ref={formRef}
          action={handleSubmit}
          onInput={saveDraft}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            {showContactNumber && (
              <div className="space-y-2">
                <Label htmlFor="customerContact">Customer contact number</Label>
                <Input
                  id="customerContact"
                  name="customerContact"
                  type="tel"
                  onBlur={(e) => void matchLeadByPhone(e.target.value)}
                />
              </div>
            )}
          </div>

          {linkedLead ? (
            <div className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-medium">
                  <Link2 className="size-3.5 shrink-0" />
                  <span className="truncate">{linkedLead.contact_name || linkedLead.phone || "Kommo lead"}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {linkedLead.brand ?? "No brand"} · Source: {linkedLead.source ?? "—"}
                  {linkedLead.utm_campaign ? ` · Campaign: ${linkedLead.utm_campaign}` : ""}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={unlinkLead}>
                <X />
                Unlink
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead source</Label>
                <Select value={source} onValueChange={(v) => setSource(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value || "Select source"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Link Kommo lead</Label>
                <Select
                  value=""
                  onOpenChange={(o) => {
                    if (o) void loadRecentLeads();
                  }}
                  onValueChange={(v) => {
                    const lead = recentLeads?.find((l) => l.id === v);
                    if (lead) linkLead(lead);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{() => "Optional"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {recentLeads === null ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</div>
                    ) : recentLeads.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No leads yet</div>
                    ) : (
                      recentLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {leadLabel(l)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v ?? "")}>
              <SelectTrigger>
                <SelectValue>{(value: string) => value || "Select category"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BOOKING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGoaTrip && (
            <div className="space-y-2">
              <Label>Sub-category</Label>
              <Select value={subCategory} onValueChange={(v) => handleSubCategoryChange(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select sub-category"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {goaTripSubCategories.map((sc) => (
                    <SelectItem key={sc} value={sc}>
                      {sc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={(v) => setVendorId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => vendors.find((v) => v.id === value)?.name ?? "Optional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
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
            {canAssignEmployee && (
              <div className="space-y-2">
                <Label>Booked by employee</Label>
                <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) =>
                        (employees ?? []).find((e) => e.id === value)?.full_name ?? "Optional"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(employees ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={(v) => handleProductChange(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => filteredProducts.find((p) => p.id === value)?.name ?? "Optional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">{isPerGuestPricing ? "Sale price per guest (₹)" : "Sale price (₹)"}</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Manually set or overridden"
              />
              {isPerGuestPricing && (
                <p className="text-xs text-muted-foreground">Multiplied by number of guests below.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of guests</Label>
              <Input id="guestCount" name="guestCount" type="number" min="0" className="max-w-40" />
            </div>
            {isPerGuestPricing && showOlderKids && (
              <div className="space-y-2">
                <Label htmlFor="kidsCount">Number of kids (5-10 yrs)</Label>
                <Input id="kidsCount" name="kidsCount" type="number" min="0" className="max-w-40" />
              </div>
            )}
          </div>

          {showKidsPriceFields && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {showOlderKids && (
                <div className="space-y-2">
                  <Label htmlFor="kidsPrice">Kids price (5yrs to 10yrs) (₹)</Label>
                  <Input
                    id="kidsPrice"
                    name="kidsPrice"
                    type="number"
                    step="0.01"
                    value={kidsPrice}
                    onChange={(e) => setKidsPrice(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="kidsBelow5Count">Kids Below 5yrs</Label>
                <Input id="kidsBelow5Count" name="kidsBelow5Count" type="number" min="0" placeholder="Optional" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enquiryDate">Enquiry date</Label>
              <Input id="enquiryDate" name="enquiryDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input id="bookingDate" name="bookingDate" type="date" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="advanceAmount">Advance (₹)</Label>
              <Input
                id="advanceAmount"
                name="advanceAmount"
                type="number"
                step="0.01"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>ADV PAID TO</Label>
              <Select value={advPaidTo} onValueChange={(v) => setAdvPaidTo(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select account"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ADV_PAID_TO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input id="transactionId" name="transactionId" placeholder="Optional" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input id="agentName" name="agentName" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentNumber">Agent Number</Label>
              <Input id="agentNumber" name="agentNumber" type="tel" placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="agentCommission">Agent Commission (₹)</Label>
              <Input id="agentCommission" name="agentCommission" type="number" min="0" step="any" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST</Label>
              <select id="gstRate" name="gstRate" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue="">
                <option value="">No GST</option>
                <option value="5">5%</option>
                <option value="18">18%</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstStatus">GST Status</Label>
              <select id="gstStatus" name="gstStatus" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue="">
                <option value="">—</option>
                <option value="Filed">Filed</option>
                <option value="Not filed">Not filed</option>
              </select>
            </div>
          </div>

          {isYacht && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Private yacht details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <TimeInput id="startTime" name="startTime" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End time</Label>
                  <TimeInput id="endTime" name="endTime" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sailing + Anchorage</Label>
                <Select value={yachtPackage} onValueChange={(v) => setYachtPackage(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => {
                        const p = parsePackageKey(value);
                        return p ? packageLabel(p) : "Select package";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {YACHT_PACKAGES.map((p) => (
                      <SelectItem key={packageKey(p)} value={packageKey(p)}>
                        {packageLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Add-ons</Label>
                <div className="flex flex-wrap gap-2">
                  {YACHT_ADD_ONS.map((addOn) => (
                    <Button
                      key={addOn}
                      type="button"
                      size="sm"
                      variant={addOns.includes(addOn) ? "default" : "outline"}
                      onClick={() => toggleAddOn(addOn)}
                    >
                      {addOn}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isDinnerCruise && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Dinner cruise details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Transport</Label>
                  <Select value={transportType} onValueChange={(v) => setTransportType(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value: string) => TRANSPORT_TYPE_LABEL[value as TransportType] ?? "Select transport"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRANSPORT_TYPE_LABEL) as TransportType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRANSPORT_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPickupDrop && (
                  <div className="space-y-2">
                    <Label>Pickup/Drop location</Label>
                    <Select value={pickupLocation} onValueChange={(v) => setPickupLocation(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue>{(value: string) => value || "Select location"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {GOA_TRIP_PICKUP_LOCATIONS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isPickupDrop && (
                  <div className="space-y-2">
                    <Label htmlFor="pickupDropPrice">Pickup/Drop price per guest (₹)</Label>
                    <Input id="pickupDropPrice" name="pickupDropPrice" type="number" step="0.01" />
                  </div>
                )}
                {isPickupDrop && (
                  <div className="space-y-2">
                    <Label htmlFor="pickupDropGuestCount">Number of guests for pickup/drop</Label>
                    <Input
                      id="pickupDropGuestCount"
                      name="pickupDropGuestCount"
                      type="number"
                      min="0"
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isGoaTrip && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Goa trip details</p>
              <div className="space-y-2">
                <Label>Pickup location</Label>
                <Select value={pickupLocation} onValueChange={(v) => setPickupLocation(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value || "Select pickup location"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GOA_TRIP_PICKUP_LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Creating..." : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
