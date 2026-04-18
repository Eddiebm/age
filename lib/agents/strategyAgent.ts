export async function strategyAgent(topic: string): Promise<string> {
  return `
  Audience: founders
  Tone: bold + contrarian
  Goal: engagement
  Topic: ${topic}
  `;
}
