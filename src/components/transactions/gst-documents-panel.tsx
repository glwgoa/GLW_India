"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewGstDocumentDialog } from "./new-gst-document-dialog";
import { GstReportDialog } from "./gst-report-dialog";
import { GST_DOC_LABEL } from "@/lib/gst-config";
import { formatInr } from "@/lib/gst";
import { downloadGstPdf } from "@/lib/gst-pdf";
import { isAccountant, isPrivileged } from "@/lib/auth/roles";
import type { GstDocType, GstDocument } from "@/types/gst-document";
import type { Profile } from "@/types/profile";

export function GstDocumentsPanel({
  profile,
  initialDocuments,
}: {
  profile: Profile;
  initialDocuments: GstDocument[];
}) {
  const [documents, setDocuments] = useState<GstDocument[]>(initialDocuments);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const canDelete = isPrivileged(profile.role) || isAccountant(profile.role);

  async function refresh() {
    const { data, error } = await createClient()
      .from("gst_documents")
      .select("*")
      .order("doc_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(`Could not load GST documents: ${error.message}`);
    else setDocuments(data as GstDocument[]);
  }

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        (!typeFilter || d.doc_type === typeFilter) &&
        (!q || `${d.doc_number} ${d.customer_name} ${d.description}`.toLowerCase().includes(q)),
    );
  }, [documents, typeFilter, search]);

  async function handleDownload(doc: GstDocument) {
    const ref = doc.ref_document_id ? documents.find((d) => d.id === doc.ref_document_id) : null;
    try {
      await downloadGstPdf(doc, ref?.doc_number);
    } catch (e) {
      toast.error(`Could not create the PDF: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  async function handleDelete(doc: GstDocument) {
    if (!window.confirm(`Delete ${doc.doc_number}? This cannot be undone.`)) return;
    const { error } = await createClient().from("gst_documents").delete().eq("id", doc.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("Document deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gst-search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <Input
              id="gst-search"
              placeholder="Number, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
              <SelectTrigger className="w-40">
                <SelectValue>{(v: string) => GST_DOC_LABEL[v as GstDocType] ?? "All"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GST_DOC_LABEL) as GstDocType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {GST_DOC_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(typeFilter || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter("");
                setSearch("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <GstReportDialog documents={documents} />
          <NewGstDocumentDialog profile={profile} documents={documents} onAdded={refresh} />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No GST documents yet.</p>
      ) : (
        <div className="rounded-lg bg-card/80 shadow-xl shadow-black/[0.14] backdrop-blur-md ring-1 ring-black/[0.03]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.doc_number}</TableCell>
                  <TableCell>{GST_DOC_LABEL[d.doc_type]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(`${d.doc_date}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.brand}</TableCell>
                  <TableCell>₹{formatInr(d.taxable_value)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    ₹{formatInr(d.cgst + d.sgst + d.igst)} ({d.gst_rate}%)
                  </TableCell>
                  <TableCell className={d.doc_type === "credit_note" ? "text-destructive" : "font-medium"}>
                    {d.doc_type === "credit_note" ? "-" : ""}₹{formatInr(d.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Download PDF" onClick={() => handleDownload(d)}>
                        <Download />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon-sm" aria-label="Delete document" onClick={() => handleDelete(d)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
