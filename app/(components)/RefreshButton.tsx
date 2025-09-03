"use client";

export default function RefreshButton() {
  return (
    <button 
      className="btn ghost"
      onClick={() => window.location.reload()}
      style={{ cursor: 'pointer' }}
    >
      Refresh Analytics
    </button>
  );
}