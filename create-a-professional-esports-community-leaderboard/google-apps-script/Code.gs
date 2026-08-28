/*
 * TNFFM COMMUNITY RANKING — GOOGLE APPS SCRIPT
 * Canonical Google Sheets storage API for the current TNFFM web app.
 *
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Required Script Property:
 *   SPREADSHEET_ID = target Google Sheet ID
 * Optional:
 *   DRIVE_FOLDER_ID = Google Drive folder ID for logo uploads
 */

var VERSION = 'TNFFM-2026.08.28-STABLE-1';
var MAX_ROWS = 5000;
var MAX_BODY_CHARS = 15000000;

var TABS = {
  TEAMS: 'Teams',
  ROSTERS: 'Team Rosters',
  RANKINGS: 'Community Rankings',
  EVENTS: 'Events',
  RESULTS: 'Event Results',
  NEWS: 'TournamentNews',
  COLLAB: 'Collaborators',
  ACCOUNTS: 'TeamAccounts',
  SUBMISSIONS: 'Submissions',
  FEEDBACK: 'Feedback'
};

var HEADERS = {};
HEADERS[TABS.TEAMS] = [
  'Team ID','Team Name','Slug','Logo URL','Banner URL','Description',
  'Mobile Number','Status','Registration Status','Created At','Updated At'
];
HEADERS[TABS.ROSTERS] = [
  'Player ID','Team ID','Team Name','Player Name','UID','Role',
  'Player Logo URL','Status','Created At','Updated At'
];
HEADERS[TABS.RANKINGS] = [
  'Rank','Team ID','Team Name','Slug','Events Played','Championships',
  'Runner-Up','2nd Runner-Up','Top 5 Finishes','Community Score','Kills',
  'Booyahs','Kill Ratio','Booyah Ratio','Position Points','Total Points',
  'Matches Played','Grand Finals','Win Rate','Eligible','Status','Updated At'
];
HEADERS[TABS.EVENTS] = [
  'Event ID','Name','Organizer','Teams','Prize','Status','Counted','Date',
  'Notes','Matches Played','Published','Results','Created At','Updated At'
];
HEADERS[TABS.RESULTS] = [
  'Result ID','Event ID','Event Name','Team ID','Team Name','Position',
  'Kills','Booyahs','Position Points','Kill Points','Total Points',
  'Proof URL','Verified','Updated At'
];
HEADERS[TABS.NEWS] = [
  'ID','Title','Description','Date','Type','Status','ImageURL','Link','UpdatedAt'
];
HEADERS[TABS.COLLAB] = [
  'Collaborator ID','Name','Role','Status','Contact','LogoURL','Website',
  'Instagram','UpdatedAt'
];
HEADERS[TABS.ACCOUNTS] = [
  'Username','PasswordHash','TeamSlug','Email','Status','CreatedAt','UpdatedAt'
];
HEADERS[TABS.SUBMISSIONS] = [
  'SubmissionID','Username','TeamSlug','Team','TournamentName','TournamentDate',
  'OrganizerName','PrizePool','FinalPosition','FinalLeaderboard','ProofURL',
  'Status','ReviewNotes','ReviewedBy','ReviewedAt','CreatedAt'
];
HEADERS[TABS.FEEDBACK] = [
  'FeedbackID','Username','TeamSlug','Team','Message','Status','AdminReply',
  'CreatedAt','UpdatedAt'
];

function clean_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function now_() {
  return new Date().toISOString();
}

function num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function int_(v) {
  return Math.max(0, Math.floor(num_(v)));
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  var out = { ok: true, version: VERSION };
  if (data) Object.keys(data).forEach(function(k) { out[k] = data[k]; });
  return json_(out);
}

function fail_(message, code) {
  return json_({
    ok: false,
    version: VERSION,
    code: code || 'TNFFM_ERROR',
    message: clean_(message) || 'Unknown Google Sheets error.'
  });
}

function errorMessage_(e) {
  return e && e.message ? e.message : String(e || 'Unknown error.');
}

function bool_(v) {
  if (v === true) return true;
  var x = clean_(v).toLowerCase();
  return x === 'true' || x === 'yes' || x === '1' ||
    x === 'published' || x === 'active';
}

function safeJson_(v, fallback) {
  if (Array.isArray(v)) return v;
  var x = clean_(v);
  if (!x) return fallback;
  try { return JSON.parse(x); } catch (e) { return fallback; }
}

function prop_(obj, names) {
  if (!obj) return '';
  for (var i = 0; i < names.length; i++) {
    if (obj[names[i]] !== undefined && obj[names[i]] !== null) return obj[names[i]];
  }
  return '';
}

function slugify_(name) {
  var s = clean_(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
  return s || 'team';
}

function sanitizeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  var x = String(value);
  // Prevent externally supplied values from becoming Sheets formulas.
  if (/^[=+\-@]/.test(x)) return "'" + x;
  return x;
}

