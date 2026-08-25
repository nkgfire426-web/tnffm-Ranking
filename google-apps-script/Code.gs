/**
 * TNFFM COMMUNITY RANKINGS - CANONICAL GOOGLE SHEETS BACKEND
 *
 * This file is the single Google Apps Script Web App backend used by the
 * Next.js website. Google Sheets remains the source of truth.
 *
 * Required tabs:
 *   Teams
 *   Community Rankings
 *   Events
 *   Collaborators
 *   News
 *
 * Optional Script Properties:
 *   DRIVE_FOLDER_ID - Drive folder used for uploaded team logos/banners.
 *
 * Deploy as Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * IMPORTANT: Keep the Web App URL in Vercel as GOOGLE_SHEETS_WEBHOOK_URL.
 */

const CONFIG = {
  sheets: {
    teams: 'Teams',
    rankings: 'Community Rankings',
    events: 'Events',
    collaborators: 'Collaborators',
    news: 'News'
  },
  maxRows: 5000,
  maxBodyChars: 15000000
};

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(extra) {
  return json_(Object.assign({ ok: true }, extra || {}));
}

function error_(message) {
  return json_({ ok: false, message: String(message || 'Unknown Google Sheets error.') });
}

function doGet(e) {
  try {
    const data = readAll_();
    return ok_(data);
  } catch (err) {
    console.error(err);
    return error_(err && err.message ? err.message : err);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) return error_('Empty request body.');
    if (e.postData.contents.length > CONFIG.maxBodyChars) return error_('Request is too large.');

    lock.waitLock(30000);
    const payload = JSON.parse(e.postData.contents);

    // Logo upload is intentionally handled separately because it returns a
    // stable public URL which the Next.js save API stores in the Team row.
    if (payload && payload.action === 'uploadLogo') {
      return ok_({ url: uploadLogo_(payload.dataUrl, payload.fileName) });
    }

    const sections = [
      ['teams', CONFIG.sheets.teams],
      ['rankings', CONFIG.sheets.rankings],
      ['events', CONFIG.sheets.events],
      ['collaborators', CONFIG.sheets.collaborators],
      ['news', CONFIG.sheets.news]
    ];

    let changed = 0;
    sections.forEach(function(pair) {
      const key = pair[0];
      const sheetName = pair[1];
      if (!Object.prototype.hasOwnProperty.call(payload, key)) return;
      if (!Array.isArray(payload[key])) throw new Error(key + ' must be an array.');
      writeSection_(sheetName, payload[key]);
      changed++;
    });

    if (!changed) return error_('No supported data section was supplied.');

    SpreadsheetApp.flush();
    return ok_({
      savedSections: changed,
      savedAt: new Date().toISOString(),
      data: readAll_()
    });
  } catch (err) {
    console.error(err);
    return error_(err && err.message ? err.message : err);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function readAll_() {
  return {
    teams: readSection_(CONFIG.sheets.teams),
    rankings: readSection_(CONFIG.sheets.rankings),
    events: readSection_(CONFIG.sheets.events),
    collaborators: readSection_(CONFIG.sheets.collaborators),
    news: readSection_(CONFIG.sheets.news),
    serverTime: new Date().toISOString()
  };
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function cleanHeader_(value) {
  return String(value == null ? '' : value).trim();
}

function readSection_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return [];

  const lastRow = Math.min(sheet.getLastRow(), CONFIG.maxRows);
  const lastColumn = sheet.getLastColumn();
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  if (!values.length) return [];

  const headers = values[0].map(cleanHeader_);
  if (!headers.some(Boolean)) return [];

  return values.slice(1)
    .filter(function(row) { return row.some(function(v) { return String(v).trim() !== ''; }); })
    .map(function(row) {
      const item = {};
      headers.forEach(function(header, index) {
        if (!header) return;
        item[header] = decodeCell_(row[index]);
      });
      return normalizeReadObject_(item);
    });
}

function decodeCell_(value) {
  const text = String(value == null ? '' : value);
  const trimmed = text.trim();
  if (!trimmed) return '';
  if ((trimmed[0] === '[' && trimmed[trimmed.length - 1] === ']') ||
      (trimmed[0] === '{' && trimmed[trimmed.length - 1] === '}')) {
    try { return JSON.parse(trimmed); } catch (_) {}
  }
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  return text;
}

function normalizeReadObject_(input) {
  // Keep original Sheet header keys for backwards compatibility, while also
  // exposing the canonical camelCase keys consumed by the website.
  const out = Object.assign({}, input);
  Object.keys(input).forEach(function(key) {
    const canonical = canonicalKey_(key);
    if (canonical && !Object.prototype.hasOwnProperty.call(out, canonical)) {
      out[canonical] = input[key];
    }
  });
  return out;
}

function canonicalKey_(key) {
  const map = {
    'Team': 'teamName', 'Team Name': 'teamName', 'team': 'teamName',
    'Slug': 'slug', 'Team ID': 'teamId', 'TeamId': 'teamId',
    'Rank': 'rank', 'PreviousRank': 'previousRank', 'Previous Rank': 'previousRank',
    'CommunityPoints': 'communityPoints', 'Community Score': 'communityScore', 'CommunityScore': 'communityScore',
    'Badge': 'badge', 'Logo URL': 'logoUrl', 'LogoURL': 'logoUrl',
    'Banner URL': 'bannerUrl', 'BannerURL': 'bannerUrl',
    'Kills': 'kills', 'Booyahs': 'booyahs', 'MatchesPlayed': 'matchesPlayed', 'Matches Played': 'matchesPlayed',
    'Championships': 'championships', 'RunnerUp': 'runnerUp', 'Runner-Up': 'runnerUp',
    'SecondRunnerUp': 'secondRunnerUp', '2nd Runner-Up': 'secondRunnerUp',
    'Top5Finishes': 'top5Finishes', 'Top 5 Finishes': 'top5Finishes',
    'FinalistFinishes': 'finalistFinishes', 'OfficialMatchFinalists': 'officialMatchFinalists',
    'EventsPlayed': 'eventsPlayed', 'GrandFinals': 'grandFinals',
    'PositionPoints': 'positionPoints', 'TotalPoints': 'totalPoints', 'Players': 'players',
    'Status': 'status', 'RegistrationStatus': 'registrationStatus', 'Description': 'description',
    'Mobile Number': 'mobileNumber', 'LastUpdated': 'lastUpdated', 'Last Updated': 'lastUpdated',
    'WinRate': 'winRate', 'KillRatio': 'killRatio', 'BooyahRatio': 'booyahRatio',
    'Event ID': 'eventId', 'EventId': 'eventId', 'Name': 'name', 'Event Name': 'name',
    'Organizer': 'organizer', 'Teams': 'teams', 'Team Count': 'teams', 'Prize': 'prize',
    'Prize Pool': 'prize', 'Date': 'date', 'Event Date': 'date', 'Notes': 'notes',
    'Counted': 'counted', 'Published': 'published', 'Results': 'results',
    'ID': 'id', 'Title': 'title', 'Description': 'description', 'Type': 'type',
    'ImageURL': 'imageUrl', 'Link': 'link'
  };
  if (map[key]) return map[key];
  return key;
}

function writeSection_(name, items) {
  const sheet = getOrCreateSheet_(name);
  const normalized = items.map(function(item) { return sanitizeForSheet_(item || {}); });

  // Preserve existing columns first. Add new object keys only when necessary.
  let headers = [];
  if (sheet.getLastColumn() > 0 && sheet.getLastRow() > 0) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(cleanHeader_);
  }
  headers = headers.filter(Boolean);

  const seen = {};
  headers.forEach(function(h) { seen[h] = true; });
  normalized.forEach(function(item) {
    Object.keys(item).forEach(function(key) {
      if (!seen[key]) { headers.push(key); seen[key] = true; }
    });
  });

  if (!headers.length) headers = ['id'];
  if (headers.length > 100) throw new Error(name + ' has too many columns.');

  const rows = normalized.map(function(item) {
    return headers.map(function(header) { return item[header] == null ? '' : item[header]; });
  });

  const requiredRows = Math.max(1, rows.length + 1);
  const requiredCols = headers.length;
  if (sheet.getMaxRows() < requiredRows) sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < requiredCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), requiredCols - sheet.getMaxColumns());

  // Clear only the used data area. Formatting and column widths remain intact.
  const clearRows = Math.max(sheet.getLastRow(), requiredRows);
  const clearCols = Math.max(sheet.getLastColumn(), requiredCols);
  sheet.getRange(1, 1, clearRows, clearCols).clearContent();
  sheet.getRange(1, 1, 1, requiredCols).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, requiredCols).setValues(rows);
  sheet.setFrozenRows(1);
}

