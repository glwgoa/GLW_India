"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CalendarClock, FolderKanban, Loader2, Package, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  label: string;
  type: string;
  href: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Vendor: <Building2 className="h-4 w-4 text-blue-500" />,
  Product: <Package className="h-4 w-4 text-purple-500" />,
  Project: <FolderKanban className="h-4 w-4 text-orange-500" />,
  Booking: <CalendarClock className="h-4 w-4 text-green-500" />,
  Employee: <Users className="h-4 w-4 text-pink-500" />,
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

const listVariants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { height: { duration: 0.3 }, staggerChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

export function UniversalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 250);
  const trimmed = debouncedQuery.trim();
  const isLoading = isFocused && trimmed !== "" && fetchedFor !== trimmed;
  const visibleResults = fetchedFor === trimmed ? results : [];

  function handleSelect(result: SearchResult) {
    setIsFocused(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(result.href);
  }

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
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          className="h-8 pr-7 pl-8 text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {isFocused && trimmed && (
          <motion.div
            className="absolute top-full left-0 z-40 mt-1.5 w-64 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {isLoading ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">Searching...</p>
            ) : visibleResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">No results</p>
            ) : (
              <motion.ul role="listbox" aria-label="Search results" className="py-1">
                {visibleResults.map((item) => (
                  <motion.li
                    key={`${item.type}-${item.id}`}
                    variants={itemVariants}
                    layout
                    role="option"
                    aria-selected={false}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                    >
                      {TYPE_ICON[item.type]}
                      <span className="truncate text-sm font-medium">{item.label}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {item.type}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
