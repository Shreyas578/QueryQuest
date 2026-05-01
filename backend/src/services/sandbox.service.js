const { Client } = require('pg');

/**
 * SandboxService — executes player SQL in an isolated, read-only PostgreSQL schema.
 *
 * Each answer gets its own ephemeral schema scoped to the question's
 * temporary data so players cannot affect each other or the main DB.
 */
const SandboxService = {
  /**
   * Run player SQL against the question's schema and compare result to expected.
   *
   * @param {string} playerSql  — the SQL submitted by the player
   * @param {Object} question   — { setup_sql, expected_rows, answer_sql }
   * @returns {{ correct: boolean, result: any[], error: string|null }}
   */
  async execute(playerSql, question) {
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'queryquest',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const schemaName = `qq_sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      await client.connect();

      // 1. Create isolated schema and set it as the current search path
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}", public`);

      // 2. Run question setup DDL + seed data
      if (question.setup_sql) {
        for (const stmt of _splitStatements(question.setup_sql)) {
          // Replace MySQL specific syntax in setup if needed
          const pgStmt = stmt.replace(/AUTO_INCREMENT/gi, 'SERIAL').replace(/`/g, '"');
          await client.query(pgStmt);
        }
      }

      // 3. Execute player query (single statement only — prevent injections)
      const safe = _sanitize(playerSql);
      if (!safe) {
        return { correct: false, result: [], error: 'Only SELECT statements are allowed.' };
      }

      // Ensure player query uses double quotes instead of backticks
      const pgPlayerSql = safe.replace(/`/g, '"');
      
      const res = await client.query(pgPlayerSql);
      const playerResult = res.rows || [];

      // 4. Run expected answer to get canonical result
      const pgAnswerSql = question.answer_sql.replace(/`/g, '"');
      const expectedRes = await client.query(pgAnswerSql);
      const expectedRows = expectedRes.rows || [];

      const correct = _compareResults(playerResult, expectedRows);
      return { correct, result: playerResult.slice(0, 50), error: null };
    } catch (err) {
      const message = err.detail || err.message || 'Query error';
      return { correct: false, result: [], error: message };
    } finally {
      try {
        // 5. Cleanup
        await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      } catch (_) {}
      await client.end();
    }
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function _sanitize(sql) {
  const trimmed = sql.trim().replace(/;+$/, '');
  // Only allow SELECT statements
  if (!/^SELECT\b/i.test(trimmed)) return null;
  // Disallow dangerous keywords
  if (/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|GRANT|REVOKE|TRUNCATE|EXEC|CALL)\b/i.test(trimmed))
    return null;
  return trimmed;
}

function _splitStatements(sql) {
  return sql.split(';').map(s => s.trim()).filter(Boolean);
}

function _compareResults(a, b) {
  if (a.length !== b.length) return false;
  
  const norm = (arr) =>
    arr.map(row => {
      // 1. Lowercase keys and values, then sort entries by key name
      const entries = Object.entries(row).map(([k, v]) => [
        k.toLowerCase(), 
        String(v ?? '').toLowerCase().trim()
      ]);
      entries.sort((a, b) => a[0] < b[0] ? -1 : 1);
      return Object.fromEntries(entries);
    });

  const na = norm(a);
  const nb = norm(b);

  const sa = na.sort(_rowSort);
  const sb = nb.sort(_rowSort);

  return JSON.stringify(sa) === JSON.stringify(sb);
}

function _rowSort(a, b) {
  return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;
}

module.exports = SandboxService;
