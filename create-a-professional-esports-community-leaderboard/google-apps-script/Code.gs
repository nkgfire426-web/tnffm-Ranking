const TEAM_HEADERS = ["Team","Slug","Logo URL","Banner URL","Players","Roster","Status","Description","LastUpdated","Mobile Number"];
const ACCOUNT_HEADERS = ["Username","PasswordHash","TeamSlug","Email","Status","CreatedAt","UpdatedAt"];
const NEWS_HEADERS = ["ID","Title","Description","Date","Type","Status","ImageURL","Link"];
const SUBMISSION_HEADERS = ["SubmissionID","Username","TeamSlug","Team","TournamentName","TournamentDate","OrganizerName","PrizePool","FinalPosition","FinalLeaderboard","ProofURL","Status","ReviewNotes","ReviewedBy","ReviewedAt","CreatedAt"];
const FEEDBACK_HEADERS = ["FeedbackID","Username","TeamSlug","Team","Message","Status","AdminReply","CreatedAt","UpdatedAt"];

function getSpreadsheet_() {
  const id = String(PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "").trim();
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error("Google Sheet is not configured. Set Script Property SPREADSHEET_ID.");
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function errorMessage_(e) {
  return String(e && e.message ? e.message : e);
}

function value_(v) {
  return v == null ? "" : v;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
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
  getOrCreateSheet_(ss, "Events");
  getOrCreateSheet_(ss, "Collaborators");
  SpreadsheetApp.flush();
  return json_({ok:true, message:"TNFFM community sheets are ready. Ranking sheet is not required."});
}

function doGet() {
  try {
    const ss = getSpreadsheet_();
    return json_({
      ok: true,
      teams: readTeams_(ss),
      events: readObjects_(ss, "Events"),
      collaborators: readObjects_(ss, "Collaborators"),
      news: readNews_(ss)
    });
  } catch (e) {
    return json_({ok:false, message:errorMessage_(e)});
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ok:false,message:"Request body is missing."});
    const body = JSON.parse(e.postData.contents || "{}");
    const ss = getSpreadsheet_();
    const action = String(body.action || "");

    switch (action) {
      case "setup": return setupTNFFM();
      case "registerTeam": return registerTeam_(ss, body);
      case "loginTeam": return loginTeam_(ss, body);
      case "getTeam": return getTeam_(ss, body);
      case "updateTeamProfile": return updateTeamProfile_(ss, body);
      case "changeTeamPassword": return changeTeamPassword_(ss, body);
      case "resetTeamPassword": return resetTeamPassword_(ss, body);
      case "uploadLogo": return uploadLogo_(ss, body);
      case "submitFinalLeaderboard": return submitFinalLeaderboard_(ss, body);
      case "getTeamSubmissions": return getTeamSubmissions_(ss, body);
      case "submitFeedback": return submitFeedback_(ss, body);
      case "addNews": return addNews_(ss, body);
      case "save":
      case "sync":
      case "saveAll":
        return saveAll_(ss, body);
    }

    if (Array.isArray(body.teams)) writeTeams_(ss, body.teams);
    if (Array.isArray(body.events)) writeObjects_(ss, "Events", body.events);
    if (Array.isArray(body.collaborators)) writeObjects_(ss, "Collaborators", body.collaborators);
    if (Array.isArray(body.news)) writeObjects_(ss, "TournamentNews", body.news);
    SpreadsheetApp.flush();
    return json_({ok:true,message:"TNFFM data updated successfully."});
  } catch (e) {
    return json_({ok:false,message:errorMessage_(e)});
  }
}

function saveAll_(ss, b) {
  if (Array.isArray(b.teams)) writeTeams_(ss,b.teams);
  if (Array.isArray(b.events)) writeObjects_(ss,"Events",b.events);
  if (Array.isArray(b.collaborators)) writeObjects_(ss,"Collaborators",b.collaborators);
  if (Array.isArray(b.news)) writeObjects_(ss,"TournamentNews",b.news);
  SpreadsheetApp.flush();
  return json_({ok:true,message:"TNFFM data saved successfully."});
}

