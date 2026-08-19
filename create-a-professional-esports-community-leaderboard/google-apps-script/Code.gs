/**
 * TNFFM Community Rankings - Google Sheets API
 *
 * IMPORTANT FOR A STANDALONE APPS SCRIPT:
 * Set Script Property SPREADSHEET_ID to your Google Sheet ID.
 * If this script is bound to the spreadsheet, the active spreadsheet is used.
 *
 * Sheets created/used automatically:
 *   Teams
 *   TeamAccounts
 *   Events
 *   Collaborators
 *
 * Team account flow:
 *   Team Name + Username + Password
 *   -> create new team
 *   -> create TeamAccounts record
 *   -> Active immediately
 *   -> Vercel creates the login session
 *
 * Passwords are NEVER stored as plain text. Vercel sends a SHA-256 hash.
 */

const TEAM_HEADERS = [
  "Team", "Slug", "Rank", "PreviousRank", "CommunityPoints", "Badge",
  "Logo URL", "Banner URL", "Kills", "Booyahs", "Championships", "RunnerUp",
  "SecondRunnerUp", "Top3Finishes", "FinalistFinishes", "OfficialMatchFinalists",
  "EventsPlayed", "GrandFinals", "WinRate", "KillRatio", "Players", "Roster",
  "Status", "Description", "LastUpdated"
];

const ACCOUNT_HEADERS = [
  "Username", "PasswordHash", "TeamSlug", "Email", "Status", "CreatedAt", "UpdatedAt"
];

function getSpreadsheet_() {
  const id = String(
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || ""
  ).trim();

  if (id) return SpreadsheetApp.openById(id);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error(
    "Google Sheet is not configured. Set the Apps Script Script Property SPREADSHEET_ID to your Google Sheet ID."
  );
}

function doGet() {
  try {
    const ss = getSpreadsheet_();
    return json_({
      ok: true,
      teams: readTeams_(ss),
      events: readObjects_(ss, "Events"),
      collaborators: readObjects_(ss, "Collaborators")
    });
  } catch (err) {
    return json_({ ok: false, message: errorMessage_(err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, message: "Request body is missing." });
    }

    const body = JSON.parse(e.postData.contents || "{}");
    const ss = getSpreadsheet_();

    switch (String(body.action || "")) {
      case "registerTeam":
        return registerTeam_(ss, body);
      case "loginTeam":
        return loginTeam_(ss, body);
      case "getTeam":
        return getTeam_(ss, body);
      case "updateTeamProfile":
        return updateTeamProfile_(ss, body);
      case "resetTeamPassword":
        return resetTeamPassword_(ss, body);
      case "uploadLogo":
        return uploadLogo_(body);
    }

    if (Array.isArray(body.teams)) writeTeams_(ss, body.teams);
    if (Array.isArray(body.events)) writeObjects_(ss, "Events", body.events);
    if (Array.isArray(body.collaborators)) writeObjects_(ss, "Collaborators", body.collaborators);

    SpreadsheetApp.flush();
    return json_({ ok: true, message: "TNFFM data updated successfully." });
  } catch (err) {
    return json_({ ok: false, message: errorMessage_(err) });
  }
}

function registerTeam_(ss, body) {
  const teamName = String(body.teamName || "").trim().replace(/\s+/g, " ");
  const username = String(body.username || "").trim().toLowerCase();
  const passwordHash = String(body.passwordHash || "").trim();
  const email = String(body.email || "").trim();

  if (teamName.length < 2 || teamName.length > 60) {
    return json_({ ok: false, message: "Team name must be between 2 and 60 characters." });
  }

  if (!/^[a-z0-9._-]{4,32}$/.test(username)) {
    return json_({
      ok: false,
      message: "Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen."
    });
  }

  if (!passwordHash) {
    return json_({ ok: false, message: "Password is required." });
  }

  const accounts = getOrCreateSheet_(ss, "TeamAccounts");
  ensureHeaders_(accounts, ACCOUNT_HEADERS);
  const accountRows = accounts.getDataRange().getValues();

  for (let i = 1; i < accountRows.length; i++) {
    const existing = String(accountRows[i][0] || "").trim().toLowerCase();
    if (existing === username) {
      return json_({ ok: false, message: "Username is already registered." });
    }
  }

  const teams = readTeams_(ss);
  const normalizedName = teamName.toLowerCase();

  if (teams.some(function (team) {
    return String(team.teamName || "").trim().toLowerCase() === normalizedName;
  })) {
    return json_({ ok: false, message: "A team with this name already exists. Please use a different team name." });
  }

  const slug = createUniqueSlug_(teamName, teams);
  const now = new Date().toISOString();

  const team = {
    teamName: teamName,
    slug: slug,
    rank: 0,
    previousRank: 0,
    communityPoints: 0,
    badge: "",
    logoUrl: "",
    bannerUrl: "",
    kills: 0,
    booyahs: 0,
    championships: 0,
    runnerUp: 0,
    secondRunnerUp: 0,
    top3Finishes: 0,
    finalistFinishes: 0,
    officialMatchFinalists: 0,
    eventsPlayed: 0,
    grandFinals: 0,
    winRate: 0,
    killRatio: 0,
    players: 0,
    roster: [],
    status: "Active",
    description: "",
    lastUpdated: now
  };

  teams.push(team);
  writeTeams_(ss, teams);

  accounts.appendRow([
    username,
    passwordHash,
    slug,
    email,
    "Active",
    now,
    now
  ]);

  SpreadsheetApp.flush();

  return json_({
    ok: true,
    status: "Active",
    username: username,
    teamSlug: slug,
    teamName: teamName,
    message: "Team account created successfully."
  });
}

