class WarnModulComponent {
  init(){
    App.warn={open:(cfg)=>this.open(cfg)};
  }
  open(cfg={}){
    if(!App.overlay) return null;
    const key='warn-modul';
    if(App.overlay.get(key)) App.overlay.close(key);
    let resolveConfirm=null; let resolveCancel=null;
    App.overlay.open({
      key, overlayClass:'warn-modul', hiddenClass:'warn-modul--hidden', panelClass:'warn-modul__panel',
      buildPanel:(panel,close)=>{
        const title=document.createElement('p'); title.className='warn-modul__title'; title.textContent=String(cfg.title||'Осторожно!');
        const description=document.createElement('p'); description.className='warn-modul__description'; description.textContent=String(cfg.description||'');
        const actions=document.createElement('div'); actions.className='warn-modul__actions';
        const cancel=document.createElement('button'); cancel.type='button'; cancel.className='warn-modul__button warn-modul__button--cancel'; cancel.textContent=String(cfg.cancelLabel||'Назад');
        const confirm=document.createElement('button'); confirm.type='button'; confirm.className='warn-modul__button warn-modul__button--confirm'; confirm.textContent=String(cfg.confirmLabel||'Подтвердить');
        cancel.addEventListener('click',()=>{close(); resolveCancel?.();});
        confirm.addEventListener('click',async()=>{if(confirm.disabled) return; confirm.disabled=true; try{await cfg.onConfirm?.(); close(); resolveConfirm?.();} finally{confirm.disabled=false;}});
        actions.append(cancel,confirm); panel.append(title,description,actions);
      }
    });
    return new Promise((resolve)=>{resolveConfirm=()=>resolve(true); resolveCancel=()=>resolve(false);});
  }
}
App.register('warn_modul.js', WarnModulComponent);
