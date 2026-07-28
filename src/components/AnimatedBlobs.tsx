export function AnimatedBlobs({ dense = false }: { dense?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob blob-1" style={{ width: 500, height: 500, top: "-10%", left: "-10%" }} />
      <div className="blob blob-2" style={{ width: 400, height: 400, top: "40%", right: "-15%" }} />
      <div className="blob blob-3" style={{ width: 350, height: 350, bottom: "-10%", left: "20%" }} />
      {dense && (
        <>
          <div className="blob blob-1" style={{ width: 300, height: 300, top: "20%", right: "30%" }} />
          <div className="blob blob-2" style={{ width: 250, height: 250, bottom: "20%", right: "5%" }} />
        </>
      )}
    </div>
  );
}
