class ModalCtrlComponent {
  constructor(){this.activeKey=null;this.registry=new Map();this.blur=null;this.scrollLocked=false;}
  init(){
    this.blur=document.getElementById('app-blur-overlay');
    App.modalCtrl={register:(k,c)=>this.register(k,c),open:(k)=>this.open(k),close:(k)=>this.close(k),closeAll:()=>this.closeAll(),isBlurVisible:()=>this.isBlurVisible(),getActive:()=>this.activeKey};
  }
  register(key,config){this.registry.set(key,config||{});}
  isBlurVisible(){return !!this.blur && !this.blur.classList.contains('blur-lo--hidden');}
  showBlur(){if(!this.blur)return; this.blur.classList.remove('blur-lo--hidden'); this.blur.setAttribute('aria-hidden','false');}
  hideBlur(){if(!this.blur)return; this.blur.classList.add('blur-lo--hidden'); this.blur.setAttribute('aria-hidden','true');}
  lockScroll(){if(this.scrollLocked)return; App.utils.lockBodyScroll(); this.scrollLocked=true;}
  unlockScroll(){if(!this.scrollLocked)return; App.utils.unlockBodyScroll(); this.scrollLocked=false;}
  open(key){
    const cfg=this.registry.get(key); if(!cfg) return;
    if(this.activeKey&&this.activeKey!==key){ this.registry.get(this.activeKey)?.hide?.(); }
    this.activeKey=key;
    if(!this.isBlurVisible()) this.showBlur();
    cfg.show?.();
    this.lockScroll();
  }
  close(key){
    if(!key) return this.closeAll();
    const cfg=this.registry.get(key); cfg?.hide?.();
    if(this.activeKey===key) this.activeKey=null;
    if(!this.activeKey){ this.hideBlur(); this.unlockScroll(); }
  }
  closeAll(){
    this.registry.forEach((cfg)=>cfg?.hide?.());
    this.activeKey=null;
    this.hideBlur();
    this.unlockScroll();
  }
}
App.register('modal_ctrl.js', ModalCtrlComponent);
