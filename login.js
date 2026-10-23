/* LeToG login using Supabase Auth. */
document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("loginForm");
  var email = document.getElementById("email");
  var password = document.getElementById("password");
  var submitBtn = document.getElementById("submitBtn");
  var successMsg = document.getElementById("successMsg");

  document.querySelectorAll(".eye").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-target"));
      var hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
      button.classList.toggle("on", hidden);
    });
  });
  function setError(input, id, message) {
    document.getElementById(id).textContent = message;
    input.classList.toggle("invalid", Boolean(message));
  }
  function validate() {
    var ok = true;
    if (!email.value.trim()) { setError(email, "emailError", "Email address is required."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setError(email, "emailError", "Enter a valid email address."); ok = false; }
    else setError(email, "emailError", "");
    if (!password.value) { setError(password, "passwordError", "Password is required."); ok = false; }
    else if (password.value.length < 8) { setError(password, "passwordError", "Password must be at least 8 characters."); ok = false; }
    else setError(password, "passwordError", "");
    return ok;
  }
  [email, password].forEach(function (input) { input.addEventListener("blur", validate); });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!validate()) return;
    if (!window.leToGSupabase) {
      successMsg.textContent = "Supabase isn't configured yet. Add your Project URL and Publishable key in supabase-config.js.";
      successMsg.classList.add("show");
      return;
    }
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    try {
      var result = await window.leToGSupabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });
      if (result.error) throw result.error;
      successMsg.textContent = "Logged in successfully! Redirecting…";
      successMsg.classList.add("show");
      window.setTimeout(function () { window.location.href = "home.html"; }, 800);
    } catch (error) {
      successMsg.textContent = error.message || "Login failed. Check your email and password.";
      successMsg.classList.add("show");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
  document.getElementById("googleBtn").addEventListener("click", function () {
    successMsg.textContent = "Google sign-in is not configured yet. Use email and password for now.";
    successMsg.classList.add("show");
  });
});
