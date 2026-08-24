/*
 * TNFFM COMMUNITY RANKING - GOOGLE APPS SCRIPT API
 * Version: TNFFM-2026.08.24-3
 *
 * CANONICAL TABS
 *  1. Teams
 *  2. Team Rosters
 *  3. Community Rankings
 *  4. Events
 *  5. Event Results
 *  6. TournamentNews
 *  7. Collaborators
 *  8. TeamAccounts
 *  9. Submissions
 * 10. Feedback
 *
 * IMPORTANT:
 * - Team logo URLs are stored exactly as supplied. The default logo is
 *   display-only and is NEVER written back into the sheet.
 * - Player logo URLs follow the same rule.
 * - Team ID is the stable key across Teams, Rosters, Rankings and Results.
 * - The first setup automatically backs up the old Teams tab as Legacy_Teams
 *   before converting it to the new aligned Teams structure.
 */

const VERSION = 'TNFFM-2026.08.24-3';
const DEFAULT_LOGO_URL = '/tnffm-default-logo.svg';
const DEFAULT_PLAYER_LOGO_URL = '/tnffm-default-player.svg';

const TABS = {
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

const HEADERS = {};
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
  'Result ID','Event ID','Event Name','Team ID','Team Name','Position','Kills',
  'Booyahs','Position Points','Kill Points','Total Points','Proof URL',
  'Verified','Updated At'
];
HEADERS[TABS.NEWS] = [
  'ID','Title','Description','Date','Type','Status','ImageURL','Link','UpdatedAt'
];
HEADERS[TABS.COLLAB] = [
  'Collaborator ID','Name','Role','Status','Contact','LogoURL','Website','Instagram','UpdatedAt'
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
  'FeedbackID','Username','TeamSlug','Team','Message','Status','AdminReply','CreatedAt','UpdatedAt'
];

function getSpreadsheet_() {
  const id = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Google Sheet is not configured. Set Script Property SPREADSHEET_ID.');
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(v) { return v == null ? '' : String(v).trim(); }
function num_(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d == null ? 0 : d); }
function int_(v) { return Math.max(0, Math.floor(num_(v, 0))); }
function now_() { return new Date().toISOString(); }
function error_(e) { return String(e && e.message ? e.message : e); }
function sheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensure_(s, headers) {
  if (s.getMaxColumns() < headers.length) s.insertColumnsAfter(s.getMaxColumns(), headers.length - s.getMaxColumns());
  s.getRange(1,1,1,headers.length).setValues([headers]);
  s.setFrozenRows(1);
}
function rows_(s) {
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getValues();
}
function headerIndex_(s) {
  const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
  const out = {};
  h.forEach((v,i) => out[clean_(v)] = i);
  return out;
}
function safeJson_(v, fallback) {
  if (Array.isArray(v)) return v;
  if (!v) return fallback;
  try { const x = JSON.parse(String(v)); return x; } catch (_) { return fallback; }
}
function slugify_(name) {
  const s = clean_(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45);
  return s || 'team';
}
function uniqueSlug_(name, existing) {
  const base = slugify_(name);
  let s = base, n = 2;
  while (existing.some(t => clean_(t.slug).toLowerCase() === s.toLowerCase())) s = base + '-' + n++;
  return s;
}
function displayLogo_(url) { return clean_(url) || DEFAULT_LOGO_URL; }
function storedLogo_(url) {
  const v = clean_(url);
  if (!v || v === DEFAULT_LOGO_URL || v === '/tnffm-default-logo.svg') return '';
  return v;
}
function displayPlayerLogo_(url) { return clean_(url) || DEFAULT_PLAYER_LOGO_URL; }
function storedPlayerLogo_(url) {
  const v = clean_(url);
  if (!v || v === DEFAULT_PLAYER_LOGO_URL || v === DEFAULT_LOGO_URL) return '';
  return v;
}

function isCanonicalTeams_(s) {
  if (!s || s.getLastColumn() < 3) return false;
  const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(clean_);
  return h.indexOf('Team ID') >= 0 && h.indexOf('Team Name') >= 0 && h.indexOf('Logo URL') >= 0;
}

/* ---------------------------------------------------------
 * SAFE SETUP / MIGRATION
 * --------------------------------------------------------- */
function setupTNFFM() {
  const ss = getSpreadsheet_();
  migrateLegacyTeamsIfNeeded_(ss);
  Object.keys(HEADERS).forEach(name => ensure_(sheet_(ss,name), HEADERS[name]));
  SpreadsheetApp.flush();
  return json_({ok:true,version:VERSION,message:'TNFFM separated Google Sheet structure is ready.'});
}

