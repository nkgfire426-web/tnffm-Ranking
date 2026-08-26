/* TNFFM COMMUNITY RANKING - GOOGLE APPS SCRIPT API
 * Reliable Web App backend for Admin Dashboard <-> Google Sheets.
 * After updating this file, deploy a NEW Web App version.
 */

const VERSION = 'TNFFM-2026.08.26-RELIABLE-API';
const DEFAULT_LOGO_URL = '/tnffm-default-logo.svg';
const DEFAULT_PLAYER_LOGO_URL = '/tnffm-default-player.svg';
const TABS = {
  TEAMS:'Teams', ROSTERS:'Team Rosters', RANKINGS:'Community Rankings', EVENTS:'Events',
  RESULTS:'Event Results', NEWS:'TournamentNews', COLLAB:'Collaborators', ACCOUNTS:'TeamAccounts',
  SUBMISSIONS:'Submissions', FEEDBACK:'Feedback'
};
const HEADERS = {};
HEADERS[TABS.TEAMS]=['Team ID','Team Name','Slug','Logo URL','Banner URL','Description','Mobile Number','Status','Registration Status','Created At','Updated At'];
HEADERS[TABS.ROSTERS]=['Player ID','Team ID','Team Name','Player Name','UID','Role','Player Logo URL','Status','Created At','Updated At'];
HEADERS[TABS.RANKINGS]=['Rank','Team ID','Team Name','Slug','Events Played','Championships','Runner-Up','2nd Runner-Up','Top 5 Finishes','Community Score','Kills','Booyahs','Kill Ratio','Booyah Ratio','Position Points','Total Points','Matches Played','Grand Finals','Win Rate','Eligible','Status','Updated At'];
HEADERS[TABS.EVENTS]=['Event ID','Name','Organizer','Teams','Prize','Status','Counted','Date','Notes','Matches Played','Published','Results','Created At','Updated At'];
HEADERS[TABS.RESULTS]=['Result ID','Event ID','Event Name','Team ID','Team Name','Position','Kills','Booyahs','Position Points','Kill Points','Total Points','Proof URL','Verified','Updated At'];
HEADERS[TABS.NEWS]=['ID','Title','Description','Date','Type','Status','ImageURL','Link','UpdatedAt'];
HEADERS[TABS.COLLAB]=['Collaborator ID','Name','Role','Status','Contact','LogoURL','Website','Instagram','UpdatedAt'];
HEADERS[TABS.ACCOUNTS]=['Username','PasswordHash','TeamSlug','Email','Status','CreatedAt','UpdatedAt'];
HEADERS[TABS.SUBMISSIONS]=['SubmissionID','Username','TeamSlug','Team','TournamentName','TournamentDate','OrganizerName','PrizePool','FinalPosition','FinalLeaderboard','ProofURL','Status','ReviewNotes','ReviewedBy','ReviewedAt','CreatedAt'];
HEADERS[TABS.FEEDBACK]=['FeedbackID','Username','TeamSlug','Team','Message','Status','AdminReply','CreatedAt','UpdatedAt'];

