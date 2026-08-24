/*
 * TNFFM COMMUNITY RANKING - Google Apps Script API
 *
 * Sheets used:
 *   Teams
 *   TeamAccounts
 *   TournamentNews
 *   Submissions
 *   Feedback
 *   Events
 *   Collaborators
 *
 * IMPORTANT LOGO RULE:
 * The Google Sheet stores the team's ORIGINAL logo URL exactly as supplied.
 * The website is responsible for displaying /tnffm-default-logo.svg when that
 * URL is empty or broken. The fallback must NEVER be written back into Teams.
 */

const VERSION = "TNFFM-2026.08.24-2";
const DEFAULT_LOGO_URL = "https://i.imgur.com/6YQfM6M.png";

const TEAM_HEADERS = [
  "Team","Slug","Logo URL","Banner URL","Players","Roster","Status",
  "Description","LastUpdated","Mobile Number"
];

const ACCOUNT_HEADERS = [
  "Username","PasswordHash","TeamSlug","Email","Status","CreatedAt","UpdatedAt"
];

const NEWS_HEADERS = ["ID","Title","Description","Date","Type","Status","ImageURL","Link"];
const SUBMISSION_HEADERS = ["SubmissionID","Username","TeamSlug","Team","TournamentName","TournamentDate","OrganizerName","PrizePool","FinalPosition","FinalLeaderboard","ProofURL","Status","ReviewNotes","ReviewedBy","ReviewedAt","CreatedAt"];
const FEEDBACK_HEADERS = ["FeedbackID","Username","TeamSlug","Team","Message","Status","AdminReply","CreatedAt","UpdatedAt"];
const RANKING_HEADERS = ["Team","Slug","Rank","PreviousRank","CommunityPoints","Badge","Logo URL","Banner URL","Kills","Booyahs","Championships","RunnerUp","SecondRunnerUp","Top5Finishes","FinalistFinishes","OfficialMatchFinalists","EventsPlayed","GrandFinals","WinRate","KillRatio","BooyahRatio","PositionPoints","TotalPoints","MatchesPlayed","Players","Status","Description","LastUpdated"];

function getSpreadsheet_() {
  const id = String(PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "").trim();
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error("Google Sheet is not configured. Set Script Property SPREADSHEET_ID.");
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function errorMessage_(e) { return String(e && e.message ? e.message : e); }
function clean_(value) { return value == null ? "" : String(value).trim(); }
function number_(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback); }
function positiveInt_(value) { return Math.max(0, Math.floor(number_(value, 0))); }
function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensureHeaders_(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function setupTNFFM() {
  const ss = getSpreadsheet_();
  ensureHeaders_(getOrCreateSheet_(ss, "Teams"), TEAM_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, "TeamAccounts"), ACCOUNT_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, "TournamentNews"), NEWS_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, "Submissions"), SUBMISSION_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, "Feedback"), FEEDBACK_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, "Events"), ["Name","Organizer","Teams","Prize","Status","Counted","Date","Notes","MatchesPlayed","Published","Results"]);
  ensureHeaders_(getOrCreateSheet_(ss, "Collaborators"), ["Name","Role","Status","Contact","LogoURL"]);
  SpreadsheetApp.flush();
  return json_({ok:true,version:VERSION,message:"TNFFM sheets are ready."});
}

function doGet() {
  try {
    const ss = getSpreadsheet_();
    return json_({ok:true,version:VERSION,teams:readTeams_(ss),events:readEvents_(ss),collaborators:readObjects_(ss,"Collaborators"),news:readNews_(ss),defaultLogoUrl:DEFAULT_LOGO_URL,serverTime:new Date().toISOString()});
  } catch (e) { return json_({ok:false,version:VERSION,message:errorMessage_(e)}); }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ok:false,message:"Request body is missing."});
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = getSpreadsheet_();
    const action = clean_(body.action).toLowerCase();
    switch (action) {
      case "setup": return setupTNFFM();
      case "ping": return json_({ok:true,version:VERSION,time:new Date().toISOString()});
      case "getdata": return doGet();
      case "registerteam": return registerTeam_(ss,body);
      case "loginteam": return loginTeam_(ss,body);
      case "getteam": return getTeam_(ss,body);
      case "updateteamprofile": return updateTeamProfile_(ss,body);
      case "changeteampassword": return changeTeamPassword_(ss,body);
      case "resetteampassword": return resetTeamPassword_(ss,body);
      case "uploadlogo": return uploadLogo_(ss,body);
      case "submitfinalleaderboard": return submitFinalLeaderboard_(ss,body);
      case "getteamsubmissions": return getTeamSubmissions_(ss,body);
      case "submitfeedback": return submitFeedback_(ss,body);
      case "addnews": return addNews_(ss,body);
      case "saveranking": return saveRanking_(ss,body);
      case "save":
      case "sync":
      case "saveall": return saveAll_(ss,body);
      default: break;
    }
    if (Array.isArray(body.teams)) writeTeams_(ss,body.teams);
    if (Array.isArray(body.events)) writeEvents_(ss,body.events);
    if (Array.isArray(body.collaborators)) writeObjects_(ss,"Collaborators",body.collaborators);
    if (Array.isArray(body.news)) writeNews_(ss,body.news);
    SpreadsheetApp.flush();
    return json_({ok:true,version:VERSION,message:"TNFFM data updated successfully."});
  } catch (e) { return json_({ok:false,version:VERSION,message:errorMessage_(e)}); }
}