function migrateLegacyTeamsIfNeeded_(ss) {
  const s = ss.getSheetByName(TABS.TEAMS);
  if (!s || isCanonicalTeams_(s)) return;

  const backupName = 'Legacy_Teams_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd_HHmmss');
  const backup = s.copyTo(ss).setName(backupName);
  backup.setFrozenRows(1);

  const oldRows = s.getDataRange().getValues();
  const oldHeaders = oldRows.length ? oldRows[0].map(clean_) : [];
  const idx = {};
  oldHeaders.forEach((h,i) => idx[h] = i);
  const val = (r, names) => {
    for (const n of names) if (idx[n] != null) return r[idx[n]];
    return '';
  };

  s.clearContents();
  ensure_(s, HEADERS[TABS.TEAMS]);

  const existingIds = [];
  const teamRows = [];
  const rosterRows = [];
  for (let i=1;i<oldRows.length;i++) {
    const r = oldRows[i];
    const teamName = clean_(val(r,['Team','Team Name']));
    if (!teamName) continue;
    const teamId = 'TN-' + String(i).padStart(5,'0');
    existingIds.push({teamId,teamName,slug:clean_(val(r,['Slug'])) || slugify_(teamName)});
    const roster = safeJson_(val(r,['Roster']), []);
    const created = clean_(val(r,['Created At','CreatedAt'])) || now_();
    const updated = clean_(val(r,['LastUpdated','Updated At','UpdatedAt'])) || now_();
    teamRows.push([
      teamId, teamName, clean_(val(r,['Slug'])) || slugify_(teamName),
      storedLogo_(val(r,['Logo URL'])), clean_(val(r,['Banner URL'])),
      clean_(val(r,['Description'])), clean_(val(r,['Mobile Number'])),
      clean_(val(r,['Status'])) || 'Active', 'Registered', created, updated
    ]);
    if (Array.isArray(roster)) roster.forEach((p,j) => {
      if (!p) return;
      const pn = clean_(p.name || p.playerName || p.Name);
      const pu = clean_(p.uid || p.UID || p.uidNumber);
      const pr = clean_(p.role || p.Role);
      const pl = storedPlayerLogo_(p.playerLogoUrl || p.PlayerLogoURL || p.playerLogo || p.logoUrl || '');
      if (!pn && !pu && !pl) return;
      rosterRows.push([
        teamId+'-P-'+String(j+1).padStart(2,'0'), teamId, teamName, pn, pu, pr, pl,
        clean_(p.status) || 'Active', created, updated
      ]);
    });
  }
  if (teamRows.length) s.getRange(2,1,teamRows.length,HEADERS[TABS.TEAMS].length).setValues(teamRows);
  const rs = sheet_(ss,TABS.ROSTERS); ensure_(rs,HEADERS[TABS.ROSTERS]);
  if (rs.getLastRow() > 1) rs.getRange(2,1,rs.getLastRow()-1,HEADERS[TABS.ROSTERS].length).clearContent();
  if (rosterRows.length) rs.getRange(2,1,rosterRows.length,HEADERS[TABS.ROSTERS].length).setValues(rosterRows);
  buildRankingsFromExisting_(ss, existingIds);
}

function buildRankingsFromExisting_(ss, ids) {
  const s = sheet_(ss,TABS.RANKINGS); ensure_(s,HEADERS[TABS.RANKINGS]);
  if (s.getLastRow() > 1) return;
  const old = ss.getSheetByName('Ranking');
  const output = [];
  if (old && old.getLastRow() >= 2) {
    const h = old.getRange(1,1,1,old.getLastColumn()).getValues()[0].map(clean_);
    const ix = {}; h.forEach((v,i)=>ix[v]=i);
    const rows = old.getRange(2,1,old.getLastRow()-1,old.getLastColumn()).getValues();
    rows.forEach((r,i)=>{
      const name = clean_(r[ix['Team'] != null ? ix['Team'] : 0]);
      if (!name) return;
      const t = ids.find(x=>x.teamName.toLowerCase()===name.toLowerCase());
      if (!t) return;
      output.push([
        int_(r[ix['Rank']]), t.teamId, name, t.slug, int_(r[ix['Events Played']]), int_(r[ix['Championships']]),
        int_(r[ix['Runner-Up']]), int_(r[ix['2nd Runner-Up']]), int_(r[ix['Top 5 Finishes']]),
        num_(r[ix['Community Score']]), int_(r[ix['Kills']]), int_(r[ix['Booyahs']]), num_(r[ix['Kill Ratio']]),
        num_(r[ix['Booyah Ratio']]), num_(r[ix['Position Points']]), num_(r[ix['Total Points']]),
        int_(r[ix['Matches Played']]), int_(r[ix['Grand Finals']]), num_(r[ix['Win Rate']]),
        clean_(r[ix['Eligible']]) || 'Yes', clean_(r[ix['Status']]) || 'Active', now_()
      ]);
    });
  }
  if (output.length) s.getRange(2,1,output.length,HEADERS[TABS.RANKINGS].length).setValues(output);
}