function clean_(v){ return v==null ? '' : String(v).trim(); }
function num_(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function int_(v){ return Math.max(0,Math.floor(num_(v))); }
function now_(){ return new Date().toISOString(); }
function json_(data){ return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function error_(e){ return String(e&&e.message?e.message:e); }
function getSpreadsheet_(){
  const id=clean_(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  if(id) return SpreadsheetApp.openById(id);
  const active=SpreadsheetApp.getActiveSpreadsheet();
  if(active) return active;
  throw new Error('Google Sheet is not configured. Set Script Property SPREADSHEET_ID.');
}
function sheet_(ss,name){ return ss.getSheetByName(name)||ss.insertSheet(name); }
function ensure_(s,headers){
  if(s.getMaxColumns()<headers.length) s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());
  s.getRange(1,1,1,headers.length).setValues([headers]);
  s.setFrozenRows(1);
}
function rows_(s){
  if(!s || s.getLastRow()<2) return [];
  const width=Math.max(s.getLastColumn(),1);
  return s.getRange(2,1,s.getLastRow()-1,width).getValues();
}
function slugify_(name){
  const s=clean_(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45);
  return s||'team';
}
function storedLogo_(v){ const x=clean_(v); return (!x||x===DEFAULT_LOGO_URL)?'':x; }
function storedPlayerLogo_(v){ const x=clean_(v); return (!x||x===DEFAULT_PLAYER_LOGO_URL||x===DEFAULT_LOGO_URL)?'':x; }
function bool_(v){ return v===true || ['true','yes','1','published','active'].indexOf(clean_(v).toLowerCase())>=0; }
function safeJson_(v,fallback){ if(Array.isArray(v))return v; if(!v)return fallback; try{return JSON.parse(String(v));}catch(_){return fallback;} }

function setupTNFFM(){
  const ss=getSpreadsheet_();
  Object.keys(HEADERS).forEach(function(name){ ensure_(sheet_(ss,name),HEADERS[name]); });
  SpreadsheetApp.flush();
  return json_({ok:true,version:VERSION,message:'TNFFM Google Sheet structure is ready.',tabs:Object.keys(HEADERS)});
}
function setupSheets(){ return setupTNFFM(); }

function readRosters_(ss){
  const s=sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]); const out={};
  rows_(s).forEach(function(r){
    const teamId=clean_(r[1]); if(!teamId)return;
    (out[teamId]||(out[teamId]=[])).push({playerId:clean_(r[0]),name:clean_(r[3]),uid:clean_(r[4]),role:clean_(r[5]),playerLogoUrl:storedPlayerLogo_(r[6]),status:clean_(r[7])||'Active',createdAt:clean_(r[8]),updatedAt:clean_(r[9])});
  });
  return out;
}
function readTeams_(ss){
  const s=sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]); const rosterMap=readRosters_(ss), out=[];
  rows_(s).forEach(function(r){
    const teamName=clean_(r[1]); if(!teamName)return;
    const teamId=clean_(r[0]); const roster=rosterMap[teamId]||[];
    out.push({teamId:teamId,teamName:teamName,slug:clean_(r[2])||slugify_(teamName),logoUrl:storedLogo_(r[3]),bannerUrl:clean_(r[4]),description:clean_(r[5]),mobileNumber:clean_(r[6]),status:clean_(r[7])||'Active',registrationStatus:clean_(r[8])||'Registered',players:roster.length,roster:roster,createdAt:clean_(r[9]),lastUpdated:clean_(r[10])});
  });
  return out;
}
function writeRosters_(ss,teams){
  const s=sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.ROSTERS].length).clearContent();
  const out=[];
  (Array.isArray(teams)?teams:[]).forEach(function(team){
    const teamId=clean_(team.teamId||team.id)||slugify_(team.slug||team.teamName), roster=Array.isArray(team.roster)?team.roster:(Array.isArray(team.playersList)?team.playersList:safeJson_(team.roster,[]));
    roster.forEach(function(p,j){
      if(!p)return; const name=clean_(p.name||p.playerName),uid=clean_(p.uid||p.UID),logo=storedPlayerLogo_(p.playerLogoUrl||p.PlayerLogoURL||p.playerLogo||p.logoUrl);
      if(!name&&!uid&&!logo)return;
      out.push([clean_(p.playerId||p.id)||teamId+'-P-'+String(j+1).padStart(2,'0'),teamId,clean_(team.teamName||team.Team),name,uid,clean_(p.role||p.Role),logo,clean_(p.status||p.Status)||'Active',clean_(p.createdAt)||now_(),now_()]);
    });
  });
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.ROSTERS].length).setValues(out);
}
function writeTeams_(ss,teams){
  const s=sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]);
  const old=readTeams_(ss), bySlug={}; old.forEach(function(t){bySlug[t.slug.toLowerCase()]=t;});
  const used={}; const out=[];
  (Array.isArray(teams)?teams:[]).forEach(function(t,i){
    const name=clean_(t.teamName||t.Team||t['Team Name']); if(!name)return;
    let slug=clean_(t.slug||t.Slug)||slugify_(name), base=slug, n=2;
    while(used[slug.toLowerCase()]) slug=base+'-'+n++;
    used[slug.toLowerCase()]=true;
    const prior=bySlug[slug.toLowerCase()]||old.find(function(x){return x.teamName.toLowerCase()===name.toLowerCase();})||{};
    const teamId=clean_(t.teamId||t.id||t['Team ID'])||prior.teamId||'TN-'+String(i+1).padStart(5,'0');
    out.push([teamId,name,slug,storedLogo_(t.logoUrl!==undefined?t.logoUrl:t['Logo URL']),clean_(t.bannerUrl!==undefined?t.bannerUrl:t['Banner URL']),clean_(t.description!==undefined?t.description:t.Description),clean_(t.mobileNumber!==undefined?t.mobileNumber:t['Mobile Number']),clean_(t.status||t.Status)||'Active',clean_(t.registrationStatus||t['Registration Status'])||'Registered',prior.createdAt||now_(),now_()]);
  });
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.TEAMS].length).clearContent();
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.TEAMS].length).setValues(out);
  writeRosters_(ss,teams||[]);
}

