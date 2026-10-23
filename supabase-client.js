/* Initializes the Supabase client for LeToG. */
(function () {
  var url = window.LETOG_SUPABASE_URL;
  var key = window.LETOG_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.indexOf("PASTE_") === 0 || key.indexOf("PASTE_") === 0) {
    console.warn("LeToG: add the Supabase Project URL and Publishable key in supabase-config.js.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("LeToG: Supabase JavaScript library did not load.");
    return;
  }
  window.leToGSupabase = window.supabase.createClient(url, key);
})();
