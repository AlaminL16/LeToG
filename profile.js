/* LeToG profile page: live profile data from Supabase, plus demo notes. */
document.addEventListener("DOMContentLoaded", async function () {
  var supabase = window.leToGSupabase;
  var form = document.getElementById("profileEditForm");
  var message = document.getElementById("profileEditMessage");
  var saveButton = document.getElementById("saveProfileBtn");
  var currentUser = null;

  function setMessage(text, kind) {
    message.textContent = text || "";
    message.className = "profile-edit-message" + (kind ? " is-" + kind : "");
  }
  function showProfile(profile, user) {
    var name = (profile && profile.display_name) || (user && user.user_metadata && user.user_metadata.display_name) || "LeToG member";
    var bio = (profile && profile.bio) || "";
    var avatar = (profile && profile.avatar_url) || "";
    document.getElementById("profileDisplayName").textContent = name;
    document.getElementById("profileBioDisplay").textContent = bio || "Add a short introduction about yourself.";
    document.getElementById("editDisplayName").value = name === "LeToG member" ? "" : name;
    document.getElementById("editBio").value = bio;
    document.getElementById("editAvatarUrl").value = avatar;
    var image = document.getElementById("profileAvatar");
    var fallback = document.getElementById("profileAvatarFallback");
    if (avatar) {
      image.src = avatar;
      image.hidden = false;
      fallback.hidden = true;
      image.onerror = function () { image.hidden = true; fallback.hidden = false; };
    } else {
      image.hidden = true;
      fallback.hidden = false;
    }
    fallback.textContent = name.split(/\s+/).filter(Boolean).slice(0,2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("") || "U";
  }
  if (supabase) {
    var authResult = await supabase.auth.getUser();
    currentUser = authResult.data && authResult.data.user;
    if (authResult.error || !currentUser) {
      setMessage("Please log in to view and edit your profile.", "error");
      form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
      showProfile(null, null);
    } else {
      var result = await supabase.from("profiles").select("id, display_name, bio, avatar_url").eq("id", currentUser.id).maybeSingle();
      if (result.error) {
        setMessage("Could not load your profile: " + result.error.message, "error");
        showProfile(null, currentUser);
      } else {
        showProfile(result.data || {}, currentUser);
      }
    }
  } else {
    setMessage("Supabase is not configured. Restore your Project URL and Publishable key in supabase-config.js.", "error");
    showProfile(null, null);
    form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
  }

  async function loadFollowData() {
    if (!supabase || !currentUser) return;
    var followersSlot = document.getElementById("profileFollowers");
    var followingSlot = document.getElementById("profileFollowing");
    function safe(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"})[c];}); }
    async function peopleList(slot, countId, column, value) {
      var r = await supabase.from("user_follows").select("follower_id,following_id,created_at").eq(column, value).order("created_at", {ascending:false});
      if (r.error) { slot.innerHTML = '<p class="muted">Could not load this list. Run the updated Supabase SQL.</p>'; return; }
      var rows = r.data || [], ids = rows.map(function(x){return column === "following_id" ? x.follower_id : x.following_id;});
      document.getElementById(countId).textContent = String(rows.length);
      if (!ids.length) { slot.innerHTML = '<p class="muted">No members here yet.</p>'; return; }
      var pr = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids);
      if (pr.error) { slot.innerHTML = '<p class="muted">Could not load member profiles.</p>'; return; }
      var byId = {}; (pr.data || []).forEach(function(p){byId[p.id]=p;});
      slot.innerHTML = ids.map(function(id){var p=byId[id]||{}, name=p.display_name||"LeToG member", avatar=p.avatar_url?'<img class="home-social-avatar" src="'+safe(p.avatar_url)+'" alt="">':'<span class="home-social-avatar">'+safe(name.charAt(0).toUpperCase())+'</span>';return '<article class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'+avatar+'<strong style="flex:1"><a href="member.html?id='+encodeURIComponent(id)+'">'+safe(name)+'</a></strong><a class="btn btn-secondary btn-sm" href="member.html?id='+encodeURIComponent(id)+'">View profile</a><a class="btn btn-primary btn-sm" href="messages.html?to='+encodeURIComponent(id)+'">Message</a></article>';}).join("");
    }
    await Promise.all([peopleList(followersSlot,"followersCount","following_id",currentUser.id), peopleList(followingSlot,"followingCount","follower_id",currentUser.id)]);

  }
  await loadFollowData();

  // Profile tabs show one selected section at a time.
  var allProfileTabs = document.querySelectorAll('.profile-tabs a');
  var profilePanels = ["my-notes", "followers-section", "following-section"].map(function(id){return document.getElementById(id);}).filter(Boolean);
  var overviewContent = document.querySelectorAll('.profile-overview-content');
  function showProfilePanel(id) {
    profilePanels.forEach(function(panel){panel.hidden = panel.id !== id;});
    overviewContent.forEach(function(panel){panel.hidden = id !== "__overview__" && id !== "my-notes";});
    allProfileTabs.forEach(function(tab){
      var href = tab.getAttribute('href') || '';
      var active = (id === "__overview__" && href === "#overview-section") || href === "#" + id || (id === "my-notes" && href === "#my-notes");
      tab.classList.toggle("active", active);
    });
    var target = id === "__overview__" ? document.querySelector('.profile-header') : document.getElementById(id);
    target?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  allProfileTabs.forEach(function(tab){tab.addEventListener("click",function(event){
    var href = tab.getAttribute('href') || '';
    if (href === '#overview-section') { event.preventDefault(); showProfilePanel('__overview__'); return; }
    if (href === '#my-notes') { event.preventDefault(); showProfilePanel('my-notes'); return; }
    if (['#followers-section','#following-section','#notifications-section'].includes(href)) { event.preventDefault(); showProfilePanel(href.slice(1)); }
  });});
  showProfilePanel('__overview__');

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!supabase || !currentUser) { setMessage("Please log in first.", "error"); return; }
    var displayName = document.getElementById("editDisplayName").value.trim();
    var bio = document.getElementById("editBio").value.trim();
    var avatarUrl = document.getElementById("editAvatarUrl").value.trim();
    var avatarFile = document.getElementById("editAvatarFile").files[0];
    if (!displayName) { setMessage("Please enter a display name.", "error"); return; }
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) { setMessage("Profile picture URL must start with http:// or https://.", "error"); return; }
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    setMessage("Saving your profile…");
    try {
      if (avatarFile) {
        if (!avatarFile.type.startsWith("image/")) throw new Error("Please choose an image file.");
        if (avatarFile.size > 5 * 1024 * 1024) throw new Error("Profile pictures must be 5 MB or smaller.");
        var ext = (avatarFile.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
        var path = "profile-pictures/" + currentUser.id + "/" + Date.now() + "." + ext;
        var uploaded = await supabase.storage.from("letog-media").upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploaded.error) throw uploaded.error;
        var publicResult = supabase.storage.from("letog-media").getPublicUrl(path);
        avatarUrl = publicResult.data.publicUrl;
      }
      var update = await supabase.from("profiles").upsert({ id: currentUser.id, display_name: displayName, bio: bio, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id, display_name, bio, avatar_url").single();
      if (update.error) throw update.error;
      showProfile(update.data, currentUser);
      document.getElementById("editAvatarFile").value = "";
      setMessage("Profile saved successfully.", "success");
    } catch (error) {
      setMessage("Could not save profile: " + (error.message || "Please try again."), "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save profile";
    }
  });

  var bookmarkCount = document.querySelector("#bookmarkCount");
  if (bookmarkCount && typeof getBookmarks === "function") bookmarkCount.textContent = String(getBookmarks().length);
  var notesSlot = document.querySelector("#myNotes");
  if (notesSlot && supabase && currentUser) {
    notesSlot.innerHTML = '<p class="muted">Loading your uploads…</p>';
    var mine = await supabase.from("study_notes").select("id,title,subject,description,file_url,file_name,created_at").eq("user_id", currentUser.id).order("created_at", {ascending:false});
    if (mine.error) notesSlot.innerHTML = '<p class="muted">Could not load your uploads: ' + mine.error.message + '</p>';
    else {
      var count = document.getElementById("profileNoteCount"); if (count) count.textContent = String((mine.data || []).length);
      notesSlot.innerHTML = (mine.data || []).length ? mine.data.map(function (note) { return '<article class="note-card"><span class="note-file-type">' + String((note.file_name || "FILE").split(".").pop()).toUpperCase() + '</span><h3 class="note-title">' + String(note.title || "Untitled").replace(/[&<>"']/g, function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"})[c];}) + '</h3><p class="note-desc">' + String(note.description || "").replace(/[&<>"']/g, function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"})[c];}) + '</p><p class="muted small">' + String(note.subject || "") + ' · ' + new Date(note.created_at).toLocaleDateString() + '</p><a class="btn btn-secondary btn-sm" href="' + String(note.file_url || "#") + '" target="_blank" rel="noopener">Open file</a></article>'; }).join("") : '<p class="muted">You have not uploaded any study notes yet.</p>';
    }
  } else if (notesSlot) notesSlot.innerHTML = '<p class="muted">Sign in to see your uploaded study notes.</p>';
});
