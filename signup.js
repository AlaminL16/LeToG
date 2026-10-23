/* LeToG signup: Supabase Auth + automatic profiles trigger. */
document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("signupForm");
  var submitBtn = document.getElementById("submitBtn");
  var btnLabel = submitBtn.querySelector(".btn-label");
  var successMsg = document.getElementById("successMsg");
  var fields = {
    firstName: document.getElementById("firstName"),
    lastName: document.getElementById("lastName"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
    terms: document.getElementById("terms")
  };
  var isLoading = false;

  document.querySelectorAll(".eye").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-target"));
      var hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      button.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
    });
  });

  var rules = {
    length: function (v) { return v.length >= 8; },
    upper: function (v) { return /[A-Z]/.test(v); },
    lower: function (v) { return /[a-z]/.test(v); },
    number: function (v) { return /[0-9!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/'`~;]/.test(v); }
  };
  function updateRequirements() {
    var value = fields.password.value;
    document.querySelectorAll(".requirements li").forEach(function (item) {
      item.classList.toggle("ok", !!rules[item.getAttribute("data-rule")](value));
    });
  }
  function passwordIsStrong(value) {
    return rules.length(value) && rules.upper(value) && rules.lower(value) && rules.number(value);
  }
  fields.password.addEventListener("input", updateRequirements);
  updateRequirements();

  function showError(name, message) {
    var el = document.getElementById(name + "Error");
    el.textContent = message;
    el.classList.add("show");
    if (fields[name].type !== "checkbox") fields[name].classList.add("invalid");
  }
  function clearError(name) {
    var el = document.getElementById(name + "Error");
    el.textContent = "";
    el.classList.remove("show");
    if (fields[name].type !== "checkbox") fields[name].classList.remove("invalid");
  }
  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener(fields[name].type === "checkbox" ? "change" : "input", function () { clearError(name); });
  });
  function validate() {
    var valid = true;
    var emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!fields.firstName.value.trim()) { showError("firstName", "Please enter your first name."); valid = false; }
    if (!fields.lastName.value.trim()) { showError("lastName", "Please enter your last name."); valid = false; }
    if (!emailPattern.test(fields.email.value.trim())) { showError("email", "Please enter a valid email address."); valid = false; }
    if (!passwordIsStrong(fields.password.value)) { showError("password", "Password does not meet the requirements below."); valid = false; }
    if (!fields.confirmPassword.value) { showError("confirmPassword", "Please confirm your password."); valid = false; }
    else if (fields.confirmPassword.value !== fields.password.value) { showError("confirmPassword", "Passwords do not match."); valid = false; }
    if (!fields.terms.checked) { showError("terms", "Please accept the Terms of Service and Privacy Policy."); valid = false; }
    return valid;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isLoading || !validate()) return;
    successMsg.classList.remove("show");
    if (!window.leToGSupabase) {
      successMsg.textContent = "Supabase isn't configured yet. Add your Project URL and Publishable key in supabase-config.js.";
      successMsg.classList.add("show");
      return;
    }
    isLoading = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    btnLabel.textContent = "Creating account...";
    try {
      var displayName = fields.firstName.value.trim() + " " + fields.lastName.value.trim();
      var result = await window.leToGSupabase.auth.signUp({
        email: fields.email.value.trim(),
        password: fields.password.value,
        options: { data: { display_name: displayName } }
      });
      if (result.error) throw result.error;
      successMsg.textContent = result.data.session
        ? "Account created successfully! Redirecting…"
        : "Account created! Check your email to confirm your account, then log in.";
      successMsg.classList.add("show");
      if (result.data.session) {
        window.setTimeout(function () { window.location.href = "home.html"; }, 1200);
      } else {
        form.reset();
        updateRequirements();
      }
    } catch (error) {
      successMsg.textContent = error.message || "Signup failed. Please try again.";
      successMsg.classList.add("show");
    } finally {
      isLoading = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      btnLabel.textContent = "Create account";
    }
  });
});
