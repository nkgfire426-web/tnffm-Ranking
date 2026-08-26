/* TNFFM COMMUNITY RANKING - GOOGLE APPS SCRIPT
 * Canonical backend for the Admin Dashboard.
 * Web App: /exec
 * Deploy as: Execute as Me + Anyone
 */

var VERSION = 'TNFFM-2026.08.26-ADMIN-COMPATIBLE-FINAL';
var TABS = {
  TEAMS:'Teams', ROSTERS:'Team Rosters', RANKINGS:'Community Rankings', EVENTS:'Events',
  RESULTS:'Event Results', NEWS:'TournamentNews', COLLAB:'Collaborators', ACCOUNTS:'TeamAccounts',
  SUBMISSIONS:'Submissions', FEEDBACK:'Feedback'
};
var HEADERS = {};
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

function clean_(v){ return v===null || v===undefined ? '' : String(v).trim(); }
function num_(v){ var n=Number(v); return isFinite(n)?n:0; }
function int_(v){ return Math.max(0,Math.floor(num_(v))); }
function now_(){ return new Date().toISOString(); }
function json_(data){ return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function error_(e){ return String(e && e.message ? e.message : e); }
function bool_(v){ var x=clean_(v).toLowerCase(); return v===true || x==='true' || x==='yes' || x==='1' || x==='published' || x==='active'; }
function safeJson_(v,fallback){ if(Array.isArray(v))return v; if(!v)return fallback; try{return JSON.parse(String(v));}catch(e){return fallback;} }
function slugify_(name){ var s=clean_(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45); return s||'team'; }
function storedLogo_(v){ var x=clean_(v); return (!x||x.indexOf('/tnffm-default')>=0)?'':x; }
function storedPlayerLogo_(v){ var x=clean_(v); return (!x||x.indexOf('/tnffm-default')>=0)?'':x; }
function prop_(o,names){ if(!o)return ''; for(var i=0;i<names.length;i++){ if(o[names[i]]!==undefined && o[names[i]]!==null)return o[names[i]]; } return ''; }
function getSpreadsheet_(){ var id=clean_(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')); if(id)return SpreadsheetApp.openById(id); var active=SpreadsheetApp.getActiveSpreadsheet(); if(active)return active; throw new Error('Google Sheet is not configured. Set Script Property SPREADSHEET_ID.'); }
function sheet_(ss,name){ return ss.getSheetByName(name)||ss.insertSheet(name); }
function ensure_(s,headers){ if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns()); s.getRange(1,1,1,headers.length).setValues([headers]); s.setFrozenRows(1); }
function rows_(s){ if(!s||s.getLastRow()<2)return []; return s.getRange(2,1,s.getLastRow()-1,Math.max(s.getLastColumn(),1)).getValues(); }
function clearData_(s,headers){ if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,headers.length).clearContent(); }
function setupTNFFM(){ var ss=getSpreadsheet_(); Object.keys(HEADERS).forEach(function(n){ensure_(sheet_(ss,n),HEADERS[n]);}); SpreadsheetApp.flush(); return json_({ok:true,version:VERSION,message:'TNFFM Google Sheet structure is ready.',tabs:Object.keys(HEADERS)}); }
function setupSheets(){ return setupTNFFM(); }

function readRosters_(ss){
  var s=sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]); var out={};
  rows_(s).forEach(function(r){ var teamId=clean_(r[1]); if(!teamId)return; if(!out[teamId])out[teamId]=[]; out[teamId].push({playerId:clean_(r[0]),name:clean_(r[3]),uid:clean_(r[4]),role:clean_(r[5]),playerLogoUrl:storedPlayerLogo_(r[6]),status:clean_(r[7])||'Active',createdAt:clean_(r[8]),updatedAt:clean_(r[9])}); });
  return out;
}
function readTeams_(ss){
  var s=sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]); var rosterMap=readRosters_(ss),out=[];
  rows_(s).forEach(function(r){ var name=clean_(r[1]); if(!name)return; var id=clean_(r[0]),roster=rosterMap[id]||[]; out.push({teamId:id,teamName:name,slug:clean_(r[2])||slugify_(name),logoUrl:storedLogo_(r[3]),bannerUrl:clean_(r[4]),description:clean_(r[5]),mobileNumber:clean_(r[6]),status:clean_(r[7])||'Active',registrationStatus:clean_(r[8])||'Registered',players:roster.length,roster:roster,createdAt:clean_(r[9]),lastUpdated:clean_(r[10])}); });
  return out;
}
function nextTeamId_(old){ var max=0; old.forEach(function(t){var m=clean_(t.teamId).match(/^TN-(\d+)$/i);if(m)max=Math.max(max,parseInt(m[1],10));}); return 'TN-'+String(max+1).padStart(5,'0'); }
function writeTeams_(ss,items){
  var s=sheet_(ss,TABS.TEAMS); ensure_(s,HEADERS[TABS.TEAMS]); var old=readTeams_(ss),byId={},byName={},used={},out=[],prepared=[];
  old.forEach(function(t){byId[t.teamId]=t;byName[t.teamName.toLowerCase()]=t;});
  (Array.isArray(items)?items:[]).forEach(function(t){
    var name=clean_(prop_(t,['teamName','Team','Team Name'])); if(!name)return;
    var prior=byId[clean_(prop_(t,['teamId','id','Team ID']))]||byName[name.toLowerCase()]||{};
    var slug=clean_(prop_(t,['slug','Slug']))||slugify_(name),base=slug,n=2; while(used[slug.toLowerCase()])slug=base+'-'+n++; used[slug.toLowerCase()]=true;
    var teamId=clean_(prop_(t,['teamId','id','Team ID']))||prior.teamId||nextTeamId_(old.concat(prepared));
    var team={teamId:teamId,teamName:name,slug:slug,logoUrl:storedLogo_(prop_(t,['logoUrl','Logo URL','logoURL'])),bannerUrl:clean_(prop_(t,['bannerUrl','Banner URL'])),description:clean_(prop_(t,['description','Description'])),mobileNumber:clean_(prop_(t,['mobileNumber','Mobile Number'])),status:clean_(prop_(t,['status','Status']))||'Active',registrationStatus:clean_(prop_(t,['registrationStatus','Registration Status']))||'Registered',roster:Array.isArray(t.roster)?t.roster:(Array.isArray(t.playersList)?t.playersList:[]),createdAt:prior.createdAt||clean_(t.createdAt)||now_()};
    prepared.push(team); out.push([team.teamId,team.teamName,team.slug,team.logoUrl,team.bannerUrl,team.description,team.mobileNumber,team.status,team.registrationStatus,team.createdAt,now_()]);
  });
  clearData_(s,HEADERS[TABS.TEAMS]); if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.TEAMS].length).setValues(out); writeRosters_(ss,prepared);
  return prepared;
}
function writeRosters_(ss,teams){
  var s=sheet_(ss,TABS.ROSTERS); ensure_(s,HEADERS[TABS.ROSTERS]); clearData_(s,HEADERS[TABS.ROSTERS]); var out=[];
  (Array.isArray(teams)?teams:[]).forEach(function(t){ var roster=Array.isArray(t.roster)?t.roster:[]; roster.forEach(function(p,j){ if(!p)return; var name=clean_(prop_(p,['name','playerName','Player Name'])),uid=clean_(prop_(p,['uid','UID'])),logo=storedPlayerLogo_(prop_(p,['playerLogoUrl','Player Logo URL','PlayerLogoURL','logoUrl'])); if(!name&&!uid&&!logo)return; out.push([clean_(prop_(p,['playerId','id','Player ID']))||t.teamId+'-P-'+String(j+1).padStart(2,'0'),t.teamId,t.teamName,name,uid,clean_(prop_(p,['role','Role']))||'',logo,clean_(prop_(p,['status','Status']))||'Active',clean_(p.createdAt)||now_(),now_()]); }); });
  if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.ROSTERS].length).setValues(out);
}