function readRankings_(ss){
  const s=sheet_(ss,TABS.RANKINGS); ensure_(s,HEADERS[TABS.RANKINGS]);
  return rows_(s).filter(function(r){return clean_(r[2]);}).map(function(r){return {rank:int_(r[0]),teamId:clean_(r[1]),teamName:clean_(r[2]),slug:clean_(r[3]),eventsPlayed:int_(r[4]),championships:int_(r[5]),runnerUp:int_(r[6]),secondRunnerUp:int_(r[7]),top5Finishes:int_(r[8]),communityScore:num_(r[9]),kills:int_(r[10]),booyahs:int_(r[11]),killRatio:num_(r[12]),booyahRatio:num_(r[13]),positionPoints:num_(r[14]),totalPoints:num_(r[15]),matchesPlayed:int_(r[16]),grandFinals:int_(r[17]),winRate:num_(r[18]),eligible:clean_(r[19])||'Yes',status:clean_(r[20])||'Active',updatedAt:clean_(r[21])};});
}
function writeRankings_(ss,items){
  const s=sheet_(ss,TABS.RANKINGS); ensure_(s,HEADERS[TABS.RANKINGS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.RANKINGS].length).clearContent();
  const teams=readTeams_(ss),out=[];
  (Array.isArray(items)?items:[]).forEach(function(r,i){const team=teams.find(function(t){return (clean_(r.teamId)&&t.teamId===clean_(r.teamId))||(clean_(r.slug)&&t.slug===clean_(r.slug))||t.teamName.toLowerCase()===clean_(r.teamName).toLowerCase();})||{};out.push([int_(r.rank||i+1),clean_(r.teamId)||team.teamId,clean_(r.teamName)||team.teamName,clean_(r.slug)||team.slug,int_(r.eventsPlayed),int_(r.championships),int_(r.runnerUp),int_(r.secondRunnerUp||r['2nd Runner-Up']),int_(r.top5Finishes),num_(r.communityScore??r.communityPoints),int_(r.kills),int_(r.booyahs),num_(r.killRatio),num_(r.booyahRatio),num_(r.positionPoints),num_(r.totalPoints),int_(r.matchesPlayed),int_(r.grandFinals),num_(r.winRate),clean_(r.eligible)||'Yes',clean_(r.status)||'Active',now_()]);});
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.RANKINGS].length).setValues(out);
}

function readEvents_(ss){
  const s=sheet_(ss,TABS.EVENTS); ensure_(s,HEADERS[TABS.EVENTS]);
  return rows_(s).filter(function(r){return clean_(r[1]);}).map(function(r){return {eventId:clean_(r[0]),id:clean_(r[0]),name:clean_(r[1]),eventName:clean_(r[1]),organizer:clean_(r[2]),teams:int_(r[3]),prize:clean_(r[4]),status:clean_(r[5]),counted:clean_(r[6]),date:clean_(r[7]),eventDate:clean_(r[7]),notes:clean_(r[8]),matchesPlayed:int_(r[9]),published:bool_(r[10]),results:safeJson_(r[11],[]),createdAt:clean_(r[12]),updatedAt:clean_(r[13])};});
}
function writeEvents_(ss,items){
  const s=sheet_(ss,TABS.EVENTS); ensure_(s,HEADERS[TABS.EVENTS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.EVENTS].length).clearContent();
  const out=[];(Array.isArray(items)?items:[]).forEach(function(e,i){const id=clean_(e.eventId||e.id)||'EVENT-'+String(i+1).padStart(5,'0');out.push([id,clean_(e.name||e.eventName),clean_(e.organizer),int_(e.teams),clean_(e.prize),clean_(e.status),clean_(e.counted),clean_(e.date||e.eventDate),clean_(e.notes),int_(e.matchesPlayed),bool_(e.published)?'TRUE':'FALSE',JSON.stringify(Array.isArray(e.results)?e.results:[]),clean_(e.createdAt)||now_(),now_()]);});
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.EVENTS].length).setValues(out);
}
function readResults_(ss){
  const s=sheet_(ss,TABS.RESULTS); ensure_(s,HEADERS[TABS.RESULTS]);
  return rows_(s).filter(function(r){return clean_(r[1])||clean_(r[4]);}).map(function(r){return {resultId:clean_(r[0]),eventId:clean_(r[1]),eventName:clean_(r[2]),teamId:clean_(r[3]),teamName:clean_(r[4]),position:int_(r[5]),rank:int_(r[5]),kills:int_(r[6]),booyahs:int_(r[7]),positionPoints:num_(r[8]),killPoints:num_(r[9]),totalPoints:num_(r[10]),total:num_(r[10]),proofUrl:clean_(r[11]),verified:bool_(r[12]),updatedAt:clean_(r[13])};});
}
function writeResults_(ss,items){
  const s=sheet_(ss,TABS.RESULTS); ensure_(s,HEADERS[TABS.RESULTS]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[TABS.RESULTS].length).clearContent();
  const out=[];(Array.isArray(items)?items:[]).forEach(function(r,i){const id=clean_(r.resultId||r.id)||'RES-'+String(i+1).padStart(5,'0');out.push([id,clean_(r.eventId),clean_(r.eventName),clean_(r.teamId),clean_(r.teamName),int_(r.position||r.rank),int_(r.kills),int_(r.booyahs),num_(r.positionPoints),num_(r.killPoints||r.kills),num_(r.totalPoints??r.total),clean_(r.proofUrl||r.proofURL),bool_(r.verified)?'TRUE':'FALSE',now_()]);});
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.RESULTS].length).setValues(out);
}

