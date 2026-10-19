/**
 * Free back end for the training app. Paste this into the Apps Script editor of your
 * "Training Log" Google Sheet (Extensions > Apps Script), set PASSWORD below, run setup() once,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */
const PASSWORD = 'change-this-to-a-long-random-password';

function setup() {
  const ss = SpreadsheetApp.getActive();
  const heads = {
    Log: ['Key', 'Date', 'Week', 'Day', 'Phase', 'Exercise', 'Planned', 'Done', 'Time of day', 'Logged at', 'Sets done', 'Reps done', 'Weight (kg)', 'Springs', 'Spring force (kg)'],
    Settings: ['Setting', 'Value', 'Updated'],
    Reviews: ['Review date', 'Log from', 'Log to', 'Summary', 'Suggestions (JSON)', 'Applied'],
    Data: ['Key', 'JSON (split across columns)']
  };
  Object.keys(heads).forEach(function (n) {
    let sh = ss.getSheetByName(n);
    if (!sh) sh = ss.insertSheet(n);
    if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, heads[n].length).setValues([heads[n]]); sh.setFrozenRows(1); }
  });
  const first = ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function doGet() { return out({ ok: true }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== PASSWORD) return out({ error: 'bad token' });
    lock.waitLock(20000);
    const ss = SpreadsheetApp.getActive();
    switch (b.op) {
      case 'ping': return out({ ok: true });
      case 'get_values': return out({ payload: { range: b.range, values: trim(range(ss, b.range).getValues().map(clean)) } });
      case 'update_values': range(ss, b.range).setValues(b.values); return out({ payload: { status: 'success' } });
      case 'append_values': {
        const m = parse(b.range), sh = ss.getSheetByName(m.sheet), n = b.values.length, w = Math.max.apply(null, b.values.map(function (r) { return r.length; }));
        const rows = b.values.map(function (r) { const x = r.slice(); while (x.length < w) x.push(''); return x; });
        sh.getRange(sh.getLastRow() + 1, 1, n, w).setValues(rows);
        return out({ payload: { status: 'success' } });
      }
      case 'kv_get': return out(kvGet(ss, b.path));
      case 'kv_set': kvSet(ss, b.path, b.data); return out({ ok: true });
      case 'kv_delete': kvDelete(ss, b.path); return out({ ok: true });
      case 'kv_list': return out({ docs: kvList(ss, b.path) });
      default: return out({ error: 'unknown op' });
    }
  } catch (err) {
    return out({ error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function parse(a1) { const m = String(a1).match(/^'?([^'!]+)'?!(.+)$/); if (!m) throw new Error('Range needs a sheet name'); return { sheet: m[1], cells: m[2] }; }
function range(ss, a1) { const m = parse(a1), sh = ss.getSheetByName(m.sheet); if (!sh) throw new Error('No sheet called ' + m.sheet); return sh.getRange(m.cells); }
function clean(row) { return row.map(function (v) { return v instanceof Date ? v.toISOString() : v; }); }
function trim(rows) { let n = rows.length; while (n > 0 && rows[n - 1].every(function (c) { return c === ''; })) n--; return rows.slice(0, n); }

/* key-value store on the Data tab. Long JSON is split into 40,000-character pieces across columns. */
const PIECE = 40000;
function dataSheet(ss) { return ss.getSheetByName('Data') || ss.insertSheet('Data'); }
function findRow(sh, key) {
  const n = sh.getLastRow(); if (n < 2) return 0;
  const keys = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < keys.length; i++) if (keys[i][0] === key) return i + 2;
  return 0;
}
function kvGet(ss, path) {
  const sh = dataSheet(ss), r = findRow(sh, path);
  if (!r) return { exists: false };
  const cells = sh.getRange(r, 2, 1, Math.max(1, sh.getLastColumn() - 1)).getValues()[0];
  return { exists: true, data: JSON.parse(cells.join('')) };
}
function kvSet(ss, path, data) {
  const sh = dataSheet(ss), s = JSON.stringify(data), parts = [];
  for (let i = 0; i < s.length; i += PIECE) parts.push(s.slice(i, i + PIECE));
  if (!parts.length) parts.push('{}');
  let r = findRow(sh, path);
  if (!r) r = Math.max(2, sh.getLastRow() + 1);
  const width = Math.max(parts.length, sh.getLastColumn() - 1);
  const row = [path].concat(parts);
  while (row.length < width + 1) row.push('');
  sh.getRange(r, 1, 1, row.length).setValues([row]);
}
function kvDelete(ss, path) { const sh = dataSheet(ss), r = findRow(sh, path); if (r) sh.deleteRow(r); }
function kvList(ss, base) {
  const sh = dataSheet(ss), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  const vals = sh.getRange(2, 1, n - 1, Math.max(2, sh.getLastColumn())).getValues(), depth = base.split('/').length + 1;
  vals.forEach(function (row) {
    const k = String(row[0]);
    if (k.indexOf(base + '/') === 0 && k.split('/').length === depth) {
      try { out.push({ id: k.split('/').pop(), data: JSON.parse(row.slice(1).join('')) }); } catch (e) {}
    }
  });
  return out;
}
