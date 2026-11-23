SELECT f.date, f.home, f.away, f.home_score, f.away_score
FROM (SELECT unnest(fixtures) AS f
      FROM read_json('sample/data/fixtures/2026-men-plc.json'))
WHERE f.status = 'final'
ORDER BY f.date
LIMIT 10;
