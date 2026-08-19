"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  label: string;
  type: string;
  href: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const RESULT_LIMIT_PER_TABLE = 4;
const MAX_RESULTS = 8;

async function search(text: string): Promise<SearchResult[]> {
  const supabase = createClient();
  const q = `%${text}%`;

  const [vendors, products, projects, bookings, employees] = await Promise.all([
    supabase.from("vendors").select("id, name").ilike("name", q).limit(RESULT_LIMIT_PER_TABLE),
    supabase
      .from("catalog_items")
      .select("id, name")
      .ilike("name", q)
      .limit(RESULT_LIMIT_PER_TABLE),
    supabase.from("projects").select("id, title").ilike("title", q).limit(RESULT_LIMIT_PER_TABLE),
    supabase
      .from("bookings")
      .select("id, customer_name")
      .ilike("customer_name", q)
      .limit(RESULT_LIMIT_PER_TABLE),
    supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", q)
      .limit(RESULT_LIMIT_PER_TABLE),
  ]);

  const results: SearchResult[] = [
    ...(vendors.data ?? [])
      .filter((v) => v.name)
      .map((v) => ({ id: v.id, label: v.name as string, type: "Vendor", href: "/vendors" })),
    ...(products.data ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      type: "Product",
      href: "/inventory",
    })),
    ...(projects.data ?? []).map((p) => ({
      id: p.id,
      label: p.title,
      type: "Project",
      href: "/projects",
    })),
    ...(bookings.data ?? []).map((b) => ({
      id: b.id,
      label: b.customer_name,
      type: "Booking",
      href: "/bookings",
    })),
    ...(employees.data ?? [])
      .filter((e) => e.full_name)
      .map((e) => ({
        id: e.id,
        label: e.full_name as string,
        type: "Employee",
        href: "/employees",
      })),
  ];

  return results.slice(0, MAX_RESULTS);
}

export function UniversalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  const debouncedSearchText = useDebounce(searchText, 300);
  const trimmed = debouncedSearchText.trim();
  const isLoading = trimmed !== "" && fetchedFor !== trimmed;
  const visibleResults = fetchedFor === trimmed ? results : [];

  function close() {
    setOpen(false);
    setSearchText("");
    setResults([]);
    setFetchedFor(null);
  }

  function handleSelect(result: SearchResult) {
    close();
    router.push(result.href);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!trimmed) return;
    let isCancelled = false;

    search(trimmed)
      .then((data) => {
        if (isCancelled) return;
        setResults(data);
        setFetchedFor(trimmed);
      })
      .catch(() => {
        if (!isCancelled) setFetchedFor(trimmed);
      });

    return () => {
      isCancelled = true;
    };
  }, [trimmed]);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <motion.div
        initial={false}
        animate={{ width: open ? 260 : 32 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
        className={cn(
          "flex h-8 items-center gap-1.5 overflow-hidden rounded-md",
          open && "border border-input bg-transparent pr-2 pl-1 dark:bg-input/30",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
            !open && "hover:bg-muted",
          )}
        >
          <Search className="size-4 text-muted-foreground" />
        </button>
        {open && (
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search vendors, products, projects..."
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
        {isLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      </motion.div>

      <AnimatePresence>
        {open && trimmed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            {isLoading ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">Searching...</p>
            ) : visibleResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">No results</p>
            ) : (
              <ul role="listbox" aria-label="Search results" className="py-1">
                {visibleResults.map((item) => (
                  <li key={`${item.type}-${item.id}`} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{item.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
