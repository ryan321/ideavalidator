import { notFound } from "next/navigation";
import IdeaWorkspace from "@/components/IdeaWorkspace";
import { getArtifactsByVersion, getEvidenceByVersion, getIdea, getIdeaCost, listVersions, scoreDistribution } from "@/lib/db";
import { generatorMeta } from "@/lib/generators";
import { scoringSamples } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function IdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const { stage } = await searchParams;
  const idea = getIdea(id);
  if (!idea) notFound();

  return (
    <IdeaWorkspace
      idea={idea}
      versions={listVersions(id)}
      artifactsByVersion={getArtifactsByVersion(id)}
      evidenceByVersion={getEvidenceByVersion(id)}
      meta={generatorMeta()}
      initialCost={getIdeaCost(id)}
      initialStage={stage ?? idea.stage ?? "validate"}
      initialScoreDistribution={scoreDistribution()}
      scoringSamples={scoringSamples()}
    />
  );
}
