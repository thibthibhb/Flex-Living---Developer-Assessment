// app/page.tsx
import Link from "next/link";
import { prisma } from "../lib/db";
import ApprovalButton from "./ApprovalButton";
import Navigation from "./(components)/Navigation";
import ExpandableText from "./(components)/ExpandableText";
import CategoryDisplay from "./(components)/CategoryDisplay";
import { kpisFor, countsByDay, movingAverage, cumulative, bucketCounts } from "../lib/stats"; 

// --- tiny inline sparkline (pure SVG, no client JS needed) ---
function Sparkline({
  data,
  width = 220,
  height = 40,
  label,
  area = true,
  zeroBaseline = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  label?: string;
  area?: boolean;
  zeroBaseline?: boolean;
}) {
  const n = data.length;
  if (n === 0) return <svg width={width} height={height} aria-label={label} />;

  // Domain with optional zero-baseline
  const minVal = zeroBaseline ? 0 : Math.min(...data);
  const maxVal = Math.max(...data, zeroBaseline ? 0 : -Infinity);
  const range = maxVal - minVal || 1;

  const pts = data.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = height - ((v - minVal) / range) * height;
    return [x, y] as const;
  });

  const line = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");

  // Area path closes to baseline
  const areaPath = area
    ? `M 0 ${height} L ${pts
        .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(" L ")} L ${width} ${height} Z`
    : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {label ? <title>{label}</title> : null}
      {/* subtle baseline */}
      <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke="currentColor" opacity="0.15" />
      {areaPath ? <path d={areaPath} fill="currentColor" opacity="0.08" /> : null}
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Put this near the top of app/page.tsx
type DashboardSearchParams = Record<string, string | string[] | undefined>;

function toArray(q: string | string[] | undefined): string[] {
  if (Array.isArray(q)) return q.filter(Boolean) as string[];
  if (typeof q === "string" && q.trim() !== "") return [q];
  return [];
}

async function getOptions() {
  // Fetch properties with their approved review counts
  const properties = await prisma.property.findMany({ 
    orderBy: { name: "asc" },
    include: {
      reviews: {
        include: {
          selection: true
        }
      }
    }
  });

  // Calculate approved counts for each property
  const propertiesWithCounts = properties.map(property => ({
    id: property.id,
    name: property.name,
    slug: property.slug,
    approvedCount: property.reviews.filter(review => 
      review.selection?.approvedForWebsite === true
    ).length
  }));

  const catsRaw = await prisma.reviewCategoryRating.findMany({
    select: { category: true },
  });
  const allCategories = Array.from(new Set(catsRaw.map((c) => c.category))).sort();

  const chansRaw = await prisma.review.findMany({ select: { channel: true } });
  const allChannels = Array.from(
    new Set(chansRaw.map((c) => c.channel).filter(Boolean) as string[])
  ).sort();

  return { properties: propertiesWithCounts, allCategories, allChannels };
}

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

