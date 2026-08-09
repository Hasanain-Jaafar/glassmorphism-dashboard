export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="absolute -top-40 -left-32 size-[620px] rounded-full bg-primary/30 blur-[120px] dark:bg-primary/35" />
      <div className="absolute top-1/3 -right-40 size-[560px] rounded-full bg-[#22D3EE]/16 blur-[120px] dark:bg-[#22D3EE]/16" />
      <div className="absolute -bottom-48 left-1/4 size-[520px] rounded-full bg-primary/18 blur-[120px] dark:bg-primary/22" />
      <div className="absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6]/10 blur-[130px] dark:bg-[#8B5CF6]/14" />
    </div>
  );
}
