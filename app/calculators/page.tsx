import Calculators from "@/components/Calculators";

export const metadata = { title: "Calculators · IdeaValidator" };

export default function CalculatorsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Startup calculators</h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Quick, no-AI math for the numbers that matter. Everything stays in your browser.
      </p>
      <Calculators />
    </div>
  );
}
