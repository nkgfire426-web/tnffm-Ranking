/* TNFFM COMMUNITY RANKING — FAST UNIFIED GOOGLE APPS SCRIPT API
 * Public Site + Team Dashboard + Admin Dashboard
 * Fast read path, short-lived cache, no sheet writes during reads.
 * Script Properties: SPREADSHEET_ID, optional DRIVE_FOLDER_ID
 * Web app: Execute as Me, Anyone
 */

var VERSION = 'TNFFM-FAST-2026.08.28-1';
var MAX_ROWS = 5000;
var CACHE_SECONDS = 20;
var MAX_BODY_CHARS = 12000000;

var T = {
  TEAMS: 'Teams', ROSTERS: 'Team Rosters', RANKINGS: 'Community Rankings',
  EVENTS: 'Events', RESULTS: 'Event Results', NEWS: 'TournamentNews',
  COLLAB: 'Collaborators', ACCOUNTS: 'TeamAccounts',
  SUBMISSIONS: 'Submissions', FEEDBACK: 'Feedback'
};

var H = {};
H[T.TEAMS] = ['Team ID','Team Name','Slug','Logo URL','Banner URL','Description','Mobile Number','Status','Registration Status','Created At','Updated At'];
H[T.ROSTERS] = ['Player ID','Team ID','Team Name','Player Name','UID','Role','Player Logo URL','Status','Created At','Updated At'];
H[T.RANKINGS] = ['Rank','Team ID','Team Name','Slug','Events Played','Championships','Runner-Up','2nd Runner-Up','Top 5 Finishes','Community Score','Kills','Booyahs','Kill Ratio','Booyah Ratio','Position Points','Total Points','Matches Played','Grand Finals','Win Rate','Eligible','Status','Updated At'];
H[T.EVENTS] = ['Event ID','Name','Organizer','Teams','Prize','Status','Counted','Date','Notes','Matches Played','Published','Results','Created At','Updated At'];
H[T.RESULTS] = ['Result ID','Event ID','Event Name','Team ID','Team Name','Position','Kills','Booyahs','Position Points','Kill Points','Total Points','Proof URL','Verified','Updated At'];
H[T.NEWS] = ['ID','Title','Description','Date','Type','Status','ImageURL','Link','UpdatedAt'];
H[T.COLLAB] = ['Collaborator ID','Name','Role','Status','Contact','LogoURL','Website','Instagram','UpdatedAt'];
H[T.ACCOUNTS] = ['Username','PasswordHash','TeamSlug','Email','Status','CreatedAt','UpdatedAt'];
H[T.SUBMISSIONS] = ['SubmissionID','Username','TeamSlug','Team','TournamentName','TournamentDate','OrganizerName','PrizePool','FinalPosition','FinalLeaderboard','ProofURL','Status','ReviewNotes','ReviewedBy','ReviewedAt','CreatedAt'];
H[T.FEEDBACK] = ['FeedbackID','Username','TeamSlug','Team','Message','Status','AdminReply','CreatedAt','UpdatedAt'];

function s(v){ return v == null ? '' : String(v).trim(); }
function n(v){ var x = Number(v); return isFinite(x) ? x : 0; }
function i(v){ return Math.max(0, Math.floor(n(v))); }
function b(v){ if(v === true) return true; var x=s(v).toLowerCase(); return x==='true'||x==='yes'||x==='1'||x==='published'||x==='active'; }
function now_(){ return new Date().toISOString(); }
function uid_(p){ return p+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase(); }
function out_(x){ return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON); }
function ok(x){ x=x||{}; x.ok=true; x.version=VERSION; return out_(x); }
function ok_(x){ return ok(x); }
function fail_(m,c){ return out_({ok:false,version:VERSION,code:c||'TNFFM_ERROR',message:s(m)||'Unknown error.'}); }
function err_(e){ return e && e.message ? e.message : String(e||'Unknown error.'); }
function prop_(o, keys){ if(!o)return ''; for(var j=0;j<keys.length;j++){ if(o[keys[j]]!==undefined&&o[keys[j]]!==null)return o[keys[j]]; } return ''; }
function slug_(v){ var x=s(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50); return x||'team'; }