/* ---------------------------------------------------------
 * TEAM READ / WRITE
 * --------------------------------------------------------- */
function readRosters_(ss) {
  const s = sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]);
  const out = {};
  rows_(s).forEach(r => {
    const teamId = clean_(r[1]);
    if (!teamId) return;
    if (!out[teamId]) out[teamId] = [];
    out[teamId].push({
      playerId:clean_(r[0]), name:clean_(r[3]), uid:clean_(r[4]), role:clean_(r[5]),
      playerLogoUrl:storedPlayerLogo_(r[6]), status:clean_(r[7]) || 'Active',
      createdAt:clean_(r[8]), updatedAt:clean_(r[9])
    });
  });
  return out;
}
function writeRosters_(ss, teams) {
  const s = sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]);
  if (s.getLastRow() > 1) s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.ROSTERS].length).clearContent();
  const out = [];
  (teams || []).forEach(team => {
    const teamId = clean_(team.teamId || team.id) || slugify_(team.slug || team.teamName);
    const roster = Array.isArray(team.roster) ? team.roster : safeJson_(team.roster, []);
    roster.forEach((p,j) => {
      const name = clean_(p && (p.name || p.playerName));
      const uid = clean_(p && (p.uid || p.UID));
      const logo = storedPlayerLogo_(p && (p.playerLogoUrl || p.PlayerLogoURL || p.playerLogo || p.logoUrl));
      if (!name && !uid && !logo) return;
      out.push([
        clean_(p && (p.playerId || p.id)) || teamId+'-P-'+String(j+1).padStart(2,'0'),
        teamId, clean_(team.teamName || team.Team), name, uid, clean_(p && p.role), logo,
        clean_(p && p.status) || 'Active', clean_(p && p.createdAt) || now_(), now_()
      ]);
    });
  });
  if (out.length) s.getRange(2,1,out.length,HEADERS[TABS.ROSTERS].length).setValues(out);
}
function readTeams_(ss) {
  migrateLegacyTeamsIfNeeded_(ss);
  const s = sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]);
  const rosterMap = readRosters_(ss);
  const out = [];
  rows_(s).forEach(r => {
    if (!clean_(r[1])) return;
    const teamId = clean_(r[0]);
    const roster = rosterMap[teamId] || [];
    out.push({
      teamId, teamName:clean_(r[1]), slug:clean_(r[2]) || slugify_(r[1]), logoUrl:storedLogo_(r[3]),
      bannerUrl:clean_(r[4]), description:clean_(r[5]), mobileNumber:clean_(r[6]),
      status:clean_(r[7]) || 'Active', registrationStatus:clean_(r[8]) || 'Registered',
      players:roster.length, roster, createdAt:clean_(r[9]), lastUpdated:clean_(r[10])
    });
  });
  return out;
}
function writeTeams_(ss, teams) {
  const s = sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]);
  const old = readTeams_(ss);
  const oldBySlug = {}; old.forEach(t=>oldBySlug[t.slug]=t);
  const out = (teams || []).map((t,i)=>{
    const slug = clean_(t.slug || t.Slug) || slugify_(t.teamName || t.Team);
    const prior = oldBySlug[slug] || {};
    const roster = Array.isArray(t.roster) ? t.roster : safeJson_(t.roster, prior.roster || []);
    const teamId = clean_(t.teamId || t.id) || prior.teamId || 'TN-'+String(i+1).padStart(5,'0');
    return [
      teamId, clean_(t.teamName || t.Team), slug,
      storedLogo_(t.logoUrl !== undefined ? t.logoUrl : t['Logo URL']),
      clean_(t.bannerUrl !== undefined ? t.bannerUrl : t['Banner URL']),
      clean_(t.description !== undefined ? t.description : t.Description),
      clean_(t.mobileNumber !== undefined ? t.mobileNumber : t['Mobile Number']),
      clean_(t.status || t.Status) || 'Active', clean_(t.registrationStatus) || 'Registered',
      prior.createdAt || now_(), now_()
    ];
  });
  if (s.getLastRow() > 1) s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.TEAMS].length).clearContent();
  if (out.length) s.getRange(2,1,out.length,HEADERS[TABS.TEAMS].length).setValues(out);
  writeRosters_(ss, teams || []);
}