function readRankings_(ss){ var s=sheet_(ss,TABS.RANKINGS);ensure_(s,HEADERS[TABS.RANKINGS]);return rows_(s).filter(function(r){return clean_(r[2]);}).map(function(r){return {rank:int_(r[0]),teamId:clean_(r[1]),teamName:clean_(r[2]),slug:clean_(r[3]),eventsPlayed:int_(r[4]),championships:int_(r[5]),runnerUp:int_(r[6]),secondRunnerUp:int_(r[7]),top5Finishes:int_(r[8]),communityScore:num_(r[9]),kills:int_(r[10]),booyahs:int_(r[11]),killRatio:num_(r[12]),booyahRatio:num_(r[13]),positionPoints:num_(r[14]),totalPoints:num_(r[15]),matchesPlayed:int_(r[16]),grandFinals:int_(r[17]),winRate:num_(r[18]),eligible:clean_(r[19])||'Yes',status:clean_(r[20])||'Active',updatedAt:clean_(r[21])};}); }
function writeRankings_(ss,items){ var s=sheet_(ss,TABS.RANKINGS);ensure_(s,HEADERS[TABS.RANKINGS]);clearData_(s,HEADERS[TABS.RANKINGS]);var teams=readTeams_(ss),out=[];(Array.isArray(items)?items:[]).forEach(function(r,i){var team=teams.find(function(t){return (clean_(r.teamId)&&t.teamId===clean_(r.teamId))||(clean_(r.slug)&&t.slug===clean_(r.slug))||t.teamName.toLowerCase()===clean_(r.teamName).toLowerCase();})||{};out.push([int_(r.rank)||i+1,clean_(r.teamId)||team.teamId,clean_(r.teamName)||team.teamName,clean_(r.slug)||team.slug,int_(r.eventsPlayed),int_(r.championships),int_(r.runnerUp),int_(r.secondRunnerUp||r['2nd Runner-Up']),int_(r.top5Finishes),num_(r.communityScore!==undefined?r.communityScore:r.communityPoints),int_(r.kills),int_(r.booyahs),num_(r.killRatio),num_(r.booyahRatio),num_(r.positionPoints),num_(r.totalPoints),int_(r.matchesPlayed),int_(r.grandFinals),num_(r.winRate),clean_(r.eligible)||'Yes',clean_(r.status)||'Active',now_()]);});if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.RANKINGS].length).setValues(out); }