function saveAll_(ss,body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (Array.isArray(body.teams)) writeTeams_(ss,body.teams);
    if (Array.isArray(body.events)) writeEvents_(ss,body.events);
    if (Array.isArray(body.collaborators)) writeObjects_(ss,"Collaborators",body.collaborators);
    if (Array.isArray(body.news)) writeNews_(ss,body.news);
    SpreadsheetApp.flush();
    return json_({ok:true,version:VERSION,message:"TNFFM data saved successfully."});
  } finally { lock.releaseLock(); }
}

function normalizeLogo_(url) {
  // DISPLAY/API fallback only. Never use this function when writing Teams.
  const value = clean_(url);
  return value || DEFAULT_LOGO_URL;
}
function storedLogo_(url) {
  // Storage value: preserve exactly what the admin/team entered.
  return clean_(url);
}
function slugify_(name) { const slug=clean_(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45); return slug || "team"; }
function createUniqueSlug_(name,teams) { const base=slugify_(name); let slug=base,n=2; while(teams.some(t=>clean_(t.slug).toLowerCase()===slug)) slug=base+"-"+n++; return slug; }

function findAccount_(ss,username) {
  const sheet=ss.getSheetByName("TeamAccounts"); if(!sheet||sheet.getLastRow()<2)return null;
  const u=clean_(username).toLowerCase(), rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++) if(clean_(rows[i][0]).toLowerCase()===u) return {username:clean_(rows[i][0]),passwordHash:clean_(rows[i][1]),teamSlug:clean_(rows[i][2]),email:clean_(rows[i][3]).toLowerCase(),status:clean_(rows[i][4])||"Active"};
  return null;
}

function registerTeam_(ss,b) {
  const teamName=clean_(b.teamName).replace(/\s+/g," "),username=clean_(b.username).toLowerCase(),hash=clean_(b.passwordHash),email=clean_(b.email).toLowerCase();
  if(teamName.length<2||teamName.length>60)return json_({ok:false,message:"Team name must be between 2 and 60 characters."});
  if(!/^[a-z0-9._-]{4,32}$/.test(username))return json_({ok:false,message:"Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen."});
  if(!hash)return json_({ok:false,message:"Password is required."});
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const accounts=getOrCreateSheet_(ss,"TeamAccounts"); ensureHeaders_(accounts,ACCOUNT_HEADERS); const accountRows=accounts.getDataRange().getValues();
    for(let i=1;i<accountRows.length;i++)if(clean_(accountRows[i][0]).toLowerCase()===username)return json_({ok:false,message:"Username is already registered."});
    const teams=readTeams_(ss); if(teams.some(t=>clean_(t.teamName).toLowerCase()===teamName.toLowerCase()))return json_({ok:false,message:"A team with this name already exists."});
    const slug=createUniqueSlug_(teamName,teams),now=new Date().toISOString();
    teams.push({teamName,slug,logoUrl:DEFAULT_LOGO_URL,bannerUrl:"",players:0,roster:[],status:"Active",description:"",lastUpdated:now,mobileNumber:""});
    writeTeams_(ss,teams); accounts.appendRow([username,hash,slug,email,"Active",now,now]); SpreadsheetApp.flush();
    return json_({ok:true,status:"Active",username,teamSlug:slug,teamName,logoUrl:DEFAULT_LOGO_URL,message:"Team account created successfully."});
  } finally { lock.releaseLock(); }
}

