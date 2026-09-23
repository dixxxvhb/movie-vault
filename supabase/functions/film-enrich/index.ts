// film-enrich - registry enrichment for film_titles (Movie Night v4, pass 2).
// Fills original_language, origin_country, keywords, tmdb_fetched_at from TMDB.
// v4 (2026-09-22, Le Gamaar plan §12c): also keeps the top-billed cast in
// cast_top, and answers action "images" with a title's TMDB backdrops and logos
// (the list only; scripts/emit_vault_data.py vendors the chosen files).
// Idempotent: a row fetched inside stale_days that already has its cast is
// skipped, so re-running is safe and a long backfill can be driven in batches
// until due_left reaches zero.
//
// Secret: TMDB_API_KEY (the same project secret film-tmdb uses; it never leaves
// Supabase). Auth: the cron secret from public.push_secrets, or Dixon's JWT.
// verify_jwt is OFF at the gateway; both paths are checked in-function.
// Source of truth: this file, in ~/Code/movie-vault. Deploy through the MCP.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DIXON_EMAIL = "dixon@honeyyy.app";
const TMDB_BASE = "https://api.themoviedb.org/3";
const DELAY_MS = 25;
const DEFAULT_STALE_DAYS = 90;
const CAST_KEEP = 30;

type MediaType = "movie" | "tv";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    let authorized = false;
    const { data: secretRow } = await supabase
      .from("push_secrets")
      .select("value")
      .eq("key", "cron_secret")
      .maybeSingle();
    if (secretRow && bearer === (secretRow as { value: string }).value) {
      authorized = true;
    } else {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await authClient.auth.getUser();
      authorized = userData?.user?.email === DIXON_EMAIL;
    }
    if (!authorized) return json({ error: "forbidden" }, 403);

    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    if (!tmdbKey) return json({ error: "TMDB_API_KEY not configured" }, 503);

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      limit?: number;
      stale_days?: number;
      tmdb_id?: number;
      media_type?: MediaType;
    };

    if (body.action === "images") {
      if (typeof body.tmdb_id !== "number") return json({ error: "images needs tmdb_id" }, 400);
      const type: MediaType = body.media_type === "tv" ? "tv" : "movie";
      // include_image_language: textless backdrops ("null") first, then English
      // (logos are almost always tagged with a language).
      const imgs = (await tmdbFetch(tmdbKey, `/${type}/${body.tmdb_id}/images`, {
        include_image_language: "null,en",
      })) as {
        backdrops?: Img[];
        logos?: Img[];
        posters?: Img[];
      };
      const slim = (xs?: Img[]) =>
        (xs ?? []).map((i) => ({
          path: i.file_path, w: i.width, h: i.height, lang: i.iso_639_1 ?? null, votes: i.vote_count ?? 0,
        }));
      return json({ tmdb_id: body.tmdb_id, backdrops: slim(imgs.backdrops), logos: slim(imgs.logos) });
    }

    if (body.action === "link") {
      // Thin rows (logged in chat with no tmdb_id) never get a poster, a
      // director or a cast. Link one only when TMDB has exactly ONE movie whose
      // title matches exactly (case-insensitive) and whose year matches. Anything
      // ambiguous is reported, never guessed.
      const { data: thin, error: thinErr } = await supabase
        .from("film_titles")
        .select("id, title, year, media_type")
        .is("tmdb_id", null)
        .limit(typeof body.limit === "number" ? body.limit : 20);
      if (thinErr) throw new Error(thinErr.message);
      const linked: unknown[] = [];
      const skipped: unknown[] = [];
      for (const t of (thin ?? []) as { id: string; title: string; year: number | null; media_type: string | null }[]) {
        await sleep(DELAY_MS);
        const type: MediaType = t.media_type === "tv" ? "tv" : "movie";
        const res = (await tmdbFetch(tmdbKey, `/search/${type}`, { query: t.title })) as {
          results?: { id: number; title?: string; name?: string; release_date?: string; first_air_date?: string }[];
        };
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const hits = (res.results ?? []).filter((r) => {
          const name = r.title ?? r.name ?? "";
          const y = parseInt((r.release_date ?? r.first_air_date ?? "").slice(0, 4), 10);
          return norm(name) === norm(t.title) && (t.year == null || y === t.year);
        });
        if (hits.length !== 1) {
          skipped.push({ title: t.title, year: t.year, matches: hits.length });
          continue;
        }
        // The same film can already be registered under its tmdb_id (a chat
        // re-add). Report the duplicate; merging rows is a human call.
        const { data: dupe } = await supabase
          .from("film_titles").select("id").eq("tmdb_id", hits[0].id).maybeSingle();
        if (dupe) {
          skipped.push({ title: t.title, year: t.year, duplicate_of: (dupe as { id: string }).id });
          continue;
        }
        const d = (await tmdbFetch(tmdbKey, `/${type}/${hits[0].id}`, {
          append_to_response: type === "movie" ? "credits" : "",
        })) as {
          poster_path?: string | null; runtime?: number; genres?: { name: string }[]; overview?: string;
          release_date?: string; credits?: { crew?: { job: string; name: string }[] };
        };
        const { error: upErr } = await supabase.from("film_titles").update({
          tmdb_id: hits[0].id,
          media_type: type,
          poster_path: d.poster_path ?? null,
          runtime_minutes: typeof d.runtime === "number" ? d.runtime : null,
          genres: (d.genres ?? []).map((g) => g.name),
          director: (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name),
          overview: d.overview ?? null,
          release_date: d.release_date || null,
        }).eq("id", t.id).is("tmdb_id", null);
        if (upErr) throw new Error(upErr.message);
        await enrichOne(supabase, tmdbKey, t.id, hits[0].id, type);
        linked.push({ title: t.title, year: t.year, tmdb_id: hits[0].id });
      }
      return json({ linked, skipped });
    }

    if (body.action && body.action !== "enrich") return json({ error: "action must be enrich, images or link" }, 400);

    const staleDays = typeof body.stale_days === "number" ? body.stale_days : DEFAULT_STALE_DAYS;
    const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString();
    const limit = typeof body.limit === "number" ? body.limit : 60;
    const dueFilter = `tmdb_fetched_at.is.null,tmdb_fetched_at.lt.${cutoff},cast_top.is.null`;

    const { count: totalWithTmdb } = await supabase
      .from("film_titles")
      .select("id", { count: "exact", head: true })
      .not("tmdb_id", "is", null);

    // Fresh rows are filtered out in the query, so a batch is all real work.
    const { data: rows, error } = await supabase
      .from("film_titles")
      .select("id, tmdb_id, media_type")
      .not("tmdb_id", "is", null)
      .or(dueFilter)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    let fetched = 0;
    let failed = 0;
    const failures: { id: string; error: string }[] = [];

    for (const t of (rows ?? []) as { id: string; tmdb_id: number; media_type: MediaType }[]) {
      await sleep(DELAY_MS);
      try {
        await enrichOne(supabase, tmdbKey, t.id, t.tmdb_id, t.media_type);
        fetched += 1;
      } catch (e) {
        failed += 1;
        if (failures.length < 10) failures.push({ id: t.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const { count: dueLeft } = await supabase
      .from("film_titles")
      .select("id", { count: "exact", head: true })
      .not("tmdb_id", "is", null)
      .or(dueFilter);

    // A failed row is still due, so this stays exact: everything that was
    // already fresh when the batch started.
    const skippedFresh = (totalWithTmdb ?? 0) - (dueLeft ?? 0) - fetched;

    return json({
      fetched,
      skipped_fresh: skippedFresh,
      failed,
      batch: (rows ?? []).length,
      due_left: dueLeft ?? 0,
      total_with_tmdb: totalWithTmdb ?? 0,
      failures,
      stale_days: staleDays,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

type Img = { file_path: string; width: number; height: number; iso_639_1?: string | null; vote_count?: number };

type CastRow = {
  id: number;
  name: string;
  character?: string;
  roles?: { character?: string }[];
  order?: number;
  profile_path?: string | null;
};

async function enrichOne(
  supabase: SupabaseClient,
  apiKey: string,
  titleId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<void> {
  const type: MediaType = mediaType === "tv" ? "tv" : "movie";
  const details = (await tmdbFetch(apiKey, `/${type}/${tmdbId}`)) as {
    original_language?: string;
    origin_country?: string[];
    production_countries?: { iso_3166_1: string }[];
  };
  const kw = (await tmdbFetch(apiKey, `/${type}/${tmdbId}/keywords`)) as {
    keywords?: { name: string }[];
    results?: { name: string }[];
  };
  const credits = (await tmdbFetch(
    apiKey,
    type === "movie" ? `/movie/${tmdbId}/credits` : `/tv/${tmdbId}/aggregate_credits`,
  )) as { cast?: CastRow[] };

  const keywords = ((type === "movie" ? kw.keywords : kw.results) ?? [])
    .map((k) => k.name)
    .filter(Boolean);

  const originCountry = details.origin_country && details.origin_country.length
    ? details.origin_country
    : (details.production_countries ?? []).map((c) => c.iso_3166_1).filter(Boolean);

  const castTop = (credits.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, CAST_KEEP)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? c.roles?.[0]?.character ?? null,
      order: c.order ?? null,
      profile_path: c.profile_path ?? null,
    }));

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("film_titles")
    .update({
      original_language: details.original_language ?? null,
      origin_country: originCountry,
      keywords,
      cast_top: castTop,
      cast_fetched_at: now,
      tmdb_fetched_at: now,
    })
    .eq("id", titleId);
  if (error) throw new Error(error.message);
}

async function tmdbFetch(apiKey: string, path: string, params: Record<string, string> = {}): Promise<unknown> {
  const isV4 = apiKey.startsWith("eyJ");
  const url = new URL(`${TMDB_BASE}${path}`);
  if (!isV4) url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: isV4
      ? { Authorization: `Bearer ${apiKey}`, accept: "application/json" }
      : { accept: "application/json" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`tmdb ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