function readEvents_(ss){ var s=sheet_(ss,TABS.EVENTS);ensure_(s,HEADERS[TABS.EVENTS]);return rows_(s).filter(function(r){return clean_(r[1]);}).map(function(r){return {eventId:clean_(r[0]),id:clean_(r[0]),name:clean_(r[1]),eventName:clean_(r[1]),organizer:clean_(r[2]),teams:int_(r[3]),prize:clean_(r[4]),status:clean_(r[5]),counted:clean_(r[6]),date:clean_(r[7]),eventDate:clean_(r[7]),notes:clean_(r[8]),matchesPlayed:int_(r[9]),published:bool_(r[10]),results:safeJson_(r[11],[]),createdAt:clean_(r[12]),updatedAt:clean_(r[13])};}); }
function nextId_(prefix,rows,index){ var max=0;rows.forEach(function(r){var m=clean_(r[index]).match(new RegExp('^'+prefix+'-(\\d+)$','i'));if(m)max=Math.max(max,parseInt(m[1],10));});return prefix+'-'+String(max+1).padStart(5,'0'); }
function writeEvents_(ss,items){ var s=sheet_(ss,TABS.EVENTS);ensure_(s,HEADERS[TABS.EVENTS]);var old=readEvents_(ss),byId={},byName={},out=[];old.forEach(function(e){byId[e.eventId]=e;byName[e.name.toLowerCase()]=e;});(Array.isArray(items)?items:[]).forEach(function(e){var name=clean_(prop_(e,['name','eventName','Name']));if(!name)return;var prior=byId[clean_(prop_(e,['eventId','id','Event ID']))]||byName[name.toLowerCase()]||{};var id=clean_(prop_(e,['eventId','id','Event ID']))||prior.eventId||nextId_('EVENT',old,0);old.push({eventId:id});out.push([id,name,clean_(e.organizer),int_(e.teams),clean_(e.prize),clean_(e.status),clean_(e.counted),clean_(e.date||e.eventDate),clean_(e.notes),int_(e.matchesPlayed),bool_(e.published)?'TRUE':'FALSE',JSON.stringify(Array.isArray(e.results)?e.results:[]),prior.createdAt||clean_(e.createdAt)||now_(),now_()]);});clearData_(s,HEADERS[TABS.EVENTS]);if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.EVENTS].length).setValues(out); }
function readResults_(ss){ var s=sheet_(ss,TABS.RESULTS);ensure_(s,HEADERS[TABS.RESULTS]);return rows_(s).filter(function(r){return clean_(r[1])||clean_(r[4]);}).map(function(r){return {resultId:clean_(r[0]),eventId:clean_(r[1]),eventName:clean_(r[2]),teamId:clean_(r[3]),teamName:clean_(r[4]),position:int_(r[5]),rank:int_(r[5]),kills:int_(r[6]),booyahs:int_(r[7]),positionPoints:num_(r[8]),killPoints:num_(r[9]),totalPoints:num_(r[10]),total:num_(r[10]),proofUrl:clean_(r[11]),verified:bool_(r[12]),updatedAt:clean_(r[13])};}); }
function writeResults_(ss,items){ var s=sheet_(ss,TABS.RESULTS);ensure_(s,HEADERS[TABS.RESULTS]);var old=readResults_(ss),out=[];(Array.isArray(items)?items:[]).forEach(function(r,i){var supplied=clean_(prop_(r,['resultId','id','Result ID'])),id=supplied;if(!id){var match=old.find(function(x){return clean_(x.eventId)===clean_(r.eventId)&&clean_(x.teamName).toLowerCase()===clean_(r.teamName).toLowerCase()&&int_(x.position)===int_(r.position||r.rank);});id=match?match.resultId:nextId_('RES',old.map(function(x){return {v:x.resultId};}),0);if(!id)id='RES-'+String(i+1).padStart(5,'0');}old.push({resultId:id});out.push([id,clean_(r.eventId),clean_(r.eventName),clean_(r.teamId),clean_(r.teamName),int_(r.position||r.rank),int_(r.kills),int_(r.booyahs),num_(r.positionPoints),num_(r.killPoints!==undefined?r.killPoints:r.kills),num_(r.totalPoints!==undefined?r.totalPoints:r.total),clean_(r.proofUrl||r.proofURL),bool_(r.verified)?'TRUE':'FALSE',now_()]);});clearData_(s,HEADERS[TABS.RESULTS]);if(out.length)s.getRange(2,1,out.length,HEADERS[TABS.RESULTS].length).setValues(out); }

