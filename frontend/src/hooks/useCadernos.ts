import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";

export interface SinapiChunk {
  id: string;
  source_file: string;
  source_title: string;
  page_number: number | null;
  content: string;
  content_length: number;
  similarity?: number;
}

export interface CadernoSummary {
  source_file: string;
  source_title: string;
  chunk_count: number;
}

/**
 * Search chunks via ilike text search with debounce.
 */
export function useCadernoSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return useQuery<SinapiChunk[]>({
    queryKey: ["sinapi-chunks-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];

      const { data, error } = await supabase
        .from("ob_sinapi_chunks")
        .select(
          "id, source_file, source_title, page_number, content, content_length",
        )
        .ilike("content", `%${debouncedQuery.trim()}%`)
        .order("source_file", { ascending: true })
        .order("chunk_index", { ascending: true })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
    enabled: debouncedQuery.trim().length >= 3,
    placeholderData: (prev) => prev,
  });
}

/**
 * List all unique cadernos with chunk count.
 */
export function useCadernoList() {
  return useQuery<CadernoSummary[]>({
    queryKey: ["sinapi-cadernos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_sinapi_chunks")
        .select("source_file, source_title");

      if (error) throw error;

      // Aggregate by source_file
      const map = new Map<string, { source_title: string; count: number }>();
      for (const row of data ?? []) {
        const existing = map.get(row.source_file);
        if (existing) {
          existing.count++;
        } else {
          map.set(row.source_file, {
            source_title: row.source_title,
            count: 1,
          });
        }
      }

      return Array.from(map.entries())
        .map(([source_file, { source_title, count }]) => ({
          source_file,
          source_title,
          chunk_count: count,
        }))
        .sort((a, b) => a.source_title.localeCompare(b.source_title));
    },
    staleTime: 1000 * 60 * 5,
  });
}
