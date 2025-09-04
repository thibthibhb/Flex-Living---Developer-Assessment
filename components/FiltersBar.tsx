// components/FiltersBar.tsx
import React from "react";

type Filters = {
  qProperty?: string | null;
  qText?: string | null;
  qChannel?: string | null;
  qStatus?: string | null;
  qApproved?: string | null;
  qMinRating?: number | string | null;
  qMaxRating?: number | string | null;
  qFromStr?: string | null;
  qToStr?: string | null;
};

function Val(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

export default function FiltersBar({
  filters,
  categoriesControl,
  hiddenParams,
  showMoreDefault = false,
  resetHref = "/",
  propertyOptions = [],
  channelOptions = ["all", "airbnb", "booking", "vrbo", "direct"],
}: {
  filters: Filters;
  categoriesControl?: React.ReactNode;
  hiddenParams?: React.ReactNode;
  showMoreDefault?: boolean;
  resetHref?: string;
  propertyOptions?: string[]; // server can pass real property names; default "All"
  channelOptions?: string[];
}) {
  const {
    qProperty,
    qText,
    qChannel,
    qStatus,
    qApproved,
    qMinRating,
    qMaxRating,
    qFromStr,
    qToStr,
  } = filters;

  return (
    <form method="GET" className="panel" style={{position:'sticky', top:8, zIndex:10}}>
      {hiddenParams}

      {/* First row (always visible) */}
      <div className="frow">
        <label className="fcol">
          <span>Property</span>
          <select name="property" defaultValue={Val(qProperty) || "all"}>
            <option value="all">All</option>
            {propertyOptions
              .filter(Boolean)
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
        </label>

        <label className="fcol">
          <span>Min rating</span>
          <input
            name="minRating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="e.g. 8.0"
            defaultValue={Val(qMinRating)}
          />
        </label>

        <label className="fcol">
          <span>Search text</span>
          <input name="q" type="text" placeholder="Find keyword..." defaultValue={Val(qText)} />
        </label>

        <label className="fcol">
          <span>Channel</span>
          <select name="channel" defaultValue={Val(qChannel) || "all"}>
            {channelOptions.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="fcol">
          <span>Status</span>
          <select name="status" defaultValue={Val(qStatus) || "published"}>
            <option value="published">Published</option>
            <option value="removed">Removed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {/* Expandable: Categories / From / To / Sort / Approved */}
      <details className="filters-more" {...(showMoreDefault ? { open: true } : {})}>
        <summary>
          <span className="when-closed">Show more filters</span>
          <span className="when-open">Show fewer filters</span>
        </summary>

        <div className="frow-more">
          <label className="fcol">
            <span>Categories</span>
            {categoriesControl ?? <small className="muted">No categories UI provided</small>}
          </label>

          <label className="fcol">
            <span>From</span>
            <input type="date" name="from" defaultValue={Val(qFromStr)} />
          </label>

          <label className="fcol">
            <span>To</span>
            <input type="date" name="to" defaultValue={Val(qToStr)} />
          </label>

          <label className="fcol">
            <span>Approved</span>
            <select name="approved" defaultValue={Val(qApproved) || "all"}>
              <option value="all">All</option>
              <option value="true">Approved</option>
              <option value="false">Unapproved</option>
            </select>
          </label>
        </div>
      </details>

      {/* Sticky actions */}
      <div className="sticky-actions">
        <button type="submit" className="btn primary">Apply</button>
        <a href={resetHref} className="btn ghost">Reset</a>
      </div>
    </form>
  );
}