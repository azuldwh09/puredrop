import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Delete all leaderboard entries
    const allScores = await base44.asServiceRole.entities.Leaderboard.list();
    for (const score of allScores) {
      await base44.asServiceRole.entities.Leaderboard.delete(score.id);
    }

    return Response.json({ success: true, deletedCount: allScores.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});