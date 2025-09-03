export default function Sparkline({
  data,
  width = 220,
  height = 40,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  const n = data.length;
  if (n === 0) return <svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y =
      max === min
        ? height / 2
        : height - ((v - min) / (max - min)) * height;
    return [x, y] as const;
  });
  const d = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}