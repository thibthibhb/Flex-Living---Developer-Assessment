// app/analytics/page.tsx
import { kpisLastNDays, kpisWoW, countsByDay, movingAverage, topCategories } from "../../lib/analytics";
import { prisma } from "../../lib/db";
import Navigation from "../(components)/Navigation";

export const runtime = "nodejs";
export const revalidate = 300; // Cache for 5 minutes

function Sparkline({ data, width = 260, height = 46, label }: {
  data: number[], width?: number, height?: number, label?: string
}) {
  const n = data.length; 
  if (!n) return <svg width={width} height={height} role="img"/>;
  
  const min = 0; 
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = height - ((v - min) / (max - min)) * height;
    return [x, y] as const;
  });
  
  const line = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const area = `M 0 ${height} L ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} L ${width} ${height} Z`;
  
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke="currentColor" opacity="0.12"/>
      <path d={area} fill="currentColor" opacity="0.08"/>
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function Delta({ now, prev, goodHigher = true }: {
  now: number, prev: number, goodHigher?: boolean
}) {
  const diff = now - prev;
  const cls = diff === 0 ? "" : ((goodHigher ? diff > 0 : diff < 0) ? "up" : "down");
  const sym = diff === 0 ? "•" : (cls === "up" ? "▲" : "▼");
  const abs = Math.abs(diff);
  return <span className={`delta ${cls}`}>{sym} {abs === 0 ? "0" : abs.toFixed(2)}</span>;
}

async function getOptions() {
  const properties = await prisma.property.findMany({ 
    orderBy: { name: "asc" }
  });
  return { properties };
}

export default async function AnalyticsPage({ searchParams }: { 
  searchParams?: Promise<Record<string, string | string[] | undefined>> 
}) {
  const sp = await searchParams || {};
  const property = typeof sp.property === "string" && sp.property !== "all" ? sp.property : undefined;
  
  const [{ properties }, { count, avg, positive, approved }, wow, daily30, daily90, cats] = await Promise.all([
    getOptions(),
    kpisLastNDays(30, property),
    kpisWoW(30, property),
    countsByDay(30, property),
    countsByDay(90, property),
    topCategories(90, 6, property),
  ]);

  const sm30 = movingAverage(daily30, Math.min(7, Math.max(3, daily30.length)));
  const sm90 = movingAverage(daily90, Math.min(7, Math.max(3, daily90.length)));

  return (
    <div className="grid">
      {/* Navigation */}
      <div className="col-12" style={{ marginBottom: 0 }}>
        <Navigation properties={properties} currentPath="/analytics" />
      </div>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: 16 }}>
        <section className="analytics-hero">
          <h1>Analytics & Insights</h1>
          <p>Friendly overview for managers • Server-side data • Clickable links to filtered views</p>

          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi" role="group" aria-label="Reviews (30d)">
              <div className="label">Reviews (30d)</div>
              <div className="value">{count}</div>
              <div className="delta up"><Delta now={wow.current.count} prev={wow.prev.count} goodHigher={true} /></div>
            </div>

            <div className="kpi" role="group" aria-label="Average Rating (30d)">
              <div className="label">Average Rating (30d)</div>
              <div className="value">{avg.toFixed(2)}</div>
              <div className="delta up"><Delta now={wow.current.avg} prev={wow.prev.avg} goodHigher={true} /></div>
            </div>

            <div className="kpi" role="group" aria-label="% Positive ≥ 8 (30d)">
              <div className="label">% Positive ≥ 8 (30d)</div>
              <div className="value">{Math.round(positive * 100)}%</div>
              <div className={`delta ${(wow.current.positive - wow.prev.positive) >= 0 ? "up" : "down"}`}>
                <Delta now={wow.current.positive * 100} prev={wow.prev.positive * 100} goodHigher={true} />
              </div>
            </div>

            <div className="kpi" role="group" aria-label="% Approved (30d)">
              <div className="label">% Approved (30d)</div>
              <div className="value">{Math.round(approved * 100)}%</div>
              <div className="delta up"><Delta now={wow.current.approved * 100} prev={wow.prev.approved * 100} goodHigher={true} /></div>
            </div>
          </div>

          {/* Trends */}
          <div className="cards">
            <div className="click-card" role="group" aria-label="Review Volume (30d)">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Review Volume (30d)</strong><span className="muted">smoothed</span>
              </div>
              <Sparkline data={sm30} label="Reviews 30d" />
            </div>
            <div className="click-card" role="group" aria-label="Review Volume (90d)">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Review Volume (90d)</strong><span className="muted">smoothed</span>
              </div>
              <Sparkline data={sm90} label="Reviews 90d" />
            </div>
            <div className="click-card" role="group" aria-label="Pending Approval">
              <strong>Pending Approval</strong>
              <span className="muted">Access unapproved reviews to publish them</span>
            </div>
          </div>
        </section>

        {/* Top categories (clicks apply filters) */}
        <section style={{ marginTop: 14 }}>
          <h2>Most Frequent Categories (90d)</h2>
          {cats.length === 0 ? (
            <p className="muted">Not enough data yet.</p>
          ) : (
            <ul className="list">
              {cats.map(({ category, c }) => (
                <li key={category}>
                  <span style={{ textTransform: "capitalize" }}>{category.replaceAll("_", " ")}</span>
                  <span className="muted">{c} reviews</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}