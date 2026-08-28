/* TNFFM COMMUNITY RANKING — CANONICAL GOOGLE APPS SCRIPT
 * One backend for the public site, Team Dashboard and Admin Dashboard.
 * Required Script Property: SPREADSHEET_ID
 * Optional Script Property: DRIVE_FOLDER_ID
 * Web App: Execute as Me + Anyone
 */
var VERSION = 'TNFFM-2026.08.28-CANONICAL-1';
var MAX_ROWS = 5000;
var MAX_BODY_CHARS = 12000000;
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

function clean_(v){ return v===null||v===undefined?'':String(v).trim(); }
function now_(){ return new Date().toISOString(); }
function num_(v){ var n=Number(v); return isFinite(n)?n:0; }
function int_(v){ return Math.max(0,Math.floor(num_(v))); }
function bool_(v){ if(v===true)return true; var s=clean_(v).toLowerCase(); return ['true','yes','1','published','active'].indexOf(s)>=0; }
function err_(e){ return e&&e.message?e.message:String(e||'Unknown error.'); }
function json_(x){ return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON); }
function ok_(x){ var o={ok:true,version:VERSION}; if(x)Object.keys(x).forEach(function(k){o[k]=x[k];}); return json_(o); }
function fail_(m,c){ return json_({ok:false,version:VERSION,code:c||'TNFFM_ERROR',message:clean_(m)||'Unknown error.'}); }
function prop_(o,names){ if(!o)return ''; for(var i=0;i<names.length;i++)if(o[names[i]]!==undefined&&o[names[i]]!==null)return o[names[i]]; return ''; }
function slugify_(v){ var s=clean_(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50); return s||'team'; }
function parse_(v){ var s=clean_(v); if(!s)return ''; if((s[0]==='['&&s[s.length-1]===']')||(s[0]==='{'&&s[s.length-1]==='}')){try{return JSON.parse(s);}catch(e){}} if(/^(true|false)$/i.test(s))return s.toLowerCase()==='true'; return s; }
function cell_(v){ if(v===null||v===undefined)return ''; if(typeof v==='object')return JSON.stringify(v); if(typeof v==='boolean')return v?'true':'false'; var s=String(v); return /^[=+\-@]/.test(s)?"'"+s:s; }
function canonical_(k){
  var m={'Team':'teamName','Team Name':'teamName','teamName':'teamName','Team ID':'teamId','TeamId':'teamId','Slug':'slug','Logo URL':'logoUrl','LogoURL':'logoUrl','Banner URL':'bannerUrl','BannerURL':'bannerUrl','Description':'description','Mobile Number':'mobileNumber','Status':'status','Registration Status':'registrationStatus','RegistrationStatus':'registrationStatus','Created At':'createdAt','CreatedAt':'createdAt','Updated At':'updatedAt','UpdatedAt':'updatedAt','Player ID':'playerId','Player Name':'playerName','UID':'uid','Role':'role','Player Logo URL':'playerLogoUrl','Rank':'rank','Events Played':'eventsPlayed','EventsPlayed':'eventsPlayed','Championships':'championships','Runner-Up':'runnerUp','RunnerUp':'runnerUp','2nd Runner-Up':'secondRunnerUp','SecondRunnerUp':'secondRunnerUp','Top 5 Finishes':'top5Finishes','Top5Finishes':'top5Finishes','Community Score':'communityScore','CommunityScore':'communityScore','Kills':'kills','Booyahs':'booyahs','Kill Ratio':'killRatio','KillRatio':'killRatio','Booyah Ratio':'booyahRatio','BooyahRatio':'booyahRatio','Position Points':'positionPoints','PositionPoints':'positionPoints','Kill Points':'killPoints','KillPoints':'killPoints','Total Points':'totalPoints','TotalPoints':'totalPoints','Matches Played':'matchesPlayed','MatchesPlayed':'matchesPlayed','Grand Finals':'grandFinals','GrandFinals':'grandFinals','Win Rate':'winRate','WinRate':'winRate','Eligible':'eligible','Event ID':'eventId','EventId':'eventId','Name':'name','Event Name':'eventName','Organizer':'organizer','Teams':'teams','Prize':'prize','Prize Pool':'prizePool','Counted':'counted','Date':'date','Event Date':'date','Notes':'notes','Published':'published','Results':'results','ID':'id','Title':'title','Type':'type','ImageURL':'imageUrl','Image URL':'imageUrl','Link':'link','Result ID':'resultId','Position':'position','Total':'total','Proof URL':'proofUrl','ProofURL':'proofUrl','Verified':'verified','Username':'username','PasswordHash':'passwordHash','Email':'email','SubmissionID':'submissionId','Submission Id':'submissionId','TournamentName':'tournamentName','TournamentDate':'tournamentDate','OrganizerName':'organizerName','FinalPosition':'finalPosition','FinalLeaderboard':'finalLeaderboard','ReviewNotes':'reviewNotes','ReviewedBy':'reviewedBy','ReviewedAt':'reviewedAt','FeedbackID':'feedbackId','Message':'message','AdminReply':'adminReply','Contact':'contact','Website':'website','Instagram':'instagram','Collaborator ID':'collaboratorId'};
  return m[clean_(k)]||clean_(k);
}
function getSpreadsheet_(){
  var id=clean_(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  if(id){ try{return SpreadsheetApp.openById(id);}catch(e){throw new Error('Configured SPREADSHEET_ID could not be opened: '+err_(e));} }
  var active=SpreadsheetApp.getActiveSpreadsheet();
  if(active)return active;
  throw new Error('Google Sheet is not configured. Set Script Property SPREADSHEET_ID.');
}
function getSheet_(name){ var ss=getSpreadsheet_(); return ss.getSheetByName(name)||ss.insertSheet(name); }
function ensureSheet_(s,h){ if(s.getMaxColumns()<h.length)s.insertColumnsAfter(s.getMaxColumns(),h.length-s.getMaxColumns()); s.getRange(1,1,1,h.length).setValues([h]); s.setFrozenRows(1); }
function readRows_(s){ if(!s||s.getLastRow()<2||s.getLastColumn()<1)return[]; var n=Math.min(s.getLastRow()-1,MAX_ROWS-1); return s.getRange(2,1,n,s.getLastColumn()).getDisplayValues(); }
function readSection_(name){
  var s=getSheet_(name), h=HEADERS[name]||[]; ensureSheet_(s,h); if(!h.length)return[];
  var rows=readRows_(s), out=[];
  rows.forEach(function(r){ if(!r.some(function(v){return clean_(v)!=='';}))return; var o={}; h.forEach(function(k,i){o[k]=parse_(r[i]);}); Object.keys(o).forEach(function(k){var c=canonical_(k); if(o[c]===undefined)o[c]=o[k];}); out.push(o); });
  return out;
}
function clearData_(s){ if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,Math.max(1,s.getLastColumn())).clearContent(); }
function writeRows_(name,items){
  if(!Array.isArray(items))throw new Error(name+' must be an array.');
  if(items.length>MAX_ROWS-1)throw new Error(name+' exceeds the '+(MAX_ROWS-1)+' row limit.');
  var s=getSheet_(name), h=HEADERS[name]||['ID']; ensureSheet_(s,h); clearData_(s);
  if(!items.length)return;
  var data=items.map(function(item){return h.map(function(k){var v=item[k];if(v===undefined)v=item[canonical_(k)];return cell_(v);});});
  s.getRange(2,1,data.length,h.length).setValues(data);
}
function ensureAll_(){ var ss=getSpreadsheet_(); Object.keys(HEADERS).forEach(function(k){ensureSheet_(ss.getSheetByName(HEADERS[k]||k)||ss.insertSheet(HEADERS[k]||k),HEADERS[HEADERS[k]||k]||[]);}); }
function id_(prefix){ return prefix+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase(); }
function findBy_(arr,key,value){ value=clean_(value).toLowerCase(); for(var i=0;i<arr.length;i++)if(clean_(prop_(arr[i],key)).toLowerCase()===value)return arr[i]; return null; }

