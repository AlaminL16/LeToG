/* Real note details only. No sample note, simulated preview, fake ratings or fake comments. */
document.addEventListener("DOMContentLoaded", async function () {
  var client = window.leToGSupabase;
  var params = new URLSearchParams(location.search);
  var id = params.get("id");
  var message = document.createElement("p");
  message.className = "muted";
  var main = document.querySelector("main") || document.body;
  if (!client || !id) { main.prepend(message); message.textContent = "Open a study note from the home feed to view its real file. No demo note is displayed here."; return; }
  try {
    var result = await client.from("study_notes").select("id,user_id,title,subject,difficulty,description,tags,file_url,file_name,created_at").eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    var note = result.data;
    if (!note) { main.prepend(message); message.textContent = "This study note was not found. It may have been removed."; return; }
    document.title = note.title + " | LeToG";
    var set = function(sel, value) { var el=document.querySelector(sel); if(el) el.textContent=value||""; };
    set("#noteTitle", note.title); set("#noteDesc", note.description); set("#authorName", "LeToG learner");
    set("#noteStats", (note.subject||"Study notes") + " · Uploaded " + new Date(note.created_at).toLocaleDateString());
    var tags=document.querySelector("#noteTags"); if(tags) tags.innerHTML=(Array.isArray(note.tags)?note.tags:[]).map(function(t){var span=document.createElement("span");span.className="tag";span.textContent=t;return span.outerHTML;}).join("");
    var preview=document.querySelector("#pdfPage"); if(preview) {preview.innerHTML=""; var p=document.createElement("p");p.textContent="The uploaded file is available using the button below.";preview.appendChild(p);}
    var open=document.querySelector("#downloadBtn"); if(open){open.textContent="Open / Download file";open.addEventListener("click",function(){window.open(note.file_url,"_blank","noopener");});}
    ["#prevPage","#nextPage"].forEach(function(sel){var el=document.querySelector(sel);if(el)el.hidden=true;});
    var saveTop=document.querySelector("#saveTop"), saveBtn=document.querySelector("#saveBtn");
    [saveTop,saveBtn].forEach(function(el){if(el)el.hidden=true;});
    var ratings=document.querySelector("#panel-reviews");if(ratings)ratings.innerHTML="<p class=\"muted\">Ratings are not available yet.</p>";
    var related=document.querySelector("#relatedList");if(related)related.innerHTML="<p class=\"muted\">Related notes will appear as real uploads are added.</p>";
    var form=document.querySelector("#commentForm");if(form)form.hidden=true;
    var tabs=document.querySelectorAll(".tab");tabs.forEach(function(tab){tab.addEventListener("click",function(){tabs.forEach(function(t){t.setAttribute("aria-selected","false");var panel=document.getElementById(t.getAttribute("aria-controls"));if(panel)panel.hidden=true;});tab.setAttribute("aria-selected","true");var panel=document.getElementById(tab.getAttribute("aria-controls"));if(panel)panel.hidden=false;});});
  } catch(e) { main.prepend(message); message.textContent="Could not load this study note: "+(e.message||"Please try again."); }
});
