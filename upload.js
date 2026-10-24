/* LeToG – upload study notes to Supabase Storage and database. */

document.addEventListener("DOMContentLoaded", function () {
  var ALLOWED = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "jpg", "jpeg", "png"];
  var MAX_MB = 50;
  var chosenFile = null;
  var client = window.leToGSupabase;
  var currentUser = null;
  var BUCKET = "letog-media";

  if (client) {
    client.auth.getUser().then(function (result) { currentUser = result.data && result.data.user ? result.data.user : null; });
  }

  var dropzone = qs("#dropzone");
  var fileInput = qs("#fileInput");
  var fileError = qs("#fileError");

  function showStep(step) {
    [1, 2, 3].forEach(function (number) {
      qs("#step" + number).hidden = number !== step;
      qs('[data-step="' + number + '"]').classList.toggle("active", number === step);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --- Step 1: file selection --------------------------------------- */
  function handleFile(file) {
    var extension = file.name.split(".").pop().toLowerCase();
    if (ALLOWED.indexOf(extension) === -1) {
      fileError.textContent = "Unsupported file type. Use PDF, Word, PowerPoint, Excel, JPG or PNG.";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      fileError.textContent = "File is too large. Maximum size is " + MAX_MB + "MB.";
      return;
    }
    fileError.textContent = "";
    chosenFile = file;
    qs("#fileName").textContent = file.name;
    qs("#fileSize").textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";
    qs("#fileChip").classList.add("show");
  }

  qs("#chooseBtn").addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  ["dragenter", "dragover"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", function (event) {
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  });

  /* --- Step 2: details validation ----------------------------------- */
  function validateDetails() {
    var ok = true;

    if (!qs("#title").value.trim()) {
      qs("#titleError").textContent = "Title is required.";
      ok = false;
    } else {
      qs("#titleError").textContent = "";
    }

    if (!qs("#subject").value.trim()) {
      qs("#subjectError").textContent = "Enter a subject.";
      ok = false;
    } else {
      qs("#subjectError").textContent = "";
    }

    if (qs("#description").value.trim().length < 10) {
      qs("#descriptionError").textContent = "Write at least 10 characters.";
      ok = false;
    } else {
      qs("#descriptionError").textContent = "";
    }

    return ok;
  }

  /* --- Navigation --------------------------------------------------- */
  qsa("[data-next]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = Number(button.getAttribute("data-next"));
      if (next === 2 && !chosenFile) {
        fileError.textContent = "Please choose a file first.";
        return;
      }
      if (next === 3) {
        if (!validateDetails()) {
          return;
        }
        qs("#pvFile").textContent = chosenFile ? chosenFile.name : "—";
        qs("#pvTitle").textContent = qs("#title").value.trim();
        qs("#pvSubject").textContent = qs("#subject").value.trim();
        qs("#pvDescription").textContent = qs("#description").value.trim();
        qs("#pvTags").textContent = qs("#tags").value.trim() || "—";
      }
      showStep(next);
    });
  });

  qsa("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () {
      showStep(Number(button.getAttribute("data-back")));
    });
  });

  /* --- Publish to Supabase ------------------------------------------ */
  qs("#publishBtn").addEventListener("click", async function () {
    var button = qs("#publishBtn");
    var spinner = qs("#publishSpinner");
    var success = qs("#publishSuccess");
    button.disabled = true;
    spinner.hidden = false;
    success.hidden = true;

    try {
      if (!client) throw new Error("Supabase is not configured. Restore the Project URL and Publishable key in supabase-config.js.");
      var authResult = await client.auth.getUser();
      currentUser = authResult.data && authResult.data.user ? authResult.data.user : null;
      if (authResult.error) throw authResult.error;
      if (!currentUser) throw new Error("Please sign in before uploading study notes.");
      if (!chosenFile) throw new Error("Please choose a file first.");
      if (!validateDetails()) throw new Error("Please correct the note details above.");

      var safeName = chosenFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var filePath = currentUser.id + "/notes/" + Date.now() + "_" + safeName;
      var uploadResult = await client.storage.from(BUCKET).upload(filePath, chosenFile, {
        upsert: false,
        contentType: chosenFile.type || "application/octet-stream"
      });
      if (uploadResult.error) throw uploadResult.error;

      var publicResult = client.storage.from(BUCKET).getPublicUrl(filePath);
      var tagList = Array.from(new Set(qs("#tags").value.split(",").map(function (tag) { return tag.trim().toLowerCase(); }).filter(Boolean)));
      var note = {
        user_id: currentUser.id,
        title: qs("#title").value.trim(),
        subject: qs("#subject").value.trim(),
        description: qs("#description").value.trim(),
        tags: tagList,
        file_url: publicResult.data.publicUrl,
        file_path: filePath,
        file_name: chosenFile.name,
        file_size: chosenFile.size,
        created_at: new Date().toISOString()
      };
      var insertResult = await client.from("study_notes").insert(note).select("id").single();
      if (insertResult.error) {
        await client.storage.from(BUCKET).remove([filePath]);
        throw insertResult.error;
      }

      success.innerHTML = 'Your study note has been saved successfully! <a href="home.html#studyNotesFeed">View it in the home feed</a>.';
      success.classList.remove("alert-error");
      success.classList.add("alert-success");
      success.hidden = false;
      showToast("Study note uploaded successfully. You can view it on the home page.");
      button.querySelector("span:last-child").textContent = "Published";
    } catch (error) {
      success.textContent = "Upload failed: " + (error && error.message ? error.message : "Unknown error");
      success.classList.remove("alert-success");
      success.classList.add("alert-error");
      success.hidden = false;
    } finally {
      spinner.hidden = true;
      button.disabled = false;
    }
  });
});