function readRosters_(){
  var out={}; readSection_(TABS.ROSTERS).forEach(function(p){var id=clean_(prop_(p,['teamId','Team ID']));if(!id)return;if(!out[id])out[id]=[];out[id].push({playerId:clean_(prop_(p,['playerId','Player ID'])),name:clean_(prop_(p,['playerName','Player Name','name'])),uid:clean_(prop_(p,['uid','UID'])),role:clean_(prop_(p,['role','Role'])),playerLogoUrl:clean_(prop_(p,['playerLogoUrl','Player Logo URL'])),status:clean_(prop_(p,['status','Status']))||'Active',createdAt:clean_(prop_(p,['createdAt','Created At'])),updatedAt:clean_(prop_(p,['updatedAt','Updated At']))});}); return out;
}
function readTeams_(){
  var roster=readRosters_(); return readSection_(TABS.TEAMS).map(function(t){var id=clean_(prop_(t,['teamId','Team ID']));var name=clean_(prop_(t,['teamName','Team Name','Team']));return{teamId:id,teamName:name,slug:clean_(prop_(t,['slug','Slug']))||slugify_(name),logoUrl:clean_(prop_(t,['logoUrl','Logo URL','LogoURL'])),bannerUrl:clean_(prop_(t,['bannerUrl','Banner URL'])),description:clean_(prop_(t,['description','Description'])),mobileNumber:clean_(prop_(t,['mobileNumber','Mobile Number'])),status:clean_(prop_(t,['status','Status']))||'Active',registrationStatus:clean_(prop_(t,['registrationStatus','Registration Status']))||'Registered',players:(roster[id]||[]).length,roster:roster[id]||[],createdAt:clean_(prop_(t,['createdAt','Created At'])),lastUpdated:clean_(prop_(t,['updatedAt','Updated At','lastUpdated']))};}).filter(function(t){return t.teamName;});
}
function writeTeams_(items){
  var existing=readTeams_(), byId={}, byName={}; existing.forEach(function(t){byId[t.teamId]=t;byName[t.teamName.toLowerCase()]=t;}); var used={};
  var teams=(items||[]).filter(Boolean).map(function(raw){
    var name=clean_(prop_(raw,['teamName','Team Name','Team','team'])); if(!name)return null;
    var supplied=clean_(prop_(raw,['teamId','Team ID','id'])); var prior=byId[supplied]||byName[name.toLowerCase()]||{}; var slug=clean_(prop_(raw,['slug','Slug']))||prior.slug||slugify_(name); var base=slug,n=2; while(used[slug.toLowerCase()])slug=base+'-'+n++; used[slug.toLowerCase()]=true;
    return{teamId:supplied||prior.teamId||id_('TN'),teamName:name,slug:slug,logoUrl:clean_(prop_(raw,['logoUrl','Logo URL','LogoURL'])),bannerUrl:clean_(prop_(raw,['bannerUrl','Banner URL'])),description:clean_(prop_(raw,['description','Description'])),mobileNumber:clean_(prop_(raw,['mobileNumber','Mobile Number'])),status:clean_(prop_(raw,['status','Status']))||'Active',registrationStatus:clean_(prop_(raw,['registrationStatus','Registration Status']))||'Registered',roster:Array.isArray(raw.roster)?raw.roster:[],createdAt:clean_(prop_(raw,['createdAt','Created At']))||prior.createdAt||now_()};
  }).filter(Boolean);
  writeRows_(TABS.TEAMS,teams); var rosterRows=[]; teams.forEach(function(t){(t.roster||[]).forEach(function(p,i){var name=clean_(prop_(p,['name','playerName','Player Name'])),uid=clean_(prop_(p,['uid','UID'])),logo=clean_(prop_(p,['playerLogoUrl','Player Logo URL','PlayerLogoURL']));if(!name&&!uid&&!logo)return;rosterRows.push({playerId:clean_(prop_(p,['playerId','Player ID','id']))||t.teamId+'-P-'+(i+1),teamId:t.teamId,teamName:t.teamName,playerName:name,uid:uid,role:clean_(prop_(p,['role','Role'])),playerLogoUrl:logo,status:clean_(prop_(p,['status','Status']))||'Active',createdAt:clean_(prop_(p,['createdAt','Created At']))||now_(),updatedAt:now_()});});}); writeRows_(TABS.ROSTERS,rosterRows); }