function sanitizeForSheet_(input) {
  const out = {};
  Object.keys(input).forEach(function(key) {
    if (!key || key === 'undefined' || key === 'null') return;
    let value = input[key];
    if (value === undefined || value === null) value = '';
    if (typeof value === 'object') value = JSON.stringify(value);
    if (typeof value === 'boolean') value = value ? 'true' : 'false';
    // Prevent formulas from being injected into the Sheet by user-entered data.
    if (typeof value === 'string' && /^[=+\-@]/.test(value)) value = "'" + value;
    out[String(key)] = value;
  });
  return out;
}

function uploadLogo_(dataUrl, fileName) {
  if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:image/') !== 0) throw new Error('Invalid image data.');
  if (dataUrl.length > 4000000) throw new Error('Image is too large. Please use an image smaller than about 3 MB.');

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format.');

  const mime = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const safeName = String(fileName || 'tnffm-image').replace(/[^a-zA-Z0-9._-]/g, '-');
  const blob = Utilities.newBlob(bytes, mime, safeName);

  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('DRIVE_FOLDER_ID');
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

/** Optional one-time helper. Run manually from Apps Script if desired. */
function setupSheets() {
  Object.keys(CONFIG.sheets).forEach(function(key) { getOrCreateSheet_(CONFIG.sheets[key]); });
  SpreadsheetApp.flush();
}