function loginTeam_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const passwordHash = String(body.passwordHash || "").trim();

  if (!username || !passwordHash) {
    return json_({ ok: false, message: "Username and password are required." });
  }

  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || sheet.getLastRow() < 2) {
    return json_({ ok: false, message: "No team accounts are configured." });
  }

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const usernameInSheet = String(rows[i][0] || "").trim().toLowerCase();
    const hashInSheet = String(rows[i][1] || "").trim();
    const teamSlug = String(rows[i][2] || "").trim();
    const email = String(rows[i][3] || "").trim();
    const status = String(rows[i][4] || "Active").trim();

    if (usernameInSheet === username && hashInSheet === passwordHash) {
      if (status.toLowerCase() !== "active") {
        return json_({ ok: false, message: "This team account is not active." });
      }

      return json_({
        ok: true,
        username: username,
        teamSlug: teamSlug,
        email: email,
        status: status,
        message: "Login successful."
      });
    }
  }

  return json_({ ok: false, message: "Invalid username or password." });
}

function getTeam_(ss, body) {
  const slug = String(body.teamSlug || "").trim();
  if (!slug) return json_({ ok: false, message: "Team slug is required." });

  const team = readTeams_(ss).find(function (item) {
    return item.slug === slug;
  });

  if (!team) return json_({ ok: false, message: "Team not found." });
  return json_({ ok: true, team: team });
}

function updateTeamProfile_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const teamSlug = String(body.teamSlug || "").trim();

  const account = findAccount_(ss, username);
  if (!account || account.teamSlug !== teamSlug) {
    return json_({ ok: false, message: "Team account is not authorized." });
  }

  const teams = readTeams_(ss);
  const team = teams.find(function (item) {
    return item.slug === teamSlug;
  });

  if (!team) return json_({ ok: false, message: "Team not found." });

  if (typeof body.logoUrl === "string") team.logoUrl = body.logoUrl.trim();
  if (typeof body.bannerUrl === "string") team.bannerUrl = body.bannerUrl.trim();
  if (typeof body.description === "string") team.description = body.description.trim();

  if (Array.isArray(body.roster)) {
    team.roster = body.roster.map(function (player) {
      return {
        name: String(player.name || "").trim(),
        uid: String(player.uid || "").trim()
      };
    }).filter(function (player) {
      return player.name || player.uid;
    });
    team.players = team.roster.length;
  }

  team.lastUpdated = new Date().toISOString();
  writeTeams_(ss, teams);
  SpreadsheetApp.flush();

  return json_({ ok: true, team: team, message: "Team profile updated successfully." });
}

function resetTeamPassword_(ss, body) {
  const username = String(body.username || "").trim().toLowerCase();
  const newHash = String(body.passwordHash || "").trim();

  if (!username || !newHash) {
    return json_({ ok: false, message: "Password reset data is missing." });
  }

  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || sheet.getLastRow() < 2) {
    return json_({ ok: false, message: "Team account not found." });
  }

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim().toLowerCase() === username) {
      sheet.getRange(i + 1, 2).setValue(newHash);
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      SpreadsheetApp.flush();
      return json_({ ok: true, message: "Password updated successfully." });
    }
  }

  return json_({ ok: false, message: "Team account not found." });
}

function findAccount_(ss, username) {
  const sheet = ss.getSheetByName("TeamAccounts");
  if (!sheet || sheet.getLastRow() < 2) return null;

  const normalized = String(username || "").trim().toLowerCase();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim().toLowerCase() === normalized) {
      return {
        username: String(rows[i][0] || ""),
        teamSlug: String(rows[i][2] || ""),
        email: String(rows[i][3] || ""),
        status: String(rows[i][4] || "Active")
      };
    }
  }

  return null;
}