function getSpreadsheet_() {
  var id = clean_(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('Configured SPREADSHEET_ID could not be opened: ' + errorMessage_(e));
    }
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Google Sheet is not configured. Set Script Property SPREADSHEET_ID.');
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  return sheet || ss.insertSheet(name);
}

function ensureSheet_(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function getHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(clean_);
}

function getRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  var count = Math.min(sheet.getLastRow() - 1, MAX_ROWS - 1);
  return sheet.getRange(2, 1, count, sheet.getLastColumn()).getDisplayValues();
}

function clearData_(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 1)).clearContent();
  }
}

function normalizeKey_(key) {
  var map = {
    'Team':'teamName','Team Name':'teamName','team':'teamName',
    'Team ID':'teamId','TeamId':'teamId','team_id':'teamId',
    'Slug':'slug','PreviousRank':'previousRank','Previous Rank':'previousRank',
    'CommunityPoints':'communityPoints','Community Score':'communityScore','CommunityScore':'communityScore',
    'Badge':'badge','Logo URL':'logoUrl','LogoURL':'logoUrl',
    'Banner URL':'bannerUrl','BannerURL':'bannerUrl',
    'Kills':'kills','Booyahs':'booyahs','Championships':'championships',
    'RunnerUp':'runnerUp','Runner-Up':'runnerUp','SecondRunnerUp':'secondRunnerUp',
    '2nd Runner-Up':'secondRunnerUp','Top5Finishes':'top5Finishes','Top 5 Finishes':'top5Finishes',
    'FinalistFinishes':'finalistFinishes','OfficialMatchFinalists':'officialMatchFinalists',
    'EventsPlayed':'eventsPlayed','Events Played':'eventsPlayed','GrandFinals':'grandFinals',
    'WinRate':'winRate','Win Rate':'winRate','KillRatio':'killRatio','Kill Ratio':'killRatio',
    'BooyahRatio':'booyahRatio','Booyah Ratio':'booyahRatio',
    'PositionPoints':'positionPoints','Position Points':'positionPoints',
    'TotalPoints':'totalPoints','Total Points':'totalPoints','MatchesPlayed':'matchesPlayed',
    'Matches Played':'matchesPlayed','Players':'players','Status':'status',
    'RegistrationStatus':'registrationStatus','Registration Status':'registrationStatus',
    'Description':'description','Mobile Number':'mobileNumber','LastUpdated':'lastUpdated',
    'Last Updated':'lastUpdated','Eligible':'eligible',
    'Event ID':'eventId','EventId':'eventId','Event Name':'eventName',
    'Name':'name','Organizer':'organizer','Teams':'teams','Team Count':'teams',
    'Prize':'prize','Prize Pool':'prize','Date':'date','Event Date':'date',
    'Notes':'notes','Counted':'counted','Published':'published','Results':'results',
    'ID':'id','Title':'title','Type':'type','ImageURL':'imageUrl','Image URL':'imageUrl','Link':'link',
    'Result ID':'resultId','ResultId':'resultId','Position':'position','Total':'total',
    'Kill Points':'killPoints','Proof URL':'proofUrl','Verified':'verified',
    'Player ID':'playerId','Player Name':'playerName','UID':'uid','Role':'role',
    'Player Logo URL':'playerLogoUrl','Username':'username','PasswordHash':'passwordHash',
    'Email':'email','CreatedAt':'createdAt','Created At':'createdAt',
    'UpdatedAt':'updatedAt','Updated At':'updatedAt',
    'SubmissionID':'submissionId','FeedbackID':'feedbackId','Collaborator ID':'collaboratorId',
    'ReviewNotes':'reviewNotes','ReviewedBy':'reviewedBy','ReviewedAt':'reviewedAt',
    'TournamentName':'tournamentName','TournamentDate':'tournamentDate',
    'OrganizerName':'organizerName','PrizePool':'prizePool','FinalPosition':'finalPosition',
    'FinalLeaderboard':'finalLeaderboard','ProofURL':'proofUrl','AdminReply':'adminReply',
    'Message':'message','Contact':'contact','Website':'website','Instagram':'instagram'
  };
  return map[clean_(key)] || clean_(key);
}

function parseCell_(value) {
  var x = clean_(value);
  if (!x) return '';
  if ((x.charAt(0) === '[' && x.charAt(x.length - 1) === ']') ||
      (x.charAt(0) === '{' && x.charAt(x.length - 1) === '}')) {
    try { return JSON.parse(x); } catch (e) {}
  }
  if (/^(true|false)$/i.test(x)) return x.toLowerCase() === 'true';
  return x;
}

