/**
 * TNFFM Community Rankings - Google Sheets connector
 * Teams, Events, Collaborators, rosters and Team Accounts.
 */

const TEAM_HEADERS = [
  "Team", "Slug", "Rank", "PreviousRank", "CommunityPoints", "Badge",
  "Logo URL", "Banner URL", "Kills", "Booyahs", "Championships", "RunnerUp",
  "SecondRunnerUp", "Top3Finishes", "FinalistFinishes", "OfficialMatchFinalists",
  "EventsPlayed", "GrandFinals", "WinRate", "KillRatio", "Players", "Roster", "Status",
  "Description", "LastUpdated"
];

const ACCOUNT_HEADERS = ["Username", "PasswordHash", "TeamSlug", "Email", "Status", "CreatedAt", "UpdatedAt"];

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return json({ ok: true, teams: readTeams_(ss), events: readObjects_(ss, "Events"), collaborators: readObjects_(ss, "Collaborators") });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.action === "uploadLogo") return uploadLogo_(body);
    if (body.action === "registerTeam") return registerTeam_(ss, body);
    if (body.action === "loginTeam") return loginTeam_(ss, body);
    if (body.action === "updateTeamProfile") return updateTeamProfile_(ss, body);
    if (body.action === "resetTeamPassword") return resetTeamPassword_(ss, body);
    if (Array.isArray(body.teams)) writeTeams_(ss, body.teams);
    if (Array.isArray(body.events)) writeObjects_(ss, "Events", body.events);
    if (Array.isArray(body.collaborators)) writeObjects_(ss, "Collaborators", body.collaborators);
    SpreadsheetApp.flush();
    return json({ ok: true, message: "TNFFM data updated successfully." });
  } catch (err) {
    return json({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function uploadLogo_(body) {
  if (!body.dataUrl || typeof body.dataUrl !== "string") return json({ ok: false, message: "Logo data is missing." });
  const match = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return json({ ok: false, message: "Invalid image data." });
  const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1], String(body.fileName || "tnffm-logo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80));
  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return json({ ok: true, url: "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(id), fileId: id });
}

function registerTeam_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const passwordHash = String(body.passwordHash || "").trim();
  const requestedSlug = String(body.teamSlug || "").trim();
  const requestedTeamName = String(body.teamName || "").trim();
  const email = String(body.email || "").trim();
  if (!/^[a-z0-9._-]{4,32}$/.test(username)) return json({ ok: false, message: "Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen." });
  if (!passwordHash) return json({ ok: false, message: "Username and password are required." });
  if (!requestedSlug && !requestedTeamName) return json({ ok: false, message: "Select an existing team or enter a new team name." });

  const accounts = getOrCreateSheet_(ss, "TeamAccounts");
  ensureHeaders_(accounts, ACCOUNT_HEADERS);
  const rows = accounts.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0] || "").toLowerCase() === username) return json({ ok: false, message: "Username is already registered." });

  const teams = readTeams_(ss);
  let teamSlug = requestedSlug;
  let teamName = requestedTeamName;

  if (!teamSlug && teamName) {
    teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
    if (!teamSlug) return json({ ok: false, message: "Please enter a valid team name." });
    if (teams.some(function (t) { return t.slug === teamSlug; })) return json({ ok: false, message: "A team with this name already exists. Please select it instead." });
    teams.push({ teamName: teamName, slug: teamSlug, rank: 0, previousRank: 0, communityPoints: 0, badge: "", logoUrl: "", bannerUrl: "", kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, top3Finishes: 0, finalistFinishes: 0, officialMatchFinalists: 0, eventsPlayed: 0, grandFinals: 0, winRate: 0, killRatio: 0, players: 0, roster: [], status: "Active", description: "", lastUpdated: new Date().toISOString() });
    writeTeams_(ss, teams);
  } else {
    const team = teams.find(function (t) { return t.slug === teamSlug; });
    if (!team) return json({ ok: false, message: "Team not found." });
    teamName = team.teamName;
  }

  accounts.appendRow([username, passwordHash, teamSlug, email, "Active", new Date().toISOString(), new Date().toISOString()]);
  SpreadsheetApp.flush();
  return json({ ok: true, status: "Active", username: username, teamSlug: teamSlug, teamName: teamName, message: "Team account created successfully. You can login now." });
}

function loginTeam_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const passwordHash = String(body.passwordHash || "").trim();
  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || sheet.getLastRow() < 2) return json({ ok: false, message: "No team accounts are configured." });
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (String(r[0] || "").toLowerCase() === username && String(r[1] || "") === passwordHash) return json({ ok: true, username: username, teamSlug: String(r[2] || ""), email: String(r[3] || "") });
  }
  return json({ ok: false, message: "Invalid username or password." });
}