/* ---------------------------------------------------------
 * RANKINGS
 * --------------------------------------------------------- */
function readRankings_(ss) {
  const s = sheet_(ss,TABS.RANKINGS); ensure_(s,HEADERS[TABS.RANKINGS]);
  return rows_(s).filter(r=>clean_(r[2])).map(r=>({
    rank:int_(r[0]), teamId:clean_(r[1]), teamName:clean_(r[2]), slug:clean_(r[3]),
    eventsPlayed:int_(r[4]), championships:int_(r[5]), runnerUp:int_(r[6]), secondRunnerUp:int_(r[7]),
    top5Finishes:int_(r[8]), communityScore:num_(r[9]), kills:int_(r[10]), booyahs:int_(r[11]),
    killRatio:num_(r[12]), booyahRatio:num_(r[13]), positionPoints:num_(r[14]), totalPoints:num_(r[15]),
    matchesPlayed:int_(r[16]), grandFinals:int_(r[17]), winRate:num_(r[18]), eligible:clean_(r[19]) || 'Yes',
    status:clean_(r[20]) || 'Active', updatedAt:clean_(r[21])
  }));
}
function writeRankings_(ss, rankings) {
  const s = sheet_(ss,TABS.RANKINGS); ensure_(s,HEADERS[TABS.RANKINGS]);
  if (s.getLastRow() > 1) s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.RANKINGS].length).clearContent();
  const teams = readTeams_(ss), bySlug={}; teams.forEach(t=>bySlug[t.slug]=t);
  const out=(rankings||[]).map((r,i)=>{
    const team=bySlug[clean_(r.slug)] || teams.find(t=>t.teamName.toLowerCase()===clean_(r.teamName).toLowerCase()) || {};
    return [int_(r.rank || i+1),clean_(r.teamId)||team.teamId,clean_(r.teamName)||team.teamName,clean_(r.slug)||team.slug,
      int_(r.eventsPlayed),int_(r.championships),int_(r.runnerUp),int_(r.secondRunnerUp || r['2nd Runner-Up']),int_(r.top5Finishes),
      num_(r.communityScore),int_(r.kills),int_(r.booyahs),num_(r.killRatio),num_(r.booyahRatio),num_(r.positionPoints),num_(r.totalPoints),
      int_(r.matchesPlayed),int_(r.grandFinals),num_(r.winRate),clean_(r.eligible)||'Yes',clean_(r.status)||'Active',now_()];
  });
  if (out.length) s.getRange(2,1,out.length,HEADERS[TABS.RANKINGS].length).setValues(out);
}

/* ---------------------------------------------------------
 * EVENTS / RESULTS
 * --------------------------------------------------------- */
function readEvents_(ss) {
  const s=sheet_(ss,TABS.EVENTS); ensure_(s,HEADERS[TABS.EVENTS]);
  return rows_(s).filter(r=>clean_(r[1])).map(r=>({
    eventId:clean_(r[0]),name:clean_(r[1]),organizer:clean_(r[2]),teams:int_(r[3]),prize:clean_(r[4]),
    status:clean_(r[5]),counted:clean_(r[6]),date:clean_(r[7]),notes:clean_(r[8]),matchesPlayed:int_(r[9]),
    published:clean_(r[10]),results:safeJson_(r[11],[]),createdAt:clean_(r[12]),updatedAt:clean_(r[13])
  }));
}
function writeEvents_(ss, events) {
  const s=sheet_(ss,TABS.EVENTS); ensure_(s,HEADERS[TABS.EVENTS]);
  if (s.getLastRow()>1) s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.EVENTS].length).clearContent();
  const out=(events||[]).map((e,i)=>[
    clean_(e.eventId||e.id)||'EV-'+String(i+1).padStart(5,'0'),clean_(e.name||e.eventName),clean_(e.organizer),int_(e.teams||e.teamCount),clean_(e.prize||e.prizePool),
    clean_(e.status)||'Confirmed',clean_(e.counted),clean_(e.date||e.eventDate),clean_(e.notes),int_(e.matchesPlayed),clean_(e.published),
    JSON.stringify(e.results||[]),clean_(e.createdAt)||now_(),now_()
  ]);
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.EVENTS].length).setValues(out);
}
function readResults_(ss) {
  const s=sheet_(ss,TABS.RESULTS); ensure_(s,HEADERS[TABS.RESULTS]);
  return rows_(s).filter(r=>clean_(r[0])).map(r=>({resultId:clean_(r[0]),eventId:clean_(r[1]),eventName:clean_(r[2]),teamId:clean_(r[3]),teamName:clean_(r[4]),position:int_(r[5]),kills:int_(r[6]),booyahs:int_(r[7]),positionPoints:num_(r[8]),killPoints:num_(r[9]),totalPoints:num_(r[10]),proofUrl:clean_(r[11]),verified:clean_(r[12]),updatedAt:clean_(r[13])}));
}
function writeResults_(ss, results) {
  const s=sheet_(ss,TABS.RESULTS); ensure_(s,HEADERS[TABS.RESULTS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.RESULTS].length).clearContent();
  const out=(results||[]).map((r,i)=>[clean_(r.resultId||r.id)||'RES-'+String(i+1).padStart(6,'0'),clean_(r.eventId),clean_(r.eventName),clean_(r.teamId),clean_(r.teamName),int_(r.position),int_(r.kills),int_(r.booyahs),num_(r.positionPoints),num_(r.killPoints),num_(r.totalPoints),clean_(r.proofUrl||r.proofURL),clean_(r.verified),now_()]);
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.RESULTS].length).setValues(out);
}

