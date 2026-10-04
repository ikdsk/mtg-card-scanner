type Point = [number, number];
export function validCorners(value: unknown): Point[] | null {
 if (!Array.isArray(value) || value.length !== 4 || !value.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1))) return null;
 const points = value as Point[];
 let area = 0; const signs: number[] = [];
 for (let i=0;i<4;i++) {
  const a=points[i]!, b=points[(i+1)%4]!, c=points[(i+2)%4]!;
  area += a[0]*b[1]-b[0]*a[1];
  signs.push((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]));
  for(let j=i+1;j<4;j++) { const p=points[j]!; if((a[0]-p[0])**2+(a[1]-p[1])**2 < .0004) return null; }
 }
 if(Math.abs(area)/2 < .01 || !(signs.every(s=>s>0) || signs.every(s=>s<0))) return null;
 return points.map(p => [...p]);
}
export function contentRect(width: number, height: number, sourceWidth: number, sourceHeight: number) {
 const scale = Math.min(width/sourceWidth,height/sourceHeight);
 return {x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale};
}
/** rAF redraws latest geometry; inference remains bounded and separately paced. */
export class DetectionOverlay {
 staleMs = 1500;
 clear(): void { this.corners=null; }
 private corners: Point[] | null = null;
 private received = 0;
 private frame: number | null = null;
 constructor(readonly canvas: HTMLCanvasElement, private video: HTMLVideoElement, private changed: (visible: boolean) => void = () => {}) {}
 update(result: {cardPresent: boolean; cornersValid: boolean; corners?: unknown}, now = performance.now()): boolean {
  this.corners = result.cardPresent && result.cornersValid ? validCorners(result.corners) : null;
  this.received = now; return this.corners !== null;
 }
 start(): void {
  this.stop();
  const render = () => { this.draw(); this.frame = requestAnimationFrame(render); };
  this.frame = requestAnimationFrame(render);
 }
 stop(): void { if(this.frame !== null) cancelAnimationFrame(this.frame); this.frame=null; this.corners=null; this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height); }
 private draw(): void {
  const {width,height} = this.canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  const w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(this.canvas.width!==w || this.canvas.height!==h) {this.canvas.width=w;this.canvas.height=h;}
  const ctx=this.canvas.getContext('2d')!; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
  const visible=this.corners && performance.now()-this.received <= this.staleMs && this.video.videoWidth>0 && this.video.videoHeight>0;
  const detected = String(Boolean(visible));
  if (this.canvas.dataset.detected !== detected) { this.canvas.dataset.detected=detected; this.changed(Boolean(visible)); }
  if(!visible) return;
  const rect=contentRect(width,height,this.video.videoWidth,this.video.videoHeight);
  ctx.strokeStyle='#22c55e';ctx.lineWidth=3;ctx.beginPath();
  this.corners!.forEach(([x,y],i)=> {const px=rect.x+x*rect.width,py=rect.y+y*rect.height; if(i===0) ctx.moveTo(px,py);else ctx.lineTo(px,py);});
  ctx.closePath();ctx.stroke();
 }
}