function canon_(k){
  var m={
    'Team ID':'teamId','Team Name':'teamName','Team':'teamName','Slug':'slug','Logo URL':'logoUrl','LogoURL':'logoUrl','Banner URL':'bannerUrl','Description':'description','Mobile Number':'mobileNumber','Status':'status','Registration Status':'registrationStatus','Created At':'createdAt','CreatedAt':'createdAt','Updated At':'updatedAt','UpdatedAt':'updatedAt',
    'Player ID':'playerId','Player Name':'playerName','UID':'uid','Role':'role','Player Logo URL':'playerLogoUrl',
    'Rank':'rank','Events Played':'eventsPlayed','EventsPlayed':'eventsPlayed','Championships':'championships','Runner-Up':'runnerUp','RunnerUp':'runnerUp','2nd Runner-Up':'secondRunnerUp','SecondRunnerUp':'secondRunnerUp','Top 5 Finishes':'top5Finishes','Top5Finishes':'top5Finishes','Community Score':'communityScore','CommunityScore':'communityScore','Kills':'kills','Booyahs':'booyahs','Kill Ratio':'killRatio','KillRatio':'killRatio','Booyah Ratio':'booyahRatio','BooyahRatio':'booyahRatio','Position Points':'positionPoints','PositionPoints':'positionPoints','Kill Points':'killPoints','KillPoints':'killPoints','Total Points':'totalPoints','TotalPoints':'totalPoints','Matches Played':'matchesPlayed','MatchesPlayed':'matchesPlayed','Grand Finals':'grandFinals','GrandFinals':'grandFinals','Win Rate':'winRate','WinRate':'winRate','Eligible':'eligible',
    'Event ID':'eventId','EventId':'eventId','Name':'name','Event Name':'eventName','Organizer':'organizer','Teams':'teams','Prize':'prize','Prize Pool':'prizePool','Counted':'counted','Date':'date','Event Date':'date','Notes':'notes','Published':'published','Results':'results',
    'ID':'id','Title':'title','Type':'type','ImageURL':'imageUrl','Image URL':'imageUrl','Link':'link','Result ID':'resultId','Position':'position','Total':'total','Proof URL':'proofUrl','ProofURL':'proofUrl','Verified':'verified',
    'Username':'username','PasswordHash':'passwordHash','Email':'email','SubmissionID':'submissionId','TournamentName':'tournamentName','TournamentDate':'tournamentDate','OrganizerName':'organizerName','FinalPosition':'finalPosition','FinalLeaderboard':'finalLeaderboard','ReviewNotes':'reviewNotes','ReviewedBy':'reviewedBy','ReviewedAt':'reviewedAt','FeedbackID':'feedbackId','Message':'message','AdminReply':'adminReply','Contact':'contact','Website':'website','Instagram':'instagram','Collaborator ID':'collaboratorId'
  };
  return m[s(k)]||s(k);
}

