class CollectionModulComponent {
 init(){
  this.root=document.getElementById('collection-modul'); if(!this.root) return;
  this.list=this.root.querySelector('[data-component="collection-modul-list"]');
  document.addEventListener('collection-modul:open',()=>this.open());
  this.root.addEventListener('click',(e)=>{ if(e.target===this.root||e.target.closest('[data-component="collection-modul-cancel"]')) this.close();});
 }
 async open(){ this.root.classList.remove('collection-modul--hidden'); this.root.setAttribute('aria-hidden','false'); await this.load(); }
 close(){ this.root.classList.add('collection-modul--hidden'); this.root.setAttribute('aria-hidden','true'); }
 async load(){
  if(!this.list) return; this.list.innerHTML='';
  try{const r=await fetch('/collections/list',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}});const p=await r.json();
   if(p.success&&Array.isArray(p.collections)){this.list.innerHTML=p.collections.map(c=>`<li><button type="button">${c==='Profile'?'Профиль':c}</button></li>`).join('');}
  }catch(e){}
 }
}
App.register('collection_modul.js', CollectionModulComponent);
