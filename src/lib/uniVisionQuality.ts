export type LabPoint={l:number;a:number;b:number}
export type ColorCaptureLike={l_mean:number|string;a_mean:number|string;b_mean:number|string;l_std:number|string;a_std:number|string;b_std:number|string;suggested_grade?:string|null;operator_grade?:string|null;decision?:string|null}

const n=(value:number|string)=>Number(value)
export function labDistance(a:LabPoint,b:LabPoint){return Math.sqrt((a.l-b.l)**2+(a.a-b.a)**2+(a.b-b.b)**2)}
export function capturePoint(capture:ColorCaptureLike):LabPoint{return{l:n(capture.l_mean),a:n(capture.a_mean),b:n(capture.b_mean)}}
export function colorDispersion(capture:ColorCaptureLike){return Math.sqrt(n(capture.l_std)**2+n(capture.a_std)**2+n(capture.b_std)**2)}
export function repeatabilityDelta(captures:ColorCaptureLike[]){if(captures.length<2)return null;return labDistance(capturePoint(captures[0]),capturePoint(captures[1]))}
export function operatorAgreement(captures:ColorCaptureLike[]){const comparable=captures.filter(capture=>capture.suggested_grade&&capture.operator_grade);if(!comparable.length)return{matched:0,total:0,ratio:null as number|null};const matched=comparable.filter(capture=>capture.suggested_grade===capture.operator_grade).length;return{matched,total:comparable.length,ratio:matched/comparable.length}}
