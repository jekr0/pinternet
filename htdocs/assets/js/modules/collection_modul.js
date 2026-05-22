class CollectionModalComponent {
  constructor(){this.root=null;this.panel=null;this.list=null;this.nameInput=null;this.tagsInput=null;this.tagsList=null;this.tagsSuggestList=null;this.tagsInputRow=null;this.addTagButton=null;this.tags=[];this.activeOverlayOwner='';}
  init(){
    this.root=document.getElementById('collection-modal'); if(!this.root) return;
    this.panel=this.root.querySelector('.collection-modal__panel');
    this.list=this.root.querySelector('[data-component="collection-modal-list"]');
    this.nameInput=this.root.querySelector('[data-component="collection-modal-name"]');
    this.tagsInput=this.root.querySelector('[data-component="collection-modal-tags-input"]');
    this.tagsList=this.root.querySelector('[data-component="collection-modal-tags-list"]');
    this.tagsSuggestList=this.root.querySelector('[data-component="collection-modal-tags-suggest-list"]');
    this.tagsInputRow=this.root.querySelector('[data-component="collection-modal-tags-input-row"]');
    this.addTagButton=this.root.querySelector('[data-component="collection-modal-tags-add-button"]');

    document.addEventListener('collection-modal:open',()=>{ if (App.modalCtrl) { App.modalCtrl.open('collection-modal'); return; } this.open(); });
    this.root.addEventListener('click',(e)=>{if(e.target===this.root||e.target.closest('[data-component="collection-modal-cancel"]')) this.close();});
    this.nameInput?.addEventListener('input',()=>{const n=this.nameInput.value.replace(/[^a-zа-яё0-9_ ]/gi,'').slice(0,32);if(n!==this.nameInput.value)this.nameInput.value=n;});
    this.tagsInput?.addEventListener('input',()=>this.handleTagsInput());
    this.tagsInput?.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===','){e.preventDefault();this.addTag(this.tagsInput.value);}});
    this.addTagButton?.addEventListener('click',()=>this.addTag(this.tagsInput.value));
    this.tagsSuggestList?.addEventListener('click',(e)=>{const btn=e.target.closest('button[data-tag]'); if(!btn) return; this.addTag(btn.dataset.tag||'');});

    App.modalCtrl?.register('collection-modal', { show: () => this.showOnly(), hide: () => this.hideOnly() });
  }
  async open(){ this.showOnly(); await this.load(); this.renderTags(); this.nameInput?.focus(); }
  close(){ if (App.modalCtrl) { App.modalCtrl.close('collection-modal'); return; } this.hideOnly(); this.hideTagSuggestions(); }
  showOnly(){ this.root.classList.remove('collection-modal--hidden'); this.root.setAttribute('aria-hidden','false'); }
  hideOnly(){ this.root.classList.add('collection-modal--hidden'); this.root.setAttribute('aria-hidden','true'); }
  async load(){ if(!this.list) return; this.list.innerHTML=''; try{const r=await fetch('/collections/list',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}}); const p=await r.json(); if(p.success&&Array.isArray(p.collections)){this.list.innerHTML=p.collections.map(c=>`<li><button type="button" class="collection-modal__collection-item">${this.escapeHtml(c==='Profile'?'Профиль':c)}</button></li>`).join('');}}catch(e){console.warn(e);} }
  normalizeTag(v){return String(v||'').toLowerCase().replace(/[^a-zа-яё0-9_#]/gi,'').replace(/^#+/,'').slice(0,20).trim();}
  addTag(raw){const t=this.normalizeTag(raw); if(!t||this.tags.includes(t)||this.tags.length>=10) return; this.tags.push(t); if(this.tagsInput) this.tagsInput.value=''; this.hideTagSuggestions(); this.renderTags();}
  removeTag(tag){this.tags=this.tags.filter(t=>t!==tag); this.renderTags();}
  renderTags(){ if(!this.tagsList) return; this.tagsList.innerHTML=''; const row=document.createElement('div'); row.className='collection-modal__tags-row'; this.tags.forEach(tag=>{const el=document.createElement('button'); el.type='button'; el.className='collection-modal__tag-item'; el.innerHTML=`<span>#${this.escapeHtml(tag)}</span>`; el.addEventListener('click',()=>this.removeTag(tag)); row.appendChild(el);}); this.tagsList.appendChild(row); }
  handleTagsInput(){ if(!this.tagsInput) return; const q=this.normalizeTag(this.tagsInput.value); if(q!==this.tagsInput.value.replace(/^#+/,'')) this.tagsInput.value=q; if(!q){this.hideTagSuggestions(); return;} const sugg=['2d','3d','art','fanart','gif','anime','meme','ai','sketch','digital'].filter(t=>t.includes(q)&&!this.tags.includes(t)).slice(0,8); if(!sugg.length){this.hideTagSuggestions(); return;} this.tagsSuggestList.innerHTML=sugg.map(t=>`<li><button type="button" data-tag="${this.escapeHtml(t)}">#${this.escapeHtml(t)}</button></li>`).join(''); this.tagsSuggestList.classList.remove('collection-modal__tags-suggest-list--hidden'); }
  hideTagSuggestions(){this.tagsSuggestList?.classList.add('collection-modal__tags-suggest-list--hidden'); if(this.tagsSuggestList) this.tagsSuggestList.innerHTML=''; }
  escapeHtml(v){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
}
App.register('collection_modul.js', CollectionModalComponent);
