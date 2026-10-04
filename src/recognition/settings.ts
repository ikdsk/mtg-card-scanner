export const defaults = Object.freeze({tentativeScore:.5,autoScore:.75,autoMargin:.025,autoConsecutive:2,delayMs:180,rearmCount:3,rearmMs:600,overlayMs:1500});
export type RecognitionSettings = { [K in keyof typeof defaults]: number };
export const bounds: Record<keyof RecognitionSettings, readonly [number,number,number]> = {
 tentativeScore:[0,1,.001],autoScore:[0,1,.001],autoMargin:[0,1,.001],autoConsecutive:[1,10,1],delayMs:[0,2000,1],rearmCount:[1,20,1],rearmMs:[0,10000,1],overlayMs:[100,10000,1],
};
export function validateSettings(s: RecognitionSettings): boolean {
 return Object.entries(bounds).every(([key,[min,max,step]])=>{const n=s[key as keyof RecognitionSettings];return Number.isFinite(n)&&n>=min&&n<=max&&(step!==1||Number.isInteger(n));}) && s.tentativeScore<=s.autoScore;
}
