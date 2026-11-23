-- Conference standings for one season file, with the counting rule from Module 6.
-- A match counts only when it is final, has both scores, and is not an exhibition.
-- `listed` is every conference game on the schedule; `counted` is how many of
-- them the totals actually rest on. They are reported side by side.
WITH side AS (
    SELECT home AS team, home_score AS scored, away_score AS conceded, status, match_type FROM fixtures
    WHERE conference_game
    UNION ALL
    SELECT away AS team, away_score AS scored, home_score AS conceded, status, match_type FROM fixtures
    WHERE conference_game
),
marked AS (
    SELECT *, (status = 'final' AND scored IS NOT NULL AND conceded IS NOT NULL
               AND match_type IS DISTINCT FROM 'exhibition') AS counts
    FROM side
)
SELECT
    team,
    count(*)                                  AS listed,
    count(*) FILTER (WHERE counts)            AS counted,
    count(*) FILTER (WHERE counts AND scored > conceded) AS w,
    count(*) FILTER (WHERE counts AND scored = conceded) AS d,
    count(*) FILTER (WHERE counts AND scored < conceded) AS l,
    coalesce(sum(scored) FILTER (WHERE counts), 0) AS gf,
    coalesce(sum(conceded) FILTER (WHERE counts), 0) AS ga,
    3 * count(*) FILTER (WHERE counts AND scored > conceded)
      + count(*) FILTER (WHERE counts AND scored = conceded) AS pts
FROM marked
GROUP BY team
ORDER BY pts DESC, (gf - ga) DESC, gf DESC, team;
