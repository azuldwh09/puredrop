import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Recalculates stars for all LevelScore records that have stars === 0 but win === true.
 * Stars formula:
 *   3★ = score >= 2000 AND accuracy >= 90%
 *   2★ = score >= 800 OR accuracy >= 70%
 *   1★ = won at all
 */
function computeStars(score, catchRate, win) {
  if (!win) return 0;
  if (score >= 2000 && catchRate >= 0.9) return 3;
  if (score >= 800 || catchRate >= 0.7) return 2;
  return 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all winning scores for this user that have 0 or missing stars
    const scores = await base44.entities.LevelScore.filter({ user_email: user.email });
    const toFix = scores.filter(s => s.win && (!s.stars || s.stars === 0));

    let updated = 0;
    for (const s of toFix) {
      const catchRate = s.accuracy ?? 0;
      const stars = computeStars(s.score, catchRate, s.win);
      if (stars > 0) {
        await base44.entities.LevelScore.update(s.id, { stars });
        updated++;
      }
    }

    return Response.json({ success: true, updated, total: scores.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});