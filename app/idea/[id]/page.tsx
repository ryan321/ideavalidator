import { notFound } from "next/navigation";
import IdeaWorkspace from "@/components/IdeaWorkspace";
import { getArtifacts, getIdea } from "@/lib/db";
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

  const artifacts = getArtifacts(id);
  return (
    <IdeaWorkspace idea={idea} initialArtifacts={artifacts} meta={generatorMeta()} />
  );
}
