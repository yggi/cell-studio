import{$n as e,A as t,Bt as n,C as r,Cr as i,Dn as a,Dr as o,Dt as s,E as c,En as l,Er as u,F as d,Fr as f,G as p,Gt as m,H as h,I as g,Ir as _,Jn as v,K as y,Kn as b,L as x,Ln as S,M as C,Mt as w,Nr as T,Nt as E,O as D,On as O,P as k,Pn as A,Pr as j,R as M,Sr as N,Tr as P,U as F,V as ee,W as I,X as te,Xt as ne,Yn as re,Yt as ie,Z as L,Zt as ae,_n as R,_t as z,at as oe,br as se,bt as ce,cn as le,cr as ue,dn as de,dt as B,en as fe,er as V,fn as pe,g as H,gr as U,h as W,hn as me,hr as G,ir as he,j as ge,jn as _e,jt as ve,k as ye,kn as be,ln as xe,lr as Se,mn as Ce,nr as K,q as we,qn as Te,rr as Ee,sr as De,tr as q,ur as Oe,vn as ke,vr as Ae,wr as je,xr as Me,xt as Ne,yt as Pe,z as Fe,zn as J,zt as Ie}from"./inspect-BqJJ5Ng9.js";var Le=new WeakMap;function Re(e){if(Le.has(e))return Le.get(e);let t=null,n=e.ok?e.outputs.map(t=>e.cells.get(t.cell)?.clock).find(e=>!!e):void 0,r=n&&e.clocks.get(n)?.tap?e.clocks.get(n).tap.meter:n;for(let t=0;r&&t<16;t++){let t=e.cells.get(r)?.step?.driver;if(!t||!e.clocks.has(t))break;let n=e.clocks.get(t);if(e.cells.get(r)?.meter&&!e.cells.get(t)?.meter&&!n.positional&&n.swing===void 0&&!n.swung)break;r=t}let i=r?e.clocks.get(r):void 0,a=r?e.cells.get(r):void 0;if(i&&a&&!i.belt){let n=[...e.cells.values()].some(e=>e.name!==a.name&&e.step?.driver===a.name);(i.positional||a.meter||i.swing!==void 0||i.swung||a.beat!==1||n)&&(t={cell:a.name,beat:a.beat>0?a.beat:1})}return Le.set(e,t),t}function ze(e,t,n){let r=Re(e.result);if(!r||!(n>t))return null;let i=w(e.result,e.statics).played(r.cell),a=r.beat/24,o=Math.min(n,e.end),s=e=>e<0?-1/0:i.q(e*a),c=i.stepAt(Math.max(0,t)),l=Number.isFinite(c)?Math.max(0,Math.floor(c/a-ve)-1):0;for(;s(l)<t&&Number.isFinite(s(l));)l++;for(;l>0&&s(l-1)>=t;)l--;let u=[];for(let e=l;u.length<1e5;e++){let t=s(e);if(!(t<o))break;u.push(t)}return u.length?{first:l,at:u,before:s(l-1)}:null}var Be=.05;function Ve(e,t,n){if(!e.result.tapes.length)return[];let r=w(e.result,e.statics),i=[];for(let a of e.result.tapes){let o=Ie(e.result,r,a.name);if(!o.moving&&!a.dropout&&!a.heads.some(e=>e.wander>0))continue;let s=[];for(let e=t;e<=n;e+=Be)s.push({at:e,speed:o.speed(e)});i.push({tape:a.name,points:s})}return i}function He(e,t,n,r={}){return{from:t,to:t+n,events:B(e,t,t+n,!0,r),tapes:Ve(e,t,t+n+1e-9),clock:ze(e,t,t+n)}}function Ue(e){for(let t of e.cells.values())if(typeof t.params.motor==`number`||typeof t.params.belt==`number`)return!0;return!1}function We(e,t,n){let r=r=>t+(r-e.from)*n;return{events:e.events.map(e=>({...e,at:r(e.at),code:e.code??e.at,dur:e.dur*n,bends:e.bends.map(e=>({at:r(e.at),cents:e.cents,ramp:e.ramp})),levels:e.levels.map(e=>({at:r(e.at),level:e.level,ramp:e.ramp})),params:e.params&&Object.fromEntries(Object.entries(e.params).map(([e,t])=>[e,t.kind===`points`?{...t,points:t.points.map(e=>({...e,at:r(e.at)}))}:t])),...e.legato&&{legato:{glide:e.legato.glide*n,notes:e.legato.notes.map(e=>({...e,at:r(e.at),dur:e.dur*n,bends:e.bends.map(e=>({...e,at:r(e.at)}))}))}}})),tapes:e.tapes.map(e=>({tape:e.tape,points:e.points.map(e=>({at:r(e.at),speed:e.speed}))})),clock:e.clock?{first:e.clock.first,at:e.clock.at.map(r),before:r(e.clock.before)}:null}}function Ge(e){if(!e.result.ok)return null;let t=Re(e.result);if(t)return t.cell;let n=e.tracks[0]?.clock;return n&&e.result.clocks.has(n)?n:null}function Ke(e,t,n){let r=Ge(e),i=Ge(t);if(!r||!i||!(n>0))return n;let a=w(e.result,e.statics).map(r).stepAt(n),o=w(t.result,t.statics).map(i).q(a);return Number.isFinite(o)&&o>=0?o:n}function qe(e,t,n){let r=W(e,t,n);return z(r,J(r),r.off)}function Je(e,t,r,i){let a=E(e.result,e.statics,t);a&&n(e.result,a,r,i)}var Ye=(e,t)=>({from:e,to:e+t,events:[],tapes:[]});function Xe(e,t,n=20,r={}){let i=e,a=[];for(let e=0;e<n;e++){let e=W(i,void 0,r);if(!e.ok)break;let n=null;for(let a of t(i,e)){let e;try{e=a.apply(i)}catch{continue}if(e!==i&&(a.exact||Fe(i,e,void 0,r))){n={next:e,title:a.title};break}}if(!n)break;a.push(n.title),i=n.next}return{source:i,steps:a}}function Ze(e,t,n=()=>!0){let r=[];for(let i of t.cells.values()){if(i.implicit||i.lambda)continue;let t=V(e,i.name);for(let[e,a]of t){let o=v[e];o&&!t.has(o)&&n(e,o)&&r.push({id:`alias:${i.name}:${e}`,tool:`normalise`,rule:`alias`,title:`&${i.name}: ${e}= is Strudel's or dough's name for ${o}= — write ours`,before:`${e}=${a}`,after:`${o}=${a}`,apply:t=>De(t,i.name,e,o)})}}return r}function Qe(e,t){let n=[];for(let r of t.cells.values()){if(r.implicit||r.lambda)continue;let t=V(e,r.name).get(`ftype`),i=t!==void 0&&/^\d+$/.test(t)?b[Number(t)]:void 0;i&&n.push({id:`ftype:${r.name}`,tool:`normalise`,rule:`alias`,title:`&${r.name}: ftype=${t} is superdough's number for ftype=${i} — write the word`,before:`ftype=${t}`,after:`ftype=${i}`,apply:e=>Se(e,r.name,`ftype`,i)})}return n}function $e(e){let t=i(e.trim());return t?.kind===`use`&&!t.args&&t.main===null&&!t.head.length?{id:t.id,names:t.names,takes:t.takes}:null}var et=(e,t,n=t)=>`${N(t,n)} from ${Me(e)?e:JSON.stringify(e)}`,tt=e=>U(e)[0].trim().replace(/\s+/g,` `);function nt(e){let t=new Map;for(let n of e)for(let e of n.text.split(`
`)){let r=tt(e),i=/^&([A-Za-z_][A-Za-z0-9_]*)\s/.exec(r)?.[1];i&&!t.has(r)&&t.set(r,{id:n.id,name:i})}return t}function rt(e,t){if(!t?.length)return[];let n=nt(t),r=e.split(`
`),i=e=>/[+*,[]\s*$/.test(U(r[e])[0])||e>0&&/[+*,[]\s*$/.test(U(r[e-1])[0]),a=new Set(H(e).cells.map(e=>e.name)),o=new Map;return r.forEach((e,t)=>{let r=n.get(tt(e));if(!r||i(t)||!a.has(r.name))return;let s=o.get(r.id)??{at:[],names:[]};s.at.push(t),s.names.push(`&${r.name}`),o.set(r.id,s)}),[...o].map(([e,{at:t,names:n}])=>{let i=r.findIndex(t=>$e(U(t)[0])?.id===e),a=i>=0?$e(U(r[i])[0]):null,o=n.filter(e=>!a?.names?.includes(e)&&!a?.takes?.includes(e)),s=a&&!a.names?et(e,null):et(e,[...a?.names??[],...o],[...a?.takes??[],...o]),c=i>=0?i:t[0],l=t.map(e=>U(r[e])[1].trim()).filter(Boolean);return{id:`library:${e}`,tool:`normalise`,rule:`library`,title:`${n.join(`, `)} ${n.length>1?`are`:`is`} ${JSON.stringify(e)}'s: ${s}`,before:t.map(e=>tt(r[e])).join(`; `),after:s,apply:e=>{let n=e.split(`
`);if(n.length!==r.length||t.some(e=>n[e]!==r[e]))return e;let a=/^\s*/.exec(n[c])[0],o=i>=0?U(n[i])[1].trim():l.join(` `);return n[c]=`${a}${s}${o?`  ${o.startsWith(`#`)||o.startsWith(`//`)?o:`# ${o}`}`:``}`,n.filter((e,n)=>n===c||!t.includes(n)).join(`
`)}}})}function it(e,t){if(!t?.length)return[];let n=new Map;for(let[e,r]of nt(t)){let t=e.slice(r.name.length+2);t&&!n.has(t)&&n.set(t,r)}let r=new Set(H(e).cells.map(e=>e.name)),i=nt(t),a=e=>{let t=i.get(tt(e));return!!t&&r.has(t.name)},o=new Map;for(let t of e.split(`
`))if(!a(t))for(let e of U(t)[0].matchAll(/&\(([^()]*)\)/g)){let t=n.get(e[1].trim().replace(/\s+/g,` `));if(!t||r.has(t.name))continue;let i=o.get(t.name)??{...t,inline:[]};i.inline.includes(e[0])||i.inline.push(e[0]),o.set(t.name,i)}return[...o.values()].map(({id:e,name:t,inline:n})=>({id:`library-cell:${t}`,tool:`normalise`,rule:`library`,title:`${n[0]} is ${JSON.stringify(e)}'s &${t}: use it by name`,before:n[0],after:`&${t}`,apply:r=>{let i=r.split(`
`).map(e=>{if(a(e))return e;let[r,i]=U(e);return n.reduce((e,n)=>e.split(n).join(`&${t}`),r)+i}),o=i.findIndex(t=>$e(U(t)[0])?.id===e);if(o>=0){let n=$e(U(i[o])[0]);return n.names&&!n.names.includes(`&${t}`)&&(i[o]=et(e,[...n.names,`&${t}`],[...n.takes,`&${t}`])+U(i[o])[1]),i.join(`
`)}let s=RegExp(`&${t}(?![A-Za-z0-9_])`),c=i.findIndex(e=>s.test(U(e)[0]));return i.splice(Math.max(0,c),0,et(e,[`&${t}`])),i.join(`
`)}}))}function at(e){let t=e.split(`
`),n=new Set(t.flatMap(e=>$e(U(e)[0])?.names??[]));return t.flatMap((e,t)=>{let[r,a]=U(e),o=i(r.trim());if(o?.kind!==`use`||!o.args?.length)return[];let s=o.args.filter(e=>e.value===`&${e.name}`&&n.has(e.value)),c=je(r),l=c[c.findIndex(e=>e.text===`from`)+1],u=l?.text.indexOf(`(`)??-1;if(!s.length||!l||u<0||!l.text.endsWith(`)`))return[];let d=o.args.filter(e=>!s.includes(e)),f=d.length?`(${d.map(e=>`${e.name}=${e.value}`).join(`, `)})`:``,p=`${r.slice(0,l.at)}${l.text.slice(0,u)}${f}${r.slice(l.at+l.text.length)}`;return[{id:`taken-arguments:${t+1}`,tool:`normalise`,rule:`library`,title:`${JSON.stringify(o.id)} takes ${s.map(e=>e.value).join(`, `)} as the library gives ${s.length>1?`them`:`it`}: ${p.trim()}`,before:r.trim(),after:p.trim(),apply:n=>n.split(`
`).map((n,r)=>r===t&&n===e?`${p}${a}`:n).join(`
`)}]})}var ot=e=>/^([a-z]\w*)\(/.exec(e)?.[1]??(/^[a-z]\w*$/.test(e)?`word`:`other`);function st(e,t){let n=[],r=[...new Set(e.flatMap(e=>/^(\w+)\(/.exec(e.id)?.[1]??[]))].filter(t=>!e.some(e=>e.id===t)),a=[...e,...r.flatMap(e=>{let n=t?.(e);return typeof n==`string`?[{id:e,text:n}]:[]})];for(let e of a){if(!Me(e.id))continue;let t=e.text.split(`
`).map(e=>tt(e)),r=t.map(e=>i(e)).find(e=>e?.kind===`signature`&&e.names.length===1);if(!r||r.kind!==`signature`)continue;let a=[null,r.names[0].slice(1),r.optional.join(` `),r.main?.slice(1)],o=a[1],s=t.find(e=>RegExp(`^&${o}\\s`).test(e)&&!i(e));if(!s)continue;let c=K(s,o),l=[...a[2].matchAll(/&(\w+)/g)].map(e=>e[1]),u=new Map;for(let e of l){let n=t.find(t=>RegExp(`^&${e}\\s`).test(t)),r=n?n.slice(e.length+2).trim():null,i=r&&/^(\w+)=(\S+)$/.exec(r);u.set(e,i?i[2]:r)}n.push({id:e.id,head:o,params:u,main:a[3]??null,attrs:V(s,o),braid:c.braid.join(` `)})}return n}function ct(e,t,n){if(!t?.length)return[];let r=[],i=e.split(`
`);for(let a of st(t,n)){let t=q(e,a.head);if(t<0||G(e,a.head))continue;let n=K(e,a.head),o=V(e,a.head),s=new Map,c=!0,l=(e,t)=>{let n=a.params.get(e);(s.has(e)&&s.get(e)!==t||n!=null&&!t.startsWith(`&`)&&ot(t)!==ot(n))&&(c=!1),s.set(e,t)},u=n.braid.join(` `);for(let[e,t]of a.attrs){let n=/^&(\w+)$/.exec(t)?.[1],r=n!==void 0&&(a.params.has(n)||n===a.main);e===`base`&&r&&!o.has(`base`)?u&&([u]=[(l(n,u),``)]):o.has(e)?r?l(n,o.get(e)):o.get(e)!==t&&(c=!1):r&&n!==a.main&&a.params.get(n)!=null||(c=!1)}if([...o.keys()].some(e=>!a.attrs.has(e))&&(c=!1),a.braid){let e=new Set,t=a.braid.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`).replace(/&(\w+)/g,(t,n)=>a.params.has(n)||n===a.main?e.has(n)?`\\k<${n}>`:(e.add(n),`(?<${n}>.+?)`):`&${n}`),n=u.replace(/\s+/g,` `),r=n.replace(/^scale\(([a-z]+),/,(e,t)=>Object.hasOwn(me,t)?`scale(even(7, 12, ${t}),`:e),i=RegExp(`^${t}$`).exec(n)??RegExp(`^${t}$`).exec(r);if(!i)c=!1;else for(let[e,t]of Object.entries(i.groups??{}))l(e,t.trim())}else u&&(c=!1);if(!c||a.main&&!s.has(a.main))continue;let d=[...a.params].flatMap(([e,t])=>s.has(e)&&s.get(e)!==t?[`${e}=${s.get(e)}`]:[]),f=`&${a.head} from ${Me(a.id)?a.id:JSON.stringify(a.id)}${d.length?`(${d.join(`, `)})`:``}${a.main?` ${s.get(a.main)}`:``}`,p=tt(i[t]);if(r.some(e=>e.after===f))continue;let m=r.findIndex(e=>e.id.startsWith(`template:`)&&e.id.endsWith(`:${a.head}`)&&e.before===p);if(m>=0){if(r[m].after.length<=f.length)continue;r.splice(m,1)}r.push({id:`template:${a.id}:${a.head}`,tool:`normalise`,rule:`library`,title:`&${a.head} is ${JSON.stringify(a.id)}'s, with ${d.length?d.join(`, `):`its defaults`}: ${f}`,before:p,after:f,apply:e=>{let t=e.split(`
`),n=q(e,a.head);if(n<0||tt(t[n])!==p)return e;let[r,i]=U(t[n]),o=/^\s*/.exec(r)[0],s=i?` `.repeat(Math.max(1,r.length-o.length-f.length)):``;return t[n]=`${o}${f}${s}${i}`,t.join(`
`)}})}return r}var lt=/^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/,ut=e=>RegExp(`&${e}(?![A-Za-z0-9_])`);function dt(e,t){if(!t)return[];let n=e.split(`
`),r=n.map(e=>U(e)[0]),a=new Set(r.flatMap(e=>i(e.trim())===void 0?[lt.exec(e)?.[1]??``]:[]).filter(Boolean));return n.flatMap((e,n)=>{let[o,s]=U(e),c=i(o.trim());if(!c||c.kind!==`use`||c.args||c.main||c.head.length)return[];let l=t(c.id);if(l===null||g(l))return[];let u=[...new Set(l.split(`
`).flatMap(e=>lt.exec(U(e)[0])?.[1]??[]))],d=c.names?.map((e,t)=>[e,c.takes[t]])??u.map(e=>[`&${e}`,`&${e}`]),f=e=>!a.has(e)&&r.some((t,r)=>r!==n&&ut(e).test(t)),p=d.filter(([e])=>f(e.slice(1)));if(!p.length)return[];let m=o.trim(),h=`${N(p.map(([e])=>e),p.map(([,e])=>e))} from ${Me(c.id)?c.id:JSON.stringify(c.id)}`;return h===m?[]:[{id:`narrowest:${n+1}`,tool:`normalise`,rule:`narrowest`,title:`${m} is written ${h}: the cells of it the piece uses`,before:m,after:h,apply:t=>t.split(`
`).map((t,r)=>r===n&&t===e?`${/^\s*/.exec(o)[0]}${h}${s?`${/\s*$/.exec(o)[0]}${s}`:``}`:t).join(`
`)}]})}var ft=(e,t,n,r,i)=>({id:`${e}:${n}`,tool:`normalise`,rule:e,title:t,before:n,after:r,apply:i}),pt=(e,t,n)=>{let r=e.split(`
`),i=q(e,t),a=/^\s*/.exec(r[i])[0];return r.splice(i+1,0,`${a}${n}`),r.join(`
`)},mt={from:40,to:300};function ht(e,t){let n=e.cells.get(t)?.beat||1,r=w(e,z(e,J(e)).statics).map(t),i=60/((r.q(4*n)-r.q(0))/4);return Number.isFinite(i)&&i>=mt.from&&i<=mt.to}var gt=new Set([`bar`,`tempo`,`key`,`tonic`,`harm`,`style`]),_t=e=>gt.has(e),vt=(e,t,n)=>q(e,n)<0&&!t.cells.has(n);function yt(e){let t=e.split(`
`);for(let e=0;e<t.length;e++){let n=t[e],[r,a]=U(n),o=i(r.trim());if(o?.kind!==`use`||o.names?.length!==1||o.names[0]!==`&bar`||!o.main||o.main.startsWith(`&`))continue;if(!/^(?:free\(.*\)|[0-9.]+[a-z]*)$/.test(o.main))return null;let s=r.lastIndexOf(o.main);if(s<0||r.slice(s+o.main.length).trim()!==``)return null;let c=`${r.slice(0,s)}&tempo`;return{at:e,raw:n,rate:o.main,before:r.trim(),after:c.trim(),line:`${c}${r.slice(s+o.main.length)}${a}`}}return null}function bt(e,t){let n=new Set(H(e).cells.map(e=>e.name)),r=[],i=[...n].filter(e=>t.clocks.has(e)&&t.cells.get(e)?.meter),a=t.mainMeter;if(a&&n.has(a)&&i.length===1&&!G(e,a)&&ht(t,a)){!_t(a)&&vt(e,t,`bar`)&&r.push(ft(`bar`,`&${a} is the piece's meter: &bar`,`&${a}`,`&bar`,e=>ue(e,a,`bar`)));let n=V(e,a).get(`step`);a===`bar`&&n&&!n.startsWith(`&`)&&vt(e,t,`tempo`)&&r.push(ft(`tempo`,`&bar's rate is its tempo: step=&tempo, &tempo step=${n}`,`step=${n}`,`step=&tempo`,e=>pt(Se(e,`bar`,`step`,`&tempo`),`bar`,`&tempo step=${n}`)))}let o=yt(e);o&&a===`bar`&&vt(e,t,`tempo`)&&r.push(ft(`tempo`,`&bar's rate is its tempo: ${o.after}, &tempo step=${o.rate}`,o.before,o.after,e=>{let t=e.split(`
`);return t[o.at]===o.raw?(t[o.at]=o.line,t.splice(o.at+1,0,`&tempo step=${o.rate}`),t.join(`
`)):e}));let s=[...n].filter(t=>K(e,t)?.braid[0]?.startsWith(`scale(`)),c=t.mainKey;if(c&&n.has(c)&&s.length===1&&!G(e,c)){!_t(c)&&vt(e,t,`key`)&&r.push(ft(`key`,`&${c} is the piece's key: &key`,`&${c}`,`&key`,e=>ue(e,c,`key`)));let n=K(e,c).braid,i=n.length===1?/^scale\(\s*([^,()\s]+)\s*,\s*([A-Ga-g][#b♯♭]*-?\d*)\s*\)$/.exec(n[0]):null;c===`key`&&i&&vt(e,t,`tonic`)&&r.push(ft(`tonic`,`&key's tonic is a cell: scale(${i[1]}, &tonic), &tonic ${i[2]}`,n[0],`scale(${i[1]}, &tonic)`,e=>pt(xt(e,`key`,n[0],`scale(${i[1]}, &tonic)`),`key`,`&tonic ${i[2]}`)))}return r}function xt(e,t,n,r){let i=e.split(`
`),a=q(e,t);if(a<0)return e;let[o,s]=U(i[a]),c=o.indexOf(n);return c<0?e:(i[a]=o.slice(0,c)+r+o.slice(c+n.length)+s,i.join(`
`))}var St=(e,t,n,r,i)=>({id:`${e}:${n}`,tool:`normalise`,rule:e,title:t,before:n,after:r,apply:i});function Ct(e,t,n,r){let i=e.split(`
`),a=q(e,t);if(a<0)return e;let[o,s]=U(i[a]),c=o.indexOf(n);return c<0?e:(i[a]=o.slice(0,c)+r+o.slice(c+n.length)+s,i.join(`
`))}function wt(e,t){let[n,r]=U(e);if(!r)return t;let i=n.length-n.trimEnd().length>1;return`${t}${` `.repeat(i?Math.max(1,n.length-t.length):1)}${r}`}function Tt(e,t){let n=t.mainMeter;if(!n||G(e,n)||V(e,n).has(`pulse`))return[];let r=K(e,n)?.braid??[],i=r.length===1?/^scan\(\s*([^()]*)\)$/.exec(r[0]):null;if(!i)return[];let a=i[1].trim().split(/\s+/).flatMap(e=>{let t=/^([0-9]+)(?:!([0-9]+))?$/.exec(e);return t?Array.from({length:Number(t[2]??1)},()=>t[1]):[`?`]});if(a.length<2||a.length>12||a.some(e=>e!==a[0])||![`1`,`4`].includes(a[0]))return[];let o=`meter("${a.length}/4")`;return[St(`meter`,`&${n}: ${r[0]} is ${o}`,r[0],o,e=>Ct(e,n,r[0],o))]}function Et(e){let t=/^(-?)([0-9]*)(?:\.([0-9]+))?$/.exec(e);if(!t||t[2]===``&&t[3]===void 0)return null;let n=10**(t[3]?.length??0);return[(t[1]?-1:1)*Number(`${t[2]||`0`}${t[3]??``}`),n]}var Dt=(e,t)=>t===0?Math.abs(e):Dt(t,e%t);function Ot(e,t){let[n,r]=Et(e)??[NaN,1],[i,a]=Et(t)??[NaN,1],o=n*a,s=n*a+i*r;if(!Number.isFinite(o)||!(o>0)||!(s>o))return null;let c=Dt(o,s);return`${o/c}/${s/c}`}function kt(e,t){let n=t.mainMeter;if(!n||G(e,n)||V(e,n).has(`swing`)||q(e,n)<0)return[];let r=[];for(let{name:t}of H(e).cells){if(t===n||G(e,t))continue;let i=K(e,t),a=V(e,t),o=a.get(`step`)??``;if(!i||i.braid.length!==1||a.size!==1||!/^[0-9]+n$/.test(o))continue;let s=`-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)`,c=RegExp(`^scan\\(\\s*(${s})\\s+(${s})\\s*\\)$`).exec(i.braid[0]),l=RegExp(`^scan\\(\\s*free\\(\\s*(${s})\\s*,\\s*(${s})\\s*\\.\\.\\s*(${s})\\s*\\)\\s+(${s})\\s*\\)$`).exec(i.braid[0]),u=null;if(c)u=Ot(c[1],c[2]);else if(l){let[e,t,n]=[l[1],l[2],l[3]].map(e=>Ot(e,l[4]));u=e&&t&&n?`free(${e}, ${t}..${n})`:null}if(!u)continue;let d=e.replace(/about=(?:\([^)]*\)|&\w+)/g,``),f=[...d.matchAll(RegExp(`&${t}(?!\\w)`,`g`))].length,p=[...d.matchAll(RegExp(`step=&${t}:pulse(?![\\w*/.:])`,`g`))].length;if(p===0||f!==1+p)continue;let m=`swing=${o}:${u}`;r.push(St(`swing`,`&${t} ${i.braid[0]} step=${o}, tapped by its pulse, is a swing of the meter's: &${n} swing=&${t}, &${t} ${m}`,`&${t} ${i.braid[0]} step=${o}`,`&${t} ${m}`,e=>{let r=e.split(`
`),i=q(e,t),a=/^\s*/.exec(r[i])[0];r[i]=wt(r[i],`${a}&${t} ${m}`);let s=q(e,n),[c]=U(r[s]);r[s]=wt(r[s],`${c.trimEnd()} swing=&${t}`);let l=RegExp(`step=&${t}:pulse(?![\\w*/.:])`,`g`);return r.map(e=>l.test(e)?wt(e,U(e)[0].trimEnd().replace(l,`step=${o}`)):e).join(`
`)}))}return r}var At=(e={})=>()=>[],jt=(e={})=>(t,n)=>{let r=bt(t,n),i=new Set(r.flatMap(e=>e.rule===`bar`?[n.mainMeter]:e.rule===`tempo`?[`bar`]:e.rule===`key`?[n.mainKey]:e.rule===`tonic`?[`key`]:[])),a=kt(t,n);return a.length&&n.mainMeter&&i.add(n.mainMeter),[...At(e)(t,n),...r,...Tt(t,n),...a,...Ze(t,n),...Qe(t,n),...rt(t,e.library),...ct(t,e.library,e.resolve).filter(e=>!i.has(e.id.split(`:`)[2])),...at(t),...it(t,e.library),...dt(t,e.resolve)]},Mt=(e,t)=>{let n={...t,old:!0},r=Xe(e,jt(n),20,n);return{source:r.source,steps:r.steps}},Nt=Te,Pt=e=>e.k===`ref`||e.k===`num`?1:e.k===`sum`?e.items.reduce((e,t)=>e+Pt(t.e),0):e.factors.reduce((e,t)=>e+Pt(t),0);function Ft(e){switch(e.kind){case`chord`:return e.notes.length;case`choice`:return e.values.length;case`seq`:return e.layers.reduce((e,t)=>e+It(t),0);case`mix`:return e.exprs.reduce((e,t)=>e+Pt(t),0);default:return 1}}var It=e=>e.reduce((e,t)=>e+Ft(t.atom),0);function Lt(e,t){switch(e.kind){case`blank`:return 0;case`wave`:return 1;case`scan`:{let{line:n,col:r,len:i}=e.span;return(t[n-1]??``).slice(r-1,r-1+i).replace(/^scan\(|\)$/g,``).split(/[\s,]+/).filter(Boolean).length}case`list`:return e.signature?1:It(e.tokens)}}function Rt(e){let t=new Map,n=0,r=null;return e.split(`
`).forEach((e,i)=>{let a=e.replace(/"[^"]*"/g,`""`).replace(/#.*$/,``);r===null&&(n=i+1),r=r===null?a:`${r} ${a}`,/[+*,[]\s*$/.test(r)||(t.set(n,r),r=null)}),r!==null&&t.set(n,r),t}var zt=e=>[...e.matchAll(/(?:^|[\s(])([A-Za-z][A-Za-z0-9]*)=/g)].filter(e=>!Nt.has(e[1])).length+[...e.matchAll(/(?:^|\s)(off|oneshot)(?=\s|$)/g)].length;function Bt(e,{asWritten:t=!1,resolve:n}={}){let r=t?e:Mt(e,n?{resolve:n}:{}).source,i=r.replace(/(^|[\s(])base=&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?/gm,`$1`),a=i.split(`
`),s=H(i).cells.filter(e=>!o(e)),c=Rt(r),l=new Set;return s.map(e=>{let t=Lt(e.braid,a),n=e.span.line,r=!e.lambda&&!l.has(n)&&c.has(n)?zt(c.get(n)):0;return e.lambda||l.add(n),{name:e.name,cells:1,leaves:t,attributes:r,total:1+t+r}})}function Vt(e,t={}){let n=Bt(e,t),r=e=>n.reduce((t,n)=>t+n[e],0),i=H(e).takes?.length??0;return{cells:r(`cells`),leaves:r(`leaves`)+i,attributes:r(`attributes`),total:r(`total`)+i}}function Ht(e,t={}){let n=W(e,void 0,t),r=Ut(n),i=new Set([...n.cells.values()].flatMap(e=>e.over?[e.over]:[])),a=[];for(let t of n.cells.values()){if(t.lambda||t.implicit||t.voice||t.mix||t.sink||t.kit||t.note||t.map||r.has(t.name)||i.has(t.name)||G(e,t.name))continue;let o=K(e,t.name);if(!o||o.braid.length<2||o.braid.some(e=>e.startsWith(`[`)&&e.includes(`&`)))continue;let s=t.over?n.cells.get(t.over):null;s?.implicit&&s.kit||a.push({name:t.name,tokens:o.braid,grid:Yt(n,t.name),unitRead:RegExp(`&${t.name}\\[`).test(e)})}return{result:n,cells:a}}var Ut=e=>new Set((e.takes??[]).flatMap(e=>e.gave.map(e=>e.replace(/^&/,``)))),Wt=e=>e.replace(/[ \t]+/g,` `).length,Gt=e=>Vt(e,{asWritten:!0}).total,Kt=(e,t)=>{try{let n=t.apply(e);return n===e||H(n).broken?.length?null:Gt(e)-Gt(n)}catch{return null}},qt=(e,t)=>{try{let n=t.apply(e);return n===e||H(n).broken?.length?null:Wt(e)-Wt(n)}catch{return null}},Jt=(e,t)=>({id:t.id,kind:t.rule,title:t.title,before:t.before,after:t.after,saving:Kt(e,t)??0,apply:t.apply});function Yt(e,t,n=[]){let r=e.cells.get(t);if(!r||n.includes(t))return!1;if(r.over)return!!e.cells.get(r.over)?.root;let i=[...e.cells.values()].filter(e=>e.units.some(e=>e.atom.kind===`ref`&&e.atom.name===t));return i.length===0?!!e.cells.get(S)?.root:i.every(r=>Yt(e,r.name,[...n,t]))}function Xt(e,t){let n=[];for(let r of t){let t=[],i=[];for(let e=0;e<r.tokens.length;){let n=1;for(;e+n<r.tokens.length&&r.tokens[e+n]===r.tokens[e];)n++;let a=r.tokens[e];if(n>=2&&!a.includes(`!`)&&a!==`_`)t.push(`${a}!${n}`),i.length<2&&i.push(`${Array(Math.min(n,4)).fill(a).join(` `)}${n>4?` …`:``} → ${a}!${n}`);else for(let e=0;e<n;e++)t.push(a);e+=n}if(t.length===r.tokens.length)continue;let a={id:`run:${r.name}`,tool:`shorten`,rule:`run`,title:`Runs in &${r.name}: the same step again and again, counted`,before:i.map(e=>e.split(` → `)[0]).join(`   `),after:i.map(e=>e.split(` → `)[1]).join(`   `),apply:e=>Oe(e,r.name,t)};(Kt(e,a)??0)>0&&n.push(a)}return n}function Zt(e,t){let n=e.base??t.base,r=e.base===null?null:e.base-n,i=t.base===null?null:t.base-n,a=e=>e.stretch?`${e.key}@${e.stretch}`:e.key;return{key:`${a(e)}/${r}|${a(t)}/${i}`,base:n,offA:r,offB:i}}function Qt(e,t){let n=new Map;e.forEach((e,r)=>{let i=t[r],a=``,o=-2;for(let t=0;t+1<e.length;t++){if(i&&(i[t]||i[t+1]))continue;let r=Zt(e[t],e[t+1]).key;(r!==a||o!==t-1)&&(n.set(r,(n.get(r)??0)+1),a=r,o=t)}});let r=null;for(let[e,t]of n)t>=2&&(!r||t>r.count)&&(r={key:e,count:t});return r}var $t=(e,t)=>{let n=new Map;for(let t of e.rules.values())t.of&&n.set(t.of,[...n.get(t.of)??[],t]);let r=[...e.rules.values()].filter(e=>!e.of).map(e=>e.key),i=[...e.lines.map(e=>[...e.toks]),...r.map(t=>e.rules.get(t).kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}})))],a=[...e.lines.map(()=>null),...r.map(t=>{let r=n.get(t);return r?e.rules.get(t).kids.map((e,t)=>r.some(e=>e.patched[t])):null})],o=new Map([...n].map(([e,t])=>[e,t.map(e=>({...e,kids:[...e.kids],patched:[...e.patched]}))])),s=new Map(e.rules),c=0,l=Math.max(0,...[...s.keys()].map(e=>Number(e.slice(1))||0))+1;for(let n=Qt(i,a);n;n=Qt(i,a)){let d=`s${l++}`,f=null,p=[];i=i.map((t,i)=>{let s=a[i],c=i>=e.lines.length?o.get(r[i-e.lines.length]):void 0,l=[],u=[],m=c?.map(()=>({kids:[],patched:[]}));for(let e=0;e<t.length;e++){if(e+1<t.length&&!(s&&(s[e]||s[e+1]))){let r=Zt(t[e],t[e+1]);if(r.key===n.key){f??={key:d,kids:[{key:t[e].key,off:r.offA,...t[e].stretch?{stretch:t[e].stretch}:{}},{key:t[e+1].key,off:r.offB,...t[e+1].stretch?{stretch:t[e+1].stretch}:{}}]},l.push({key:d,base:r.base}),u.push(!1),c?.forEach((t,n)=>{let[r,i]=[t.kids[e],t.kids[e+1]],a=Zt({key:r.key,base:r.off},{key:i.key,base:i.off});m[n].kids.push({key:d,off:a.base}),m[n].patched.push(!1)}),e++;continue}}l.push(t[e]),u.push(s?.[e]??!1),c?.forEach((t,n)=>{m[n].kids.push(t.kids[e]),m[n].patched.push(t.patched[e])})}return c?.forEach((e,t)=>Object.assign(e,m[t])),p.push(s?u:null),l}),a=p,s.set(d,f),c++,t?.(u)}return c?u():null;function u(){let t=new Map(s);r.forEach((n,r)=>t.set(n,{key:n,kids:i[e.lines.length+r].map(e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}))}));for(let e of o.values())for(let n of e)t.set(n.key,{...n,kids:[...n.kids],patched:[...n.patched]});return{lines:e.lines.map((e,t)=>({...e,toks:i[t]})),rules:t,looks:e.looks}}},en=e=>`r${e}`,tn=e=>{let t=/^(-?\d+)([#b]*)$/.exec(e);return t?{n:Number(t[1]),acc:t[2]}:null};function nn(e){let t=e.values.map(tn);if(t.some(e=>e===null))return{key:`d${e.dur}:${[...e.values].sort().join(`,`)}`,base:null};let n=Math.min(...t.map(e=>e.n));return{key:`n${e.dur}:${t.map(e=>`${e.n-n}${e.acc}`).join(`,`)}`,base:n}}function rn(e){let t=[],n=0;for(let r of[...e.chords].sort((e,t)=>e.at-t.at))r.at>n&&t.push({key:en(r.at-n),base:null}),t.push(nn(r)),n=r.at+r.dur;return e.length>n&&t.push({key:en(e.length-n),base:null}),t}var an=(e,t)=>e.replace(/^([rdn])(\d+)/,(e,n,r)=>`${n}${Number(r)*t}`),Y=e=>/^[rdn]\d/.test(e),on=e=>/^f\d/.test(e);function sn(e,t){let n=/^([rdn])(\d+)(?::(.*))?$/.exec(e),r=Number(n[2]),i=r===1?``:`@${r}`;if(n[1]===`r`)return`~${i}`;let a=n[1]===`d`?n[3].split(`,`):n[3].split(`,`).map(e=>{let n=tn(e);return`${n.n+(t??0)}${n.acc}`});return`${a.length===1?a[0]:`[${a.join(`,`)}]`}${i}`}var cn=`\0back`,ln=e=>({name:e.name+cn,length:e.length,chords:e.chords.map(t=>({...t,at:e.length-t.at-t.dur}))});function un(e,t,n){if(Y(t))return[{key:t,off:0}];let r=n.get(t);if(r)return r;let i=(e.rules.get(t)?.kids??[]).flatMap(t=>un(e,t.key,n).map(e=>({key:e.key,off:t.off===null||e.off===null?null:t.off+e.off})));return n.set(t,i),i}var dn=e=>Number(/^[rdn](\d+)/.exec(e)[1]);function fn(e,t){let n=[];for(let r=0;r+e.length<=t.toks.length;r++){if(n.length&&n[n.length-1].i+e.length>r)continue;let i;e.every((e,n)=>{let a=t.toks[r+n];return a.key===e.key?e.off===null||a.base===null?e.off===null&&a.base===null:(i??=a.base-e.off,i===a.base-e.off):!1})&&n.push({line:t,i:r,n:e.length,base:i??null})}return n}function pn(e,t){let n=e.map(e=>e.line.toks[t(e)]);if(n.some(e=>!e||e.key!==n[0].key))return!1;let r=n.map((t,n)=>t.base===null?null:e[n].base===null?NaN:t.base-e[n].base);return r.every(e=>e===null?r[0]===null:!Number.isNaN(e)&&e===r[0])}function mn({line:e,i:t,n,base:r}){let i=e.at[t],a=e.at[t+n];if(!e.name.endsWith(cn))return{line:e.name,from:i,to:a,base:r};let o=e.at[e.at.length-1];return{line:e.name.slice(0,-5),from:o-a,to:o-i,base:r}}var hn=e=>{let t=e.map(mn);return t.every((e,n)=>t.every((t,r)=>r<=n||e.line!==t.line||e.to<=t.from||t.to<=e.from))};function gn(e){let t=[...e],n=e=>hn(e)?(t=e,!0):!1;for(;pn(t,e=>e.i+e.n)&&n(t.map(e=>({...e,n:e.n+1}))););for(;t.every(e=>e.i>0)&&pn(t,e=>e.i-1)&&n(t.map(e=>({...e,i:e.i-1,n:e.n+1}))););return t}var _n=(e,t)=>t.length>e.length&&t.spans.length===e.spans.length&&e.spans.every(e=>t.spans.some(t=>t.line===e.line&&t.from<=e.from&&e.to<=t.to));function vn(e,{retrograde:t=!1}={}){let n=(t?[...e,...e.map(ln)]:e).map(e=>{let t=rn(e),n=[0];for(let e of t)n.push(n[n.length-1]+dn(e.key));return{name:e.name,toks:t,at:n}}),r=$t({lines:n.map(e=>({name:e.name,toks:e.toks})),rules:new Map}),i=[],a=new Map,o=new Set;for(let e of r?.rules.keys()??[]){let t=un(r,e,a);if(t.length<3)continue;let s=n.flatMap(e=>fn(t,e));if(s.length<2)continue;let c=gn(s).map(e=>({s:mn(e),back:e.line.name.endsWith(cn)})),l=e=>`${e.line}:${e.from}:${e.to}`,u=c.filter(e=>!e.back).map(e=>e.s),d=e=>u.some(t=>t.line===e.line&&t.from<e.to&&e.from<t.to),f=[];for(let e of c.filter(e=>!e.back||!d(e.s)).sort((e,t)=>+e.back-t.back||e.s.line.localeCompare(t.s.line)||e.s.from-t.s.from))f.some(t=>t.s.line===e.s.line&&t.s.from<e.s.to&&e.s.from<t.s.to)||f.push(e);if(f.length<2||f[0].back)continue;let p=f.map(e=>l(e.s)).sort().join(` `);if(o.has(p))continue;o.add(p);let m=f[0].s,h=e=>e.base===null||m.base===null?0:e.base-m.base,g=f.map(({s:e,back:t})=>t?{kind:`reversed`,by:h(e)}:h(e)===0?{kind:`same`}:{kind:`transposed`,by:h(e)});i.push({kind:`repeat`,symbol:e,spans:f.map(e=>e.s),transforms:g,confidence:1,length:m.to-m.from})}return i.filter(e=>!i.some(t=>_n(e,t))).sort((e,t)=>t.length*t.spans.length-e.length*e.spans.length||t.spans.length-e.spans.length||e.symbol.localeCompare(t.symbol))}var yn=/^(-?\d+)(?:@(\d+))?$/;function bn(e){let t=new Map,n=new Map;return vn(e.map(({name:e,tokens:r})=>{let i=0,a=new Map,o=new Map,s=r.map((e,t)=>{let n=yn.exec(e),r=n?.[2]?Number(n[2]):1;a.set(i,t);let s={at:i,dur:r,values:[n?n[1]:`=${e}`]};return i+=r,o.set(i,t+1),s});return t.set(e,a),n.set(e,o),{name:e,chords:s,length:i}}),{retrograde:!0}).flatMap(e=>{let r=[];for(let i of e.spans){let e=t.get(i.line).get(i.from),a=n.get(i.line).get(i.to);if(e===void 0||a===void 0)return[];r.push({...i,from:e,to:a})}return[{...e,spans:r,length:r[0].to-r[0].from}]})}var xn=e=>{let t=/[@!](\d+)$/.exec(e);return t?Number(t[1]):1};function Sn(e,t){let n=new Map(t.map(({name:e,tokens:t})=>{let n=new Map,r=new Map,i=0;return t.forEach((e,t)=>{n.set(i,t),i+=xn(e),r.set(i,t+1)}),[e,{starts:n,ends:r}]}));return e.flatMap(e=>{let t=[];if(e.spans.forEach((r,i)=>{let a=n.get(r.line),o=a?.starts.get(r.from),s=a?.ends.get(r.to);o!==void 0&&s!==void 0&&(t.length&&s-o!==t[0].span.to-t[0].span.from||t.push({span:{...r,from:o,to:s},transform:e.transforms[i]}))}),t.length<2||t[0].transform.kind===`reversed`)return[];let r=e=>e.kind===`same`?0:e.by,i=r(t[0].transform),a=t.map(({transform:e})=>{let t=r(e)-i;return e.kind===`reversed`?{kind:`reversed`,by:t}:t===0?{kind:`same`}:{kind:`transposed`,by:t}});return[{...e,spans:t.map(e=>e.span),transforms:a,length:t[0].span.to-t[0].span.from}]})}var Cn=/^(-?[0-9]+)((?:@[0-9]+)?)$/,wn=4,Tn=16,En=1,Dn=(e,t)=>`&${e}${t}`,On=12;function kn(e,t){let n=e.length;if(n>On)return[];let r=(e,t)=>{let n=Cn.exec(e);return n?`${+n[1]+t}${n[2]}`:e.startsWith(`~`)?e:null},i=e.join(` `),a=[];for(let o=1;o<n;o++)for(let s of[`>>`,`<<`]){let c=s===`>>`?[...e.slice(o),...e.slice(0,o).map(e=>r(e,t))]:[...e.slice(n-o).map(e=>r(e,-t)),...e.slice(0,n-o)];c.some(e=>e===null)||c.join(` `)===i||a.push({key:c.join(` `),ref:`[${s}${o===1?``:o}]`})}return a}var An=e=>e.startsWith(`^`)&&!e.startsWith(`^$`);function jn(e,t){let n=new Set(t);for(let t=!0;t;){t=!1;for(let r of e.cells.values())!n.has(r.name)&&r.units.some(e=>e.atom.kind===`ref`&&n.has(e.atom.name))&&(n.add(r.name),t=!0)}return[...n]}function Mn(e,t,n,r={},i=[]){let a=new Set([...e.matchAll(/\bbase=&(\w+)/g)].map(e=>e[1]));t=t.filter(t=>!a.has(t.name)&&!RegExp(`^&${t.name}\\b[^\\n]*\\bbase=&`,`m`).test(e));let o=[],s=new Map(t.map(e=>[e.name,e.grid])),c=new Map(t.map(e=>[e.name,m(n,e.name)])),l=[...new Set(c.values())],u=new Map(t.map(e=>[e.name,e.tokens])),d=new Map;for(let e of[...bn(t),...Sn(i,t)]){let t=e.spans[0],n=u.get(t.line).slice(t.from,t.to);for(let t=wn;t<=Math.min(Tn,n.length);t++)for(let r=0;r+t<=n.length;r++){let i=n.slice(r,r+t);if(i.every(e=>e===i[0]))continue;let a=i.every(e=>Cn.test(e)||/^~(@\d+)?$/.test(e)),o=e.spans.flatMap((t,n)=>{let i=e.transforms[n];return i.kind===`reversed`||i.kind===`transposed`&&!a?[]:[{cell:t.line,at:t.from+r,by:i.kind===`same`?0:i.by}]});for(let n of o){let i=u.get(n.cell).slice(n.at,n.at+t),o=i.join(` `),c=d.get(o)??{tokens:i,places:[]};e.spans.forEach((i,o)=>{let l=e.transforms[o],u=(l.kind===`same`?0:l.by)-n.by;l.kind===`reversed`?u===0&&c.places.push({cell:i.line,at:i.to-r-t,ref:`[::-1]`}):u===0?c.places.push({cell:i.line,at:i.from+r,ref:``}):a&&c.places.push({cell:i.line,at:i.from+r,ref:s.get(i.line)?`^$${u}`:`^${u}`})}),d.set(o,c)}}}let f=new Map;for(let e of t)for(let t=wn;t<=Math.min(On,e.tokens.length);t++)for(let n=0;n+t<=e.tokens.length;n++){let r=e.tokens.slice(n,n+t).join(` `);f.set(r,[...f.get(r)??[],{cell:e.name,at:n,ref:``}])}for(let e of t)for(let t=wn;t<=Math.min(On,e.tokens.length);t++)for(let n=0;n+t<=e.tokens.length;n++){let r=e.tokens.slice(n,n+t),i=r.join(` `);if(d.has(i)||r.every(e=>e===r[0]))continue;let a=c.get(e.name);kn(r,a).some(e=>(f.get(e.key)??[]).some(e=>c.get(e.cell)===a))&&d.set(i,{tokens:r,places:[{cell:e.name,at:n,ref:``}]})}for(let[e,{tokens:t,places:n}]of d){let r=t.length,i=new Map,a=[],s=(e,t,n)=>{let o=i.get(e)??new Set;for(let e=t;e<t+r;e++)if(o.has(e))return;for(let e=t;e<t+r;e++)o.add(e);i.set(e,o),a.push({cell:e,at:t,ref:n})};for(let e of[...n].sort((e,t)=>+(e.ref!==``)-(t.ref!==``)||e.cell.localeCompare(t.cell)||e.at-t.at))s(e.cell,e.at,e.ref);for(let e of l)for(let n of kn(t,e))for(let t of f.get(n.key)??[])c.get(t.cell)===e&&s(t.cell,t.at,n.ref);if(a.length<2)continue;let u=a.length*(r-1)-r-1;u>=En&&o.push({key:e,tokens:t,occs:a,saving:u})}o.sort((e,t)=>t.saving-e.saving||t.tokens.length-e.tokens.length);let p=[],h=new Set;for(let e of o){let t=e.occs.flatMap(t=>Array.from({length:e.tokens.length},(e,n)=>`${t.cell}:${t.at+n}`));if(!(t.filter(e=>h.has(e)).length>t.length/2)){for(let e of t)h.add(e);if(p.push(e),p.length>=8)break}}let g=[];for(let t of p){let i=e=>{let n=he(e,`m`),r=Math.min(...t.occs.map(t=>q(e,t.cell))),i=e.split(`
`);i.splice(r,0,`&${n} ${t.key}`);let a=i.join(`
`);for(let e of new Set(t.occs.map(e=>e.cell))){let r=[...u.get(e)];for(let i of t.occs.filter(t=>t.cell===e).sort((e,t)=>t.at-e.at))r.splice(i.at,t.tokens.length,Dn(n,i.ref));a=Oe(a,e,r)}return a},a=[...new Set(t.occs.map(e=>e.ref===``?`as written`:e.ref===`[::-1]`?`backwards`:e.ref.startsWith(`^$`)?`transposed ${e.ref}`:An(e.ref)?`${e.ref.slice(1)} degrees`:`turned ${e.ref}`))],o={id:`phrase:${t.key}`,tool:`shorten`,rule:`phrase`,title:`A phrase written ${t.occs.length} times (${a.join(`, `)}) in ${[...new Set(t.occs.map(e=>`&${e.cell}`))].join(`, `)}: one cell, used where it was`,before:t.key.length>48?t.key.slice(0,47)+`…`:t.key,after:t.occs.map(e=>Dn(`m`,e.ref)).join(` … `),apply:i};(Kt(e,o)??0)>=En&&M(e,o.apply(e),jn(n,t.occs.map(e=>e.cell)),r)&&g.push(o)}return g}var Nn=(e,t)=>t?Nn(t,e%t):e;function Pn(e,t,n){let r=[];for(let i of t){if([...n.cells.values()].some(e=>e.name!==i.name&&(e.over===i.name||e.step?.driver===i.name||e.env===i.name||e.pitch===i.name||e.units.some(e=>e.atom.kind===`ref`&&e.atom.name===i.name)||Object.values(e.paramCells??{}).some(e=>e.factors.includes(i.name))))||n.outputs.some(e=>e.mods.some(e=>e.cell===i.name)||e.levels.some(e=>e.cell===i.name))||i.tokens.some(e=>e.includes(`&`)||e.includes(`?`)||e.includes(`|`)))continue;let t=n.cells.get(i.name),a=V(e,i.name),o=a.get(`step`);if(!t||!o||a.has(`stride`)||a.has(`cycle`)||t.loops)continue;let s=e=>e.lastIndexOf(`]`)+1,c=i.tokens.map(e=>{let t=/@([0-9]+)/.exec(e.slice(s(e)));return t?+t[1]:1}),l=c.reduce(Nn);if(l<2)continue;let u=null,d=/^&([A-Za-z_][A-Za-z0-9_]*)(?:\*([0-9]+))?(?:\/([0-9]+))?$/.exec(o);if(d){let e=d[2]?+d[2]:1,t=(d[3]?+d[3]:1)*l,n=Nn(e,t);e/=n,t/=n,u=`&${d[1]}${e>1?`*${e}`:``}${t>1?`/${t}`:``}`}else/^[0-9]*\.?[0-9]+$/.test(o)&&(u=String(+(+o/l).toFixed(6)));if(u=Fn(o,l)??u,!u)continue;let f=i.tokens.map((e,t)=>e.slice(0,s(e))+e.slice(s(e)).replace(/@[0-9]+/,c[t]/l>1?`@${c[t]/l}`:``)),p={id:`fraction:${i.name}`,tool:`shorten`,rule:`fraction`,title:`&${i.name}: every step is held ${l}× or more — divide by ${l}, and step ${l}× slower`,before:`step=${o}  ${i.tokens.slice(0,5).join(` `)}${i.tokens.length>5?` …`:``}`,after:`step=${u}  ${f.slice(0,5).join(` `)}${f.length>5?` …`:``}`,apply:e=>Se(Oe(e,i.name,f),i.name,`step`,u)};(qt(e,p)??0)>0&&r.push(p)}return r}function Fn(e,t){let n=/^((?:&[A-Za-z_][A-Za-z0-9_]*:)?)(?:([0-9]+)(n\.?|t)|(pulse|beat)(?:\*([0-9]+))?|1m(?:\/([0-9]+))?)$/.exec(e);if(!n)return null;let[,r=``,i,a,o,s,c]=n;if(i!==void 0)return+i%t==0?`${r}${+i/t}${a}`:null;if(o!==void 0){let e=s===void 0?1:+s;return e%t===0?`${r}${o}${e/t>1?`*${e/t}`:``}`:null}let l=(c===void 0?1:+c)*t;return`${r}${l>1?`1m/${l}`:`1m`}`}var In=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],Ln={C:0,D:2,E:4,F:5,G:7,A:9,B:11},Rn=e=>`${In[e%12]}${Math.floor(e/12)-1}`;function zn(e){let t=/^\d+$/.test(e)?Number(e):null;if(t!==null)return t<=127?t:null;let n=/^([A-Ga-g])([#b]*)(-?\d+)$/.exec(e);if(!n)return null;let r=Ln[n[1].toUpperCase()]+[...n[2]].reduce((e,t)=>e+(t===`#`?1:-1),0)+12*(Number(n[3])+1);return r>=0&&r<=127?r:null}function Bn(e){let t=!1;for(let n=0;n<e.length;n++)if(e[n]===`"`)t=!t;else if(e[n]===`#`&&!t&&(n===0||/\s/.test(e[n-1])))return e.slice(0,n);return e}function Vn(e){for(let t of e.split(`
`)){let e=t.trim();if(e&&!e.startsWith(`#`))return/^midi(\s|$)/.test(e)}return!1}var Hn=class{ppq;#e=[];constructor(e,t){this.ppq=e;for(let e of[{tick:0,num:4,den:4},...t])this.add(e.tick,e.num,e.den)}add(e,t,n){let r=this.#e[this.#e.length-1],i=this.ppq*4/n;r&&e===r.tick&&this.#e.pop();let a=this.#e[this.#e.length-1],o=a?a.bar+Math.ceil((e-a.tick)/(a.beat*a.beats)-1e-9):1;this.#e.push({tick:e,bar:o,beat:i,beats:t})}#t(e){let t=this.#e[0];for(let n of this.#e)n.tick<=e&&(t=n);return t}place(e){let t=this.#t(e),n=e-t.tick,r=t.beat*t.beats,i=t.bar+Math.floor(n/r),a=n-Math.floor(n/r)*r,o=Math.floor(a/t.beat);return`${i}:${o+1}:${+(a-o*t.beat).toFixed(3)}`}tick(e){let t=/^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(e);if(!t)return null;let[n,r,i]=[Number(t[1]),Number(t[2]),Number(t[3])];if(n<1||r<1)return null;let a=this.#e[0];for(let e of this.#e)e.bar<=n&&(a=e);return Math.round(a.tick+(n-a.bar)*a.beat*a.beats+(r-1)*a.beat+i)}};function Un(e,t){let n=new Hn(e.ppq,e.meters),r=e=>`"${e.replace(/"/g,`'`)}"`,i=[`# ${t?`${t}: `:``}a MIDI file, as text: a line a note (where in bar:beat:tick, its channel, key, ticks and velocity).`,`# It plays as it is; edit it, save it (a .mid again), or convert it to cells: a piece written out, for Shorten to fold.`,`midi format=${e.format} ppq=${e.ppq}${e.name===void 0?``:` name=${r(e.name)}`}`,...e.copyright===void 0?[]:[`copyright ${r(e.copyright)}`],...e.tempos.map(e=>`tempo ${n.place(e.tick)} ${+(6e7/e.micros).toFixed(4)}`),...e.meters.map(e=>`meter ${n.place(e.tick)} ${e.num}/${e.den}`)];for(let t of e.tracks){i.push(``,`track${t.name===void 0?``:` ${r(t.name)}`}`);let e=[...t.programs.map(e=>({tick:e.tick,order:0,text:`program ${n.place(e.tick)} ch${e.channel} ${e.program}`})),...t.bends.map(e=>({tick:e.tick,order:1,text:`bend ${n.place(e.tick)} ch${e.channel} ${e.value}`})),...t.notes.map(e=>({tick:e.tick,order:2,text:`${n.place(e.tick)} ch${e.channel} ${Rn(e.key)} ${e.end-e.tick} v${e.velocity}`}))];e.sort((e,t)=>e.tick-t.tick||e.order-t.order);for(let t of e)i.push(t.text)}return i.join(`
`)+`
`}function Wn(e){let t=[],n=(e,n,r=1)=>t.push({severity:`error`,message:n,span:{line:e,col:1,len:r}}),r=1,i=480,a,o,s=[],c=[],l=[],u=null,d=!1;e.split(`
`).forEach((e,t)=>{let f=t+1,p=Bn(e).trim();if(!p)return;let m=p.split(/\s+/),h=e.trimEnd().length||1,g=/"([^"]*)"/.exec(p)?.[1];if(m[0]===`midi`){if(d)return n(f,`a second midi line: only the first says the file`,h);d=!0;for(let e of m.slice(1)){let[t,n]=e.split(`=`);t===`format`&&/^[012]$/.test(n)?r=Number(n):t===`ppq`&&/^\d+$/.test(n)&&Number(n)>0&&(i=Number(n))}a=g,u=new Hn(i,[]);return}if(m[0]===`copyright`){if(g===void 0)return n(f,`copyright "…": the notice in quotes`,h);o=g;return}u||(u=new Hn(i,[]),n(f,`no midi line before this: read at 480 ticks a quarter note`,h));let _=e=>{let t=/^ch(\d+)$/.exec(e??``);return t&&Number(t[1])>=1&&Number(t[1])<=16?Number(t[1]):null};if(m[0]===`tempo`||m[0]===`meter`){let e=u.tick(m[1]??``);if(e===null)return n(f,`${m[0]}: where? (bar:beat:tick, as 1:1:0)`,h);if(m[0]===`tempo`){let t=Number(m[2]);if(!(t>0))return n(f,`tempo: how fast? (beats a minute, as 120)`,h);s.push({tick:e,micros:Math.round(6e7/t)})}else{let t=/^(\d+)\/(\d+)$/.exec(m[2]??``);if(!t||!(Number(t[1])>0)||!/^(1|2|4|8|16|32|64)$/.test(t[2]))return n(f,`meter: which? (as 4/4, 3/4, 6/8)`,h);c.push({tick:e,num:Number(t[1]),den:Number(t[2])}),u.add(e,Number(t[1]),Number(t[2]))}return}if(m[0]===`track`){l.push({...g===void 0?{}:{name:g},notes:[],bends:[],programs:[]});return}l.length||l.push({notes:[],bends:[],programs:[]});let v=l[l.length-1];if(m[0]===`program`||m[0]===`bend`){let e=u.tick(m[1]??``),t=_(m[2]),r=Number(m[3]),i=m[0]===`program`?127:16383;if(e===null||t===null||!Number.isInteger(r)||r<0||r>i)return n(f,`${m[0]}: as ${m[0]} 1:1:0 ch1 ${m[0]===`program`?81:8192}`,h);m[0]===`program`?v.programs.push({tick:e,channel:t,program:r}):v.bends.push({tick:e,channel:t,value:r});return}let y=u.tick(m[0]),b=_(m[1]),x=zn(m[2]??``),S=Number(m[3]),C=/^v(\d+)$/.exec(m[4]??``);if(y===null)return n(f,`not a line a MIDI file has: a note starts with its place, as 1:1:0`,h);if(b===null)return n(f,`a note: which channel? (ch1 to ch16)`,h);if(x===null)return n(f,`a note: which key? (C4, F#3, Bb5, or 0 to 127)`,h);if(!(Number.isInteger(S)&&S>0))return n(f,`a note: how many ticks long? (as 120)`,h);let w=C?Number(C[1]):100;if(!(w>=1&&w<=127))return n(f,`a note: how hard? (v1 to v127)`,h);v.notes.push({channel:b,key:x,velocity:w,tick:y,end:y+S})});for(let e of l)e.notes.sort((e,t)=>e.tick-t.tick||e.channel-t.channel||e.key-t.key);return s.sort((e,t)=>e.tick-t.tick),{smf:{format:r,ppq:i,...a===void 0?{}:{name:a},...o===void 0?{}:{copyright:o},tracks:l,tempos:s,meters:c},diagnostics:t}}function Gn(e,t,n={}){let r=Math.max(0,n.from??0),i=n.longest??3600,a=Math.max(0,n.tail??2),[o,s]=(()=>{if(n.seconds!==void 0)return[Math.max(0,n.seconds),`given`];if(Number.isFinite(t.end))return[Math.max(0,t.end-r),`ends`];let i=oe(e);return i.ends===null?i.cycle!==null&&Number.isFinite(i.cycle)&&i.cycle<=1800?[i.cycle,`cycle`]:i.longest===null?[60,`unbounded`]:[i.longest,`layer`]:[Math.max(0,i.ends-r),`ends`]})(),c=o>i;return{from:r,to:r+(c?i:o),tail:a,why:s,capped:c}}var Kn=480,qn=2;function Jn(e,t){let n=e.cells.get(t)?.meter;if(n)return n;let r=[...e.cells.values()].filter(e=>e.meter&&e.step?.driver===t);return r.length===1?r[0].meter:void 0}function Yn(e,t,n=e.off,r,i={}){let a=z(e,t,n),o=Gn(e,a,{...i,from:0}).to,s=B(a,0,o,!0,{until:o}).flatMap(p).filter(e=>e.at<o),c=Re(e),l=c?w(e,a.statics).played(c.cell):null,u=Math.min(1,l?.grain??1),d=l?{q:e=>l.q(e*u)}:null,f=(c?.beat??4)/u,m=s.reduce((e,t)=>Math.max(e,t.at+t.dur),o),g=[];for(let e=0;g.length<1e6;e++){let t=d?d.q(e):e*.125;if(!Number.isFinite(t)||g.length&&t<=g[g.length-1]||(g.push(t),t>m))break}for(;g.length<2||g[g.length-1]<=m;){let e=g.length;g.push(e>=2?2*g[e-1]-g[e-2]:e*.125)}let _=e=>Math.round(e*Kn/f),v=e=>{let t=0,n=g.length-2;for(;t<n;){let r=t+n+1>>1;g[r]<=e?t=r:n=r-1}return Math.round(_(t)+(_(t+1)-_(t))*(e-g[t])/(g[t+1]-g[t]))},b=[],x=v(m);for(let e=0;e+1<g.length&&(e===0||_(e)<x);e++){let t=Math.round((g[e+1]-g[e])*1e6*Kn/(_(e+1)-_(e)));(!b.length||Math.abs(t-b[b.length-1].micros)>=qn)&&b.push({tick:_(e),micros:t})}let S=h(e),C=te(e,S),T=new Map,E=0;for(let e of[...s].sort((e,t)=>e.at-t.at))for(let t of L(C(e))){let n=y(e,t);if(!n){E++;continue}let r=v(n.at),i=Math.max(r+1,v(n.end)),a=T.get(n.channel)??{notes:[],at:[]};T.set(n.channel,a),a.notes.push({channel:n.channel,key:n.note,velocity:n.velocity,tick:r,end:i});let o=(e,t)=>{t!==(a.at.length?a.at[a.at.length-1].value:8192)&&a.at.push({tick:e,value:t})};o(r,n.bend);for(let e of n.bends)o(v(e.at),e.value)}let D=new Map;for(let e of S.voices)D.set(e.channel,[...D.get(e.channel)??[],e.voice]);for(let t of S.kits)D.set(t.channel,[...D.get(t.channel)??[],Zn(e,S.kit)]);let O=[...T].sort(([e],[t])=>e-t).map(([e,t])=>({name:[...new Set(D.get(e)??[`channel ${e}`])].join(` `),notes:Xn(t.notes),bends:t.at.map(t=>({...t,channel:e})),programs:[]})),k=c?Jn(e,c.cell):void 0,A=k&&k.unit===4&&k.beats.every(e=>e===1)&&k.pulses>0?[{tick:0,num:k.pulses,den:4}]:[];return{smf:{format:1,ppq:Kn,...r===void 0?{}:{name:r},tracks:O,tempos:b,meters:A},dropped:E}}function Xn(e){let t=new Map;e.forEach((e,n)=>{let r=`${e.channel}:${e.key}`;t.set(r,[...t.get(r)??[],n])});let n=[];for(let r of t.values()){let t=[...r].sort((t,n)=>e[t].tick-e[n].tick||t-n),i=[];for(let r of t){let t=e[r],a=Math.max(...i.map(e=>e.note.end));i.length&&t.tick===i[0].note.tick?i.push({i:r,note:t}):i.length&&t.tick<a?(n.push(...i.map(e=>({i:e.i,note:{...e.note,end:t.tick}}))),i=[{i:r,note:{...t,end:Math.max(a,t.end)}}]):(n.push(...i),i=[{i:r,note:t}])}n.push(...i)}return n.sort((e,t)=>e.note.tick-t.note.tick||e.i-t.i).map(e=>e.note)}function Zn(e,t){return t.map(({member:t})=>{let n=e.cells.get(t)?.freq??261.63;if(!(n>0)||Math.abs(n-261.63)<.01)return t;let{note:r,cents:i}=we(n);return`${t}(${Math.abs(i)<.5&&r>=0&&r<=127?Rn(r):Number(n.toPrecision(6))})`}).join(` `)}function Qn(e,t){let n=W(e,void 0,t);if(!n.ok)return null;let r=Yn(n,J(n)).smf;return JSON.stringify({...r,tracks:r.tracks.map(e=>({...e,name:void 0}))})}var $n=(e,t,n)=>Fe(e,t,void 0,n)&&Qn(t,n)===Qn(e,n);function er(e,t,n={}){let r=[],i=new Map;for(let n of t.cells.values()){if(n.lambda||n.implicit||n.note||n.sink||G(e,n.name)||t.outputs.some(e=>e.cell===n.name))continue;let r=(e.split(`
`)[q(e,n.name)]??``).replace(/^&[A-Za-z_][A-Za-z0-9_]*\s*/,``).replace(/\s+#.*$/,``).trim();r&&i.set(r,[...i.get(r)??[],n.name])}for(let[a,o]of i){if(o.length<2)continue;let[i,...s]=o,c=e=>{let t=e;for(let e of s)t=Ee(t,e),t=t.replace(RegExp(`&${e}(?![A-Za-z0-9_])`,`g`),`&${i}`);return t},l={id:`same:${o.join(`,`)}`,tool:`shorten`,rule:`same`,title:`${o.map(e=>`&${e}`).join(` and `)} are written exactly alike: keep &${i}, and use it for ${o.length===2?`both`:`all`}`,before:`${s.map(e=>`&${e}`).join(` `)} ${a.length>40?a.slice(0,39)+`…`:a}`,after:`&${i}`,apply:c};(Kt(e,l)??0)<=0||(o.some(e=>t.cells.get(e)?.voice)?!$n(e,c(e),n):!Fe(e,c(e),void 0,n))||r.push(l)}return r}function tr(e,t,n={}){let r=[],i=(t,i,a)=>{let o=V(e,t).get(i),s={id:`default:${t}:${i}`,tool:`shorten`,rule:`default`,title:`&${t}: ${i}=${o} is ${a} — leave it out`,before:`${i}=${o}`,after:``,apply:e=>Se(e,t,i,null)};(Kt(e,s)??0)>0&&Fe(e,s.apply(e),void 0,n)&&r.push(s)};for(let n of t.cells.values()){if(n.implicit||n.lambda)continue;let t=V(e,n.name);n.sink&&t.get(`loop`)===`SAMPLE_RATE`&&i(n.name,`loop`,`what the sound card turns at anyway`),t.has(`cycle`)&&n.step&&!n.step.tap&&!n.map&&n.wrap===1&&i(n.name,`cycle`,`one lap: a turning table comes round there anyway`),t.get(`pan`)!==void 0&&Number(t.get(`pan`))===.5&&i(n.name,`pan`,`the centre`)}return r}function nr(e,t,n={}){let r=[];for(let i of t.cells.values()){if(i.lambda||i.implicit||i.voice||i.mix||i.sink||i.map||!i.loops||!i.steps)continue;let t=V(e,i.name).get(`loop`),a=t?/^&([A-Za-z_][A-Za-z0-9_]*)\/([0-9]+)$/.exec(t):null;if(!a||+a[2]%i.steps!=0)continue;let o=+a[2]/i.steps,s=`&${a[1]}${o>1?`/${o}`:``}`,c={id:`progression:${i.name}`,tool:`shorten`,rule:`progression`,title:`&${i.name}: loop=${t} over ${i.steps} steps is a step every ${o} — step=${s}, held under the melody it moves`,before:`loop=${t}`,after:`step=${s}`,apply:e=>Se(Se(e,i.name,`loop`,null),i.name,`step`,s)};(qt(e,c)??0)>0&&Fe(e,c.apply(e),void 0,n)&&r.push(c)}return r}var rr=/^&([A-Za-z_][A-Za-z0-9_]*)$/;function ir(e,t,n={}){let r=[];for(let i of t.cells.values()){if(!i.over||!i.overShift||i.step||i.label||i.voice||i.mix||i.implicit)continue;let a=i.lambda??(K(e,i.name)?[...K(e,i.name).attrs,...K(e,i.name).braid].join(` `):null);if(!a||G(e,i.name))continue;let o=a.split(/\s+/).filter(Boolean),s=o.filter(e=>!e.startsWith(`over=`));if(o.length-s.length!==1||s.length===0||!s.every(e=>rr.test(e)&&!t.cells.get(rr.exec(e)[1])?.over))continue;let c=i.overShift,l=s.map(e=>`${e}^${c}`),u=i.lambda?`&(${i.lambda})`:`&${i.name}`,d=[...t.cells.values()].filter(e=>e.units.some(e=>e.atom.kind===`ref`&&e.atom.name===i.name));if(!d.length||d.some(t=>t.over!==i.over||t.overShift!==0||t.lambda||G(e,t.name))||[...t.cells.values()].some(e=>e.over===i.name||e.step?.driver===i.name))continue;let f={id:`degree:${i.name}`,tool:`shorten`,rule:`degree`,title:`${i.lambda?u:`&${i.name}`} only reads ${s.join(` `)} through &${i.over} moved ${c>0?`up`:`down`} ${Math.abs(c)}: write ${l.join(` `)} where it is used`,before:u.length>40?u.slice(0,39)+`…`:u,after:l.join(` `),apply:e=>{let t=e;for(let e of d){let n=K(t,e.name).braid.flatMap(e=>{if(!e.startsWith(u))return[e];let t=e.slice(u.length);if(t&&!/^[!*@?0-9.]+$/.test(t))return[e];if(t&&l.length>1)throw Error(`modifiers on a group`);return t?[l[0]+t]:l});t=Oe(t,e.name,n)}return i.lambda?t:Ee(t,i.name)}};(Kt(e,f)??0)>0&&Fe(e,f.apply(e),void 0,n)&&r.push(f)}return r}function ar(e,t){let n=[],r=0,i=``;for(let a of e)(a===`[`||a===`(`)&&r++,(a===`]`||a===`)`)&&r--,a===t&&r===0?(n.push(i.trim()),i=``):i+=a;return n.push(i.trim()),n}function or(e){let t=[],n=0,r=``;for(let i of e)if(i===`[`)n===0?r=``:r+=i,n++;else if(i===`]`)n--,n===0?t.push(r):r+=i;else if(n>0)r+=i;else if(!/\s/.test(i))return null;return n===0?t.map(e=>ar(e,`,`)):null}var sr=/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/,cr=e=>{let t=ar(e,`*`);return{sound:t.filter(e=>!sr.test(e)).join(` * `),gain:t.filter(e=>sr.test(e)).reduce((e,t)=>e*parseFloat(t),1),factors:t}},lr=e=>String(+e.toFixed(3)).replace(/^0\./,`.`);function ur(e,t,n={}){let r=[],i=e.split(`
`);for(let a of t.cells.values()){if(!a.sink)continue;let o=q(e,a.name);if(o<0)continue;let s=o;for(;s+1<i.length&&/[+*,[]\s*$/.test(U(i[s])[0]);)s++;let[c,l]=U(i[o]),u=[c,...i.slice(o+1,s+1).map(e=>U(e)[0])].join(` `),d=u.search(/\[/),f=K(e,a.name);if(d<0||!f)continue;let p=or(u.slice(d));if(!p||p.length!==2||p[0].length!==p[1].length)continue;let[m,h]=p.map(e=>e.map(cr));if(m.some((e,t)=>e.sound!==h[t].sound))continue;let g=e=>{let n=[...e.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[(^])/g)].map(e=>e[1]).filter(e=>{let n=t.cells.get(e);return!!n&&n.voice&&!n.kit&&Object.keys(n.params).length>0});return n.length===1?n[0]:null},_=m.map(e=>g(e.sound));if(_.some(e=>e===null)||new Set(_).size!==_.length)continue;let v=e=>[...t.cells.values()].some(t=>t.name!==a.name&&(t.mix??[]).some(t=>t.voice.name===e||t.pitches.some(t=>t.ref.name===e)));if(_.some(e=>v(e)||t.cells.get(e).params.pan!==void 0||t.cells.get(e).paramCells.pan!==void 0))continue;let y=m.map((e,t)=>{let n=h[t];return e.gain===n.gain?.5:n.gain<e.gain?n.gain/(2*e.gain):1-e.gain/(2*n.gain)});if(y.some(e=>Math.abs(e*1e3-Math.round(e*1e3))>1e-9))continue;let b=m.map((e,t)=>h[t].gain>e.gain?p[1][t]:p[0][t]),x={id:`pan:${a.name}`,tool:`shorten`,rule:`pan`,title:`&${a.name}'s two chords hold the same sounds at different gains: one chord, and each voice placed with pan=`,before:`[…] […]`,after:_.map((e,t)=>`&${e} pan=${lr(y[t])}`).join(` · `),apply:e=>{let t=e.split(`
`),n=u.slice(0,d).trimEnd();t.splice(o,s-o+1,`${n} [${b.join(`, `)}]${l?` `+l:``}`);let r=t.join(`
`);return _.forEach((e,t)=>{y[t]!==.5&&(r=Se(r,e,`pan`,lr(y[t])))}),r}};(Kt(e,x)??0)>0&&Fe(e,x.apply(e),void 0,n)&&r.push(x)}return r}function dr(e,t){return Ze(e,t,(e,t)=>t.length<e.length).filter(t=>(qt(e,t)??0)>0)}function fr(e,t={}){let{result:n,cells:r}=Ht(e,t);if(!n.ok)return[];let i=r.filter(e=>!e.unitRead),a=[...Xt(e,i),...Mn(e,i,n,t,t.hints),...Pn(e,r,n),...er(e,n,t),...tr(e,n,t),...nr(e,n,t),...ir(e,n,t),...ur(e,n,t),...dr(e,n)],o=n.takes?.length?a.filter(r=>hr(r,e,t,mr(n))):a,s=new Map(o.map(t=>[t.id,qt(e,t)??0]));return o.map(t=>Jt(e,t)).filter(e=>pr.has(e.kind)||e.saving>0).sort((e,t)=>t.saving-e.saving||s.get(t.id)-s.get(e.id))}var pr=new Set([`alias`,`fraction`,`progression`]),mr=e=>(e.takes??[]).flatMap(e=>e.overrode).sort().join(` `);function hr(e,t,n,r){try{let i=W(e.apply(t),void 0,n);return i.ok&&mr(i)===r}catch{return!1}}new Set(ee.flatMap(e=>[e.name,...e.aliases]));function gr(e){return e.split(`
`).flatMap((e,t)=>{let n=U(e)[0],r=n.trim(),a=i(r);if(!a||a.kind!==`use`)return[];let o=n.length-n.trimStart().length,s=je(r),c=s.findIndex(e=>e.text===`from`),l=s[c+1];if(c<0||!l)return[];let u=l.text.startsWith(`"`)?a.id.length+2:a.id.length;return[{id:a.id,span:{line:t+1,col:o+l.at+1,len:u},names:a.names,takes:a.takes,head:a.head,args:a.args,main:a.main}]})}var _r=e=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(e)?e:`"${e}"`;function vr({names:e,takes:t=e,head:n=[],id:r,args:i=null,main:a=null}){let o=i?.length?`(${i.map(e=>`${e.name}=${e.value}`).join(`, `)})`:``;return[N(e,t),...n,`from`,`${_r(r)}${o}`,...a?[a]:[]].join(` `)}var yr=1e-9,br=e=>Math.abs(e-Math.round(e))<yr,xr=(e,t)=>e.steps>0&&br(t*e.rate/e.steps);function Sr(e){for(let t=1;t<=4096;t++)if(xr(e,t*e.bars))return t;return 0}var Cr=(e,t,n)=>xr(e,be(t,n,e.bars).length),wr=(e,t)=>{let n=e=>{let n=t.cells.get(e);return!!n&&!n.voice&&!n.kit&&!n.mix&&!n.gate};return e.cycle==null&&e.braid.kind===`list`&&e.braid.tokens.some(e=>e.atom.kind===`ref`)&&e.braid.tokens.every(e=>e.atom.kind===`ref`&&n(e.atom.name)||e.atom.kind===`rest`)};function Tr(e,t,n,r){let i=H(e).cells,a=r??new Set(i.map(e=>e.name)),o=t.mainMeter!==void 0&&a.has(t.mainMeter);return i.flatMap(e=>{let r=e.step;if(r?.kind!==`tap`||n&&!n.has(e.name)||wr(e,t)||(r.meter?a.has(r.meter.name):o))return[];let i=t.cells.get(e.name);if(!i||i.voice||i.steps<=0)return[];let s=Math.max(1,Math.round(e.cycle??1)),c={cell:`&${e.name}`,meter:r.meter?`&${r.meter.name}`:null,tap:r.tap.written,bars:s,steps:i.steps,rate:r.ratio};return[{need:{...c,bar:Sr(c)},tap:r.tap}]})}var Er=e=>e.kind===`ref`?e.pick||e.shift||e.transpose||e.values?[e.name]:[]:e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>Er(e.atom))):[],Dr=e=>new Set(e.flatMap(e=>e.braid.kind===`list`?e.braid.tokens.flatMap(e=>Er(e.atom)):[]).map(e=>`&${e}`)),Or=(e,t)=>{if(e.k===`prod`)return e.factors.flatMap(e=>Or(e,t));if(e.k!==`sum`)return[];let n=e=>e.k===`ref`?[e.ref.name]:e.k===`prod`?e.factors.flatMap(n):e.k===`sum`?e.items.flatMap(e=>n(e.e)):[],r=e=>e.k===`num`||e.k===`ref`&&t(e.ref.name)||e.k===`prod`&&e.factors.every(e=>e.k===`num`||e.k===`ref`&&t(e.ref.name));return e.items.some(e=>r(e.e))?e.items.flatMap(e=>n(e.e)):e.items.flatMap(e=>Or(e.e,t))},kr=(e,t)=>e.kind===`mix`?e.exprs.flatMap(e=>Or(e,t)):e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>kr(e.atom,t))):[],Ar=e=>{let t=new Map(e.map(e=>[e.name,e])),n=e=>t.has(e)&&pe(e,t);return new Set(e.flatMap(e=>e.braid.kind===`list`?e.braid.tokens.flatMap(e=>kr(e.atom,n)):[]).map(e=>`&${e}`))};function jr(e){let t=new Set(e.flatMap(e=>le(e)).map(e=>`&${e}`)),n=new Set([...e.flatMap(e=>xe(e)).map(e=>`&${e}`),...Dr(e),...Ar(e)]);return e=>t.has(e)&&!n.has(e)}var Mr=(e,n)=>n&&t(e)?D(e,{resolve:n}).text:e,Nr=e=>`${e} s=white`;function Pr(e,t,n){let r=Mr(e,n),i=H(r).cells,a=i.filter(e=>!e.lambda),o=t(e),s=o.unknown.map(e=>`&${e.name}`),c=jr(i),l=new Set(s.filter(c)),u=new Set(i.map(e=>`&${e.name}`));if(l.size)for(let e of new Set(a.flatMap(e=>le(e)).map(e=>`&${e}`)))c(e)&&!u.has(e)&&l.add(e);let d=o;for(;l.size;){d=t(`${e}\n${[...l].map(Nr).join(`
`)}`);let n=d.unknown.map(e=>`&${e.name}`).filter(e=>c(e)&&!l.has(e));if(!n.length)break;n.forEach(e=>l.add(e))}let f=[...new Set([...s,...l])].sort(),p=f.filter(c),m=Dr(i),h=p.map(Nr).join(`
`),_=h?`${r}\n${h}`:r,v=g(e);return{uses:f,sounds:p,lines:f.filter(e=>m.has(e)),defines:[...new Set([...a.map(e=>`&${e.name}`),...(o.takes??[]).flatMap(e=>e.gave)])],clock:Tr(_,h?d:o).map(e=>e.need),...v?{signature:{heads:v.names,optional:v.optional,main:v.main}}:{}}}var Fr=/^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/,Ir=/[+*,[]\s*$/;function Lr(e){let t=[],n=null;for(let r of e.split(`
`)){let e=U(r)[0];if(n??={written:[],code:[]},n.written.push(r),n.code.push(e),Ir.test(e))continue;let a=n.code.join(` `).trim().split(/\s+/).join(` `),o=Fr.exec(a)?.[1];o&&i(a)===void 0&&t.push({name:o,written:n.written.join(`
`),code:a}),n=null}return t}var Rr=e=>new Set(e.split(`
`).flatMap(e=>[...U(e)[0].matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)]).map(e=>e[1]??``)),zr=e=>e.split(`
`).map(e=>U(e)[0].trim().split(/\s+/).join(` `)).filter(e=>i(e)?.kind===`use`);function Br(e,t){let n=new Map(Lr(t).map(e=>[e.name,e])),r=new Set([...Rr(t),...Rr(e)]),i=new Map;for(;;){let a=e;for(let[e,t]of i)a=ue(a,e,t);let o=Lr(a),s=[],c=[];for(let e of o){let t=n.get(e.name);t&&(t.code===e.code?s.push(e.name):c.push(e.name))}if(!c.length){let n=new Set(zr(t)),r=[...zr(e).filter(e=>!n.has(e)),...o.filter(e=>!s.includes(e.name)).map(e=>e.written)],a=t.replace(/\s+$/,``),c=e=>e.map(e=>`&${e}`);return{text:[...a?[a]:[],...r].join(`
`),renamed:new Map([...i].map(([e,t])=>[`&${e}`,`&${t}`])),shared:c(s),names:c([...new Set(o.map(e=>e.name))])}}for(let e of c){let t=2;for(;r.has(`${e}${t}`);)t++;r.add(`${e}${t}`),i.set(e,`${e}${t}`)}}}function Vr(e,{need:t,tap:n}){let r=t.meter?t.meter.slice(1):e.mainMeter,i=r===void 0?null:e.cells.get(r)?.meter;return!!i&&Cr(t,i,n)}var Hr=e=>e.unknown.map(e=>`&${e.name}`),Ur=/^(&\w+) (?:is only on a MIDI card: its sound|is named as General MIDI's drum)/,Wr=(e,t)=>e.severity===t.severity&&e.message===t.message&&e.span.line===t.span.line&&e.span.col===t.span.col;function Gr(e,t,n,r){let i=n??(e=>W(e,void 0,r?{resolve:r}:{})),a=Pr(e,i,r),o=i(t),s=new Set([...Lr(t).map(e=>`&${e.name}`),...(o.takes??[]).flatMap(e=>e.gave)]),c=a.uses.filter(e=>e===`key`?!o.mainKey:!s.has(e)),l=c.filter(e=>a.sounds.includes(e)),u=c.filter(e=>!l.includes(e)),d=Mr(e,r),f=jr(H(d).cells),p=Br(e,t),m=a.sounds.map(Nr),h=Tr([d,...m].join(`
`),i([e,...m].join(`
`))).filter(e=>!Vr(o,e)).map(e=>e.need),g={fits:!1,union:p,missing:u,sounds:l,unmet:h};if(u.length||h.length)return g;let _=H(t).cells,v=jr(_),y=[...new Set(_.flatMap(e=>le(e)).map(e=>`&${e}`))].filter(e=>!s.has(e)&&!p.names.includes(e)&&v(e)).map(Nr),b=y.length?i([t,...y].join(`
`)):o,x=()=>[p.text,...new Set([...l.map(Nr),...y])].join(`
`),S=i(x());for(;;){let e=Hr(S).filter(e=>f(e)&&!l.includes(e)&&!s.has(e)&&!p.names.includes(e));if(!e.length)break;l.push(...e),S=i(x())}l.sort();let C=[...b.diagnostics],w=new Set([...l,...y.map(e=>e.split(` `)[0])].map(e=>e.startsWith(`&`)?e:`&${e}`)),T=S.diagnostics.filter(e=>{let t=Ur.exec(e.message);if(t&&w.has(t[1]))return!1;let n=C.findIndex(t=>Wr(t,e));return n<0||(C.splice(n,1),!1)}),E=e=>new Set(e.map(e=>e.slice(1))),D=E(p.names.filter(e=>!p.shared.includes(e))),O=Tr(x(),S,E(p.names),D).filter(e=>!Vr(S,e)).map(e=>e.need);return{fits:!T.length&&!O.length,union:p,missing:u,sounds:l,unmet:O,diagnostics:T}}function Kr(e,t){let n=new Map;return r=>{if(n.has(r)){let e=n.get(r);return n.delete(r),n.set(r,e),e}let i=t(r);return n.set(r,i),n.size>e&&n.delete(n.keys().next().value),i}}function qr(e,t=512){let n=new Map,r=(t,r)=>n.get(t)??e(t,r),i=Kr(t,e=>W(e,void 0,{resolve:r})),a=Kr(t,e=>{let{id:t,workbench:n,main:a}=JSON.parse(e);return fi(t,n,{resolve:r,compiled:i,...a===null?{}:{main:a}})});return(e,t,r)=>{let i=`fit_${ye(e).slice(3)}`;return n.set(i,e),a(JSON.stringify({id:i,workbench:t,main:r??null}))}}function Jr(e,t){if(typeof e==`string`)return{id:e,options:t};let n=`fit_${ye(e.text).slice(3)}`,r=(r,i)=>r===n?e.text:t.resolve(r,i);return{id:n,options:{...t,resolve:r,...e.head===void 0?{}:{head:e.head}}}}var Yr=/^([^(]*)\((.*)\)$/,Xr=/^([^(/]+)\/([^(]+)$/;function Zr(e,t,n,r){let i=Xr.exec(t),a=i?i[1]:t,o=i&&e.length===1&&e[0]!==`&${i[2]}`&&!e[0].includes(`=`)?[`${e[0]}=${i[2]}`]:e,s=Yr.exec(a),c=s?Qr(s[2]):[];return vr({names:o.map(e=>e.split(`=`)[0]),takes:o.map(e=>e.includes(`=`)?`&${e.split(`=`)[1]}`:e),id:s?s[1]:a,args:[...c.map(e=>({name:e.slice(0,e.indexOf(`=`)).trim(),value:e.slice(e.indexOf(`=`)+1).trim()})),...Object.entries(n??{}).map(([e,t])=>({name:e,value:t}))],main:r})}function Qr(e){let t=[],n=0,r=!1,i=0;for(let a=0;a<=e.length;a++){let o=e[a];o===void 0||o===`,`&&!r&&n===0?(e.slice(i,a).trim()&&t.push(e.slice(i,a).trim()),i=a+1):o===`"`?r=!r:!r&&`([{`.includes(o)?n++:!r&&`)]}`.includes(o)&&n--}return t}var $r=(e,t)=>n=>t?t(n,e):W(n,void 0,{resolve:e});function ei(e,t){let n=[...t];return e.diagnostics.filter(e=>{let t=n.findIndex(t=>Wr(t,e));return t<0||(n.splice(t,1),!1)})}function ti(e,t,n,r,i,a,o){let s=i([e,...a].join(`
`)),c=new Set(a.map(e=>e.split(` `)[0])),l=o=>!ei(i([e,Zr(n,t,r,o),...a].join(`
`)),s.diagnostics).filter(e=>!c.has(Ur.exec(e.message)?.[1]??``)).length,u=ii.get(s)??{written:new Map(H(e).cells.map(e=>[e.name,e])),kindOf:fe(s)};ii.set(s,u);let{written:d,kindOf:f}=u,p=e=>{let t=d.get(e);if(e===s.mainMeter&&t?.step&&!t.step.whole||t?.braid.kind===`list`&&t.braid.perBeat!==void 0)return`meter`;let n=f(e);return n===`meter`?`table`:n},m=null,h=()=>{if(m)return m;let e=ai.get(o)??new Map;ai.set(o,e);let i=`${t}\u0000${JSON.stringify(r??null)}`;return m=e.get(i)??si(Zr(n,t,r,`&${oi}`),o),e.set(i,m),m},g=e=>li(p(e.slice(1)),s.cells.get(e.slice(1))?.steps??0,h)&&l(e),_=H(e).offers,v=_?.length?_.map(e=>`&${e}`):Lr(e).map(e=>`&${e.name}`),y=[];for(let e of v)if(!n.includes(e)&&g(e)&&y.push(e)>1)return null;return y[0]??null}var ni=/^(step|paramClocks)(\.|$)/,ri=/^over$/,ii=new WeakMap,ai=new WeakMap,oi=`fitMainArgument`;function si(e,t){let n=new Set(H(e).cells.map(e=>e.name)),r=H(D(e,{resolve:t}).text).cells.filter(e=>!n.has(e.name)),i=e=>typeof e.params.play==`string`&&/^&?([A-Za-z_]\w*)/.exec(e.params.play)?.[1]===oi?[`play`]:[],a=new Map;for(let e of r)for(let t of x(e))t.path.startsWith(`braid.`)&&a.set(t.name,[...a.get(t.name)??[],{by:e.name,spliced:!t.path.includes(`.exprs.`)}]);let o=(e,t=new Set)=>!t.has(e)&&(t.add(e),(a.get(e)??[]).some(e=>e.spliced||o(e.by,t)));return r.flatMap(e=>[...x(e).filter(e=>e.name===oi).map(t=>t.path.includes(`.exprs.`)&&o(e.name)?`${t.path}${ci}`:t.path),...i(e)])}var ci=`#held`;function li(e,t,n){if(e===`text`)return!1;if(e===`table`||e===`line`||e===`blank`||e===`steps`&&t>1)return!0;let r=n();return e===`meter`?r.length>0&&r.every(e=>ni.test(e)||e.includes(`.exprs.`)&&!e.endsWith(ci)):e===`steps`&&t===1?r.every(e=>e===`tonic`):r.every(e=>!ri.test(e)&&e!==`play`)}function ui(e,t){let n=Rr(e),r=t.replace(/^&/,``);if(!n.has(r))return`&${r}`;let i=2;for(;n.has(`${r}${i}`);)i++;return`&${r}${i}`}function di(e,t,n){let r=$r(n.resolve,n.compiled),i=n.resolve(t),a=e.replace(/\s+$/,``),o=e=>[...a?[a]:[],e].join(`
`),s=e=>r(e).takes?.at(-1)??null,c=i===null?null:g(i);if(i===null||!c){let e=`* from ${t}`;return{text:o(e),line:e,heads:[],main:null,used:i===null?null:s(o(e)),resolve:n.resolve}}let l=c.names.length===1?[n.head??ui(e,c.names[0])]:c.names.map(t=>ui(e,t)),u=Pr(i,r,n.resolve).sounds.filter(t=>!Rr(e).has(t.slice(1))).map(Nr),d=n.main??(c.main?ti(e,t,l,n.args,r,u,n.resolve):null),f=Zr(c.names.length===1?l:l.map((e,t)=>e===c.names[t]?e:`${e}=${c.names[t].slice(1)}`),t,n.args,d);return{text:o(f),line:f,heads:l,main:d,used:s(o(f)),resolve:n.resolve}}function fi(e,t,n){let{id:r,options:i}=Jr(e,n);return pi(r,t,i)}function pi(e,t,n){let r=$r(n.resolve,n.compiled),i=n.resolve(e);if(i===null)return{fits:!1,text:t,use:null,missing:[],sounds:[],unmet:[],resolve:n.resolve};let a=g(i);if(!a){let e=Gr(i,t,r,n.resolve);return{fits:e.fits,text:e.union.text,use:null,union:e.union,missing:e.missing,sounds:e.sounds,unmet:e.unmet,...e.diagnostics?{diagnostics:e.diagnostics}:{},resolve:n.resolve}}let o=di(t,e,{...n,compiled:r});if(a.main&&o.main===null)return{fits:!1,text:o.text,use:o,missing:[a.main],sounds:[],unmet:[],resolve:n.resolve};let s=new Set(Rr(t)),c=Pr(i,r,n.resolve).sounds.filter(e=>!s.has(e.slice(1))).sort(),l=c.map(Nr),u=[o.text,...l].join(`
`),d=r(u),f=new Set(c),p=ei(d,r([t,...l].join(`
`)).diagnostics).filter(e=>{let t=Ur.exec(e.message);return!(t&&f.has(t[1]))}),m=new Set((o.used?.gave??[]).map(e=>e.slice(1))),h=Tr(D(u,{resolve:n.resolve}).text,d,m,m).filter(e=>!Vr(d,e)).map(e=>e.need);return{fits:!p.length&&!h.length,text:o.text,use:o,missing:[],sounds:c,unmet:h,diagnostics:p,resolve:n.resolve}}var mi=(e,t,n)=>({...e,sign:e.sign*t,by:e.by*t+n}),hi=e=>`${e.table}:${e.sign*e.value+e.by}:${e.sign*e.alter}:${e.transpose}`;function gi(e){if(typeof e.written==`number`){let t=e.sign*e.alter;return`${e.sign*e.written+e.by}${t>0?`#`:t<0?`b`:``}`}let t=e.sign===-1?`inverse(${e.written})`:e.written;return e.by===0?t:/^&[A-Za-z_][A-Za-z0-9_]*$/.test(t)?`${t}^${e.by}`:`degree(${t}, ${e.by})`}var _i=(e,t)=>e.cells.get(t.slice(1))?.drumNote??null,vi=(e,t)=>_i(e,t)??128,yi=/^~(?:[!@](\d+))?$/,bi=/^&([A-Za-z_][A-Za-z0-9_]*)(?::0(?::([0-9]*\.?[0-9]+))?)?(?:!(\d+))?$/,xi=/^\[([^[\]]*,[^[\]]*)\]$/,Si=/^\[([^[\],]*)\]$/,Ci=/^&([A-Za-z_][A-Za-z0-9_]*)\((\d+),\s*(\d+)(?:,\s*(-?\d+))?\)$/,wi=/^&([A-Za-z_][A-Za-z0-9_]*)\(even\((\d+),\s*(\d+)(?:,\s*(\d+))?\)\)(?:@(\d+))?$/,Ti=/^([0-9]*\.?[0-9]+)(?:!(\d+))?$/,Ei=/^(-?\d+)[#b]?(?:!(\d+))?$/,Di=/^(-?\d+)[#b]?@(\d+)$/,Oi=/^\[(&[A-Za-z_][A-Za-z0-9_]*(?::0(?::[0-9]*\.?[0-9]+)?)?|~) (&[A-Za-z_][A-Za-z0-9_]*(?::0(?::[0-9]*\.?[0-9]+)?)?|~)\]$/,ki=/^\[(-?\d+[#b]?|~) (-?\d+[#b]?|~)\]$/,Ai=String.raw`&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?`,ji=new RegExp(String.raw`^(?:${Ai}|inverse\(${Ai}\)|degree\((?:${Ai}|inverse\(${Ai}\)),\s*-?\d+\))$`);function Mi(e){let t=bi.exec(e);return t&&!t[3]?{voice:`&${t[1]}`,own:t[2]??null}:null}function Ni(e){let t=[];for(let n of e){let e=yi.exec(n),r=bi.exec(n),i=xi.exec(n);if(e)for(let n=0;n<Number(e[1]??1);n++)t.push([]);else if(r)for(let e=0;e<Number(r[3]??1);e++)t.push([{voice:`&${r[1]}`,own:r[2]??null}]);else if(i){let e=i[1].split(`,`).map(e=>Mi(e.trim()));if(e.some(e=>!e))return null;t.push(e)}else if(Oi.test(n)){let[e,r]=Oi.exec(n).slice(1,3).map(e=>e===`~`?null:Mi(e));t.push([...e?[{...e,half:0}]:[],...r?[{...r,half:1}]:[]])}else return null}return t}function Pi(e){let t=[];for(let n of e){let e=Ti.exec(n);if(!e)return null;for(let n=0;n<Number(e[2]??1);n++)t.push(e[1])}return t}var Fi=(e,t,n)=>{let r=Ce(e,t);return Array.from({length:t},(e,t)=>t).filter(e=>r[((e-n)%t+t)%t])};function Ii(e,t){if(!e||!t)return null;let n=t.pulses/t.unit;return e===`1m`?n:e===`pulse`?1/t.unit:a(e)}function Li(e,t){let n=K(e,t)?.braid??[];return n.length!==1||!/^\[.*\]$/.test(n[0])?[]:n[0].slice(1,-1).split(`,`).map(e=>e.trim())}function Ri(e,t){let n=new Set(e.split(`
`).flatMap(e=>i(U(e)[0].trim())===void 0?[...U(e)[0].replace(/^\s*&[A-Za-z_][A-Za-z0-9_]*/,``).matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map(e=>e[1]):[])),r=[...t.cells.values()].filter(e=>!e.implicit&&!e.lambda&&!n.has(e.name)),a=[...[...t.cells.values()].filter(e=>(e.map?.kind===`midi`||e.sink)&&!e.implicit).map(e=>e.name),...r.filter(t=>!t.map&&!t.voice&&!t.step&&Li(e,t.name).length).map(e=>e.name)],o=[],s=new Set,c=n=>{if(s.has(n))return;s.add(n);let r=Li(e,n);for(let i of r){let a=/^&([A-Za-z_][A-Za-z0-9_]*)$/.exec(i)?.[1],s=a?t.cells.get(a):void 0;if(s&&!s.voice&&!s.step&&Li(e,a).length){c(a);continue}let l=i.split(`*`).map(e=>e.trim()),u=l.filter(e=>e.startsWith(`&`));if(l.some(e=>!/^&[A-Za-z_][A-Za-z0-9_]*$/.test(e)&&!Ti.test(e)))continue;let d=u.map(e=>t.cells.get(e.slice(1)));if(d.some(e=>!e))continue;let f=d.filter(e=>e.map?.kind===`amp`),p=d.filter(e=>e.map?.kind!==`amp`),m=p.filter(e=>e.voice),h={name:n,entries:r,entry:i};if(p.length===2&&m.length===1&&!f.length){let n=Bi(e,t,p.find(e=>!e.voice).name,m[0].name,h);n&&o.push(n);continue}if(p.length!==1||f.length>1)continue;let g=zi(e,t,p[0].name,f[0]?.name,h);g&&o.push(g)}};for(let e of a)c(e);for(let n of r){if(!n.over||!n.step||n.voice||n.map)continue;let r=Bi(e,t,n.name,null,{name:n.name,entries:[],entry:`&${n.name}`});r&&o.push(r)}return o}function zi(e,t,n,r,i){let a=K(e,n),o=t.cells.get(n);if(!a||!o.step)return null;let s=t.cells.get(o.step.driver)?.meter??null,c=Ii(o.step.tap,s),l=e=>!!t.cells.get(e.slice(1))?.voice,u=`steps`,d,f,p=1,m=!1;if(a.braid.length===1&&wi.test(a.braid[0])){let[,e,t,n,r,i]=wi.exec(a.braid[0]);p=Number(i??1),m=!0,u=p===Number(n)?`steps`:`euclid`;let o=new Set(ke(Number(t),Number(n),Number(r??0)));d=Array.from({length:Number(n)},(t,n)=>o.has(n)?[{voice:`&${e}`,own:null}]:[])}else if(a.braid.length===1&&Ci.test(a.braid[0])){let[,e,t,n,r]=Ci.exec(a.braid[0]);u=`euclid`,f={voice:`&${e}`,k:Number(t),n:Number(n),r:Number(r??0)};let i=new Set(Fi(f.k,f.n,f.r));d=Array.from({length:f.n},(e,t)=>i.has(t)?[{voice:f.voice,own:null}]:[])}else a.braid.length===1&&Si.test(a.braid[0])?(u=`seq`,d=Ni(Ae(Si.exec(a.braid[0])[1]))):d=Ni(a.braid);if(!d?.length||d.some(e=>e.some(e=>!l(e.voice)))||u===`steps`&&d.length!==o.steps)return null;let h;if(r){let t=Pi(K(e,r)?.braid??[]);if(!t||t.length!==d.length)return null;h={cell:r,tokens:t}}let g=d.flatMap((e,t)=>e.map(e=>({step:t+(e.half??0)/2,voice:e.voice,own:e.own,level:Number(e.own??1)*Number(h?.tokens[t]??1),...e.half===void 0?{}:{half:!0}}))).filter(e=>e.level>0).sort((e,n)=>e.step-n.step||vi(t,e.voice)-vi(t,n.voice));return{name:`&${n}`,trigger:n,card:i,form:u,...f?{euclid:f}:{},...h?{levels:h}:{},steps:d.length,notes:g,...p>1&&u!==`steps`?{hold:p}:{},...m?{struck:m}:{},stepWhole:c===null?null:u===`steps`?c:c*p/d.length,meter:s}}function Bi(e,t,n,r,i){let a=K(e,n),o=t.cells.get(n);if(!a||!o.step)return null;let c=t.cells.get(o.step.driver)?.meter??null,l=Symbol(`held`),u=[],d=new Map;for(let e of a.braid){let t=yi.exec(e),n=Ei.exec(e),r=Di.exec(e);if(t)for(let e=0;e<Number(t[1]??1);e++)u.push(null);else if(n)for(let e=0;e<Number(n[2]??1);e++)u.push(Number(n[1]));else if(r&&Number(r[2])>=2)d.set(u.length,Number(r[2])),u.push(Number(r[1]),...Array(Number(r[2])-1).fill(l));else if(ji.test(e))u.push(e);else if(ki.test(e)){let[,t,n]=ki.exec(e);u.push({halves:[t,n].map(e=>e===`~`?null:parseInt(e))})}else return null}if(!u.length||u.length!==o.steps)return null;let f=s(t,n,J(t)),p=[];for(let[e,t]of u.entries()){if(typeof t==`object`&&t){for(let[n,i]of t.halves.entries()){let t=f.filter(t=>Math.abs(t.step-(e+n/2))<1e-9);if(i===null?t.length:t.length!==1||Math.abs(t[0].duration-.5)>1e-9)return null;if(i===null)continue;let a=t[0],o={written:i,sign:1,by:0,table:`${a.table}:${a.tableShift}`,value:a.value,alter:a.alter,transpose:a.transpose??0};p.push({step:e+n/2,voice:r===null?``:`&${r}`,own:null,level:1,pitch:o,half:!0})}continue}let n=f.filter(t=>Math.abs(t.step-e)<1e-9),i=d.get(e)??1;if(t===null||t===l?n.length:n.length!==1||Math.abs(n[0].duration-i)>1e-9)return null;if(t===null||t===l)continue;let a=n[0],o={written:t,sign:1,by:0,table:`${a.table}:${a.tableShift}`,value:a.value,alter:a.alter,transpose:a.transpose??0};p.push({step:e,voice:r===null?``:`&${r}`,own:null,level:1,pitch:o,...i>1?{hold:i}:{}})}return f.length===p.length?{name:`&${n}`,trigger:n,card:i,form:`steps`,steps:u.length,notes:p,stepWhole:Ii(o.step.tap,c),meter:c,pitched:{table:o.over,voice:r===null?``:`&${r}`}}:null}var Vi=e=>e.own===null?e.voice:`${e.voice}:0:${e.own}`;function Hi(e,t){let n=Array(e.steps).fill(`~`),r=new Map,i=new Map;for(let a of t){if(a.half){let e=Math.floor(a.step),t=i.get(e)??[`~`,`~`];t[a.step===e?0:1]=a.pitch?gi(a.pitch):Vi(a),i.set(e,t);continue}if(!Number.isInteger(a.step))continue;for(let t=1;t<(a.hold??1);t++)a.step+t<e.steps&&(n[a.step+t]=null);let t=a.pitch?`${gi(a.pitch)}${a.hold?`@${a.hold}`:``}`:Vi(a),o=r.get(a.step);o?o.push(t):r.set(a.step,[t])}for(let[t,i]of r)t>=0&&t<e.steps&&n[t]!==null&&(n[t]=i.length===1?i[0]:`[${i.join(`,`)}]`);for(let[t,[r,a]]of i)t>=0&&t<e.steps&&(n[t]=`[${r} ${a}]`);return n}function X(e,t,n,r=!1){let i=new Map;if(!t.length){let t=e.card.entries.filter(t=>t!==e.card.entry);if(!t.length)return null;i.set(e.card.name,[`[${t.join(`, `)}]`])}if(e.euclid&&r){let{voice:t,k:n,n:r,r:a}=e.euclid;i.set(e.trigger,[`${t}(${n},${r},${(a+1)%r})`])}else{let n=Hi(e,t).filter(e=>e!==null);i.set(e.trigger,e.form===`steps`?n:[`[${n.join(` `)}]${e.hold?`@${e.hold}`:``}`])}return e.levels&&n&&i.set(e.levels.cell,[...n]),i}var Ui=36,Wi=new Set([37,38,39,40]);function Gi(e){let t=e.beats.length;return e.beats.map((t,n)=>e.beats.slice(0,n).reduce((e,t)=>e+t,0)/e.unit).filter((e,n)=>t<=3?n>0:n%2==1)}var Ki=(e,t)=>Math.abs(e-t)<1e-9;function qi(e){if(!e.meter||e.stepWhole===null)return!1;let t=e.meter.pulses/e.meter.unit,n=Gi(e.meter);return e.notes.every(r=>{let i=r.step*e.stepWhole%t;return n.some(e=>Ki(i,e)||Ki(i,e+t))})}var Ji=(e,t,n)=>e.notes.length>0&&e.notes.every(e=>_i(n,e.voice)===t),Yi=(e,t,n)=>e.notes.length>0&&e.notes.every(e=>t.has(_i(n,e.voice)??-1));function Xi(e,t){let n=e.cells.get(t);if(!n?.step)return null;let r=Ii(n.step.tap,e.cells.get(n.step.driver)?.meter??null);if(r===null)return null;let i=new Map;for(let n of s(e,t,J(e)))i.set(n.step,[...i.get(n.step)??[],n.value+n.alter]);if(![...i.values()].some(e=>e.length>1))return null;let a=[...i.keys()].sort((e,t)=>e-t),o=e=>[...e].sort((e,t)=>e-t).join(`,`),c=a.filter((e,t)=>t===0||o(i.get(e))!==o(i.get(a[t-1]))).map(e=>({at:e*r,size:i.get(e).length}));return{lap:n.steps*r,changes:c}}function Zi(e,t){if(!e.pitched?.table||e.stepWhole===null)return[];let n=Xi(t,e.pitched.table);if(!n)return[];let r=e.steps*e.stepWhole,i=e=>Ki(e%n.lap,0)||Ki(e%n.lap,n.lap),a=1;for(;a<64&&!i(a*r);)a++;return e.notes.flatMap(t=>{let i=t.pitch;if(typeof i.written!=`number`||i.table!==`${e.pitched.table}:0`||i.alter||i.transpose)return[];let o=Array.from({length:a},(i,a)=>(t.step*e.stepWhole+a*r)%n.lap).flatMap(e=>n.changes.filter(t=>Ki(t.at,e)||Ki(t.at+n.lap,e))),s=e=>(i.value%e+e)%e===0;return o.length&&o.every(e=>s(e.size))?[{line:e.name,step:t.step,reason:`root`}]:[]})}function Qi(e,t){return e.flatMap(e=>e.pitched?Zi(e,t):Ji(e,Ui,t)?[{line:e.name,reason:`kick`}]:Yi(e,Wi,t)&&qi(e)?[{line:e.name,reason:`backbeat`}]:[])}var $i=/@(\d+)$/,ea=/^(.+)!(\d+)$/;function ta(e,t){let n=[],r=0;for(let t of e){let e=$i.exec(t),i=ea.exec(t),a=e?Number(e[1]):i?Number(i[2]):1;n.push({start:r,len:a}),r+=a}return r===t?n:null}var na=/^(label|tags|show|about|title)=/;function ra(e,t,n,r,i,a,o){if(e.form!==`steps`||e.levels||e.euclid||e.struck||!i.length)return null;let s=ta(t,e.steps);if(!s)return null;let c=e.name,l=e.steps,u=s.length,d=Hi(e,e.notes),f=Hi(e,i),p=(e,t,n=f)=>n.slice(e,t).filter(e=>e!==null),m=n.filter(e=>!na.test(e)),h=[...a].sort((e,t)=>e-t),g=(e,t)=>{let n=[],r=0;for(let e=0;e<l;e++){let i=t(e);i===null?d[e]!==null&&r++:(r&&n.push(r===1?`=`:`=!${r}`),n.push(i),r=0)}return{form:`base=${e} ${n.join(` `)}`.trim(),line:t=>`&${t} base=${e} ${n.join(` `)}`.trim()}},_=e=>e===u-1&&u>1?`-1`:String(e),v=(e,t)=>e===0&&t===u?c:t-e===1?`${c}[${_(e)}]`:e===0?`${c}[:${t===u-1?`-1`:t}]`:t===u?`${c}[${_(e)}:]`:`${c}[${e}:${t}]`,y=(e,t)=>{let n=s.findIndex(t=>t.start===e),r=s.findIndex(e=>e.start===t);return n<0||r<0&&t!==l?null:[n,r<0?u:r]},b=(e,t,n)=>{let r=y(e,t);return r?[n(v(...r))]:p(e,t)},x=e=>{let t=e.join(` `);return{form:t,line:e=>[`&${e}`,...m,t].join(` `)}},S=null;if(r===`rotate`)s.at(-1).len===1&&(S={form:`${c}[<<]`,line:e=>`&${e} [${c}[<<]]`});else if(r===`transpose`)S=h.length?g(`${c}^${o}`,e=>a.has(e)?d[e]:null):x([`${c}^${o}`]);else if(r===`invert`){let e=e=>o?`degree(inverse(${e}), ${o})`:`inverse(${e})`,t=[],n=0;for(let r of[...h,l])r>n&&t.push(...b(n,r,e)),r<l&&t.push(...b(r,r+1,e=>e)),n=r+1;S=x(t)}else if(r===`reverse`){if(!h.length)S=x([`${c}[::-1]`]);else{let e=h[0]>0,t=e?p(0,h[0]):[];for(let[n,r]of h.entries()){t.push(...b(r,r+1,e=>e));let[i,a]=[r+1,h[n+1]??l],o=y(i,a);a<=i||(e&&n===h.length-1?t.push(...p(i,a)):a-i===1?t.push(...b(i,a,e=>e)):o?t.push(`${c}[${o[1]===u?``:o[1]-1}:${o[0]-1}:-1]`):t.push(...p(i,a)))}S=x(t)}}else S=g(c,e=>d[e]===f[e]?null:f[e]);return!S||!S.form.includes(c)?null:S.line(e.trigger).length<=[c,...m,...p(0,l)].join(` `).length?S:null}var ia=/^(?:&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+|\[[^\]]*\])*|(?:inverse|degree)\(.+\))$/,aa=[0,-1];function oa(e,t,n,r){let i=[];for(let a of e){if(n.has(a)||r(a))continue;let e=t(a);!e||e.braid.length<2||!e.braid.every(e=>ia.test(e))||i.push({name:`&${a}`,head:e.head,attrs:e.attrs,slots:e.braid})}let a=[],o=new Set;for(let[e,t]of i.entries()){if(o.has(t.name))continue;let n=i.slice(e+1).find(e=>!o.has(e.name)&&sa(t.slots,e.slots));n&&o.add(n.name),a.push(n?{...t,partner:n}:t)}return a}function sa(e,t){if(e.length!==t.length)return!1;let n=new Map,r=new Map;for(let[i,a]of e.entries()){let e=t[i];if((n.get(a)??e)!==e||(r.get(e)??a)!==a)return!1;n.set(a,e),r.set(e,a)}return new Set(e).size>1}var ca=[`rotate`,`reverse`,`swap`,`substitute`];function la(e,t){return[...new Set(e.map(e=>e<0?t+e:e).filter(e=>Number.isInteger(e)&&e>=0&&e<t))].sort((e,t)=>e-t)}function ua(e,t){return t.length?t.map((n,r)=>{let i=t[(r+1)%t.length]+(r+1===t.length?e:0);return Array.from({length:i-n-1},(t,r)=>(n+1+r)%e)}):[Array.from({length:e},(e,t)=>t)]}function da(e,t,n,r){let i=e.length,a=e=>!t.includes(e),o=Array.from({length:i},(e,t)=>t),s=t=>t===-1?r?.key:e[t],c=t=>t.some((t,n)=>s(t)!==e[n]),l=e=>{let n=[...o];for(let r of ua(i,t))for(let[t,i]of r.entries())n[i]=r[e(r,t)];return n},u=o.filter(t=>e.indexOf(e[t])===t),d=[],f=e=>c(e.from)&&d.push(e);for(let t of n)if(t===`rotate`)f({operator:t,amounts:[],from:l((e,t)=>(t+e.length-1)%e.length),what:`each span a slot later, its last to its first`});else if(t===`reverse`)f({operator:t,amounts:[],from:l((e,t)=>e.length-1-t),what:`each span in reverse order, the fixed slots kept`});else if(t===`swap`)for(let e=0;e+1<i;e++){if(!a(e)||!a(e+1))continue;let n=[...o];[n[e],n[e+1]]=[e+1,e],f({operator:t,amounts:[e],from:n,what:`slots ${e} and ${e+1} exchanged`})}else if(t===`substitute`){for(let n=0;n<i;n++)if(a(n))for(let r of u){if(e[r]===e[n])continue;let i=[...o];i[n]=r,f({operator:t,amounts:[n,r],from:i,what:`slot ${n} plays slot ${r}'s`})}}else if(t===`drop`&&r)for(let n=0;n<i;n++){if(!a(n)||e[n]===r.key)continue;let i=[...o];i[n]=-1,f({operator:t,amounts:[n],from:i,what:`slot ${n} left empty`})}else if(t===`add`&&r&&r.fill!==null)for(let n=0;n<i;n++){if(!a(n)||e[n]!==r.key)continue;let i=[...o];i[n]=r.fill,f({operator:t,amounts:[n],from:i,what:`empty slot ${n} plays slot ${r.fill}'s`})}return d}function fa(e,t,n){let r=[],i=0;for(let[e,a]of n.entries())a===t[e]?i++:(i&&r.push(i===1?`=`:`=!${i}`),r.push(a),i=0);if(!r.length)return null;let a=`base=${e} ${r.join(` `)}`;return{form:a,line:e=>`&${e} ${a}`}}function pa(e,t,n,r){let i=[];for(let a=0;a<e;a++)if(!t.includes(a)&&r(a))for(let e of n)e!==0&&i.push({slot:a,by:e});return i}var ma=[-2,2],ha=/^(-?\d+)([#b])?$/,ga=/^\[(-?\d+[#b]?(?:,-?\d+[#b]?)+)\]$/,_a=/^\[(\[[^[\]]+\])\s+(\[[^[\]]+\])\]$/,va=/^(.*?)(?:!(\d+))?$/;function ya(e){let t=ga.exec(e);if(!t)return null;let n=[];for(let e of t[1].split(`,`)){let t=ha.exec(e);n.push({degree:Number(t[1]),alter:t[2]===`#`?1:t[2]===`b`?-1:0})}return n}function ba(e){let[,t,n]=va.exec(e),r=_a.exec(t),i=r?[ya(r[1]),ya(r[2])]:[ya(t)];return i.some(e=>e===null)?null:{slot:i,run:n?Number(n):1}}var xa=e=>`${e.degree}${e.alter>0?`#`:e.alter<0?`b`:``}`,Sa=e=>`[${e.map(xa).join(`,`)}]`,Ca=e=>e.length===1?Sa(e[0]):`[${e.map(Sa).join(` `)}]`;function wa(e){let t=[];for(let n=0;n<e.length;){let r=Ca(e[n]),i=1;for(;n+i<e.length&&Ca(e[n+i])===r;)i++;t.push(i>1?`${r}!${i}`:r),n+=i}return t}function Ta(e,t,n,r){let i=[];for(let a of n){let n=t.cells.get(a);if(!n?.step||r.has(a)||n.voice)continue;let o=t.cells.get(n.step.driver)?.meter??null,s=Ii(n.step.tap,o),c=K(e,a),l=c?.attrs.find(e=>e.startsWith(`over=&`))?.slice(6);if(s===null||!c||!l||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(l))continue;let u=[],d=!0;for(let e of c.braid){let t=ba(e);if(!t){d=!1;break}for(let e=0;e<t.run;e++)u.push(t.slot)}d&&u.length&&u.length===n.steps&&i.push({name:`&${a}`,table:l,slots:u,stepWhole:s,meter:o,cadence:Ea(u.length,s,o)})}return i}function Ea(e,t,n){let r=n?n.pulses/n.unit:1,i=e*t/r,a=Math.abs(i-Math.round(i))<1e-9?Math.round(i):null,o=a!==null&&a%4==0?Array.from({length:a/4},(e,t)=>(t+1)*4-1):[Math.ceil(i)-1],s=1e-9;return Array.from({length:e},(e,t)=>t).filter(e=>{let[n,i]=[e*t/r,(e+1)*t/r];return o.some(e=>n<e+1-s&&i>e+s)})}function Da(e,t,n){return t.flatMap((t,r)=>t.flatMap((i,a)=>{let o=e.stepWhole/t.length;return i.map(t=>({at:r*e.stepWhole+a*o,key:`${o} chords#${n} ${e.table}:0:${t.degree}:${t.alter}:0`}))}))}function Oa(e,t,n,r=e.cadence,i=[-2,-1,1,2]){let a=[],o=e=>!r.includes(e),s=e.slots.map(t=>Da(e,[t],0).map(e=>`${e.at} ${e.key}`).sort().join(`;`)),c=J(n),l=(t,r=0)=>ie(n,e.table,0,t,r,c).position;for(let n of t)if(ca.includes(n))for(let t of da(s,r,[n]))a.push({operator:t.operator,amounts:t.amounts,slots:t.from.map(t=>e.slots[t]),what:t.what});else if(n===`third`||n===`shift`)for(let{slot:t,by:o}of pa(e.slots.length,r,n===`third`?ma:i,t=>e.slots[t].length===1)){let r=[...e.slots];r[t]=[e.slots[t][0].map(e=>({...e,degree:e.degree+o}))];let i=n===`third`?`a third ${o>0?`up`:`down`}`:`${Math.abs(o)} degree${Math.abs(o)===1?``:`s`} ${o>0?`up`:`down`}`;a.push({operator:n,amounts:[t,o],slots:r,what:`its chord on step ${t} ${i}`})}else(n===`dominant`||n===`split`)&&e.slots.forEach((t,r)=>{if(!o(r)||t.length!==1)return;let i=t[0],s=e.slots[(r+1)%e.slots.length][0],c=ja(s,i,l);if(!c)return;let u=[...e.slots];u[r]=[i,c],a.push({operator:n,amounts:[r],slots:u,what:`the dominant of the next chord on step ${r}'s second half`})});return a}var ka=(e,t)=>Math.abs(e-t)<1e-6,Aa=(e,t)=>ka(((e-t+.5)%12+12)%12,.5);function ja(e,t,n){let[r,i,a]=e;if(!r||!i||!a)return null;let o=n(r.degree,r.alter),s=n(t[0].degree,t[0].alter);if(Aa(s,o)||Aa(s,o+7)||ka(n(a.degree,a.alter)-o,6))return null;let c=e.length>=4?[0,4,7,10]:[0,4,7],l=(e,t)=>{let r=[];for(let[i,a]of c.entries()){let o=e+2*i,s=[0,1,-1].find(e=>ka(n(o,e),t+a));if(s===void 0)return null;r.push({degree:o,alter:s})}return r},u=[l(r.degree+4,o+7),l(r.degree-3,o-5)].filter(e=>e!==null),d=e=>Math.abs(n(e[0].degree,e[0].alter)-s);return u.sort((e,t)=>d(e)-d(t))[0]??null}function Ma(e,t,n){let r=fa(e.name,e.slots.map(Ca),t.map(Ca));return r&&r.line(e.name.slice(1)).length<=n.join(` `).length?r:null}var Na=[`rotate`,`drop`,`add`],Pa=[`transpose`,`invert`,`reverse`,`bend`,`trim`],Fa=[`rotate`,`reverse`,`third`,`dominant`,`swap`,`substitute`],Ia=ca,La=e=>`${e.at===null?``:e.at.toFixed(9)} ${e.key}`,Ra=``,za=[`swap`,`substitute`,`split`],Ba=`shift`,Va=`split`,Ha=[-1,1],Ua=[`third`,`dominant`,`swap`,`substitute`,`shift`,`split`],Wa=[-2,-1,1,2],Ga=[-2,-1,1,2];function Ka(e,t=``,n){let r=n?c(e,n):e,i=new Set(Lr(r).map(e=>e.name)),a=[...Lr(t).filter(e=>!i.has(e.name)).map(e=>e.written),r].join(`
`),o=W(a,void 0,n?{resolve:n}:{});if(!o.ok)return{lines:[],anchors:[],result:null,own:i,progressions:[],forms:[]};let s=Ri(a,o),l=Ta(r,o,i,qa(s)),u=l.flatMap(e=>e.cadence.map(t=>({line:e.name,step:t,reason:`cadence`}))),d=oa(i,e=>K(r,e),new Set([...qa(s),...l.map(e=>e.name.slice(1))]),e=>!!o.cells.get(e)?.voice);return{lines:s,anchors:[...Qi(s,o),...u],result:o,own:i,progressions:l,forms:d}}var qa=e=>new Set(e.flatMap(e=>[e.trigger,e.card.name,...e.levels?[e.levels.cell]:[]]));function Ja(e,t,n){let r=new Set(t.map(Ya));return(t,i,a)=>{let o=Array.from({length:i},(e,t)=>t);if(r.has(t))return o;let s=n?.[t]??n?.[t.slice(1)];if(s)return la(s,i);if(a)return la(a,i);let c=e.filter(e=>e.line===t);return c.some(e=>e.step===void 0)?o:la(c.map(e=>e.step),i)}}var Ya=e=>e.startsWith(`&`)?e:`&${e}`;function Xa(e,t={}){return Za(e,t)}function Za(e,t,n){let{workbench:r,keep:i=[],fewest:a=1,degrees:o=Wa,resolve:s}=t,c=n?[n.operator]:t.operators??Na,{lines:l,anchors:u,result:d,own:f,progressions:p,forms:m}=Ka(e,r,s);if(!d)return{notes:null,span:null,bar:null,variations:[]};let h=Ja(u,i,t.fixed),g=new Map(l.map(e=>[e.name,h(e.name,e.steps)])),_=e=>g.get(e.name),v=(e,t)=>_(e).includes(Math.floor(t.step)),y=(e,t)=>{let n=l[e].stepWhole;return n===null?`${e}@${t}`:(t*n).toFixed(9)},b=e=>String(_i(d,e)??e),x=e=>e.pitch?` ${hi(e.pitch)}`:``,S=(e,t)=>t.map(t=>`${y(e,t.step)} ${b(t.voice)}${x(t)}`),C=new Map([...new Set(l.flatMap(e=>e.pitched?[e.pitched.voice]:[]))].map((e,t)=>[e,`voice#${t}`])),w=new Map,T=e=>{let t=w.get(e);return t===void 0&&w.set(e,t=b(e)),t},E=(e,t)=>`${l[e].stepWhole??l[e].name}${t.half?`/2`:``} ${t.pitch?`${C.get(t.voice)} ${hi(t.pitch)}`:T(t.voice)}`,D=(e,t)=>{let{stepWhole:n,name:r}=l[e];return t.map(t=>n===null?{at:null,key:`${r}@${t.step} ${E(e,t)}`}:{at:t.step*n,key:E(e,t)})},O=(e,t,n=0)=>{let{stepWhole:r,name:i}=l[e],a=t.step-n;return r===null?` ${i}@${a} ${E(e,t)}`:`${(a*r).toFixed(9)} ${E(e,t)}`},k=l.map((e,t)=>D(t,e.notes)),A=(e,t)=>t.map(t=>O(e,t)),j=(e,t,n)=>t.map(t=>O(e,t,n)).sort().join(`;`),M=ro(d,f,l,p),N=[...l.map(e=>e.stepWhole===null?null:e.steps*e.stepWhole),...M.map(e=>e.lap)],P=l.find(e=>e.meter)?.meter??M.find(e=>e.meter)?.meter??null,F=N.length&&N.every(e=>e!==null)?N.reduce((e,t)=>no(e,t)):null,ee=P?P.pulses/P.unit:null,I=Qa(m,e,r,s,o),te=(e,t,n)=>[t.main,...t.partner?[t.partner]:[]].flatMap((t,r)=>t.map((t,i)=>({at:null,key:`form#${n}.${r} ${i} ${I(r?e.partner:e,t)}`}))),ne=e=>({main:e.slots,...e.partner?{partner:e.partner.slots}:{}}),re=[...M.flatMap(e=>e.notes),...m.flatMap((e,t)=>te(e,ne(e),t))],ie=(e,t)=>[...M.flatMap(n=>n.name===e?t:n.notes),...m.flatMap((n,r)=>n.name.slice(1)===e?t:te(n,ne(n),r))],L=e=>e.map(La).sort().join(`|`),ae=L(re),R=k.map(e=>e.map(La)),z=l.map((e,t)=>S(t,e.notes)),oe=l.reduce((e,t)=>e+t.notes.length,0),se=new Map,ce=e=>{let t=se.get(e);if(!t){let n=l.flatMap((t,n)=>n===e?[]:z[n]),r=new Set(n);t={keys:l.flatMap((t,n)=>n===e?[]:R[n]).sort(),strikes:r.size<n.length?null:r},se.set(e,t)}return t},le=(e,t)=>{let n=ce(e).keys,r=e<0?[]:A(e,t).sort(),i=[],a=0,o=0;for(;a<n.length||o<r.length;)i.push(o>=r.length||a<n.length&&n[a]<=r[o]?n[a++]:r[o++]);return`${i.join(`|`)}#${ae}`},ue=(e,t)=>{let n=ce(e).strikes;if(!n)return!1;let r=new Set;for(let i of S(e,t)){if(n.has(i)||r.has(i))return!1;r.add(i)}return!0},de=R.flat().sort().join(`|`),B=new Set([le(-1,[])]),fe=[],V=new Map,pe=t=>(V.has(t)||V.set(t,K(e,t)),V.get(t)),H=(e,t,n,r,i,o,s=typeof r==`number`?r:null)=>{if(!i||oe-l[e].notes.length+n.length<a||!ue(e,n))return;let c=le(e,n);if(B.has(c))return;B.add(c);let u=l[e].name,d=(e,t)=>{let n=pe(e);return n?[...n.head,...n.attrs,...t??n.braid].join(` `):``},f=pe(l[e].trigger),p=new Set(l[e].notes.filter(n=>v(l[e],n)&&!(t===`invert`&&n.pitch?.written===(s??0)/2&&!n.pitch.alter)).map(e=>e.step)),m=f&&ra(l[e],f.braid,f.attrs,t,n,p,s),h={id:`vary:${t}:${u}${r===null?``:`:${r}`}:${fe.length}`,tool:`vary`,rule:t,title:`${u}: ${o}`,before:[...i.keys()].map(e=>d(e)).join(`
`),after:[...i].map(([e,t])=>d(e,t)).join(`
`),apply:e=>[...i].reduce((e,[t,n])=>Oe(e,t,n),e),line:u,by:`${t} ${u}${r===null?``:` ${r}`}`,...m?{reference:m}:{}};fe.push({variation:h,notes:[...l.flatMap((t,r)=>r===e?D(e,n):k[r]),...re]})},U=e=>e.sort((e,t)=>e.step-t.step||vi(d,e.voice)-vi(d,t.voice)),W=e=>{let t=l[e].notes[0];return[t.step*(l[e].stepWhole??1),vi(d,t.voice)]},me=l.map((e,t)=>t).filter(e=>l[e].notes.length>0&&f.has(l[e].trigger)&&_(l[e]).length<l[e].steps&&(!n||n.line===l[e].name)).sort((e,t)=>W(e)[0]-W(t)[0]||W(e)[1]-W(t)[1]);for(let e of me){let t=l[e],n=t.levels?.tokens,[r,i]=t.notes.slice(-2),a=t.notes.length>=2&&!v(t,i),s=e=>t.notes.filter(t=>Math.floor(t.step)===e),u=Array.from({length:t.steps},(t,n)=>j(e,s(n),n)),d=_(t),f=e=>U(e.flatMap((e,t)=>s(e).map(n=>({...n,step:t+(n.step-e)})))),p=e=>n&&n.map((t,r)=>e[r]===-1?t:n[e[r]]);for(let l of c)if((za.includes(l)||[...Pa,`shift`,`split`].includes(l)===!!t.pitched)&&(!t.notes.some(e=>e.hold)||[`transpose`,`invert`,`shift`].includes(l))&&!(t.notes.some(e=>e.half)&&[`bend`,`trim`,`split`].includes(l))){if(l===`bend`){if(a)for(let n of Ga){let a=t.notes.map(e=>e===i?{...e,pitch:mi(r.pitch,1,n)}:e);H(e,l,a,n,X(t,a),`its last note bent to ${Math.abs(n)} degree${Math.abs(n)===1?``:`s`} ${n>0?`above`:`below`} the one before it`)}}else if(l===`trim`){if(!a||t.notes.length-1<2)continue;let n=t.notes.filter(e=>e!==i);H(e,l,n,i.step,X(t,n),`its last note, on step ${i.step}, left out: the one before it held`)}else if(l===`shift`)for(let{slot:n,by:r}of pa(t.steps,d,o,e=>s(e).length>0)){let i=t.notes.map(e=>Math.floor(e.step)===n?{...e,pitch:mi(e.pitch,1,r)}:e);H(e,l,i,`${n} ${r}`,X(t,i),`its note on step ${n} ${r>0?`up`:`down`} ${Math.abs(r)} degree${Math.abs(r)===1?``:`s`}`,null)}else if(l===`split`&&!t.pitched){if(t.form===`steps`&&!t.struck&&!t.hold)for(let{slot:r}of pa(t.steps,d,[1],e=>s(e).length===1)){let[i]=s(r),a=U([...t.notes.filter(e=>e!==i),{...i,half:!0},{...i,step:r+.5,half:!0}]);H(e,l,a,r,X(t,a,n??void 0),`its ${i.voice} on step ${r} split, struck twice`,null)}}else if(l===`split`)for(let{slot:n,by:r}of pa(t.steps,d,Ha,e=>s(e).length===1&&!s(e)[0].hold)){let[i]=s(n),a=[{...i,half:!0},{...i,step:n+.5,half:!0,pitch:mi(i.pitch,1,r)}],o=U([...t.notes.filter(e=>e!==i),...a]);H(e,l,o,`${n} ${r}`,X(t,o),`its note on step ${n} split, its second half ${r>0?`above`:`below`}`,null)}else if(l===`transpose`)for(let n of o){let r=t.notes.map(e=>v(t,e)?e:{...e,pitch:mi(e.pitch,1,n)});H(e,l,r,n,X(t,r),`every note ${n>0?`up`:`down`} ${Math.abs(n)} degree${Math.abs(n)===1?``:`s`}`)}else if(l===`invert`){let{written:n,alter:r}=t.notes[0].pitch;if(typeof n!=`number`||r)continue;let i=t.notes.map(e=>v(t,e)?e:{...e,pitch:mi(e.pitch,-1,2*n)});H(e,l,i,null,X(t,i),`every note mirrored about its first`,2*n)}else if(l===`reverse`)for(let n of da(u,d,[l])){let r=f(n.from);H(e,l,r,null,X(t,r),`its notes in reverse order between its anchors`)}else if(l===`rotate`)for(let n of da(u,d,[l])){let r=f(n.from);H(e,l,r,null,X(t,r,p(n.from)??void 0,!d.length),`every note a step later, the last to the first`)}else if(l===`swap`||l===`substitute`)for(let n of da(u,d,[l])){let r=f(n.from);H(e,l,r,n.amounts.join(` `),X(t,r,p(n.from)??void 0),n.what,null)}else if(l===`drop`||l===`add`){let n=t.notes.reduce((e,t)=>t.level>e.level?t:e);for(let r of da(u,d,[l],{key:Ra,fill:n.step})){let i=f(r.from),[a]=r.amounts,o=l===`drop`?`step ${a} left a rest`:`step ${a} given its loudest, step ${n.step}'s`;H(e,l,i,a,X(t,i,p(r.from)??void 0),o)}}}}let G=!!n||c.some(e=>Ua.includes(e));p.forEach(e=>B.add(`${de}#${e.name}:${L(Da(e,e.slots,M.findIndex(t=>t.name===e.name.slice(1))))}`)),m.forEach((e,t)=>B.add(`${de}#${e.name}:${L(te(e,ne(e),t))}`));let he=(e,t,n,r,i,a,o)=>{let s=`${de}#${e}:${L(a)}`;if(B.has(s))return;let c=ie(e.slice(1),a);B.add(s);let l=(e,t)=>{let n=pe(e);return n?[...n.head,...n.attrs,...t??n.braid].join(` `):``},u={id:`vary:${t}:${e}${n.map(e=>`:${e}`).join(``)}:${fe.length}`,tool:`vary`,rule:t,title:`${e}: ${r}`,before:[...i.keys()].map(e=>l(e)).join(`
`),after:[...i].map(([e,t])=>l(e,t)).join(`
`),apply:e=>[...i].reduce((e,[t,n])=>Oe(e,t,[...n]),e),line:e,by:`${t} ${e}${n.length?` ${n.join(` `)}`:``}`,...o?{reference:o}:{}};fe.push({variation:u,notes:[...k.flat(),...c]})};for(let e of p){if(!G||n&&n.line!==e.name)continue;let t=M.findIndex(t=>t.name===e.name.slice(1)),r=c.filter(e=>Fa.includes(e)||e===`shift`||e===`split`);for(let n of Oa(e,r,d,h(e.name,e.slots.length,e.cadence),o)){let r=wa(n.slots),i=pe(e.name.slice(1)),a=i&&Ma(e,n.slots,[...i.head,...i.attrs,...r]);he(e.name,n.operator,n.amounts,n.what,new Map([[e.name.slice(1),r]]),Da(e,n.slots,t),a||null)}}for(let[e,t]of m.entries()){if(!G||n&&n.line!==t.name)continue;let r=t.slots.map((e,n)=>`${I(t,e)}${t.partner?`/${I(t.partner,t.partner.slots[n])}`:``}`),i=h(t.name,t.slots.length,aa),a=(n,r,i,a)=>{let o=new Map([[t.name.slice(1),a.main]]);t.partner&&a.partner&&o.set(t.partner.name.slice(1),a.partner),he(t.name,n,r,i,o,te(t,a,e),$a(t,a))};for(let e of c)if(e===`shift`){if(!t.partner&&t.attrs.some(e=>e.startsWith(`step=`)))for(let{slot:n,by:r}of pa(t.slots.length,i,o,e=>to(t.slots[e],1)!==null)){let i=t.slots.map((e,t)=>t===n?to(e,r):e);a(e,[n,r],`its letter on slot ${n} moved ${r} degree${Math.abs(r)===1?``:`s`}`,{main:i})}}else if(e===`split`){if(!t.partner&&t.attrs.some(e=>e.startsWith(`step=`))){for(let n of t.slots.keys())if(!i.includes(n)&&eo.test(t.slots[n]))for(let r of t.slots.keys()){if(t.slots.indexOf(t.slots[r])!==r||t.slots[r]===t.slots[n]||!eo.test(t.slots[r]))continue;let i=t.slots.map((e,i)=>i===n?`[${e} ${t.slots[r]}]`:e);a(e,[n,r],`its letter on slot ${n} split, its second half slot ${r}'s`,{main:i})}}}else if(Ia.includes(e))for(let n of da(r,i,[e])){let e=n.from.map(e=>t.slots[e]);a(n.operator,n.amounts,n.what,{main:e,...t.partner?{partner:n.from.map(e=>t.partner.slots[e])}:{}})}}return{notes:[...k.flat(),...re],span:F,bar:ee,variations:fe}}function Qa(e,t,n=``,r,i=Wa){let a=new Map,o=[];for(let t of e)for(let e of[t,...t.partner?[t.partner]:[]])for(let t of e.attrs.some(e=>e.startsWith(`step=`))?[...e.slots,...e.slots.flatMap(e=>i.map(t=>to(e,t)).filter(e=>e!==null)),...e.slots.flatMap(t=>e.slots.filter(e=>e!==t&&eo.test(t)&&eo.test(e)).map(e=>`[${t} ${e}]`))]:[]){let n=`${e.attrs.join(` `)}|${t}`;if(a.has(n))continue;let r=`vary_slot_${a.size}`;a.set(n,r),o.push([`&${r}`,...e.attrs,t].join(` `))}let c=new Map;if(o.length){let e=new Set(Lr(t).map(e=>e.name)),i=Lr(n).filter(t=>!e.has(t.name)).map(e=>e.written),l=W([...i,t,...o].join(`
`),void 0,r?{resolve:r}:{});if(l.ok)for(let[e,t]of a)try{let n=s(l,t,J(l));c.set(e,n.map(e=>`${e.step}:${e.duration}:${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose??0}`).join(` `))}catch{}}return(e,t)=>c.get(`${e.attrs.join(` `)}|${t}`)||t}function $a(e,t){let n=fa(e.name,e.slots,t.main);if(!n)return null;let r=(e,t)=>[...e.head,...e.attrs,...t].join(` `).length,i=e.partner,a=i&&t.partner&&fa(i.name,i.slots,t.partner);return n.line(e.name.slice(1)).length+(a?a.line(i.name.slice(1)).length:0)>r(e,t.main)+(i&&t.partner?r(i,t.partner):0)?null:i&&a?{...n,partner:{of:i.name,...a}}:n}var eo=/^&[A-Za-z_][A-Za-z0-9_]*(?:\^-?\d+)?$/;function to(e,t){let n=/^&([A-Za-z_][A-Za-z0-9_]*)(?:\^(-?\d+))?$/.exec(e);if(!n)return null;let r=Number(n[2]??0)+t;return r===0?`&${n[1]}`:`&${n[1]}^${r}`}function no(e,t){let n=(e,t)=>t?n(t,e%t):e,[r,i]=[Math.round(e*3840),Math.round(t*3840)];return r&&i?r/n(r,i)*i/3840:Math.max(e,t)}function ro(e,t,n,r){let i=qa(n),a=[];for(let n of t){let t=e.cells.get(n);if(!t?.step||i.has(n)||t.voice)continue;let o=e.cells.get(t.step.driver)?.meter??null,c=Ii(t.step.tap,o);if(c===null)continue;let l=s(e,n,J(e)),u=new Map;for(let e of l)u.set(e.step,(u.get(e.step)??0)+1);if(![...u.values()].some(e=>e>1))continue;let d=a.length,f=r.find(e=>e.name===`&${n}`),p=f?Da(f,f.slots,d):l.map(e=>({at:e.step*c,key:`${c*e.duration} chords#${d} ${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose??0}`}));a.push({name:n,notes:p,lap:t.steps*c,meter:o})}return a}[...new Set([...Na,...Pa,...Fa,Ba,Va])];var io=3,ao=12,oo=[3,4,5,6,7,8,9,10,12,16],so=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),co=e=>e.key.startsWith(`r`)?null:/^n\d+:0$/.test(e.key)?e.base:void 0;function lo(e){let t=e.map(co);if(t.some(e=>e===void 0))return null;let n=[...new Set(t.filter(e=>e!==null))];return n.length<2?null:{sig:e.map((e,r)=>`${so(e)}:${t[r]===null?`~`:n.indexOf(t[r])}`).join(` `),chord:n}}var uo=e=>{let t=new Map(e.looks??[]),n=0,r=e.lines.map(e=>{let r=e.toks;if(r.some(e=>!Y(e.key)))return e;let i=[];r.reduce((e,t)=>(i.push(e),e+so(t)),0);let a=[];for(let e of oo)for(let t=0;t+e*io<=r.length;t++){let n=lo(r.slice(t,t+e));if(!n)continue;let o=r.slice(t,t+e).reduce((e,t)=>e+so(t),0);if(i[t]%o!==0)continue;let s=[n.chord];for(;t+e*(s.length+1)<=r.length;){let i=lo(r.slice(t+e*s.length,t+e*(s.length+1)));if(!i||i.sig!==n.sig||i.chord.length!==n.chord.length)break;s.push(i.chord)}if(s.length<io||s.length*e<ao||s.filter((e,t)=>t>0&&e.join()!==s[t-1].join()).length<(s.length-1)/2)continue;let c=r.slice(t,t+e*s.length).reduce((e,t)=>e+sn(t.key,t.base).length+1,0),l=30+s.reduce((e,t)=>e+t.join(`,`).length+3,0)+2*(i[t]/o)+30+2*e+8;l<c&&a.push({from:t,size:e,count:s.length,chords:s,sig:n.sig,dur:o,gain:c-l})}a.sort((e,t)=>t.gain-e.gain||e.from-t.from);let o=[],s=a.filter(e=>{let[t,n]=[e.from,e.from+e.size*e.count];return!o.some(([e,r])=>t<r&&e<n)&&(o.push([t,n]),!0)});if(!s.length)return e;let c=[],l=0;for(let a of s.sort((e,t)=>e.from-t.from)){c.push(...r.slice(l,a.from));let o=`f${t.size+1}`,s={pattern:a.sig.split(` `).map(e=>{let[t,n]=e.split(`:`);return n===`~`?{key:`r${t}`,base:null}:{key:`n${t}:0`,base:Number(n)}}),chords:a.chords,dur:a.dur,start:i[a.from],scale:e.scale??1};t.set(o,s),c.push({key:o,base:null}),l=a.from+a.size*a.count,n++}return c.push(...r.slice(l)),{...e,toks:c}});return n?{lines:r,rules:e.rules,looks:t}:null},fo=(e,t)=>t?fo(t,e%t):e,po=e=>{let t=0,n=e.lines.map(e=>{if(e.toks.some(e=>!Y(e.key)))return e;let n=e.toks.reduce((e,t)=>fo(e,Number(/^[rdn](\d+)/.exec(t.key)[1])),0);if(n<=1)return e;t++;let r=e.toks.map(e=>({...e,key:e.key.replace(/^([rdn])(\d+)/,(e,t,r)=>`${t}${Number(r)/n}`)}));return{name:e.name,toks:r,scale:(e.scale??1)*n}});return t?{...e,lines:n}:null},mo=12,ho=(e,t)=>t?ho(t,e%t):e,go=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),_o=(e,t)=>{let n=new Map(e.rules),r=new Map,i=Math.max(0,...[...n.keys()].map(e=>Number(e.slice(1))||0))+1,a=0,o=e.lines.map(e=>{if(e.toks.every(e=>Y(e.key))&&e.toks.reduce((e,t)=>ho(e,go(t)),0)>=2)return e;let t=[],o=e.toks;for(let e=0;e<o.length;){let s=0,c=e;for(;c<o.length&&Y(o[c].key)&&ho(s,go(o[c]))>=2;)s=ho(s,go(o[c++]));let l=o.slice(e,c);if(l.length<mo||!l.some(e=>e.base!==null)){t.push(o[e]),e++;continue}let u=l.find(e=>e.base!==null).base,d=l.map(e=>({key:an(e.key,1/s),off:e.base===null?null:e.base-u})),f=d.map(e=>`${e.key}/${e.off}`).join(` `),p=l.reduce((e,t)=>e+sn(t.key,t.base).length+1,0),m=d.reduce((e,t)=>e+sn(t.key,t.off).length+1,0),h=r.get(f);if(!h&&p-11-(5+m)<=0){t.push(o[e]),e++;continue}let g=h;if(!g){g=`s${i++}`;let e={key:g,kids:d};n.set(g,e),r.set(f,g)}t.push({key:g,base:u,stretch:s}),a++,e=c}return{...e,toks:t}});if(!a)return null;let s={...e,lines:o,rules:n};return t?.(()=>s),s},vo=12,yo=e=>Math.max(2,Math.floor(e/4)),bo=2,xo=5,So=48,Co=64,wo=(e,t)=>{let n=e.lines.map(e=>[...e.toks]),r=n.map(e=>e.map(()=>!1)),i=new Map(e.rules),a=Math.max(0,...[...i.keys()].map(e=>Number(e.slice(1))||0))+1,o=0,s=e=>sn(e.key,e.base).length+1,c=(e,t,i)=>{let a=n[e.line],o=n[t.line],s=r[e.line],c=r[t.line];if(e.i+i>a.length||t.i+i>o.length)return null;let l=yo(i),u=0;for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];if(!Y(r.key)||!Y(i.key)||s[e.i+n]||c[t.i+n]||r.key!==i.key&&++u>l)return null}let d=new Map;for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];r.key===i.key&&r.base!==null&&i.base!==null&&d.set(i.base-r.base,(d.get(i.base-r.base)??0)+1)}let f=0,p=-1;for(let[e,t]of d)t>p&&([f,p]=[e,t]);let m=0,h=Array(i);for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];if(h[n]=r.key!==i.key||r.base===null!=(i.base===null)||r.base!==null&&i.base-r.base!==f,h[n]&&++m>l)return null}return{diff:h,by:f}};for(let e=0;e<32;e++){let e=new Map;n.forEach((t,n)=>{for(let i=0;i+xo<=t.length;i++){let a=t.slice(i,i+xo);if(a.some((e,t)=>!Y(e.key)||r[n][i+t]))continue;let o=a.find(e=>e.base!==null)?.base??0,s=a.map(e=>`${e.key}/${e.base===null?``:e.base-o}`).join(` `);e.set(s,[...e.get(s)??[],{line:n,i}])}});let u=new Map;for(let t of e.values()){if(t.length<2||t.length>So)continue;let e=t[0],i=n[e.line];for(let a of t.slice(1)){if(a.line===e.line&&a.i<e.i+xo)continue;let t=n[a.line],o=i.slice(e.i,e.i+xo).findIndex(e=>e.base!==null),s=o<0?0:t[a.i+o].base-i[e.i+o].base,l=xo,d=0;for(;;){let[n,o]=[i[e.i+l],t[a.i+l]];if(!n||!o||!Y(n.key)||!Y(o.key)||r[e.line][e.i+l]||r[a.line][a.i+l]||a.line===e.line&&e.i+l+1>a.i)break;let c=n.key!==o.key||n.base===null!=(o.base===null)||n.base!==null&&o.base-n.base!==s;if(c&&d+1>yo(l+1))break;d+=+c,l++}for(;l>xo&&c(e,a,l)?.diff[l-1];)l--;if(l<vo)continue;let f=`${e.line}:${e.i}:${l}`,p=u.get(f);u.set(f,{proto:e,n:l,score:(p?.score??l)+l})}}let d=null,f=(e,t)=>{let r=[];return n.forEach((n,i)=>{for(let a=0;a+t<=n.length;a++){if(i===e.line&&a<e.i+t&&a+t>e.i)continue;let n=c(e,{line:i,i:a},t);n&&(r.push({at:{line:i,i:a},...n}),a+=t-1)}}),r},p=(e,t,r)=>{let i=n[e.line].slice(e.i,e.i+t).reduce((e,t)=>e+s(t),0),a=r.reduce((e,r)=>{let i=r.diff.filter(Boolean).length;return e+(i?22+6*i+n[r.at.line].slice(r.at.i,r.at.i+t).reduce((e,t,n)=>e+(r.diff[n]?s(t):0),0):9)},9+i+6);return(r.length+1)*i-a+bo*t*r.length};for(let e of[...u.values()].sort((e,t)=>t.score-e.score).slice(0,4)){let{proto:t,n:r}=e,i=f(t,r),a=(e,r)=>{let a=null;for(let o of[t,...i.map(e=>e.at)]){let t={line:o.line,i:o.i+r};if(t.i<0||t.i+e>n[t.line].length)continue;let i=f(t,e),s=i.reduce((e,t)=>e+t.diff.filter(Boolean).length,0);(!a||i.length>a.returns.length||i.length===a.returns.length&&s<a.apart)&&(a={proto:t,returns:i,apart:s})}return a},o=a(r,0);o&&([t,i]=[o.proto,o.returns]);let s=(e,t)=>e.some(e=>e.diff.some(Boolean))?t:-1/0,c={proto:t,n:r,returns:i,gain:s(i,p(t,r,i))},l=i.length;for(;r<Co;){let e=null;for(let t of[0,-1]){let n=a(r+1,t);n&&n.returns.length&&(!e||n.returns.length>e.returns.length)&&(e=n)}if(!e||2*e.returns.length<l)break;[t,i]=[e.proto,e.returns],r++;let n=s(i,p(t,r,i));n>c.gain&&(c={proto:t,n:r,returns:i,gain:n})}c.gain>0&&(!d||c.gain>d.gain)&&(d=c)}if(!d)break;let{proto:m,n:h}=d,g=n[m.line].slice(m.i,m.i+h),_=g.find(e=>e.base!==null)?.base??null,v=(e,t)=>e.map(e=>({key:e.key,off:e.base===null?null:e.base-(t??0)})),y={key:`s${a++}`,kids:v(g,_)};i.set(y.key,y);let b=[{at:m,tok:{key:y.key,base:_}}];for(let e of d.returns){let t=n[e.at.line].slice(e.at.i,e.at.i+h);if(!e.diff.some(Boolean)){b.push({at:e.at,tok:{key:y.key,base:_===null?null:_+e.by}});continue}let r=t.find(e=>e.base!==null)?.base??null,o={key:`s${a++}`,kids:v(t,r),of:y.key,patched:e.diff};i.set(o.key,o),b.push({at:e.at,tok:{key:o.key,base:r}})}for(let{at:e,tok:t}of b.sort((e,t)=>t.at.line-e.at.line||t.at.i-e.at.i))n[e.line].splice(e.i,h,t),r[e.line].splice(e.i,h,!0);o++,t?.(l)}return o?l():null;function l(){return{...e,lines:e.lines.map((e,t)=>({...e,toks:[...n[t]]})),rules:new Map(i)}}};function To(e,t,n=`^$`){return Y(e.key)?sn(e.key,e.base):on(e.key)?`&${t.get(e.key)??e.key}`:`&${t.get(e.key)??e.key}${e.base?`${n}${e.base}`:``}${e.stretch&&e.stretch!==1?`@${e.stretch}`:``}`}function Eo(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}var Do=(e,t,n=`^$`)=>Eo(e.map(e=>To(e,t,n)));function Oo(e,t,n,r){let i=e.kids.findIndex((n,r)=>!e.patched[r]&&n.off!==null&&t.kids[r].off!==null),a=i<0?0:e.kids[i].off-t.kids[i].off,o=e.kids.map((t,i)=>e.patched[i]?To({key:t.key,base:t.off},n,r):`=`);for(;o.length&&o[o.length-1]===`=`;)o.pop();return`base=&${n.get(t.key)??t.key}${a?`${r}${a}`:``} ${Eo(o)}`}var ko=e=>e.kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}}));function Ao(e){let t=[],n=new Set,r=i=>{for(let a of i)if(!Y(a.key)&&!on(a.key)&&!n.has(a.key)){n.add(a.key),t.push(a.key);let i=e.rules.get(a.key);r(i.of?[{key:i.of,base:null}]:ko(i))}};for(let t of e.lines)r(t.toks);return t}function jo(e,t=`m`,n=`pulse`,r=`^$`,i){let a=Ao(e),o=i?[...i.keys()].filter(e=>a.includes(e)):a,s=new Map(i?o.map(e=>[e,i.get(e)]):o.map((e,n)=>[e,`${t}${n+1}`])),c=o.map(t=>{let n=e.rules.get(t);return`&${s.get(t)} ${n.of?Oo(n,e.rules.get(n.of),s,r):Do(ko(n),s,r)}`}),l=new Map,u=0;for(let[t,r]of e.looks??[]){u++;let e=1;for(let t=2;t<=r.pattern.length;t++){let n=r.pattern.length/t;Number.isInteger(n)&&r.pattern.every((e,t)=>e.key===r.pattern[t%n].key&&e.base===r.pattern[t%n].base)&&(e=t)}let i=Do(r.pattern.slice(0,r.pattern.length/e),s);l.has(i)||(l.set(i,`figure${l.size+1}`),c.push(`&${l.get(i)} ${i}`));let a=e=>`[${e.join(`,`)}]`,o=Math.round(r.start/r.dur),d=[...Array(o).fill(`0`),...r.chords.map(a)],f=`chords${u}`;c.push(`&${f} step=${n}/${r.dur*(r.scale??1)} ${d.join(` `)}`),s.set(t,`run${u}`),c.push(`&run${u} over=&${f} &${l.get(i)}!${r.chords.length*e}`)}return{defs:c,lines:new Map(e.lines.map(e=>[e.name,Do(e.toks,s,r)])),scales:new Map(e.lines.map(e=>[e.name,e.scale??1]))}}function Mo(e){let t=new Map,n=e=>{e.forEach((n,r)=>{if(Y(n.key)||on(n.key))return;let i=t.get(n.key)??[],a=e[r-1];a&&a.key===n.key&&a.base===n.base&&a.stretch===n.stretch?i[i.length-1].run++:i.push({run:1,stretch:n.stretch??1}),t.set(n.key,i)})};for(let t of e.lines)n(t.toks);for(let t of e.rules.values())n(t.of?[{key:t.of,base:null}]:ko(t));return t}function No(e,t,n=1){return e.kids.map(e=>{let r=e.off===null?null:(t??0)+e.off;if(Y(e.key))return{key:n===1?e.key:an(e.key,n),base:r};let i=(e.stretch??1)*n;return{key:e.key,base:r,...i===1?{}:{stretch:i}}})}var Po=e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}),Fo=(e,t)=>e.reduce((e,n)=>e+To(n,t).length+1,0);function Io(e,t){let n=e.rules.get(t),r=e=>e.flatMap(e=>e.key===t?No(n,e.base,e.stretch??1):[e]),i=new Map;for(let[a,o]of e.rules)if(a!==t){if(o.of){let e=[],r=[];o.kids.forEach((i,a)=>{for(let s of i.key===t?No(n,i.off,i.stretch??1):[{key:i.key,base:i.off,...i.stretch?{stretch:i.stretch}:{}}])e.push(Po(s)),r.push(o.patched[a])}),i.set(a,o.of===t?{key:a,kids:e}:{...o,kids:e,patched:r})}else i.set(a,{key:a,kids:r(ko(o)).map(Po)})}return{...e,lines:e.lines.map(e=>({...e,toks:r(e.toks)})),rules:i}}var Lo=(e,t)=>{let n=e,r=!1;for(;;){let e=Mo(n),i=new Map([...n.rules.keys()].map(e=>[e,`m00`])),a=null;for(let[t,r]of n.rules){let n=Fo(ko(r),i),o=5+(r.kids.some(e=>e.off!==null)?4:0),s=r.of?22+Fo(ko(r).filter((e,t)=>r.patched[t]),i):5+n,c=e=>e===1?n:Fo(No(r,0,e),i),l=(e.get(t)??[]).reduce((e,t)=>e+t.run*c(t.stretch)-o-(t.stretch>1?2:0)-(t.run>1?2:0),0)-s;l<=0&&(!a||l<a.gain)&&(a={key:t,gain:l})}if(!a)break;n=Io(n,a.key),r=!0;let o=n;t?.(()=>o)}return r?n:null},Ro=[po,uo,_o,wo,$t,Lo],zo=new Map([[po,`clocks`],[uo,`figures`],[wo,`phrases and their variants`],[$t,`pairs`],[_o,`passages at another speed`],[Lo,`taking back what doesn’t pay`]]),Bo=(e,t)=>{let{defs:n,lines:r}=jo(e,`m`,`pulse`,t);return[...n,...r.values()].reduce((e,t)=>e+t.length+1,0)},Vo=1.15;function Ho(e,t,n,r){let i={lines:e.map(e=>({name:e.name,toks:rn(e)})),rules:new Map},a=i;r?.(()=>a,{tool:`start`,round:0});let o=Bo(i,n);for(let e=0;e<8;e++){let a=i;for(let n of t){let t={tool:zo.get(n)??`a tool`,round:e+1},i=r&&(e=>r(e,t)),o=n(a,i);o&&o!==a&&(a=o,i?.(()=>o))}let s=Bo(a,n);if(s>=o)break;[i,o]=[a,s]}return{f:i,size:o}}function Uo(e,t,{degrees:n=!1}={}){let r=n?`^`:`^$`,i=n?Ro.filter(e=>e!==uo):Ro,a=Ho(e,i,r,t),o=Ho(e,i.filter(e=>e!==wo),r),s=a.size<=o.size*Vo?a.f:o.f;return t?.(()=>s,{tool:`done`,round:0}),s}var Wo=5e5,Go=class extends Error{},Ko=e=>e.length>=4&&e[0]===77&&e[1]===84&&e[2]===104&&e[3]===100;function qo(e){let t=0,n=n=>{if(t+n>e.length)throw new Go(`the file ends too soon`)},r=()=>(n(1),e[t++]),i=()=>r()<<8|r(),a=()=>(i()<<16>>>0)+i(),o=()=>String.fromCharCode(r(),r(),r(),r()),s=()=>{let e=0;for(let t=0;t<4;t++){let t=r();if(e=e*128+(t&127),!(t&128))return e}throw new Go(`a length runs over four bytes`)},c=r=>{n(r);let i=e.subarray(t,t+r),a;try{a=new TextDecoder(`utf-8`,{fatal:!0}).decode(i)}catch{a=new TextDecoder(`latin1`).decode(i)}return t+=r,a};if(e.length<14||o()!==`MThd`)throw new Go(`not a MIDI file (no MThd)`);let l=a(),u=i(),d=i(),f=i();t+=l-6;let p=f&32768,m=p?(256-(f>>8))*(f&255):f;if(!(m>0))throw new Go(`no ticks a quarter note`);let h=[],g=p?[{tick:0,micros:1e6}]:[],_=[],v,y;for(let n=0;n<d&&t<e.length;n++){let i=o(),l=a(),u=t+l;if(i!==`MTrk`){t=u;continue}if(u>e.length)throw new Go(`a track runs past the end of the file`);let d=0,f=0,m,b=[],x=[],S=[],C=new Map,w=(e,t,n)=>{let r=e*128+t,i=C.get(r)?.shift();i&&b.push({channel:e+1,key:t,velocity:i.velocity,tick:i.tick,end:n})};for(;t<u;){d+=s();let e=r();if(e===255){let e=r(),i=s();if(e===47){t=u;break}if(e===81&&i===3&&!p)g.push({tick:d,micros:r()<<16|r()<<8|r()});else if(e===88&&i>=2){let e=r(),n=2**r();_.push({tick:d,num:e,den:n}),t+=i-2}else if(e===2)y??=c(i);else if(e===3){let e=c(i);m??=e,n===0&&(v??=e)}else t+=i;continue}if(e===240||e===247){t+=s();continue}let i;if(e<128){if(!f)throw new Go(`a running status with nothing before it`);i=e,e=f}else f=e,i=r();let a=e&15;switch(e&240){case 128:r(),w(a,i,d);break;case 144:{let e=r();if(e===0)w(a,i,d);else{let t=a*128+i;C.get(t)?.length&&w(a,i,d);let n=C.get(t)??[];n.push({tick:d,velocity:e}),C.set(t,n)}break}case 160:case 176:r();break;case 192:S.push({tick:d,channel:a+1,program:i});break;case 208:break;case 224:x.push({tick:d,channel:a+1,value:i|r()<<7});break;default:throw new Go(`an unknown status byte ${e.toString(16)}`)}}t=u;for(let[e,t]of C)for(let n of t)b.push({channel:(e>>7)+1,key:e&127,velocity:n.velocity,tick:n.tick,end:d});b.sort((e,t)=>e.tick-t.tick||e.channel-t.channel||e.key-t.key),h.push({...m===void 0?{}:{name:m},notes:b,bends:x,programs:S})}g.sort((e,t)=>e.tick-t.tick),_.sort((e,t)=>e.tick-t.tick);let b=h[0];return u===1&&b&&!b.notes.length&&!b.bends.length&&!b.programs.length&&h.shift(),{format:u,ppq:m,...v===void 0?{}:{name:v},...y===void 0?{}:{copyright:y},tracks:h,tempos:g,meters:_}}function Jo(e){let t=[],n=e=>t.push(e>>8&255,e&255),r=e=>(n(e>>>16&65535),n(e&65535)),i=(e,t)=>{let n=[e&127];for(let t=Math.floor(e/128);t>0;t=Math.floor(t/128))n.unshift(t&127|128);t.push(...n)},a=e=>Array.from(e,e=>e.charCodeAt(0)&255),o=e=>[...new TextEncoder().encode(e)],s=e=>{e.sort((e,t)=>e.tick-t.tick||e.order-t.order);let n=[],o=0;for(let t of e)i(Math.max(0,t.tick-o),n),n.push(...t.bytes),o=Math.max(o,t.tick);n.push(0,255,47,0),t.push(...a(`MTrk`)),r(n.length);for(let e of n)t.push(e)},c=(e,t)=>{let n=[255,e];return i(t.length,n),[...n,...t]};t.push(...a(`MThd`)),r(6),n(1),n(e.tracks.length+1),n(Math.max(1,Math.min(32767,Math.round(e.ppq)))),s([...e.name===void 0?[]:[{tick:0,order:0,bytes:c(3,o(e.name))}],...e.copyright===void 0?[]:[{tick:0,order:0,bytes:c(2,o(e.copyright))}],...e.tempos.map(e=>{let t=Math.max(1,Math.min(16777215,Math.round(e.micros)));return{tick:e.tick,order:1,bytes:c(81,[t>>16&255,t>>8&255,t&255])}}),...e.meters.map(e=>({tick:e.tick,order:2,bytes:c(88,[e.num,Math.round(Math.log2(e.den)),24,8])}))]);for(let t of e.tracks){let e=e=>Math.max(1,Math.min(16,e))-1&15;s([...t.name===void 0?[]:[{tick:0,order:0,bytes:c(3,o(t.name))}],...t.programs.map(t=>({tick:t.tick,order:1,bytes:[192|e(t.channel),t.program&127]})),...t.notes.map(t=>({tick:t.end,order:2,bytes:[128|e(t.channel),t.key&127,64]})),...t.bends.map(t=>({tick:t.tick,order:3,bytes:[224|e(t.channel),t.value&127,t.value>>7&127]})),...t.notes.map(t=>({tick:t.tick,order:4,bytes:[144|e(t.channel),t.key&127,Math.max(1,Math.min(127,t.velocity))]}))])}return Uint8Array.from(t)}function Yo(e,t){let n=0,r=0,i=Wo;for(let a of e.tempos){if(a.tick>=t)break;n+=(a.tick-r)*i/e.ppq/1e6,r=a.tick,i=a.micros}return n+(t-r)*i/e.ppq/1e6}function Xo(e){let t=new Map,n=r=>{if(Y(r)||on(r))return 0;let i=t.get(r);if(i!==void 0)return i;t.set(r,0);let a=e.rules.get(r),o=[...a.kids.map(e=>e.key),...a.of?[a.of]:[]],s=1+Math.max(0,...o.map(n));return t.set(r,s),s};for(let t of e.rules.keys())n(t);return t}function Zo(e,t){let n=e=>e.filter((n,r)=>n.key===t&&!(r>0&&e[r-1].key===t&&e[r-1].base===n.base)).length;return e.lines.reduce((e,t)=>e+n(t.toks),0)+[...e.rules.values()].reduce((e,r)=>e+n(r.of===t?[{key:t,base:null}]:ko(r)),0)}function Qo(e,t){let n=Xo(t),r=Ao(t),i=new Map(r.map((e,t)=>[e,t])),a=[...r].sort((e,t)=>n.get(e)-n.get(t)||i.get(e)-i.get(t)),o=[t];for(let e of[...a].reverse())o.push(Io(o[o.length-1],e));let s=o[o.length-1],c=[{folded:{lines:e.map(e=>({name:e.name,toks:rn(e)})),rules:new Map},came:null,uses:0}];return(s.looks?.size||s.lines.some(e=>(e.scale??1)!==1))&&c.push({folded:s,came:null,uses:0}),a.forEach((e,t)=>{let n=o[o.length-2-t];c.push({folded:n,came:e,uses:Zo(n,e)})}),c}var $o=[`major`,`minor`,`harmonic`],es=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],ts=(e,t)=>{let n=[0];for(let t of R[e].steps.slice(0,-1))n.push(n[n.length-1]+t);return{name:e,tonic:t,positions:n}},ns=e=>`scale(${e.name}, ${es[e.tonic]})`,rs=e=>`${es[e.tonic]} ${e.name===`harmonic`||e.name===`melodic`?`${e.name} minor`:e.name}`;function is(e,t){let n=e.positions.length,r=Math.floor(t/n);return e.tonic+e.positions[t-r*n]+12*r}function as(e,t){let n=e.positions.length,r=Math.floor((t-e.tonic)/12),i=t-e.tonic-12*r,a=0;for(;a+1<n&&e.positions[a+1]<=i;)a++;let o=r*n+a,s=t-is(e,o);if(s===0)return{degree:o,alter:0};let c=t-is(e,o+1);return-c<s?{degree:o+1,alter:c}:{degree:o,alter:s}}var os=({degree:e,alter:t})=>`${e}${t>0?`#`.repeat(t):`b`.repeat(-t)}`;function ss(e){let t=e.flatMap(e=>e.chords.flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))));if(!t.length)return null;let n=e.flatMap(e=>e.chords.filter(e=>e.values.some(e=>Number.isInteger(Number(e))))),r=Math.max(...n.map(e=>e.at+e.dur)),i=(Math.min(...n.filter(e=>e.at+e.dur===r).flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))))%12+12)%12,a=null;for(let e of $o)for(let n=0;n<12;n++){let r=ts(e,n),o=t.reduce((e,t)=>e+Math.abs(as(r,t).alter),0);(!a||o<a.cost||o===a.cost&&n===i&&a.key.tonic!==i)&&(a={key:r,cost:o})}return a.key}function cs(e,t){return e.map(e=>({...e,chords:e.chords.map(e=>({...e,values:e.values.map(e=>Number.isInteger(Number(e))?os(as(t,Number(e))):e)}))}))}var ls=12,us=2,ds=e=>e.values.map(Number).filter(e=>Number.isInteger(e));function fs(e,t,n){return e.map(e=>({...e,length:n-t,chords:e.chords.filter(e=>e.at>=t&&e.at<n).map(e=>({...e,at:e.at-t}))}))}function ps(e,t){let n=Math.max(0,...e.map(e=>e.length)),r=Math.ceil(n/t),i=[];for(let e=0;e<12;e++)i.push(ts(`major`,e),ts(`harmonic`,e),ts(`melodic`,e));let a=Array.from({length:r},()=>Array(i.length).fill(0));for(let n of e)for(let e of n.chords)for(let n of ds(e)){let o=Math.min(r-1,Math.floor(e.at/t));i.forEach((e,t)=>a[o][t]+=Math.abs(as(e,n).alter))}if(!r)return[];let o=a.map(()=>Array(i.length).fill(0)),s=a.map(()=>Array(i.length).fill(0));o[0]=[...a[0]];for(let e=1;e<r;e++){let t=o[e-1],n=0;for(let e=1;e<t.length;e++)t[e]<t[n]&&(n=e);for(let r=0;r<i.length;r++){let i=t[r],c=t[n]+ls;[o[e][r],s[e][r]]=i<=c?[i+a[e][r],r]:[c+a[e][r],n]}}let c=Array(r),l=0;for(let e=1;e<i.length;e++)o[r-1][e]<o[r-1][l]&&(l=e);for(let e=r-1;e>=0;e--)c[e]=l,l=s[e][l];let u=[];for(let e=0;e<r;e++){let t=u[u.length-1];t&&t.k===c[e]?t.to=e+1:u.push({from:e,to:e+1,k:c[e]})}let d=[];for(let e of u){let t=d[d.length-1];t&&(e.to-e.from<us||t.to-t.from<us)?(e.to-e.from>t.most&&([t.k,t.most]=[e.k,e.to-e.from]),t.to=e.to):d.push({...e,most:e.to-e.from})}let f=d.map(r=>{let[a,o]=[r.from*t,Math.min(n,r.to*t)],s=i[r.k];if(s.name!==`major`)return{from:a,to:o,key:s};let c=fs(e,a,o).flatMap(e=>e.chords.filter(e=>ds(e).length)),l=e=>{let t=c.filter(t=>t.at===e);return t.length?(Math.min(...t.flatMap(ds))%12+12)%12:null},u=c.length?[l(Math.min(...c.map(e=>e.at))),l(Math.max(...c.map(e=>e.at)))]:[],d=(s.tonic+9)%12;return{from:a,to:o,key:u.includes(d)&&!u.includes(s.tonic)?ts(`minor`,d):s}}),p=e=>e.name!==`major`,m=[];for(let e of f){let t=m[m.length-1],n=t&&t.key.tonic===e.key.tonic&&(t.key.name===e.key.name||p(t.key)&&p(e.key));t&&n?m[m.length-1]={from:t.from,to:e.to,key:e.to-e.from>t.to-t.from?e.key:t.key}:m.push(e)}return m}function ms(e,t,n){let r=[];for(let i of e){let e=e=>!i.chords.some(t=>t.at<e&&t.at+t.dur>e),a=t=>{for(let r=0;r<=n;r++){if(t+r<=i.length&&e(t+r))return t+r;if(t-r>=0&&e(t-r))return t-r}return null},o=[0];for(let e of t.slice(1)){let t=a(e.from);t!==null&&t>o[o.length-1]?o.push(t):o.push(o[o.length-1])}o.push(i.length),t.forEach((e,t)=>{let[n,a]=[o[t],o[t+1]];a<=n||r.push({line:i.name,section:t,part:{name:`${i.name}§${t}`,length:a-n,chords:i.chords.filter(e=>e.at>=n&&e.at<a).map(e=>({...e,at:e.at-n}))}})})}return r}var hs=7,gs=12,_s=.06;function vs(e){let t=e.flatMap(e=>[[e.start,1],[e.end,-1]]);t.sort((e,t)=>e[0]-t[0]||e[1]-t[1]);let n=new Map,r=0;for(let e=0;e<t.length;e++){r+=t[e][1];let i=t[e+1]?.[0]??t[e][0];n.set(r,(n.get(r)??0)+i-t[e][0])}let i=[...n.values()].reduce((e,t)=>e+t,0),a=Math.max(0,...n.keys()),o=0;for(;a>1&&o+(n.get(a)??0)<=_s*i;)o+=n.get(a--)??0;return a}function ys(e){let t=vs(e),n=Array(e.length).fill(0);if(t<=1)return{voice:n,count:t};let r=e.map((e,t)=>t).sort((t,n)=>e[t].start-e[n].start||e[n].key-e[t].key),i=bs(e,r,t),a=Array(t).fill(null),o=Array(t).fill(-1/0),s=Array(t).fill(0);for(let c=0;c<r.length;){let l=c,u=e[r[c]].start;for(;l<r.length&&e[r[l]].start===u;)l++;let d=r.slice(c,l),f=[...Array(t).keys()].filter(e=>o[e]<=u);for(let e of[...Array(t).keys()].filter(e=>!f.includes(e)).sort((e,t)=>o[e]-o[t])){if(f.length>=d.length)break;f.push(e)}f.sort((e,t)=>e-t);let p=d.splice(f.length),m=xs(d.map(t=>e[t].key),f,(e,n)=>{let r=a[n]===null?hs+Math.abs(e-i[n]):Math.abs(e-a[n]);for(let i=0;i<t;i++)o[i]>u&&(i<n&&s[i]<e||i>n&&s[i]>e)&&(r+=gs);return r});for(let t of p){let r=m[m.length-1];n[t]=r,o[r]=Math.max(o[r],e[t].end)}d.forEach((t,r)=>{let i=m[r];n[t]=i,a[i]=e[t].key,s[i]=e[t].key,o[i]=Math.max(o[i],e[t].end)}),c=l}return{voice:n,count:t}}function bs(e,t,n){for(let r of t){let t=e[r].start,i=e.filter(e=>e.start<=t&&e.end>t).map(e=>e.key);if(i.length>=n)return i.sort((e,t)=>t-e).slice(0,n)}let r=e.map(e=>e.key),[i,a]=[Math.max(...r),Math.min(...r)];return Array.from({length:n},(e,t)=>i-(i-a)*t/(n-1))}function xs(e,t,n){let[r,i]=[e.length,t.length],a=Array.from({length:r+1},()=>Array(i+1).fill(1/0));for(let e=0;e<=i;e++)a[r][e]=0;for(let o=r-1;o>=0;o--)for(let s=i-(r-o);s>=0;s--)a[o][s]=Math.min(a[o][s+1],n(e[o],t[s])+a[o+1][s+1]);let o=[];for(let i=0,s=0;i<r;s++)a[i][s]===n(e[i],t[s])+a[i+1][s+1]&&(o.push(t[s]),i++);return o}function Ss(e){let t=W(e),n=new Set([...t.cells.values()].filter(e=>e.voice||e.mix||e.sink||e.map||e.note||e.name===`piece`).map(e=>e.name));return e.split(`
`).map(e=>e.replace(/(^|\s)#.*$/,``).replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g,``).replace(/\sabout=(\([^)]*\)|&\w+)/g,``).replace(/[ \t]+/g,` `).trim()).filter(e=>e&&!n.has(/^&(\w+)/.exec(e)?.[1]??``)).join(`
`).length}var Cs={bands:`band`,bass:`bass`,counts:`count`,endings:`ending`,expression:`expression`,fills:`fill`,forms:`form`,harmony:`harmony`,instruments:`instrument`,laws:`law`,melodic:`melodic`,meters:`meter`,modes:`mode`,modules:`module`,motifs:`motif`,performers:`performer`,rhythms:`rhythm`,sections:`section`,songs:`song`,stab:`stab`,styles:`style`},ws=Object.fromEntries([`meter`,`rhythm`,`performer`,`module`,`form`].map(e=>[e,j.filter(e=>e!==`mood`)])),Ts=(e,t)=>{let n=t===void 0?void 0:ws[t];return n?Object.fromEntries(Object.entries(e).filter(([e])=>n.includes(e))):e},Es=/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/,Ds=/^&[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*&[A-Za-z_][A-Za-z0-9_]*)*$/;function Os(e){let t=je(e),n=t.findIndex(e=>e.text===`from`);if(n<1)return null;let r=e.slice(0,t[n].at).trim(),i=t.slice(n+1).map(e=>e.text),a=e=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(e)||e===`*`||Es.test(e);if(r===`*`)return i.every(a)?i:null;if(!Ds.test(r))return null;let o=0;return i[o]?.startsWith(`(`)&&o++,i[o]?.startsWith(`&`)&&!i[o].startsWith(`&(`)&&o++,o===0&&i.length&&!a(i[0])?null:i.slice(o).every(a)?i.slice(o):null}function ks(e,t,n){let r=Ms(e.slice(1,-1),`+`).map(e=>e.trim());if(r.length<2||r.some(e=>!e))return`style=${e}: a sum of points, [&acid + &(map=style bite=.1)]`;let i={};for(let a of r){let r=As(a,t,n);if(typeof r==`string`)return r;if(r.reach)return`style=${e}: a term of a sum has no reach (± r)`;for(let[e,t]of Object.entries(r.point))i[e]=(i[e]??0)+t}for(let e of Object.keys(i))i[e]=Math.round(Math.min(1,Math.max(0,i[e]))*1e9)/1e9;return{point:i}}function As(e,t,n){if(/^\[[\s\S]*\]$/.test(e))return ks(e,t,n);if(/^&[A-Za-z_][A-Za-z0-9_]*$/.test(e)){let r=t.get(e.slice(1));return r?{point:Ts(r,n)}:`style=${e}: no style of that name in styles`}let r=/^&\(\s*map=style\s+([\s\S]*)\)$/.exec(e);if(!r)return`style=${e}: a style, &funk, an inline one, &(map=style sync=.3 bite=.55), or a sum, [&acid + &(map=style bite=.1)]`;let i=r[1].trim(),a=i.split(/\s+/);if(a.length===j.length&&a.every(e=>Es.test(e)))return{point:Object.fromEntries(j.map((e,t)=>[e,parseFloat(a[t])]))};let o={},s={},c=/([A-Za-z_]+)=(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))(?:\s*(?:±|\+-)\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+))?/y,l=0;for(;l<i.length;){for(;i[l]===` `;)l++;if(l>=i.length)break;c.lastIndex=l;let t=c.exec(i);if(!t)return`style=${e}: an axis by name, sync=.3, or one ± a reach, bite=.55 ± .1`;let[,n,r,a]=t;if(!j.includes(n))return`style=${e}: ${n} is no axis (the axes: ${j.join(` `)})`;if(n in o)return`style=${e}: ${n}= twice`;o[n]=parseFloat(r),a!==void 0&&(s[n]=parseFloat(a)),l=c.lastIndex}return Object.keys(o).length?Object.keys(s).length?{point:o,reach:s}:{point:o}:`style=${e}: a point names an axis at least`}function js(e,t,n){let r=/^\(([\s\S]*)\)$/.exec(e),i=r?Ms(r[1],`|`):[e],a=[];for(let r of i){let i=/^([\s\S]*?)(?:\s*\*\s*(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)))?$/.exec(r.trim()),o=As(i[1].trim(),t,n);if(typeof o==`string`)return o;let s=i[2]===void 0?1:parseFloat(i[2]);if(!(s>0))return`style=${e}: a weight is a number above 0`;a.push({...o,weight:s})}return a}function Ms(e,t){let n=[],r=0,i=0;for(let a=0;a<e.length;a++){let o=e[a];o===`(`||o===`[`?r++:o===`)`||o===`]`?r--:o===t&&r===0&&(n.push(e.slice(i,a)),i=a+1)}return n.push(e.slice(i)),n}function Ns(e,t){let n=Os(e);if(n===null)return null;let r=[],i=null,a=t.facet,o={};for(let e=0;e<n.length;e++){let s=n[e],c=s.indexOf(`=`);if(c<0){r.push(`${s}: an attribute, name=value`);continue}let l=s.slice(0,c),u=s.slice(c+1);l===`style`&&n[e+1]===`*`&&Es.test(n[e+2]??``)&&(u=`${u} * ${n[e+2]}`,e+=2),l===`style`?i=u:l===`facet`?a=u:t.template?/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(u)&&!/[&=]/.test(u)?o[l]=u:r.push(`${l}=${u}: an argument is a value (a word, a number, 8n:2/3, meter("7/8"))`):r.push(`${l}=: a collection's declaration has no arguments (style= and facet= only)`)}let s={...a===void 0?{}:{facet:a},...Object.keys(o).length?{args:o}:{}};if(i===null)return{points:[{point:{},weight:1,...s}],problems:r};let c=js(i,t.styles,a);return typeof c==`string`?{points:[],problems:[...r,c]}:{points:c.map(({point:e,weight:t,reach:n})=>({point:e,weight:t,...s,...n?{reach:n}:{}})),problems:r}}function Ps(e,t){let n=e.split(`
`).map(e=>U(e)[0].trim()),r=n.some(e=>Os(e)!==null&&!e.startsWith(`*`)),i=[],a=[],o=!1,s=!1;for(let e of n){let n=Ns(e,{...t,template:r});n&&(o=!0,(e.startsWith(`*`)||Os(e).length)&&(s=!0),i.push(...n.points),a.push(...n.problems))}return o?{association:i,problems:a,explicit:s}:null}function Fs(e,t){let n=Ps(e.split(`
`).filter(e=>U(e)[0].trim().startsWith(`*`)).join(`
`),t);return n?.explicit?{association:n.association,problems:n.problems}:null}var Is=(e,t)=>`${e}(${Object.entries(t).map(([e,t])=>`${e}=${t}`).join(`, `)})`;function Ls(e,t){let n=g(e);if(!n)throw Error(`boundText: a template's arguments, but the text has no signature`);let r=Object.keys(t).map(e=>`&${e}`);for(let e of r)if(!n.optional.includes(e))throw Error(`boundText: ${e} is none of the signature's optional parameters (${n.optional.join(`, `)})`);let i=n.optional.filter(e=>!r.includes(e)),a=`${n.names.join(`, `)} from ${i.length?`(${i.join(`, `)}) `:``}${n.main??``}`.trimEnd(),o=new Set(r.filter(t=>RegExp(`base=${t}(?![A-Za-z0-9_])`).test(e))),s=!1;return e.split(`
`).flatMap(e=>{if(/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(e)&&g(e))return s?[]:(s=!0,[a]);let n=r.find(t=>RegExp(`^\\s*${t}(?![A-Za-z0-9_])`).test(e));return n?o.has(n)?[`${n} ${t[n.slice(1)]}`]:[]:[Object.entries(t).reduce((e,[t,n])=>o.has(`&${t}`)?e:e.replace(RegExp(`&${t}(?![A-Za-z0-9_])`,`g`),n),e)]}).join(`
`)}function Rs(e){if(!e.association.some(e=>e.args))return[e];let t=e.association.filter(e=>!e.args),n=new Map;for(let t of e.association){if(!t.args)continue;let r=Is(e.id,t.args),{args:i,...a}=t;n.set(r,{args:t.args,points:[...n.get(r)?.points??[],a]})}return[...t.length?[{...e,association:t}]:[],...[...n].map(([t,{args:n,points:r}])=>({id:t,text:Ls(e.text,n),association:r}))]}function zs(e,t){return e.association.find(n=>n.args&&Is(e.id,n.args)===t)?.args}var Bs=(e,t)=>t===void 0?!e.args:!!e.args&&JSON.stringify(Object.entries(e.args))===JSON.stringify(Object.entries(t)),Vs=new Map([[`creeping bass`,`creeping_bass`],[`walking bass`,`walking_bass`],[`eighths bass`,`eighths_bass`],[`funk bass`,`funk_bass`],[`pumping bass`,`pumping_bass`],[`root bass`,`root_bass`],[`tiptoe bass`,`tiptoe_bass`],[`lead performer`,`lead_performer`],[`stab performer`,`stab_performer`],[`pad performer`,`pad_performer`],[`drums performer`,`drums_performer`],[`bass performer`,`bass_performer`],[`Charleston stabs`,`charleston_stabs`],[`Synth-pop drums`,`synth_pop_drums`],[`Funk drums`,`funk_drums`],[`Spooky drums`,`spooky_drums`],[`Lo-fi hip hop drums`,`lo_fi_hip_hop_drums`],[`Ghost drums`,`ghost_drums`],[`rumba clave 3-2`,`rumba_clave_3_2`],[`bossa nova clave`,`bossa_nova_clave`],[`Techno drums`,`techno_drums`],[`Kinderlied drums`,`kinderlied_drums`],[`Bossa nova drums`,`bossa_nova_drums`],[`Deep house drums`,`deep_house_drums`],[`son clave 3-2`,`son_clave_3_2`],[`Swing jazz drums`,`swing_jazz_drums`],[`son clave 2-3`,`son_clave_2_3`],[`bossa nova clave (one bar)`,`bossa_nova_clave_one_bar`],[`Ambient drums`,`ambient_drums`],[`Electro swing drums`,`electro_swing_drums`],[`7/8`,`odd_meter(meter="7/8")`],[`4/4 leaning lightly on 16n`,`funk_meter`],[`3/4`,`bar(meter="3/4")`],[`6/8`,`bar(meter="6/8")`],[`4/4 alla breve`,`bar(meter="4/4 in 2")`],[`4/4 swung on 8n`,`swing_meter`],[`10/8`,`odd_meter(meter="10/8")`],[`2/4`,`bar(meter="2/4")`],[`4/4`,`bar`],[`12/8`,`bar(meter="12/8")`],[`5/4`,`odd_meter`],[`4/4 leaning on 16n`,`lofi_meter`],[`vamp to the seventh`,`vamp_to_the_seventh`],[`vamp to the fifth`,`vamp_to_the_fifth`],[`vamp to the sixth`,`vamp_to_the_sixth`],[`tonic vamp`,`tonic_vamp`],[`vamp to the fourth`,`vamp_to_the_fourth`],[`haunted progression`,`haunted_progression`],[`dark cadence`,`dark_cadence`],[`muted trumpet`,`muted_trumpet`],[`round bass`,`round_bass`],[`haunted pad`,`haunted_pad`],[`brass stab`,`brass_stab`],[`upright bass`,`upright_bass`],[`bell and scale`,`bell_and_scale`],[`harmonic minor`,`harmonic_minor`],[`rounded binary`,`rounded_binary`],[`call and answer`,`call_and_answer`],[`meter_7_8`,`odd_meter(meter="7/8")`],[`meter_4_4_leaning_lightly_on_16n`,`funk_meter`],[`meter_3_4`,`bar(meter="3/4")`],[`meter_6_8`,`bar(meter="6/8")`],[`meter_4_4_alla_breve`,`bar(meter="4/4 in 2")`],[`meter_4_4_swung_on_8n`,`swing_meter`],[`meter_10_8`,`odd_meter(meter="10/8")`],[`meter_2_4`,`bar(meter="2/4")`],[`meter_4_4`,`bar`],[`meter_12_8`,`bar(meter="12/8")`],[`meter_5_4`,`odd_meter`],[`meter_4_4_leaning_on_16n`,`lofi_meter`],[`aeolian`,`diatonic(mode=aeolian)`],[`dorian`,`diatonic(mode=dorian)`],[`ionian`,`diatonic(mode=ionian)`],[`mixolydian`,`diatonic(mode=mixolydian)`],[`phrygian`,`diatonic(mode=phrygian)`],[`lydian`,`diatonic(mode=lydian)`],[`locrian`,`diatonic(mode=locrian)`]]),Hs=Object.freeze({filed:Object.freeze([]),points:Object.freeze([]),together:Object.freeze([])}),Us=.1,Ws=.1,Gs=(e,t,n=Us)=>t>0&&n>0?e-n*Ws*Math.log1p(Math.min(t,10))/Math.log1p(10):e,Ks=e=>typeof e==`number`&&Number.isFinite(e);function qs(e,t){return typeof e!=`object`||!e?[`${t}: not a style point`]:Object.entries(e).flatMap(([e,n])=>Ks(n)?[]:[`${t}: ${e} is ${String(n)}, not a number`])}function Js(e){let t=[],{id:n,text:r,association:i}=e;typeof n==`string`&&n.trim()||t.push(`no id`);let a=typeof n==`string`&&n.trim()?n:`(no id)`;return typeof r==`string`&&r.trim()||t.push(`${a}: no text`),!Array.isArray(i)||!i.length?t.push(`${a}: no style point in its association`):i.forEach((e,n)=>t.push(...Ys(e,`${a}: point ${n+1}`))),t}function Ys(e,t){let n=[];(!e||!Ks(e.weight)||e.weight<=0)&&n.push(`${t}: weight ${String(e?.weight)}, not a number > 0`);let r=e?.facet;return r===void 0||typeof r==`string`&&r.trim()||n.push(`${t}: facet ${String(r)}, not a name`),n.push(...qs(e?.point,t)),n}function Xs(e){let{filed:t,points:n,together:r}=e,i=[];if(!Array.isArray(t))i.push(`the layer: filed is not a list`);else{let e=new Set;t.forEach((t,n)=>{let r=`filed ${n+1}`;if(!t?.fragment)return void i.push(`${r}: no fragment`);i.push(...Js(t.fragment).map(e=>`${r}: ${e}`)),(typeof t.meta!=`object`||t.meta===null||Array.isArray(t.meta))&&i.push(`${r}: its meta is not a map`),typeof t.prose!=`string`&&i.push(`${r}: its prose is not a string`),e.has(t.fragment.id)&&i.push(`${r}: the id ${t.fragment.id} is filed twice`),e.add(t.fragment.id)})}if(Array.isArray(n)?n.forEach((e,t)=>{let n=`learned point ${t+1}`;typeof e?.id==`string`&&e.id.trim()||i.push(`${n}: no id`),i.push(...Ys(e,n))}):i.push(`the layer: points is not a list`),!Array.isArray(r))i.push(`the layer: together is not a list`);else{let e=new Set;r.forEach((t,n)=>{let r=`pair ${n+1}`,a=t?.ids,[o,s]=Array.isArray(a)?a:[];if(!Array.isArray(a)||a.length!==2||typeof o!=`string`||typeof s!=`string`||!o.trim()||!s.trim())return void i.push(`${r}: its ids are not two names`);ic(o,s)<0||i.push(`${r}: its ids ${o} and ${s} are not two, in order`),Number.isInteger(t?.count)&&t.count>0||i.push(`${r}: its count ${String(t?.count)} is not a whole number > 0`);let c=JSON.stringify([o,s]);e.has(c)&&i.push(`${r}: ${o} and ${s} are counted twice`),e.add(c)})}return i}function Zs(e,t,n={}){let r=0,i=0;for(let a of Object.keys(e)){if(!Object.hasOwn(t,a))continue;let o=n[a]??1;r+=o*(e[a]-t[a])**2,i+=o}return i>0?Math.sqrt(r/i):1/0}var Qs=(e,t)=>t===void 0?e.association:e.association.filter(e=>e.facet===void 0||e.facet===t),$s=e=>Object.keys(e).length===0,ec=(e,t)=>Qs(e,t).filter(e=>!$s(e.point));function tc(e,t,n={},r){return Math.min(...ec(e,r).map(e=>Zs(e.point,t,n)/e.weight))}var nc=new Map([...Vs].reverse().map(([e,t])=>[t,e])),rc=e=>nc.get(e)??e,ic=(e,t)=>{let[n,r]=[rc(e),rc(t)];return n<r?-1:+(n>r)};function ac(e,t){try{return Rs(e)}catch(n){return t.push(`${String(e?.id)}: ${n instanceof Error?n.message:String(n)}`),[]}}function oc(e,{known:t=()=>!1}={}){let n=[],r=e.flatMap(e=>ac(e,n));n.push(...r.flatMap(Js));let i=new Set;for(let{id:e}of r)i.has(e)&&n.push(`${e}: the id is given twice`),i.add(e);if(n.length)throw Error(`A malformed repository: ${n.join(`; `)}`);let a=[...r],o=t=>{let n=new Map([...e,...t].map(e=>[e.id,e.text]));return e=>n.get(e)??null},s=qr(o(a)),c={fragments:a,filed:new Set,together:new Map,unheld:[]},l=new WeakMap,u=e=>`${e.filed?.length}|${e.points?.length}|${e.together?.length}`;function d(e){let t=typeof e==`object`&&e?l.get(e):void 0;if(t&&t.sizes===u(e))return t.value;let n=f(e);return typeof e==`object`&&e&&l.set(e,{sizes:u(e),value:n}),n}function f(e){let n=Xs(e);for(let{fragment:t}of Array.isArray(e.filed)?e.filed:[])i.has(t?.id)&&n.push(`the layer files ${t.id}, a seed fragment's id`);if(n.length)throw Error(`A malformed learned layer: ${n.join(`; `)}`);if(!e.filed.length&&!e.points.length&&!e.together.length)return c;let r=e.filed.flatMap(e=>ac(e.fragment,n));for(let{id:t}of r)i.has(t)&&!e.filed.some(e=>e.fragment.id===t)&&n.push(`the layer files ${t}, a seed fragment's id`);if(n.length)throw Error(`A malformed learned layer: ${n.join(`; `)}`);let o=new Set(r.map(e=>e.id)),s=e=>i.has(e)||o.has(e),l=e=>s(e)||t(e),u=new Map,d=new Set;for(let{id:t,point:n,weight:r,facet:i}of e.points){if(!s(t)){d.add(t);continue}let e=u.get(t)??[];e.push({point:n,weight:r,...i===void 0?{}:{facet:i}}),u.set(t,e)}let f=e=>{let t=u.get(e.id);return t?{...e,association:[...e.association,...t]}:e},p=new Map,m=(e,t,n)=>{let r=p.get(e)??new Map;r.set(t,(r.get(t)??0)+n),p.set(e,r)};for(let{ids:t,count:n}of e.together){let[e,r]=t;for(let e of t)l(e)||d.add(e);l(e)&&l(r)&&(m(e,r,n),m(r,e,n))}return{fragments:[...a.map(f),...r.map(f)],filed:o,together:p,unheld:[...d].sort(ic)}}return{fragments:a,merge:d,knows:e=>i.has(e)||t(e),query(e,t,n={},{facet:r,chosen:i=[],workbench:l,layer:u,pull:f=Us,arguments:p={},reach:m,exclude:h,accept:g,within:_,playing:v}={}){if(!(Number.isInteger(t)&&t>=0))throw Error(`query: k is ${t}, not a whole number ≥ 0`);if(!(Ks(f)&&f>=0))throw Error(`query: pull is ${String(f)}, not a number ≥ 0`);let y=[...Object.entries(e).flatMap(([e,t])=>Ks(t)?[]:[`${e} is ${String(t)}`]),...Object.entries(n).flatMap(([e,t])=>Ks(t)&&t>0?[]:[`${e}'s weight is ${String(t)}`])];if(y.length)throw Error(`query: ${y.join(`, `)}`);let b=(e,t,n)=>{if(t!==void 0&&!(Ks(t)&&t>=n))throw Error(`query: ${e} is ${String(t)}, not a number ≥ ${n}`)};b(`reach`,m,0),b(`within`,_,1),b(`playing.hold`,v?.hold,0),b(`playing.slack`,v?.slack,0);let{fragments:x,filed:S,together:C}=u?d(u):c,w=[...new Set(i)],T=e=>{let t=C.get(e),n=0;if(t)for(let e of w)n+=t.get(e)??0;return n},E=x.filter(e=>ec(e,r).length>0).map(t=>{let i=tc(t,e,n,r);return{fragment:t,distance:i,score:Gs(i,T(t.id),f)}}).sort((e,t)=>e.score-t.score||Number(S.has(t.fragment.id))-Number(S.has(e.fragment.id))||ic(e.fragment.id,t.fragment.id));if(l===void 0&&m===void 0&&!h&&!g&&_===void 0&&!v)return E.slice(0,t);let D=l!==void 0&&u&&x!==a?qr(o([...x,...u.filed.map(e=>e.fragment)])):s,O=e=>{if(r!==void 0)return p[r];for(let t of e.association)if(t.facet!==void 0&&p[t.facet]!==void 0)return p[t.facet]},k=v?v.slack??0:0,A=m===void 0?1/0:m+k,j=new Set(h),M=E.filter(e=>e.distance<=A&&!j.has(e.fragment.id)),N=e=>(l===void 0||D(e.fragment.text,l,O(e.fragment)).fits)&&(!g||g(e.fragment)),P=[],F=1/0;for(let e of M){if(P.length>=t||e.score>F)break;N(e)&&(P.push(e),P.length===1&&_!==void 0&&(F=e.score+(_-1)*e.distance+1e-9))}let ee=P.filter(e=>e.distance<=(m??1/0));if(!v)return ee;let I=P.find(e=>e.fragment.id===v.id)??M.find(e=>e.fragment.id===v.id&&N(e)),te=P[0]??I;return!I||!te||I.distance-te.distance>v.hold?ee:[{...I,held:!0},...ee.filter(e=>e!==I)].slice(0,t)}}}var sc=[`id`,`association`],cc=[`point`,`weight`,`facet`,`args`],lc=(e,t)=>e.entries.find(e=>e.key===t);function uc(e,t){return e.kind===`list`?e.items.map((e,n)=>{let r=`point ${n+1}`;if(e.kind!==`map`)return t.push({line:e.line,message:`${r} is a map (point, weight, facet)`}),{point:{},weight:0};for(let n of e.entries)cc.includes(n.key)||t.push({line:n.line,message:`${r}: ${n.key} is none of point, weight, facet, args`});let i={},a=lc(e,`point`);if(!a)lc(e,`facet`)||t.push({line:e.line,message:`${r} has no point and no facet: a fragment of no style names the facet it is found as`});else if(a.value.kind!==`map`||!a.value.entries.length)t.push({line:a.line,message:`${r}: its point is a map of axes to numbers`});else for(let e of a.value.entries)e.value.kind===`scalar`&&typeof e.value.value==`number`?i[e.key]=e.value.value:t.push({line:e.line,message:`${r}: ${e.key} is ${JSON.stringify(u(e.value))}, not a number`});let o=lc(e,`weight`),s=o?.value.kind===`scalar`?o.value.value:!o&&!a?1:void 0;typeof s!=`number`&&t.push({line:o?.line??e.line,message:`${r}: ${o?`its weight is ${JSON.stringify(u(o.value))}, not a number`:`no weight`}`});let c=lc(e,`facet`),l=c?.value.kind===`scalar`?c.value.value:void 0;c&&typeof l!=`string`&&t.push({line:c.line,message:`${r}: its facet is ${JSON.stringify(u(c.value))}, not a name`});let d=lc(e,`args`),f={};if(d&&(d.value.kind!==`map`||!d.value.entries.length))t.push({line:d.line,message:`${r}: its args are a map of parameters to values`});else if(d&&d.value.kind===`map`)for(let e of d.value.entries){let n=e.value.kind===`scalar`?e.value.value:void 0;typeof n==`string`&&/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(n)&&!/[&=]/.test(n)||typeof n==`number`?f[e.key]=String(n):t.push({line:e.line,message:`${r}: its arg ${e.key} is ${JSON.stringify(u(e.value))}, not a value (a word, a number, 8n:2/3, meter("7/8"))`})}return{point:i,weight:typeof s==`number`?s:0,...typeof l==`string`?{facet:l}:{},...Object.keys(f).length?{args:f}:{}}}):(t.push({line:e.line,message:"the association is a list of points (`- point: …`)"}),[])}function dc(e,t={}){let n=e.split(/\r?\n/);if(n[0]!==`---`)return{problems:[{line:1,message:"no frontmatter: a fragment file starts with a line `---`"}]};let i=r(e);if(`problems`in i)return{problems:i.problems.map(e=>/^the frontmatter is a map/.test(e.message)?{...e,message:"the frontmatter is a map (`id: …`, `association: …`)"}:e)};let a=n.indexOf(`---`,1),o=P(n.slice(1,a).join(`
`),2).node,s=[],c=lc(o,`id`),l=c?.value.kind===`scalar`?c.value.value:void 0;c?typeof l!=`string`&&s.push({line:c.line,message:`the id is ${JSON.stringify(u(c.value))}, not a string: quote it`}):s.push({line:1,message:`no id in the frontmatter`});let d=lc(o,`association`),f=Ps(i.text,{...t.facet===void 0?{}:{facet:t.facet},styles:t.styles??new Map}),p=(i.map?.[0]?.line??a+2)-1;d&&f?.explicit?s.push({line:d.line,message:`the association is written twice: in the frontmatter and in the text’s declarations (decision 089): keep the declarations`}):!d&&!f&&s.push({line:1,message:"no association: no declaration in the text (`* from style=…`, a signature with style=) and none in the frontmatter"}),f&&!d&&s.push(...f.problems.map(e=>({line:p,message:e})));let m=d?uc(d.value,s):f?.association??[];if(s.length)return{problems:s.sort((e,t)=>e.line-t.line)};let h={id:l,text:i.text,association:m},g=Js(h);return g.length?{problems:g.map(e=>{let t=/point (\d+)/.exec(e);return{line:t&&d?d.value.items[Number(t[1])-1].line:/no text/.test(e)?(i.map?.[0]?.line??a+2)-1:c.line,message:e}})}:{fragment:h,meta:Object.fromEntries(Object.entries(i.frontmatter).filter(([e])=>!sc.includes(e))),prose:i.prose,layout:i.layout}}function fc(e){let t=[],n=[],r=new Map,i=pc(e);for(let[a,o]of Object.entries(e)){let e=Cs[a.split(`/`)[0]],s=dc(o,{...e===void 0||!a.includes(`/`)?{}:{facet:e},styles:i});if(`problems`in s){n.push(...s.problems.map(e=>`${a}:${e.line}: ${e.message}`));continue}let{id:c}=s.fragment,l=r.get(c);l===void 0?r.set(c,a):n.push(`${a}:${o.split(`
`).findIndex(e=>/^id:/.test(e))+1}: the id ${c} is given twice (first in ${l})`),t.push({path:a,...s})}return n.length?{problems:n}:{files:t}}function pc(e){for(let t of Object.values(e)){if(!/^id: styles$/m.test(t.slice(0,t.indexOf(`
---`,3)+1)))continue;let e=r(t);return`problems`in e?new Map:new Map(H(e.text).cells.flatMap(e=>{let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];return e.map?.kind===`style`&&t.length===j.length&&t.every(Number.isFinite)?[[e.name,Object.fromEntries(j.map((e,n)=>[e,t[n]]))]]:[]}))}return new Map}var mc={"bands/01-band":"---\nid: band\nsource: seed\n---\n\n```cells\n&band, &drums, &bass, &pad, &stab, &lead, &drumsOut, &bassOut, &padOut, &stabOut, &leadOut, &bassV, &padV, &keysV, &leadV, &sound, &midi from (&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style, &intensity) style=&(map=style sync=.5 harm=.5 bite=.5)\n&band &drums &bass &pad &stab &lead\n&drums, &drumsOut from drums_performer(drumsDrive=&drumsDrive) &drumlines\n&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV, bassDrive=&bassDrive, style=&style) &bassline\n&pad, &padOut from pad_performer(padLevel=&padLevel, padV=&padV, style=&style) &padline\n&stab, &stabOut from stab_performer(stabLevel=&stabLevel, keysV=&keysV, stabDrive=&stabDrive, style=&style) &stabline\n&lead, &leadOut from lead_performer(leadLevel=&leadLevel, leadV=&leadV, style=&style) &leadline\n&bassV from bass(style=&style)\n&padV from pad(style=&style)\n&keysV from keys(style=&style)\n&leadV from lead(style=&style)\n&bassLevel map=amp .8\n&padLevel map=amp .8\n&stabLevel map=amp .8\n&leadLevel map=amp .8\n&drumsDrive [&intensity * .35 + .65]\n&bassDrive [&intensity * .25 + .75]\n&stabDrive [&intensity * .2222 + .7778]\n&sound map=sample [&drumsOut, &bassOut * .8, &padOut * .35, &stabOut * .4, &leadOut * .45]\n&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut\n&drumlines step=1m ~\n&bassline step=1m ~\n&padline step=1m ~\n&stabline step=1m ~\n&leadline step=1m ~\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n&intensity 1\n```\n\nThe default band (decision 063 §1, #391): who plays a score, on what, and where it goes out. A score ends in `* from band(…)`, the same line on every client, and each client's resolver answers `band` with its own; this is the one cells' library holds.\n\n**Its signature** (decision 065; decision 075, #560): its heads, `&band` and the roles, the gates, the voices and the cards, keep their names in the score; its inputs are optional parameters, `(&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style, &intensity)`. A score passes what it writes, `* from band(bassline=&bassline, …, style=&style)` (`bandLine(score)`, `src/repository/band.ts`). A part it doesn't pass is a tacet, `&bassline step=1m ~`, and says nothing; a level it doesn't pass is .8; a style it doesn't pass is the centre of style space, `&style map=style sync=.5 harm=.5 bite=.5 mood=.5`. A score that took them by name before passes them now, and Migrate writes it.\n\n**Its head, `&band`,** is decision 061's table of performers: the five role cells, `&drums`, `&bass`, `&pad`, `&stab` and `&lead`, so a score's selector over the band (`&form over=&band step=1m …`) reads the client's players. Who plays when is the score's; who they are, the band's.\n\n**The performers** are the seed library's five (decisions 058 and 061), each a copy taken by its signature (decision 065): its role and its gate, `&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV, style=&style) &bassline`. The pitched four take the band's `&style` too, as their instruments do (the drummer has none: its sounds are its kit's, and style reaches its drums through the score's lines). The part each plays is the score's, passed as the band's argument (`bassline=&bassline`), and so are its levels (`bassLevel=&bassLevel`). A level the score doesn't pass is the band's own, one level of .8, the performers' default. A part it doesn't pass rests (decision 063 §4).\n\n**Its intensity** (decision 096): `&intensity`, an optional parameter, the section's from 0 to 1 (the song's plus its kind's offset, a sum the score writes: `&intensity [&song + -.45]` for a breakdown), its own 1. The band drives three of its performers by it, each a sum on the velocity's scale, Jambot's dynamics lifted (yggi/jambot `packages/engine/src/dynamics.ts` @ 602cb26, `baseVelocityOf`): the drums `[&intensity * .35 + .65]`, the bass `[&intensity * .25 + .75]`, the stab `[&intensity * .2222 + .7778]` (its 70 + 20e over 90). The pad's velocity reads the bite beside the energy, and the lead's no energy, so neither is driven. At its own 1 every drive is 1: a score that writes no intensity plays its levels as written.\n\n**The instruments** are the performers' own (`bass`, `keys`, `pad`, `lead`, and 13 of `gm_kit`'s voices), each with a sound. The band takes each pitched one itself, `&bassV from bass(style=&style)`, and passes it to its performer (`bassV=&bassV`), so a score's own `&bassV` is the one played, and `bandAt` replaces the band's line for it. They read the score's style, `&style` (decision 063 §3), passed by the band, which declares it (#560), where Jambot's `timbreOf` reads it (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): the bass's cutoff opens with bite; the lead blends from a triangle to a square as bite rises, its cutoff opening with it; the chords' attack and release shorten as bite rises (decision 066, #411). The section's style is the composer's: the score writes it and passes it; the band's own `&style` is only its default, the centre.\n\n**Which instrument a performer plays at a style** is the band's choice, made by a query at resolution, not by a line: `resolveBand(score)` answers `band` with this text, each pitched voice the first instrument the library ranks at the score's style that defines it, within 0.3 (`INSTRUMENT_REACH`, #540), where that isn't the performer's own (`bandAt`, `src/repository/band.ts`; yggi/jambot#527's rule, moved here). At Synth-pop's, Techno's, Deep house's, Lo-fi hip hop's and Bossa nova's points that is the performer's own instrument, so the band plays as written; at Ambient's the sine bass, at Funk's the brass stab, at Swing jazz's the upright bass and the muted trumpet (#540); at Electro swing's point the upright bass, the brass stab and the clarinet, at Spooky's the round bass, the organ, the celesta and the theremin (#366). Each holds its default's register, so MIDI out sends the same notes. Each is voiced for its own point and reads no `&style`: where one plays, the style moves no cutoff of that voice, as it does the default bass's and lead's. The instruments are found at the score's style where it starts, so a section that glides into or out of Electro swing plays the instruments of its first end throughout. A line can't make that choice: a voice reads a style as a moving parameter, and a wave or a set of envelopes is no such parameter.\n\n**The cards:** a sound card that hears every gate, the drums at full, the bass at .8, the lead at .45 and the chords under it (the pad at .35, the stab at .4), as Jambot's synth balances its parts (`PEAK`, yggi/jambot `apps/web/src/audio/voices.ts` @ 227aa74, its chords' several notes each quieter), and a MIDI card on Jambot's channels: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums. A person with a fifth synth gives the stab its own channel in their band.\n\nA score played on this band sends the MIDI Jambot's section text sends on its single card (channel, note, velocity, onset and end): its twenty sections at the ten presets, seeds 1 and 2, 0 mismatched (`band.slow.test.ts`).\n\nAssociated once as the facet `band` at the centre of style space, at weight 1: it plays every style, reading the style it is given.\n","bass/01-root-bass":"---\nid: root_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&(map=style sync=0 harm=.3 bite=0 mood=.9) | &synthPop | &deepHouse | &ambient | &kinderlied | &pop)\n&bassline over=&harm step=2n 0 0\n```\n\nJambot's bass pattern `root`: the root of the chord in force on one and on three, the bar's downbeat and its half (`bass.ts` weighs them 1 and 0.6).\nIts own lines read the host's `&harm` (`over=&harm`: each index a tone of the chord sounding) and tap the host's main meter, so it fits any workbench whose `&bar` and `&harm` are written first; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt the point where the root is all `bass.ts` plays: there its blend weighs the pump, the eighths and the funk line 0 (no sync, no energy, legato), so the root's share is 1.\nOf the points where it is 1, this is the nearest to Ambient's, the preset where the root's share is greatest (0.68): Ambient's harmony, its sync and energy at 0.\nIt is also at the three presets where the root is what `bass.ts` plays most, as the meters are at theirs (#209): Synth-pop's (0.32, the funk line 0.27), Deep house's (0.31, tied with the funk line, which the root takes as first in `bass.ts`'s order) and Ambient's (0.68). And at Pop's (#947), the root on each chord a pop song's bass plays. A preset plays a blend, and its nearest pattern's point needn't be the pattern it plays most.\n\nWhat `bass.ts` adds that a fixed line doesn't: on three it plays the fifth one section in five and an octave up one in four, by a draw per section and step; it thins the line by the energy (each step sounds when a held draw falls under its weight times 0.55 + 0.6 × energy); the octave, the voice leading and the velocity are the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from root_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/02-pumping-bass":"---\nid: pumping_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&(map=style sync=0 harm=0 bite=1 mood=.825) | &techno | &happyHardcore)\n&bassline over=&harm step=8n ~ 0 ~ 0 ~ 0 ~ 0\n```\n\nJambot's bass pattern `pump`: the root of the chord in force on the eighth after each beat, and nothing on the beat, not even on a chord change (`bass.ts` plays the new root on a change only while the pump weighs under 0.45).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt the one point where the pump's share of `bass.ts`'s blend is greatest, 0.74: a static vamp, staccato, no sync (each a factor of the pump: `(1 − harm) × artic × (1 − sync)`), and no energy, which would bring in the eighths.\nThat is Techno's harmony and articulation, its sync and energy at 0.\nIt is also at Techno's, the preset where the pump is what `bass.ts` plays most (0.50), as the meters are at theirs (#209).\n\nWhat `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, by a draw per section and step; the thinning by the energy (here 0.55: each offbeat sounds about one section in two); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from pumping_bass &harm` takes a copy of it, `&harm` its main argument.\n\nAlso at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1: the eurodance bass of [Hypercell](../../examples/hypercell.md), the root on every offbeat eighth, is this line (#572).\n","bass/03-eighths-bass":"---\nid: eighths_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=&(map=style sync=0 harm=.3 bite=0 mood=.45)\n&bassline over=&harm step=8n 0!8\n```\n\nJambot's bass pattern `eight`: the root of the chord in force on every eighth (`bass.ts` weighs the downbeat 1, the bar's half 0.9, the others 0.8).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt a point where the eighths' share of `bass.ts`'s blend is greatest, 0.63: full energy and no sync (the eighths weigh `0.6 × energy × (1 − funk)`, the funk line weighs the sync), and no pump (legato, or a harmony that moves fully).\nThe eighths are what `bass.ts` plays most at no preset, so unlike the others they sit at no preset's point (#209).\nTechno, the preset where their share is greatest (0.24), is as near two of those points (Techno legato, and Techno with its harmony moving), so it sits at the root bass's point with the energy at 1: there `bass.ts` moves from the root alone to the eighths by the energy alone.\n\nWhat `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, off the downbeat; the thinning by the energy (here 1.15: each eighth sounds but about one in twelve); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from eighths_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/04-funk-bass":"---\nid: funk_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&funk | &lofi | &bossaNova)\n&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~\n&bassNext over=&harm[>>] 0\n```\n\nJambot's bass pattern `funk`, its line on 4/4's sixteen steps, every step it weighs (`bass.ts`'s `FUNK`: 1, 0.7, 0.8, 0.4, 0.7, 0.5, 0.3, 0.8): the root of the chord in force, and on the bar's last two sixteenths the next chord's root, anticipated (`&bassNext`, over `&harm[>>]`).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt Funk's point: there the funk line's share of `bass.ts`'s blend is the greatest it gets, 0.74 (full sync weighs it 1 and the pump and the eighths 0), and Funk is the preset where its share is greatest.\nIt is also at the two other presets where the funk line is what `bass.ts` plays most, as the meters are at theirs (#209): Lo-fi hip hop's (0.48) and Bossa nova's (0.63).\nAt full sync `bass.ts` anticipates the next chord nine times in ten on a step of the bar's last three that isn't a change (`0.9 × sync`), so this line plays the anticipation.\n\nWhat `bass.ts` adds that a fixed line doesn't: the tenth time, the root or the fifth there; the fifth one step in five and an octave up one in four elsewhere off the downbeat; the thinning by each step's weight and the energy (here 1: the 0.3 and the 0.4 sound about one section in three); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from funk_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/05-walking-bass":"---\nid: walking_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&swingJazz | &electroSwing)\n&bassline over=&harm step=4n 0 1 2 &bassNext^$-1\n&bassNext over=&harm[>>] 0\n```\n\nJambot's bass pattern `walk`, a note on every beat: the root of the chord in force on one, its third and its fifth, and on the last beat the next chord's root a semitone below (`&bassNext^$-1`: the next chord's root, `over=&harm[>>]`, moved a step of the grid, a semitone).\nThe semitone can't be an index: over the chord in force an accidental moves a degree of the key, so `0b` over `&harm[>>]` is a semitone only where the key's degree below the next root is one.\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt Swing jazz's point, under its meter swung on `8n` (`swing_meter`): `bass.ts` walks only where the meter swings its eighths (`eighthSwing`) and the harmony moves (`harm ≥ 2/3`), and there the walk's share of its blend is the greatest it gets, 0.74, the funk line, the pump and the eighths all 0.\nThe swing is the meter's, not a style axis, so the point says only the harmony.\nSwing jazz is the only preset where the walk is what `bass.ts` plays most, and this point is Swing jazz's (#209); at the presets whose harmony moves but whose meter doesn't swing, the pattern played most is associated there and is found before the walk.\n\nWhat `bass.ts` draws that a fixed line chooses: the second and third beats each the third, the fifth or the seventh (the fifth twice over where the chord has none), a third each, so this line is one walk it plays, up through the chord; the approach from below or above, half each, so this one from below. Under a harmony that changes on the bar's half it leads into that change too. The octave, the voice leading and the velocity are the performer's.\nAlso at the point proposed for an Electro swing preset (#349), weight 1: the walk [Electro swing, in pieces](../../examples/electroswing.md) plays. It is placed by hand, not by `bass.ts`'s blend, which has no such preset.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from walking_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/06-creeping-bass":"---\nid: creeping_bass\nsource: seed\n---\n\n```cells\n&bassline from &harm style=&spooky\n&bassline over=&harm step=4n 0@2 &creep^$1 0\n&creep over=&harm 0\n```\n\nA bass that creeps: the root of the chord in force held two beats, then a semitone above it, and back (`&creep^$1`: the root moved a step of the grid, a semitone, as the walking bass's approach moves `&bassNext`), the shark's two notes slowed to a walk on tiptoe.\nIts line reads the host's `&harm` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the semitone landing a beat later each time round.\nWritten by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1, Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from creeping_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/07-tiptoe-bass":"---\nid: tiptoe_bass\nsource: seed\n---\n\n```cells\n&bassline from &harm style=&(map=style sync=.2 harm=.9 bite=.25 mood=.3)\n&bassline over=&harm step=4n 0 ~ -1 ~\n```\n\nA bass on tiptoe: the root of the chord in force, a beat's silence, the fifth below it, and silence again, plucked short, as a cartoon villain sneaks down a corridor.\nIts line reads the host's `&harm` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the root landing on a different beat each time round, as `creeping_bass` does.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet `bass`: what the bass plays when `creeping_bass` has tired.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from tiptoe_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/08-acid-bass":`---
id: acid_bass
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm style=&acid
&bassline over=&harm step=16n 0 0 &r^$12 0 ~ 0 &r^$7 0 &r^$10 ~ 0 &r^$12 0 &r^$3 &r^$5 &r^$7
&r over=&harm 0
\`\`\`

The riff of [Acid-Cell](../../examples/acid.md), its first bar of sixteenths: the root, its octave, the fifth, the minor seventh, the minor third and the fourth, with two rests that let the filter breathe.
The example writes it in A minor's degrees; here it is in semitones above the chord's root (\`&r^$12\` an octave up), so it plays over whatever chord the harmony holds, as a minor riff.
It is the part the bass performer plays (\`&bassline\`, decision 058); its holes are \`&harm\` and a meter.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet \`bass\` (#572).
`,"bass/10-octave-bass":`---
id: octave_bass
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm style=(&elektro | &chiptune)
&bassline over=&harm step=8n 0 3 0 3 0 3 0 3
\`\`\`

The bass of [Zelluläre Aktivität](../../examples/zell.md): the root of the chord in force and its octave, eighth by eighth (\`3\`, a triad's fourth tone, is its root an octave up).
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`bass\` (#572).
`,"bass/11-drone-bass":`---
id: drone_bass
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&bassline from &harm style=&darkAmbient
&bassline over=&harm step=1m 0
\`\`\`

The low drone of [Ghost-Cells](../../examples/ghosts.md) as a bass line: the root of the chord in force, held the whole bar.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1), weight 1, as the facet \`bass\` (#572).
`,"bass/12-continuo-bass":`---
id: continuo_bass
source: seed
---

\`\`\`cells
&bassline from &harm style=&baroque
&bassline over=&harm step=8n 0 1 2 1 0 1 2 1
\`\`\`

A continuo's broken chord in eighths: the root, the third, the fifth and back, twice a bar, the left hand that keeps a baroque piece moving under its upper voices.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 1, as the facet \`bass\` (#542).
`,"bass/13-blues-walk":`---
id: blues_walk
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&bassline from &harm style=&bluesShuffle
&bassline over=&harm step=4n 0 1 2 3
\`\`\`

The bass of [Swing blues](../../examples/jazz.md): the chord in force walked up, root, third, fifth and seventh, a beat each, moved bar by bar with the changes.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 1, as the facet \`bass\` (#542).
`,"bass/14-quarter-bass":`---
id: quarter_bass
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm style=&seaShanty
&bassline over=&harm step=4n 0 0 0 0
\`\`\`

The root of the chord in force on every beat, the stamping bass of a shanty sung on deck, as [Drunken Sailor](../../examples/sailor.md) plays it.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65), weight 1, as the facet \`bass\` (#542).
`,"bass/15-tumbao-bass":`---
id: tumbao_bass
source: seed
---

\`\`\`cells
&bassline from &harm style=&salsa
&bassline over=&harm step=8n ~ ~ ~ 2 ~ ~ 0 ~
\`\`\`

The tumbao: the bass rests on the downbeat, plays the fifth on the and of two and the root on four, held across the bar line: the anticipated bass of son and salsa, which leaves the one to the clave.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 1, as the facet \`bass\` (#542).
`,"bass/16-waltz-bass":`---
id: waltz_bass
source: seed
---

\`\`\`cells
&bassline from &harm style=&waltz
&bassline over=&harm step=4n 0 ~ ~
\`\`\`

The waltz's "oom": the root on the first beat of each bar of 3/4, the two light beats left to the chords.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Waltz's point (sync 0, harm 0.7, bite 0.3, mood 0.9), weight 1, as the facet \`bass\` (#542).
`,"bass/17-oom-pah-bass":`---
id: oom_pah_bass
source: seed
---

\`\`\`cells
&bassline from &harm style=&march
&bassline over=&harm step=4n 0 2
\`\`\`

The tuba's oom-pah: the root on one, the fifth on two, a march's bass in 2/4.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At March's point (sync 0, harm 0.1, bite 0.75, mood 0.7), weight 1, as the facet \`bass\` (#542).
`,"bass/18-dub-bass":`---
id: dub_bass
source: seed
---

\`\`\`cells
&bassline from &harm style=&tripHop
&bassline over=&harm step=8n 0@4 ~ 0 2@2
\`\`\`

A dub bass: the root held for half the bar, struck again off the beat and falling back to the fifth, deep and slow under the beat.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 1, as the facet \`bass\` (#542).
`,"counts/01-click":"---\nid: click\nsource: seed\n---\n\n```cells\n&count, &accent from (&tick) &bar style=(&ambient | &darkAmbient | &spooky | &kinderlied | &baroque | &waltz | &seaShanty)\n&tick=lowwoodblock from gm_kit\n&accent [.9 + &bar * -.3]\n&clicks step=beat &tick\n&count [&clicks * &accent]\n```\n\nA click track from the meter, a metronome (#720): a click on every beat, each as strong as the meter's grouping makes it. The meter is a table of levels, one a step, its tiers from the bar down (`meter(\"7/8\")` is 0 3 3 1 3 1 3: the bar, then its groups, 3+2+2, then the eighths); `&accent` reads them as values (decision 079), the bar .9, a group's or a half bar's start .6, a beat below it .3, an eighth nothing, and `&clicks` taps the meter's beats (`step=beat`), so each click sounds at its beat's accent. 4/4 clicks .9 .3 .6 .3, the half bar marked; 7/8 its three groups, .9 .6 .6; 6/8 its two dotted quarters, .9 .6; 12/8 .9 .3 .6 .3. Each where the meter's tree places it, swing and bends included (decision 080): a reading of the meter, not a clock of its own, as Jambot's metronome is (`metronome.ts`, yggi/jambot packages/engine/src).\n\n**`&accent` is a head of its own:** the meter's accents as a level line, which any line can be played at, `&hat * &accent`, as a groove's euclid is played at `metric_accent`'s.\n\nIt takes the meter, `&bar`, its main argument (`&count from click &bar`), and its sound is optional, the General MIDI kit's low wood block by default (`&tick=lowwoodblock from gm_kit`, decision 075): `click(tick=&cb)` rings the cowbell.\n\nAt the styles with no drummer to count, or none who would (Ambient, Dark ambient, Spooky, Kinderlied, Baroque, Waltz and Sea shanty), weight 1, as the facet `count`. The other counts are this click on a player's sound: the sticks (`stick_count`), the hi-hat's pedal (`hat_count`) and the claves (`clave_count`).\n\n**A layer, placed by the form.** The click plays every bar; a piece places it by a level line at the bar's rate, as a groove places its euclid's hits by `&euclidLevel` one level down: a count-in is its first bar, `[&count * &countIn]` with `&countIn map=amp step=1m 1 0@1000`; a click through the piece is the line alone.\n\n**Its signature** (decision 065): `&count, &accent from (&tick) &bar`. `&count from click &bar` takes the click; `&accent from click &bar` its accents alone.\n","counts/02-stick-count":"---\nid: stick_count\nsource: seed\n---\n\n```cells\n&count from (&stick) &bar style=(&synthPop | &techno | &deepHouse | &lofi | &funk | &acid | &happyHardcore | &elektro | &chiptune | &tripHop | &march | &pop)\n&stick=rim from gm_kit\n&count from click(tick=&stick) &bar\n```\n\nThe drummer's count: the sticks clicked together on each beat, the General MIDI side stick (`&stick=rim`), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the player's sound: a click on every beat, each as strong as the meter's grouping makes it, so it counts any meter the piece writes, 7/8's three groups as 4/4's four beats.\n\nAt the styles whose drums are a kit played with sticks, the band's pop, electronic, hip-hop and funk, Pop itself among them (#947) (and March's snare line, which counts off on its rims), weight 1, as the facet `count`. A count is a bar, placed by the form: `[&count * &countIn]` with `&countIn map=amp step=1m 1 0@1000`, or before the piece by a frontend, as Jambot's count-in is (`countIn`, yggi/jambot packages/engine/src/ending.ts: one bar of the opening meter's beats at the opening tempo).\n\n**Its signature** (decision 065): `&count from (&stick) &bar`, the meter its main argument. `&count from stick_count &bar` takes a copy of it; `stick_count(stick=&mine)` clicks a sound of the piece's own.\n","counts/03-hat-count":"---\nid: hat_count\nsource: seed\n---\n\n```cells\n&count from (&hat) &bar style=(&swingJazz | &electroSwing | &bluesShuffle)\n&hat=ph from gm_kit\n&count from click(tick=&hat) &bar\n```\n\nThe jazz drummer's count: the hi-hat's pedal on each beat (`&hat=ph`, the General MIDI pedal hi-hat), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the pedal, its accents the meter's grouping.\n\nAt the swing styles, Swing jazz, Electro swing and Blues shuffle, weight 1, as the facet `count`, where the drummer keeps time with the foot. A count is a bar, placed by the form: `[&count * &countIn]`, `&countIn map=amp step=1m 1 0@1000` (`click` says more).\n\n**Its signature** (decision 065): `&count from (&hat) &bar`, the meter its main argument. `&count from hat_count &bar` takes a copy of it; `hat_count(hat=&mine)` clicks a sound of the piece's own.\n","counts/04-clave-count":"---\nid: clave_count\nsource: seed\n---\n\n```cells\n&count from (&clave) &bar style=(&salsa | &bossaNova)\n&clave=claves from gm_kit\n&count from click(tick=&clave) &bar\n```\n\nThe Latin count: the claves on each beat (`&clave=claves`), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the claves, its accents the meter's grouping; the clave pattern itself comes in with the groove.\n\nAt Salsa and Bossa nova, weight 1, as the facet `count`. A count is a bar, placed by the form: `[&count * &countIn]`, `&countIn map=amp step=1m 1 0@1000` (`click` says more).\n\n**Its signature** (decision 065): `&count from (&clave) &bar`, the meter its main argument. `&count from clave_count &bar` takes a copy of it; `clave_count(clave=&mine)` clicks a sound of the piece's own.\n","endings/01-finale":"---\nid: finale\nsource: seed\nlifted: yggi/jambot packages/engine/src/ending.ts @ b98e69f\n---\n\n```cells\n&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz | &electroSwing | &spooky | &waltz | &march | &pop)\n&half step=1m*2 0\n&bd, &sd, &hh, &rd from gm_kit\n&cadence over=&key step=&half [4,4####,4#######,4##########] [0,2,4]@3\n&finaleBass over=&cadence step=&half 0 3@2 ~\n&finalePad over=&cadence step=&half [0,1,2,3] [2,3,4]@2 ~\n&finaleLead over=&key step=&half 1 0@2 ~\n&kick role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23\n&backbeat role=backbeat step=&half*8 ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!23\n&hat role=hat step=&half*8 &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!23\n&finaleDrums [&kick, &backbeat, &hat]\n```\n\nA song's last bar, as Jambot's band ends one (`cadence` and `finale`, yggi/jambot packages/engine/src/ending.ts @ b98e69f, #720): the dominant seventh on the key's fifth for the bar's first half, then everything lands together on the tonic at the half bar, and the tonic rings on a bar from the landing, so the song ends on a chord left to die away, not on a cut. Two bars: the last bar, then the ring and a half bar's silence.\n\n- **`&cadence`, the chords.** The dominant seventh is written on the key's fifth degree and three tones above it by semitones, an accidental a semitone (`4####` is four above the fifth, its major third): the same chord over every mode, as Jambot's is (a major third and a minor seventh over the fifth, a leading tone in a minor key too), where the key's own degrees (`[4,6,8,10]`) would give a minor seventh chord in aeolian. Then the key's triad, `[0,2,4]`, the tonic, in force to the end.\n- **`&finaleBass`**: the dominant's root, then the tonic's a fourth above it (`3`, the tonic chord's root a lap up: the nearer of the two, as Jambot's bass takes the nearest).\n- **`&finalePad`**: the dominant seventh, then the tonic in the voicing nearest it (its fifth, root and third, `[2,3,4]`), as Jambot's pad moves to the voicing that moves least.\n- **`&finaleLead`**: the key's second degree over the dominant, resolving down a step to the tonic.\n- **`&finaleDrums`**: hats on the eighths and a backbeat leaning in, a snare an eighth before the half, then kick, snare and ride together on it, `finale`'s hits (as `landing`'s, which is the same bar as a layer of its own).\n\n**Its clock is an argument, `&half`**, two steps a bar (`step=1m*2`, the bar's halves, by default): every line steps by it, the drums eight to its step, so the landing is the half bar in any meter, as Jambot's is (`slotStepOn`). A score passes the clock of its ending's section (decision 016: a tap of the meter's bus switched by the selector), so the ending starts with its section, wherever that falls (one step of the plan, held two bars: a section stepped again starts over):\n\n```text\n&parts step=2n &songHalf &endHalf\n&plan over=&parts step=1m 0@30 1@2\n&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from finale(half=&endHalf) &key\n```\n\n**A song's last section.** The ending is what the outro's end plays (the section kind `outro`, #810): a score gives it two bars, the last bar and the ring, and its parts play these lines there. Jambot plays it in place of the band's own last bar, through its performers, so each part keeps its instrument and its register.\n\nAt Jambot's ten presets, weight 1, as the facet `ending`, where Jambot ends so (#720's bound), and at Waltz and March, whose idiom is the same V–I, and at Pop, whose song ends on it too (#947); the other styles find an ending of their own: the stop on the one (`stop`), the tierce de Picardie (`picardy`), the amen (`plagal`), the blues' seventh (`blues_ending`) and the held drone (`drone_out`). Each has this one's heads and signature, so a score changes its ending by its name alone.\n\n**Its signature** (decision 065): `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key`, the drums optional, each the General MIDI kit's by default. `&cadence, &finaleBass from finale &key` takes the chords and the bass line.\n","endings/02-stop":`---
id: stop
source: seed
---

\`\`\`cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &cr) &key style=(&acid | &happyHardcore | &elektro | &chiptune | &salsa)
&half step=1m*2 0
&bd, &cr from gm_kit
&cadence over=&key step=&half [0,2,4]@4
&finaleBass over=&cadence step=&half*4 0 ~!15
&finalePad over=&cadence step=&half*4 [0,1,2] ~!15
&finaleLead over=&cadence step=&half*4 3 ~!15
&kick role=kick step=&half*8 &bd:0:.8 ~!31
&crash role=hat step=&half*8 &cr:0:.7 ~!31
&finaleDrums [&kick, &crash]
\`\`\`

The stop on the one: the band plays the downbeat together, the tonic chord an eighth long, the kick and a crash under it, and then nothing (#720). No cadence: the groove's last bar was the approach, and the ending is the bar after it, cut, the crash left to ring. The tonic is \`[0,2,4]\`, the key's triad, the lead on its root an octave up (\`3\`).

Where a dance track ends so, or a band ends on a hit: Acid, Happy hardcore, Elektro and Chiptune (the game's last note), and Salsa, whose cierre lands on the one; weight 1, as the facet \`ending\`.

**Its signature** (decision 065): the ending's, \`&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key\`, its clock \`&half\` (the bar's halves by default) and its drums optional: a score that takes \`finale\` takes this one by changing the name alone (\`finale\` says how one is placed).
`,"endings/03-picardy":`---
id: picardy
source: seed
---

\`\`\`cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &drum) &key style=&baroque
&half step=1m*2 0
&drum=lt from gm_kit
&cadence over=&key step=&half [4,4####,4#######,4##########] [0,0####,4]@3
&finaleBass over=&cadence step=&half 0 3@2 ~
&finalePad over=&cadence step=&half [0,1,2,3] [2,3,4]@2 ~
&finaleLead over=&key step=&half 1 0@2 ~
&timpani role=kick step=&half*8 &drum:0:.5 ~!7 &drum:0:.7 ~!23
&finaleDrums [&timpani]
\`\`\`

The tierce de Picardie: the dominant seventh, then a major tonic chord, its third raised a semitone over a minor key (\`[0,0####,4]\`: the tonic, four semitones above it, the fifth), as a baroque piece in a minor key ends (#720). Over a major key it is \`finale\`'s cadence, the tonic already major. The bass, the pad and the lead move as \`finale\`'s do, and the timpani (the General MIDI kit's low tom) strike the one and the landing.

At Baroque's point, weight 1, as the facet \`ending\`.

**Its signature** (decision 065): the ending's, \`&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key\`, its clock \`&half\` (the bar's halves by default) and its drums optional: a score that takes \`finale\` takes this one by changing the name alone (\`finale\` says how one is placed).
`,"endings/04-plagal":`---
id: plagal
source: seed
---

\`\`\`cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd) &key style=(&seaShanty | &kinderlied)
&half step=1m*2 0
&bd from gm_kit
&cadence over=&key step=&half [3,5,7] [0,2,4]@3
&finaleBass over=&cadence step=&half 0 0@2 ~
&finalePad over=&cadence step=&half [0,1,2] [1,2,3]@2 ~
&finaleLead over=&key step=&half 5 4@2 ~
&stomp role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23
&finaleDrums [&stomp]
\`\`\`

The amen: the fourth's chord, then the tonic's (IV, I), the plagal cadence a hymn and a song sung together end on (#720). The bass falls a fourth to the tonic's root, the pad keeps the common tone (the tonic, the fourth's fifth) and moves the others a step (\`[1,2,3]\`: the tonic chord's third, fifth and root), and the tune falls from the sixth to the fifth, the amen's own line. A stomp on the one and on the landing.

Where a song is sung together: Sea shanty and Kinderlied, weight 1, as the facet \`ending\`.

**Its signature** (decision 065): the ending's, \`&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key\`, its clock \`&half\` (the bar's halves by default) and its drums optional: a score that takes \`finale\` takes this one by changing the name alone (\`finale\` says how one is placed).
`,"endings/05-blues-ending":`---
id: blues_ending
source: seed
---

\`\`\`cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key style=&bluesShuffle
&half step=1m*2 0
&bd, &sd, &hh, &rd from gm_kit
&cadence over=&key step=&half [4,4####,4#######,4##########] [0,0####,0#######,0##########]@3
&finaleBass over=&cadence step=&half 0 4@2 ~
&finalePad over=&cadence step=&half [0,1,2,3] [1,2,3,4]@2 ~
&finaleLead over=&cadence step=&half 2 4@2 ~
&kick role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23
&backbeat role=backbeat step=&half*8 ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!23
&hat role=hat step=&half*8 &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!23
&finaleDrums [&kick, &backbeat, &hat]
\`\`\`

The blues ends on a seventh: the dominant seventh, then the tonic's seventh chord, the tonic with its flat seventh (\`[0,0####,0#######,0##########]\`: the root, four, seven and ten semitones above it), left hanging, as a blues does (#720). The bass rises a fourth to the tonic's root (\`4\`: over a chord of four, its root a lap up) and the drums land as \`finale\`'s do; the pad moves to the tonic seventh's nearest voicing (its third, fifth, seventh and root); the lead falls a step from the dominant's fifth to the tonic.

At Blues shuffle's point, weight 1, as the facet \`ending\`.

**Its signature** (decision 065): the ending's, \`&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key\`, its clock \`&half\` (the bar's halves by default) and its drums optional: a score that takes \`finale\` takes this one by changing the name alone (\`finale\` says how one is placed).
`,"endings/06-drone-out":`---
id: drone_out
source: seed
---

\`\`\`cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &rd) &key style=(&darkAmbient | &tripHop)
&half step=1m*2 0
&rd from gm_kit
&cadence over=&key step=&half [0,2,4]@4
&finaleBass over=&cadence step=&half 0@3 ~
&finalePad over=&cadence step=&half [0,1,2]@3 ~
&finaleLead over=&cadence step=&half 2@3 ~
&ride role=hat step=&half*8 &rd:0:.25 ~!31
&finaleDrums [&ride]
\`\`\`

No cadence: the tonic held a bar and a half, the bass and the pad on it, the lead on its fifth, and the drums gone but a ride's last touch on the one (#720). The piece doesn't close, it stops moving and is left to the room, as a drone or a dark loop ends.

Where a piece is held rather than resolved: Dark ambient and Trip-hop, weight 1, as the facet \`ending\`.

**Its signature** (decision 065): the ending's, \`&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (…) &key\`, its clock \`&half\` (the bar's halves by default) and its drums optional: a score that takes \`finale\` takes this one by changing the name alone (\`finale\` says how one is placed).
`,"expression/01-vibrato":`---
id: vibrato
source: seed
---

\`\`\`cells
* from
&vibrato map=lin loop=5 0 .1 0 -.1 0
\`\`\`

A singer's or a string player's vibrato (#196): the pitch rising a tenth of a semitone above the note and falling as far below, five times a second, a voice's \`pitch=\` (\`&lead s=saw loop=C4 pitch=&vibrato\`).
It is the vibrato the examples wrote out most, \`pitch=&(map=lin loop=5 0 .1 0 -.1 0)\` in bossa, BWV 847 and pop and near it in six more (five to six a second, eight to fifteen hundredths of a semitone), which take it from here.
A drift that takes seconds to come round, a flutter, or a vibrato wider or slower on purpose is a piece's own: it writes its own cell, as spooky, baustelle and electroswing do.

It defines a cell and uses nothing, so it fits any workbench. Associated as the facet \`expression\` with no point: what a voice does to its notes is no style's, so no query finds it: a piece takes it by its name (decision 090).
`,"expression/02-envelopes":"---\nid: envelopes\nsource: seed\n---\n\n```cells\n* from\n&click map=adsr 0 .03 0 .02\n&tap map=adsr 0 .08 0 .04\n&snap map=adsr 0 .12 0 .05\n&thump map=adsr 0 .3 0 .05\n&strike map=adsr .005 .15 .5 .05\n&pluck map=adsr .005 .25 .5 .1\n&swell map=adsr .02 .3 .5 .3\n```\n\nThe shapes a note's level takes, by name (#196): a voice's `env=` (`&hh s=white hpf=8000 env=&click`), each attack, decay, sustain and release in seconds and a level, as `map=adsr` reads them.\nThey are the seven the examples wrote out most, each from its most common spelling:\n- **Struck, nothing held:** `&click` (a hat, a rim, a tick, 30 ms), `&tap` (80 ms), `&snap` (a snare, 120 ms), `&thump` (a kick, 300 ms).\n- **Held:** `&strike` (a stab, struck and held at half), `&pluck` (a plucked string, a quarter second to half), `&swell` (a pad: a soft attack, a long release).\n\nAn envelope near one of them, each value within a fifth of it, became it in the examples (the owner, #196: \"collapse … minimal differences … as long as the 'spirit and style of the piece' is preserved\"); one that is a piece's own, slower, longer or shaped otherwise, stays as the piece writes it.\nThe names are no performer's (`&stab`, `&pad`, `&lead`, `&keys` are role cells, decision 061), so a piece that plays those parts takes these too.\n\nIt defines cells and uses nothing, so it fits any workbench. Associated as the facet `expression` with no point, as `vibrato` is (#540).\n","expression/03-metric-accent":"---\nid: metric_accent\nruntime: builtin\nsource: seed\n---\n\n```cells\n&accent from (&steps, &density, &sync, &peak, &floor, &meter)\n&accent map=amp step=16n fill()\n&steps 0\n&density 1\n&sync 0\n&peak .8\n&floor .2\n&meter 4/4\n```\n\nA bar's accents from its metric weights (#799): a line of levels a role multiplies its hits by, the downbeat strongest, then the half bar, the beats and the finest steps (`&euclid * &euclidLevel`). **A built-in plugin-fragment** (decision 085, 090): its one fill is a braid, answered once when a `from` line takes it, so the piece's copy holds the levels as written (`src/engine/accent.ts`, `runtime: builtin`).\n\n**Its weights are the bar's meter's** (#906): its grades, one a step, as the family's meter contract writes them (yggi/music-commons `contracts/meter`, version 2), each weighed by how high it stands: the downbeat 1, a group's or the half bar's start .8, a beat between .6, an eighth .4, a sixteenth .2. So 3/4 stresses its beats, 6/8 its two dotted quarters, 7/8 its groups (3+2+2), and 5/4 its 3+2.\n\nIts arguments: `meter`, the bar's meter, a signature or sizes (`3/4`, `7/8`, `2+2+3`), 4/4 by default, or the piece's own meter cell, `metric_accent(meter=&bar)`, handed as its levels, so the accents follow whatever meter the piece writes; `steps`, the steps of a bar, 0 by default, a sixteenth a step (16 in 4/4, 12 in 3/4, 14 in 7/8), any other count a whole number of steps a pulse; `density`, 0 to 1, which steps play (1 every one, 0 the downbeat alone); `sync`, 0 to 1, how far each step leans toward the weight of the step after it (an anticipation); and `peak` and `floor`, the downbeat's level and the lightest step's. A bar of 4/4 at the defaults is `.8 .32 .44 .32 .56 .32 .44 .32 .68 .32 .44 .32 .56 .32 .44 .32`, as it was before it read the meter. Its fuel is 64 steps.\n\nIt has no style: a bar's weights are every style's, so no query finds it, and a fragment takes it by its name (decision 090), as the funk, lo-fi and bossa grooves take their euclid's levels: `&euclidLevel from metric_accent(floor=.23, peak=.3)`.\n","fills/01-snare-run":"---\nid: snare_run\nsource: seed\n---\n\n```cells\n&fill from (&sd)\n&sd from gm_kit\n&fill role=fill step=16n ~!12 &sd:0:.3 &sd:0:.37 &sd:0:.44 &sd:0:.5\n```\n\nJambot's own fill: the snare in sixteenths from three quarters through a 4/4 bar to its end, rising (`drums.ts`: from `lateOf(steps)`, 12 of 16; yggi/jambot packages/engine/src @ b98e69f), the run its drummer plays at a section's end at a chance of 0.35 + 0.3 × sync (#718). The levels are new: Jambot's band sets a fill's velocity by its role.\n\nOne bar, its line `&fill` (role `fill`); a piece places it on a section's last bar by a level line at the bar's rate: `[&groove, &fill * &fillAt]` with `&fillAt map=amp step=1m cycle=8 0!7 1`, the last of every eight. A drum track is layers, each a line by its role, and a fill is one more, placed by the form as a groove places its euclid's hits by `&euclidLevel` one level down.\n\nNo style: Jambot plays it at every style, so no query finds it, and a text takes it by its name (decision 090); the fills of the facet are each style's own.\n\n**Its signature** (decision 065): `&fill from (&sd)`. `&fill from snare_run` takes a copy; `snare_run(sd=&mine)` runs another drum.\n","fills/02-build-run":"---\nid: build_run\nsource: seed\n---\n\n```cells\n&fill from (&sd)\n&sd from gm_kit\n&fill role=fill step=16n ~!8 &sd:0:.25 &sd:0:.28 &sd:0:.31 &sd:0:.34 &sd:0:.38 &sd:0:.42 &sd:0:.46 &sd:0:.5\n```\n\nThe build's fill: the snare in sixteenths from the half bar to the end of a 4/4 bar, rising, as Jambot's drummer ends a build (`drums.ts`: from `halfOf(steps)` in a build's last bar; yggi/jambot packages/engine/src @ b98e69f, #718). Twice the length of `snare_run`, the run a build's lift needs.\n\nOne bar, its line `&fill` (role `fill`), placed by the form on a build's last bar (`snare_run` says how). No style: a section kind, not a style, asks for it (a build), so a text takes it by its name (decision 090).\n\n**Its signature** (decision 065): `&fill from (&sd)`. `&fill from build_run` takes a copy.\n","fills/03-abanico":"---\nid: abanico\nsource: seed\n---\n\n```cells\n&fill from (&high) style=&salsa\n&high=hightimbale from gm_kit\n&fill role=fill step=16n ~!12 &high:0:.4 &high:0:.45 &high:0:.5 &high:0:.58\n```\n\nThe timbalero's roll into the next downbeat, the abanico's run: the high timbale in sixteenths through the last beat of a 4/4 bar, rising (#718). In salsa the timbales, not a snare, mark a section's end.\n\nAt Salsa's point, weight 1, as the facet `fill`. One bar, its line `&fill` (role `fill`), placed by the form on a section's last bar (`snare_run` says how).\n\n**Its signature** (decision 065): `&fill from (&high)`. `&fill from abanico` takes a copy; `abanico(high=&mine)` rolls another drum.\n","fills/04-tom-run":"---\nid: tom_run\nsource: seed\n---\n\n```cells\n&fill from (&high, &mid, &low) style=&spooky\n&high=ht, &mid=mt, &low=lt from gm_kit\n&fill role=fill step=16n ~!16 &high:0:.45 &mid:0:.5 &low:0:.55 &low:0:.62\n```\n\nDown the toms through the last beat of a bar of 5/4: high, middle, low, low, rising (#718). Spooky's bar is five beats (`odd_meter`), twenty sixteenths, so its fill starts on the sixteenth sixteen; over 4/4 it would sound in the bar's middle, and the fit leaves it out (it laps 5/4 only).\n\nAt Spooky's point, weight 1, as the facet `fill`: the toms of a horror film's drums, low and hollow. One bar, its line `&fill` (role `fill`), placed by the form on a section's last bar (`snare_run` says how).\n\n**Its signature** (decision 065): `&fill from (&high, &mid, &low)`. `&fill from tom_run` takes a copy.\n","fills/05-waltz-fill":"---\nid: waltz_fill\nsource: seed\n---\n\n```cells\n&fill from (&sd) style=&waltz\n&sd from gm_kit\n&fill role=fill step=16n ~!8 &sd:0:.22 &sd:0:.26 &sd:0:.3 &sd:0:.35\n```\n\nThe snare in sixteenths through the third beat of a bar of 3/4, soft and rising, into the next bar's one (#718). A bar of 3/4 is twelve sixteenths, so the run starts on the ninth.\n\nAt Waltz's point, weight 1, as the facet `fill`. One bar, its line `&fill` (role `fill`), placed by the form on a section's last bar (`snare_run` says how).\n\n**Its signature** (decision 065): `&fill from (&sd)`. `&fill from waltz_fill` takes a copy.\n","fills/06-march-roll":"---\nid: march_roll\nsource: seed\n---\n\n```cells\n&fill from (&sd) style=&march\n&sd from gm_kit\n&fill role=fill step=16n ~!4 &sd:0:.35 &sd:0:.4 &sd:0:.46 &sd:0:.55\n```\n\nThe snare's roll-off on the second beat of a bar of 2/4, rising into the next bar's one, as a marching snare line leads into a strain (#718). A bar of 2/4 is eight sixteenths, so the roll starts on the fifth.\n\nAt March's point, weight 1, as the facet `fill`. One bar, its line `&fill` (role `fill`), placed by the form on a section's last bar (`snare_run` says how).\n\n**Its signature** (decision 065): `&fill from (&sd)`. `&fill from march_roll` takes a copy.\n","fills/07-timpani-roll":"---\nid: timpani_roll\nsource: seed\n---\n\n```cells\n&fill from (&drum) style=&baroque\n&drum=lt from gm_kit\n&fill role=fill step=16n ~!12 &drum:0:.25 &drum:0:.3 &drum:0:.36 &drum:0:.44\n```\n\nA roll on the low tom through the last beat of a 4/4 bar, rising: the timpani's roll that closes a baroque phrase, on the nearest drum the General MIDI kit has (#718).\n\nAt Baroque's point, weight 1, as the facet `fill`. One bar, its line `&fill` (role `fill`), placed by the form on a section's last bar (`snare_run` says how).\n\n**Its signature** (decision 065): `&fill from (&drum)`. `&fill from timpani_roll` takes a copy.\n","fills/08-landing":"---\nid: landing\nsource: seed\nlifted: yggi/jambot packages/engine/src/ending.ts @ b98e69f\n---\n\n```cells\n&kick, &backbeat, &hat, &landing from (&bd, &sd, &hh, &rd)\n&bd, &sd, &hh, &rd from gm_kit\n&kick role=kick step=16n &bd:0:.6 ~!7 &bd:0:.7 ~!7\n&backbeat role=backbeat step=16n ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!7\n&hat role=hat step=16n &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!7\n&landing [&kick, &backbeat, &hat]\n```\n\nThe drums of a song's last bar, as Jambot's band ends (`finale`, yggi/jambot packages/engine/src/ending.ts @ b98e69f, #720): hats on the eighths and a backbeat leaning toward the bar's half, a snare an eighth before it, then kick, snare and ride together on the third beat, the landing, and nothing after: the chord rings on over silence. A bar of 4/4, its landing on the half bar (`slotStepOn`'s step 8 of 16); its hits are `finale`'s, step for step and drum for drum. The levels are new: Jambot's band sets a velocity by the role.\n\nEach line is a head by its role, as a groove's are, and `&landing` their mix. It is the last layer of a drum track, placed by the form on the song's last bar, in place of the groove: `[&groove * &playing, &landing * &end]`, `&playing` 1 until the last bar and `&end` 1 on it (`snare_run` says how a level line at the bar's rate places a layer).\n\nNo style: Jambot ends the same way at every style (#720 asks for an ending found by style, the cadence and the ring included, a rung of its own), so a text takes it by its name (decision 090).\n\n**Its signature** (decision 065): `&kick, &backbeat, &hat, &landing from (&bd, &sd, &hh, &rd)`. `&landing from landing` takes its mix.\n","forms/01-call-and-answer":'---\nid: call_and_answer\nsource: seed\n---\n\n```cells\n&phrase from (&answer) &call style=&(map=style sync=.75 harm=.35 bite=.65)\n&phrase step=8n &call &answer\n&answer step=8n &call^-2\n```\n\nThe call and its answer: the call, then the call two degrees down, as blues and West African music answer a call, and as Jambot\'s lead lifts a line (an operator on the call, decision 052). Its hole is `&call`; `&answer` is its helper, an operator on the call by default, which a piece overrides by naming it (`use &phrase, &answer from call_and_answer`, decision 059).\nWith a one-bar call it is 2 bars, with a two-bar call 4.\nIt taps the host\'s meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid\'s rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &phrase`), or a piece splices it where it likes.\nAt `sync .75 harm .35 bite .65`, as the facet `form`, weight 1: where its idiom is, a syncopated groove over a harmony that hardly moves, struck, as in funk, the blues, West African music and dance (#371; the owner, 2026-11-09: "form follows idiom"). It names no mood: a form fits any. Of `styles`, Funk and Acid find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&phrase from (&answer) &call`. `&phrase from call_and_answer &motif` takes a copy of it, `&call` its main argument; `&answer` an optional parameter, its line its default (`"call_and_answer"(answer=…)`).\n',"forms/02-sentence":"---\nid: sentence\nsource: seed\n---\n\n```cells\n&sentence from (&continuation) &call style=&(map=style sync=.2 harm=.55 bite=.5)\n&sentence step=8n &call &call^1 &continuation\n&continuation step=8n inverse(&call) &call[::-1]\n```\n\nCaplin's sentence: a presentation, the idea and the idea moved a degree up, then a continuation as long, here the idea mirrored (`inverse(&call)`) and the idea backwards (`&call[::-1]`), the material broken up as a continuation does. Its hole is `&call`; `&continuation` is its helper, a piece's to override by naming it.\nWith a one-bar call it is 4 bars, with a two-bar call 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &sentence`), or a piece splices it where it likes.\nAt `sync .2 harm .55 bite .5`, as the facet `form`, weight 1: where its idiom is, on the beat, over a harmony that moves on in its continuation, neither legato nor struck, as in a classical theme and a pop verse built on a riff (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Synth-pop, Techno, Deep house, Happy hardcore and Elektro find it first (Techno 0.43 away, past Jambot's miss distance of 0.3; `npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&sentence from (&continuation) &call`. `&sentence from sentence &motif` takes a copy of it, `&call` its main argument; `&continuation` an optional parameter, its line its default (`sentence(continuation=…)`).\n","forms/03-period":"---\nid: period\nsource: seed\n---\n\n```cells\n&period from (&antecedent, &consequent) &call style=&(map=style sync=.15 harm=.4 bite=.3)\n&period step=8n &antecedent &consequent\n&antecedent step=8n &call &call^1\n&consequent step=8n &call &call^-1\n```\n\nA period: an antecedent and a consequent, the same start, a different end. The antecedent ends a degree above the call (open), the consequent a degree below (closed). Its hole is `&call`; `&antecedent` and `&consequent` are its helpers, a piece's to override by naming them.\nWith a one-bar call it is 4 bars, with a two-bar call 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &period`), or a piece splices it where it likes.\nAt `sync .15 harm .4 bite .3`, as the facet `form`, weight 1: where its idiom is, on the beat, a half cadence answered by a full one, sung legato, as in a classical period, a folk song and a lullaby (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Ambient and Dark ambient find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&period from (&antecedent, &consequent) &call`. `&period from period &motif` takes a copy of it, `&call` its main argument; `&antecedent`, `&consequent` optional parameters, their lines their defaults (`period(antecedent=…)`).\n","forms/04-aaba":"---\nid: AABA\nsource: seed\n---\n\n```cells\n&chorus from (&b) &a style=&(map=style sync=.45 harm=.85 bite=.4)\n&chorus step=8n &a &a &b &a\n&b step=8n &a^3\n```\n\nThe thirty-two-bar song form, AABA, in its letters: an A three times, the bridge before the last. Its holes are `&a`, not `&call`, because an A is often a phrase itself (`&a step=8n &phrase`, the call and answer), and the bridge `&b` is its helper, A moved a fourth up by default, a piece's to override by naming it (`use &chorus, &b from AABA`).\nWith a one-bar A it is 4 bars, with a two-bar A 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &chorus`), or a piece splices it where it likes.\nAt `sync .45 harm .85 bite .4`, as the facet `form`, weight 1: where its idiom is, a moving, rich harmony, swung a little and played smoothly, as in the jazz standards and the songs of Tin Pan Alley (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Lo-fi hip hop, Bossa nova, Swing jazz, Electro swing and Spooky find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&chorus from (&b) &a`. `&chorus from AABA &motif` takes a copy of it, `&a` its main argument; `&b` an optional parameter, its line its default (`AABA(b=…)`).\n","forms/05-ternary":"---\nid: ternary\nsource: seed\n---\n\n```cells\n&ternary from (&answer, &bridge) &call style=&(map=style sync=.1 harm=.12 bite=.5) * .5\n&ternary step=8n &call &answer &bridge &bridge &call &answer\n&answer step=8n &call^-2\n&bridge step=8n &answer^1\n```\n\nThe ternary song, A B A, as Twinkle has it: the call and its answer, the bridge twice, then the call and its answer again. Its hole is `&call`; `&answer` is its helper, the call two degrees down by default, and `&bridge` the answer a step up, as Twinkle's middle line is its second a step up. A piece names them to override them: `&twinkleSong from ternary(answer=&wonder) &twinkle` is Twinkle whole, its bridge *up above the world so high*.\nWith a one-bar call it is 6 bars, with a two-bar call 12.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &ternary`), or a piece splices it where it likes.\nAt the tune's own point, not the centre of style space (#371): a children's song's form, as the facet `form`, at weight 0.5, so its distance counts double and it is found first only near the tune, not at a preset's point the centre's forms are nearer to (Techno, Ambient).\n\n**Its signature** (decision 065): `&ternary from (&answer, &bridge) &call`. `&tune from ternary &motif` takes a copy of it, `&call` its main argument; &answer, &bridge optional parameters, their lines their defaults.\n","forms/06-rounded-binary":"---\nid: rounded_binary\nsource: seed\n---\n\n```cells\n&rounded_binary from (&answer, &close, &bridge) &call style=&(map=style sync=.1 harm=.12 bite=.6) * .5\n&rounded_binary step=8n &call &answer &call &close &bridge &bridge^1 &call &close\n&answer step=8n &call^1\n&close step=8n &call^-2\n&bridge step=8n &call^-3\n```\n\nThe rounded binary song, A A′ B A′, as Hänschen klein has it: the call and its open answer, the call and its closing answer, a bridge and the bridge a step up, then the call and its close again. Its hole is `&call`; `&answer` (the call a step up), `&close` (two degrees down) and `&bridge` (three down) are its helpers. A piece names them to override them: `&haenschenSong from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen` is Hänschen klein whole.\nWith a one-bar call it is 8 bars, with a two-bar call 16.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &rounded_binary`), or a piece splices it where it likes.\nAt the tune's own point, not the centre of style space (#371): a children's song's form, as the facet `form`, at weight 0.5, so its distance counts double and it is found first only near the tune, not at a preset's point the centre's forms are nearer to (Techno, Ambient).\n\n**Its signature** (decision 065): `&rounded_binary from (&answer, &close, &bridge) &call`. `&tune from rounded_binary &motif` takes a copy of it, `&call` its main argument; &answer, &close, &bridge optional parameters, their lines their defaults.\n","harmony/01-tonic-vamp":"---\nid: tonic_vamp\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key style=(&techno | &funk | &acid * .4 | &darkAmbient * .4)\n&harm over=&key step=1m cycle=8 [0,2,4]!8\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for all eight bars: the vamp `[0]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `dorian`.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: aeolian at Techno's point; dorian at Funk's point. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from tonic_vamp &key` takes a copy of it, `&key` its main argument.\n\nAlso at Acid's point (sync .45, harm .05, bite .85, mood .35), weight 0.4: Acid holds one chord, and at weight 1 the vamp would be Synth-pop's first harmony, 0.272 away (#572). Likewise at Dark ambient's (sync .35, harm .15, bite .4, mood .1), weight 0.4: its drone holds one chord.\n","harmony/02-vamp-to-the-seventh":"---\nid: vamp_to_the_seventh\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key style=(&techno | &funk | &seaShanty * .4)\n&harm over=&key step=1m cycle=8 [0,2,4]!4 [6,8,10]!4\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its seventh (degree 6) for four: the vamp `[0, 6]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `dorian`, `mixolydian`. No preset of Jambot's is mixolydian, so mixolydian gives it no point of its own.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: aeolian at Techno's point; dorian at Funk's point. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from vamp_to_the_seventh &key` takes a copy of it, `&key` its main argument.\n\nAlso at Sea shanty's point (sync .1, harm .25, bite .7, mood .65), weight 0.4: *Drunken Sailor* turns on the same two chords, i and VII; at weight 1 the vamp would be Synth-pop's first harmony (#542).\n","harmony/03-vamp-to-the-fourth":"---\nid: vamp_to_the_fourth\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key style=(&techno | &funk | &(map=style sync=.05 harm=.12 bite=0 mood=.9))\n&harm over=&key step=1m cycle=8 [0,2,4]!4 [3,5,7]!4\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its fourth (degree 3) for four: the vamp `[0, 3]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `dorian`, `ionian`, `mixolydian`. No preset of Jambot's is mixolydian, so mixolydian gives it no point of its own.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: aeolian at Techno's point; dorian at Funk's point; ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from vamp_to_the_fourth &key` takes a copy of it, `&key` its main argument.\n","harmony/04-vamp-to-the-sixth":"---\nid: vamp_to_the_sixth\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key style=(&techno | &(map=style sync=.05 harm=.12 bite=0 mood=.9) | &tripHop * .4)\n&harm over=&key step=1m cycle=8 [0,2,4]!4 [5,7,9]!4\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its sixth (degree 5) for four: the vamp `[0, 5]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `ionian`.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: aeolian at Techno's point; ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from vamp_to_the_sixth &key` takes a copy of it, `&key` its main argument.\n\n**At Trip-hop's point too** (#542), weight 0.4: in a minor key, i to VI, the two chords trip-hop leans on.\n","harmony/05-vamp-to-the-fifth":"---\nid: vamp_to_the_fifth\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key style=(&(map=style sync=.05 harm=.12 bite=0 mood=.9) | &kinderlied * .5 | &waltz * .4 | &march * .4)\n&harm over=&key step=1m cycle=8 [0,2,4]!4 [4,6,8]!4\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its fifth (degree 4) for four: the vamp `[0, 4]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `ionian`.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\nAt `KINDERLIED` too (`styles`): the tonic and the dominant of a children's song, under Twinkle's and Hänschen klein's motifs, with ionian there (yggi/jambot#547, the owner, 2026-11-04). There at weight 0.5, so its distance counts double: at weight 1 Deep house's point would find it first within 0.3, which the fence of #404 (`library.test.ts`) forbids.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from vamp_to_the_fifth &key` takes a copy of it, `&key` its main argument.\n\n**At Waltz's and March's points too** (#542), weight 0.4: the tonic and the dominant, four bars each, is the harmony of both.\n","harmony/06-dark-cadence":"---\nid: dark_cadence\nsource: seed\n---\n\n```cells\n&harm from &key style=&spooky * .4\n&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]\n```\n\nFour bars over the host's key, a chord a bar: the tonic, the sixth, the fourth, the fifth (i, ♭VI, iv, V in a minor key), then round again, the fifth pulling back to the tonic.\nIn harmonic minor, the key the point finds, the fifth is major (A C♯ E over D), a dominant, and the sixth (B♭ D F) sits a semitone above the fifth's root, so the bass falls B♭, G, A and the chords lean in by semitones.\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nIts lap is four bars, not the vamps' eight: Jambot's composer reads only progressions of eight (yggi/jambot `packages/engine/src/harmony-query.ts`), so it doesn't take this one yet, and where no harmony is near one of its presets (Synth-pop, Deep house, Lo-fi hip hop, Bossa nova, Swing jazz) it generates its harmony as before: this is the nearest there, but beyond the miss distance.\nWritten by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), Jambot's to adopt (decision 041), at weight 0.4: at weight 1 it was the nearest harmony to five other presets, all within Jambot's miss distance (0.3), so a composer that read four-bar laps would play it there (#404); at 0.4 every other preset is beyond it.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from dark_cadence &key` takes a copy of it, `&key` its main argument.\n","harmony/07-haunted-progression":"---\nid: haunted_progression\nsource: seed\n---\n\n```cells\n&harm from &key style=([&spooky + &(map=style bite=-.05)] * .4 | [&darkAmbient + &(map=style bite=.1)] * .5)\n&harm over=&key step=1m cycle=8 [0,2,4] [2,4,6] [3,5,7] [4,6,8] [5,7,9] [1,3,5] [4,6,8] [0,2,4]\n```\n\nEight bars over the host's key, a chord a bar: the tonic, the third, the fourth, the fifth, the sixth, the second, the fifth again and home (i, III+, iv, V, ♭VI, ii°, V, i in a minor key).\nIn harmonic minor, the key Spooky's point finds, the third is an augmented triad (F A C♯ over D), the ghost-house chord that leans nowhere, and the second a diminished one (E G B♭), so the progression passes through both of the key's unstable triads before the dominant brings it home.\nIt is eight bars long, a section's, so Jambot's composer reads it as a progression (`packages/engine/src/harmony-query.ts`), unlike the four bars of `dark_cadence`; its chords are all the key's own triads, the only kind a progression's slot holds there.\nIt defines `&harm` and uses the host's `&key` and main meter; it has no card, and plays only through what reads it.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite (its energy offset, #572), as the facet `harmony`, at weight 0.4, as `dark_cadence` is, so it is found within Jambot's miss distance (0.3) of Spooky alone, and behind `dark_cadence` wherever both are farther: at weight 1 it was the nearest harmony to Synth-pop, Lo-fi hip hop, Bossa nova and Swing jazz (0.18 to 0.3), which find none of their own there and would have played it (#404).\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from haunted_progression &key` takes a copy of it, `&key` its main argument.\n\n**Shared** (#540): near Dark ambient's point, a second harmony behind the tonic vamp.\n","harmony/08-axis-progression":`---
id: axis_progression
source: seed
---

\`\`\`cells
&harm from &key style=(&happyHardcore * .4 | &elektro * .4 | &synthPop * .4)
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [2,4,6] [6,8,10]
\`\`\`

A minor key's i, VI, III and VII, a bar each: in A minor, A F C G, the progression [Hypercell](../../examples/hypercell.md) and [Zelluläre Aktivität](../../examples/zell.md) both turn on (the axis progression begun on its minor chord, vi IV I V of the relative major).

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) and Elektro's (sync .15, harm .5, bite .85, mood .45), weight 0.4 (a weight of 1 would make it the first harmony within the miss distance at Synth-pop, Deep house and Electro swing, #572), as the facet \`harmony\` (#572): two styles that share a progression and part on bite and mood.

**At Synth-pop's point too** (#540), weight 0.4: i VI III VII is the synth-pop progression as much as it is eurodance's.
`,"harmony/09-fifths-sequence":`---
id: fifths_sequence
source: seed
---

\`\`\`cells
&harm from &key style=&baroque * .4
&harm over=&key step=1m cycle=8 [0,2,4] [3,5,7] [6,8,10] [2,4,6] [5,7,9] [1,3,5] [4,6,8] [0,2,4]
\`\`\`

The baroque sequence of falling fifths: I IV vii° iii vi ii V I, a bar each, every root a fifth below the last, the progression under countless preludes, chaconnes and concerto episodes, Bach's among them ([Bach, Prelude in C](../../examples/prelude.md) moves through it in its middle bars).

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at styles it was not placed for.
`,"harmony/10-twelve-bar":`---
id: twelve_bar
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&harm from &key style=&bluesShuffle * .4
&harm over=&key step=1m cycle=12 [0,2,4,6]!4 [3,5,7,9]!2 [0,2,4,6]!2 [4,6,8,10] [3,5,7,9] [0,2,4,6] [4,6,8,10]
\`\`\`

The 12-bar blues of [Swing blues: 12 bars in C](../../examples/jazz.md): I I I I · IV IV I I · V IV I V, a bar each, every chord with its seventh. In a mixolydian key the I and the IV are dominant sevenths, as the blues plays them; the V is the key's own, minor.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at styles it was not placed for.
`,"harmony/11-korobeiniki-changes":`---
id: korobeiniki_changes
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&harm from &key style=&chiptune * .4
&harm over=&key step=1m cycle=8 [0,2,4] [0,2,4] [4,6,8] [0,2,4] [3,5,7] [0,2,4] [4,6,8] [0,2,4]
\`\`\`

The changes of [Korobeiniki](../../examples/korobeiniki.md): i i V i iv i V i, a bar each. In a harmonic minor key its V is major, the leading tone the tune leans on.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at Synth-pop, Deep house and Electro swing.
`,"harmony/12-montuno":`---
id: montuno
source: seed
---

\`\`\`cells
&harm from &key style=&salsa * .4
&harm over=&key step=1m cycle=4 [0,2,4] [3,5,7] [4,6,8] [3,5,7]
\`\`\`

The montuno's vamp: I IV V IV, a bar each, round and round under the soloists and the coro.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 0.4, as the facet \`harmony\` (#542).
`,"harmony/13-ninth-vamp":`---
id: ninth_vamp
source: seed
---

\`\`\`cells
&harm from &key style=&deepHouse
&harm over=&key step=1m cycle=4 [0,2,4,6,8]!2 [3,5,7,9,11]!2
\`\`\`

Deep house's vamp: the tonic's ninth chord for two bars, then the fourth's for two, round and round. In a dorian key, D, it is Dm9 to G9, the minor ninth over the dorian's major fourth: the warm, unresolved sway of a deep house pad.

At Deep house's point (sync 0.35, harm 0.55, bite 0.65, mood 0.65), weight 1, as the facet \`harmony\` (#540).
`,"harmony/14-ninth-loop":`---
id: ninth_loop
source: seed
---

\`\`\`cells
&harm from &key style=(&lofi | &(map=style sync=.7 harm=.2 bite=.3 mood=.25) * .5)
&harm over=&key step=1m cycle=4 [0,2,4,6,8] [5,7,9,11,13] [3,5,7,9,11] [4,6,8,10]
\`\`\`

A lo-fi hip hop loop of ninths: i9, VImaj9, iv9 and v7, a bar each. In A minor, Am9 Fmaj9 Dm9 Em7: the soft, jazzy colour a sampled Rhodes loop gives a beat (the fifth stays a seventh, since its ninth would be a flat ninth in the minor key).

At Lo-fi hip hop's point (sync 0.5, harm 0.75, bite 0.35, mood 0.5), weight 1, as the facet \`harmony\` (#540).

**Shared** (#540): near Trip-hop's point, a second harmony behind its i–VI.
`,"harmony/15-turnaround":`---
id: turnaround
source: seed
---

\`\`\`cells
&harm from &key style=&swingJazz
&harm over=&key step=2n cycle=2 [0,2,4,6,8] [5,7,9,11,13] [1,3,5,7,9] [4,6,8,10,12]
\`\`\`

The jazz turnaround: I, vi, ii and V, two to the bar, each a ninth chord. In C, Cmaj9 Am9 Dm9 G9, the changes that close a chorus and lead back to its top, a swing band's harmony moving at its fastest.

At Swing jazz's point (sync 0.35, harm 1, bite 0.3, mood 0.85), weight 1, as the facet \`harmony\` (#540).
`,"harmony/16-ii-v-i":`---
id: ii_v_i
source: seed
---

\`\`\`cells
&harm from &key style=&bossaNova
&harm over=&key step=1m cycle=4 [1,3,5,7,9] [4,6,8,10,12] [0,2,4,6,8]!2
\`\`\`

The ii–V–I in ninths, a bar each and the tonic held for two: in C, Dm9 G9 Cmaj9 Cmaj9. Bossa nova's cadence, its guitar's soft chords moving by fifths to rest.

At Bossa nova's point (sync 0.75, harm 0.85, bite 0.45, mood 0.9), weight 1, as the facet \`harmony\` (#540).
`,"harmony/17-minor-swing":`---
id: minor_swing
source: seed
---

\`\`\`cells
&harm from &key style=&electroSwing
&harm over=&key step=1m cycle=8 [0,2,4]!2 [3,5,7]!2 [0,2,4]!2 [4,6,8,10]!2
\`\`\`

Gypsy jazz's minor swing: i and iv, two bars each, then i and the dominant seventh, as Django Reinhardt's *Minor Swing* turns (in A, Am Dm Am E7 in a harmonic minor key). Electro swing's harmony, sampled from the hot club records it loops.

At Electro swing's point (sync 0.55, harm 0.75, bite 0.6, mood 0.5), weight 1, as the facet \`harmony\` (#540).
`,"harmony/18-authentic-cadence":`---
id: authentic_cadence
source: seed
---

\`\`\`cells
&harm from &key style=&pop
&harm over=&key step=1m cycle=4 [0,2,4] [3,5,7] [4,6,8] [0,2,4]
\`\`\`

The key's I, IV, V and I, a bar each: in C, C F G C, the authentic cadence (#947).
Every pop song's first changes, as a hymn's, a folk song's and a rock and roll song's: out from the tonic, to the subdominant, to the dominant, and home.
In a minor key it is i, iv, v and i, the dominant minor as the key's own degrees give it.

At Pop's point (sync .3, harm .4, bite .5, mood .7), weight 1, as the facet \`harmony\`: Pop's first.
`,"harmony/19-four-chord-pop":`---
id: four_chord_pop
source: seed
---

\`\`\`cells
&harm from &key style=[&pop + &(map=style mood=-.1)]
&harm over=&key step=1m cycle=4 [0,2,4] [4,6,8] [5,7,9] [3,5,7]
\`\`\`

The key's I, V, vi and IV, a bar each: in C, C G Am F, the four chords of a thousand pop songs (#947).
The axis progression begun on its major chord: \`axis_progression\` is the same four from its vi.

Beside Pop's point, 0.1 lower in mood (the vi's bittersweet turn), weight 1, as the facet \`harmony\`: Pop's second, after the authentic cadence, and no tie at Pop.
`,"harmony/20-pachelbel-canon":`---
id: pachelbel_canon
source: seed
---

\`\`\`cells
&harm from &key style=[&baroque + &(map=style mood=-.1)] * .4
&harm over=&key step=1m cycle=8 [0,2,4] [4,6,8] [5,7,9] [2,4,6] [3,5,7] [0,2,4] [3,5,7] [4,6,8]
\`\`\`

Pachelbel's canon: I V vi iii IV I IV V, a bar each, in C, C G Am Em F C F G, the ground bass under the canon and under a long line of songs since.
Its roots fall a fourth and rise a second by turns, where the fifths sequence falls a fifth each bar.

Beside Baroque's point, 0.1 lower in mood (sync 0.15, harm 0.8, bite 0.5, mood 0.75), weight 0.4, as the facet \`harmony\` (#947): at Baroque itself it would tie the fifths sequence at distance 0, and Jambot's composer would offer it there.
`,"harmony/21-bebop-ii-v-i":`---
id: bebop_ii_v_i
source: seed
---

\`\`\`cells
&harm from &key style=[&swingJazz + &(map=style sync=.1 bite=.1)] * .4
&harm over=&key step=1m cycle=4 [1,3,5,7] [4,6,8,10] [0,2,4,6]!2
\`\`\`

The ii–V–I in sevenths, a bar each and the tonic held for two: in C, Dm7 G7 Cmaj7 Cmaj7, bebop's cadence, the changes a soloist runs through at speed.
Where \`ii_v_i\` is Bossa nova's in soft ninths, this one is the plain sevenths a horn spells.

Beside Swing jazz's point, 0.1 higher in sync and in bite (bebop's push), weight 0.4, as the facet \`harmony\` (#947): at Swing jazz itself it would tie the turnaround at distance 0.
`,"instruments/01-gm-kit":`---
id: gm_kit
source: seed
---

\`\`\`cells
* from style=(&swingJazz | &bossaNova | &funk | &bluesShuffle | &march | &waltz | &salsa | &kinderlied | &seaShanty | &lofi)
&acousticbassdrum note=35 s=sine loop=G1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .4 0 .05)
&bd note=36 s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
&rim note=37 s=sine loop=E5 env=&(map=adsr 0 .03 0 .02)
&sd note=38 s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)
&cp note=39 s=white hpf=1000 env=&(map=adsr 0 .08 0 .05)
&electricsnare note=40 s=white hpf=2500 env=&(map=adsr 0 .09 0 .04)
&lt note=41 s=sine loop=G2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .25 0 .05)
&hh note=42 s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&highfloortom note=43 s=sine loop=A2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .23 0 .05)
&ph note=44 s=white hpf=9000 env=&(map=adsr 0 .03 0 .01)
&mt note=45 s=sine loop=C3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .2 0 .05)
&oh note=46 s=white hpf=7000 env=&(map=adsr 0 .25 0 .1)
&lowmidtom note=47 s=sine loop=D3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .18 0 .05)
&ht note=48 s=sine loop=F3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .15 0 .05)
&cr note=49 s=white hpf=5000 env=&(map=adsr 0 .8 0 .3)
&hightom note=50 s=sine loop=A3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .13 0 .05)
&rd note=51 s=white hpf=9000 env=&(map=adsr 0 .4 0 .2)
&chinesecymbal note=52 s=white hpf=3000 distort=.3 env=&(map=adsr 0 .6 0 .2)
&ridebell note=53 s=tri loop=E6 env=&(map=adsr 0 .5 0 .2)
&tb note=54 s=white hpf=6000 env=&(map=adsr 0 .15 0 .05)
&splashcymbal note=55 s=white hpf=6000 env=&(map=adsr 0 .35 0 .1)
&cb note=56 s=square loop=G5 lpf=2500 env=&(map=adsr 0 .1 0 .03)
&crashcymbaltwo note=57 s=white hpf=4000 env=&(map=adsr 0 .9 0 .3)
&vibraslap note=58 s=white hpf=2000 crush=6 env=&(map=adsr 0 .6 0 .2)
&ridecymbaltwo note=59 s=white hpf=8000 env=&(map=adsr 0 .5 0 .2)
&hibongo note=60 s=sine loop=E4 pitch=0..7 * &(map=adsr 0 .02 0 0) env=&(map=adsr 0 .1 0 .03)
&lowbongo note=61 s=sine loop=A3 pitch=0..7 * &(map=adsr 0 .02 0 0) env=&(map=adsr 0 .12 0 .03)
&mutehiconga note=62 s=sine loop=C4 env=&(map=adsr 0 .05 0 .02)
&openhiconga note=63 s=sine loop=C4 pitch=0..5 * &(map=adsr 0 .03 0 0) env=&(map=adsr 0 .2 0 .05)
&lowconga note=64 s=sine loop=G3 pitch=0..5 * &(map=adsr 0 .03 0 0) env=&(map=adsr 0 .25 0 .05)
&hightimbale note=65 s=tri loop=D5 env=&(map=adsr 0 .15 0 .05)
&lowtimbale note=66 s=tri loop=A4 env=&(map=adsr 0 .18 0 .05)
&highagogo note=67 s=tri loop=A5 env=&(map=adsr 0 .2 0 .05)
&lowagogo note=68 s=tri loop=E5 env=&(map=adsr 0 .2 0 .05)
&cabasa note=69 s=white hpf=5000 env=&(map=adsr 0 .06 0 .03)
&sh note=70 s=white hpf=4000 env=&(map=adsr 0 .04 0 .03)
&shortwhistle note=71 s=sine loop=B6 env=&(map=adsr .01 .08 0 .03)
&longwhistle note=72 s=sine loop=B6 env=&(map=adsr .01 .1 .8 .1)
&shortguiro note=73 s=white hpf=2500 lpf=5000 crush=4 env=&(map=adsr 0 .08 0 .02)
&longguiro note=74 s=white hpf=2500 lpf=5000 crush=4 env=&(map=adsr 0 .3 0 .05)
&claves note=75 s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)
&hiwoodblock note=76 s=sine loop=G5 env=&(map=adsr 0 .04 0 .02)
&lowwoodblock note=77 s=sine loop=C5 env=&(map=adsr 0 .05 0 .02)
&mutecuica note=78 s=sine loop=A4 pitch=0..7 * &(map=adsr 0 .08 0 0) env=&(map=adsr 0 .1 0 .03)
&opencuica note=79 s=sine loop=A4 pitch=0..12 * &(map=adsr .05 .2 0 0) env=&(map=adsr 0 .3 0 .05)
&mutetriangle note=80 s=sine loop=A6 env=&(map=adsr 0 .08 0 .03)
&opentriangle note=81 s=sine loop=A6 env=&(map=adsr 0 1.2 0 .4)
\`\`\`

General MIDI's drum kit (decision 054, #225): a voice for each of its 47 percussion notes, 35 to 81, in General MIDI's order, each under its kit name (\`GM_KIT\` in \`src/engine/midi.ts\`), and each writing its note, \`note=36\` (decision 075: a name gives none), so MIDI out sends each on its own note, and a member taken under another name (\`&kick=bd from gm_kit\`, once #560's rung 3 lands) sends it still.
The names are Strudel's short names where Strudel has one (\`&bd\`, \`&sd\`, \`&hh\`, \`&oh\`, \`&cp\`, \`&rim\`, \`&lt\`, \`&mt\`, \`&ht\`, \`&cr\`, \`&rd\`, \`&cb\`, \`&tb\`, \`&sh\`), else General MIDI's, spelled as one word (\`&lowmidtom\`, \`&crashcymbaltwo\`); General MIDI's names for the first are aliases (\`kick\`, \`cowbell\`), which name the same note.

It defines voices and uses nothing, so it fills the holes a groove leaves (\`&bd &sd &hh\`), fits any workbench, and sounds only what a piece plays through it. Each sound is a first pass in cells' own parameters: a sine dropping in pitch for the drums and toms, filtered noise for the snares, hats and cymbals, a tuned sine or triangle for the hand percussion.
A piece takes the voices it needs by name, so a groove need not bring in 47: \`use &bd, &sd, &hh from gm_kit\`. The drummer takes 13 so (\`drums_performer\`); a kit of its own, the core kit, did that before \`use\` could name what it takes, and is retired (#196).

A kit is style-neutral in what it holds; where it is found is the styles that play an acoustic kit (below), at weight 1.

**Where it is found** (#540): on the points of the styles a drummer plays an acoustic kit in, which General MIDI's kit is: Swing jazz, Bossa nova, Funk, Blues shuffle, March, Waltz, Salsa, Kinderlied, Sea shanty and Lo-fi hip hop (its sampled breaks). It stood at the centre for "any style".
`,"instruments/03-bass":"---\nid: bass\nsource: seed\n---\n\n```cells\n&bassV from (&style) style=(&synthPop * .25 | &deepHouse * .25 | &lofi * .25 | &bossaNova * .25 | &techno * .25 | &funk * .25 | &pop * .25)\n&bassV s=saw loop=C2 lpf=450..900 * &style[bite] lpq=4 env=&(map=adsr .005 .2 .7 .05)\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe voice the bass lines play through (decision 054, rung 7's first; #244): `&bassV`, whose `loop=C2` sets the register, so the lines' MIDI notes on Jambot's bass channel are the notes they were when each line carried its own `&bassV loop=C2`.\nIts sound is Jambot's bass (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74, and the synth that plays it, `apps/web/src/audio/voices.ts`): a saw through a resonant low-pass (`lpq=4`) that opens with the section's bite, from 450 Hz where it is paddy to 900 Hz where it is stabby (`lpf=450..900 * &style[bite]`), struck with a short attack and held (#391).\nIt reads the section's style, `&style`, the composer's, and declares it (decision 075, #560): its signature, `&bassV from (&style)`, makes it an optional parameter, its default the centre of style space, 675 Hz, so the bass heard alone plays there. A performer passes its own (`&bassV from bass(style=&style)`).\nIt sounds within the renderer's first stage (decision 062, R1): a wave, a filter and an envelope. A sound changes no note it sends: MIDI out sends the notes it sent with no sound, and a MIDI card alone says the sound isn't sent (decision 064).\nIt defines the one voice the five bass lines read and reads nothing it doesn't declare, so it fills their hole on any workbench; the lines no longer carry a voice of their own.\n\nAssociated as the facet `instrument` at a quarter of the kit's weight; the composer asks for the bass by its id.\n\n**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno and Funk, a synth bass's styles, and of Pop, the default band's genre (#947); weight 0.25. It read `&style[bite]`, so it plays each style's bite. It stood at the centre, `.5 .5 .5 .5`, for \"any style\", and was found nearest Synth-pop and farthest from Techno for no musical reason.\n","instruments/04-keys":"---\nid: keys\nsource: seed\n---\n\n```cells\n&keysV from (&style) style=(&synthPop * .25 | &deepHouse * .25 | &lofi * .25 | &bossaNova * .25 | &swingJazz * .25 | &funk * .25 | &pop * .25)\n&keysV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe voice Jambot's comp plays its stabs through, and any keyboard part: `&keysV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a stab played on it sends the MIDI notes it sends today, with no move on its gate.\nIts sound is Jambot's chords (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle whose attack shortens from .3 s where the style is paddy to .01 s where it is stabby and its release from .7 s to .12 s, its envelope's slots read from the section's style at each note's start (`attack=.3..0.01 * &style[bite]`, decision 066; #391, #411). Where no line writes the style, the centre's: .155 s and .41 s.\nIt sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.\nIts register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).\n\nIt declares the style it reads, as `bass` does: `(&style)`, its default the centre (decision 075, #560).\n\nAssociated as `bass` is, as the facet `instrument` at a quarter of the kit's weight; a performer asks for it by its id.\n\n**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Swing jazz and Funk, where keys comp, and of Pop, the default band's genre (#947); weight 0.25.\n","instruments/05-pad":"---\nid: pad\nsource: seed\n---\n\n```cells\n&padV from (&style) style=(&synthPop * .25 | &deepHouse * .25 | &lofi * .25 | &bossaNova * .25 | &techno * .25 | &ambient * .25 | &pop * .25)\n&padV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe voice Jambot's pad plays through: `&padV`, whose `loop=C3` sets the register, where Jambot's section text sounds its comp, pad and stab alike (`PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a pad played on it sends the MIDI notes it sends today, with no move on its gate. It is a voice of its own beside `keys`, though the two sit at one register, so a sound given to one (a pad's slow attack) isn't the other's.\nIts sound is the one Jambot gives its pad and its stab alike (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a triangle that swells in over .3 s where the style is paddy and .01 s where it is stabby and dies over .7 s to .12 s, as `keys` does, its envelope's slots read from the section's style at each note's start (decision 066; #391, #411); the centre's .155 s and .41 s where no line writes the style. A band that wants its pad slower than its stabs gives it its own envelope.\nIt sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.\nIts register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).\n\nIt declares the style it reads, as `bass` does: `(&style)`, its default the centre (decision 075, #560).\n\nAssociated as `bass` is, as the facet `instrument` at a quarter of the kit's weight; a performer asks for it by its id.\n\n**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno and Ambient, a pad's styles, and of Pop, the default band's genre (#947); weight 0.25.\n","instruments/06-lead":"---\nid: lead\nsource: seed\n---\n\n```cells\n&leadV from (&style) style=(&synthPop * .25 | &deepHouse * .25 | &lofi * .25 | &bossaNova * .25 | &techno * .25 | &ambient * .25 | &funk * .25 | &pop * .25)\n&leadV s=tri..square * &style[bite] loop=C4 lpf=1400..3600 * &style[bite] env=&(map=adsr attack=.04..0.006 * &style[bite] decay=0 sustain=1 release=.08)\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe voice Jambot's lead plays through: `&leadV`, whose `loop=C4` sets the register, where Jambot's section text sounds its lead (`PIN_VOICES.lead`, E35's C4: yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so a lead played on it sends the MIDI notes it sends today, with no move on its gate.\nIts sound is Jambot's lead (`timbreOf`, yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): a soft triangle where the style is paddy blending to a bright square where it is stabby (`s=tri..square * &style[bite]`, decision 066), through a low-pass that opens with the section's bite (energy until decision 076; a reading of intensity may take it, #571), from 1400 Hz to 3600 Hz (`lpf=1400..3600 * &style[bite]`), its attack sharpening from 40 ms to 6 ms as bite rises (#391, #411). Jambot weights its triangle 1.8 against the square; the blend holds each wave at its own peak.\nIt reads the section's style, `&style`, the composer's, and declares it (decision 075, #560): `&leadV from (&style)`, its default the centre of style space (a blend halfway, 2500 Hz, 23 ms). A performer passes its own (`&leadV from lead(style=&style)`).\nIt sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.\nIts register is its own (decision 058): a performer that plays it higher or lower says so on its gate (`play=&part^$12`).\n\nAssociated as `bass` is, as the facet `instrument` at a quarter of the kit's weight; a performer asks for it by its id.\n\n**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno, Ambient and Funk, a synth lead's styles, and of Pop, the default band's genre (#947); weight 0.25.\n","instruments/07-upright-bass":"---\nid: upright_bass\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&electroSwing * .125 | &swingJazz * .125 | &bluesShuffle * .125 | &(map=style sync=.75 harm=.85 bite=.55 mood=.9) * .5)\n&bassV s=saw loop=C2 lpf=700 env=&(map=adsr .005 .3 .25 .08)\n```\n\nElectro swing's bass, plucked and dark: a saw closed down to 700 Hz with a short decay and a low sustain, so each note thumps and fades as a slapped string does.\nIt defines `&bassV`, the voice the bass performer plays (`&bassV from bass`), so it fills the same hole as the default `bass` and can stand in for it.\nIt is [Electro swing, in pieces](../../examples/electroswing.md)'s `&bassV` but for its register: `loop=C2`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on `bass` (the example's `loop=C3` is the piece's own).\nIt sounds within the renderer's first stage (decision 062, R1): a wave, a low-pass filter and an envelope.\n\nAssociated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): on Swing jazz's and Blues shuffle's points, whose bass is an upright, and near Bossa nova's (0.1 off), a second choice behind its own.\n","instruments/08-brass-stab":"---\nid: brass_stab\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&electroSwing * .125 | &funk * .125 | &salsa * .125)\n&keysV s=saw loop=C3 lpf=1800 env=&(map=adsr .01 .12 .25 .1)\n```\n\nElectro swing's stabs, a short brassy chord: a saw opened to 1800 Hz, a fast attack and a quick fall to a low sustain, so the Charleston's chords bite and get out of the way.\nIt defines `&keysV`, the voice the stab performer plays (`use &keysV from keys`), so it fills the same hole as the default `keys`.\nIt is [Electro swing, in pieces](../../examples/electroswing.md)'s `&keysV` word for word, at the default's register (`loop=C3`), so a stab played on it sends the MIDI notes it sends on `keys`.\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): on Funk's and Salsa's points, their horn section's hits.\n","instruments/09-clarinet":"---\nid: clarinet\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&electroSwing * .125 | &(map=style sync=.35 harm=1 bite=.4 mood=.85) * .5)\n&leadV s=square loop=C4 lpf=2400 env=&(map=adsr .02 .2 .7 .15) pitch=&(map=lin loop=5.5 0 .12 0 -.12 0)\n```\n\nElectro swing's lead: a square wave, the odd harmonics a clarinet's bore gives, softened by a low-pass at 2400 Hz, with a breath of attack and a vibrato of an eighth of a semitone five and a half times a second.\nIt defines `&leadV`, the voice the lead performer plays (`use &leadV from lead`), so it fills the same hole as the default `lead`.\nIt is [Electro swing, in pieces](../../examples/electroswing.md)'s `&leadV` word for word, at the default's register (`loop=C4`), so a line played on it sends the MIDI notes it sends on `lead`.\nIt sounds within the renderer's first stage (decision 062, R1): a wave, a filter, an envelope and a pitch's shape.\n\nAssociated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): near Swing jazz's point, a second lead behind the muted trumpet.\n","instruments/10-muted-trumpet":"---\nid: muted_trumpet\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&electroSwing * .125 | &swingJazz * .125 | &(map=style sync=.65 harm=.55 bite=.55 mood=.65) * .5)\n&leadV s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .03 .1 .6 .12) pitch=&(map=lin loop=4.5 0 .08 0 -.08 0)\n```\n\nElectro swing's second lead, the trumpet with a mute in it: a saw through a resonant low-pass (1400 Hz, `lpq=6`), the mute's nasal peak, with a slower, narrower vibrato than the clarinet's.\nIt defines `&leadV`, the voice the lead performer plays, so it is the other instrument a lead player at this point may take; at the point the two are equally near, and a query lists the clarinet first, by id. A piece with both, as the example, gives the second player a voice of its own.\nIt is [Electro swing, in pieces](../../examples/electroswing.md)'s `&trumpetV`, named for the hole it fills, at the default lead's register (`loop=C4`), so a line played on it sends the MIDI notes it sends on `lead`.\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Electro swing's point (`ELECTRO_SWING`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): on Swing jazz's point, its lead, and near Blues shuffle's, a second choice behind its horn.\n","instruments/11-round-bass":"---\nid: round_bass\nsource: seed\nlifted: yggi/cells examples/spooky.md @ 6d1bfa7\n---\n\n```cells\n* from style=&spooky * .125\n&bassV s=tri loop=C2 lpf=500 env=&(map=adsr .01 .3 .6 .2)\n```\n\nSpooky's bass, soft and round under the creep: a triangle closed down to 500 Hz, with a held sustain and a slow release, so the root and the semitone above it blur into each other.\nIt defines `&bassV`, the voice the bass performer plays (`use &bassV from bass`), so it fills the same hole as the default `bass`.\nIt is [Spooky, in pieces](../../examples/spooky.md)'s `&bassV` but for its register: `loop=C2`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on `bass` (the example's `loop=C3` is the piece's own).\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Spooky's point (`SPOOKY`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n","instruments/12-organ":"---\nid: organ\nsource: seed\nlifted: yggi/cells examples/spooky.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&spooky * .125 | &bluesShuffle * .125)\n&padV s=square loop=C3 lpf=1100 env=&(map=adsr .25 .2 .8 .6)\n```\n\nSpooky's pad, a church organ in an empty nave: a square, the reedy stop, filtered to 1100 Hz, swelling in over a quarter of a second and hanging on after the chord is let go.\nIt defines `&padV`, the voice the pad performer plays (`use &padV from pad`), so it fills the same hole as the default `pad`.\nIt is [Spooky, in pieces](../../examples/spooky.md)'s `&padV` word for word, at the default's register (`loop=C3`), so a chord played on it sends the MIDI notes it sends on `pad`.\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Spooky's point (`SPOOKY`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): on Blues shuffle's point, its Hammond.\n","instruments/13-theremin":"---\nid: theremin\nsource: seed\nlifted: yggi/cells examples/spooky.md @ 6d1bfa7\n---\n\n```cells\n* from style=&spooky * .125\n&leadV s=sine loop=C4 env=&(map=adsr .15 .2 .9 .4) pitch=&(map=lin loop=5 0 .25 0 -.25 0)\n```\n\nSpooky's lead, the theremin of a hundred horror films: a pure sine, fading in and out as a hand nears and leaves the antenna, with a wide vibrato of a quarter of a semitone five times a second.\nIt defines `&leadV`, the voice the lead performer plays (`use &leadV from lead`), so it fills the same hole as the default `lead`.\nIt is [Spooky, in pieces](../../examples/spooky.md)'s `&leadV` word for word, at the default's register (`loop=C4`), so a line played on it sends the MIDI notes it sends on `lead`.\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Spooky's point (`SPOOKY`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n","instruments/14-celesta":"---\nid: celesta\nsource: seed\nlifted: yggi/cells examples/spooky.md @ 6d1bfa7\n---\n\n```cells\n* from style=(&spooky * .125 | &baroque * .125)\n&keysV s=sine loop=C3 env=&(map=adsr .002 .7 0 .5)\n```\n\nSpooky's bell, a celesta's struck tone: a sine that starts at once and dies away over most of a second with nothing held, the music box in the attic.\nIt defines `&keysV`, the voice the stab performer plays (`use &keysV from keys`), so it fills the same hole as the default `keys`.\nIt is [Spooky, in pieces](../../examples/spooky.md)'s `&keysV` but for its register: `loop=C3`, the default instrument's, so a stab played on it sends the MIDI notes it sends on `keys`. The example plays it at `loop=C5`, where a celesta sits; a player who wants it there says so on its gate (`play=&stabline^$24`, decision 058).\nIt sounds within the renderer's first stage (decision 062, R1).\n\nAssociated at Spooky's point (`SPOOKY`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).\n\n**Shared** (#540): on Baroque's point, where it stands in for the harpsichord.\n","instruments/15-haunted-pad":"---\nid: haunted_pad\nsource: seed\n---\n\n```cells\n* from style=[&spooky + &(map=style bite=-.05)] * .125\n&padV s=tri loop=C3 env=&(map=adsr 1.5 .5 .8 2) pitch=&(map=lin loop=3 0 .1 0 -.1 0)\n```\n\nSpooky's pad: a soft triangle that swells in over a second and a half and fades over two, wavering a tenth of a semitone three times a second, so a held chord rises out of the silence and sinks back into it, the sound a ghost house opens with.\nIt defines `&padV`, the voice the pad performer plays, so it fills the same hole as the default `pad`, at the default's register (`loop=C3`), and sends the MIDI notes it sends.\nAssociated 0.05 below Spooky’s point in bite (its energy offset, #572) (Spooky: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), as `theremin` and `celesta` are: at Spooky's point itself it would tie with `organ`, which defines `&padV` there too, and take its place by id, so the organ plays at Spooky and this pad as the style grows quieter.\n","instruments/16-sine-bass":`---
id: sine_bass
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

\`\`\`cells
* from style=(&kinderlied * .125 | &ambient * .125)
&bassV s=sine loop=C2 env=&(map=adsr .005 .4 .4 .1)
\`\`\`

The round, soft bass of [Kinderlieder, in pieces](../../examples/kinderlied.md): a sine struck at once, falling to under half in four tenths of a second, as a toy piano's left hand, at the default bass's register (\`loop=C2\`; the example plays it an octave up), so it sends the MIDI notes \`bass\` sends.
It defines \`&bassV\`, the voice the bass performer plays, so it fills the same hole as the default \`bass\`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet \`instrument\`, at half the default instruments' weight (0.125), as Spooky's and Electro swing's own are (#350), so a query for an instrument finds it first there (#572).

**Shared** (#540): on Ambient's point, its soft low end.
`,"instruments/17-recorder":`---
id: recorder
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

\`\`\`cells
* from style=(&kinderlied * .125 | &(map=style sync=.15 harm=.8 bite=.6 mood=.85) * .5)
&leadV s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
\`\`\`

The lead of [Kinderlieder, in pieces](../../examples/kinderlied.md): a triangle, plain and breathy, a child's recorder, at the default lead's register (\`loop=C4\`; the example plays it an octave up), so it sends the MIDI notes \`lead\` sends.
It defines \`&leadV\`, the voice the lead performer plays, so it fills the same hole as the default \`lead\`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): near Baroque's point, a second lead behind the moog.
`,"instruments/18-tb303":`---
id: tb303
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

\`\`\`cells
* from style=(&acid * .0625 | &(map=style sync=.12 harm=0 bite=.9 mood=.4) * .5)
&bassV s=saw loop=C2 lpf=110..3800 * &(map=adsr .003 .18 .1 .06) lpq=12 env=&(map=adsr .005 .15 .5 .05)
\`\`\`

The 303 of [Acid-Cell](../../examples/acid.md): a saw through a resonant low-pass (\`lpq=12\`) that opens on every note, 3 ms up and 180 ms down (its filter envelope, written in place).
It defines \`&bassV\`, the voice the bass performer plays, so the acid line is played on it as any bass line is.
The example's knobs, which turn the cutoff and the resonance over 16 and 32 bars so the squeal comes and goes, and its accents are its own, a piece's hands on the instrument: an instrument is one voice that sounds alone.

Associated at Acid's point (sync .45, harm .05, bite .85, mood .35) as the facet \`instrument\`, at a quarter of the default instruments' weight (0.0625), so it stays Acid's and Techno, 0.185 away, keeps the default bass (#350, #572).

**Shared** (#540): near Techno's point, a second bass behind the default saw.
`,"instruments/19-rave-lead":`---
id: rave_lead
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
* from style=&happyHardcore * .125
&leadV s=saw loop=C4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
\`\`\`

The hook's saw of [Hypercell](../../examples/hypercell.md): a bright saw, its filter open, a short room on it. The example plays the hook on two, one detuned a few cents against the other; one is what a voice is.
It defines \`&leadV\`, the voice the lead performer plays.

Associated at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).
`,"instruments/20-square-bass":`---
id: square_bass
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
* from style=(&elektro * .125 | &chiptune * .125)
&bassV s=square loop=C2 lpf=600 env=&(map=adsr .005 .15 .5 .05)
\`\`\`

The bass of [Zelluläre Aktivität](../../examples/zell.md): a square through a closed low-pass, struck and held at half, the machine bass of German electronic music of the late 1970s.
It defines \`&bassV\`, the voice the bass performer plays, at the default bass's register (\`loop=C2\`; the example's sits a third lower, on A1).

Associated at Elektro's point (sync .15, harm .5, bite .85, mood .45) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): on Chiptune's point, a sound chip's square bass.
`,"instruments/21-prepared-piano":`---
id: prepared_piano
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
* from style=&darkAmbient * .125
&leadV s=tri loop=C4 lpf=3000 room=.45 env=&(map=adsr .002 1.6 0 1.8) pitch=&(map=lin loop=.19 0 .05 0 -.05 0)
\`\`\`

The piano of [Ghost-Cells](../../examples/ghosts.md): a triangle struck at once and left to ring for two seconds and more, its pitch wavering a twentieth of a semitone either way, a prepared piano heard in a large room.
It defines \`&leadV\`, the voice the lead performer plays, at the default lead's register (\`loop=C4\`; the example plays it on D4 and panned, with an echo in time).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).
`,"instruments/22-drone-pad":`---
id: drone_pad
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
* from style=(&darkAmbient * .125 | &(map=style sync=.05 harm=.3 bite=.1 mood=.9) * .5)
&padV s=saw loop=C3 distort=.8 lpf=120..600 * &(map=lin loop=.0435 .15 .7 .3 .15) lpq=3 env=&(map=adsr 4 2 .9 6)
\`\`\`

The drone of [Ghost-Cells](../../examples/ghosts.md): a saw distorted hard, its low-pass breathing between 120 and 600 Hz over 23 seconds, swelling in over four seconds and fading over six.
It defines \`&padV\`, the voice the pad performer plays, at the default pad's register (\`loop=C3\`; the example's drone sits two octaves lower, on D1).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): near Ambient's point, a second pad behind the default.
`,"instruments/23-moog":`---
id: moog
source: seed
lifted: yggi/cells examples/prelude.md @ a8de625f
---

\`\`\`cells
* from style=&baroque * .125
&leadV s=saw loop=C4 lpf=1600 lpq=7 env=&(map=adsr .002 .3 .4 .25)
\`\`\`

The synthesizer of [Bach, Prelude in C: for Wendy](../../examples/prelude.md): a sawtooth through a resonant low-pass (\`lpq=7\`), struck and half held, the sound of Bach played on an old modular synthesizer. The example doubles it with a square an octave down; one is what a voice is.
It defines \`&leadV\`, the voice the lead performer plays, at the default lead's register.

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/24-blues-horn":`---
id: blues_horn
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
* from style=&bluesShuffle * .125
&leadV s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
\`\`\`

The horn of [Swing blues](../../examples/jazz.md): a saw softened by a low-pass, a little room on it, a brass line's attack.
It defines \`&leadV\`, the voice the lead performer plays.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/25-fiddle":`---
id: fiddle
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
* from style=(&seaShanty * .125 | &(map=style sync=0 harm=.7 bite=.4 mood=.9) * .5)
&leadV s=saw loop=C4 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
\`\`\`

The fiddle of [Drunken Sailor](../../examples/sailor.md): a bright saw bowed short, at the default lead's register (\`loop=C4\`; the example plays it an octave up).
It defines \`&leadV\`, the voice the lead performer plays.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).

**Shared** (#540): near Waltz's point, a second lead behind the accordion.
`,"instruments/26-pulse-lead":`---
id: pulse_lead
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
* from style=&chiptune * .125
&leadV s=pulse loop=C4 env=&(map=adsr .002 .05 .8 .05)
\`\`\`

The lead of [Korobeiniki, in Tetris form](../../examples/korobeiniki.md): a pulse wave, struck and held, the voice of an 8-bit console's sound chip. The example draws a pulse of a quarter's width from a braid of its own; \`s=pulse\` is the voice's.
It defines \`&leadV\`, the voice the lead performer plays.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/27-montuno-piano":`---
id: montuno_piano
source: seed
---

\`\`\`cells
* from style=(&salsa * .125 | &(map=style sync=.75 harm=.85 bite=.55 mood=.9) * .5)
&leadV s=square loop=C4 lpf=2800 env=&(map=adsr .002 .3 .15 .2)
\`\`\`

A bright, struck piano for the montuno: a square wave through an open filter, quick to start and quick to fade.
It defines \`&leadV\`, the voice the lead performer plays.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Bossa nova's point, a second lead behind the default.
`,"instruments/28-accordion":`---
id: accordion
source: seed
---

\`\`\`cells
* from style=(&waltz * .125 | &(map=style sync=.1 harm=.25 bite=.8 mood=.65) * .5)
&leadV s=square loop=C4 lpf=2200 env=&(map=adsr .03 .1 .9 .15) pitch=&(map=lin loop=6 0 .06 0 -.06 0)
\`\`\`

A musette accordion: a reedy square, held while the bellows push, with the slight beating of its detuned reeds as a shallow vibrato.
It defines \`&leadV\`, the voice the lead performer plays.

At Waltz's point (sync 0, harm 0.7, bite 0.3, mood 0.9), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Sea shanty's point, a second lead behind the fiddle.
`,"instruments/29-brass-band":`---
id: brass_band
source: seed
---

\`\`\`cells
* from style=(&march * .125 | &(map=style sync=.9 harm=.5 bite=.8 mood=.75) * .5)
&leadV s=saw loop=C4 lpf=2000 lpq=2 env=&(map=adsr .03 .1 .8 .1)
\`\`\`

A brass band's cornet: a saw through a filter half open, its attack a breath slower than a stab's, held for the march's tune.
It defines \`&leadV\`, the voice the lead performer plays.

At March's point (sync 0, harm 0.1, bite 0.75, mood 0.7), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Salsa's point, a second lead behind the montuno piano.
`,"instruments/30-electric-piano":`---
id: electric_piano
source: seed
---

\`\`\`cells
* from style=(&tripHop * .125 | &(map=style sync=.5 harm=.75 bite=.45 mood=.5) * .5 | &(map=style sync=.35 harm=.55 bite=.75 mood=.65) * .5)
&leadV s=sine loop=C4 room=.5 env=&(map=adsr .01 .8 .3 .6)
\`\`\`

An electric piano in a large room: a sine struck softly that rings and fades, the Rhodes of a trip-hop record.
It defines \`&leadV\`, the voice the lead performer plays.

At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Lo-fi hip hop's and Deep house's points, a second lead behind the default.
`,"laws/01-five-to-twelve":"---\nid: five_to_twelve\nruntime: builtin\nsource: seed\n---\n\n```cells\n&cycle from &day\n&cycle [&notes * &level]\n&notes over=&key pan=&space step=1 fill()\n&level map=amp step=1 fill()\n&space map=lin step=1 fill()\n&key from diatonic(mode=&mode) &tonic\n&mode fill()\n&tonic fill()\n```\n\nThe 5 to 12 cycle (decision 085): a day of music, anchored to the clock at 11:55, every note computed by a law. A piece takes it from the clock it reads, its main argument: `&cycle from five_to_twelve &day`, where `&day` is a day meter (`&day scan(1!24) loop=1d anchor=11.55`). Its head's attributes before `from` are the piece's (`&cycle label=\"the law: a day\" from five_to_twelve &day`).\n\n**A built-in plugin-fragment** (decision 090): a fragment file like any, its code a module of cells (`src/engine/fiveto12.ts`, `runtime: builtin`, its law's word `fiveto12`; the id is `five_to_twelve`, since the example *5 to 12* is `fiveto12` and pieces and fragments share one namespace), which writes its fills as braid text: degrees over its key, chords stacked in thirds, its levels and places as cells, its sections the day's twelve blocks. Its head is notes with their levels (decision 087), played on the piece's voice; its place is its notes line's `pan=` (#739). A `from` line copies its cells into the piece, each fill carrying its first lap as its braid (`fill(five_to_twelve, mode, &day) ionian`), and realize plays the laps one by one (#792).\n\nIts kind is `law`, and it has no style: a day of every mode is no style's, so no query finds it, and a piece takes it by its name (decision 090).\n","melodic/01-plain":"---\nid: plain\nsource: seed\n---\n\n```cells\n&melo from &key style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz | &electroSwing | &spooky | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &seaShanty | &chiptune | &salsa | &waltz | &march | &tripHop | &pop)\n&melo over=&key even(7, 7)\n```\n\nThe melodic scale that is the key's own: all seven of its degrees, `even(7, 7)` of them, so a line over `&melo` plays as a line over `&key` does, note for note, in any mode. It is the scale a lead walks where nothing narrower is asked for (#719), Jambot's `plain` (`MELODIC_SCALES`, yggi/jambot packages/engine/src/key.ts).\n\nA melodic scale is a table over the key, a level of it as the triad is (`&triad over=&key[>>k] even(3, 7)`, decision 072, #508): the twelve, the key's seven in them, the melodic scale's in those. The pentatonic is five of the seven (`pentatonic`), the blues a necklace of its own on the key's tonic (`blues`).\n\nAt every style of `styles` but two, Pop's among them (#947), weight 1, as the facet `melodic`: Jambot's lead keeps the key's own scale at every style unless its players wish for another (`melodicDefault`, licence.ts there), so a query at any of its presets finds this one first, at distance 0. The two: Blues shuffle, where `blues` is found, and Kinderlied, where `pentatonic` is.\n\n**Its signature** (decision 065): `&melo from &key`. `&melo from plain &key` takes a copy of it, `&key` its main argument.\n","melodic/02-pentatonic":"---\nid: pentatonic\nsource: seed\n---\n\n```cells\n&melo from (&phase) &key style=&kinderlied phase=0\n&melo from (&phase) &key style=&(map=style sync=.5 harm=.775 bite=.375 mood=.75) phase=3\n&melo over=&key even(5, 7, &phase)\n&phase 0\n```\n\nFive of the key's seven degrees, as evenly as five go: the pentatonic taken on the key (#719). Its phase says which five, as `even(5, 12, phase)`'s does in the twelve: 0 the major pentatonic's (degrees 0 1 2 4 5: C D E G A in C major, G A B D E in G mixolydian), 3 the minor's (0 2 3 4 6: A C D E G in A minor, D F G A C in D dorian). Over a key with a major third take phase 0, over one with a minor third phase 3, as Jambot's lead does (`melodicHelix`, yggi/jambot packages/engine/src/key.ts); a key with a diminished fifth, the locrian, has neither, and keeps `plain`.\nWhatever the phase and whatever the key's mode, every note is one of the key's: the pentatonic never leaves the key, so it needs no tonic of its own.\n\nAt Kinderlied's point, its phase 0, weight 1: the major pentatonic of the children's song, the scale Orff's Schulwerk teaches children to sing and play on. Its phase 3, the minor pentatonic, at the point halfway between Swing jazz and Blues shuffle (each axis their mean), where no preset is: the turnaround of [Swing blues](../../examples/jazz.md) and the tune of [Five](../../examples/five.md), which \"builds on the blues\", play it. Each preset keeps its own first: `plain` at Swing jazz and `blues` at Blues shuffle, at distance 0.\n\n**Its signature** (decision 065): `&melo from (&phase) &key`. `&melo from pentatonic &key` is the major pentatonic of the key; `&melo from pentatonic(phase=3) &key` the minor. The phase is a number (decision 093): a mode word names a phase of `even(7, 12)` only, so `phase=aeolian` is an error that says so.\n","melodic/03-blues":"---\nid: blues\nsource: seed\n---\n\n```cells\n&melo from &tonic style=&bluesShuffle\n&melo scale(blues, &tonic)\n```\n\nThe blues scale on the key's tonic, 3 2 1 1 3 2 up the twelve (C E♭ F F♯ G B♭ on C): the minor pentatonic with the flat fifth between its fourth and fifth. The scale of the riff of [Swing blues](../../examples/jazz.md), which plays it over a dominant blues in C.\n\n**It leaves the key** (#719): its flat fifth is in no diatonic mode but the lydian, where it is the raised fourth, and over a key with a major third (Blues shuffle's mixolydian, `diatonic`) its flat third isn't either. So it isn't written over the key's degrees, as `plain` and `pentatonic` are, but as a necklace of its own on the key's tonic: it reads `&tonic`, the cell the key's own fragment reads (`diatonic`), not `&key`. A line over `&melo` is then in the blues, whatever the key's mode; the harmonies go on reading the key.\n\nAt Blues shuffle's point, weight 1, as the facet `melodic`, where Swing blues' riff was cut from (`styles`). Over a key with a major third Jambot's lead walks the major blues instead (`major_blues`), as its own table says; the blues over a dominant is the idiom of Swing blues, and Blues shuffle is no preset of Jambot's prototype, so Jambot's lead plays the key's own scale there today unless its players wish for this one.\n\n**Its signature** (decision 065): `&melo from &tonic`. `&melo from blues &tonic` takes a copy of it, `&tonic` its main argument.\n","melodic/04-major-blues":"---\nid: major_blues\nsource: seed\n---\n\n```cells\n&melo from &tonic\n&melo scale(scan(2 1 1 3 2 3), &tonic)\n```\n\nThe major blues on the key's tonic, 2 1 1 3 2 3 up the twelve (C D E♭ E G A on C): the major pentatonic with the flat third between its second and third. It is the blues' necklace (`blues`, 3 2 1 1 3 2) from its second note, the relative minor's blues heard from the major's tonic.\nThe blues Jambot's lead walks over a key with a major third (`MELODIC_DEGREES`' major side, yggi/jambot packages/engine/src/key.ts @ b98e69f); like `blues` it leaves the key, so it is a necklace of its own on the tonic and reads `&tonic`.\n\nNo style: no query finds it, and a text takes it by its name (decision 090), as a player's wish for the blues over a major key does.\n\n**Its signature** (decision 065): `&melo from &tonic`. `&melo from major_blues &tonic` takes a copy of it, `&tonic` its main argument.\n","meters/bar":`---
id: bar
source: seed
---

\`\`\`cells
&bar from (&meter) &tempo style=(&synthPop | &techno | &ambient | &bossaNova | &kinderlied | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &seaShanty | &chiptune | &salsa | &tripHop)
&bar from (&meter) &tempo style=(&waltz * .75 | [&spooky + &(map=style bite=.08)] * .75) meter="3/4"
&bar from (&meter) &tempo style=(&march * .75 | &(map=style sync=0 harm=.1 bite=.6) * .75) meter="2/4"
&bar from (&meter) &tempo style=(&(map=style sync=.3 harm=.2 bite=.2) * .75 | [&spooky + &(map=style bite=-.08)] * .75) meter="6/8"
&bar from (&meter) &tempo style=&(map=style sync=.7 harm=.6 bite=0) * .75 meter="12/8"
&bar from (&meter) &tempo style=&(map=style sync=.2 harm=.6 bite=.9) * .75 meter="4/4 in 2"
&bar meter(&meter) step=&tempo
&meter "4/4"
\`\`\`

The bar: the common meters, straight (#902, decision 103). \`&bar\` is the meter its text argument writes (\`meter(&meter)\`, a text cell, decision 101) at the text's tempo: \`&bar from bar &tempo\` is 4/4, \`&bar from bar(meter="3/4") &tempo\` a waltz's bar, \`&bar from bar(meter="4/4 in 2") &tempo\` alla breve (decision 102). Its swing is the head's, set where a use writes it (\`&bar swing=8n:2/3 from bar &tempo\`, decision 065 §4); a style's own feel is a fragment of its own that takes this one (\`funk_meter\`, \`swing_meter\`, \`lofi_meter\`), and the odd groupings are \`odd_meter\`.

**Its signature** (decision 065): \`&bar from (&meter) &tempo\`, \`&tempo\` its main argument, \`meter=\` a text, any \`meter("…")\` reads.

Its points name the styles it is at (decision 099: a meter's \`&funk\` is Funk's sync, harm and bite), so the style space's straight 4/4 is the fourteen styles of the first line, Ambient's among them, its sixteenths' lean of 31/60 dropped (the owner, 2026-11-23). 3/4 is at Waltz's point and beside Spooky's (+.08 bite), 6/8 at a point of its own and beside Spooky's (−.08), 2/4 at March's and its own, 12/8 and alla breve at points of their own.

The meters placed for their own sake, and those beside a style, weigh 0.75, so each is still first where it was placed, and between two presets a preset's own meter is: on decision 076's axes a meter has three, and at weight 1 they crowded that space; at 0.5 they were chosen so rarely that their use stopped settling over a set (\`lockin.slow.test.ts\`) (#572).
`,"meters/funk_meter":`---
id: funk_meter
source: seed
---

\`\`\`cells
&bar from &tempo style=(&deepHouse | &funk | [&acid + &(map=style bite=.1)] * .5)
&bar meter("4/4") step=&tempo swing=16n:.6
\`\`\`

Funk's feel: the bar of 4/4, its sixteenths leaning, the second of each pair 60 % through their eighth (#902, decision 103). It is \`bar\`'s 4/4 with its swing written, \`&bar swing=16n:.6 from bar &tempo\` as one line (decision 065 §4), so its text holds itself: a host that reads it alone (a workbench, Jambot's meter reader) needs no library, and it is one cell.

At Deep house's and Funk's points, and beside Acid's (+.1 bite, its energy offset, #572) at half weight, so Acid's own straight bar stays first there.

**Its signature**: \`&bar from &tempo\`.
`,"meters/lofi_meter":`---
id: lofi_meter
source: seed
---

\`\`\`cells
&bar from &tempo style=&lofi
&bar meter("4/4") step=&tempo swing=16n:.65
\`\`\`

Lo-fi hip hop's feel: the bar of 4/4, its sixteenths leaning late, 65 % through their eighth, the lazy push of a beat played behind the grid (#902, decision 103). It is \`bar\`'s 4/4 with its swing written, \`&bar swing=16n:.65 from bar &tempo\` as one line (decision 065 §4), so its text holds itself: a host that reads it alone (a workbench, Jambot's meter reader) needs no library, and it is one cell.

At Lo-fi hip hop's point.

**Its signature**: \`&bar from &tempo\`.
`,"meters/odd_meter":`---
id: odd_meter
source: seed
---

\`\`\`cells
&bar from (&meter) &tempo style=(&(map=style sync=.4 harm=.9 bite=.5) * .75 | &spooky)
&bar from (&meter) &tempo style=&(map=style sync=.8 harm=.6 bite=1) * .75 meter="7/8"
&bar from (&meter) &tempo style=&(map=style sync=.6 harm=.9 bite=.8) * .75 meter="10/8"
&bar meter(&meter) step=&tempo
&meter "5/4"
\`\`\`

The odd meters: five beats, and the aksak's sevens and tens, their groups of 3 and 2 (#902, decision 103). Its head is \`bar\`'s, written out so its text holds itself (a host that reads it alone needs no library): \`&bar from odd_meter &tempo\` is 5/4, \`odd_meter(meter="7/8")\` the 3+2+2. An aksak swung on its pairs sets its swing on the head, its threes straight (decision 071): \`&bar swing=8n:2/3 from odd_meter(meter="7/8") &tempo\`.

5/4 is at Spooky's point, and at a point of its own at 0.75; 7/8 and 10/8 at points of their own, 0.75, as the meters placed for their own sake in \`bar\` are: no style holds them yet.

**Its signature**: \`&bar from (&meter) &tempo\`, \`meter=\` a text, as \`bar\`'s.
`,"meters/swing_meter":`---
id: swing_meter
source: seed
---

\`\`\`cells
&bar from &tempo style=(&bluesShuffle | &swingJazz | &electroSwing)
&bar meter("4/4") step=&tempo swing=8n:2/3
\`\`\`

Jazz's feel: the bar of 4/4, its eighths in triplet swing, the second of each pair two thirds through their beat (#902, decision 103; a group of three straight, decision 071). It is \`bar\`'s 4/4 with its swing written, \`&bar swing=8n:2/3 from bar &tempo\` as one line (decision 065 §4), so its text holds itself: a host that reads it alone (a workbench, Jambot's meter reader) needs no library, and it is one cell.

At Blues shuffle's, Swing jazz's and Electro swing's points.

**Its signature**: \`&bar from &tempo\`.
`,"modes/01-diatonic":"---\nid: diatonic\nsource: seed\n---\n\n```cells\n&key from (&mode) &tonic style=(&synthPop | &techno | &lofi | &acid | &happyHardcore | &elektro | &darkAmbient | &tripHop) mode=aeolian\n&key from (&mode) &tonic style=(&deepHouse | &funk | &seaShanty) mode=dorian\n&key from (&mode) &tonic style=(&ambient | &bossaNova | &swingJazz | &kinderlied | &baroque | &waltz | &march | &pop) mode=ionian\n&key from (&mode) &tonic style=(&(map=style sync=.875 harm=.485 bite=.65 mood=.75) | &bluesShuffle | &salsa) mode=mixolydian\n&key from (&mode) &tonic style=(&(map=style sync=.6 harm=.6 bite=.7 mood=.375) | &(map=style sync=.35 harm=.15 bite=.5 mood=.1) * .5) mode=phrygian\n&key from (&mode) &tonic style=&(map=style sync=.15 harm=.6 bite=.15 mood=.9) mode=lydian\n&key from (&mode) &tonic style=&(map=style sync=.9 harm=1 bite=.6 mood=.3) mode=locrian\n&key scale(even(7, 12, &mode), &tonic)\n&mode major\n```\n\nThe diatonic key, its mode a parameter: the one source of the seven modes (#363, the owner's ruling B; #387, B1). The mode is a number, darkest to brightest, decision 013's phase (locrian 0, phrygian 1, aeolian or minor 2, dorian 3, mixolydian 4, ionian or major 5, lydian 6), and a mode word reads as its number, as a note name does (`C` is 0). Major unless the use says otherwise.\nIts scale is the diatonic necklace, written as one: `scale(even(7, 12, &mode), &tonic)`, the mode's number even's phase (decisions 072 and 093, #531); the library's names for the modes are generated by `even`, not typed (#507). A mode word is a phase of this necklace only: in another (`even(5, 12, &mode)`) it is an error that says its number.\nIt defines `&key`, the key (decision 060), and reads `&tonic`, its main argument, required: a default tonic plays a wrong key silently (#117). `&mode` is optional, its default `major`.\n\n**Each point says which mode it is** (`args: mode: …`): the mode Jambot's composer plays at a preset's point (`PRESETS`' `mode`, yggi/jambot packages/engine/src/style.ts), weight 1, so a query for the mode at one of them finds that mode first, at distance 0. A query answers with `diatonic(mode=aeolian)`, the fragment with its argument, which is how a `from` line takes it: `&key from diatonic(mode=aeolian) D`. Aeolian, the natural minor, is the mode the band opens in (`INITIAL_KEY`, A aeolian). Ionian is at Pop's point too (#947): a pop song is major. These were the seven mode fragments (`aeolian` … `locrian`), which read for one minor version as these (#387).\n\n**Its signature** (decision 065): `&key from (&mode) &tonic`. `&key from diatonic C` is C major; `&key from diatonic(mode=dorian) D` is D dorian; with the piece's own cells, `&key from diatonic(mode=&mode) &tonic` binds both, so a host's slider on either keeps working. A stepped mode changes at the bar lines (`&mode step=1m major dorian`: each bar the mode in force at its line, the tonic staying; decision 093 §5).\n","modes/05-bell-and-scale":"---\nid: bell_and_scale\nsource: seed\n---\n\n```cells\n&key, &bell, &agogo from &tonic style=&(map=style sync=.383 harm=.717 bite=.25 mood=.825)\n&key, &bell, &agogo from &tonic style=&(map=style sync=.8 harm=.1 bite=.9) facet=rhythm\n&key scale(even(7, 12, 5), &tonic) step=1m*7\n&bell step=&key:pulse &highagogo &highagogo:0:.5 &highagogo:0:.7 &highagogo:0:.5 &highagogo:0:.6 &highagogo:0:.5 &highagogo:0:.7\n&agogo [&bell * .5]\n```\n\nThe West African standard bell pattern, x.x.xx.x.x.x, seven strokes over twelve pulses, has the major scale's intervals, 2 2 1 2 2 2 1 (the example `bell_and_scale`): both are `even(7, 12, 5)`, the diatonic necklace at the ionian's phase (decision 072; `even.test.ts`).\nSo one cell is both, written as the necklace, `scale(even(7, 12, 5), &tonic)` (decision 093): `&key` is the major scale, the piece's main key, and stepped seven times a bar, each step as long as its interval, it is the bell's timeline, which `&bell` strikes (`step=&key:pulse`).\nThe repository's first fragment of two facets, a `mode`, ionian, and a `rhythm`, the bell, each at a place of its own: \"the bell is a world-music associated rhythm-facet and a western music associated harmony / scale-facet\" (the owner, decision 046).\n\nA stepped key that nothing plays doesn't turn, so a line over it (`over=&key`) reads the major scale as `&key scale(ionian, &tonic)` does, note for note; the tonic is left to the text that uses it, `&tonic`, as the mode fragments leave it (#290).\n`step=1m*7` lays the bell over the bar of any meter, as twelve twelfths: over 12/8 they are its pulses, the bell as it is played.\n\nSeven strokes of a high agogô (`&highagogo`, General MIDI's 67, a hole the General MIDI kit fills with its line), the example's accents, at half the level; its mix, `&agogo` (the level, no card: where its notes go is the workbench's, #291), is none of the drum bars' or the claves', so it layers on any of them.\nAs a rhythm its point is a timeline's: off the beat (sync 0.8), over one static chord (harm 0.1), struck (artic 0.9), steady and fairly dense (energy 0.6), where no preset is.\nAs a mode it is where the major is played: the centroid of the three presets that play ionian, Ambient's, Bossa nova's and Swing jazz's (each axis their mean, to three decimals), where no preset is, so at each of them the plain `ionian` is found first, at distance 0.\n\n**Its signature** (decision 065): `&key, &bell, &agogo from &tonic`. `&key, &bell, &agogo from bell_and_scale D` takes a copy of it, `&tonic` its main argument.\n","modes/06-harmonic-minor":"---\nid: harmonic_minor\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 2c120d4\n---\n\n```cells\n&key from &tonic style=(&electroSwing | &spooky | &chiptune)\n&key scale(harmonic, &tonic)\n```\n\nThe minor with a raised seventh: the gypsy jazz key of [Electro swing, in pieces](../../examples/electroswing.md), whose vamp's fifth is then a major chord, a dominant (`[4,6,8]` over D is A C♯ E), and whose line over it is the fifth's phrygian dominant.\nIt defines `&key`, the key (decision 047's interface name, decision 056, named since decision 060), and uses `&tonic`, a cell holding the key's tonic (`&tonic D`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (`over=&key`, then `over=&harm`).\nThe tonic is left to the text that uses it, a hole, as the other modes leave theirs.\n\nAt a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 1, Jambot's to adopt (decision 041); Jambot's composer has no harmonic minor among its modes yet (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts).\nAlso at the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1: the key of [Spooky, in pieces](../../examples/spooky.md), its augmented second between the sixth and the seventh the sound of a horror film's minor.\n\n**Its signature** (decision 065): `&key from &tonic`. `&key from harmonic_minor D` takes a copy of it, `&tonic` its main argument.\n","modules/01-osc":"---\nid: osc\nsource: seed\n---\n\n```cells\n&osc from (&pitch)\n&osc s=saw loop=C3 pitch=&pitch\n&pitch 0\n```\n\nAn oscillator, a modular's VCO (decision 067 §3): a voice, and its jack is its pitch.\nA voice is an oscillator already (`&saw s=saw loop=C2`); this fragment gives it a panel, so that every module of a patch is written, and drawn, alike.\n\n**Its jack**, `&pitch` (default `0`, no bend): a voice's own pitch on every note, in semitones (`pitch=`, sound.md), the input a modular's exponential FM is. Patch a slow wave into it for a drift or a vibrato: `osc(pitch=&(map=lin loop=&bar/4 0 .12 0))`, or the seed's `vibrato`.\n**Its wave and its register** are its head's: a saw on C3 where the use says nothing, and the use's own attributes before `from` where it does (decision 065 §4), `&sub s=square loop=C1 from osc(pitch=&drift)`. A wave is a word, not a cell, so it is no jack.\nIts notes come from the product that plays it, as any voice's do (`[&tune * &osc]`): a modular's 1 V/oct and gate are the melody's pitch and onsets ([nets.md](../../docs/notes/nets.md)).\n\n**Its signature** (decision 065): `&osc from (&pitch)`, no main parameter. `&lead from osc` takes a copy of it, named `&lead`.\n\nAssociated as the facet `module` with no point: a module is no style's, so no query finds it: a piece takes it by its name (decision 090). In a patch it is the VCO.\n","modules/02-lowpass":"---\nid: lowpass\nsource: seed\n---\n\n```cells\n&lowpass from (&cutoff, &res, &eg) &in\n&lowpass lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA resonant low-pass filter, a modular's VCF (decision 067 §3): an instrument whose sound parameters act on what its voices play, in series after each voice's own (decision 067 §1), so one filter follows a mix of oscillators.\n\n**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place, `&vcf from lowpass [&saw, &sub * .5]`.\n**Its jacks**, each a knob at its default when nothing is patched in, each a share from 0 to 1 of its range:\n- `&cutoff` (default `.5`): where the cutoff sits, from 70 Hz to 4800 Hz. Patch a slow wave in for a sweep (`cutoff=&sweep`, with `&sweep loop=&bar/16 from lfo`).\n- `&res` (default `.3`): the resonance, from 4 to 16 (`lpq=`, Web Audio's Q in dB): at the top it rings at the cutoff.\n- `&eg` (default held at 1, no contour): an envelope that opens it on every note, a modular's contour generator (`eg=&contour`, with `&contour map=adsr .002 .2 .1 .1`, or one of the seed's `envelopes`).\nThe three multiply, as a moving parameter's cells do (sound.md): an envelope scaled by the knob, the knob moved by the LFO.\n\n**Its signature** (decision 065): `&lowpass from (&cutoff, &res, &eg) &in`. A cable is a reference argument, the piece's own cell, so a slider on it keeps working through the filter. Patched into nothing, a jack is its knob.\nIts own attributes, before `from`, are the head's: `&vcf delay=.3 delaytime=&bar*3/16 from lowpass …` sends what it filters to an echo.\n\nAssociated as the facet `module` with no point: no style's (#540); in a patch it is the VCF.\n","modules/03-highpass":`---
id: highpass
source: seed
---

\`\`\`cells
&highpass from (&cutoff, &res, &eg) &in
&highpass hpf=20..2400 * &eg * &cutoff hpq=1..12 * &res [&in]
&cutoff map=lin .5
&res map=lin .1
&eg map=adsr 0 0 1 0
\`\`\`

A resonant high-pass filter (decision 067 §3), the low-pass's mirror: it takes away the lows of what its voices play, in series after each voice's own (decision 067 §1). A hat from white noise, a thin lead, the low end cleared from a pad.

**Its input**, the main parameter \`&in\`: what it filters, a voice or a mix written in place.
**Its jacks**, each a knob at its default when nothing is patched in, each a share from 0 to 1 of its range:
- \`&cutoff\` (default \`.5\`): from 20 Hz to 2400 Hz.
- \`&res\` (default \`.1\`): the resonance, from 1 to 12 (\`hpq=\`), nearly flat where nothing is patched.
- \`&eg\` (default held at 1): an envelope that moves the cutoff on every note.

**Its signature** (decision 065): \`&highpass from (&cutoff, &res, &eg) &in\`. A kind of filter is a word, and a parameter is a cell, so each kind is a fragment of its own (decision 067 §3), not one filter with a mode.

Associated as the facet \`module\` with no point: no style's (#540); in a patch, the high-pass (HPF).
`,"modules/04-amp":"---\nid: amp\nsource: seed\n---\n\n```cells\n&amp from (&eg, &level) &in\n&amp [&eg * &level * &in]\n&eg map=adsr .005 .2 .7 .1\n&level map=amp 1\n```\n\nAn amplifier, a modular's VCA (decision 067 §3): an instrument with an envelope and a level, the volumes that act on what it plays acting on each of its voices (mix.md: a pitch or a volume on a mix acts on each voice).\nIt is what an instrument with an envelope always was, `[&(map=adsr …) * &saw]`, with jacks.\n\n**Its input**, the main parameter `&in`: what it shapes, a voice, a filter, a mix.\n**Its jacks**:\n- `&eg` (default a struck and held shape: 5 ms up, a fall over .2 s to .7, a release of .1 s): the envelope on every note. An inline one is a cell of its own, `amp(eg=&(map=adsr .002 .3 .5 .06))`, its slots changed where it says; or one of the seed's `envelopes`, `amp(eg=&pluck)`.\n- `&level` (default `1`): a level over time, a volume (`map=amp`, `map=lin`, `map=db`): accents, a swell, a tremolo from a fast LFO.\n\n**Its signature** (decision 065): `&amp from (&eg, &level) &in`.\n\nAssociated as the facet `module` with no point: no style's (#540); in a patch it is the VCA.\n","modules/05-lfo":"---\nid: lfo\nsource: seed\n---\n\n```cells\n&lfo from\n&lfo map=lin loop=.5 sin(12, 0..1)\n```\n\nA low-frequency oscillator, a modular's LFO (decision 067 §3): a sine, ramped (`map=lin`) through its twelve points, turning once every two seconds, laid within 0 to 1 (`sin(12, 0..1)`, Strudel's `sine.range(0, 1)`): a share a jack reads, its middle at .5.\nAn LFO is a braid turned slowly, as a voice is one turned fast (sound.md): patched into a jack, it moves what the jack moves (`lowpass(cutoff=&sweep)`, `osc(pitch=&wobble)`).\n\n**Its rate** is its head's `loop=`, as any cell's: a use sets it before `from` (decision 065 §4), in seconds a lap or as a clock, so it keeps time with the piece: `&sweep loop=&bar/16 from lfo` comes round once every eight bars of 4/4, and `&wobble loop=&bar*2 from lfo` once a beat. Its shape is its braid; a use that wants another writes its own cell. A wave that runs below 0 (`saw(8)`, `tri(4)`) is cut off at 0 where a jack reads it, as any value is: lay it within a range, `saw(8, 0..1)`.\n\n**Its signature** (decision 065): `&lfo from`, the head alone. `&sweep from lfo` takes a copy of it, named `&sweep`.\n\nAssociated as the facet `module` with no point: no style's (#540); in a patch it is the LFO.\n","modules/06-sh":"---\nid: sh\nsource: seed\n---\n\n```cells\n&sh from\n&sh seed=4759538916879628 step=8n [0|.25|.5|.75|1]\n```\n\nA sample and hold, a modular's S&H (decision 067 §3): on every eighth a value from 0 to 1 is taken at random and held until the next, patched into a jack, `lowpass(res=&jitter)` with `&jitter from sh`.\nIts randomness is the language's own chance (decision 031): a choice `[a|b|c]`, drawn each lap, keyed on the seed, the cell, the lap and the step, so a piece plays the same each time it is played, and `seed=` gives another sequence. A level or a parameter draws it as a melody does (#457).\n\n**Its clock** is its head's `step=`: a use sets it before `from`, `&jitter step=16n from sh`, or patches a clock in by tapping another meter. Its five values are its braid: a use that wants others writes its own cell.\n\n**Its signature** (decision 065): `&sh from`, the head alone.\n\nAssociated as the facet `module` with no point: no style's (#540); in a patch it is the S&H.\n","modules/07-bandpass":"---\nid: bandpass\nsource: seed\n---\n\n```cells\n&bandpass from (&cutoff, &res, &eg) &in\n&bandpass bpf=100..5000 * &eg * &cutoff bpq=.5..12 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA band-pass filter (decision 074): it lets a band around its centre through and takes away what is above and below it, the third of superdough's filters after the low-pass and the high-pass. An instrument, as the `lowpass` module is (decision 067), in series after each voice's own filters.\n\n**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place, `&vcf from bandpass [&saw, &noise * .3]`.\n**Its jacks**, each a share from 0 to 1 of its range, at its default when nothing is patched in:\n- `&cutoff` (default `.5`): the band's centre, from 100 Hz to 5000 Hz. Patch a slow wave in for a sweep, a wah (`cutoff=&sweep`).\n- `&res` (default `.3`): its Q, from .5 to 12 (`bpq=`, read linearly as Web Audio's band-pass reads it: the centre over the bandwidth). Higher is a narrower band.\n- `&eg` (default held at 1): an envelope that moves the centre on every note.\n\n**Its signature** (decision 065): `&bandpass from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.\n\nAssociated as the facet `module` with no point: no style's (#540).\n","modules/08-lowpass24":"---\nid: lowpass24\nsource: seed\n---\n\n```cells\n&lowpass24 from (&cutoff, &res, &eg) &in\n&lowpass24 lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&stage]\n&stage lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA 24 dB low-pass (decision 074): two of the `lowpass` module's stages in series, each at the same cutoff and resonance, so it falls twice as steeply above its cutoff and rings harder at it. That is superdough's `24db` exactly, written out: two filters in a row are two stages (decision 067), so a steeper slope is a composition, not a new kind of filter.\n\n**Its input**, the main parameter `&in`: what it filters, `&vcf from lowpass24 [&saw, &sub * .5]`.\n**Its jacks** are the `lowpass` module's: `&cutoff` (default `.5`, 70 Hz to 4800 Hz), `&res` (default `.3`, 4 to 16, Web Audio's Q in dB, on each stage) and `&eg` (default held at 1). One cable moves both stages alike.\n**`&stage`** is its first stage, its own: each use of it has its own.\n\n**Its signature** (decision 065): `&lowpass24 from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.\n\nAssociated as the facet `module` with no point: no style's (#540).\n","modules/09-wander":"---\nid: wander\nsource: seed\n---\n\n```cells\n&wander from (&clock, &seed)\n&wander [&o0 * .015873 + &o1 * .031746 + &o2 * .063492 + &o3 * .126984 + &o4 * .253968 + &o5 * .507937]\n&clock step=.05hz 0\n&seed 0\n&s0 [&seed * 8 + 1]\n&s1 [&seed * 8 + 2]\n&s2 [&seed * 8 + 3]\n&s3 [&seed * 8 + 4]\n&s4 [&seed * 8 + 5]\n&s5 [&seed * 8 + 6]\n&o0 map=lin seed=&s0 step=&clock [0|.25|.5|.75|1]!256\n&o1 map=lin seed=&s1 step=&clock/2 [0|.25|.5|.75|1]!256\n&o2 map=lin seed=&s2 step=&clock/4 [0|.25|.5|.75|1]!256\n&o3 map=lin seed=&s3 step=&clock/8 [0|.25|.5|.75|1]!256\n&o4 map=lin seed=&s4 step=&clock/16 [0|.25|.5|.75|1]!256\n&o5 map=lin seed=&s5 step=&clock/32 [0|.25|.5|.75|1]!256\n```\n\nA slow wander, a noise with a memory (#571 step 4, #576, measured in `docs/notes/radio-walkers-measured.md`): six noises an octave apart, each a value from 0 to 1 drawn afresh at its step and ramped (`map=lin`) to the next, summed (decision 079) with the slowest weighing most, 1, 2, 4, 8, 16 and 32 parts of 63, so it moves a little each bar and a lot over an hour, and never leaves its range. A weight an octave doubled is a noise whose power falls as 1 / f², a random walk's, cut off at the slowest octave; equal weights would be pink noise, 1 / f (Voss and McCartney).\nPatched into a jack or read by a style's axis, `bite=.55 ± .35 * &drift` with `&drift from wander(clock=&section)`, it is a bounded offset around where a hand or a host has set the centre: over 3 hours, its largest change a bar is .012 of the axis at a window of ±.35 on a section's clock, and it remembers itself 136 sections of 8 bars.\n\n**Its clock** is the jack `&clock`, the rate of its fastest octave: a cell with a step, a draw every 20 seconds (`.05hz`) by default, and the other five run at its half, quarter, eighth, sixteenth and thirty-second, so the slowest turns every ten minutes. A piece ties it to its bars with a clock of its own, `&section step=1m/8 0` and `wander(clock=&section)`: a draw a section of eight bars, the slowest every 256 bars. Each noise is a lap of 256 draws, so its ramp meets a step (the language's rule, a braid's last value holds, #931) once in 256 steps, an hour or more at a section.\n**Its seed** is the jack `&seed`, a number (0 by default), and the six noises' seeds are derived from it, `&seed * 8 + 1` to `&seed * 8 + 6` (decision 105: a number read as the piece is built may be a cell, and a sum of numbers alone is one), so two wanders with seeds 0 and 1 share none and draw apart: `&dx from wander(seed=&sx)` and `&dy from wander(seed=&sy)` for two axes that must not move together. A copy given no seed is the module's own, 0, which draws what the module drew before it took one (decision 098 §4: cells that write the same seed draw alike).\n\n**Its signature** (decision 065): `&wander from (&clock, &seed)`, the head the sum and a jack each for its clock and its seed.\n\nAssociated as the facet `module` with no point: no style's (#540); in a patch it is a slow random source beside `lfo` and `sh`.\n","motifs/01-hook":"---\nid: hook\nsource: seed\n---\n\n```cells\n&hook from &key style=(&synthPop | &pop)\n&hook over=&key step=8n 4 4 3 2@2 ~ 0 2\n```\n\nA pop hook: the fifth twice, stepping down to the third and held, a breath, then the tonic and up a step, so it asks to come round again. Written by hand for Synth-pop's minor (aeolian), its sung, fairly short notes.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&hook`), so `use &hook` takes it; a form reads it as its `&call` (`&call step=8n &hook`), the line the form moves and answers.\n\nAt Synth-pop's point (`styles`) and at Pop's (#947), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&hook from &key`. `&hook from hook &key` takes a copy of it, `&key` its main argument.\n","motifs/02-octaves":"---\nid: octaves\nsource: seed\n---\n\n```cells\n&octaves from &key style=&techno\n&octaves over=&key step=8n 0 ~ 7 ~ 0 0 ~ 7\n```\n\nThe tonic and its octave, struck short on and off the beat: the line a techno track rides a filter over, its pitch all in two notes. Written by hand for Techno, where the harmony stands still and every note is staccato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&octaves`), so `use &octaves` takes it; a form reads it as its `&call` (`&call step=8n &octaves`), the line the form moves and answers.\n\nAt Techno's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&octaves from &key`. `&octaves from octaves &key` takes a copy of it, `&key` its main argument.\n","motifs/03-sigh":"---\nid: sigh\nsource: seed\n---\n\n```cells\n&sigh from &key style=&deepHouse\n&sigh over=&key step=8n 4@3 3 2@2 ~ ~\n```\n\nA sigh: the fifth held, falling by step to the third and held again, then two beats of air. Written by hand for Deep house's dorian, a vocal hook's shape over a vamp.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&sigh`), so `use &sigh` takes it; a form reads it as its `&call` (`&call step=8n &sigh`), the line the form moves and answers.\n\nAt Deep house's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&sigh from &key`. `&sigh from sigh &key` takes a copy of it, `&key` its main argument.\n","motifs/04-rising":"---\nid: rising\nsource: seed\n---\n\n```cells\n&rising from &key style=&ambient\n&rising over=&key step=8n 0@2 2@2 4@4\n```\n\nThe triad rising slowly, tonic, third, fifth, the last held half the bar: the owner's own example of a motif's name (#288). Written by hand for Ambient, legato and sparse.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&rising`), so `use &rising` takes it; a form reads it as its `&call` (`&call step=8n &rising`), the line the form moves and answers.\n\nAt Ambient's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&rising from &key`. `&rising from rising &key` takes a copy of it, `&key` its main argument.\n","motifs/05-lazy":"---\nid: lazy\nsource: seed\n---\n\n```cells\n&lazy from &key style=&lofi\n&lazy over=&key step=8n ~ 2 4 ~ 3@2 2 0\n```\n\nLate in, up to the fifth, then down by step to the tonic, the fourth held: a lazy line behind the beat. Written by hand for Lo-fi hip hop's minor, its swung eighths.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lazy`), so `use &lazy` takes it; a form reads it as its `&call` (`&call step=8n &lazy`), the line the form moves and answers.\n\nAt Lo-fi hip hop's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&lazy from &key`. `&lazy from lazy &key` takes a copy of it, `&key` its main argument.\n","motifs/06-riff":"---\nid: riff\nsource: seed\n---\n\n```cells\n&riff from &key style=&funk\n&riff over=&key step=8n 0 ~ 3 0 ~ 4 3 ~\n```\n\nA funk riff: the tonic, the fourth and the fifth, all off and on the beat in short strokes. Written by hand for Funk's dorian, at its most syncopated and staccato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&riff`), so `use &riff` takes it; a form reads it as its `&call` (`&call step=8n &riff`), the line the form moves and answers.\n\nAt Funk's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&riff from &key`. `&riff from riff &key` takes a copy of it, `&key` its main argument.\n","motifs/07-tresillo":"---\nid: tresillo\nsource: seed\n---\n\n```cells\n&tresillo from &key style=&bossaNova\n&tresillo over=&key step=8n 4@3 2@3 0@2\n```\n\nThe fifth, the third and the tonic falling on the tresillo's 3 + 3 + 2. Written by hand for Bossa nova, its melody on the clave's long-long-short.\nIts durations, 3 3 2 eighths, are `even(3, 8, 2)`, three as even as three go over eight (decision 072; `even.test.ts`); the cinquillo is its five, `even(5, 8, 2)`.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&tresillo`), so `use &tresillo` takes it; a form reads it as its `&call` (`&call step=8n &tresillo`), the line the form moves and answers.\n\nAt Bossa nova's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&tresillo from &key`. `&tresillo from tresillo &key` takes a copy of it, `&key` its main argument.\n","motifs/08-bebop":"---\nid: bebop\nsource: seed\n---\n\n```cells\n&bebop from &key style=&swingJazz\n&bebop over=&key step=8n 0 2 4 6 7@2 6 4\n```\n\nUp the seventh chord to the octave, held, and back down through the seventh: a bebop arpeggio. Written by hand for Swing jazz, where the harmony moves most.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&bebop`), so `use &bebop` takes it; a form reads it as its `&call` (`&call step=8n &bebop`), the line the form moves and answers.\n\nAt Swing jazz's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&bebop from &key`. `&bebop from bebop &key` takes a copy of it, `&key` its main argument.\n","motifs/09-gypsy":"---\nid: gypsy\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 7622a87\n---\n\n```cells\n&gypsy from &key style=&electroSwing\n&gypsy over=&key step=8n 4 5 6 7@2 6 4@2\n```\n\nThe clarinet's call of [Electro swing, in pieces](../../examples/electroswing.md): A B♭ C♯ D and back to A in D harmonic minor, the fifth climbing through the minor sixth and the leading note to the octave, gypsy jazz's run.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&gypsy`), so `use &gypsy` takes it; a form reads it as its `&call` (`&call step=8n &gypsy`), the line the form moves and answers.\n\nAt the point proposed for an Electro swing preset (sync 0.55, harm 0.75, bite 0.6, mood 0.5), as the example's other seeds are: Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&gypsy from &key`. `&gypsy from gypsy &key` takes a copy of it, `&key` its main argument.\n","motifs/10-dies-irae":"---\nid: diesIrae\nsource: seed\n---\n\n```cells\n&diesIrae from &key style=&spooky\n&diesIrae over=&key step=8n 2 1 2 0 1 -1 0@2\n```\n\nThe head of the *Dies irae*, the plainchant of the day of wrath, which Berlioz, Liszt, Saint-Saëns and a century of horror films quote: the third, the second, the third, the tonic, the second, the note below the tonic, and the tonic held (F E F D E C D in D minor; C♯ in harmonic minor, which makes it darker still). The chant is in the public domain.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&diesIrae`), so `use &diesIrae` takes it; a form reads it as its `&call` (`&call step=8n &diesIrae`), the line the form moves and answers.\nAt the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1, Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&diesIrae from &key`. `&diesIrae from diesIrae &key` takes a copy of it, `&key` its main argument.\n","motifs/11-refrain":"---\nid: refrain\nsource: seed\n---\n\n```cells\n&refrain from &key style=[&synthPop + &(map=style bite=.1)]\n&refrain over=&key step=8n 2 2 2 4@2 3 2 0\n```\n\nThe refrain under the hook: the third three times, up to the fifth and held, then stepping down home. Written by hand for Synth-pop's minor (aeolian), a sung line that lands where the hook only asks.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&refrain`), so `use &refrain` takes it; a form reads it as its `&call` (`&call step=8n &refrain`), the line the form moves and answers.\n\nNear Synth-pop's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `hook` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&refrain from &key`. `&refrain from refrain &key` takes a copy of it, `&key` its main argument.\n","motifs/12-pulse":"---\nid: pulse\nsource: seed\n---\n\n```cells\n&pulse from &key style=[&techno + &(map=style bite=-.1)]\n&pulse over=&key step=8n 0 ~ 0 ~ 2 ~ 0 ~\n```\n\nThe tonic struck on every beat and the third once, all short: a line that is mostly rhythm, as a techno lead is. Written by hand for Techno, where the harmony stands still.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&pulse`), so `use &pulse` takes it; a form reads it as its `&call` (`&call step=8n &pulse`), the line the form moves and answers.\n\nNear Techno's point, 0.1 lower in bite (its energy offset, #572, the other way: Techno's bite is 1), so a query there finds `octaves` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&pulse from &key`. `&pulse from pulse &key` takes a copy of it, `&key` its main argument.\n","motifs/13-soul":"---\nid: soul\nsource: seed\n---\n\n```cells\n&soul from &key style=[&deepHouse + &(map=style bite=.1)]\n&soul over=&key step=8n 4 ~ 4 3 4@2 2@2\n```\n\nThe fifth twice, a turn through the fourth and back, then down to the third and held: a vocal ad lib over a vamp. Written by hand for Deep house's dorian.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&soul`), so `use &soul` takes it; a form reads it as its `&call` (`&call step=8n &soul`), the line the form moves and answers.\n\nNear Deep house's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `sigh` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&soul from &key`. `&soul from soul &key` takes a copy of it, `&key` its main argument.\n","motifs/14-drift":"---\nid: drift\nsource: seed\n---\n\n```cells\n&drift from &key style=[&ambient + &(map=style bite=.1)]\n&drift over=&key step=8n 4@4 3@4\n```\n\nTwo notes, the fifth and the fourth, half a bar each: a line that barely moves, legato and sparse. Written by hand for Ambient.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&drift`), so `use &drift` takes it; a form reads it as its `&call` (`&call step=8n &drift`), the line the form moves and answers.\n\nNear Ambient's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `rising` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&drift from &key`. `&drift from drift &key` takes a copy of it, `&key` its main argument.\n","motifs/15-dusty":"---\nid: dusty\nsource: seed\n---\n\n```cells\n&dusty from &key style=[&lofi + &(map=style bite=.1)]\n&dusty over=&key step=8n ~ 0 2 ~ 4 2@3\n```\n\nLate in on the tonic, up through the third to the fifth and back to the third, held to the bar's end: a line that sits behind the beat. Written by hand for Lo-fi hip hop's minor and its swung eighths.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&dusty`), so `use &dusty` takes it; a form reads it as its `&call` (`&call step=8n &dusty`), the line the form moves and answers.\n\nNear Lo-fi hip hop's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `lazy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&dusty from &key`. `&dusty from dusty &key` takes a copy of it, `&key` its main argument.\n","motifs/16-slap":"---\nid: slap\nsource: seed\n---\n\n```cells\n&slap from &key style=[&funk + &(map=style bite=.1)]\n&slap over=&key step=8n 0 0 ~ 6 0 ~ 4 ~\n```\n\nThe tonic twice, the flat seventh off the beat, the tonic, then the fifth: short and syncopated, the bass player's lick taken up by the lead. Written by hand for Funk's dorian.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&slap`), so `use &slap` takes it; a form reads it as its `&call` (`&call step=8n &slap`), the line the form moves and answers.\n\nNear Funk's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `riff` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&slap from &key`. `&slap from slap &key` takes a copy of it, `&key` its main argument.\n","motifs/17-saudade":"---\nid: saudade\nsource: seed\n---\n\n```cells\n&saudade from &key style=[&bossaNova + &(map=style bite=.1)]\n&saudade over=&key step=8n 2 ~ 3 2 ~ 1 0@2\n```\n\nThe third, the fourth and back, then falling by step to the tonic and held: a sigh between the guitar's chords. Written by hand for Bossa nova.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&saudade`), so `use &saudade` takes it; a form reads it as its `&call` (`&call step=8n &saudade`), the line the form moves and answers.\n\nNear Bossa nova's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `tresillo` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&saudade from &key`. `&saudade from saudade &key` takes a copy of it, `&key` its main argument.\n","motifs/18-blue":"---\nid: blue\nsource: seed\n---\n\n```cells\n&blue from &key style=[&swingJazz + &(map=style bite=.1)]\n&blue over=&key step=8n 4 3 2 1 0@2 -2@2\n```\n\nDown the scale from the fifth to the tonic and on to the sixth below, held: the line that ends a chorus on the sixth. Written by hand for Swing jazz.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&blue`), so `use &blue` takes it; a form reads it as its `&call` (`&call step=8n &blue`), the line the form moves and answers.\n\nNear Swing jazz's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `bebop` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&blue from &key`. `&blue from blue &key` takes a copy of it, `&key` its main argument.\n","motifs/19-lindy":"---\nid: lindy\nsource: seed\n---\n\n```cells\n&lindy from &key style=[&electroSwing + &(map=style bite=.1)]\n&lindy over=&key step=8n 0@3 4@3 2@2\n```\n\nThe tonic, the fifth and the third on the Charleston's 3 + 3 + 2, as a Lindy hop dances it: the swing era's dance, which electro swing samples. Written by hand for Electro swing's harmonic minor.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lindy`), so `use &lindy` takes it; a form reads it as its `&call` (`&call step=8n &lindy`), the line the form moves and answers.\n\nNear Electro swing's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `gypsy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&lindy from &key`. `&lindy from lindy &key` takes a copy of it, `&key` its main argument.\n","motifs/20-toll":"---\nid: toll\nsource: seed\n---\n\n```cells\n&toll from &key style=[&spooky + &(map=style bite=.1)]\n&toll over=&key step=8n 0@4 -3@4\n```\n\nA bell tolling: the tonic, then the fifth below, half a bar each. Written by hand for Spooky, the knell before the chant.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&toll`), so `use &toll` takes it; a form reads it as its `&call` (`&call step=8n &toll`), the line the form moves and answers.\n\nNear Spooky's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `diesIrae` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&toll from &key`. `&toll from toll &key` takes a copy of it, `&key` its main argument.\n","motifs/21-waltz":"---\nid: waltzBar\nsource: seed\n---\n\n```cells\n&waltzBar from &key style=&waltz\n&waltzBar over=&key step=8n 0@2 2 4 4@2\n```\n\nThe tonic held on the downbeat, then the third and the fifth, the fifth held into the next bar: a waltz's long first beat and its two light ones.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&waltzBar`), so `&waltzBar from waltzBar &key` takes it; a form reads it as its `&call` (`&call step=8n &waltzBar`), the line the form moves and answers.\n\nAt 3/4's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&waltzBar from &key`. `&waltzBar from waltzBar &key` takes a copy of it, `&key` its main argument.\n","motifs/22-music-box":"---\nid: musicBox\nsource: seed\n---\n\n```cells\n&musicBox from &key style=&(map=style sync=.2 harm=.9 bite=.38 mood=.3)\n&musicBox over=&key step=8n 4 3 4 1 2@2\n```\n\nThe fifth, the fourth and the fifth again, then down to the second and the third held: a music box running down, in three. Near Spooky, where 3/4 is found.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&musicBox`), so `use &musicBox` takes it; a form reads it as its `&call` (`&call step=8n &musicBox`), the line the form moves and answers.\n\nAt 3/4's point near Spooky (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&musicBox from &key`. `&musicBox from musicBox &key` takes a copy of it, `&key` its main argument.\n","motifs/23-rocking":"---\nid: rocking\nsource: seed\n---\n\n```cells\n&rocking from &key style=&(map=style sync=.3 harm=.2 bite=.2 mood=.825)\n&rocking over=&key step=8n 0@2 2 4@2 2\n```\n\nLong, short, long, short: a cradle's rock in two groups of three, from the tonic to the fifth and back to the third.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 6/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&rocking`), so `use &rocking` takes it; a form reads it as its `&call` (`&call step=8n &rocking`), the line the form moves and answers.\n\nAt 6/8's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&rocking from &key`. `&rocking from rocking &key` takes a copy of it, `&key` its main argument.\n","motifs/24-sway":"---\nid: sway\nsource: seed\n---\n\n```cells\n&sway from &key style=&(map=style sync=.2 harm=.9 bite=.22 mood=.3)\n&sway over=&key step=8n 0@3 -1 -2 -1\n```\n\nThe tonic held for half the bar, then a slow wobble down a step, two steps and back: a candle's flame in 6/8. Near Spooky, where 6/8 is found.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 6/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&sway`), so `use &sway` takes it; a form reads it as its `&call` (`&call step=8n &sway`), the line the form moves and answers.\n\nAt 6/8's point near Spooky (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&sway from &key`. `&sway from sway &key` takes a copy of it, `&key` its main argument.\n","motifs/25-fivefold":"---\nid: fivefold\nsource: seed\n---\n\n```cells\n&fivefold from &key style=&(map=style sync=.4 harm=.9 bite=.5 mood=.3)\n&fivefold over=&key step=8n 0 2 4@4 3 2 1@2\n```\n\nUp the triad to the fifth and held, the bar's first three beats, then down by step through its last two: five beats grouped 3 + 2.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 5/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&fivefold`), so `use &fivefold` takes it; a form reads it as its `&call` (`&call step=8n &fivefold`), the line the form moves and answers.\n\nAt 5/4's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&fivefold from &key`. `&fivefold from fivefold &key` takes a copy of it, `&key` its main argument.\n","motifs/26-limp":"---\nid: limp\nsource: seed\n---\n\n```cells\n&limp from &key style=&(map=style sync=.8 harm=.6 bite=1 mood=.375)\n&limp over=&key step=8n 0 ~ 4 ~ 3 2 0\n```\n\nThe tonic, the fifth, then a run down to the tonic: short notes in 7/8's 2 + 2 + 3, the last group the long one.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 7/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&limp`), so `use &limp` takes it; a form reads it as its `&call` (`&call step=8n &limp`), the line the form moves and answers.\n\nAt 7/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&limp from &key`. `&limp from limp &key` takes a copy of it, `&key` its main argument.\n","motifs/27-dancer":"---\nid: dancer\nsource: seed\n---\n\n```cells\n&dancer from &key style=&(map=style sync=.6 harm=.9 bite=.8 mood=.5)\n&dancer over=&key step=8n 0 ~ 2 4 ~ 5 4 2 1 0\n```\n\nTen eighths as 3 + 3 + 2 + 2: a leap up to the sixth in the threes, then stepping home in the twos.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 10/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&dancer`), so `use &dancer` takes it; a form reads it as its `&call` (`&call step=8n &dancer`), the line the form moves and answers.\n\nAt 10/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&dancer from &key`. `&dancer from dancer &key` takes a copy of it, `&key` its main argument.\n","motifs/28-shuffle":"---\nid: shuffle\nsource: seed\n---\n\n```cells\n&shuffle from &key style=&(map=style sync=.7 harm=.6 bite=0 mood=.825)\n&shuffle over=&key step=8n 0@2 2 3@2 4 4@2 2 0@2 ~\n```\n\nLong, short four times over the bar's four beats: the tonic, the third, the fourth, the fifth and back, a slow blues shuffle in 12/8.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 12/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&shuffle`), so `use &shuffle` takes it; a form reads it as its `&call` (`&call step=8n &shuffle`), the line the form moves and answers.\n\nAt 12/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&shuffle from &key`. `&shuffle from shuffle &key` takes a copy of it, `&key` its main argument.\n","motifs/29-march":"---\nid: march\nsource: seed\n---\n\n```cells\n&march from &key style=(&(map=style sync=0 harm=.1 bite=.6 mood=.45) | &march)\n&march over=&key step=8n 4 4 0 ~\n```\n\nThe fifth twice, then the tonic, and a rest: a march's call, two beats to the bar.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 2/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&march`), so `use &march` takes it; a form reads it as its `&call` (`&call step=8n &march`), the line the form moves and answers.\n\nAt 2/4's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&march from &key`. `&march from march &key` takes a copy of it, `&key` its main argument.\n\n**At March's point too** (#542), weight 1, so the style finds it first.\n","motifs/30-fanfare":"---\nid: fanfare\nsource: seed\n---\n\n```cells\n&fanfare from &key style=&(map=style sync=.2 harm=.6 bite=.9 mood=.6)\n&fanfare over=&key step=8n 0 0 0 2@2 4@2 ~\n```\n\nThe tonic three times, then the third and the fifth held: a fanfare's call, in two half-note beats.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4 alla breve: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&fanfare`), so `use &fanfare` takes it; a form reads it as its `&call` (`&call step=8n &fanfare`), the line the form moves and answers.\n\nAt 4/4 alla breve's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&fanfare from &key`. `&fanfare from fanfare &key` takes a copy of it, `&key` its main argument.\n","motifs/31-question":"---\nid: question\nsource: seed\n---\n\n```cells\n&question from &key style=&(map=style sync=.75 harm=.35 bite=.65)\n&question over=&key step=8n 0 1 2@2 4@4\n```\n\nUp by step to the third, then a leap to the fifth held half the bar: a phrase that ends open, asking for an answer.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&question`), so `use &question` takes it; a form reads it as its `&call` (`&call step=8n &question`), the line the form moves and answers.\n\nWeight 1, as the facet `motif`, where call and answer is (below).\n\n**Its signature** (decision 065): `&question from &key`. `&question from question &key` takes a copy of it, `&key` its main argument.\n\n**Where it is found** (#540): where call and answer's idiom is (its form's point, #655: offbeat, little harmony, struck; naming no mood), since it is a call. It stood at the centre, `.5 .5 .5 .5`, for \"any style\".\n","motifs/32-reply":"---\nid: reply\nsource: seed\n---\n\n```cells\n&reply from &key style=&(map=style sync=.5 harm=.5 bite=.5 mood=.45)\n&reply over=&key step=8n 4 3 2@2 0@4\n```\n\nDown by step from the fifth to the third, then home to the tonic held half the bar: the closed answer to `question`. General-purpose.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&reply`), so `use &reply` takes it; a form reads it as its `&call` (`&call step=8n &reply`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in energy (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&reply from &key`. `&reply from reply &key` takes a copy of it, `&key` its main argument.\n","motifs/33-arpeggio":"---\nid: arpeggio\nsource: seed\n---\n\n```cells\n&arpeggio from &key style=&(map=style sync=.5 harm=.3 bite=.5 mood=.5)\n&arpeggio over=&key step=8n 0 2 4 7 4 2 0 ~\n```\n\nUp the triad to the octave and back down: the plainest line a chord gives. General-purpose, for plainer harmony.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&arpeggio`), so `use &arpeggio` takes it; a form reads it as its `&call` (`&call step=8n &arpeggio`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in harmony (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&arpeggio from &key`. `&arpeggio from arpeggio &key` takes a copy of it, `&key` its main argument.\n","motifs/34-run":"---\nid: run\nsource: seed\n---\n\n```cells\n&run from &key style=&(map=style sync=.5 harm=.7 bite=.5 mood=.5)\n&run over=&key step=8n 0 1 2 3 4 5 6 7\n```\n\nThe scale from the tonic to the octave, one note an eighth: in each mode it walks that mode. General-purpose, for richer harmony.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&run`), so `use &run` takes it; a form reads it as its `&call` (`&call step=8n &run`), the line the form moves and answers.\n\nAt the centre, 0.2 higher in harmony (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&run from &key`. `&run from run &key` takes a copy of it, `&key` its main argument.\n","motifs/35-neighbour":"---\nid: neighbour\nsource: seed\n---\n\n```cells\n&neighbour from &key style=&(map=style sync=.5 harm=.5 bite=.3 mood=.5)\n&neighbour over=&key step=8n 0 1 0 -1 0@4\n```\n\nThe tonic, the note above, the tonic, the note below, and the tonic held: the neighbour notes round one pitch. General-purpose, legato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&neighbour`), so `use &neighbour` takes it; a form reads it as its `&call` (`&call step=8n &neighbour`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in articulation (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&neighbour from &key`. `&neighbour from neighbour &key` takes a copy of it, `&key` its main argument.\n","motifs/36-leap":"---\nid: leap\nsource: seed\n---\n\n```cells\n&leap from &key style=&(map=style sync=.5 harm=.5 bite=.7 mood=.65)\n&leap over=&key step=8n 0@2 4@2 3 2 1 0\n```\n\nThe tonic, a leap to the fifth, then stepping back down the scale: a leap balanced by steps. General-purpose, short notes.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&leap`), so `use &leap` takes it; a form reads it as its `&call` (`&call step=8n &leap`), the line the form moves and answers.\n\nAt the centre, 0.2 higher in articulation (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&leap from &key`. `&leap from leap &key` takes a copy of it, `&key` its main argument.\n","motifs/37-wail":"---\nid: wail\nsource: seed\n---\n\n```cells\n&wail from &key style=[&spooky + &(map=style bite=-.03)]\n&wail over=&key step=8n 4@3 3#@2 3@3\n```\n\nA held note that sags: the fifth held, then a semitone lower and a semitone lower again, as a ghost's moan bends down (A, G♯, G in D harmonic minor).\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&wail`), so `use &wail` takes it; a form reads it as its `&call` (`&call step=8n &wail`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.03 lower in bite (#674: its energy offset, #572, would put it on `lament`'s point, 0.05 lower; its articulation above `lament`'s keeps them apart, as on the old axes), weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&wail from &key`. `&wail from wail &key` takes a copy of it, `&key` its main argument.\n","motifs/38-haunt":"---\nid: haunt\nsource: seed\n---\n\n```cells\n&haunt from &key style=&(map=style sync=.15 harm=.9 bite=.25 mood=.3)\n&haunt over=&key step=8n 2 4 6 9 6 4 2@2\n```\n\nThe augmented triad on the third, up and back: the third, the fifth, the seventh, the third an octave up, and down again, each step a major third, so no note sounds like home. It is augmented only over a key that raises its seventh: in D harmonic minor it is F A C♯ F C♯ A F; over aeolian (D minor) the seventh is C, and it is a plain major triad, F A C. The line writes degrees (2 4 6), so the raise is the key's, not the line's. It is also `arpeggio`'s shape two degrees up (`0 2 4 7 4 2 0 ~`), its last note held where the arpeggio rests; the two are told apart by the recogniser (each is recognised as itself at distance 0), and `haunt` is placed for Spooky, where the key is harmonic minor.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&haunt`), so `use &haunt` takes it; a form reads it as its `&call` (`&call step=8n &haunt`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in sync and bite, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&haunt from &key`. `&haunt from haunt &key` takes a copy of it, `&key` its main argument.\n","motifs/39-lament":"---\nid: lament\nsource: seed\n---\n\n```cells\n&lament from &key style=&(map=style sync=.2 harm=.9 bite=.25 mood=.3)\n&lament over=&key step=8n 4 3# 3 2# 2 1 0@2\n```\n\nA chromatic descent from the fifth to the tonic, semitone by semitone where the key allows (A G♯ G F♯ F E D in D harmonic minor): the lament's falling line, made to creep.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lament`), so `use &lament` takes it; a form reads it as its `&call` (`&call step=8n &lament`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&lament from &key`. `&lament from lament &key` takes a copy of it, `&key` its main argument.\n","motifs/40-peek":"---\nid: peek\nsource: seed\n---\n\n```cells\n&peek from &key style=[&spooky + &(map=style sync=.1)]\n&peek over=&key step=8n ~ 0 1b 0 ~ ~ -1 0\n```\n\nSomething peeks and hides: a rest, the tonic and the flat second above it and back, a silence, then the leading note below and the tonic (D E♭ D, C♯ D): the semitones on either side of home, the boo that comes when the back is turned.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&peek`), so `use &peek` takes it; a form reads it as its `&call` (`&call step=8n &peek`), the line the form moves and answers.\nIts two rests are written apart (`~ ~`), not held (`~@2`), which plays the same: cells' vary reads no line with a held rest, so it would offer no variation of it, and the recogniser no answer.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.1 higher in sync (its bite Spooky's own: the energy offset of #572 its prose once named isn't in its numbers, which are kept), weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&peek from &key`. `&peek from peek &key` takes a copy of it, `&key` its main argument.\n","motifs/47-rave-hook":`---
id: raveHook
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&raveHook from &key style=&happyHardcore
&raveHook over=&key step=8n 11!2 13 11 10 9 10@2
\`\`\`

The hook of [Hypercell](../../examples/hypercell.md), its first bar: an upper note struck twice, a leap a third up, and down by step to rest a beat. The example writes it in semitones over C; here it is in the degrees of a minor key, so it sits in any key it is given.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1, as the facet \`motif\` (#572).
`,"motifs/48-sequencer":`---
id: sequencer
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&sequencer from &key style=&elektro
&sequencer over=&key step=8n 0 2 4 7 0 2 4 7
\`\`\`

The sequencer arpeggio of [Zelluläre Aktivität](../../examples/zell.md): the triad and its octave, up, twice a bar in eighths, the sequencer's figure (the example runs it in sixteenths, four times a bar; a motif is a bar of eighths, as every form reads it).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`motif\` (#572).
`,"motifs/49-melodie":`---
id: melodie
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&melodie from &key style=&(map=style sync=.15 harm=.5 bite=.75 mood=.45)
&melodie over=&key step=8n 4@2 2 1 0@4
\`\`\`

The melody of [Zelluläre Aktivität](../../examples/zell.md), its first bar: the fifth held, down by step to the tonic, held half the bar, plain over the arpeggio.

Near Elektro's point, 0.1 lower in bite (sync .15, harm .5, bite .75, mood .45), weight 1, as the facet \`motif\`, so a query there finds \`sequencer\` first and this one 0.05 away (#572).
`,"motifs/50-ghost-phrase":`---
id: ghostPhrase
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&ghostPhrase from &key style=&darkAmbient
&ghostPhrase over=&key step=8n 0 4 3 ~ 7 5 ~ ~
\`\`\`

The piano's phrase of [Ghost-Cells](../../examples/ghosts.md): the tonic, the fifth, the fourth, the octave and the sixth, with rests between. The example plays it seven eighths long over a bar of eight, so it comes round a step later each bar; as a motif it is one bar of eighths, its eighth a rest, as every form reads one.

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1), weight 1, as the facet \`motif\` (#572).
`,"motifs/51-royal-theme":`---
id: royalTheme
source: seed
lifted: yggi/cells examples/ricercar.md @ 3504291b
---

\`\`\`cells
&royalTheme from &key style=&baroque
&royalTheme over=&key step=8n 0@2 2@2 4@2 5@2
\`\`\`

The King's theme of [Ricercar](../../examples/ricercar.md), its first bar: the tonic, the third, the fifth and the sixth, a quarter each, rising, the subject Frederick the Great gave Bach for the *Musical Offering*. Public domain.

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 1, as the facet \`motif\` (#542).
`,"motifs/52-blues-riff":`---
id: bluesRiff
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&bluesRiff from &key style=&bluesShuffle
&bluesRiff over=&key step=8n 0 2 3 4 ~ 6 4 ~
\`\`\`

The riff of [Swing blues](../../examples/jazz.md), its first bar: up from the tonic to the fifth, a leap to the seventh and back. The example plays it on the blues scale, its blue notes included; here it is in the key's degrees, so a mixolydian key gives it its flat seventh.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 1, as the facet \`motif\` (#542).
`,"motifs/53-drunken-sailor":`---
id: drunkenSailor
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&drunkenSailor from &key style=&seaShanty
&drunkenSailor over=&key step=8n 4 4 4 4 4 4 0 2
\`\`\`

The tune of [Drunken Sailor](../../examples/sailor.md), its first bar: the fifth struck six times, *what shall we do with the*, then down to the tonic and up a third. A traditional sea shanty, public domain, in its dorian key.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65), weight 1, as the facet \`motif\` (#542).
`,"motifs/54-korobeiniki":`---
id: korobeinikiBar
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&korobeinikiBar from &key style=&chiptune
&korobeinikiBar over=&key step=8n 7@2 2 3 5@2 3 2
\`\`\`

The tune of [Korobeiniki](../../examples/korobeiniki.md), its first bar: the octave held, a leap down to the third, up by step to the fifth and back. A Russian folk song, public domain, known to many from a falling-blocks video game.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55), weight 1, as the facet \`motif\` (#542).
`,"motifs/55-guajeo":"---\nid: guajeo\nsource: seed\n---\n\n```cells\n&guajeo from &key style=&salsa\n&guajeo over=&key step=8n ~ 2 4 ~ 2 4 ~ 7\n```\n\nA guajeo, the piano's ostinato in a montuno: the third and the fifth off the beat, twice, and the octave on the last off-beat, every downbeat left out.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&guajeo`), so `use &guajeo` takes it; a form reads it as its `&call` (`&call step=8n &guajeo`), the line the form moves and answers.\n\nAt Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 1, as the facet `motif` (#542).\n\n**Its signature** (decision 065): `&guajeo from &key`. `&guajeo from guajeo &key` takes a copy of it, `&key` its main argument.\n","motifs/56-smoke":"---\nid: smoke\nsource: seed\n---\n\n```cells\n&smoke from &key style=&tripHop\n&smoke over=&key step=8n 4@3 3 2@2 0 ~\n```\n\nA slow line falling through the minor key, the fifth held, then the fourth, the third and the tonic, and a breath: trip-hop's sung lament.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&smoke`), so `use &smoke` takes it; a form reads it as its `&call` (`&call step=8n &smoke`), the line the form moves and answers.\n\nAt Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 1, as the facet `motif` (#542).\n\n**Its signature** (decision 065): `&smoke from &key`. `&smoke from smoke &key` takes a copy of it, `&key` its main argument.\n","performers/01-drums":"---\nid: drums_performer\nsource: seed\n---\n\n```cells\n&drums, &drumsOut from (&kit, &drumsDrive) &drumlines style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))\n&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit\n&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves\n&drumsOut play=&drumlines level=&drumsDrive*&drumsDrive &kit\n&drums map=role &drumsOut\n&drumsDrive map=amp 1\n```\n\nThe drummer (decisions 058 and 061, #287): a gate, `&drumsOut` (named as Jambot's section text names its gates), whose role is `drums` (`&drums map=role &drumsOut`), playing the part `&drumlines` on 13 of the General MIDI kit's voices, which it takes by name.\nThe part is a stack of lines, one per role, as Jambot's section text writes its drums (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b, `drumLines`): `&drumlines [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]`.\nA gate plays a stack line by line, each as if it were its one line, so every hit still says which line struck it (`kit:voices:kick:…`), the drum role the feel reads (`contracts/feel` v1.1).\nEach line names its own voices, and a hit its level either way, as Strudel has it: its own gain (`&bd:0:.645 ~ ~ &bd`, `s(\"bd:0:.645 ~ ~ bd\")`), or the line times a line of levels in the stack (`&euclid * &euclidLevel`, `s(\"rim(7,16)\").gain(\"…\")`), read at each note's written step, so a straight Euclid under a swung meter keeps its levels, and a number (`&clave * .5`). So the drummer has no level of its own, and its one hole is the score's: `&drumlines`.\nIts kit is the drummer's own set-up of those 13 voices, the kick, the side stick, the snare, the clap, three toms, the closed, pedal and open hats, the crash, the ride and the claves, a table (`&kit`): a line that strikes a voice the kit doesn't hold is an error.\n\nAssociated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays its drums the same way, on these 13 voices on channel 10, so the eight share this one drummer, and what a preset's drums sound like is its lines, not its player.\n\n**Its signature** (decision 065): `&drums, &drumsOut from (&kit, &drumsDrive) &drumlines`. `&drums from drums_performer &groove` takes a copy of it, `&drumlines` its main argument; `&kit` an optional parameter, its line its default (`\"drums_performer\"(kit=…)`).\n\n**Its drive** (decision 096): `&drumsDrive`, an optional parameter, its default 1, a factor of every hit on the velocity's scale: the gate's level reads it twice (`level=…*&drumsDrive*&drumsDrive`), since MIDI out sends a level's square root as its velocity (`velocityOf`). The band passes it, a sum of the score's `&intensity` (`fragments/bands/01-band.md`), so a section's intensity scales every hit as Jambot's dynamics scale it.\n","performers/02-bass":"---\nid: bass_performer\nsource: seed\n---\n\n```cells\n&bass, &bassOut from (&bassLevel, &bassV, &style, &bassDrive) &bassline style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))\n&bassV from bass(style=&style)\n&bassOut play=&bassline^$-12 level=&bassLevel*&bassDrive*&bassDrive &bassV\n&bass map=role part=bass &bassOut\n&bassLevel map=amp .8\n&bassDrive map=amp 1\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe bass player (decisions 058 and 061): a gate, `&bassOut` (Jambot's section text's name for it), whose role is `bass` (`&bass map=role &bassOut`), playing the part `&bassline` on the `bass` instrument an octave down.\nThe instrument holds the register, `&bassV loop=C2`, and Jambot's section text sounds its bass at C1 (`PIN_VOICES.bass`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so the gate moves the part 12 grid steps down (`^$-12`), and the bass sends the MIDI notes it sends today.\nIts two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&bassline`, the line (degrees over the chord in force or the key, held and shared as the section text writes them), and `&bassLevel`, its velocities as written: a line of levels (`map=amp step=16n`), or one level where they are all one (`&bassLevel map=amp .8`).\n\nAssociated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.\n\n**Its signature** (decision 065): `&bass, &bassOut from (&bassLevel, &bassV, &style, &bassDrive) &bassline`. `&bass from bass_performer &line` takes a copy of it, `&bassline` its main argument; `&bassLevel` an optional parameter, its line its default (`\"bass_performer\"(bassLevel=…)`).\nIts instrument and the style it plays at are optional parameters too (decision 075, #560): `&bassV` its default `&bassV from bass(style=&style)`, the `bass` instrument, and `&style` the centre of style space. A piece passes its own (`bass_performer(bassV=&bassV, style=&style)`), where it took them by their names before; Migrate writes it.\n\n**Its drive** (decision 096): `&bassDrive`, an optional parameter, its default 1, a factor of its levels on the velocity's scale: the gate's level reads it twice (`level=…*&bassDrive*&bassDrive`), since MIDI out sends a level's square root as its velocity (`velocityOf`). The band passes it, a sum of the score's `&intensity` (`fragments/bands/01-band.md`), so a section's intensity scales its levels as Jambot's dynamics scale it.\n","performers/03-pad":"---\nid: pad_performer\nsource: seed\n---\n\n```cells\n&pad, &padOut from (&padLevel, &padV, &style) &padline style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))\n&padV from pad(style=&style)\n&padOut play=&padline level=&padLevel &padV\n&pad map=role part=pad &padOut\n&padLevel map=amp .8\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe pad player (decisions 058 and 061): a gate, `&padOut` (Jambot's section text's name for it), whose role is `pad` (`&pad map=role &padOut`), playing the part `&padline` on the `pad` instrument, at its register (`&padV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.\nIts two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&padline`, the line, and `&padLevel`, its velocities as written, a line of levels or one level.\n\nAssociated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.\n\n**Its signature** (decision 065): `&pad, &padOut from (&padLevel, &padV, &style) &padline`. `&pad from pad_performer &line` takes a copy of it, `&padline` its main argument; `&padLevel` an optional parameter, its line its default (`\"pad_performer\"(padLevel=…)`).\nIts instrument and the style it plays at are optional parameters too (decision 075, #560): `&padV` its default `&padV from pad(style=&style)`, the `pad` instrument, and `&style` the centre of style space. A piece passes its own (`pad_performer(padV=&padV, style=&style)`), where it took them by their names before; Migrate writes it.\n","performers/04-stab":"---\nid: stab_performer\nsource: seed\n---\n\n```cells\n&stab, &stabOut from (&stabLevel, &keysV, &style, &stabDrive) &stabline style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))\n&keysV from keys(style=&style)\n&stabOut play=&stabline level=&stabLevel*&stabDrive*&stabDrive &keysV\n&stab map=role part=stab &stabOut\n&stabLevel map=amp .8\n&stabDrive map=amp 1\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe stab player (decisions 058 and 061): a gate, `&stabOut` (Jambot's section text's name for it), whose role is `stab` (`&stab map=role &stabOut`), playing the part `&stabline` on the `keys` instrument, at its register (`&keysV loop=C3`, where Jambot's section text sounds its comp: `PIN_VOICES.comp`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.\nIts two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&stabline`, the line, and `&stabLevel`, its velocities as written, a line of levels or one level. Jambot sends the pad and the stab on one channel, 3: the score's card puts both gates in one entry (`[&padOut, &stabOut]`).\n\nAssociated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.\n\n**Its signature** (decision 065): `&stab, &stabOut from (&stabLevel, &keysV, &style, &stabDrive) &stabline`. `&stab from stab_performer &line` takes a copy of it, `&stabline` its main argument; `&stabLevel` an optional parameter, its line its default (`\"stab_performer\"(stabLevel=…)`).\nIts instrument and the style it plays at are optional parameters too (decision 075, #560): `&keysV` its default `&keysV from keys(style=&style)`, the `keys` instrument, and `&style` the centre of style space. A piece passes its own (`stab_performer(keysV=&keysV, style=&style)`), where it took them by their names before; Migrate writes it.\n\n**Its drive** (decision 096): `&stabDrive`, an optional parameter, its default 1, a factor of its levels on the velocity's scale: the gate's level reads it twice (`level=…*&stabDrive*&stabDrive`), since MIDI out sends a level's square root as its velocity (`velocityOf`). The band passes it, a sum of the score's `&intensity` (`fragments/bands/01-band.md`), so a section's intensity scales its levels as Jambot's dynamics scale it.\n","performers/05-lead":"---\nid: lead_performer\nsource: seed\n---\n\n```cells\n&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline style=(&(map=style sync=.3 harm=.45 bite=.55) | &(map=style sync=.12 harm=0 bite=1) | &(map=style sync=.35 harm=.55 bite=.65) | &(map=style sync=.05 harm=.3 bite=0) | &(map=style sync=.5 harm=.75 bite=.35) | &(map=style sync=1 harm=.12 bite=.85) | &(map=style sync=.75 harm=.85 bite=.45) | &(map=style sync=.35 harm=1 bite=.3))\n&leadV from lead(style=&style)\n&leadOut play=&leadline level=&leadLevel &leadV\n&lead map=role part=lead &leadOut\n&leadLevel map=amp .8\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe lead player (decisions 058 and 061): a gate, `&leadOut` (Jambot's section text's name for it), whose role is `lead` (`&lead map=role &leadOut`), playing the part `&leadline` on the `lead` instrument, at its register (`&leadV loop=C4`, where Jambot's section text sounds its lead: `PIN_VOICES.lead`, yggi/jambot `packages/score/src/section-text.ts` @ 24a528b), so with no move.\nIts two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): `&leadline`, the line (degrees over the melodic scale or the key), and `&leadLevel`, its velocities as written, a line of levels or one level.\n\nAssociated as the facet `performer` at each of Jambot's eight presets' points (`styles`), at weight 1: every preset's section text plays this part the same way (yggi/jambot `packages/score/src/section-text.ts` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.\n\n**Its signature** (decision 065): `&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline`. `&lead from lead_performer &line` takes a copy of it, `&leadline` its main argument; `&leadLevel` an optional parameter, its line its default (`\"lead_performer\"(leadLevel=…)`).\nIts instrument and the style it plays at are optional parameters too (decision 075, #560): `&leadV` its default `&leadV from lead(style=&style)`, the `lead` instrument, and `&style` the centre of style space. A piece passes its own (`lead_performer(leadV=&leadV, style=&style)`), where it took them by their names before; Migrate writes it.\n","rhythms/01-synth-pop-drums":"---\nid: synth_pop_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=(&(map=style sync=.3 harm=.45 bite=.55) | &pop)\n&bd, &sd, &hh from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=(&(map=style sync=.3 harm=.45 bite=.55) | &chiptune | &kinderlied | &seaShanty | &pop) facet=fill\n&kick role=kick step=16n &bd:0:.547833 ~ ~ ~ ~ ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.469279 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.303801 &sd:0:.386943\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.270073 ~ ~ ~ &hh:0:.253953 ~ &hh:0:.201438 ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat]\n```\n\nJambot's E31 bar for Synth-pop (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Synth-pop's point, and at Pop's, its genre's (#947): a backbeat with eighths on the hat.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `synth_pop_drums(bd=&mine)`.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at chiptune, kinderlied, seaShanty, and at Pop, Synth-pop's genre (#947), so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from synth_pop_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/02-techno-drums":"---\nid: techno_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh, &oh) style=&(map=style sync=.12 harm=0 bite=1)\n&bd, &sd, &hh, &oh from gm_kit\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh, &oh) style=(&(map=style sync=.12 harm=0 bite=1) | &acid | &happyHardcore | &elektro) facet=fill\n&kick role=kick step=16n &bd:0:.763904 ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &bd:0:.524769 ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.607663 ~ ~ ~ ~ ~ ~ ~ &sd:0:.696633 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.155 &sd:0:.201438 &sd:0:.261951 &sd:0:.321409 ~ &sd:0:.469279 &sd:0:.571393 &sd:0:.632463\n&hat role=hat step=16n &hh:0:.367599 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.278319 &hh:0:.155 &hh:0:.367599 &hh:0:.148862 &oh:0:.278319 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862\n&groove [&kick, &backbeat, &fill, &hat]\n```\n\nJambot's E31 bar for Techno (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Techno's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `techno_drums(bd=&mine)`.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at acid, happyHardcore, elektro, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from techno_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/03-deep-house-drums":"---\nid: deep_house_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.35 harm=.55 bite=.65)\n&bd, &sd, &hh from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.35 harm=.55 bite=.65) facet=fill\n&kick role=kick step=16n &bd:0:.595449 ~ ~ ~ ~ ~ ~ ~ &bd:0:.571393 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.502201 ~ ~ ~ ~ ~ ~ ~ &sd:0:.491103 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.339513 &sd:0:.406783\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &hh:0:.321409 ~ &hh:0:.253953 ~ &hh:0:.303801 ~ ~ ~ &hh:0:.286689 ~ ~ ~ &hh:0:.261951 &hh:0:.094302 &hh:0:.230702 ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat]\n```\n\nJambot's E31 bar for Deep house (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Deep house's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `deep_house_drums(bd=&mine)`.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from deep_house_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/04-ambient-drums":"---\nid: ambient_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.05 harm=.3 bite=0)\n&bd, &sd, &hh from gm_kit\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh) style=(&(map=style sync=.05 harm=.3 bite=0) | &darkAmbient) facet=fill\n&kick role=kick step=16n &bd:0:.513423 ~ ~ ~ ~ ~ ~ ~ &bd:0:.502201 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.386943 ~ ~ ~ ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.0992 &sd:0:.136958 &sd:0:.167648 &sd:0:.194432 ~ &sd:0:.303801 &sd:0:.416889 &sd:0:.396801\n&hat role=hat step=16n &hh:0:.238328 ~ &hh:0:.174158 ~ &hh:0:.261951 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.201438 ~ &hh:0:.261951 ~ &hh:0:.2232 ~\n&groove [&kick, &backbeat, &fill, &hat]\n```\n\nJambot's E31 bar for Ambient (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Ambient's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `ambient_drums(bd=&mine)`.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at darkAmbient, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from ambient_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/05-lo-fi-hip-hop-drums":"---\nid: lo_fi_hip_hop_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.5 harm=.75 bite=.35)\n&bd, &rim, &sd, &hh from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=(&(map=style sync=.5 harm=.75 bite=.35) | &tripHop) facet=fill\n&kick role=kick step=16n &bd:0:.524769 ~ ~ &bd:0:.286689 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.12555 &sd:0:.321409 &sd:0:.358113\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.041912 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.253953 ~ ~ ~ &hh:0:.2232 ~ &hh:0:.215822 ~\n&euclid role=euclid step=1m &rim(5,16,4)\n&euclidLevel from metric_accent(floor=.16, peak=.23)\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Lo-fi hip hop (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Lo-fi hip hop's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `lo_fi_hip_hop_drums(bd=&mine)`.\n\n**Its euclid's levels** are the bar's metric accents (`&euclidLevel from metric_accent(floor=.16, peak=.23)`, #799), the downbeat strongest: written by a built-in plugin-fragment, no longer the velocities Jambot's band wrote in E31's bar, which lay between the same two. The rest of the bar is E31's word for word.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at tripHop, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from lo_fi_hip_hop_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/06-funk-drums":"---\nid: funk_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh, &oh) style=&(map=style sync=1 harm=.12 bite=.85)\n&bd, &rim, &sd, &hh, &oh from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh, &oh) style=&(map=style sync=1 harm=.12 bite=.85) facet=fill\n&kick role=kick step=16n &bd:0:.645049 ~ ~ &bd:0:.386943 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.180792 &sd:0:.367599 &sd:0:.447951\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.089528 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &hh:0:.348751 ~ &oh:0:.253953 ~ &hh:0:.330399 &hh:0:.114638 &oh:0:.230702 ~ &hh:0:.312543 ~ ~ ~ &hh:0:.286689 &hh:0:.104222 &oh:0:.215822 ~\n&euclid role=euclid step=1m &rim(7,16,0)\n&euclidLevel from metric_accent(floor=.23, peak=.3)\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Funk (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Funk's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `funk_drums(bd=&mine)`.\n\n**Its euclid's levels** are the bar's metric accents (`&euclidLevel from metric_accent(floor=.23, peak=.3)`, #799), the downbeat strongest: written by a built-in plugin-fragment, no longer the velocities Jambot's band wrote in E31's bar, which lay between the same two. The rest of the bar is E31's word for word.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from funk_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/07-bossa-nova-drums":"---\nid: bossa_nova_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.75 harm=.85 bite=.45)\n&bd, &rim, &sd, &hh from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh) style=&(map=style sync=.75 harm=.85 bite=.45) facet=fill\n&kick role=kick step=16n &bd:0:.502201 ~ ~ &bd:0:.312543 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~ ~ ~ ~ ~ &sd:0:.427119 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.148862 &sd:0:.278319 &sd:0:.348751\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.063488 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ ~ ~ ~ ~ &hh:0:.246078 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.18755 ~\n&euclid role=euclid step=1m &rim(5,16,4)\n&euclidLevel from metric_accent(floor=.18, peak=.22)\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Bossa nova (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Bossa nova's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_drums(bd=&mine)`.\n\n**Its euclid's levels** are the bar's metric accents (`&euclidLevel from metric_accent(floor=.18, peak=.22)`, #799), the downbeat strongest: written by a built-in plugin-fragment, no longer the velocities Jambot's band wrote in E31's bar, which lay between the same two. The rest of the bar is E31's word for word.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from bossa_nova_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/08-swing-jazz-drums":"---\nid: swing_jazz_drums\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &pedal, &groove from (&bd, &sd, &ph, &rd) style=&(map=style sync=.35 harm=1 bite=.3)\n&bd, &sd, &ph, &rd from gm_kit\n&kick, &backbeat, &fill, &ghost, &hat, &pedal, &groove from (&bd, &sd, &ph, &rd) style=(&(map=style sync=.35 harm=1 bite=.3) | &electroSwing | &bluesShuffle) facet=fill\n&kick role=kick step=16n &bd:0:.559551 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.109368 &sd:0:.386943 &sd:0:.367599\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.030008 &sd:0:.0558 ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &rd:0:.295183 ~ ~ ~ &rd:0:.278319 ~ ~ ~ &rd:0:.230702 ~ ~ ~ &rd:0:.253953 ~ &rd:0:.215822 ~\n&pedal role=pedal step=16n ~ ~ ~ ~ &ph:0:.161262 ~ ~ ~ ~ ~ ~ ~ &ph:0:.201438 ~ ~ ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &pedal]\n```\n\nJambot's E31 bar for Swing jazz (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Swing jazz's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&ph`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &ph, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `swing_jazz_drums(bd=&mine)`.\n\n**Its fill is found on its own** (#718): a second declaration places the groove as the facet `fill` too, at its own point and at electroSwing, bluesShuffle, so a query for a fill there returns it and a text takes its fill alone, by its head: `&fill from swing_jazz_drums`. The groove itself plays its fill every bar, as Jambot's E31 bar wrote it (`&groove` holds `&fill`), which is why Jambot's band leaves it out (#718); a piece that wants it at a section's end takes the line alone and places it (`snare_run` says how).\n","rhythms/09-son-clave-3-2":"---\nid: son_clave_3_2\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=.875 harm=.485 bite=.65)\n&claves from gm_kit\n&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!3 &claves ~!7\n&percussion [&clave * .5]\n```\n\nThe son clave, 3-2: x..x..x. ..x.x... over two bars of eighths. It is where the bossa nova clave and Funk's Bo Diddley beat come from, and sits halfway between Bossa nova and Funk.\n\nIt is not maximally even: no phase of `even(5, 16)` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (`even.test.ts`).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `son_clave_3_2(claves=&mine)`.\n","rhythms/10-son-clave-2-3":"---\nid: son_clave_2_3\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=.95 harm=.35 bite=.75)\n&claves from gm_kit\n&clave role=clave step=16n cycle=2 ~!4 &claves ~!3 &claves ~!7 &claves ~!5 &claves ~!5 &claves ~!3\n&percussion [&clave * .5]\n```\n\nThe son clave from its other bar, 2-3: it starts off the downbeat, so it sits a step from 3-2 toward Funk, more off the beat and plainer.\n\nIt is not maximally even: no phase of `even(5, 16)` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (`even.test.ts`).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `son_clave_2_3(claves=&mine)`.\n","rhythms/11-rumba-clave-3-2":"---\nid: rumba_clave_3_2\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=1 harm=.2 bite=.75)\n&claves from gm_kit\n&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!3 &claves ~!7\n&percussion [&clave * .5]\n```\n\nThe rumba clave, 3-2: the son's third stroke an eighth later, off the beat; drums and voices over a static harmony, short and dense: near Funk.\n\nIt is not maximally even: no phase of `even(5, 16)` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (`even.test.ts`).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `rumba_clave_3_2(claves=&mine)`.\n","rhythms/12-bossa-nova-clave":"---\nid: bossa_nova_clave\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=.8 harm=.85 bite=.35)\n&claves from gm_kit\n&clave role=clave step=8n cycle=2 &claves(even(5,16,2))@16\n&percussion [&clave * .5]\n```\n\nThe bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.\n\nIts five strokes are `even(5, 16, 2)`, as even as five go over sixteen (here sixteen eighths over two bars), struck so: `&claves(even(5,16,2))@16`, one step held over sixteen eighths, two bars (`step=8n cycle=2`), each stroke an eighth long (decision 093 §6). A maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; `even.test.ts`).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_clave(claves=&mine)`.\n","rhythms/13-bossa-nova-clave-one-bar":"---\nid: bossa_nova_clave_one_bar\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=.8 harm=.85 bite=.45)\n&claves from gm_kit\n&clave role=clave step=16n &claves(even(5,16,2))@16\n&percussion [&clave * .5]\n```\n\nThe bossa nova clave in one bar of sixteenths, x..x..x...x..x..: as dense as Bossa nova's drum bar, written in the same sixteenths, so at Bossa nova's energy; off the beat as the two-bar one. Which of the two fits a composition is the fit's to choose (#144), not the association's.\n\nIts five strokes are `even(5, 16, 2)`, as even as five go over sixteen, struck so: `&claves(even(5,16,2))@16`, one step held over sixteen sixteenths (`step=16n`), each stroke a sixteenth (decision 093 §6). A maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; `even.test.ts`).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). `&claves` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (`&clave`, `&percussion`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_clave_one_bar(claves=&mine)`.\n","rhythms/14-cinquillo":"---\nid: cinquillo\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves) style=&(map=style sync=.85 harm=.6 bite=.6)\n&claves from gm_kit\n&clave role=clave step=8n &claves(even(5,8,2))@8\n&percussion [&clave * .5]\n```\n\nThe cinquillo, x.xx.xx. over one bar of eighths: the Cuban danzón's rhythm, the habanera's and the tresillo's kin, five strokes as even as five go over eight, `even(5, 8, 2)` (2 1 2 1 2; decision 072). The tresillo is its three, `even(3, 8, 2)`, and the bossa nova clave its five over sixteen, `even(5, 16, 2)`: one generator, three timelines (#507).\nIt is struck so, `&claves(even(5,8,2))@8`, one step held over eight eighths (`step=8n`): five of eight parts, at even's phase 2, each stroke an eighth long (decision 093 §6, #531); `even.test.ts` checks the places.\n\nWhere it sits: no preset is Cuban. It is placed by hand beside the son clave, which grew out of the danzón (off the beat, sync 0.85), a little more harmonic (the danzón's ballroom chords, harm 0.6), and denser than a two-bar clave, five strokes in one bar (energy 0.6).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90), as the other claves: `&claves` is a hole the General MIDI kit fills (decision 054, rung 2: #244). Its other names (`&clave`, `&percussion`) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `cinquillo(claves=&mine)`.\n","rhythms/15-electro-swing-drums":"---\nid: electro_swing_drums\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 2c120d4\n---\n\n```cells\n&kick, &clap, &hats, &ticks, &ghosts, &groove from (&bd, &sd, &cp, &hh, &oh) style=&(map=style sync=.55 harm=.75 bite=.6)\n&bd, &sd, &cp, &hh, &oh from gm_kit\n&kick role=kick step=4n &bd!4\n&clap role=backbeat step=4n ~ &cp:0:.6 ~ &cp:0:.6\n&hats role=hat step=8n ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4\n&ticks seed=4350651875936865 role=hat step=16n &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2?.7 &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2\n&ghosts role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.03\n&groove [&kick, &clap, &hats, &ticks, &ghosts]\n```\n\nThe electro swing beat of [Electro swing, in pieces](../../examples/electroswing.md): house's four on the floor and its clap on two and four, under a jazz record's swung eighths, the open hat on every off-beat and a sixteenth hat with some strokes left to chance (`?`, keyed on the seed: decision 031) and a ghost of the snare on the last, a line of its own (`&ghosts`, `role=ghost`) so that every line says its role: the clap the backbeat, the hats and the ticks the hat (#508, #717).\nIt holds no `&bar`, so the host's meter swings it: under `swing_meter` (or the example's lighter `swing=8n:.64`) the open hats fall late, the kick and the clap stay on the beat.\nIts lines strike the kit's names (`&bd` `&cp` `&oh` `&hh` `&sd`), holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix, its levels in the hits.\nA piece arranging it takes its limbs by name (`&kick, &clap, &hats, &ticks, &ghosts from electro_swing_drums`), as the example does, each under a level of its own.\n\nAt a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&cp`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &cp, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `electro_swing_drums(bd=&mine)`.\n","rhythms/16-spooky-drums":"---\nid: spooky_drums\nsource: seed\n---\n\n```cells\n&kick, &hat, &euclid, &groove from (&bd, &rim, &rd) style=&(map=style sync=.2 harm=.9 bite=.3)\n&bd, &rim, &rd from gm_kit\n&kick role=kick step=16n &bd:0:.55 &bd:0:.3 ~ ~\n&hat role=hat step=4n &rd:0:.12\n&euclid role=euclid step=1m [~ &rim]\n&groove [&kick, &hat, &euclid * .25]\n```\n\nA heartbeat, a clock and a knock: the beat of [Spooky, in pieces](../../examples/spooky.md).\nThe kick is a heartbeat on every beat, its second stroke a sixteenth after the first and softer (lub-dub); the ride ticks each beat, faint, a clock; the rim knocks once, at the middle of the bar, where the heart is between beats in a bar of an odd number of them.\nEvery line fits any meter and lands on its sixteenths: the kick and the ride cycle on a beat (`step=16n` four long, `step=4n` one long), and the rim halves the bar (`step=1m [~ &rim]`), and half of every bar the library's meters make is a whole number of sixteenths (6 in 3/4, 10 in 5/4, 7 in 7/8), so in 5/4 the heart beats five times and the knock falls between the third beat's strokes.\nA Euclid spread over the bar (`step=1m &rim(3,8)`, v0.12.0's) put the knocks between the sixteenths of any bar but 4/4's and 12/8's, where a reader on the bar's sixteenths, as Jambot's drummer is, can't play them; a line on eighths (`step=8n`) lands on them but laps a bar of 4/4, which the fit refuses under the other meters.\nIts lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `spooky_drums(bd=&mine)`.\n","rhythms/17-ghost-drums":"---\nid: ghost_drums\nsource: seed\n---\n\n```cells\n&kick, &hat, &euclid, &groove from (&bd, &rim, &rd) style=&(map=style sync=.1 harm=.9 bite=.3)\n&bd, &rim, &rd from gm_kit\n&kick role=kick step=1m &bd:0:.45\n&hat role=hat step=4n &rd:0:.08\n&euclid role=euclid step=1m [~ &rim]\n&groove [&kick, &hat, &euclid * .2]\n```\n\nAlmost no drums, as a ghost house has: one soft heartbeat at the head of the bar, a clock ticking each beat at the edge of hearing, and a knock at the middle of the bar.\nIt is `spooky_drums` thinned for a quieter, stiller point: the heart beats once a bar, not every beat, so the bar is mostly air.\nEvery line fits any meter and lands on its sixteenths, as `spooky_drums`' do: the kick and the rim on the bar and its half, the ride on the beat.\nIts lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37); they carry no card (#291): `&groove` is the mix.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.1 lower in sync, weight 1, as the facet `rhythm`.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `ghost_drums(bd=&mine)`.\n","rhythms/18-kinderlied-drums":"---\nid: kinderlied_drums\nsource: seed\n---\n\n```cells\n&kick, &backbeat, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.1 harm=.12 bite=.5) * .25\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=2n &bd:0:.5\n&backbeat role=backbeat step=2n [~ &sd:0:.35]\n&hat role=hat step=4n &hh:0:.18\n&groove [&kick, &backbeat, &hat]\n```\n\nThe plainest beat there is, for a children's song: the kick on one and three, the snare on two and four, a closed hat on every beat, nothing off it.\nThe kick and the snare cycle on a half note and the hat on a beat, so in 4/4 it is one bar, and in 3/4 or 5/4 the kick and the snare take turns on the halves of each bar; it fits every meter of the library's.\nIts lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for the point proposed for a Kinderlied preset (`KINDERLIED`, `styles`: sync .1, harm .12, bite .5, mood .95), where Twinkle's and Hänschen klein's motifs sit; no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041).\nAt weight 0.25, as the dark cadence is weighted down (#404): its distance counts four times, so a query finds it within Jambot's miss distance (0.3) only within 0.075 of its point, where a Kinderlied preset finds it at distance 0.\nIts weight was chosen against cells' lock-in bound when it was absolute, points added (#533 made it relative, and whether the weight goes back to 1 is #544's): both bounds on lock-in over rhythms (`lockin.slow.test.ts`) sat at their edge without it, 4.99 points against 5 and a spread of 2.48 against 2.5, so a rhythm that the walk away from the presets finds and learns crosses one or the other: at weight 1 the share learning adds rose to 5.55 points; at 0.5, 0.4 and 0.3 it was 5.06, 5.02 and 4.98, the last with a spread of 2.52; at 0.25 4.95 and 2.46. Three beats near it (this one, a march and a swaying one) raised it to 5.98, so this one stands alone.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `kinderlied_drums(bd=&mine)`.\n","rhythms/19-acid-drums":"---\nid: acid_drums\nsource: seed\nlifted: yggi/cells examples/acid.md @ 014c4c73\n---\n\n```cells\n&kick, &clap, &hat, &groove from (&bd, &cp, &hh, &oh) style=&(map=style sync=.45 harm=.05 bite=.85)\n&bd, &cp, &hh, &oh from gm_kit\n&kick role=kick step=4n &bd:0:.8\n&clap role=backbeat step=2n [~ &cp:0:.35]\n&hat role=hat step=8n [&hh:0:.3 &oh:0:.5]\n&groove [&kick, &clap, &hat]\n```\n\nThe beat of [Acid-Cell](../../examples/acid.md): the kick on every beat, the clap on two and four, the closed hat on the beat and the open hat on the and.\n\nAt Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet `rhythm` (#572).\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&cp`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &cp, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `acid_drums(bd=&mine)`.\n","rhythms/20-happy-hardcore-drums":`---
id: happy_hardcore_drums
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&kick, &clap, &hat, &groove from (&bd, &cp, &hh) style=&(map=style sync=.25 harm=.45 bite=.8)
&bd, &cp, &hh from gm_kit
&kick role=kick step=4n &bd:0:.8
&clap role=backbeat step=2n [~ &cp:0:.35]
&hat role=hat step=8n [~ &hh:0:.2]
&groove [&kick, &clap, &hat]
\`\`\`

The beat of [Hypercell](../../examples/hypercell.md): four on the floor, the clap on two and four, the closed hat between the kicks.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&cp\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &cp, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`happy_hardcore_drums(bd=&mine)\`.
`,"rhythms/21-elektro-drums":`---
id: elektro_drums
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&kick, &backbeat, &tick, &groove from (&bd, &sd, &hh) style=&(map=style sync=.15 harm=.5 bite=.85)
&bd, &sd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.8
&backbeat role=backbeat step=2n [~ &sd:0:.35]
&tick role=hat step=8n &hh:0:.12
&groove [&kick, &backbeat, &tick]
\`\`\`

The beat of [Zelluläre Aktivität](../../examples/zell.md): the kick on one and three, the snare on two and four, a light metallic tick on every eighth.

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&sd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &sd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`elektro_drums(bd=&mine)\`.
`,"rhythms/22-industrial-drums":`---
id: industrial_drums
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&kick, &metal, &groove from (&bd, &hh) style=&(map=style sync=.35 harm=.15 bite=.4)
&bd, &hh from gm_kit
&kick role=kick step=8n &bd:0:.8 ~ ~ ~ ~ ~ &bd:0:.6 ~
&metal role=hat step=16n ~ ~ &hh:0:.15 ~ ~ ~ ~ &hh:0:.12 ~ ~ ~ &hh:0:.15 ~ ~ ~ ~
&groove [&kick, &metal]
\`\`\`

The percussion of [Ghost-Cells](../../examples/ghosts.md), made plain: a heavy kick on one and on the seventh eighth, and metal ticks scattered over the sixteenths. The example draws its last kick and its ticks by chance, and adds glitches; here each is where it falls most.

At Dark ambient's point (sync .35, harm .15, bite .4), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`industrial_drums(bd=&mine)\`.
`,"rhythms/23-ride-shuffle":`---
id: ride_shuffle
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&ride, &kick, &groove from (&bd, &rd) style=&(map=style sync=.65 harm=.55 bite=.45)
&bd, &rd from gm_kit
&ride role=hat step=8n &rd:0:.9 ~ &rd:0:.6 &rd:0:.5 &rd:0:.9 ~ &rd:0:.6 &rd:0:.5
&kick role=kick step=2n &bd:0:.5
&groove [&ride, &kick]
\`\`\`

The ride of [Swing blues](../../examples/jazz.md): ding, ding-a ding, ding-a, on a swung meter the long and the short of each beat, a light kick under one and three.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&rd\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &rd from gm_kit\`). A piece takes its lines by their names, or renamed (\`&ride2=ride\`), and passes its own drum where it has one: \`ride_shuffle(bd=&mine)\`.
`,"rhythms/24-shanty-drums":`---
id: shanty_drums
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.1 harm=.25 bite=.7)
&bd, &sd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.8
&snare role=backbeat step=2n [~ &sd:0:.5]
&hat role=hat step=8n [~ &hh:0:.3]
&groove [&kick, &snare, &hat]
\`\`\`

The kit of [Drunken Sailor](../../examples/sailor.md): the kick on one and three, the snare on two and four, the hat on every offbeat eighth.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&sd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &sd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`shanty_drums(bd=&mine)\`.
`,"rhythms/25-chip-drums":`---
id: chip_drums
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&kick, &hats, &groove from (&bd, &hh) style=&(map=style sync=.3 harm=.7 bite=1)
&bd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.6
&hats role=hat step=8n &hh:0:.5 &hh:0:.15 &hh &hh:0:.15 &hh:0:.5 &hh:0:.15 &hh &hh:0:.15
&groove [&kick, &hats]
\`\`\`

The drums of [Korobeiniki](../../examples/korobeiniki.md): its noise channel's hats, loud on the beat and soft between, with a kick under one and three.

At Chiptune's point (sync 0.3, harm 0.7, bite 1), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`chip_drums(bd=&mine)\`.
`,"rhythms/26-quiet-pulse":`---
id: quiet_pulse
source: seed
---

\`\`\`cells
&tick, &groove from (&claves) style=&(map=style sync=.15 harm=.8 bite=.5)
&claves from gm_kit
&tick role=clave step=4n &claves:0:.2
&groove [&tick]
\`\`\`

A quiet pulse, the claves softly on every beat: what keeps a band together where the music has no drums, a baroque ensemble's beat felt more than heard.

At Baroque's point (sync .15, harm .8, bite .5), weight 1, as the facet \`rhythm\`, so a band at Baroque plays this and no other style's kit (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&tick2=tick\`), and passes its own drum where it has one: \`quiet_pulse(claves=&mine)\`.
`,"rhythms/27-salsa-drums":`---
id: salsa_drums
source: seed
---

\`\`\`cells
&clave, &tumbao, &cascara, &groove from (&claves, &ht, &lt, &mt, &rd) style=&(map=style sync=.9 harm=.5 bite=.7)
&claves, &ht, &lt, &mt, &rd from gm_kit
&clave role=clave step=16n cycle=2 &claves:0:.5 ~!5 &claves:0:.5 ~!5 &claves:0:.5 ~!7 &claves:0:.5 ~!3 &claves:0:.5 ~!7
&tumbao role=ostinato step=8n &mt:0:.3 &mt:0:.2 &ht:0:.5 &mt:0:.2 &mt:0:.3 &mt:0:.2 &lt:0:.6 &lt:0:.5
&cascara role=hat step=4n &rd:0:.45
&groove [&clave, &tumbao, &cascara]
\`\`\`

A salsa's percussion on a drum kit's voices: the son clave, 3-2, over two bars (as \`son_clave_3_2\` writes it); the conga's tumbao on the toms (the mid tom's muted strokes, the high tom's slap on two, the low tom's two open tones on four and its off-beat); and the bell's quarters on the ride, as a kit drummer plays the cáscara. It strikes only the 13 voices the drummer takes (#244).
At Salsa's point (sync 0.9, harm 0.5, bite 0.7), weight 1, as the facet \`rhythm\` (#542).
Each line says what it does (decision 075): the clave a \`clave\`, the tumbao an \`ostinato\`, a pitched figure repeated on the toms (feel version 3, minor 1: #717), and the cáscara a \`hat\`.
`,"rhythms/28-waltz-drums":`---
id: waltz_drums
source: seed
---

\`\`\`cells
&kick, &chick, &groove from (&bd, &ph) style=&(map=style sync=0 harm=.7 bite=.3)
&bd, &ph from gm_kit
&kick role=kick step=4n &bd:0:.5 ~ ~
&chick role=pedal step=4n ~ &ph:0:.3 &ph:0:.25
&groove [&kick, &chick]
\`\`\`

A waltz's oom-pah-pah: the kick on one, the pedal hat on two and three, a little softer on three.
At Waltz's point (sync 0, harm 0.7, bite 0.3), weight 1, as the facet \`rhythm\` (#542).
`,"rhythms/29-march-drums":`---
id: march_drums
source: seed
---

\`\`\`cells
&kick, &snare, &groove from (&bd, &sd) style=&(map=style sync=0 harm=.1 bite=.75)
&bd, &sd from gm_kit
&kick role=kick step=4n &bd:0:.7 &bd:0:.5
&snare role=backbeat step=16n &sd:0:.7 ~ &sd:0:.3 &sd:0:.3 &sd:0:.6 ~ &sd:0:.3 &sd:0:.3
&groove [&kick, &snare]
\`\`\`

A march's drums in 2/4: the bass drum on both beats, the snare's strokes and its soft doubles between them, the field drum's rudiment.
At March's point (sync 0, harm 0.1, bite 0.75), weight 1, as the facet \`rhythm\` (#542).
`,"rhythms/30-trip-hop-drums":`---
id: trip_hop_drums
source: seed
---

\`\`\`cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.7 harm=.2 bite=.2) * .5
&bd, &sd, &hh from gm_kit
&kick role=kick step=16n &bd:0:.8 ~ ~ ~ ~ ~ ~ &bd:0:.5 ~ ~ &bd:0:.6 ~ ~ ~ ~ ~
&snare role=backbeat step=2n ~ &sd:0:.7
&hat role=hat step=8n &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35
&groove [&kick, &snare, &hat]
\`\`\`

A trip-hop beat, slow and heavy: the kick on one, its echoes off the beat after it, a hard snare on three (the half-time backbeat), the hats leaning on their off-beats.
At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2), weight 0.5, as the facet \`rhythm\` (#542): it is first at Trip-hop's point, and reaches half as far, so the walk of \`lockin.ts\` still misses at the corner's far edges, where it files fragments of its own (at weight 1 no section of draws 0–31 misses there, at 0.75 none of draws 0–3, and that path loses its witness).
`,"rhythms/31-aksak-drums":"---\nid: aksak_drums\nsource: seed\n---\n\n```cells\n&kick, &ghost, &backbeat, &hat, &groove from (&bd, &sd, &hh) style=&(map=style sync=.8 harm=.6 bite=1) * .75\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=beat &bd:0:.6 ~ ~\n&ghost role=ghost step=beat ~ &sd:0:.12 ~\n&backbeat role=backbeat step=beat ~ ~ &sd:0:.5\n&hat role=hat step=pulse &hh:0:.3\n&groove [&kick, &ghost, &backbeat, &hat]\n```\n\nA drum bar for an aksak, a bar of three unequal beats, twos and a three: the kick on the first beat, a ghost of the snare on the second, the snare on the third, and the hat on every eighth.\nIt is written in the meter's counts, `step=beat` and `step=pulse`, so it lays itself out in whatever grouping the host's meter has: in 7/8 as the family reads it, `meter(\"7/8\")`, 3 + 2 + 2, the snare falls on the sixth eighth and the kick's beat is the long one; in `meter(\"2+2+3\")`, the grouping of the motif `limp`, the snare falls on the fifth and the long beat is the snare's.\nUnder a meter that swings its eighths (`swing=8n:2/3`), the hats of each two lean and those of the three stay even (decision 071); the beats never move.\nIts lines are named by Jambot's drum roles (`kick`, `ghost`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nIts three-beat lines lap a bar of three beats, so it fits the meters of three beats (7/8, 3/4) and no other.\nWritten by hand for [Aksak: twos and a three](../../examples/aksak.md), at 7/8's point (sync .8, harm .6, bite 1), weight 0.75 as the meter's own point there, as the facet `rhythm` (#646): where the meter fragment answers 7/8 (`odd_meter(meter=\"7/8\")`), this is its drum bar.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `aksak_drums(bd=&mine)`.\n","rhythms/32-twelve-eight-drums":"---\nid: twelve_eight_drums\nsource: seed\n---\n\n```cells\n&kick, &backbeat, &hat, &groove from (&bd, &sd, &rd) style=&(map=style sync=.7 harm=.6 bite=0)\n&bd, &sd, &rd from gm_kit\n&kick role=kick step=beat &bd:0:.6 ~ &bd:0:.45 ~\n&backbeat role=backbeat step=beat ~ &sd:0:.5 ~ &sd:0:.5\n&hat role=hat step=8n &rd:0:.35 &rd:0:.18 &rd:0:.24\n&groove [&kick, &backbeat, &hat]\n```\n\nA slow blues in 12/8: four beats a bar, each a dotted quarter of three eighths; the kick on one and three, the snare on two and four, and the ride on every eighth, the first of each three the loudest, the second the softest.\nThe kick and the snare tap the beats (`step=beat`); the ride's three eighths make one beat of a compound meter, so it fits 12/8 alone of the library's meters (in 6/8 its four beats are two bars).\nUnder a meter bent on its eighths (`bend=8n:&lean`, decision 080), the ride leans as the bend says, within each beat; the beats never move.\nIts lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`, the ride its hat as in `swing_jazz_drums`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&rd` 51), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for [Twelve-eight: the lean of three](../../examples/twelve.md), at 12/8's point (sync .7, harm .6, bite 0), as the facet `rhythm` (#646): where the meter fragment answers 12/8 (`bar(meter=\"12/8\")`), this is its drum bar.\nIt weighs 1, as a seed point does: lock-in's witness that the walk files fragments of its own stands on a library with no rhythms, a gap no placement fills (#706), so it no longer needs this corner left empty, as it did when it weighed 0.25 (#646). No style's first rhythm changes at 1 against 0.25; between Trip-hop and Ambient, Lo-fi hip hop, Swing jazz or Blues shuffle it is now third.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `twelve_eight_drums(bd=&mine)`.\n","rhythms/33-breathing-drums":"---\nid: breathing_drums\nsource: seed\n---\n\n```cells\n&kick, &hat, &hatLevel, &groove from (&bd, &hh) style=&(map=style sync=.15 harm=.35 bite=.1)\n&bd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.45 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&hatLevel from metric_accent(density=.75, sync=.2, peak=.3, floor=.12)\n&hat role=hat step=16n &hh\n&groove [&kick, &hat * &hatLevel]\n```\n\nA breathing pulse beside Ambient (#799): one soft kick a bar, and hats whose levels are the bar's metric weights (`metric_accent`, a built-in plugin-fragment), not written by hand: the downbeat and the half bar strongest, the beats lighter, each leaning a little toward the step before it (`sync=.2`), the off-eighths and the sixteenth before each beat played, the other sixteenths left out (`density=.75`).\n\n**Its signature** (decision 075): its lines are its heads, and the drums it strikes (`&bd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default (`&bd, &hh from gm_kit`). `&hatLevel` is the accent line, a head of its own, the groove plays the hat's hits at its levels (`&hat * &hatLevel`), as the funk groove plays its euclid's, and a piece can lay it over another line (`&myHat * &hatLevel`).\n","sections/01-intro":"---\nid: intro\nsource: seed\n---\n\n```cells\n&intro, &introPlays from &song\n&intro [&song + -.3]\n&introPlays [0,1,2,3]\n```\n\nAn intro: the song's intensity less 0.3, the lead resting.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&intro`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&introPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.intro` −0.3; the lead rests in an intro (`lead.ts`, `rests`). A song's first section, which Jambot's chain only starts with (`appeal`: 0 after it).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&intro, &introPlays from &song`. `&intro, &introPlays from intro &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/02-verse":"---\nid: verse\nsource: seed\n---\n\n```cells\n&verse, &versePlays from &song\n&verse [&song + -.1]\n&versePlays [0,1,2,4]\n```\n\nA verse: the song's intensity less 0.1, the lead over the drums, the bass and the pad, the stab resting.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&verse`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&versePlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nJambot has no verse: its numbers are chosen here (#810 rung 2). It sits where Jambot's bridge sits on intensity (−0.1), below the chorus it leads to, and leaves the stab out so the line it carries is heard over a lighter comp, as a verse's arrangement leaves room for its words.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&verse, &versePlays from &song`. `&verse, &versePlays from verse &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/03-chorus":"---\nid: chorus\nsource: seed\n---\n\n```cells\n&chorus, &chorusPlays from &song\n&chorus [&song + .15]\n&chorusPlays [0,1,2,3,4]\n```\n\nA chorus: the song's intensity and 0.15 more, everyone playing.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&chorus`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&chorusPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nJambot has no chorus: its numbers are chosen here (#810 rung 2). It lies between a groove (0) and a drop (+0.3), a lift a verse–chorus song returns to, not a drop's peak: 0.25 above the verse, about as far as a build climbs in half its bars.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&chorus, &chorusPlays from &song`. `&chorus, &chorusPlays from chorus &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/04-groove":"---\nid: groove\nsource: seed\n---\n\n```cells\n&groove, &groovePlays from &song\n&groove [&song + 0]\n&groovePlays [0,1,2,3,4]\n```\n\nA groove: the song's own intensity, everyone playing.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&groove`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&groovePlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.groove` 0. The section Jambot's chain stays in where entropy is low.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&groove, &groovePlays from &song`. `&groove, &groovePlays from groove &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/05-bridge":"---\nid: bridge\nsource: seed\n---\n\n```cells\n&bridge, &bridgePlays from &song\n&bridge [&song + -.1]\n&bridgePlays [0,1,2,3,4]\n```\n\nA bridge: the song's intensity less 0.1, everyone playing.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&bridge`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&bridgePlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.bridge` −0.1.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&bridge, &bridgePlays from &song`. `&bridge, &bridgePlays from bridge &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/06-build":"---\nid: build\nsource: seed\n---\n\n```cells\n&build, &buildPlays from &song\n&build [&song + -.15 + &buildRise * .45]\n&buildRise step=1m cycle=8 0 .142857142857 .285714285714 .428571428571 .571428571429 .714285714286 .857142857143 1\n&buildPlays [0,1,2,3,4]\n```\n\nA build: the song's intensity from 0.15 below it to 0.3 above it, rising by the bar over its eight bars, everyone playing.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&build`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&buildPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `barEnergy`'s build, −0.15 + 0.45 · bar / 7. Its ramp is `&buildRise`, a line by the bar from 0 to 1 over eight bars (k/7 to twelve places, its lap eight bars: `cycle=8`), so a build that starts on a section's first bar, a multiple of eight, climbs from its first bar to its last. Jambot's drummer fills its last bar from the half (`drums.ts`): notes, the composer's.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&build, &buildPlays from &song`. `&build, &buildPlays from build &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/07-drop":"---\nid: drop\nsource: seed\n---\n\n```cells\n&drop, &dropPlays from &song\n&drop [&song + .3]\n&dropPlays [0,1,2,3,4]\n```\n\nA drop: the song's intensity and 0.3 more, everyone playing.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&drop`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&dropPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.drop` +0.3. Jambot's build always drops (`FOLLOWERS.build`).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&drop, &dropPlays from &song`. `&drop, &dropPlays from drop &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/08-breakdown":"---\nid: breakdown\nsource: seed\n---\n\n```cells\n&breakdown, &breakdownPlays from &song\n&breakdown [&song + -.45]\n&breakdownPlays [0,1,2]\n```\n\nA breakdown: the song's intensity less 0.45, the drums, the bass and the pad playing, the stab and the lead resting.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&breakdown`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&breakdownPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nLifted from yggi/jambot packages/engine/src/form.ts @ c472cf7: `ENERGY_OFFSET.breakdown` −0.45; the lead rests (`lead.ts`), and the comp pads only, no stab (`comp.ts`: `stabDensity` 0 where `quiet`). How the others play there is notes, the composer's: the drums hats alone and a snare fill in its last bar (`drums.ts`), the bass each chord's root held (`bass.ts`).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&breakdown, &breakdownPlays from &song`. `&breakdown, &breakdownPlays from breakdown &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/09-outro":"---\nid: outro\nsource: seed\n---\n\n```cells\n&outro, &outroPlays from &song\n&outro [&song + &outroFall * -.45]\n&outroFall step=1m cycle=8 0 .142857142857 .285714285714 .428571428571 .571428571429 .714285714286 .857142857143 1\n&outroPlays [0,1,2,3]\n```\n\nAn outro: the song's intensity falling by the bar to 0.45 below it over its eight bars, the lead resting.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice.\n- **`&outro`**, its intensity: the song's, its main parameter `&song`, plus its offset, a sum of values (decision 096), held to 0…1 where it is read. A plan lists the kinds a section a step, `&intensity step=1m/8 &intro &verse &chorus …` (decision 097).\n- **`&outroPlays`**, who plays: the band's entries, by `&band`'s order (`fragments/bands/01-band.md`): 0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead. A plan splices it into a selector over the band, `&form over=&band step=1m/8 &introPlays &versePlays …` (decision 061).\n\nJambot has no outro (its song never ends: yggi/jambot#547 rung 5): its numbers are chosen here (#810 rung 2). It is a build turned round, its ramp `&outroFall` from 0 to 1 by the bar (k/7), the song's intensity falling to a breakdown's (−0.45) by its last bar, and the lead resting as in an intro, the song closing as it opened.\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it.\n\n**Its signature** (decision 065): `&outro, &outroPlays from &song`. `&outro, &outroPlays from outro &song` takes a copy of it, `&song` its main argument, the song's intensity: a cell that is one number (`&song .55`), or a line that moves.\n","sections/10-solo":"---\nid: solo\nsource: seed\n---\n\n```cells\n&solo, &soloPlays from &song\n&solo [&song + .05]\n&soloPlays [0,1,3,4]\n```\n\nA solo: the lead blows over the changes and the rhythm section comps under it, the pad laying out to leave it room; the song's intensity and 0.05 more, a groove's lifted by the soloist. Jambot has none: its numbers are chosen here, a jazz chorus of solos (the stab the comping piano or guitar, the lead the horn). Taken by the jazz song form, `head_solos_head`, for its three choruses of solos.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&solo`**, its intensity, the song's plus its offset; **`&soloPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.\n\n**Its signature** (decision 065): `&solo, &soloPlays from &song`. `&solo, &soloPlays from solo &song` takes a copy of it, `&song` its main argument.\n","sections/11-coro":"---\nid: coro\nsource: seed\n---\n\n```cells\n&coro, &coroPlays from &song\n&coro [&song + .2]\n&coroPlays [0,1,2,3,4]\n```\n\nA coro: salsa's second half, its montuno section, the coro answered by the singer's pregón over the piano's montuno, everyone playing and the band at its hottest but for the mambo; the song's intensity and 0.2 more, between a chorus and a drop. Jambot has none: its numbers are chosen here. Taken by the salsa song form, `son_montuno`.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&coro`**, its intensity, the song's plus its offset; **`&coroPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.\n\n**Its signature** (decision 065): `&coro, &coroPlays from &song`. `&coro, &coroPlays from coro &song` takes a copy of it, `&song` its main argument.\n","sections/12-mambo":"---\nid: mambo\nsource: seed\n---\n\n```cells\n&mambo, &mamboPlays from &song\n&mambo [&song + .25]\n&mamboPlays [0,1,3]\n```\n\nA mambo: the horns' section, their riffs (the stab) over the drums and the bass, the pad and the lead out, the band's peak before the last coro; the song's intensity and 0.25 more. Jambot has none: its numbers are chosen here. Taken by the salsa song form, `son_montuno`.\n\nA section kind (#810, decisions 096 and 097): what a section of this kind holds, by name, for a section plan to splice (`chorus` says how): **`&mambo`**, its intensity, the song's plus its offset; **`&mamboPlays`**, who plays, the band's entries by `&band`'s order (0 the drums, 1 the bass, 2 the pad, 3 the stab, 4 the lead).\n\nIt has no style: a kind is taken by its name, inside a song form that has one (decision 090), so no query returns it; the song forms that take it are found by style.\n\n**Its signature** (decision 065): `&mambo, &mamboPlays from &song`. `&mambo, &mamboPlays from mambo &song` takes a copy of it, `&song` its main argument.\n","songs/01-verse-chorus":`---
id: verse_chorus
source: seed
---

\`\`\`cells
&verseChorus, &verseChorusPlays from &song style=(&synthPop | &chiptune | &electroSwing | &pop)
&verseChorus &intro &verse &chorus &verse &chorus &bridge &chorus &outro
&verseChorusPlays &introPlays &versePlays &chorusPlays &versePlays &chorusPlays &bridgePlays &chorusPlays &outroPlays
&intro, &introPlays from intro &song
&verse, &versePlays from verse &song
&chorus, &chorusPlays from chorus &song
&bridge, &bridgePlays from bridge &song
&outro, &outroPlays from outro &song
\`\`\`

A verse–chorus song: an intro, two verses each answered by its chorus, a bridge, the chorus once more, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (\`fragments/sections/\`), 8 sections, 64 bars at eight bars a section.
- **\`&verseChorus\`**, the song's intensity section by section: each step a kind's (\`&verse\` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, \`&intensity step=1m/8 &verseChorus\`, and passes it to the band (decision 097).
- **\`&verseChorusPlays\`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, \`&form over=&band step=1m/8 &verseChorusPlays\` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where pop's idiom is: Pop itself (#947), Synth-pop, Chiptune (a game's title tune written as a pop song) and Electro swing (vocal swing remade as a pop single), the song a radio plays whole. Each of those styles finds it first, at its own point (\`npm run coverage -- --facet song\`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): \`&verseChorus, &verseChorusPlays from &song\`. \`&verseChorus, &verseChorusPlays from verse_chorus &song\` takes a copy of it, \`&song\` its main argument, the song's intensity (\`&song .55\`).
`,"songs/02-build-drop":`---
id: build_drop
source: seed
---

\`\`\`cells
&buildDrop, &buildDropPlays from &song style=(&techno | &acid | &happyHardcore | &elektro)
&buildDrop &intro &groove &build &drop &breakdown &build &drop &outro
&buildDropPlays &introPlays &groovePlays &buildPlays &dropPlays &breakdownPlays &buildPlays &dropPlays &outroPlays
&intro, &introPlays from intro &song
&groove, &groovePlays from groove &song
&build, &buildPlays from build &song
&drop, &dropPlays from drop &song
&breakdown, &breakdownPlays from breakdown &song
&outro, &outroPlays from outro &song
\`\`\`

A build and a drop, twice: an intro, a groove, a build that drops, a breakdown, a second build and drop, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (\`fragments/sections/\`), 8 sections, 64 bars at eight bars a section.
- **\`&buildDrop\`**, the song's intensity section by section: each step a kind's (\`&verse\` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, \`&intensity step=1m/8 &buildDrop\`, and passes it to the band (decision 097).
- **\`&buildDropPlays\`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, \`&form over=&band step=1m/8 &buildDropPlays\` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where the dance floor's idiom is: Techno, Acid, Happy hardcore and Elektro, the tension and release Jambot's own chain plays at high energy (a build always drops, \`FOLLOWERS.build\`). Each of those styles finds it first, at its own point (\`npm run coverage -- --facet song\`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): \`&buildDrop, &buildDropPlays from &song\`. \`&buildDrop, &buildDropPlays from build_drop &song\` takes a copy of it, \`&song\` its main argument, the song's intensity (\`&song .55\`).
`,"songs/03-groove-breakdown":`---
id: groove_breakdown
source: seed
---

\`\`\`cells
&grooveBreakdown, &grooveBreakdownPlays from &song style=(&deepHouse | &ambient | &darkAmbient | &tripHop | &lofi | &spooky)
&grooveBreakdown &intro &groove &groove &breakdown &groove &groove &outro
&grooveBreakdownPlays &introPlays &groovePlays &groovePlays &breakdownPlays &groovePlays &groovePlays &outroPlays
&intro, &introPlays from intro &song
&groove, &groovePlays from groove &song
&breakdown, &breakdownPlays from breakdown &song
&outro, &outroPlays from outro &song
\`\`\`

A groove and its breakdown: an intro, a long groove, a breakdown in the middle, the groove again, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (\`fragments/sections/\`), 7 sections, 56 bars at eight bars a section.
- **\`&grooveBreakdown\`**, the song's intensity section by section: each step a kind's (\`&verse\` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, \`&intensity step=1m/8 &grooveBreakdown\`, and passes it to the band (decision 097).
- **\`&grooveBreakdownPlays\`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, \`&form over=&band step=1m/8 &grooveBreakdownPlays\` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where a groove is the song: Deep house, Ambient, Dark ambient, Trip hop, Lo-fi hip hop and Spooky, music that holds one state and thins it once rather than climbing to a peak. Each of those styles finds it first, at its own point (\`npm run coverage -- --facet song\`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): \`&grooveBreakdown, &grooveBreakdownPlays from &song\`. \`&grooveBreakdown, &grooveBreakdownPlays from groove_breakdown &song\` takes a copy of it, \`&song\` its main argument, the song's intensity (\`&song .55\`).
`,"songs/04-head-solos-head":"---\nid: head_solos_head\nsource: seed\n---\n\n```cells\n&headSolosHead, &headSolosHeadPlays from &song style=(&swingJazz | &bossaNova | &bluesShuffle)\n&headSolosHead &intro &chorus &solo &solo &solo &chorus &outro\n&headSolosHeadPlays &introPlays &chorusPlays &soloPlays &soloPlays &soloPlays &chorusPlays &outroPlays\n&intro, &introPlays from intro &song\n&chorus, &chorusPlays from chorus &song\n&solo, &soloPlays from solo &song\n&outro, &outroPlays from outro &song\n```\n\nHead, solos, head: an intro, the head (the tune, `&chorus`, everyone playing), three choruses of solos over the changes (`&solo`: the lead blowing, the rhythm section comping, the pad out), the head again, and an outro.\n\nA song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 7 sections, 56 bars at eight bars a section.\n- **`&headSolosHead`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &headSolosHead`, and passes it to the band (decision 097).\n- **`&headSolosHeadPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &headSolosHeadPlays` (decision 061).\n\nIt ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).\n\nWhere jazz's idiom is: Swing jazz, Bossa nova and a Blues shuffle, a tune stated, blown over, and stated again. A jazz \"chorus\" is one pass through the tune; here the head is the section kind `chorus`, the solos `solo`. Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: \"form follows idiom. same for sections\").\n\n**Its signature** (decision 065): `&headSolosHead, &headSolosHeadPlays from &song`. `&headSolosHead, &headSolosHeadPlays from head_solos_head &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).\n","songs/05-strophic":`---
id: strophic
source: seed
---

\`\`\`cells
&strophic, &strophicPlays from &song style=(&kinderlied | &seaShanty | &waltz)
&strophic &intro &verse &verse &verse &verse &outro
&strophicPlays &introPlays &versePlays &versePlays &versePlays &versePlays &outroPlays
&intro, &introPlays from intro &song
&verse, &versePlays from verse &song
&outro, &outroPlays from outro &song
\`\`\`

A strophic song: an intro, the same verse four times, and an outro.

A song form (#810): its sections in order, each a section kind taken by name (\`fragments/sections/\`), 6 sections, 48 bars at eight bars a section.
- **\`&strophic\`**, the song's intensity section by section: each step a kind's (\`&verse\` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, \`&intensity step=1m/8 &strophic\`, and passes it to the band (decision 097).
- **\`&strophicPlays\`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, \`&form over=&band step=1m/8 &strophicPlays\` (decision 061).

It ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).

Where a song is sung verse after verse to one tune: Kinderlied, a Sea shanty and a Waltz. The tune keeps its own form inside each verse (the owner, 2026-11-11: "tunes own form beats the style"): Twinkle's ternary is the verse's, not the song's. Each of those styles finds it first, at its own point (\`npm run coverage -- --facet song\`; the owner, 2026-11-09: "form follows idiom. same for sections").

**Its signature** (decision 065): \`&strophic, &strophicPlays from &song\`. \`&strophic, &strophicPlays from strophic &song\` takes a copy of it, \`&song\` its main argument, the song's intensity (\`&song .55\`).
`,"songs/06-vamp":"---\nid: vamp\nsource: seed\n---\n\n```cells\n&vamp, &vampPlays from &song style=&funk\n&vamp &intro &groove &groove &bridge &groove &breakdown &groove &outro\n&vampPlays &introPlays &groovePlays &groovePlays &bridgePlays &groovePlays &breakdownPlays &groovePlays &outroPlays\n&intro, &introPlays from intro &song\n&groove, &groovePlays from groove &song\n&bridge, &bridgePlays from bridge &song\n&breakdown, &breakdownPlays from breakdown &song\n&outro, &outroPlays from outro &song\n```\n\nA vamp with its breaks: an intro, the groove vamped, a bridge, the groove, a breakdown (the band drops out to the rhythm), the groove again, and an outro.\n\nA song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 8 sections, 64 bars at eight bars a section.\n- **`&vamp`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &vamp`, and passes it to the band (decision 097).\n- **`&vampPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &vampPlays` (decision 061).\n\nIt ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).\n\nWhere the vamp is the song: Funk, one groove held long, broken by a bridge and a breakdown (funk's break); Salsa finds its own form, `son_montuno`. Funk finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: \"form follows idiom. same for sections\").\n\n**Its signature** (decision 065): `&vamp, &vampPlays from &song`. `&vamp, &vampPlays from vamp &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).\n","songs/07-binary":"---\nid: binary\nsource: seed\n---\n\n```cells\n&binary, &binaryPlays from &song style=(&baroque | &march)\n&binary &verse &verse &bridge &bridge\n&binaryPlays &versePlays &versePlays &bridgePlays &bridgePlays\n&verse, &versePlays from verse &song\n&bridge, &bridgePlays from bridge &song\n```\n\nA binary form, A A B B: its first strain twice (`&verse`), its second twice (`&bridge`).\n\nA song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 4 sections, 32 bars at eight bars a section.\n- **`&binary`**, the song's intensity section by section: each step a kind's (`&verse` …), the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &binary`, and passes it to the band (decision 097).\n- **`&binaryPlays`**, who plays section by section: each step a kind's entries over the band. A score splices it into its selector over the band, `&form over=&band step=1m/8 &binaryPlays` (decision 061).\n\nIt ends where its last section ends, and comes round: a song is its form's length, so a new one starts at a section boundary (yggi/jambot#547 rung 5).\n\nWhere a dance or a march is the song: Baroque (a suite's dance in two repeated halves) and a March (its strains, each repeated). Each of those styles finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: \"form follows idiom. same for sections\").\n\n**Its signature** (decision 065): `&binary, &binaryPlays from &song`. `&binary, &binaryPlays from binary &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).\n","songs/08-son-montuno":"---\nid: son_montuno\nsource: seed\n---\n\n```cells\n&sonMontuno, &sonMontunoPlays from &song style=&salsa\n&sonMontuno &intro &verse &verse &coro &mambo &coro &outro\n&sonMontunoPlays &introPlays &versePlays &versePlays &coroPlays &mamboPlays &coroPlays &outroPlays\n&intro, &introPlays from intro &song\n&verse, &versePlays from verse &song\n&coro, &coroPlays from coro &song\n&mambo, &mamboPlays from mambo &song\n&outro, &outroPlays from outro &song\n```\n\nSalsa's form: an intro, the song itself (its verses, the son), then the montuno section (the kind `coro`: the coro answered by the singer over the piano's figure), the mambo, the horns' riffs at the band's peak, the coro again, and an outro (#720's bonus: section kinds of a style's own).\n\nA song form (#810): its sections in order, each a section kind taken by name (`fragments/sections/`), 7 sections, 56 bars at eight bars a section.\n- **`&sonMontuno`**, the song's intensity section by section: each step a kind's, the song's plus the kind's offset (decision 096). A score splices it a section a step, `&intensity step=1m/8 &sonMontuno`, and passes it to the band (decision 097).\n- **`&sonMontunoPlays`**, who plays section by section. A score splices it into its selector over the band, `&form over=&band step=1m/8 &sonMontunoPlays` (decision 061).\n\nIt ends where its last section ends, and comes round (yggi/jambot#547 rung 5). Where its idiom is: Salsa, which finds it first, at its own point (`npm run coverage -- --facet song`; the owner, 2026-11-09: \"form follows idiom. same for sections\"); Salsa found `vamp` before.\n\n**Its signature** (decision 065): `&sonMontuno, &sonMontunoPlays from &song`. `&sonMontuno, &sonMontunoPlays from son_montuno &song` takes a copy of it, `&song` its main argument, the song's intensity (`&song .55`).\n","stab/01-charleston-stabs":"---\nid: charleston_stabs\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 2c120d4\n---\n\n```cells\n&stabline from &harm style=&electroSwing * .4\n&stabline step=8n cycle=4 &charleston!3 &push\n&charleston over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~@4\n&push over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~ [0,1,2] ~ &ahead\n&ahead over=&harm[>>] [1,2,3]\n```\n\nThe stabs of [Electro swing, in pieces](../../examples/electroswing.md): the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes: its last stab, on the and of four, is the next chord, its third and fifth with its root on top (`&ahead over=&harm[>>]`, as the funk bass anticipates with `&bassNext`).\nIt is the part the stab performer plays (`&stabline`, decision 058), the first of the facet `stab`, as the bass lines are the bass performer's: its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter, and its velocities are the performer's (`&stabLevel`).\n`&charleston`, `&push` and `&ahead` are its helpers: `use &stabline from charleston_stabs` takes them.\nIt is the example's line at the commit it was lifted from, but for that last stab, which there read the chord in force (the owner's review of #305).\n\nAt a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 0.4, so no other preset finds it within Jambot's miss distance (0.3; at weight 1 it was the first stab of five, #404): no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 065): `&stabline from &harm`. `&stabline from charleston_stabs &harm` takes a copy of it, `&harm` its main argument.\n","stab/02-spooky-stabs":"---\nid: spooky_stabs\nsource: seed\nlifted: yggi/cells examples/spooky.md @ a8de625f\n---\n\n```cells\n&stabline from &harm style=&spooky * .4\n&stabline over=&harm step=8n ~ [0,1,2] ~ ~ ~ ~ [0,1,2] ~ ~ ~\n```\n\nThe stabs of [Spooky, in pieces](../../examples/spooky.md): a chord on the second eighth of a bar of five beats and another on the seventh, so they fall off the heartbeat and never twice in the same place in the beat.\nIt is the part the stab performer plays (`&stabline`, decision 058): its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter of five beats, and its velocities are the performer's (`&stabLevel`).\n\nAt Spooky's point (sync .2, harm .9, bite .3, mood .3), weight 0.4, so no other preset finds it within the miss distance (Lo-fi hip hop at weight 1, #572), as the facet `stab`: Spooky's own stab, as `charleston_stabs` is Electro swing's (#572, its parts by facet).\n","stab/03-rave-stabs":`---
id: rave_stabs
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&stabline from &harm style=&happyHardcore * .4
&stabline over=&harm step=8n ~ [0,1,2] ~ [0,1,2] ~ [0,1,2] ~ [0,1,2]
\`\`\`

The rave stabs of [Hypercell](../../examples/hypercell.md): the chord in force on every offbeat eighth, against the four-on-the-floor kick, as 90s happy hardcore and eurodance stab.
It is the part the stab performer plays (\`&stabline\`, decision 058): indices into the chord in force (\`over=&harm\`), its velocities the performer's.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 0.4, so no other preset finds it within the miss distance (Synth-pop, Deep house and Kinderlied at weight 1, #572), as the facet \`stab\` (#572).
`,"styles/01-styles":`---
id: styles
source: seed
---

\`\`\`cells
* from style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz | &electroSwing | &spooky | &kinderlied | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &bluesShuffle | &seaShanty | &chiptune | &salsa | &waltz | &march | &tripHop | &pop)
&synthPop map=style label="Synth-pop" step=108bpm sync=.3 ± .1 harm=.45 ± .1 bite=.55 ± .1 mood=.5 ± .1
&techno map=style label="Techno" step=130bpm sync=.12 harm=0 bite=1 mood=.4
&deepHouse map=style label="Deep house" step=122bpm sync=.35 harm=.55 bite=.65 mood=.65
&ambient map=style label="Ambient" step=72bpm sync=.05 harm=.3 bite=0 mood=.9
&lofi map=style label="Lo-fi hip hop" step=84bpm sync=.5 harm=.75 bite=.35 mood=.5
&funk map=style label="Funk" step=104bpm sync=1 harm=.12 bite=.85 mood=.65
&bossaNova map=style label="Bossa nova" step=132bpm sync=.75 harm=.85 bite=.45 mood=.9
&swingJazz map=style label="Swing jazz" step=148bpm sync=.35 harm=1 bite=.3 mood=.85
&electroSwing map=style label="Electro swing" step=124bpm sync=.55 harm=.75 bite=.6 mood=.5
&spooky map=style label="Spooky" step=100bpm sync=.2 harm=.9 bite=.3 mood=.3
&kinderlied map=style label="Kinderlied" step=96bpm sync=.1 harm=.12 bite=.5 mood=.95
&acid map=style label="Acid" step=126bpm sync=.45 harm=.05 bite=.85 mood=.35
&happyHardcore map=style label="Happy hardcore" step=160bpm sync=.25 harm=.45 bite=.8 mood=.9
&elektro map=style label="Elektro" step=112bpm sync=.15 harm=.5 bite=.85 mood=.45
&darkAmbient map=style label="Dark ambient" step=76bpm sync=.35 harm=.15 bite=.4 mood=.1
&baroque map=style label="Baroque" step=90bpm sync=.15 harm=.8 bite=.5 mood=.85
&bluesShuffle map=style label="Blues shuffle" step=120bpm sync=.65 harm=.55 bite=.45 mood=.65
&seaShanty map=style label="Sea shanty" step=112bpm sync=.1 harm=.25 bite=.7 mood=.65
&chiptune map=style label="Chiptune" step=144bpm sync=.3 harm=.7 bite=1 mood=.55
&salsa map=style label="Salsa" step=180bpm sync=.9 harm=.5 bite=.7 mood=.75
&waltz map=style label="Waltz" step=150bpm sync=0 harm=.7 bite=.3 mood=.9
&march map=style label="March" step=120bpm sync=0 harm=.1 bite=.75 mood=.7
&tripHop map=style label="Trip-hop" step=80bpm sync=.7 harm=.2 bite=.2 mood=.25
&pop map=style label="Pop" step=116bpm sync=.3 ± .15 harm=.4 ± .2 bite=.5 ± .25 mood=.7 ± .3
\`\`\`

The library of styles (decision 063 §3, #391, #537): the twenty-four preset styles, each a \`map=style\` cell at its point, its axes by name (cells' table of axes, \`AXES\`), its display name its \`label=\` and its default tempo its \`step=\`. They are Jambot's eight from the prototype, then Electro swing and Spooky (#349), then Kinderlied (yggi/jambot#547), whose 96 bpm is Twinkle's, then four read from the examples (#572, #542): Acid, from *Acid-Cell* (its 303, its riff and its beat), Happy hardcore, from *Hypercell*, and Elektro, from *Zelluläre Aktivität*. Their moods are placed by hand: Acid's minor hypnotic and tense (.35), Happy hardcore's euphoric though it turns on A minor (.9: the mood goes beyond the mode), Elektro's cool (.45). Dark ambient, from *Ghost-Cells*, is the bottom of the mood axis (.1): a minor drone made menacing. Then four more cut from the examples (#542): Baroque, from the Bach pieces, Blues shuffle, from *Swing blues*, Sea shanty, from *Drunken Sailor*, and Chiptune, from *Korobeiniki*; and four placed by hand, with parts written for them (#542): Salsa (the clave's off-beats, the tumbao, mixolydian), Waltz (where 3/4 and the \`waltz\` motif already sat), March (2/4, stamping and bright) and Trip-hop (.7 .2 .2 .25, the offbeat, static, paddy and dark corner no style held).

Then Pop (#947, decision 108), the first with a breadth: a reach on each axis, how far the genre spreads around its centre (\`sync=.3 ± .15\`). Its centre is mostly straight, triads and a seventh, middling bite and bright; its breadth runs from the ballad to dance pop on sync and bite, and from the bittersweet to the euphoric on mood; its 116 bpm is a pop song's middle. Synth-pop is its sub-genre: its point where it was, ± .1 on each axis, an area inside Pop's (\`within\`). Deep house, a point, lies inside Pop's area too. A query reads the point, the centre, alone (#644).

This file is the presets' one source: \`STYLES\` (\`src/repository/styles.ts\`) reads each as \`{ id, name, point, tempo }\`, and its \`reach\` where it writes one, in this order, and a frontend takes its presets from there. Only the library reads the \`step=\`: \`style=\` and a query read the point, so a style has no tempo (decision 037, D6).

A score names its section's style by one of them where the section sits exactly on it, and by its numbers or a mix of them where it doesn't:

\`\`\`text
&funk from styles
&style label="Funk" style=&funk
\`\`\`

The default band reads the style through \`&style\` (\`band\`: its bass's and its lead's cutoff), and so does its choice of instruments (\`resolveBand\`): Spooky's, named, plays the round bass, the organ, the celesta and the theremin, as its numbers do.

The points were lifted from yggi/jambot \`packages/engine/src/style.ts\` @ 7b078e8, with their tempos @ dcc414d. Associated once at each of them, as the facet \`style\`, at weight 1: the style nearest a point is a query (\`{ facet: 'style' }\`), and a test holds the association to the cells' points.
`};function hc(){let e=fc(mc);if(`problems`in e)throw Error(`The seed library doesn't read: ${e.problems.join(`; `)}`);return e.files}var gc=hc(),_c=e=>Rs(e.fragment),vc=e=>gc.filter(t=>t.path.startsWith(`${e}/`)).flatMap(_c),yc=vc(`instruments`),bc=[1,2,3,4,6,8,12,16],xc=.995,Sc=Object.fromEntries(ee.map(e=>[e.note,e.name])),Cc=Object.fromEntries(yc.find(e=>e.id===`gm_kit`).text.split(`
`).flatMap(e=>{let t=/^&(\w+) (.*)$/.exec(e);return t?[[t[1],t[2]]]:[]})),wc=`s=sine env=&(map=adsr 0 .3 0 .05)`,Tc=`s=white hpf=6000 env=&(map=adsr 0 .1 0 .05)`;function Ec(e,t){let n=(e??``).trim().split(/\s+/),r=[];for(let e of n){let t=/^([A-Za-z][A-Za-z0-9]*)(?:\(([A-G][#b]?-?\d|\d+(?:\.\d+)?)\))?$/.exec(e);if(!t)return null;r.push({member:t[1],pitch:t[2]??null})}let i=I(r.map(e=>e.member),F),a=new Map;for(let{member:e,pitch:t}of r){let n=i.get(e);if(n===void 0)continue;let r=F(e),o=r===null?void 0:Cc[Sc[r]??``],s=(o?o.replace(/ ?loop=\S+/,``):t?wc:Tc).replace(/^note=\d+ /,``);a.set(n,{member:e,sound:`note=${n} ${t?s.replace(/^(s=\S+)/,`$1 loop=${t}`):s}`})}return t.every(e=>a.has(e.key))?a:null}var Dc=new Set([`out`,`piece`,`tempo`,`bar`,...Object.keys(Cc)]),Oc=(e,t=5)=>String(Number(e.toPrecision(t)));function kc(e,t){let n=(e??``).normalize(`NFKD`).replace(/[̀-ͯ]/g,``).split(/[^A-Za-z0-9]+/).filter(Boolean).map((e,t)=>t?e[0].toUpperCase()+e.slice(1):e[0].toLowerCase()+e.slice(1)).join(``);return n&&/^[A-Za-z]/.test(n)||(n=t),n.slice(0,24)}function Ac(e,t){let n=n=>{let r=Math.min(Math.max(1,e/96),n/8);return t.filter(e=>Math.abs(e-Math.round(e/n)*n)>r).length};for(let r of bc){let i=e/r,a=n(i);if(t.length-a>=xc*t.length)return{step:i,perQuarter:r,moved:a}}return{step:e/4,perQuarter:4,moved:n(e/4)}}function jc(e,t){let n=[],r=0,i=e=>{for(;e>de;e-=de)n.push(`~@${de}`);e>0&&n.push(e===1?`~`:`~@${e}`)};for(let t of e){i(t.at-r);let e=t.values.length===1?t.values[0]:`[${t.values.join(`,`)}]`;n.push(t.dur===1?e:`${e}@${t.dur}`),r=t.at+t.dur}return i(t-r),n.join(` `)}function Mc(e,t,{free:n=!0,shorten:r=!1,credit:i=[],pitches:a=`auto`,split:o=`auto`,watch:s,story:c=!1}={}){if(r&&o!==`tracks`){let l=Lc(e),u=e=>s&&((t,n)=>n.tool!==`done`&&s(t,e?{...n,tool:`${n.tool}, ${e}`}:n)),d={free:n,shorten:r,credit:i,pitches:a,story:c,split:`tracks`},f=o===`voices`&&l?null:Mc(e,t,{...d,watch:u(``)}),p=l&&Mc(l,t,{...d,watch:u(`in voices`)}),m=p?.folded&&(!f||!f.folded||Ss(p.source)<Ss(f.source))?p:f;return s?.(()=>m.source,{tool:`done`,round:0}),m}let l=[];e.tracks.forEach((e,t)=>{let n=[...new Set(e.notes.map(e=>e.channel))].sort((e,t)=>e-t);for(let r of n){let i=kc(e.name,`track${t+1}`),a=e.notes.filter(e=>e.channel===r),o=r===10?Ec(e.name,a):null,s=o?kc([...new Set([...o.values()].map(e=>e.member))].join(` `),`track${t+1}`):i;l.push({name:n.length>1?`${s}Ch${r}`:s,drums:r===10,notes:a,kit:o})}});let u=l.flatMap(e=>e.notes),{step:d,perQuarter:f,moved:p}=Ac(e.ppq,[...u.map(e=>e.tick)]),m=e=>Math.round(e/d),h=Math.max(1,...u.map(e=>Math.max(m(e.tick)+1,m(e.end)))),g=Array.from({length:h},(t,n)=>Yo(e,(n+1)*d)-Yo(e,n*d)),_=new Map;for(let e of g)_.set(Oc(e,6),(_.get(Oc(e,6))??0)+1);let v=Number([..._].sort((e,t)=>t[1]-e[1])[0][0]),y=g.map(e=>Oc(e/v)),b=[];for(let e=0;e<h;){let t=1;for(;e+t<h&&y[e+t]===y[e];)t++;b.push(t===1?y[e]:`${y[e]}!${t}`),e+=t}let x=g.reduce((e,t)=>e+t,0),S=60*h/(x*f),C=4*f,w=e=>Number.isInteger(e)&&Number.isInteger(Math.log2(e)),T=C===4?``:w(C)?` pulse=${C}n`:w(2*C/3)?` pulse=${2*C/3}t`:` pulse=${C}n`,E=n?`free(${Oc(S,6)}bpm, ${Math.floor(S*.6)}..${Math.ceil(S*1.5)})`:`${Oc(S,6)}bpm`,D=`&tempo scan(${b.join(` `)})${T} step=${E} laps=1`,O=Wc(e,f,y.map(Number),Number(Oc(S,6)),h,n),k=new Set(Dc),A=e=>{let t=e;for(let n=2;k.has(t);n++)t=`${e}${n}`;return k.add(t),t},j=[],M=[],N=[],P=new Set,F=new Map,ee=l.some(e=>e.drums&&!e.kit),I=(e,t)=>{for(let[n,r]of F)if(r===t&&n.replace(/\d+$/,``)===e)return n;let n=e;for(let t=2;F.has(n)||k.has(n)&&(ee||!(n in Cc));t++)n=`${e}${t}`;return k.add(n),F.set(n,t),n},te=l.map(e=>e.kit?new Map([...e.kit].map(([e,t])=>[e,I(t.member,t.sound)])):null),ne=0,re=0;for(let[t,n]of l.entries()){let r=[],i=te[t],a=n.drums?null:Nc(n.notes,e);for(let e of a?.notes??[...n.notes].sort((e,t)=>e.tick-t.tick||e.key-t.key)){let t=i?i.get(e.key):n.drums?Sc[e.key]:String(e.key-60);if(t===void 0){ne++;continue}n.drums&&!i&&P.add(t);let a=m(e.tick),o=Math.max(1,m(e.end)-a),s=n.drums?`&${t}`:t,c=r.find(e=>{let t=e[e.length-1];return t.at===a&&t.dur===o&&!t.values.includes(s)||t.at+t.dur<=a}),l=c?.[c.length-1];c&&l.at===a&&l.dur===o?c[c.length-1]={...l,values:[...l.values,s]}:c?c.push({at:a,dur:o,values:[s]}):r.push([{at:a,dur:o,values:[s]}]),re++}if(!r.length)continue;let o=n.drums?null:A(`${n.name}Voice`),s=r.map(()=>A(n.name));r.forEach((e,t)=>j.push({name:s[t],chords:e,length:O?O.steps:h})),o&&N.push(`&${o} s=tri loop=C4${a?` glide=${a.glide}`:``} env=&(map=adsr .005 .2 .6 .15)`);for(let e of s)M.push(o?`&${e} * &${o} * .25`:`&${e} * .4`)}let ie=new Map,L=(e,t)=>{let n=`Opened from a MIDI file: ${re} notes in ${j.length} line${j.length===1?``:`s`}, ${f} step${f===1?``:`s`} a quarter note, ${t}.`,r=[...i.length?[...i.map(e=>`# ${e}`),``]:[],...R.lines.length?R.lines:[`# the file's tempo map: a step each ${f===4?`sixteenth`:`1/${f} of a quarter note`}; laps=1, so the piece ends`,D],``,...e,``,...N,...[...P].sort().map(e=>`&${e} ${Cc[e]}`),...[...F].map(([e,t])=>`&${e} ${t}`),`&out map=sample [${M.join(`, `)}]`,``].join(`
`);return ie.set(r,n),r},ae=()=>L([`# every note, a line a track (and one beside for notes that overlap); melodies as semitones from C4`,...j.map(e=>`&${e.name} step=${R.tap} ${jc(e.chords,e.length)}`)],`written out in full: Shorten folds it`),R={lines:[],tap:`pulse`},z=ae(),oe=z;for(let e of O?.options??[]){Object.assign(R,{lines:e,tap:O.tap});let t=ae();if(Vc(z,t)){oe=t;break}Object.assign(R,{lines:[],tap:`pulse`})}let se=oe,ce=!1,le=null,ue;if(r&&j.length){let t=(e,t,n)=>e===`done`?`folded`:t?`${e}, ${n}`:e,n=(e,t)=>{let{defs:n,lines:r,scales:i}=jo(e,`m`,R.tap,`^$`,t);return L([`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up`,...n,``,`# every note, a line a track; melodies as semitones from C4`,...j.map(e=>`&${e.name} step=${R.tap}${i.get(e.name)===1?``:`/${i.get(e.name)}`} ${r.get(e.name)}`)],`folded (engine/fold)`)},r=[];if(a===`auto`||a===`semitones`){let e=Uo(j,s&&((e,r)=>s(()=>n(e()),{...r,tool:t(r.tool,r.round,`in semitones`)})));r.push({source:n(e),key:null,from:j,folded:e,print:n,how:`Every note written out, as semitones from C4`})}let i=ss(j);if(a!==`semitones`&&i&&j.some(e=>e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`))))){let n=A(`key`),o=(e,t)=>{let{defs:r,lines:a,scales:o}=jo(e,`m`,R.tap,`^`,t);return L([`# the key: the lines read through it, a note its degree (0 the tonic; 6# the seventh raised a semitone)`,`&${n} ${ns(i)}`,``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# every note, a line a track; melodies as degrees of ${rs(i)}`,...j.map(e=>`&${e.name} step=${R.tap}${o.get(e.name)===1?``:`/${o.get(e.name)}`}${e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`)))?` over=&${n}`:``} ${a.get(e.name)}`)],`folded in degrees of ${rs(i)} (engine/fold)`)};if(a===`auto`||a===`degrees`){let e=cs(j,i),n=Uo(e,s&&((e,n)=>s(()=>o(e()),{...n,tool:t(n.tool,n.round,`in degrees of ${rs(i)}`)})),{degrees:!0});r.push({source:o(n),key:rs(i),from:e,folded:n,print:o,how:`Every note written out, as degrees of ${rs(i)}`})}let c=e.meters[0]??{num:4,den:4},l=Math.max(1,Math.round(f*4*c.num/c.den)),u=a===`auto`||a===`sections`?ps(j,l):[];if(u.length>1){let e=ms(j,u,l),n=e.map(e=>cs([e.part],u[e.section].key)[0]),i=[...new Set(u.map(e=>ns(e.key)))],a=new Map(i.map((e,t)=>[e,A(`key${t+1}`)])),o=new Map,c=(t,n)=>{let{defs:r,lines:s,scales:c}=jo(t,`m`,R.tap,`^`,n),l=new Map,d=[],f=new Map(j.map(e=>[e.name,[]]));for(let t of e){let e=s.get(t.part.name),n=c.get(t.part.name)??1,r=n===1?``:`@${n}`;if(/^~(@\d+)?(!\d+)?$/.test(e)){let e=f.get(t.line),n=/^~(?:@(\d+))?$/.exec(e[e.length-1]??``),r=t.part.length+(n?Number(n[1]??1):0);n&&e.pop(),e.push(r===1?`~`:`~@${r}`);continue}let i=a.get(ns(u[t.section].key)),p=`${i} ${e}`,m=l.get(p);m||(m=o.get(`${t.line}§${t.section}`)??A(`${t.line}${String.fromCharCode(65+t.section%26)}`),o.set(`${t.line}§${t.section}`,m),l.set(p,m),d.push(`&${m} over=&${i} ${e}`)),f.get(t.line).push(`&${m}${r}`)}return L([`# the keys: a section a key, cut where the key changes; a note its degree (0 the tonic; 6# the seventh raised a semitone)`,...i.map(e=>`&${a.get(e)} ${e}`),``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# the sections, a cell each part of a line, read through its section's key: ${u.map(e=>rs(e.key)).join(`, `)}`,...d,``,`# every note, a line a track: its sections in order`,...j.map(e=>`&${e.name} step=${R.tap} ${zc(f.get(e.name))}`)],`folded in ${u.length} sections by key (engine/fold)`)},d=Uo(n,s&&((e,n)=>s(()=>c(e()),{...n,tool:t(n.tool,n.round,`in ${u.length} sections by key`)})),{degrees:!0});r.push({allowance:Rc,source:c(d),key:`${u.length} sections by key (${u.map(e=>rs(e.key)).join(`, `)})`,from:n,folded:d,print:c,how:`Every note written out, in ${u.length} sections by key`})}}let o=e=>{let t=new Map(Ao(e.folded).map((e,t)=>[e,`m${t+1}`]));return Qo(e.from,e.folded).map((n,r)=>{let i=n.came===null?null:e.folded.rules.get(n.came),a=`in ${n.uses} place${n.uses===1?``:`s`}`,o=i?i.of?`&${t.get(n.came)} · a copy of &${t.get(i.of)}, changed · ${a}`:`&${t.get(n.came)} · ${i.kids.length} steps · ${a}`:r===0?e.how:`The lines on their own clocks, figures read over chords`;return{source:e.print(n.folded,t),says:o}})},l=new Map(r.map(e=>[e,Ss(e.source)])),u=Ss(oe);for(let e of r.sort((e,t)=>l.get(e)/(e.allowance??1)-l.get(t)/(t.allowance??1)))if(l.get(e)<u&&Bc(oe,e.source)){[se,ce,le]=[e.source,!0,e.key],c&&(ue=o(e));break}let d=se;s?.(()=>d,{tool:`done`,round:0})}return{source:se,frontmatter:{title:t,tags:[`midi`],description:ie.get(se)},notes:re,lines:j.length,perQuarter:f,moved:p,dropped:ne,folded:ce,inKey:le,...c?{story:ue??[{source:se,says:`Every note written out`}]}:{}}}function Nc(e,t){let n=[...e].sort((e,t)=>e.tick-t.tick||e.key-t.key);if(n.some((e,t)=>t>0&&e.tick===n[t-1].tick))return null;let r=e=>Yo(t,e),i=n.flatMap((e,t)=>{let i=n[t+1];if(!i||e.end<=i.tick)return[];let a=n[t+2],o=(a&&a.tick<i.end?r(a.tick):r(i.end))-r(i.tick);return[{i:t,by:r(e.end)-r(i.tick),room:o}]});if(i.length<2)return null;let a=Math.max(...i.map(e=>e.by));if(!i.every(e=>Math.abs(e.by-Math.min(a,e.room))<=Pc))return null;let o=new Set(i.map(e=>e.i));return{notes:n.map((e,t)=>o.has(t)?{...e,end:n[t+1].tick}:e),glide:Math.round(a*1e3)/1e3}}var Pc=.004,Fc={2:[`upper`,`lower`],3:[`upper`,`middle`,`lower`],4:[`soprano`,`alto`,`tenor`,`bass`]},Ic=8;function Lc(e){let t=e.tracks.map(e=>e.notes.filter(e=>e.channel!==10)).filter(e=>e.length);if(new Set(e.tracks.filter(e=>e.notes.some(e=>e.channel!==10)).map(e=>e.programs[0]?.program??0)).size>1||t.some(t=>Nc(t,e)))return null;let n=t.flat().sort((e,t)=>e.tick-t.tick||t.key-e.key),{voice:r,count:i}=ys(n.map(e=>({start:e.tick,end:e.end,key:e.key})));if(i<=t.length||i>Ic)return null;let a=Fc[i]??Array.from({length:i},(e,t)=>`voice${t+1}`),o=n[0].channel,s=a.map((e,t)=>({name:e,notes:n.filter((e,n)=>r[n]===t).map(e=>({...e,channel:o})),bends:[],programs:[]})),c=e.tracks.flatMap(e=>e.notes.some(e=>e.channel===10)?[{...e,notes:e.notes.filter(e=>e.channel===10)}]:[]);return{...e,tracks:[...s.filter(e=>e.notes.length),...c]}}var Rc=1.15;function zc(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}function Bc(e,t){let n=e=>{let t=W(e);if(!t.ok)return null;let n=z(t,J(t),t.off);return B(n,0,n.end).map(e=>`${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`).sort()},[r,i]=[n(e),n(t)];return!!r&&!!i&&r.length===i.length&&r.every((e,t)=>e===i[t])}function Vc(e,t){let n=e=>{let t=W(e);if(!t.ok)return null;let n=z(t,J(t),t.off);return B(n,0,n.end).sort((e,t)=>e.at-t.at||e.freq-t.freq||e.voice.localeCompare(t.voice))},[r,i]=[n(e),n(t)],a=(e,t)=>Math.abs(e-t)<=1e-6;return!!r&&!!i&&r.length===i.length&&r.every((e,t)=>e.voice===i[t].voice&&a(e.at,i[t].at)&&a(e.dur,i[t].dur)&&a(e.freq,i[t].freq))}var Hc={.5:`2n`,1:`4n`,2:`8n`,3:`8t`,4:`16n`,6:`16t`,8:`32n`,12:`32t`,16:`64n`},Uc=(e,t=6)=>String(Number(e.toFixed(t))).replace(/^0\./,`.`);function Wc(e,t,n,r,i,a){let o=Hc[t],s=[...new Set(e.meters.map(e=>`${e.num}/${e.den}`))];if(!o||s.length!==1||e.meters[0].tick!==0)return null;let c=s[0],{num:l,den:u}=e.meters[0],d=t*4*l/u,f=W(`&bar meter("${c}") step=60bpm`).cells.get(`bar`)?.meter;if(!f||!Number.isInteger(d)||d<1||i<d)return null;let p=(e,t)=>Math.abs(e-t)<=1e-4*Math.max(e,t),m=[...Array(d).keys()].map(e=>e+1).find(e=>d%e===0&&n.every((t,r)=>p(t,n[r%e])));if(!m)return null;let h=n.slice(0,m),g=Hc[t/2],_=e=>m===1?``:m===2?` swing=${o}:${Uc(h[0]/(h[0]+h[1]),e)}`:m===4&&g&&p(h[0],h[1])&&p(h[2],h[3])?` swing=${g}:${Uc((h[0]+h[1])/(h[0]+h[1]+h[2]+h[3]),e)}`:` bend=${o}:&(${h.map(t=>Uc(t,e)).join(` `)})`,v=[...new Set([_(3),_(6)])],y=r*f.beats.length/(4*l/u),b=a?`free(${Oc(y,9)}bpm, ${Math.floor(y*.6)}..${Math.ceil(y*1.5)})`:`${Oc(y,9)}bpm`;return{tap:o,steps:Math.ceil(i/d)*d,options:v.map(e=>[`# the file's meter, ${c}${e?`, its lean repeating each ${m===d?`bar`:`${m} ${o} steps`}`:``}; laps=, its bars, so the piece ends`,`&bar meter("${c}") step=${b}${e} laps=${Math.ceil(i/d)}`])}}var Gc=2048;(()=>{let e=new Float64Array(Gc);for(let t=0;t<Gc;t++)e[t]=Math.sin(2*Math.PI*t/Gc);return e})(),Math.log(3.8)/Math.log(200);var Kc=`oscillator.tone.rests.semitones.twovoices.steps.clock.voice.effects.band-pass.transpose.twinkle.chords.rhythm.drums.swing.advanced-meter.strudel.breve.canon.mirrors.variations.chance.fifths.cycle.circle.arrangement.stereo.waveforms.moving.style.grids.metronome.fm.musicbox.automaton.kalimba.sympathy.harmonograph.echotape.worn.dtmf.daytime.gate.play-in.midi-out.lullaby.jazz.funk.drumtrack.ending.twelve.five.aksak.waltz.sailor.royal.pertonos.ricercar.korobeiniki.coltrane.bossa.bell.prelude.pachelbel.pop.idm.alpha.studie.just.bwv847.acid.patchbay.zell.cellscape.cellscape2.baustelle.focus.hypercell.onemore.electroswing.spooky.kinderlied.radio.song.brothers.ghosts.tines.phase.in-c.tape.soundtape.testtones.forks.resonanz.fiveto12`.split(`.`),qc={acid:`---
title: "Acid-Cell: everybody needs a 303"
tags: [genre:electronic, chromatic, sound]
description: "Acid-Cell — everybody needs a 303: a saw through a resonant filter that opens on every note."
---

An original acid line: a saw through a resonant low-pass whose envelope opens on every note, further on the accents, while a hand turns the cutoff and the resonance, slowly (all of it \`lpf=… * &cell\`). The echo is a dotted eighth.

\`\`\`cells
* from style=&acid
&filterNote label="Every note opens the filter (&fenv); accents open it further, and play louder (&accent)." about=(&fenv &accent)
&knobsNote label="Two knobs turn slowly, the cutoff and the resonance: listen to the squeal as they meet." about=(&knob &res)
&bar from bar &tempo
&strike, &thump, &snap, &click from envelopes
&tempo step=free(126bpm, 100..150)
&minor scan(2 1 2 2 1 2 2)                                   # A minor (the voices sit on A)

&riff 0 0 7 0 ~ 0 4 0 6 ~ 0 7 0 2 3 4                      # a bar of sixteenths
&turn 0 0 7 0 ~ 7 6 4 2 ~ 0 4 6 7 9 7                      # … and its answer
&line over=&minor step=16n &riff &turn &riff &riff^$-2      # the last bar a whole tone down
&accent map=amp step=16n 1 .4 .8 .4 0 .4 1 .4 .6 0 .4 1 .4 .5 .4 .4
&fenv map=adsr .003 .18 .1 .06 label="filter envelope"
&knob map=lin loop=&bar/16 .2 1 .35 .2 label="cutoff knob"
&res map=lin loop=&bar/32 6 19 6 label="resonance knob"

&b1 [&bd,&hh:0:.3] &hh:0:.2 [&hh:0:.5,&oh:0:.5] &hh:0:.2                    # a beat: the kick, the closed hat's accents, the open hat on the and
&b2 [&bd,&cp,&hh:0:.3] &hh:0:.2 [&hh:0:.5,&oh:0:.5] &hh:0:.2                # … with the clap
&beat step=16n &b1 &b2 &b1 &b2

&tb303 s=saw loop=A2 lpf=110..3800 * &fenv * &accent * &knob lpq=&res delaytime=&bar*4/3 delay=.22 delayfeedback=.35 env=&strike
&bd note=36 gain=.8 oneshot=1 s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&thump
&cp seed=0 note=39 gain=.35 oneshot=1 s=white hpf=1500 env=&snap room=.2
&hh seed=1 note=42 gain=.25 s=white hpf=8000 env=&click
&oh seed=2 note=46 gain=.2 oneshot=1 s=white hpf=7000 env=&(map=adsr 0 .2 0 .1)

&mix postgain=2.83 map=sample [&line * &accent * &tb303 * .45, &beat]
\`\`\`
`,"advanced-meter":`---
title: "Advanced meter: a bent bar, a leaning three"
tags: [tutorial, rhythm]
tier: 4
description: "A 7/8 of two, two and three whose three leans long, short, short: a bend gives the eighths the lengths of a table, and the beats never move."
---

A meter is a bar of beats: \`meter("2+2+3")\` is seven eighths in beats of two, two and three, so its bpm counts three beats, the last half again as long as the others. Taps of it, \`step=beat\` and \`step=8n\`, follow whatever the meter does.
Swing leans the pairs and keeps a three even (decision 071), so it can't lean a three. A **bend** can: \`bend=8n:&lean\` gives the eighths the numbers of a table as their lengths, in turn, so \`&lean 3 3 3 3 4 3 3\` plays the twos even and the three long, short, short. The beats, and the bar, never move: only the eighths inside a beat do.
Its depth, after a second colon, is a slider: 0 is even, 1 is as written, 2 the lengths squared (16 : 9 : 9 in the three).

\`\`\`cells
&leanNote label="A table of seven numbers, one a eighth: the twos are 3 3 and 3 3, even, the three 4 3 3, long, short, short. bend=8n:&lean gives the eighths those lengths; the beats never move." about=&lean
&depthNote label="The bend's depth is a slider after the table: 0 even, 1 as written, 2 twice as far. Drag it and the three leans more or less, the beats where they were." about=&bar
&bar meter("2+2+3") step=&tempo bend=8n:&lean:free(1, 0..2)
&tempo step=free(150bpm, 100..200)
&lean 3 3 3 3 4 3 3

&line over=scale(minor) step=8n 0 2 4 2 4 5 4
&roots over=scale(minor) step=beat 0 0 -3
&beat step=beat &bd ~ &hh

&bd, &hh from gm_kit
&pluck s=tri loop=C4 env=&(map=adsr .005 .3 .1 .2)
&bass s=saw loop=C2 lpf=500 env=&(map=adsr .01 .25 .4 .15)
&out map=sample postgain=3 [&line * &pluck * .3, &roots * &bass * .4, &beat * .5]
\`\`\`
`,aksak:`---
title: "Aksak: twos and a three"
tags: [genre:world, rhythm]
description: "A 7/8 of two, two and three in D harmonic minor: the pairs swing, the three stays even, and the band is the library's."
---

An aksak ("limping", in Turkish) is a bar of unequal beats, twos and threes: 7/8 as 2 + 2 + 3, 9/8 as 2 + 2 + 2 + 3.
The library's bar takes the grouping as its argument, \`bar(meter="2+2+3")\`; \`meter("7/8")\` alone is the family's 3 + 2 + 2.
Its bpm counts the beats, three a bar, the last half again as long as the others.

Swing it, and only the twos lean: of each pair of eighths the second comes late, while a group of three plays even (decision 071), as a band swinging a mixed meter does.
The beats never move, so the bar keeps its length and its limp.

\`\`\`cells
&swingNote label="swing=8n leans the pairs: in 2 + 2 + 3 the first two beats swing, the three stays even. The beats, the long one too, never move." about=&swing
&bar swing=&swing from bar(meter="2+2+3") &tempo
&tempo step=free(150bpm, 100..200)
&swing swing=8n:free(.6, 1/2..2/3)
\`\`\`

## The band

The drums are the library's 7/8 bar (\`aksak_drums\`), written in the meter's own counts, beats and pulses, so they lay themselves out in this grouping as in the family's 3 + 2 + 2.
The tune is the motif \`limp\`, the tonic, the fifth, then a run down to the tonic in the long beat; the form \`call_and_answer\` answers it two degrees down.
The bass plays the tonic on the first beat and the fifth on the long one.

\`\`\`cells
&kick, &ghost, &backbeat, &hat, &groove from aksak_drums
&key from harmonic_minor D
&limp from limp &key
&phrase from call_and_answer &call
&call step=8n &limp
&bassline over=&key step=beat 0 ~ 4
&hatNote label="The hat on every eighth: in the twos the second leans late, in the three all three are even." about=&hat
&limpNote label="limp: 0 ~ | 4 ~ | 3 2 0, its run in the three, which stays straight however hard the twos swing." about=&limp
\`\`\`

## The sound

\`\`\`cells
&bassV from upright_bass
&leadV from clarinet
&out map=sample postgain=1.93 [&groove, &bassline * &bassV * .6, &phrase * &leadV * .45]
\`\`\`
`,alpha:`---
title: "Alpha: Carlos' scale without octaves"
tags: [genre:experimental, artist:Wendy Carlos, microtonal, tuning]
description: "Wendy Carlos' alpha scale: nine equal steps to a pure fifth, and no octave at all."
---

\`\`\`cells
&vibrato from vibrato
# Wendy Carlos' alpha scale: equal steps of about 78 cents, nine to a pure fifth —
# and no octave at all. Five steps make a near-pure major third (5:4), four a minor
# third (6:5), so triads ring true: 0 5 9 is major, 0 4 9 minor.
&bar from bar &tempo
&tempo step=free(84bpm, 50..120)
&alpha map=ed(9, 3/2)                               # nine equal steps to 3:2

&chords over=&alpha step=1m [0,5,9] [4,8,13] [9,14,18] [5,9,14]       # major · minor · major · minor
&tune over=&alpha step=8n 9 14 18 14 13 8 4 8 18 23 27 23 22 18 14 9 14 18 23 18 14 13 9@2 5 9 14 18 14 9@3

&brass s=saw loop=C4 lpf=2200 lpq=3 env=&(map=adsr .04 .2 .7 .3) pitch=&vibrato
&pad s=tri loop=C3 env=&(map=adsr .4 .3 .8 .8)

&mix postgain=2.37 map=sample [&tune * &brass * .35, &chords * &pad * .3]
\`\`\`
`,arrangement:`---
title: "Arrangement: parts and a song"
tags: [tutorial, arrangement]
tier: 5
description: "Three parts, and a song that picks which of them play: an intro, a verse, a chorus, an end."
---

\`\`\`cells
&partsNote label="A part is a section stepped by the bar: &sections names them (step=4n), and what a section steps plays while &song picks it, four bars a step, from its top: a number picks one section, a chord several." about=(&sections &song)
&lapsNote label="laps=1: the song plays once, then ends. off switches a cell off, and everything that plays it: take it from &click to hear the beat." about=&song
&bar from bar &tempo
&tempo step=free(moderato)
&key scale(major)

&chords over=&key step=&keysBar/4 [0,2,4] [3,5,7] [4,6,8] [0,2,4]
&tune over=&key step=&tuneBar*2 4 4 5 7 7 5 4 2 0 0 2 4 4@2 2@2
&kick role=kick step=&drumBar &bd ~ &bd ~
&click off step=&drumBar 12 0!3                       # a click on the beat, switched off

&keys s=tri loop=C4 env=&(map=adsr .01 .5 .3 .3)
&lead s=square loop=C5 lpf=2500 env=&(map=adsr .01 .2 .5 .2)
&rim from gm_kit
&thump from envelopes
&bd note=36 gain=.6 s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .04 0 0) env=&thump

&sections step=4n &keysBar &tuneBar &drumBar
&song over=&sections step=1m/4 laps=1 label="intro · verse · chorus · end" 0 [0,2] [0,1,2] 0
&out map=sample postgain=6.46 [&chords * &keys * .15, &tune * &lead * .2,
                         &kick, &click * &rim * .1]   # a long line can go on: it ends with a comma
\`\`\`
`,automaton:`---
title: Automaton
tags: [tutorial, genre:experimental, rhythm, sound, stereo]
tier: 7
description: "A mechanical band on belts, all turned by one drum: bells, a drummer and a woodblock, each on a belt of different give."
---

\`\`\`cells
&thump, &tap, &click from envelopes
&drumMotorNote label="The drum (the meter, a motor) turns them all." about=&bar
&bellsNote label="The bells on a taut belt, exact." about=&bells
&drummerNote label="The drummer's arm on a slack belt, lagging and swinging." about=&drums
&woodNote label="The woodblock's arm slips when the drum jerks, a step behind for good." about=&wood
&shoveNote label="Grab the big drum and shove it: watch the belts stretch, hear the arms drag and the woodblock slip." about=&bar
# Automaton — one motor, belts of different give. belt= stiffness (taut 3000, slack 25),
# mass= the arm, damping= how soon it stops swinging (3 is what it is anyway: a little bounce), slip= its grip: past it the belt slips and the arm falls behind for good.
&bar meter("4/4") step=&tempo motor=4 mass=1 friction=.2
&tempo step=104bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&bells over=&major step=8n belt=3000 label="the bells: a taut belt" 0 4 7 4 9 7 4 2 0 4 7 9 11 9 7 4
&drums step=16n belt=25 mass=1 damping=3 label="the drummer" &bd ~ &sd &bd ~ &bd &sd ~ &bd ~ &sd &bd ~ &bd &sd &sd
&wood step=8n belt=400 mass=1.5 slip=.4 label="the woodblock: it slips" 0 0 ~ 0 0 ~ 0 ~

&bell pan=.36 s=sine loop=C5 fm=&bm index=.3..2 * &(map=adsr .001 .1 .1 .1) room=.3 env=&(map=adsr .002 .9 0 .6)
&bm s=sine ratio=3.5
&bd note=36 s=sine loop=A1 pitch=0..20 * &(map=adsr 0 .05 0 0) env=&thump
&sd seed=0 note=38 s=white hpf=1200 env=&tap
&blk pan=.64 s=square loop=C6 hpf=900 lpf=3000 env=&click

&out postgain=3.14 map=sample [&bells * &bell * .14, &drums * .6, &wood * &blk * .07]
\`\`\`
`,"band-pass":`---
title: "A band-pass: letting a band through"
tags: [tutorial, sound]
tier: 2
description: "A saw through a band-pass whose centre steps up and down the spectrum, against the same filter in two stages: bpf=, bpq= and ftype=."
---

A low-pass lets the lows through and a high-pass the highs; a **band-pass** lets one band through, around a centre. \`bpf=\` is that centre in Hz and \`bpq=\` is its Q, the centre over the bandwidth: 1 is wide, 8 narrow and ringing.
Here the centre moves, \`bpf=300..3000 * &sweep\`: the range, scaled by a cell that steps up and down, read at each note's start. (Moving parameters, filters that open and fades in decibels, have a tier of their own, [Moving parameters](moving.md); this one only steps.)
\`ftype=\` is the filters' model: \`12db\`, one stage, is the default, \`24db\` runs two in series for a steeper edge, and \`ladder\` is a ladder low-pass. The second voice plays the same line through the same sweep in two stages, and is thinner at the edges of its band.

\`\`\`cells
&bandNote label="bpf= is the band-pass's centre in Hz, bpq= how narrow the band is (its Q): the saw is heard only around the centre, which &sweep moves between 300 and 3000 Hz." about=(&wah &sweep)
&stagesNote label="ftype=24db puts two stages in series: the same sweep, a steeper skirt. &wah is one stage, 12db, the default." about=&wah24
&bar from bar &tempo
&tempo step=free(moderato)

&tune step=8n 0 0 7 0 3 0 5 7 0 0 7 0 3 5 3 ~
&line step=2n 0 7 5 3
&sweep loop=&bar*2 0 .15 .4 .7 1 .7 .4 .15

&wah s=saw loop=C3 bpf=300..3000 * &sweep bpq=4 env=&(map=adsr .005 .2 .5 .15)
&wah24 s=saw loop=C3 bpf=300..3000 * &sweep bpq=4 ftype=24db env=&(map=adsr .01 .3 .6 .3)
&out map=sample postgain=3 [&tune * &wah * .3, &line * &wah24 * .3]
\`\`\`
`,baustelle:`---
title: Baustelle
tags: [genre:experimental, genre:electronic, genre:industrial, artist:Neubauten, microtonal, arrangement]
description: "An original in the manner of Einstürzende Neubauten: struck metal and a scream; it builds, breaks, comes back harder, and collapses."
---

\`\`\`cells
&strike from envelopes
&metalsNote label="Beams, pipes and plates struck and tuned to their own partials." about=(&beams &pipes &plates)
&springNote label="A giant bass spring." about=(&feder &bassfeder)
&toolsNote label="A grinder and a drill." about=(&grind &drill)
&screamNote label="A scream." about=&schrei
&lowEndNote label="Sub-bass under a gritty riff." about=(&sub &riff)
# Baustelle — a building site, played. Metal is inharmonic: a free steel beam rings at
# 1 : 2.76 : 5.40 : 8.93, so each metal gets a grid of its own partials (map=ratios), and
# a hit is a chord of them. Some hits fall only sometimes (?), some choose ([a|b]):
# the percussionist's hand. Under it: a sub-bass kick, a crushed riff, the Bassfeder.
&bar from bar &tempo
&tempo step=free(118bpm, 90..150)

# ---- the metals: their partials (the last number is just where each grid repeats)
&beam tags="metal" map=ratios 1 2.756 5.404 8.933 16 label="beam: 1 : 2.76 : 5.40 : 8.93"
&pipe tags="metal" map=ratios 1 2.42 4.37 6.71 8 label="pipe"
&plate tags="metal" map=ratios 1 1.59 2.14 2.30 2.65 2.92 4 label="plate"
&beams seed=6622608107367484 tags="metal" over=&beam step=&metalBar*4 [0,1,2,3] ~!2 [0,1,2,3]? ~!2 [0,1,2,3] ~!3 [0,1,2,3] ~ [0,2]? ~ [0,1,2,3] [1,3]?.7
&pipes seed=352379644757011 tags="metal" over=&pipe step=&metalBar*4 ~ ~ [0,1,2,3] ~ [1|2]? [0,1,2,3] ~ [0,1,2,3]? ~ ~ [0,1,2,3] ~ ~ [1,2,3]? [0,1,2,3] ~
&plates tags="metal" over=&plate step=&plateBar ~ [0,1,2,3,4,5] ~ [0,1,2,3,4,5]

# ---- the low end: a sub-bass kick, four on the floor; a crushed riff on E; the Bassfeder
&kick tags="low" step=&subBar 0!4
&riff tags="low" step=&riffBar*4 0 0 1 0 ~ 0 7 0 6 ~ 0 1 0 ~ 3 -2
&accent tags="low" map=amp step=16n 1 .5 .8 .5 0 .6 1 .5 .9 0 .6 .8 .5 0 1 .7
&feder seed=327647601126874 tags="low" step=&federBar*2 0 ~ ~ 0? 0 ~ [0|-5] ~

# ---- tools: the grinder (noise that swells, now it can), the drill (a whine that wobbles)
&grind seed=8042777887391054 tags="tools" step=&grindBar/2 0 0?.4
&swell tags="tools" map=amp step=8n .2 .5 1 .7
&drill seed=3791443339696003 tags="tools" step=&drillBar 0? ~!3 0?.7 ~ 7? ~
&edge tags="tools" map=lin loop=.37 .2 1 .4
# ---- the scream: a saw sliding, and breath, through filters moving between vowels
&schrei seed=6564991197536049 tags="scream" step=&schreiBar/2 0 ~ 0?.5 ~
&slide tags="scream" map=lin loop=&bar/2 0 7 12 9 -2 0
&vowel tags="scream" map=lin loop=.83 .3 1 .55 .8 .3

# ---- the last crash
&fall tags="metal" over=&beam step=&einsturzBar/4 [0,1,2,3]
&crashPlate tags="metal" over=&plate step=&einsturzBar/4 [0,1,2,3,4,5]
&rubble step=&einsturzBar/4 0

&beamv tags="metal" s=sine loop=110 room=.3 env=&(map=adsr 0 .5 0 .9)
&pipev tags="metal" s=sine loop=233 room=.25 env=&(map=adsr 0 .3 0 .6)
&platev tags="metal" s=sine loop=415 room=.4 distort=.2 env=&(map=adsr 0 .25 0 1.4)
&sub tags="low" s=sine loop=E1 pitch=0..14 * &(map=adsr 0 .07 0 0) distort=.15 env=&(map=adsr .002 .45 .5 .15)
&grit tags="low" s=saw loop=E1 distort=.85 crush=6 lpf=90..2200 * &(map=adsr .003 .18 .15 .08) * &accent lpq=7 env=&strike
&bassfeder tags="low" s=saw loop=A1 pitch=0..9 * &(map=adsr 0 .09 0 0) distort=.6 lpf=160..1300 * &(map=adsr .002 .3 .1 .3) lpq=9 delaytime=.019 delay=.55 delayfeedback=.84 env=&(map=adsr .002 .6 .2 .5)
&grinder seed=0 tags="tools" s=white distort=.7 lpf=900..7000 * &edge hpf=500 lpq=3 env=&(map=adsr .05 .4 .8 .3)
&drillv tags="tools" s=saw loop=E4 distort=1 crush=8 lpf=4000 env=&(map=adsr .02 .1 .9 .1) pitch=&(map=lin loop=23 0 .7 0 -.7 0)
&voice tags="scream" s=saw loop=A3 distort=1.2 crush=7 lpf=500..2600 * &vowel lpq=11 hpf=300 env=&(map=adsr .08 .3 .9 .6)
&breath seed=1 tags="scream" s=white distort=.9 lpf=600..3000 * &vowel lpq=8 hpf=900 env=&(map=adsr .05 .3 .8 .5)
&crash seed=2 s=white distort=.5 lpf=9000 room=.6 env=&(map=adsr 0 3 0 4)

# ---- the parts, and the site's day: four bars a step; laps=1: it ends
&metalPart [&beams * &beamv * .09, &pipes * &pipev * .07]
&einsturz [&fall * &beamv * .14, &crashPlate * &platev * .08, &rubble * &crash * .25, &rubble * &sub * .6]
&teile step=4n &metalBar &plateBar &subBar &riffBar &federBar &grindBar &drillBar &schreiBar &einsturzBar
&tag over=&teile step=1m/4 laps=1 label="metal · grinder · spring · groove · drill · scream · break · spring · groove · all · all · collapse · Einsturz" [0] [
     0,5] [0,2,4] [0,1,2,3,4] [0,1,2,3,4,6] [0,1,2,3,4,5,7] [4,5,7] [4] [0,1,2,3,4,5] [0,1,2,3,4,5,6,7]!2 [5,7] 8

&out postgain=.975 map=sample [&metalPart, &plates * &platev * .05, &kick * &sub * .55,
                           &riff * &accent * &grit * .2, &feder * &bassfeder * .3,
                           &grind * &swell * &grinder * .14, &drill * &drillv * .06,
                           (&schrei + &slide) * &voice * .1, &schrei * &breath * .06, &einsturz]
\`\`\`
`,bell:`---
title: "Bell and scale: 12/8, one scan for both"
tags: [genre:world, diatonic, rhythm]
description: "The bell, x.x.xx.x.x.x, has the major scale's intervals: 2 2 1 2 2 2 1."
---

\`\`\`cells
&tap, &click from envelopes
# The West African standard bell pattern — seven strokes over twelve pulses,
# x.x.xx.x.x.x — has the same intervals as the major scale: 2 2 1 2 2 2 1.
# So one cell is both: the melody steps with the bell, and reads it as its scale.
&oneScanNote label="One scan is both — the melody steps with it, and reads it as its scale." about=(&bell &song)
&beat meter("12/8") step=free(100bpm, 70..140)      # four dotted-quarter beats
&bell label="{mode} · x.x.xx.x.x.x" scan(2 2 1 2 2 2 1) step=pulse*7/12            # seven strokes a bar, over the twelve pulses

&strokes step=&bell:pulse &gankogui &gankogui:0:.5 &gankogui:0:.7 &gankogui:0:.5 &gankogui:0:.6 &gankogui:0:.5 &gankogui:0:.7 # the bell, as a rhythm
&song over=&bell step=&bell:pulse 4 4 5 4 2 1 0 2 2 1 2 0 ~ ~ # … and as a scale: C major
&drums step=8n [&dundun,&shekere:0:.5] &shekere:0:.2 &shekere:0:.3 [&dundun:0:.5,&shekere:0:.5] &shekere:0:.2 &shekere:0:.3 [
       &dundun:0:.8,&shekere:0:.5] &shekere:0:.2 &shekere:0:.3 [&dundun:0:.5,&shekere:0:.5] &shekere:0:.2 &shekere:0:.3   # the twelve pulses, the low drum on the beats

&gankogui gain=.25 s=square loop=C6 lpf=4000 env=&tap
&voice s=tri loop=C4 env=&(map=adsr .02 .2 .6 .2)
&dundun gain=.7 oneshot=1 s=sine loop=C2 pitch=0..12 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .25 0 .1)
&shekere seed=0 gain=.15 s=white hpf=6000 env=&click

&mix postgain=3.9 map=sample [&strokes, &song * &voice * .45, &drums]
\`\`\`
`,bossa:`---
title: "Bossa nova: the clave"
tags: [genre:world, genre:jazz, tonal, rhythm]
description: A bossa nova whose guitar strums on the clave's five strokes, over Dm9 and G13.
---

\`\`\`cells
* from style=&bossaNova
&vibrato from vibrato
# Bossa nova. The clave is a meter: five strokes over a bar of sixteenths,
# scan(3 3 4 3 3) — x..x..x...x..x.. — and the guitar strums on its strokes.
&bar from bar &tempo
&tempo step=free(128bpm, 90..170)
&clave scan(3 3 4 3 3) step=pulse*5/4                 # five strokes a bar
&dorian scan(2 1 2 2 2 1 2)                            # D Dorian (the voices sit on D)

&rim step=&clave:pulse &click &click:0:.8 &click:0:.9 &click &click:0:.8
&strum step=&clave:pulse [3,7,10,14]!3 [3,9,14]!2                          # Dm9 · G13, on the clave
&bassline step=4n 0 7 -7 0                             # root and fifth: D A under Dm9, G D under G13
&shaker step=16n &shh:0:.5 &shh:0:.2 &shh:0:.3 &shh:0:.2
&melody over=&dorian step=8n 4@3 3 2@2 ~@2 0 1 2@3 ~@3

&guitar s=tri loop=D3 lpf=2200 env=&(map=adsr .003 .5 .15 .3)
&bass s=sine loop=D2 env=&(map=adsr .01 .4 .5 .2)
&flute glide=.08 s=sine loop=D4 env=&(map=adsr .06 .2 .7 .4) pitch=&vibrato
&click seed=0 gain=.3 s=white hpf=2500 env=&(map=adsr 0 .03 0 .02)
&shh seed=1 gain=.12 s=white hpf=6000 env=&(map=adsr 0 .03 0 .02)

&mix postgain=1.58 map=sample [&strum * &guitar * .25, &bassline * &bass * .7, &melody * &flute * .4,
                                  &rim, &shaker]
\`\`\`
`,breve:`---
title: Alla breve and sixteenths
tags: [tutorial, rhythm]
tier: 4
description: Alla breve, 2/2 a step a quarter, counts a bar in halves, and pulse=16n gives a scan's entries a sixteenth each.
---

\`\`\`cells
&bar meter("2/2", 2) step=60bpm      # alla breve: two beats a bar, bpm counts half notes, its steps quarters
&sixteenths scan(1 1 1 1) pulse=16n step=pulse*4   # a scan whose entries are sixteenths

&low step=&bar:beat 0 4
&run over=scale(minor) step=&sixteenths:16n 0 2 4 2

&bell s=sine loop=A2 env=&(map=adsr 0 .3 0 .1)
&out map=sample postgain=6.02 [&low * &bell * .6, &run * &bell * .3]
\`\`\`
`,brothers:`---
title: Cellular Brothers
tags: [genre:electronic, genre:dance, artist:Chemical Brothers, modal, arrangement]
description: "Big beat, an original in the manner of the Chemical Brothers: gritty and crushed, about two and a half minutes, then it ends."
---

\`\`\`cells
&breakNote label="A gritty, crushed breakbeat." about=&break
&acidNote label="An acid line." about=&acid
&riffNote label="A distorted stab riff in E minor." about=(&riff &stab)
&sirenNote label="A siren." about=&siren
&buildsNote label="Builds with snare rolls and a riser." about=(&roll &riser)
# Cellular Brothers — the break is a bar of voices in sixteenths; the acid line opens its filter
# on every note, further on the accents. Everything in semitones from E.
&bar from bar &tempo
&thump, &snap, &click, &strike from envelopes
&tempo step=free(112bpm, 96..132)
&b1 tags="break" &bd ~ &hh ~ &sd ~ &hh &bd ~ &bd &sd ~ &hh &bd &sd &hh
&b2 tags="break" &bd ~ &hh &bd &sd ~ &hh ~ &bd &bd ~ &hh &sd ~ &sd*2 &hh
&break tags="break" step=&breakBar*4 label="the break" &b1 &b2
&acid tags="acid" step=&acidBar*4 label="the acid" 0 0 12 0 3 0 ~ 0 7 0 10 ~ 0 12 3 5
&accent tags="acid" map=amp step=16n 1 .5 .9 .5 .8 .5 0 .5 1 .5 .8 0 .5 1 .7 .9
&riff tags="riff" step=&riffBar*2 label="the riff" [0,7] ~ [0,7] [3,10] ~ [5,12] ~ [3,10]
&siren tags="siren" step=&sirenBar/8 0
&wail tags="siren" map=lin loop=&bar 0 12 0
&sub seed=4356969851792802 tags="sub" step=&subBar 0 ~ 0 [-2|0]
&roll tags="build" step=&buildBar 0!4 0*2!4 0*4!4 0*8!4
&lift tags="build" step=&buildBar/32 0
&up tags="build" map=lin loop=&bar/32 0 .3 1 0

&bd note=36 tags="break" oneshot=1 s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .06 0 0) distort=.5 env=&thump
&sd seed=0 note=38 tags="break" s=white hpf=900 distort=.6 crush=7 env=&snap
&hh seed=1 note=42 tags="break" s=white hpf=7000 crush=6 env=&click
&tb tags="acid" s=saw loop=E2 lpf=120..3600 * &(map=adsr .003 .17 .1 .06) * &accent lpq=14 distort=.3 env=&strike
&stab tags="riff" s=square loop=E3 distort=.9 lpf=2600 room=.2 env=&(map=adsr .003 .2 .3 .1)
&siren1 tags="siren" s=sine loop=E5 delaytime=&bar*4/3 delay=.3 delayfeedback=.35 env=&(map=adsr .3 .5 .9 .6)
&subv tags="sub" s=sine loop=E1 env=&(map=adsr .005 .4 .6 .1)
&sn seed=2 tags="build" s=white hpf=1000 distort=.4 env=&(map=adsr 0 .06 0 .03)
&riser seed=3 tags="build" s=white lpf=400..8000 * &up lpq=5 crush=8 env=&(map=adsr 1 .5 .9 .5)

&sections step=4n &acidBar &riffBar &breakBar &sirenBar &buildBar &subBar
&song over=&sections step=1m/8 laps=1 label="break · bass · acid · build · riff · all · siren · build · all" [2] [2,5] [0,2,5] 4 [0,1,2,5] [0,1,2,3,5] [0,3] 4 [0,1,2,3,5]

&out postgain=.743 map=sample [&break * .7,
                          &acid * &accent * &tb * .3,
                          &riff * &stab * .1,
                          (&siren + &wail) * &siren1 * .08,
                          &roll * &sn * .3, &lift * &riser * .14,
                          &sub * &subv * .5]
&tracker scope=waterfall label="the break, as a tracker" &break
\`\`\`
`,bwv847:`---
title: "Bach, Prelude and Fugue in C minor: for Wendy"
tags: [genre:classical, genre:electronic, artist:Bach, artist:Wendy Carlos, tonal, counterpoint, stereo]
description: "Prelude and Fugue in C minor, BWV 847 — in full: a prelude of one figure, then a fugue in three voices."
---

\`\`\`cells
&vibrato from vibrato
&pluck from envelopes
# J. S. Bach, Prelude and Fugue in C minor, BWV 847 (The Well-Tempered Clavier I),
# in full — on an old-school synthesizer, after Wendy Carlos' Switched-On Bach.
# The notes: the CCARH Humdrum encoding (Bach-Gesellschaft edition, vol. xiv), as semitones from C4, a sixteenth a
# step; tools/bwv847.reference.json holds them, and a test plays this text against them, note for note.
# Written by hand as its structure (#177): the form a selector over its voices, each entry a copy of the subject.
&preludeFigureNote label="The prelude: one figure, twice a bar in both hands, through 24 bars of changing chords." about=(&rhFigure &lhFigure)
&preludeBreaksNote label="Then it breaks free — *Presto*, *Adagio*, *Allegro*." about=(&rhPresto &rhAdagio &rhAllegro)
&formNote label="The form: a voice plays while the selector has it on — the prelude's two hands, then the fugue's three voices, one by one." about=&form
&fugueEntriesNote label="The fugue, in three voices: the subject enters in the alto, is answered by the soprano, then the bass — and returns, in every voice, through the keys." about=(&alto &soprano &bass)

# one tempo map for both: a sixteenth a step, each section at its pace; laps=1 — the piece ends with the fugue
&tempo scan(1!432 .72!96 2!17 .86!64 1.6!15 1.5!496) pulse=16n step=free(89bpm, 60..120) laps=1 label="tempo map: ♩=108 · *Presto* · *Adagio* · *Allegro* · fugue ♩=72"

# ---- the prelude
&figure tags="figuration" 0 1 2 1 3 1 2 1                          # the figure: top, middle, low, middle, bottom, middle, low, middle
&rhShapes tags="figuration" step=pulse/16 show=notes label="right hand: four notes a bar" [12,3,2,0] [8,5,4,0] [11,5,3,2] [12,7,5,3] [15,8,7,3] [14,6,4,2] [
          14,7,6,2] [12,4,2,0] [12,5,4,0] [10,5,3,2] [10,7,5,3] [8,7,5,3] [8,2,0,-2] [7,-2,-4,3] [5,0,-2,-3] [5,2,0,-1] [5,2,0,-1] [3,0,-1,-5] [-7,3,2,5] [
          -6,0,-1,3] [3,0,-1,-5] [6,0,-1,-3] [7,0,-1,2] [8,0,-1,2]
&lhShapes tags="figuration" step=pulse/16 show=notes label="left hand: four notes a bar" [-12,-5,-7,-9] [-12,-4,-5,-7] [-12,-4,-5,-7] [-12,-9,-10,-5] [
          -12,0,-2,-4] [-12,-3,-5,-6] [-14,-2,-3,-5] [-14,-5,-7,-8] [-16,-4,-5,-7] [-16,-10,-12,-7] [-17,-9,-10,-5] [-12,-9,-10,-4] [-10,-7,-9,-4] [
          -9,-5,-7,-4] [-9,-3,-5,-7] [-10,-7,-9,-4] [-12,-7,-8,-4] [-12,-9,-10,-7] [-16,-12,-13,-10] [-15,-9,-10,-12] [-17,-9,-10,-7] [-17,-9,-10,-12] [
          -17,-9,-10,-7] [-17,-9,-10,-7]
&rhFigure tags="right hand" over=&rhShapes label="bars 1–24, right hand: the figure, twice a bar" &figure!48
&lhFigure tags="left hand" over=&lhShapes label="bars 1–24, left hand" &figure!48
# the *Presto*'s runs and the broken chords of bars 25–27, each played twice
&presto1 label="the *Presto*: a run of the figure down, the left hand following a bar later, an octave down" 14 12 14 15 12 11 12 9 12 11 12 14 11 9 11 7 11 9 11 12
&presto2 label="… and again from a sixth higher" 19 17 19 20 17 15 17 14 17 15 17 19 15 14 15 12 15 14 15 17 14 12 14
&arpeggio label="bars 25–27: the left hand alone, a broken chord, a fifth higher in the third bar" -7 -4 -7 -8 -7 -1 -7 2 -1 -4 -7 -8 -7
&rhPresto tags="right hand" label="right hand · *Presto*" ~ &presto1 9 7 9 6 9 7 9 11 7 6 7 2 &presto2 11 14 12 14 15 12 11 12 7 12 11 12 8 17 15 17 7 15 14 15 5 14 12 14 3 12 11 12 8 5 3 5 7 3 2 3 5 2 0 2
&rhAdagio tags="right hand" label="right hand · *Adagio*" -8 1 -2 -5 0 -4 -7 -4 -5 -2 -5 -8 -4 -7 -10 -7 ~
&rhAllegro tags="right hand" label="right hand · *Allegro*, to the end" ~ -24@15 ~@24 -24@24
&lhBars tags="left hand" label="left hand · bars 25–27" -17 -13 -10 &arpeggio -17 -12 -9 -5 0 -5 -6 -5 3 0 7 3 0 -4 -5 -4 -17 -15 -6 &arpeggio^$7
&lhPresto tags="left hand" label="left hand · *Presto*" -17@17 &presto1^$-12 -4 -5 -4 -7 -3 -5 -3 -1 -5 -7 -5 -9 &presto2^$-12 3 0 -1 0 2 -1 -3 -1 0 3 2 3 -7 2 0 2 -9 0 -1 0 -10 -1 -3 -1
&lhAdagio tags="left hand" label="left hand · *Adagio*" -12@4 ~@4 -12@4 ~@5
&rh tags="right hand" step=&rhTime label="prelude · right hand" &rhFigure &rhPresto &rhAdagio &rhAllegro
&lh tags="left hand" step=&lhTime label="prelude · left hand" &lhFigure &lhBars &lhPresto &lhAdagio

# ---- the fugue: its subject and countersubject (as the alto first has them), and each entry a copy of one of them,
#      transposed (^$n: semitones) and bent where Bach bends it (base=: = keeps a step, a value changes it);
#      exact entries in place (&answer^$-12: the answer, an octave down, in the alto at bar 15)
&subject tags="subject" show=notes label="the subject" 12 11 12@2 7@2 8@2 12 11 12@2 14@2 7@2 12 11 12@2 14@2 5 7 8@4 7 5 3
&counter tags="subject" show=notes label="the countersubject" 11 9 7 5 3 2 0@2 15@2 14@2 12@2 10@2 9@2 10@2 12@2 6@2 7@2
&answer base=&subject^$7 tags="soprano" label="bar 3 · **answer**\\nsoprano, a fifth up: its fourth note C, not D (a tonal answer), its last held" =!3 12@2 =!15 10@2
&counter2 base=&counter^$5 tags="soprano" label="bar 7 · **countersubject**\\nsoprano, a fourth up, its first note a semitone lower" 15
&inEflat base=&subject^$3 tags="soprano" label="bar 11 · **subject**\\nsoprano, in E♭ major (three notes bent to the key)" =!4 12@2 =!11 12@4 =!2 7
&returns base=&subject tags="soprano" label="bar 20 · **subject**\\nsoprano, as first heard, its last held" =!19 3@2
&inBass base=&subject^$-24 tags="bass" label="bar 26 · **subject**\\nbass, two octaves down, its last held" =!19 =@4
&last base=&subject tags="soprano" label="bar 29 · **subject**\\nsoprano, the last time: its ninth note a chord, its last E♮ (a Picardy third), held to the end" =!8 [11,14]@2 =!10 4@8
#      the episodes: what the free voices play more than once, in turn and transposed
&scales tags="episode" label="a run up, three times, each from a step higher" 2 4 6 7 9 10@3 4 5 7 9 10 12@3 6 7 9 10@2
&head tags="episode" label="the subject's head, then a step lower" 12 11 12@2 7@2 8@4 ~@2 9@2 10@2 10 9 10@2 5@2 7@4
&climb tags="episode" label="the head's turn, climbing a step at a time" 3 2 3@2 -5@2 -4@2 5 3 5@2 -3@2 -2@2 7 5 7@2 -1@2
&walk tags="episode" label="the bass walking down" -10 -9 -10 &down -2 -4 &down^$7 -14 -12 -10 &down -21 -4
&fall tags="episode" label="the bass falling by steps" -12@2 -14@2 -15@2 ~@2 -9@2 -10@2 -12@2 -10@2 -12 -14 -12@2 -10@2
&turn tags="episode" label="a line falling, then turning" 17@2 15@2 14@2 ~@2 8@2 7@2 5@2 7@2 5 3 5@2 2@2
&sigh tags="episode" label="a sigh, three times a step higher, twice" 0 -2 0@2 ~@4
&down tags="episode" label="five notes down the scale" -12 -14 -16 -17 -19
&soprano1 tags="soprano" label="soprano · free, bars 5–7" &climb^$12 12@2 14 15 17@6
&soprano2 tags="soprano" label="soprano · free, bars 8–11" 14@2 11@2 12@2 &head^$7 ~@2 14@2 15@2
&soprano3 tags="soprano" label="soprano · free, bars 13–15" 3 5 7 8 10 12 14 15 14 12 14 15 17 19 21 22 5 7 8 10 12 14 16 17 15 14 15 17 19 21 23 24@2
&soprano4 tags="soprano" label="soprano · free, bars 15–20" 23 21 19 17 15 14 12@2 15@2 14@2 12@2 10@2 9@2 10@2 12@2 6@2 7@2 9@2 6@2 7@2 &sigh^$14 &sigh^$16 &sigh^$18 &sigh^$7 &sigh^$9 &sigh^$11
&soprano5 tags="soprano" label="soprano · free, bars 22–26" &head ~@2 7@4 8 10 12 11 12 8 5@10 14 12 14@2 5@2 3@2 15 14 15@2 7@2 5@2 17 15 17@2 8@2 7 17
&soprano6 tags="soprano" label="soprano · free, bars 26–29" 15 14 12 11 9 7 12@2 &turn 8@2 7@2 ~@2 9@2 11@2 12@2 5 3 2 0 0@2
&alto2 tags="alto" label="alto · free, bars 4–7" 9@2 6@2 7@4 ~ 0 2 3 5 7 8@3 2 3 5 7 9 10@3 3 5 7 8 7 5 3 2@2 12 11 12@4
&alto3 tags="alto" label="alto · free, bars 7–11" ~@6 &turn 7@4 ~@2 11@2 12@2 &head
&alto4 tags="alto" label="alto · free, bars 11–15" ~@2 7@2 8@2!2 7@2 5@2 ~@2 -4@2 -2@2 0@2 ~@2 -4 -5 -4@2 -7@2 -2@2 0@2 -2@2 -4@2 -2@2 -5@2 -7@2 -9@2 -7@2 1@2 0@2 -2@2 0@2 -4@2 -5@2 -7@2 -5@2
&alto5 tags="alto" label="alto · free, bars 17–20" ~@3 &scales &climb 0 5
&alto6 tags="alto" label="alto · free, bars 21–26" 2@2 -1@2 0@4 ~@2 4@2 5@2 5 4 5@2 0@2 2@4 ~@2 2@2 3@2 3 2 3@2 -2@2 0@10 2 3 5 3 5 2 -1@2 ~@4 -1@2 0@2 ~@4 3@2 2@2 ~@4 5@4
&alto7 tags="alto" label="alto · free, bars 26–29" ~@4 5@2 3@2 8@2 7@2 5@2 3@2 2@2 3@2 5@2 -1@2 0@2 2@2 -1@2!2 0@2 ~@2 0@2 5 2 3 0@3 -1@2 0@4
&alto8 tags="alto" label="alto · free, bars 29–31" ~@2 4@2 5@4 ~@2 [5,8]@2 5@2 3 2 3@2 [5,8]@2 [-1,2]@2 ~@2 [-1,2]@2 ~@2 [-5,0]@8
&bass1 tags="bass" label="bass · free, bars 9–11" 0 -1 -3 &down^$7 &walk
&bass2 tags="bass" label="bass · free, bars 11–15" -5 &down^$5 -16@2 0@2 -2@2 -4@2 -5@2 -7@2 -5@2 -4@2 -10@2 -9@2 -7@2 -10@2 -9@2 -4@2 -5@2 -7@2 -5@2 -9@2 -10@2 -12@2 -10@2 -2@2 -4@2 -5@2 -4@2 -7@2 -9@2 -10@2 -9@2
&bass3 tags="bass" label="bass · free, bars 15–20" ~@8 &fall -17@2 &climb^$-5 -5@4 ~ &scales^$-19
&bass4 tags="bass" label="bass · free, bars 20–26" ~@4 -8@2 -7@2 &fall^$-7 -12 &walk &down^$7 -14 -16 -14 &down -21 -22 &down^$7 -13 -15 -17@4 ~@5 -17 -15 -13 -12 -10 -9 -7 -5 -7 -4 &down^$7 -13@2
&bass5 tags="bass" label="bass · free, bars 28–31" ~@2 -9@2 -10@2 -12@2 -5@2 -17@2 [-24,-12]@40
&soprano tags="soprano" step=&sopranoTime label="fugue · soprano" &answer &soprano1 &counter2 &soprano2 &inEflat &soprano3 &soprano4 &returns &soprano5 &soprano6 &last
&alto tags="alto" step=&altoTime label="fugue · alto" &subject 12 &counter &alto2 &alto3 &alto4 &answer^$-12 &alto5 &counter2^$-12 &alto6 &alto7 &alto8
&bass part=bass tags="bass" step=&bassTime label="fugue · bass" &subject^$-12 &bass1 &bass2 &bass3 &bass4 &inBass &bass5

# the synthesizer: a voice for each line, as Carlos gave each its own patch
&saw pan=.2 s=saw loop=C4 lpf=2600 lpq=6 env=&(map=adsr .002 .15 .45 .12)
&pulse pan=.8 loop=C4 lpf=1800 env=&(map=adsr .002 .15 .5 .1) 0 0 0 1
&reed pan=.2 s=square loop=C4 lpf=2000 env=&(map=adsr .01 .2 .6 .15) pitch=&vibrato
&brass pan=.73 s=saw loop=C4 lpf=1500 lpq=4 env=&(map=adsr .02 .2 .7 .15)
&moog pan=.67 s=saw loop=C4 lpf=700 lpq=10 env=&pluck

# the form: who plays when. Each voice is a section (decision 016) and each step of the selector a section of the
# piece: the figuration, bars 25–27 (the left hand alone), *Presto*, *Adagio*, *Allegro* (the right hand alone), a
# breath, then the fugue's voices entering one by one. restart=resume: a voice switched off waits, and goes on where
# it stopped — no voice counts rests while the others play.
&sections step=pulse &rhTime &lhTime &sopranoTime &altoTime &bassTime
&form over=&sections step=pulse laps=1 restart=resume label="figuration · bars 25–27 · *Presto* · *Adagio* · *Allegro* · a breath · alto · soprano · bass" [0,1]@384 1@48 [0,1]@96 [0,1]@17 0@64 ~@15 ~@2 3@32 [2,3]@64 [2,3,4]@398

&out postgain=3.85 map=sample [&rh * &saw * .3, &lh * &pulse * .3, &soprano * &reed * .25, &alto * &brass * .22, &bass * &moog * .3]
\`\`\`
`,canon:`---
title: "Canon: Frère Jacques"
tags: [tutorial, genre:classical, genre:folk, diatonic, canon, stereo]
tier: 5
description: "Frère Jacques as a round: four voices, each two bars behind the last."
---

*Are you sleeping, Brother John?* as a round. One theme made of four two-bar units; each voice reads it one unit later: \`&john[<<]\` is the theme shifted back one unit, two bars behind.

\`\`\`cells
&bar from bar &tempo
&tempo step=120bpm
&pluck from envelopes
&a 0@2 1@2 2@2 0@2                     # are you sleep-ing
&b 2@2 3@2 4@4                         # bro-ther John
&c 4 5 4 3 2@2 0@2                     # morn-ing bells are ring-ing
&d 0@2 -3@2 0@4                        # ding, dang, dong
&john over=scale(major) step=8n &a!2 &b!2 &c!2 &d!2          # C Ionian

&v1 s=tri loop=C5 env=&(map=adsr .005 .3 .5 .2)
&v2 s=square loop=C4 lpf=1800 env=&pluck
&v3 s=saw loop=C4 lpf=1200 env=&pluck
&v4 s=sine loop=C3 env=&(map=adsr .005 .4 .6 .1)

&left  [&john * &v1 * 0.6, &john[<<] * &v2 * 0.4, &john[<<2] * &v3 * 0.1, &john[<<3] * &v4 * 0.8]
&right [&john * &v1 * 0.6, &john[<<] * &v2 * 0.1, &john[<<2] * &v3 * 0.4, &john[<<3] * &v4 * 0.8]
&out postgain=1.33 map=sample &left &right
\`\`\`
`,cellscape:`---
title: Cellscape
tags: [genre:electronic, genre:ambient, modal, canon, arrangement, stereo]
description: A cycle of twelve scenes, each a fifth from the last, and home.
---

\`\`\`cells
&droneNote label="A drone that breathes through its filter." about=(&pad &breath)
&sequenceNote label="A sequenced arpeggio under a slow sweep." about=(&arp &sweep)
&canonNote label="A canon at the octave." about=(&melody &canon)
&bellsNote label="Bells drifting out of tune." about=&bells
&pulseNote label="A pulse." about=&pulse
&glassNote label="A glass shimmer." about=&shimmer
&earsNote label="One score of twelve scenes; each layer has its place in stereo." about=&scenes
# Cellscape — an ambient cycle of twelve, after Bach (the canon, the circle of keys)
# and Kraftwerk (the sequence, the filters). Every layer reads one Lydian scale, and
# the scale's key turns a fifth with each scene: C G D A E B F# C# G# D# A# F, and home.
&bar from bar &tempo
&pluck from envelopes
&tempo step=free(72bpm, 50..96)
&key step=1m/8 stride=7 label="**{tonic}**, a fifth each scene"
&lydian over=&key scan(2 2 2 1 2 2 1) label="{mode} on {tonic}"

# slow hands on the filters
&breath tags="drone" map=lin loop=&bar/24 .1 1 .3 .1
&sweep tags="sequence" map=lin loop=&bar/16 .1 .9 .2

# the layers
&pad part=pad tags="drone" over=&lydian step=&droneBar/8 label="drone: an open ninth" [0,4,6,9]
&arp tags="sequence" over=&lydian step=&sequenceBar*4 label="the sequence" 0 4 6 9 7 4 2 4
&m1 tags="canon" 0@2 2@2 4@3 6
&m2 tags="canon" 7@2 4@2 6@3 4                           # against &m1: octaves and thirds only (they stay consonant turned upside down)
&melody tags="canon" over=&lydian step=&leaderBar label="canon: the leader" &m1 &m2
&canon tags="canon" over=&lydian step=&followerBar label="canon: the follower, an octave down, two bars behind" &melody[<<]^$-12
&bells tags="bells" over=&lydian step=&chimesBar label="bells" ~@3 11 ~@4 9 ~@3 13 ~@5 11 ~@4 6 ~@6 ~@2
&pulse tags="pulse" over=&lydian step=&pulsesBar*2 label="pulse" 0 ~ 0 0 ~ 0 0 ~
&shimmer tags="glass" over=&lydian step=&shineBar/16 label="glass" [11,13]

&padv tags="drone" s=saw loop=C3 lpf=280..2400 * &breath lpq=3 room=.45 env=&(map=adsr 2 1 .8 3) pitch=&(map=lin loop=.13 0 .08 0 -.08 0)
&arpv tags="sequence" pan=.18 s=square loop=C4 lpf=240..3400 * &sweep lpq=7 delaytime=&bar*4/3 delay=.35 delayfeedback=.45 env=&(map=adsr .002 .12 .2 .08)
&voiceA tags="canon" pan=.18 s=tri loop=C5 lpf=2600 room=.35 env=&(map=adsr .05 .3 .7 .6)
&voiceB tags="canon" pan=.82 s=saw loop=C5 lpf=1500 room=.4 env=&(map=adsr .08 .3 .7 .8)
&bell tags="bells" pan=.83 s=sine loop=C5 room=.6 delaytime=&bar*2/3 delay=.4 delayfeedback=.5 env=&(map=adsr .005 1.2 0 2.5) pitch=&(map=lin loop=.07 0 .3 0 -.3 0)
&bass tags="pulse" s=tri loop=C2 lpf=400..1400 * &breath env=&pluck
&glass tags="glass" pan=.21 s=sine loop=C5 room=.7 env=&(map=adsr 3 1 .7 4) pitch=&(map=lin loop=.11 0 .25 0 -.25 0)

# the score: which layers play in each of the twelve scenes (0 drone 1 sequence 2 leader
# 3 follower 4 bells 5 pulse 6 glass), a barrel turning a scene each 32 bars
&layers step=4n &droneBar &sequenceBar &leaderBar &followerBar &chimesBar &pulsesBar &shineBar
&scenes over=&layers step=1m/8 label="the scenes" [0] [0,4] [0,1,4] [0,1,2] [0,1,2,3] [0,1,2,3,5] [0,2,3,4,5,6] [0,1,2,3,4,5,6] [0,3,4,6] [0,1,5,6] [0,4,6] [0,6]

&out postgain=4.57 map=sample [&pad * &padv * .14,
                         &arp * &arpv * .14,
                         &melody * &voiceA * .2,
                         &canon * &voiceB * .2,
                         &bells * &bell * .09,
                         &pulse * &bass * .25,
                         &shimmer * &glass * .07]
\`\`\`
`,cellscape2:`---
title: Cellscape II feat. Stockhausen
tags: [genre:experimental, genre:electronic, genre:ambient, artist:Stockhausen, microtonal, stereo]
description: "No octaves, no beat, no instruments: sines and noise on Stockhausen's 25 steps to 5:1."
---

\`\`\`cells
&ownTimeNote label="Every layer keeps its own time and a prime number of steps." about=(&constellations &glints &ripples)
&chanceNote label="Chance thins and chooses, a little differently every time round, the same every time you play it." about=(&constellations &glints &ripples)
&glintSliderNote label="The glints' chance is a slider." about=&glints
# Cellscape II, after Stockhausen's Studie II: the scale is 25 equal steps to 5:1 from
# 100 Hz, and never meets an octave. Nothing keeps a beat: each layer has a clock of its
# own (step= in steps a second) and a prime number of steps — 11, 7, 13 — and the slow
# movements are primes in seconds — 17, 19, 23, 29. They meet again only after ages.
&steps map=ed(25, 5) label="25 steps to 5:1, no octave"

# mixtures, Stockhausen's sound: five sines a few steps apart, held long — some, by chance
&constellations seed=5969502722198160 over=&steps step=0.11 label="constellations: 11 mixtures, nine seconds each" [0,1,2,3,4]?.2 ~ [8,10,12,14,16]? [3,6,9,12,15]?.4 ~ [20,25,30,35,40]?.3 [5,7,9,11,13] ~ [12,15,18,21,24]? ~ [1,5,9,13,17]?.4
&mirror seed=6027648193023166 over=&steps step=0.11 label="its retrograde, 8 steps higher" &constellations[::-1]^$8
# high glints: few, chosen — how few is yours (chance=)
&glints seed=5623837928614392 over=&steps step=1.7 chance=free(.82, 0.4..1) label="glints: 7 steps" [50|53|57|61|66]? ~ [44|48|52]? ~ ~ [58|63|70]? ~
# ripples: 13 steps, some chosen, some by chance
&ripples seed=7224192300250191 over=&steps step=2.3 label="ripples: 13 steps" 26 [29|31] 33? 27 [35|38]? 30 ~ 32? [28|36] 34 ~ 31? 37?
# two low sines a step apart, beating; each slides on a prime of its own
&lowA over=&steps step=0.029 -8
&lowB over=&steps step=0.029 -7
# a band of noise, its two edges drifting on primes (19 s, 29 s)
&surf step=0.019 0
&tideA map=lin loop=.0526 .1 1 .3 .1
&tideB map=lin loop=.0345 .2 .1 .8 .2

&sine s=sine loop=100 room=.6 env=&(map=adsr 3 2 .6 6)
&glint s=sine loop=100 room=.7 delaytime=.73 delay=.4 delayfeedback=.55 env=&(map=adsr .003 .4 0 1.2) pitch=&(map=lin loop=.09 0 .4 0 -.4 0)
&ripple s=sine loop=100 room=.5 delaytime=.41 delay=.3 delayfeedback=.4 env=&(map=adsr .01 .25 .2 .3)
&droneA s=sine loop=100 env=&(map=adsr 8 1 1 8) pitch=&(map=lin loop=.0588 0 .3 0 -.3 0)
&droneB s=sine loop=100 env=&(map=adsr 8 1 1 8) pitch=&(map=lin loop=.0435 0 -.3 0 .3 0)
&noise seed=0 s=white lpf=300..3000 * &tideA hpf=150..1500 * &tideB lpq=4 env=&(map=adsr 12 4 .8 12)

&out postgain=5.62 map=sample [&constellations * &sine * .05, &glints * &glint * .05, &ripples * &ripple * .03, &lowA * &droneA * .12, &surf * &noise * .03] [
                                  &mirror * &sine * .05, &glints * &glint * .03, &ripples * &ripple * .05, &lowB * &droneB * .12, &surf * &noise * .03]
\`\`\`
`,chance:`---
title: Chance and choice
tags: [tutorial, rhythm]
tier: 5
description: "A line that is never quite the same twice round: steps that may not sound, and choices between notes."
---

\`\`\`cells
&chanceNote label="0?.7 is dropped seven times in ten; a bare 0? takes the cell's chance=. It is the same every time you play the piece; seed= picks another sequence." about=(&ghosts &hats)
&choiceNote label="[4|5|7]: one of them, chosen afresh each time round." about=&tune
&bar from bar &tempo
&click, &tap from envelopes
&tempo step=free(moderato)
&key scale(major)

&tune seed=5908040194758744 over=&key step=8n 0 2 [4|5|7] 4 [2|7] 0 [4|9] ~
&hats seed=4974002491104326 step=16n 0 0? 0 0?.7 0 0? 0 0?.2
&ghosts chance=.75 seed=3 step=16n 0?!8

&lead s=tri loop=C5 env=&(map=adsr .005 .2 .3 .2)
&hh seed=0 s=white hpf=8000 env=&click
&sd seed=1 s=white hpf=1500 env=&tap
&out map=sample postgain=10.1 [&tune * &lead * .3, &hats * &hh * .1, &ghosts * &sd * .1]
\`\`\`
`,chords:`---
title: Chords and a progression
tags: [tutorial, harmony, diatonic]
tier: 3
description: Four chords in A minor, struck on the beat, and the bass that follows them.
---

\`\`\`cells
&chordNote label="[0,2,4] is a chord: three steps at once, in the scale the cell reads. 6# raises the seventh a semitone: the dominant E major." about=&chords
&keyNote label="The key from the library: diatonic, a mode (minor) on a tonic. &tonic A names the note it starts on; change it, and every line over &key moves with it." about=(&key &tonic)
&sumNote label="&chords + &strike: a sum of pitches. The finer one, &strike, starts the notes; the chords hold under it and move it." about=&strike
&bar from bar &tempo
&tempo step=free(andante)
&key label="{mode} on {tonic}" from diatonic(mode=minor) &tonic     # A minor: the library's key, on the tonic
&tonic A

&chords over=&key step=1m [0,2,4] [3,5,7] [4,6#,8] [0,2,4]         # i – iv – V – i
&strike step=4n 0 0 12 0                                           # on the beat, an octave up on three
&roots over=&key step=1m 0 3 4 0

&keys s=tri loop=A3 env=&(map=adsr .01 .5 .3 .3)
&bass s=sine loop=A3 env=&(map=adsr .01 .6 .6 .2)
&out map=sample postgain=2.99 [(&chords + &strike) * &keys * .15, (&roots - 24) * &bass * .5]
\`\`\`
`,circle:`---
title: "The diatonic circle: one triad, turned a fourth a bar"
tags: [tutorial, genre:classical, harmony, diatonic, tonal]
tier: 5
description: The Baroque sequence I IV vii° iii vi ii V, its chords one triad turned through the key, not seven written out.
---

\`\`\`cells
&triadNote label="&triad is even(3, 7) over the key: every other degree, the chord. Turned with the key's degrees, a fourth each bar, it is each chord of the sequence in turn." about=&triad
&powerNote label="&power is even(2, 3, 1) over the triad: its root and fifth, the bass's notes. Each level of the key is even inside the one above, as a meter's are (decision 072)." about=&power
# The diatonic circle of fifths, the Baroque sequence I IV vii° iii vi ii V: each chord a fourth above the last.
# No chord is written out: the key's degrees turn a fourth a bar (stride=3), the triad reads them, and every part
# reads the triad, so 0 1 2 is the chord of the bar, whichever it is (#508).
&bar from bar &tempo
&tempo step=free(84bpm, 60..120)
&key scale(major, &tonic) label="{mode} on {tonic}"
&tonic C

&degrees over=&key step=1m stride=3 0 1 2 3 4 5 6        # the key from the chord's root: a fourth on, each bar
&triad over=&degrees even(3, 7)                          # the chord: every other degree
&power over=&triad even(2, 3, 1)                         # its root and fifth

&pad part=pad over=&triad step=1m [0,1,2]
&arp over=&triad step=8n 0 1 2 3 2 1 0 1
&bass part=bass over=&power step=4n -2 -1 -2 -1

&keys s=tri loop=C4 env=&(map=adsr .01 .5 .3 .3)
&low s=sine loop=C3 env=&(map=adsr .01 .3 .6 .2)
&out map=sample [&pad * &keys * .1, &arp * &keys * .15, &bass * &low * .4]
\`\`\`

The sequence written out would be seven chords of degree lists, \`[0,2,4] [3,5,7] [6,8,10] [2,4,6] [5,7,9] [1,3,5] [4,6,8]\`, and every part would carry its own copy of them: the arpeggio 56 numbers, the bass 28. Here the chord is a level of the key, as a beat is a level of the meter (#508, decision 072): the triad is \`even(3, 7)\` of the key's degrees, the root and fifth \`even(2, 3, 1)\` of the triad, and the parts read the level they need. It sounds identical to the written-out text and is 84 to its 154 by decision 049's measure (\`npm run structure\`), the test in \`grade.test.ts\` holding both.
`,clock:`---
title: "A clock: one bar drives every part"
tags: [tutorial, rhythm]
tier: 2
description: "A bar sets the tempo, and every part steps with it: on the beat, twice as fast, or once every two beats."
---

\`\`\`cells
&barNote label="&bar is the clock: a meter of 4/4, four even beats, stepped by &tempo; step=free(andante) a tempo marking, a slider from 76 to 108 beats a minute." about=(&bar &tempo)
&ratesNote label="Each part taps the bar by a note value: step=4n a step a beat (a quarter), 8n two steps a beat, 2n a step every two beats." about=(&tune &eighths &bass)
&bar from bar &tempo  # four beats, andante
&tempo step=free(andante)

&tune step=4n 0 4 7 4 5 9 7@2 4 7 5 2 0@4       # a step a beat
&eighths step=8n 12 7 16 7 12 7 16 7 12 9 17 9 14 7 12 ~       # two steps a beat
&bass part=bass step=2n -12 -7 -12 -5         # a step every two beats

&high s=sine loop=C5
&low s=sine loop=C3
&out map=sample postgain=1.41 [&tune * &high * .35, &eighths * &high * .12, &bass * &low * .6]
\`\`\`
`,coltrane:`---
title: "Coltrane changes: keys a major third apart"
tags: [genre:jazz, artist:Coltrane, chromatic, tonal, harmony]
description: "The changes of Giant Steps: three keys a major third apart, B, G and E♭, with a line of our own over them."
---

\`\`\`cells
&pluck, &snap from envelopes
# The changes of Giant Steps: three keys a major third apart — B, G, Eb — round
# the octave. The key turns down a major third each bar (stride=-4); the line plays
# 1-2-3-5 in it, then the dominant of the next key. The line is our own.
&bar swing=&swing from bar &tempo
&tempo step=free(220bpm, 140..320)
&swing swing=8n:free(2/3, 1/2..3/4)
&key shift=-1 step=1m stride=-4                          # B, then G, then Eb, then B …

&line over=&key step=8n 0 2 4 7 3 7 10 13               # 1 2 3 5 · the next key's V7: 1 3 5 b7
&walk over=&key step=4n 0 4 3 10                         # root, third · the V7's root, its fifth
&comp over=&key step=2n [4,11] [7,13]                    # the maj7 shell · the V7 shell
&ride step=8n &cym:0:.9 ~ &cym:0:.6 &cym:0:.5 &cym:0:.9 ~ &cym:0:.6 &cym:0:.5

&sax s=saw loop=C4 lpf=1800 room=.25 env=&(map=adsr .02 .12 .6 .1)
&bass s=tri loop=C2 env=&pluck
&keys s=sine loop=C4 env=&(map=adsr .005 .3 .3 .2)
&cym seed=0 gain=.22 s=white hpf=8000 env=&snap

&mix postgain=2.16 map=sample [&line * &sax * .4, &walk * &bass * .8, &comp * &keys * .3, &ride]
\`\`\`
`,cycle:`---
title: "A table that comes round: laps and cycle="
tags: [tutorial, tonal, chromatic]
tier: 5
description: "The same tune over two keys that each rise a whole tone a pass: one comes round after an octave, the other after two, so they part and meet again."
---

A turning table, \`step=cycle(&theme) stride=2\`, moves two steps each pass of the tune it turns for. It comes round after its own length: a table of twelve, after twelve turns.
**\`cycle=n\`** counts that in laps: the table comes round after n laps of its own length. \`cycle=1\` is one lap, the octave, so a key rising a tone a pass is back home after six passes; \`cycle=2\` is two laps, the second octave, and it climbs for twelve. \`cycle=0\` would hold the first entry, whatever the turn.
Here two voices play one tune, each over a key of its own, and the shorter wheel laps the longer: after six passes the high voice is home and the low one has climbed an octave, and they meet again after twelve.

\`\`\`cells
&roundNote label="cycle=1: this key rises a tone a pass for one octave, six passes, and comes round to the start." about=&keyA
&twoNote label="cycle=2: the same turn over two octaves, twelve passes before it comes round. The two voices part when the first comes home, and meet again when this one does." about=&keyB
&bar from bar &tempo
&tempo step=free(moderato)

&theme step=4n 0 2 4 2
&keyA step=cycle(&theme) stride=2 cycle=1
&keyB step=cycle(&theme) stride=2 cycle=2
&high over=&keyA step=4n 0 2 4 2
&low over=&keyB step=4n 0 2 4 2

&bell s=tri loop=C5 env=&(map=adsr .005 .4 .2 .3)
&drone s=sine loop=C3 env=&(map=adsr .01 .4 .5 .3)
&out map=sample postgain=3 [&high * &bell * .3, &low * &drone * .4]
\`\`\`
`,daytime:`---
title: "Clock time: a minute, an hour, a day"
tags: [tutorial, modal, stereo]
tier: 8
description: "Music on the clock on the wall: a tick each second, a chime each minute, a day of music anchored to the time."
---

\`\`\`cells
&unitsNote label="Rates in clock time: loop=1min turns once a minute, 1h an hour, 1d a day, 1wk a week." about=(&minute &hour &day &week)
&anchorNote label="anchor=11.55: where the day stands when play starts, at 11:55 (hours.minutes); then it keeps the time." about=&day
&lawNote label="from five_to_twelve &day: notes computed by a law, not written: the 5 to 12 cycle, a day of music read through the day." about=&cycle
&minute scan(1!60) loop=1min label="a minute: sixty seconds"
&hour scan(1!60) loop=1h label="an hour: sixty minutes"
&day scan(1!24) loop=1d anchor=11.55 show=sun label="the day"
&week scan(1!7) loop=1wk label="a week: seven days"

&tick step=&minute:4n 0                                  # each second
&chime step=&hour:4n 12                             # each minute
&daily over=scale(major) step=&week:4n 0 1 2 3 4 5 6    # the chime a step higher each day
&cycle label="the law: a day" from five_to_twelve &day

&click s=sine loop=C6 env=&(map=adsr 0 .01 0 .01)
&bell s=sine loop=C5 env=&(map=adsr .002 2 0 1.5)
&glass s=tri loop=C4 lpf=3200 env=&(map=adsr .004 .9 .25 1.2)
&out map=sample postgain=2.99 [&cycle * &glass * .3, &tick * &click * .05, (&chime + &daily) * &bell * .2]
\`\`\`
`,drums:`---
title: "Drums: a groove of voices"
tags: [tutorial, rhythm]
tier: 4
description: "A drum part written with the drums' names: a beat, a fill with ratchets and a subsequence, a Euclidean rhythm and a kit."
---

\`\`\`cells
&grooveNote label="A stepped braid of voices plays them: &bd ~ &hh is kick, rest, hat. &beat and &fill are drum motifs, spliced into &groove like any other." about=&groove
&levelNote label="&hh:0:.5 plays that hit at a gain of its own, here half: the hats between the kick and the snare lean back. &hh:0:1.5 would be louder." about=&beat
&ratchetNote label="&sd*3 plays the snare three times in one step: a ratchet. [&sd &sd] squeezes two steps into one: a subsequence." about=&fill
&euclidNote label="euclid(5, 16): five hits spread as evenly as they go over sixteen steps." about=&clave
&hitNote label="oneshot: the hat plays its envelope through, whatever its step: a hit, as on a drum machine." about=&hh
&kitNote label="A braid of voices read with over= is a kit: its numbers pick the voices, 0 the first." about=(&kit &toms)
&bar from bar &tempo
&tempo step=free(moderato)

&beat &bd ~ &hh:0:.5 ~ &sd ~ &hh:0:.5 [&bd,&hh]
&fill &sd [&sd &sd] &sd &sd*3
&groove step=8n &beat!3 &bd ~ &hh ~ &fill
&clave step=16n euclid(5, 16)
&kit &lo &mid &hi
&toms over=&kit step=16n ~!12 0 1 2 1

&bd, &sd, &rim from gm_kit
&click, &thump, &snap from envelopes
&hh note=42 oneshot=1 s=white hpf=8000 env=&click
&lo note=41 s=sine loop=G2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&thump
&mid note=45 s=sine loop=C3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .2 0 .05)
&hi note=48 s=sine loop=F3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&snap
&out map=sample postgain=3.12 [&groove * .6, &clave * &rim * .15, &toms * .4]
\`\`\`
`,drumtrack:`---
title: "A drum track in layers: the count, the groove and its fills"
tags: [genre:dance, rhythm, arrangement]
description: "A drum track built from layers, each placed by the bar: the sticks count in, the funk groove plays, and a fill ends each phrase."
---

A drum track is layers, each a line by its role, and the form places them by the bar: a level line at the bar's rate (\`map=amp step=1m\`) is 1 where a layer plays and 0 where it doesn't, as a groove places its euclid's hits by \`&euclidLevel\` one level down. Three layers here, each a fragment taken by name: the sticks' count-in (\`stick_count\`, its clicks accented by the meter's grouping), the funk groove's lines (\`funk_drums\`, its own fill left out) and Jambot's snare run at the end of each four-bar phrase (\`snare_run\`), here on the electric snare, its drum an argument (\`snare_run(sd=&electricsnare)\`), so it stands out from the groove's backbeat. A song's last bar would be one more, \`landing\`, Jambot's ending drums, placed on that bar in place of the groove.

\`\`\`cells
&bar meter("4/4") step=&tempo laps=9
&tempo step=104bpm

&electricsnare from gm_kit
&count from stick_count &bar
&kick, &backbeat, &ghost, &hat from funk_drums
&beat [&kick, &backbeat, &ghost, &hat]
&fill from snare_run(sd=&electricsnare)

# each layer's bars: the count the first, the groove the eight after, a fill the last of each four
&countIn map=amp step=1m 1 0!8
&playing map=amp step=1m 0 1!8
&fillAt map=amp step=1m 0 0!3 1 0!3 1

&drums map=sample [&count * &countIn, &beat * &playing, &fill * &fillAt]
\`\`\`

The groove under the fill keeps playing: a fill is one more layer, not a bar in place of the groove's. Change a fragment's name and its layer changes, the bars it plays on stay: \`&fill from build_run\` runs from the half bar, \`&count from click &bar\` counts on a metronome, its accents the meter's grouping, \`&count from hat_count &bar\` on the hi-hat's pedal.
`,dtmf:`---
title: "DTMF: a telephone keypad"
tags: [tutorial, genre:electronic, sound]
tier: 8
description: "Every touch-tone phone: a key is two sines at once, its row's and its column's."
---

\`\`\`cells
&dialNote label="Type a number and it's dialled — a key, a pause; a space (or anything not on the keypad) a rest — over and over." about=&dial
# DTMF — dual-tone multi-frequency. Rows 697 770 852 941 Hz, columns 1209 1336 1477 1633 Hz:
# eight frequencies (&dtmf, as ratios to 697), sixteen keys a row and a column each (&keys).
# The number is text (free("…"): a field to type in); spell(…) dials it — each character that's a
# key plays &keys[k] (its row and column), then a pause; a space is a rest.
&dtmf map=ratios 1 1.1047 1.2224 1.3501 1.7346 1.9168 2.1191 2.3429 4 label="rows 697 770 852 941 · columns 1209 1336 1477 1633 Hz"
&keys over=&dtmf label="the keypad: a row and a column a key" [0,4] [0,5] [0,6] [0,7] [1,4] [1,5] [1,6] [1,7] [2,4] [2,5] [2,6] [2,7] [3,4] [3,5] [3,6] [3,7]
&dial step=7 label="the number, dialled" spell(free("867 5309 ABCD .#"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")
&tone s=sine loop=697 env=&(map=adsr .004 .05 1 .008)
&out postgain=4.41 map=sample [&dial * &tone * .3]
\`\`\`
`,echotape:`---
title: Echo Tape
tags: [tutorial, genre:experimental, genre:electronic, sound, stereo, tape]
tier: 8
description: "A tape loop of notes: a write head records the tune and read heads play it back, echoing."
---

\`\`\`cells
&headsNote label="Three read heads play it back .375, .75 and 1.5 tape-seconds on." about=(&near &mid &far)
&ghostNote label="Every pass under the write head erases a little less than half — ghosts of older phrases fade round the loop." about=&tape
&reelNote label="The reel wows; hold it, and the echoes slow and sag in pitch." about=&reel
# Echo Tape — &tape records &tune (write=) onto a loop of 6 tape-seconds (length=); the tape
# moves with &reel, a physical motor (wow, and your hand). The read heads (play=, at=) are cells:
# play them like any melody. erase=.45: each pass keeps 55% — the ghosts.
&reel step=84bpm motor=1.5 mass=1 friction=.1 wow=.015 0
&bar from bar &tempo
&tempo step=84bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&tune over=&major step=8n label="the tune" 0 ~ 4 ~ 7 ~!3 11 ~ 9 ~ 7 ~!3 4 ~ 5 ~ 4 2 ~!2 0 ~!7
&tape step=&reel write=&tune length=6 erase=.45 varispeed=1 label="the tape: 6 s, a loop"
&near play=&tape at=.375 label="head 1"
&mid play=&tape at=.75 label="head 2"
&far play=&tape at=1.5 label="head 3"

&m s=sine ratio=3
&bell s=sine loop=G4 fm=&m index=.2..1.4 * &(map=adsr .001 .15 .1 .1) room=.3 env=&(map=adsr .002 1.2 0 .8)
&soft s=tri loop=G4 lpf=1800 room=.5 env=&(map=adsr .004 .9 0 .6)

&out postgain=8.13 map=sample [&tune * &bell * .22, &near * &soft * .12, &far * &soft * .08] [
                                  &tune * &bell * .22, &mid * &soft * .12, &far * &soft * .08]
\`\`\`
`,effects:`---
title: "Filters and effects: shaping a voice"
tags: [tutorial, sound]
tier: 2
description: "What shapes a voice after its source: filters, a reverb and an echo, grit, and a vibrato."
---

\`\`\`cells
&pluck from envelopes
&filterNote label="lpf= lets the lows through (a cutoff in Hz) and lpq= rings at the cutoff; hpf= and hpq= the same from above." about=(&warm &thin)
&effectsNote label="room= sends to a reverb, delay= to an echo: delaytime= apart, delayfeedback= how long it repeats. distort= and crush= add grit." about=(&glass &grit)
&vibratoNote label="pitch= is a voice's own pitch on every note: here a vibrato, a cell that turns three times a beat, in semitones." about=&warm
&bar from bar &tempo
&tempo step=free(moderato)

&tune step=8n 0 4 7 12 7 4 0 ~ 2 5 9 14 9 5 2 ~
&line step=2n 7 9 5 7
&bass part=bass step=4n 0 0 7 0 2 2 9 2
&sparkle step=1m 12 14

&warm s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .08 .2 .7 .4) pitch=&(loop=&bar*3 0 .15 0 -.15)
&thin s=saw loop=C4 hpf=2500 hpq=3 env=&(map=adsr .005 .2 .2 .2)
&glass s=sine loop=C5 room=.6 delay=.4 delaytime=.33 delayfeedback=.5 env=&(map=adsr .01 .8 0 .8)
&grit s=square loop=C2 lpf=900 distort=.3 crush=8 env=&pluck
&out map=sample postgain=1.89 [&tune * &thin * .2, &line * &warm * .15, &sparkle * &glass * .2, &bass * &grit * .3]
\`\`\`
`,electroswing:`---
title: Electro swing, in pieces
tags: [genre:electronic, genre:dance, genre:jazz, harmony, rhythm, arrangement]
description: "A house kick under a walking bass, Charleston stabs, and a clarinet and a muted trumpet trading a call and its answer in D harmonic minor: the band, the tune and its form are the seed library's."
---

Electro swing is a jazz record cut up over a house beat: four on the floor, the eighths swung, a walking bass, brass stabs on the Charleston and a clarinet in a minor key.
Here the band comes from the seed library, taken by name, and so does the tune: the drummer and its kit, the key, an eight-bar vamp, the walking bass Jambot plays at Swing jazz, the bass, stab and lead players, and the beat and the stabs this piece gave the library (\`electro_swing_drums\`, \`charleston_stabs\`); the tune is the motif \`gypsy\`, its call, shaped by two forms, \`call_and_answer\` and \`AABA\`.
The piece writes only what is its own: the tempo and the swing, the key's tonic, the break, who plays when, and the sound of each instrument.

\`\`\`cells
* from style=&electroSwing
&drums, &drumsOut from drums_performer &drumlines
&key from harmonic_minor D
&harm from vamp_to_the_fifth &key
&bassline from walking_bass &harm
&kick, &clap, &hats, &ticks, &ghosts from electro_swing_drums
&stabline from charleston_stabs &harm
&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV) &bassline
&stab, &stabOut from stab_performer(stabLevel=&stabLevel, keysV=&keysV) &stabline
&leadOut from lead_performer(leadLevel=&leadLevel, leadV=&leadV) &leadline
&useNote label="The band is the library's: each line names what it takes from it. &bassV, &keysV and &leadV are the players' instruments, named so the piece can give each a sound of its own; the drummer plays the core kit as it is." about=(&bassV &keysV &leadV)
\`\`\`

The meter is the library's too, \`swing_meter\`, Jambot's Swing jazz meter, which leaves its tempo to the piece (\`&tempo\`) and swings its eighths by a cell of its own, \`&swing\`, triplets (2/3).
The piece gives its own, an argument of the meter's (\`swing=&swing\`): the eighths a little less than triplets, .64. The tempo and the swing are both sliders.
The key is harmonic minor, from the library, on the tonic its line gives it, D (\`&key from harmonic_minor D\`, decision 065): the vamp's fifth is then A major, four bars of D minor, four of A.

\`\`\`cells
&bar swing=&swing from bar &tempo
&tempo step=free(124bpm, 112..132)
&swing swing=8n:free(.64, .5..0.75)
&swingNote label="Every line taps the meter (step=4n, 8n, 16n), so every line swings: the open hats on the off-beats, the stabs, the clarinet." about=&bar
\`\`\`

## The beat

\`electro_swing_drums\`, used above: a kick on every beat, the clap on two and four, the open hat on every swung off-beat; a sixteenth hat with some strokes left to chance, and a ghost of the snare on the last, a line of its own (\`&ghosts\`).
The piece takes its five limbs by name and hands them to the drummer as a stack, \`&drumlines\`, each times its level in the form below; the fragment's own \`&groove\` mix it leaves.
The crackle is the piece's own, a record's: a tick of noise on a few sixteenths, by chance.

\`\`\`cells
&drumlines [&kick * &kickForm, &clap * &clapForm, &hats, &ticks, &ghosts]
&crackle seed=8623846738299929 step=16n 0?.8!16
&beatNote label="The beat is a fragment: &kick, &clap, &hats, &ticks and &ghosts come from Electro swing drums, their levels in their hits." about=(&kick &clap &hats &ticks &ghosts)
\`\`\`

## The stabs

\`charleston_stabs\`, used above, is the stab player's part: the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes: its last stab, on the and of four, comes early with the next chord, its third and fifth with its root on top.
The stab player reads the chords in force, \`over=&harm\`, so the same rhythm is D minor in one half of the vamp and A major in the other.

\`\`\`cells
&charlestonNote label="The Charleston: one, and the and of two, a fragment's (Charleston stabs)." about=&stabline
\`\`\`

## The tune: one bar, a call and its answer, in AABA

The tune is one bar from the library, the motif \`gypsy\`: A B♭ C♯ D and back to A, the clarinet's call.
Two forms from the library make a chorus of it.
- **\`call_and_answer\`** makes the A: the call, then its answer, the call two degrees down (\`&call^-2\`), F G A B♭ and back to F.
- **\`AABA\`** makes the chorus of four As, the bridge before the last. Its bridge, by default A a fourth up, is named in its use and moved to where the harmony goes: three degrees down (\`&a^-3\`), over the vamp's A chord, E F G A, A's phrygian dominant.

The break cuts the motif into pieces with picks: its first three notes (\`&gypsy[0:3]\`) and rests, its tail moved, its first two as a stutter (\`&gypsy[0:2]!4\`), its top note hammered (\`&gypsy[3]!4\`).

\`\`\`cells
&gypsy from gypsy &key
&phrase from call_and_answer &call
&chorus from AABA(b=&b) &a
&call step=8n &gypsy
&a step=8n &phrase
&b step=8n &a^-3
&turn over=&key step=8n 6 7 6 5 4@2 ~@2
&chop over=&key step=8n &gypsy[0:3] ~@5 &gypsy[0:3] ~ &gypsy[0:3] ~ &gypsy[3:]^-2 ~@3 &gypsy[0:2]!4
&chopA over=&key step=8n degree(&gypsy[0:3], -3) ~@5 degree(&gypsy[0:3], -3) ~ degree(&gypsy[0:3], -3) ~ &turn &gypsy[3]!4
&leadline step=8n &chorus!2 &chop &chopA &chorus
&callNote label="One bar: the motif gypsy is the call, call and answer makes an A of it (the call, then the call two degrees down), and AABA a chorus, its bridge A moved three degrees down." about=(&call &a &b)
\`\`\`

## Two leads, call and answer

The clarinet calls and a muted trumpet answers: two players of one line, each heard on its own bars.
The trumpet is a second gate on the lead's line, \`&lead2\`; the clarinet is the lead player's gate, \`&leadOut\`. Both play as the lead (\`&lead map=role &leadOut &lead2\`, decision 061), so the piece takes the lead player's gate and writes the role itself.
Each one's level is a two-bar step, \`[.5 0]\` for the clarinet and \`[0 .45]\` for the trumpet, so they trade bar by bar: the call, then the answer; in the bridge, its call, then its answer; in the break, the pieces back and forth.

\`\`\`cells
&lead2 play=&leadline level=&lead2Level &trumpetV
&lead part=lead map=role &leadOut &lead2
&dialogueNote label="The clarinet plays the odd bars, the trumpet the even ones: the call and its answer, traded between two players." about=(&leadOut &lead2)
\`\`\`

## The form: who plays, bar by bar

The song is 32 bars, four times round the vamp: the stabs and the hats alone, then the kick and the bass, the chorus, the break with the kick and the bass out, and the chorus again.
It is written once, as a selector over the players (decision 061): \`&players\` lists the four gates, and each step of \`&form\` names who plays in that bar.
The clarinet and the trumpet trade bars, so a bar of the chorus is \`[0,1,2]\` and the next \`[0,1,3]\`.
A player switched off keeps its time (\`restart=free\`, a performer's default), so every part keeps tapping the swung meter and comes back in where it would have been.
The levels say only how loud each plays when it does: the bass at .8, the clarinet at .5, the trumpet at .45, the stabs at .5 and a little louder, .6, in the last chorus.
The kick and the clap are lines of the drummer's part, not players, so their entries stay levels of their own.

\`\`\`cells
&players &bassOut &stabOut &leadOut &lead2
&form over=&players step=1m 1!4 [0,1]!4 [[0,1,2] [0,1,3]]@2!4 [2 3]@2!4 [[0,1,2] [0,1,3]]@2!4
&bassLevel map=amp .8
&stabLevel map=amp step=1m .5!24 .6!8
&leadLevel map=amp .5
&lead2Level map=amp .45
&kickForm map=amp step=1m 0!4 1!12 0!8 1!8
&clapForm map=amp step=1m 0!8 1!8 .6!8 1!8
&formNote label="The form: intro (4 bars), the band (4), the chorus (8), the break (8), the chorus (8)." about=(&form &kickForm &clapForm)
\`\`\`

## The sound

The instruments the players play are voices with no sound of their own: the piece gives each one.
An upright-ish bass, a brass stab, a clarinet with a slow vibrato, a muted trumpet, darker and with a slower one, and the crackle's noise.
In giving the bass its sound the piece gives it its register too, which is the instrument's (decision 058): the library's \`bass\` sits at C2 and the bass player plays it an octave down, at C1; this \`&bassV\` sits at C3, so the walk sounds at C2, an octave above the library's, where a laptop's speakers still carry it.

\`\`\`cells
&bassV s=saw loop=C3 lpf=700 env=&(map=adsr .005 .3 .25 .08)
&keysV from brass_stab
&leadV from clarinet
&trumpetV s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .03 .1 .6 .12) pitch=&(map=lin loop=4.5 0 .08 0 -.08 0)
&vinyl seed=0 s=white hpf=2500 env=&(map=adsr 0 .004 0 .004)

&out map=sample postgain=1.96 [&drumsOut,
                         &crackle * &vinyl * .04, &bassOut, &stabOut * .4, &leadOut * .5, &lead2 * .5]
\`\`\`
`,ending:`---
title: "A song that ends: eight bars and a finale"
tags: [genre:electronic, harmony, arrangement]
description: "Eight bars of a minor song, then its ending, found by style: the dominant seventh, everyone landing on the tonic at the half bar, and the tonic left to ring."
---

A song that ends (#720): eight bars of a progression in D minor, then two bars of its ending, \`finale\`, the ending Synth-pop's style finds (\`npm run coverage -- --facet ending\`): the dominant seventh for half a bar, then the bass, the pad, the lead and the drums landing together on the tonic, which rings a bar.

The song and its ending are two sections of one plan (decision 016): \`&parts\` names their clocks, \`&songHalf\` and \`&endHalf\`, two steps a bar, and \`&plan\` runs the song for eight bars, then the ending for two, each one step held, so each section's lines start with it. The song's lines step by \`&songHalf\`; the ending takes \`&endHalf\` as its clock (\`finale(half=&endHalf)\`). The drums step by the meter, so a level line at the bar's rate stops them where the ending takes over (\`&playing\`); the ending's own drums (\`&finaleDrums\`, Jambot's landing) are left out here for two hits of the song's kit on the one and the landing, \`&land\`, stepped by the ending's clock.

\`\`\`cells
&bar meter("4/4") step=&tempo laps=10
&tempo step=100bpm
&key from diatonic(mode=aeolian) D

&parts step=2n &songHalf &endHalf
&plan over=&parts step=1m 0@8 1@2

&harm over=&key step=&songHalf/2 [0,2,4] [5,7,9] [3,5,7] [4,6,8]
&bassline over=&harm step=&songHalf*2 0 ~ 0 4
&padline over=&harm step=&songHalf/2 [0,1,2]
&tune over=&key step=&songHalf*2 4 ~ 2 3 4@2 2 ~ 0@2 1 2 1@3 ~
&pulse=bd, &snap=sd, &tick=hh from gm_kit
&beat step=8n &pulse ~ &tick ~ &snap ~ &tick ~
&playing map=amp step=1m 1!8 0!2

&cadence, &finaleBass, &finalePad, &finaleLead from finale(half=&endHalf) &key
&land step=&endHalf*8 &pulse ~!7 [&pulse, &snap] ~!23

&bassV s=tri loop=D2 env=&(map=adsr .01 .3 .5 .2)
&padV s=saw loop=D3 lpf=900 gain=.5 env=&(map=adsr .2 .4 .7 .8)
&leadV s=square loop=D4 lpf=2000 env=&(map=adsr .01 .2 .6 .3)

&out map=sample postgain=1.4 [&bassline * &bassV * .6, &finaleBass * &bassV * .6, &padline * &padV * .25, &finalePad * &padV * .25, &tune * &leadV * .3, &finaleLead * &leadV * .3, &beat * &playing * .5, &land * .5]
\`\`\`

Change the ending's name and the song ends another way, its clock and its parts the same: \`stop\` on the one, \`plagal\`'s amen, \`picardy\`'s major tonic, \`blues_ending\`'s seventh left hanging, \`drone_out\`'s held tonic.
`,fifths:`---
title: "A table that turns: the circle of fifths"
tags: [tutorial, genre:classical, tonal, chromatic, harmony]
tier: 5
description: "A key that turns a fifth each pass: round the circle of fifths and home."
---

\`\`\`cells
# &twelve turns once per pass of &tune, a fifth at a time (stride=7): C G D A E …
# After twelve fifths it is home: a table that turns comes round after its own length.
&bar scan(27 23 26 24) step=&tempo
&tempo step=110bpm
&twelve label="key: **{tonic}** — a fifth up each pass" step=cycle(&tune) stride=7
&circle label="the circle, as a table: {notes}" fifths()     # the same twelve in one line; fifths(1) would start on G
&tune over=&twelve step=4n 0 4 7 12 7 4 0@2       # chromatic numbers: a major arpeggio

&pluck s=tri loop=C4 env=&(map=adsr .01 .4 .3 .3)
&mix postgain=2.37 map=sample [&tune * &pluck]
\`\`\`
`,five:`---
title: "Five: an original tune in 5/4"
tags: [genre:jazz, modal, rhythm]
description: An original tune in 5/4, felt as 3 + 2, after the groove of Take Five.
---

\`\`\`cells
&pluck, &snap from envelopes
# Five: an original tune in 5/4, the bar felt as 3 + 2 — after the groove of Take Five.
# It builds on the blues: the same swing meter, the minor pentatonic (here on Eb).
&bar swing=&swing from bar(meter="5/4") &tempo # five beats
&tempo step=free(172bpm, 120..220)
&swing swing=8n:free(2/3, 1/2..3/4)                # swung eighths, as in the blues: the share free
&penta scan(3 2 2 3 2)                             # Eb Gb Ab Bb Db (the voices sit on Eb)
&harmony step=4n 0!3 -5!2                          # 3 + 2: the minor chord for three beats, the minor fifth for two

&call 4 3 2@2 0 ~ 1 2 ~@2                          # one bar of swung eighths
&tune over=&penta step=8n &call &call^1 &call 4 ~ 3 2 0@6 # the call, answered a step up the scale

&walk step=4n 0 3 7 -5 -2                          # a bass that walks the 3 + 2
&comp step=8n [0,3,7]@3!2 [0,3,10]@3 [0,3,10]
&ride step=8n &cym:0:.9 ~ &cym:0:.6 &cym:0:.5 [&cym:0:.9,&click:0:.7] ~ &cym:0:.6 &cym:0:.5 [&cym:0:.8,&click:0:.5] &cym:0:.4 # the ride, and a click on 3 and 5: the seams of 3 + 2

&horn s=saw loop=Eb4 lpf=1400 room=.3 env=&(map=adsr .02 .15 .6 .15)
&piano s=tri loop=Eb4 env=&(map=adsr .005 .35 .15 .2)
&bass s=tri loop=Eb2 env=&pluck
&cym seed=0 gain=.22 s=white hpf=8000 env=&snap
&click seed=1 gain=.3 oneshot=1 s=white hpf=3000 env=&(map=adsr 0 .03 0 .02)

&mix postgain=2.06 map=sample [&tune * &horn * .45,
                                  &walk * &bass * .8,
                                  (&comp + &harmony) * &piano * .3,
                                  &ride]
\`\`\`
`,fiveto12:`---
title: 5 to 12
tags: [genre:experimental, artist:Stockhausen, modal, sound, stereo, physics, tape]
description: "A day of music, anchored to the clock: it begins at 11:55 and plays where the day stands."
---

\`\`\`cells
&blocksNote label="Twelve blocks of two hours, a mode each — down from Ionian to the Locrian nadir, up again to the Lydian zenith." about=&cycle
&keysNote label="Twelve keys of ten minutes, by fifths going down, by fourths coming up (a new dawn: strange, full of hope)." about=&cycle
&barNote label="Every bar sounds all seven notes, on its mode's 12/8 bell." about=(&cycle &glass)
&dimensionsNote label="Five dimensions in counterpoint — melody, rhythm, harmony, dynamics, space." about=&cycle
# 5 to 12 — the law, taken from its day (from five_to_twelve &day), computes every note of the day: 84 steps a minute, 70 bars of 12/8 to a
# key, each key's row derived from it. Phrase by phrase, the five operations — translation,
# rotation, inversion, retrograde, multiplication (the Apple: ×5 mod 7) — each move their own
# dimension; the second half of every key mirrors the first. &day is the day it reads (over=&day): a
# meter of 24 hours, turning once a day (loop=1d), standing at 11:55 when play starts from the top
# (anchor=11.55: else where the clock stands; Reset: back to 11:55). Drawn as the sun (show=sun):
# stopped, turn it to choose the moment.
&day scan(1!24) loop=1d anchor=11.55 show=sun label="the sun: noon above, midnight below — east, west"
&cycle label="the law: a day" from five_to_twelve &day
&glass s=tri loop=C4 lpf=3200 env=&(map=adsr .004 .9 .25 1.2) label="the voice"
&present [&cycle * &glass * .3]

# memories and messages: a tape of the last two minutes — a head a minute back (seven bars,
# exactly), a head twelve bars back, wandering
&reel step=84bpm 0
&memory step=&reel write=&present length=120 erase=.3 tone=2200 drive=.3 hiss=.003 label="the tape: memories and messages"
&recall play=&memory at=60 label="a memory: a minute ago"
&message play=&memory at=102.857 wander=.04 wanderhz=.07 label="a message: twelve bars ago"

# reflection and inspiration: strings on every semitone, on one board — the music rings them
# (whatever the key), a hand plays them
&strings body=wire loop=C2 ring=5 hard=.4 board=none excite=&present label="the strings: reflection (tap them: inspiration)"
&light scope=spectrum label="the tonal spectrum: the mode, the key, the harmony" &glass

&out postgain=2 map=sample [&present, &recall * .35, &strings * .3] [&present, &message * .35, &strings * .3]
\`\`\`
`,fm:`---
title: "FM: one voice bends another"
tags: [tutorial, sound, FM]
tier: 7
description: A bell and an electric piano, each a sine whose frequency another sine swings.
---

\`\`\`cells
&fmNote label="fm=&bm: &bm swings the bell's frequency. ratio= is the modulator's frequency against the carrier's (3.5: a bell, not a harmonic); index= how far it swings, 0 a plain sine." about=(&bell &bm)
&moveNote label="index= can move: on the piano it falls on every note, bright when struck and a sine as it rings." about=&epiano
&bar from bar &tempo
&tempo step=free(andante)
&key scale(major)

&tune over=&key step=4n 7 4 5 2 4 0 2@2 7 9 8 7 4@4
&chords over=&key step=1m [0,2,4] [3,5,7] [1,3,5] [0,2,4]

&bm s=sine ratio=3.5
&bell s=sine loop=C5 fm=&bm index=3 env=&(map=adsr .001 1.6 0 1.2)
&em s=sine ratio=1
&epiano s=sine loop=C4 fm=&em index=.2..3 * &(map=adsr .001 .4 .1 .3) env=&(map=adsr .002 1 .3 .5)
&out map=sample postgain=7.94 [&tune * &bell * .15, &chords * &epiano * .1]
\`\`\`
`,focus:`---
title: Cell in Focus
tags: [genre:electronic, genre:ambient, artist:Aphex Twin, diatonic, stereo]
description: "Slow, serene and looping: four soft chords with bells drifting above; nothing hurries."
---

\`\`\`cells
&chordsNote label="Four soft chords breathe through a filter." about=(&chords &pad &breath)
&bellsNote label="A bell arpeggio drifts above them, thinning by chance." about=(&arp &bell)
&rootsNote label="A low root under each." about=(&roots &low)
# Cell in Focus — in the spirit of a slow, glowing Aphex Twin loop: an original. D major,
# four chords of four bars: Dmaj7, Bm9, Gmaj7, A6. The arpeggio reads each chord's
# tones an octave up; a few notes rest by chance, differently every time round.
&bar from bar &tempo
&tempo step=free(62bpm, 48..80)
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&chords over=&major step=1m/4 label="Dmaj7 · Bm9 · Gmaj7 · A6" [0,2,4,6] [-2,0,2,4,8] [-4,-2,0,2] [-3,-1,1,2]
&roots over=&major step=1m/4 -7 -9 -11 -10
&a1 seed=3354976822747905 7 9? 11 13?.4
&a2 seed=8902845909757633 5 7? 9 11?.4
&a3 seed=2704494309091379 3 5? 7 9?.4
&a4 seed=1113305061577325 4 6? 8 9?.4
&arp seed=3183938156543531 over=&major step=8n label="the bells" &a1!8 &a2!8 &a3!8 &a4!8
&breath map=lin loop=&bar/24 .15 .8 .35 .15

&pad s=saw loop=D3 lpf=300..1800 * &breath room=.6 env=&(map=adsr 2.5 1 .8 4) pitch=&(map=lin loop=.11 0 .06 0 -.06 0)
&bell pan=.31 s=sine loop=D4 room=.7 delaytime=&bar*4/3 delay=.35 delayfeedback=.45 env=&(map=adsr .004 1.4 0 2.2)
&low s=tri loop=D3 lpf=500 env=&(map=adsr 1.5 1 .9 3)

&out postgain=3.35 map=sample [&chords * &pad * .08, &arp * &bell * .16, &roots * &low * .3]
\`\`\`
`,forks:`---
title: Two Tuning Forks
tags: [genre:experimental, sound, stereo, physics]
description: Two tuning forks on one table, one struck now and then, the other set singing by the table.
---

\`\`\`cells
&tableNote label="The second fork, tuned the same, is never struck — but the table carries the vibration, and it begins to sing." about=&forkB
&detuneNote label="Detune it with its slider and they beat." about=&forkB
&touchNote label="Tap a fork to strike it (where you tap is how it rings), hold to damp it, drag across it to bow." about=(&forkA &forkB)
# Two Tuning Forks — resonators (body=): persistent objects with their modes (a fork: its tone, and
# a clang 6.27× higher that dies at once). Notes strike them; a note's value is where (0 … 7).
# couple= sets one ringing from the other, both ways, through the table (coupling= how much).
&bar from bar &tempo
&tempo step=60bpm
&hits step=1m/2 label="a strike, every eight seconds" 4
&forkA pan=.35 body=fork loop=A4 ring=10 hard=.35 board=none couple=&forkB coupling=.1 label="fork A: struck" 0
&forkB pan=.65 body=fork loop=free(440hz, 434..446) ring=10 hard=.35 board=none label="fork B: only the table rings it" 0

&out postgain=.447 map=sample [&hits * &forkA * .5, &forkB * .5]
\`\`\`
`,funk:`---
title: "Funk: the sixteenths lean"
tags: [rhythm, modal]
description: "A funk vamp in E dorian, its sixteenths leaning a little and its eighths straight: swing a level finer than jazz's, from the library's band."
---

Jazz swings the eighths, hard, near two thirds ([Swing: the long and the short](swing.md)); funk swings the sixteenths, lightly, and keeps its eighths straight.
It is the same lean, written at a finer level: \`swing=16n:.58\` moves the second sixteenth of each eighth a little late, and leaves every eighth where it is.
The share is a slider, from straight (1/2) to a triplet's (2/3).
In the Groove MIDI Dataset's drummers (#19, [the measurements](../docs/notes/groove-measure.md)), the funk performances that swing their sixteenths do so at .56 to .63, a median of .60, and the New Orleans ones at .56 to .59; most funk is played straight.

\`\`\`cells
* from style=&funk
&swingNote label="swing=16n: the sixteenths lean, the second of each pair this share of the way through its eighth (1/2 straight). The eighths stay straight: the level is the difference from jazz's swing=8n:2/3." about=&swing
&bar swing=&swing from bar &tempo
&tempo step=free(100bpm, 80..120)
&swing swing=16n:free(.58, 1/2..2/3)
\`\`\`

## The band

The drums are the library's, Jambot's Funk bar (\`funk_drums\`), and so is the bass (\`funk_bass\`), over a vamp from the library: four bars of E minor, four of A major, the dorian's IV (\`vamp_to_the_fourth\`).
Each taps the meter by the sixteenth, so each leans as the meter does.

\`\`\`cells
&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from funk_drums
&key from diatonic(mode=dorian) E
&harm from vamp_to_the_fourth &key
&bassline from funk_bass &harm
&hatNote label="The hats on the e and the a of each beat (the second sixteenth of an eighth) come a little late; those on the beats and the ands are straight." about=&hat
\`\`\`

## The guitar

A chord scratched on the sixteenths, its third and its fifth: most of its strokes are on the e and the a, so they lean; the stab on the and of four is an eighth, and keeps its place.

\`\`\`cells
&chank over=&harm step=16n ~ [1,2] ~ [1,2] [1,2] ~ [1,2] ~ ~ [1,2] ~ [1,2] ~ ~ [1,2] ~
&chankNote label="Swing the eighths instead (&swing swing=8n:2/3) and this is a shuffle: the sixteenths then fall even within each long and short eighth, and the funk is gone." about=&chank
&bassV from upright_bass
&guitar s=square loop=C4 lpf=2200 env=&(map=adsr .002 .06 0 .03)
&out map=sample postgain=2.72 [&groove, &bassline * &bassV * .6, &chank * &guitar * .25]
\`\`\`
`,gate:`---
title: "A gate: a product with a name"
tags: [tutorial, diatonic]
tier: 9
description: "Where notes become sound, named: a gate plays its voices with each note of what it plays."
---

\`\`\`cells
&gateNote label="&leadOut is a gate: it plays each note of &tune on the voices in its braid, both of them ([&lead, &bell], a chord), as loud as level= says: &accent per note times .4. It is read as [&tune * &accent * &lead * .4, …]. licence= and accents= say how far its performer plays from what is written, each a share of the feel's: 0 exactly as written, 1 as the feel's. A host's performer reads them; this card plays the notes as written." about=&leadOut
&drumNote label="&drumOut plays a kit: each number of &beat picks the drum, 0 the kick, 1 the snare, 2 the hat, as &beat over=&kit would." about=&drumOut
&roleNote label="&drums is a role: it names the gates that play it, here &drumOut. A reader that knows the role (the feel's drums) plays its gates so; a gate no role names, &leadOut, plays as written. It is no sound: the card sends the gates." about=&drums
&productNote label="The bass is the same thing unnamed: a product in the sound card. &bassLine names its notes with their levels, [&roots * .5], and the card multiplies it by the voice." about=(&bass &bassLine)
&bar from bar &tempo
&strike, &snap, &click from envelopes
&tempo step=free(96bpm, 60..140)
&key scale(major)

&tune over=&key step=8n 0 2 4 2 5 4 2@2 4 5 7 5 4 2 0@2
&accent map=amp step=8n 1 .5 .8 .5
&roots over=&key step=2n 0 3 4 0

&lead s=tri loop=C5 env=&(map=adsr .01 .2 .4 .2)
&bell s=sine loop=C6 env=&(map=adsr 0 .6 0 .3)
&bass s=square loop=C2 lpf=500 env=&strike
&bd note=36 s=sine loop=A1 env=&(map=adsr 0 .3 0 .1)
&sd seed=0 note=38 s=white env=&snap
&hh seed=1 note=42 s=white hpf=7000 env=&click
&kit &bd &sd &hh
&beat step=8n 0 2 1 2

&leadOut play=&tune level=&accent*.4 licence=.5 accents=free(0, 0..1) [&lead, &bell]
&drumOut play=&beat level=.5 &kit
&drums map=role &drumOut
&bassLine [&roots * .5]
&out map=sample postgain=2.54 [&leadOut, &drumOut, &bassLine * &bass]
\`\`\`
`,ghosts:`---
title: Ghost-Cells
tags: [genre:experimental, genre:electronic, genre:ambient, genre:industrial, artist:Nine Inch Nails, modal, stereo]
description: Dark and looping, in the manner of an instrumental Nine Inch Nails record.
---

\`\`\`cells
&pianoNote label="A prepared-piano phrase of seven eighths over a bar of eight, drifting a step each time round." about=(&phrase &piano)
&droneNote label="A distorted drone." about=(&drone &low)
&noiseNote label="Crushed noise drifting on prime periods." about=(&hiss &noise &grit &haze)
&percNote label="Heavy, sparse percussion and glitches, by chance." about=(&kick &metal &glitch)
# Ghost-Cells — D minor. The piano phrase is seven eighths long and the bar eight: it comes
# back a step later every bar, and lines up again only after seven bars.
&bar from bar &tempo
&click from envelopes
&tempo step=free(76bpm, 60..96)
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&phrase over=&minor step=8n label="the piano: seven against eight" 0 4 3 ~ 7 5 ~
&answer over=&minor step=1m/2 label="its shadow, low" -7@2 -5 -4 -7@2 -9 -10
&drone step=1m/4 [0,7]
&grit map=lin loop=.0435 .15 .7 .3 .15                       # 23 s
&haze map=lin loop=.0345 .1 .5 .9 .1                         # 29 s
&hiss step=1m/4 0
&kick seed=5157375652339238 step=8n 0 ~ ~ 0? ~ ~ 0?.7 ~
&metal seed=8501275419899268 step=16n ~!2 0?.75 ~!4 0?.6 ~!3 0?.8 ~ 0?.7 ~!2
&glitch seed=3984869331103389 step=32n [0|7|12]?.94

&piano pan=.36 s=tri loop=D4 lpf=3000 room=.45 delaytime=&bar*4/3 delay=.2 delayfeedback=.35 env=&(map=adsr .002 1.6 0 1.8) pitch=&(map=lin loop=.19 0 .05 0 -.05 0)
&cello pan=.62 s=saw loop=D3 lpf=700 room=.5 env=&(map=adsr .6 1 .8 2)
&low s=saw loop=D1 distort=.8 lpf=120..600 * &grit lpq=3 env=&(map=adsr 4 2 .9 6)
&noise seed=0 s=brown crush=5 lpf=200..2400 * &haze hpf=80 room=.4 env=&(map=adsr 6 2 .8 8)
&bd s=sine loop=D1 pitch=0..20 * &(map=adsr 0 .08 0 0) distort=.9 env=&(map=adsr 0 .5 0 .1)
&tick pan=.7 s=square loop=D6 hpf=4000 crush=4 env=&click
&blip pan=.64 s=sine loop=D6 crush=3 env=&(map=adsr 0 .05 0 .03)

&out postgain=.891 map=sample [&phrase * &piano * .22, &answer * &cello * .16, &drone * &low * .18, &hiss * &noise * .25, &kick * &bd * .55, &metal * &tick * .1, &glitch * &blip * .07]
\`\`\`
`,grids:`---
title: "Tuning: three grids"
tags: [tutorial, tuning, microtonal]
tier: 6
description: "One tune on three grids in turn: nineteen equal steps to the octave, a pure fifth cut in seven, and pure ratios."
---

\`\`\`cells
&edoNote label="map=edo(19): nineteen equal steps to the octave. map=ed(7, 3/2): seven equal steps to a pure fifth instead." about=(&edo19 &fifths)
&ratiosNote label="map=ratios: the tones as ratios, one period's worth, the last the period: 1 9/8 5/4 … 2." about=&just
&bar from bar &tempo
&tempo step=free(andante)
&edo19 map=edo(19)
&fifths map=ed(7, 3/2)
&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2

&a over=&edo19 step=&edoBar*2 0 3 6 8 11 8 6 3 0@4 ~@4
&b over=&fifths step=&fifthsBar*2 0 1 2 3 4 3 2 1 0@4 ~@4
&c over=&just step=&justBar*2 0 2 4 5 4 2 1 0 0@4 ~@4

&pluck s=tri loop=C4 env=&(map=adsr .01 .4 .3 .3)
&grids step=4n &edoBar &fifthsBar &justBar
&turns over=&grids step=2n 0 1 2                      # a grid every two bars, in turn
&out map=sample postgain=6.31 [&a * &pluck * .3,
                          &b * &pluck * .3,
                          &c * &pluck * .3]
\`\`\`
`,harmonograph:`---
title: Harmonograph
tags: [tutorial, genre:experimental, sound, stereo, physics]
tier: 7
description: "Two tuning forks, struck together, each draw one axis of an oscilloscope: a Lissajous curve."
---

\`\`\`cells
&forksNote label="A tonic and its fifth (0 and 7), struck together; the tonic sounds left, the fifth right." about=(&tonic &fifth)
&scopesNote label="A spectrum folds pitches into twelve classes (fold=12), each fork its own (channels=split); a waterfall shows bands (bins=24) as they ring away." about=(&classes &bands)
&figureNote label="Each fork drives one axis of an oscilloscope, x and y, and the figure they draw is a Lissajous curve — 3 : 2, slowly turning (the fifth is tempered), shrinking as they ring away." about=&screen
# Harmonograph — two resonators (forks), struck together every six seconds. &screen is an
# oscilloscope (scope=xy): its first channel across, its second up. A fifth draws a 3 : 2 figure.
&bar from bar &tempo
&tempo step=60bpm
&strike step=pulse/6 label="struck together" 0
&tonic body=fork loop=A3 ring=7 hard=.3 board=none label="the tonic" 0
&fifth body=fork loop=A3 ring=7 hard=.3 board=none label="its fifth" 7
&screen scope=xy label="x: the tonic · y: its fifth" &tonic &fifth
&classes scope=spectrum fold=12 channels=split label="their pitch classes, a ring each" &tonic &fifth
&bands scope=waterfall bins=24 label="their sound, in 24 bands, over time" &tonic &fifth

&out postgain=.871 map=sample [&strike * &tonic * .5] [&strike * &fifth * .5]
\`\`\`
`,hypercell:`---
title: Hypercell
tags: [genre:electronic, genre:dance, artist:Scooter, diatonic, arrangement]
description: "90s happy hardcore and eurodance, an original: three minutes of euphoric drops, then it ends."
---

\`\`\`cells
&fourFloorNote label="Four-on-the-floor at 160." about=&beat
&offbeatBassNote label="Offbeat octave bass." about=(&off &bass)
&stabsNote label="Rave stabs." about=(&stabs &stab)
&hookNote label="A euphoric hook on two detuned saws." about=(&hook &sawA &sawB)
&dropsNote label="Risers and snare rolls into every drop." about=(&roll &riser)
&songNote label="Fifteen sections of eight bars: three minutes, then it ends." about=&song
# Hypercell — Am F C G, a bar each; everything in semitones from C. The hook is our own.
&bar from bar &tempo
&thump, &click, &snap, &tap, &strike from envelopes
&tempo step=free(160bpm, 140..180)
&prog step=1m tags="bass" 9 5 0 7                                        # A F C G: the bass moves with it
&off tags="bass" step=&bassBar*2 ~ 0 ~ 0 ~ 0 ~ 0                             # the eurodance bass: on the offbeats
&sAm tags="synths" ~ [9,12,16]
&sF tags="synths" ~ [5,9,12]
&sC tags="synths" ~ [0,4,7]
&sG tags="synths" ~ [7,11,14]
&stabs tags="synths" step=&stabBar*2 label="rave stabs" &sAm!4 &sF!4 &sC!4 &sG!4
&hook tags="synths" step=&hookBar*2 label="the hook" 16!2 19 16 14 12 14@2 12!2 16 12 11 9 11@2 12!2 16 19 21 19 16@2 14 12 11 12 14@4
&held tags="synths" step=&padBar/4 [9,12,16] [5,9,12] [0,4,7] [7,11,14]
&beat tags="drums" step=&beatBar*2 &bd &hh [&bd,&cp] &hh &bd &hh [&bd,&cp] &hh   # the kick, the clap on two and four, the hats between
&roll tags="drums" step=&rollBar &sn!8 &sn*2!4 &sn*4!6 &sn*8!13 ~
&lift tags="rise" step=&riseBar/32 0
&up tags="rise" map=lin loop=&bar/32 0 .2 .45 1 0

&bd note=36 tags="drums" gain=.8 oneshot=1 s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .05 0 0) distort=.2 env=&thump
&hh seed=0 note=42 tags="drums" gain=.2 s=white hpf=8000 env=&click
&cp seed=1 note=39 tags="drums" gain=.35 oneshot=1 s=white hpf=1400 room=.2 env=&snap
&sn seed=2 tags="drums" gain=.25 s=white hpf=900 env=&tap
&bass tags="bass" s=saw loop=C2 lpf=900 lpq=4 env=&strike
&stab tags="synths" s=square loop=C4 lpf=2800 room=.25 env=&(map=adsr .002 .14 .1 .1)
&sawA tags="synths" s=saw loop=C5 lpf=5200 room=.3 delaytime=&bar*8/3 delay=.2 delayfeedback=.3 env=&(map=adsr .01 .2 .7 .2)
&sawB tags="synths" s=saw loop=527.4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
&padv tags="synths" s=saw loop=C4 lpf=1600 room=.5 env=&(map=adsr .8 .5 .8 1.5)
&riser seed=3 tags="rise" s=white lpf=300..9000 * &up lpq=6 env=&(map=adsr 1 .5 .9 .5)

# the three mixes the spectrum (&eq) reads; the other parts go straight into the card
&bassPart [(&off + &prog) * &bass * .35]
&hookPart [&hook * &sawA * .13, &hook * &sawB * .13]
&padPart [&held * &padv * .08]
&sections step=4n &bassBar &stabBar &hookBar &padBar &beatBar &rollBar &riseBar
&song over=&sections step=1m/8 laps=1 label="intro · groove · build · drop · drop · break · build · drop · drop · bass · break · build · drop · drop · out" [
      4] [0,4] [0,4,5,6] [0,1,2,4]!2 [2,3] [3,5,6] [0,1,2,4]!2 [0,4] 3 [3,5,6] [0,1,2,4]!2 4

&out postgain=2.05 map=sample [&beat, &bassPart, &stabs * &stab * .1, &hookPart,
                         &lift * &riser * .12, &padPart, &roll]
&eq scope=spectrum bins=20 label="the whole track, in 20 bands" &beat &bassPart &hookPart &padPart
\`\`\`
`,idm:`---
title: "IDM: drill, after Aphex Twin"
tags: [genre:electronic, artist:Aphex Twin, chromatic, rhythm]
description: A breakbeat backwards every other bar, with ratchets and hats.
---

\`\`\`cells
&hatsNote label="The hats run seven against four." about=&hats
&harmonyNote label="One harmony and one breath for pad, acid and lead." about=(&lydian &breath)
# Intelligent dance music, in the manner of Aphex Twin — an original. A breakbeat
# of voices, every other bar its retrograde ([::-1]); ratchets (&hh*3: a
# sixteenth split in three); hats seven against four. One harmony for all: the
# Lydian scale, I for two bars and II for two (^1: a degree up), in pad, acid and lead;
# one breath: a slow filter sweep moves the pad and the lead together.
&bar from bar &tempo
&tap, &click, &strike from envelopes
&tempo step=free(160bpm, 110..200)
&lydian scan(2 2 2 1 2 2 1) label="the harmony: {mode} on {tonic}"     # C, then D: two bars each

&pat &bd ~ &hh &hh*2 &sd ~ &bd &hh ~ &bd &sd &hh*3 ~ &bd &sd*4!2   # a bar of sixteenths
&break step=16n &pat &pat[::-1]                            # … then the same bar backwards
&hats step=pulse*7/4 &tick:0:.6 &tick:0:.3 &tick:0:.4 &tick:0:.3 &tick:0:.5 &tick:0:.3 &tick:0:.4  # seven to the bar
&pad part=pad over=&lydian step=1m/2 [0,2,4,6] [1,3,5,7]   # the chord, I then II
&lead 7 ~ 9 11 ~ 13 ~ 11 ~ ~ 9 ~                            # the lead: the chord's own tones, in triplets
&bleeps over=&lydian step=8t &lead!2 &lead^1!2
&riff 0 0 7 0 ~ 0 14 ~ 0 3 0 ~ 7 0 ~ 10
&acid over=&lydian step=16n &riff!2 &riff^1!2
&accent map=amp step=16n 1 .5 .8 .5 0 .5 1 0 .6 .5 .9 0 .7 .5 0 1      # louder, and brighter

&breath map=lin loop=&bar/8 .15 1 .15                       # one breath, for pad and lead

&bd note=36 oneshot=1 s=sine loop=A1 pitch=0..36 * &(map=adsr 0 .03 0 0) env=&(map=adsr 0 .2 0 .05)
&sd seed=0 note=38 s=white hpf=900 env=&tap
&hh seed=1 note=42 s=white hpf=9000 env=&click
&tick seed=2 gain=.2 s=white hpf=11000 env=&(map=adsr 0 .015 0 .01)
&bleep s=tri loop=C5 lpf=800..5000 * &breath delaytime=&bar*4/3 delay=.3 delayfeedback=.4 room=.25 env=&(map=adsr .003 .12 .3 .1)
&saw303 s=saw loop=C2 lpf=150..2600 * &(map=adsr .002 .16 .12 .06) * &accent lpq=12 env=&strike
&pad1 s=saw loop=C4 lpf=500..2200 * &breath env=&(map=adsr 1.2 .5 .7 2) pitch=&(map=lin loop=.3 0 .15 0 -.15 0)

&mix postgain=1.66 map=sample [&break * .7, &hats, &bleeps * &bleep * .3,
                                  &acid * &accent * &saw303 * .4, &pad * &pad1 * .14]
\`\`\`
`,"in-c":`---
title: In C, a sketch
tags: [genre:minimal, genre:experimental, arrangement, motifs, rhythm]
description: "After Terry Riley's In C: four of its fifty-three cells, each player repeating a cell until moving on, and a player who sits out comes back where they left off."
---

\`\`\`cells
&resumeNote label="restart=resume: a player switched off is not rewound. Take restart=resume off &song (the default, restart) to hear each come back at the top of their score." about=&song
&bar from bar &tempo
&click from envelopes
&tempo step=free(104bpm, 60..140)
&key scale(major)

# the cells (after the score's first four, simplified), in eighths
&c1 0 2 0 2 0 2
&c2 0 2 3 2
&c3 ~ 2 3 2
&c4 ~ 2 3 4

# a player's score: each cell repeated, then on to the next. Each player is a section of &sections and moves at their own pace
&alice over=&key step=&aliceBar*2 &c1!8 &c2!6 &c3!4 &c4!4
&bob over=&key step=&bobBar*2 &c1!6 &c2!6 &c3!6 &c4!2
&carol over=&key step=&carolBar*2 &c2!6 &c3!8 &c4!6

&sections step=4n &aliceBar &bobBar &carolBar
# who plays, a bar a step: Alice from the start, Bob in and out, Carol late, then everyone
&song over=&sections restart=resume step=1m laps=1 0 [0,1]!2 0 [0,2] [0,1,2] [0,1,2] [1,2] [0,1,2] [0,1,2] [0,2] [0,1,2]

&pulse s=sine loop=C6 env=&click
&marimba s=tri loop=C4 env=&(map=adsr .005 .25 0 .15)
&vibes s=sine loop=C5 env=&(map=adsr .005 .5 .1 .3)
&bell s=sine loop=C3 env=&(map=adsr .005 .8 0 .4)
&out map=sample postgain=3.8 [&alice * &marimba * .35, &bob * &vibes * .3, &carol * &bell * .35]
\`\`\`
`,jazz:`---
title: "Swing blues: 12 bars in C"
tags: [genre:jazz, genre:blues, rhythm]
description: "A 12-bar blues with swung eighths: the blues scale and the minor pentatonic as scans."
---

\`\`\`cells
* from style=&swingJazz
&pluck, &snap from envelopes
&swingNote label="The swing is a slider." about=&swing
# A 12-bar blues in C, swung. The bar leans its eighths, long, short: the second of each pair
# at a share of its beat that is free (1/2 straight, 2/3 the triplet swing, 3/4 hard). Two scales, both scans:
# the blues scale for the riff, the minor pentatonic for the turnaround.
&bar swing=&swing from bar &tempo
&tempo step=free(132bpm, 80..220)
&swing swing=8n:free(2/3, 1/2..3/4)                    # two eighths a beat: long, short

&blues scan(3 2 1 1 3 2)                               # C Eb F F# G Bb
&penta scan(3 2 2 3 2)                                 # C Eb F G Bb
&changes step=1m 0!4 5!2 0!2 7 5 0 7                   # I I I I · IV IV I I · V IV I V, a bar each

&riff 0 1 2 3 4 ~ 5 4 ~ ~ 2 1 0 ~@3                    # two bars — it stays put over the IV, as a blues riff does
&turn over=&penta 3 ~ 4 3 2 1 0 ~ 2 ~@3 1 0 ~ ~ 0 ~ 1 2 3 ~ 5 ~ 4 3 2 1 0@4
&lick over=&blues step=8n &riff!4 &turn

&walk step=4n 0 4 7 10                                 # root, 3rd, 5th, flat 7th — moved by the changes
&comp step=8n ~@3 [4,10] ~@3 [4,10]                    # shells (3rd and 7th) on the and of 2 and 4
&ride step=8n &cym:0:.9 ~ &cym:0:.6 &cym:0:.5 &cym:0:.9 ~ &cym:0:.6 &cym:0:.5 # ding, ding-a ding, ding-a

&horn s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
&bass s=tri loop=C2 env=&pluck
&keys s=sine loop=C4 env=&(map=adsr .005 .3 .2 .2)
&cym seed=0 gain=.25 s=white hpf=8000 env=&snap

&mix postgain=2.03 map=sample [&lick * &horn * .5,
                                  (&walk + &changes) * &bass * .8,
                                  (&comp + &changes) * &keys * .35,
                                  &ride]
\`\`\`
`,just:`---
title: "Just intonation: pure and tempered"
tags: [genre:experimental, microtonal, tuning, harmony, stereo]
description: "Just intonation: the same four chords twice, pure on the left and tempered on the right."
---

The same chords twice: on the left in just intonation (thirds 5/4, fifths 3/2: pure), on the right in equal temperament. Listen to the right one beat. And in ii (D F A) the just fifth, 40/27, is out of tune, the price of purity.

\`\`\`cells
&justPureNote label="Left: just — thirds 5/4, fifths 3/2." about=(&just &pure)
&temperedBeatsNote label="Right: tempered — listen to it beat." about=(&equal &tempered)
&justFifthNote label="In ii (D F A) the just fifth is 40/27: out of tune." about=&chords
&bar from bar &tempo
&tempo step=free(48bpm, 30..90)
&just label="just: {notes}" map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2        # C major, pure: one octave's tones, then the octave
&equal label="tempered: {notes}" scan(2 2 1 2 2 2 1)                            # C major, in equal steps

&chords [0,2,4] [3,5,7] [1,3,5] [4,6,8]               # I IV ii V, as scale degrees
&pure over=&just step=1m &chords
&tempered over=&equal step=1m &chords

&organ s=saw loop=C3 lpf=1800 env=&(map=adsr .3 .3 .9 .8)
&out postgain=2 map=sample [&pure * &organ * .3] [&tempered * &organ * .3]
\`\`\`
`,kalimba:`---
title: Kalimba
tags: [tutorial, genre:world, sound, physics]
tier: 7
description: "The smallest tuned instrument: one resonator, its braid its tines, eight of them on a shared board."
---

\`\`\`cells
&pluckNote label="A tune reads the tines and plucks them: each note a tine, by its place." about=(&tune &kalimba)
&boardNote label="The board carries every one to the others, which answer faintly." about=&kalimba
&padNote label="Tap the pads round it to play along; hold it to stop it ringing." about=&kalimba
# Kalimba — a resonator's braid is its exciters: 0 2 4 7 9 12 14 16, semitones from its fundamental
# (none written: the twelve). body=tine is what each is; they share a board (board=box: a box, an octave down, as without it)
# and each rings the others through it. The tune reads through the kalimba (over=&kalimba): its tines are
# its table, and a note plucks the tine at its place.
&bar from bar &tempo
&tempo step=92bpm
&tune over=&kalimba step=8n label="the tune" 0 2 4 ~ 3 4 5 ~ 4 2 1 ~ 0 ~!3 5 ~ 4 3 2 ~ 1 2 0 ~!3 7 6 5 ~
&kalimba body=tine loop=C4 ring=3 hard=.3 board=box coupling=.06 label="the kalimba: eight tines on one board" 0 2 4 7 9 12 14 16

&out postgain=.168 map=sample [&tune * &kalimba * .5]
\`\`\`
`,kinderlied:`---
title: Kinderlieder, in pieces
tags: [genre:folk, diatonic, motifs, arrangement]
description: Twinkle and Hänschen klein, each tune's lines its own parts, each tune's shape a form, over a vamp of two chords, a root bass and the plainest beat.
---

Two children's songs, the kind a learner plays first, made of the seed library's pieces.
Each tune is its lines, each a motif of one bar and a part this file gives (decision 082): Twinkle's call \`&twinkle\` and its answer \`&wonder\`; Hänschen klein's call \`&haenschen\`, its open answer \`&hinein\`, its close \`&heim\` and its bridge \`&weinet\`. Another piece takes one by its head, over its own key: \`&twinkle from kinderlied &key\`.
Each tune's shape is a form: Twinkle's is \`ternary\`, A B A, its bridge the answer a step up; Hänschen klein's is \`rounded_binary\`, A A′ B A′.
The band is the library's too: the plainest beat, \`kinderlied_drums\` (the kick on one and three, the snare on two and four, a closed hat on every beat), a vamp of two chords, the tonic for four bars and the fifth for four, and the root bass under it.

\`\`\`cells
* from style=&kinderlied
&bar from bar &tempo
&tempo step=free(100bpm, 80..120)
&key from diatonic(mode=ionian) C
&harm from vamp_to_the_fifth &key
&bassline from root_bass &harm
&drums, &drumsOut from drums_performer &drumlines
&bass, &bassOut from bass_performer(bassV=&bassV) &bassline
&leadOut from lead_performer(leadV=&leadV) &leadline
&kick, &backbeat, &hat from kinderlied_drums
&drumlines [&kick, &backbeat, &hat]
&bandNote label="The band: the Kinderlied beat, a vamp of the tonic and the fifth, the root bass, all from the library." about=(&drumlines &harm &bassline)
\`\`\`

## The tunes, in pieces

Each tune is a part of this file: its signature (\`&twinkle from &key\`), then its line, a bar of eighths over the key. Opened, the piece plays them over its own \`&key\`; taken, a part plays over the key the taking line gives.
The forms put them together: \`ternary\` takes Twinkle's call and names its answer, and makes its bridge of the answer a step up, *up above the world so high*; \`rounded_binary\` takes Hänschen klein's call and names its open answer, its close and its bridge, which it plays twice, the second time a step up, *hat ja nun kein Hänschen mehr*.

\`\`\`cells
&twinkle from &key style=&(map=style sync=.1 harm=.12 bite=.5 mood=.95) facet=motif
&twinkle over=&key step=8n 0 0 4 4 5 5 4@2
&wonder from &key style=&(map=style sync=.1 harm=.12 bite=.4 mood=.95) facet=motif
&wonder over=&key step=8n 3 3 2 2 1 1 0@2
&haenschen from &key style=&(map=style sync=.1 harm=.12 bite=.65 mood=.95) facet=motif
&haenschen over=&key step=8n 4 2 2@2 3 1 1@2
&hinein from &key style=&(map=style sync=.1 harm=.12 bite=.6 mood=.95) facet=motif
&hinein over=&key step=8n 0 1 2 3 4 4 4@2
&heim from &key style=&(map=style sync=.1 harm=.12 bite=.55 mood=.95) facet=motif
&heim over=&key step=8n 0 2 4 4 0@4
&weinet from &key style=&(map=style sync=.1 harm=.12 bite=.7 mood=.95) facet=motif
&weinet over=&key step=8n 1 1 1 1 1 2 3@2
&twinkleSong from ternary(answer=&wonder) &twinkle
&haenschenSong from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen
&leadline step=8n ~@16 &twinkleSong &haenschenSong
&tuneNote label="Twinkle in 6 bars after a 2-bar intro, then Hänschen klein in 8: each tune its motifs, each shape a form." about=(&twinkleSong &haenschenSong)
\`\`\`

## The sound

A music box for the tune, a soft round bass, and the general MIDI kit for the drums.

\`\`\`cells
&bassV s=sine loop=C3 env=&(map=adsr .005 .4 .4 .1)
&leadV s=tri loop=C5 env=&(map=adsr .005 .3 .3 .2)
&out map=sample postgain=1.6 [&drumsOut * .7, &bassOut * .8, &leadOut * .6]
\`\`\`
`,korobeiniki:`---
title: "8-bit: Korobeiniki, in Tetris form"
tags: [genre:world, genre:electronic, genre:folk, genre:8-bit, tonal, arrangement]
description: "Korobeiniki, in the form of the puzzle game's music: A · A · B · B · A, and round again."
---

The Russian folk song a famous puzzle game made its own, as a 1980s console would play it: pulse waves are braids, the bass a stepped triangle, chords are arpeggios too fast to hear apart. In the game's form: the song (A), then a slower middle section (B, our own), then the song again, and round.

\`\`\`cells
* from style=&chiptune
&formNote label="&tetris picks the parts, eight bars a step." about=&tetris
&sectionsNote label="A is the folk song; B, slower, in half notes, is our own." about=(&tune &chorale)
&bar from bar &tempo
&tempo step=free(144bpm, 100..200)

&a tags="lead" 7@2 2 3 5@2 3 2 0@2 0 3 7@2 5 3                 # in A minor (A = 0); two bars
&b tags="lead" 2@3 3 5@2 7@2
&end tags="lead" 3@2 0@2!2 ~@2                                 # … closes both halves
&c tags="lead" ~ 5@2 8 12@2 10 8 7@3 3 7@2 5 3
&d tags="lead" 2@2 2 3 5@2 7@2
&tune tags="lead" step=&leadABar*2 &a &b &end &c &d &end
&changes tags="harmony" loop=&bar/32 0 0 -5 0 5 0 -5 0             # Am Am E Am Dm Am E Am — a bar each

&octaves tags="bass" 0 12 0 12 0 12 0 12           # the bass jumps octaves, as they did
&bassAOctaves tags="bass" step=&bassABar*2 &octaves
&bassBOctaves tags="bass" step=&bassBBar*2 &octaves
&hold tags="harmony" 0                                # one chord a bar …
&chordsAHold tags="harmony" step=&chordsABar/4 &hold
&chordsBHold tags="harmony" step=&chordsBBar/4 &hold
&hats tags="drums" step=&drumsBar*2 &noise:0:.5 &noise:0:.15 &noise &noise:0:.15 &noise:0:.5 &noise:0:.15 &noise &noise:0:.15

&pulse tags="lead" loop=A4 0 0 0 1 env=&(map=adsr .002 .05 .8 .05)              # a 25% pulse: the lead
&tri tags="bass" loop=A2 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1 0   # a stepped triangle
&square tags="harmony" loop=A3 0 1 pitch=&(loop=20 0 3 7) env=&(map=adsr .002 .1 .7 .1)   # … arpeggiated, 60 notes a second
&noise seed=0 tags="drums" gain=.2 s=white hpf=5000 env=&(map=adsr 0 .05 0 .02)

# B: half notes over Am and Em — our own (the game's middle section is its composer's)
&chorale tags="lead" step=&leadBBar/2 3 2 0 -2 0 2 3 2 0 3 7 5 3 2 0@2
&changesB tags="harmony" loop=&bar/32 0 -5 0 -5 0 -5 0 0                  # Am Em Am Em Am Em Am Am
&pulse50 tags="lead" loop=A4 0 1 env=&(map=adsr .01 .1 .8 .2)              # a 50% pulse, softer: for B

# the sections &tetris switches: eight bars a step, A A B B A, round again
&sections step=4n &leadABar &leadBBar &bassABar &bassBBar &chordsABar &chordsBBar &drumsBar
&tetris over=&sections step=1m/8 label="A · A · B · B · A" [0,2] [0,2,4,6] [1,3,5] [1,3,5,6] [0,2,4,6]

&out postgain=1.78 map=sample [&tune * &pulse * .3,
                         &chorale * &pulse50 * .28,
                         (&bassAOctaves + &changes) * &tri * .6,
                         (&bassBOctaves + &changesB) * &tri * .6,
                         (&chordsAHold + &changes) * &square * .12,
                         (&chordsBHold + &changesB) * &square * .12,
                         &hats]
\`\`\`
`,lullaby:`---
title: "Lullaby: Brahms, Wiegenlied"
tags: [genre:classical, artist:Brahms, tonal, diatonic]
description: Brahms' lullaby on a music box, its notes ringing on.
---

\`\`\`cells
# Brahms, Wiegenlied (1868). A music box over a slow 3/4. The second phrase is
# the first a step lower (&rock^-1): a sequence, as Brahms wrote it.
&bar scan(28 37 35) step=&tempo
&tempo step=free(56bpm, 40..72)
&key scale(major)                       # C major

&rock 4@3 2 2@2 4@3 2 4@2                    # lul-la-by and good night
&rise 7@2 6@3 5 5@2 4@2 1 2                  # with ro-ses be-dight
&turn 6@2 5 4@2 6 7@4 0 0
&high 7@3 5 3@2 4@3 2 0@2                    # sung twice
&home 3@2 2@2 1@2 0@4 2 2                    # … and the next pickup
&song over=&key step=8n &rock &rise &rock^-1 &turn &high 3@2 4@2 5@2 4@4 0 0 &high &home

&roots over=&key step=1m 0!3 4!4 0 3 0 4 0 3 0 4 0

&ring map=lin loop=&song 1 .35 .1           # each note rings and fades away: a ramped volume
&box s=sine loop=C5 room=.5 env=&(map=adsr .005 .1 1 .9)
&low s=tri loop=C3 env=&(map=adsr .05 .6 .4 .6)
&mix postgain=2.37 map=sample [&song * &ring * &box, &roots * &low * 0.5]
&roll scope=waterfall label="a piano roll: the tune above, its roots below" &song &roots
\`\`\`
`,metronome:`---
title: "Metronome: any meter"
tags: [tutorial, genre:electronic, rhythm]
tier: 6
description: A bar and the clicks it plays, in a meter you choose.
---

\`\`\`cells
&tap, &click from envelopes
&chooseNote label="Choose the time signature and the grid — a click on every beat, eighth, sixteenth or triplet — the tempo and the swing." about=&bar
&levelsNote label="The bar's own steps carry their levels (the downbeat, the beats, the subdivisions): the clicks read them through a kit." about=(&bar &clicks)
# The bar is a meter: meter(signature, steps a pulse) writes it as levels — 0 the downbeat (*),
# 1 a beat (+), 2 a half (-), 3 a subdivision (.), 4 finer (,). Its bpm counts beats, however fine
# its steps. Read through &clicks (a kit), each level has its own click: a tonal tick, no noise —
# the downbeat the highest and longest, each finer division lower and shorter.
&bar meter(free(2, 0..7, "2/4 3/4 4/4 5/4 6/8 7/8 9/8 12/8"), free(0, 0..3, "1 2 3 4")) step=&tempo swing=8n:free(.5, .5...75) over=&clicks label="**{tempo}** beats a minute"
&tempo step=free(100bpm, 40..208)
&clicks &down &beatc &half &sub &fine
&down s=sine loop=G6 pitch=0..7 * &(map=adsr 0 .008 0 0) env=&tap
&beatc s=sine loop=D6 pitch=0..5 * &(map=adsr 0 .006 0 0) env=&(map=adsr 0 .05 0 .025)
&half s=sine loop=A5 pitch=0..3 * &(map=adsr 0 .005 0 0) env=&click
&sub s=sine loop=E5 env=&click
&fine s=sine loop=B4 env=&(map=adsr 0 .018 0 .01)
&mix postgain=11.3 map=sample [&bar * free(.8, 0..1)]
\`\`\`
`,"midi-out":`---
title: "MIDI out: a band on a synth"
tags: [tutorial, genre:electronic, MIDI]
tier: 9
description: "The piece names where its notes go: a melody and a bass on a synth's channels 1 and 2, the drums on 10. The bass is on the synth alone: sent, and heard at its entry's gain."
---

\`\`\`cells
&cardNote label="map=midi makes a MIDI card: its entries are channels, in order: the theme on the reed goes out on 1, the bass on the sub on 2; ~ would skip one. &sub is on no sound card: it is sent on 2, and heard as the MIDI card hears it, at its entry's gain." about=&synth
&drumNote label="map=midi(10): the whole card on channel 10, the drums by General MIDI note (bd 36, sd 38, hh 42). map=midi(10, 2) would send it to output slot 2, a device chosen in the MIDI page." about=&drums
&bar from bar &tempo
&tempo step=104bpm

&theme over=scale(minor, A) step=4n 0 2 4 2 3 1 0 ~
&bass part=bass over=scale(minor, A) step=2n 0 5 3 4
&groove step=8n &bd ~ &hh ~ &sd ~ &hh &hh

&reed s=square loop=C4 lpf=1800 env=&(map=adsr .01 .2 .5 .3)
&sub loop=C2
&bd, &sd, &hh from gm_kit

&out map=sample postgain=1.375 [&theme * &reed * .5, &groove * .6]
&synth map=midi [&theme * &reed] [&bass * &sub]
&drums map=midi(10) &groove
\`\`\`
`,mirrors:`---
title: "Mirrors: backwards, upside down, in pieces"
tags: [tutorial, motifs, counterpoint]
tier: 5
description: One motif heard forwards, backwards, higher, upside down, and taken apart.
---

\`\`\`cells
&sliceNote label="&m[::-1] is the motif backwards (its retrograde); &m[0:4] its first four steps; &m[-1] its last; &m^$7 all of it seven steps of the grid up (on the twelve, a fifth)." about=&tune
&inverseNote label="inverse(&m) mirrors it within the scale, round its first degree: up becomes down. Played against the tune from the start: a mirror for the motif, and degree(…, 4) for its reverse." about=&answer
&bar from bar &tempo
&swell from envelopes
&tempo step=free(andante)
&key scale(dorian, &tonic) label="{mode} on {tonic}"
&tonic D

&m 0 1 2 4 3 1 2@2
&tune over=&key step=8n &m &m[::-1] &m^$7 &m[0:4]!2 &m[-1]@4
&answer over=&key step=8n inverse(&m) degree(inverse(&m), 4) inverse(&m) degree(inverse(&m), 4) 0@8

&flute s=tri loop=D4 env=&swell
&cello s=saw loop=D3 lpf=1200 env=&swell
&out map=sample postgain=4.22 [&tune * &flute * .35, &answer * &cello * .25]
\`\`\`
`,moving:`---
title: "Moving parameters: a filter that opens"
tags: [tutorial, sound]
tier: 6
description: A bass line whose filter opens on every note and swells over four bars, with accents and a fade.
---

\`\`\`cells
&strike from envelopes
&rangeNote label="lpf=150..2800 * &fenv * &swell: the cutoff moves in that range, scaled by an envelope on every note and a slow swell." about=&acid
&dbNote label="map=db: a volume in decibels, 0 as it is, −6 about half." about=&fade
&bar from bar &tempo
&tempo step=free(moderato)

&line step=16n 0 0 12 0 ~ 0 10 0 0 3 0 ~ 7 0 12 ~
&accent map=amp step=16n 1 .5 .9 .5 0 .6 1 .5 .8 .5 .7 0 1 .5 .9 0
&swell map=lin loop=&bar/4 .2 1 .2
&fade map=db step=1m 0 -3 -6 -3

&acid s=saw loop=C2 lpf=150..2800 * &(map=adsr .002 .15 .1 .05) * &swell lpq=10 env=&strike
&out map=sample postgain=9.12 [&line * &acid * &accent * &fade * .4]
\`\`\`
`,musicbox:`---
title: Music Box
tags: [tutorial, genre:classical, sound, stereo]
tier: 7
description: "A clockwork music box: wound, it spins up from rest, plays its tune, and as the spring runs down it slows and stops."
---

\`\`\`cells
&springNote label="As the spring runs down it slows, and slows, and stops. Physics, not a ritardando." about=&bar
&drumNote label="Turn the drum forward with your finger to push the tune on; hold it, and the box stops under your hand." about=&bar
# Music Box — the meter is a body that turns: a motor (its spring) pulls it to 96 bpm, its
# mass resists, friction drags; over 36 s the spring runs down, and it coasts to a stop.
# Everything it drives slows with it — the tune, the bass, the tick of the escapement.
&bar meter("3/4") step=&tempo motor=6 mass=1.2 friction=.4 wind=36
&tempo step=96bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&tune over=&major step=8n label="the comb" 4 2 0 2 4 4 4@2 3 2 1 2 3 1 -1 1 3 3 3@2 2 1 0@2
&low over=&major step=4n label="the bass" -14 -12 -10 -14 -12 -10!2 -8 -6 -10 -8 -6
&tick step=4n label="the escapement" 0!3

&m s=sine ratio=7.1
&comb oneshot=1 pan=.36 s=sine loop=C5 fm=&m index=.2..1.6 * &(map=adsr .001 .06 .1 .1) room=.35 env=&(map=adsr .001 1.1 0 1)
&combLow oneshot=1 pan=.61 s=sine loop=C5 fm=&m index=.1...8 * &(map=adsr .001 .06 .1 .1) env=&(map=adsr .001 1.4 0 1.2)
&tickv seed=0 s=white hpf=6500 env=&(map=adsr 0 .012 0 .01)

&out postgain=5.47 map=sample [&tune * &comb * .22, &low * &combLow * .18, &tick * &tickv * .05]
\`\`\`
`,onemore:`---
title: One more Cell
tags: [genre:electronic, genre:dance, artist:Daft Punk, diatonic]
description: "French filter house, an original: maj7 chords chopped in a funky rhythm under one long filter sweep."
---

\`\`\`cells
&vibrato from vibrato
&strike, &thump, &snap, &click from envelopes
&chordsNote label="Parallel maj7 chords chopped in a funky sixteenth rhythm, F G A B♭." about=(&chop &prog)
&sweepNote label="One long filter sweep, pumping on every beat." about=(&filt &pump)
&discoNote label="Disco octaves and a robotic lead." about=(&disco &robot)
&fourFloorNote label="Four-on-the-floor." about=&beat
&loopNote label="A loop: open it up and let it ride." about=&song
# One more Cell — the chords are one shape (maj7) moved F G A B♭ (&prog): parallel, as the
# filter-house records did. The pump: the chords duck on every beat (a volume stream).
&bar from bar &tempo
&tempo step=free(122bpm, 110..130)
&prog step=1m/2 tags="chords" 0 2 4 5                                        # F G A B♭, two bars each
&c tags="chords" [0,4,7,11]
&chop tags="chords" step=&choppyBar*4 label="the chop" &c ~ &c!2 ~ &c ~ &c ~ &c!2 ~ &c ~ &c!2
&pump tags="chords" map=amp step=4n .35 .55 .75 .95
&disco tags="bass" step=&discBar*2 0 12 0 12 0 12 0 12
&robot tags="robot" step=&robBar*2 label="the robot" ~ 12 14 16 ~ 16 14 12 ~ 14 16 17 ~ 16 14 ~ ~ 12 14 16 ~ 19 17 16 14@2 12@2 9@4
&filt tags="chords" map=lin loop=&bar/32 .06 .3 1 .7 .06
&beat tags="groove" step=&grooveBar*2 &bd &oh [&bd,&cp] &oh &bd &oh [&bd,&cp] &oh   # four on the floor, the clap on two and four, the open hat between
&shake seed=6514111529935391 tags="groove" step=&grooveBar*4 0? 0?.7 0? 0?.7

&keys tags="chords" s=square loop=F3 lpf=200..6500 * &filt lpq=5 env=&strike
&bass tags="bass" s=square loop=F1 lpf=700 env=&strike
&lead tags="robot" s=square loop=F4 lpf=1400 lpq=9 delaytime=&bar*4/3 delay=.25 delayfeedback=.3 env=&(map=adsr .02 .2 .7 .15) pitch=&vibrato
&bd note=36 tags="groove" gain=.8 oneshot=1 s=sine loop=A1 pitch=0..26 * &(map=adsr 0 .05 0 0) env=&thump
&cp seed=0 note=39 tags="groove" gain=.3 oneshot=1 s=white hpf=1300 room=.25 env=&snap
&oh seed=1 note=46 tags="groove" gain=.15 s=white hpf=7000 env=&(map=adsr 0 .18 0 .08)
&sh seed=2 tags="groove" s=white hpf=10000 env=&click

&sections step=4n &grooveBar &choppyBar &discBar &robBar
&song over=&sections step=1m/8 label="filtered · groove · lead · breakdown" [0,1] [0,1,2] [0,1,2,3] [1,3]

&out postgain=2.57 map=sample [&beat, &shake * &sh * .1,
                            (&chop + &prog) * &pump * &keys * .07,
                            (&disco + &prog) * &bass * .35,
                            &robot * &lead * .1]
\`\`\`
`,oscillator:`---
title: An oscillator
tags: [tutorial, sound]
tier: 1
description: "The smallest piece that sounds: one cell turning its braid 440 times a second, held, heard through the built-in card."
---

\`\`\`cells
&a loop=A4
\`\`\`
`,pachelbel:`---
title: "Pachelbel, Canon in D: a ground and three violins"
tags: [genre:classical, artist:Pachelbel, tonal, diatonic, canon, stereo]
description: Eight bass notes, over and over; three violins play one line, each entering a ground later.
---

\`\`\`cells
# Johann Pachelbel, Canon in D. Eight bass notes, over and over (the ground);
# three violins play one line, each entering two bars after the last.
&bar from bar &tempo
&vibrato from vibrato
&tempo step=free(66bpm, 40..100)
&ground step=4n 0 -5 -3 -8 -7 -12 -7 -5                   # D A B F# G D G A — two bars, forever

# the line: three variations of two bars each (D = 0)
&line step=8n show=notes &(16@2 14@2 12@2 11@2 9@2 7@2 9@2 11@2) &(12@2 11@2 9@2 7@2 5@2 4@2 5@2 2@2) &(0 4 7 5 4 0 4 2 0 -3 0 7 5 9 7 5)

&cello s=saw loop=D3 lpf=900 env=&(map=adsr .03 .3 .7 .3)
&violin s=saw loop=D4 lpf=2600 env=&(map=adsr .08 .2 .8 .4) pitch=&vibrato

# the canon: each violin is the line a variation later ([<<]); each enters a ground later
&out postgain=2.12 map=sample [&ground * &cello * .6,
                                  &line[<<] * &(map=amp step=cycle(&ground) 0 1!11) * &violin * .35,
                                  &line[<<2] * &(map=amp step=cycle(&ground) 0 0 1!10) * &violin * .25] [
                                  &ground * &cello * .6,
                                  &line[<<2] * &(map=amp step=cycle(&ground) 0 0 1!10) * &violin * .25,
                                  &line * &(map=amp step=cycle(&ground) 0 0 0 1!9) * &violin * .35]
&parts scope=spectrum channels=split label="the ground and the canon, each its own" &ground &line
\`\`\`
`,patchbay:`---
title: "Patchbay: a modular patch"
tags: [genre:electronic, sound]
description: "A Berlin-school patch on the modules: two oscillators into one resonant low-pass, its cutoff patched from a contour and a slow LFO, its resonance from a sample and hold, then an amp and an echo."
---

A modular synthesizer's patch, each module a line and each cable a reference. Two oscillators an octave apart into one resonant low-pass (a VCF after a mixer: decision 067), its cutoff patched from a contour on every note and a slow LFO, its resonance from a sample and hold; then an amp, and an echo. A sixteen-step sequencer in A minor, moved every two bars, plays it.

\`\`\`cells
&patchNote label="Each module is a fragment: its jacks are its parameters, a knob at its default until a cable (a cell) is patched in: lowpass(eg=&contour, cutoff=&sweep, res=&jitter)." about=(&vcf &vca)
&modNote label="The modulation: a contour on every note (&contour), an LFO once every eight bars (&sweep), a value at random each eighth, held (&jitter)." about=(&contour &sweep &jitter)
&bar from bar &tempo
&thump, &click from envelopes
&tempo step=free(116bpm, 90..140)
&key from diatonic(mode=minor) &tonic
&tonic A

&seq over=&key step=16n 0 7 2 7 4 7 2 9 0 7 2 7 4 11 9 7
&changes step=1m/2 0 5 3 -2
&accent map=amp step=16n 1 .4 .6 .4 .9 .4 .6 .4 1 .4 .6 .4 .9 .5 .7 .5

&contour map=adsr .002 .22 .1 .08
&sweep loop=&bar/16 from lfo
&jitter from sh
&drift loop=&bar/8 map=lin 0 .12 0

&saw s=saw loop=C2 from osc
&sub s=square loop=C1 from osc(pitch=&drift)
&vcf delay=.3 delaytime=8n. delayfeedback=.45 from lowpass(eg=&contour, cutoff=&sweep, res=&jitter) [&saw, &sub * .5]
&vca from amp(eg=&(map=adsr .002 .3 .5 .06)) &vcf

&kick note=36 oneshot=1 s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&thump gain=.8
&hat seed=0 oneshot=1 s=white hpf=7500 env=&click gain=.25
&beat step=16n &kick &hat &hat &hat [&kick,&hat] &hat &hat &hat:0:.5

&out map=sample postgain=2.85 [(&seq + &changes) * &accent * &vca * .35, &beat]
\`\`\`

The note ([docs/notes/modular.md](../docs/notes/modular.md)) writes the same patch flat, the filter and the echo on each oscillator: it plays the same notes, each through the same filter.
`,pertonos:`---
title: "Canon per tonos: rising a tone a pass"
tags: [genre:classical, artist:Bach, tonal, canon, stereo]
description: A canon on the royal theme that rises a whole tone each pass, as in the Musical Offering.
---

\`\`\`cells
&vibrato from vibrato
&swell from envelopes
# After Bach, Musical Offering: "Ascendenteque Modulatione ascendat Gloria Regis".
# The royal theme on top; below it a canon at the fifth, one bar apart;
# and every pass the whole piece rises a whole tone: C D E F# G# A# …
# (Bach's design; the inner voices here are written for this example.)
&bar scan(27 23 26 24) step=&tempo
&tempo step=free(72bpm, 56..92)
&key step=cycle(&theme) stride=2 cycle=2       # a whole tone per pass: up two octaves, then round
&scale over=&key scan(2 1 2 2 1 2 2)                  # C minor (Aeolian); 6# is the leading tone

&theme over=&scale step=4n 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2

# the canon: five one-bar motifs, written in place; the cello reads them a bar later (&alto[<<])
&alto over=&scale step=4n &(4 4 7 7) &(7!4) &(8 4 7 5) &(8 7 5# 3) &(8 4 8 8)

&reed pan=.28 s=saw loop=C4 lpf=2600 lpq=1 room=.35 env=&(map=adsr .03 .4 .6 .3) pitch=&vibrato
&viola pan=.2 loop=C3 lpf=1400 room=.3 env=&swell 0 1
&cello pan=.81 s=tri loop=C2 env=&(map=adsr .01 .5 .6 .3)

# stereo: each voice placed with its own pan= (the reed and the viola left, the cello right)
&out postgain=1.58 map=sample [&theme * &reed * 0.45, &alto * &viola * 0.3, (&alto[<<] - 7) * &cello * 0.9]   # the cello a bar behind, a fifth below
\`\`\`
`,phase:`---
title: Cell Phase
tags: [genre:experimental, genre:minimal, artist:Steve Reich, modal, rhythm, stereo]
description: "After Steve Reich's Piano Phase, an original: two pianos, one pattern of twelve, slowly slipping apart."
---

\`\`\`cells
&tap from envelopes
&driftNote label="The right one plays 81 notes in the time of the left one's 80 — it slips a note ahead every 81, through all twelve alignments, back to unison after 81 rounds." about=(&left &right)
&woodNote label="A quiet euclid(5, 12) on low wood marks the left player's twelve." about=(&wood &left)
# Cell Phase — no tempo is nudged: the drift is a ratio of clocks. &left steps in sixteenths
# (step=16n); &right in pulse*81/20 — a sixteenth times 80/81. Every 81 of its notes, it's one ahead.
&bar from bar(meter="3/4") &tempo
&tempo step=free(144bpm, 100..180)
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&pattern 0 2 4 5 7 5 4 2 1 4 7 9
&left over=&minor step=16n label="left: in time" &pattern
&right over=&minor step=pulse*81/20 label="right: 81 notes to the left's 80" &pattern
&wood step=16n label="euclid(5, 12): the left player's twelve" euclid(5, 12)

&mL s=sine ratio=1
&mR s=sine ratio=1
&pianoL pan=.15 s=sine loop=E4 fm=&mL index=.2..1.6 * &(map=adsr .001 .3 .1 .2) room=.25 env=&(map=adsr .002 .6 .2 .2)
&pianoR pan=.85 s=sine loop=E4 fm=&mR index=.2..1.6 * &(map=adsr .001 .3 .1 .2) room=.25 env=&(map=adsr .002 .6 .2 .2)
&woodv s=sine loop=E2 pitch=0..12 * &(map=adsr 0 .03 0 0) env=&tap

&out postgain=3.58 map=sample [&left * &pianoL * .2, &right * &pianoR * .2, &wood * &woodv * .1]
\`\`\`
`,"play-in":`---
title: "Play in: a braid left to the performer"
tags: [tutorial, diatonic]
tier: 9
description: "A riff left to the performer: free(…) around a braid. It plays as written until you play in."
---

\`\`\`cells
&recordNote label="Press ● (record) and play one pass of the riff on the keys: a MIDI keyboard, the computer's (a setting) or the on-screen ones. The take is held in its place; Save writes it into the code, Revert goes back." about=&riff
&lengthNote label="Its length is the frame a take fills: sixteen steps here, a bar of sixteenths." about=&riff
&key scan(2 2 1 2 2 2 1)
&bar from bar &tempo
&tempo step=96bpm

&riff over=&key step=16n free(0 2 4 ~ 4 2 0 ~ 0 2 4 ~ 7@2 ~ ~)
&bassline over=&key step=4n 0 3 4 0

&lead s=tri loop=C4 env=&(map=adsr .01 .2 .4 .15)
&bass s=sine loop=C2 env=&(map=adsr .01 .3 .6 .2)
&out map=sample postgain=2.51 [&riff * &lead * .5, &bassline * &bass * .6]
\`\`\`
`,pop:`---
title: "Pop song: four chords, arranged"
tags: [genre:electronic, diatonic, harmony, arrangement]
description: "I – V – vi – IV, arranged by a selector: intro, verses, choruses, a break, an outro, an end."
---

\`\`\`cells
* from style=&synthPop
&vibrato from vibrato
&strike, &thump, &snap, &click from envelopes
# The four chords: I – V – vi – IV, a bar each, in C. Written as scale degrees
# over the major scale, each chord comes out the right kind: C, G, Am, F.
# Arranged: each part is a section stepped by the bar, and &song switches the sections,
# four bars a step — intro, verses, choruses, a break, an outro and an end.
&bar from bar &tempo
&tempo step=free(100bpm, 70..140)
&major scan(2 2 1 2 2 2 1)
&chords tags="keys" over=&major step=&keysBar*2 [0,2,4]!8 [4,6,8]!8 [5,7,9]!8 [3,5,7]!8
&roots tags="bass" over=&major step=&bassBar*2 0!8 4!8 5!8 3!8

&hook tags="hook" 4 4 5 4                                             # the hook …
&tune tags="hook" over=&major step=&hookBar*2 &hook 2@2 0@2 &hook 2@2 ~@2 &hook^1 4@2 2@2 3 3 2 1 0@4           # … a step up in bar 3

&beat tags="drums" step=&beatBar &bd &sd &bd &sd
&hats tags="drums" step=&hatsBar*2 &hh:0:.5 &hh:0:.25 &hh:0:.5 &hh:0:.25 &hh:0:.5 &hh:0:.25 &hh:0:.5 &hh:0:.3

&lead tags="hook" s=square loop=C5 lpf=3000 env=&(map=adsr .01 .2 .6 .2) pitch=&vibrato
&keys tags="keys" s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
&bass tags="bass" s=square loop=C2 lpf=500 env=&strike
&bd note=36 tags="drums" gain=.8 s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .04 0 0) env=&thump
&sd seed=0 note=38 tags="drums" gain=.4 s=white hpf=1200 env=&snap
&hh seed=1 note=42 tags="drums" gain=.2 s=white hpf=8000 env=&click

&final tags="keys" over=&major step=&endBar [0,2,4,7]@4                  # the last chord: C

# the sections the song switches: four bars a step — a section
# picked starts from its top; a chord of sections plays them together; laps=1: it ends
&sections step=4n &bassBar &keysBar &hookBar &hatsBar &beatBar &endBar
&song over=&sections step=1m/4 laps=1 label="intro · verse · verse · chorus · chorus · break · chorus · chorus · outro · end" [1,3] [0,1,3,4]!2 [0,1,2,3,4]!2 [1,2] [0,1,2,3,4]!2 [1] 5

&out postgain=2.31 map=sample [&hats,
                         &beat,
                         &roots * &bass * .5,
                         &chords * &keys * .15,
                         &tune * &lead * .35,
                         &final * &keys * .2]
\`\`\`
`,prelude:`---
title: "Bach, Prelude in C: for Wendy"
tags: [genre:classical, genre:electronic, artist:Bach, artist:Wendy Carlos, tonal]
description: Bach's Prelude in C (bars 1–19) as one figure reading a table of chords, on an old-school synthesizer.
---

J. S. Bach, Prelude in C major (Well-Tempered Clavier I), bars 1–19, on an old-school synthesizer, in homage to Wendy Carlos. The whole prelude is one figure reading a braid of chords, one a bar, five notes each.

\`\`\`cells
&bar from bar &tempo
&tempo step=free(66bpm, 40..100)
&chords step=1m [0,4,7,12,16] [0,2,9,14,17] [-1,2,7,14,17] [0,4,7,12,16] [0,4,9,16,21] [0,2,6,9,14] [-1,2,7,14,19] [-1,0,4,7,12] [-3,0,4,7,12] [-10,-3,2,6,12] [
        -5,-1,2,7,11] [-5,-2,4,7,13] [-7,-3,2,9,14] [-7,-4,2,5,11] [-8,-5,0,7,12] [-8,-7,-3,0,5] [-10,-7,-3,0,5] [-17,-10,-5,-1,5] [-12,-8,-5,0,4]
&figure over=&chords step=16n 0 1 2 3 4 2 3 4         # the figure: twice a bar, in sixteenths

&saw s=saw loop=C4 lpf=1600 lpq=7 env=&(map=adsr .002 .3 .4 .25)    # a resonant sawtooth …
&sub s=square loop=C3 lpf=900 env=&(map=adsr .002 .3 .4 .25)       # … and a square an octave down
&moog [&saw, &sub * .35]

&mix postgain=2.99 map=sample [&figure * &moog * .5]
\`\`\`
`,radio:`---
title: "Radio: a style that drifts"
tags: [genre:dance, arrangement, modal]
description: "A score the default band plays, its style drifting by itself: bite wandering over six octaves of rates (the \`wander\` module), within a window a hand sets; syncopation and harmony left to sliders. The band's instruments follow, in sections: a song form gives each section its intensity and its players."
---

A radio station written in cells (#576): a score whose section's style, \`&style\`, moves by itself.
The score is the default band's: it ends in \`* from band(…)\`, passing the band its five parts and its style, and the band's instruments read \`&style\` where they sound, the bass's and the lead's cutoffs and the keys' and the pad's envelopes with bite, from paddy to stabby.

Bite drifts, moved by a cell within a window a hand sets (decision 079): its centre and its reach, \`bite=free(.55, 0..1) ± free(.35, 0..0.5) * &drift\`, the window .2 to .9.
The centre is where the station is tuned; the reach is how far it may wander, decision 076's entropy on this axis.
The drift is the seed's \`wander\` module (\`fragments/modules/\`): six noises an octave apart, from a value drawn each section of eight bars to one drawn every 256 bars (a set of four songs), each ramped to the next, summed (decision 079) with the slowest weighing most, so it moves a little each bar and a lot over an hour, as music's slow fluctuations do, and never leaves its window. It is a bounded wander around where the station is tuned: a host that walks the station itself, as Jambot's radio does, moves the sliders, and this moves the style around them (\`docs/notes/radio-walkers-measured.md\`).
So the band plays the section's style and moves on at the next one: the bass and the lead bite or close, the keys strike or swell.
Syncopation and harmony are left to sliders (\`free(…)\`), for a hand to set, and mood is held at .5, dorian's at a little more tension than its default.

\`\`\`cells
&slidersNote label="The style: syncopation and harmony on sliders, bite wandering around where it is tuned." about=&style
&bar from bar &tempo
&tempo step=104bpm
&key from "diatonic(mode=dorian)" D
&harm over=&key step=1m [0,2,4] [3,5,7]
&kick role=kick step=4n &bd &bd &bd &bd
&drumlines [&kick]
&bassline over=&harm step=8n 0 ~ 0 2 ~ 0 4 ~
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=2n ~ [0,2,4]
&leadline over=&key step=8n 4 ~ 3 2 0@4
&mine map=style sync=free(.3, 0..1) harm=free(.45, 0..1) bite=free(.55, 0..1) ± free(.35, 0..0.5) * &drift mood=.5
&section step=1m/8 0
&drift from wander(clock=&section)
&style style=&mine
\`\`\`

The module's weights are the drift's spectrum: how much it moves at each rate (\`docs/notes/571-style-at-every-scale.md\`). The sliders lean it: a hand moves the window, and the radio wanders inside it.

## In sections

A station plays songs, not one loop: the radio plays the song form its style finds, \`verse_chorus\` near Synth-pop (#810, \`npm run coverage -- --facet song\`), eight bars a section, 64 bars a song.
The form gives the intensity and who plays, section by section, each section a kind taken by name (\`fragments/sections/\`): \`&verseChorus\`, the song's level, \`&songLevel\` at .55, plus each kind's offset (decision 096), and \`&verseChorusPlays\`, the band's entries.
The score splices them a section a step (decision 097) into \`&intensity\`, which the band's drums, bass and stabs play at, and into its selector over the band, \`&form\`: the intro without the lead, the verses without the stabs, the choruses louder, the outro falling away into the next song's intro.
So each section is two things at once, as #571 measured: where the style has drifted to, and how hard and by whom it is played.

\`\`\`cells
&songLevel .55
&verseChorus, &verseChorusPlays from verse_chorus &songLevel
&intensity step=1m/8 &verseChorus
&form over=&band step=1m/8 &verseChorusPlays
* from band(drumlines=&drumlines, bassline=&bassline, padline=&padline, stabline=&stabline, leadline=&leadline, style=&style, intensity=&intensity)
\`\`\`
`,resonanz:`---
title: "Baustelle II: Resonanz"
tags: [genre:experimental, genre:electronic, genre:industrial, artist:Neubauten, sound, physics, tape]
description: "The building site again, now the metal itself rings: struck plate, beam, wire and spring, and pipes driven by a tape of the site."
---

\`\`\`cells
&strikeNote label="A plate is hammered where the pattern says, a beam struck, a low wire plucked, a spring kicked on the accents." about=(&hammer &plate &beam &girder &pluck &wire &kick &spring)
&siteTapeNote label="A tape loop records the site, and its heads drive two pipes — the site resonating with itself." about=(&tape &pipeA &pipeB)
&touchNote label="Tap the metal to strike it, hold to damp, drag across it to bow." about=(&plate &girder &spring &wire)
# Baustelle II: Resonanz — resonators (body=) struck by notes: a note's value is where (0 … 7).
# &site goes onto a tape (write=); its heads, mixed into &echo, drive the pipes (excite=) —
# sound into bodies. The pipes aren't recorded: no loop through the tape and back.
&bar from bar &tempo
&tempo step=104bpm
&reel step=104bpm motor=1.4 mass=1 friction=.1 wow=.02 0
&hammer step=8n label="the hammer: where on the plate" 1 ~ 5 ~ ~ 3 7 ~ 1 ~ ~ 6 ~ 2 ~ 4
&beam step=4n label="the beam" 4 ~ ~ 0 ~ 4 ~ ~
&kick seed=3342005430301331 step=2n label="the spring, kicked" 3 ~ ~ 3?
&pluck step=4n label="the wire" 2 ~ 2 2 ~ ~ 6 ~
&plate body=plate loop=D3 ring=3 hard=.85 board=none 0
&girder body=bar loop=G2 ring=2.5 hard=.9 board=none 0
&spring body=spring loop=100 ring=2.5 hard=.7 board=none 0
&wire body=wire loop=D1 ring=3 hard=.6 board=none 0
&site [&hammer * &plate * .35, &beam * &girder * .4, &kick * &spring * .3, &pluck * &wire * .4]

&tape step=&reel write=&site length=5 erase=.3 tone=2400 drive=.4 hiss=.008 label="the tape: five seconds of the site"
&h1 play=&tape at=1.15 label="head 1"
&h2 play=&tape at=2.3 wander=.05 wanderhz=.11 label="head 2, wandering"
&echo [&h1 * .5, &h2 * .5]
&pipeA body=pipe loop=D2 ring=4 board=none excite=&echo label="a pipe, driven by the tape" 0
&pipeB body=pipe loop=A2 ring=4 board=none excite=&echo label="another" 0

&out postgain=.355 map=sample [&site, &pipeA * .4, &h1 * .2] [&site, &pipeB * .4, &h2 * .2]
\`\`\`
`,rests:`---
title: "Rests, holds and repeats: a rhythm on one note"
tags: [tutorial, rhythm]
tier: 1
description: "One note, played as a rhythm: some steps rest, some are held, some are played twice."
---

\`\`\`cells
&restsNote label="~ is a rest, @2 holds a step for two, _ holds the one before it a step longer (0 _ _ is 0@3), !2 plays it twice. step=4 moves four steps a second." about=&rhythm

&rhythm step=4 0 ~ 0 ~ 0!2 ~ 0@2 ~ ~ 0 0 ~ 0 _ _   # one note, in time
&voice s=tri loop=C3
&out map=sample postgain=3.48 [&rhythm * &voice * .5]
\`\`\`
`,rhythm:`---
title: "Meter and rhythm: the tresillo"
tags: [tutorial, genre:world, rhythm]
tier: 4
description: The tresillo over a meter of its own, with hats, triplets and chords on the beat.
---

\`\`\`cells
&thump, &click from envelopes
# A meter is a scan: the intervals between its beats, adding up to the bar.
# scan(27 23 26 24): beats at 0 27 50 76 % — the first long, the third leaning.
&bar scan(27 23 26 24) step=100bpm             # 4/4, bent
&tresillo label="tresillo: **x..x..x.**" scan(3 3 2) step=2t                # x..x..x. — three strokes a bar: its lap (8) is the bar

# volumes (map=amp) as gates: their steps start the notes, their values set the level
&kick map=amp step=&tresillo:pulse 1
&hats map=amp step=8n 1 .3 .6 .3                    # eighths, accented on the beat
&shake label="triplets: three against two" map=amp step=4t .5 .2 .2                     # triplets: three per two beats
&chord label="chords: {notes}" over=scale(minor) step=2n [0,2,4] [-2,0,2]

# each voice with its envelope (env=, map=adsr: attack decay sustain release)
&bd s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&thump
&hh s=white hpf=7000 env=&click
&sh s=white hpf=4000 env=&click
&keys s=saw loop=C4 lpf=900 env=&(map=adsr .02 .4 .3 .3)
&mix postgain=2.86 map=sample [&kick * &bd, &hats * &hh * 0.4, &shake * &sh * 0.3, &chord * &keys * 0.5]
\`\`\`
`,ricercar:`---
title: "Ricercar: a study in counterpoint"
tags: [genre:classical, artist:Bach, tonal, counterpoint, stereo]
description: A study in counterpoint on the King's theme, from strict to free, in six passes.
---

\`\`\`cells
&vibrato from vibrato
&passesNote label="A pass each: 1 the theme alone · 2 note against note, above · 3 note against note, below · 4 two against one · 5 four against one · 6 free, in three voices." about=(&upper &lower)
&consonanceNote label="On every note of the theme the voices agree (consonances only); between, a dissonance only passes, by step." about=(&theme &upper &lower)

&bar scan(27 23 26 24) step=&tempo laps=30                       # thirty bars: six passes of the theme, then it ends
&tempo step=free(66bpm, 40..96)
&theme over=&scale step=4n label="the King's theme" 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2
&scale over=&key scan(2 1 2 2 1 2 2)                   # … read in C minor,
&key step=cycle(&theme) stride=free(0, 0..7) label="per tonos · in **{tonic}**"   # raise stride: a key higher each pass

# the counterpoints, in semitones over the key (they transpose with the theme), in eighths
&first over=&key label="1 : 1 above — *first species*" 24@4 22@4 19@4 17@4 20@4 ~@2 19@2 20@2 22@2 24@2 20@2 22@4 ~@4
&under over=&key label="1 : 1 below — the bass" -12@4 -13@4 -12@4 -19@4 -17@4 ~@2 -19@2 -16@2 -17@2 -15@2 -13@2 -12@4 ~@4
&second over=&key label="2 : 1 — *second species*" 19@2 17@2 19@2 20@2 19@2 17@2 15@2 17@2 19@2 21@2 ~@2 19@2 20@2 19@2 21@2 17@2 15@2 14@2 ~@4
&third over=&key label="4 : 1 — *third species*" 19 17 19 20 19 17 19 21 19 20 19 21 23 21 22 24 23 21 22 20 ~@2 19 21 23 21 19 17 21 24 23 21 22 20 22 19 ~@4
&florid over=&key label="free, over the bass" 19 17 19 20 19 17 19 20 19 21 22 24 17 20 22 24 23 24 26 23 ~@2 21 24 23 21 19 22 24 22 20 22 24 22 20 19 ~@4

&upper step=8n ~@40 &first ~@40 &second &third &florid        # a pass each: alone · above · (below) · 2:1 · 4:1 · free
&lower step=8n ~@80 &under ~@80 &under                         # the bass: in pass 3, and again under the free line

&organ loop=C4 map=lin 0 1 env=&(map=adsr .03 .25 .7 .6)        # one pipe, one breath: the theme
&flute pan=.28 s=sine loop=C4 env=&(map=adsr .03 .1 .8 .2) pitch=&vibrato
&bourdon pan=.7 s=tri loop=C4 lpf=900 env=&(map=adsr .02 .15 .8 .3)

&out postgain=2.2 map=sample [&theme * &organ * .5, &upper * &flute * .45, &lower * &bourdon * .5]
\`\`\`
`,royal:`---
title: "Royal theme: all keys and modes"
tags: [genre:classical, artist:Bach, modal, chromatic, harmony]
description: Bach's royal theme through every key in fifths, then every mode.
---

\`\`\`cells
&vibrato from vibrato
# Bach's royal theme. Every pass of &theme moves &key a fifth (C G D A …);
# every full circle of &key (12 passes) moves &scale one degree.
&bar scan(27 23 26 24) step=&tempo                             # the clock: 4/4, bent * . + .
&tempo step=free(84bpm, 60..120)
&key step=cycle(&theme) stride=7            # the 12, a fifth per pass, round the circle
&scale over=&key scan(2 1 2 2 1 2 2) step=cycle(&key)           # Aeolian, a degree per circle, all seven

&theme over=&scale step=4n 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2
&pedal over=&scale step=2n 0                  # one note every two beats

# voices: loop= is pitch 0 (turns per second); sound in dough notation
&lead s=saw loop=C4 lpf=2200 lpq=2 room=.3 env=&(map=adsr .01 .3 .4 .4) pitch=&vibrato
&bass s=tri loop=C2 env=&(map=adsr .01 .5 .5 .3)

&mix postgain=2.51 map=sample [&theme * &lead * 0.6, &pedal * &bass * 0.7]                          # the sound card: two channels, the same mix
\`\`\`
`,sailor:`---
title: "Drunken Sailor: D Dorian, with a kit"
tags: [genre:world, genre:folk, modal, rhythm]
description: Drunken Sailor in D Dorian, with a fiddle, a bass and a drum kit.
---

\`\`\`cells
* from style=&seaShanty
# D Dorian. The second line is the first, a step lower: &A^-1.
&bar from bar &tempo
&tempo step=free(112bpm, 90..140)
&key from diatonic(mode=dorian) D

&m1 4!4
&m2 4 4 0 2
&m3 3 2 0 0
&m4 0@2!2
&A &m1 &m2
&C &m3 &m4
&tune over=&key step=8n &A &A^-1 &A &C

&bassline over=&key step=4n 4!4 3!4
&drums step=8n &bd &hh &sd &hh!4           # kick, hat, snare, hat

&fiddle s=saw loop=C5 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
&bass s=square loop=C2 lpf=600 env=&thump
&bd note=36 s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&thump
&sd from gm_kit
&thump, &click from envelopes
&hh seed=0 note=42 s=white hpf=7000 env=&click
&mix postgain=2.03 map=sample [&tune * &fiddle * 0.6, &bassline * &bass * 0.8, &drums * 0.6]
\`\`\`
`,semitones:`---
title: "Semitones: a scale up and down"
tags: [tutorial, diatonic]
tier: 1
description: "A number is a note: so many semitones above the voice's own. Up the C major scale and back."
---

\`\`\`cells
&semitonesNote label="0 is the voice's note, 1 a semitone above it, 12 an octave; a minus goes below. The scale skips the semitones between E and F and between B and C." about=&climb

&climb step=6 0 2 4 5 7 9 11 12 11 9 7 5 4 2 0 -5 0@2   # the scale, then the fifth below C and home
&voice s=sine loop=C4
&out map=sample postgain=2.42 [&climb * &voice * .5]
\`\`\`
`,song:`---
title: A song in sections
tags: [genre:electronic, arrangement, harmony, diatonic]
description: "A verse–chorus song the default band plays: its sections from a song form found by style, each section's intensity and who plays from its kind, and a tune a section."
---

A song in sections (#810): a score the default band plays, arranged by a song form from the seed library rather than by hand.
Its parts are one bar each, looping; what changes from section to section is how hard the band plays, who plays, and which tune the lead sings.

## The parts

Four chords, I – V – vi – IV in C, a bar each; a four-on-the-floor kick with a backbeat and eighth hats; a bass on the roots with a push into the next bar; a pad holding each chord and stabs on the off-beats.

\`\`\`cells
&bar from bar &tempo
&tempo step=112bpm
&key from "diatonic(mode=ionian)" C
&harm over=&key step=1m [0,2,4] [4,6,8] [5,7,9] [3,5,7]
&kick role=kick step=4n &bd &bd &bd &bd
&backbeat role=backbeat step=4n ~ &sd ~ &sd
&hat role=hat step=8n &hh!8
&drumlines [&kick, &backbeat, &hat]
&bassline over=&harm step=8n 0 ~ 0 ~ 0 2 ~ 4
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=4n ~ [0,1,2] ~ [0,1,2]
\`\`\`

## Three tunes, a section each

The lead has three tunes, each two bars long and looping while it is on: the verse's, the chorus's, which climbs to the octave, and the bridge's, which falls.
Each is stepped by a section of its own (\`&verseBar\`, \`&chorusBar\`, \`&bridgeBar\`, decision 016), and \`&sings\` says which tune each section of the song sings: none in the intro and the outro, where the lead rests anyway.
How a kind plays (its tune here) is the composer's, so it is written in the score, not in the section kinds.

\`\`\`cells
&tunes step=4n &verseBar &chorusBar &bridgeBar
&verseTune over=&key step=&verseBar*2 0 1 2 ~ 2 1 0 ~ 4 ~ 2 ~ 1 ~ ~ ~
&chorusTune over=&key step=&chorusBar*2 4 4 5 4 ~ 2 4 ~ 7 ~ 5 4 2 ~ ~ ~
&bridgeTune over=&key step=&bridgeBar*2 5 ~ 4 ~ 3 ~ 2 ~ 1 ~ 2 ~ 4@4
&leadline [&verseTune, &chorusTune, &bridgeTune]
&sings over=&tunes step=1m/8 ~ 0 1 0 1 2 1 ~
\`\`\`

## The song form

\`verse_chorus\` is the song form Synth-pop's style finds (\`npm run coverage -- --facet song\`): an intro, verse, chorus, verse, chorus, a bridge, the chorus again and an outro, eight bars each, 64 bars, then round again.
It gives two lines a section a step, each section a kind taken by name (\`fragments/sections/\`):
- \`&verseChorus\`, the song's intensity, \`&song\` at .55, plus each kind's offset (decision 096): an intro .25, a verse .45, a chorus .7, a bridge .45, an outro falling from .55 to .1;
- \`&verseChorusPlays\`, who plays: everyone in a chorus and the bridge, no stab in a verse, no lead in the intro and the outro.

The score splices them (decision 097) into its \`&intensity\`, which the band's drums, bass and stabs play at, and into its selector over the band, \`&form\`.

\`\`\`cells
&song .55
&verseChorus, &verseChorusPlays from verse_chorus &song
&intensity step=1m/8 &verseChorus
&form over=&band step=1m/8 &verseChorusPlays
&style style=&(map=style sync=.3 harm=.45 bite=.55 mood=.5)
\`\`\`

## The band

The score ends in \`* from band(…)\`, passing its parts, its style and its intensity (decision 063, \`bandLine\`): who plays them, on what, and where they go out is the band's.

\`\`\`cells
* from band(drumlines=&drumlines, bassline=&bassline, padline=&padline, stabline=&stabline, leadline=&leadline, style=&style, intensity=&intensity)
\`\`\`

So the chorus comes back as it was each time, louder than the verse with the stabs in; the bridge drops back to a verse's level with everyone playing; and the outro thins and fades into the intro of the next time round.
`,soundtape:`---
title: Sound on Tape
tags: [genre:experimental, genre:electronic, genre:ambient, sound, tape]
description: "Sound, on a tape loop: a plucked tune and a soft pad go to the speakers and onto a wowing reel of tape."
---

\`\`\`cells
&lengthNote label="The tape holds 4 seconds; every lap it comes round darker and warmer, a little hiss under it." about=&tape
&headsNote label="Three heads play the tape back, left, right and between." about=(&left &right &far)
&reelNote label="Hold the reel: the whole tape bends down." about=&reel
# Sound on Tape — &tape records a mix (write=&dry): sound, not notes. Its loop (length=) feeds
# back into itself, keeping 1 − erase each lap, through its loss (tone=, Hz) and saturation
# (drive=), with a little hiss=. The read heads are readers; in a mix they return to the speakers.
# The tape moves with &reel: when the reel slows, the heads' delays stretch and the pitch drops.
&reel step=72bpm motor=1.2 mass=1 friction=.05 wow=.02 0
&bar from bar &tempo
&tempo step=72bpm
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&tune over=&minor step=8n label="the tune" 0 ~ 7 ~!2 4 ~!2 2 ~!7 9 ~ 7 ~ 4 ~!3 2 ~ 0 ~!5
&pad part=pad over=&minor step=1m/2 label="the pad" [0,2,4] [-2,0,2]
&pluck s=tri loop=D4 lpf=2600 env=&(map=adsr .003 .5 0 .4)
&soft s=saw loop=D3 lpf=700 env=&(map=adsr 1.5 1 .8 3)
&dry [&tune * &pluck * .25, &pad * &soft * .05]
&tape step=&reel write=&dry length=4 erase=.35 tone=3200 drive=.35 hiss=.006 label="the tape: 4 s"
&left play=&tape at=.75 label="head 1"
&right play=&tape at=1.5 label="head 2"
&far play=&tape at=2.75 label="head 3"

&out postgain=12.6 map=sample [&dry, &left * .5, &far * .35] [&dry, &right * .5, &far * .35]
\`\`\`
`,spooky:`---
title: Spooky, in pieces
tags: [genre:electronic, harmony, rhythm, arrangement, motifs]
description: "A heartbeat in 5/4, a bass that creeps, an organ's i–♭VI–iv–V in D harmonic minor, a celesta, and a theremin singing the Dies irae: the band, the tune and its form are the seed library's."
---

Halloween music counts in fives, so the beat never settles; its key is a minor with a raised seventh, and its tune is a chant of the day of wrath.
Here the band comes from the seed library, taken by name, and so does the tune: the drummer and its kit, the key, a four-bar cadence, a bass line, the bass, pad, stab and lead players, and the beat, the bass and the tune Spooky gave the library (\`spooky_drums\`, \`creeping_bass\`, \`dark_cadence\`, \`diesIrae\`).
The piece writes only what is its own: the tempo, the key's tonic, the stabs, who plays when, and the sound of each instrument.

\`\`\`cells
* from style=&spooky
&drums, &drumsOut from drums_performer &drumlines
&key from harmonic_minor D
&harm from dark_cadence &key
&bassline from creeping_bass &harm
&kick, &hat, &euclid from spooky_drums
&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV) &bassline
&pad, &padOut from pad_performer(padLevel=&padLevel, padV=&padV) &padline
&stab, &stabOut from stab_performer(stabLevel=&stabLevel, keysV=&keysV) &stabline
&leadOut from lead_performer(leadLevel=&leadLevel, leadV=&leadV) &leadline
&useNote label="The band is the library's: each use names what it takes. &bassV, &padV, &keysV and &leadV are the players' instruments, named so the piece can give each a sound of its own." about=(&bassV &padV &keysV &leadV)
\`\`\`

The meter is the library's, \`5/4\`, five beats to the bar, which leaves its tempo to the piece (\`&tempo\`), a slider.
The key is harmonic minor, from the library, on the tonic its line gives it, D (\`&key from harmonic_minor D\`, decision 065): its fifth is then A major, a dominant, and its sixth B♭ sits a semitone above it.

\`\`\`cells
&bar from bar(meter="5/4") &tempo
&tempo step=free(100bpm, 80..120)
&fiveNote label="Five beats a bar: every line taps the meter, so the heart beats five times and the knock falls at the middle of the bar, between the third beat's strokes." about=&bar
\`\`\`

## The beat

\`spooky_drums\`, used above: a heartbeat on every beat, its second stroke a sixteenth late and softer, the ride ticking each beat like a clock, the rim knocking once, at the middle of the bar.
The piece takes its three limbs by name and hands them to the drummer as a stack, \`&drumlines\`, the heart under a level of the form's.

\`\`\`cells
&drumlines [&kick * &heartForm, &hat, &euclid * .25]
&beatNote label="The beat is a fragment: &kick, &hat and &euclid come from Spooky drums." about=(&kick &hat &euclid)
\`\`\`

## The chords, the bass and the stabs

\`dark_cadence\`, used above, is the harmony: D minor, B♭ major, G minor and A major, a bar each.
The organ holds each chord a bar (\`&padline\`); \`creeping_bass\` holds each root two beats, then creeps a semitone up and back, four beats long against the bar's five, so the creep comes a beat later each time round.
The celesta plays the stab player's part, the piece's own: a chord on the and of one and on four, a music box in another room.

\`\`\`cells
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=8n ~ [0,1,2] ~ ~ ~ ~ [0,1,2] ~ ~ ~
&creepNote label="The bass is four beats long in a bar of five: its creep comes a beat later each bar." about=&bassline
\`\`\`

## The tune: the Dies irae

The tune is the motif \`diesIrae\`, the chant's head: F E F D E C♯ D, in eighths.
The theremin sings it over D minor, rests over B♭, sings it again three degrees up over G minor, and rests over A: one call a chord, two chords a phrase.

\`\`\`cells
&diesIrae from diesIrae &key
&leadline step=8n &diesIrae ~@2 ~@10 &diesIrae^3 ~@2 ~@10
&tuneNote label="The Dies irae, over D minor, then three degrees up over G minor." about=&leadline
\`\`\`

## The form, in levels

Sixteen bars, four times round the cadence: the heart and the knock alone; then the organ and the bass, and the theremin; then the celesta joins; the heart drops out for the last lap and comes back on the last bar.
Each player's level is a hole its fragment leaves; here it is the form.

\`\`\`cells
&heartForm map=amp step=1m 1!12 0!3 1
&padLevel map=amp step=1m 0!4 .5!12
&bassLevel map=amp step=1m 0!4 .8!12
&stabLevel map=amp step=1m 0!8 .5!8
&leadLevel map=amp step=1m 0!4 .6!12
&formNote label="The form: the heart (4 bars), the band and the theremin (4), the celesta (4), the last lap without the heart (4)." about=(&heartForm &padLevel &bassLevel &stabLevel &leadLevel)
\`\`\`

## The sound

The instruments the players play are voices with no sound of their own: the piece gives each one.
A round bass, an organ, a celesta an octave and more above the stab player's register, and a theremin, a sine with a slow attack and a wide, slow vibrato; and the wind, brown noise swelling once every four bars.

\`\`\`cells
&bassV s=tri loop=C3 lpf=500 env=&(map=adsr .01 .3 .6 .2)
&padV from organ
&keysV s=sine loop=C5 env=&(map=adsr .002 .7 0 .5)
&leadV from theremin
&windline step=1m 0 ~ ~ ~
&howl seed=0 s=brown lpf=700 env=&(map=adsr 2 1 .5 2)

&out map=sample postgain=1.93 [&drumsOut, &bassOut, &padOut * .25, &stabOut * .3, &leadOut * .5, &windline * &howl * .1]
\`\`\`
`,steps:`---
title: "Steps: a tune on one line"
tags: [tutorial, genre:folk]
tier: 1
description: "Frère Jacques written as steps: numbers, rests, holds and repeats, four steps a second."
---

\`\`\`cells
&stepsNote label="A number is a step: so many semitones above the voice's note. ~ is a rest, @2 holds a step for two, !2 plays it twice." about=&tune
&outNote label="The sound card: map=sample turns what it plays into samples, at the rate the computer plays them (loop=SAMPLE_RATE). One chord in its brackets: one channel, mono." about=&out
# &tune moves at step=4: four steps a second. Its numbers are semitones above the voice's C.
&tune step=4 0 2 4 0 0 2 4 0 4 5 7@2 4 5 7@2 7 9 7 5 4 ~ 0 ~ 7 9 7 5 4 ~ 0 ~ 0!2 -5 0@2 0!2 -5 0@2

&voice s=sine loop=C4                           # a voice: a sine, on C4
&out loop=SAMPLE_RATE map=sample postgain=2 [&tune * &voice * .5]
\`\`\`
`,stereo:`---
title: "Stereo: Mary Had a Little Lamb"
tags: [tutorial, genre:world, genre:folk, pentatonic, stereo]
tier: 6
description: "Mary Had a Little Lamb across two channels: the bell on the left, the cello on the right."
---

\`\`\`cells
&glideNote label="glide=.12: the cello bows its line, each note sliding on from the last in .12 s, its envelope once (no new attack). A rest or a chord would end the run." about=&cello
# pan= places a voice between the sound card's two channels: 0 left, .5 the centre (as
# without it), 1 right; the far side fades. .15: the left full, the right at .3.
&bar scan(27 23 26 24) step=&tempo
&tempo step=92bpm
&high label="*Mary had a little lamb*" over=scale(major) step=4n 2 1 0 1 2 2 2@2
&low over=scale(major) step=2n 0 3 4 0

&bell s=sine loop=C5 pan=.15 env=&(map=adsr .01 .6 .2 .6)
&cello glide=.12 s=saw loop=C3 lpf=900 pan=.85 env=&(map=adsr .03 .4 .6 .4)
&out postgain=1.57 map=sample [&high * &bell, &low * &cello]
\`\`\`
`,strudel:`---
title: "Strudel's spelling: laps, slow and euclid"
tags: [tutorial, rhythm]
tier: 4
description: "A tune and a beat in Strudel's own spelling: an alternation, a slowed group, a euclid on a step and a note's length as a share."
---

Strudel's mini-notation is cells' step language (decision 027): a spelling the two share keeps Strudel's meaning, so a pattern written there can be pasted here.
\`<0 2 4>\` is an **alternation**: one of its steps each lap of the cell, in turn. \`[0 2]/2\` is **slow**: the group stretched over two laps, 0 on one and 2 on the next. \`&bd(3,8)\` is a **euclid on a step**: three hits spread as evenly as they go over eight parts of the step, turned right by a third number, as Strudel's \`bd(3,8,2)\`.
\`legato=\` is a line's articulation, Strudel's too: each note sounds its written length times this share, .5 staccato, 1 as written, 1.5 into the next.

\`\`\`cells
&altNote label="<0 2 4> plays one step each lap of the cell, in turn: the first lap 0, the next 2, then 4. <5 [7 9]> alternates a step with a group." about=&tune
&slowNote label="[0 2]/2 spreads its group over two laps: 0 on the first, 2 on the second." about=&tune
&legatoNote label="legato=.5: every note sounds half its written length, a staccato; 1 would be as written." about=&tune
&euclidNote label="&bd(3,8) is three kicks spread over the eight parts of its step; &hh(5,8,2) five hats, turned two to the right." about=&beat
&bar from bar &tempo
&tempo step=free(moderato)

&tune legato=.5 step=4n 0 <2 4 7> [0 2]/2 <5 [7 9]>
&beat step=2n &bd(3,8) &hh(5,8,2)

&bd, &hh from gm_kit
&pluck s=tri loop=C4 env=&(map=adsr .005 .3 .1 .2)
&out map=sample postgain=3 [&tune * &pluck * .3, &beat * .5]
\`\`\`
`,studie:`---
title: "Study after Studie II: 25 steps to 5:1"
tags: [genre:experimental, genre:electronic, artist:Stockhausen, microtonal, tuning, stereo]
description: Sine mixtures on Stockhausen's scale of 25 equal steps to 5:1, with durations from the same series.
---

An original study in the system of Stockhausen's Studie II (1954): sine tones on a scale of 25 equal steps to 5:1 from 100 Hz, not octaves, sounding as tone mixtures, five sines a fixed number of steps apart. The durations come from the same series (\`geo\`: 5^(k/25), k = 0 10 5 20 15), the intensities in decibels. One player goes forward, swelling; the other plays it backwards, eight steps higher, fading.

\`\`\`cells
&time scan(geo(5, 25, 0 10 5 20 15)) step=free(24bpm, 12..48)  # five durations: 5^(k/25)
&dyn map=db step=4n 0 -10 -4 -16 -8                              # their intensities, in decibels
&steps map=ed(25, 5)                                             # 25 steps to 5:1

# the five mixtures: five sines, 1 to 5 steps apart …
&m1 label="mixture: 1 step apart" [0,1,2,3,4]
&m2 label="mixture: 2 steps apart" [0,2,4,6,8]
&m3 label="mixture: 3 steps apart" [0,3,6,9,12]
&m4 label="mixture: 4 steps apart" [0,4,8,12,16]
&m5 label="mixture: 5 steps apart" [0,5,10,15,20]
&mixtures &m1 &m2^$30 &m3^$12 &m4^$50 &m5^$20                       # … each on its step of the scale
&forward over=&steps step=4n &mixtures
&backward over=&steps step=4n &mixtures[::-1]^$8                 # retrograde, eight steps higher

&swell pan=.14 s=sine loop=100 env=&(map=adsr 1.5 .5 .8 1.5)            # 100 Hz: the scale's first tone
&fade pan=.86 s=sine loop=100 env=&(map=adsr .01 1.5 .3 1.5)

&out postgain=11.3 map=sample [&forward * &dyn * &swell * .07, &backward * &fade * .07]
\`\`\`
`,style:`---
title: "Style: a point the voices read"
tags: [tutorial, sound, harmony]
tier: 6
description: "Two styles, one by name and one in order, and the section's style turning between them: the bass bites as the style grows stabby, the lead darkens as its mood does."
---

A style is a point: where the accents fall (\`sync\`), how the harmony moves (\`harm\`), how notes start and end (\`bite\`, paddy to stabby) and the mood (\`mood\`, darker to brighter).
A \`map=style\` cell writes one, its axes by name (in order, \`.3 .3 .9 .2\`, reads the same); it doesn't sound, a voice reads it.
\`&style\` is the section's style, and a voice reads one of its axes by name, \`&style[bite]\`, as a factor of a moving parameter.
The tune turns the minor scale's i, VI, III and VII, a bar each, and the bass plays their roots.

\`\`\`cells
&bar from bar &tempo
&strike from envelopes
&tempo step=free(112bpm, 90..140)
&calm map=style sync=.1 harm=.3 bite=.1 mood=.9 label="Calm: on the beat, paddy, bright"
&tense map=style sync=.3 harm=.3 bite=.9 mood=.2 label="Tense: stabby and dark"
&style style=&calm..&tense * &turn
&turn map=lin step=1m 0 .25 .5 .75 1 .75 .5 .25
&styleNote label="&style turns between the two styles as &turn says, and &style[bite] and &style[mood] read one axis each: the bass's cutoff opens as the style grows stabby, the lead's closes as its mood darkens." about=(&bassV &leadV)
&levelNote label="A cell that is one number plays as the number: &leadLevel is the lead's level in the mix. &bassLevel is a sum of values, [&leadLevel + .1]: the bass sits a little above the lead, whatever the lead's level is." about=(&leadLevel &bassLevel)
&key scan(2 1 2 2 1 2 2)
&tune over=&key step=8n 4 ~ 2 4 7 4 2 0
&root over=&key step=1m 0 5 2 6
&bassV s=saw loop=A1 lpf=250..1600 * &style[bite] lpq=6 env=&strike
&leadV s=tri loop=A3 lpf=500..4000 * &style[mood] env=&(map=adsr .01 .2 .6 .2)
&leadLevel .4
&bassLevel [&leadLevel + .1]
&out map=sample postgain=2 [&tune * &leadV * &leadLevel, &root * &bassV * &bassLevel]
\`\`\`
`,swing:`---
title: "Swing: the long and the short"
tags: [tutorial, rhythm]
tier: 4
description: "A jazz swing in F: the meter leans its eighths, a slider from straight to hard, and every line that taps it swings."
---

Swing is the meter's: \`swing=8n:2/3\` leans one level of it, the eighths, and every line that taps the meter plays through it.
Of each pair of eighths the second starts a share of the way through their beat: 1/2 is straight, 2/3 the triplet swing, 3/4 hard.
The beats never move, nor the bar line: only the second eighth of each beat does.
The share here is a slider, 2/3 to start: in the Groove MIDI Dataset (#19, [the measurements](../docs/notes/groove-measure.md)), the jazz drummers who swing their eighths do so at .59 to .71, a median of .65, mostly a little short of the triplet.

\`\`\`cells
&swingNote label="swing=8n: the eighths lean. Of each pair, the second starts this share of the way through the beat: 1/2 straight, 2/3 the triplet swing, 3/4 hard. Jazz drummers swing theirs at .59 to .71, a median of .65 (Groove, #19)." about=&swing
&bar swing=&swing from bar &tempo
&tempo step=free(160bpm, 100..240)
&swing swing=8n:free(2/3, 1/2..3/4)
\`\`\`

## The band

The drums are the library's, Jambot's Swing jazz bar (\`swing_jazz_drums\`): the ride's ding, ding-a ding, ding-a, the pedal hat on two and four, a kick on one, the snare on four with a little fill.
The bass is the library's walking bass (\`walking_bass\`), a note on every beat, over a ii–V–I in F: G minor, C seventh, two bars of F, each chord with its seventh.
Both tap the meter, so both swing; neither writes a swing of its own.

\`\`\`cells
&kick, &backbeat, &fill, &ghost, &hat, &pedal, &groove from swing_jazz_drums
&key from diatonic F
&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]!2
&bassline from walking_bass &harm
&rideNote label="The ride's ding-a: its a is the second eighth of beat four, tapped as a sixteenth (step=16n). A sixteenth is even within its eighth, so it falls where the swung eighth does: it leans." about=&hat
&beatNote label="The walk is on the beats, step=4n: the beats never move, however hard the swing. Nor does the pedal hat on two and four." about=(&bassline &pedal)
\`\`\`

## What leans, and what doesn't

The piano comps on the swung eighths: a shell of the chord, its third and its seventh, on the and of two and on four.
The head is in quarters, a pair of eighths in a beat as \`[a b]\` and a triplet as \`[a b c]\`: the pair leans, the triplet stays in its beat, even, since a triplet divides the beat and not the eighth.

\`\`\`cells
&comp over=&harm step=8n ~ ~ ~ [1,3] ~ ~ [1,3] ~
&head over=&key step=4n ~ [1 3] 5 [4 3] [2 3] 4 [6 4 3] 1 2@2 ~ [0 2] 4 [3 2 1] 0@2
&compNote label="The and of two is a second eighth: it leans late with the swing. Four is a beat: it stays." about=&comp
&headNote label="[1 3] is a pair of eighths in a beat: the second leans. [6 4 3] is a triplet in a beat: three even thirds, whatever the swing." about=&head
\`\`\`

## The sound

\`\`\`cells
&bassV from upright_bass
&keys s=sine loop=C4 env=&(map=adsr .005 .3 .2 .2)
&horn s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
&out map=sample postgain=2.13 [&groove, &bassline * &bassV * .6, &comp * &keys * .3, &head * &horn * .4]
\`\`\`

Swing a level finer and it is funk's: [Funk: the sixteenths lean](funk.md) leans the sixteenths, lightly, and leaves the eighths straight.
`,sympathy:`---
title: "Sympathy: resonators that answer"
tags: [tutorial, sound, physics]
tier: 7
description: A struck fork sets its twin singing, and a harp's strings answer a flute they are never plucked by.
---

\`\`\`cells
&coupleNote label="couple=&forkB: the two forks share a table, and coupling= says how strongly; only &forkA is struck." about=(&forkA &forkB)
&exciteNote label="excite=&played: the flute's sound drives the strings, which ring where it meets their notes." about=&strings
&bar from bar &tempo
&tempo step=72bpm
&key from diatonic(mode=minor) &tonic
&tonic A

&hits step=1m/2 0
&tune over=&key step=4n 4 ~ 2 ~ 0@2 ~@2 2 4 7 ~ 4@4

&forkA body=fork loop=A4 ring=8 hard=.35 board=none couple=&forkB coupling=.08 0
&forkB body=fork loop=A4 ring=8 hard=.35 board=none 0
&flute s=tri loop=A4 env=&(map=adsr .05 .3 .6 .4)
&played [&tune * &flute * .2]
&strings body=wire loop=A2 ring=4 board=none excite=&played 0 7 12 19

&out map=sample postgain=.422 [&hits * &forkA * .4, &forkB * .4, &played, &strings * .3]
\`\`\`
`,tape:`---
title: Tape Machine
tags: [genre:electronic, genre:ambient, sound, stereo, tape]
description: "A tape loop on a machine that turns: it spins up from rest, the pitch gliding up with it, and wows gently."
---

\`\`\`cells
&click, &thump from envelopes
&capstanNote label="Hold the capstan with your finger: a tape stop, the pitch diving; let go and it spins back up." about=&bar
&slackNote label="The hats ride a slack belt, dragging behind." about=&hats
&springEndNote label="At the end the spring gives out and the tape stops for good." about=&bar
# Tape Machine — the meter is the capstan: a motor (spinning up from rest), a little wow (its
# speed swings 0.55 times a second), varispeed=1 (pitch follows speed, as on tape), and a spring
# that holds for 40 s, then gives out: a tape stop. The hats ride a slack belt: they lag, then swing.
&bar meter("4/4") step=&tempo motor=1.4 mass=1 friction=.3 wow=.012 wind=40 varispeed=1
&tempo step=78bpm
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&loop over=&minor step=8n label="the loop" 4 ~ 2 0 ~ 2 4 7@2 ~ 6 4 2 ~ 4@2 -1 ~
&chords over=&minor step=1m label="i · VI" [0,2,4,6] [-2,0,2,4]
&hats step=8n belt=30 mass=1.5 label="the hats, on a slack belt" ~ 0 ~ 0 ~ 0 ~ 0
&kick step=4n 0 ~ 0 ~

&keys pan=.375 s=tri loop=D4 lpf=2200 room=.4 delaytime=&bar*4/3 delay=.3 delayfeedback=.4 env=&(map=adsr .004 .5 .3 .4)
&pad s=saw loop=D3 lpf=700 room=.6 env=&(map=adsr 1 1 .8 2)
&hh seed=0 pan=.6 s=white hpf=7000 env=&click
&bd s=sine loop=D1 pitch=0..16 * &(map=adsr 0 .05 0 0) env=&thump

&out postgain=9.03 map=sample [&loop * &keys * .16, &chords * &pad * .05, &hats * &hh * .1, &kick * &bd * .5]
\`\`\`
`,testtones:`---
title: Test Tones on Tape
tags: [genre:experimental, genre:electronic, genre:ambient, sound, tape]
description: "For the test bench, in the spirit of Hainbach: old sine generators, a beeping oscillator and a noise sweep, all onto worn tape."
---

\`\`\`cells
&generatorNote label="Old sine generators holding drifting tones on a harmonic dial." about=(&drones &dial &drift)
&beepNote label="A beeping test oscillator." about=&beeps
&swellNote label="Swells from a noise sweep." about=&swells
&wornNote label="Seven seconds of worn tape that hardly erases; hiss, print-through, dropouts. Everything piles up into ghosts." about=&loop
&wanderNote label="Three heads, two of them wandering." about=(&first &second &third)
&reelNote label="Hold the reel to bend it all; at the end the motor dies, and the tape stops." about=&reel
# Test Tones on Tape — an original. The tape (&loop) records the bench (&bench, a mix): 7 tape-
# seconds that keep 84% each lap (erase=.16), worn (tone=), driven, hissing, printing through,
# dropping out. Two heads wander (flying heads). The reel is a motor with wow; its spring
# (wind=) gives out after two and a half minutes: the tape stop is the ending. &scope, the test
# bench's oscilloscope, shows what goes on the tape and what two of its heads read back.
&reel step=60bpm motor=1 mass=1.4 friction=.2 wow=.025 wind=150 0
&bar from bar &tempo
&tempo step=60bpm
&dial map=ratios 1 1.5 2 2.25 3 3.75 4.5 6 8 label="the dial: a harmonic series, on 110 Hz"
&drones over=&dial step=1m label="the sine generator: long tones" 0 ~ [1,4] ~ 2 [0,5] ~ 3 ~ [2,6] ~ ~
&drift map=lin loop=.031 0 .08 0 -.11 0
&beeps seed=7036520198142829 over=&dial step=8n label="the test oscillator" 7? ~!3 8?.7 ~!4 6? ~!6
&swells step=1m/2 label="the noise sweep" 0 ~ ~ 0
&sweep map=lin loop=.0625 .05 1 .2 .05

&gen s=sine loop=110 env=&(map=adsr 2 1 .9 3)
&osc s=sine loop=110 env=&(map=adsr .005 .18 0 .1)
&noise seed=0 s=pink lpf=200..3000 * &sweep lpq=8 env=&(map=adsr 3 2 .7 4)
&bench [(&drones + &drift) * &gen * .16, &beeps * &osc * .06, &swells * &noise * .12]

&loop step=&reel write=&bench length=7 erase=.22 tone=1900 drive=.55 hiss=.004 print=.03 printgap=.7 dropout=.25 label="the tape: seven seconds, worn"
&scope scope=split label="the oscilloscope: the bench, the first head, the far one" &bench &first &third
&first play=&loop at=1.1 label="head 1"
&second play=&loop at=2.9 wander=.06 wanderhz=.13 label="head 2, wandering"
&third play=&loop at=5.3 wander=.15 wanderhz=.07 label="head 3, wandering further"

&out postgain=20 map=sample [&bench * .35, &first * .5, &third * .45] [
                                  &bench * .35, &second * .5, &third * .45]
\`\`\`
`,tines:`---
title: Cell Tines
tags: [genre:electronic, diatonic, FM, sound, stereo]
description: "FM, after the DX7: an electric piano, bells and a punchy bass, all made by frequency modulation."
---

\`\`\`cells
&pianoNote label="An electric piano of two pairs: a body at 1:1, a tine at 14:1 that barks on the attack." about=(&body &tine)
&bellNote label="Bells at 3.5:1." about=(&tune &bell)
&bassNote label="A punchy FM bass." about=(&fmbass &low)
&indexNote label="Each brightness is an index under an envelope: bright on the attack, mellowing as it rings." about=(&body &tine &bell &fmbass)
&chordNote label="Fmaj7 · Em7 · Dm7 · Cmaj7." about=&comp
# Cell Tines — frequency modulation: a modulator (a voice with ratio=) swings its carrier's
# frequency (fm=&op) by index × its own frequency. Whole-number ratios sound harmonic
# (pianos, basses), others not (bells). The index moves: index=lo..hi * &envelope.
&bar from bar &tempo
&tempo step=free(84bpm, 60..110)
&major scan(2 2 1 2 2 2 1)
&chord [0,2,4,6]@3 [0,2,4,6] ~@2 [0,2,4,6]@2                    # a seventh chord, in its rhythm
&comp over=&major step=8n label="the piano: Fmaj7 · Em7 · Dm7 · Cmaj7" &chord^3 &chord^2 &chord^1 &chord
&tune over=&major step=8n label="the bells" ~@2 9 11 12@4 ~@2 11 9 8@4 ~@2 7 8 9 8 7 5 4@4 ~@4
&low over=&major step=4n -11 ~ -11 -10 -12 ~ -12 -11 -13 ~ -13 -12 -14 ~ -14 -10

&m1 s=sine ratio=1
&m2 s=sine ratio=14
&m3 s=sine ratio=3.5
&m4 s=sine ratio=1
&body s=sine loop=C4 fm=&m1 index=.3..2.6 * &(map=adsr .002 .9 .3 .6) room=.3 env=&(map=adsr .002 1.6 .35 .8)
&tine pan=.33 s=sine loop=C4 fm=&m2 index=0..2.2 * &(map=adsr .001 .1 0 .1) env=&(map=adsr .001 .45 0 .3)
&bell oneshot=1 pan=.38 s=sine loop=C5 fm=&m3 index=.8..6 * &(map=adsr .001 1.4 .15 1.2) room=.5 delaytime=&bar*4/3 delay=.3 delayfeedback=.35 env=&(map=adsr .002 3 0 2.5)
&fmbass s=sine loop=C2 fm=&m4 index=.6..5 * &(map=adsr .001 .18 .15 .1) env=&(map=adsr .003 .4 .5 .1)

&out postgain=4.47 map=sample [&comp * &body * .055, &comp * &tine * .03, &tune * &bell * .12, &low * &fmbass * .35]
\`\`\`
`,tone:`---
title: "A tone: one note, one voice"
tags: [tutorial, sound]
tier: 1
description: "The smallest piece that sounds: a note every second, played by a sine on A4."
---

\`\`\`cells
&toneNote label="Three cells make a sound. A melody (&note: step=1, a step a second, its 0 the voice's own note), a voice (&voice: a sine, on A4) and the sound card (&out), which plays the melody through the voice." about=(&note &voice &out)

&note step=1 0
&voice s=sine loop=A4
&out map=sample postgain=1.64 [&note * &voice]
\`\`\`
`,transpose:`---
title: "Key and mode: one theme, two wheels"
tags: [tutorial, genre:classical, modal, diatonic, harmony]
tier: 3
description: One theme, read through a mode and a key.
---

\`\`\`cells
&turnNote label="Turn either, and the theme follows." about=(&key &mode)
# The mechanism on its own: a theme read through two wheels.
# Change shift= on &key or &mode — the theme follows.
&bar from bar &tempo
&tempo step=96bpm
&swell from envelopes

&key label="key: **{tonic}**" shift=2 size=1.5                # the 12, turned two: D. Turning it transposes
&mode label="{mode} on {tonic}\\n{notes}" over=&key scan(2 2 1 2 2 2 1) shift=1   # turned one: it walks the modes
&fixed label="fixed for a piece, in one line: {mode} on {tonic}" scale(dorian, E)   # the same seven notes: a key and a mode in one, the tonic its argument
&theme label="the theme: {notes}" show=notes over=&mode step=4n 0 2 4 7 4 2 0@2

&flute s=tri loop=C4 room=.3 env=&swell
&mix postgain=2.11 map=sample [&theme * &flute]
\`\`\`
`,twelve:`---
title: "Twelve-eight: the lean of three"
tags: [genre:blues, rhythm]
description: "A slow blues in 12/8, four beats of three eighths: swing leans nothing here, so a bend leans each three, long, short, short."
---

12/8 is a compound meter: four beats a bar, each a dotted quarter of three eighths, and its bpm counts the beats.
Swing leans pairs, and keeps a group of three even (decision 071): \`swing=8n:2/3\` on 12/8 leans nothing, and says so.
A three leans by a bend instead (decision 080): \`bend=8n:&lean\` gives the eighths the table's numbers as their lengths, in turn, so \`&lean 4 3 3\` plays each three long, short, short, and every beat keeps its length.
Its depth, after a second colon, is a slider: 0 even, 1 as written, 2 the lengths squared (16 : 9 : 9).

\`\`\`cells
* from style=&bluesShuffle
&leanNote label="A lean of three: the eighths of each beat take the lengths 4, 3 and 3, long, short, short; the beats never move. Its depth: 0 even, 1 as written, 2 twice as far." about=&lean
&bar meter("12/8") step=&tempo bend=8n:&lean:free(1, 0..2)
&tempo step=free(60bpm, 45..80)
&lean 4 3 3
\`\`\`

## The band

The drums are the library's 12/8 bar (\`twelve_eight_drums\`): the kick on one and three and the snare on two and four, tapping the beats (\`step=beat\`), and the ride on every eighth, the first of each three the loudest.
The harmony is the library's twelve-bar blues (\`twelve_bar\`), in C mixolydian, every chord a seventh.
The bass is the motif \`shuffle\`, the library's slow blues line in 12/8, read over the chord in force rather than the key: root, fifth, seventh, octave, and back.
The piano plays the chord on every eighth, the slow blues' triplets, and leans with the ride.

\`\`\`cells
&kick, &backbeat, &hat, &groove from twelve_eight_drums
&key from diatonic(mode=mixolydian) C
&harm from twelve_bar &key
&bassline from shuffle &harm
&comp over=&harm step=8n [1,2,3]
&shuffleNote label="shuffle, read over the chord (&harm): 0 2 3 4 is the root, the fifth, the seventh and the octave, long and short over each beat." about=&bassline
&compNote label="The chord on every eighth: under the bend each three is long, short, short." about=(&comp &hat)
\`\`\`

## The sound

\`\`\`cells
&bassV from upright_bass
&keys s=tri loop=C4 env=&(map=adsr .005 .25 .2 .2)
&out map=sample postgain=2.59 [&groove, &bassline * &bassV * .6, &comp * &keys * .2]
\`\`\`
`,twinkle:`---
title: "Motifs and reuse: Twinkle Twinkle"
tags: [tutorial, genre:classical, genre:folk, diatonic, motifs]
tier: 3
description: Twinkle Twinkle from three motifs, one of them read a step up the scale, in solfège.
---

\`\`\`cells
# Three motifs make the whole tune. The middle line is &down again,
# a step up the scale: &down^1.
&bar from bar &tempo
&tempo step=96bpm
&swell from envelopes
&key label="{mode} on {tonic}" scale(major)                 # C major

&up label="*twinkle twinkle, little star*" 0 0 4 4 5 5 4@2                    # twin-kle twin-kle lit-tle star
&down label="*how I wonder what you are*" 3 3 2 2 1 1 0@2                  # how I won-der what you are
&mid label="*up above the world so high*" &down^1                # up a-bove the world so high
&tune over=&key step=4n show=do &up &down &mid!2 &up &down         # show=do: in solfège, motifs and all

&bu 0 0 3 0
&bd 3 0 4 0
&roots over=&key step=2n &bu &bd &bu^1!2 &bu &bd       # the bass moves the same way

&lead s=tri loop=C5 env=&swell
&bass s=sine loop=C3 env=&(map=adsr .005 .5 .5 .1)
&mix postgain=1.58 map=sample [&tune * &lead, &roots * &bass * 0.8]
\`\`\`
`,twovoices:`---
title: "Two voices: a mix"
tags: [tutorial, sound]
tier: 1
description: "One tune, played by two voices at once: a sine on top and a saw three octaves below it, quieter."
---

\`\`\`cells
&twovoicesNote label="A chord in the brackets is a mix: the sound card plays what is in it at once. * .5 and * .25 are gains: how loud each voice is in the mix." about=&out
&tagsNote label="tags= groups cells in the graph, the first tag naming the group: both voices sit in one, the tune beside them." about=(&lead &bass &tune)

&tune tags="melody" step=3 0 4 7 4 0 4 7@2 5 9 12 9 5 9 12@2   # a tune
&lead tags="voices" s=sine loop=C5
&bass tags="voices" s=saw loop=C2
&out map=sample postgain=2 [&tune * &lead * .5, &tune * &bass * .25]
\`\`\`
`,variations:`---
title: "Variations: a subject and its copies"
tags: [tutorial, motifs, counterpoint]
tier: 5
description: "One subject entered three times, as a fugue begins: as it is, a fifth up with its leap bent (a tonal answer), and an octave down with its last note held. Each entry after the first is a copy of the subject, written as what changes."
---

\`\`\`cells
&copyNote label="base=&subject makes a cell a copy of &subject. = keeps a step as it is there, a value changes it, =!n keeps n of them and =@n keeps one held n; base=&subject^$7 is the copy a fifth up." about=(&answer &low)
&bar from bar &tempo
&swell from envelopes
&tempo step=free(andante)

&subject 0 -1 0@2 -5@2 -4@2 0 -1 0 2 -5@4
&answer base=&subject^$7 =!3 0@2
&low base=&subject^$-12 =!9 =@8

&alto step=16n &subject ~@36
&soprano step=16n ~@16 &answer ~@20
&bass part=bass step=16n ~@32 &low

&flute s=tri loop=C5 env=&swell
&reed s=tri loop=C4 env=&swell
&cello s=saw loop=C3 lpf=1200 env=&swell
&out map=sample postgain=6.49 [&soprano * &flute * .3, &alto * &reed * .3, &bass * &cello * .25]
\`\`\`
`,voice:`---
title: "A voice: a source and an envelope"
tags: [tutorial, sound]
tier: 2
description: "Four voices, each a source and an envelope: a pluck, a swell, a bass and a breath."
---

\`\`\`cells
&sourceNote label="s= is the source: sine, tri, saw, square, pulse, or a noise (white, pink, brown); loop=C4 is its note." about=(&pluck &pad &low &air)
&envNote label="env= is its volume on every note: map=adsr, attack, decay and release in seconds, sustain a level. Written where it is used, &( … ) is a cell without a name." about=&pluck
&bar from bar &tempo
&tempo step=free(moderato)

&tune step=8n 0 4 7 12 7 4 0 ~ 2 5 9 14 9 5 2 ~
&line step=2n 7 9 5 7
&bass part=bass step=4n 0 0 7 0 2 2 9 2

&pluck s=tri loop=C4 env=&(map=adsr .005 .3 .1 .2)        # quick to start, quick to fade: a pluck
&pad s=saw loop=C4 env=&(map=adsr .5 .3 .6 .8)            # slow in, held, slow out: a swell
&low s=square loop=C2 env=&(map=adsr .005 .25 .5 .1)
&air s=pink env=&(map=adsr .3 .2 .5 .6)                   # a noise: no note of its own
&out map=sample postgain=7.72 [&tune * &pluck * .3, &line * &pad * .06, &bass * &low * .12, &line * &air * .04]
\`\`\`
`,waltz:`---
title: "Viennese waltz: oom-pah-pah"
tags: [genre:classical, tonal, rhythm]
description: "A waltz in G: oom on one, pah-pah on two and three, a flute above."
---

\`\`\`cells
* from style=&waltz
# scan(28 37 35) pulls beat 2 early: short – long – long
&bar scan(28 37 35) step=&tempo
&tempo step=free(168bpm, 140..200)
&tune over=scale(major, G) step=4n 2 4 7 7@2 6 5@2 4 1@3 1 4 6 6@2 5 4@2 1 0@3      # G major

# oom-pah-pah: motifs with no over= read through whoever plays them
&I 0 ~ ~
&V -3 ~ ~
&oom over=scale(major, G) step=4n &I!3 &V!4 &I
&i ~ [0,2,4]!2
&v ~ [-3,-1,1]!2
&pah over=scale(major, G) step=4n &i!3 &v!4 &i

&flute s=tri loop=C4 room=.4 env=&(map=adsr .03 .2 .6 .3)
&tuba s=sine loop=C2 env=&(map=adsr .005 .4 0 .1)
&strings s=square loop=C4 lpf=1200 room=.5 env=&(map=adsr .02 .15 .3 .2)
&mix postgain=1.26 map=sample [&tune * &flute, &oom * &tuba, &pah * &strings * free(.4, 0..1)]
&oompah scope=spectrum label="oom-pah: the bass and the chords, one tonal spectrum" &oom &pah
\`\`\`
`,waveforms:`---
title: "Sound: voices, waveforms, envelopes"
tags: [tutorial, genre:electronic, sound]
tier: 6
description: "Voices made of braids: square, triangle, saw and sine, with envelopes and a vibrato."
---

\`\`\`cells
# A voice is a cell looped at audio rate: one turn of its braid is one cycle
# of its waveform. Its pitch and its volume are cells too.
&bar from bar &tempo
&tempo step=100bpm
&tune over=scale(major) step=8n 0 2 4 7 4 2 0 ~ 4 5 7 9 7 5 4 ~
&roots over=scale(major) step=1m 0 3 4 0

&square label="square: two values, held" loop=C4 0 1                          # held, lerped to −1…1: a square
&tri label="triangle: the same, ramped" loop=C4 map=lin 0 1                     # the same two values, ramped: a triangle
&sine label="sine: sin(12)" loop=C4 sin(12)                        # one cycle of a sine in 12 steps
&saw label="saw: 0…11, ramped" loop=C2 map=lin env=&(map=adsr .04 .3 .6 .5)   # no braid: 0…11 of the grid, ramped: a saw — with its envelope

&curve 0 1 .3 -1
&shaped label="map=&curve: each value looked up in &curve" loop=262hz map=&curve 0 1 2 3   # 262 times a second: a C
&chip label="step=8k: a braid as samples, eight thousand a second" step=8k 1!2 -1!2    # 2000 Hz, square

&vibrato label="vibrato: ±0.3, gliding" map=lin loop=5 0 .3 0 -.3 0         # a pitch, added, gliding
&pluck label="a volume, per note" map=lin loop=&tune 1 .4 0             # a volume, one shape per note of &tune

# an instrument: a mix used like a voice — the saw, and a sine an octave below
&bass [&saw, &(loop=C1 sin(12)) * 0.6]

&mix postgain=1.06 map=sample [(&tune + &vibrato) * &pluck * &square,                    # try &tri or &sine
                                  &roots * &bass]
\`\`\`
`,worn:`---
title: Sound on a worn tape
tags: [tutorial, sound, tape]
tier: 8
description: A flute recorded onto a worn tape loop and played back by two heads, one of them wandering.
---

\`\`\`cells
&wornNote label="A tape that records a mix records its sound: tone= darkens it each pass, drive= saturates it, hiss= is its noise; print= a faint pre-echo printgap= ahead; dropout= brief gaps." about=&tape
&wanderNote label="wander= lets a head drift either way along the tape, wanderhz= times a second: a flying head." about=&far
&reel step=72bpm motor=1 mass=1 friction=.1 wow=.02 0
&bar from bar &tempo
&tempo step=72bpm
&key from diatonic(mode=minor) &tonic
&tonic D

&tune over=&key step=8n 0 ~ 4 ~ 7 ~!3 6 ~ 4 ~ 2 ~!3 0 ~ 1 2 4 ~!3

&flute s=tri loop=D4 env=&(map=adsr .02 .4 .3 .4)
&dry [&tune * &flute * .3]
&tape step=&reel write=&dry length=4 erase=.35 tone=2600 drive=.4 hiss=.005 print=.03 printgap=.6 dropout=.2
&near play=&tape at=1
&far play=&tape at=2.5 wander=.08 wanderhz=.15

&out map=sample postgain=10 [&dry, &near * .5] [&dry, &far * .5]
\`\`\`
`,zell:`---
title: Zelluläre Aktivität
tags: [genre:electronic, artist:Kraftwerk, diatonic, arrangement]
description: Zelluläre Aktivität — it builds, layer by layer, and ends.
---

In the manner of Kraftwerk, an original. Am – F – C – G, two bars each. The bass's octaves move through the chords by transposing (\`&oct^$-4\`: four semitones down, F); the arpeggio by moving its shape up the scale (\`&shape^5\`: the same shape on its sixth step), chromatic and diatonic side by side. A slow filter sweep over the arpeggio; a plain melody with echoes in time.

\`\`\`cells
&aufbauNote label="It builds, layer by layer: &lied reads the parts, eight bars a step." about=&lied
&progressionNote label="Am – F – C – G." about=(&bassline &arp)
&bassNote label="Bass: octaves, transposed (^n)." about=&bassline
&arpNote label="Arpeggio: one shape, read on the chord's step of the scale." about=(&shape &arp)
&melodyNote label="Melody: plain, with echoes in time (delaytime=&bar)." about=(&melody &lead)
&bar from bar &tempo
&strike, &thump, &snap, &click from envelopes
&tempo step=free(112bpm, 90..140)
&minor scan(2 1 2 2 1 2 2)                                   # A minor (the voices sit on A)

&oct tags="bass" 0 12 0 12 0 12 0 12                                     # Oktaven: a bar of eighths
&bassline tags="bass" step=&bassBar*2 label="Bass: Oktaven" &oct!2 &oct^$-4!2 &oct^$3!2 &oct^$-2!2   # A · F · C · G

&shape tags="arpeggio" 0 2 4 7                                               # a chord's tones, up (degrees)
&arp tags="arpeggio" over=&minor step=&arpBar*4 label="Arpeggio" &shape!8 &shape^5!8 &shape^2!8 &shape^6!8   # on A, F, C, G
&sweep tags="arpeggio" map=lin loop=&bar/16 .1 1 .1

&melody tags="melody" over=&minor step=&melodyBar label="Melodie" 4@2 2 1 0@4 5@2 4 2 4@4 2@2 1 0 1@4 6@2 4 3 4@4

&beat tags="beat" step=&beatBar &bd &sd &bd &sd
&ticks tags="beat" map=amp step=&ticksBar*4 .5 .2 .3 .2 .5 .2 .3 .6

&bass tags="bass" s=square loop=A1 lpf=600 env=&strike
&arpeggio tags="arpeggio" s=square loop=A3 lpf=300..4000 * &sweep lpq=4 env=&(map=adsr .002 .1 .2 .05)
&lead tags="melody" s=saw loop=A4 lpf=2200 delaytime=&bar delay=.3 delayfeedback=.3 room=.2 env=&(map=adsr .03 .2 .7 .2)
&bd note=36 tags="beat" gain=.8 s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&thump
&sd seed=0 note=38 tags="beat" gain=.35 s=white hpf=1200 env=&snap
&metal tags="beat" s=square loop=A7 hpf=5000 env=&click

# Aufbau: the sections the song stacks — eight bars (the progression) a step
&teile step=4n &beatBar &ticksBar &bassBar &arpBar &melodyBar
&lied over=&teile step=1m/8 laps=1 label="Aufbau: Klick · Bass · Takt · Arpeggio · Melodie · Pause · alles · Klick" 1 [1,2] [0,1,2] [0,1,2,3] [0,1,2,3,4] [2,3] [0,1,2,3,4] 1

&out postgain=2.41 map=sample [&ticks * &metal * .12,
                         &beat,
                         &bassline * &bass * .5,
                         &arp * &arpeggio * .18,
                         &melody * &lead * .3]
\`\`\`
`},Jc=Object.fromEntries(Kc.map(e=>{let t=qc[e];if(t===void 0)throw Error(`examples/${e}.md is missing`);let n=r(t);if(`problems`in n)throw Error(`examples/${e}.md: ${n.problems.map(e=>`line ${e.line}: ${e.message}`).join(`; `)}`);return[e,{source:n.text,file:t}]})),Yc=class extends Error{},Xc=[`lpf`,`lpq`,`hpf`,`hpq`,`bpf`,`bpq`,`room`,`delay`],Zc=[`pitch`,`env`,`fm`],Qc=/^&([A-Za-z_][A-Za-z0-9_]*)$/,Z=e=>Qc.exec(e)?.[1]??null,$c=(e,t)=>[e,...t].join(` * `);function el(e,t){for(let n=0;n<e.length;n++){let r=i(U(e[n])[0].trim());if(r&&r.kind===`use`&&r.names?.length===1&&r.names[0]===`&${t}`)return{index:n,form:r}}return null}function tl(e,t){for(let n of e.split(`
`)){let e=U(n)[0].trim();if(e.startsWith(`${t} `)&&i(e)===void 0)return e.slice(t.length).trim()}return null}var nl=(e,t)=>RegExp(`\\[[^\\]]*${t}(?![A-Za-z0-9_])[^\\]]*\\]`).test(e);function rl(e){let t=e.trim();if(!t.startsWith(`[`)||!t.endsWith(`]`)||se(t,0).text!==t)return null;let n=t.slice(1,-1),r=[],i=0,a=``;for(let e of n)(e===`[`||e===`(`)&&i++,(e===`]`||e===`)`)&&i--,e===`,`&&i===0?(r.push(a.trim()),a=``):a+=e;return a.trim()&&r.push(a.trim()),r}var il=e=>/^&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[^(])/.exec(e.trim())?.[1]??null;function al(e){let t=Ae(e).slice(1);if(t.some(e=>/^map=(sample|midi|role)\b/.test(e)))return null;let n=t.filter(e=>!/^[a-z][a-zA-Z]*=/.test(e)&&e!==`off`);return n.length===1&&n[0].startsWith(`[`)?`instrument`:t.some(e=>re.has(e.slice(0,Math.max(0,e.indexOf(`=`)))))?`voice`:null}function ol(t,n,r){let i=t.split(`
`),a=el(i,n);if(a){let e=r?.(a.form.id)??null,t=e?g(e):null;if(!e||!t)return[];let n=new Map((a.form.args??[]).map(e=>[e.name,e.value])),i=t.optional.map(t=>{let r=t.slice(1),i=n.get(r),a=i&&Z(i)?[Z(i)]:[],o=tl(e,t);return{port:r,kind:`argument`,band:o&&(o.startsWith(`[`)||al(`${t} ${o}`)===`voice`)?`audio`:`cv`,patched:a,knob:i&&!a.length?i:o}});if(t.main){let n=a.form.main,r=(n?rl(n)??[n]:[]).flatMap(e=>il(e)??[]);i.push({port:t.main.slice(1),kind:`input`,band:nl(e,t.main)?`audio`:`cv`,patched:r,knob:null})}return i}let o=q(t,n);if(o<0)return[];let s=U(i[o])[0],c=al(s);if(!c)return[];let l=(t,n)=>{let r=e(s,t);if(!r)return{port:t,kind:`attribute`,band:n,patched:[],knob:null};let i=Z(r.base);return{port:t,kind:`attribute`,band:n,patched:[...i?[i]:[],...r.factors.flatMap(e=>Z(e)??[])],knob:i?null:r.base}},u=Xc.map(e=>l(e,`cv`));return c===`instrument`||(u.push(l(`pitch`,`cv`),l(`env`,`cv`),l(`fm`,`audio`)),e(s,`fm`)&&u.push(l(`index`,`cv`))),u}function sl(e,t,n,r,i){return ul(e,t,n,r,`in`,i)}function cl(e,t,n,r,i){return ul(e,t,n,r,`out`,i)}function ll(e,t){return q(e,t)>=0||e.split(`
`).some(e=>{let n=i(U(e)[0].trim());return!!n&&n.kind===`use`&&!!n.names?.includes(`&${t}`)})}function ul(e,t,n,r,i,a){let o=ol(e,t,a).find(e=>e.port===n);if(!o)throw new Yc(`&${t} has no jack ${n}`);if(i===`in`&&o.patched.includes(r)||i===`out`&&!o.patched.includes(r))return e;if(i===`in`){if(r===t)throw new Yc(`&${t} can't be patched into itself`);if(!ll(e,r))throw new Yc(`&${r} is defined nowhere in the text: write it first`)}let s=e.split(`
`),c=o.kind===`attribute`?null:el(s,t),l=c?c.index:q(e,t),[u,d]=U(s[l].replace(/\r$/,``)),f=s[l].endsWith(`\r`)?`\r`:``,p=c?fl(u,c.form,o,r,i):dl(u,t,o,r,i);return s[l]=(d?`${p.trimEnd()} `:p.trimEnd())+d+f,s.join(`
`)}function dl(t,n,r,i,a){let o=e(t,r.port),s=`&${i}`,c=e=>{if(o)return e===null?(t.slice(0,o.start-r.port.length-1).trimEnd()+` `+t.slice(o.end).trimStart()).trim():t.slice(0,o.start)+e+t.slice(o.end);let n=/^\s*&[A-Za-z_][A-Za-z0-9_]*/.exec(t)[0];return`${n} ${r.port}=${e}${t.slice(n.length)}`};if(Zc.includes(r.port)&&!(o&&o.base.includes(`..`))){if(a===`out`)return o&&Z(o.base)===i&&!o.factors.length?c(null):t;if(o)throw new Yc(`&${n}'s ${r.port}= holds ${o.base}: pull it out first (a jack takes one cable)`);return c(s)}if(a===`in`){if(!o)throw new Yc(`&${n} has no ${r.port}= written: write its value first (${r.port}=…), a knob for the cable to move`);if(Z(o.base))throw new Yc(`&${n}'s ${r.port}= is one cell, &${Z(o.base)}: two cells multiply a range (${r.port}=lo..hi * &a * &b), or add (a sum)`);return c($c(o.base.includes(`..`)?o.base:`${o.base}..${o.base}`,[...o.factors,s]))}if(!o)return t;if(Z(o.base)===i&&!o.factors.length)return c(null);let l=o.factors.filter(e=>Z(e)!==i);return l.length?c($c(o.base,l)):c(o.base.split(`..`)[0])}function fl(e,t,n,r,i){let a=je(e),o=a[a.findIndex(e=>e.text===`from`)+1],s=o.text.replace(/\(.*$/s,``),c=`&${r}`,l=[...t.args??[]],u=t.main;if(n.kind===`argument`){let e=l.find(e=>e.name===n.port),r=t.names[0];if(i===`in`&&e)throw new Yc(Z(e.value)?`${r}'s ${n.port} holds &${Z(e.value)}: pull it out first (a jack takes one cable)`:`${r}'s ${n.port} is set on the line (${e.value}): a cable would replace it, so clear it first (a jack takes one cable; a knob and a cable together are a sum)`);l=l.filter(e=>e.name!==n.port),i===`in`&&l.push({name:n.port,value:c})}else{let e=u?rl(u)??[u]:[];if(i===`in`)u=e.length?`[${[...e,c].join(`, `)}]`:c;else{let n=e.filter(e=>il(e)!==r);if(!n.length)throw new Yc(`${c} is the only input of &${t.names[0].slice(1)}: a module takes something in (patch another first)`);u=n.length===1&&Z(n[0])?n[0]:`[${n.join(`, `)}]`}}let d=l.length?`(${l.map(e=>`${e.name}=${e.value}`).join(`, `)})`:``;return`${e.slice(0,o.at)}${s}${d}${u?` ${u}`:``}`}function pl(e,t,n={}){if(q(e,t)>=0)return{text:e};let r=e.split(`
`);for(let a of r){let r=i(U(a)[0].trim());if(r?.kind!==`use`||!r.names?.includes(`&${t}`))continue;let o=n.resolve?.(r.id)??null;if(o!==null&&g(o)!==null)return r.names.length===1?{text:e}:{why:`&${t} is one of ${r.names.join(`, `)}, which one line takes from ${r.id}: an attribute before from is one head's, so write it on a line of the head's own`}}let a=D(e,n),o=a.origins.get(t);if(!o?.length)return{why:`&${t} is not a cell this piece is given by a from line`};let s=o[0].line-1,c=i(U(r[s]??``)[0].trim());if(c?.kind!==`use`)return{why:`&${t} came through no from line of the piece's`};let l=n.resolve?.(c.id)??null;if(l!==null&&g(l)!==null&&c.names!==null)return{why:`&${t} is ${c.id}'s copy's own: change it through the from line's arguments`};let u=a.text.split(`
`),d=u.findIndex((e,n)=>n>=r.length&&RegExp(`^\\s*&${t}(?![A-Za-z0-9_])`).test(e));if(d<0)return{why:`&${t} has no line of its own in the expansion`};let f=d;for(;f+1<u.length&&/[+*,[]\s*$/.test(U(u[f])[0]);)f++;let p=u.slice(d,f+1),m=r.flatMap((e,n)=>{if(n!==s||c.names===null)return[e];let r=c.names.filter(e=>e!==`&${t}`);if(!r.length)return[];let[i,a]=U(e);return[i.replace(/^(\s*)[^]*?(?=\s+from\s)/,`$1${r.join(`, `)}`)+a]}),h=s+(m.length<r.length?0:1),_=[...m.slice(0,h),...p,...m.slice(h)].join(`
`),v=e=>W(e,void 0,n).diagnostics.flatMap(e=>e.severity===`error`?[e.message]:[]),y=new Set(v(e)),b=v(_).filter(e=>!y.has(e));return b.length?{why:`&${t}'s line, written into the piece, doesn't compile there: ${b[0]}`}:{text:_}}var ml=pc(mc),hl=[`meters`,`rhythms`,`fills`,`counts`,`endings`,`bass`,`harmony`,`instruments`,`expression`,`modes`,`melodic`,`performers`,`stab`,`motifs`,`forms`,`sections`,`songs`,`bands`,`styles`,`modules`,`laws`],gl=Object.entries(Jc).flatMap(([e,t])=>d(t.source).flatMap(n=>{let r=n.slice(1),i=C(t.source,r);if(i===null)return[];let a=Ps(i.split(`
`).filter(e=>!e.trim().startsWith(`*`)).join(`
`),{styles:ml});if(!a?.explicit)return[];let o={id:`${e}/${r}`,text:i,association:a.association},s=[...a.problems,...Js(o)];if(s.length)throw Error(`examples/${e}.md, part &${r}: ${s.join(`; `)}`);return[o]})),_l=[...hl.flatMap(e=>vc(e)),...gl],vl=e=>_l.filter(t=>t.association.some(t=>t.facet===e)),yl=new Map([...gc.map(e=>[e.fragment.id,e.fragment.text]),..._l.map(e=>[e.id,e.text])]),bl=Object.entries(Jc).map(([e,t])=>[e,t.source]),xl=new Map([...bl,...yl]),Sl=e=>xl.get(e)??null;_l.filter(e=>e.association.some(e=>e.facet===`section`)).map(e=>e.id),[...new Set(_l.flatMap(e=>e.association.flatMap(e=>e.facet===void 0?[]:[e.facet])))],new Set(_l.map(e=>e.id));function Cl(e=Hs){if(!e.filed.length)return Sl;let t=new Map(e.filed.flatMap(({fragment:e})=>Rs(e).map(e=>[e.id,e.text])));return(e,n)=>Sl(e,n)??t.get(e)??null}var wl=(e,t=Sl)=>c(e,t),Tl=.1,El=.1,Dl=1.2,Ol=e=>wl(e).split(`
`).filter(e=>i(U(e)[0].trim())===void 0).join(`
`);function kl(e,t){if(!g(e)&&g(t))return kl(e,Ol(t));let n=ge(e,`free`),r=ge(t,`free`);if(n.hash!==r.hash)return null;let i=new Map;for(let[e,t]of r.cells)i.set(t,[...i.get(t)??[],e]);return new Map([...n.cells].flatMap(([e,t])=>{let n=i.get(t)?.shift();return n===void 0||n===e?[]:[[`&${e}`,`&${n}`]]}))}var Al=e=>Math.round(e*1e9)/1e9;function jl(e,t,n,r,i){let a=t.filed.find(e=>e.fragment.id===n)??t.filed.find(e=>zs(e.fragment,n)!==void 0),o=a&&a.fragment.id!==n?zs(a.fragment,n):void 0,s=a?a.fragment.association:e.fragments.find(e=>e.id===n).association,c=s.flatMap((e,t)=>!a||Bs(e,o)?[{wp:e,own:t}]:[]);t.points.forEach((e,t)=>{e.id===n&&c.push({wp:e,row:t})});let l=new Set(Qs({id:n,text:`-`,association:c.map(e=>e.wp)},i)),u,d=1/0;for(let e of c){let t=l.has(e.wp)?Zs(e.wp.point,r)/e.wp.weight:1/0;t<=d&&t<1/0&&([u,d]=[e,t])}if(!u)return Ml(t,n,a,{point:{...r},weight:Tl,...i===void 0?{}:{facet:i},...o?{args:o}:{}});let{wp:f}=u;if(f.weight>=1.2)return t;let p=Al(Math.min(Dl,f.weight+El));if(u.row!==void 0)return{...t,points:t.points.map((e,t)=>t===u.row?{...e,weight:p}:e)};if(!a)return Ml(t,n,a,{...f,weight:p});let m=s.map((e,t)=>t===u.own?{...e,weight:p}:e);return{...t,filed:t.filed.map(e=>e===a?{...e,fragment:{...e.fragment,association:m}}:e)}}function Ml(e,t,n,r){if(!n)return{...e,points:[...e.points,{id:t,...r}]};let i={...n.fragment,association:[...n.fragment.association,r]};return{...e,filed:e.filed.map(e=>e===n?{...e,fragment:i}:e)}}function Nl(e,t,n){let{text:r,point:i,facet:a,source:o,created:s,meta:c={},prose:l=``}=n,u=[];typeof o==`string`&&o.trim()||u.push(`no source`),typeof s==`string`&&s.trim()||u.push(`no created`);let d=[`id`,`association`,`source`,`created`].filter(e=>Object.hasOwn(c,e));d.length&&u.push(`its meta names ${d.join(`, `)}, which filing writes itself`);let f=[{point:{...i},weight:Tl,...a===void 0?{}:{facet:a}}];if(u.push(...Js({id:n.id??`filed`,text:r,association:f})),u.length)throw Error(`fileFragment: ${u.join(`; `)}`);let p=e.merge(t);for(let n of p.fragments){let o=kl(r,n.text);if(o)return{layer:jl(e,t,n.id,i,a),id:n.id,file:null,renamed:o}}let m=new Set([...p.fragments.map(e=>e.id),...p.unheld]);if(n.id!==void 0&&m.has(n.id))throw Error(`fileFragment: the id ${n.id} is taken`);let h=n.id??`${o} ${s}`;for(let e=2;m.has(h);e++)h=`${o} ${s} ${e}`;let g={fragment:{id:h,text:r,association:f},meta:{source:o,created:s,...c},prose:l};return{layer:{...t,filed:[...t.filed,g]},id:h,file:g,renamed:new Map}}var Pl=e=>`styleAtAxis${e}`,Fl=null;function Il(e,t,n,r){let i=[e,t,n,...Object.entries(r).flat()];if(Fl&&Fl.key.length===i.length&&Fl.key.every((e,t)=>e===i[t]))return Fl.plan;let a=T.map((e,n)=>`&${Pl(n)} lpf=0..1 * &${t}[${e.name}]`).join(`
`),o=W(`${e.replace(/\n*$/,``)}\n${a}\n`,n,r),s=o.ok?z(o,J(o),o.off):null;return Fl={key:i,plan:s},s}function Ll(e,t,n={}){let{env:r=A,cell:i=_,...a}=n,o=Il(e,i,r,a);if(!o)return null;let s=Math.max(0,t);return T.map((e,t)=>{let n=o.result.cells.get(Pl(t))?.paramCells.lpf?.factors[0];return n===void 0?NaN:Ne(ce(o,o.seriesOf(n),s,s+1),s,e=>e.level)})}var Rl=[`drums`,`bass`,`pad`,`stab`,`lead`],zl=new Set([`kick`,`backbeat`,`ghost`,`hat`,`pedal`,`euclid`,`ostinato`,`clave`,`fill`]),Bl=e=>e!==`drums`&&Rl.includes(e);function Vl(e){let t=(t,n)=>t===void 0?void 0:e.cells.get(t)?.params[n],n=new Map(e.performers.flatMap(e=>{let n=t(e.role,`part`);return typeof n==`string`&&Bl(n)?[[e.name,n]]:[]})),r=new Map;for(let i of e.outputs){let[e,a,o]=i.id.split(`:`);if(e===`kit`&&a===`voices`){let e=t(o,`role`);typeof e==`string`&&zl.has(e)&&r.set(i.id,{part:`drums`,role:e});continue}let s=[...i.via,...i.through].find(e=>n.has(e)),c=s===void 0?t(/^[A-Za-z_][A-Za-z0-9_]*/.exec(a??``)?.[0],`part`):n.get(s);typeof c==`string`&&Bl(c)&&r.set(i.id,{part:c})}return e=>e!==void 0&&r.get(e)||null}var Hl={drums:4,bass:17,pad:18,stab:19,lead:20},Ul={drums:21,bass:22,pad:23,stab:24,lead:25},Wl=27,Gl=e=>Math.max(0,Math.min(1,e)),Kl=e=>e.reduce((e,t)=>e+t,0);function ql(e,t,...n){let r=e>>>0;for(let e of[0,t,...n])r=Math.imul(r^(e|0),2654435761)>>>0;let i=r+1831565813|0,a=Math.imul(i^i>>>15,1|i);return a=a+Math.imul(a^a>>>7,61|a)^a,((a^a>>>14)>>>0)/4294967296}function Jl({style:e,swing:t}){return .5*Gl((t.share-.5)*6*(t.level===`8n`?1:.5))+.3*e.entropy+.2*(1-e.artic)}var Yl=e=>e.map((t,n)=>2*Kl(e.slice(0,n)));function Xl({groups:e,section:t,style:n,energy:r},{part:i,role:a,step:o}){let s=2*Kl(e),c=Yl(e),l=c.includes(o),u=2*Math.floor(s/4),d=c.filter((e,t)=>c.length<=3?t>0:t%2==1).at(-1),f=()=>{if(t===`breakdown`)return a===`fill`?45+(o-u)*9:55;switch(a){case`kick`:return o===0||o===u?112:92;case`backbeat`:return o===d?106:100;case`ghost`:return 32+14*n.sync;case`hat`:return l?78:o%2==0?66:50;case`pedal`:return 58;case`euclid`:case`ostinato`:case`clave`:return 72;case`fill`:{let e=t===`build`?u:2*Math.floor(s*3/8);return 50+(o-e)*(60/(s-e))}default:return 0}};switch(i){case`drums`:return f()*(.65+.35*r);case`bass`:return t===`breakdown`?70:(l?100:84)*(.75+.25*r);case`stab`:return 70+20*r;case`pad`:{let e=t===`breakdown`||r<.3?Math.max(.85,1-n.artic):1-n.artic;return 48+30*r*(.5+e/2)}case`lead`:return l?100:82}}var Zl={licence:1,accents:1},Ql=({part:e,role:t})=>Rl.includes(e)&&(e!==`drums`||t!==void 0&&zl.has(t));function $l(e,t,n=Jl(e),r=Zl){if(!Ql(t))return{velocity:t.velocity,length:t.length};let{seed:i,bar:a}=e,{part:o,step:s,note:c}=t,l=Xl(e,t),u=t.velocity+(l-Math.round(l)),d=o===`drums`?[a,s,c]:[a,s],f=(ql(i,Hl[o],...d)-.5)*n*24*r.licence,p=ql(i,Wl,Rl.indexOf(o),...d),m=s%2==1?4:Yl(e.groups).includes(s)?0:3,h=(m===4?-p*14*n:m===3?p*10*n:(p-.5)*2*4*n)*r.accents,g=o===`drums`?u+f+h:u+(f+h);return{velocity:Math.max(1,Math.min(127,Math.round(g))),length:t.length*(1-ql(i,Ul[o],...d)*n*.15*r.licence)}}var eu=new Set([1,2,3,10]);function tu(e,t,n,r=()=>null,i=()=>Zl){let a=r(e.output),o=L(t(e)).find(e=>eu.has(e.channel)),s=o&&y(e,o);if(!a||e.held||!s)return{event:e,performance:null};let{frame:c}=n,u=l(c.groups,[c.swing]),d=2*u.pulses,f=e=>(e-n.start)/n.seconds*d,p=e=>2*_e(u,e/2),m=p(f(e.at)),h=Math.round(m),g=p(f(e.at+Math.max(0,e.dur)))-m,_=$l(c,{...a,step:h,note:s.note,velocity:s.velocity,length:g},void 0,i(e.output)),v=(e.levels[0]?.level??1)*Math.abs(o.gain??Math.max(Math.abs(e.gains[0]),Math.abs(e.gains[1]))),b=v>0?(_.velocity/127)**2/v:1,x=e.levels.length?e.levels.map(e=>({...e,level:e.level*b})):[{at:e.at,level:b}],S=n.start+2*O(u,(h+_.length)/2)/d*n.seconds,C=S>e.at?S-e.at:e.dur;return{event:{...e,levels:x,dur:C},performance:{bar:n.bar,...a,step:h,note:s.note,velocity:_.velocity,length:_.length}}}var nu=vc(`styles`);function ru(e){let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];if(e.map?.kind!==`style`||t.length!==j.length||!t.every(Number.isFinite))throw Error(`styles: &${e.name} is not a style cell with a value on each axis`);if(!e.label)throw Error(`styles: &${e.name} has no label=, its display name`);if(e.step?.kind!==`rate`)throw Error(`styles: &${e.name} has no step= in bpm, its default tempo`);return{id:e.name,name:e.label,point:Object.fromEntries(j.map((e,n)=>[e,t[n]])),tempo:Math.round(e.step.perSecond*60*1e9)/1e9,...e.reach?{reach:{...e.reach}}:{}}}var iu=H(nu.find(e=>e.id===`styles`).text).cells.map(ru);function Q(e){let t=iu.find(t=>t.id===e);if(!t)throw Error(`styles: no style ${e} (there are ${iu.map(e=>e.id).join(`, `)})`);return t.point}Q(`synthPop`),Q(`techno`),Q(`deepHouse`),Q(`ambient`),Q(`lofi`),Q(`funk`),Q(`bossaNova`),Q(`swingJazz`),Q(`electroSwing`),Q(`spooky`),Q(`kinderlied`),Q(`pop`),vc(`instruments`),Object.fromEntries(T.map((e,t)=>[e.name,f[t]]));function au(e,t,n,r){let{fragment:i,meta:a,prose:o}=e,s=Rs(i).map(e=>e.id),c=n.points.flatMap(({id:e,point:t,weight:n,facet:r})=>{if(e!==i.id&&!s.includes(e))return[];let a=e===i.id?void 0:zs(i,e);return[{point:t,weight:n,...r===void 0?{}:{facet:r},...a?{args:a}:{}}]}),l=[...i.association,...c],u;return{id:i.id,path:t,source:typeof a.source==`string`?a.source:null,facets:[...new Set(l.flatMap(e=>e.facet===void 0?[]:[e.facet]))],association:l,variants:s,text:i.text,signature:g(i.text),takes:[...new Set(gr(i.text).map(e=>e.id))].filter(e=>e!==i.id),prose:o,meta:a,get holes(){return u??=Pr(i.text,e=>W(e,void 0,{resolve:r}),r),u}}}var ou=new WeakMap;function su(e=Hs){let t=ou.get(e);if(t)return t;let n=Cl(e),r=gl.map(t=>{let[r,i]=[t.id.slice(0,t.id.indexOf(`/`)),t.id.slice(t.id.indexOf(`/`)+1)];return{...au({fragment:t,meta:{source:`seed`},prose:``},`examples/${r}`,e,n),part:{document:r,head:i}}}),i=Object.freeze([...gc.map(t=>au(t,t.path,e,n)),...r,...e.filed.map(t=>au(t,null,e,n))]);return ou.set(e,i),i}var cu=[...new Set([...Na,...Pa,`third`,`dominant`])],lu=e=>{let t=new Map;for(let n of e)t.set(n,(t.get(n)??0)+1);return t};function uu(e,t,n,r){let i=0;for(let[n,r]of e)i+=Math.min(r,t.get(n)??0);return n+r-2*i}var du=e=>(Math.round(e*3840)/3840).toFixed(6),fu=(e,t)=>({bar:e,notes:lu(t),size:t.length,signature:[...t].sort().join(`|`)});function pu(e,t){let n=e.windows.get(t);if(n)return n;let{span:r,bar:i,notes:a}=e,o;if(t===null||r===null||i===null)o=[fu(0,a.map(e=>e.at===null?e.key:`${du(e.at)} ${e.key}`))];else{let e=1e-9;o=(t<r-e?Array.from({length:Math.ceil(r/i-e)},(e,t)=>t):[0]).map(n=>{let o=[];for(let s of a)if(s.at===null)o.push(s.key);else for(let a=((s.at-n*i)%r+r)%r;a<t-e;a+=r)o.push(`${du(a)} ${s.key}`);return fu(n,o)})}return e.windows.set(t,o),o}var mu=(e,t,n)=>({path:e,notes:t,span:n.span,bar:n.bar,windows:new Map}),hu=e=>e.split(`
`).map(e=>U(e)[0].replace(/\s+/g,` `).trim());function gu(e,t){for(let n=e.indexOf(t);n>=0;n=e.indexOf(t,n+1)){let r=e.slice(0,n).trimEnd().at(-1),i=e.slice(n+t.length).trimStart()[0];if((r===`[`||r===`,`)&&(i===`]`||i===`,`||i===`*`))return!0}return!1}function _u({capacity:e=512}={}){if(!((Number.isInteger(e)||e===1/0)&&e>=1))throw Error(`createRecogniser: capacity is ${String(e)}, not a whole number ≥ 1 or Infinity`);let t=new Map,n=new WeakMap,r=(r,i)=>{let a=n.get(i);a===void 0&&n.set(i,a=JSON.stringify([i.workbench??``,i.operators,i.keep??[],i.fewest??1,i.degrees??null]));let o=`${a}\n${r}`,s=t.get(o);s&&t.delete(o);let c=s??{readings:Xa(r,i),candidates:[]};return t.set(o,c),t.size>e&&t.delete(t.keys().next().value),c},a=(e,t)=>r(e,t).readings,o=new WeakMap,s=(e,t)=>{let n=o.get(e)??new Map;o.set(e,n);let r=n.get(t);if(!r){r=new Map;for(let n of e)for(let e of pu(n,t)){let t=r.get(e.signature);(!t||n.path.length<t.path.length)&&r.set(e.signature,{path:n.path,bar:e.bar})}n.set(t,r)}return r},c=(e,t,n)=>{let i=r(e.text,t),a=i.candidates[n];if(a)return a;let o=[],s=i.readings;if(s.notes?.length){o.push(mu([],s.notes,s));let r=e=>({operator:e.rule,line:e.line,by:e.by});if(n>=1){for(let i of s.variations)if(o.push(mu([r(i.variation)],i.notes,s)),n>=2){let n=Xa(i.variation.apply(e.text),t);for(let e of n.variations)o.push(mu([r(i.variation),r(e.variation)],e.notes,n))}}}return i.candidates[n]=o,o},l=(e,t,n)=>{let r=hu(e),o=new Map;for(let e of r){let t=i(e.trim());if(t?.kind!==`use`)continue;let n=o.get(t.id);o.set(t.id,n===null||t.takes===null?null:[...n??[],...t.takes])}if(!o.size)return[];let s=[];for(let e of t){if(!o.has(e.id))continue;let t=o.get(e.id);for(let{variation:i}of a(e.text,n).variations){let n=i.reference;if(!(!n||t&&!t.includes(i.line))&&r.some(e=>{let t=/^&([A-Za-z_][A-Za-z0-9_]*)\s/.exec(e)?.[1],r=t?K(e,t):null;return r&&[...r.attrs.filter(e=>e.startsWith(`base=`)),...r.braid].join(` `)===n.form||n.line(`r`).startsWith(`&r [`)&&gu(e,n.form)})){s.push({fragment:e,path:[{operator:i.rule,line:i.line,by:i.by}],bar:0,distance:0});break}}}return s};return{get size(){return t.size},recognise(e,t,n={}){let{tolerance:r=0,depth:i=1,operators:o=cu,...u}=n;if(!(Number.isInteger(r)&&r>=0))throw Error(`recognise: tolerance is ${String(r)}, not a whole number ≥ 0`);if(i!==0&&i!==1&&i!==2)throw Error(`recognise: depth is ${String(i)}, not 0, 1 or 2`);let d={...u,operators:o},f=l(e,t,d);if(f.length)return f;let p=a(e,d);if(!p.notes?.length)return[];let m=pu(mu([],p.notes,{...p,span:null}),null)[0],h=[];for(let e of t){let t=c(e,d,i);if(r===0){let n=s(t,p.span).get(m.signature);n&&h.push({fragment:e,...n,distance:0});continue}let n=null;for(let i of t)for(let t of pu(i,p.span)){if(Math.abs(t.size-m.size)>r)continue;let a=t.signature===m.signature?0:uu(t.notes,m.notes,t.size,m.size);a>r||(!n||a<n.distance||a===n.distance&&i.path.length<n.path.length)&&(n={fragment:e,path:i.path,bar:t.bar,distance:a})}n&&h.push(n)}return h.map((e,t)=>[e,t]).sort(([e,t],[n,r])=>e.distance-n.distance||e.path.length-n.path.length||e.bar-n.bar||t-r).map(([e])=>e)}}}vl(`motif`),vl(`form`);var $={voice:`_hv`,line:`_hl`,meter:`_hbar`,card:`_hout`,read:`_hr`};function vu(e,t,n){let r=e.replace(/^&/,``);return n?`&${r} map=style ${T.map(e=>`${e.name}=${n[e.name]??(e.range[0]+e.range[1])/2}`).join(` `)}`:t?`&${r} s=sine loop=C4`:r===`tempo`?`&${r} step=2`:r===`bar`?`&${r} meter("4/4") step=2`:r===`key`?`&${r} scale(major)`:`&${r} step=pulse*2 0 2 4 5`}function yu(e,t,n){let r=e.cells.get(t);return!r||r.map?.kind===`role`||r.map?.kind===`adsr`||r.map?.kind===`style`?null:r.gate?{entry:`&${t}`}:r.voice?{entry:`&${$.line} * &${t}`}:r.map?.kind===`sample`||r.sort===`signal`?{entry:`&${t}`}:r.sum?{entry:`&${$.line} * &${$.voice} * &${t}`}:r.meter&&e.clocks.get(t)?.cell===t?{entry:`&${$.read} * &${$.voice}`,line:`&${$.read} step=&${t}:pulse 0 2 4 5`}:r.meter||r.scan||!r.clock?{entry:`&${$.read} * &${$.voice}`,line:`&${$.read} over=&${t} step=${n}pulse*2 0 1 2 3`}:r.steps>0?{entry:`&${t} * &${$.voice}`}:null}var bu=`no head plays in a host`;function xu(e){let t=H(e).cells.filter(e=>!e.lambda).map(e=>e.name),n=e.split(`
`).filter(e=>i(U(e)[0].trim())===void 0);return t.filter(e=>!n.some(t=>!RegExp(`^\\s*&${e}(?![A-Za-z0-9_])`).test(t)&&RegExp(`&${e}(?![A-Za-z0-9_])`).test(U(t)[0])))}function Su(e){let t=g(e);return t?t.names.map(e=>e.replace(/^&/,``)):xu(e)}function Cu(e){let t=Su(e),n=new Set(xu(e)),r=t.filter(e=>n.has(e));return r.length?r:t}function wu(e,t,n={},r){let i=e,a=e=>W(e,void 0,n),o=Pr(i,a,n.resolve),s=g(i),c=r??Cu(i),l=[],u=t.kit?n.resolve?.(t.kit):null,d=u?new Set(H(u).cells.map(e=>`&${e.name}`)):new Set,f=o.uses.filter(e=>o.sounds.includes(e)&&d.has(e));f.length&&l.push({line:`${f.join(`, `)} from ${t.kit}`,fills:f.join(`, `)});let p=T.map(e=>e.name).join(`|`);for(let e of o.uses.filter(e=>!f.includes(e))){let n=t.style&&RegExp(`${e}\\[(?:${p})\\]`).test(i)?t.style:null;l.push({line:vu(e,o.sounds.includes(e),n),fills:e})}if(t.style&&s)for(let e of s.optional.filter(e=>RegExp(`${e}\\[(?:${p})\\]`).test(i))){let n=vu(e,!1,t.style),r=RegExp(`^\\s*${e}(?![A-Za-z0-9_]).*$`,`m`);r.test(i)&&(i=i.replace(r,n),l.push({line:n,fills:e}))}let m=(e,t)=>H(e).cells.some(e=>e.name===t);l.push({line:`&${$.voice} s=sine loop=C4`,fills:null});let h=!o.uses.includes(`&bar`)&&!m(i,`bar`);h&&l.push({line:`&${$.meter} meter("4/4") step=2`,fills:null}),l.push({line:`&${$.line} step=${h?`&${$.meter}:`:``}pulse*2 0 2 4 5`,fills:null});let _=()=>l.filter(e=>!(e.fills&&i.split(`
`).includes(e.line))).map(e=>e.line),v=a([i,..._()].join(`
`)),y=h?`&${$.meter}:`:``,b=0,x=e=>e.flatMap(e=>{let n=yu(v,e,y);if(n?.line&&b++>0){let t=`${$.read}_${e}`,r=RegExp(`&${$.read}(?![A-Za-z0-9_])`,`g`);return[{entry:n.entry.replace(r,`&${t}`),line:n.line.replace(r,`&${t}`)}]}if(n)return[n];if((t.kit||t.style)&&v.cells.get(e)?.map?.kind===`adsr`){let t=`${$.voice}_${e}`;return[{entry:`&${$.line} * &${t}`,line:`&${t} s=tri loop=C4 env=&${e}`}]}return[]}),S=x(c);!S.length&&!r&&(b=0,S=x(Su(i)));let C=e=>({source:[i,..._()].join(`
`),holes:o,lines:l,heads:c,meterless:h,...e?{why:e}:{}});if(!S.length)return C(bu);for(let e of S)e.line&&l.push({line:e.line,fills:null});l.push({line:`&${$.card} map=sample [${S.map(e=>e.entry).join(`, `)}]`,fills:null});let w=a([i,..._()].join(`
`));return w.ok?C():C(`the host doesn’t compile: ${w.diagnostics.find(e=>e.severity===`error`)?.message??``}`)}function Tu(e,t={}){let{style:n={},kit:r=`gm_kit`,...i}=t,a=wu(e,{kit:r,style:n},i);return{text:a.source,host:a.lines,heads:a.heads,...a.why?{why:a.why}:{}}}var Eu=/[+*,[]\s*$/,Du=/^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/,Ou=e=>[...new Set([...e.replace(/"[^"]*"/g,``).matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map(e=>e[1]))];function ku(e){let t=e.split(`
`),n=[],r=-1,a=[];return t.forEach((e,t)=>{let o=U(e)[0];if(r<0&&(r=t),a.push(o),Eu.test(o))return;let s=a.join(` `).trim().split(/\s+/).join(` `),c=i(s),l=c?(c.kind===`use`?c.names??[]:[]).map(e=>e.replace(/^&/,``)):Du.exec(s)?[Du.exec(s)[1]]:[];s&&n.push({first:r,last:t,defines:l,reads:Ou(s).filter(e=>!l.includes(e)),code:s,takes:c?.kind===`use`}),r=-1,a=[]}),n}var Au=e=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(e)?e:`"${e}"`;function ju(e,t,n){let{id:r,resolve:i,seconds:a=16}=n,o=ku(e),s=o.filter(e=>t.includes(e.first+1));if(!s.length)return{why:`no declaration starts on the lines given`};if(s.some(e=>!e.defines.length))return{why:"a line given defines no cell of its own (a `* from` line, or no cell at all)"};let c=o.filter(e=>!s.includes(e)),l=s.flatMap(e=>e.defines),u=e.split(`
`).filter((e,t)=>s.some(e=>t>=e.first&&t<=e.last)).join(`
`),d=W(e,void 0,{resolve:i}),f=[d.mainMeter,d.mainKey].filter(e=>!!e&&l.includes(e));if(f.length)return{why:`the lines define the piece's main ${f[0]===d.mainMeter?`meter`:`key`}, &${f[0]}, which the rest reads without naming it: leave its line in the piece`};let p=l.filter(e=>[`sample`,`midi`].includes(d.cells.get(e)?.map?.kind??``));if(p.length)return{why:`the lines hold a card, &${p[0]}, where the piece is heard: a fragment carries none (leave its line in the piece)`};let m=new Set(d.performers.flatMap(e=>e.role?[e.name,e.role]:[e.name])),h=l.filter(e=>{let t=d.cells.get(e)?.over,n=t?d.cells.get(t):void 0;return!!n&&n.units.length>0&&n.units.every(e=>e.atom.kind===`ref`&&m.has(e.atom.name))});if(h.length)return{why:`the lines hold a selector over the band, &${h[0]}, which switches the piece's own players: a fragment's copy switches none (leave its line in the piece)`};let g=l.filter(e=>c.some(t=>t.reads.includes(e)));if(!g.length)return{why:`nothing else in the piece reads what these lines define`};let _=[...new Set(s.flatMap(e=>e.reads))].filter(e=>!l.includes(e)),v=_.filter(e=>s.some(t=>t.reads.includes(e)&&(t.takes||k(t.code,e)))).map(e=>`&${e}`),y=_.filter(e=>!v.includes(`&${e}`)).map(e=>`&${e}`);if(v.length>1)return{why:`the lines read ${v.join(`, `)}, which they don't define: a fragment takes one main argument (take the others' lines in too)`};let b=v[0]??null,x=g.map(e=>`&${e}`).join(`, `),S=[`${x} from${b?` ${b}`:``}`,u].join(`
`),C=`${x} from ${Au(r)}${b?` ${b}`:``}`,w=Math.min(...s.map(e=>e.first)),T=e.split(`
`).flatMap((e,t)=>t===w?[C]:s.some(e=>t>=e.first&&t<=e.last)?[]:[e]).join(`
`),E=Fe(e,T,a,{resolve:(e,t)=>e===r?S:i(e,t)}),D=_l.find(e=>kl(S,e.text))?.id??null;return{fragment:S,piece:T,line:C,heads:g.map(e=>`&${e}`),main:b,private:l.filter(e=>!g.includes(e)).map(e=>`&${e}`),sounds:y,same:E,known:D}}var Mu=e=>`${e.value}${e.alter>0?`#`.repeat(e.alter):`b`.repeat(-e.alter)}`;function Nu(e,t){return e.outputs.find(e=>!e.silent&&!e.tape&&!e.gate&&!e.kit&&e.cell===t&&e.cell!==e.voice)??null}function Pu(e,t){if(t===null)return null;let n=t=>{let n=e.cells.get(t)?.frees.find(e=>e.key===`braid`),r=n&&e.cells.get(t)?.clock?Nu(e,t):null;return n&&r?{cell:t,spec:n,out:r}:null},r=n(t);if(r||!e.cells.get(t)?.voice)return r;let i=[...e.cells.values()].sort((e,t)=>e.span.line-t.span.line||e.span.col-t.span.col);for(let e of i){let r=n(e.name);if(r&&r.out.voice===t)return r}return null}var Fu=512,Iu=3,Lu=e=>Math.round(e*1e9)/1e9;function Ru(e,t,n){let r=r=>{let i=ne(e,t.cell,r.value,r.alter,n);return Lu(t.sign*ae(e,i.root,i.position)+t.offset)},i=null,a=()=>{if(i)return i;let e=new Map;for(let t=0;t<=Fu;t++)for(let n of t?[t,-t]:[0]){let t=r({value:n,alter:0});Number.isFinite(t)&&!e.has(t)&&e.set(t,n)}return i=[...e].map(([e,t])=>({s:e,value:t})).sort((e,t)=>e.s-t.s)},o=e=>{let t=a(),n=0,r=t.length-1;for(;n<r;){let i=n+r+1>>1;t[i].s<=e?n=i:r=i-1}return n+1<t.length&&t[n+1].s-e<e-t[n].s?n+1:n};return{read(e,t){let n=a();if(!n.length||!Number.isFinite(e))return null;let i=Lu(e),s=o(i);if(t===`snap`)return{value:n[s].value,alter:0,semis:n[s].s};let c=null,l=e=>{if(!c)return!0;let t=Math.abs(e.semis-i)-Math.abs(c.semis-i);return Math.abs(t)>1e-9?t<0:Math.abs(e.alter)===Math.abs(c.alter)?e.alter===c.alter?Math.abs(e.value)<Math.abs(c.value)||Math.abs(e.value)===Math.abs(c.value)&&e.value<c.value:e.alter>c.alter:Math.abs(e.alter)<Math.abs(c.alter)};for(let e=Math.max(0,s-2);e<=Math.min(n.length-1,s+2);e++)for(let t=-3;t<=Iu;t++){let i={value:n[e].value,alter:t,semis:t?r({value:n[e].value,alter:t}):n[e].s};Number.isFinite(i.semis)&&l(i)&&(c=i)}if(!c)return null;let u=c,d=n.find(e=>Math.abs(e.s-u.semis)<1e-9),f=d?{value:d.value,alter:0,semis:d.s}:u;return t===`ignore`&&f.alter!==0?null:f}}}function zu(e,t){let n=new Map;for(let r of e){let e=Math.floor(r.on+.5);if(e<0||e>=t)continue;let i=Math.min(t,Math.max(e+1,Math.floor(r.off+.5))),a=n.get(e)??{ws:new Map,end:e+1};a.ws.set(Mu(r),r),a.end=Math.max(a.end,i),n.set(e,a)}let r=[...n.keys()].sort((e,t)=>e-t),i=[],a=0;for(let[e,o]of r.entries()){for(;a<o;a++)i.push(`~`);let{ws:s,end:c}=n.get(o),l=Math.min(c,r[e+1]??t)-o,u=[...s.values()].sort((e,t)=>e.value-t.value||e.alter-t.alter).map(Mu);i.push(`${u.length>1?`[${u.join(`,`)}]`:u[0]}${l>1?`@${l}`:``}`),a=o+l}for(;a<t;a++)i.push(`~`);return i}var Bu=class{length;start=null;#e=new Map;#t=[];constructor(e){this.length=e}begin(e){this.start??=this.length*Math.max(0,Math.ceil((e-.5)/this.length))}get end(){return this.start===null?null:this.start+this.length-.5}down(e,t,n){this.up(e,n),t&&this.#e.set(e,{value:t.value,alter:t.alter,on:n})}up(e,t){let n=this.#e.get(e);n&&(this.#e.delete(e),this.#t.push({...n,off:t}))}write(){if(this.start===null)return null;let e=this.start;for(let t of[...this.#e.keys()])this.up(t,e+this.length);return zu(this.#t.map(t=>({...t,on:t.on-e,off:t.off-e})),this.length)}},Vu=512,Hu=8,Uu=2e4,Wu=e=>(t,n)=>{let r=e.cells.get(t.cell)?.span,i=e.cells.get(n.cell)?.span;return(r?.line??1/0)-(i?.line??1/0)||(r?.col??0)-(i?.col??0)};function Gu(e){let t=new Map;for(let n of e.outputs)n.silent||n.tape||(!n.gate&&n.cell!==n.voice&&!t.has(n.cell)&&t.set(n.cell,{cell:n.cell,voice:n.voice,kit:n.kit}),t.has(n.voice)||t.set(n.voice,{cell:n.voice,voice:n.voice,kit:n.kit}));return[...t.values()].sort(Wu(e))}var Ku=(e,t=440)=>t*2**((e-69)/12);function qu(e){return(Math.max(1,Math.min(127,Number.isFinite(e)?e:100))/127)**2}function Ju(e,t){if(!e.length)return null;let n=Math.round(t*1e9)/1e9,r=0,i=e.length-1;for(;r<i;){let t=r+i+1>>1;e[t]<=n?r=t:i=t-1}let a=e[r],o=e[r+1];return o!==void 0&&o-n<n-a?o:a}function Yu(e,t,n,r){let i=new Set,a=e.cells.get(n.voice)?.freq??0;for(let o=-512;o<=Vu;o++){let s=ne(e,t,o,0,r),c=n.sign*ae(e,s.root,s.position)+n.offset,l=a*2**(c/12);Number.isFinite(c)&&l>=Hu&&l<=Uu&&i.add(Math.round(c*1e9)/1e9)}return[...i].sort((e,t)=>e-t)}function Xu(e,t,n,{a4:r=440,mode:i=`snap`}={}){let a=e.cells.get(t);if(!a)return null;let o=Gu(e).find(e=>e.cell===t);if(a.kit||o?.kit){let n=[...I(Zu(e,t,o),t=>e.cells.get(t)?.drumNote)];return{kind:`kit`,cell:t,drum:t=>{let r=n.find(([,e])=>t.includes(e));return r?{voice:r[0],freq:e.cells.get(r[0]).freq}:null}}}if(!o&&!a.voice)return null;let s=o?.voice??t,c=Qu(e,t,o),l=e=>Ku(e,r);if(i===`allow`||!c)return{kind:`voice`,cell:t,voice:s,key:l};let{o:u,base:d}=c;if(i===`ignore`){let r=Ru(e,u,n);return{kind:`voice`,cell:t,voice:s,key:e=>{let t=r.read(12*Math.log2(l(e)/d),`ignore`);return t===null?null:d*2**(t.semis/12)}}}let f=null;return{kind:`voice`,cell:t,voice:s,key:t=>{f??=Yu(e,u.cell,u,n);let r=Ju(f,12*Math.log2(l(t)/d));return r===null?null:d*2**(r/12)}}}function Zu(e,t,n){let r=n?.voice??t;return(e.cells.get(r)?.units??[]).flatMap(t=>t.atom.kind===`ref`&&e.cells.get(t.atom.name)?.voice?[t.atom.name]:[])}function Qu(e,t,n){let r=n?.voice??t,i=e.outputs.find(e=>!e.silent&&!e.tape&&!e.gate&&e.voice===r&&(n?.cell===r||e.cell===t)),a=e.cells.get(r)?.freq??0;return!i||i.cell===r||!(a>0)?null:{o:i,base:a}}function $u(e,t){let n=e.cells.get(t),r=Gu(e).find(e=>e.cell===t);if(!n||!(n.kit||r?.kit))return[];let i=[...new Set(Zu(e,t,r))],a=I(i,t=>e.cells.get(t)?.drumNote);return i.flatMap(e=>{let t=a.get(e);return t===void 0?[]:[{member:e,note:t}]})}function ed(e,t,n,r=440){let i=e.cells.get(t);if(!i)return null;let a=Gu(e).find(e=>e.cell===t);if(i.kit||a?.kit||!a&&!i.voice)return null;let o=Qu(e,t,a);if(!o)return null;let s=new Set;for(let t of Yu(e,o.o.cell,o.o,n)){let e=Math.round(69+12*Math.log2(o.base*2**(t/12)/r)+1e-9);e>=0&&e<=127&&s.add(e)}return s}function td(e,t,n,r){let i=e=>!e.silent&&!e.tape&&!e.gate,a=e.outputs.find(e=>i(e)&&e.kit&&e.mods.some(e=>e.picks&&e.cell===t));if(a)return Pe(e,a,n);let o=e.outputs.find(e=>i(e)&&e.cell===t)??e.outputs.find(e=>i(e)&&e.voice===t);if(!o)return null;let s=o.kit&&o.mods.some(e=>e.picks);if(o.kit&&!s)return Pe(e,o,n);let c=s?Pe(e,o,0):{voice:o.voice,freq:e.cells.get(o.voice)?.freq??0};if(!c)return null;let l=ne(e,o.cell,n,0,r),u=c.freq*2**((o.sign*ae(e,l.root,l.position)+o.offset)/12);return u>0&&Number.isFinite(u)?{voice:c.voice,freq:u}:null}export{He as $,Mc as A,gr as B,pl as C,sl as D,ol as E,tc as F,Wn as G,Yn as H,Fs as I,qe as J,Ye as K,Ko as L,pc as M,Hs as N,cl as O,oc as P,Ve as Q,qo as R,Cl as S,Yc as T,Vn as U,fr as V,Un as W,Ue as X,Ke as Y,We as Z,Vl as _,$u as a,_l as b,Bu as c,ju as d,Re as et,Tu as f,tu as g,iu as h,Xu as i,mc as j,Jc as k,Pu as l,su as m,Ku as n,td as o,_u as p,Je as q,qu as r,ed as s,Gu as t,ze as tt,Ru as u,Ll as v,Xc as w,Sl as x,Nl as y,Jo as z};