class CollectionModalComponent {
  constructor(){this.root=null;this.list=null;this.nameInput=null;this.tagsField=null;this.tagsList=null;this.tagsSuggestList=null;this.tagsInputRow=null;this.tagsAddButton=null;this.submitButton=null;this.deleteButton=null;this.panel=null;this.tags=[];this.maxTags=24;this.maxVisibleTagRows=3;this.mode='create';this.selectedCollection='';this.lastNonModalUrl=App.history?.isModalPath?.()?'/':window.location.pathname + window.location.search;this.currentModalUrl=null;this.modalOpenHandler=null;this.rootClickHandler=null;this.nameInputHandler=null;this.submitClickHandler=null;this.deleteClickHandler=null;this.closeBlockedTimer=null;}
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
    this.panel=this.root.querySelector('.collection-modal__panel');

    this.modalOpenHandler=async (event)=>{ if (App.modalCtrl) { App.modalCtrl.open('collection-modal'); await this.open(event?.detail||{}); return; } await this.open(event?.detail||{}); };
    document.addEventListener('collection-modal:open', this.modalOpenHandler);
    this.rootClickHandler=(e)=>{if(e.target===this.root){ if(this.hasUnsavedChanges()){ this.blockOverlayClose(); return; } this.requestClose(); } if(e.target.closest('[data-component="collection-modal-cancel"]')) this.requestClose();};
    this.root.addEventListener('click',this.rootClickHandler);
    this.nameInputHandler=()=>{const n=this.nameInput.value.replace(/[^a-zа-яё0-9_ ]/gi,'').slice(0,32);if(n!==this.nameInput.value)this.nameInput.value=n;};
    this.nameInput?.addEventListener('input',this.nameInputHandler);
    this.bindTagsHandlers();
    this.submitClickHandler=()=>this.submitByMode();
    this.submitButton?.addEventListener('click',this.submitClickHandler);
    this.deleteClickHandler=()=>this.deleteCurrentCollection();
    this.deleteButton?.addEventListener('click',this.deleteClickHandler);

