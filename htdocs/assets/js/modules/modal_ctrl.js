class ModalCtrlComponent {
  constructor(){this.stack=[];this.registry=new Map();this.blur=null;}
  init(){
    this.blur=document.getElementById('app-blur-overlay');
    App.modalCtrl={register:(k,c)=>this.register(k,c),open:(k)=>this.open(k),close:(k)=>this.close(k),isBlurVisible:()=>this.isBlurVisible()};
  }
  register(key,config){this.registry.set(key,config||{});}
  isBlurVisible(){return !!this.blur && !this.blur.classList.contains('blur-lo--hidden');}
  showBlur(){if(!this.blur)return; this.blur.classList.remove('blur-lo--hidden'); this.blur.setAttribute('aria-hidden','false');}
  hideBlur(){if(!this.blur)return; this.blur.classList.add('blur-lo--hidden'); this.blur.setAttribute('aria-hidden','true');}
  open(key){
    const cfg=this.registry.get(key); if(!cfg) return;
    const existingIndex=this.stack.indexOf(key);
    if(existingIndex!==-1){
      this.stack.splice(existingIndex,1);
    }

    const current=this.stack[this.stack.length-1];
    if(current){ this.registry.get(current)?.hide?.(); }

    this.stack.push(key);
    if(!this.isBlurVisible()) this.showBlur();
    cfg.show?.();
    App.utils.lockBodyScroll();
  }
  close(key){
    const idx=this.stack.lastIndexOf(key);
    if(idx===-1) return;

    this.registry.get(key)?.hide?.();
    this.stack.splice(idx,1);

    const top=this.stack[this.stack.length-1];
    if(top){
      this.registry.get(top)?.show?.();
      if(!this.isBlurVisible()) this.showBlur();
      App.utils.lockBodyScroll();
      return;
    }

    this.hideBlur();
    App.utils.unlockBodyScroll();
  }
}
App.register('modal_ctrl.js', ModalCtrlComponent);
