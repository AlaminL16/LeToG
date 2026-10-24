document.addEventListener("DOMContentLoaded", async function () {
  var supabase = window.leToGSupabase;
  var form = document.getElementById("profileEditForm");
  var message = document.getElementById("profileEditMessage");
  var saveButton = document.getElementById("saveProfileBtn");
  var photoPicker = document.getElementById("profilePhotoPicker");
  var photoPreview = document.getElementById("profilePhotoPreview");
  var photoInitial = document.getElementById("profilePhotoInitial");
  var photoName = document.getElementById("profilePhotoName");
  var photoFileInput = document.getElementById("editAvatarFile");
  var selectedPhotoFile = null;
  var currentUser = null;
  var currentAvatar = "";
  function setMessage(text, kind) {
    message.textContent = text || "";
    message.className = "profile-edit-message" + (kind ? " is-" + kind : "");
  }
  if (!supabase) {
    setMessage("Supabase is not configured. Check supabase-config.js.", "error");
    form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
    return;
  }
  function showAvatar(url, name) {
    if (url) {
      photoPreview.src = url;
      photoPreview.hidden = false;
      photoInitial.hidden = true;
    } else {
      photoPreview.removeAttribute("src");
      photoPreview.hidden = true;
      photoInitial.hidden = false;
      photoInitial.textContent = (name || "?").trim().charAt(0).toUpperCase() || "?";
    }
    photoName.textContent = (name || "Your profile photo").trim() || "Your profile photo";
  }
  photoPicker.addEventListener("click", function () { photoFileInput.click(); });
  photoFileInput.addEventListener("change", function () {
    var file = photoFileInput.files && photoFileInput.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Please choose a JPG, JPEG, or PNG image.", "error");
      photoFileInput.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Please choose an image smaller than 10 MB.", "error");
      photoFileInput.value = "";
      return;
    }
    selectedPhotoFile = file;
    showAvatar(URL.createObjectURL(file), document.getElementById("editDisplayName").value || file.name);
    setMessage("Photo selected. Save your profile to upload it.", "success");
  });
  document.getElementById("editDisplayName").addEventListener("input", function () {
    if (!selectedPhotoFile && (!currentAvatar || photoPreview.hidden)) showAvatar(currentAvatar, this.value);
    else photoName.textContent = this.value.trim() || "Your profile photo";
  });
  async function cropImageToSquare(file) {
    var image = new Image();
    var objectUrl = URL.createObjectURL(file);
    try {
      await new Promise(function (resolve, reject) {
        image.onload = resolve;
        image.onerror = function () { reject(new Error("Could not read that image. Please choose another one.")); };
        image.src = objectUrl;
      });
      var side = Math.min(image.naturalWidth, image.naturalHeight);
      var sx = Math.floor((image.naturalWidth - side) / 2);
      var sy = Math.floor((image.naturalHeight - side) / 2);
      var canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 512;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
      var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/jpeg", 0.88); });
      if (!blob) throw new Error("Could not prepare the photo. Please try another image.");
      return blob;
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  var authResult = await supabase.auth.getUser();
  currentUser = authResult.data && authResult.data.user;
  if (authResult.error || !currentUser) {
    setMessage("Please log in to edit your profile.", "error");
    form.querySelectorAll("input, textarea, button").forEach(function (el) { el.disabled = true; });
    return;
  }
  var result = await supabase.from("profiles").select("id, display_name, bio, avatar_url").eq("id", currentUser.id).maybeSingle();
  if (result.error) setMessage("Could not load your profile: " + result.error.message, "error");
  var profile = result.data || {};
  document.getElementById("editDisplayName").value = profile.display_name || (currentUser.user_metadata && currentUser.user_metadata.display_name) || "";
  document.getElementById("editBio").value = profile.bio || "";
  currentAvatar = profile.avatar_url || "";
  showAvatar(currentAvatar, profile.display_name || (currentUser.user_metadata && currentUser.user_metadata.display_name) || "");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var displayName = document.getElementById("editDisplayName").value.trim();
    var bio = document.getElementById("editBio").value.trim();
    var avatarUrl = currentAvatar;
    var avatarFile = selectedPhotoFile;
    if (!displayName) { setMessage("Please enter a display name.", "error"); return; }
    saveButton.disabled = true; saveButton.textContent = "Saving…"; setMessage("Saving your profile…");
    try {
      if (avatarFile) {
        if (!["image/jpeg", "image/png"].includes(avatarFile.type)) throw new Error("Please choose a JPG, JPEG, or PNG image.");
        if (avatarFile.size > 10 * 1024 * 1024) throw new Error("Profile photos must be 10 MB or smaller.");
        var croppedPhoto = await cropImageToSquare(avatarFile);
        var path = "profile-pictures/" + currentUser.id + "/" + Date.now() + ".jpg";
        var uploaded = await supabase.storage.from("letog-media").upload(path, croppedPhoto, { upsert: true, contentType: "image/jpeg" });
        if (uploaded.error) {
          if (/bucket not found/i.test(uploaded.error.message || "")) throw new Error("The letog-media storage bucket was not found. In Supabase, create or confirm the public bucket named letog-media.");
          if (/row-level security|permission denied|not authorized/i.test(uploaded.error.message || "")) throw new Error("Supabase blocked the photo upload. Run the profile photo Storage policies from LeToG-Community-Supabase.sql, then try again.");
          throw uploaded.error;
        }
        avatarUrl = supabase.storage.from("letog-media").getPublicUrl(path).data.publicUrl;
      } else if (!avatarUrl) {
        avatarUrl = currentAvatar;
      }
      var profileValues = { display_name: displayName, bio: bio, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() };
      // Update an existing row first. If the account has no profiles row yet, insert it.
      var update = await supabase.from("profiles").update(profileValues).eq("id", currentUser.id).select("id").maybeSingle();
      if (update.error) throw update.error;
      if (!update.data) {
        var insert = await supabase.from("profiles").insert(Object.assign({ id: currentUser.id }, profileValues)).select("id").single();
        if (insert.error) throw insert.error;
      }
      // Keep the current auth metadata in sync as a fallback for UI components that read it.
      await supabase.auth.updateUser({ data: { display_name: displayName, bio: bio, avatar_url: avatarUrl || null } });
      setMessage("Profile saved successfully. Returning to your profile…", "success");
      window.location.href = "profile.html";
    } catch (error) {
      setMessage("Could not save profile: " + (error.message || "Please try again."), "error");
    } finally {
      saveButton.disabled = false; saveButton.textContent = "Save profile";
    }
  });
});