async function getData(searchParams: DashboardSearchParams) {
  // read query params
  const qProperty =
    typeof searchParams.property === "string" ? searchParams.property : "";
  const qMinRating =
    typeof searchParams.minRating === "string" &&
    searchParams.minRating.trim() !== ""
      ? Number(searchParams.minRating)
      : undefined;
  const qMaxRating =
    typeof searchParams.maxRating === "string" && searchParams.maxRating.trim() !== ""
      ? Number(searchParams.maxRating)
      : undefined;

  const qApproved =
    typeof searchParams.approved === "string" && ["true", "false", "all"].includes(searchParams.approved)
      ? (searchParams.approved as "true" | "false" | "all")
      : "all";
  const qText = typeof searchParams.q === "string" ? searchParams.q : "";
  const qChannel =
    typeof searchParams.channel === "string" && searchParams.channel !== ""
      ? searchParams.channel
      : undefined;
  const qStatus =
    typeof searchParams.status === "string" ? searchParams.status : "published";

  const qFromStr =
    typeof searchParams.from === "string" ? searchParams.from : "";
  const qToStr = typeof searchParams.to === "string" ? searchParams.to : "";
  const qFrom =
    qFromStr && qFromStr.trim() !== "" ? new Date(`${qFromStr}T00:00:00.000Z`) : undefined;
  const qTo =
    qToStr && qToStr.trim() !== "" ? new Date(`${qToStr}T23:59:59.999Z`) : undefined;

  const qCategories = toArray(searchParams.categories);
  const qSort =
    typeof searchParams.sort === "string" ? searchParams.sort : "date_desc";
  const qTrend = typeof searchParams.trend === "string" ? searchParams.trend : "smoothed";

  // build filter
  const where: any = {
    ...(qProperty ? { property: { slug: qProperty } } : {}),
    ...(qMinRating != null || qMaxRating != null ? { ratingOverall: { ...(qMinRating != null ? { gte: qMinRating } : {}), ...(qMaxRating != null ? { lte: qMaxRating } : {}) } } : {}),
    ...(qText ? { text: { contains: qText } } : {}),
    ...(qChannel ? { channel: qChannel } : {}),
    ...(qStatus !== "all" ? { status: qStatus } : {}),
    ...(qFrom || qTo
      ? { submittedAt: { ...(qFrom ? { gte: qFrom } : {}), ...(qTo ? { lte: qTo } : {}) } }
      : {}),
    ...(qCategories.length
      ? { categories: { some: { category: { in: qCategories } } } }
      : {}),
    ...(qApproved !== "all"
      ? { selection: { approvedForWebsite: qApproved === "true" ? true : false } }
      : {}),
  };

  // sort
  let orderBy: any = { submittedAt: "desc" };
  switch (qSort) {
    case "date_asc":
      orderBy = { submittedAt: "asc" };
      break;
    case "rating_desc":
    case "rating_asc":
    case "attention":
      // We'll sort by effective rating in-memory after fetching.
      orderBy = { submittedAt: "desc" };
      break;
  }

  const reviews = await prisma.review.findMany({
    where,
    include: { property: true, selection: true, categories: true },
    orderBy,
    take: 300,
  });
  // Re-sort by EFFECTIVE rating (ratingOverall or avg(categories)) in-memory.
  if (qSort === "rating_desc" || qSort === "rating_asc" || qSort === "attention") {
    reviews.sort((a, b) => {
      const avgA =
        a.ratingOverall ??
        (a.categories?.length
          ? a.categories.reduce((s: number, c: any) => s + (c.rating ?? 0), 0) /
            a.categories.length
          : null);
      const avgB =
        b.ratingOverall ??
        (b.categories?.length
          ? b.categories.reduce((s: number, c: any) => s + (c.rating ?? 0), 0) /
            b.categories.length
          : null);

      if (qSort === "attention") {
        // "Attention" sort: removed status first, then low ratings, then null ratings treated as 11
        const statusA = a.status === "removed" ? 0 : 1;
        const statusB = b.status === "removed" ? 0 : 1;
        if (statusA !== statusB) return statusA - statusB;
        
        const ra = avgA ?? 11; // null treated as 11 so low ratings bubble up
        const rb = avgB ?? 11;
        return ra - rb; // ascending for attention (worst first)
      } else {
        const dir = qSort === "rating_desc" ? -1 : 1;
        const ra = avgA ?? -Infinity;
        const rb = avgB ?? -Infinity;
        return (ra - rb) * dir;
      }
    });
  }

  // KPIs & Trends are computed for selected property (or All), ignoring other filters
  const propFilter: any = qProperty ? { property: { slug: qProperty } } : {};
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const last90 = await prisma.review.findMany({
    where: { ...propFilter, submittedAt: { gte: since90 } },
    include: { categories: true },
    orderBy: { submittedAt: "desc" },
    take: 2000,
  });
  const last30 = last90.filter((r) => new Date(r.submittedAt) >= since30);

  const k30 = kpisFor(last30);
  const k90 = kpisFor(last90);
  
  // Base daily counts
  const daily30 = countsByDay(last30, 30);
  const daily90 = countsByDay(last90, 90);

  // Transform based on qTrend
  function transform(series: number[], mode: string): number[] {
    switch (mode) {
      case "weekly":
        return bucketCounts(series, 7);
      case "cumulative":
        return cumulative(series);
      case "raw":
        return series;
      case "smoothed":
      default:
        // 7d MA; if series shorter than 7, fall back to 3
        return movingAverage(series, Math.min(7, Math.max(3, series.length)));
    }
  }

  const trend30 = transform(daily30, qTrend);
  const trend90 = transform(daily90, qTrend);

  // top categories (90d)
  const catCount = new Map<string, number>();
  for (const r of last90) {
    for (const c of (r as any).categories || []) {
      catCount.set(c.category, (catCount.get(c.category) || 0) + 1);
    }
  }
  const topCategories = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    filters: {
      qProperty,
      qMinRating,
      qMaxRating,
      qText,
      qChannel,
      qStatus,
      qFromStr,
      qToStr,
      qCategories,
      qSort,
      qApproved,
      qTrend,
    },
    reviews,
    k30,
    k90,
    trend30,
    trend90,
    topCategories,
  };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const sp = await searchParams; // <-- important

  const { properties, allCategories, allChannels } = await getOptions();
  const { filters, reviews, k30, k90, trend30, trend90, topCategories } =
    await getData(sp);

  function HiddenParams({ keep }: { keep: Record<string, string | string[] | number | undefined> }) {
    const entries: [string, string | string[] | number | undefined][] = Object.entries(keep);
    return (
      <>
        {entries.map(([k, v]) =>
          Array.isArray(v)
            ? v.map((vv) => <input key={`${k}-${vv}`} type="hidden" name={k} value={String(vv)} />)
            : v != null
            ? <input key={k} type="hidden" name={k} value={String(v)} />
            : null
        )}
      </>
    );
  }

  return (
    <div className="grid">
      {/* Navigation */}
      <div className="col-12" style={{ marginBottom: 0 }}>
        <Navigation properties={properties} currentPath="/" />
      </div>

      {/* Header */}
      <header className="col-12" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.01em" }}>
          Reviews Dashboard
        </h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "16px" }}>
          Manage, filter, and approve reviews with enterprise-grade security
        </p>
      </header>

      {/* Toolbar */}
      <section className="col-12 card" style={{ marginBottom: 16 }}>
        <form className="toolbar" role="search" aria-label="Filter reviews">
          <div className="field" style={{ gridColumn: "span 3" }}>
            <label htmlFor="property-select">Property</label>
            <select id="property-select" className="select" name="property" defaultValue={filters.qProperty || ""}>
              <option value="">All</option>
              {properties.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="min-rating">Min rating</label>
            <input id="min-rating" className="input" name="minRating" type="number" step="0.1" min="0" max="10" defaultValue={filters.qMinRating ?? ""}/>
          </div>

          <div className="field" style={{ gridColumn: "span 3" }}>
            <label htmlFor="search-text">Search text</label>
            <input id="search-text" className="input" name="q" placeholder="Find keyword..." defaultValue={filters.qText || ""}/>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="channel-select">Channel</label>
            <select id="channel-select" className="select" name="channel" defaultValue={filters.qChannel || ""}>
              <option value="">All</option>
              {allChannels.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="status-select">Status</label>
            <select id="status-select" className="select" name="status" defaultValue={filters.qStatus || "published"}>
              <option value="published">Published</option>
              <option value="removed">Removed</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="field" style={{ gridColumn: "span 3" }}>
            <label htmlFor="categories-select">Categories</label>
            <select id="categories-select" className="select" name="categories" multiple defaultValue={filters.qCategories} size={Math.min(6, Math.max(3, allCategories.length))} aria-describedby="categories-help">
              {allCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <div id="categories-help" className="sr-only">Hold Ctrl/Cmd to select multiple categories</div>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="date-from">From</label>
            <input id="date-from" className="input" type="date" name="from" defaultValue={filters.qFromStr || ""}/>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="date-to">To</label>
            <input id="date-to" className="input" type="date" name="to" defaultValue={filters.qToStr || ""}/>
          </div>

          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="sort-select">Sort</label>
            <select id="sort-select" className="select" name="sort" defaultValue={filters.qSort}>
              <option value="date_desc">Date (new → old)</option>
              <option value="date_asc">Date (old → new)</option>
              <option value="rating_desc">Rating (high → low)</option>
              <option value="rating_asc">Rating (low → high)</option>
              <option value="attention">⚠️ Needs attention</option>
            </select>
          </div>

          <div className="actions" style={{ gridColumn: "span 2", alignItems:"end" }}>
            <button className="btn primary" type="submit" aria-label="Apply filters">Apply</button>
            <a className="btn ghost" href="/" aria-label="Reset all filters">Reset</a>
          </div>
        </form>
        
        {/* Active filters chips */}
        {(filters.qProperty || filters.qMinRating != null || filters.qText || filters.qChannel || (filters.qStatus && filters.qStatus !== "published") || filters.qFromStr || filters.qToStr || filters.qCategories.length > 0) && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 14, color: 'var(--muted)' }}>Active filters:</div>
            <div className="pills" aria-live="polite">
              {filters.qProperty && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Property: {properties.find(p => p.slug === filters.qProperty)?.name || filters.qProperty} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qMinRating != null && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Min rating: {filters.qMinRating} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qText && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Text: "{filters.qText}" 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qChannel && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Channel: {filters.qChannel} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qStatus && filters.qStatus !== "published" && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Status: {filters.qStatus} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qFromStr && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  From: {filters.qFromStr} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qToStr && (
                <Link href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  To: {filters.qToStr} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              )}
              {filters.qCategories.map(category => (
                <Link key={category} href="/" className="pill" style={{ textDecoration: 'none', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Category: {category} 
                  <span aria-hidden="true" style={{ marginLeft: '4px', fontWeight: 'bold' }}>×</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* KPIs */}
      <section className="col-12" style={{ marginBottom: 8 }}>
        <div className="kpi-grid">
          <div className="kpi">
            <h4>Avg rating</h4>
            <div className="v">{k30.avg != null ? k30.avg.toFixed(1) : "—"} <small>(30d)</small></div>
            <div className="v" style={{ fontSize: 14, color: "var(--muted)" }}>{k90.avg != null ? k90.avg.toFixed(1) : "—"} <small>(90d)</small></div>
          </div>
          <div className="kpi">
            <h4># Reviews</h4>
            <div className="v">{k30.count} <small>(30d)</small></div>
            <div className="v" style={{ fontSize: 14, color: "var(--muted)" }}>{k90.count} <small>(90d)</small></div>
          </div>
          <div className="kpi">
            <h4>% Positive (≥ 8)</h4>
            <div className="v">{k30.posPct != null ? `${k30.posPct}%` : "—"} <small>(30d)</small></div>
            <div className="v" style={{ fontSize: 14, color: "var(--muted)" }}>{k90.posPct != null ? `${k90.posPct}%` : "—"} <small>(90d)</small></div>
          </div>
        </div>
      </section>

      {/* Trends */}
      <section className="col-12 card" style={{ marginBottom: 16 }}>
        <div className="section-title">
          <h2>Trends</h2>
          <span className="muted">Reviews/day (30d & 90d)</span>
        </div>

        <form method="GET" style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          <span>Mode:</span>
          <label><input type="radio" name="trend" value="smoothed" defaultChecked={filters.qTrend === "smoothed" || !filters.qTrend} /> Smoothed</label>
          <label><input type="radio" name="trend" value="weekly"  defaultChecked={filters.qTrend === "weekly"} /> Weekly</label>
          <label><input type="radio" name="trend" value="cumulative" defaultChecked={filters.qTrend === "cumulative"} /> Cumulative</label>
          <label><input type="radio" name="trend" value="raw" defaultChecked={filters.qTrend === "raw"} /> Raw</label>
          {/* keep other filters intact */}
          <HiddenParams keep={{
            property: filters.qProperty,
            minRating: filters.qMinRating?.toString(),
            maxRating: filters.qMaxRating?.toString(),
            q: filters.qText,
            channel: filters.qChannel,
            status: filters.qStatus,
            from: filters.qFromStr,
            to: filters.qToStr,
            categories: filters.qCategories,
            sort: filters.qSort,
            approved: filters.qApproved
          }} />
          <button className="btn ghost" type="submit" style={{ padding: "4px 8px" }}>Apply</button>
        </form>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>30d</div>
            <Sparkline data={trend30} width={340} height={46} label="Reviews per day last 30 days"/>
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>90d</div>
            <Sparkline data={trend90} width={340} height={46} label="Reviews per day last 90 days"/>
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Top categories (90d)</div>
            <div className="pills">
              {topCategories.length ? topCategories.map(([name, count]) => {
                const categoryUrl = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                  if (key === 'qCategories') {
                    // Toggle this category
                    const categories = Array.isArray(value) ? value : [];
                    const newCategories = categories.includes(name) 
                      ? categories.filter(c => c !== name)
                      : [...categories, name];
                    newCategories.forEach(c => categoryUrl.append('categories', c));
                  } else if (key.startsWith('q') && value && key !== 'qCategories') {
                    // Keep other filters
                    const paramName = key.slice(1).toLowerCase();
                    if (Array.isArray(value)) {
                      value.forEach(v => categoryUrl.append(paramName, v));
                    } else {
                      categoryUrl.append(paramName, String(value));
                    }
                  }
                });
                const href = categoryUrl.toString() ? `/?${categoryUrl.toString()}` : '/';
                return (
                  <Link key={name} href={href} className="pill" style={{ textDecoration: 'none', color: 'var(--text)' }}>
                    {name} × {count}
                  </Link>
                );
              }) : <span className="muted">No data</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews table */}
      <section className="col-12 card">
        <h2 style={{ marginTop: 0 }}>Reviews</h2>

        {reviews.length === 0 ? (
          <div className="muted" style={{ padding: "16px 0" }}>
            No reviews match your filters. <a href="/">Reset filters</a>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              {/* predictable column widths */}
              <colgroup>
                <col className="col-date" />
                <col className="col-property" />
                <col className="col-text" />
                <col className="col-rating" />
                <col className="col-cats" />
                <col className="col-status" />
                <col className="col-approved" />
                <col className="col-actions" />
              </colgroup>

              <thead>
                {/* Row 1: Column titles */}
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Property</th>
                  <th scope="col">Text</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Categories</th>
                  <th scope="col">Status</th>
                  <th scope="col">Approved</th>
                  <th scope="col">Actions</th>
                </tr>
                
                {/* Row 2: Filters and controls */}
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  {/* DATE: sort buttons */}
                  <th>
                    <div className="th-mini">
                      <form method="GET" style={{ display: 'inline-flex', gap: '2px' }}>
                        <HiddenParams keep={{ ...filters, sort: undefined }} />
                        <input type="hidden" name="sort" value="date_desc" />
                        <button className="icon-btn" aria-label="Sort date new→old"><span>▼</span></button>
                      </form>
                      <form method="GET" style={{ display: 'inline-flex', gap: '2px' }}>
                        <HiddenParams keep={{ ...filters, sort: undefined }} />
                        <input type="hidden" name="sort" value="date_asc" />
                        <button className="icon-btn" aria-label="Sort date old→new"><span>▲</span></button>
                      </form>
                    </div>
                  </th>

                  <th></th>
                  <th></th>

                  {/* RATING: range inputs + sort */}
                  <th>
                    <div className="th-mini" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <form method="GET" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <HiddenParams keep={{ ...filters, minRating: undefined, maxRating: undefined }} />
                        <input
                          name="minRating"
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          placeholder="min"
                          style={{ width: '40px', fontSize: '10px' }}
                          defaultValue={filters.qMinRating ?? ""}
                        />
                        <input
                          name="maxRating"
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          placeholder="max"
                          style={{ width: '40px', fontSize: '10px' }}
                          defaultValue={(filters as any).qMaxRating ?? ""}
                        />
                        <button type="submit" className="btn ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
                          Apply
                        </button>
                      </form>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <form method="GET">
                          <HiddenParams keep={{ ...filters, sort: undefined }} />
                          <input type="hidden" name="sort" value="rating_desc" />
                          <button className="icon-btn" aria-label="Sort rating high→low"><span>▼</span></button>
                        </form>
                        <form method="GET">
                          <HiddenParams keep={{ ...filters, sort: undefined }} />
                          <input type="hidden" name="sort" value="rating_asc" />
                          <button className="icon-btn" aria-label="Sort rating low→high"><span>▲</span></button>
                        </form>
                      </div>
                    </div>
                  </th>

                  <th></th>

                  {/* STATUS: select */}
                  <th>
                    <form method="GET" className="th-mini" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <HiddenParams keep={{ ...filters, status: undefined }} />
                      <select
                        name="status"
                        defaultValue={(filters as any).qStatus ?? "published"}
                        style={{ fontSize: '10px' }}
                      >
                        <option value="published">Published</option>
                        <option value="removed">Removed</option>
                        <option value="all">All</option>
                      </select>
                      <button type="submit" className="btn ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
                        Apply
                      </button>
                    </form>
                  </th>

                  {/* APPROVED: select */}
                  <th>
                    <form method="GET" className="th-mini" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <HiddenParams keep={{ ...filters, approved: undefined }} />
                      <select
                        name="approved"
                        defaultValue={(filters as any).qApproved ?? "all"}
                        style={{ fontSize: '10px' }}
                      >
                        <option value="all">All</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                      <button type="submit" className="btn ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
                        Apply
                      </button>
                    </form>
                  </th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {reviews.map((r: any) => {
                  const effectiveRating = r.ratingOverall ?? 
                    (r.categories?.length ? r.categories.reduce((s: number, c: any) => s + (c.rating ?? 0), 0) / r.categories.length : null);
                  const canApprove = r.status === "published";
                  const ratingClass = effectiveRating ? (effectiveRating < 7 ? "rating-low" : effectiveRating < 8.5 ? "rating-medium" : "rating-high") : "";
                  
                  return (
                    <tr key={r.id} className={r.status !== "published" ? "row-removed" : undefined}>
                      <td>{fmtDate(new Date(r.submittedAt))}</td>
                      <td><a href={`/properties/${r.property.slug}`}>{r.property.name}</a></td>
                      <td className="cell-text">
                        <ExpandableText text={r.text ?? ""} max={110} />
                      </td>
                      <td className={ratingClass}>{r.ratingOverall ?? "—"}</td>
                      <td>
                        <CategoryDisplay categories={r.categories} maxVisible={3} />
                      </td>
                      <td>
                        {r.status === "published" ? (
                          <span className="pill badge-published">published</span>
                        ) : (
                          <span className="pill badge-removed">removed</span>
                        )}
                      </td>
                      <td>{r.selection?.approvedForWebsite ? "✅" : "—"}</td>
                      <td className="actions">
                        <ApprovalButton 
                          reviewId={r.id} 
                          approved={!!r.selection?.approvedForWebsite}
                          disabled={!canApprove}
                          reason={!canApprove ? "Only published reviews can be approved" : undefined}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