var SS_ = null;
function book_(){
  if(SS_) return SS_;
  var id=s(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  if(id){ SS_=SpreadsheetApp.openById(id); return SS_; }
  SS_=SpreadsheetApp.getActiveSpreadsheet();
  if(!SS_) throw new Error('Google Sheet is not configured. Set SPREADSHEET_ID.');
  return SS_;
}
function sheet_(name,create){
  var sh=book_().getSheetByName(name);
  if(!sh && create) sh=book_().insertSheet(name);
  if(!sh) throw new Error('Missing sheet: '+name+'. Run setupTNFFM once.');
  return sh;
}
function ensureSheet_(name){
  var sh=sheet_(name,true), h=H[name];
  if(sh.getMaxColumns()<h.length) sh.insertColumnsAfter(sh.getMaxColumns(),h.length-sh.getMaxColumns());
  var existing=sh.getRange(1,1,1,h.length).getDisplayValues()[0];
  var same=true;
  for(var j=0;j<h.length;j++){ if(s(existing[j])!==s(h[j])){same=false;break;} }
  if(!same){ sh.getRange(1,1,1,h.length).setValues([h]); sh.setFrozenRows(1); }
  return sh;
}
function setupTNFFM(){ Object.keys(T).forEach(function(k){ensureSheet_(T[k]);}); return ok_({message:'TNFFM sheet structure is ready.',tabs:Object.keys(T).map(function(k){return T[k];})}); }

/* Reads never call ensureSheet_, insert sheets, rewrite headers, or freeze rows. */
function read_(name){
  var sh=sheet_(name,false), data=sh.getDataRange().getDisplayValues();
  if(data.length<2) return [];
  var h=data[0].map(function(v){return s(v);}), out=[];
  for(var r=1;r<data.length && out.length<MAX_ROWS;r++){
    var row=data[r], used=false;
    for(var c=0;c<row.length;c++){if(s(row[c])!==''){used=true;break;}}
    if(!used) continue;
    var o={};
    for(var j=0;j<h.length;j++){
      var v=s(row[j]);
      if((v[0]==='['&&v[v.length-1]===']')||(v[0]==='{'&&v[v.length-1]==='}')){try{v=JSON.parse(v);}catch(e){}}
      o[h[j]]=v;
      var ck=canon_(h[j]); if(o[ck]===undefined)o[ck]=v;
    }
    out.push(o);
  }
  return out;
}
function safeCell_(v){
  if(v && typeof v==='object') v=JSON.stringify(v);
  if(typeof v==='boolean') v=v?'true':'false';
  v=s(v);
  return /^[=+\-@]/.test(v)?"'"+v:v;
}
function write_(name,items){
  if(!Array.isArray(items)) throw new Error(name+' must be an array.');
  if(items.length>MAX_ROWS-1) throw new Error(name+' exceeds row limit.');
  var sh=sheet_(name,false), h=H[name], last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,h.length).clearContent();
  if(!items.length) return;
  var data=items.map(function(x){return h.map(function(k){var v=x[k];if(v===undefined)v=x[canon_(k)];return safeCell_(v);});});
  sh.getRange(2,1,data.length,h.length).setValues(data);
}
function invalidate_(){ try{CacheService.getScriptCache().remove('tnffm_public_v4');}catch(e){} }

function rosters_(){
  var grouped={};
  read_(T.ROSTERS).forEach(function(p){var tid=s(prop_(p,['teamId','Team ID']));if(!tid)return;(grouped[tid]||(grouped[tid]=[])).push({playerId:s(prop_(p,['playerId','Player ID'])),name:s(prop_(p,['playerName','Player Name'])),uid:s(prop_(p,['uid','UID'])),role:s(prop_(p,['role','Role'])),playerLogoUrl:s(prop_(p,['playerLogoUrl','Player Logo URL'])),status:s(prop_(p,['status','Status']))||'Active',createdAt:s(prop_(p,['createdAt','Created At'])),updatedAt:s(prop_(p,['updatedAt','Updated At']))});});
  return grouped;
}
function teams_(){
  var rr=rosters_();
  return read_(T.TEAMS).map(function(t){var tid=s(prop_(t,['teamId','Team ID'])),name=s(prop_(t,['teamName','Team Name','Team']));return{teamId:tid,teamName:name,slug:s(prop_(t,['slug','Slug']))||slug_(name),logoUrl:s(prop_(t,['logoUrl','Logo URL','LogoURL'])),bannerUrl:s(prop_(t,['bannerUrl','Banner URL'])),description:s(prop_(t,['description','Description'])),mobileNumber:s(prop_(t,['mobileNumber','Mobile Number'])),status:s(prop_(t,['status','Status']))||'Active',registrationStatus:s(prop_(t,['registrationStatus','Registration Status']))||'Registered',players:(rr[tid]||[]).length,roster:rr[tid]||[],createdAt:s(prop_(t,['createdAt','Created At'])),lastUpdated:s(prop_(t,['updatedAt','Updated At']))};}).filter(function(t){return t.teamName;});
}
function publicData_(){
  var cache=CacheService.getScriptCache(), hit=cache.get('tnffm_public_v4');
  if(hit){try{return JSON.parse(hit);}catch(e){}}
  var results=read_(T.RESULTS);
  var data={teams:teams_(),rankings:read_(T.RANKINGS),events:read_(T.EVENTS).map(function(e){var x={};Object.keys(e).forEach(function(k){if(k!=='results')x[k]=e[k];});return x;}),rankingResults:results,results:results,news:read_(T.NEWS),collaborators:read_(T.COLLAB),serverTime:now_(),version:VERSION};
  var text=JSON.stringify(data); if(text.length<95000)cache.put('tnffm_public_v4',text,CACHE_SECONDS);
  return data;
}