function registerTeam_(ss,b) {
  const teamName=String(b.teamName||"").trim().replace(/\s+/g," ");
  const username=String(b.username||"").trim().toLowerCase();
  const hash=String(b.passwordHash||"").trim();
  const email=String(b.email||"").trim().toLowerCase();
  if(teamName.length<2||teamName.length>60)return json_({ok:false,message:"Team name must be between 2 and 60 characters."});
  if(!/^[a-z0-9._-]{4,32}$/.test(username))return json_({ok:false,message:"Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen."});
  if(!hash)return json_({ok:false,message:"Password is required."});

  const accounts=getOrCreateSheet_(ss,"TeamAccounts");
  ensureHeaders_(accounts,ACCOUNT_HEADERS);
  const accountRows=accounts.getDataRange().getValues();
  for(let i=1;i<accountRows.length;i++)if(String(accountRows[i][0]||"").trim().toLowerCase()===username)return json_({ok:false,message:"Username is already registered."});

  const teams=readTeams_(ss);
  if(teams.some(t=>String(t.teamName||"").trim().toLowerCase()===teamName.toLowerCase()))return json_({ok:false,message:"A team with this name already exists."});
  const slug=createUniqueSlug_(teamName,teams);
  const now=new Date().toISOString();
  teams.push({teamName:teamName,slug:slug,logoUrl:"",bannerUrl:"",players:0,roster:[],status:"Active",description:"",lastUpdated:now,mobileNumber:""});
  writeTeams_(ss,teams);
  accounts.appendRow([username,hash,slug,email,"Active",now,now]);
  SpreadsheetApp.flush();
  return json_({ok:true,status:"Active",username:username,teamSlug:slug,teamName:teamName,message:"Team account created successfully."});
}

function findAccount_(ss,username) {
  const sheet=ss.getSheetByName("TeamAccounts");
  if(!sheet||sheet.getLastRow()<2)return null;
  const u=String(username||"").trim().toLowerCase();
  const rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++)if(String(rows[i][0]||"").trim().toLowerCase()===u)return {username:String(rows[i][0]||""),passwordHash:String(rows[i][1]||""),teamSlug:String(rows[i][2]||""),email:String(rows[i][3]||""),status:String(rows[i][4]||"Active")};
  return null;
}

function loginTeam_(ss,b) {
  const username=String(b.username||"").trim().toLowerCase();
  const hash=String(b.passwordHash||"").trim();
  const account=findAccount_(ss,username);
  if(!account)return json_({ok:false,message:"Invalid username or password."});
  if(account.status.toLowerCase()!=="active")return json_({ok:false,message:"This team account is not active."});
  if(account.passwordHash!==hash)return json_({ok:false,message:"Invalid username or password."});
  return json_({ok:true,username:account.username,teamSlug:account.teamSlug,email:account.email,status:account.status,message:"Login successful."});
}

function getTeam_(ss,b) {
  const slug=String(b.teamSlug||"").trim();
  const team=readTeams_(ss).find(t=>t.slug===slug);
  return team?json_({ok:true,team:team}):json_({ok:false,message:"Team not found."});
}

function updateTeamProfile_(ss,b) {
  const username=String(b.username||"").trim().toLowerCase();
  const slug=String(b.teamSlug||"").trim();
  const account=findAccount_(ss,username);
  if(!account||account.teamSlug!==slug||account.status.toLowerCase()!=="active")return json_({ok:false,message:"Team account is not authorized."});
  const teams=readTeams_(ss); const team=teams.find(t=>t.slug===slug);
  if(!team)return json_({ok:false,message:"Team not found."});
  if(typeof b.logoUrl==="string")team.logoUrl=b.logoUrl.trim();
  if(typeof b.bannerUrl==="string")team.bannerUrl=b.bannerUrl.trim();
  if(typeof b.description==="string")team.description=b.description.trim();
  if(typeof b.mobileNumber==="string")team.mobileNumber=b.mobileNumber.trim();
  if(Array.isArray(b.roster)){team.roster=b.roster.map(p=>({name:String(p.name||"").trim(),uid:String(p.uid||"").trim()})).filter(p=>p.name||p.uid);team.players=team.roster.length;}
  team.lastUpdated=new Date().toISOString();
  writeTeams_(ss,teams); SpreadsheetApp.flush();
  return json_({ok:true,team:team,message:"Team profile updated successfully."});
}

