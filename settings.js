// Settings page: connected to the signed-in Supabase account.
document.addEventListener("DOMContentLoaded", function () {
  // Remove stale toast overlays that can obscure Settings controls.
  qsa(".toast").forEach(function (toast) { toast.remove(); });
  var interests = Store.read("letog_interests", []);
  if (interests.length) {
    document.getElementById("savedInterests").textContent = "Your interests: " + interests.join(", ");
  }

  var supabase = window.leToGSupabase;
  var accountForm = document.getElementById("accountForm");
  var nameInput = document.getElementById("name");
  var bioInput = document.getElementById("bio");
  var pictureInput = document.getElementById("pictureUrl");
  var accountMessage = document.createElement("p");
  accountMessage.className = "muted small";
  accountMessage.setAttribute("role", "status");
  accountForm.appendChild(accountMessage);
  var signedInUser = null;
  async function loadAccountProfile() {
    if (!supabase) { accountMessage.textContent = "Supabase is not configured. Check supabase-config.js."; return; }
    var auth = await supabase.auth.getUser();
    signedInUser = auth.data && auth.data.user;
    if (!signedInUser) { accountMessage.textContent = "Log in to edit your account profile."; return; }
    document.getElementById("email").value = signedInUser.email || "";
    var profile = await supabase.from("profiles").select("display_name,bio,avatar_url").eq("id", signedInUser.id).maybeSingle();
    if (profile.error) { accountMessage.textContent = "Could not load profile: " + profile.error.message; return; }
    nameInput.value = (profile.data && profile.data.display_name) || (signedInUser.user_metadata && signedInUser.user_metadata.display_name) || "";
    bioInput.value = (profile.data && profile.data.bio) || "";
    pictureInput.value = (profile.data && profile.data.avatar_url) || "";
  }
  loadAccountProfile();
  accountForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!supabase || !signedInUser) { accountMessage.textContent = "Please log in before saving your profile."; return; }
    var displayName = nameInput.value.trim();
    var bio = bioInput.value.trim();
    var enteredAvatarUrl = pictureInput.value.trim();
    if (!displayName) { accountMessage.textContent = "Please enter your name."; return; }
    if (enteredAvatarUrl && !/^https?:\/\//i.test(enteredAvatarUrl)) { accountMessage.textContent = "Profile picture URL must start with http:// or https://."; return; }
    // Never clear a saved avatar just because the user is editing their name or bio.
    var existing = await supabase.from("profiles").select("avatar_url").eq("id", signedInUser.id).maybeSingle();
    if (existing.error) { accountMessage.textContent = "Could not load the saved profile photo: " + existing.error.message; return; }
    var existingAvatarUrl = existing.data && existing.data.avatar_url ? existing.data.avatar_url : "";
    var avatarUrl = enteredAvatarUrl || existingAvatarUrl;
    var saved = await supabase.from("profiles").upsert({id:signedInUser.id, display_name:displayName, bio:bio, avatar_url:avatarUrl || null, updated_at:new Date().toISOString()}, {onConflict:"id"});
    if (saved.error) { accountMessage.textContent = "Could not save profile: " + saved.error.message; }
    else {
      var metadataUpdate = await supabase.auth.updateUser({data:{display_name:displayName, bio:bio, avatar_url:avatarUrl || null}});
      if (metadataUpdate.error) { accountMessage.textContent = "Profile saved, but account metadata could not be synced: " + metadataUpdate.error.message; }
      else { accountMessage.textContent = "Profile saved successfully. Your profile photo was preserved."; }
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var currentPass = document.getElementById("current").value;
    var newPass = document.getElementById("newPass").value;
    var error = document.getElementById("passError");
    error.textContent = "";
    if (!supabase || !signedInUser) { error.textContent = "Please log in before changing your password."; return; }
    if (!currentPass) { error.textContent = "Enter your current password."; return; }
    if (newPass.length < 8) { error.textContent = "New password must be at least 8 characters."; return; }
    var button = this.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Updating…";
    try {
      var verified = await supabase.auth.signInWithPassword({email: signedInUser.email, password: currentPass});
      if (verified.error) throw new Error("Current password is incorrect.");
      var changed = await supabase.auth.updateUser({password:newPass});
      if (changed.error) throw changed.error;
      error.textContent = "Password changed successfully."; error.style.color = "var(--success, #15803d)";
      document.getElementById("current").value = ""; document.getElementById("newPass").value = "";
    } catch (e) { error.style.color = ""; error.textContent = e.message || "Could not change password."; }
    finally { button.disabled = false; button.textContent = "Change password"; }
  });

  qsa("[data-theme]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyLeToGTheme(button.getAttribute("data-theme"));
      // Avoid the global toast overlay on Settings; update button state only.
      qsa("[data-theme]").forEach(function (themeButton) {
        themeButton.classList.toggle("is-active", themeButton === button);
        themeButton.setAttribute("aria-pressed", themeButton === button ? "true" : "false");
      });
    });
  });

  document.getElementById("deleteAccount").addEventListener("click", async function () {
    if (!supabase) { accountMessage.textContent = "Supabase is not configured. Check supabase-config.js."; return; }
    var auth = await supabase.auth.getUser();
    signedInUser = auth.data && auth.data.user;
    if (auth.error || !signedInUser) { accountMessage.textContent = "Please sign in again before deleting your account."; return; }
    var confirmation = window.prompt('This permanently deletes your LeToG account. Type DELETE to confirm:');
    if (confirmation !== "DELETE") { if (confirmation !== null) accountMessage.textContent = "Account deletion cancelled. Type DELETE exactly to confirm."; return; }
    var button = this; button.disabled = true; button.textContent = "Deleting account…";
    accountMessage.textContent = "Requesting secure account deletion…";
    try {
      var result = await supabase.functions.invoke("delete-account", {body:{confirmation:"DELETE"}});
      if (result.error) {
        var detail = result.error.message || "The deletion service could not be reached.";
        throw new Error(detail + " Ensure the delete-account Supabase Edge Function is deployed and configured; see DELETE-ACCOUNT-SETUP.md in this ZIP.");
      }
      if (result.data && result.data.error) throw new Error(result.data.error);
      await supabase.auth.signOut();
      accountMessage.textContent = "Your account was deleted. Redirecting…";
      window.location.replace("index.html");
    } catch (e) { accountMessage.textContent = "Account was not deleted: " + (e.message || "Please try again."); button.disabled = false; button.textContent = "Delete account"; }
  });
});