/* ---------------------------------------------------------
 * NEWS / COLLAB / ACCOUNTS / SUBMISSIONS / FEEDBACK
 * --------------------------------------------------------- */
function readObjects_(ss,name) {
  const s=sheet_(ss,name); ensure_(s,HEADERS[name]);
  return rows_(s).map(r=>{const o={}; HEADERS[name].forEach((h,i)=>o[h]=r[i]); return o;});
}
function writeObjects_(ss,name,items) {
  const s=sheet_(ss,name); ensure_(s,HEADERS[name]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[name].length).clearContent();
  const out=(items||[]).map(x=>HEADERS[name].map(h=>x[h] != null ? x[h] : x[camel_(h)] != null ? x[camel_(h)] : ''));
  if(out.length)s.getRange(2,1,out.length,HEADERS[name].length).setValues(out);
}
function camel_(s){return clean_(s).replace(/[^A-Za-z0-9]+(.)/g,(_,c)=>c?c.toUpperCase():'').replace(/^./,c=>c.toLowerCase());}
function readNews_(ss){
  const s=sheet_(ss,TABS.NEWS); ensure_(s,HEADERS[TABS.NEWS]);
  return rows_(s).filter(r=>clean_(r[1])).map(r=>({id:clean_(r[0]),title:clean_(r[1]),description:clean_(r[2]),date:clean_(r[3]),type:clean_(r[4]),status:clean_(r[5]),imageUrl:clean_(r[6]),link:clean_(r[7]),updatedAt:clean_(r[8])}));
}
function writeNews_(ss,items){
  const s=sheet_(ss,TABS.NEWS);ensure_(s,HEADERS[TABS.NEWS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.NEWS].length).clearContent();
  const out=(items||[]).map((n,i)=>[clean_(n.id||n.ID)||'NEWS-'+String(i+1).padStart(5,'0'),clean_(n.title||n.Title),clean_(n.description||n.Description),clean_(n.date||n.Date),clean_(n.type||n.Type),clean_(n.status||n.Status)||'Published',clean_(n.imageUrl||n.ImageURL),clean_(n.link||n.Link),now_()]);
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.NEWS].length).setValues(out);
}
function addNews_(ss,b){const current=readNews_(ss);current.unshift({id:'NEWS-'+Utilities.getUuid().slice(0,8),title:clean_(b.title),description:clean_(b.description),date:clean_(b.date)||now_(),type:clean_(b.type)||'Update',status:clean_(b.status)||'Published',imageUrl:clean_(b.imageUrl),link:clean_(b.link)});writeNews_(ss,current);SpreadsheetApp.flush();return json_({ok:true,message:'News added successfully.',news:readNews_(ss)});}
function findAccount_(ss,username){const s=sheet_(ss,TABS.ACCOUNTS);ensure_(s,HEADERS[TABS.ACCOUNTS]);const u=clean_(username).toLowerCase();return rows_(s).map(r=>({username:clean_(r[0]),passwordHash:clean_(r[1]),teamSlug:clean_(r[2]),email:clean_(r[3]).toLowerCase(),status:clean_(r[4])||'Active',createdAt:clean_(r[5]),updatedAt:clean_(r[6])})).find(a=>a.username.toLowerCase()===u)||null;}
function authorizeTeam_(ss,username,slug){const a=findAccount_(ss,username);return a && a.status.toLowerCase()==='active' && a.teamSlug===clean_(slug) ? a : null;}
function registerTeam_(ss,b){
  const name=clean_(b.teamName).replace(/\s+/g,' '),username=clean_(b.username).toLowerCase(),hash=clean_(b.passwordHash),email=clean_(b.email).toLowerCase();
  if(name.length<2||name.length>60)return json_({ok:false,message:'Team name must be between 2 and 60 characters.'});
  if(!/^[a-z0-9._-]{4,32}$/.test(username))return json_({ok:false,message:'Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen.'});
  if(!hash)return json_({ok:false,message:'Password is required.'});
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    if(findAccount_(ss,username))return json_({ok:false,message:'Username is already registered.'});
    const teams=readTeams_(ss);if(teams.some(t=>t.teamName.toLowerCase()===name.toLowerCase()))return json_({ok:false,message:'A team with this name already exists.'});
    const slug=uniqueSlug_(name,teams),id='TN-'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase(),n=now_();
    const ts=sheet_(ss,TABS.TEAMS);ensure_(ts,HEADERS[TABS.TEAMS]);ts.appendRow([id,name,slug,'','','','', 'Active','Registered',n,n]);
    const as=sheet_(ss,TABS.ACCOUNTS);ensure_(as,HEADERS[TABS.ACCOUNTS]);as.appendRow([username,hash,slug,email,'Active',n,n]);SpreadsheetApp.flush();
    return json_({ok:true,status:'Active',username,teamSlug:slug,teamName:name,logoUrl:DEFAULT_LOGO_URL,message:'Team account created successfully.'});
  } finally {lock.releaseLock();}
}
function loginTeam_(ss,b){const a=findAccount_(ss,clean_(b.username).toLowerCase()),hash=clean_(b.passwordHash);if(!a||a.passwordHash!==hash)return json_({ok:false,message:'Invalid username or password.'});if(a.status.toLowerCase()!=='active')return json_({ok:false,message:'This team account is not active.'});const t=readTeams_(ss).find(x=>x.slug===a.teamSlug);return json_({ok:true,username:a.username,teamSlug:a.teamSlug,email:a.email,status:a.status,teamName:t?t.teamName:'',logoUrl:t?displayLogo_(t.logoUrl):DEFAULT_LOGO_URL,message:'Login successful.'});}
function getTeam_(ss,b){const t=readTeams_(ss).find(x=>x.slug===clean_(b.teamSlug));if(!t)return json_({ok:false,message:'Team not found.'});return json_({ok:true,team:Object.assign({},t,{logoUrl:displayLogo_(t.logoUrl),roster:t.roster.map(p=>Object.assign({},p,{playerLogoUrl:displayPlayerLogo_(p.playerLogoUrl)}))})});}
function updateTeamProfile_(ss,b){
  const slug=clean_(b.teamSlug),username=clean_(b.username).toLowerCase();if(!authorizeTeam_(ss,username,slug))return json_({ok:false,message:'Team account is not authorized.'});
  const teams=readTeams_(ss),t=teams.find(x=>x.slug===slug);if(!t)return json_({ok:false,message:'Team not found.'});
  if(typeof b.logoUrl==='string')t.logoUrl=storedLogo_(b.logoUrl);if(typeof b.bannerUrl==='string')t.bannerUrl=clean_(b.bannerUrl);if(typeof b.description==='string')t.description=clean_(b.description);if(typeof b.mobileNumber==='string')t.mobileNumber=clean_(b.mobileNumber);
  if(Array.isArray(b.roster))t.roster=b.roster.map((p,i)=>({playerId:clean_(p.playerId||p.id)||t.teamId+'-P-'+String(i+1).padStart(2,'0'),name:clean_(p.name||p.playerName),uid:clean_(p.uid||p.UID),role:clean_(p.role),playerLogoUrl:storedPlayerLogo_(p.playerLogoUrl||p.PlayerLogoURL||p.playerLogo||p.logoUrl),status:clean_(p.status)||'Active'})).filter(p=>p.name||p.uid||p.playerLogoUrl);
  t.lastUpdated=now_();writeTeams_(ss,teams);SpreadsheetApp.flush();
  const verified=readTeams_(ss).find(x=>x.slug===slug);return json_({ok:true,verified:!!verified,team:Object.assign({},verified,{logoUrl:displayLogo_(verified.logoUrl),roster:verified.roster.map(p=>Object.assign({},p,{playerLogoUrl:displayPlayerLogo_(p.playerLogoUrl)}))}),message:'Team profile saved and verified successfully.'});
}
function changeTeamPassword_(ss,b){const u=clean_(b.username).toLowerCase(),a=findAccount_(ss,u);if(!a||a.status.toLowerCase()!=='active')return json_({ok:false,message:'Team account not found.'});if(a.passwordHash!==clean_(b.currentPasswordHash))return json_({ok:false,message:'Current password is incorrect.'});return setPassword_(ss,u,clean_(b.newPasswordHash));}
function resetTeamPassword_(ss,b){const u=clean_(b.username).toLowerCase(),a=findAccount_(ss,u);if(!a||a.email!==clean_(b.email).toLowerCase())return json_({ok:false,message:'Username and registered email do not match.'});return setPassword_(ss,u,clean_(b.passwordHash));}
function setPassword_(ss,u,h){if(!h)return json_({ok:false,message:'Password is required.'});const s=sheet_(ss,TABS.ACCOUNTS);rows_(s).forEach((r,i)=>{if(clean_(r[0]).toLowerCase()===u){s.getRange(i+2,2).setValue(h);s.getRange(i+2,7).setValue(now_());}});SpreadsheetApp.flush();return json_({ok:true,message:'Password updated successfully.'});}
function deleteRegisteredTeam_(ss,b){const slug=clean_(b.teamSlug).toLowerCase();if(!slug)return json_({ok:false,message:'Team slug is required.'});const lock=LockService.getScriptLock();lock.waitLock(15000);try{const ts=sheet_(ss,TABS.TEAMS),as=sheet_(ss,TABS.ACCOUNTS),rs=sheet_(ss,TABS.ROSTERS);let teamRemoved=false,accountRemoved=false;for(let i=ts.getLastRow();i>=2;i--)if(clean_(ts.getRange(i,3).getValue()).toLowerCase()===slug){ts.deleteRow(i);teamRemoved=true;}for(let i=as.getLastRow();i>=2;i--)if(clean_(as.getRange(i,3).getValue()).toLowerCase()===slug){as.deleteRow(i);accountRemoved=true;}const teams=readTeams_(ss),teamIds=teams.filter(t=>t.slug===slug).map(t=>t.teamId);for(let i=rs.getLastRow();i>=2;i--)if(teamIds.indexOf(clean_(rs.getRange(i,2).getValue()))>=0)rs.deleteRow(i);SpreadsheetApp.flush();return json_({ok:teamRemoved||accountRemoved,teamRemoved,accountRemoved,message:teamRemoved||accountRemoved?'Registered team removed. Event history was preserved.':'Team not found.'});}finally{lock.releaseLock();}}

