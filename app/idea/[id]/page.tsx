import { notFound, redirect } from "next/navigation";
import IdeaWorkspace from "@/components/IdeaWorkspace";
import { getArtifactsByVersion, getEvidenceByVersion, getIdeaForUser, getIdeaCost, listVersions, scoreDistribution } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
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
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const idea = getIdeaForUser(id, user.id);
  if (!idea) notFound(); // not yours → indistinguishable from missing

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
