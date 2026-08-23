/*
 * TNFFM Ranking Sheet helper.
 * This file is loaded together with Code.gs in the same Apps Script project.
 * It does not replace the existing account/profile sheets.
 */

function onOpen() {
  try {
    ensureTNFFMRankingSheet_();
  } catch (e) {
    console.log("TNFFM ranking setup: " + (e && e.message ? e.message : e));
  }
}

function ensureTNFFMRankingSheet_() {
  const ss = getSpreadsheet_();
  const headers = [
    "Team","Slug","Rank","PreviousRank","CommunityPoints","Badge","Logo URL","Banner URL",
    "Kills","Booyahs","Championships","RunnerUp","SecondRunnerUp","Top5Finishes","FinalistFinishes",
    "OfficialMatchFinalists","EventsPlayed","GrandFinals","WinRate","KillRatio","BooyahRatio",
    "PositionPoints","TotalPoints","MatchesPlayed","Players","Status","Description","LastUpdated"
  ];
  const sheet = ss.getSheetByName("Ranking") || ss.insertSheet("Ranking");
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function setupRankingSheet() {
  ensureTNFFMRankingSheet_();
  SpreadsheetApp.flush();
  return "TNFFM Ranking sheet is ready.";
}