function saveTeams_(items){
  var old=teams_(), byId={}, byName={}, used={}; old.forEach(function(t){byId[t.teamId]=t;byName[t.teamName.toLowerCase()]=t;});
  var stamp=now_();
  var out=(items||[]).filter(Boolean).map(function(x){var name=s(prop_(x,['teamName','Team Name','Team']));if(!name)return null;var oldx=byId[s(prop_(x,['teamId','Team ID','id']))]||byName[name.toLowerCase()]||{};var sl=s(prop_(x,['slug','Slug']))||oldx.slug||slug_(name),base=sl,z=2;while(used[sl.toLowerCase()])sl=base+'-'+z++;used[sl.toLowerCase()]=1;return{teamId:s(prop_(x,['teamId','Team ID','id']))||oldx.teamId||uid_('TN'),teamName:name,slug:sl,logoUrl:s(prop_(x,['logoUrl','Logo URL','LogoURL'])),bannerUrl:s(prop_(x,['bannerUrl','Banner URL'])),description:s(prop_(x,['description','Description'])),mobileNumber:s(prop_(x,['mobileNumber','Mobile Number'])),status:s(prop_(x,['status','Status']))||'Active',registrationStatus:s(prop_(x,['registrationStatus','Registration Status']))||'Registered',roster:Array.isArray(x.roster)?x.roster:[],createdAt:s(prop_(x,['createdAt','Created At']))||oldx.createdAt||stamp,updatedAt:stamp};}).filter(Boolean);
  write_(T.TEAMS,out);
  var players=[]; out.forEach(function(t){(t.roster||[]).forEach(function(x,j){if(!x)return;var name=s(prop_(x,['name','playerName','Player Name'])),uid=s(prop_(x,['uid','UID'])),logo=s(prop_(x,['playerLogoUrl','Player Logo URL']));if(!name&&!uid&&!logo)return;players.push({playerId:s(prop_(x,['playerId','Player ID','id']))||t.teamId+'-P-'+(j+1),teamId:t.teamId,teamName:t.teamName,playerName:name,uid:uid,role:s(prop_(x,['role','Role'])),playerLogoUrl:logo,status:s(prop_(x,['status','Status']))||'Active',createdAt:s(prop_(x,['createdAt','Created At']))||stamp,updatedAt:stamp});});});
  write_(T.ROSTERS,players);
}
function saveEvents_(items){
  var old=read_(T.EVENTS),by={};old.forEach(function(e){by[s(prop_(e,['eventId','Event ID']))]=e;});var stamp=now_();
  var events=(items||[]).map(function(e){var eid=s(prop_(e,['eventId','Event ID','id'])),q=by[eid]||{};return{eventId:eid||q.eventId||uid_('EVENT'),name:s(prop_(e,['name','eventName','Name'])),organizer:s(prop_(e,['organizer','Organizer'])),teams:i(prop_(e,['teams','Team Count'])),prize:s(prop_(e,['prize','Prize','Prize Pool'])),status:s(prop_(e,['status','Status']))||'Pending',counted:s(prop_(e,['counted','Counted'])),date:s(prop_(e,['date','Date','Event Date'])),notes:s(prop_(e,['notes','Notes'])),matchesPlayed:i(prop_(e,['matchesPlayed','Matches Played'])),published:b(prop_(e,['published','Published'])),results:Array.isArray(e.results)?e.results:[],createdAt:s(prop_(e,['createdAt','Created At']))||q.createdAt||stamp,updatedAt:stamp};}).filter(function(e){return e.name;});
  write_(T.EVENTS,events);
  var results=[];events.forEach(function(e){(e.results||[]).forEach(function(x){results.push({resultId:s(prop_(x,['resultId','Result ID','id']))||uid_('RESULT'),eventId:e.eventId,eventName:e.name,teamId:s(prop_(x,['teamId','Team ID'])),teamName:s(prop_(x,['teamName','Team Name','Team','name'])),position:i(prop_(x,['position','Position','rank'])),kills:i(prop_(x,['kills','Kills'])),booyahs:i(prop_(x,['booyahs','Booyahs'])),positionPoints:n(prop_(x,['positionPoints','Position Points'])),killPoints:n(prop_(x,['killPoints','Kill Points'])),totalPoints:n(prop_(x,['totalPoints','Total Points','total','Total'])),proofUrl:s(prop_(x,['proofUrl','Proof URL','ProofURL'])),verified:b(prop_(x,['verified','Verified'])),updatedAt:stamp});});});
  write_(T.RESULTS,results);
}
function rebuildRankings_(){
  var ts=teams_(),rs=read_(T.RESULTS),m={};ts.forEach(function(t){m[t.teamId]={teamId:t.teamId,teamName:t.teamName,slug:t.slug,eventsPlayed:0,championships:0,runnerUp:0,secondRunnerUp:0,top5Finishes:0,kills:0,booyahs:0,positionPoints:0,totalPoints:0,matchesPlayed:0,grandFinals:0};});
  var ev={};rs.forEach(function(r){var tid=s(prop_(r,['teamId','Team ID']));if(!m[tid])return;var a=m[tid],eid=s(prop_(r,['eventId','Event ID']));if(!ev[eid])ev[eid]={};if(!ev[eid][tid]){ev[eid][tid]=1;a.eventsPlayed++;}var p=i(prop_(r,['position','Position','rank']));a.kills+=i(prop_(r,['kills','Kills']));a.booyahs+=i(prop_(r,['booyahs','Booyahs']));a.positionPoints+=n(prop_(r,['positionPoints','Position Points']));a.totalPoints+=n(prop_(r,['totalPoints','Total Points','total','Total']));if(p===1)a.championships++;if(p===2)a.runnerUp++;if(p===3)a.secondRunnerUp++;if(p<=5&&p>0)a.top5Finishes++;if(p<=18&&p>0)a.grandFinals++;});
  var a=Object.keys(m).map(function(k){var x=m[k];x.communityScore=x.championships*100+x.runnerUp*70+x.secondRunnerUp*50+x.top5Finishes*10;x.winRate=x.eventsPlayed?x.championships/x.eventsPlayed*100:0;x.killRatio=x.matchesPlayed?x.kills/x.matchesPlayed:0;x.booyahRatio=x.matchesPlayed?x.booyahs/x.matchesPlayed*100:0;x.eligible=true;x.status='Active';x.updatedAt=now_();return x;});
  a.sort(function(x,y){return y.communityScore-x.communityScore||y.totalPoints-x.totalPoints||y.kills-x.kills||x.teamName.localeCompare(y.teamName);});a.forEach(function(x,j){x.rank=j+1;});write_(T.RANKINGS,a);return a;
}