function readSimple_(ss,tab){
  const s=sheet_(ss,tab); ensure_(s,HEADERS[tab]); const headers=HEADERS[tab];
  return rows_(s).filter(function(r){return r.some(function(v){return clean_(v);});}).map(function(r){const o={};headers.forEach(function(h,i){o[h]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});
}
function writeSimple_(ss,tab,items){
  const s=sheet_(ss,tab); ensure_(s,HEADERS[tab]);
  if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,HEADERS[tab].length).clearContent();
  const out=(Array.isArray(items)?items:[]).map(function(item){return HEADERS[tab].map(function(h){const camel=h.replace(/[^a-zA-Z0-9]+(.)/g,function(_,c){return c.toUpperCase();}).replace(/[^a-zA-Z0-9]/g,'');return item[h]!==undefined?item[h]:item[camel]!==undefined?item[camel]:'';});});
  if(out.length)s.getRange(2,1,out.length,HEADERS[tab].length).setValues(out);
}

function allData_(ss){
  return {ok:true,version:VERSION,teams:readTeams_(ss),rankings:readRankings_(ss),events:readEvents_(ss),rankingResults:readResults_(ss),results:readResults_(ss),news:readSimple_(ss,TABS.NEWS),collaborators:readSimple_(ss,TABS.COLLAB),accounts:readSimple_(ss,TABS.ACCOUNTS),submissions:readSimple_(ss,TABS.SUBMISSIONS),feedback:readSimple_(ss,TABS.FEEDBACK)};
}

function doGet(e){
  try{
    const ss=getSpreadsheet_();
    const action=clean_(e&&e.parameter&&e.parameter.action).toLowerCase();
    if(action==='setup')return setupTNFFM();
    const data=allData_(ss); data.cacheBuster=clean_(e&&e.parameter&&e.parameter._tnffm_verify)||now_();
    return json_(data);
  }catch(err){ return json_({ok:false,version:VERSION,error:error_(err),message:error_(err)}); }
}

function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(30000);
    const ss=getSpreadsheet_();
    if(!e||!e.postData||!e.postData.contents)throw new Error('POST body is empty.');
    const payload=JSON.parse(e.postData.contents);
    if(payload&&payload.action==='setup')return setupTNFFM();
    const written=[];
    if(Array.isArray(payload.teams)){writeTeams_(ss,payload.teams);written.push('teams');}
    if(Array.isArray(payload.rankings)){writeRankings_(ss,payload.rankings);written.push('rankings');}
    if(Array.isArray(payload.events)){writeEvents_(ss,payload.events);written.push('events');}
    const resultItems=Array.isArray(payload.rankingResults)?payload.rankingResults:(Array.isArray(payload.results)?payload.results:null);
    if(resultItems){writeResults_(ss,resultItems);written.push('results');}
    if(Array.isArray(payload.news)){writeSimple_(ss,TABS.NEWS,payload.news);written.push('news');}
    if(Array.isArray(payload.collaborators)){writeSimple_(ss,TABS.COLLAB,payload.collaborators);written.push('collaborators');}
    if(Array.isArray(payload.accounts)){writeSimple_(ss,TABS.ACCOUNTS,payload.accounts);written.push('accounts');}
    if(Array.isArray(payload.submissions)){writeSimple_(ss,TABS.SUBMISSIONS,payload.submissions);written.push('submissions');}
    if(Array.isArray(payload.feedback)){writeSimple_(ss,TABS.FEEDBACK,payload.feedback);written.push('feedback');}
    if(!written.length)throw new Error('No supported data section was supplied.');
    SpreadsheetApp.flush();
    Utilities.sleep(250);
    const data=allData_(ss);
    return json_({ok:true,version:VERSION,saved:true,verified:true,written:written,teams:data.teams,rankings:data.rankings,events:data.events,rankingResults:data.rankingResults,results:data.results,news:data.news,collaborators:data.collaborators,accounts:data.accounts,submissions:data.submissions,feedback:data.feedback,message:'Google Sheets saved and read back successfully.'});
  }catch(err){
    console.error('TNFFM doPost error:',error_(err));
    return json_({ok:false,version:VERSION,saved:false,verified:false,error:error_(err),message:error_(err)});
  }finally{try{lock.releaseLock();}catch(_){} }
}
