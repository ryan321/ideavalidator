import { notFound } from "next/navigation";
import IdeaWorkspace from "@/components/IdeaWorkspace";
import { getArtifactsByVersion, getIdea, getIdeaCost, listVersions } from "@/lib/db";
import { generatorMeta } from "@/lib/generators";

export const dynamic = "force-dynamic";

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = getIdea(id);
  if (!idea) notFound();

  return (
    <IdeaWorkspace
      idea={idea}
      versions={listVersions(id)}
      artifactsByVersion={getArtifactsByVersion(id)}
      meta={generatorMeta()}
      initialCost={getIdeaCost(id)}
    />
  );
}