function accountRows_(){return read_(T.ACCOUNTS);}
function login_(p){var u=s(p.username).toLowerCase(),hash=s(p.passwordHash),a=accountRows_().find(function(x){return s(prop_(x,['username','Username'])).toLowerCase()===u;});if(!a||s(prop_(a,['status','Status'])).toLowerCase()==='disabled'||s(prop_(a,['passwordHash','PasswordHash']))!==hash)throw new Error('Invalid team username or password.');return ok_({username:u,teamSlug:s(prop_(a,['teamSlug','TeamSlug'])),email:s(prop_(a,['email','Email'])),message:'Login successful.'});}
function register_(p){var u=s(p.username).toLowerCase(),hash=s(p.passwordHash),name=s(p.teamName),email=s(p.email).toLowerCase();if(!u||!hash||name.length<2)throw new Error('Username, password and team name are required.');var a=accountRows_();if(a.some(function(x){return s(prop_(x,['username','Username'])).toLowerCase()===u;}))throw new Error('Username is already registered.');var ts=teams_(),sl=slug_(name),base=sl,z=2;while(ts.some(function(t){return t.slug===sl;}))sl=base+'-'+z++;var stamp=now_();ts.push({teamId:uid_('TN'),teamName:name,slug:sl,logoUrl:'',bannerUrl:'',description:'',mobileNumber:'',status:'Active',registrationStatus:'Registered',roster:[],createdAt:stamp,updatedAt:stamp});saveTeams_(ts);a.push({username:u,passwordHash:hash,teamSlug:sl,email:email,status:'Active',createdAt:stamp,updatedAt:stamp});write_(T.ACCOUNTS,a);invalidate_();return ok_({username:u,teamSlug:sl,teamName:name,message:'Team account created successfully.'});}
function changePassword_(p){var u=s(p.username).toLowerCase(),a=accountRows_(),x=a.find(function(v){return s(prop_(v,['username','Username'])).toLowerCase()===u;});if(!x)throw new Error('Team account not found.');if(s(prop_(x,['passwordHash','PasswordHash']))!==s(p.currentPasswordHash))throw new Error('Current password is incorrect.');x.passwordHash=s(p.newPasswordHash);x.updatedAt=now_();write_(T.ACCOUNTS,a);invalidate_();return ok_({message:'Password changed successfully.'});}
function resetPassword_(p){var u=s(p.username).toLowerCase(),email=s(p.email).toLowerCase(),a=accountRows_(),x=a.find(function(v){return s(prop_(v,['username','Username'])).toLowerCase()===u&&s(prop_(v,['email','Email'])).toLowerCase()===email;});if(!x)throw new Error('Username and registered email do not match.');x.passwordHash=s(p.passwordHash);x.updatedAt=now_();write_(T.ACCOUNTS,a);invalidate_();return ok_({message:'Password reset successfully.'});}
function submit_(p){var rows=read_(T.SUBMISSIONS),id=uid_('SUB'),stamp=now_();rows.push({submissionId:id,username:s(p.username),teamSlug:s(p.teamSlug),team:s(p.teamName||p.teamSlug),tournamentName:s(p.tournamentName),tournamentDate:s(p.tournamentDate),organizerName:s(p.organizerName),prizePool:s(p.prizePool),finalPosition:i(p.finalPosition),finalLeaderboard:s(p.finalLeaderboard),proofUrl:s(p.proofUrl),status:'Pending',reviewNotes:'',reviewedBy:'',reviewedAt:'',createdAt:stamp});write_(T.SUBMISSIONS,rows);invalidate_();return ok_({saved:true,submissionId:id,message:'Tournament result submitted successfully.'});}
function feedbackSubmit_(p){var rows=read_(T.FEEDBACK),id=uid_('FB'),stamp=now_();rows.push({feedbackId:id,username:s(p.username),teamSlug:s(p.teamSlug),team:s(p.teamName||p.team),message:s(p.message),status:'New',adminReply:'',createdAt:s(p.timestamp)||stamp,updatedAt:stamp});write_(T.FEEDBACK,rows);invalidate_();return ok_({saved:true,feedbackId:id,message:'Feedback saved successfully.'});}
function feedbackList_(){return ok_({feedback:read_(T.FEEDBACK).reverse()});}
function feedbackStatus_(p){var rows=read_(T.FEEDBACK),id=s(p.feedbackId),status=s(p.status),allowed=['New','Reviewing','Resolved'];if(allowed.indexOf(status)<0)throw new Error('Invalid feedback status.');var found=false;rows=rows.map(function(x){if(s(prop_(x,['feedbackId','FeedbackID']))===id){found=true;x.status=status;x.adminReply=s(p.adminReply);x.updatedAt=now_();}return x;});if(!found)throw new Error('Feedback not found.');write_(T.FEEDBACK,rows);invalidate_();return ok_({message:'Feedback status updated.'});}
function uploadLogo_(dataUrl,fileName){var m=s(dataUrl).match(/^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/);if(!m)throw new Error('Invalid image data.');if(dataUrl.length>4000000)throw new Error('Image is too large.');var blob=Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],s(fileName||'tnffm-image').replace(/[^A-Za-z0-9._-]/g,'-'));var fid=s(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));var folder=fid?DriveApp.getFolderById(fid):DriveApp.getRootFolder();var file=folder.createFile(blob);file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return 'https://drive.google.com/uc?export=view&id='+file.getId();}

