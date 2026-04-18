export type BrainDecision = "scale" | "pivot" | "test";

export type BrainInput = {
  performance: number;
};

export async function agentBrain(data: BrainInput): Promise<BrainDecision> {
  if (data.performance > 0.7) return "scale";
  if (data.performance < 0.3) return "pivot";
  return "test";
}