function updateTeamProfile_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const teamSlug = String(body.teamSlug || "").trim();
  const account = findAccount_(ss, username);
  if (!account || account.teamSlug !== teamSlug) return json({ ok: false, message: "Team account is not authorized." });
  const teams = readTeams_(ss);
  const team = teams.find(function (t) { return t.slug === teamSlug; });
  if (!team) return json({ ok: false, message: "Team not found." });
  if (typeof body.logoUrl === "string") team.logoUrl = body.logoUrl.trim();
  if (typeof body.description === "string") team.description = body.description.trim();
  if (Array.isArray(body.roster)) { team.roster = body.roster.map(function (p) { return { name: String(p.name || "").trim(), uid: String(p.uid || "").trim() }; }).filter(function (p) { return p.name || p.uid; }); team.players = team.roster.length; }
  team.lastUpdated = new Date().toISOString();
  writeTeams_(ss, teams);
  return json({ ok: true, team: team });
}

function resetTeamPassword_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const newHash = String(body.passwordHash || "").trim();
  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || !newHash) return json({ ok: false, message: "Password reset data is missing." });
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || "").toLowerCase() === username) {
      sheet.getRange(i + 1, 2).setValue(newHash);
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      return json({ ok: true, message: "Password updated." });
    }
  }
  return json({ ok: false, message: "Team account not found." });
}

function findAccount_(ss, username) {
  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][0] || "").toLowerCase() === username) return { username: String(values[i][0]), teamSlug: String(values[i][2] || ""), email: String(values[i][3] || "") };
  return null;
}

function writeTeams_(ss, teams) {
  const sheet = getOrCreateSheet_(ss, "Teams");
  const rows = teams.map(function (t) {
    return [t.teamName || "", t.slug || "", value_(t.rank), value_(t.previousRank), value_(t.communityPoints), t.badge || "", t.logoUrl || "", t.bannerUrl || "", value_(t.kills), value_(t.booyahs), value_(t.championships), value_(t.runnerUp), value_(t.secondRunnerUp), value_(t.top3Finishes), value_(t.finalistFinishes), value_(t.officialMatchFinalists), value_(t.eventsPlayed), value_(t.grandFinals), value_(t.winRate), value_(t.killRatio), value_(t.players), typeof t.roster === "string" ? t.roster : JSON.stringify(t.roster || []), t.status || "Active", t.description || "", t.lastUpdated || ""];
  });
  sheet.clearContents(); sheet.getRange(1, 1, 1, TEAM_HEADERS.length).setValues([TEAM_HEADERS]);
  if (rows.length) sheet.getRange(2, 1, rows.length, TEAM_HEADERS.length).setValues(rows); sheet.setFrozenRows(1);
}

function readTeams_(ss) {
  const sheet = ss.getSheetByName("Teams"); if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), TEAM_HEADERS.length).getValues();
  return values.slice(1).filter(function (row) { return String(row[0] || "").trim() !== ""; }).map(function (r) {
    let roster = []; try { roster = r[21] ? JSON.parse(String(r[21])) : []; } catch (_) { roster = []; }
    return { teamName: String(r[0] || ""), slug: String(r[1] || ""), rank: number_(r[2]), previousRank: number_(r[3]), communityPoints: number_(r[4]), badge: String(r[5] || ""), logoUrl: String(r[6] || ""), bannerUrl: String(r[7] || ""), kills: number_(r[8]), booyahs: number_(r[9]), championships: number_(r[10]), runnerUp: number_(r[11]), secondRunnerUp: number_(r[12]), top3Finishes: number_(r[13]), finalistFinishes: number_(r[14]), officialMatchFinalists: number_(r[15]), eventsPlayed: number_(r[16]), grandFinals: number_(r[17]), winRate: number_(r[18]), killRatio: number_(r[19]), players: number_(r[20]) || 5, roster: roster, status: String(r[22] || "Active"), description: String(r[23] || ""), lastUpdated: String(r[24] || "") };
  });
}

function writeObjects_(ss, name, objects) {
  const sheet = getOrCreateSheet_(ss, name); sheet.clearContents(); if (!objects.length) return;
  const headers = []; objects.forEach(function (obj) { Object.keys(obj || {}).forEach(function (key) { if (headers.indexOf(key) === -1) headers.push(key); }); });
  const rows = objects.map(function (obj) { return headers.map(function (key) { const value = obj[key]; return value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : value; }); });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]); sheet.getRange(2, 1, rows.length, headers.length).setValues(rows); sheet.setFrozenRows(1);
}
function readObjects_(ss, name) { const sheet = ss.getSheetByName(name); if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return []; const values = sheet.getDataRange().getValues(); const headers = values[0].map(String); return values.slice(1).filter(function (row) { return row.some(function (v) { return String(v || "").trim() !== ""; }); }).map(function (row) { const obj = {}; headers.forEach(function (key, i) { obj[key] = row[i]; }); return obj; }); }
function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensureHeaders_(sheet, headers) { if (sheet.getLastRow() < 1 || sheet.getLastColumn() < headers.length) sheet.getRange(1, 1, 1, headers.length).setValues([headers]); }
function value_(v) { return v === null || v === undefined ? "" : v; }
function number_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function json(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
