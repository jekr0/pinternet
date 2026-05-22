class CollectionModalComponent {
  constructor(){this.root=null;this.list=null;this.nameInput=null;this.tagsField=null;this.tagsList=null;this.tagsSuggestList=null;this.tagsInputRow=null;this.tagsAddButton=null;this.tags=[];this.maxTags=24;this.maxVisibleTagRows=3;}
  init(){
    this.root=document.getElementById('collection-modal'); if(!this.root) return;
    this.list=this.root.querySelector('[data-component="collection-modal-list"]');
    this.nameInput=this.root.querySelector('[data-component="collection-modal-name"]');
    this.tagsField=this.root.querySelector('[data-component="collection-modal-tags-input"]');
    this.tagsList=this.root.querySelector('[data-component="collection-modal-tags-list"]');
    this.tagsSuggestList=this.root.querySelector('[data-component="collection-modal-tags-suggest-list"]');
    this.tagsInputRow=this.root.querySelector('[data-component="collection-modal-tags-input-row"]');
    this.tagsAddButton=this.root.querySelector('[data-component="collection-modal-tags-add-button"]');

    document.addEventListener('collection-modal:open',()=>{ if (App.modalCtrl) { App.modalCtrl.open('collection-modal'); return; } this.open(); });
    this.root.addEventListener('click',(e)=>{if(e.target===this.root||e.target.closest('[data-component="collection-modal-cancel"]')) this.close();});
    this.nameInput?.addEventListener('input',()=>{const n=this.nameInput.value.replace(/[^a-zа-яё0-9_ ]/gi,'').slice(0,32);if(n!==this.nameInput.value)this.nameInput.value=n;});
    this.bindTagsHandlers();

    App.modalCtrl?.register('collection-modal', { show: () => this.showOnly(), hide: () => this.hideOnly() });
  }
  bindTagsHandlers(){
    if (!this.tagsField || !this.tagsAddButton) return;
    this.tagsField.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'){event.preventDefault();this.addTagFromInput();return;}
      if (event.key === 'Tab' && !event.shiftKey) {
        const topSuggestionButton = this.tagsSuggestList?.querySelector('button');
        const isSuggestOpen = this.tagsSuggestList && !this.tagsSuggestList.classList.contains('collection-modal__tags-suggest-list--hidden');
        if (!isSuggestOpen || !topSuggestionButton) return;
        event.preventDefault();
        this.tagsField.value = topSuggestionButton.dataset.tag || '';
        this.addTagFromInput();
      }
    });
    this.tagsField.addEventListener('input',()=>{const normalized=this.tagsField.value.replace(/[^a-zа-яё0-9_#]/gi,'').slice(0,20); if(normalized!==this.tagsField.value)this.tagsField.value=normalized; this.loadTagSuggestions();});
    this.tagsAddButton.addEventListener('click',()=>this.addTagFromInput());
  }
  async open(){ this.showOnly(); await this.load(); this.renderTags(); this.nameInput?.focus(); }
  close(){ if (App.modalCtrl) { App.modalCtrl.close('collection-modal'); return; } this.hideOnly(); this.hideTagSuggestions(); }
  showOnly(){ this.root.classList.remove('collection-modal--hidden'); this.root.setAttribute('aria-hidden','false'); }
  hideOnly(){ this.root.classList.add('collection-modal--hidden'); this.root.setAttribute('aria-hidden','true'); }
  async load(){ if(!this.list) return; this.list.innerHTML=''; try{const r=await fetch('/collections/list',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}}); const p=await r.json(); if(p.success&&Array.isArray(p.collections)){this.list.innerHTML=p.collections.map(c=>`<li><button type="button" class="collection-modal__collection-item">${this.escapeHtml(c==='Profile'?'Профиль':c)}</button></li>`).join('');}}catch(e){console.warn(e);} }
  normalizeTag(rawTag){return String(rawTag||'').replace(/^#/, '').trim().toLowerCase().replace(/[^a-zа-яё0-9_]/gi, '').slice(0,20);}
  addTagFromInput(){ if(!this.tagsField) return; if(this.tags.length>=this.maxTags){this.tagsField.value=''; this.hideTagSuggestions(); return;} const candidate=this.normalizeTag(this.tagsField.value); if(!candidate){this.tagsField.value=''; this.hideTagSuggestions(); return;} if(!this.tags.includes(candidate)) this.tags.push(candidate); this.tagsField.value=''; this.hideTagSuggestions(); this.renderTags(); }
  renderTags(){ if(!this.tagsList) return; this.tagsList.innerHTML=''; const availableWidth=this.tagsList.clientWidth||370; let currentRow=this.createTagRow(); let rowWidth=0; let hiddenCount=0; this.tags.forEach((tag,index)=>{ const tagEl=document.createElement('button'); tagEl.type='button'; tagEl.className='collection-modal__tag-item'; tagEl.innerHTML=`<span class="collection-modal__tag-label">#${this.escapeHtml(tag)}</span>`; tagEl.addEventListener('click',()=>this.removeTag(index)); currentRow.appendChild(tagEl); const tagWidth=tagEl.offsetWidth||this.estimateTagWidth(tag); if(rowWidth+tagWidth+6>availableWidth&&rowWidth>0){ currentRow.removeChild(tagEl); if(this.tagsList.children.length>=this.maxVisibleTagRows){hiddenCount+=1;return;} currentRow=this.createTagRow(); rowWidth=0; currentRow.appendChild(tagEl);} rowWidth+=tagWidth+6; }); if(hiddenCount>0) this.appendMoreTag(hiddenCount); }
  removeTag(index){ if(index<0||index>=this.tags.length) return; this.tags.splice(index,1); this.renderTags(); }
  createTagRow(){ const rowEl=document.createElement('div'); rowEl.className='collection-modal__tags-row'; this.tagsList.appendChild(rowEl); return rowEl; }
  appendMoreTag(hiddenCount){ if(!this.tagsList||hiddenCount<=0) return; const rows=Array.from(this.tagsList.querySelectorAll('.collection-modal__tags-row')); const lastRow=rows[rows.length-1]; if(!lastRow) return; const moreEl=document.createElement('button'); moreEl.type='button'; moreEl.className='collection-modal__tag-item collection-modal__tag-item--more'; moreEl.textContent=`+${hiddenCount}`; lastRow.appendChild(moreEl); }
  estimateTagWidth(tag){return 34 + String(tag).length * 9;}
  async loadTagSuggestions(){ if(!this.tagsField||!this.tagsSuggestList||!this.tagsInputRow) return; const query=this.normalizeTag(this.tagsField.value); if(!query){this.hideTagSuggestions();return;} try{const response=await fetch(`/hashtags/suggest?q=${encodeURIComponent(query)}`); if(!response.ok){this.hideTagSuggestions();return;} const payload=await response.json(); if(!payload.success||!Array.isArray(payload.tags)||payload.tags.length===0){this.hideTagSuggestions();return;} this.tagsSuggestList.innerHTML=payload.tags.map((tag)=>`<li><button type="button" data-tag="${this.escapeHtml(tag)}"><span class="collection-modal__tags-suggest-match">#</span>${this.highlightSuggestionMatch(tag,query)}</button></li>`).join(''); this.tagsSuggestList.querySelectorAll('button').forEach((button)=>{button.addEventListener('click',()=>{this.tagsField.value=button.dataset.tag||''; this.addTagFromInput();});}); this.tagsSuggestList.classList.remove('collection-modal__tags-suggest-list--hidden'); this.tagsInputRow.classList.add('collection-modal__tags-input-row--suggest-open'); }catch(_e){this.hideTagSuggestions();}}
  hideTagSuggestions(){ if(!this.tagsSuggestList||!this.tagsInputRow) return; this.tagsSuggestList.classList.add('collection-modal__tags-suggest-list--hidden'); this.tagsSuggestList.innerHTML=''; this.tagsInputRow.classList.remove('collection-modal__tags-input-row--suggest-open'); }
  highlightSuggestionMatch(tag, query){ const escapedTag=this.escapeHtml(tag); const normalizedQuery=this.escapeRegex(query); if(!normalizedQuery) return escapedTag; return escapedTag.replace(new RegExp(`(${normalizedQuery})`,'i'), '<span class="collection-modal__tags-suggest-match">$1</span>'); }
  escapeHtml(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
  escapeRegex(value){return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
}
App.register('collection_modul.js', CollectionModalComponent);