function normalizeEvent_(e,existing){ var id=clean_(prop_(e,['eventId','Event ID','id']))||id_('EVENT'); var r=existing||{}; var results=Array.isArray(e.results)?e.results:(Array.isArray(r.results)?r.results:[]); return{eventId:id,name:clean_(prop_(e,['name','eventName','Name'])),organizer:clean_(prop_(e,['organizer','Organizer'])),teams:int_(prop_(e,['teams','Team Count'])),prize:clean_(prop_(e,['prize','Prize','Prize Pool'])),status:clean_(prop_(e,['status','Status']))||'Pending',counted:clean_(prop_(e,['counted','Counted'])),date:clean_(prop_(e,['date','Date','eventDate','Event Date'])),notes:clean_(prop_(e,['notes','Notes'])),matchesPlayed:int_(prop_(e,['matchesPlayed','Matches Played'])),published:bool_(prop_(e,['published','Published'])),results:results,createdAt:clean_(prop_(e,['createdAt','Created At']))||r.createdAt||now_(),updatedAt:now_()}; }
function writeEvents_(items){ var old=readSection_(TABS.EVENTS),byId={}; old.forEach(function(e){byId[clean_(prop_(e,['eventId','Event ID']))]=e;}); var out=(items||[]).map(function(e){return normalizeEvent_(e,byId[clean_(prop_(e,['eventId','Event ID','id']))]);}).filter(function(e){return e.name;}); writeRows_(TABS.EVENTS,out); var results=[]; out.forEach(function(e){(e.results||[]).forEach(function(r){results.push({resultId:clean_(prop_(r,['resultId','Result ID','id']))||id_('RESULT'),eventId:e.eventId,eventName:e.name,teamId:clean_(prop_(r,['teamId','Team ID'])),teamName:clean_(prop_(r,['teamName','Team Name','Team','name'])),position:int_(prop_(r,['position','Position','rank'])),kills:int_(prop_(r,['kills','Kills'])),booyahs:int_(prop_(r,['booyahs','Booyahs'])),positionPoints:num_(prop_(r,['positionPoints','Position Points'])),killPoints:num_(prop_(r,['killPoints','Kill Points'])),totalPoints:num_(prop_(r,['totalPoints','Total Points','total','Total'])),proofUrl:clean_(prop_(r,['proofUrl','Proof URL','ProofURL'])),verified:bool_(prop_(r,['verified','Verified'])),updatedAt:now_()});});}); writeRows_(TABS.RESULTS,results); }
function writeResults_(items){ var old=readSection_(TABS.RESULTS); var out=(items||[]).map(function(r){var id=clean_(prop_(r,['resultId','Result ID','id']))||id_('RESULT');return{resultId:id,eventId:clean_(prop_(r,['eventId','Event ID'])),eventName:clean_(prop_(r,['eventName','Event Name'])),teamId:clean_(prop_(r,['teamId','Team ID'])),teamName:clean_(prop_(r,['teamName','Team Name','Team'])),position:int_(prop_(r,['position','Position','rank'])),kills:int_(prop_(r,['kills','Kills'])),booyahs:int_(prop_(r,['booyahs','Booyahs'])),positionPoints:num_(prop_(r,['positionPoints','Position Points'])),killPoints:num_(prop_(r,['killPoints','Kill Points'])),totalPoints:num_(prop_(r,['totalPoints','Total Points','total','Total'])),proofUrl:clean_(prop_(r,['proofUrl','Proof URL','ProofURL'])),verified:bool_(prop_(r,['verified','Verified'])),updatedAt:now_()};}); writeRows_(TABS.RESULTS,out); }
function writeNews_(items){ writeRows_(TABS.NEWS,(items||[]).map(function(n){return{id:clean_(prop_(n,['id','ID']))||id_('NEWS'),title:clean_(prop_(n,['title','Title'])),description:clean_(prop_(n,['description','Description'])),date:clean_(prop_(n,['date','Date'])),type:clean_(prop_(n,['type','Type'])),status:clean_(prop_(n,['status','Status']))||'Published',imageUrl:clean_(prop_(n,['imageUrl','ImageURL','Image URL'])),link:clean_(prop_(n,['link','Link'])),updatedAt:now_()};})); }
function writeCollab_(items){ writeRows_(TABS.COLLAB,(items||[]).map(function(c){return{collaboratorId:clean_(prop_(c,['collaboratorId','Collaborator ID','id']))||id_('COLLAB'),name:clean_(prop_(c,['name','Name'])),role:clean_(prop_(c,['role','Role'])),status:clean_(prop_(c,['status','Status']))||'Active',contact:clean_(prop_(c,['contact','Contact'])),logoUrl:clean_(prop_(c,['logoUrl','LogoURL','logo'])),website:clean_(prop_(c,['website','Website','url'])),instagram:clean_(prop_(c,['instagram','Instagram'])),updatedAt:now_()};})); }

