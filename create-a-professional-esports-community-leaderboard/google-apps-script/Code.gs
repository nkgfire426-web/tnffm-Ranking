/**
 * TNFFM Community Rankings - Google Sheets connector
 *
 * 1. Open your Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Paste this entire file into Code.gs.
 * 4. Deploy -> New deployment -> Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 5. Copy the /exec URL into Vercel as GOOGLE_SHEETS_WEBHOOK_URL.
 *
 * The spreadsheet will contain three sheets:
 * Teams, Events, Collaborators.
 */

const TEAM_HEADERS = [
  "Team", "Slug", "Rank", "PreviousRank", "CommunityPoints", "Badge",
  "Logo URL", "Banner URL", "Kills", "Booyahs", "Championships", "RunnerUp",
  "SecondRunnerUp", "Top3Finishes", "FinalistFinishes", "OfficialMatchFinalists",
  "EventsPlayed", "GrandFinals", "WinRate", "KillRatio", "Players", "Status",
  "Description", "LastUpdated"
];

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return json({
    ok: true,
    teams: readTeams_(ss),
    events: readObjects_(ss, "Events"),
    collaborators: readObjects_(ss, "Collaborators")
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (Array.isArray(body.teams)) {
      writeTeams_(ss, body.teams);
    }
    if (Array.isArray(body.events)) {
      writeObjects_(ss, "Events", body.events);
    }
    if (Array.isArray(body.collaborators)) {
      writeObjects_(ss, "Collaborators", body.collaborators);
    }

    SpreadsheetApp.flush();
    return json({ ok: true, message: "TNFFM data updated successfully." });
  } catch (err) {
    return json({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function writeTeams_(ss, teams) {
  const sheet = getOrCreateSheet_(ss, "Teams");
  const rows = teams.map(function (t) {
    return [
      t.teamName || "", t.slug || "", value_(t.rank), value_(t.previousRank),
      value_(t.communityPoints), t.badge || "", t.logoUrl || "", t.bannerUrl || "",
      value_(t.kills), value_(t.booyahs), value_(t.championships), value_(t.runnerUp),
      value_(t.secondRunnerUp), value_(t.top3Finishes), value_(t.finalistFinishes),
      value_(t.officialMatchFinalists), value_(t.eventsPlayed), value_(t.grandFinals),
      value_(t.winRate), value_(t.killRatio), value_(t.players), t.status || "Active",
      t.description || "", t.lastUpdated || ""
    ];
  });
  sheet.clearContents();
  sheet.getRange(1, 1, 1, TEAM_HEADERS.length).setValues([TEAM_HEADERS]);
  if (rows.length) sheet.getRange(2, 1, rows.length, TEAM_HEADERS.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function readTeams_(ss) {
  const sheet = ss.getSheetByName("Teams");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getRange(1, 1, sheet.getLastRow(), TEAM_HEADERS.length).getValues();
  return values.slice(1).filter(function (row) {
    return String(row[0] || "").trim() !== "";
  }).map(function (r) {
    return {
      teamName: String(r[0] || ""), slug: String(r[1] || ""), rank: number_(r[2]),
      previousRank: number_(r[3]), communityPoints: number_(r[4]), badge: String(r[5] || ""),
      logoUrl: String(r[6] || ""), bannerUrl: String(r[7] || ""), kills: number_(r[8]),
      booyahs: number_(r[9]), championships: number_(r[10]), runnerUp: number_(r[11]),
      secondRunnerUp: number_(r[12]), top3Finishes: number_(r[13]),
      finalistFinishes: number_(r[14]), officialMatchFinalists: number_(r[15]),
      eventsPlayed: number_(r[16]), grandFinals: number_(r[17]), winRate: number_(r[18]),
      killRatio: number_(r[19]), players: number_(r[20]) || 5, status: String(r[21] || "Active"),
      description: String(r[22] || ""), lastUpdated: String(r[23] || "")
    };
  });
}

function writeObjects_(ss, name, objects) {
  const sheet = getOrCreateSheet_(ss, name);
  sheet.clearContents();
  if (!objects.length) return;

  const headers = [];
  objects.forEach(function (obj) {
    Object.keys(obj || {}).forEach(function (key) {
      if (headers.indexOf(key) === -1) headers.push(key);
    });
  });
  const rows = objects.map(function (obj) {
    return headers.map(function (key) {
      const value = obj[key];
      return value === null || value === undefined ? "" :
        typeof value === "object" ? JSON.stringify(value) : value;
    });
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function readObjects_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1).filter(function (row) {
    return row.some(function (v) { return String(v || "").trim() !== ""; });
  }).map(function (row) {
    const obj = {};
    headers.forEach(function (key, i) { obj[key] = row[i]; });
    return obj;
  });
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function value_(v) {
  return v === null || v === undefined ? "" : v;
}

function number_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
