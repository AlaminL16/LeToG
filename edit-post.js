/* Full-page editor for owned study notes and community posts. */
document.addEventListener('DOMContentLoaded', async function(){
 const $=id=>document.getElementById(id), db=window.leToGSupabase, params=new URLSearchParams(location.search), type=params.get('type'), id=params.get('id');
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const status=msg=>{$('editStatus').textContent=msg||'';};
 const setVal=(id,v)=>{$(id).value=v==null?'':String(v);};
 if(!db){status('Supabase is not configured.');return;}
 if(!id||!['note','community'].includes(type)){status('This edit link is invalid.');return;}
 const auth=await db.auth.getUser(), user=auth.data?.user;
 if(!user){status('Please log in to edit your post.');return;}
 let row=null;
 if(type==='note'){
   $('editHeading').textContent='Edit study note';$('descriptionLabel').textContent='Description';$('backLink').href='home.html';$('cancelEditLink').href='home.html';
   const r=await db.from('study_notes').select('id,user_id,title,subject,difficulty,description,tags,file_name,created_at').eq('id',id).single();
   if(r.error){status('Could not load this study note: '+r.error.message);return;}row=r.data;
   if(row.user_id!==user.id){status('You can only edit your own study notes.');return;}
   setVal('postTitle',row.title);setVal('postSubject',row.subject||'');setVal('postDifficulty',row.difficulty||'Not specified');setVal('postDescription',row.description||'');setVal('postTags',Array.isArray(row.tags)?row.tags.join(', '):'');setVal('postAttachment',row.file_name||'No uploaded file');setVal('postOwner',user.email||'Your account');
 }else{
   $('editHeading').textContent='Edit community post';$('subjectLabel').hidden=true;$('postSubject').hidden=true;$('difficultyLabel').hidden=true;$('postDifficulty').hidden=true;$('descriptionLabel').textContent='Post text';$('tagsLabel').hidden=true;$('postTags').hidden=true;$('backLink').href=params.get('community_id')?'community.html?id='+encodeURIComponent(params.get('community_id')):'community.html';$('cancelEditLink').href=$('backLink').href;
   const r=await db.from('community_posts').select('id,user_id,community_id,title,body,file_name,created_at').eq('id',id).single();
   if(r.error){status('Could not load this community post: '+r.error.message);return;}row=r.data;
   if(row.user_id!==user.id){status('You can only edit your own community posts.');return;}
   if(params.get('community_id')&&row.community_id!==params.get('community_id')){status('This post does not belong to the selected community.');return;}
   setVal('postTitle',row.title||'');$('postTitle').required=false;setVal('postDescription',row.body||'');$('postDescription').required=false;setVal('postAttachment',row.file_name||'No attachment');setVal('postOwner',user.email||'Your account');
 }
 $('editPostForm').hidden=false;
 $('editPostForm').addEventListener('submit',async e=>{
   e.preventDefault();const save=$('savePostButton');save.disabled=true;status('Saving changes…');
   try{
     let result;
     if(type==='note'){
       const title=$('postTitle').value.trim(),description=$('postDescription').value.trim(),tags=$('postTags').value.split(',').map(t=>t.trim()).filter(Boolean);
       if(!title||!description)throw new Error('Title and description are required.');
       result=await db.from('study_notes').update({title,description,tags}).eq('id',id).eq('user_id',user.id);
     }else{
       const title=$('postTitle').value.trim(),body=$('postDescription').value.trim();
       if(!body&&!row.file_name)throw new Error('Please add some post text.');
       result=await db.from('community_posts').update({title:title||null,body}).eq('id',id).eq('user_id',user.id);
     }
     if(result.error)throw result.error;status('Changes saved successfully.');location.href=type==='note'?'home.html':'community.html?id='+encodeURIComponent(row.community_id||params.get('community_id')||'');
   }catch(err){status('Could not save changes: '+(err.message||'Please try again.'));save.disabled=false;}
 });
});