function rebuildRankings_(){
  var teams=readTeams_(), results=readSection_(TABS.RESULTS), by={};
  teams.forEach(function(t){by[t.teamId||t.slug]={teamId:t.teamId,teamName:t.teamName,slug:t.slug,eventsPlayed:0,championships:0,runnerUp:0,secondRunnerUp:0,top5Finishes:0,kills:0,booyahs:0,positionPoints:0,totalPoints:0,matchesPlayed:0,grandFinals:0};});
  var eventTeams={}; results.forEach(function(r){var tid=clean_(prop_(r,['teamId','Team ID'])), name=clean_(prop_(r,['teamName','Team Name','Team'])); var key=tid&&by[tid]?tid:null; if(!key){for(var k in by)if(by[k].teamName.toLowerCase()===name.toLowerCase()){key=k;break;}} if(!key)return; var a=by[key],pos=int_(prop_(r,['position','Position','rank'])); if(!eventTeams[clean_(prop_(r,['eventId','Event ID']))])eventTeams[clean_(prop_(r,['eventId','Event ID']))]={}; if(!eventTeams[clean_(prop_(r,['eventId','Event ID']))][key]){eventTeams[clean_(prop_(r,['eventId','Event ID']))][key]=true;a.eventsPlayed++;} a.kills+=int_(prop_(r,['kills','Kills']));a.booyahs+=int_(prop_(r,['booyahs','Booyahs']));a.positionPoints+=num_(prop_(r,['positionPoints','Position Points']));a.totalPoints+=num_(prop_(r,['totalPoints','Total Points','total','Total'])); if(pos===1)a.championships++; if(pos===2)a.runnerUp++; if(pos===3)a.secondRunnerUp++; if(pos>=1&&pos<=5)a.top5Finishes++; if(pos<=18)a.grandFinals++; });
  var arr=Object.keys(by).map(function(k){var a=by[k];a.communityScore=a.championships*100+a.runnerUp*70+a.secondRunnerUp*50+a.top5Finishes*10;a.winRate=a.eventsPlayed?a.championships/a.eventsPlayed*100:0;a.killRatio=a.matchesPlayed?a.kills/a.matchesPlayed:0;a.booyahRatio=a.matchesPlayed?a.booyahs/a.matchesPlayed*100:0;a.eligible=true;a.status='Active';return a;});
  arr.sort(function(a,b){return b.communityScore-a.communityScore||b.totalPoints-a.totalPoints||b.kills-a.kills||a.teamName.localeCompare(b.teamName);});
  arr.forEach(function(a,i){a.rank=i+1;});
  writeRows_(TABS.RANKINGS,arr);
  return arr;
}

