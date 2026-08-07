export function About() {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl md:p-8">
      <h1 className="text-2xl font-extrabold text-primary">About</h1>
      <p className="text-sm text-foreground">
        This is a searchable, capped sample of Malaysia's National Pharmaceutical Regulatory Agency (NPRA)
        registered pharmaceutical product database, sourced from the official{' '}
        <a
          href="https://quest3plus.bpfk.gov.my/pmo2/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          QUEST3+
        </a>{' '}
        product search system.
      </p>

      <div className="rounded-lg border border-border bg-accent/40 p-4">
        <h2 className="mb-1 text-sm font-semibold">Important Disclaimer</h2>
        <p className="text-sm text-muted-foreground">
          This site is an independent, unofficial mirror of a sample of publicly available NPRA registration
          data for reference purposes only. It is not affiliated with NPRA or the Ministry of Health Malaysia.
          For authoritative, complete, and up-to-date information, always refer to the official QUEST3+ system.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">What's included</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Product name</li>
          <li>Active ingredient(s)</li>
          <li>Product registration number</li>
          <li>Proposed package insert PDF, where available in QUEST3+ (products registered from 2017 onward)</li>
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Coverage</h2>
        <p className="text-sm text-muted-foreground">
          This is a capped sample gathered by searching a broad list of common active ingredients across major
          therapeutic classes — not an exhaustive copy of the full registry, which contains many more products.
        </p>
      </div>
    </div>
  )
}