function createUniqueSlug_(teamName, teams) {
  const base = String(teamName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45) || "team";

  let slug = base;
  let number = 2;

  while (teams.some(function (team) {
    return String(team.slug || "").toLowerCase() === slug;
  })) {
    slug = base + "-" + number++;
  }

  return slug;
}

function writeTeams_(ss, teams) {
  const sheet = getOrCreateSheet_(ss, "Teams");
  const rows = teams.map(function (team) {
    return [
      team.teamName || "",
      team.slug || "",
      value_(team.rank),
      value_(team.previousRank),
      value_(team.communityPoints),
      team.badge || "",
      team.logoUrl || "",
      team.bannerUrl || "",
      value_(team.kills),
      value_(team.booyahs),
      value_(team.championships),
      value_(team.runnerUp),
      value_(team.secondRunnerUp),
      value_(team.top3Finishes),
      value_(team.finalistFinishes),
      value_(team.officialMatchFinalists),
      value_(team.eventsPlayed),
      value_(team.grandFinals),
      value_(team.winRate),
      value_(team.killRatio),
      value_(team.players),
      typeof team.roster === "string" ? team.roster : JSON.stringify(team.roster || []),
      team.status || "Active",
      team.description || "",
      team.lastUpdated || ""
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, TEAM_HEADERS.length).setValues([TEAM_HEADERS]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, TEAM_HEADERS.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
}

function readTeams_(ss) {
  const sheet = ss.getSheetByName("Teams");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getRange(1, 1, sheet.getLastRow(), TEAM_HEADERS.length).getValues();

  return values.slice(1).filter(function (row) {
    return String(row[0] || "").trim() !== "";
  }).map(function (row) {
    let roster = [];
    try {
      roster = row[21] ? JSON.parse(String(row[21])) : [];
    } catch (err) {
      roster = [];
    }

    return {
      teamName: String(row[0] || ""),
      slug: String(row[1] || ""),
      rank: number_(row[2]),
      previousRank: number_(row[3]),
      communityPoints: number_(row[4]),
      badge: String(row[5] || ""),
      logoUrl: String(row[6] || ""),
      bannerUrl: String(row[7] || ""),
      kills: number_(row[8]),
      booyahs: number_(row[9]),
      championships: number_(row[10]),
      runnerUp: number_(row[11]),
      secondRunnerUp: number_(row[12]),
      top3Finishes: number_(row[13]),
      finalistFinishes: number_(row[14]),
      officialMatchFinalists: number_(row[15]),
      eventsPlayed: number_(row[16]),
      grandFinals: number_(row[17]),
      winRate: number_(row[18]),
      killRatio: number_(row[19]),
      players: number_(row[20]),
      roster: roster,
      status: String(row[22] || "Active"),
      description: String(row[23] || ""),
      lastUpdated: String(row[24] || "")
    };
  });
}

function writeObjects_(ss, sheetName, objects) {
  const sheet = getOrCreateSheet_(ss, sheetName);
  sheet.clearContents();
  if (!objects || !objects.length) return;

  const headers = [];
  objects.forEach(function (object) {
    Object.keys(object || {}).forEach(function (key) {
      if (headers.indexOf(key) === -1) headers.push(key);
    });
  });

  const rows = objects.map(function (object) {
    return headers.map(function (key) {
      const value = object[key];
      if (value === null || value === undefined) return "";
      return typeof value === "object" ? JSON.stringify(value) : value;
    });
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function readObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  return values.slice(1).filter(function (row) {
    return row.some(function (value) {
      return String(value || "").trim() !== "";
    });
  }).map(function (row) {
    const object = {};
    headers.forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  });
}

function uploadLogo_(body) {
  if (!body.dataUrl || typeof body.dataUrl !== "string") {
    return json_({ ok: false, message: "Logo data is missing." });
  }

  const match = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return json_({ ok: false, message: "Invalid image data." });

  const fileName = String(body.fileName || "tnffm-logo")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    match[1],
    fileName
  );

  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return json_({
    ok: true,
    url: "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(file.getId()),
    fileId: file.getId()
  });
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = firstRow.every(function (value) {
    return String(value || "").trim() === "";
  });

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function value_(value) {
  return value === null || value === undefined ? "" : value;
}

function number_(value) {
  const number = Number(value);
  return isFinite(number) ? number : 0;
}

function errorMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
