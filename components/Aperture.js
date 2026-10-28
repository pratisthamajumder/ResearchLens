// The ResearchLens mark: concentric lens rings around a focal point.
// `animated` pulls the rings into focus once on page load (home page only).
export default function Aperture({ size = 28, animated = false, className = '' }) {
  return (
    <svg
      className={`aperture ${animated ? 'aperture-animated' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <circle className="ring ring-1" cx="60" cy="60" r="56" />
      <circle className="ring ring-2" cx="60" cy="60" r="42" />
      <circle className="ring ring-3" cx="60" cy="60" r="28" />
      <circle className="focus" cx="60" cy="60" r="10" />
    </svg>
  );
}