function readSimple_(ss,tab){ var s=sheet_(ss,tab);ensure_(s,HEADERS[tab]);var headers=HEADERS[tab];return rows_(s).filter(function(r){return r.some(function(v){return clean_(v);});}).map(function(r){var o={};headers.forEach(function(h,i){var v=r[i];o[h]=v instanceof Date?v.toISOString():v;});return o;}); }
function camel_(h){ return h.toLowerCase().replace(/[^a-z0-9]+(.)/g,function(_,c){return c.toUpperCase();}); }
function writeSimple_(ss,tab,items){ var s=sheet_(ss,tab);ensure_(s,HEADERS[tab]);var headers=HEADERS[tab],old=readSimple_(ss,tab),out=[];clearData_(s,headers);(Array.isArray(items)?items:[]).forEach(function(item,i){var row=headers.map(function(h){var key=camel_(h),v=undefined;if(h==='Collaborator ID')v=prop_(item,['collaboratorId','id','Collaborator ID']);else if(h==='LogoURL')v=prop_(item,['logoUrl','logoURL','LogoURL']);else if(h==='Website')v=prop_(item,['website','url','Website']);else if(h==='Instagram')v=prop_(item,['instagram','Instagram']);else if(h==='ID')v=prop_(item,['id','newsId','ID']);else if(h==='UpdatedAt')v=prop_(item,['updatedAt','UpdatedAt']);else v=prop_(item,[key,h]);return clean_(v);});if(tab===TABS.COLLAB&&!row[0]){var name=clean_(row[1]),prior=old.find(function(x){return clean_(x.Name).toLowerCase()===name.toLowerCase();});row[0]=clean_(prior&&prior['Collaborator ID'])||'COLLAB-'+String(i+1).padStart(5,'0');}if(tab===TABS.NEWS&&!row[0])row[0]='NEWS-'+String(i+1).padStart(5,'0');if(hadTimestamp_(headers))row[headers.indexOf(tab===TABS.COLLAB?'UpdatedAt':'UpdatedAt')]=now_();out.push(row);});if(out.length)s.getRange(2,1,out.length,headers.length).setValues(out); }
function hadTimestamp_(headers){ return headers.indexOf('UpdatedAt')>=0; }

