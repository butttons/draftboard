export function DefaultPending() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