function incoming_(p){
  var map={teams:T.TEAMS,rosters:T.ROSTERS,rankings:T.RANKINGS,events:T.EVENTS,rankingResults:T.RESULTS,results:T.RESULTS,news:T.NEWS,collaborators:T.COLLAB,accounts:T.ACCOUNTS,submissions:T.SUBMISSIONS,feedback:T.FEEDBACK}, out={};
  Object.keys(map).forEach(function(k){if(Array.isArray(p[k]))out[map[k]]=p[k];});
  return out;
}
function writeIncoming_(section,items){
  if(section===T.TEAMS){saveTeams_(items);return;}
  if(section===T.EVENTS){saveEvents_(items);return;}
  if(section===T.RESULTS){write_(T.RESULTS,items);return;}
  write_(section,items);
}
function health(){
  var ss=book_(), counts={};Object.keys(T).forEach(function(k){var sh=sheet_(T[k],false);counts[T[k]]=Math.max(0,sh.getLastRow()-1);});
  return ok_({message:'TNFFM Apps Script backend is healthy.',spreadsheetId:ss.getId(),spreadsheetName:ss.getName(),counts:counts,cacheSeconds:CACHE_SECONDS,checkedAt:now_()});
}
function setSpreadsheetId_(value){value=s(value);if(!value)throw new Error('Spreadsheet ID required.');SpreadsheetApp.openById(value);PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',value);SS_=null;return ok_({spreadsheetId:value,message:'Spreadsheet configured.'});}

function doGet(e){
  try{
    var action=s(e&&e.parameter&&e.parameter.action);
    if(action==='health'||action==='healthCheck')return health();
    if(action==='setup'||action==='setupSheets')return setupTNFFM();
    return ok_(publicData_());
  }catch(ex){return fail_(err_(ex),'READ_FAILED');}
}
function doPost(e){
  var lock=null;
  try{
    if(!e||!e.postData||!e.postData.contents)return fail_('Empty request body.','EMPTY_BODY');
    if(e.postData.contents.length>MAX_BODY_CHARS)return fail_('Request is too large.','BODY_TOO_LARGE');
    var p=JSON.parse(e.postData.contents||'{}'), action=s(p.action);
    if(action==='health'||action==='healthCheck')return health();
    if(action==='setup'||action==='setupSheets')return setupTNFFM();
    if(action==='setSpreadsheetId')return setSpreadsheetId_(p.spreadsheetId);
    if(action==='loginTeam')return login_(p);
    if(action==='registerTeam')return register_(p);
    if(action==='changeTeamPassword')return changePassword_(p);
    if(action==='resetTeamPassword')return resetPassword_(p);
    if(action==='submitFinalLeaderboard')return submit_(p);
    if(action==='getTeamSubmissions')return ok_({submissions:read_(T.SUBMISSIONS).filter(function(x){return (!p.teamSlug||s(prop_(x,['teamSlug','TeamSlug']))===s(p.teamSlug))&&(!p.username||s(prop_(x,['username','Username'])).toLowerCase()===s(p.username).toLowerCase());})});
    if(action==='submitFeedback')return feedbackSubmit_(p);
    if(action==='listFeedback')return feedbackList_();
    if(action==='updateFeedbackStatus')return feedbackStatus_(p);
    if(action==='uploadLogo')return ok_({url:uploadLogo_(p.dataUrl,p.fileName)});

    var incoming=incoming_(p), sections=Object.keys(incoming);
    if(!sections.length)return fail_('No supported data section was supplied.','NO_SECTIONS');
    lock=LockService.getScriptLock(); lock.waitLock(20000);
    sections.forEach(function(section){writeIncoming_(section,incoming[section]);});
    if(incoming[T.TEAMS]||incoming[T.RESULTS]||incoming[T.EVENTS])rebuildRankings_();
    SpreadsheetApp.flush(); invalidate_();
    return ok_({saved:true,verified:true,readBackVerified:true,savedSections:sections,savedAt:now_(),data:publicData_()});
  }catch(ex){return fail_(err_(ex),'WRITE_FAILED');}
  finally{if(lock)try{lock.releaseLock();}catch(e){}}
}