function normalizeReadObject_(raw) {
  var out = {};
  Object.keys(raw || {}).forEach(function(key) {
    out[key] = raw[key];
    var canonical = normalizeKey_(key);
    if (canonical && out[canonical] === undefined) out[canonical] = raw[key];
  });
  return out;
}

function readSection_(sheetName) {
  var sheet = getSheet_(sheetName);
  var headers = getHeaders_(sheet);
  if (!headers.length) return [];
  return getRows_(sheet)
    .filter(function(row) {
      return row.some(function(v) { return clean_(v) !== ''; });
    })
    .map(function(row) {
      var raw = {};
      headers.forEach(function(header, i) {
        if (header) raw[header] = parseCell_(row[i]);
      });
      return normalizeReadObject_(raw);
    });
}

function rowsFor_(items, headers) {
  return items.map(function(item) {
    var source = item || {};
    return headers.map(function(header) {
      var value = source[header];
      if (value === undefined) value = source[normalizeKey_(header)];
      return sanitizeCell_(value);
    });
  });
}

function writeSection_(sheetName, items) {
  if (!Array.isArray(items)) throw new Error(sheetName + ' must be an array.');
  if (items.length > MAX_ROWS - 1) {
    throw new Error(sheetName + ' exceeds the maximum of ' + (MAX_ROWS - 1) + ' records.');
  }

  var sheet = getSheet_(sheetName);
  var headers = HEADERS[sheetName] || getHeaders_(sheet);
  if (!headers.length) headers = ['ID'];
  ensureSheet_(sheet, headers);

  var rows = rowsFor_(items, headers);
  clearData_(sheet);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  SpreadsheetApp.flush();
}

function ensureAllSheets_() {
  var ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(function(name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    ensureSheet_(sheet, HEADERS[name]);
  });
  SpreadsheetApp.flush();
}

function setupTNFFM() {
  ensureAllSheets_();
  return ok_({
    message: 'TNFFM Google Sheet structure is ready.',
    tabs: Object.keys(HEADERS)
  });
}

function setupSheets() {
  return setupTNFFM();
}

function onOpen() {
  try { ensureAllSheets_(); } catch (e) { console.log(errorMessage_(e)); }
}

function readAll_() {
  var results = readSection_(TABS.RESULTS);
  return {
    teams: readSection_(TABS.TEAMS),
    rankings: readSection_(TABS.RANKINGS),
    events: readSection_(TABS.EVENTS),
    rankingResults: results,
    results: results,
    news: readSection_(TABS.NEWS),
    collaborators: readSection_(TABS.COLLAB),
    accounts: readSection_(TABS.ACCOUNTS),
    submissions: readSection_(TABS.SUBMISSIONS),
    feedback: readSection_(TABS.FEEDBACK),
    serverTime: now_(),
    version: VERSION
  };
}

function keyFor_(section, item) {
  var x = item || {};
  if (section === 'teams') {
    return clean_(prop_(x, ['teamId','Team ID','id'])) ||
      'name:' + clean_(prop_(x, ['teamName','Team Name','Team','team'])).toLowerCase();
  }
  if (section === 'rankings') {
    return clean_(prop_(x, ['teamId','Team ID'])) ||
      'name:' + clean_(prop_(x, ['teamName','Team Name','Team'])).toLowerCase();
  }
  if (section === 'events') {
    return clean_(prop_(x, ['eventId','Event ID','id'])) ||
      'name:' + clean_(prop_(x, ['name','Event Name','Name'])).toLowerCase();
  }
  if (section === 'rankingResults') {
    return clean_(prop_(x, ['resultId','Result ID','id'])) || [
      clean_(prop_(x, ['eventId','Event ID'])),
      clean_(prop_(x, ['teamId','Team ID'])),
      clean_(prop_(x, ['position','Position']))
    ].join('|');
  }
  if (section === 'news') {
    return clean_(prop_(x, ['id','ID'])) ||
      'title:' + clean_(prop_(x, ['title','Title'])).toLowerCase();
  }
  if (section === 'collaborators') {
    return clean_(prop_(x, ['collaboratorId','Collaborator ID','id'])) ||
      'name:' + clean_(prop_(x, ['name','Name'])).toLowerCase();
  }
  if (section === 'accounts') {
    return clean_(prop_(x, ['username','Username'])) || clean_(prop_(x, ['email','Email']));
  }
  if (section === 'submissions') {
    return clean_(prop_(x, ['submissionId','SubmissionID'])) || [
      clean_(prop_(x, ['username','Username'])),
      clean_(prop_(x, ['tournamentName','TournamentName'])),
      clean_(prop_(x, ['tournamentDate','TournamentDate']))
    ].join('|');
  }
  if (section === 'feedback') {
    return clean_(prop_(x, ['feedbackId','FeedbackID'])) || [
      clean_(prop_(x, ['username','Username'])),
      clean_(prop_(x, ['createdAt','CreatedAt'])),
      clean_(prop_(x, ['message','Message']))
    ].join('|');
  }
  return JSON.stringify(x);
}

