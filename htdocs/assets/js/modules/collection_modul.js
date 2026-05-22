class CollectionModalComponent {
  constructor(){this.root=null;this.list=null;this.nameInput=null;this.tagsField=null;this.tagsList=null;this.tagsSuggestList=null;this.tagsInputRow=null;this.tagsAddButton=null;this.submitButton=null;this.deleteButton=null;this.tags=[];this.maxTags=24;this.maxVisibleTagRows=3;this.mode='create';this.selectedCollection='';}
  init(){
    this.root=document.getElementById('collection-modal'); if(!this.root) return;
    this.list=this.root.querySelector('[data-component="collection-modal-list"]');
    this.nameInput=this.root.querySelector('[data-component="collection-modal-name"]');
    this.tagsField=this.root.querySelector('[data-component="collection-modal-tags-input"]');
    this.tagsList=this.root.querySelector('[data-component="collection-modal-tags-list"]');
    this.tagsSuggestList=this.root.querySelector('[data-component="collection-modal-tags-suggest-list"]');
    this.tagsInputRow=this.root.querySelector('[data-component="collection-modal-tags-input-row"]');
    this.tagsAddButton=this.root.querySelector('[data-component="collection-modal-tags-add-button"]');
    this.submitButton=this.root.querySelector('.collection-modal__button--submit');
    this.deleteButton=this.root.querySelector('[data-component="collection-modal-delete"]');

    document.addEventListener('collection-modal:open',()=>{ if (App.modalCtrl) { App.modalCtrl.open('collection-modal'); return; } this.open(); });
    this.root.addEventListener('click',(e)=>{if(e.target===this.root||e.target.closest('[data-component="collection-modal-cancel"]')) this.close();});
    this.nameInput?.addEventListener('input',()=>{const n=this.nameInput.value.replace(/[^a-zа-яё0-9_ ]/gi,'').slice(0,32);if(n!==this.nameInput.value)this.nameInput.value=n;});
    this.bindTagsHandlers();
    this.submitButton?.addEventListener('click',()=>this.submitByMode());
    this.deleteButton?.addEventListener('click',()=>this.deleteCurrentCollection());

    App.modalCtrl?.register('collection-modal', { show: () => this.showOnly(), hide: () => this.hideOnly() });
  }
  bindTagsHandlers(){ if (!this.tagsField || !this.tagsAddButton) return; this.tagsField.addEventListener('keydown',(event)=>{ if(event.key==='Enter'){event.preventDefault();this.addTagFromInput();return;} if (event.key==='Tab'&&!event.shiftKey){const b=this.tagsSuggestList?.querySelector('button');const open=this.tagsSuggestList && !this.tagsSuggestList.classList.contains('collection-modal__tags-suggest-list--hidden'); if(!open||!b) return; event.preventDefault(); this.tagsField.value=b.dataset.tag||''; this.addTagFromInput();}}); this.tagsField.addEventListener('input',()=>{const normalized=this.tagsField.value.replace(/[^a-zа-яё0-9_#]/gi,'').slice(0,20); if(normalized!==this.tagsField.value)this.tagsField.value=normalized; this.loadTagSuggestions();}); this.tagsAddButton.addEventListener('click',()=>this.addTagFromInput()); }
  async open(){ this.showOnly(); await this.load(); this.renderTags(); this.setCreateMode(false); this.nameInput?.focus(); }
  close(){ if (App.modalCtrl) { App.modalCtrl.close('collection-modal'); return; } this.hideOnly(); this.hideTagSuggestions(); }
  showOnly(){ this.root.classList.remove('collection-modal--hidden'); this.root.setAttribute('aria-hidden','false'); }
  hideOnly(){ this.root.classList.add('collection-modal--hidden'); this.root.setAttribute('aria-hidden','true'); }

  setCreateMode(clear=true){ this.mode='create'; this.selectedCollection=''; this.list?.querySelectorAll('.collection-modal__collection-item.is-selected').forEach((el)=>el.classList.remove('is-selected')); if(clear){this.nameInput.value=''; this.tags=[]; if(this.tagsField)this.tagsField.value=''; this.renderTags();} if(this.submitButton) this.submitButton.textContent='Создать коллекцию'; this.root.classList.remove('collection-modal--edit'); }
  setEditMode(collectionName,tags){ this.mode='edit'; this.selectedCollection=collectionName; this.nameInput.value=collectionName==='Профиль'?'Profile':collectionName; this.tags=Array.isArray(tags)?tags:[]; this.renderTags(); if(this.submitButton) this.submitButton.textContent='Сохранить'; this.root.classList.add('collection-modal--edit'); }

  async load(){
    if(!this.list) return; this.list.innerHTML='';
    let collections=[];
    try{const r=await fetch('/collections/list',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}}); const p=await r.json(); if(r.ok&&p.success&&Array.isArray(p.collections)) collections=p.collections;}catch(e){console.warn(e);}
    const localized=collections.map((v)=>String(v||'').trim()).filter(Boolean).map((n)=>this.isProfileCollectionName(n)?'Профиль':n);
    if(!localized.includes('Профиль')) localized.unshift('Профиль');
    localized.forEach((name)=>{const li=document.createElement('li'); const btn=document.createElement('button'); btn.type='button'; btn.className='collection-modal__collection-item'; btn.textContent=name; btn.dataset.collection=name; if(name==='Профиль'){btn.dataset.isProfile='1'; btn.setAttribute('aria-disabled','true');} btn.addEventListener('click',()=>this.selectCollection(btn)); li.appendChild(btn); this.list.appendChild(li);});
    const addItem=document.createElement('li'); const addButton=document.createElement('button'); addButton.type='button'; addButton.className='collection-modal__collection-item collection-modal__collection-item--add'; addButton.textContent='+'; addButton.addEventListener('click',()=>{if(this.mode==='create'){this.nameInput?.focus();return;} this.setCreateMode(true); this.nameInput?.focus();}); addItem.appendChild(addButton); this.list.appendChild(addItem);
  }
  async selectCollection(btn){ if(!btn||btn.dataset.isProfile==='1') return; this.list?.querySelectorAll('.collection-modal__collection-item.is-selected').forEach((el)=>el.classList.remove('is-selected')); btn.classList.add('is-selected'); const name=btn.dataset.collection||btn.textContent.trim(); const tags=await this.loadCollectionTags(name); this.setEditMode(name,tags); }
  async loadCollectionTags(collectionName){ try{const r=await fetch(`/collections/tags?collection=${encodeURIComponent(collectionName)}`); const p=await r.json(); if(r.ok&&p.success&&Array.isArray(p.tags)) return p.tags.map((t)=>this.normalizeTag(t)).filter(Boolean);}catch(e){console.warn(e);} return []; }

  isProfileCollectionName(v){ const n=String(v||'').trim().toLowerCase(); return n==='profile'||n==='профиль'; }
  normalizeTag(raw){return String(raw||'').replace(/^#/,'').trim().toLowerCase().replace(/[^a-zа-яё0-9_]/gi,'').slice(0,20);}
  addTagFromInput(){ if(!this.tagsField) return; if(this.tags.length>=this.maxTags){this.tagsField.value=''; this.hideTagSuggestions(); return;} const c=this.normalizeTag(this.tagsField.value); if(!c){this.tagsField.value=''; this.hideTagSuggestions(); return;} if(!this.tags.includes(c)) this.tags.push(c); this.tagsField.value=''; this.hideTagSuggestions(); this.renderTags(); }
  renderTags(){ if(!this.tagsList) return; this.tagsList.innerHTML=''; const availableWidth=this.tagsList.clientWidth||370; let row=this.createTagRow(); let rowWidth=0; let hidden=0; this.tags.forEach((tag,i)=>{const el=document.createElement('button'); el.type='button'; el.className='collection-modal__tag-item'; el.innerHTML=`<span class="collection-modal__tag-label">#${this.escapeHtml(tag)}</span>`; el.addEventListener('click',()=>this.removeTag(i)); row.appendChild(el); const w=el.offsetWidth||this.estimateTagWidth(tag); if(rowWidth+w+6>availableWidth&&rowWidth>0){row.removeChild(el); if(this.tagsList.children.length>=this.maxVisibleTagRows){hidden+=1; return;} row=this.createTagRow(); rowWidth=0; row.appendChild(el);} rowWidth+=w+6;}); if(hidden>0) this.appendMoreTag(hidden); }
  removeTag(i){ if(i<0||i>=this.tags.length) return; this.tags.splice(i,1); this.renderTags(); }
  createTagRow(){ const row=document.createElement('div'); row.className='collection-modal__tags-row'; this.tagsList.appendChild(row); return row; }
  appendMoreTag(c){ if(!this.tagsList||c<=0) return; const rows=Array.from(this.tagsList.querySelectorAll('.collection-modal__tags-row')); const last=rows[rows.length-1]; if(!last) return; const more=document.createElement('button'); more.type='button'; more.className='collection-modal__tag-item collection-modal__tag-item--more'; more.textContent=`+${c}`; last.appendChild(more); }
  estimateTagWidth(tag){ return 34+String(tag).length*9; }
  async loadTagSuggestions(){ if(!this.tagsField||!this.tagsSuggestList||!this.tagsInputRow) return; const q=this.normalizeTag(this.tagsField.value); if(!q){this.hideTagSuggestions();return;} try{const r=await fetch(`/hashtags/suggest?q=${encodeURIComponent(q)}`); if(!r.ok){this.hideTagSuggestions();return;} const p=await r.json(); if(!p.success||!Array.isArray(p.tags)||p.tags.length===0){this.hideTagSuggestions();return;} this.tagsSuggestList.innerHTML=p.tags.map((tag)=>`<li><button type="button" data-tag="${this.escapeHtml(tag)}"><span class="collection-modal__tags-suggest-match">#</span>${this.highlightSuggestionMatch(tag,q)}</button></li>`).join(''); this.tagsSuggestList.querySelectorAll('button').forEach((b)=>b.addEventListener('click',()=>{this.tagsField.value=b.dataset.tag||''; this.addTagFromInput();})); this.tagsSuggestList.classList.remove('collection-modal__tags-suggest-list--hidden'); this.tagsInputRow.classList.add('collection-modal__tags-input-row--suggest-open'); }catch(_){this.hideTagSuggestions();}}
  hideTagSuggestions(){ if(!this.tagsSuggestList||!this.tagsInputRow) return; this.tagsSuggestList.classList.add('collection-modal__tags-suggest-list--hidden'); this.tagsSuggestList.innerHTML=''; this.tagsInputRow.classList.remove('collection-modal__tags-input-row--suggest-open'); }
  highlightSuggestionMatch(tag,q){ const t=this.escapeHtml(tag); const nq=this.escapeRegex(q); if(!nq) return t; return t.replace(new RegExp(`(${nq})`,'i'),'<span class="collection-modal__tags-suggest-match">$1</span>'); }
  escapeHtml(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
  escapeRegex(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  async submitByMode(){ if(this.mode==='edit') return this.updateCollection(); return this.createCollection(); }
  async createCollection(){ const name=(this.nameInput?.value||'').trim(); if(!name||!this.submitButton) return; this.submitButton.disabled=true; try{const r=await fetch('/collections/create',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:new URLSearchParams({collection:name,tags:this.tags.join(' ')}).toString()}); const p=await r.json(); if(!r.ok||!p.success) return; this.setCreateMode(true); await this.load();}catch(e){console.warn(e);} finally{this.submitButton.disabled=false;} }
  async updateCollection(){ const oldName=this.selectedCollection; const newName=(this.nameInput?.value||'').trim(); if(!oldName||!newName||!this.submitButton) return; this.submitButton.disabled=true; try{const r=await fetch('/collections/update',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:new URLSearchParams({old_collection:oldName,collection:newName,tags:this.tags.join(' ')}).toString()}); const p=await r.json(); if(!r.ok||!p.success) return; await this.load(); const match=Array.from(this.list.querySelectorAll('.collection-modal__collection-item')).find(b=>b.textContent.trim()===(p.collection||newName==='Profile'?'Профиль':newName)); if(match) await this.selectCollection(match);}catch(e){console.warn(e);} finally{this.submitButton.disabled=false;} }
  async deleteCurrentCollection(){ if(this.mode!=='edit'||!this.selectedCollection||this.isProfileCollectionName(this.selectedCollection)||!this.deleteButton) return; this.deleteButton.disabled=true; try{const r=await fetch('/collections/delete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:new URLSearchParams({collection:this.selectedCollection}).toString()}); const p=await r.json(); if(!r.ok||!p.success) return; this.setCreateMode(true); await this.load();}catch(e){console.warn(e);} finally{this.deleteButton.disabled=false;} }
}
App.register('collection_modul.js', CollectionModalComponent);