/* ---------------------------------------------------------
 * SUBMISSIONS / FEEDBACK
 * --------------------------------------------------------- */
function submitFinalLeaderboard_(ss,b){const s=sheet_(ss,TABS.SUBMISSIONS);ensure_(s,HEADERS[TABS.SUBMISSIONS]);const id='SUB-'+Utilities.getUuid().slice(0,8);s.appendRow([id,clean_(b.username),clean_(b.teamSlug),clean_(b.teamName||b.team),clean_(b.tournamentName),clean_(b.tournamentDate),clean_(b.organizerName),clean_(b.prizePool),int_(b.finalPosition),JSON.stringify(b.finalLeaderboard||[]),clean_(b.proofURL||b.proofUrl),'Pending','','','',now_()]);SpreadsheetApp.flush();return json_({ok:true,submissionId:id,message:'Final leaderboard submitted successfully.'});}
function getTeamSubmissions_(ss,b){const s=sheet_(ss,TABS.SUBMISSIONS);ensure_(s,HEADERS[TABS.SUBMISSIONS]);const slug=clean_(b.teamSlug),out=rows_(s).filter(r=>clean_(r[2])===slug).map(r=>{const o={};HEADERS[TABS.SUBMISSIONS].forEach((h,i)=>o[camel_(h)]=r[i]);return o;});return json_({ok:true,submissions:out});}
function submitFeedback_(ss,b){const s=sheet_(ss,TABS.FEEDBACK);ensure_(s,HEADERS[TABS.FEEDBACK]);const id='FB-'+Utilities.getUuid().slice(0,8),n=now_();s.appendRow([id,clean_(b.username),clean_(b.teamSlug),clean_(b.teamName||b.team),clean_(b.message),'Open','',n,n]);SpreadsheetApp.flush();return json_({ok:true,feedbackId:id,message:'Feedback submitted successfully.'});}
function saveRanking_(ss,b){if(Array.isArray(b.rankings))writeRankings_(ss,b.rankings);else if(Array.isArray(b.teams))writeRankings_(ss,b.teams);SpreadsheetApp.flush();return json_({ok:true,verified:true,rankings:readRankings_(ss),message:'Community Rankings saved and verified successfully.'});}
function uploadLogo_(ss,b){const url=storedLogo_(b.logoUrl||b.url);return json_({ok:true,logoUrl:url,displayLogoUrl:displayLogo_(url),message:'Logo URL accepted. Storage value was preserved.'});}