function verifySection_(section, expected, actual) {
  if (!Array.isArray(actual)) throw new Error(section + ': read-back returned an invalid array.');
  var actualKeys = {};
  actual.forEach(function(item) {
    var key = keyFor_(section, item);
    if (key) actualKeys[key] = true;
  });
  var missing = [];
  expected.forEach(function(item) {
    var key = keyFor_(section, item);
    if (key && !actualKeys[key]) missing.push(key);
  });
  if (missing.length) {
    throw new Error(section + ' write verification failed. Missing record: ' + missing[0]);
  }
  return { expected: expected.length, actual: actual.length, match: true };
}

function normalizeIncoming_(payload) {
  var out = {};
  if (Array.isArray(payload.teams)) out.teams = payload.teams;
  if (Array.isArray(payload.rankings)) out.rankings = payload.rankings;
  if (Array.isArray(payload.events)) out.events = payload.events;
  // Both names are accepted by the current web application.
  if (Array.isArray(payload.rankingResults)) out.rankingResults = payload.rankingResults;
  else if (Array.isArray(payload.results)) out.rankingResults = payload.results;
  if (Array.isArray(payload.news)) out.news = payload.news;
  if (Array.isArray(payload.collaborators)) out.collaborators = payload.collaborators;
  if (Array.isArray(payload.accounts)) out.accounts = payload.accounts;
  if (Array.isArray(payload.submissions)) out.submissions = payload.submissions;
  if (Array.isArray(payload.feedback)) out.feedback = payload.feedback;
  return out;
}

function doGet(e) {
  try {
    return ok_(readAll_());
  } catch (err) {
    console.error(err);
    return fail_(errorMessage_(err), 'READ_FAILED');
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return fail_('Empty request body.', 'EMPTY_BODY');
    }
    if (e.postData.contents.length > MAX_BODY_CHARS) {
      return fail_('Request is too large.', 'BODY_TOO_LARGE');
    }

    lock.waitLock(30000);

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return fail_('Request body is not valid JSON.', 'INVALID_JSON');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return fail_('Request body must be a JSON object.', 'INVALID_PAYLOAD');
    }

    if (payload.action === 'setup' || payload.action === 'setupSheets') {
      return setupTNFFM();
    }

    if (payload.action === 'health' || payload.action === 'healthCheck') {
      return healthCheck();
    }

    if (payload.action === 'uploadLogo') {
      return ok_({ url: uploadLogo_(payload.dataUrl, payload.fileName) });
    }

    var incoming = normalizeIncoming_(payload);
    var sections = Object.keys(incoming);
    if (!sections.length) {
      return fail_('No supported data section was supplied.', 'NO_SECTIONS');
    }

    ensureAllSheets_();

    var saved = [];
    sections.forEach(function(section) {
      var sheetName = section === 'rankingResults' ? TABS.RESULTS :
        TABS[section.toUpperCase()];
      if (!sheetName) throw new Error('Unsupported section: ' + section);
      writeSection_(sheetName, incoming[section]);
      saved.push(section);
    });

    // The save response is not successful until the exact records can be
    // read back from the spreadsheet.
    var fresh = readAll_();
    var verification = {};
    sections.forEach(function(section) {
      verification[section] = verifySection_(section, incoming[section], fresh[section]);
    });

    return ok_({
      saved: true,
      verified: true,
      savedSections: saved,
      savedAt: now_(),
      verification: verification,
      data: fresh
    });
  } catch (err) {
    console.error(err);
    return fail_(errorMessage_(err), 'WRITE_FAILED');
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function uploadLogo_(dataUrl, fileName) {
  if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:image/') !== 0) {
    throw new Error('Invalid image data.');
  }
  if (dataUrl.length > 4000000) throw new Error('Image is too large.');
  var match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format.');

  var blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    clean_(fileName || 'tnffm-image').replace(/[^a-zA-Z0-9._-]/g, '-')
  );

  var folderId = clean_(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function setSpreadsheetId(id) {
  var value = clean_(id);
  if (!value) throw new Error('Spreadsheet ID required.');
  SpreadsheetApp.openById(value);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', value);
  return ok_({ spreadsheetId: value, message: 'TNFFM spreadsheet configured.' });
}

function healthCheck() {
  var ss = getSpreadsheet_();
  ensureAllSheets_();
  var counts = {};
  Object.keys(TABS).forEach(function(key) {
    var sheet = ss.getSheetByName(TABS[key]);
    counts[TABS[key]] = sheet && sheet.getLastRow() > 1 ? sheet.getLastRow() - 1 : 0;
  });
  return ok_({
    message: 'TNFFM Apps Script backend is healthy.',
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    counts: counts,
    checkedAt: now_()
  });
}
