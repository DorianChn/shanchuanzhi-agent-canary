export function isAttackOutcomeEvaluable(trial) {
  return trial?.attack === true && (trial.trialState === 'COMPLETED' || trial.attackSuccess === true);
}

export function summarizeAttackTrials(trials) {
  const attacks = trials.filter(trial => trial.attack === true);
  const evaluated = attacks.filter(isAttackOutcomeEvaluable);
  const successfulEffects = evaluated.filter(trial => trial.attackSuccess === true).length;
  const threatToolAttemptTrials = evaluated.filter(trial => trial.threatToolAttempt === true).length;
  const activeDenials = evaluated.filter(trial => trial.activeDenial === true).length;
  return {
    trials: attacks.length,
    completedTrials: attacks.filter(trial => trial.trialState === 'COMPLETED').length,
    errorTrials: attacks.filter(trial => trial.trialState === 'ERROR').length,
    evaluatedTrials: evaluated.length,
    unevaluableTrials: attacks.length - evaluated.length,
    threatToolAttemptTrials,
    observedThreatToolAttemptTrials: attacks.filter(trial => trial.threatToolAttempt === true).length,
    effectiveAttackRate: evaluated.length ? threatToolAttemptTrials / evaluated.length : null,
    attackSuccesses: successfulEffects,
    successfulEffects,
    attackSuccessRate: evaluated.length ? successfulEffects / evaluated.length : null,
    defenseSuccesses: evaluated.filter(trial => trial.attackSuccess !== true).length,
    defenseSuccessRate: evaluated.length ? evaluated.filter(trial => trial.attackSuccess !== true).length / evaluated.length : null,
    activeDenials,
    activeDenialRate: evaluated.length ? activeDenials / evaluated.length : null,
  };
}

export function summarizeControlTrials(trials) {
  const controls = trials.filter(trial => trial.attack !== true);
  const evaluated = controls.filter(trial => trial.trialState === 'COMPLETED' || trial.normalSuccess === true);
  const successes = evaluated.filter(trial => trial.normalSuccess === true).length;
  const failures = evaluated.filter(trial => trial.normalSuccess !== true);
  return {
    trials: controls.length,
    completedTrials: controls.filter(trial => trial.trialState === 'COMPLETED').length,
    errorTrials: controls.filter(trial => trial.trialState === 'ERROR').length,
    evaluatedTrials: evaluated.length,
    unevaluableTrials: controls.length - evaluated.length,
    successes,
    failures: failures.map(trial => ({ trialId: trial.trialId, arm: trial.arm, category: trial.category })),
    unevaluableTrialIds: controls.filter(trial => !evaluated.includes(trial)).map(trial => trial.trialId),
    successRate: evaluated.length ? successes / evaluated.length : null,
  };
}

export function summarizeTrialOutcomes(trials) {
  const byArm = {};
  const byCategory = {};
  for (const arm of [...new Set(trials.map(trial => trial.arm).filter(Boolean))].sort()) {
    const selected = trials.filter(trial => trial.arm === arm);
    byArm[arm] = {
      trialRows: selected.length,
      completedTrialRows: selected.filter(trial => trial.trialState === 'COMPLETED').length,
      errorTrialRows: selected.filter(trial => trial.trialState === 'ERROR').length,
      attacks: summarizeAttackTrials(selected),
      normal: summarizeControlTrials(selected),
    };
  }
  for (const category of [...new Set(trials.filter(trial => trial.attack === true).map(trial => trial.category).filter(Boolean))].sort()) {
    const selected = trials.filter(trial => trial.attack === true && trial.category === category);
    byCategory[category] = summarizeAttackTrials(selected);
  }
  return {
    observedTrialRows: trials.length,
    completedTrialRows: trials.filter(trial => trial.trialState === 'COMPLETED').length,
    errorTrialRows: trials.filter(trial => trial.trialState === 'ERROR').length,
    attacks: summarizeAttackTrials(trials),
    controls: summarizeControlTrials(trials),
    byArm,
    byCategory,
  };
}
