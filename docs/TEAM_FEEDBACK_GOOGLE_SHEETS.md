# TNFFM Team Feedback — Google Sheets setup

The website changes are ready, but the existing Google Apps Script must also accept three new actions. **Do not replace your existing script**, because it already contains your working `uploadLogo` and Teams/Events/Collaborators logic.

Keep these existing tabs:
- `Teams`
- `Events`
- `Collaborators`

Add one new tab:
- `Feedback`

## Feedback columns

Create the `Feedback` tab with this first row:

`FeedbackID | Timestamp | Team | Slug | Username | Type | Message | Status`

## Add these actions inside your existing `doPost(e)`

After parsing the JSON body, add:

```javascript
const action = String(body.action || "");
if (action === "submitFeedback") return submitFeedback(body);
if (action === "listFeedback") return listFeedback();
if (action === "updateFeedbackStatus") return updateFeedbackStatus(body);
```

Then add these functions:

```javascript
const FEEDBACK_SHEET_NAME = "Feedback";

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
```

Your existing `jsonResponse()` helper can be reused. If your script does not already have it, use:

```javascript
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

After saving the Apps Script, **deploy a new web-app version** using the same deployment URL. Keep execution as **Me** and access as **Anyone** so the Vercel website can call it.
