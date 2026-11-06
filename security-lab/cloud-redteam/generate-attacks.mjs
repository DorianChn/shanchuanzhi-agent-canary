import { deterministicFallback, generatorPrompt, isModelRefusal, parseGeneratedAttack } from './attacks.mjs';

export async function generateAttackCases({ seeds, attackerModels, cloud, outputTokens = 512, onFailure = () => {} }) {
  if (!Array.isArray(seeds) || !seeds.length) throw new Error('ATTACK_SEEDS_REQUIRED');
  const failures = [];
  const cases = [];
  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index];
    const model = attackerModels.length ? attackerModels[index % attackerModels.length] : null;
    if (!model) {
      cases.push({ ...deterministicFallback(seed.category, index, seed), id: seed.id });
      continue;
    }
    try {
      const result = await cloud.complete(model, {
        messages: [{ role: 'user', content: generatorPrompt(seed) }],
        maxOutputTokens: outputTokens,
        purpose: 'attack-generation',
      });
      const parsed = parseGeneratedAttack(result.content, seed, model);
      if (!parsed.accepted || isModelRefusal(result.content, result.refusal)) {
        const failure = { caseId: seed.id, category: seed.category, model: model.ref, reason: parsed.reason ?? 'MODEL_REFUSAL', refusal: isModelRefusal(result.content, result.refusal) };
        failures.push(failure); onFailure(failure);
        cases.push({ ...deterministicFallback(seed.category, index, seed), id: seed.id, generationSource: 'deterministic-fallback', generationRefusal: failure.refusal });
      } else {
        cases.push({ ...parsed.attack, generationInputTokens: result.usage.inputTokens, generationOutputTokens: result.usage.outputTokens });
      }
    } catch (error) {
      const failure = { caseId: seed.id, category: seed.category, model: model.ref, reason: error?.code ?? error?.message ?? 'GENERATION_ERROR', refusal: false };
      failures.push(failure); onFailure(failure);
      if (/BUDGET_LIMIT|PRICE_UNKNOWN/.test(String(error?.message ?? error?.code))) throw error;
      cases.push({ ...deterministicFallback(seed.category, index, seed), id: seed.id, generationSource: 'deterministic-fallback' });
    }
  }
  return { cases, failures, rejected: failures.filter(f => f.refusal).length, attempted: seeds.filter((_, index) => attackerModels.length > 0).length };
}