function loginTeam_(ss,b) {
  const username=clean_(b.username).toLowerCase(),hash=clean_(b.passwordHash),account=findAccount_(ss,username);
  if(!account||account.passwordHash!==hash)return json_({ok:false,message:"Invalid username or password."});
  if(account.status.toLowerCase()!=="active")return json_({ok:false,message:"This team account is not active."});
  const team=readTeams_(ss).find(t=>t.slug===account.teamSlug);
  return json_({ok:true,username:account.username,teamSlug:account.teamSlug,email:account.email,status:account.status,teamName:team?team.teamName:"",logoUrl:team?normalizeLogo_(team.logoUrl):DEFAULT_LOGO_URL,message:"Login successful."});
}
function authorizeTeam_(ss,username,slug){const account=findAccount_(ss,username);return account&&account.status.toLowerCase()==="active"&&account.teamSlug===clean_(slug)?account:null;}
function getTeam_(ss,b){const slug=clean_(b.teamSlug),team=readTeams_(ss).find(t=>t.slug===slug);return team?json_({ok:true,team:Object.assign({},team,{logoUrl:normalizeLogo_(team.logoUrl)})}):json_({ok:false,message:"Team not found."});}

function updateTeamProfile_(ss,b) {
  const username=clean_(b.username).toLowerCase(),slug=clean_(b.teamSlug); if(!authorizeTeam_(ss,username,slug))return json_({ok:false,message:"Team account is not authorized."});
  const teams=readTeams_(ss),team=teams.find(t=>t.slug===slug); if(!team)return json_({ok:false,message:"Team not found."});
  if(typeof b.logoUrl==="string")team.logoUrl=storedLogo_(b.logoUrl);
  if(typeof b.bannerUrl==="string")team.bannerUrl=clean_(b.bannerUrl);
  if(typeof b.description==="string")team.description=clean_(b.description);
  if(typeof b.mobileNumber==="string")team.mobileNumber=clean_(b.mobileNumber);
  if(Array.isArray(b.roster)){team.roster=b.roster.map(p=>({name:clean_(p&&p.name),uid:clean_(p&&p.uid)})).filter(p=>p.name||p.uid);team.players=team.roster.length;}
  team.lastUpdated=new Date().toISOString(); writeTeams_(ss,teams); SpreadsheetApp.flush();
  return json_({ok:true,team:Object.assign({},team,{logoUrl:normalizeLogo_(team.logoUrl)}),message:"Team profile updated successfully."});
}

function changeTeamPassword_(ss,b){const username=clean_(b.username).toLowerCase(),account=findAccount_(ss,username);if(!account||account.status.toLowerCase()!=="active")return json_({ok:false,message:"Team account not found."});if(account.passwordHash!==clean_(b.currentPasswordHash))return json_({ok:false,message:"Current password is incorrect."});const newHash=clean_(b.newPasswordHash);if(!newHash)return json_({ok:false,message:"New password is required."});const sheet=ss.getSheetByName("TeamAccounts"),rows=sheet.getDataRange().getValues();for(let i=1;i<rows.length;i++)if(clean_(rows[i][0]).toLowerCase()===username){sheet.getRange(i+1,2).setValue(newHash);sheet.getRange(i+1,7).setValue(new Date().toISOString());SpreadsheetApp.flush();return json_({ok:true,message:"Password changed successfully."});}return json_({ok:false,message:"Team account not found."});}
function resetTeamPassword_(ss,b){const username=clean_(b.username).toLowerCase(),email=clean_(b.email).toLowerCase(),account=findAccount_(ss,username),newHash=clean_(b.passwordHash);if(!account||account.email!==email)return json_({ok:false,message:"Username and registered email do not match."});if(!newHash)return json_({ok:false,message:"New password is required."});const sheet=ss.getSheetByName("TeamAccounts"),rows=sheet.getDataRange().getValues();for(let i=1;i<rows.length;i++)if(clean_(rows[i][0]).toLowerCase()===username){sheet.getRange(i+1,2).setValue(newHash);sheet.getRange(i+1,7).setValue(new Date().toISOString());SpreadsheetApp.flush();return json_({ok:true,message:"Password reset successfully."});}return json_({ok:false,message:"Team account not found."});}

function writeTeams_(ss,teams) {
  const sheet=getOrCreateSheet_(ss,"Teams"); ensureHeaders_(sheet,TEAM_HEADERS);
  const lastRow=sheet.getLastRow(); if(lastRow>1)sheet.getRange(2,1,lastRow-1,TEAM_HEADERS.length).clearContent();
  const rows=(teams||[]).map(t=>[
    clean_(t.teamName||t.Team),clean_(t.slug||t.Slug),
    // CRITICAL: preserve the stored logo URL. Empty stays empty; the UI fallback handles display.
    storedLogo_(t.logoUrl!==undefined?t.logoUrl:t["Logo URL"]),
    clean_(t.bannerUrl||t["Banner URL"]),positiveInt_(t.players||t.Players),
    typeof t.roster==="string"?t.roster:JSON.stringify(t.roster||[]),clean_(t.status||t.Status)||"Active",
    clean_(t.description||t.Description),clean_(t.lastUpdated||t.LastUpdated)||new Date().toISOString(),clean_(t.mobileNumber||t["Mobile Number"])
  ]);
  if(rows.length)sheet.getRange(2,1,rows.length,TEAM_HEADERS.length).setValues(rows); sheet.setFrozenRows(1);
}