function changeTeamPassword_(ss,b) {
  const username=String(b.username||"").trim().toLowerCase();
  const account=findAccount_(ss,username);
  if(!account||account.status.toLowerCase()!=="active")return json_({ok:false,message:"Team account not found."});
  if(account.passwordHash!==String(b.currentPasswordHash||""))return json_({ok:false,message:"Current password is incorrect."});
  const newHash=String(b.newPasswordHash||"").trim(); if(!newHash)return json_({ok:false,message:"New password is required."});
  const sheet=ss.getSheetByName("TeamAccounts"); const rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++)if(String(rows[i][0]||"").trim().toLowerCase()===username){sheet.getRange(i+1,2).setValue(newHash);sheet.getRange(i+1,7).setValue(new Date().toISOString());SpreadsheetApp.flush();return json_({ok:true,message:"Password changed successfully."});}
  return json_({ok:false,message:"Team account not found."});
}

function resetTeamPassword_(ss,b) {
  const username=String(b.username||"").trim().toLowerCase(); const email=String(b.email||"").trim().toLowerCase();
  const account=findAccount_(ss,username); const newHash=String(b.passwordHash||"").trim();
  if(!account||account.email.toLowerCase()!==email)return json_({ok:false,message:"Username and registered email do not match."});
  if(!newHash)return json_({ok:false,message:"New password is required."});
  const sheet=ss.getSheetByName("TeamAccounts"); const rows=sheet.getDataRange().getValues();
  for(let i=1;i<rows.length;i++)if(String(rows[i][0]||"").trim().toLowerCase()===username){sheet.getRange(i+1,2).setValue(newHash);sheet.getRange(i+1,7).setValue(new Date().toISOString());SpreadsheetApp.flush();return json_({ok:true,message:"Password reset successfully."});}
  return json_({ok:false,message:"Team account not found."});
}

function createUniqueSlug_(name,teams) {
  const base=String(name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45)||"team";
  let slug=base,n=2; while(teams.some(t=>String(t.slug||"").toLowerCase()===slug))slug=base+"-"+n++; return slug;
}

function writeTeams_(ss,teams) {
  const sheet=getOrCreateSheet_(ss,"Teams"); ensureHeaders_(sheet,TEAM_HEADERS); sheet.clearContents(); sheet.getRange(1,1,1,TEAM_HEADERS.length).setValues([TEAM_HEADERS]);
  const rows=(teams||[]).map(t=>[t.teamName||t.Team||"",t.slug||t.Slug||"",t.logoUrl||t["Logo URL"]||"",t.bannerUrl||t["Banner URL"]||"",Number(t.players||t.Players||0),typeof t.roster==="string"?t.roster:JSON.stringify(t.roster||[]),t.status||t.Status||"Active",t.description||t.Description||"",t.lastUpdated||t.LastUpdated||new Date().toISOString(),t.mobileNumber||t["Mobile Number"]||""]);
  if(rows.length)sheet.getRange(2,1,rows.length,TEAM_HEADERS.length).setValues(rows); sheet.setFrozenRows(1);
}

function readTeams_(ss) {
  const sheet=getOrCreateSheet_(ss,"Teams"); ensureHeaders_(sheet,TEAM_HEADERS); if(sheet.getLastRow()<2)return [];
  const values=sheet.getRange(1,1,sheet.getLastRow(),TEAM_HEADERS.length).getValues();
  return values.slice(1).filter(r=>String(r[0]||"").trim()).map(r=>{let roster=[];try{roster=r[5]?JSON.parse(String(r[5])):[]}catch(e){roster=[];}return {teamName:String(r[0]||""),slug:String(r[1]||""),logoUrl:String(r[2]||""),bannerUrl:String(r[3]||""),players:Number(r[4])||0,roster:roster,status:String(r[6]||"Active"),description:String(r[7]||""),lastUpdated:String(r[8]||""),mobileNumber:String(r[9]||"")};});
}

function writeObjects_(ss,name,objects) {
  const sheet=getOrCreateSheet_(ss,name); sheet.clearContents();
  if(!objects||!objects.length)return;
  const headers=[]; objects.forEach(o=>Object.keys(o||{}).forEach(k=>{if(headers.indexOf(k)<0)headers.push(k);})); if(!headers.length)return;
  if(sheet.getMaxColumns()<headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  const rows=objects.map(o=>headers.map(k=>{const v=o[k];return v==null?"":typeof v==="object"?JSON.stringify(v):v;}));
  sheet.getRange(2,1,rows.length,headers.length).setValues(rows); sheet.setFrozenRows(1);
}

function readObjects_(ss,name) {
  const sheet=ss.getSheetByName(name); if(!sheet||sheet.getLastRow()<2)return [];
  const values=sheet.getDataRange().getValues(); const headers=values[0].map(String);
  return values.slice(1).filter(r=>r.some(v=>String(v||"").trim())).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]);return o;});
}

