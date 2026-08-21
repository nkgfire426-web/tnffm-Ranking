// TNFFM Google Apps Script webhook
// Keep your existing deployment URL in Vercel as GOOGLE_SHEETS_WEBHOOK_URL.
// Replace the current Apps Script with this version, or merge the feedback actions
// (submitFeedback, listFeedback, updateFeedbackStatus) into your existing script.

const SHEET_NAME = "Teams";
const EVENTS_SHEET_NAME = "Events";
const COLLABORATORS_SHEET_NAME = "Collaborators";
const FEEDBACK_SHEET_NAME = "Feedback";

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teams = readTeamsSheet(ss.getSheetByName(SHEET_NAME));
  const events = readJsonSheet(ss.getSheetByName(EVENTS_SHEET_NAME));
  const collaborators = readJsonSheet(ss.getSheetByName(COLLABORATORS_SHEET_NAME));
  return jsonResponse({ ok: true, teams: teams, events: events, collaborators: collaborators });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");

    if (action === "submitFeedback") return submitFeedback(body);
    if (action === "listFeedback") return listFeedback();
    if (action === "updateFeedbackStatus") return updateFeedbackStatus(body);
    if (action === "uploadLogo") return jsonResponse({ ok: false, message: "Keep your existing uploadLogo implementation here." });

    // Existing TNFFM admin save payload: { teams, events, collaborators }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (Array.isArray(body.teams)) writeTeamsSheet(ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME), body.teams);
    if (Array.isArray(body.events)) writeJsonSheet(ss, EVENTS_SHEET_NAME, body.events);
    if (Array.isArray(body.collaborators)) writeJsonSheet(ss, COLLABORATORS_SHEET_NAME, body.collaborators);

    return jsonResponse({ ok: true, message: "TNFFM data saved." });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error && error.message || error) });
  }
}

function submitFeedback(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FEEDBACK_SHEET_NAME) || ss.insertSheet(FEEDBACK_SHEET_NAME);
  ensureFeedbackHeader(sheet);

  sheet.appendRow([
    String(body.feedbackId || ""),
    String(body.timestamp || new Date().toISOString()),
    String(body.teamName || ""),
    String(body.teamSlug || ""),
    String(body.username || ""),
    String(body.type || "Other"),
    String(body.message || ""),
    String(body.status || "New")
  ]);

  return jsonResponse({ ok: true, message: "Feedback saved to Google Sheets." });
}

function listFeedback() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ ok: true, feedback: [] });

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const feedback = values.slice(1).map(function(row) {
    const item = {};
    headers.forEach(function(header, index) { item[header] = row[index]; });
    return {
      feedbackId: String(item.FeedbackID || ""),
      timestamp: String(item.Timestamp || ""),
      teamName: String(item.Team || ""),
      teamSlug: String(item.Slug || ""),
      username: String(item.Username || ""),
      type: String(item.Type || "Other"),
      message: String(item.Message || ""),
      status: String(item.Status || "New")
    };
  }).filter(function(item) { return item.feedbackId || item.message; });

  feedback.reverse();
  return jsonResponse({ ok: true, feedback: feedback });
}

function updateFeedbackStatus(body) {
  const id = String(body.feedbackId || "").trim();
  const status = String(body.status || "New").trim();
  if (!id || ["New", "Reviewing", "Resolved"].indexOf(status) === -1) {
    return jsonResponse({ ok: false, message: "Invalid feedback status." });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ ok: false, message: "Feedback not found." });

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idColumn = headers.indexOf("FeedbackID");
  const statusColumn = headers.indexOf("Status");
  if (idColumn === -1 || statusColumn === -1) return jsonResponse({ ok: false, message: "Feedback columns are missing." });

  for (var row = 1; row < values.length; row++) {
    if (String(values[row][idColumn]) === id) {
      sheet.getRange(row + 1, statusColumn + 1).setValue(status);
      return jsonResponse({ ok: true, message: "Feedback status updated." });
    }
  }

  return jsonResponse({ ok: false, message: "Feedback not found." });
}

function ensureFeedbackHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 8).setValues([[
      "FeedbackID", "Timestamp", "Team", "Slug", "Username", "Type", "Message", "Status"
    ]]);
    sheet.setFrozenRows(1);
  }
}

function readTeamsSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1).map(function(row) {
    const item = {};
    headers.forEach(function(header, index) { item[header] = row[index]; });
    return {
      teamName: String(item.Team || ""),
      slug: String(item.Slug || ""),
      rank: numberOrZero(item.Rank),
      previousRank: numberOrZero(item.PreviousRank),
      communityPoints: numberOrZero(item.CommunityPoints),
      badge: String(item.Badge || ""),
      logoUrl: String(item["Logo URL"] || ""),
      bannerUrl: String(item["Banner URL"] || ""),
      kills: numberOrZero(item.Kills),
      booyahs: numberOrZero(item.Booyahs),
      championships: numberOrZero(item.Championships),
      runnerUp: numberOrZero(item.RunnerUp),
      secondRunnerUp: numberOrZero(item.SecondRunnerUp),
      top3Finishes: numberOrZero(item.Top3Finishes),
      finalistFinishes: numberOrZero(item.FinalistFinishes),
      officialMatchFinalists: numberOrZero(item.OfficialMatchFinalists),
      eventsPlayed: numberOrZero(item.EventsPlayed),
      grandFinals: numberOrZero(item.GrandFinals),
      winRate: numberOrZero(item.WinRate),
      killRatio: numberOrZero(item.KillRatio),
      players: numberOrZero(item.Players) || 5,
      status: String(item.Status || "Active"),
      description: String(item.Description || ""),
      lastUpdated: String(item.LastUpdated || "")
    };
  }).filter(function(team) { return team.teamName; });
}

function writeTeamsSheet(sheet, teams) {
  const headers = [
    "Team", "Slug", "Rank", "PreviousRank", "CommunityPoints", "Badge", "Logo URL", "Banner URL",
    "Kills", "Booyahs", "Championships", "RunnerUp", "SecondRunnerUp", "Top3Finishes", "FinalistFinishes",
    "OfficialMatchFinalists", "EventsPlayed", "GrandFinals", "WinRate", "KillRatio", "Players", "Status", "Description", "LastUpdated"
  ];

  const rows = teams.map(function(t) {
    return headers.map(function(header) {
      const map = {
        "Team": t.teamName, "Slug": t.slug, "Rank": t.rank, "PreviousRank": t.previousRank, "CommunityPoints": t.communityPoints,
        "Badge": t.badge, "Logo URL": t.logoUrl, "Banner URL": t.bannerUrl, "Kills": t.kills, "Booyahs": t.booyahs,
        "Championships": t.championships, "RunnerUp": t.runnerUp, "SecondRunnerUp": t.secondRunnerUp, "Top3Finishes": t.top3Finishes,
        "FinalistFinishes": t.finalistFinishes, "OfficialMatchFinalists": t.officialMatchFinalists, "EventsPlayed": t.eventsPlayed,
        "GrandFinals": t.grandFinals, "WinRate": t.winRate, "KillRatio": t.killRatio, "Players": t.players, "Status": t.status,
        "Description": t.description, "LastUpdated": t.lastUpdated
      };
      return map[header] == null ? "" : map[header];
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function writeJsonSheet(ss, name, value) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clearContents();
  sheet.getRange("A1").setValue("JSON");
  sheet.getRange("A2").setValue(JSON.stringify(value));
}

function readJsonSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  try { return JSON.parse(String(sheet.getRange("A2").getValue() || "[]")); } catch (_) { return []; }
}

function numberOrZero(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