function readTeams_(ss) {
  const sheet=getOrCreateSheet_(ss,"Teams"); ensureHeaders_(sheet,TEAM_HEADERS); if(sheet.getLastRow()<2)return [];
  const values=sheet.getRange(1,1,sheet.getLastRow(),TEAM_HEADERS.length).getValues();
  return values.slice(1).filter(r=>clean_(r[0])).map(r=>{
    let roster=[]; try{roster=r[5]?JSON.parse(String(r[5])):[];}catch(e){roster=[];} if(!Array.isArray(roster))roster=[];
    return {teamName:clean_(r[0]),slug:clean_(r[1])||slugify_(r[0]),logoUrl:storedLogo_(r[2]),bannerUrl:clean_(r[3]),players:positiveInt_(r[4]),roster,status:clean_(r[6])||"Active",description:clean_(r[7]),lastUpdated:clean_(r[8]),mobileNumber:clean_(r[9])};
  });
}

/* Existing event/news/submission/ranking helpers remain unchanged below this point. */

function normalizeEventResult_(r,matches){const kills=positiveInt_(r&&(r.kills!=null?r.kills:r.Kills)),booyahs=positiveInt_(r&&(r.booyahs!=null?r.booyahs:(r.Booyahs!=null?r.Booyahs:r.booyahCount))),rank=Math.max(1,Math.floor(number_(r&&(r.rank!=null?r.rank:r.Rank),1))),positionPoints=positiveInt_(r&&(r.positionPoints!=null?r.positionPoints:r.PositionPoints));return {teamName:clean_(r&&(r.teamName!=null?r.teamName:r.Team)),teamSlug:clean_(r&&(r.teamSlug!=null?r.teamSlug:r.Slug)),rank,positionPoints,kills,booyahs,killRatio:matches>0?kills/matches:0,booyahRatio:matches>0?(booyahs/matches)*100:0,total:positionPoints+kills};}
function normalizeEvent_(e){const matches=positiveInt_(e&&(e.matchesPlayed!=null?e.matchesPlayed:e.MatchesPlayed));let rawResults=e&&(e.results!=null?e.results:e.Results);if(typeof rawResults==="string"){try{rawResults=rawResults.trim()?JSON.parse(rawResults):[];}catch(err){rawResults=[];}}if(!Array.isArray(rawResults))rawResults=[];const results=rawResults.map(r=>normalizeEventResult_(r,matches)).filter(r=>r.teamName);return {name:clean_(e&&(e.name!=null?e.name:e.Name)),organizer:clean_(e&&(e.organizer!=null?e.organizer:e.Organizer)),teams:positiveInt_(e&&(e.teams!=null?e.teams:e.Teams))||results.length,prize:clean_(e&&(e.prize!=null?e.prize:e.Prize)),status:clean_(e&&(e.status!=null?e.status:e.Status))||"Pending",counted:clean_(e&&(e.counted!=null?e.counted:e.Counted)),date:clean_(e&&(e.date!=null?e.date:e.Date)),notes:clean_(e&&(e.notes!=null?e.notes:e.Notes)),matchesPlayed:matches,published:(e&&(e.published===true||String(e.published).toLowerCase()==="true"||e.Published===true||String(e.Published).toLowerCase()==="true"))||false,results};}
function readEvents_(ss){const sheet=getOrCreateSheet_(ss,"Events");if(sheet.getLastRow()<2)return [];const values=sheet.getDataRange().getValues(),headers=values[0].map(h=>String(h));return values.slice(1).filter(r=>r.some(v=>clean_(v))).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]);return normalizeEvent_(o);}).filter(e=>e.name);}
function writeEvents_(ss,events){const sheet=getOrCreateSheet_(ss,"Events"),headers=["Name","Organizer","Teams","Prize","Status","Counted","Date","Notes","MatchesPlayed","Published","Results"];ensureHeaders_(sheet,headers);if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).clearContent();const rows=(events||[]).map(e=>{const n=normalizeEvent_(e);return [n.name,n.organizer,n.teams,n.prize,n.status,n.counted,n.date,n.notes,n.matchesPlayed,n.published?"TRUE":"FALSE",JSON.stringify(n.results||[])];});if(rows.length)sheet.getRange(2,1,rows.length,headers.length).setValues(rows);sheet.setFrozenRows(1);}