function readNews_(ss) {
  const sheet=getOrCreateSheet_(ss,"TournamentNews"); ensureHeaders_(sheet,NEWS_HEADERS); if(sheet.getLastRow()<2)return [];
  const values=sheet.getDataRange().getValues();
  return values.slice(1).filter(r=>String(r[1]||"").trim()).map(r=>({id:String(r[0]||""),title:String(r[1]||""),description:String(r[2]||""),date:r[3]||"",type:String(r[4]||"News"),status:String(r[5]||"Published"),imageUrl:String(r[6]||""),link:String(r[7]||"")})).filter(n=>n.status.toLowerCase()!=="hidden");
}

function addNews_(ss,b) {
  const sheet=getOrCreateSheet_(ss,"TournamentNews"); ensureHeaders_(sheet,NEWS_HEADERS); const now=new Date().toISOString();
  sheet.appendRow(["NEWS-"+Date.now(),b.title||"",b.description||"",b.date||now,b.type||"News",b.status||"Published",b.imageUrl||"",b.link||""]); SpreadsheetApp.flush();
  return json_({ok:true,message:"News added successfully."});
}

function submitFinalLeaderboard_(ss,b) {
  const sheet=getOrCreateSheet_(ss,"Submissions"); ensureHeaders_(sheet,SUBMISSION_HEADERS); const now=new Date().toISOString();
  const id="SUB-"+Date.now();
  sheet.appendRow([id,b.username||"",b.teamSlug||"",b.teamName||b.team||"",b.tournamentName||"",b.tournamentDate||"",b.organizerName||"",b.prizePool||"",b.finalPosition||"",typeof b.finalLeaderboard==="object"?JSON.stringify(b.finalLeaderboard):b.finalLeaderboard||"",b.proofUrl||"","Pending","","","",now]); SpreadsheetApp.flush();
  return json_({ok:true,submissionId:id,message:"Submission received for admin review."});
}

function getTeamSubmissions_(ss,b) {
  const sheet=ss.getSheetByName("Submissions"); if(!sheet||sheet.getLastRow()<2)return json_({ok:true,submissions:[]});
  const values=sheet.getDataRange().getValues(); const headers=values[0].map(String); const slug=String(b.teamSlug||"");
  const submissions=values.slice(1).filter(r=>String(r[2]||"")===slug).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]);return o;});
  return json_({ok:true,submissions:submissions});
}

function submitFeedback_(ss,b) {
  const sheet=getOrCreateSheet_(ss,"Feedback"); ensureHeaders_(sheet,FEEDBACK_HEADERS); const now=new Date().toISOString();
  sheet.appendRow(["FDB-"+Date.now(),b.username||"",b.teamSlug||"",b.teamName||"",b.message||"","New","",now,now]); SpreadsheetApp.flush();
  return json_({ok:true,message:"Feedback submitted successfully."});
}

function uploadLogo_(ss,b) {
  if(!b.base64)return json_({ok:false,message:"Image data is missing."});
  const username=String(b.username||"").trim().toLowerCase(); const account=findAccount_(ss,username);
  if(!account)return json_({ok:false,message:"Team account not found."});
  try {
    const data=String(b.base64).replace(/^data:[^;]+;base64,/i,"");
    const bytes=Utilities.base64Decode(data); const blob=Utilities.newBlob(bytes,b.mimeType||"image/png",b.fileName||("team-logo-"+Date.now()+".png"));
    const folderId=String(PropertiesService.getScriptProperties().getProperty("LOGO_FOLDER_ID")||"").trim();
    if(!folderId)return json_({ok:false,message:"LOGO_FOLDER_ID is not configured."});
    const file=DriveApp.getFolderById(folderId).createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    const url="https://drive.google.com/uc?export=view&id="+file.getId();
    updateTeamProfile_(ss,{username:username,teamSlug:account.teamSlug,logoUrl:url});
    return json_({ok:true,url:url,message:"Logo uploaded successfully."});
  } catch(e) { return json_({ok:false,message:errorMessage_(e)}); }
}