function readAll_(){ var rr=readSection_(TABS.RESULTS); return{teams:readTeams_(),rankings:readSection_(TABS.RANKINGS),events:readSection_(TABS.EVENTS),rankingResults:rr,results:rr,news:readSection_(TABS.NEWS),collaborators:readSection_(TABS.COLLAB),accounts:readSection_(TABS.ACCOUNTS),submissions:readSection_(TABS.SUBMISSIONS),feedback:readSection_(TABS.FEEDBACK),serverTime:now_(),version:VERSION}; }
function verifyKeys_(section,expected,actual){ if(!Array.isArray(actual))throw new Error(section+' read-back is not an array.'); var key=function(x){ if(section==='teams')return clean_(prop_(x,['teamId','Team ID']))||clean_(prop_(x,['teamName','Team Name'])).toLowerCase(); if(section==='events')return clean_(prop_(x,['eventId','Event ID']))||clean_(prop_(x,['name','Name'])).toLowerCase(); if(section==='collaborators')return clean_(prop_(x,['collaboratorId','Collaborator ID','id']))||clean_(prop_(x,['name','Name'])).toLowerCase(); if(section==='rankingResults')return clean_(prop_(x,['resultId','Result ID','id'])); return clean_(prop_(x,['id','ID']))||clean_(prop_(x,['username','Username']));}; var have={};actual.forEach(function(x){have[key(x)]=true;});(expected||[]).forEach(function(x){var k=key(x);if(k&&!have[k])throw new Error(section+' write verification failed for '+k);}); }

