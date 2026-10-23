document.addEventListener('DOMContentLoaded', async () => {
  const db = window.leToGSupabase;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = $('#messageStatus');
  const emptyHint = $('#messageStatusEmpty');
  if (!db) { emptyHint.textContent = 'Supabase is not configured.'; return; }
  const auth = await db.auth.getUser(), me = auth.data?.user;
  if (!me) { emptyHint.textContent = 'Please log in to use private messages.'; $('#chatPanel').hidden = true; return; }
  let target = new URLSearchParams(location.search).get('to') || null;
  const bucket = 'letog-private-messages';
  const messageList = $('#messageList');
  const chatPanel = $('#chatPanel');

  async function setTarget(id, name, avatarUrl = '') {
    if (!id || id === me.id) return;
    target = id;
    history.replaceState(null, '', 'messages.html?to=' + encodeURIComponent(id));
    chatPanel.hidden = false; emptyHint.hidden = true; document.body.classList.add('private-chat-open');
    $('#conversationHeading').innerHTML = '<a class="chat-person-profile-link" href="member.html?id=' + encodeURIComponent(id) + '" aria-label="Open ' + esc(name || 'member') + ' profile">' + (avatarUrl ? '<img class="chat-person-avatar" src="' + esc(avatarUrl) + '" alt="">' : '<span class="chat-person-avatar">' + esc((name || 'M').trim().charAt(0).toUpperCase()) + '</span>') + '<span class="chat-person-name">' + esc(name || 'LeToG member') + '</span></a>'; 
    $('#recipientResults').innerHTML = '';
    $('#recipientSearch').value = '';
    $('#messageText').focus();
    $('#messageText').disabled = false; $('#messageFiles').disabled = false; $('#sendMessage').disabled = false; $('#attachFile').disabled = false;
    await loadMessages();
  }

  async function loadMessages() {
    if (!target) { messageList.innerHTML = ''; return; }
    status.textContent = 'Loading private messages…';
    const r = await db.from('direct_messages').select('id,sender_id,recipient_id,body,file_path,created_at')
      .or('and(sender_id.eq.' + me.id + ',recipient_id.eq.' + target + '),and(sender_id.eq.' + target + ',recipient_id.eq.' + me.id + ')')
      .order('created_at', {ascending:true}).limit(200);
    if (r.error) { status.textContent = 'Could not load messages. Run the updated messaging SQL. Details: ' + r.error.message; return; }
    const rows = await Promise.all((r.data || []).map(async m => {
      let attachment = '';
      if (m.file_path) {
        const signed = await db.storage.from(bucket).createSignedUrl(m.file_path, 3600);
        if (signed.data?.signedUrl) {
          const url = esc(signed.data.signedUrl), path = m.file_path.toLowerCase();
          if (/\.(png|jpe?g|gif|webp|avif)$/i.test(path)) attachment = '<a href="' + url + '" target="_blank" rel="noopener"><img class="private-message-image" src="' + url + '" alt="Shared photo"></a>';
          else if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(path)) attachment = '<video class="private-message-video" controls preload="metadata" src="' + url + '"></video>';
          else attachment = '<p><a href="' + url + '" target="_blank" rel="noopener" download>Open shared file</a></p>';
        } else attachment = '<p class="muted small">Attachment is unavailable.</p>';
      }
      return '<article class="message-item ' + (m.sender_id === me.id ? 'mine' : 'theirs') + '">' + (m.body ? '<div class="message-body">' + esc(m.body).replace(/\n/g, '<br>') + '</div>' : '') + attachment + '<div class="message-meta">' + new Date(m.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) + '</div></article>'; 
    }));
    status.textContent = '';
    messageList.innerHTML = rows.join('') || '<p class="muted">No messages yet. Send a private message to start chatting.</p>';
    messageList.scrollTop = messageList.scrollHeight;
  }

  async function loadConversationList() {
    const list = $('#conversationList');
    const r = await db.from('direct_messages').select('sender_id,recipient_id,body,file_path,created_at').or('sender_id.eq.' + me.id + ',recipient_id.eq.' + me.id).order('created_at', {ascending:false}).limit(500);
    if (r.error) { list.innerHTML = '<p class="muted small">Could not load conversations. ' + esc(r.error.message) + '</p>'; return; }
    const latest = new Map();
    (r.data || []).forEach(m => { const other = m.sender_id === me.id ? m.recipient_id : m.sender_id; if (other && !latest.has(other)) latest.set(other, m); });
    if (!latest.size) { list.innerHTML = ''; return; }
    const ids = [...latest.keys()];
    const pr = await db.from('profiles').select('id,display_name,avatar_url').in('id', ids);
    const profiles = new Map((pr.data || []).map(p => [p.id, p]));
    list.innerHTML = ids.map(id => { const p = profiles.get(id) || {id,display_name:'LeToG member'}; const m = latest.get(id); const label = p.display_name || 'LeToG member'; const preview = m.body || (m.file_path ? 'Attachment' : 'Message'); const avatar = p.avatar_url ? '<img class="recipient-avatar" src="' + esc(p.avatar_url) + '" alt="">' : '<span class="recipient-avatar">' + esc(label.trim().charAt(0).toUpperCase()) + '</span>'; return '<button type="button" class="recipient-result conversation-result" data-recipient="' + esc(id) + '" data-name="' + esc(label) + '" data-avatar="' + esc(p.avatar_url || '') + '">' + avatar + '<span class="conversation-result-copy"><span class="recipient-result-name">' + esc(label) + '</span><span class="conversation-preview">' + esc(preview) + '</span></span><span class="conversation-time">' + new Date(m.created_at).toLocaleDateString([], {month:'short',day:'numeric'}) + '</span></button>'; }).join('');
  }

  $('#recipientSearch').addEventListener('input', async () => {
    const q = $('#recipientSearch').value.trim();
    if (q.length < 2) { $('#recipientResults').innerHTML = ''; return; }
    const r = await db.from('profiles').select('id,display_name,avatar_url').ilike('display_name', '%' + q.replace(/[%_]/g, '') + '%').neq('id', me.id).order('display_name').limit(50);
    if (r.error) { $('#recipientResults').textContent = 'Could not search members.'; return; }
    $('#recipientResults').innerHTML = (r.data || []).map(p => '<button type="button" class="recipient-result" data-recipient="' + esc(p.id) + '" data-name="' + esc(p.display_name || 'Member') + '" data-avatar="' + esc(p.avatar_url || '') + '">' + (p.avatar_url ? '<img class="recipient-avatar" src="' + esc(p.avatar_url) + '" alt="">' : '<span class="recipient-avatar">' + esc((p.display_name || 'M').trim().charAt(0).toUpperCase()) + '</span>') + '<span class="recipient-result-name">' + esc(p.display_name || 'Member') + '</span><span class="recipient-result-action">Open chat →</span></button>').join('') || '<p class="muted small">No users found.</p>';
  });
  $('#recipientResults').addEventListener('click', e => { const b = e.target.closest('[data-recipient]'); if (b) setTarget(b.dataset.recipient, b.dataset.name, b.dataset.avatar || ''); });
  $('#conversationList').addEventListener('click', e => { const b = e.target.closest('[data-recipient]'); if (b) setTarget(b.dataset.recipient, b.dataset.name, b.dataset.avatar || ''); });
  $('#closeChat').addEventListener('click', () => { target = null; document.body.classList.remove('private-chat-open'); history.replaceState(null, '', 'messages.html'); chatPanel.hidden = true; emptyHint.hidden = false; messageList.innerHTML = ''; $('#messageText').value = ''; $('#messageFiles').value = ''; $('#recipientSearch').focus(); });
  $('#attachFile').addEventListener('click', () => { const f = $('#messageFiles'); f.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.ppt,.pptx,.xls,.xlsx'; f.click(); });
  $('#messageFiles').addEventListener('change', () => { const f = $('#messageFiles').files[0]; if (f) status.textContent = 'Attached: ' + f.name; });

  $('#messageForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!target) { status.textContent = 'Search for and select a member first.'; return; }
    const body = $('#messageText').value.trim();
    const files = Array.from($('#messageFiles').files || []);
    if (!body && !files.length) { status.textContent = 'Write a message or attach a file, photo, or video.'; return; }
    if (files.length > 1) { status.textContent = 'Please attach one file per message.'; return; }
    const send = $('#sendMessage'); send.disabled = true; status.textContent = 'Sending privately…';
    let filePath = null;
    if (files.length) {
      const file = files[0];
      if (file.size > 50 * 1024 * 1024) { status.textContent = 'File must be 50 MB or smaller.'; send.disabled = false; return; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      filePath = me.id + '/' + target + '/' + Date.now() + '_' + safe;
      const up = await db.storage.from(bucket).upload(filePath, file, {upsert:false, contentType:file.type || 'application/octet-stream'});
      if (up.error) { status.textContent = 'Could not upload attachment. Check the updated messaging SQL and private storage policies. ' + up.error.message; send.disabled = false; return; }
    }
    const row = {sender_id:me.id, recipient_id:target, body:body || '', file_path:filePath};
    const r = await db.from('direct_messages').insert(row);
    send.disabled = false;
    if (r.error) { status.textContent = 'Could not send message: ' + r.error.message; return; }
    $('#messageText').value = ''; $('#messageFiles').value = ''; status.textContent = '';
    await loadMessages();
    await loadConversationList();
  });

  $('#messageText').disabled = true; $('#messageFiles').disabled = true; $('#sendMessage').disabled = true; $('#attachFile').disabled = true; chatPanel.hidden = true; await loadConversationList();
  if (target) {
    const r = await db.from('profiles').select('id,display_name,avatar_url').eq('id', target).maybeSingle();
    if (r.data) { await setTarget(target, r.data.display_name, r.data.avatar_url || ''); $('#attachFile').disabled = false; }
  }
});
