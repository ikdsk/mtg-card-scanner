import { JsonClient } from '../data/http.js';

export function safeSetIcon(value: unknown): string | null {
 if(typeof value!=='string')return null;
 try {
  const url=new URL(value);
  return url.protocol==='https:' && url.hostname==='svgs.scryfall.io' && !url.port && !url.username && !url.password && /^\/sets\/[a-z0-9_-]+\.svg$/.test(url.pathname) ? url.href : null;
 }catch{return null;}
}

/** Bounded tab cache; failures expire too. One request per set while pending. */
export class SetIcons {
 private entries=new Map<string,{at:number;promise:Promise<string|null>}>();
 constructor(private load:(code:string)=>Promise<unknown>=code=>new JsonClient().get(`https://api.scryfall.com/sets/${code}`)){}
 get(code:string):Promise<string|null> {
  code=code.toLowerCase();
  if(!/^[a-z0-9]{2,12}$/.test(code))return Promise.resolve(null);
  const entry=this.entries.get(code);
  if(entry && Date.now()-entry.at<60_000)return entry.promise;
  const promise=Promise.resolve().then(()=>this.load(code)).then(value=>{
   if(!value || typeof value!=='object')return null;
   const set=value as Record<string,unknown>;
   return set.object==='set' && set.code===code ? safeSetIcon(set.icon_svg_uri) : null;
  }).catch(()=>null);
  this.entries.set(code,{at:Date.now(),promise});
  if(this.entries.size>100)this.entries.delete(this.entries.keys().next().value!);
  return promise;
 }
}

/** Always uses verified physical metadata, never a Japanese display printing. */
export class SetBadge {
 private revision=0;
 readonly node=document.createElement('div');
 constructor(private icons=new SetIcons()){this.node.className='candidate-set';this.node.setAttribute('role','group');}
 clear():void {this.revision++;this.node.replaceChildren();this.node.removeAttribute('aria-label');}
 update(card:{set:string;set_name:string}):void {
  this.clear();const revision=this.revision;
  const label=`${card.set_name} (${card.set.toUpperCase()})`;
  this.node.setAttribute('aria-label',`実物の拡張：${label}`);
  const text=document.createElement('span');text.textContent=label;this.node.append(text);
  void this.icons.get(card.set).then(url=>{
   if(!url || revision!==this.revision)return;
   const img=document.createElement('img');img.alt='';img.width=18;img.height=18;img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>img.remove(),{once:true});img.src=url;this.node.prepend(img);
  });
 }
}
