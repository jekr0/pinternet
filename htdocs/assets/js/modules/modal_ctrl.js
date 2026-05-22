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
    const current=this.stack[this.stack.length-1];
    if(current===key) return;
    if(current){ this.registry.get(current)?.hide?.(); }
    this.stack.push(key);
    if(!this.isBlurVisible()) this.showBlur();
    cfg.show?.();
    App.utils.lockBodyScroll();
  }
  close(key){
    const top=this.stack[this.stack.length-1];
    if(top!==key) return;
    const cfg=this.registry.get(key); cfg?.hide?.();
    this.stack.pop();
    const prev=this.stack[this.stack.length-1];
    if(prev){ this.registry.get(prev)?.show?.(); }
    else { this.hideBlur(); App.utils.unlockBodyScroll(); }
  }
}
App.register('modal_ctrl.js', ModalCtrlComponent);
