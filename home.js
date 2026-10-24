/* LeToG home: real Supabase uploads with likes, comments and share. */
document.addEventListener("DOMContentLoaded", async function () {
  var feed = document.getElementById("studyNotesFeed");
  var status = document.getElementById("feedStatus");
  var client = window.leToGSupabase;
  var currentUser = null;
  var notes = [];
  var likes = [];
  var comments = [];
  var names = {};
  var avatars = {};
  var liked = new Set();
  var following = new Set();
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>\"']/g, function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&#39;"})[c];}); }
  function date(v) { var d=new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }
  function toast(message) { if (typeof showToast === "function") showToast(message); else alert(message); }
  function render() {
    if (!notes.length) { feed.innerHTML=""; status.textContent=""; return; }
    status.textContent="";
    feed.innerHTML=notes.map(function(n){
      var noteLikes=likes.filter(function(x){return x.note_id===n.id;});
      var noteComments=comments.filter(function(x){return x.note_id===n.id;});
      var author=names[n.user_id]||"LeToG learner";
      var fileType=(n.file_name||"file").split(".").pop().toUpperCase();
      var commentHtml=noteComments.map(function(c){return '<div class="note-comment"><strong>'+esc(names[c.user_id]||"LeToG learner")+'</strong><p>'+esc(c.body)+'</p><small>'+esc(date(c.created_at))+'</small></div>';}).join("");
      var avatar=avatars[n.user_id]||"";
      return '<article class="uploaded-note-card home-note-post" data-note-id="'+esc(n.id)+'">'+
        '<div class="home-note-author-row"><a class="home-note-avatar-link" href="member.html?id='+encodeURIComponent(n.user_id)+'" aria-label="Open uploader profile">'+(avatar?'<img class="home-note-avatar" src="'+esc(avatar)+'" alt="">':'<span class="home-note-avatar home-note-avatar-fallback">'+esc((author||"L").charAt(0).toUpperCase())+'</span>')+'</a><div class="home-note-author-info"><strong><a class="uploader-profile-link" href="member.html?id='+encodeURIComponent(n.user_id)+'">'+esc(author)+'</a></strong><span>'+esc(date(n.created_at))+'</span></div>'+(currentUser&&currentUser.id===n.user_id?'<div class="note-post-menu"><button type="button" class="note-menu-trigger" aria-label="Post options" aria-expanded="false" data-action="toggle-post-menu">⋯</button><div class="note-menu-popover" hidden><button type="button" data-action="edit-note" data-id="'+esc(n.id)+'">Edit</button><button type="button" class="danger" data-action="delete-note" data-id="'+esc(n.id)+'">Delete</button></div></div>':'')+(currentUser&&currentUser.id!==n.user_id&&!following.has(n.user_id)?'<button type="button" class="note-follow-button" data-action="follow-user" data-user-id="'+esc(n.user_id)+'">＋ Follow</button>':(!currentUser?'<a class="note-follow-button" href="login.html">＋ Follow</a>':''))+'</div>'+
        '<h3>'+esc(n.title)+'</h3><p class="uploaded-note-subject">'+esc(n.subject||"Study notes")+'</p>'+
        (n.description?'<p class="uploaded-note-description">'+esc(n.description)+'</p>':'')+
        ((Array.isArray(n.tags)&&n.tags.length)?'<div class="uploaded-note-tags">'+n.tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>':'')+
        ((/\.(png|jpe?g|gif|webp|avif)$/i.test(n.file_name||"") || /^image\//i.test(n.mime_type||"")) ? '<div class="note-media-link"><img class="note-full-image" src="'+esc(n.file_url)+'" alt="'+esc(n.title)+'" loading="lazy"></div>' : (/\.pdf$/i.test(n.file_name||"") ? '<div class="home-note-file home-document-preview"><div class="home-document-label">PDF preview</div><iframe class="home-document-frame" src="'+esc(n.file_url)+'#toolbar=1&navpanes=0" title="'+esc(n.file_name||n.title)+'" loading="lazy"></iframe></div>' : (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(n.file_name||"") ? '<div class="home-note-file home-document-preview"><div class="home-document-label">'+esc(fileType)+' preview</div><iframe class="home-document-frame" src="https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(n.file_url)+'" title="'+esc(n.file_name||n.title)+'" loading="lazy" allowfullscreen></iframe><p class="home-document-note">If the preview does not load, open the file link if available.</p></div>' : '<div class="home-note-file"><span class="uploaded-file-type">'+esc(fileType)+'</span><span>'+esc(n.file_name||n.title)+'</span><span class="uploaded-note-open">File preview is not available for this file type.</span></div>')))+
        '<div class="note-social-actions"><button type="button" class="note-like-btn" data-action="like" data-id="'+esc(n.id)+'" '+(!currentUser?'title="Sign in to like"':'')+'>'+ (liked.has(n.id)?'♥ Liked':'♡ Like')+' ('+noteLikes.length+')</button><button type="button" data-action="share" data-id="'+esc(n.id)+'">Share</button><span>'+noteComments.length+' comment'+(noteComments.length===1?'':'s')+'</span></div>'+
        '<div class="note-comments"><div class="note-comments-list">'+(commentHtml||'<p class="no-comments">No comments yet. Start the conversation.</p>')+'</div>'+
        '<form class="note-comment-form" data-note-id="'+esc(n.id)+'"><input name="comment" maxlength="1000" placeholder="Write a comment…" aria-label="Write a comment" required /><button type="submit">Comment</button></form></div></article>';
    }).join("");
  }
  async function reloadInteractions() {
    var noteIds=notes.map(function(n){return n.id;});
    if(!noteIds.length){likes=[];comments=[];return;}
    var lr=await client.from("study_note_likes").select("note_id,user_id").in("note_id",noteIds);
    if(lr.error) throw lr.error; likes=lr.data||[];
    var cr=await client.from("study_note_comments").select("id,note_id,user_id,body,created_at").in("note_id",noteIds).order("created_at",{ascending:true});
    if(cr.error) throw cr.error; comments=cr.data||[];
    if(currentUser) likes.forEach(function(l){if(l.user_id===currentUser.id) liked.add(l.note_id);});
    var ids=Array.from(new Set(notes.map(function(n){return n.user_id;}).concat(comments.map(function(c){return c.user_id;})).filter(Boolean)));
    if(ids.length){var pr=await client.from("profiles").select("id,display_name,avatar_url").in("id",ids);if(!pr.error)(pr.data||[]).forEach(function(p){names[p.id]=p.display_name||"LeToG learner"; avatars[p.id]=p.avatar_url||"";});}
  }
  if(!client){status.textContent="Supabase is not configured. Restore your Project URL and Publishable key in supabase-config.js.";return;}
  status.textContent="Loading uploads…";
  try {
    var ar=await client.auth.getUser(); currentUser=ar.data&&ar.data.user?ar.data.user:null;
    following=new Set(); if(currentUser){var fr=await client.from("user_follows").select("following_id").eq("follower_id",currentUser.id);if(fr.error)throw fr.error;following=new Set((fr.data||[]).map(function(x){return x.following_id;}));}
    var nr=await client.from("study_notes").select("id,user_id,title,subject,difficulty,description,tags,file_url,file_path,file_name,file_size,created_at").order("created_at",{ascending:false});
    if(nr.error) throw nr.error; notes=nr.data||[];
    try { await reloadInteractions(); render(); }
    catch(interactionError) {
      console.error("LeToG note interactions not ready", interactionError);
      likes=[]; comments=[]; names={}; avatars={}; render();
      status.textContent=(notes.length ? "Showing uploaded notes. To enable likes and comments, run the updated LeToG-Community-Supabase.sql in Supabase. Details: " : "No uploaded notes found. To enable likes and comments, run the updated LeToG-Community-Supabase.sql in Supabase. Details: ")+(interactionError.message||"Unknown error");
    }
  } catch(e) {
    console.error("LeToG feed load error",e);
    status.textContent="Could not load real uploads. Check the study_notes table, public-read policy, and Supabase configuration. Details: "+(e.message||"Unknown error");
  }
  feed.addEventListener("click",async function(e){
    var button=e.target.closest("[data-action]"); if(!button)return;
    var id=button.getAttribute("data-id");
    var action=button.getAttribute("data-action");
    if(action==="toggle-post-menu"){var menu=button.parentElement.querySelector('.note-menu-popover');var wasOpen=!menu.hidden;feed.querySelectorAll('.note-menu-popover').forEach(function(m){m.hidden=true;});feed.querySelectorAll('.note-menu-trigger').forEach(function(b){b.setAttribute('aria-expanded','false');});menu.hidden=wasOpen;button.setAttribute('aria-expanded',String(!wasOpen));return;}
    if(action==="follow-user"){if(!currentUser){toast("Please sign in to follow members.");return;}var target=button.getAttribute("data-user-id");if(!target||target===currentUser.id)return;button.disabled=true;try{if(following.has(target)){var frd=await client.from("user_follows").delete().eq("follower_id",currentUser.id).eq("following_id",target);if(frd.error)throw frd.error;following.delete(target);}else{var fri=await client.from("user_follows").insert({follower_id:currentUser.id,following_id:target});if(fri.error)throw fri.error;following.add(target);}render();}catch(fe){toast("Could not update follow: "+(fe.message||"Please try again."));}finally{button.disabled=false;}return;}
    if(action==="edit-note"||action==="delete-note"){
      if(!currentUser){toast("Please sign in first.");return;}
      var owned=notes.find(function(n){return n.id===id;});
      if(!owned||owned.user_id!==currentUser.id){toast("You can only manage your own study notes.");return;}
      if(action==="edit-note"){
        location.href="edit-post.html?type=note&id="+encodeURIComponent(id);
      }else{
        if(!confirm("Delete this study note permanently?"))return;
        button.disabled=true;
        try{var del=await client.from("study_notes").delete().eq("id",id).eq("user_id",currentUser.id);if(del.error)throw del.error;if(owned.file_path){var rm=await client.storage.from("letog-media").remove([owned.file_path]);if(rm.error)console.warn("Note deleted but file cleanup failed:",rm.error.message);}notes=notes.filter(function(n){return n.id!==id;});await reloadInteractions();render();toast("Study note deleted.");}
        catch(err){toast("Could not delete study note: "+(err.message||"Please try again."));}finally{button.disabled=false;}
      }
      return;
    }
    if(button.getAttribute("data-action")==="share"){
      var url=location.origin+location.pathname+"#note-"+id;
      try{if(navigator.share) await navigator.share({title:"Study note on LeToG",url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast("Share link copied");}else toast(url);}catch(err){}
      return;
    }
    if(!currentUser){toast("Please sign in to like a note.");return;}
    button.disabled=true;
    try{
      if(liked.has(id)){var del=await client.from("study_note_likes").delete().eq("note_id",id).eq("user_id",currentUser.id);if(del.error)throw del.error;liked.delete(id);}
      else{var ins=await client.from("study_note_likes").insert({note_id:id,user_id:currentUser.id});if(ins.error)throw ins.error;liked.add(id);}
      await reloadInteractions();render();
    }catch(err){toast("Could not update like: "+(err.message||"Please try again."));}finally{button.disabled=false;}
  });
  feed.addEventListener("submit",async function(e){
    var form=e.target.closest(".note-comment-form");if(!form)return;e.preventDefault();
    if(!currentUser){toast("Please sign in to comment.");return;}
    var input=form.querySelector('input[name="comment"]');var body=input.value.trim();if(!body)return;
    var submit=form.querySelector('button');submit.disabled=true;
    try{var result=await client.from("study_note_comments").insert({note_id:form.getAttribute("data-note-id"),user_id:currentUser.id,body:body});if(result.error)throw result.error;await reloadInteractions();render();}
    catch(err){toast("Could not save comment: "+(err.message||"Please try again."));}
    finally{submit.disabled=false;}
  });
});