    App.modalCtrl?.register('collection-modal', { show: () => this.showOnly(), hide: () => this.hideOnly() });
  }

  getModalUrl(){ return this.currentModalUrl; }
  setModalUrl(nextUrl,options={}){ if(!nextUrl) return; const current=window.location.pathname + window.location.search; const fromHistory=!!options.fromHistory; const isCurrentModalUrl=!!App.history?.isModalUrl?.(current); this.currentModalUrl=nextUrl; if(!isCurrentModalUrl) this.lastNonModalUrl=current; if(fromHistory||current===nextUrl) return; App.history?.pushUrl ? App.history.pushUrl(nextUrl) : window.history.pushState({},'',nextUrl); }
  restoreNonModalUrl(){ const target=this.lastNonModalUrl||'/'; const current=window.location.pathname + window.location.search; if(current===target) return; App.history?.replaceUrl ? App.history.replaceUrl(target) : window.history.replaceState({},'',target); }
  bindTagsHandlers(){ if (!this.tagsField || !this.tagsAddButton) return; this.tagsField.addEventListener('keydown',(event)=>{ if(event.key==='Enter'){event.preventDefault();this.addTagFromInput();return;} if (event.key==='Tab'&&!event.shiftKey){const b=this.tagsSuggestList?.querySelector('button');const open=this.tagsSuggestList && !this.tagsSuggestList.classList.contains('collection-modal__tags-suggest-list--hidden'); if(!open||!b) return; event.preventDefault(); this.tagsField.value=b.dataset.tag||''; this.addTagFromInput();}}); this.tagsField.addEventListener('input',()=>{const normalized=this.tagsField.value.replace(/[^a-zа-яё0-9_#]/gi,'').slice(0,20); if(normalized!==this.tagsField.value)this.tagsField.value=normalized; this.loadTagSuggestions();}); this.tagsAddButton.addEventListener('click',()=>this.addTagFromInput()); }
  async open(options={}){ this.setModalUrl('/collections',options); this.showOnly(); await this.load(); this.renderTags(); this.setCreateMode(false); this.nameInput?.focus(); }
  close(options={}){ const { skipHistorySync=false } = options; if(!skipHistorySync) this.restoreNonModalUrl(); this.currentModalUrl=null; if (App.modalCtrl) { App.modalCtrl.close('collection-modal'); } this.hideOnly(); this.hideTagSuggestions(); this.resetForm(); }
  showOnly(){ this.root.classList.remove('collection-modal--hidden'); this.root.setAttribute('aria-hidden','false'); }
  hideOnly(){ this.root.classList.add('collection-modal--hidden'); this.root.setAttribute('aria-hidden','true'); }

  setCreateMode(clear=true){ this.mode='create'; this.selectedCollection=''; this.list?.querySelectorAll('.collection-modal__collection-item.is-selected').forEach((el)=>el.classList.remove('is-selected')); if(clear){this.nameInput.value=''; this.tags=[]; if(this.tagsField)this.tagsField.value=''; this.renderTags();} if(this.submitButton) this.submitButton.textContent='Создать коллекцию'; this.root.classList.remove('collection-modal--edit'); this.captureSnapshot(); }
  setEditMode(collectionName,tags){ this.mode='edit'; this.selectedCollection=collectionName; this.nameInput.value=collectionName==='Профиль'?'Profile':collectionName; this.tags=Array.isArray(tags)?tags:[]; this.renderTags(); if(this.submitButton) this.submitButton.textContent='Сохранить'; this.root.classList.add('collection-modal--edit'); this.captureSnapshot(); }

  async load(){
    if(!this.list) return; this.list.innerHTML='';
    let collections=[];
    try{const r=await fetch('/collections/list',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}}); const p=await r.json(); if(r.ok&&p.success&&Array.isArray(p.collections)) collections=p.collections;}catch(e){console.warn(e);}
    const localized=collections.map((v)=>String(v||'').trim()).filter(Boolean).map((n)=>this.isProfileCollectionName(n)?'Профиль':n);
    if(!localized.includes('Профиль')) localized.unshift('Профиль');
    localized.forEach((name)=>{const li=document.createElement('li'); const btn=document.createElement('button'); btn.type='button'; btn.className='collection-modal__collection-item'; btn.textContent=name; btn.dataset.collection=name; if(name==='Профиль'){btn.dataset.isProfile='1'; btn.setAttribute('aria-disabled','true');} btn.addEventListener('click',()=>this.selectCollection(btn)); li.appendChild(btn); this.list.appendChild(li);});
    const addItem=document.createElement('li'); const addButton=document.createElement('button'); addButton.type='button'; addButton.className='collection-modal__collection-item collection-modal__collection-item--add'; addButton.setAttribute('aria-label','Создать коллекцию'); addButton.innerHTML='<span class="collection-modal__plus-icon" aria-hidden="true">+</span>'; addButton.addEventListener('click',()=>{if(this.mode==='create'){this.nameInput?.focus();return;} this.setCreateMode(true); this.nameInput?.focus();}); addItem.appendChild(addButton); this.list.appendChild(addItem);
  }
  async selectCollection(btn){ if(!btn||btn.dataset.isProfile==='1') return; this.list?.querySelectorAll('.collection-modal__collection-item.is-selected').forEach((el)=>el.classList.remove('is-selected')); btn.classList.add('is-selected'); const name=btn.dataset.collection||btn.textContent.trim(); const tags=await this.loadCollectionTags(name); this.setEditMode(name,tags); }
  async parseJsonResponse(response){const t=await response.text(); try{return JSON.parse(t);}catch(_){throw new Error('Сервер вернул некорректный ответ.');}}
  async loadCollectionTags(collectionName){ try{const r=await fetch(`/collections/tags?collection=${encodeURIComponent(collectionName)}`); const p=await this.parseJsonResponse(r); if(!r.ok||!p.success) return []; const rawTags=Array.isArray(p.tags)?p.tags:(typeof p.tags==='string'?p.tags.split(/\s+/):[]); return rawTags.map((t)=>this.normalizeTag(t)).filter(Boolean);}catch(e){console.warn('Unable to load collection tags',e);} return []; }

  isProfileCollectionName(v){ const n=String(v||'').trim().toLowerCase(); return n==='profile'||n==='профиль'; }
  normalizeTag(raw){return String(raw||'').replace(/^#/,'').trim().toLowerCase().replace(/[^a-zа-яё0-9_]/gi,'').slice(0,20);}
  addTagFromInput(){ if(!this.tagsField) return; if(this.tags.length>=this.maxTags){this.tagsField.value=''; this.hideTagSuggestions(); this.showToast(`Можно добавить не более ${this.maxTags} тегов`); return;} const c=this.normalizeTag(this.tagsField.value); if(!c){this.tagsField.value=''; this.hideTagSuggestions(); return;} if(!this.tags.includes(c)) this.tags.push(c); this.tagsField.value=''; this.hideTagSuggestions(); this.renderTags(); }
  renderTags(){ if(!this.tagsList) return; this.tagsList.innerHTML=''; const availableWidth=this.tagsList.clientWidth||370; const rows=[this.createTagRow()]; let hidden=0; this.tags.forEach((tag,i)=>{const currentRow=rows[rows.length-1]; const el=document.createElement('button'); el.type='button'; el.className='collection-modal__tag-item'; el.innerHTML=`<span class="collection-modal__tag-label">#${this.escapeHtml(tag)}</span>`; el.addEventListener('click',()=>this.removeTag(i)); currentRow.appendChild(el); this.adjustTagsSpacing(currentRow,false); if(currentRow.scrollWidth<=availableWidth) return; currentRow.removeChild(el); this.adjustTagsSpacing(currentRow,true); if(rows.length>=this.maxVisibleTagRows){hidden+=1; return;} const nextRow=this.createTagRow(); rows.push(nextRow); nextRow.appendChild(el); this.adjustTagsSpacing(nextRow,false); if(nextRow.scrollWidth>availableWidth){nextRow.removeChild(el); this.adjustTagsSpacing(nextRow,false); hidden+=1;}}); if(hidden>0) this.appendHiddenMoreChip(hidden,availableWidth); const last=rows[rows.length-1]; if(last) this.adjustTagsSpacing(last,false); }
  removeTag(i){ if(i<0||i>=this.tags.length) return; this.tags.splice(i,1); this.renderTags(); }
  createTagRow(){ const row=document.createElement('div'); row.className='collection-modal__tags-row'; this.tagsList.appendChild(row); return row; }
  appendHiddenMoreChip(hiddenCount,availableWidth){ if(!this.tagsList||hiddenCount<=0) return; const rows=Array.from(this.tagsList.querySelectorAll('.collection-modal__tags-row')); const last=rows[rows.length-1]; if(!last) return; const more=document.createElement('button'); more.type='button'; more.className='collection-modal__tag-item collection-modal__tag-item--more'; more.textContent=`+${hiddenCount}`; last.appendChild(more); this.adjustTagsSpacing(last,false); while(last.scrollWidth>availableWidth){ const regular=Array.from(last.querySelectorAll('.collection-modal__tag-item:not(.collection-modal__tag-item--more)')); const chip=regular.pop(); if(!chip) break; last.removeChild(chip); hiddenCount+=1; more.textContent=`+${hiddenCount}`; this.adjustTagsSpacing(last,false);} }
  estimateTagWidth(tag){ return 34+String(tag).length*9; }
  adjustTagsSpacing(row,isClosed){ if(!row) return; const chips=Array.from(row.querySelectorAll('.collection-modal__tag-item:not(.collection-modal__tag-item--more)')); if(chips.length<=1){row.style.justifyContent='flex-start'; row.style.columnGap='5px'; return;} row.style.justifyContent=isClosed?'space-between':'flex-start'; row.style.columnGap=isClosed?'0px':'5px'; }
  resetForm(){ this.setCreateMode(true); this.hideTagSuggestions(); }
  async loadTagSuggestions(){ if(!this.tagsField||!this.tagsSuggestList||!this.tagsInputRow) return; const q=this.normalizeTag(this.tagsField.value); if(!q){this.hideTagSuggestions();return;} try{const r=await fetch(`/hashtags/suggest?q=${encodeURIComponent(q)}`); if(!r.ok){this.hideTagSuggestions();return;} const p=await r.json(); if(!p.success||!Array.isArray(p.tags)||p.tags.length===0){this.hideTagSuggestions();return;} this.tagsSuggestList.innerHTML=p.tags.map((tag)=>`<li><button type="button" data-tag="${this.escapeHtml(tag)}"><span class="collection-modal__tags-suggest-match">#</span>${this.highlightSuggestionMatch(tag,q)}</button></li>`).join(''); this.tagsSuggestList.querySelectorAll('button').forEach((b)=>b.addEventListener('click',()=>{this.tagsField.value=b.dataset.tag||''; this.addTagFromInput();})); this.tagsSuggestList.classList.remove('collection-modal__tags-suggest-list--hidden'); this.tagsInputRow.classList.add('collection-modal__tags-input-row--suggest-open'); }catch(_){this.hideTagSuggestions();}}
  hideTagSuggestions(){ if(!this.tagsSuggestList||!this.tagsInputRow) return; this.tagsSuggestList.classList.add('collection-modal__tags-suggest-list--hidden'); this.tagsSuggestList.innerHTML=''; this.tagsInputRow.classList.remove('collection-modal__tags-input-row--suggest-open'); }
  highlightSuggestionMatch(tag,q){ const t=this.escapeHtml(tag); const nq=this.escapeRegex(q); if(!nq) return t; return t.replace(new RegExp(`(${nq})`,'i'),'<span class="collection-modal__tags-suggest-match">$1</span>'); }
  escapeHtml(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
  escapeRegex(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  requestClose(){ if(this.hasUnsavedChanges()){ App.warn?.open({title:'Осторожно!',description:'У вас остались несохранённые изменения. После закрытия окна они будут сброшены. Хотите продолжить?',confirmLabel:'Закрыть окно',cancelLabel:'Назад',onConfirm:async()=>{ if(App.history?.isModalPath?.()&&window.history.length>1){this.close({skipHistorySync:true}); App.history?.markNextPopAsModalOnly?.(); window.history.back(); return;} this.close(); }}); return;} if(window.location.pathname==='/collections'&&window.history.length>1){window.history.back(); return;} this.close(); }
  blockOverlayClose(){ if(!this.panel) return; clearTimeout(this.closeBlockedTimer); this.panel.classList.remove('collection-modal__panel--close-blocked'); void this.panel.offsetWidth; this.panel.classList.add('collection-modal__panel--close-blocked'); this.closeBlockedTimer=setTimeout(()=>{this.panel?.classList.remove('collection-modal__panel--close-blocked'); this.closeBlockedTimer=null;},1000); }
  showToast(message){ document.dispatchEvent(new CustomEvent('app:toast',{detail:{message}})); }
  getSnapshot(){ return JSON.stringify({mode:this.mode,name:(this.nameInput?.value||'').trim(),tags:[...this.tags].sort(),selected:this.selectedCollection}); }
  captureSnapshot(){ this.savedSnapshot=this.getSnapshot(); }
  hasUnsavedChanges(){ return this.getSnapshot()!==this.savedSnapshot; }
  async submitByMode(){ if(this.mode==='edit') return this.updateCollection(); return this.createCollection(); }
  async createCollection(){ const name=(this.nameInput?.value||'').trim(); if(!name||!this.submitButton) return; this.submitButton.disabled=true; try{const r=await fetch('/collections/create',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:new URLSearchParams({collection:name,tags:this.tags.join(' ')}).toString()}); const p=await r.json(); if(!r.ok||!p.success) return; this.setCreateMode(true); await this.load(); this.showToast('Коллекция создана');}catch(e){console.warn(e);} finally{this.submitButton.disabled=false;} }
  async updateCollection(){ const oldName=this.selectedCollection; const newName=(this.nameInput?.value||'').trim(); if(!oldName||!newName||!this.submitButton) return; this.submitButton.disabled=true; try{const formData=new FormData(); formData.append('old_collection',oldName); formData.append('collection',newName); formData.append('tags',this.tags.join(' ')); const r=await fetch('/collections/update',{method:'POST',body:formData}); const p=await this.parseJsonResponse(r); if(!r.ok||!p.success) throw new Error(p.error||'Не удалось обновить коллекцию.'); await this.load(); const target=((p.collection||newName)==='Profile')?'Профиль':(p.collection||newName); const match=Array.from(this.list.querySelectorAll('.collection-modal__collection-item')).find(b=>b.textContent.trim()===target); if(match) await this.selectCollection(match); document.dispatchEvent(new CustomEvent('collections:changed')); this.showToast('Коллекция обновлена');}catch(e){console.warn('Unable to update collection',e); this.showToast(e?.message||'Ошибка при обновлении коллекции.');} finally{this.submitButton.disabled=false;} }
  async deleteCurrentCollection(){
    if(this.mode!=='edit'||!this.selectedCollection||this.isProfileCollectionName(this.selectedCollection)||!this.deleteButton) return;
    App.warn?.open({
      title:'Удалить коллекцию?',
      description:`Коллекция «${this.selectedCollection}» будет удалена без возможности восстановления.`,
      confirmLabel:'Удалить',
      cancelLabel:'Назад',
      onConfirm: async()=>{
        this.deleteButton.disabled=true;
        try{
          const formData=new FormData();
          formData.append('collection',this.selectedCollection);
          const r=await fetch('/collections/delete',{method:'POST',body:formData});
          const p=await this.parseJsonResponse(r);
          if(!r.ok||!p.success) throw new Error(p.error||'Не удалось удалить коллекцию.');
          this.setCreateMode(true);
          await this.load();
          document.dispatchEvent(new CustomEvent('collections:changed'));
          this.showToast('Коллекция удалена');
        }catch(e){console.warn('Unable to delete collection',e); this.showToast(e?.message||'Ошибка при удалении коллекции.');} finally{this.deleteButton.disabled=false;}
      }
    });
  }

  destroy(){
    clearTimeout(this.closeBlockedTimer);
    if(this.modalOpenHandler) document.removeEventListener('collection-modal:open', this.modalOpenHandler);
    if(this.root&&this.rootClickHandler) this.root.removeEventListener('click', this.rootClickHandler);
    if(this.nameInput&&this.nameInputHandler) this.nameInput.removeEventListener('input', this.nameInputHandler);
    if(this.submitButton&&this.submitClickHandler) this.submitButton.removeEventListener('click', this.submitClickHandler);
    if(this.deleteButton&&this.deleteClickHandler) this.deleteButton.removeEventListener('click', this.deleteClickHandler);
  }
}
App.register('collection_modal.js', CollectionModalComponent);
