/* LeToG live search: study-note titles/descriptions/tags/categories, member names, and community posts. */
document.addEventListener("DOMContentLoaded", function () {
  var input=document.querySelector("#query"), list=document.querySelector("#resultList"), title=document.querySelector("#resultsTitle"), sort=document.querySelector("#sort");
  var params=new URLSearchParams(location.search); input.value=params.get("q")||"";
  var client=window.leToGSupabase; var runId=0;
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function card(kind,name,desc,meta,url){return '<article class="card live-search-result"><div class="small muted">'+esc(kind)+'</div><h3><a href="'+esc(url||"#")+'">'+esc(name||"Untitled")+'</a></h3><p>'+esc(desc||"")+'</p><div class="small muted">'+esc(meta||"")+'</div></article>';}
  async function render(){var id=++runId, q=input.value.trim(); if(!q){title.textContent="Search LeToG";list.innerHTML='<div class="empty-state"><h3>Search notes, tags, categories, or usernames</h3><p class="muted">Enter a word in the search bar above.</p></div>';return;} if(!client){title.textContent="Search unavailable";list.innerHTML='<p class="muted">Supabase is not configured. Restore your own Project URL and Publishable key.</p>';return;} title.textContent='Searching for “'+q+'”…';list.innerHTML='<p class="muted">Searching notes, members, and community posts…</p>'; var pattern='%'+q.replace(/[%_]/g,'')+'%';
    try {var jobs=await Promise.all([
      client.from('study_notes').select('id,title,subject,description,tags,file_name,created_at,profiles!study_notes_user_id_fkey(display_name)').or('title.ilike.'+pattern+',subject.ilike.'+pattern+',description.ilike.'+pattern).order('created_at',{ascending:false}).limit(40),
      client.from('profiles').select('id,display_name,bio,avatar_url').ilike('display_name',pattern).limit(30),
      client.from('community_posts').select('id,title,body,created_at,profiles!community_posts_user_id_fkey(display_name)').or('title.ilike.'+pattern+',body.ilike.'+pattern).order('created_at',{ascending:false}).limit(30)
    ]); if(id!==runId)return; var notes=jobs[0].data||[], users=jobs[1].data||[], posts=jobs[2].data||[]; if(jobs.some(x=>x.error)) console.warn('Some LeToG search sources could not be queried',jobs.filter(x=>x.error).map(x=>x.error));
      // Also search tags/categories in returned notes, because tags are stored as arrays.
      var tagsResult=await client.from('study_notes').select('id,title,subject,description,tags,file_name,created_at').order('created_at',{ascending:false}).limit(150); if(id!==runId)return;
      var allNotes=tagsResult.data||[]; allNotes.forEach(n=>{var hay=[n.subject,n.description].concat(Array.isArray(n.tags)?n.tags:[]).join(' ').toLowerCase();if(hay.includes(q.toLowerCase())&&!notes.some(x=>x.id===n.id))notes.push(n);});
      var html=[]; users.forEach(u=>html.push(card('Member',u.display_name,u.bio||'LeToG member','Username / profile','member.html?id='+encodeURIComponent(u.id))));
      notes.forEach(n=>html.push(card('Study note',n.title,[n.subject,n.description,Array.isArray(n.tags)?n.tags.join(', '):''].filter(Boolean).join(' · '),(n.profiles&&n.profiles.display_name?'By '+n.profiles.display_name+' · ':'')+(n.file_name||'Study note'),'note.html?id='+encodeURIComponent(n.id))));
      posts.forEach(p=>html.push(card('Community post',p.title||((p.body||'').slice(0,90)),p.body,(p.profiles&&p.profiles.display_name?'By '+p.profiles.display_name+' · ':'')+(p.created_at?new Date(p.created_at).toLocaleDateString():''),'community.html#post-'+encodeURIComponent(p.id))));
      title.textContent=html.length+' results for “'+q+'”'; list.innerHTML=html.length?html.join(''):'<div class="empty-state"><h3>No results found</h3><p class="muted">Try another tag, category, note title, or username.</p></div>';
    } catch(e){if(id!==runId)return;title.textContent='Search error';list.innerHTML='<p class="muted">Could not search right now. '+esc(e.message||'Please try again.')+'</p>';}}
  var timer; input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(render,250);}); document.querySelector('#searchForm').addEventListener('submit',function(e){e.preventDefault();var url=new URL(location.href);url.searchParams.set('q',input.value.trim());history.replaceState({},'',url);render();}); if(sort)sort.addEventListener('change',render); render();
});