function actionLogin_(p){ var a=readSection_(TABS.ACCOUNTS),u=clean_(p.username).toLowerCase(),h=clean_(p.passwordHash),found=a.find(function(x){return clean_(prop_(x,['username','Username'])).toLowerCase()===u;}); if(!found||clean_(prop_(found,['passwordHash','PasswordHash']))!==h||clean_(prop_(found,['status','Status'])).toLowerCase()==='disabled')throw new Error('Invalid team username or password.'); return ok_({username:u,teamSlug:clean_(prop_(found,['teamSlug','TeamSlug'])),email:clean_(prop_(found,['email','Email']))}); }
function actionRegister_(p){ var lock=LockService.getScriptLock(); lock.waitLock(25000); try{var u=clean_(p.username).toLowerCase(),email=clean_(p.email).toLowerCase(),name=clean_(p.teamName),h=clean_(p.passwordHash); if(!/^[a-z0-9._-]{4,32}$/.test(u))throw new Error('Invalid username.');if(!h||h.length<20)throw new Error('Password hash is required.');if(name.length<2||name.length>60)throw new Error('Invalid team name.');var accounts=readSection_(TABS.ACCOUNTS),teams=readTeams_();if(accounts.some(function(x){return clean_(prop_(x,['username','Username'])).toLowerCase()===u;}))throw new Error('Username is already registered.');if(teams.some(function(x){return x.teamName.toLowerCase()===name.toLowerCase();}))throw new Error('Team name is already registered.');var slug=slugify_(name),base=slug,n=2,slugs={};teams.forEach(function(t){slugs[t.slug]=1;});while(slugs[slug])slug=base+'-'+n++;var team={teamId:id_('TN'),teamName:name,slug:slug,logoUrl:'',bannerUrl:'',description:'',mobileNumber:'',status:'Active',registrationStatus:'Registered',roster:[],createdAt:now_()};teams.push(team);writeTeams_(teams);accounts.push({username:u,passwordHash:h,teamSlug:slug,email:email,status:'Active',createdAt:now_(),updatedAt:now_()});writeRows_(TABS.ACCOUNTS,accounts);return ok_({username:u,teamSlug:slug,teamName:name,message:'Team account created successfully.'});}finally{lock.releaseLock();} }
function actionChangePassword_(p){var a=readSection_(TABS.ACCOUNTS),u=clean_(p.username).toLowerCase(),x=a.find(function(v){return clean_(prop_(v,['username','Username'])).toLowerCase()===u;});if(!x||clean_(prop_(x,['passwordHash','PasswordHash']))!==clean_(p.currentPasswordHash))throw new Error('Current password is incorrect.');x.passwordHash=clean_(p.newPasswordHash);x.updatedAt=now_();writeRows_(TABS.ACCOUNTS,a);return ok_({message:'Password changed successfully.'});}
function actionResetPassword_(p){var a=readSection_(TABS.ACCOUNTS),u=clean_(p.username).toLowerCase(),email=clean_(p.email).toLowerCase(),x=a.find(function(v){return clean_(prop_(v,['username','Username'])).toLowerCase()===u;});if(!x||clean_(prop_(x,['email','Email'])).toLowerCase()!==email)throw new Error('Username and registered email do not match.');x.passwordHash=clean_(p.passwordHash);x.updatedAt=now_();writeRows_(TABS.ACCOUNTS,a);return ok_({message:'Password reset successfully.'});}
function actionSubmissions_(p){var a=readSection_(TABS.SUBMISSIONS),u=clean_(p.username).toLowerCase(),slug=clean_(p.teamSlug);var existing=a.find(function(x){return clean_(prop_(x,['username','Username'])).toLowerCase()===u&&clean_(prop_(x,['tournamentName','TournamentName'])).toLowerCase()===clean_(p.tournamentName).toLowerCase()&&clean_(prop_(x,['tournamentDate','TournamentDate']))===clean_(p.tournamentDate);});var item={submissionId:existing?clean_(prop_(existing,['submissionId','SubmissionID'])):id_('SUB'),username:u,teamSlug:slug,team:clean_(p.teamName)||slug,tournamentName:clean_(p.tournamentName),tournamentDate:clean_(p.tournamentDate),organizerName:clean_(p.organizerName),prizePool:clean_(p.prizePool),finalPosition:int_(p.finalPosition),finalLeaderboard:clean_(p.finalLeaderboard),proofUrl:clean_(p.proofUrl),status:existing?clean_(prop_(existing,['status','Status']))||'Pending':'Pending',reviewNotes:existing?clean_(prop_(existing,['reviewNotes','ReviewNotes'])):'',reviewedBy:existing?clean_(prop_(existing,['reviewedBy','ReviewedBy'])):'',reviewedAt:existing?clean_(prop_(existing,['reviewedAt','ReviewedAt'])):'',createdAt:existing?clean_(prop_(existing,['createdAt','CreatedAt'])):now_()};if(existing){a=a.map(function(x){return clean_(prop_(x,['submissionId','SubmissionID']))===item.submissionId?item:x;});}else a.push(item);writeRows_(TABS.SUBMISSIONS,a);return ok_({message:'Tournament submission saved successfully.',submission:item});}
function actionFeedbackSubmit_(p){var a=readSection_(TABS.FEEDBACK),item={feedbackId:clean_(p.feedbackId)||id_('FB'),username:clean_(p.username).toLowerCase(),teamSlug:clean_(p.teamSlug),team:clean_(p.teamName),message:clean_(p.message),status:'New',adminReply:'',createdAt:clean_(p.timestamp)||now_(),updatedAt:now_()};a.push(item);writeRows_(TABS.FEEDBACK,a);return ok_({message:'Feedback sent successfully.',feedback:item});}
function actionFeedbackList_(){return ok_({feedback:readSection_(TABS.FEEDBACK)});}
function actionFeedbackStatus_(p){var a=readSection_(TABS.FEEDBACK),id=clean_(p.feedbackId),status=clean_(p.status);if(['New','Reviewing','Resolved'].indexOf(status)<0)throw new Error('Invalid feedback status.');var found=false;a=a.map(function(x){if(clean_(prop_(x,['feedbackId','FeedbackID']))===id){found=true;x.status=status;x.updatedAt=now_();}return x;});if(!found)throw new Error('Feedback record not found.');writeRows_(TABS.FEEDBACK,a);return ok_({message:'Feedback status updated.',feedbackId:id,status:status});}
function actionTeamSubmissions_(p){var a=readSection_(TABS.SUBMISSIONS),u=clean_(p.username).toLowerCase(),slug=clean_(p.teamSlug);return ok_({submissions:a.filter(function(x){return clean_(prop_(x,['username','Username'])).toLowerCase()===u||clean_(prop_(x,['teamSlug','TeamSlug'])).toLowerCase()===slug;})});}
function uploadLogo_(dataUrl,fileName){if(typeof dataUrl!=='string'||dataUrl.indexOf('data:image/')!==0)throw new Error('Invalid image data.');if(dataUrl.length>4000000)throw new Error('Image is too large.');var m=dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);if(!m)throw new Error('Invalid image format.');var blob=Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],clean_(fileName||'tnffm-image').replace(/[^a-zA-Z0-9._-]/g,'-'));var folderId=clean_(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));var folder=folderId?DriveApp.getFolderById(folderId):DriveApp.getRootFolder();var file=folder.createFile(blob);file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);return'https://drive.google.com/uc?export=view&id='+file.getId();}
function healthCheck(){var ss=getSpreadsheet_();ensureAll_();var counts={};Object.keys(TABS).forEach(function(k){var s=ss.getSheetByName(TABS[k]);counts[TABS[k]]=s&&s.getLastRow()>1?s.getLastRow()-1:0;});return ok_({message:'TNFFM Apps Script backend is healthy.',spreadsheetId:ss.getId(),spreadsheetName:ss.getName(),counts:counts,checkedAt:now_()});}
function setupTNFFM(){ensureAll_();return ok_({message:'TNFFM Google Sheet structure is ready.',tabs:Object.keys(TABS).map(function(k){return TABS[k];})});}
function setupSheets(){return setupTNFFM();}
function setSpreadsheetId(id){id=clean_(id);if(!id)throw new Error('Spreadsheet ID required.');SpreadsheetApp.openById(id);PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',id);return ok_({spreadsheetId:id,message:'Spreadsheet configured.'});}
function onOpen(){try{ensureAll_();}catch(e){console.log(err_(e));}}
function doGet(e){try{var action=clean_(e&&e.parameter&&e.parameter.action);if(action==='health'||action==='healthCheck')return healthCheck();if(action==='setup'||action==='setupSheets')return setupTNFFM();return ok_(readAll_());}catch(e){console.error(e);return fail_(err_(e),'READ_FAILED');}}
function doPost(e){
  var lock=null;
  try{
    if(!e||!e.postData||!e.postData.contents)return fail_('Empty request body.','EMPTY_BODY');
    if(e.postData.contents.length>MAX_BODY_CHARS)return fail_('Request is too large.','BODY_TOO_LARGE');
    var p;try{p=JSON.parse(e.postData.contents);}catch(x){return fail_('Request body is not valid JSON.','INVALID_JSON');}
    if(!p||typeof p!=='object'||Array.isArray(p))return fail_('Request body must be a JSON object.','INVALID_PAYLOAD');
    var action=clean_(p.action);
    if(action==='health'||action==='healthCheck')return healthCheck();
    if(action==='setup'||action==='setupSheets')return setupTNFFM();
    if(action==='setSpreadsheetId')return setSpreadsheetId(p.spreadsheetId);
    if(action==='uploadLogo')return ok_({url:uploadLogo_(p.dataUrl,p.fileName)});
    if(action==='loginTeam')return actionLogin_(p);
    if(action==='registerTeam')return actionRegister_(p);
    if(action==='changeTeamPassword')return actionChangePassword_(p);
    if(action==='resetTeamPassword')return actionResetPassword_(p);
    if(action==='submitFinalLeaderboard')return actionSubmissions_(p);
    if(action==='getTeamSubmissions')return actionTeamSubmissions_(p);
    if(action==='submitFeedback')return actionFeedbackSubmit_(p);
    if(action==='listFeedback')return actionFeedbackList_();
    if(action==='updateFeedbackStatus')return actionFeedbackStatus_(p);

    lock=LockService.getScriptLock(); lock.waitLock(25000); ensureAll_();
    var sections=[];
    if(Array.isArray(p.teams)){writeTeams_(p.teams);sections.push('teams');}
    if(Array.isArray(p.events)){writeEvents_(p.events);sections.push('events','rankingResults');}
    if(Array.isArray(p.rankingResults)){writeResults_(p.rankingResults);sections.push('rankingResults');}
    else if(Array.isArray(p.results)){writeResults_(p.results);sections.push('rankingResults');}
    if(Array.isArray(p.rankings)){writeRows_(TABS.RANKINGS,p.rankings);sections.push('rankings');}
    else if(Array.isArray(p.teams)||Array.isArray(p.events)||Array.isArray(p.rankingResults)||Array.isArray(p.results)){rebuildRankings_();sections.push('rankings');}
    if(Array.isArray(p.news)){writeNews_(p.news);sections.push('news');}
    if(Array.isArray(p.collaborators)){writeCollab_(p.collaborators);sections.push('collaborators');}
    if(Array.isArray(p.accounts)){writeRows_(TABS.ACCOUNTS,p.accounts);sections.push('accounts');}
    if(Array.isArray(p.submissions)){writeRows_(TABS.SUBMISSIONS,p.submissions);sections.push('submissions');}
    if(Array.isArray(p.feedback)){writeRows_(TABS.FEEDBACK,p.feedback);sections.push('feedback');}
    if(!sections.length)return fail_('No supported data section or action was supplied.','NO_SECTIONS');
    SpreadsheetApp.flush(); var fresh=readAll_();
    if(Array.isArray(p.teams))verifyKeys_('teams',p.teams,fresh.teams);
    if(Array.isArray(p.events))verifyKeys_('events',p.events,fresh.events);
    if(Array.isArray(p.rankingResults)||Array.isArray(p.results))verifyKeys_('rankingResults',p.rankingResults||p.results,fresh.rankingResults);
    if(Array.isArray(p.news))verifyKeys_('news',p.news,fresh.news);
    if(Array.isArray(p.collaborators))verifyKeys_('collaborators',p.collaborators,fresh.collaborators);
    return ok_({saved:true,verified:true,readBackVerified:true,savedSections:sections,savedAt:now_(),eventResultsCount:fresh.rankingResults.length,rankingTeamCount:fresh.rankings.length,data:fresh});
  }catch(e){console.error(e);return fail_(err_(e),'WRITE_FAILED');}
  finally{if(lock){try{lock.releaseLock();}catch(x){}}}
}
