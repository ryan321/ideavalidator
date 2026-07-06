import { notFound } from "next/navigation";
import { SourcesList, ValidationView } from "@/components/artifacts";
import { getArtifacts, getIdea, getVersion, listVersions, scoreDistribution } from "@/lib/db";
import { ValidationSchema } from "@/lib/generators/validation";
import { percentileOf, scoringSamples } from "@/lib/scoring";

// A chrome-free, deterministic render of ONE version's full report, used as the
// source page the server PDF route (app/api/versions/[id]/pdf) prints via headless
// Chrome. Always renders in `print` mode (every section expanded, prose unclamped);
// the @media print CSS in globals.css handles page breaks.
export const dynamic = "force-dynamic";

const PERCENTILE_MIN_POP = 8; // a percentile over <8 scores isn't meaningful

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version: versionId } = await searchParams;
  const idea = getIdea(id);
  if (!idea) notFound();

  const versions = listVersions(id);
  // The requested version (must belong to this idea), else the highest-scored
  // non-archived version, else v1.
  const bestScored = versions
    .filter((v) => !v.archived && v.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const version =
    (versionId && getVersion(versionId)?.idea_id === id ? getVersion(versionId) : null) ??
    bestScored ??
    versions[0];
  if (!version) notFound();

  const artifact = getArtifacts(version.id).find((a) => a.kind === "validation");
  const parsed = artifact ? ValidationSchema.safeParse(artifact.data) : null;

  const dist = scoreDistribution();
  const pct = dist.length >= PERCENTILE_MIN_POP ? percentileOf(version.score, dist) : null;

  return (
    <div className="pdf-root" data-report-ready>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-fg">
          {idea.title} <span className="text-muted">— v{version.n}</span>
        </h1>
        <p className="mt-1 text-sm text-muted">{version.statement}</p>
      </header>

      {parsed?.success ? (
        <>
          <ValidationView
            d={parsed.data}
            goal={idea.goal}
            provenance={idea.provenance}
            scorePercentile={pct}
            scoringSamples={scoringSamples()}
            print
          />
          <SourcesList sources={artifact!.sources} />
        </>
      ) : (
        <p className="text-sm text-muted">
          This version has no current validation report to export (regenerate it in the app first).
        </p>
      )}
    </div>
  );
}