function allData_(ss){ return {ok:true,version:VERSION,teams:readTeams_(ss),rankings:readRankings_(ss),events:readEvents_(ss),rankingResults:readResults_(ss),results:readResults_(ss),news:readSimple_(ss,TABS.NEWS),collaborators:readSimple_(ss,TABS.COLLAB),accounts:readSimple_(ss,TABS.ACCOUNTS),submissions:readSimple_(ss,TABS.SUBMISSIONS),feedback:readSimple_(ss,TABS.FEEDBACK)}; }
function doGet(e){ try{var ss=getSpreadsheet_();if(clean_(e&&e.parameter&&e.parameter.action).toLowerCase()==='setup')return setupTNFFM();var data=allData_(ss);data.cacheBuster=clean_(e&&e.parameter&&e.parameter._tnffm_verify)||now_();return json_(data);}catch(err){return json_({ok:false,version:VERSION,error:error_(err),message:error_(err)});} }
function doPost(e){ var lock=LockService.getScriptLock();try{lock.waitLock(30000);var ss=getSpreadsheet_();if(!e||!e.postData||!e.postData.contents)throw new Error('POST body is empty.');var p=JSON.parse(e.postData.contents);if(p&&p.action==='setup')return setupTNFFM();var written=[];if(Array.isArray(p.teams)){writeTeams_(ss,p.teams);written.push('teams');}if(Array.isArray(p.rankings)){writeRankings_(ss,p.rankings);written.push('rankings');}if(Array.isArray(p.events)){writeEvents_(ss,p.events);written.push('events');}var results=Array.isArray(p.rankingResults)?p.rankingResults:(Array.isArray(p.results)?p.results:null);if(results){writeResults_(ss,results);written.push('results');}if(Array.isArray(p.news)){writeSimple_(ss,TABS.NEWS,p.news);written.push('news');}if(Array.isArray(p.collaborators)){writeSimple_(ss,TABS.COLLAB,p.collaborators);written.push('collaborators');}if(Array.isArray(p.accounts)){writeSimple_(ss,TABS.ACCOUNTS,p.accounts);written.push('accounts');}if(Array.isArray(p.submissions)){writeSimple_(ss,TABS.SUBMISSIONS,p.submissions);written.push('submissions');}if(Array.isArray(p.feedback)){writeSimple_(ss,TABS.FEEDBACK,p.feedback);written.push('feedback');}if(!written.length)throw new Error('No supported data section was supplied.');SpreadsheetApp.flush();Utilities.sleep(200);var data=allData_(ss);return json_({ok:true,version:VERSION,saved:true,verified:true,written:written,teams:data.teams,rankings:data.rankings,events:data.events,rankingResults:data.rankingResults,results:data.results,news:data.news,collaborators:data.collaborators,accounts:data.accounts,submissions:data.submissions,feedback:data.feedback,message:'Google Sheets saved and read back successfully.'});}catch(err){console.error('TNFFM doPost error: '+error_(err));return json_({ok:false,version:VERSION,saved:false,verified:false,error:error_(err),message:error_(err)});}finally{try{lock.releaseLock();}catch(e){}} }