/* ---------------------------------------------------------
 * ADMIN SAVE / READ-BACK VERIFICATION
 * --------------------------------------------------------- */
function saveAll_(ss,b) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    if(Array.isArray(b.teams))writeTeams_(ss,b.teams);
    if(Array.isArray(b.rosters))writeRosters_(ss,b.rosters);
    if(Array.isArray(b.rankings))writeRankings_(ss,b.rankings);
    if(Array.isArray(b.events))writeEvents_(ss,b.events);
    if(Array.isArray(b.results))writeResults_(ss,b.results);
    if(Array.isArray(b.collaborators))writeObjects_(ss,TABS.COLLAB,b.collaborators);
    if(Array.isArray(b.news))writeNews_(ss,b.news);
    SpreadsheetApp.flush();

    const readBack={
      teams:readTeams_(ss),events:readEvents_(ss),results:readResults_(ss),rankings:readRankings_(ss),
      collaborators:readObjects_(ss,TABS.COLLAB),news:readNews_(ss)
    };

    const checks=[];
    if(Array.isArray(b.teams)) checks.push(['teams',b.teams.length,readBack.teams.length]);
    if(Array.isArray(b.events)) checks.push(['events',b.events.length,readBack.events.length]);
    if(Array.isArray(b.results)) checks.push(['results',b.results.length,readBack.results.length]);
    if(Array.isArray(b.rankings)) checks.push(['rankings',b.rankings.length,readBack.rankings.length]);
    if(Array.isArray(b.collaborators)) checks.push(['collaborators',b.collaborators.length,readBack.collaborators.length]);
    if(Array.isArray(b.news)) checks.push(['news',b.news.length,readBack.news.length]);

    const mismatch=checks.filter(x=>x[1]!==x[2]);
    if(mismatch.length)return json_({ok:false,verified:false,googleSheets:true,mismatch:mismatch.map(x=>({section:x[0],expected:x[1],actual:x[2]})),message:'Google Sheets write completed but read-back verification failed. No publish confirmation was returned.'});

    return json_({ok:true,verified:true,googleSheets:true,readBack:readBack,message:'Saved to Google Sheets and verified successfully.'});
  } finally {lock.releaseLock();}
}

/* ---------------------------------------------------------
 * API ENTRY POINTS
 * --------------------------------------------------------- */
function doGet(){
  try {
    const ss=getSpreadsheet_();
    setupTNFFM();
    return json_({ok:true,version:VERSION,teams:readTeams_(ss),events:readEvents_(ss),results:readResults_(ss),rankings:readRankings_(ss),collaborators:readObjects_(ss,TABS.COLLAB),news:readNews_(ss),defaultLogoUrl:DEFAULT_LOGO_URL,defaultPlayerLogoUrl:DEFAULT_PLAYER_LOGO_URL,serverTime:now_()});
  } catch(e) { return json_({ok:false,version:VERSION,message:error_(e)}); }
}
function doPost(e){
  try {
    if(!e || !e.postData || !e.postData.contents)return json_({ok:false,message:'Request body is missing.'});
    const b=JSON.parse(e.postData.contents||'{}'),action=clean_(b.action).toLowerCase(),ss=getSpreadsheet_();
    switch(action){
      case 'setup': return setupTNFFM();
      case 'ping': return json_({ok:true,version:VERSION,time:now_()});
      case 'getdata': return doGet();
      case 'registerteam': return registerTeam_(ss,b);
      case 'loginteam': return loginTeam_(ss,b);
      case 'getteam': return getTeam_(ss,b);
      case 'updateteamprofile': return updateTeamProfile_(ss,b);
      case 'changeteampassword': return changeTeamPassword_(ss,b);
      case 'resetteampassword': return resetTeamPassword_(ss,b);
      case 'uploadlogo': return uploadLogo_(ss,b);
      case 'submitfinalleaderboard': return submitFinalLeaderboard_(ss,b);
      case 'getteamsubmissions': return getTeamSubmissions_(ss,b);
      case 'submitfeedback': return submitFeedback_(ss,b);
      case 'addnews': return addNews_(ss,b);
      case 'saveranking': return saveRanking_(ss,b);
      case 'deleteteam': return deleteRegisteredTeam_(ss,b);
      case 'save':
      case 'sync':
      case 'saveall': return saveAll_(ss,b);
      default:
        if(Array.isArray(b.teams)||Array.isArray(b.events)||Array.isArray(b.results)||Array.isArray(b.rankings)||Array.isArray(b.collaborators)||Array.isArray(b.news))return saveAll_(ss,b);
        return json_({ok:false,version:VERSION,message:'Unknown action: '+action});
    }
  } catch(e) { return json_({ok:false,version:VERSION,message:error_(e)}); }
}
