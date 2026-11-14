(function(){function e(e,t){let n=0,r=0,i=5e5;for(let a of e.tempos){if(a.tick>=t)break;n+=(a.tick-r)*i/e.ppq/1e6,r=a.tick,i=a.micros}return n+(t-r)*i/e.ppq/1e6}let t=e=>`r${e}`,n=e=>{let t=/^(-?\d+)([#b]*)$/.exec(e);return t?{n:Number(t[1]),acc:t[2]}:null};function r(e){let t=e.values.map(n);if(t.some(e=>e===null))return{key:`d${e.dur}:${[...e.values].sort().join(`,`)}`,base:null};let r=Math.min(...t.map(e=>e.n));return{key:`n${e.dur}:${t.map(e=>`${e.n-r}${e.acc}`).join(`,`)}`,base:r}}function i(e){let n=[],i=0;for(let a of[...e.chords].sort((e,t)=>e.at-t.at))a.at>i&&n.push({key:t(a.at-i),base:null}),n.push(r(a)),i=a.at+a.dur;return e.length>i&&n.push({key:t(e.length-i),base:null}),n}let a=(e,t)=>e.replace(/^([rdn])(\d+)/,(e,n,r)=>`${n}${Number(r)*t}`),o=e=>/^[rdn]\d/.test(e),s=e=>/^f\d/.test(e);function c(e,t){let r=/^([rdn])(\d+)(?::(.*))?$/.exec(e),i=Number(r[2]),a=i===1?``:`@${i}`;if(r[1]===`r`)return`~${a}`;let o=r[1]===`d`?r[3].split(`,`):r[3].split(`,`).map(e=>{let r=n(e);return`${r.n+(t??0)}${r.acc}`});return`${o.length===1?o[0]:`[${o.join(`,`)}]`}${a}`}function l(e,t){let n=e.base??t.base,r=e.base===null?null:e.base-n,i=t.base===null?null:t.base-n,a=e=>e.stretch?`${e.key}@${e.stretch}`:e.key;return{key:`${a(e)}/${r}|${a(t)}/${i}`,base:n,offA:r,offB:i}}function u(e,t){let n=/* @__PURE__ */ new Map;e.forEach((e,r)=>{let i=t[r],a=``,o=-2;for(let t=0;t+1<e.length;t++){if(i&&(i[t]||i[t+1]))continue;let r=l(e[t],e[t+1]).key;(r!==a||o!==t-1)&&(n.set(r,(n.get(r)??0)+1),a=r,o=t)}});let r=null;for(let[e,t]of n)t>=2&&(!r||t>r.count)&&(r={key:e,count:t});return r}let d=(e,t)=>{let n=/* @__PURE__ */ new Map;for(let t of e.rules.values())t.of&&n.set(t.of,[...n.get(t.of)??[],t]);let r=[...e.rules.values()].filter(e=>!e.of).map(e=>e.key),i=[...e.lines.map(e=>[...e.toks]),...r.map(t=>e.rules.get(t).kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}})))],a=[...e.lines.map(()=>null),...r.map(t=>{let r=n.get(t);return r?e.rules.get(t).kids.map((e,t)=>r.some(e=>e.patched[t])):null})],o=new Map([...n].map(([e,t])=>[e,t.map(e=>({...e,kids:[...e.kids],patched:[...e.patched]}))])),s=new Map(e.rules),c=0,d=Math.max(0,...[...s.keys()].map(e=>Number(e.slice(1))||0))+1;for(let n=u(i,a);n;n=u(i,a)){let u=`s${d++}`,p=null,m=[];i=i.map((t,i)=>{let s=a[i],c=i>=e.lines.length?o.get(r[i-e.lines.length]):void 0,d=[],f=[],h=c?.map(()=>({kids:[],patched:[]}));for(let e=0;e<t.length;e++){if(e+1<t.length&&!(s&&(s[e]||s[e+1]))){let r=l(t[e],t[e+1]);if(r.key===n.key){p??={key:u,kids:[{key:t[e].key,off:r.offA,...t[e].stretch?{stretch:t[e].stretch}:{}},{key:t[e+1].key,off:r.offB,...t[e+1].stretch?{stretch:t[e+1].stretch}:{}}]},d.push({key:u,base:r.base}),f.push(!1),c?.forEach((t,n)=>{let[r,i]=[t.kids[e],t.kids[e+1]],a=l({key:r.key,base:r.off},{key:i.key,base:i.off});h[n].kids.push({key:u,off:a.base}),h[n].patched.push(!1)}),e++;continue}}d.push(t[e]),f.push(s?.[e]??!1),c?.forEach((t,n)=>{h[n].kids.push(t.kids[e]),h[n].patched.push(t.patched[e])})}return c?.forEach((e,t)=>Object.assign(e,h[t])),m.push(s?f:null),d}),a=m,s.set(u,p),c++,t?.(f)}return c?f():null;function f(){let t=new Map(s);r.forEach((n,r)=>t.set(n,{key:n,kids:i[e.lines.length+r].map(e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}))}));for(let e of o.values())for(let n of e)t.set(n.key,{...n,kids:[...n.kids],patched:[...n.patched]});return{lines:e.lines.map((e,t)=>({...e,toks:i[t]})),rules:t,looks:e.looks}}},f=[3,4,5,6,7,8,9,10,12,16],p=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),m=e=>e.key.startsWith(`r`)?null:/^n\d+:0$/.test(e.key)?e.base:void 0;function h(e){let t=e.map(m);if(t.some(e=>e===void 0))return null;let n=[...new Set(t.filter(e=>e!==null))];return n.length<2?null:{sig:e.map((e,r)=>`${p(e)}:${t[r]===null?`~`:n.indexOf(t[r])}`).join(` `),chord:n}}let g=e=>{let t=new Map(e.looks??[]),n=0,r=e.lines.map(e=>{let r=e.toks;if(r.some(e=>!o(e.key)))return e;let i=[];r.reduce((e,t)=>(i.push(e),e+p(t)),0);let a=[];for(let e of f)for(let t=0;t+e*3<=r.length;t++){let n=h(r.slice(t,t+e));if(!n)continue;let o=r.slice(t,t+e).reduce((e,t)=>e+p(t),0);if(i[t]%o!==0)continue;let s=[n.chord];for(;t+e*(s.length+1)<=r.length;){let i=h(r.slice(t+e*s.length,t+e*(s.length+1)));if(!i||i.sig!==n.sig||i.chord.length!==n.chord.length)break;s.push(i.chord)}if(s.length<3||s.length*e<12||s.filter((e,t)=>t>0&&e.join()!==s[t-1].join()).length<(s.length-1)/2)continue;let l=r.slice(t,t+e*s.length).reduce((e,t)=>e+c(t.key,t.base).length+1,0),u=30+s.reduce((e,t)=>e+t.join(`,`).length+3,0)+2*(i[t]/o)+30+2*e+8;u<l&&a.push({from:t,size:e,count:s.length,chords:s,sig:n.sig,dur:o,gain:l-u})}a.sort((e,t)=>t.gain-e.gain||e.from-t.from);let s=[],l=a.filter(e=>{let[t,n]=[e.from,e.from+e.size*e.count];return!s.some(([e,r])=>t<r&&e<n)&&(s.push([t,n]),!0)});if(!l.length)return e;let u=[],d=0;for(let a of l.sort((e,t)=>e.from-t.from)){u.push(...r.slice(d,a.from));let o=`f${t.size+1}`,s={pattern:a.sig.split(` `).map(e=>{let[t,n]=e.split(`:`);return n===`~`?{key:`r${t}`,base:null}:{key:`n${t}:0`,base:Number(n)}}),chords:a.chords,dur:a.dur,start:i[a.from],scale:e.scale??1};t.set(o,s),u.push({key:o,base:null}),d=a.from+a.size*a.count,n++}return u.push(...r.slice(d)),{...e,toks:u}});return n?{lines:r,rules:e.rules,looks:t}:null},_=(e,t)=>t?_(t,e%t):e,v=e=>{let t=0,n=e.lines.map(e=>{if(e.toks.some(e=>!o(e.key)))return e;let n=e.toks.reduce((e,t)=>_(e,Number(/^[rdn](\d+)/.exec(t.key)[1])),0);if(n<=1)return e;t++;let r=e.toks.map(e=>({...e,key:e.key.replace(/^([rdn])(\d+)/,(e,t,r)=>`${t}${Number(r)/n}`)}));return{name:e.name,toks:r,scale:(e.scale??1)*n}});return t?{...e,lines:n}:null},y=(e,t)=>t?y(t,e%t):e,b=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),x=(e,t)=>{let n=new Map(e.rules),r=/* @__PURE__ */ new Map,i=Math.max(0,...[...n.keys()].map(e=>Number(e.slice(1))||0))+1,s=0,l=e.lines.map(e=>{if(e.toks.every(e=>o(e.key))&&e.toks.reduce((e,t)=>y(e,b(t)),0)>=2)return e;let t=[],l=e.toks;for(let e=0;e<l.length;){let u=0,d=e;for(;d<l.length&&o(l[d].key)&&y(u,b(l[d]))>=2;)u=y(u,b(l[d++]));let f=l.slice(e,d);if(f.length<12||!f.some(e=>e.base!==null)){t.push(l[e]),e++;continue}let p=f.find(e=>e.base!==null).base,m=f.map(e=>({key:a(e.key,1/u),off:e.base===null?null:e.base-p})),h=m.map(e=>`${e.key}/${e.off}`).join(` `),g=f.reduce((e,t)=>e+c(t.key,t.base).length+1,0),_=m.reduce((e,t)=>e+c(t.key,t.off).length+1,0),v=r.get(h);if(!v&&g-11-(5+_)<=0){t.push(l[e]),e++;continue}let x=v;if(!x){x=`s${i++}`;let e={key:x,kids:m};n.set(x,e),r.set(h,x)}t.push({key:x,base:p,stretch:u}),s++,e=d}return{...e,toks:t}});if(!s)return null;let u={...e,lines:l,rules:n};return t?.(()=>u),u},S=e=>Math.max(2,Math.floor(e/4)),C=(e,t)=>{let n=e.lines.map(e=>[...e.toks]),r=n.map(e=>e.map(()=>!1)),i=new Map(e.rules),a=Math.max(0,...[...i.keys()].map(e=>Number(e.slice(1))||0))+1,s=0,l=e=>c(e.key,e.base).length+1,u=(e,t,i)=>{let a=n[e.line],s=n[t.line],c=r[e.line],l=r[t.line];if(e.i+i>a.length||t.i+i>s.length)return null;let u=S(i),d=0;for(let n=0;n<i;n++){let r=a[e.i+n],i=s[t.i+n];if(!o(r.key)||!o(i.key)||c[e.i+n]||l[t.i+n]||r.key!==i.key&&++d>u)return null}let f=/* @__PURE__ */ new Map;for(let n=0;n<i;n++){let r=a[e.i+n],i=s[t.i+n];r.key===i.key&&r.base!==null&&i.base!==null&&f.set(i.base-r.base,(f.get(i.base-r.base)??0)+1)}let p=0,m=-1;for(let[e,t]of f)t>m&&([p,m]=[e,t]);let h=0,g=Array(i);for(let n=0;n<i;n++){let r=a[e.i+n],i=s[t.i+n];if(g[n]=r.key!==i.key||r.base===null!=(i.base===null)||r.base!==null&&i.base-r.base!==p,g[n]&&++h>u)return null}return{diff:g,by:p}};for(let e=0;e<32;e++){let e=/* @__PURE__ */ new Map;n.forEach((t,n)=>{for(let i=0;i+5<=t.length;i++){let a=t.slice(i,i+5);if(a.some((e,t)=>!o(e.key)||r[n][i+t]))continue;let s=a.find(e=>e.base!==null)?.base??0,c=a.map(e=>`${e.key}/${e.base===null?``:e.base-s}`).join(` `);e.set(c,[...e.get(c)??[],{line:n,i}])}});let c=/* @__PURE__ */ new Map;for(let t of e.values()){if(t.length<2||t.length>48)continue;let e=t[0],i=n[e.line];for(let a of t.slice(1)){if(a.line===e.line&&a.i<e.i+5)continue;let t=n[a.line],s=i.slice(e.i,e.i+5).findIndex(e=>e.base!==null),l=s<0?0:t[a.i+s].base-i[e.i+s].base,d=5,f=0;for(;;){let[n,s]=[i[e.i+d],t[a.i+d]];if(!n||!s||!o(n.key)||!o(s.key)||r[e.line][e.i+d]||r[a.line][a.i+d]||a.line===e.line&&e.i+d+1>a.i)break;let c=n.key!==s.key||n.base===null!=(s.base===null)||n.base!==null&&s.base-n.base!==l;if(c&&f+1>S(d+1))break;f+=+c,d++}for(;d>5&&u(e,a,d)?.diff[d-1];)d--;if(d<12)continue;let p=`${e.line}:${e.i}:${d}`,m=c.get(p);c.set(p,{proto:e,n:d,score:(m?.score??d)+d})}}let f=null,p=(e,t)=>{let r=[];return n.forEach((n,i)=>{for(let a=0;a+t<=n.length;a++){if(i===e.line&&a<e.i+t&&a+t>e.i)continue;let n=u(e,{line:i,i:a},t);n&&(r.push({at:{line:i,i:a},...n}),a+=t-1)}}),r},m=(e,t,r)=>{let i=n[e.line].slice(e.i,e.i+t).reduce((e,t)=>e+l(t),0),a=r.reduce((e,r)=>{let i=r.diff.filter(Boolean).length;return e+(i?22+6*i+n[r.at.line].slice(r.at.i,r.at.i+t).reduce((e,t,n)=>e+(r.diff[n]?l(t):0),0):9)},9+i+6);return(r.length+1)*i-a+2*t*r.length};for(let e of[...c.values()].sort((e,t)=>t.score-e.score).slice(0,4)){let{proto:t,n:r}=e,i=p(t,r),a=(e,r)=>{let a=null;for(let o of[t,...i.map(e=>e.at)]){let t={line:o.line,i:o.i+r};if(t.i<0||t.i+e>n[t.line].length)continue;let i=p(t,e),s=i.reduce((e,t)=>e+t.diff.filter(Boolean).length,0);(!a||i.length>a.returns.length||i.length===a.returns.length&&s<a.apart)&&(a={proto:t,returns:i,apart:s})}return a},o=a(r,0);o&&([t,i]=[o.proto,o.returns]);let s=(e,t)=>e.some(e=>e.diff.some(Boolean))?t:-1/0,c={proto:t,n:r,returns:i,gain:s(i,m(t,r,i))},l=i.length;for(;r<64;){let e=null;for(let t of[0,-1]){let n=a(r+1,t);n&&n.returns.length&&(!e||n.returns.length>e.returns.length)&&(e=n)}if(!e||2*e.returns.length<l)break;[t,i]=[e.proto,e.returns],r++;let n=s(i,m(t,r,i));n>c.gain&&(c={proto:t,n:r,returns:i,gain:n})}c.gain>0&&(!f||c.gain>f.gain)&&(f=c)}if(!f)break;let{proto:h,n:g}=f,_=n[h.line].slice(h.i,h.i+g),v=_.find(e=>e.base!==null)?.base??null,y=(e,t)=>e.map(e=>({key:e.key,off:e.base===null?null:e.base-(t??0)})),b={key:`s${a++}`,kids:y(_,v)};i.set(b.key,b);let x=[{at:h,tok:{key:b.key,base:v}}];for(let e of f.returns){let t=n[e.at.line].slice(e.at.i,e.at.i+g);if(!e.diff.some(Boolean)){x.push({at:e.at,tok:{key:b.key,base:v===null?null:v+e.by}});continue}let r=t.find(e=>e.base!==null)?.base??null,o={key:`s${a++}`,kids:y(t,r),of:b.key,patched:e.diff};i.set(o.key,o),x.push({at:e.at,tok:{key:o.key,base:r}})}for(let{at:e,tok:t}of x.sort((e,t)=>t.at.line-e.at.line||t.at.i-e.at.i))n[e.line].splice(e.i,g,t),r[e.line].splice(e.i,g,!0);s++,t?.(d)}return s?d():null;function d(){return{...e,lines:e.lines.map((e,t)=>({...e,toks:[...n[t]]})),rules:new Map(i)}}};function w(e,t,n=`^$`){return o(e.key)?c(e.key,e.base):s(e.key)?`&${t.get(e.key)??e.key}`:`&${t.get(e.key)??e.key}${e.base?`${n}${e.base}`:``}${e.stretch&&e.stretch!==1?`@${e.stretch}`:``}`}function T(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}let E=(e,t,n=`^$`)=>T(e.map(e=>w(e,t,n)));function D(e,t,n,r){let i=e.kids.findIndex((n,r)=>!e.patched[r]&&n.off!==null&&t.kids[r].off!==null),a=i<0?0:e.kids[i].off-t.kids[i].off,o=e.kids.map((t,i)=>e.patched[i]?w({key:t.key,base:t.off},n,r):`=`);for(;o.length&&o[o.length-1]===`=`;)o.pop();return`base=&${n.get(t.key)??t.key}${a?`${r}${a}`:``} ${T(o)}`}let O=e=>e.kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}}));function k(e){let t=[],n=/* @__PURE__ */ new Set,r=i=>{for(let a of i)if(!o(a.key)&&!s(a.key)&&!n.has(a.key)){n.add(a.key),t.push(a.key);let i=e.rules.get(a.key);r(i.of?[{key:i.of,base:null}]:O(i))}};for(let t of e.lines)r(t.toks);return t}function A(e,t=`m`,n=`pulse`,r=`^$`,i){let a=k(e),o=i?[...i.keys()].filter(e=>a.includes(e)):a,s=new Map(i?o.map(e=>[e,i.get(e)]):o.map((e,n)=>[e,`${t}${n+1}`])),c=o.map(t=>{let n=e.rules.get(t);return`&${s.get(t)} ${n.of?D(n,e.rules.get(n.of),s,r):E(O(n),s,r)}`}),l=/* @__PURE__ */ new Map,u=0;for(let[t,r]of e.looks??[]){u++;let e=1;for(let t=2;t<=r.pattern.length;t++){let n=r.pattern.length/t;Number.isInteger(n)&&r.pattern.every((e,t)=>e.key===r.pattern[t%n].key&&e.base===r.pattern[t%n].base)&&(e=t)}let i=E(r.pattern.slice(0,r.pattern.length/e),s);l.has(i)||(l.set(i,`figure${l.size+1}`),c.push(`&${l.get(i)} ${i}`));let a=e=>`[${e.join(`,`)}]`,o=Math.round(r.start/r.dur),d=[...Array(o).fill(`0`),...r.chords.map(a)],f=`chords${u}`;c.push(`&${f} step=${n}/${r.dur*(r.scale??1)} ${d.join(` `)}`),s.set(t,`run${u}`),c.push(`&run${u} over=&${f} &${l.get(i)}!${r.chords.length*e}`)}return{defs:c,lines:new Map(e.lines.map(e=>[e.name,E(e.toks,s,r)])),scales:new Map(e.lines.map(e=>[e.name,e.scale??1]))}}function j(e){let t=/* @__PURE__ */ new Map,n=e=>{e.forEach((n,r)=>{if(o(n.key)||s(n.key))return;let i=t.get(n.key)??[],a=e[r-1];a&&a.key===n.key&&a.base===n.base&&a.stretch===n.stretch?i[i.length-1].run++:i.push({run:1,stretch:n.stretch??1}),t.set(n.key,i)})};for(let t of e.lines)n(t.toks);for(let t of e.rules.values())n(t.of?[{key:t.of,base:null}]:O(t));return t}function M(e,t,n=1){return e.kids.map(e=>{let r=e.off===null?null:(t??0)+e.off;if(o(e.key))return{key:n===1?e.key:a(e.key,n),base:r};let i=(e.stretch??1)*n;return{key:e.key,base:r,...i===1?{}:{stretch:i}}})}let N=e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}),P=(e,t)=>e.reduce((e,n)=>e+w(n,t).length+1,0);function ee(e,t){let n=e.rules.get(t),r=e=>e.flatMap(e=>e.key===t?M(n,e.base,e.stretch??1):[e]),i=/* @__PURE__ */ new Map;for(let[a,o]of e.rules)if(a!==t){if(o.of){let e=[],r=[];o.kids.forEach((i,a)=>{for(let s of i.key===t?M(n,i.off,i.stretch??1):[{key:i.key,base:i.off,...i.stretch?{stretch:i.stretch}:{}}])e.push(N(s)),r.push(o.patched[a])}),i.set(a,o.of===t?{key:a,kids:e}:{...o,kids:e,patched:r})}else i.set(a,{key:a,kids:r(O(o)).map(N)})}return{...e,lines:e.lines.map(e=>({...e,toks:r(e.toks)})),rules:i}}let te=(e,t)=>{let n=e,r=!1;for(;;){let e=j(n),i=new Map([...n.rules.keys()].map(e=>[e,`m00`])),a=null;for(let[t,r]of n.rules){let n=P(O(r),i),o=5+(r.kids.some(e=>e.off!==null)?4:0),s=r.of?22+P(O(r).filter((e,t)=>r.patched[t]),i):5+n,c=e=>e===1?n:P(M(r,0,e),i),l=(e.get(t)??[]).reduce((e,t)=>e+t.run*c(t.stretch)-o-(t.stretch>1?2:0)-(t.run>1?2:0),0)-s;l<=0&&(!a||l<a.gain)&&(a={key:t,gain:l})}if(!a)break;n=ee(n,a.key),r=!0;let o=n;t?.(()=>o)}return r?n:null},ne=[v,g,x,C,d,te],re=/* @__PURE__ */ new Map([[v,`clocks`],[g,`figures`],[C,`phrases and their variants`],[d,`pairs`],[x,`passages at another speed`],[te,`taking back what doesn’t pay`]]),F=(e,t)=>{let{defs:n,lines:r}=A(e,`m`,`pulse`,t);return[...n,...r.values()].reduce((e,t)=>e+t.length+1,0)};function ie(e,t,n,r){let a={lines:e.map(e=>({name:e.name,toks:i(e)})),rules:/* @__PURE__ */ new Map},o=a;r?.(()=>o,{tool:`start`,round:0});let s=F(a,n);for(let e=0;e<8;e++){let i=a;for(let n of t){let t={tool:re.get(n)??`a tool`,round:e+1},a=r&&(e=>r(e,t)),o=n(i,a);o&&o!==i&&(i=o,a?.(()=>o))}let o=F(i,n);if(o>=s)break;[a,s]=[i,o]}return{f:a,size:s}}function ae(e,t,{degrees:n=!1}={}){let r=n?`^`:`^$`,i=n?ne.filter(e=>e!==g):ne,a=ie(e,i,r,t),o=ie(e,i.filter(e=>e!==C),r),s=a.size<=o.size*1.15?a.f:o.f;return t?.(()=>s,{tool:`done`,round:0}),s}function oe(e){let t=/* @__PURE__ */ new Map,n=r=>{if(o(r)||s(r))return 0;let i=t.get(r);if(i!==void 0)return i;t.set(r,0);let a=e.rules.get(r),c=[...a.kids.map(e=>e.key),...a.of?[a.of]:[]],l=1+Math.max(0,...c.map(n));return t.set(r,l),l};for(let t of e.rules.keys())n(t);return t}function se(e,t){let n=e=>e.filter((n,r)=>n.key===t&&!(r>0&&e[r-1].key===t&&e[r-1].base===n.base)).length;return e.lines.reduce((e,t)=>e+n(t.toks),0)+[...e.rules.values()].reduce((e,r)=>e+n(r.of===t?[{key:t,base:null}]:O(r)),0)}function ce(e,t){let n=oe(t),r=k(t),a=new Map(r.map((e,t)=>[e,t])),o=[...r].sort((e,t)=>n.get(e)-n.get(t)||a.get(e)-a.get(t)),s=[t];for(let e of[...o].reverse())s.push(ee(s[s.length-1],e));let c=s[s.length-1],l=[{folded:{lines:e.map(e=>({name:e.name,toks:i(e)})),rules:/* @__PURE__ */ new Map},came:null,uses:0}];return(c.looks?.size||c.lines.some(e=>(e.scale??1)!==1))&&l.push({folded:c,came:null,uses:0}),o.forEach((e,t)=>{let n=s[s.length-2-t];l.push({folded:n,came:e,uses:se(n,e)})}),l}let I=(e,t)=>(e%t+t)%t,le=[`Locrian`,`Phrygian`,`Aeolian`,`Dorian`,`Mixolydian`,`Ionian`,`Lydian`].map((e,t)=>({name:e,intervals:fe(7,12,t)})),L=(e,t,n)=>he(fe(e,t,n),t),R={major:{steps:L(7,12,5),name:`Ionian`},minor:{steps:L(7,12,2),name:`Aeolian`},ionian:{steps:L(7,12,5),name:`Ionian`},dorian:{steps:L(7,12,3),name:`Dorian`},phrygian:{steps:L(7,12,1),name:`Phrygian`},lydian:{steps:L(7,12,6),name:`Lydian`},mixolydian:{steps:L(7,12,4),name:`Mixolydian`},aeolian:{steps:L(7,12,2),name:`Aeolian`},locrian:{steps:L(7,12,0),name:`Locrian`},harmonic:{steps:[2,1,2,2,1,3,1],name:`Harmonic minor`},melodic:{steps:[2,1,2,2,2,2,1],name:`Melodic minor`},pentatonic:{steps:L(5,12,0),name:`Pentatonic`},minorpentatonic:{steps:L(5,12,3),name:`Minor pentatonic`},blues:{steps:[3,2,1,1,3,2],name:`Blues`},wholetone:{steps:L(6,12,0),name:`Whole tone`}},z={locrian:0,phrygian:1,aeolian:2,minor:2,dorian:3,mixolydian:4,ionian:5,major:5,lydian:6},ue=e=>he(fe(7,12,e),12);function de(e){let t=le[e]?.name.toLowerCase()??`major`;return t===`ionian`?`major`:t===`aeolian`?`minor`:t}function fe(e,t,n=0,r){let i=r=>Math.floor((r*t+n)/e);return r===void 0?Array.from({length:e},(e,t)=>i(t)):[i(r)]}let pe={"4/4":[0,3.24,6,9.12],"3/4":[0,3.36,7.8]};function me(e,t){return[...pe[`${e}/${t}`]??Array.from({length:e},(t,n)=>n*12/e)]}function he(e,t){return e.map((n,r)=>+((r+1<e.length?e[r+1]:e[0]+t)-n).toFixed(6))}function ge(e){let t=[],n=0;for(let r of e)t.push(+n.toFixed(6)),n+=r;return{positions:t,lap:+n.toFixed(6)}}function _e(e){let t=/^([A-G])(#|b)?(-?[0-9]+)?$/.exec(e);return t?{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[t[1]]+(t[2]===`#`?1:t[2]===`b`?-1:0)+12*((t[3]===void 0?4:parseInt(t[3],10))-4):null}let ve=[`major`,`minor`,`harmonic`],ye=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],be=(e,t)=>{let n=[0];for(let t of R[e].steps.slice(0,-1))n.push(n[n.length-1]+t);return{name:e,tonic:t,positions:n}},xe=e=>`scale(${e.name}, ${ye[e.tonic]})`,Se=e=>`${ye[e.tonic]} ${e.name===`harmonic`||e.name===`melodic`?`${e.name} minor`:e.name}`;function Ce(e,t){let n=e.positions.length,r=Math.floor(t/n);return e.tonic+e.positions[t-r*n]+12*r}function we(e,t){let n=e.positions.length,r=Math.floor((t-e.tonic)/12),i=t-e.tonic-12*r,a=0;for(;a+1<n&&e.positions[a+1]<=i;)a++;let o=r*n+a,s=t-Ce(e,o);if(s===0)return{degree:o,alter:0};let c=t-Ce(e,o+1);return-c<s?{degree:o+1,alter:c}:{degree:o,alter:s}}let Te=({degree:e,alter:t})=>`${e}${t>0?`#`.repeat(t):`b`.repeat(-t)}`;function Ee(e){let t=e.flatMap(e=>e.chords.flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))));if(!t.length)return null;let n=e.flatMap(e=>e.chords.filter(e=>e.values.some(e=>Number.isInteger(Number(e))))),r=Math.max(...n.map(e=>e.at+e.dur)),i=(Math.min(...n.filter(e=>e.at+e.dur===r).flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))))%12+12)%12,a=null;for(let e of ve)for(let n=0;n<12;n++){let r=be(e,n),o=t.reduce((e,t)=>e+Math.abs(we(r,t).alter),0);(!a||o<a.cost||o===a.cost&&n===i&&a.key.tonic!==i)&&(a={key:r,cost:o})}return a.key}function De(e,t){return e.map(e=>({...e,chords:e.chords.map(e=>({...e,values:e.values.map(e=>Number.isInteger(Number(e))?Te(we(t,Number(e))):e)}))}))}let Oe=e=>e.values.map(Number).filter(e=>Number.isInteger(e));function ke(e,t,n){return e.map(e=>({...e,length:n-t,chords:e.chords.filter(e=>e.at>=t&&e.at<n).map(e=>({...e,at:e.at-t}))}))}function Ae(e,t){let n=Math.max(0,...e.map(e=>e.length)),r=Math.ceil(n/t),i=[];for(let e=0;e<12;e++)i.push(be(`major`,e),be(`harmonic`,e),be(`melodic`,e));let a=Array.from({length:r},()=>Array(i.length).fill(0));for(let n of e)for(let e of n.chords)for(let n of Oe(e)){let o=Math.min(r-1,Math.floor(e.at/t));i.forEach((e,t)=>a[o][t]+=Math.abs(we(e,n).alter))}if(!r)return[];let o=a.map(()=>Array(i.length).fill(0)),s=a.map(()=>Array(i.length).fill(0));o[0]=[...a[0]];for(let e=1;e<r;e++){let t=o[e-1],n=0;for(let e=1;e<t.length;e++)t[e]<t[n]&&(n=e);for(let r=0;r<i.length;r++){let i=t[r],c=t[n]+12;[o[e][r],s[e][r]]=i<=c?[i+a[e][r],r]:[c+a[e][r],n]}}let c=Array(r),l=0;for(let e=1;e<i.length;e++)o[r-1][e]<o[r-1][l]&&(l=e);for(let e=r-1;e>=0;e--)c[e]=l,l=s[e][l];let u=[];for(let e=0;e<r;e++){let t=u[u.length-1];t&&t.k===c[e]?t.to=e+1:u.push({from:e,to:e+1,k:c[e]})}let d=[];for(let e of u){let t=d[d.length-1];t&&(e.to-e.from<2||t.to-t.from<2)?(e.to-e.from>t.most&&([t.k,t.most]=[e.k,e.to-e.from]),t.to=e.to):d.push({...e,most:e.to-e.from})}let f=d.map(r=>{let[a,o]=[r.from*t,Math.min(n,r.to*t)],s=i[r.k];if(s.name!==`major`)return{from:a,to:o,key:s};let c=ke(e,a,o).flatMap(e=>e.chords.filter(e=>Oe(e).length)),l=e=>{let t=c.filter(t=>t.at===e);return t.length?(Math.min(...t.flatMap(Oe))%12+12)%12:null},u=c.length?[l(Math.min(...c.map(e=>e.at))),l(Math.max(...c.map(e=>e.at)))]:[],d=(s.tonic+9)%12;return{from:a,to:o,key:u.includes(d)&&!u.includes(s.tonic)?be(`minor`,d):s}}),p=e=>e.name!==`major`,m=[];for(let e of f){let t=m[m.length-1],n=t&&t.key.tonic===e.key.tonic&&(t.key.name===e.key.name||p(t.key)&&p(e.key));t&&n?m[m.length-1]={from:t.from,to:e.to,key:e.to-e.from>t.to-t.from?e.key:t.key}:m.push(e)}return m}function je(e,t,n){let r=[];for(let i of e){let e=e=>!i.chords.some(t=>t.at<e&&t.at+t.dur>e),a=t=>{for(let r=0;r<=n;r++){if(t+r<=i.length&&e(t+r))return t+r;if(t-r>=0&&e(t-r))return t-r}return null},o=[0];for(let e of t.slice(1)){let t=a(e.from);t!==null&&t>o[o.length-1]?o.push(t):o.push(o[o.length-1])}o.push(i.length),t.forEach((e,t)=>{let[n,a]=[o[t],o[t+1]];a<=n||r.push({line:i.name,section:t,part:{name:`${i.name}§${t}`,length:a-n,chords:i.chords.filter(e=>e.at>=n&&e.at<a).map(e=>({...e,at:e.at-n}))}})})}return r}function Me(e){let t=e.flatMap(e=>[[e.start,1],[e.end,-1]]);t.sort((e,t)=>e[0]-t[0]||e[1]-t[1]);let n=/* @__PURE__ */ new Map,r=0;for(let e=0;e<t.length;e++){r+=t[e][1];let i=t[e+1]?.[0]??t[e][0];n.set(r,(n.get(r)??0)+i-t[e][0])}let i=[...n.values()].reduce((e,t)=>e+t,0),a=Math.max(0,...n.keys()),o=0;for(;a>1&&o+(n.get(a)??0)<=.06*i;)o+=n.get(a--)??0;return a}function Ne(e){let t=Me(e),n=Array(e.length).fill(0);if(t<=1)return{voice:n,count:t};let r=e.map((e,t)=>t).sort((t,n)=>e[t].start-e[n].start||e[n].key-e[t].key),i=Pe(e,r,t),a=Array(t).fill(null),o=Array(t).fill(-1/0),s=Array(t).fill(0);for(let c=0;c<r.length;){let l=c,u=e[r[c]].start;for(;l<r.length&&e[r[l]].start===u;)l++;let d=r.slice(c,l),f=[...Array(t).keys()].filter(e=>o[e]<=u);for(let e of[...Array(t).keys()].filter(e=>!f.includes(e)).sort((e,t)=>o[e]-o[t])){if(f.length>=d.length)break;f.push(e)}f.sort((e,t)=>e-t);let p=d.splice(f.length),m=Fe(d.map(t=>e[t].key),f,(e,n)=>{let r=a[n]===null?7+Math.abs(e-i[n]):Math.abs(e-a[n]);for(let i=0;i<t;i++)o[i]>u&&(i<n&&s[i]<e||i>n&&s[i]>e)&&(r+=12);return r});for(let t of p){let r=m[m.length-1];n[t]=r,o[r]=Math.max(o[r],e[t].end)}d.forEach((t,r)=>{let i=m[r];n[t]=i,a[i]=e[t].key,s[i]=e[t].key,o[i]=Math.max(o[i],e[t].end)}),c=l}return{voice:n,count:t}}function Pe(e,t,n){for(let r of t){let t=e[r].start,i=e.filter(e=>e.start<=t&&e.end>t).map(e=>e.key);if(i.length>=n)return i.sort((e,t)=>t-e).slice(0,n)}let r=e.map(e=>e.key),[i,a]=[Math.max(...r),Math.min(...r)];return Array.from({length:n},(e,t)=>i-(i-a)*t/(n-1))}function Fe(e,t,n){let[r,i]=[e.length,t.length],a=Array.from({length:r+1},()=>Array(i+1).fill(1/0));for(let e=0;e<=i;e++)a[r][e]=0;for(let o=r-1;o>=0;o--)for(let s=i-(r-o);s>=0;s--)a[o][s]=Math.min(a[o][s+1],n(e[o],t[s])+a[o+1][s+1]);let o=[];for(let i=0,s=0;i<r;s++)a[i][s]===n(e[i],t[s])+a[i+1][s+1]&&(o.push(t[s]),i++);return o}let Ie=`&[A-Za-z_][A-Za-z0-9_]*`,Le=e=>e.startsWith(`"`)?e.slice(1,-1):e,Re=e=>/^\s*use(?![A-Za-z0-9_])/.test(e);function ze(e){let t=[],n=0,r=!1,i=-1;for(let a=0;a<=e.length;a++){let o=e[a];o===void 0||!r&&n===0&&/\s/.test(o)?(i>=0&&t.push({text:e.slice(i,a),at:i}),i=-1):(i<0&&(i=a),o===`"`?r=!r:!r&&`([{`.includes(o)?n++:!r&&`)]}`.includes(o)&&(n=Math.max(0,n-1)))}return t}function Be(e){if(!e.startsWith(`(`)||!e.endsWith(`)`))return null;let t=e.slice(1,-1),n=[],r=0,i=!1,a=0;for(let e=0;e<=t.length;e++){let o=t[e];o===void 0||o===`,`&&!i&&r===0?(n.push(t.slice(a,e).trim()),a=e+1):o===`"`?i=!i:!i&&`([{`.includes(o)?r++:!i&&`)]}`.includes(o)&&r--}return n.length===1&&n[0]===``?[]:n}let Ve=`${Ie}(?:=[A-Za-z_][A-Za-z0-9_]*)?`,He=RegExp(`^\\s*(\\*|${Ve}(?:\\s*,\\s*${Ve})*)(?=\\s|$)`),Ue=RegExp(`^${Ie}$`),We=/^[A-Za-z_][A-Za-z0-9_]*/,Ge=/^"[^"]*\S[^"]*"/,Ke=e=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(e),qe=/* @__PURE__ */ new Set([`off`]);function Je(e){let t=He.exec(e);if(!t)return;let n=ze(e),r=t[0].length,i=n.findIndex(e=>e.at>=r&&e.text===`from`);if(i<0)return;let a=t[1]===`*`,o=a?null:t[1].split(`,`).map(e=>e.trim().split(`=`)),s=o?.map(([e,t])=>[e,t===void 0?e:`&${t}`])??null,c=e=>new Set(e).size===e.length;if(s&&o.some(([,e])=>e!==void 0)&&!(c(s.map(([e])=>e))&&c(s.map(([,e])=>e))))return null;let l=s?[...new Map(s)]:null,u=l?l.map(([e])=>e):null,d=l?l.map(([,e])=>e):null,f=n.filter((e,t)=>e.at>=r&&t<i).map(e=>e.text);if(f.some(e=>!Ke(e)&&!qe.has(e))||a&&f.length)return null;let p=e.slice(n[i].at+4).trim();if(p===``||p.startsWith(`(`)||p.startsWith(`&`)){if(!u||f.length||d.some((e,t)=>e!==u[t]))return null;let e=ze(p),t=e[0]?.text.startsWith(`(`)?Be(e[0].text):[];if(t===null||t.some(e=>!Ue.test(e)))return null;let n=e.slice(+!!e[0]?.text.startsWith(`(`));return n.length>1||n[0]&&!Ue.test(n[0].text)?null:{kind:`signature`,names:u,optional:[...new Set(t)],main:n[0]?.text??null}}let m=(Ge.exec(p)??We.exec(p))?.[0];if(!m)return null;let h=p.slice(m.length),g=null;if(/^\s*\(/.exec(h)){let e=ze(h.trimStart())[0].text,t=Be(e);if(!t)return null;g=[];for(let e of t){let t=/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S[\s\S]*)$/.exec(e);if(!t||g.some(e=>e.name===t[1]))return null;g.push({name:t[1],value:t[2].trim()})}h=h.trimStart().slice(e.length)}else if(h&&!/^\s/.test(h))return null;let _=h.trim();return{kind:`use`,id:Le(m),names:u,takes:d,head:f,args:g,main:_||null}}let Ye=`A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, &kick=bd from gm_kit (the piece’s &kick, the kit’s bd), * from gm_kit; the head’s attributes go before from (&key label="…" from …), the named arguments in parentheses; with no id, a fragment’s signature: &bar from (&swing) &tempo`;function Xe(e){let t=!1;for(let n=0;n<e.length;n++){let r=e[n];if(r===`"`)t=!t;else if(!t&&(r===`/`&&e[n+1]===`/`||r===`#`&&(n===0||/\s/.test(e[n-1]))))return[e.slice(0,n),e.slice(n)]}return[e,``]}let Ze=(e,t,n,r)=>({name:e,range:t,label:n,ends:r,sentence:`${r[0][0].toUpperCase()}${r[0].slice(1)} (${t[0]}) to ${r[1]} (${t[1]}).`}),B=[Ze(`sync`,[0,1],`Syncopation`,[`on the beat`,`offbeat`]),Ze(`harm`,[0,1],`Harmony`,[`static`,`moving`]),Ze(`bite`,[0,1],`Bite`,[`paddy`,`stabby`]),Ze(`mood`,[0,1],`Mood`,[`darker`,`brighter`])],Qe={lydian:1,ionian:.875,mixolydian:.75,dorian:.5,harmonic_minor:.375,aeolian:.25,phrygian:.125,locrian:0},$e=(e,t=.25)=>Math.round((.6*Qe[e]+.4*(1-t))*1e6)/1e6,et=B.map(e=>e.name),tt={adsr:[`attack`,`decay`,`sustain`,`release`],style:et},nt=`style`,rt=B.map(e=>(e.range[0]+e.range[1])/2),it=[`sync`,`harm`,`artic`,`energy`],at=[{mode:`aeolian`,point:{sync:.3,harm:.45,artic:.55,energy:.55}},{mode:`aeolian`,point:{sync:.12,harm:0,artic:1,energy:.8}},{mode:`aeolian`,point:{sync:.5,harm:.75,artic:.35,energy:.5}},{mode:`dorian`,point:{sync:.35,harm:.55,artic:.65,energy:.65}},{mode:`dorian`,point:{sync:1,harm:.12,artic:.85,energy:.75}},{mode:`ionian`,point:{sync:.05,harm:.3,artic:0,energy:.2}},{mode:`ionian`,point:{sync:.75,harm:.85,artic:.45,energy:.45}},{mode:`ionian`,point:{sync:.35,harm:1,artic:.3,energy:.6}},{mode:`ionian`,point:{sync:.1,harm:.12,artic:.5,energy:.35}},{mode:`mixolydian`,point:{sync:.875,harm:.485,artic:.65,energy:.6}},{mode:`phrygian`,point:{sync:.6,harm:.6,artic:.7,energy:.85}},{mode:`lydian`,point:{sync:.15,harm:.6,artic:.15,energy:.3}},{mode:`locrian`,point:{sync:.9,harm:1,artic:.6,energy:.9}},{mode:`ionian`,point:{sync:.383,harm:.717,artic:.25,energy:.417}},{mode:`harmonic_minor`,point:{sync:.55,harm:.75,artic:.6,energy:.75}},{mode:`harmonic_minor`,point:{sync:.2,harm:.9,artic:.3,energy:.35}}],ot=e=>Math.round(e*1e6)/1e6,st=e=>String(ot(e)).replace(/^0\./,`.`),ct=(e,t)=>it.reduce((n,r)=>n+(e[r]-t[r])**2,0);function lt(e){return at.reduce((t,n)=>ct(e,n.point)<ct(e,t.point)?n:t).mode}let ut=[{id:`synthPop`,mood:.5,point:{sync:.3,harm:.45,artic:.55,energy:.55}},{id:`techno`,mood:.4,point:{sync:.12,harm:0,artic:1,energy:.8}},{id:`deepHouse`,mood:.65,point:{sync:.35,harm:.55,artic:.65,energy:.65}},{id:`ambient`,mood:.9,point:{sync:.05,harm:.3,artic:0,energy:.2}},{id:`lofi`,mood:.5,point:{sync:.5,harm:.75,artic:.35,energy:.5}},{id:`funk`,mood:.65,point:{sync:1,harm:.12,artic:.85,energy:.75}},{id:`bossaNova`,mood:.9,point:{sync:.75,harm:.85,artic:.45,energy:.45}},{id:`swingJazz`,mood:.85,point:{sync:.35,harm:1,artic:.3,energy:.6}},{id:`electroSwing`,mood:.5,point:{sync:.55,harm:.75,artic:.6,energy:.75}},{id:`spooky`,mood:.3,point:{sync:.2,harm:.9,artic:.3,energy:.35}},{id:`kinderlied`,mood:.95,point:{sync:.1,harm:.12,artic:.5,energy:.35}}];function dt(e){let t=ut.reduce((t,n)=>ct(e,n.point)<ct(e,t.point)?n:t);return Math.sqrt(ct(e,t.point)/it.length)<=.150000001?t.mood:$e(lt(e))}function ft(e,t){let n=t,r=()=>{if(e.startsWith(`free(`,n)){let t=0;for(;n<e.length;n++)if(e[n]===`(`)t++;else if(e[n]===`)`&&--t===0)return void n++;return}let t=/&?\(?[A-Za-z0-9_.\-[\]$]+/y;t.lastIndex=n,t.test(e)&&(n=t.lastIndex)};for(r();;){let t=/\s*(\.\.|\*|±|\+-)\s*/y;if(t.lastIndex=n,!t.test(e))return n;n=t.lastIndex,r()}}let pt=e=>parseFloat(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/.exec(e)?.[0]??`0.5`),mt=e=>/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(e);function ht(e){let t=/* @__PURE__ */ new Map;for(let n of it){let r=RegExp(`(^|\\s)${n}=`).exec(e);if(!r)continue;let i=r.index+r[1].length,a=ft(e,i+n.length+1);t.set(n,{at:i,end:a,value:e.slice(i+n.length+1,a)})}if(t.has(`artic`)||t.has(`energy`)){if(!it.every(e=>t.has(e)))return null;let n=e=>t.get(e).value,r=Object.fromEntries(it.map(e=>[e,pt(n(e))])),i=n(`artic`),a=st(dt(r)),[o,s]=[t.get(`artic`),t.get(`energy`)];return[{at:o.at,end:o.end,to:`bite=${i}`},{at:s.at,end:s.end,to:`mood=${a}`}].sort((e,t)=>t.at-e.at).reduce((e,t)=>e.slice(0,t.at)+t.to+e.slice(t.end),e)}let n=/^\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)(?=\s*(?:$|\)|\s+[a-z]+=))/.exec(e);if(!n||!n.slice(1).every(e=>mt(e)||e.startsWith(`free(`)))return null;let[r,i,a,o]=n.slice(1),s={sync:pt(r),harm:pt(i),artic:pt(a),energy:pt(o)};return` sync=${r} harm=${i} bite=${a} mood=${st(dt(s))}${e.slice(n[0].length)}`}function gt(e){let t=e.replace(/\[(artic|energy)\]/g,`[bite]`),n=[...t.matchAll(/map=style(?=\s)/g)].map(e=>e.index+9).reverse();for(let e of n){let n=t.lastIndexOf(`&(`,e)>t.lastIndexOf(`)`,e)&&t.lastIndexOf(`&(`,e)>=0?_t(t,t.lastIndexOf(`&(`,e)+1):-1,r=n>=0?n:t.length,i=ht(t.slice(e,r));i!==null&&(t=t.slice(0,e)+i+t.slice(r))}return t===e?null:t}function _t(e,t){let n=0;for(let r=t;r<e.length;r++)if(e[r]===`(`)n++;else if(e[r]===`)`&&--n===0)return r;return e.length}function V(e){return e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>V(e.atom))):[e]}function vt(e){return e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>[e,...vt(e.atom)])):[]}function yt(e,t){return e.kind===`seq`?{...e,layers:e.layers.map(e=>e.map(e=>({...e,atom:yt(e.atom,t)})))}:t(e)}function bt(e,t){let n=e.atom,r=n.kind===`seq`?n.layers.reduce((e,n)=>e+n.reduce((e,n)=>e+bt(n,t),0),0)*(n.euclid?.k??1):t(n);return e.repeat*e.subdivide*r}let xt=1e-9,St=e=>Math.floor(e+xt),Ct=(e,t)=>(e%t+t)%t,wt=(e,t)=>t===0?e:wt(t,e%t),Tt=(e,t)=>e/wt(e,t)*t;function Et(e,t){let[n,r,i,a]=[Ct(e,t),t,1,0];for(;r!==0;){let e=Math.floor(n/r);[n,r,i,a]=[r,n-e*r,a,i-e*a]}return Ct(i,t)}let Dt=e=>e.reduce((e,t)=>e+t.elongate*t.repeat,0);function Ot(e){if(e.kind!==`seq`)return 1;let t=t=>t.reduce((e,t)=>Tt(e,Ot(t.atom)),1)*(e.mode===`alt`?Dt(t):1);return e.layers.reduce((e,n)=>Tt(e,t(n)),1)*(e.slow??1)}let kt=(e,t,n)=>[{atom:e,at:t,dur:n,of:1,is:0,chances:[],picks:[]}];function At(e,t,n,r){return e.map(e=>{let i=t*(e.is+(e.at-n)/r),a=St(i),o=e.of*t;return{...e,at:n+Math.max(0,i-a)*r,dur:e.dur*t,of:o,is:Ct(a,o),picks:e.picks.map(i=>{let o=t*(e.is+i.lap+(i.at-n)/r)-a,s=St(o);return{...i,lap:s,at:n+Math.max(0,o-s)*r}})}})}function jt(e,t,n,r){let i=[];for(let a of t.hits){let o=a/t.n;for(let a of e){let e=(a.at-n)/r,s=a.dur/r;for(let c=0;c<e+s;c++)e<=c+o+xt&&c+o<e+s-xt&&i.push({...a,at:n+o*r,dur:r/t.n,is:Ct(a.is+c,a.of),picks:a.picks.map(e=>({...e,lap:e.lap-c}))})}}return i}function Mt(e,t,n,r,i,a){if(e.kind!==`seq`)return a(e,t,n).map(e=>({...e,chances:[...i.chances,...e.chances],...Nt(i.level,e.level)}));let o=e.layers.flatMap((o,s)=>{let c=Dt(o),l=[],u=0;return o.forEach((e,o)=>{l.push(...Pt(e,t+u*n/c,e.elongate*n/c,`${r}/${s}.${o}`,i,a)),u+=e.elongate*e.repeat}),e.mode===`alt`?At(l,c,t,n):e.mode===`choose`?l.map(n=>({...n,picks:[...n.picks,{id:r,of:e.layers.length,is:s,lap:0,at:t}]})):l});return e.euclid&&(o=jt(o,e.euclid,t,n)),e.slow&&e.slow>1&&(o=At(o,e.slow,t,n)),o}let Nt=(e,t)=>{let n=t===void 0?e:e===void 0?t:t*e;return n===void 0?{}:{level:n}};function Pt(e,t,n,r,i,a){let o={chances:e.chance===void 0?i.chances:[...i.chances,e.chance],level:e.level===void 0?i.level:e.level*(i.level??1)},s=e.subdivide,c=n/s,l=[];for(let i=0;i<e.repeat;i++)for(let u=0;u<s;u++){let d=t+i*n+u*c;for(let t of Mt(e.atom,d,c,r,o,a)){if(s===1||t.of===1&&!t.picks.length){l.push(t);continue}let e=wt(s,t.of);if(Ct(t.is-u,e)!==0)continue;let n=t.of/e,r=n===1?0:Ct((t.is-u)/e*Et(s/e,n),n);l.push({...t,of:n,is:r,picks:t.picks.map(e=>{let t=u+e.lap;return{...e,lap:Math.floor(t/s),at:e.at+(Ct(t,s)-u)*c}})})}}return l}function Ft(e,t){if(e.kind!==`seq`)return t(e);if(!e.bare)return 1;let n=e.layers[0][0];return Ft(n.atom,t)*n.elongate}function It(e,t,n,r=``){let i=[],a=0;return e.forEach((e,o)=>{let s=Ft(e.atom,t)*e.elongate;for(let t of Pt(e,a,s,`${r}${o}`,{chances:[],level:void 0},n))i.push({atom:t.atom,at:t.at,dur:t.dur,chances:t.chances,top:o,...t.level===void 0?{}:{level:t.level},...t.of>1?{laps:{of:t.of,is:t.is}}:{},...t.picks.length?{chosen:t.picks}:{}});a+=s*e.repeat}),i}let Lt=(e,t)=>It(e,t,kt),Rt=[`over`,`shift`,`step`,`map`,`stride`,`cycle`,`env`,`pitch`,`show`,`chance`,`seed`,`size`],zt=e=>e.flatMap(e=>e.repeat>1?Array.from({length:e.repeat},()=>({...e,repeat:1})):[e]);function Bt(e,t){let n=t.transpose??0,r=t.degree??0;if(!n&&!r)return e;let i=n+r;switch(e.kind){case`seq`:return yt(e,e=>Bt(e,t));case`note`:return{...e,value:e.value+i};case`chord`:return{...e,notes:e.notes.map(e=>e+i)};case`choice`:return{...e,values:e.values.map(e=>e+i)};case`ref`:return n?{...e,transpose:(e.transpose??0)+n}:{...e,values:{mul:e.values?.mul??1,add:(e.values?.add??0)+r*(e.values?.mul??1)}};default:return e}}function Vt(e){if(!e.cells.some(e=>e.base||Ut(e)||Ht(e)))return e;let t=new Map(e.cells.map(e=>[e.name,e])),n=[...e.diagnostics],r=/* @__PURE__ */ new Map,i=/* @__PURE__ */ new Set,a=(e,t)=>n.push({severity:`error`,message:t,span:e.base?.span??e.span}),o=e=>{let s=r.get(e.name);if(s)return s;let c=e;if(e.base){let n=t.get(e.base.name);n?i.has(e.name)?a(e,`base=&${e.base.name} comes round to &${e.name} itself`):(i.add(e.name),c=Wt(e,o(n),e.base,t=>a(e,t)),i.delete(e.name)):c=e}else Ut(e)&&n.push({severity:`error`,message:`= keeps a step of the base: only in a cell with base= (&${e.name} base=&other = 4 =)`,span:e.span});return Ht(e)&&n.push({severity:`error`,message:`= keeps a whole step of the base, not part of one: write it outside brackets (&${e.name} base=&other = [0 2])`,span:e.span}),r.set(e.name,c),c};return{...e,cells:e.cells.map(o),diagnostics:n}}let Ht=e=>e.braid.kind===`list`&&e.braid.tokens.some(e=>vt(e.atom).some(e=>e.atom.kind===`rest`&&e.atom.keep)),Ut=e=>e.braid.kind===`list`&&e.braid.tokens.some(e=>e.atom.kind===`rest`&&e.atom.keep);function Wt(e,t,n,r){let i={};for(let n of Rt)e[n]==null&&t[n]!=null&&(i[n]=t[n]);let a={...t.params,...e.params},o={...t.paramSpans,...e.paramSpans},s=t.paramCells||e.paramCells?{...t.paramCells,...e.paramCells}:void 0,c=t.paramClocks||e.paramClocks?{...t.paramClocks,...e.paramClocks}:void 0;n.transpose&&(e.over??t.over)&&r(`base=&${n.name}^$${n.transpose}: a cell that reads a table moves by its degrees (^n), not yet by grid steps`);let l=e.braid;if(t.braid.kind===`list`){let i=zt(t.braid.tokens),a=e.braid.kind===`list`?zt(e.braid.tokens):[],o=[];for(let e=0;e<Math.max(i.length,a.length);e++){let s=i[e],c=a[e];if(!(!c||c.atom.kind===`rest`&&c.atom.keep)){o.push(c);continue}if(!s){r(`= past the end of &${t.name} (${i.length} steps): nothing to keep`);continue}let l=Bt(s.atom,n);o.push(c&&c.elongate!==1?{...s,atom:l,elongate:c.elongate}:{...s,atom:l})}l={kind:`list`,tokens:o,...t.braid.perBeat!==void 0&&o.length===i.length?{perBeat:t.braid.perBeat,...t.braid.signature?{signature:t.braid.signature}:{}}:{}}}else e.braid.kind===`blank`?l=t.braid:Ut(e)&&r(`&${t.name} is a ${t.braid.kind}(…), not a braid: = keeps steps of a braid`);return{...e,...i,params:a,paramSpans:o,...s?{paramCells:s}:{},...c?{paramClocks:c}:{},braid:l}}let Gt=e=>{if(!e)return``;let t=e.abs?`$`:``;return e.kind===`at`?`[${t}${e.i}]`:`[${t}${e.from??``}:${e.to??``}${e.step?`:${e.step}`:``}]`},Kt=e=>e===0?``:`[${e<0?`<<`:`>>`}${Math.abs(e)===1?``:Math.abs(e)}]`,qt=e=>(e.slot?`[${e.slot}]`:Gt(e.pick)||Kt(e.shift))+(e.degree?`^${e.degree}`:``)+(e.transpose?`^$${e.transpose}`:``),Jt=e=>!!(e.label||e.title)&&e.braid.kind===`blank`&&e.over===null&&e.step===null&&e.map===null&&e.cycle===null&&e.shift===null&&e.stride===null&&!e.off&&!e.frees?.length&&!e.env&&!e.pitch&&Object.keys(e.params).length===0,Yt=/^(`{3,})([^`]*)$/;function Xt(e,t){let n=[],r=[],i=[],a=[],o=t;for(;o<e.length;){let t=e[o],s=Yt.exec(t),c=s?e.findIndex((e,t)=>t>o&&/^`{3,}\s*$/.test(e)&&e.trim().length>=s[1].length):-1;if(s&&s[2].trim()===`cells`){if(c<0)return{problems:[{line:o+1,message:"the ```cells block is never closed (a line ```)"}]};a.push(t),r.push(a),a=[];let s=e.slice(o+1,c);s.forEach((e,t)=>i.push({block:n.length,line:o+2+t})),n.push(s),a.push(e[c]),o=c+1}else if(s){let t=c<0?e.length-1:c;a.push(...e.slice(o,t+1)),o=t+1}else a.push(t),o++}if(!n.length)return{problems:[{line:Math.max(t,1),message:"no ```cells block after the frontmatter"}]};let s=a.slice(1);r.push(a.slice(0,1));let c=s.join(`
`).replace(/^\s*\n/,``).trimEnd();return{text:n.flat().join(`
`),map:i,layout:{blocks:n,gaps:r},head:e.slice(0,t),tail:s,prose:c,raw:!1}}var H=class extends Error{line;constructor(e,t){super(t),this.line=e}};let Zt=/^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,Qt=/^([-+]?0x[0-9a-fA-F]+|[-+]?0o[0-7]+|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN))$/,$t=/^(null|Null|NULL|~)$/,en=/^(true|True|TRUE)$/,tn=/^(false|False|FALSE)$/,nn=/^[-?:,[\]{}#&*!|>'"%@`]/,rn=e=>e!==``&&!nn.test(e)&&!/: |:$| #|^\s|\s$/.test(e)&&!/^[0-9]+$/.test(e)&&!/[\n\r\t]/.test(e);function an(e,t,n){let[r]=e;if(r===`&`||r===`*`)throw new H(t,`an ${r===`&`?`anchor`:`alias`} (${e}): the subset has none; write the value out`);if(r===`!`)throw new H(t,`a tag (${e}): the subset has none`);if(r===`|`||r===`>`)throw new H(t,`a block scalar (${r}): write the text on one line, quoted, with \\n`);if(r===`{`||r===`[`)throw new H(t,`flow style beyond [a, b] (${e}): write the map or the list as a block`);if(/^([-?:]( |$)|[%@`,\]}])/.test(e))throw new H(t,`${r} can't start a plain value: quote it`);if(r===`#`||e.includes(` #`))throw new H(t,`a comment: the subset has none; say it in the prose or under a key`);if(/: |:$/.test(e))throw new H(t,`a colon and a space in a plain value (${e}): quote it`);if(n&&/[[\]{},]/.test(e))throw new H(t,`flow style beyond [a, b] (${e}): quote an item that holds , [ ] { }`);if($t.test(e))return null;if(en.test(e))return!0;if(tn.test(e))return!1;if(Zt.test(e))return Number(e);if(Qt.test(e))throw new H(t,`a number the subset doesn't read (${e}): write it in decimal, or quote it`);return e}function on(e,t){if(e[0]===`'`){let t=``;for(let n=1;n<e.length;n++)if(e[n]!==`'`)t+=e[n];else if(e[n+1]===`'`)t+=e[n++];else return{value:t,length:n+1}}else for(let n=1;n<e.length;n++)if(e[n]===`\\`)n++;else if(e[n]===`"`)try{return{value:JSON.parse(e.slice(0,n+1)),length:n+1}}catch{throw new H(t,`an escape the subset doesn't read in ${e.slice(0,n+1)}: it reads JSON's (\\" \\\\ \\n \\t \\uXXXX …)`)}throw new H(t,`a quoted string that isn't closed on its line (${e})`)}function sn(e,t){if(e===`{}`)return{kind:`map`,line:t,entries:[]};if(e[0]===`"`||e[0]===`'`){let{value:n,length:r}=on(e,t);if(e.slice(r).trim())throw new H(t,`text after a quoted string (${e.slice(r).trim()})`);return{kind:`scalar`,line:t,value:n}}if(e[0]===`[`&&e.endsWith(`]`)){let n=[],r=e.slice(1,-1).trim();for(;r;){let i;if(r[0]===`"`||r[0]===`'`){let e=on(r,t);i=e.value,r=r.slice(e.length).trim()}else{let n=r.indexOf(`,`),a=(n<0?r:r.slice(0,n)).trim();if(!a)throw new H(t,`an empty item in ${e}`);i=an(a,t,!0),r=n<0?``:r.slice(n)}if(n.push({kind:`scalar`,line:t,value:i}),r&&r[0]!==`,`)throw new H(t,`a list item followed by ${r[0]}, not a comma`);if(r=r.slice(1).trim(),!r&&e.slice(1,-1).trim().endsWith(`,`))throw new H(t,`an empty item at the end of ${e}`)}return{kind:`list`,line:t,items:n}}return{kind:`scalar`,line:t,value:an(e,t,!1)}}function cn(e,t=1){let n=[];try{if(e.split(`
`).forEach((e,r)=>{let i=t+r;if(!e.trim())return;let a=e.length-e.trimStart().length;if(e.slice(0,a).includes(`	`))throw new H(i,`a tab in an indent: indent with spaces`);let o=e.trim();if(/^(---|\.\.\.)(\s|$)/.test(o))throw new H(i,`a second document (${o}): the frontmatter is one`);if(o[0]===`%`)throw new H(i,`a directive (${o}): the subset has none`);if(o[0]===`#`)throw new H(i,`a comment: the subset has none; say it in the prose or under a key`);n.push({line:i,indent:a,text:o})}),!n.length)return{node:{kind:`map`,line:t,entries:[]}};let r=0,i=e=>e.text===`-`||e.text.startsWith(`- `),a=e=>i(n[r])?s(e):c(e),o=(e,t,o,c)=>{let l=n[r];if(e){if(l&&l.indent>o)throw new H(l.line,`a value over two lines, or indented under a value: the subset reads a value on one line`);return sn(e,t)}return l&&l.indent>o?a(l.indent):l&&c&&l.indent===o&&i(l)?s(o):{kind:`scalar`,line:t,value:null}},s=e=>{let t=[],s=n[r].line;for(;r<n.length&&n[r].indent===e&&i(n[r]);){let i=n[r],s=i.text.slice(1).trimStart(),c=e+i.text.length-s.length;s&&(/^-( |$)/.test(s)||/^[^"'[{][^]*?(: |:$)/.test(s))?(n[r]={line:i.line,indent:c,text:s},t.push(a(c))):(r++,t.push(o(s,i.line,e,!1)))}return{kind:`list`,line:s,items:t}},c=e=>{let t=[],a=n[r].line;for(;r<n.length&&n[r].indent===e;){let{line:a,text:s}=n[r];if(i(n[r]))throw new H(a,`a list item where a key was expected`);if(s[0]===`?`)throw new H(a,`a complex key (?): keys are plain words`);let c=s.search(/: |:$/);if(c<0)throw new H(a,`no key: a line in a map is \`key: value\` (${s})`);let l=s.slice(0,c);if(l[0]===`"`||l[0]===`'`)throw new H(a,`a quoted key (${l}): keys are plain words`);if(/^[0-9]+$/.test(l))throw new H(a,`a key that is a number (${l}): keys are words`);if(!rn(l))throw new H(a,`a key the subset doesn't read (${l}): keys are plain words`);if(t.some(e=>e.key===l))throw new H(a,`the key ${l} is given twice`);r++,t.push({key:l,line:a,value:o(s.slice(c+1).trim(),a,e,!0)})}return{kind:`map`,line:a,entries:t}},l=a(n[0].indent);if(r<n.length)throw new H(n[r].line,`indented as no key above it is`);return{node:l}}catch(e){if(e instanceof H)return{problems:[{line:e.line,message:e.message}]};throw e}}function ln(e){return e.kind===`scalar`?e.value:e.kind===`list`?e.items.map(ln):Object.fromEntries(e.entries.map(e=>[e.key,ln(e.value)]))}let un=/* @__PURE__ */ new Map([[`creeping bass`,`creeping_bass`],[`walking bass`,`walking_bass`],[`eighths bass`,`eighths_bass`],[`funk bass`,`funk_bass`],[`pumping bass`,`pumping_bass`],[`root bass`,`root_bass`],[`tiptoe bass`,`tiptoe_bass`],[`lead performer`,`lead_performer`],[`stab performer`,`stab_performer`],[`pad performer`,`pad_performer`],[`drums performer`,`drums_performer`],[`bass performer`,`bass_performer`],[`Charleston stabs`,`charleston_stabs`],[`Synth-pop drums`,`synth_pop_drums`],[`Funk drums`,`funk_drums`],[`Spooky drums`,`spooky_drums`],[`Lo-fi hip hop drums`,`lo_fi_hip_hop_drums`],[`Ghost drums`,`ghost_drums`],[`rumba clave 3-2`,`rumba_clave_3_2`],[`bossa nova clave`,`bossa_nova_clave`],[`Techno drums`,`techno_drums`],[`Kinderlied drums`,`kinderlied_drums`],[`Bossa nova drums`,`bossa_nova_drums`],[`Deep house drums`,`deep_house_drums`],[`son clave 3-2`,`son_clave_3_2`],[`Swing jazz drums`,`swing_jazz_drums`],[`son clave 2-3`,`son_clave_2_3`],[`bossa nova clave (one bar)`,`bossa_nova_clave_one_bar`],[`Ambient drums`,`ambient_drums`],[`Electro swing drums`,`electro_swing_drums`],[`7/8`,`meter(grouping=meter("7/8"))`],[`4/4 leaning lightly on 16n`,`meter(swing=16n:.6)`],[`4/4 leaning faintly on 16n`,`meter(swing=16n:31/60)`],[`3/4`,`meter(grouping=meter("3/4"))`],[`6/8`,`meter(grouping=meter("6/8"))`],[`4/4 alla breve`,`meter(grouping=meter("2/2", 2))`],[`4/4 swung on 8n`,`meter(swing=8n:2/3)`],[`10/8`,`meter(grouping=meter("10/8"))`],[`2/4`,`meter(grouping=meter("2/4"))`],[`4/4`,`meter`],[`12/8`,`meter(grouping=meter("12/8"))`],[`5/4`,`meter(grouping=meter("5/4"))`],[`4/4 leaning on 16n`,`meter(swing=16n:.65)`],[`vamp to the seventh`,`vamp_to_the_seventh`],[`vamp to the fifth`,`vamp_to_the_fifth`],[`vamp to the sixth`,`vamp_to_the_sixth`],[`tonic vamp`,`tonic_vamp`],[`vamp to the fourth`,`vamp_to_the_fourth`],[`haunted progression`,`haunted_progression`],[`dark cadence`,`dark_cadence`],[`muted trumpet`,`muted_trumpet`],[`round bass`,`round_bass`],[`haunted pad`,`haunted_pad`],[`brass stab`,`brass_stab`],[`upright bass`,`upright_bass`],[`bell and scale`,`bell_and_scale`],[`harmonic minor`,`harmonic_minor`],[`rounded binary`,`rounded_binary`],[`call and answer`,`call_and_answer`],[`meter_7_8`,`meter(grouping=meter("7/8"))`],[`meter_4_4_leaning_lightly_on_16n`,`meter(swing=16n:.6)`],[`meter_4_4_leaning_faintly_on_16n`,`meter(swing=16n:31/60)`],[`meter_3_4`,`meter(grouping=meter("3/4"))`],[`meter_6_8`,`meter(grouping=meter("6/8"))`],[`meter_4_4_alla_breve`,`meter(grouping=meter("2/2", 2))`],[`meter_4_4_swung_on_8n`,`meter(swing=8n:2/3)`],[`meter_10_8`,`meter(grouping=meter("10/8"))`],[`meter_2_4`,`meter(grouping=meter("2/4"))`],[`meter_4_4`,`meter`],[`meter_12_8`,`meter(grouping=meter("12/8"))`],[`meter_5_4`,`meter(grouping=meter("5/4"))`],[`meter_4_4_leaning_on_16n`,`meter(swing=16n:.65)`],[`aeolian`,`diatonic(mode=aeolian)`],[`dorian`,`diatonic(mode=dorian)`],[`ionian`,`diatonic(mode=ionian)`],[`mixolydian`,`diatonic(mode=mixolydian)`],[`phrygian`,`diatonic(mode=phrygian)`],[`lydian`,`diatonic(mode=lydian)`],[`locrian`,`diatonic(mode=locrian)`]]),dn=new Map([`twinkle`,`wonder`,`haenschen`,`hinein`,`heim`,`weinet`].map(e=>[e,{document:`kinderlied`,head:e}])),fn=/* @__PURE__ */ new Map([[`bass`,[`style`]],[`keys`,[`style`]],[`pad`,[`style`]],[`lead`,[`style`]],[`bass_performer`,[`bassV`,`style`]],[`pad_performer`,[`padV`,`style`]],[`stab_performer`,[`keysV`,`style`]],[`lead_performer`,[`leadV`,`style`]],[`band`,[`drumlines`,`bassline`,`padline`,`stabline`,`leadline`,`bassLevel`,`padLevel`,`stabLevel`,`leadLevel`,`style`]],[`synth_pop_drums`,[`bd`,`sd`,`hh`]],[`techno_drums`,[`bd`,`sd`,`hh`,`oh`]],[`deep_house_drums`,[`bd`,`sd`,`hh`]],[`ambient_drums`,[`bd`,`sd`,`hh`]],[`lo_fi_hip_hop_drums`,[`bd`,`rim`,`sd`,`hh`]],[`funk_drums`,[`bd`,`rim`,`sd`,`hh`,`oh`]],[`bossa_nova_drums`,[`bd`,`rim`,`sd`,`hh`]],[`swing_jazz_drums`,[`bd`,`sd`,`ph`,`rd`]],[`son_clave_3_2`,[`claves`]],[`son_clave_2_3`,[`claves`]],[`rumba_clave_3_2`,[`claves`]],[`bossa_nova_clave`,[`claves`]],[`bossa_nova_clave_one_bar`,[`claves`]],[`cinquillo`,[`claves`]],[`electro_swing_drums`,[`bd`,`sd`,`cp`,`hh`,`oh`]],[`spooky_drums`,[`bd`,`rim`,`rd`]],[`ghost_drums`,[`bd`,`rim`,`rd`]],[`kinderlied_drums`,[`bd`,`sd`,`hh`]],[`acid_drums`,[`bd`,`cp`,`hh`,`oh`]],[`happy_hardcore_drums`,[`bd`,`cp`,`hh`]],[`elektro_drums`,[`bd`,`sd`,`hh`]],[`industrial_drums`,[`bd`,`hh`]]]),pn=(e,t,n)=>`${JSON.stringify(e)} reads ${t.map(e=>`&${e}`).join(`, `)} by name no longer: pass ${t.length>1?`them`:`it`}, ${n} (Migrate writes it, decision 075)`,mn=(e,t)=>e.map(e=>({...e,origin:[t,...e.origin??[]]})),hn=/^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/,gn=/&([A-Za-z_][A-Za-z0-9_]*)/g,_n=/[+*,[]\s*$/;function vn(e){let t=[],n=null;return e.split(`
`).forEach((e,r)=>{let i=Xe(e)[0];if(n??={written:[],code:[],line:r+1},n.written.push(e),n.code.push(i),_n.test(i))return;let a=n.code.join(` `).trim().split(/\s+/).join(` `);a&&t.push(yn(a,n.written.join(`
`),n.line)),n=null}),t}function yn(e,t=e,n=0){let r=Je(e);if(r!==void 0)return{name:null,from:r,reads:[],written:t,code:e,line:n};let i=hn.exec(e),a=i?[...new Set([...e.slice(i[0].length).matchAll(gn)].map(e=>e[1]))]:[];return{name:i?.[1]??null,reads:a,written:t,code:e,line:n}}function bn(e,t){let n=vn(e),r=n.flatMap(e=>e.from?.kind===`signature`?[{line:e,sig:e.from}]:[]),i=r.find(e=>e.sig.names.includes(`&${t}`));if(!i)return null;if(r.length===1)return e;let{line:a,sig:o}=i,s=o.main?o.main.slice(1):null,c=/* @__PURE__ */ new Map;for(let e of n)if(e.name)c.set(e.name,e);else if(e.from?.kind===`use`)for(let t of e.from.names??[])c.set(t.slice(1),e);let l=e=>e.from?.kind===`use`?[...e.code.slice(e.code.search(/\sfrom\s/)).matchAll(gn)].map(e=>e[1]):e.reads,u=/* @__PURE__ */ new Set,d=/* @__PURE__ */ new Set;for(let e=[...o.names,...o.optional].map(e=>e.slice(1));e.length;){let t=e.shift();if(d.has(t)||t===s)continue;d.add(t);let n=c.get(t);n&&!u.has(n)&&(u.add(n),e.push(...l(n)))}return[a.written.trim(),...n.filter(e=>u.has(e)).map(e=>e.written)].join(`
`)}let xn=e=>vn(e).flatMap(e=>e.from?.kind===`signature`?[e.from.names.map(e=>e.slice(1))]:[]);function Sn(e,t,n,r){let i=xn(t);if(i.length<2)return{text:t};let a=i.map(e=>e.map(e=>`&${e}`).join(`, `)).join(` · `),o=(n.takes??n.names)?.[0]?.slice(1);if(!o)return r(`${U(e)} gives ${i.length} parts, each taken by its head (${a}): name one, not *`),null;let s=bn(t,o);return s===null?(r(`${U(e)} gives no part headed &${o}: its parts are ${a}`),null):{text:s,part:o}}let Cn=e=>/^\s*(?:\*|&[A-Za-z_][A-Za-z0-9_]*)(?=[\s,=]).*\sfrom(?:\s|$)/m.test(e);function wn(e){for(let t of vn(e))if(t.from?.kind===`signature`)return t.from;return null}function Tn(e){let t=2166136261,n=1523705862;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,16777619),n=Math.imul(n^i,16777619)^n>>>15}return(t>>>0).toString(16).padStart(8,`0`)+(n>>>0).toString(16).padStart(8,`0`)}let En=e=>`e1:${Tn(vn(e).map(e=>e.code).join(`
`))}`,U=e=>JSON.stringify(e),Dn=e=>e.map(U).join(` → `);function On(e,t,n,r){let i=new Set(e.flatMap(e=>e.name?[e.name]:[])),a=new Set(e.flatMap(e=>e.reads)),o=/* @__PURE__ */ new Map,s=e.filter(e=>e.name);return{lines:s,per:t.map(({id:e,names:t,lines:c,resolved:l},u)=>{let d=/* @__PURE__ */ new Map;for(let e of c)e.name&&!d.has(e.name)&&d.set(e.name,e);if(t&&l){let r=[...t].filter(e=>!d.has(e));for(let t of r)n(u,`&${t} is not in ${U(e)}: it defines ${[...d.keys()].map(e=>`&${e}`).join(`, `)}`)}let f=/* @__PURE__ */ new Set;if(!t)for(let e=!0;e;){e=!1;for(let t of d.keys()){if(i.has(t)||f.has(t)||a.has(t))continue;let n=c.filter(e=>e.name&&e.name!==t&&e.reads.includes(t));n.length&&n.every(e=>i.has(e.name)||f.has(e.name))&&(f.add(t),e=!0)}}let p=t??new Set([...d.keys()].filter(e=>!f.has(e))),m=[...p].filter(e=>d.has(e)&&i.has(e)).map(e=>`&${e}`),h=/* @__PURE__ */ new Set,g=/* @__PURE__ */ new Set,_=[...p].filter(e=>d.has(e)&&!i.has(e));for(let t=_.shift();t!==void 0;t=_.shift())if(!h.has(t)){h.add(t);for(let a of d.get(t).reads)if(!(!d.has(a)||h.has(a)||p.has(a)||g.has(a))){if(!i.has(a))_.push(a);else if(a===`style`)continue;else g.add(a),n(u,`&${a} is ${U(e)}'s, read by its &${t}, and ${r}'s too: rename ${r}'s, or name &${a} in the use to override it`)}}d.has(`style`)&&n(u,`&${nt} is the composer's, the section's style: ${U(e)} defines it, where a fragment only reads it (the score writes &${nt} style=…; a reader with none plays the centre)`);let v=/* @__PURE__ */ new Set;for(let t of c){if(!t.name||!h.has(t.name)||t.name===`style`)continue;let r=o.get(t.name);r?r.id!==e&&r.code===t.code?v.add(`&${t.name}`):r.id!==e&&n(u,`&${t.name} is defined by ${U(r.id)} and by ${U(e)}, by different lines: write it in the piece, or drop one use`):(o.set(t.name,{id:e,code:t.code}),v.add(`&${t.name}`),s.push(t))}let y=m.filter(e=>[...h].some(t=>d.get(t).reads.includes(e.slice(1))));return{gave:[...v],overrode:m,read:y}})}}let kn=e=>e.names?new Set(e.names.map(e=>e.slice(1))):null,An=e=>e.from?.kind===`use`?{id:e.from.id,names:e.from.names,from:e.from}:null,jn=(e,t)=>e.replace(/"[^"]*"|&([A-Za-z_][A-Za-z0-9_]*)/g,(e,n)=>n&&t.has(n)?`&${t.get(n)}`:e),Mn=e=>e.slice(0,e.indexOf(`=`));function Nn(e,t){let n=t.filter(e=>qe.has(e)),r=t.filter(e=>!qe.has(e)),i=new Set(r.map(Mn)),[a,...o]=ze(e).map(e=>e.text);return[a,...n,...o.filter(e=>!(Ke(e)&&i.has(Mn(e)))&&!n.includes(e)),...r].join(` `)}function Pn(e,t,n){let r=new Set(ze(n).flatMap(e=>Ke(e.text)?[Mn(e.text)]:[])),i=ze(t).slice(1).flatMap(e=>Ke(e.text)&&!r.has(Mn(e.text))?[e.text]:[]);return[`&${e}`,...i,n].join(` `)}function Fn(e){let t=e.trim();if(!t.startsWith(`&(`)||!t.endsWith(`)`))return e;let n=0,r=!1;for(let i=1;i<t.length;i++){let a=t[i];if(a===`"`&&(r=!r),!r){if(a===`(`)n++;else if(a===`)`&&--n===0&&i<t.length-1)return e}}return t.slice(2,-1).trim()}let In=/* @__PURE__ */ new Set([`step`,`loop`,`swing`]);function Ln(e,t,n){if(ze(e).some(e=>Ke(e.text)))return e;let r=/* @__PURE__ */ new Set,i=!1,a=RegExp(`&${t}(?![A-Za-z0-9_])`);for(let e of n)for(let n of ze(e.code).slice(1)){if(!a.test(n.text))continue;let e=RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${t}(?![A-Za-z0-9_])`).exec(n.text);e?r.add(e[1]):i=!0}let[o]=r;return r.size===1&&!i&&In.has(o)?`${o}=${e}`:e}function Rn(e,t){let n=[],r=[!1],i=!1,a=!0;for(let o=0;o<e.length;o++){let s=e[o];if(s===`"`&&(i=!i),i||s===`"`)continue;let c=n.every(e=>e===`lambda`);if(/\s/.test(s)){c&&(r[r.length-1]=!1),a=!0;continue}if(a&&c&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(e.slice(o))&&(r[r.length-1]=!0),a=!1,s===`(`){let t=e[o-1]??``,i=t===`&`?`lambda`:/[A-Za-z0-9_]/.test(t)?`call`:`group`;n.push(i),i===`lambda`&&(r.push(r.at(-1)),a=!0);continue}if(s===`)`){n.pop()===`lambda`&&r.pop();continue}if(s!==`&`)continue;let l=/^&([A-Za-z_][A-Za-z0-9_]*)/.exec(e.slice(o));if(l?.[1]!==t)continue;let u=e[o+l[0].length];if(r.some(Boolean)||n.includes(`call`)||u===`^`||u===`[`)return!0}return!1}function zn(e,t,n,r){if(!e.names||!e.takes||e.takes.every((t,n)=>t===e.names[n]))return null;let i=new Set(t.flatMap(e=>e.name?[e.name]:[])),a=/* @__PURE__ */ new Map,o=/* @__PURE__ */ new Set;return e.names.forEach((t,s)=>{let[c,l]=[t.slice(1),e.takes[s].slice(1)];i.has(l)?c!==l&&(i.has(c)&&!e.takes.includes(`&${c}`)&&r(`&${c}=${l}: ${U(n)} defines &${c} too, by its own line: take &${l} under another name`),a.set(l,c)):(r(`&${l} is not in ${U(n)}: it defines ${[...i].map(e=>`&${e}`).join(`, `)}`),o.add(c))}),{names:a,lacking:o}}let Bn=e=>e.map(e=>e.shared?e:{...e,shared:!0});function Vn(e,t,n,r,i,a,o,s){let{id:c,from:l}=e,u=vn(n).flatMap(e=>e.from?.kind===`signature`?[e.from]:[]);if(!u.length){(l.head.length||l.args||l.main!==null)&&i(`${U(c)} has no signature, so it takes no arguments: a collection gives the cells it defines by name (${e.names?e.names.join(`, `):`*`} from ${l.id})`);let a=Bn(Un(t,n,r,i)),o=zn(l,a,c,i);if(!o)return{taken:{id:c,names:kn(e),lines:a,resolved:!0},copy:[]};let s=new Set(l.names.map(e=>e.slice(1)).filter(e=>!o.lacking.has(e))),u=e=>e.name!==null&&o.names.has(e.name)||e.reads.some(e=>o.names.has(e)),d=a.map(e=>u(e)?{...yn(jn(e.code,o.names),jn(e.written,o.names),e.line),...e.origin?{origin:e.origin}:{}}:e);return{taken:{id:c,names:s,lines:Bn(d),resolved:!0},copy:[]}}return u.length>1&&i(`${U(c)} has ${u.length} signatures: a fragment has one (&head from (&optional) &main)`),Hn(l,c,u[0],t,n,r,i,a,o,s)}function Hn(e,t,n,r,i,a,o,s,c,l){let u=Un(r,i,a,o),d=u.filter(e=>!e.shared&&e.name),f=u.filter(e=>e.shared&&e.name),p=new Set(d.map(e=>e.name)),m=new Set(u.flatMap(e=>e.name?[e.name]:[])),h=e=>e.slice(1),g=n.names.map(h),_=n.optional.map(h),v=n.main?h(n.main):null;for(let e of g)p.has(e)||o(`${U(t)}'s signature names &${e} its head, and it doesn't define it`);for(let e of _)m.has(e)||o(`${U(t)}'s &${e} is an optional parameter: its line in the fragment is its default, and it has none`);v&&m.has(v)&&o(`${U(t)}'s &${v} is its main parameter: it has no line, the argument is it`);let y=/* @__PURE__ */ new Map,b=e.takes?.map(h)??g,x=e.names?.map(h)??g;x.length===1&&g.length===1&&(b[0]===x[0]||b[0]===g[0])?y.set(g[0],x[0]):b.forEach((e,n)=>{g.includes(e)?y.set(e,x[n]):o(`&${e} is not a head of ${U(t)}: its head${g.length>1?`s are`:` is`} ${g.map(e=>`&${e}`).join(`, `)}`)});let S=y.size===1;e.head.length&&!S&&o(`The attributes before from are the head's, and this line takes ${y.size} heads from ${U(t)}: write them on each head's own line`);let C=new Map((e.args??[]).map(e=>[e.name,e.value])),w=c?(fn.get(t)??[]).filter(e=>_.includes(e)&&!C.has(e)&&c.defines.has(e)):[];for(let e of w)C.set(e,`&${e}`);w.length&&c.warn(pn(t,w,`${e.id}(${[...C].map(([e,t])=>`${e}=${t}`).join(`, `)})`));for(let e of C.keys())_.includes(e)||o(`${U(t)} takes no ${e}=: ${_.length?`its optional parameters are ${_.map(e=>`${e}=`).join(`, `)}`:`it has no optional parameters`}`);v&&e.main===null&&o(`${U(t)} needs its main argument, &${v}, after its id: ${e.names?.[0]??`&${g[0]}`} from ${e.id} …`),!v&&e.main!==null&&o(`${U(t)} takes no main argument: its signature has none (&${g[0]} from ${n.optional.length?`(${n.optional.join(`, `)})`:``})`);let T=/^&([A-Za-z_][A-Za-z0-9_]*)$/,E=/* @__PURE__ */ new Map;for(let[e,t]of C)_.includes(e)&&E.set(e,Fn(t));v&&e.main!==null&&E.set(v,Fn(e.main));let D=/* @__PURE__ */ new Set;for(let[e,t]of E){let n=T.exec(t);n&&(y.set(e,n[1]),D.add(e))}let O=/* @__PURE__ */ new Set,k=new Map(u.flatMap(e=>e.name?[[e.name,e]]:[]));for(let e=[...g.filter(e=>y.has(e))];e.length;){let t=e.shift();if(!O.has(t)&&(O.add(t),!D.has(t)))for(let n of k.get(t)?.reads??[])k.has(n)&&e.push(n)}let A=y.get(g[0])??[...y.values()][0]??g[0];for(let e of[...y.values()])s.add(e);let j=_.filter(e=>!p.has(e)&&E.has(e)&&!D.has(e));for(let e of[...p,...v?[v]:[],...j]){if(y.has(e))continue;let t=`${A}_${e}`;for(let n=2;s.has(t)||m.has(t);n++)t=`${A}${n}_${e}`;s.add(t),y.set(e,t)}let M=/* @__PURE__ */ new Set([...m,...v?[v]:[]]),N=/* @__PURE__ */ new Set;for(let e of d)for(let n of e.reads)!M.has(n)&&!N.has(n)&&Rn(e.code,n)&&(N.add(n),o(`${U(t)}'s &${e.name} reads &${n}, which it neither defines nor declares: name it in its signature (&${g[0]} from (&${n}) …), or define it`));let P=e.names===null&&l?g.filter(e=>l.defines.has(e)):[];if(P.length){let e=new Map([...y].map(([e,t])=>[t,e]));O.clear();let t=[...l.reads.values()].flat(),n=[...g.filter(e=>!P.includes(e)),...t.flatMap(t=>e.get(t)??(k.has(t)&&!p.has(t)?[t]:[]))];for(let e=n.filter(e=>!P.includes(e));e.length;){let t=e.shift();if(!(O.has(t)||P.includes(t))&&(O.add(t),!D.has(t)))for(let n of k.get(t)?.reads??[])k.has(n)&&e.push(n)}}let ee=[];for(let t of d){let n=t.name;if(D.has(n)||!O.has(n)||P.includes(n))continue;let r=jn(t.code,y);E.has(n)&&(r=Pn(y.get(n),r,Ln(E.get(n),n,d))),g.includes(n)&&e.head.length&&S&&(r=Nn(r,e.head)),ee.push({...yn(r),...t.origin?{origin:t.origin}:{}})}v&&e.main!==null&&!D.has(v)&&ee.push(yn(`&${y.get(v)} ${Ln(E.get(v),v,d)}`));for(let e of j)ee.push({...yn(Pn(y.get(e),k.get(e).code,Ln(E.get(e),e,d))),origin:k.get(e).origin??[]});if(l?.warn&&!c)for(let n of _)!p.has(n)&&!E.has(n)&&l.defines.has(n)&&O.has(n)&&l.codes.get(n)!==k.get(n)?.code&&l.warn(`The piece defines &${n}, and ${U(t)} takes its &${n} from a collection by default: pass yours, ${e.id}(${n}=&${n}), or rename it`);let te=f.filter(e=>O.has(e.name)&&!D.has(e.name)&&!j.includes(e.name));return{taken:{id:t,names:new Set(te.map(e=>e.name)),lines:te,resolved:!0},copy:ee,args:Object.fromEntries(E)}}function Un(e,t,n,r){let i=e.at(-1),a=vn(t).map(e=>({...e,origin:[{id:i,line:e.line}]})),o=` (in ${Dn(e)})`,s=e=>r(`${e}${o}`),c=new Set(a.flatMap(e=>e.name?[e.name]:[])),l=[],u=a.flatMap(t=>{if(t.from===null)return s(Ye),[];let a=An(t);if(!a)return[];let{id:o}=a,u=kn(a),d=[...e,o];if(e.includes(o))r(`use ${U(o)} is a cycle: ${Dn(d)}`);else if(d.length>8)r(`use ${U(o)} nests past 8 deep: ${Dn(d)}`);else{let e=n(o),u=e===null?null:Sn(o,e,a.from,s)?.text??null;if(e===null)s(`No fragment ${U(o)} to use`);else if(u!==null){let e=Vn(a,d,u,n,r,c),o={id:i,line:t.line};return l.push(...mn(e.copy,o)),[{...e.taken,lines:mn(e.taken.lines,o)}]}}return[{id:o,names:u,lines:[],resolved:!1}]});return On([...a,...l],u,(e,t)=>s(t),U(e.at(-1))).lines}let Wn=(e,t)=>`${U(e)} is renamed ${t}: write from ${t} (#387; Migrate rewrites it)`;function Gn(e){let t=vn(e),n=t.length===1?t[0].from:null;return n?.kind===`use`&&!n.head.length&&!n.args&&n.main===null?n.id:null}function Kn(e,{resolve:t,locked:n=[],old:r=!1}={}){let i=vn(e),a=i.flatMap(e=>{let t=An(e);return t?[{line:e,...t}]:[]}),o=[],s=e=>{let t=e.written.split(`
`)[0]??``,n=t.search(/\S/);return{line:e.line,col:n+1,len:t.trimEnd().length-n}},c=[],l=[],u=[],d=[],f=new Set(i.flatMap(e=>e.name?[e.name]:[])),p={defines:new Set(f),reads:new Map(i.flatMap(e=>e.name?[[e.name,e.reads]]:[])),codes:new Map(i.flatMap(e=>e.name?[[e.name,e.code]]:[]))},m=a.map(e=>{let{id:a}=e,m=kn(e),h=s(e.line),g=e=>o.push({severity:`error`,message:e,span:h}),_=(e.from.takes??e.from.names)?.[0]?.slice(1),v=(n.find(e=>_!==void 0&&e.id===`${a}/${_}`)??n.find(e=>e.id===a))?.hash,y=r?dn.get(a):void 0;y&&o.push({severity:`warning`,message:`${U(a)} is a part of ${y.document} now: take it from there (Migrate rewrites it)`,span:h});let b=t?y?bn(t(y.document)??``,y.head):t(a,...v?[v]:[]):null,x=b===null?null:Sn(a,b,e.from,g),S=x?.text??null;if(d.push(x?.part),S===null)return b===null&&g(t?`No fragment ${U(a)} to use`:`No library to use ${U(a)} from: compileSource(text, env, { resolve })`),c.push(null),l.push([]),u.push(void 0),{id:a,names:m,lines:[],resolved:!1};let C=En(S);c.push(C),v&&v!==C&&o.push({severity:`warning`,message:`${U(a)} has changed since this piece was saved: its current version plays`,span:h});let w=un.get(a);w!==void 0&&t(w)===S&&o.push({severity:`warning`,message:Wn(a,w),span:h});let T=Gn(S);T!==null&&o.push({severity:`warning`,message:`${U(a)} only forwards to ${U(T)}: take from it (Migrate rewrites it)`,span:h});let E=r?{defines:new Set(i.flatMap(e=>e.name?[e.name]:[])),warn:e=>o.push({severity:`warning`,message:e,span:h})}:void 0,D=Vn(e,[a],S,t,g,f,E,{...p,warn:e=>o.push({severity:`warning`,message:e,span:h})}),O={id:null,line:e.line.line};return l.push(mn(D.copy,O)),u.push(D.args),{...D.taken,lines:mn(D.taken.lines,O)}}),h=On([...i,...l.flat()],m,(e,t)=>o.push({severity:`error`,message:t,span:s(a[e].line)}),`the piece`);a.forEach((e,t)=>{let{gave:n,overrode:r,read:i}=h.per[t];if(!m[t].resolved||u[t])return;let c=t=>o.push({severity:`warning`,message:t,span:s(e.line)}),{id:l,names:d}=e,f=a.findIndex(e=>e.id===l&&!u[a.indexOf(e)]);if(!n.length&&f<t)c(`${U(l)} is used already, on line ${a[f].line.line}: this use adds nothing`);else if(d)for(let e of r.filter(e=>!i.includes(e)))c(`The piece defines ${e}, so taking it from ${U(l)} adds nothing`);else!n.length&&r.length&&c(`The piece defines all ${U(l)} gives (${r.join(`, `)}): this use adds nothing`)});let g=e.split(`
`).length,_=new Map([...l.flatMap((e,t)=>e.map(e=>[e,t])),...m.flatMap((e,t)=>e.lines.map(e=>[e,t]))]),v=h.lines.filter(e=>_.has(e)),y=[];for(let e of v)for(let t=e.written.split(`
`).length;t>0;t--)y.push(s(a[_.get(e)].line));return{text:v.length?[e,...v.map(e=>e.written)].join(`
`):e,takes:a.map((e,t)=>{let n=l[t].filter(e=>_.get(e)===t&&e.name).map(e=>`&${e.name}`),r=u[t]?(e.names??[]).filter(e=>n.includes(e)):[];return{id:e.id,names:e.names,span:s(e.line),hash:c[t]??null,gave:u[t]?[.../* @__PURE__ */ new Set([...r,...n,...h.per[t].gave])]:h.per[t].gave,overrode:h.per[t].overrode,...u[t]?{args:u[t]}:{},...d[t]?{part:d[t]}:{}}}),given:new Set(v.flatMap(e=>e.name&&e.shared?[e.name]:[])),diagnostics:o,through:e=>e>g?y[e-g-1]??null:null,origins:new Map(v.flatMap(e=>e.name&&e.origin?[[e.name,e.origin]]:[]))}}let qn=/^`{3,}\s*cells\s*$/m;function Jn(e){let t=[];for(let{key:n,line:r,value:i}of e.entries){let e=ln(i);n!==`title`||typeof e==`string`&&e.trim()||t.push({line:r,message:`the title is ${JSON.stringify(e)}, not a text: title: "A name"`}),n===`description`&&typeof e!=`string`&&t.push({line:r,message:`the description is ${JSON.stringify(e)}, not a text: description: "What it is"`}),n===`tags`&&!(Array.isArray(e)&&e.every(e=>typeof e==`string`&&e.trim()))&&t.push({line:r,message:`the tags are ${JSON.stringify(e)}, not a list of names: tags: [genre:jazz, rhythm]`}),n===`tier`&&!(typeof e==`number`&&Number.isInteger(e)&&e>=1&&e<=9999)&&t.push({line:r,message:`the tier is ${JSON.stringify(e)}: a tier of the tutorial is a whole number, 1 to 9999`}),n===`uses`&&!(Array.isArray(e)&&e.every(Xn))&&t.push({line:r,message:`the uses are ${JSON.stringify(e)}, not a lockfile: uses: a list of - id: gm_kit, hash: e1:…`})}return t}function Yn(e){let t=e.split(/\r?\n/);if(t[0]!==`---`){if(!qn.test(e))return{problems:[{line:1,message:"no frontmatter: a piece file starts with a line `---`, or holds a ```cells block"}]};let n=Xt(t,0);return`problems`in n?n:{frontmatter:{},text:n.text,prose:n.prose,map:n.map,layout:n.layout,bare:!0}}let n=t.indexOf(`---`,1);if(n<0)return{problems:[{line:1,message:"the frontmatter is never closed: no second line `---`"}]};let r=cn(t.slice(1,n).join(`
`),2);if(`problems`in r)return r;let i=r.node;if(i.kind!==`map`)return{problems:[{line:i.line,message:"the frontmatter is a map (`title: …`, `tags: […]`)"}]};let a=Xt(t,n+1),o=[...Jn(i),...`problems`in a?a.problems:[]];return`problems`in a||o.length?{problems:o.sort((e,t)=>e.line-t.line)}:{frontmatter:ln(i),text:a.text,prose:a.prose,map:a.map,layout:a.layout}}function Xn(e){if(typeof e!=`object`||!e||Array.isArray(e))return!1;let t=e;return Object.keys(t).sort().join()===`hash,id`&&typeof t.id==`string`&&typeof t.hash==`string`}let W=(e,t,n,r,i)=>({section:e,form:t,means:n,examples:r,doc:i}),Zn={bpm:{times:1,per:60,syntax:W(`rate`,`nbpm`,`n a minute: beats on a meter (a scan’s entries; meter(…)’s beats, by its signature or levels: 6/8 two, 7/8 three unequal).`,[`&bar meter("4/4") step=84bpm`],`time.md`)},hz:{times:1,per:1,syntax:W(`rate`,`nhz`,`n a second (a plain number says the same).`,[`&a loop=440hz`],`time.md`)},min:{times:1,per:60,syntax:W(`rate`,`nmin`,`n a minute (wall-clock time: loop=1min turns once a minute).`,[`&tick scan(1!60) loop=1min`],`time.md`)},h:{times:1,per:3600,syntax:W(`rate`,`nh`,`n an hour.`,[`&hour scan(1!60) loop=1h`],`time.md`)},d:{times:1,per:86400,syntax:W(`rate`,`nd`,`n a day: a day meter, loop=1d (anchor= where it stands when play starts).`,[`&day scan(1!24) loop=1d anchor=11.55`],`time.md`)},wk:{times:1,per:604800,syntax:W(`rate`,`nwk`,`n a week.`,[`&week scan(1!7) loop=1wk`],`time.md`)},k:{times:1e3,per:1,syntax:W(`rate`,`nk`,`n thousand a second: a sample rate.`,[`&out loop=44.1k map=sample &mix`],`mix.md`)}},Qn=new RegExp(Object.keys(Zn).sort((e,t)=>t.length-e.length).join(`|`),`y`),$n=(e,t)=>{let n=t?Zn[t]:void 0;return n?e*n.times/n.per:e},er={largo:[40,60],larghetto:[60,66],adagio:[66,76],andante:[76,108],moderato:[108,120],allegro:[120,156],vivace:[156,176],presto:[168,200]};`${Object.entries(er).map(([e,[t,n]])=>`${e} ${t}–${n}`).join(`, `)}`;let tr=`free(0 2 4 ~ …), a braid left to the performer, is a cell's whole braid: &riff over=&key free(0 2 4 ~), with nothing else as its braid`,nr=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:\/[1-9][0-9]*)?/y,rr=e=>{let[t,n]=e.split(`/`);return n===void 0?parseFloat(t):parseFloat(t)/Number(n)};function ir(e,t,n,r={}){let i=e.i;if(e.match(/free\(/y)===null&&e.fail(`free(…)`),e.skipSpace(),e.peek()===`"`){let t=e.match(/"[^"]*"/y);e.skipSpace(),e.expect(`)`,`')' to close free("…")`);let n={key:`text`,value:0,unit:``,lo:0,hi:0,span:e.place(i),text:t.slice(1,-1)};return e.frees.push(n),n}(/(?:~|\[|-?[0-9.]+[#b]*(?:[@!*][0-9]+)?\s+[^\s,])/y.test(e.text.slice(e.i))||/^-?[0-9.]+[#b]*\)/.test(e.text.slice(e.i)))&&e.fail(tr,i,e.i-i);let a=e.i,o=t===`shift`||t===`tonic`?e.noteName():null;o!==null&&/[0-9]/.test(e.text.slice(a,e.i))&&e.warn(`free(${e.text.slice(a,e.i)}): a key is a pitch class — the octave is left out: free(${e.text.slice(a,e.i).replace(/-?[0-9]+$/,``)})`,a,e.i-a);let s=o===null?e.match(/[a-z]+/y):null,c,l=``,u,d,f;if(o!==null)c=(o%12+12)%12,[u,d]=[0,11],f=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`];else if(s!==null){let n=er[s];(!n||t===`shift`||t===`stride`||t===`gain`||t===`tonic`||r.whole)&&e.fail(`free(${s}): a tempo marking (${Object.keys(er).join(`, `)}) — for a rate`,i,e.i-i),[u,d]=n,c=Math.round((u+d)/2),l=`bpm`}else{let t=e.match(nr);t===null&&e.fail(`free(default, lo..hi), like free(90bpm, 60..240) or free(.8, 0..1)`),c=rr(t),n&&(l=e.match(Qn)??``),e.skipSpace(),e.expect(`,`,`',' then the range, like free(${t}${l}, 60..240)`),e.skipSpace();let r=e.match(nr);e.match(/\.\./y)===null&&e.fail(`a range lo..hi, like 60..240`);let a=e.match(nr);(r===null||a===null)&&e.fail(`a range lo..hi, like 60..240`),u=rr(r),d=rr(a),u<d||e.fail(`free(…): the range runs low to high (${u}..${d})`,i,e.i-i),(c<u||c>d)&&e.fail(`free(…): ${c} is outside ${u}..${d}`,i,e.i-i)}e.skipSpace();let p=()=>{if(!/,\s*unit=/y.test(e.text.slice(e.i)))return;let t=e.i;e.i++,e.skipSpace(),e.match(/unit=/y);let r=e.match(/[a-z]+/y)??``,i=r?Zn[r]:void 0;n&&i||e.fail(n?`unit=${r}: a rate's unit (${Object.keys(Zn).join(`, `)})`:`unit=: a unit is for a rate (step=, loop=)`,t,e.i-t),l&&e.fail(`free(…${l}, …, unit=${r}): the unit is given twice — written after the number, or as unit= with the numbers a second`,t,e.i-t);let a=e=>+(e*i.per/i.times).toPrecision(12);[c,u,d]=[a(c),a(u),a(d)],l=r,e.skipSpace()};p();let m;if(e.peek()===`,`&&!/,\s*unit=/y.test(e.text.slice(e.i))){e.i++,e.skipSpace();let t=e.match(/"[^"]*"/y);t===null&&e.fail(`names for the choices, in quotes: free(0, 0..3, "a b c d")`),m=t.slice(1,-1).trim().split(/\s+/).filter(Boolean);let n=m.length>1?(d-u)/(m.length-1):0;if(o!==null){let n=e.text.lastIndexOf(`,`,e.i-t.length);e.warn(`free(${e.text.slice(a,n).trim()}, ${t}): a key by name has the twelve pitch names as its choices, so these names are ignored (names of your own go on a range: free(3, 0..11, "…"))`,n,e.i-n),m=void 0}else(!Number.isInteger(u)||!Number.isInteger(d)||m.length<2||!Number.isInteger(n)||n<1)&&e.fail(`free(…, "${m.join(` `)}"): the names spread evenly over ${u}..${d} — ${m.length} names need ${m.length-1} equal whole steps (${u}..${u+m.length-1}, or every 2nd: ${u}..${u+2*(m.length-1)})`,i,e.i-i);e.skipSpace()}p(),e.expect(`)`,`')' to close free(…)`),m??=f;let h={key:t,value:c,unit:l,lo:u,hi:d,span:e.place(i),...r.param===void 0?{}:{param:r.param},...r.whole?{whole:!0}:{},...m?{labels:m}:{},...o===null?{}:{byName:!0}};return e.frees.push(h),h}let G=`no: read as the piece is built`,ar=e=>`not yet: ${e}`,or="`&k`, `lo..hi * &k`",K=e=>e,q={param:K({form:`lpf=n, and every sound parameter`,name:`param`,cell:`${or}, on a parameter that moves (postgain= doesn't: the renderer's; pan= is read at each note's start)`,moves:!0,example:`&lead s=saw loop=C4 lpf=free(1200, 200..5000)`}),level:K({form:`level=&a * n (a gate)`,name:`level`,cell:"`&a * &b * n`",moves:!0,example:`&out play=&tune level=&accent*free(.4, 0..1) &tune`}),slot:K({form:`attack=n (an envelope by name)`,name:`slot`,cell:`${or}: \`&k\` its values as the slot's (seconds; sustain a level), held at 0 until a note reads it`,moves:!0,example:`&env map=adsr attack=free(.01, 0..1) decay=.3 sustain=.5 release=.4`}),axis:K({form:`sync=n (a style by name)`,name:`axis`,cell:`${or}, within the axis (#576)`,moves:!0,example:`&mine map=style sync=free(.3, 0..1) harm=.45 bite=.55 mood=.5`}),end:K({form:`lo..hi * &k (a moving range’s ends) · c ± r`,name:`end`,cell:ar(`a range’s end is a number or a slider; its cells move what lies between (decision 079)`),example:`&lead s=saw loop=C4 lpf=free(400, 200..800)..free(2400, 1200..4800) * &lfo`}),share:K({form:`swing=8n:n (a swing’s share)`,name:`share`,cell:`${or}, one level alone, read at each bar line and held through the bar (decision 081)`,moves:!0,example:`&bar meter("4/4") step=90bpm swing=8n:free(.6, .5...75)`}),depth:K({form:`bend=4n:&t:d (a bend’s depth)`,name:`depth`,cell:`${or}, read at each line of its table’s span, held through it (decision 081)`,moves:!0,example:`&bar meter("*.-.+.-.") step=90bpm bend=4n:&(27 23 26 24):free(1, -1..2)`}),legatoShare:K({form:`legato=8n:n (a legato’s share by level)`,name:`share`,cell:ar(`a meter’s legato by level is its lines’ default; a line moves its own, legato=&artic`),example:`&bar meter("4/4") step=90bpm legato=8n:free(.5, .25..1)`}),gain:K({form:`[&x * n] (a gain in a mix)`,name:`gain`,key:`gain`,cell:"`&k`; a range moved by cells is a cell of its own, `&g [&k * .6 + .2]`, then `[&x * &g]` (decision 079)",moves:!0,example:`&out [&strings * free(.4, 0..1)]`}),hit:K({form:`&x:0:n (a hit’s gain)`,name:`hit`,min:0,cell:"no: a hit’s gain is a number; a moving one is `velocity=&accent`, or a gate’s `level=`",example:`&beat step=8 &bd &hh:0:free(.4, 0..1)`}),weight:K({form:`style=[&a * n, …] (a weight)`,name:`weight`,min:0,cell:"no: a weight is a number; a crossfade is `style=&a..&b * &curve`",example:`&s style=[&funk * free(.8, 0..1), &bossa * .2]`}),tonic:K({form:`scale(name, n) (a tonic)`,name:`tonic`,key:`tonic`,whole:!0,rounds:!0,cell:"`&k` (a note); a tonic is a pitch class, never a range",moves:!0,example:`&key scale(dorian, free(2, 0..11))`}),rate:K({form:`step=n · loop=n (a rate)`,name:`step`,key:`step`,units:!0,cell:"a clock (`step=&bar`): another meaning",moves:!0,example:`&bar meter("4/4") step=free(90bpm, 60..240)`}),by:K({form:`step=&bar*n · step=&bar/n`,name:`by`,min:0,cell:G,example:`&fast step=&bar*free(2, 1..4) 0 2`}),shift:K({form:`shift=n`,name:`shift`,key:`shift`,whole:!0,rounds:!0,cell:G,example:`&key step=cycle(&theme) shift=free(0, 0..11)`}),stride:K({form:`stride=n`,name:`stride`,key:`stride`,whole:!0,rounds:!0,cell:G,example:`&key step=cycle(&theme) stride=free(0, 0..7)`}),cycle:K({form:`cycle=n`,name:`cycle`,whole:!0,min:0,cell:G,example:`&wheel cycle=free(1, 0..4) 0 4 7`}),laps:K({form:`laps=n`,name:`laps`,whole:!0,min:1,cell:G,example:`&bar meter("4/4") step=84bpm laps=free(30, 1..60)`}),chance:K({form:`chance=p`,name:`chance`,key:`chance`,cell:G,example:`&ghost chance=free(.7, 0..1) step=4 0? 0?`}),seed:K({form:`seed=n`,name:`seed`,whole:!0,cell:G,example:`&ghost seed=free(7, 0..99) step=4 0? 0? 0? 0?`}),size:K({form:`size=x`,name:`size`,min:.25,max:4,cell:G,example:`&theme size=free(2, .25..4) step=2 0 2 4`}),interval:K({form:`scan(n …) (an interval)`,name:`interval`,key:`interval`,cell:G,example:`&mode scan(2 2 free(1, 1..2) 2 2 2 1)`}),intervals:K({form:`scan(n!k …) (an interval’s repeat)`,name:`repeat`,whole:!0,min:1,cell:G,example:`&map scan(1!free(4, 1..8) 2)`}),geo:K({form:`geo(r, n, k …)`,name:`geo`,cell:G,example:`&series scan(geo(free(5, 2..8), 25, 0 10 5))`}),args:K({form:`euclid(k, n, r) · even(k, n, r) · sin(n) …`,name:`arg`,whole:!0,cell:G,example:`&hits euclid(free(3, 0..8), 8) step=8`}),fifths:K({form:`fifths(n)`,name:`fifths`,whole:!0,cell:G,example:`&circle fifths(free(1, 0..11))`}),phase:K({form:`scale(t, phase) (retired)`,name:`phase`,whole:!0,min:0,max:6,cell:G,example:`&key scale(2, free(3, 0..6))`}),meter:K({form:`meter(n, n)`,name:`meter`,key:`choice`,cell:G,example:`&bar meter(free(2, 0..3, "2/4 3/4 4/4 6/8")) step=90bpm`}),grid:K({form:`map=edo(n) · map=ed(n, r) · map=midi(c, p)`,name:`grid`,whole:!0,min:1,cell:G,example:`&edo map=edo(free(19, 5..31))`}),ratio:K({form:`map=ed(r)`,name:`ratio`,cell:G,example:`&bp cycle=13 map=ed(free(3, 1.5..4))`}),step:K({form:`0 2 4 (a step of a braid)`,name:`value`,cell:"a cell plays there (`&k`, spliced)",moves:!0,example:`&tune step=2 0 free(2, 0..7) 4`}),modifier:K({form:`x!n · x@n · x*n · x/n`,name:`count`,whole:!0,min:1,max:4096,cell:G,example:`&beat step=4 0!free(4, 1..8) 2`}),drop:K({form:`x?p`,name:`drop`,min:0,max:1,cell:G,example:`&hats step=4 0 0?free(.3, 0..1)`}),euclidOn:K({form:`x(k, n, r)`,name:`euclid`,whole:!0,cell:G,example:`&groove step=1 0(free(3, 0..8),8)`}),pick:K({form:`&x[i] · &x[a:b:s] · &x[$i]`,name:`pick`,whole:!0,cell:`${G}: picking while it plays is a selector's (#51)`,example:`&tune step=2 &motif[free(0, 0..3)]`}),turn:K({form:`&x[<<n] · &x[>>n]`,name:`turn`,whole:!0,min:0,cell:G,example:`&canon step=2 &theme[>>free(4, 0..7)]`}),move:K({form:`&x^n · &x^$n`,name:`move`,whole:!0,cell:G,example:`&tune step=2 &motif &motif^free(1, -7..7)`}),tier:K({form:`tier=n`,name:`tier`,fixed:`the tutorial's order, not the piece's`,cell:G,example:`&piece title="Steps" tags="tutorial" tier=1`}),hitNumber:K({form:`&x:n (a hit’s number)`,name:`hit`,fixed:`a pitched hit is not yet: it is 0`,cell:G,example:`&beat step=8 &bd:0`})},sr=/[A-Za-z_][A-Za-z0-9_]*/y,cr=/-?[0-9]+/y,lr=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*\*\s*&/y,ur=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y,dr=4096;var fr=class extends Error{col;len;constructor(e,t,n=1){super(e),this.col=t,this.len=n}},pr=class e{text;line;offset;lambdas;parts;warnings;depth;body;i=0;frees=[];constructor(e,t,n=0,r=[],i=[{line:t,start:0}],a=[],o=0,s){this.text=e,this.line=t,this.offset=n,this.lambdas=r,this.parts=i,this.warnings=a,this.depth=o,this.body=s}within(t,n,r=this.depth){return new e(t,this.line,this.offset+n,this.lambdas,this.parts,this.warnings,r,this.body)}warn(e,t,n){this.warnings.push({severity:`warning`,message:e,span:{...this.place(t),len:n}})}place(e){let t=e+this.offset,n=this.parts[0];for(let e of this.parts)e.start<=t&&(n=e);return{line:n.line,col:t-n.start+1,len:Math.max(1,this.i-e)}}skipSpace(){for(;this.i<this.text.length&&/\s/.test(this.text[this.i]);)this.i++}done(){return this.skipSpace(),this.i>=this.text.length}peek(){return this.text[this.i]??``}span(e){return{line:this.line,col:e+1+this.offset,len:Math.max(1,this.i-e)}}fail(e,t=this.i,n=1){throw new fr(e,t+this.offset,n)}match(e){e.lastIndex=this.i;let t=e.exec(this.text);return t?(this.i+=t[0].length,t[0]):null}ident(e){let t=this.match(sr);return t===null&&this.fail(`Expected ${e}`),t}free(e,t=e.name){if(!this.text.startsWith(`free(`,this.i))return this.refuseCell(e),null;let n=this.i;e.fixed&&this.fail(`${e.form}: a number, not free(…) — ${e.fixed}`,n,5);let r=e.key??`param`,i=ir(this,r,!!e.units,{...r===`param`?{param:t}:{},...e.whole?{whole:!0}:{}}),a=this.i-n;return i.text!==void 0&&r!==`choice`&&this.fail(`free("…") is a text, for spell(…) and meter(…): ${e.form} takes free(v, lo..hi)`,n,a),e.whole&&!e.rounds&&![i.lo,i.hi].every(Number.isInteger)&&this.fail(`${e.form} takes a whole number: free(…)'s range whole — free(${Math.round(i.value)}, ${Math.floor(i.lo)}..${Math.ceil(i.hi)})`,n,a),(e.min!==void 0&&i.lo<e.min||e.max!==void 0&&i.hi>e.max)&&this.fail(`${e.form}: free(…) moves within ${e.min??`…`}..${e.max??`…`} — free(${i.value}, ${Math.max(i.lo,e.min??i.lo)}..${Math.min(i.hi,e.max??i.hi)})`,n,a),i}freeNumber(e,t){let n=this.free(e,t);return n===null?null:e.whole?Math.round(n.value):n.value}refuseCell(e){lr.lastIndex=this.i;let t=lr.test(this.text);if(!t&&(this.peek()!==`&`||e.moves))return;let n=Math.max(1,/^[^\s,)\]]*/.exec(this.text.slice(this.i))[0].length),r=t?`a range moved by cells`:`a cell`;this.fail(e.cell.startsWith(`no: read as the piece is built`)?`${e.form} is read as the piece is built: a number, or free(v, lo..hi), whose slider compiles it again — ${r} moves only a number read while the piece plays (decision 078)`:`${e.form} takes a number, or free(v, lo..hi), and ${r} isn't read here: ${e.cell.replace(/^no: /,``)} (decision 078)`,this.i,n)}int(e,t,n){let r=this.freeNumber(t,n);if(r!==null)return r;let i=this.match(cr);return i===null&&this.fail(`Expected ${e}`),parseInt(i,10)}num(e,t,n){let r=this.freeNumber(t,n);if(r!==null)return{value:r,alter:0};let i=this.match(ur);i===null&&this.fail(`Expected ${e}`);let a=parseFloat(i);if(this.peek()===`/`&&/[0-9.]/.test(this.text[this.i+1]??``)){this.i++;let e=this.match(ur);(e===null||parseFloat(e)===0)&&this.fail(`a fraction needs a denominator, like 9/8`),a/=parseFloat(e)}let o=0;for(;this.peek()===`#`||this.peek()===`b`;)o+=this.text[this.i++]===`#`?1:-1;return{value:a,alter:o}}noteName(){let e=this.match(/[A-G](?:#|b)?(?:-?[0-9]+)?(?![A-Za-z0-9_])/y);return e===null?null:_e(e)}expect(e,t){this.peek()!==e&&this.fail(`Expected ${t}`),this.i++}lambda(){let e=this.i;this.depth>=32&&this.fail(`Unnamed cells &( … ) nest 32 deep at most: name the inner ones (&env …) and refer to them`,e-1,2);let t=0,n=-1;for(let r=e;r<this.text.length;r++)if(this.text[r]===`(`)t++;else if(this.text[r]===`)`&&--t===0){n=r;break}n<0&&this.fail(`')' to close &( … )`,e);let r=`λ${this.line}_${e+this.offset}`;this.body||this.fail(`An unnamed cell &( … ) here has no parser for its body`,e-1,2);let i=this.within(this.text.slice(e+1,n),e+1,this.depth+1),a=this.body(i,{name:r,pick:null,shift:0,span:{line:this.line,col:e+this.offset,len:n-e+2}});return this.lambdas.push({...a,lambda:this.text.slice(e+1,n).trim()}),this.i=n+1,r}ref(e){let t=this.i;this.expect(`&`,e);let n=this.peek()===`(`?this.lambda():this.ident(`a name after &`),r=null,i=0;if(this.peek()===`[`){this.i++,this.skipSpace();let e=this.match(/<<|>>/y);if(e){this.skipSpace();let a=this.freeNumber(q.turn),o=a===null?this.match(/[0-9]+/y):String(a);return i=(e===`<<`?-1:1)*(o===null?1:parseInt(o,10)),this.skipSpace(),this.expect(`]`,`']' to close &${n}[${e}…]`),{name:n,pick:r,shift:i,...this.transposition(n),span:this.span(t)}}let a=this.match(/[a-z][A-Za-z]*(?=\s*\])/y);if(a!==null)return this.skipSpace(),this.expect(`]`,`']' to close &${n}[${a}]`),{name:n,pick:r,shift:i,slot:a,...this.transposition(n),span:this.span(t)};let o=this.peek()===`$`&&(this.i++,this.skipSpace(),1)?{abs:!0}:{},s=()=>{let e=this.freeNumber(q.pick);return e===null?this.match(cr):String(e)},c=s();if(this.skipSpace(),this.peek()===`:`){this.i++,this.skipSpace();let e=s();this.skipSpace();let t=null;if(this.peek()===`:`){this.i++,this.skipSpace();let e=this.i,n=s();n!==null&&parseInt(n,10)===0&&this.fail(`A slice step of 0 never moves`,e,n.length),t=n===null?null:parseInt(n,10),this.skipSpace()}r={kind:`slice`,from:c===null?null:parseInt(c,10),to:e===null?null:parseInt(e,10),...t===null?{}:{step:t},...o}}else c===null&&this.fail(`Expected an index like &${n}[0] (&${n}[$0] as written), or a slice like &${n}[1:]`),r={kind:`at`,i:parseInt(c,10),...o};this.expect(`]`,`']' to close &${n}[…]`)}else if((this.peek()===`+`||this.peek()===`-`)&&/[0-9]/.test(this.text[this.i+1]??``)){let e=this.peek(),r=/[0-9]+/.exec(this.text.slice(this.i+1))[0];this.fail(`&${n}${e}${r}: write &${n}^${e===`-`?`-`:``}${r} to move it by its table's steps (in a braid; ^$${e===`-`?`-`:``}${r}: by semitones), &${n} ${e} ${r} to add pitch (in a mix), &${n}[${e===`-`?`<<`:`>>`}${r===`1`?``:r}] to shift it, or &${n}[…] to pick from it`,t,this.i-t+1+r.length)}return{name:n,pick:r,shift:i,...this.transposition(n),span:this.span(t)}}rejectTap(e){if(this.peek()!==`:`)return;let t=/^(?:(?:pulse|beat)(?:\*\d+)?|\d+[nt]\.?|\d*m)(?![\w.])/.exec(this.text.slice(this.i+1));if(!t)return;let n=this.text.slice(e,this.i+1+t[0].length);this.fail(`${n} is a meter's tap, which only step= reads (step=${n}): here it names no cell`,e,n.length)}cellRef(e,t,n=!1){let r=this.i,i=this.ref(e);n||this.rejectTap(r);let a=this.text.lastIndexOf(`^`,this.i-1);return a>=r&&a>this.text.lastIndexOf(`)`,this.i-1)&&this.warn(`${this.text.slice(r,this.i)} ${t}: ^ and ^$ move a cell a braid plays (and base=&cell^n, a copy, and a gate's play=&cell^n); here it is the cell itself, so the move is ignored`,a,this.i-a),i}transposition(e){if(this.peek()!==`^`)return{};let t=this.i;this.i++;let n=this.peek()===`$`;n&&this.i++;let r=this.freeNumber(q.move),i=r===null?this.match(/-?[0-9]+/y):String(r);i===null&&this.fail(`&${e}^n moves it n steps of its table (&${e}^1, a degree up), &${e}^$n n semitones (&${e}^$7, &${e}^$-12)`,t,1),this.peek()===`.`&&/[0-9]/.test(this.text[this.i+1]??``)&&this.fail(`&${e}${this.text.slice(t,this.i)}…: ^ takes a whole number of steps (&${e}^1, &${e}^$-12)`,t,this.i-t+1+/^[0-9]+/.exec(this.text.slice(this.i+1))[0].length),this.peek()===`^`&&this.fail(`&${e}${this.text.slice(t,this.i)}^…: one ^ per reference; nest with degree(…): degree(&${e}${this.text.slice(t,this.i)}, n)`,this.i,1);let a=parseInt(i,10);return a?n?{transpose:a}:{degree:a}:{}}atBoundary(){let e=this.peek();return e===``||/\s/.test(e)}};function mr(e){let t=!1;for(let n=0;n<e.length;n++){let r=e[n];if(r===`"`)t=!t;else if(!t&&r===`/`&&e[n+1]===`/`)return e.slice(0,n);else if(!t&&r===`#`&&(n===0||/\s/.test(e[n-1])))return e.slice(0,n)}return e}let J=(e,t,n)=>({help:e,doc:t,value:`syntax`,...n?{on:n}:{}}),Y=(e,t={})=>({help:e,doc:`sound.md`,value:`number`,on:[`voice`],voice:!0,...t}),X=(e,t,n={})=>({help:e,doc:`physics.md`,value:`number`,on:t,...n}),hr={over:J(`the table its numbers read`,`tables.md`),base:J(`the cell it is a copy of, changed where it says: its braid step by step over the base’s (= keeps a step), its attributes where it sets none`,`braid.md`),step:J(`what moves it, step by step`,`time.md`),loop:J(`what moves it, the whole braid at a time, read as a signal: each value held, no note started each step (a voice alone sounds as one held note, &a loop=A4)`,`time.md`),shift:J(`how far it is turned`,`tables.md`),stride:J(`how far each step turns it`,`time.md`),map:J(`how its values sound`,`sound.md`),show:J(`how it’s shown: notes, do, scale, pattern … (and everything below it)`,`display.md`),label:J(`a name to show, in quotes — alone on a cell, a note in the graph`,`display.md`),env:J(`a voice’s own volume on every note: an envelope`,`sound.md`,[`voice`]),pitch:{...J(`a voice’s own pitch on every note: a vibrato, or a shape in semitones (pitch=0..30 * &(map=adsr 0 .04 0 0): a drop)`,`sound.md`,[`voice`]),moves:!0},cycle:J(`laps before it comes round: a turning table’s, an index read through it, a tap’s bars; 0 holds the first entry (a grid’s size is its map’s, map=edo(19))`,`tables.md`),size:J(`how large it’s drawn, against the others: 2 twice, .5 half`,`display.md`),laps:J(`how many laps it plays, then it ends`,`time.md`),chance:J(`what a bare x? means here: the probability it is dropped, or free() for a slider`,`cell.md`),seed:J(`a different sequence of chance`,`cell.md`),title:{...J(`on a note: the piece’s title (its card), the old spelling: its file’s frontmatter holds it`,`display.md`,[`note`]),old:`title: in the frontmatter`},tags:J(`on a cell: its clusters in the graph, comma-separated (on the piece’s card, the old spelling of its tags: its file’s frontmatter holds them)`,`display.md`),about:J(`on a note: the cells it explains`,`display.md`,[`note`]),style:J(`its style: a map=style cell, &(map=style …), or a mix of them by weight; or a range from one to another over its scope (style=&funk..&bossa). On the note &style, the section’s, read by axis (&style[bite])`,`style.md`),tier:{...J(`on a piece’s card: its tier of the tutorial (1 the first), the old spelling: its file’s frontmatter holds it`,`display.md`,[`note`]),old:`tier: in the frontmatter`}},gr={s:Y(`sound source: sine tri saw square pulse white pink brown; or a blend of two waves, the share of the second moved by cells: s=tri..square * &style[bite]`,{value:`word`}),lpf:Y(`low-pass cutoff, Hz`,{moves:!0,hz:!0}),lpq:Y(`low-pass resonance`,{moves:!0}),hpf:Y(`high-pass cutoff, Hz`,{moves:!0,hz:!0}),hpq:Y(`high-pass resonance`,{moves:!0}),bpf:Y(`band-pass centre, Hz (decision 074)`,{moves:!0,hz:!0}),bpq:Y(`band-pass Q: the centre over the bandwidth, 1 unless given (decision 074)`,{moves:!0}),ftype:Y(`its filters' model (decision 074): 12db (the default, one biquad each), 24db (two in series), ladder (its low-pass a ladder, lpq= its resonance, drive= its drive); or superdough's numbers 0, 2, 1`,{value:`word`}),room:Y(`reverb send 0–1`,{moves:!0}),delay:Y(`delay send 0–1`,{moves:!0}),delaytime:Y(`echo time, seconds — or a clock: &bar*2 (an eighth at the tempo) — or a tap: 8n, 4n.`,{clock:!0}),delayfeedback:Y(`echo feedback 0–1`),glide:{help:`tied notes (each starting as the one before ends) play as one: its envelope once, each next a slide there over this many seconds (dough’s glide; 0 or none: each note its own)`,doc:`sound.md`,value:`number`,on:[`voice`]},oneshot:{help:`on a voice: 1 plays each note’s envelope through (its attack and decay), whatever its step, a drum hit on any grid; 0, the default, as long as its step (decision 068: the bare word oneshot, the old way)`,doc:`sound.md`,value:`number`,on:[`voice`]},note:{help:"on a kit’s member: its MIDI note on the kit’s channel (36 a kick, 38 a snare, General MIDI’s drums: `gm_kit` writes each), a whole number 0–127; its name gives none (decision 075). A member with none takes the next free note from 36",doc:`midi.md`,value:`number`,on:[`voice`],form:`note=n (a whole number 0–127)`},legato:{help:`on a line: each note sounds its written length (@n, _) times this share, its end swung as its onset is, Strudel’s legato (.5 staccato, 1 as written, 1.5 into the next): a number, free(), or a cell of shares read at each onset (legato=&artic); nothing cuts a note at the bar line`,doc:`sound.md`,value:`number`,on:[`clock`,`driven`],moves:!0,form:`legato=n · legato=free(n, lo..hi) · legato=&x · legato=lo..hi * &a * &b · on a meter, its lines’ default by level: legato=16n:r,4n:r`},pan:Y(`where it sits in stereo: 0 left, .5 centre (as without it), 1 right — the far side fades; it can move, read at each note’s start (pan=&space, pan=0..1 * &lfo)`,{moves:!0}),distort:Y(`distortion: 0 clean, .3 gritty, 1 and more harsh`),crush:Y(`bit depth: 16 clean, 8 grainy, 3 and fewer: rubble`),fm:Y(`frequency modulation: the voice that modulates this one (fm=&op); it may have its own fm=`,{doc:`physics.md`,value:`cell`}),ratio:Y(`as a modulator: its frequency against its carrier’s (1 the same, 3.5 a bell)`,{doc:`physics.md`,on:[`modulator`]}),index:Y(`FM depth: how far the modulator swings the frequency (0 none … 10 bright); it can move`,{doc:`physics.md`,on:[`carrier`],moves:!0}),body:Y(`a resonator: what its exciters are — fork, bell, bar, plate, box, tine, pipe, wire, spring; its braid lists them (semitones; the twelve by default), a note plucks the nearest`,{doc:`physics.md`,value:`word`}),ring:Y(`a resonator: how long it rings, in seconds`,{doc:`physics.md`}),hard:Y(`a resonator: the mallet — 0 felt (dark), 1 steel (bright)`,{doc:`physics.md`}),board:X(`a resonator: the body its exciters share (box by default, an octave below; none: no board)`,[`resonator`],{value:`word`}),couple:X(`a resonator: another it shares a table with (couple=&other) — each sets the other ringing`,[`resonator`],{value:`cell`}),coupling:X(`a resonator: how strongly it is coupled (.01 faint, .05 strong)`,[`resonator`]),excite:X(`a resonator: sound that drives it (excite=&mix) — it answers where the sound meets its modes`,[`resonator`],{value:`cell`}),postgain:{help:`on the sound card: its master, a linear gain after everything (Strudel’s postgain: 1 as it is, .5 half, a negative one inverts the phase; free(.8, 0..1) a slider)`,doc:`mix.md`,value:`number`,on:[`card`]},beat:{help:`on a meter, retired (#502): how many beats it counted, equal; a meter counts its beats by its signature or its levels (meter("2/2", 2): alla breve)`,doc:`time.md`,value:`number`,on:[`clock`],old:`the signature: meter("2/2", 2)`},pulse:{help:`on a scan: the note value of its entries (pulse=16n: sixteenths) — its beats then count quarters, and its taps read note values by it`,doc:`time.md`,value:`word`,on:[`clock`,`driven`]},swing:{help:`on a meter: a level of its bar leans, named by note value — of each pair of its eighths (swing=8n:.67), the second comes this far through their beat (.5 straight, .67 triplet swing), its pairs lean, a group of three straight (decision 071); every beat and bar line stays. Bare (swing=.6), on a list at a rate: pairs of its steps (on a meter, an error that names the level)`,doc:`time.md`,value:`number`,on:[`clock`],form:`swing=8n:r · swing=8n:r,16n:r · swing=8n:free(r, lo..hi) · swing=r`},bend:{help:`on a meter: a level’s nodes played at the lengths a table gives, named by note value — bend=4n:&rubato with &rubato 27 23 26 24 plays the beats 27:23:26:24 of the bar (decision 080); finer levels within each, swung as they would be; a table longer than the bar spans as many bars as it takes, a tempo map. A scan(…) with a rate is its sugar`,doc:`time.md`,value:`cell`,on:[`clock`],form:`bend=4n:&table`},motor:X(`on a meter: it turns physically — a motor this strong pulls it to its tempo (from rest)`,[`clock`]),mass:X(`physics: how heavy it turns (inertia); on a cell a meter drives, load`,[`clock`,`driven`]),friction:X(`physics: drag — the meter sags below its tempo, more with more load`,[`clock`,`driven`]),wind:X(`on a meter with a motor: its spring runs down over this many seconds, and it coasts to a stop`,[`motor`]),wow:X(`on a meter with a motor: its speed swings slowly by this fraction (.01: a tape machine’s wow)`,[`motor`]),varispeed:X(`on a clock: its notes’ pitch follows its speed, as tape does (1 fully, 0 not)`,[`clock`,`driven`]),belt:X(`on a driven cell (step=&x): it follows through a belt this stiff (200 taut, 20 slack) — it lags, swings, catches up`,[`driven`]),damping:X(`a belt’s damping: how soon its swinging dies (0 rings on, high creeps)`,[`driven`]),slip:X(`a belt’s grip: past this pull it slips, and the cell falls behind for good`,[`driven`]),write:X(`a tape: what its write head records (write=&melody); it moves with its step=`,[`tape`],{value:`cell`}),length:X(`a tape: how long its loop is, in seconds of tape (or a clock: length=&bar/4, or a tap: length=1m); none, an open reel`,[`tape`],{clock:!0}),erase:X(`a tape: how much of what was there each pass under the write head wipes (1 all, .3 leaves ghosts)`,[`tape`]),tone:X(`a sound tape: its loss — each pass through the loop darker (Hz: 7000 bright, 1500 worn)`,[`tape`],{hz:!0}),drive:X(`how hard it saturates: a sound tape, each pass (0 clean, .5 warm, 1 crushed); a ladder (ftype=ladder, decision 074), its input pushed by e^drive into its stages, .69 unless given (superdough's)`,[`tape`,`voice`]),hiss:X(`a sound tape: its noise floor (0 none, .02 a cassette)`,[`tape`]),print:X(`a sound tape: print-through — a faint pre-echo before each head (.03 a whisper)`,[`tape`]),printgap:X(`a sound tape: how far before each head the print-through sits (tape-seconds, .6)`,[`tape`]),dropout:X(`a sound tape: brief gaps in the playback, about this many a second`,[`tape`],{hz:!0}),play:X(`a read head: the tape it reads (play=&tape), at= tape-seconds after the write head; a gate: the notes it plays on the voices in its braid (play=&tune)`,[`head`,`gate`],{value:`cell`}),at:X(`a read head: how far after the write head it sits, in seconds of tape (or a clock: at=&bar, or a tap: at=4n)`,[`head`],{clock:!0}),wander:X(`a read head: how far it wanders either way (tape-seconds) — a flying head`,[`head`]),wanderhz:X(`a read head: how fast it wanders (times a second)`,[`head`],{hz:!0}),level:{help:`on a gate: how loud, a product of level cells and a gain (level=&accent*&duck*.4)`,doc:`mix.md`,value:`number`,on:[`gate`]},licence:{help:`on a gate: its performer’s licence, how far it loosens velocity and length, a share of the feel’s (1 as the contract plays; 0 exactly as written)`,doc:`mix.md`,value:`number`,on:[`gate`]},accents:{help:`on a gate: its performer’s own accents, a share of the feel’s (1 as the contract plays; 0 none)`,doc:`mix.md`,value:`number`,on:[`gate`]},part:{help:`the part the default performer plays a line as (feel v3, decision 075): on a role cell, its performer’s part (&low map=role part=bass &lowOut), or on a line (&low part=bass …): bass, pad, stab, lead or drums; a name gives none`,doc:`mix.md`,value:`word`,form:`part=bass (bass, pad, stab, lead or drums)`},role:{help:`a drum line’s role, as the default performer plays it (feel v3, decision 075): kick, backbeat, ghost, hat, pedal, euclid, clave or fill (&k role=kick step=16n &bd!4); a name gives none`,doc:`mix.md`,value:`word`,form:`role=kick (kick, backbeat, ghost, hat, pedal, euclid, clave or fill)`},trigger:{help:`a gate, the old spelling of play=: the notes it plays (trigger=&tune)`,doc:`mix.md`,value:`cell`,on:[`gate`],old:`play=`},gate:{help:`a gate, the old spelling: a level over time, one factor of level= (gate=&duck)`,doc:`mix.md`,value:`cell`,on:[`gate`],old:`level=`},velocity:{help:`a gate, the old spelling: a level, one factor of level= (velocity=&accent)`,doc:`mix.md`,value:`cell`,on:[`gate`],old:`level=`},gain:{help:`on a voice: its own gain, dough’s, times every gain it is played at (1 by default, a negative one inverts the phase; a kit member’s balance); on a gate written the old way (trigger=): the number in level=`,doc:`sound.md`,value:`number`,on:[`voice`,`gate`]},scope:{help:`a scope: stack, split, xy (in time) — spectrum, waterfall (in frequency, or value); its braid lists its channels`,doc:`display.md`,value:`word`,on:[`scope`]},fold:{help:`a spectrum or waterfall: pitches folded by this stride into as many bins (12: by pitch class, the default)`,doc:`display.md`,value:`number`,on:[`scope`]},bins:{help:`a spectrum or waterfall without a fold: this many bands, low to high (1 a meter, 3 low-mid-high, 20 an equaliser)`,doc:`display.md`,value:`number`,on:[`scope`]},channels:{help:`a spectrum or waterfall: sum (one, the default) or split (each channel its own)`,doc:`display.md`,value:`word`,on:[`scope`]},restart:{help:`what switching a part on does to its time (on a selector: for all its sections) — restart (from its top, the default), resume (where it stopped), free (its time runs on, only its sound is switched; a performer’s default)`,doc:`time.md`,value:`word`,on:[`section`,`performer`,`selector`],stub:!0},law:{help:`a law that computes the notes (law=fiveto12: the 5 to 12 cycle, a day of music)`,doc:`time.md`,value:`word`,on:[`law`]},anchor:{help:`a clock (a day meter, loop=1d): the time of day it stands at when play starts (hours.minutes — 11.55); play begins where the clock stands`,doc:`time.md`,value:`number`,on:[`clock`]}},_r={sound:`s`,cutoff:`lpf`,ctf:`lpf`,lp:`lpf`,resonance:`lpq`,hcutoff:`hpf`,hp:`hpf`,hresonance:`hpq`,bandf:`bpf`,bp:`bpf`,bandq:`bpq`,verb:`room`,reverb:`room`,delayt:`delaytime`,dt:`delaytime`,delayfb:`delayfeedback`,dfb:`delayfeedback`,clip:`legato`},vr={...hr,...gr},yr=new Set(Object.keys(gr).filter(e=>gr[e].value===`cell`)),br=new Set(Object.keys(gr).filter(e=>gr[e].clock)),xr=new Set(Object.keys(vr).filter(e=>vr[e].moves)),Z=new Set(Object.keys(gr).filter(e=>gr[e].voice)),Sr=new Set(Object.keys(gr).filter(e=>gr[e].doc!==`physics.md`&&gr[e].on?.every(e=>e===`clock`||e===`driven`))),Cr=/* @__PURE__ */ new Set([`part`,`role`]),wr=e=>Object.keys(e).some(e=>!Sr.has(e)&&!Cr.has(e));function Tr(e){let t={voice:`a voice`,clock:`a meter (step= a rate)`,driven:`a driven cell (step=&x)`,motor:`a meter with a motor=`,tape:`a tape (write=)`,head:`a read head (play=)`,resonator:`a resonator (body=)`,scope:`a scope (scope=)`,law:`a law (law=)`,card:`the sound card (map=sample)`,note:`a note (a label= and nothing else)`,carrier:`a voice with fm=`,modulator:`a voice another’s fm= names`,gate:`a gate (play= with a braid)`,section:`a section (a name a stepped table of names declares)`,performer:`a performer (a gate or a role a band names)`,selector:`a selector (over= a table of sections, or a band)`},n=e.map(e=>t[e]);return n.length<2?n[0]??``:`${n.slice(0,-1).join(`, `)} or ${n[n.length-1]}`}function Er(e){let t=null,n=e.length<5?2:3;for(let r of Object.keys(vr)){let i=Dr(e,r);i<n&&([t,n]=[r,i])}return t}function Dr(e,t){let n=Array.from({length:e.length+1},(e,n)=>[n,...Array(t.length).fill(0)]);for(let e=1;e<=t.length;e++)n[0][e]=e;for(let r=1;r<=e.length;r++)for(let i=1;i<=t.length;i++)n[r][i]=Math.min(n[r-1][i]+1,n[r][i-1]+1,n[r-1][i-1]+(e[r-1]===t[i-1]?0:1)),r>1&&i>1&&e[r-1]===t[i-2]&&e[r-2]===t[i-1]&&(n[r][i]=Math.min(n[r][i],n[r-2][i-2]+1));return n[e.length][t.length]}let Or=[`12db`,`ladder`,`24db`];function kr(e){return e===void 0?`12db`:typeof e==`number`?Number.isInteger(e)&&e>=0&&e<Or.length?Or[e]:null:Or.includes(e)?e:null}Object.fromEntries(Object.entries(gr).map(([e,t])=>[e,t.help]));let Ar={sine:`sine`,tri:`triangle`,triangle:`triangle`,saw:`sawtooth`,sawtooth:`sawtooth`,square:`square`,pulse:`square`,white:`white`,pink:`pink`,brown:`brown`},jr=e=>`${e}= is gone: an envelope is a cell — in the mix, &theme * &(map=adsr .01 .3 .5 .4) * &lead, or an instrument, &lead [&(map=adsr .01 .3 .5 .4) * &saw]; on the envelope, its slots by name: &(map=adsr attack=.01 decay=.3 sustain=.5 release=.4)`,Mr=e=>`${e}= is gone: a pitch drop is a pitch shape, an envelope in semitones — penv=30 pdec=.04 is pitch=0..30 * &(map=adsr 0 .04 0 0)`,Nr={attack:jr(`attack`),decay:jr(`decay`),sustain:jr(`sustain`),release:jr(`release`),penv:Mr(`penv`),pdec:Mr(`pdec`)},Pr=`fifths12TET`,Fr=`key:main`,Ir=5e4,Lr=2e3,Rr=[`name`,`notes`,`tonic`,`mode`,`steps`,`tempo`,`shift`],zr={fork:[[1,1,1],[6.27,.03,.35]],bell:[[.5,1,.5],[1,.8,1],[1.2,.6,.7],[1.5,.5,.45],[2,.45,.6],[2.5,.3,.35],[2.67,.28,.3],[3,.22,.25]],bar:[[1,1,1],[2.756,.45,.5],[5.404,.22,.3],[8.933,.12,.18]],plate:[[1,1,.8],[1.58,.8,.7],[2.24,.7,.6],[2.92,.55,.55],[3.15,.5,.5],[3.88,.4,.4],[4.47,.35,.35],[5,.3,.3]],box:[[1,1,1],[1.42,.7,.6],[1.91,.5,.45],[2.53,.35,.3]],tine:[[1,1,1],[5.93,.12,.35],[17.6,.03,.12]],pipe:[1,3,5,7,9,11,13].map(e=>[e,1/Math.sqrt(e),1/e]),wire:Array.from({length:12},(e,t)=>t+1).map(e=>[e*Math.sqrt(1+6e-4*e*e),1/(.6+.4*e),1/e]),spring:[[1,1,1]]};function Br(e){if(typeof e!=`number`)return[1,1];let t=Math.min(1,Math.max(0,e));return[Math.min(1,2*(1-t)),Math.min(1,2*t)]}let Vr=e=>e?.map?.kind===`midi`,Hr=e=>t=>e.cells.get(t)?.shift??0,Ur={SAMPLE_RATE:48e3,A4:440},Wr={C:-9,D:-7,E:-5,F:-4,G:-2,A:0,B:2};function Gr(e,t=440){let n=/^([A-G])([#b]?)(-?\d+)$/.exec(e);return n?t*2**((Wr[n[1]]+(n[2]===`#`?1:n[2]===`b`?-1:0)+12*(parseInt(n[3],10)-4))/12):null}function Kr(e,t){if(!t)return Array.from({length:e},(e,t)=>t);if(t.kind===`at`){let n=t.i<0?e+t.i:t.i;return n>=0&&n<e?[n]:null}let n=t.step??1,r=t=>t<0?e+t:t,i=[];if(n>0){let a=t.from===null?0:Math.max(0,Math.min(e,r(t.from))),o=t.to===null?e:Math.max(0,Math.min(e,r(t.to)));for(let e=a;e<o;e+=n)i.push(e)}else{let a=t.from===null?e-1:Math.max(-1,Math.min(e-1,r(t.from))),o=t.to===null?-1:Math.max(-1,Math.min(e-1,r(t.to)));for(let e=a;e>o;e+=n)i.push(e)}return i.length?i:null}function qr(e,t,n){let r=Kr(e,t);return!r||!t||t.abs||!e?r:r.map(t=>((t+n)%e+e)%e)}function Jr(e,t){if(!t)return e.steps;let n=qr(e.units.length,t,e.shift);return n?n.reduce((t,n)=>t+e.unitSteps[n],0):null}function Yr(e,t,n){let r=`&${e}${Gt(t)}`,i=`&${e} has ${n} step${n===1?``:`s`}`;if(!t||t.kind===`at`)return`${r} picks nothing: ${t&&t.i<0?`before the start`:`past the end`}, ${i}`;let a=t.step??1;return a>0&&t.from!==null&&(e=>e<0?n+e:e)(t.from)>=n?`${r} picks nothing: it starts past the end, ${i}`:`${r} picks nothing: ${a>0?`it ends before it starts (a slice runs forwards unless its step is negative: [::-1])`:`it ends after it starts (a negative step runs backwards)`}, ${i}`}function Xr(e){if(e.map?.kind!==`adsr`)return null;let t=e.units.map(e=>e.atom.kind===`note`?e.atom.value:NaN);return t.length!==4||t.some(e=>!(e>=0))?null:{attack:t[0],decay:t[1],sustain:Math.min(1,t[2]),release:t[3]}}function Zr(e){return e.root||e.scan!==null||!!e.bend}let Qr=e=>e.levels.length/Math.max(1,e.pulses);function $r(e){let t=/^([1-9][0-9]*)(n\.?|t)$/.exec(e);if(!t)return null;let n=parseInt(t[1],10);return t[2]===`n.`?3/(2*n):t[2]===`t`?2/(3*n):1/n}function ei(e,t){let n=1/t,r=n/4;if(!(r>1))return{...e,unit:n};let i=[];for(let t=0;t<e.pulses-1e-9;t+=r)i.push(Math.min(r,e.pulses-t));return{...e,unit:n,beats:i,counted:e.pulses/r}}let ti=e=>e.counted??Math.max(1,e.beats.length);function ni(e,t){let n=Math.max(1,Math.round(t)),{counted:r,...i}=e;return{...i,beats:Array.from({length:n},()=>e.pulses/n)}}function ri(e,t,n,r,i=1){let a=[],o=0;for(let s=0;s<n*r;s++){let n=e[s%e.length],r=i===1?n:n**+i;for(let e=0;e<t;e++)a.push(o+e*r/t);o+=r}return{positions:a,lap:o}}function ii(e,t){let n=t.filter(e=>e.share!==.5);return n.length?{...e,swing:n}:e}function ai(e){let t=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>=1&&Number.isInteger(Math.log2(Math.round(e)));return t(1/e)?`${Math.round(1/e)}n`:t(2/(3*e))?`${Math.round(2/(3*e))}t`:t(3/(2*e))?`${Math.round(3/(2*e))}n.`:null}let oi=e=>ai(1/(e.unit*Qr(e)));function si(e,t){let n=t*e.unit;if(!e.beats.some(e=>{let t=e/n;return Math.abs(t-Math.round(t))<1e-9&&Math.round(t)>=2}))return`no beat of this meter divides into two or more of ${ai(t)??`them`} (its beats: ${e.beats.map(t=>ai(t/e.unit)??t).join(` `)}), and swing never moves a beat`;let r={...e,swing:[{level:ai(t)??``,whole:t,share:.6}]};for(let t=0;t*n<e.pulses-1e-9;t++)if(Math.abs(di(r,t*n)-t*n)>1e-9)return null;return`every group of ${ai(t)??`them`} in it is three, and a swing leans pairs alone, its groups of three straight`}let ci=e=>{for(let t=0,n=e;t<=6;t++,n*=2)if(Math.abs(n-Math.round(n))<1e-9)return!0;return!1};function li(e,t){return t!==null&&e===2?[0,Math.min(.95,Math.max(.05,t.share)),1]:Array.from({length:e+1},(t,n)=>n/e)}function ui(e,t,n,r){let i=Math.min(...n.map(e=>e.len)),a=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>=1,o=r!==void 0&&r>0&&a(t/r)?r:void 0,s=0,c=t,l=0,u=t;for(let t=0;t<16;t++){let t=c/i,r=Math.round(t);if(Math.abs(t-r)>1e-9||r<2)break;let d=r===2||r===3?r:r%3==0?3:r%2==0?2:r,f=c/d,p=(e-s)/c*d;if(o===void 0?!ci(p):!a(f/o))break;let m=li(d,n.find(e=>Math.abs(e.len-f)<1e-9)??null),h=Math.min(d-1,Math.max(0,Math.floor(p+1e-9)));s+=h*f,c=f,l+=m[h]*u,u*=m[h+1]-m[h]}return l+(e-s)/c*u}function di(e,t,n){if(!e.swing?.length)return t;let r=e.swing.map(t=>({len:t.whole*e.unit,share:t.share})),i=e.pulses,a=Math.floor(t/i+1e-9),o=t-a*i,s=0,c=0;for(;c<e.beats.length-1&&s+e.beats[c]<=o+1e-9;)s+=e.beats[c++];let l=e.beats[c]??i;return a*i+s+ui(o-s,l,r,n)}function fi(e){if(!e.swing?.length)return null;let t=Math.min(...e.swing.map(t=>t.whole*e.unit));if(!(t>0))return null;let n=[],r=0;for(let i of e.beats.length?e.beats:[e.pulses]){for(let e=0;e<i-1e-9;e+=t)n.push(r+e);r+=i}return n.push(e.pulses),{written:n,swung:n.map(t=>t>=e.pulses-1e-9?e.pulses:di(e,t))}}function pi(e,t){return gi(e,t,!1)}function mi(e,t){return gi(e,t,!0)}let hi=/* @__PURE__ */ new WeakMap;function gi(e,t,n){hi.has(e)||hi.set(e,fi(e));let r=hi.get(e);if(!r)return t;let[i,a]=n?[r.swung,r.written]:[r.written,r.swung],o=e.pulses,s=Math.floor(t/o+1e-12),c=t-s*o,l=0;for(;l+2<i.length&&i[l+1]<=c+1e-12;)l++;let u=i[l+1]-i[l];return s*o+a[l]+(u>0?(c-i[l])/u*(a[l+1]-a[l]):0)}function _i(e){let t=Qr(e),n=e.levels.map((n,r)=>di(e,r/t)*t);return n.some((e,t)=>Math.abs(e-t)>1e-12)?n:null}function vi(e,t){let n=t??yi(e);return{levels:e,written:`meter`,pulses:n.pulses,unit:n.unit,beats:n.beats}}function yi(e){let t=e.flatMap((e,t)=>t===0||e<=2?[t]:[]),n=t.map((n,r)=>(t[r+1]??e.length)-n),r=e.length/Math.max(1,n.length),i=Number.isInteger(Math.log2(r))?4*r:8;return{pulses:e.length,unit:i,beats:n}}function bi(e){let t=e.length;return{levels:e.map(()=>1),written:`scan`,pulses:t,unit:4,beats:e.map(()=>1)}}function xi(e,t,n=1){let r=[],i=e.pulses,a=i*Math.max(1,n);if(t.kind===`note`){let n=t.whole*e.unit;for(let e=0;e*n<a-1e-9;e++)r.push(e*n);return r}for(let a=0;a<Math.max(1,n);a++)if(t.kind===`bar`)r.push(a*i);else if(t.kind===`pulse`)for(let e=0;e<i;e++)r.push(a*i+e);else{let t=0;for(let n of e.beats)r.push(a*i+t),t+=n}return r}function Si(e,t,n){let r=(t===`pulse`?1:t===`beat`?Math.max(...e.beats):t===`1m`?e.pulses:($r(t)??0)*e.unit)/e.unit/n;return(e.legato??[]).filter(e=>e.whole>=r-1e-9).sort((e,t)=>e.whole-t.whole)[0]?.share??1}let Ci=[[`1P 2M 3M 5P 6M`,`major pentatonic`,`pentatonic`],[`1P 2M 3M 4P 5P 6M 7M`,`major`,`ionian`],[`1P 2M 3m 4P 5P 6m 7m`,`minor`,`aeolian`],[`1P 2M 3m 3M 5P 6M`,`major blues`],[`1P 3m 4P 5d 5P 7m`,`minor blues`,`blues`],[`1P 2M 3m 4P 5P 6M 7M`,`melodic minor`],[`1P 2M 3m 4P 5P 6m 7M`,`harmonic minor`],[`1P 2M 3M 4P 5P 6M 7m 7M`,`bebop`],[`1P 2M 3m 4P 5d 6m 6M 7M`,`diminished`,`whole-half diminished`],[`1P 2M 3m 4P 5P 6M 7m`,`dorian`],[`1P 2M 3M 4A 5P 6M 7M`,`lydian`],[`1P 2M 3M 4P 5P 6M 7m`,`mixolydian`,`dominant`],[`1P 2m 3m 4P 5P 6m 7m`,`phrygian`],[`1P 2m 3m 4P 5d 6m 7m`,`locrian`],[`1P 3M 4P 5P 7M`,`ionian pentatonic`],[`1P 3M 4P 5P 7m`,`mixolydian pentatonic`,`indian`],[`1P 2M 4P 5P 6M`,`ritusen`],[`1P 2M 4P 5P 7m`,`egyptian`],[`1P 3M 4P 5d 7m`,`neapolitan major pentatonic`],[`1P 3m 4P 5P 6m`,`vietnamese 1`],[`1P 2m 3m 5P 6m`,`pelog`],[`1P 2m 4P 5P 6m`,`kumoijoshi`],[`1P 2M 3m 5P 6m`,`hirajoshi`],[`1P 2m 4P 5d 7m`,`iwato`],[`1P 2m 4P 5P 7m`,`in-sen`],[`1P 3M 4A 5P 7M`,`lydian pentatonic`,`chinese`],[`1P 3m 4P 6m 7m`,`malkos raga`],[`1P 3m 4P 5d 7m`,`locrian pentatonic`,`minor seven flat five pentatonic`],[`1P 3m 4P 5P 7m`,`minor pentatonic`,`vietnamese 2`],[`1P 3m 4P 5P 6M`,`minor six pentatonic`],[`1P 2M 3m 5P 6M`,`flat three pentatonic`,`kumoi`],[`1P 2M 3M 5P 6m`,`flat six pentatonic`],[`1P 2m 3M 5P 6M`,`scriabin`],[`1P 3M 5d 6m 7m`,`whole tone pentatonic`],[`1P 3M 4A 5A 7M`,`lydian #5p pentatonic`],[`1P 3M 4A 5P 7m`,`lydian dominant pentatonic`],[`1P 3m 4P 5P 7M`,`minor #7m pentatonic`],[`1P 3m 4d 5d 7m`,`super locrian pentatonic`],[`1P 2M 3m 4P 5P 7M`,`minor hexatonic`],[`1P 2A 3M 5P 5A 7M`,`augmented`],[`1P 2M 4P 5P 6M 7m`,`piongio`],[`1P 2m 3M 4A 6M 7m`,`prometheus neapolitan`],[`1P 2M 3M 4A 6M 7m`,`prometheus`],[`1P 2m 3M 5d 6m 7m`,`mystery #1`],[`1P 2m 3M 4P 5A 6M`,`six tone symmetric`],[`1P 2M 3M 4A 5A 6A`,`whole tone`,`messiaen's mode #1`],[`1P 2m 4P 4A 5P 7M`,`messiaen's mode #5`],[`1P 2M 3M 4P 5d 6m 7m`,`locrian major`,`arabian`],[`1P 2m 3M 4A 5P 6m 7M`,`double harmonic lydian`],[`1P 2m 2A 3M 4A 6m 7m`,`altered`,`super locrian`,`diminished whole tone`,`pomeroy`],[`1P 2M 3m 4P 5d 6m 7m`,`locrian #2`,`half-diminished`,`aeolian b5`],[`1P 2M 3M 4P 5P 6m 7m`,`mixolydian b6`,`melodic minor fifth mode`,`hindu`],[`1P 2M 3M 4A 5P 6M 7m`,`lydian dominant`,`lydian b7`,`overtone`],[`1P 2M 3M 4A 5A 6M 7M`,`lydian augmented`],[`1P 2m 3m 4P 5P 6M 7m`,`dorian b2`,`phrygian #6`,`melodic minor second mode`],[`1P 2m 3m 4d 5d 6m 7d`,`ultralocrian`,`superlocrian bb7`,`superlocrian diminished`],[`1P 2m 3m 4P 5d 6M 7m`,`locrian 6`,`locrian natural 6`,`locrian sharp 6`],[`1P 2A 3M 4P 5P 5A 7M`,`augmented heptatonic`],[`1P 2M 3m 4A 5P 6M 7m`,`dorian #4`,`ukrainian dorian`,`romanian minor`,`altered dorian`],[`1P 2M 3m 4A 5P 6M 7M`,`lydian diminished`],[`1P 2M 3M 4A 5A 7m 7M`,`leading whole tone`],[`1P 2M 3M 4A 5P 6m 7m`,`lydian minor`],[`1P 2m 3M 4P 5P 6m 7m`,`phrygian dominant`,`spanish`,`phrygian major`],[`1P 2m 3m 4P 5P 6m 7M`,`balinese`],[`1P 2m 3m 4P 5P 6M 7M`,`neapolitan major`],[`1P 2M 3M 4P 5P 6m 7M`,`harmonic major`],[`1P 2m 3M 4P 5P 6m 7M`,`double harmonic major`,`gypsy`],[`1P 2M 3m 4A 5P 6m 7M`,`hungarian minor`],[`1P 2A 3M 4A 5P 6M 7m`,`hungarian major`],[`1P 2m 3M 4P 5d 6M 7m`,`oriental`],[`1P 2m 3m 3M 4A 5P 7m`,`flamenco`],[`1P 2m 3m 4A 5P 6m 7M`,`todi raga`],[`1P 2m 3M 4P 5d 6m 7M`,`persian`],[`1P 2m 3M 5d 6m 7m 7M`,`enigmatic`],[`1P 2M 3M 4P 5A 6M 7M`,`major augmented`,`major #5`,`ionian augmented`,`ionian #5`],[`1P 2A 3M 4A 5P 6M 7M`,`lydian #9`],[`1P 2m 2M 4P 4A 5P 6m 7M`,`messiaen's mode #4`],[`1P 2m 3M 4P 4A 5P 6m 7M`,`purvi raga`],[`1P 2m 3m 3M 4P 5P 6m 7m`,`spanish heptatonic`],[`1P 2M 3m 3M 4P 5P 6M 7m`,`bebop minor`],[`1P 2M 3M 4P 5P 5A 6M 7M`,`bebop major`],[`1P 2m 3m 4P 5d 5P 6m 7m`,`bebop locrian`],[`1P 2M 3m 4P 5P 6m 7m 7M`,`minor bebop`],[`1P 2M 3M 4P 5d 5P 6M 7M`,`ichikosucho`],[`1P 2M 3m 4P 5P 6m 6M 7M`,`minor six diminished`],[`1P 2m 3m 3M 4A 5P 6M 7m`,`half-whole diminished`,`dominant diminished`,`messiaen's mode #2`],[`1P 3m 3M 4P 5P 6M 7m 7M`,`kafi raga`],[`1P 2M 3M 4P 4A 5A 6A 7M`,`messiaen's mode #6`],[`1P 2M 3m 3M 4P 5d 5P 6M 7m`,`composite blues`],[`1P 2M 3m 3M 4A 5P 6m 7m 7M`,`messiaen's mode #3`],[`1P 2m 2M 3m 4P 4A 5P 6m 6M 7M`,`messiaen's mode #7`],[`1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M`,`chromatic`]];function wi(e){let t=/^([1-7])([PMmAd])$/.exec(e);if(!t)throw Error(`not an interval: ${e}`);let n=Number(t[1]);return[0,2,4,5,7,9,11][n-1]+{P:0,M:0,m:-1,A:1,d:n===1||n===4||n===5?-1:-2}[t[2]]}let Ti=Object.fromEntries(Ci.flatMap(([e,...t])=>{let n=e.split(` `).map(wi),r=n.map((e,t)=>(n[t+1]??12)-e);return t.map(e=>[e,r])}));function Ei(e,t){e.i++;let n=[];for(;e.skipSpace(),e.peek()!==`)`;){let t=e.i;if(e.text.startsWith(`geo(`,e.i)){e.i+=4,e.skipSpace();let r=e.num(`a ratio, like geo(5, 25, 0 10 5)`,q.geo,`ratio`).value;e.skipSpace(),e.expect(`,`,`',' then the steps per ratio: geo(${r}, 25, 0 10 5)`),e.skipSpace();let i=e.int(`the steps per ratio`,{...q.geo,whole:!0,min:1},`steps`);e.skipSpace(),e.expect(`,`,`',' then the exponents: geo(${r}, ${i}, 0 10 5)`);let a=[];for(;e.skipSpace(),e.peek()!==`)`;)a.push(e.num(`an exponent`,q.geo,`exponent`).value);e.i++,(!(r>0)||i<1||a.length===0)&&e.fail(`geo(r, n, k …): r above 0, n ≥ 1, at least one k`,t,e.i-t);for(let e of a)n.push(+(r**+(e/i)).toFixed(9));continue}let r=e.free(q.interval);if(r!==null)r.lo>0||e.fail(`A scan interval stays positive: give free(…) a range above 0`,t,e.i-t),n.push(r.value);else{let r=e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);r!==null&&parseFloat(r)>0||e.fail(`scan(…) takes positive intervals, like scan(2 2 1 2 2 2 1)`,t);let i=1;if(e.peek()===`!`){e.i++;let n=e.freeNumber(q.intervals),r=n===null?e.match(/[0-9]+/y):String(n);r!==null&&parseInt(r,10)>=1||e.fail(`x!n repeats an interval n times: scan(1!4 2)`,t,e.i-t),i=parseInt(r,10)}for(let e=0;e<i;e++)n.push(parseFloat(r))}e.skipSpace(),e.peek()===`,`&&e.i++}e.expect(`)`,`')' to close scan(…)`),n.length===0&&e.fail(`scan(…) needs at least one interval`,t,e.i-t);let r=e.span(t);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),{kind:`scan`,steps:n,span:r}}function Di(e,t){if(e<=0)return Array(t).fill(!1);let n=Array.from({length:e},()=>[!0]),r=Array.from({length:t-e},()=>[!1]);for(;r.length>1;){let e=Math.min(n.length,r.length),t=Array.from({length:e},(e,t)=>[...n[t],...r[t]]),i=n.length>e?n.slice(e):r.slice(e);n=t,r=i}return[...n,...r].flat()}function Oi(e,t){e.i++,e.skipSpace();let n;if(e.peek()===`f`)n=ir(e,`text`,!1).text??``;else{let t=e.match(/"[^"]*"/y);t===null&&e.fail(`spell(text, &table, "names"): the text first — "867 5309" or free("867 5309")`),n=t.slice(1,-1)}e.skipSpace(),e.expect(`,`,`',' then the table, like spell("867", &keys, "1 2 3 …")`),e.skipSpace();let r=e.cellRef(`the table its characters pick from, like &keys`,`in spell(…)`);e.skipSpace(),e.expect(`,`,`',' then the names of the table's entries, in quotes`),e.skipSpace();let i=e.match(/"[^"]*"/y);i===null&&e.fail(`the names of the table’s entries, in quotes: "1 2 3 A 4 5 6 B …"`);let a=i.slice(1,-1).trim().split(/\s+/).filter(Boolean);e.skipSpace(),e.expect(`)`,`')' to close spell(…)`);let o=e.span(t);e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);let s={atom:{kind:`rest`},repeat:1,subdivide:1,elongate:1,span:o},c=[...n].flatMap(e=>{let t=a.indexOf(e);return t<0?[s,s]:[{atom:{kind:`ref`,name:r.name,pick:{kind:`at`,i:t,abs:!0},shift:0},repeat:1,subdivide:1,elongate:1,span:o},s]});return c.length||c.push(s),{kind:`list`,tokens:c,span:o}}let ki=[2,3,4,6];function Ai(e){let t=/^([1-9][0-9]*(?:\+[1-9][0-9]*)+)(?:\/(2|4|8|16|32))?$/.exec(e);if(t){let e=t[1].split(`+`).map(Number);return e.every(e=>ki.includes(e))?{pulses:e.reduce((e,t)=>e+t,0),unit:Number(t[2]??8),groups:e}:null}let n=/^([1-9][0-9]*)\/(2|4|8|16|32)$/.exec(e);if(!n)return null;let[r,i]=[Number(n[1]),Number(n[2])];if(r<2||r>32)return null;if(i>=8){let e=fe(Math.ceil(r/3),r,Math.ceil(r/3)-1);return{pulses:r,unit:i,groups:e.map((t,n)=>(e[n+1]??r)-t)}}return{pulses:r,unit:i,groups:r%3==0&&r>=6?Array(r/3).fill(3):Array(r).fill(1)}}function ji(e){let t=Ai(e);return{pulses:t?.pulses??0,unit:t?.unit??4,beats:t?.groups??[]}}function Mi(e){let t=Array(e).fill(1/0),n=(e,r,i)=>{if(t[e]=Math.min(t[e],i),r-e<=3){for(let n=e+1;n<r;n++)t[n]=Math.min(t[n],i+1);return}let a=e+fe(2,r-e,1)[1];n(e,a,i+1),n(a,r,i+1)};return n(0,e,0),t}function Ni(e,t){let n=e.unit>=8?1:8/e.unit,r=e.groups.map(e=>e*n),i=Mi(r.length),a=Math.max(0,...i),o=r.some(e=>e>=4)?a+1:null,s=(o??a)+1,c=s+1,l=/* @__PURE__ */ new Map;r.reduce((e,t,n)=>{if(l.set(e,i[n]),o!==null&&t>=4)for(let n=2;n<t;n+=2)l.set(e+n,o);return e+t},0);let u=e.unit>=8?t:t*e.unit/8,d=e.pulses*t;return{tiers:Array.from({length:d},(n,r)=>{let i=r/u,a=e=>Math.abs(e-Math.round(e))<1e-9;return a(i)?l.get(Math.round(i))??s:a(2*i)?c:e.unit<=4&&t===3?s:c}),eighth:s,step:c}}let Pi=(e,t,n)=>e===0?0:e===n?4:e===t?3:Math.min(e,2),Fi=e=>({"*":0,"+":1,"-":2,":":2,";":2,".":3,",":4})[e]??0,Ii=/^[*+\-:;.,]+$/;function Li(e,t){if(Ii.test(e))return[...e].map(Fi);let n=Ai(e);if(!n)return[];let{tiers:r,eighth:i,step:a}=Ni(n,t);return r.map(e=>Pi(e,i,a))}function Ri(e,t){e.i++,e.skipSpace();let n=t=>{if(e.peek()===`"`)return e.match(/"[^"]*"/y).slice(1,-1);let n=e.free(q.meter);if(n!==null)return n.key===`text`||n.text!==void 0?n.text??``:n.labels?n.labels[Math.round((n.value-n.lo)/((n.hi-n.lo)/Math.max(1,n.labels.length-1)||1))]??``:String(n.value);let r=e.match(/[1-9][0-9]*(?:n\.?|t)(?![0-9A-Za-z])|[0-9]+/y);return r===null&&e.fail(`${t}: in quotes ("4/4"), a number, a note value (16n) or free(…)`),r},r=n(`the time signature`),i=Ii.test(r)?null:Ai(r);e.skipSpace();let a=1,o=null;if(e.peek()===`,`){e.i++,e.skipSpace();let t=e.i,s=n(`the step: steps a pulse, or its note value`),c=$r(s);if(c!==null){if(i){let n=1/i.unit/c;Math.abs(n-Math.round(n))<1e-9&&Math.round(n)>=1&&Math.round(n)<=8||e.fail(`meter("${r}", ${s}): the step divides the pulse, ${ai(1/i.unit)??`a 1/${i.unit}`}, into 1 to 8 steps`,t,s.length),a=Math.round(n)}else o=c}else a=Math.max(1,Math.min(8,parseInt(s,10)||1));e.skipSpace()}e.expect(`)`,`')' to close meter(…)`);let s=e.span(t);e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);let c=Li(r,a);c.length||e.fail(`meter("${r}"): a time signature (x/2 x/4 x/8 x/16: 4/4, 6/8, 7/8, 2/2), groups as sizes ("2+2+3" of eighths, "2+2+3/4" of quarters; each 2, 3, 4 or 6), or levels like "*.-.+.-." (* the bar, + - : ; beats, the higher the stronger, . the eighth, , finer)`,t,s.len);let l=c.map(e=>({atom:{kind:`note`,value:e,alter:0},repeat:1,subdivide:1,elongate:1,span:s})),u=()=>{let e=[...r].flatMap((e,t)=>t===0||e!==`.`&&e!==`,`?[t]:[]);return e.map((t,n)=>(e[n+1]??r.length)-t)},d=i?ji(r):o===null?void 0:{pulses:r.length,unit:1/o,beats:u()},f=d?d.beats.length:u().length;return{kind:`list`,tokens:l,span:s,perBeat:c.length/Math.max(1,f),...d?{signature:d}:{}}}function zi(e,t,n){e.i++;let r=[];for(;e.skipSpace(),r.push(e.int(`a number in ${t}(…)`,q.args,t)),e.skipSpace(),e.peek()===`,`;)e.i++;e.expect(`)`,`')' to close ${t}(…)`);let i=e.span(n);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),{args:r,span:i}}function Bi(e,t){let{args:n,span:r}=zi(e,`euclid`,t),[i,a,o=0]=n;(n.length<2||n.length>3||!(a>=1)||!(i>=0&&i<=a))&&e.fail(`euclid(k, n): k hits spread evenly over n steps (0 ≤ k ≤ n), euclid(k, n, shift) turned`,t,r.len);let s=Di(i,a);return{kind:`list`,tokens:Array.from({length:a},(e,t)=>{let n=((t-o)%a+a)%a;return{atom:s[n]?{kind:`note`,value:0,alter:0}:{kind:`rest`},repeat:1,subdivide:1,elongate:1,span:r}}),span:r}}function Vi(e,t){let{args:n,span:r}=zi(e,`even`,t),[i,a,o=0]=n;return(n.length<2||n.length>3||!(i>=1)||!(a>=i))&&e.fail(`even(k, n): k places spread as evenly as they go over n (1 ≤ k ≤ n), even(k, n, phase) its mode`,t,r.len),o>=0&&o<i||e.fail(`even(${i}, ${a}, phase): the phase is a mode, 0 to ${i-1}, each one place moved`,t,r.len),{kind:`scan`,steps:he(fe(i,a,o),a),span:r}}let Hi={sin:`a sine`,saw:`a saw`,tri:`a triangle`,square:`a square`},Ui=e=>(t,n)=>{let{args:r,span:i}=zi(t,e,n),[a]=r;return(r.length!==1||a<2)&&t.fail(`${e}(n): one cycle of ${Hi[e]} in n steps, n ≥ 2`,n,i.len),{kind:`wave`,shape:e,n:a,span:i}};function Wi(e,t){let n=t=>e===`sin`?Math.sin(2*Math.PI*t):e===`saw`?2*t-1:e===`tri`?t<.5?4*t-1:3-4*t:Math.floor(2*t)%2?1:-1;return Array.from({length:t},(e,r)=>+n(r/t).toFixed(6)+0)}let Gi={C:0,D:2,E:4,F:5,G:7,A:9,B:11},Ki=e=>[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`][(e%12+12)%12];function qi(e,t){e.i++,e.skipSpace();let n,r=0,i=`0`,a=null,o=null,s=e.match(/-?[0-9]+/y),c=s===null?e.match(/"[^"]*"/y):null;if(c!==null){let a=/^"([A-G](?:#|b)?)([0-9]*)((?::[a-z0-9#'-]+)+)"$/.exec(c);a||e.fail(`scale("tonic:name"): a tonic and a scale's name, as in Strudel — scale("D:minor"), scale("F#:harmonic:minor")`,t,e.i-t),a[2]&&e.fail(`scale("${a[1]}${a[2]}:…"): the octave is the voice's (loop=), not the scale's: scale("${a[1]}${a[3]}")`,t,e.i-t);let o=a[3].slice(1).split(`:`),[s,l]=[o.join(` `),o.join(``)],u=Object.hasOwn(Ti,s)?Ti[s]:Object.hasOwn(R,l)?R[l].steps:void 0;u||e.fail(`scale("…${a[3]}"): a scale by name — ours (${Object.keys(R).join(` `)}) or tonal's, as Strudel reads them (harmonic:minor, minor:pentatonic, whole:tone, diminished, chromatic, bebop … listed in tables.md)`,t,e.i-t),n=[...u];let d=a[1];r=((Gi[d[0]]+(d[1]===`#`?1:d[1]===`b`?-1:0))%12+12)%12,i=String(r),e.skipSpace(),e.expect(`)`,`')' to close scale(…)`)}else if(s!==null){e.skipSpace(),e.expect(`,`,`',' then the mode — better by name: scale(minor, A)`),e.skipSpace();let a=e.i,o=e.int(`the mode, 0 (the darkest) to 6`,q.phase);o>6&&e.fail(`scale(tonic, phase): the phase is a mode, 0 (the darkest, Locrian) to 6 (the brightest, Lydian) — not ${o}`,a,String(o).length),r=parseInt(s,10),i=s,n=he(fe(7,12,o),12),e.skipSpace(),e.expect(`)`,`')' to close scale(…)`),e.warn(`scale(${r}, ${o}) is written scale(${de(o)}, ${Ki(r)}): the mode by name, then the tonic`,t,e.i-t)}else{let t=e.i;if(e.peek()===`&`)o=e.cellRef(`the cell that holds the mode, like scale(&mode, &tonic)`,`as the mode`),n=ue(z.major);else{let r=e.match(/[a-z]+/y),i=r?R[r]:void 0;i||e.fail(`scale(name, tonic): a scale by name — ${Object.keys(R).join(` `)}, or a cell holding a mode (&mode)`,t,Math.max(1,(r??``).length)),n=[...i.steps]}if(e.skipSpace(),e.peek()===`,`){e.i++,e.skipSpace();let t=e.i,n=e.match(/[A-G](?:#|b)?(?![A-Za-z0-9])/y);if(n!==null)r=((Gi[n[0]]+(n[1]===`#`?1:n[1]===`b`?-1:0))%12+12)%12,i=String(r);else if(e.peek()===`&`)a=e.cellRef(`the cell that holds the tonic, like scale(dorian, &tonic)`,`as the tonic`),i=`&${a.name}`;else{let n=e.text.startsWith(`free(`,e.i);r=e.int(`the tonic: a note name (D, F#, Bb), a number, a cell (&tonic) or free(…)`,q.tonic),i=n?e.text.slice(t,e.i):String(r),Math.abs(r)>11&&e.warn(`scale(…, ${r}): the tonic is a pitch class, 0 (C) to 11 (B)`,t,e.i-t)}e.skipSpace()}e.expect(`)`,`')' to close scale(…)`)}let l=e.span(t),u=`key:λ${e.line}_${t+e.offset}`;return e.lambdas.push({name:u,span:l,lambda:`shift=${i}`,over:null,shift:r,...a?{tonic:a}:{},off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`blank`}}),{steps:n,key:{name:u,pick:null,shift:0,span:l},span:l,...o?{mode:o}:{}}}function Ji(e,t){e.i++,e.skipSpace();let n=0;if(e.peek()!==`)`){let t=e.i,r=e.noteName();if(n=r===null?e.int(`how many fifths round it starts (fifths(1): on G), or the note it starts on: fifths(G)`,q.fifths):(r%12+12)%12*7%12,r===null&&Math.abs(n)>11){let r=Math.trunc(n/12),i=n%12,a=`C G D A E B F# C# Ab Eb Bb F`.split(` `)[(i+12)%12];e.warn(`fifths(${n}): the circle comes round after 12, and a turn past a lap climbs one, as every shift does: fifths(${i}) ${r>0?`up`:`down`} ${Math.abs(r)} octave${Math.abs(r)===1?``:`s`}${i?` (fifths(${a}) names the note, no octave)`:``}`,t,e.i-t)}e.skipSpace()}e.expect(`)`,`')' to close fifths(…)`);let r=e.span(t);return{braid:{kind:`list`,tokens:Array.from({length:12},(e,t)=>({atom:{kind:`note`,value:t*7%12,alter:0},repeat:1,subdivide:1,elongate:1,span:r})),span:r},shift:n}}let Yi=W(`generator`,`sin(n) · saw(n) · tri(n) · square(n)`,`One cycle of a waveform in n steps, from −1 to 1, as Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step: a sine from 0, a saw rising from −1, a triangle rising from −1 to 1 at the half and falling back, a square −1 then 1. A waveform, or a slow swell.`,[`&sine loop=220 sin(12)`,`&ramp loop=220 saw(8)`,`&swell map=lin loop=.25 tri(4)`,`&pulse loop=110 square(2)`],`braid.md`),Xi={scan:{parse:Ei,syntax:W(`generator`,`scan(i …)`,"Running totals of intervals: a scale or a meter. An interval can repeat (`1!4`), be geometric (`geo(r, n, k …)`: r^(k/n) for each k) or be `free(…)`.",[`&major scan(2 2 1 2 2 2 1)`,`&bar scan(27 23 26 24) step=84bpm`,`&tempo scan(1!4 .5!2)`,`&series scan(geo(5, 25, 0 10 5))`,`&mode scan(2 2 free(1, 1..2) 2 2 2 1)`],`braid.md`)},euclid:{parse:Bi,syntax:W(`generator`,`euclid(k, n) · euclid(k, n, shift)`,`k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned right by shift steps, as Strudel's (k, n, r).`,[`&tresillo euclid(3, 8)`,`&clave euclid(5, 16, 2)`],`braid.md`)},even:{parse:Vi,syntax:W(`generator`,`even(k, n) · even(k, n, phase)`,`k places spread as evenly as they go over n: a table (the scan of its intervals), its phase its mode, 0 to k − 1, each one place moved. The one generator under the diatonic (even(7, 12), its phases the seven modes), the pentatonic, the standard bell, the tresillo and a meter's groups (decision 072); euclid(k, n, r) is its places as a rhythm of n steps, turned as Strudel's.`,[`&ionian even(7, 12, 5)`,`&pentatonic even(5, 12)`,`&minorPentatonic even(5, 12, 3)`,`&tresillo even(3, 8, 2)`],`tables.md`)},sin:{parse:Ui(`sin`),syntax:Yi},saw:{parse:Ui(`saw`),syntax:Yi},tri:{parse:Ui(`tri`),syntax:Yi},square:{parse:Ui(`square`),syntax:Yi},scale:{parse:(e,t)=>e.fail(`scale(…) is read by its cell`,t,5),syntax:W(`generator`,`scale(name) · scale(name, tonic) · scale("tonic:name")`,`A scale by name over the 12, turned to its tonic (a note name, a number, a cell holding one, or free(…); C if left out): the scan of its steps over a key of its own. Its name may be a cell holding a diatonic mode (&mode dorian, its phase from the darkest: locrian 0 … lydian 6). Its shift= walks its modes; the tonic transposes. The names: ${Object.keys(R).join(` `)}. Strudel's spelling reads the same: scale("D:minor"), its words after colons (scale("F#:harmonic:minor")), with every scale tonal knows (${Object.keys(Ti).length} names: whole:tone, diminished, bebop:major, chromatic …); the octave is the voice's, not the scale's.`,[`&scale scale(minor, D)`,`&blues scale(blues)`,`&scale scale(dorian, free(2, 0..11))`,`&key scale(dorian, &tonic)`,`&key scale(&mode, &tonic)`,`&scale scale("F#:harmonic:minor")`],`tables.md`)},fifths:{parse:(e,t)=>e.fail(`fifths(…) is read by its cell`,t,6),syntax:W(`generator`,`fifths() · fifths(n) · fifths(note)`,`The circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C; turned n fifths round, or to start on a note (its shift=: [0] is where it starts, [$0] is C). Drawn round its wheel in its own order.`,[`&circle fifths()`,`&circleG fifths(1)`,`&circleG fifths(G)`],`tables.md`)},meter:{parse:Ri,syntax:W(`generator`,`meter("sig") · meter("sig", step) · meter("2+2+3") · meter("2+2+3/4") · meter("levels")`,`A bar as levels, one per step, its numbers its tiers from the ends: 0 the downbeat, 1 a beat, 2 a half's beat (and any tier between), 3 the eighth, 4 finer. A time signature by rule (contracts/meter v2, decision 072): x/8 and x/16 grouped as the canonical even set of ⌈x/3⌉ groups (7/8 is 3+2+2, 8/8 3+3+2), x/4 and x/2 in beats of the denominator, or in threes where x is a multiple of 3 from 6 (6/4). Its step is a number a pulse or a note value (meter("6/8", 16n)). Groups written as sizes, of eighths or of the denominator after a slash (2+2+3, 2+2+3/4), each 2, 3, 4 or 6. Or levels written out (* the bar, + - : ; beats, . the eighth, , finer), with their step's note value. Of four groups or more, each half's start is the stronger: 4/4 is *.-.+.-. (#17). Its bpm counts beats, its groups. Each argument can be free(…).`,[`&bar meter("4/4", 2) step=100bpm`,`&bar meter("6/8") step=60bpm`,`&bar meter("2+2+3") step=90bpm`,`&bar meter("2/2", 2) step=60bpm`,`&bar meter("*.+.+..") step=90bpm`],`time.md`)},spell:{parse:Oi,syntax:W(`generator`,`spell("text", &table, "names")`,`A text spelled through a table: each character that is one of the names plays that entry of the table, then a pause; anything else rests as long. The text can be free("…"), a field to type in.`,[`&dial spell("867 5309", &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")`,`&dial spell(free("867 5309"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")`],`braid.md`)}},Zi={agogic:(e,t)=>{let{args:n,span:r}=zi(e,`agogic`,t),[i,a]=n,o=me(i,a).map(e=>Math.round(e/12*100));return e.fail(`agogic(…) is gone: write the beats as a scan, scan(${he(o,100).join(` `)})`,t,r.len)}},Qi=e=>e in Xi||e in Zi;function $i(e,t,n){return(Xi[t]?.parse??Zi[t])(e,n)}function ea(e){if(e.peek()!==`:`)return;e.rejectTap(e.text.slice(0,e.i).search(/&[^\s:,[\]()*+&]*$/)),e.i++;let t=e.i;e.free(q.hitNumber);let n=e.match(/[0-9]+/y);if(n===null)return e.fail(`A hit is &bd:n:gain, its number first: &bd:0:.3`,t,1);if(parseInt(n,10)!==0&&e.fail(`&bd:${n} would be a pitched hit, ${n} up its table: not yet (write &bd:0:gain)`,t,n.length),e.peek()!==`:`)return;e.i++;let r=e.i,i=e.freeNumber(q.hit),a=i===null?e.match(/[0-9]*\.[0-9]+|[0-9]+/y):String(i);return a===null?e.fail(`A hit’s gain: a number, &bd:0:.3 (1 as it is)`,r,1):parseFloat(a)}function ta(e,t){let n=0,r=!1,i=[[]],a=``,o=()=>{a&&i[i.length-1].push(a),a=``};for(let s=t;s<e.length;s++){let t=e[s];if(t===`&`&&(r=!0),t===`[`||t===`(`){if(n++===0)continue}else if(t===`]`||t===`)`){if(--n===0)break}else if(n===1&&t===`,`){o(),i.push([]);continue}else if(n===1&&/\s/.test(t)){o();continue}a+=t}if(o(),!r)return!1;let s=e=>/^[*+(-]|[*+-]$/.test(e);return!i.some(e=>e.length>1&&!e.some(s)||e.length===1&&e[0].startsWith(`[`))}function na(e){e.i++;let t=[];for(;;){if(t.push(ra(e,0)),e.skipSpace(),e.peek()===`,`){e.i++;continue}let n=e.peek();return n===`|`&&e.fail(`',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); a choice [a|b] picks between numbers in a braid (&x [0|2]), not between cells`,e.i,1),(n===`[`||n===`&`)&&e.fail(`',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); one term is a product or a sum, its parts joined by * or +`,e.i,1),e.expect(`]`,`',' or ']' in the mix`),{kind:`mix`,exprs:t}}}function ra(e,t){let n=e.i,r=[{e:ia(e,t),sign:1}];for(;;){e.skipSpace();let n=e.peek();if(n!==`+`&&n!==`-`)break;e.i++,r.push({e:ia(e,t),sign:n===`-`?-1:1})}return r.length===1?r[0].e:{k:`sum`,items:r,span:e.span(n)}}function ia(e,t){e.skipSpace();let n=e.i,r=[aa(e,t)];for(;e.skipSpace(),e.peek()===`*`;)e.i++,r.push(aa(e,t));return r.length===1?r[0]:{k:`prod`,factors:r,span:e.span(n)}}function aa(e,t){e.skipSpace();let n=e.i;if(e.peek()===`(`){t>=32&&e.fail(`Parentheses in a mix nest 32 deep at most: name a part (&part [ … ]) and use it`,n),e.i++;let r=ra(e,t+1);return e.skipSpace(),e.expect(`)`,`')' to close the group`),r}if(e.peek()===`&`){let t=e.ref(`a cell, like &theme`),n=ea(e);return n===void 0?{k:`ref`,ref:t}:{k:`ref`,ref:t,level:n}}let r=e.free(q.gain);if(r!==null)return{k:`num`,value:r.value,span:e.span(n)};let i=e.match(ur);return i===null?(e.match(/gate\(/y)&&e.fail(`gate(…) is planned but not built yet: for now a step= term articulates, loop= terms bend`,n,5),e.fail(`Expected a cell, a number or '(' here`)):{k:`num`,value:parseFloat(i),span:e.span(n)}}let oa=RegExp(`(?:${Object.keys(z).join(`|`)})(?![A-Za-z0-9_])`,`y`),sa=[`degree`,`inverse`],ca=/(degree|inverse)\(/y;function la(e){let t=e.match(ca);if(t===null){let t=e.ref(`a cell like &motif`);return{kind:`ref`,name:t.name,pick:t.pick,shift:t.shift,...t.slot?{slot:t.slot}:{},...t.transpose?{transpose:t.transpose}:{},...t.degree?{values:{mul:1,add:t.degree}}:{}}}let n=t.slice(0,-1);e.skipSpace(),e.peek()!==`&`&&!e.text.startsWith(`degree(`,e.i)&&!e.text.startsWith(`inverse(`,e.i)&&e.fail(n===`degree`?`degree(&cell, n): a cell, then how many steps of its table up (−n down)`:`inverse(&cell): a cell, mirrored round 0`,e.i);let r=la(e);e.skipSpace();let i=r.values??{mul:1,add:0},a;if(n===`degree`){e.expect(`,`,`',' then the steps: degree(&${r.name}, 1)`),e.skipSpace();let t=e.match(/[-+]?\s*[0-9]+(?![0-9.])/y);t===null&&e.fail(`degree(&${r.name}, n) moves it n whole steps of its table, a whole number: degree(&${r.name}, 1), degree(&${r.name}, -2)`,e.i),a={mul:i.mul,add:i.add+parseInt(t.replace(/\s+/g,``),10)}}else a={mul:i.mul===1?-1:1,add:-i.add};return e.skipSpace(),e.expect(`)`,`')' to close ${n}(…)`),{kind:`ref`,name:r.name,pick:r.pick,shift:r.shift,...r.slot?{slot:r.slot}:{},...r.transpose?{transpose:r.transpose}:{},...a.mul===1&&a.add===0?{}:{values:a}}}function ua(e,t){let n=e.peek();if(n===`&`||e.text.startsWith(`degree(`,e.i)||e.text.startsWith(`inverse(`,e.i))return la(e);if(n===`~`)return e.i++,{kind:`rest`};if(n===`=`)return e.i++,{kind:`rest`,keep:!0};if(n===`_`)return e.i++,{kind:`rest`,hold:!0};if(n===`[`)return ta(e.text,e.i)?na(e):da(e,t);if(n===`<`)return fa(e,t);if(n===`-`||n===`.`||n>=`0`&&n<=`9`||e.text.startsWith(`free(`,e.i)){let t=e.num(`a number`,q.step),n=e.match(/[#bsf]+(?![A-Za-z0-9_])/y)??``,r=t.alter+[...n].reduce((e,t)=>e+(t===`#`||t===`s`?1:-1),0);return{kind:`note`,value:t.value,alter:r}}let r=e.noteName();if(r!==null)return{kind:`note`,value:r,alter:0,pitched:!0};let i=e.match(oa);return i===null?e.fail(`Unexpected '${n}' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value`):{kind:`note`,value:z[i],alter:0}}function da(e,t){let n=e.i;t>=32&&e.fail(`Brackets nest 32 deep at most: name the inner steps (&inner 0 2) and splice them`,n,1),e.i++;let r=[[]],i=null;for(;;){e.skipSpace();let a=e.peek();if(a===`]`)break;a===``&&e.fail(i===`|`?`']' to close the choice: [0|4|7]`:`']' to close the bracket: [0 2] · [0, 4]`,n,e.i-n),a===`,`||a===`|`?(i!==null&&i!==a&&e.fail(`A bracket is a chord or a stack (commas) or a choice (bars), not both: [0, 4] · [0|4]`,e.i,1),r[r.length-1].length||e.fail(a===`,`?`A step before the comma: [0, 4]`:`A step before the bar: [0|4] · [0 2|4]`,e.i,1),i=a,r.push([]),e.i++):ha(e,r[r.length-1],_a(e,t+1))}e.i++,r[r.length-1].length||e.fail(i===null?`Empty brackets: [0 2] is a subsequence, [0, 2] a chord`:i===`,`?`A step after the comma: [0, 4]`:`A step after the bar: [0|4] · [0 2|4]`,n,e.i-n);let a=e=>e.repeat===1&&e.subdivide===1&&e.elongate===1&&e.chance===void 0,o=r.every(e=>e.length===1&&a(e[0])&&e[0].atom.kind===`note`),s=r.map(e=>e[0].atom);if(i===`|`)return o&&!s.some(e=>e.pitched)?{kind:`choice`,values:s.map(e=>e.value),alters:s.map(e=>e.alter)}:{kind:`seq`,layers:r,mode:`choose`};if(o){let e=s.map(e=>!!e.pitched);return{kind:`chord`,notes:s.map(e=>e.value),alters:s.map(e=>e.alter),...e.some(Boolean)?{pitched:e}:{}}}return{kind:`seq`,layers:r}}function fa(e,t){let n=e.i;t>=32&&e.fail(`Brackets nest 32 deep at most: name the inner steps (&inner 0 2) and splice them`,n,1),e.i++;let r=[[]];for(;;){e.skipSpace();let i=e.peek();if(i===`>`)break;i===``&&e.fail(`'>' to close the alternation: <0 2 4>`,n,e.i-n),i===`|`&&e.fail(`An alternation takes steps, stacked with commas (<0 2, 4 5>); a choice goes in square brackets: [0 2|4]`,e.i,1),i===`,`?(r[r.length-1].length||e.fail(`A step before the comma: <0 2, 4 5>`,e.i,1),r.push([]),e.i++):ha(e,r[r.length-1],_a(e,t+1))}return e.i++,r[r.length-1].length||e.fail(r.length>1?`A step after the comma: <0 2, 4 5>`:`An empty alternation: <0 2 4> plays one of its steps a lap`,n,e.i-n),{kind:`seq`,layers:r,mode:`alt`}}function pa(e){let t=e.i;e.i++;let n=[];for(;e.skipSpace(),n.push(e.int(`a whole number in x(k, n, r)`,q.euclidOn)),e.skipSpace(),e.peek()===`,`;)e.i++;e.expect(`)`,`')' to close x(k, n, r)`);let[r,i,a=0]=n;(n.length<2||n.length>3||!(i>=1&&i<=4096)||!(r>=0&&r<=i))&&e.fail(`x(k, n, r): k hits spread evenly over n parts of the step (0 ≤ k ≤ n), turned right by r: 0(3,8), &bd(3,8,2)`,t,e.i-t);let o=Di(r,i);return{k:r,n:i,r:a,hits:Array.from({length:i},(e,t)=>t).filter(e=>o[((e-a)%i+i)%i])}}let ma=1e4;function ha(e,t,n){if(!(n.atom.kind===`rest`&&n.atom.hold)){t.push(n);return}let r=n.span.col-1-e.offset,i=t[t.length-1];(n.repeat!==1||n.subdivide!==1||n.elongate!==1||n.chance!==void 0)&&e.fail(`_ lengthens the step before it by one, and takes no modifiers: 0 _ _ is 0@3`,r,n.span.len),i||e.fail(`_ lengthens the step before it: 0 _ _ is 0@3 (in a cell with base=, = keeps a step of the base)`,r,n.span.len),i.repeat!==1&&e.fail(`_ after x!n would lengthen only the last copy: write the copies out, or x@n`,r,n.span.len),t[t.length-1]={...i,elongate:i.elongate+1,span:{...i.span,len:n.span.col-i.span.col+n.span.len}}}let ga={"!":{field:`repeat`,syntax:W(`modifier`,`x!n`,`Repeat: n copies of the step, each as long as one.`,[`&beat step=4 0!4 2!2`],`cell.md`)},"*":{field:`subdivide`,syntax:W(`modifier`,`x*n`,`Ratchet: the step played n times within its own length.`,[`&hats step=2 0 0*2 0 0*3`],`cell.md`)},"@":{field:`elongate`,syntax:W(`modifier`,`x@n`,`Hold: the step lasts n steps.`,[`&tune step=2 0@2 2 4@3`],`cell.md`)}};function _a(e,t=0){let n=e.i,r=ua(e,t),i=e.span(n),a={repeat:1,subdivide:1,elongate:1},o,s,c,l=/* @__PURE__ */ new Set;r.kind===`ref`&&(s=ea(e));let u=e.peek()===`(`?pa(e):void 0;for(;e.peek()in ga||e.peek()===`?`||e.peek()===`/`;){if(e.peek()===`/`){c!==void 0&&e.fail(`'/' can only appear once per step`),e.i++;let t=e.i,n=e.int(`a count after /`,q.modifier,`slow`);(n<1||n>4096)&&e.fail(`Count must be between 1 and ${dr}`,t,e.i-t),c=n;continue}if(e.peek()===`?`){o!==void 0&&e.fail(`'?' can only appear once per step`),e.i++;let t=e.i,n=e.freeNumber(q.drop),r=n===null?e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y):String(n);o=r===null?null:parseFloat(r),r===null&&/[0-9]/.test(e.peek()??``)&&e.fail(`A probability is from 0 to 1: x?.3`,t,1);continue}let t=e.peek();l.has(t)&&e.fail(`'${t}' can only appear once per step`),l.add(t),e.i++;let n=e.i,r=e.int(`a count after ${t}`,q.modifier,ga[t].field);(r<1||r>4096)&&e.fail(`Count must be between 1 and ${dr}`,n,e.i-n),a[ga[t].field]=r}if(e.peek()===`(`&&e.fail(`A euclid goes straight after its step, before its other modifiers: 0(3,8)*2`),!e.atBoundary()&&!(t>0&&/[\],|>]/.test(e.peek()))&&e.fail(`Unexpected '${e.peek()}' — separate steps with spaces`),u||c!==void 0){r.kind===`rest`&&(r.hold||r.keep)&&e.fail(`${r.hold?`_`:`=`} takes no euclid and no /n: put them on the step it stands for`,n,e.i-n);let t={...u?{euclid:u}:{},...c===void 0?{}:{slow:c}};r=r.kind===`seq`&&!r.bare?{...r,...t}:{kind:`seq`,layers:[[{atom:r,repeat:1,subdivide:1,elongate:1,span:i}]],...t,bare:!0}}return Ot(r)>ma&&e.fail(`A step comes round after ${ma.toLocaleString(`en`)} laps at most: its <…> and /n multiplied out`,n,e.i-n),{atom:r,...a,...o===void 0?{}:{chance:o},...s===void 0?{}:{level:s},span:e.span(n)}}let va=e=>/^(?:pulse|beat|1m|(?:1|2|4|8|16|32|64)(?:n\.?|t))(?![A-Za-z0-9_.])/.test(e.text.slice(e.i));function ya(e){let t=e.match(/(?:pulse|beat|1m|(?:1|2|4|8|16|32|64)(?:n\.?|t))(?![A-Za-z0-9_.])/y);if(t===null)return null;if(t===`pulse`||t===`beat`)return{written:t,kind:t};if(t===`1m`)return{written:t,kind:`bar`};let n=parseInt(t,10);return{written:t,kind:`note`,whole:t.endsWith(`.`)?3/(2*n):t.endsWith(`t`)?2/(3*n):1/n}}function ba(e){let t=1,n=[];for(;e.peek()===`*`||e.peek()===`/`;){let r=e.text[e.i++],i=e.i,a=e.freeNumber(q.by),o=a===null?e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y):String(a);o!==null&&parseFloat(o)>0||e.fail(`a positive number after ${r}`,i),t=r===`*`?t*parseFloat(o):t/parseFloat(o),n.push({op:r===`*`?`×`:`÷`,n:parseFloat(o)})}return{ratio:t,chain:n}}function xa(e,t){let n=e.i,r=t?`loop`:`step`,i=t?null:ya(e);if(i)return{whole:t,kind:`tap`,meter:null,tap:i,...ba(e),span:e.span(n)};let a=e.free(t?{...q.rate,key:`loop`}:q.rate);if(a!==null){let r=$n(a.value,a.unit);return r>0||e.fail(`A rate must be positive`,n,e.i-n),{whole:t,kind:`rate`,perSecond:r,span:e.span(n),free:a}}let o=e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);if(o!==null){let i=$n(parseFloat(o),e.match(Qn));if(i>0||e.fail(`A rate must be positive`,n,e.i-n),/[A-Za-z.]/.test(e.peek())){let i=/^[^\s,\])]+/.exec(e.text.slice(n))[0];e.fail(t?`${r}=${i} is no rate: a number with its unit (loop=100bpm, loop=2hz)`:`${r}=${i} is no rate or tap: a tap reads a note value (1n 2n 4n 8n 16n 32n), a triplet (4t 8t 16t), a dotted one (2n. 4n. 8n.), 1m, pulse, beat, or another meter's (&bar2:16n)`,n,i.length)}return{whole:t,kind:`rate`,perSecond:i,span:e.span(n)}}let s=e.match(/[A-Z](?:[#b]?-?[0-9]+|[A-Z0-9_]*)(?![A-Za-z0-9_#])/y);if(s!==null)return{whole:t,kind:`env`,name:s,span:e.span(n)};e.peek()===`{`&&e.fail(`{&x} is now written cycle(&x)`);let c=e.match(/cycle\(/y)!==null,l=e.cellRef(c?`a cell inside cycle( ), like cycle(&theme)`:`a cell or a rate after ${r}=, like ${r}=&meter`,`in ${r}=`,!0);if((l.pick||l.shift)&&e.fail(`${r}= takes a whole cell`,l.span.col-1,l.span.len),c&&e.expect(`)`,`')' to close cycle(&${l.name})`),!c&&!t&&e.peek()===`:`){e.i++;let r=ya(e);return r||e.fail(`&${l.name}: taps a meter by pulse, beat or a note value (&${l.name}:pulse, &${l.name}:beat, &${l.name}:16n, &${l.name}:1m)`),{whole:t,kind:`tap`,meter:l,tap:r,...ba(e),span:e.span(n)}}return{whole:t,kind:`driven`,driver:l,cycle:c,...ba(e),span:e.span(n)}}let Sa={amp:W(`map`,`map=amp`,`A volume: its values multiply the level (on a voice, the braid as a waveform, its range onto −1…1; the default).`,[`&accent map=amp step=16n 1 .4 .8 .4`],`sound.md`),lin:W(`map`,`map=lin`,`As amp, ramping from each value to the next: a glide, a triangle. In a mix it is plain: a volume in a product, a pitch in a sum.`,[`&swell map=lin loop=&bar/8 .2 1`],`sound.md`),db:W(`map`,`map=db`,`A volume in decibels (0 as it is, −6 about half).`,[`&fade map=db step=&bar 0 -6 -12`],`sound.md`),adsr:W(`map`,`map=adsr a d s r`,`An envelope: attack, decay, release in seconds, sustain a level; one per note.`,[`&pluck map=adsr .01 .3 .5 .4`],`sound.md`),sample:W(`map`,`map=sample`,`The sound card: its entries are channels, one (mono) or two (left, right).`,[`&out loop=SAMPLE_RATE map=sample &left &right`],`mix.md`),midi:W(`map`,`map=midi`,`A MIDI card: its entries are MIDI channels, in order (~ skips one); a voice only here is sent and heard, at its entry's gain.`,[`&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`],`midi.md`),edo:W(`map`,`map=edo`,`A grid: cycle= equal steps to the octave.`,[`&edo19 cycle=19 map=edo`],`tuning.md`),ratios:W(`map`,`map=ratios`,`A grid of ratios: one period's tones, then the period (the last).`,[`&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`],`tuning.md`),style:W(`map`,`map=style`,`A style: a point in style space, one value an axis in the table's order (sync harm bite mood, each 0 to 1), or each by its name (sync=.3); it doesn't sound. A pick reads an axis by name: &funk[bite].`,[`&funk map=style .3 .45 .55 .5`,`&funk map=style sync=.3 harm=.45 bite=.55 mood=.5`],`style.md`),role:W(`map`,`map=role`,`A role: its name is the role, its entries the gates that play it (two entries, two players); a gate no role names plays as written.`,[`&comp map=role &violin2 &viola`],`mix.md`)},Ca=new RegExp(Object.keys(Sa).sort((e,t)=>t.length-e.length).join(`|`),`y`);function wa(e,t,n){return t>5e4&&e.fail(`${t} steps: at most ${Ir.toLocaleString(`en`)}, the most a grid can hold to its period`,n,String(t).length),t}function Ta(e){let t=e.i;if(e.peek()===`&`){let n=e.cellRef(`a table cell, like map=&curve`,`after map=`);return(n.pick||n.shift)&&e.fail(`map= takes a whole table`,n.span.col-1,n.span.len),{kind:`table`,table:n,span:e.span(t)}}if(e.match(/sin\b/y)&&e.fail(`map=sin is gone: write the sine as the braid, sin(12) — or map=&table`,t,3),e.match(/ed\(/y)){let n=()=>{let t=e.i,n=e.freeNumber(q.ratio),r=n===null?e.match(/[0-9]+(?:\.[0-9]+)?(?:\/[0-9]+(?:\.[0-9]+)?)?/y):String(n),[i,a=`1`]=(r??``).split(`/`),o=parseFloat(i)/parseFloat(a);return r!==null&&o>1||e.fail(`ed(r) divides a ratio above 1: ed(2) is the octave, ed(3/2) the fifth, ed(7, 3/2) seven steps to it`,t),o},r=e.i,i=/^(?:[0-9]+|free\([^()]*\))\s*,/.test(e.text.slice(e.i))?e.int(`the steps, ed(n, r)`,q.grid,`steps`):null;i!==null&&e.match(/\s*,\s*/y);let a=i===null?null:wa(e,i,r);a!==null&&a<1&&e.fail(`ed(n, r): n steps to the ratio, at least 1`,r);let o=n();return e.expect(`)`,`')' to close ed(…)`),{kind:`edo`,period:o,steps:a,span:e.span(t)}}let n=e.match(Ca);if(n===null&&e.fail(`map= takes ${Object.keys(Sa).join(`, `)}, ed(r), midi(c, p) or a table cell (&curve)`),n===`edo`){let n=null;if(e.peek()===`(`){e.i++;let t=e.i,r=e.freeNumber(q.grid,`steps`),i=r===null?e.match(/[0-9]+/y):String(r);(i===null||parseInt(i,10)<1)&&e.fail(`edo(n): n equal steps to the octave, edo(19)`,t),n=wa(e,parseInt(i,10),t),e.expect(`)`,`')' to close edo(…)`)}return{kind:`edo`,period:2,steps:n,span:e.span(t)}}return n===`midi`?Ea(e,t):{kind:n,span:e.span(t)}}function Ea(e,t){if(e.peek()!==`(`)return{kind:`midi`,channel:null,port:1,span:e.span(t)};e.i++;let n=(t,n)=>{let r=e.i,i=e.freeNumber({...q.grid,max:16},t===`A MIDI channel`?`channel`:`port`),a=i===null?e.match(/[0-9]+(?:\.[0-9]+)?/y):String(i),o=a===null?NaN:parseFloat(a);return Number.isInteger(o)&&o>=1&&o<=16||e.fail(`${t} is a whole number from 1 to 16: ${n}`,r,Math.max(1,a?.length??1)),o},r=n(`A MIDI channel`,`map=midi(10)`),i=1;return e.match(/\s*,\s*/y)!==null&&(i=n(`A MIDI output slot`,`map=midi(10, 2)`)),e.expect(`)`,`')' to close midi(…)`),{kind:`midi`,channel:r,port:i,span:e.span(t)}}let Da=tt.adsr,Oa=[`braid`,`pattern`,`equal`,`notes`,`midi`,`do`,`degrees`,`table`,`scale`,`mode`,`key`,`grid`,`meter`,`spectrum`,`wave`,`levels`,`adsr`,`mix`,`note`,`petal`,`off`,`matrix`,`lfo`,`brightness`],ka={notes:[`flats`,`sharps`,`german`],do:[`fixed`,`movable`]},Aa=e=>(t,n,r,i)=>{n[e]=t.int(`a whole number after ${e}=`,q[e]),n.paramSpans[e]=t.place(i)},ja=(e,t)=>(n,r,i,a)=>{let o=n.i,s=n.match(/"([^"]*)"/y);if(s===null&&n.fail(`${e}= takes a text in quotes: ${t}`),r[e]=s.slice(1,-1),e!==`label`&&(r.paramSpans[e]=n.place(a)),e===`label`)for(let e of s.matchAll(/\{(?:&[A-Za-z_][A-Za-z0-9_]*:)?([A-Za-z_][A-Za-z0-9_]*)\}/g))Rr.includes(e[1])||n.warn(`{${e[1]}} isn't a label field: it shows as written (the fields: ${Rr.map(e=>`{${e}}`).join(` `)})`,o+e.index,e[0].length)},Ma=e=>(t,n)=>{n[e]=t.cellRef(`a cell after ${e}=, like ${e}=&pluck or ${e}=&(map=adsr .01 .3 .5 .4)`,`after ${e}=`)},Na=(e,t,n)=>{t.step=xa(e,n===`loop`)},Pa={over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{}},Fa={over:{form:`over=&table · over=&table[<<n] · over=scale(name, tonic)`,examples:[`&tune over=&major step=2 0 2 4`,`&mode over=&major[<<2] 0 2 4`,`&tune over=scale(minor, A) step=2 0 2 4`,`&bass over=&key step=16n 0 4 7`],read:(e,t)=>{let n=/key(?![A-Za-z0-9_])/y;if(n.lastIndex=e.i,n.test(e.text)){let n=e.i;e.i+=3,e.peek()===`[`&&e.fail(`over=key is the old way: name the key, and turn it there (over=&key[<<2])`,e.i,1),t.over={name:Fr,pick:null,shift:0,span:e.place(n)}}else if(e.text.startsWith(`scale(`,e.i)){let n=e.i;e.i+=5;let r=qi(e,n),i=`scale:λ${e.line}_${n+e.offset}`;e.lambdas.push({...Pa,name:i,span:r.span,lambda:e.text.slice(n,e.i),over:r.key,braid:{kind:`scan`,steps:r.steps,span:r.span,...r.mode?{mode:r.mode}:{}}}),t.over={name:i,pick:null,shift:0,span:r.span}}else t.over=e.cellRef(`a cell or scale(name, tonic) after over=, like over=&key or over=scale(minor, A)`,`after over=`);t.over.pick&&e.fail(`over= takes a whole table (shifting it is fine: over=&scale[<<])`,t.over.span.col-1,t.over.span.len)}},base:{form:`base=&cell · base=&cell^$n · base=&cell^n`,examples:[`&answer base=&subject^$7 =!3 12@2`,`&last base=&subject =!21 3@2`],read:(e,t)=>{t.base=e.ref(`a cell after base=, like base=&subject or base=&subject^$7`),t.base.pick&&e.fail(`base= takes a whole cell (transposing it is fine: base=&subject^$7)`,t.base.span.col-1,t.base.span.len)}},step:{form:`step=…`,examples:[`&tune step=4n 0 2 4`,`&tune step=&clock 0 2 4`],read:Na},loop:{form:`loop=…`,examples:[`&lead s=saw loop=C4`],read:Na},shift:{form:`shift=n · shift=free(n, lo..hi)`,examples:[`&mode over=&major shift=5 0 2 4`,`&key shift=free(0, 0..11)`],read:Aa(`shift`)},stride:{form:`stride=n · stride=free(n, lo..hi)`,examples:[`&key step=cycle(&theme) stride=7`],read:Aa(`stride`)},map:{form:`map=…`,examples:[`&accent map=amp step=&bar 1 .5`],read:(e,t)=>t.map=Ta(e)},show:{form:`show=kind · show=notes:convention · show=do:convention · show=mix:&grid`,examples:[`&tune show=notes step=2 0 2 4`,`&tune show=notes:german step=2 0 2 4`,`&tune show=do:movable step=2 0 2 4`,`&band show=mix:&edo19 [&a, &b]`],read:(e,t)=>{let n=e.i,r=e.match(/[a-z]+/y);r===null&&e.fail(`show= takes one of: ${Oa.join(` `)}, or a plugin of the piece`,n,1);let i=``;if(r===`mix`&&e.peek()===`:`&&!e.text.startsWith(`:&`,e.i)&&e.fail(`show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19 (no space after the colon)`,n,e.i+1-n),r===`mix`&&e.text.startsWith(`:&`,e.i)){e.i+=2;let r=e.match(sr);r===null&&e.fail(`show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19`,n,e.i-n),t.show=`mix:&${r}`,t.paramSpans.show=e.span(n)}else{if(e.peek()===`:`){e.i++;let t=e.match(/[a-z]+/y)??``;ka[r]?.includes(t)||e.fail(`show=${r}: takes ${r===`notes`?`flats, sharps or german`:r===`do`?`fixed or movable`:`no convention`}`,n,e.i-n),i=`:${t}`}t.show=r+i,t.paramSpans.show=e.span(n)}}},label:{form:`label="text"`,examples:[`&theme label="the King's theme" step=2 0 2 4`,`&note label="A note in the graph: alone on its cell."`],read:ja(`label`,`label="the King's theme"`)},env:{form:`env=&envelope`,examples:[`&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)`],read:Ma(`env`)},pitch:{form:`pitch=&vibrato · pitch=lo..hi * &shape`,examples:[`&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)`,`&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0)`],read:(e,t,n,r)=>/^[0-9.]+\.\./.test(e.text.slice(e.i))?Ga(e,t,n):Ma(`pitch`)(e,t,n,r)},cycle:{form:`cycle=n`,examples:[`&key step=cycle(&theme) stride=2 cycle=2`,`&wheel cycle=1 0 4 7`,`&drone cycle=0 0 4 7`],read:(e,t,n,r)=>{let i=e.i;t.cycle=e.int(`a whole number after cycle=`,q.cycle),t.cycle<0&&e.fail(`cycle= counts laps: 0 or more`,i,e.i-i),t.paramSpans.cycle=e.place(r),t.cycle>5e4&&e.fail(`cycle=${t.cycle}: at most ${Ir.toLocaleString(`en`)}, the most steps a cell can hold (a grid's to its period, a table's turns before it comes round)`,i,e.i-i)}},size:{form:`size=x`,examples:[`&theme size=2 step=2 0 2 4`],read:(e,t)=>{let n=e.i,r=e.freeNumber(q.size),i=r===null?e.match(/[0-9]*\.?[0-9]+/y):String(r);i!==null&&+i>=.25&&+i<=4||e.fail(`size= is how large it is drawn, from .25 to 4: size=2`,n,Math.max(1,(i??``).length)),t.size=+i}},laps:{form:`laps=n`,examples:[`&bar meter("4/4") step=84bpm laps=30`],read:(e,t,n,r)=>{let i=e.freeNumber(q.laps),a=i===null?e.match(/[0-9]+/y):String(i);a!==null&&parseInt(a,10)>=1||e.fail(`laps= takes a count of laps, 1 or more: laps=1`,r,n.length+1),t.laps=parseInt(a,10)}},chance:{form:`chance=p · chance=free(p, 0..1)`,examples:[`&ghost chance=.8 step=4 0? 0? 0? 0?`,`&ghost chance=free(.7, 0..1) step=4 0? 0?`],read:(e,t)=>{let n=e.freeNumber(q.chance);if(n!==null)t.chance=n;else{let n=e.i,r=e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);r===null&&e.fail(`chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)`,n,1),t.chance=parseFloat(r)}}},seed:{form:`seed=n`,examples:[`&ghost seed=7 step=4 0? 0? 0? 0?`],read:(e,t)=>t.seed=e.int(`a whole number after seed=`,q.seed)},title:{form:`title="text"`,examples:[`&piece title="Swing blues" tags="genre:jazz, rhythm" label="A blues in F."`],read:ja(`title`,`title="Swing blues"`)},tags:{form:`tags="tag, tag"`,examples:[`&lead tags="melody" s=saw loop=C4`,`&beam tags="metal" map=ratios 1 2.756 5.404`],read:ja(`tags`,`tags="jazz, blues"`)},tier:{form:`tier=n`,examples:[`&piece title="Steps: a tune on one line" tags="tutorial" tier=1 label="Numbers, rests, holds and repeats."`],read:(e,t,n,r)=>{e.free(q.tier);let i=e.match(/[0-9]+(?![0-9.])/y);i!==null&&parseInt(i,10)>=1&&parseInt(i,10)<=9999||e.fail(`tier= is a tier of the tutorial, 1 to 9999: tier=1`,r,n.length+1),t.tier=parseInt(i,10),t.paramSpans.tier=e.place(r)}},style:{form:`style=&s · style=[&a * w, &b * w] · style=a..b · style=a..b * &curve`,examples:[`&style label="Funk" style=&funk`,`&style label="close to Funk, then Bossa nova" style=[&funk * .8, &bossa * .2]..&bossa`],read:(e,t,n,r)=>{let i=za(e),a=null,o=null;e.text.startsWith(`..`,e.i)&&(e.i+=2,a=za(e),/^\s*\*\s*&/.test(e.text.slice(e.i))&&(e.skipSpace(),e.i++,e.skipSpace(),o=e.cellRef(`a curve after style=a..b *, like * &rise`,`in style=`))),t.style={from:i,to:a,...o?{curve:o}:{},span:e.place(r)}}},about:{form:`about=&cell · about=(&a &b …)`,examples:[`&fenvNote label="The filter opens on every note." about=&fenv`,`&why label="Two cells at once." about=(&fenv &accent)`],read:(e,t,n,r)=>{let i=`a cell after about=, like about=&fenv or about=(&fenv &accent)`,a=[];if(t.about=a,e.peek()===`(`){for(e.i++,e.skipSpace();e.peek()!==`)`;)e.done()&&e.fail(`')' to close about=(…)`),a.push(e.cellRef(i,`in about=`)),e.skipSpace();e.i++,a.length===0&&e.fail(i,r,n.length+1)}else a.push(e.cellRef(i,`in about=`))}}},Ia=/^\(\s*(?:-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)[a-z]*\s*,)/;function La(e,t){let n=e.i,r=e.frees.length,i=t=>{if(e.text.startsWith(`free(`,e.i))return e.free(q.end,t).value;let n=e.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9])/y);return n===null?null:parseFloat(n)},a=()=>(e.i=n,e.frees.length=r,null),o=i(`${t} low`);if(o===null)return a();if(e.text.startsWith(`..`,e.i)){e.i+=2;let n=i(`${t} high`);return n===null&&e.fail(`${t}=: a range's other end, a number or a slider — ${t}=200..3000 * &a`),[o,n]}let s=/\s*(?:±|\+-)\s*/y;if(s.lastIndex=e.i,s.test(e.text)){e.i=s.lastIndex,e.frees.length>r&&(e.frees[r].param=t);let n=i(`${t} reach`);(n===null||n<0)&&e.fail(`${t}=c ± r: a reach, a number or a slider, 0 or more — ${t}=free(.6, 0..1) ± free(.2, 0..0.5) * &a`);let a=e=>Math.round(e*0xe8d4a51000)/0xe8d4a51000;return[Math.max(0,a(o-n)),a(o+n)]}return a()}function Ra(e,t){let n=e.i,r=e.free(q.axis,t),[i,a]=B.find(e=>e.name===t).range;return(r.lo<i||r.hi>a)&&e.fail(`${t}=free(…) moves within the axis, ${i} to ${a}: ${t}=free(${r.value}, ${i}..${a})`,n,e.i-n),r}function za(e){let t=`a style after style=, like style=&funk, style=&(map=style .3 .45 .55 .55) or style=[&funk * .8, &bossa * .2]`;if(e.peek()!==`[`)return{kind:`cell`,ref:e.cellRef(t,`in style=`)};e.i++;let n=[];for(;;){e.skipSpace();let r=e.cellRef(t,`in style=[…]`);if(e.skipSpace(),e.expect(`*`,`'*' and a weight after &${r.name}: style=[&${r.name} * .8, …]`),e.skipSpace(),n.push({ref:r,weight:e.num(`a weight after &${r.name} *`,q.weight).value}),e.skipSpace(),e.peek()===`,`)e.i++;else return e.expect(`]`,`']' to close style=[…]`),{kind:`mix`,terms:n}}}let Ba={fm:`a voice after fm=, like fm=&op`,write:`what the tape records, like write=&melody`,play:`the tape it reads, like play=&tape, or the notes a gate plays, like play=&tune`,couple:`the resonator it shares a table with, like couple=&fork`,excite:`what drives it, like excite=&mix`,trigger:`the melody whose notes it plays with, like trigger=&tune`,velocity:`a level cell, like velocity=&accent`,gate:`a level cell, like gate=&duck`},Va=(e,t,n)=>{if(n===`play`)return Ha(e,t);let r=e.cellRef(Ba[n],`after ${n}=`);t.params[n]=r.name,t.paramSpans[n]=r.span};function Ha(e,t){let n=e.i,r=e.ref(Ba.play);if(e.rejectTap(n),t.params.play=r.name,t.paramSpans.play=r.span,r.transpose||r.degree){let i=e.text.lastIndexOf(`^`,e.i-1);t.playMove={...r.transpose?{transpose:r.transpose}:{},...r.degree?{degree:r.degree}:{},at:i,len:e.i-i,as:e.text.slice(n,e.i)}}}let Ua=(e,t)=>{let n=e.i,r=e.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);r===null&&e.fail(`a level and a table after bend=, the lengths of its nodes: bend=4n:&rubato`),e.i++;let i=e.cellRef(`a table after bend=4n:, the lengths of its nodes: bend=4n:&rubato`,`after bend=4n:`),a,o=null;if(e.peek()===`:`){e.i++;let t=e.i;o=Ka(e,`depth`,t),a=o?o.range?o.range[0]:1:e.num(`a depth after bend=${r}:&${i.name}:, how far its table applies (1 as written, 0 even, -1 inverted): bend=${r}:&${i.name}:.5`,q.depth).value}t.bend={level:r,table:i,...a===void 0?{}:{depth:a},...o?{depthMoves:o}:{}},t.paramSpans.bend=e.place(n)},Wa=(e,t,n)=>{if(!/^[1-9][0-9]*(?:n\.?|t):/.test(e.text.slice(e.i)))return Ga(e,t,n);let r=e.i,i=[];for(;;){let a=e.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);a===null&&e.fail(`a level after the comma, a note value and a share: ${n}=8n:.6,16n:.55`),e.i++;let o,s=n===`swing`?Ka(e,`swing`,e.i):null;if(s){(i.length||e.peek()===`,`||e.peek()===`:`)&&e.fail(`a share moved by cells is one level alone: swing=8n:&lean, swing=8n:.5...75 * &k`,r,e.i-r),t.swingMoves={level:a,...s},i.push({level:a,share:s.range?s.range[0]:.5});break}let c=e.free(n===`swing`?q.share:q.legatoShare,n),l=c!==null;if(l)o=c.value,(i.length||e.peek()===`,`)&&e.fail(`a share left free(…) is one level alone: ${n}=8n:free(.5, .5..75)`,r,e.i-r);else if(n===`legato`){let t=e.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9.])/y);t===null&&e.fail(`a share after ${a}:, of each note's held length (.5 staccato, 1 as written): legato=${a}:.5`),o=parseFloat(t)}else{let t=e.i,n=e.match(/[0-9]+\/[0-9]+(?![0-9.])/y);if(n!==null){let[r,i]=n.split(`/`).map(Number);i===0&&e.fail(`a share's denominator can't be 0: swing=${a}:2/3`,t,n.length),r>i&&e.fail(`a share is from 0 to 1, and ${n} is above it: swing=${a}:2/3`,t,n.length),o=r/i}else{let t=e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);t===null&&e.fail(`a share after ${a}:, from 0 to 1, a decimal or a fraction (.5 straight, .67 or 2/3 the triplet swing): swing=${a}:2/3`),o=parseFloat(t)}}if(e.peek()===`:`){let t=e.i;e.i++;let i=e.match(/[a-z]+/y);i!==`pairs`&&e.fail(`a share takes no word after it: a swing leans a level's pairs alone and keeps its groups of three straight (swing=${a}:2/3)`,t,1+(i?.length??0)),n===`legato`&&e.fail(`:pairs was swing='s word; a legato= share holds every note of its level: legato=${a}:.5`,t,6),l&&e.peek()===`,`&&e.fail(`a share left free(…) is one level alone: ${n}=8n:free(.5, .5..75)`,r,e.i-r),e.warn(`:pairs says nothing more: every swing leans a level's pairs alone and keeps its groups of three straight (decision 071); Migrate drops it`,t,6)}if(i.push({level:a,share:o}),e.peek()!==`,`)break;e.i++}n===`legato`?t.legato=i:(t.swing=i,t.params[n]=i[0].share),t.paramSpans[n]=e.span(r)};function Ga(e,t,n){let r=e.i;if(n===`level`&&(e.peek()===`&`||/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+|free\([^()]*\))\s*\*/.test(e.text.slice(e.i)))){let i=[],a=1;for(let t=!0;;t=!1){let n=e.i;if(!t){if(e.skipSpace(),e.peek()!==`*`){e.i=n;break}e.i++,e.skipSpace()}let r=e.freeNumber(q.level),o=r===null?e.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y):String(r);o===null?i.push(e.cellRef(`a level cell or a number, like level=&accent*&duck*.4`,`in level=`)):a*=parseFloat(o)}t.paramCells[n]={range:null,factors:i,span:e.span(r)},a!==1&&(t.params[n]=a),t.paramSpans[n]=e.span(r);return}if((e.peek()===`&`||va(e))&&br.has(n)){let i=xa(e,!1);i.kind!==`driven`&&i.kind!==`tap`&&e.fail(`${n}= takes seconds, a clock or a tap: ${n}=&bar*2, ${n}=8n`,r,e.i-r),t.paramClocks[n]=i,t.paramSpans[n]=e.span(r);return}let i=n===`s`?e.text.slice(e.i).match(/^([A-Za-z]+)\.\.([A-Za-z]+)/):null;if(i){e.i+=i[0].length;let n=[];for(;;){let t=e.i;if(e.skipSpace(),e.peek()!==`*`){e.i=t;break}e.i++,e.skipSpace(),n.push(e.cellRef(`a cell after *, like s=${i[0]} * &style[bite]`,`in s=`))}n.length===0&&e.fail(`s=${i[0]}: a blend of two waves is moved by cells, the share of the second: s=${i[0]} * &style[bite]`,r,e.i-r),t.params.s=i[1],t.paramCells.s={range:[0,1],factors:n,span:e.span(r),to:i[2]},t.paramSpans.s=e.span(r);return}let a=Ka(e,n,r);if(a){t.paramCells[n]=a,t.paramSpans[n]=e.span(r);return}let o=e.free(q.param,n);if(o!==null){t.params[n]=o.value,t.paramSpans[n]=e.span(r);return}let s=e.match(/-?[A-Za-z0-9_.]+/y);s===null&&e.fail(`Expected a value after ${n}=`);let c=/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(s)?parseFloat(s):s;t.params[n]=n===`ftype`&&typeof c==`number`?kr(c)??c:c,t.paramSpans[n]=e.span(r)}function Ka(e,t,n){let r=La(e,t);if(e.peek()!==`&`&&!r)return null;let i=[];for(r||i.push(e.cellRef(`a cell after ${t}=`,`in ${t}=`));;){let n=e.i;if(e.skipSpace(),e.peek()!==`*`){e.i=n;break}e.i++,e.skipSpace(),i.push(e.cellRef(`a cell after *, like ${t}=200..3000 * &fenv`,`in ${t}=`))}return r&&i.length===0&&e.fail(`${t}=${e.text.slice(n,e.i)}: a range is scaled by cells — ${t}=${e.text.slice(n,e.i)} * &fenv`,n,e.i-n),!r&&i.length>1&&e.fail(`${t}=: several cells multiply a range — ${t}=200..3000 * &a * &b`,n,e.i-n),{range:r,factors:i,span:e.span(n)}}let qa={init:`init= is now shift=`,out:`out= is now a command: out(voice, &cell) / step(&meter, bpm=…)`,time:`time= is now a command: out(voice, &cell) / step(&meter, bpm=…)`,rung:`rung= is now tier= (decision 020): the tutorial is in tiers, tier=1 to tier=9`,...Nr};function Ja(e){let t=e.i;e.i+=5,e.peek()===`"`&&e.fail(`free("…") is a text, for spell(…): a braid left free is steps, free(0 2 4 ~)`,t,6);let n=e.text.indexOf(`)`,e.i);n<0&&e.fail(`')' to close free(…)`,t,e.i-t);let r=e.within(e.text.slice(e.i,n),e.i),i=[];for(;r.skipSpace(),!r.done();){let e=r.i,t=_a(r);V(t.atom).some(e=>e.kind!==`note`&&e.kind!==`rest`&&e.kind!==`chord`)&&r.fail(`A braid left free holds steps: numbers, rests (~), chords ([0,4]) and subsequences of them ([0 2]), held (@n) or repeated (!n)`,e,r.i-e),ha(r,i,t)}i.length||e.fail(`free(…) around a braid needs steps: free(0 2 4 ~)`,t,n-t+1),e.i=n+1;let a=i.reduce((e,t)=>e+t.repeat*t.elongate,0);return e.frees.push({key:`braid`,value:0,unit:``,lo:0,hi:a,span:e.place(t),braid:r.text.trim().replace(/\s+/g,` `)}),{kind:`list`,tokens:i}}function Ya(e,t){let n={over:null,base:null,shift:null,cycle:null,step:null,map:null,stride:null,env:null,pitch:null,show:null,label:null,laps:null,title:null,tags:null,tier:null,about:null,style:null,chance:null,seed:null,size:null,swing:null,bend:null,swingMoves:null,legato:null,params:{},paramSpans:{},paramCells:{},paramClocks:{},playMove:null},r=/* @__PURE__ */ new Map,i=!1,a=!1,o=[],s=null,c=null,l=null,u=!1,d=-1,f=``,p=/* @__PURE__ */ new Map,m=/* @__PURE__ */ new Map;for(;!e.done();){let t=e.i,h=e.match(sr);if(h!==null&&e.peek()===`=`){e.i++;let i=h in Fa||h in gr?h:_r[h]??null;if(i===null&&Da.includes(h)){m.has(h)&&e.fail(`${h}= is given twice`,t,h.length),m.set(h,t),Ga(e,n,h),e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);continue}if(i===null&&et.includes(h)){p.has(h)&&e.fail(`${h}= is given twice`,t,h.length);let r=e.i,i=/^(?:free\([^)]*\)|-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))\s*(?:\.\.|±|\+-)/.test(e.text.slice(e.i));if(e.text.startsWith(`free(`,e.i)&&!i)p.set(h,{value:String(Ra(e,h).value),at:t});else if(e.peek()===`&`||i){let i=e.frees.length;Ga(e,n,h);let a=n.paramCells[h];a||e.fail(`${h}=: a moving axis is a range within it and the cell that moves it, ${h}=0..1 * &walk`,r,e.i-r);let[o,s]=B.find(e=>e.name===h).range;for(let t of e.frees.slice(i))t.param!==`${h} reach`&&(t.lo<o||t.hi>s)&&e.fail(`${h}=: a window's end moves within the axis, ${o} to ${s}: free(${t.value}, ${Math.max(o,t.lo)}..${Math.min(s,t.hi)})`,r,e.i-r);let c=/±|\+-/.test(e.text.slice(r,e.i)),[l,u]=a.range??[o,s];c?[l,u]=[Math.min(s,Math.max(o,l)),Math.min(s,Math.max(o,u))]:l>=o&&l<=s&&u>=o&&u<=s||e.fail(`${h}= moves within the axis, ${o} to ${s}: ${h}=${o}..${s} * &walk`,r,e.i-r),a.range&&(n.paramCells[h]={...a,range:[l,u]}),p.set(h,{value:String(l),at:t})}else e.num(`a number after ${h}= (an axis of a style, 0 to 1), or a slider, ${h}=free(.3, 0..1)`,q.axis,h),p.set(h,{value:e.text.slice(r,e.i),at:t});e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);continue}if(i===null){h in qa&&e.fail(qa[h],t,h.length),(h===`artic`||h===`energy`)&&n.map?.kind===`style`&&e.fail(`${h}= is retired: a style's axes are ${et.join(` `)}, bite its articulation and energy off the point (decision 076); Migrate rewrites it`,t,h.length);let r=Er(h);e.fail(`Unknown attribute ${h}=${r?` — did you mean ${r}=?`:``} (a cell: ${Object.keys(hr).join(` `)}; a sound or a physical cell: ${Object.keys(gr).join(` `)})`,t,h.length)}let a=i===`loop`?`step`:i;if(r.has(a)){let o=r.get(a);e.fail(a===`step`&&n.step.whole!==(h===`loop`)?`step= and loop= say the same thing two ways — pick one`:o===h?`${h}= is given twice`:`${h}= and ${o}= are one parameter, ${i}= — given twice`,t,h.length)}r.set(a,h),h===`clip`&&e.warn(`clip= is Strudel's name for legato= — write legato= (Normalise rewrites it)`,t,h.length),(Fa[i]?.read??(i===`swing`||i===`legato`?Wa:i===`bend`?Ua:yr.has(i)?Va:Ga))(e,n,i,t),e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`)}else if(h===`free`&&e.peek()===`(`&&n.map?.kind===`style`&&/^\(\s*[^,()]*,/.test(e.text.slice(e.i))){let n=et[o.length];n===void 0&&e.fail(`A style has ${et.length} axes (${et.join(` `)}): this value is one more`,t,h.length),e.i=t;let r=e.within(String(Ra(e,n).value),t);ha(r,o,_a(r))}else if(h===`free`&&e.peek()===`(`&&Ia.test(e.text.slice(e.i)))s&&e.fail(u?tr:`A cell has one braid: a generator or a list of steps`,t,h.length),e.i=t,ha(e,o,_a(e));else if(h===`free`&&e.peek()===`(`)(s||o.length)&&e.fail(tr,t,h.length),e.i=t,s=Ja(e),u=!0,d=e.i,f=e.text.slice(t+5,e.i-1).trim();else if(h!==null&&Qi(h)&&e.peek()===`(`){if((s||o.length)&&e.fail(u?tr:`A cell has one braid: a generator or a list of steps`,t,h.length),h===`fifths`){let n=Ji(e,t);s=n.braid,l=n.shift}else if(h===`scale`){let n=qi(e,t);s={kind:`scan`,steps:n.steps,span:n.span,...n.mode?{mode:n.mode}:{}},c=n.key}else s=$i(e,h,t)}else if(h!==null&&sa.includes(h)&&e.peek()===`(`)s&&e.fail(u?tr:`A cell has one braid: a generator or a list of steps`),e.i=t,ha(e,o,_a(e));else if(h===`off`&&e.atBoundary())i&&e.fail(`off is given twice`,t,h.length),i=!0;else if(h===`oneshot`&&e.atBoundary())a&&e.fail(`oneshot is given twice`,t,h.length),a=!0,e.warn(`oneshot is retired as a line word: a voice’s parameter, oneshot=1 (Migrate rewrites it, decision 068)`,t,h.length);else{if(h!==null&&(/^[A-G](?:b?-?[0-9]*)$/.test(h)||h===`_`||Object.hasOwn(z,h))?e.i=t:h!==null&&e.fail(`Unexpected '${h}'`,t,h.length),s&&u&&e.peek()===`)`&&e.fail(`A ')' with nothing to close: free(${f}) ends at its first ')'`,t,1),s&&t===d&&/[@!*/?:]/.test(e.peek())){let n=/^\S+/.exec(e.text.slice(t))[0];e.fail(`free(${f})${n}: a modifier goes on its steps, inside the parentheses: free([${f}]${n})`,t,n.length)}s&&e.fail(u?tr:`A cell has one braid: a generator or a list of steps`,t,1),ha(e,o,_a(e))}}if(p.size){let[t,{at:r}]=[...p][0];n.map?.kind!==`style`&&e.fail(`${t}= is an axis of a style: it goes on a map=style cell (&funk map=style sync=.3 harm=.45 bite=.55 mood=.5)`,r,t.length),(s||o.length)&&e.fail(`A style writes its axes by name (sync=.3) or in order (.3 .45 .55 .5), not both`,r,t.length);let i=et.filter(e=>!p.has(e));i.length&&e.fail(`A style names every axis: ${i.map(e=>`${e}=`).join(` `)} ${i.length===1?`is`:`are`} missing (its axes: ${et.join(` `)})`,r,t.length);for(let t of et){let{value:n,at:r}=p.get(t),i=e.within(n,r+t.length+1);ha(i,o,_a(i))}}if(m.size){let[t,r]=[...m][0];n.map?.kind!==`adsr`&&e.fail(qa[t]??`${t}= is a slot of an envelope: it goes on a map=adsr cell`,r,t.length),(s||o.length)&&e.fail(`An envelope writes its slots by name (attack=.01) or in order (.01 .3 .5 .4), not both`,r,t.length);let i=Da.filter(e=>!m.has(e));i.length&&e.fail(`An envelope names every slot: ${i.map(e=>`${e}=`).join(` `)} ${i.length===1?`is`:`are`} missing (its slots: ${Da.join(` `)})`,r,t.length);for(let t of Da){let r=m.get(t),i=n.paramCells[t],a=i?String(i.range?.[0]??0):n.params[t];typeof a!=`number`&&typeof a!=`string`&&e.fail(`${t}= takes a number, a range scaled by cells, or a cell`,r,t.length),delete n.params[t];let s=e.within(String(a),r+t.length+1);ha(s,o,_a(s))}}let h=s??(o.length?{kind:`list`,tokens:o}:{kind:`blank`});if(n.params.oneshot!==void 0){let t=n.paramSpans.oneshot,r=n.params.oneshot;r!==0&&r!==1&&e.fail(`oneshot= is 1 (each note played through) or 0 (as its step, the default)`,t?t.col-1:0,7),a&&e.fail(`oneshot is given twice: write oneshot=1 alone`,t?t.col-1:0,7),a=r===1,delete n.params.oneshot,delete n.paramSpans.oneshot}let g;if(n.params.note!==void 0){let t=n.paramSpans.note,r=n.params.note;(typeof r!=`number`||!Number.isInteger(r)||r<0||r>127)&&e.fail(`note= is a MIDI note, a whole number from 0 to 127 (36 a kick, 38 a snare)`,t?t.col-1:0,4),g=r,delete n.params.note,delete n.paramSpans.note}if(a&&typeof n.params.glide==`number`&&n.params.glide>0){let t=n.paramSpans.glide;e.fail(`oneshot or glide=: a voice plays each note through, or ties them as one`,t?t.col-1:0,5)}l!==null&&l!==0&&(n.shift!==null&&e.fail(`fifths(n) turns it already: write fifths() and shift=, or fifths(n) alone`),n.shift=l),c&&(n.over&&e.fail(`scale(…) reads through a key of its own: drop over=, or write the key as a cell (&mode over=&key scan(…))`,n.over.span.col-1,n.over.span.len),n.over=c),n.playMove&&h.kind===`blank`&&e.warn(`${n.playMove.as} after play=: ^ and ^$ move what a gate plays (one with a braid: &out play=${n.playMove.as} &lead); a read head reads the tape itself, so the move is ignored`,n.playMove.at,n.playMove.len);let _=n.playMove&&h.kind!==`blank`?{...n.playMove.transpose?{transpose:n.playMove.transpose}:{},...n.playMove.degree?{degree:n.playMove.degree}:{}}:null,{over:v,base:y,shift:b,step:x,map:S,stride:C,cycle:w,env:T,pitch:E,show:D,label:O,title:k,tags:A,tier:j,about:M,style:N,laps:P,chance:ee,seed:te,size:ne,swing:re,bend:F,swingMoves:ie,legato:ae,params:oe,paramSpans:se,paramCells:ce,paramClocks:I}=n;return{name:t.name,span:t.span,over:v,...y?{base:y}:{},shift:b,off:i,...a?{oneshot:a}:{},...g===void 0?{}:{drumNote:g},step:x,map:S,stride:C,cycle:w,env:T,pitch:E,show:D,label:O,title:k,tags:A,tier:j,about:M??void 0,...N?{style:N}:{},laps:P,chance:ee,seed:te,size:ne,...re?{swing:re}:{},...F?{bend:F}:{},...ie?{swingMoves:ie}:{},...ae?{legato:ae}:{},params:oe,paramSpans:se,paramCells:ce,paramClocks:I,..._?{playMove:_}:{},braid:h,frees:[...e.frees]}}function Xa(e){e.skipSpace(),e.text.startsWith(`&(`,e.i)&&e.fail(`An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …`);let t=e.cellRef(`a cell name like &theme`,`names the line`);return(t.pick||t.shift)&&e.fail(`Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here`,t.span.col-1,t.span.len),e.peek()===`(`&&e.fail(`&name(…) is gone — write over=&…`),Ya(e,t)}let Za=/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%\s,/]{1,40}\)|var\(--[a-z0-9-]{1,40}\))$/,Qa=/^=== plugin ([a-z]+) ===\s*$/,$a=/^=== end ===\s*$/,eo=`=== plugin name === … === end ===`,to=/^=== plugin /m;function no(e,t=[],n=!1){if(!to.test(e))return{text:e,plugins:[],diagnostics:[]};let r=e.split(`
`),i=[],a=[],o=(e,t,n=`error`)=>a.push({severity:n,message:t,span:{line:e,col:1,len:Math.max(1,r[e-1]?.length??1)}});for(let e=0;e<r.length;e++){let a=Qa.exec(r[e]);if(!a){$a.test(r[e])&&o(e+1,`=== end === without a plugin block before it (${eo})`);continue}let s=e,c=s+1;for(;c<r.length&&!$a.test(r[c]);)c++;let l=r.slice(s+1,c).join(`
`);c<r.length||o(s+1,`plugin ${a[1]} has no === end === line`);let u=a[1];if(t.includes(u))o(s+1,`${u} is a show of its own: a plugin needs another name`);else if(i.some(e=>e.name===u))o(s+1,`plugin ${u} is written twice`);else{let e=io(u,l,s+1,n);typeof e==`string`?o(s+1,`plugin ${u}: ${e}`):i.push(e)}for(let e=s;e<=Math.min(c,r.length-1);e++)r[e]=``;e=c}return{text:r.join(`
`),plugins:i,diagnostics:a}}function ro(e){let t=e.indexOf(`{`);if(t<0||e.slice(0,t).trim())return null;let n=0,r=!1;for(let i=t;i<e.length;i++){let a=e[i];if(r)a===`\\`?i++:a===`"`&&(r=!1);else if(a===`"`)r=!0;else if(a===`{`)n++;else if(a===`}`&&--n===0)return{json:e.slice(t,i+1),rest:e.slice(i+1)}}return null}function io(e,t,n,r){let i=ro(t);if(!i)return`starts with its manifest, a { … } of JSON: { "fits": ["meter"], "size": 200 }`;let a;try{a=JSON.parse(i.json)}catch(e){return`its manifest is not JSON (${e.message})`}if(typeof a!=`object`||!a||Array.isArray(a))return`its manifest is an object`;let o=a,s=[`fits`,`size`,`rim`,`meaning`,`dial`,`tokens`],c=Object.keys(o).find(e=>!s.includes(e));if(c)return`its manifest has no "${c}" (it has: ${s.join(`, `)})`;if(!Array.isArray(o.fits)||!o.fits.length||!o.fits.every(e=>typeof e==`string`))return`"fits" lists the kinds of cell it shows: ["meter"]`;let l=o.size??200;if(typeof l!=`number`||!(l>=60&&l<=400))return`"size" is a number from 60 to 400`;if(o.rim!==void 0&&typeof o.rim!=`boolean`)return`"rim" is true or false`;if(o.meaning!==void 0&&typeof o.meaning!=`string`)return`"meaning" is a text`;let u=null;if(o.dial!==void 0){let e=o.dial;if(!(e&&typeof e==`object`&&typeof e.label==`string`&&typeof e.turn==`number`&&e.turn>0&&typeof e.key==`number`&&e.key>0))return`"dial" is { "label": "The day", "turn": 86400, "key": 3600 }: a name, seconds for a turn, seconds for a key press`;u={label:e.label,turn:e.turn,key:e.key}}let d={};if(o.tokens!==void 0){let e=o.tokens;if(!e||typeof e!=`object`||Object.values(e).some(e=>typeof e!=`string`||!Za.test(e)))return`"tokens" maps names to colours (#rgb, rgb(…), hsl(…), a name, var(--x)): { "sun": "#ffd84a" }`;if(Object.keys(e).includes(`__proto__`))return`"tokens": a token can't be called __proto__`;Object.assign(d,e)}return{name:e,fits:o.fits,size:l,rim:o.rim!==!1,meaning:o.meaning??``,dial:u,tokens:d,code:i.rest.replace(/^\n+|\s+$/g,``),builtin:r,line:n}}let ao=String.raw`
=== plugin sun ===
{
  "fits": ["meter"],
  "size": 220,
  "rim": false,
  "meaning": "a day meter as the sun: a 24-hour dial, noon at the top",
  "dial": { "label": "The day", "turn": 86400, "key": 3600 },
  "tokens": {
    "sky-day": "#3d6fa8",
    "sky-dusk": "#e3a25a",
    "sky-dusk-night": "#2a1c3a",
    "sky-night": "#070912",
    "ink": "#fff",
    "ink-halo": "rgb(0 0 0 / 0.6)",
    "mark": "rgb(255 255 255 / 0.85)",
    "tick": "rgb(255 255 255 / 0.55)",
    "horizon": "rgb(255 255 255 / 0.35)",
    "sun": "#ffd84a",
    "sun-edge": "#fff3b0",
    "sun-glow": "#ffcf3a",
    "sun-night": "#8a7a40",
    "sun-night-edge": "#b8aa70"
  }
}
// The sun: a day of 24 hours as the sky turns it. Noon (S) at the top, midnight (N) at the bottom, sunrise (E) on the
// left, sunset (W) on the right, the horizon through the middle. Round the rim, the law's twelve blocks, each as
// bright as its mode. The sun stands where the piece is in its day. Stopped, turning it moves where play starts.
const mod = (a, n) => ((a % n) + n) % n;
// anchor=11.55 is 11:55
const clock = (hh) => Math.floor(hh) * 3600 + Math.round((hh % 1) * 100) * 60;
function where(view) {
  const { law } = view;
  const anchor = typeof view.params.anchor === 'number' ? clock(view.params.anchor) : 0;
  const ofDay = mod(anchor + view.time.seconds, 86400);
  const hhmm = Math.floor(ofDay / 3600) + ':' + String(Math.floor((ofDay % 3600) / 60)).padStart(2, '0');
  if (!law) return { ofDay, hhmm, block: null, mode: null, tonic: null };
  const d = mod(anchor - law.start + view.time.seconds, 86400);
  const block = Math.floor(d / law.blockSeconds);
  const key = Math.floor((d % law.blockSeconds) / law.keySeconds);
  return { ofDay, hhmm, block, mode: law.blocks[block].mode, tonic: law.tonics[block][key] };
}
function describe(view) {
  const w = where(view);
  const law = view.law;
  return {
    text: w.hhmm + (law ? ', ' + law.modeNames[w.mode] + ', key of ' + law.noteNames[w.tonic] : ''),
    now: Math.floor(w.ofDay / 60),
    min: 0,
    max: 1439,
  };
}
function draw(view, h, g) {
  const { law, tokens: T, size: S } = view;
  const R = S / 2;
  const w = where(view);
  // a time of day, in turns: noon at the top, turning clockwise (east, south, west)
  const turns = (sec) => (sec / 3600 - 12) / 24;
  const at = (sec, r) => g.polar(R, R, r, turns(sec));
  const ink = 'fill:' + T.ink + ';paint-order:stroke;stroke:' + T['ink-halo'] + ';stroke-width:3px;text-anchor:middle;';
  const sky = view.uid + 'sky';
  const blocks = law
    ? law.blocks.map((b, i) =>
        h('path', {
          d: g.ringSegment(R, R, R * 0.82, R - 3, turns(law.start + i * law.blockSeconds), turns(law.start + (i + 1) * law.blockSeconds)),
          fill: g.blockColour(b.brightness),
          stroke: 'rgba(0,0,0,.45)',
          'stroke-width': 1,
        }, h('title', null, law.modeNames[b.mode] + ' · ' + law.blockNames[i])),
      )
    : [];
  const ticks = Array.from({ length: 24 }, (_, hr) => {
    const [x1, y1] = at(hr * 3600, R * 0.82);
    const [x2, y2] = at(hr * 3600, R * (hr % 6 === 0 ? 0.72 : 0.77));
    return h('line', { x1, y1, x2, y2, stroke: T.tick, 'stroke-width': 1.4 });
  });
  const cardinal = (letter, x, y) => h('text', { x, y, style: 'fill:' + T.mark + ';font:800 13px var(--font-ui);text-anchor:middle' }, letter);
  const [sx, sy] = at(w.ofDay, R * 0.62);
  const up = w.ofDay > 6 * 3600 && w.ofDay < 18 * 3600;
  return [
    h('defs', null,
      h('linearGradient', { id: sky, x1: 0, y1: 0, x2: 0, y2: 1 },
        h('stop', { offset: 0, 'stop-color': T['sky-day'] }),
        h('stop', { offset: 0.48, 'stop-color': T['sky-dusk'] }),
        h('stop', { offset: 0.52, 'stop-color': T['sky-dusk-night'] }),
        h('stop', { offset: 1, 'stop-color': T['sky-night'] }))),
    h('circle', { cx: R, cy: R, r: R - 2, fill: 'url(#' + sky + ')', style: 'filter:drop-shadow(0 8px 11px rgba(0,0,0,.5))' }),
    ...blocks,
    ...ticks,
    h('line', { x1: 10, y1: R, x2: S - 10, y2: R, stroke: T.horizon, 'stroke-dasharray': '3 4' }),
    cardinal('S', R, 40),
    cardinal('N', R, S - 30),
    cardinal('E', 32, R + 4),
    cardinal('W', S - 32, R + 4),
    // the sun (below the horizon: the night's sun, dimmed)
    h('circle', up
      ? { cx: sx, cy: sy, r: 11, fill: T.sun, stroke: T['sun-edge'], 'stroke-width': 2, style: 'filter:drop-shadow(0 0 8px ' + T['sun-glow'] + ')' }
      : { cx: sx, cy: sy, r: 11, fill: T['sun-night'], stroke: T['sun-night-edge'], 'stroke-width': 2, opacity: 0.7 }),
    h('text', { x: R, y: R - 8, style: ink + 'font:800 17px var(--font-code)' }, w.hhmm),
    law && h('text', { x: R, y: R + 10, style: ink + 'font:700 10px var(--font-ui)' }, law.modeNames[w.mode] + ' · ' + law.noteNames[w.tonic]),
    law && h('text', { x: R, y: R + 24, style: ink + 'font:italic 500 10px var(--font-ui)' }, law.blockNames[w.block]),
  ];
}
=== end ===
`,oo=Object.freeze(no(ao,[],!0).plugins.map(e=>Object.freeze({...e,tokens:Object.freeze({...e.tokens})})));function so(e,{old:t=!1}={}){let n=[],r=[],i=[],{text:a,plugins:o,diagnostics:s}=no(e,[...Oa,...oo.map(e=>e.name)]),c=[...s],l=[],u=[],d=null;return a.split(`
`).forEach((e,t)=>{let n=mr(e);d?(d.text+=` `,d.parts.push({line:t+1,start:d.text.length}),d.text+=n):d={text:n,line:t+1,parts:[{line:t+1,start:0}]},/[+*,[]\s*$/.test(d.text)||(u.push(d),d=null)}),d&&u.push(d),u.forEach(({text:e,line:a,parts:o})=>{let s=t?gt(e):null;if(s!==null){let t=e.search(/\S/);c.push({severity:`warning`,message:`a style on the axes before v0.23.0 (sync harm artic energy): its axes are sync harm bite mood, bite its articulation and energy off the point (decision 076); Migrate rewrites it`,span:{line:a,col:t+1,len:e.trimEnd().length-t}})}let u=s??e,d=new pr(u,a,0,[],o,c,0,Ya);if(d.done())return;if(Re(u)){let e=u.search(/\S/);c.push({severity:`error`,message:`use is retired (decision 065): a line says where its cells come from, &bd, &sd from gm_kit (a collection, by name) or &key from diatonic(mode=dorian) D (a template, with its arguments)`,span:{line:a,col:e+1,len:u.trimEnd().length-e}});return}let f=Je(u);if(f!==void 0){let e=u.search(/\S/),t={line:a,col:e+1,len:u.trimEnd().length-e};f===null?c.push({severity:`error`,message:Ye,span:t}):f.kind===`use`?r.push({id:f.id,names:f.names,span:t}):i.push(...f.names.map(e=>e.slice(1)))}else try{let e=d.i,r=d.match(sr);if(r===`step`&&d.peek()===`(`)d.fail(`step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm`,e,4);else if(r===`out`&&/^\s*[(=]/.test(d.text.slice(d.i)))d.fail(`out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix`,e,3);else if(r===`cell`)d.fail(`The cell keyword is gone: a line starting with &name declares a cell`,e,4);else if(r===null){d.i=e;let r=Xa(d);n.push(r,...d.lambdas),r.params.beat!==void 0&&c.push({severity:t?`warning`:`error`,message:`beat= is retired: a meter counts its beats by its signature or its levels (meter("4/4") beat=2 is meter("2/2", 2); a waltz in one, meter("*..", 4n)); Migrate rewrites it`,span:r.paramSpans?.beat??r.span})}else d.fail(`A line declares a cell: &name …`,e,r.length)}catch(e){if(!(e instanceof fr))throw e;c.push({severity:`error`,message:e.message,span:{line:a,col:e.col+1,len:e.len}});let t=/^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(u)?.[1];t&&l.push(t)}}),Vt({cells:n,diagnostics:c,broken:l,plugins:o,...r.length?{takes:r}:{},...i.length?{offers:i}:{},...t?{old:t}:{}})}function co(e,t){let n=[...e.diagnostics],r=(e,t)=>n.push({severity:`error`,message:e,span:t}),i=(e,t)=>n.push({severity:`warning`,message:e,span:t}),a=(e,t)=>n.push({severity:`info`,message:e,span:t}),o=new Set(e.broken),s=/* @__PURE__ */ new Map,c=(e,t)=>{o.has(e)||(r(`Unknown cell &${e}`,t),s.set(e,[...s.get(e)??[],t]))},l=/* @__PURE__ */ new Set;return{parsed:e,env:t,diagnostics:n,error:r,warn:i,info:a,broken:o,unknown:s,unknownCell:c,rateOf:e=>{if(!e)return null;if(e.kind===`rate`)return e.perSecond;if(e.kind===`env`){let n=t[e.name]??Gr(e.name,t.A4??440)??void 0;return typeof n==`number`&&n>0?n:(l.has(e)||r(`Unknown environment value ${e.name} (known: ${Object.keys(t).join(`, `)}, and note names like C4, F#3, Bb2)`,e.span),l.add(e),null)}return null}}}let lo=e=>e&&!e.gate&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`?e.braid.tokens[0].atom.exprs:null;function uo(e,t){if(e.k===`num`)return{constant:t*e.value};if(e.k===`ref`)return e.ref.pick||e.level!==void 0?null:{term:{cell:e.ref.name,weight:t}};if(e.k===`prod`){let n=e.factors.filter(e=>e.k===`ref`);if(n.length!==1||n[0].k!==`ref`||n[0].ref.pick||!e.factors.every(e=>e.k===`ref`||e.k===`num`))return null;let r=e.factors.reduce((e,t)=>t.k===`num`?e*t.value:e,t);return{term:{cell:n[0].ref.name,weight:r}}}return null}let fo=e=>e.kind===`note`||e.kind===`rest`||e.kind===`choice`||e.kind===`seq`&&e.layers.every(e=>e.every(e=>fo(e.atom)));function po(e,t,n=/* @__PURE__ */ new Set){let r=t.get(e);return!r||r.gate||r.over||Object.keys(r.params).some(e=>Z.has(e))?!1:lo(r)?mo(e,t,n)!==null:r.map&&r.map.kind!==`lin`&&r.map.kind!==`amp`&&r.map.kind!==`db`?!1:r.braid.kind===`list`&&r.braid.tokens.length>0&&r.braid.tokens.every(e=>fo(e.atom))}function mo(e,t,n=/* @__PURE__ */ new Set){let r=lo(t.get(e));if(!r||r.length!==1||n.has(e))return null;let i=r[0],a=i.k===`sum`?i.items:[{e:i,sign:1}],o=[],s=0;for(let e of a){let t=uo(e.e,e.sign);if(!t)return null;`term`in t?o.push(t.term):s+=t.constant}if(!o.length||o.length===1&&o[0].weight===1&&s===0)return null;let c=/* @__PURE__ */ new Set([...n,e]);return o.every(e=>po(e.cell,t,c))?{terms:o,constant:s}:null}function ho(e,t,n,r=/* @__PURE__ */ new Set){let i=lo(t.get(e));if(!i||i.length!==1||r.has(e)||mo(e,t)!==null)return null;let a=i[0];if(a.k!==`prod`)return null;let o=/* @__PURE__ */ new Set([...r,e]),s=!1;for(let e of a.factors){if(e.k===`num`)continue;if(e.k!==`ref`)return null;let r=t.get(e.ref.name);if(!r)return null;if(lo(r)){if(!ho(e.ref.name,t,n,o))return null;s=!0}else if(n(e.ref.name))return null;else(!r.map||r.map.kind!==`amp`&&r.map.kind!==`db`&&r.map.kind!==`adsr`&&r.map.kind!==`lin`)&&(s=!0)}return s?a:null}let go=e=>!e.ref.pick&&!e.ref.slot&&!e.ref.shift&&!e.ref.degree&&!e.ref.transpose&&e.level===void 0;function _o(e,t,n,r={named:[],moved:[]},i=/* @__PURE__ */ new Set){if(e.k===`num`)return e;if(e.k===`sum`)return{...e,items:e.items.map(e=>({...e,e:_o(e.e,t,n,r,i)}))};if(e.k===`prod`)return{...e,factors:e.factors.map(e=>_o(e,t,n,r,i))};let a=ho(e.ref.name,t,n,i);return a?go(e)?(r.named.push(e.ref.name),_o(a,t,n,r,/* @__PURE__ */ new Set([...i,e.ref.name]))):(r.moved.push(e),e):e}let vo={line:1,col:1,len:1},yo=e=>e.over===null&&(e.braid.kind===`blank`&&(e.name===`fifths12TET`||e.map?.kind===`edo`)||e.map?.kind===`ratios`),bo=e=>yo(e)?null:e.over?.name??`fifths12TET`,xo=e=>e.map?.kind===`ratios`&&e.braid.kind===`list`?Math.max(1,e.braid.tokens.length-1):(e.map?.kind===`edo`?e.map.steps:null)??e.cycle??12,So=(e,t,n=0)=>{let r=e.get(t);if(!r||n>64)return 12;if(bo(r)===null)return xo(r);let i=r.braid;return i.kind===`scan`?i.steps.length:i.kind===`wave`?i.n:i.kind===`list`?i.tokens.reduce((e,t)=>e+V(t.atom).reduce((e,t)=>e+(t.kind===`note`?1:t.kind===`chord`?t.notes.length:0),0),0):So(e,bo(r),n+1)},Co=(e,t)=>{let n=e=>({atom:e,repeat:1,subdivide:1,elongate:1}),r=e=>n({kind:`note`,value:e,alter:0}),i=t.braid,a=bo(t);return a===null?Array.from({length:xo(t)},(e,t)=>r(t)):i.kind===`list`?i.tokens.map(({atom:e,repeat:t,subdivide:n,elongate:r,chance:i,level:a})=>({atom:e,repeat:t,subdivide:n,elongate:r,...i===void 0?{}:{chance:i},...a===void 0?{}:{level:a}})):i.kind===`scan`?ge(i.steps).positions.map(r):i.kind===`wave`?Wi(i.shape,i.n).map(r):Array.from({length:So(e,a)},(e,t)=>r(t))};function wo(e){let{parsed:t,error:n,unknownCell:r}=e,i=/* @__PURE__ */ new Map,a=/* @__PURE__ */ new Set;for(let e of t.cells)i.has(e.name)?n(`&${e.name} is already defined on line ${i.get(e.name).span.line}`,e.span):i.set(e.name,e);let o=jo(e,i);To(e,i),Eo(e,i),Oo(e,i),ko(e,i),Ao(e,i);let s=zo(i,n),c=Po(i,a,n,e.warn);Ro(e,i);let l=!i.has(Pr);for(let e of i.keys())(e.startsWith(`key:`)||e.startsWith(`scale:`))&&a.add(e);let u=No(i);if(u){i.set(Mo,{name:Mo,span:u.voices[0].span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`list`,tokens:u.voices.map(e=>({atom:{kind:`ref`,name:e.name,pick:null,shift:0},repeat:1,subdivide:1,elongate:1,span:e.span}))}});for(let[e,t]of u.cells)i.set(e,{...i.get(e),over:{name:Mo,pick:null,shift:0,span:i.get(e).span},braid:{kind:`list`,tokens:t}});a.add(Mo)}l&&i.set(Pr,{name:Pr,span:vo,over:null,shift:null,off:!1,step:null,map:{kind:`edo`,period:2,steps:null,span:vo},stride:null,cycle:12,params:{},paramSpans:{},braid:{kind:`blank`}});let d=i.get(Pr);yo(d)||n(`&${Pr} is the default grid: give it only cycle= and shift=`,d.span);let f=/* @__PURE__ */ new Map,p=(e,t)=>{if(f.has(e))return f.get(e);let a=i.get(e),o=bo(a),s=!0;return o!==null&&(i.has(o)?t.includes(o)?(n(`over= loops: ${[...t.slice(t.indexOf(o)),e,o].map(e=>`&`+e).join(` → `)}`,a.over?.span??a.span),s=!1):s=p(o,[...t,e]):(r(o,a.over.span),s=!1)),f.set(e,s),s};for(let e of i.keys())p(e,[]);return{decls:i,implicit:a,implicitRoot:l,overOk:f,sections:s,stacks:c,...o?{mainKey:o}:{}}}function To(e,t){for(let[n,r]of t){if(!r.tonic)continue;let i=t.get(r.tonic.name);if(!i){e.unknownCell(r.tonic.name,r.tonic.span);continue}let a=i.braid.kind===`list`?i.braid.tokens:[],o=a.every(e=>e.subdivide===1&&e.atom.kind===`note`&&Number.isInteger(e.atom.value))?a:[],s=o[0]?.atom;s?.kind!==`note`||!i.step&&(o.length!==1||o[0].repeat!==1)?e.error(i.step?`&${i.name} holds a key's tonic (scale(…, &${i.name})), stepped: write a note a step, a name or a pitch class (&${i.name} step=1m/8 D F)`:`&${i.name} holds a key's tonic (scale(…, &${i.name})): write one note, a name or a pitch class (&${i.name} D, &${i.name} 2), or step it (&${i.name} step=1m/8 D F)`,i.span):t.set(n,{...r,shift:I(s.value+s.alter,12)})}}function Eo(e,t){for(let[n,r]of t){if(r.braid.kind!==`scan`||!r.braid.mode)continue;let i=t.get(r.braid.mode.name);if(!i){e.unknownCell(r.braid.mode.name,r.braid.mode.span);continue}let a=i.step?null:Do(i);if(a){t.set(n,{...r,braid:{...r.braid,steps:a}});continue}let o=i.braid.kind===`list`?i.braid.tokens:[],s=o.length===1&&o[0].repeat===1&&o[0].subdivide===1?o[0].atom:null,c=s?.kind===`note`&&!s.pitched&&s.alter===0?s.value:null;i.step||c===null||!Number.isInteger(c)||c<0||c>6?e.error(i.step?`&${i.name} holds a scale's mode (scale(&${i.name}, …)): a stepped mode is not yet a form; write one (&${i.name} dorian)`:`&${i.name} holds a scale's mode (scale(&${i.name}, …)): write one, a name, its phase from the darkest or its table (&${i.name} major, &${i.name} 3, &${i.name} 0 2 3 5 7 8 10)`,i.span):t.set(n,{...r,braid:{...r.braid,steps:ue(c)}})}}function Do(e){if(e.braid.kind===`scan`&&!e.braid.mode)return e.braid.steps.every(e=>e>0)&&e.braid.steps.reduce((e,t)=>e+t,0)===12?[...e.braid.steps]:null;if(e.braid.kind!==`list`||e.braid.tokens.length<2)return null;let t=[];for(let n of e.braid.tokens){let e=n.atom;if(e.kind!==`note`||e.pitched||n.repeat!==1||n.subdivide!==1||n.elongate!==1)return null;t.push(e.value+e.alter)}return t[0]!==0||t.some((e,n)=>!Number.isInteger(e)||e>=12||n>0&&e<=t[n-1])?null:t.map((e,n)=>(t[n+1]??12)-e)}function Oo(e,t){for(let[n,r]of t){let i=r.paramCells?.swing;if(!i)continue;let[a]=i.factors,o=a&&t.get(a.name),{swing:s,...c}=r.paramCells,l=()=>t.set(n,{...r,paramCells:c});i.factors.length!==1||i.range||a.pick||a.shift?(e.error(`swing= reads one cell, a swing alone: swing=&swing, with &swing swing=8n:2/3`,i.span),l()):o?o.braid.kind!==`blank`||o.step||o.over||o.map||typeof o.params.swing!=`number`||!Object.keys(o.params).every(e=>e===`swing`||e===`label`)?(e.error(`&${o.name} holds a meter's swing (swing=&${o.name}): write a swing alone, &${o.name} swing=8n:2/3`,o.span),l()):t.set(n,{...r,params:{...r.params,swing:o.params.swing},paramSpans:{...r.paramSpans,swing:i.span},paramCells:c,...o.swing?{swing:o.swing}:{},...o.swingMoves?{swingMoves:o.swingMoves}:{},swingFrom:a}):(e.unknownCell(a.name,a.span),l())}}function ko(e,t){for(let[n,r]of t){let i=r.swingMoves;if(!i)continue;for(let n of i.factors)t.has(n.name)||e.unknownCell(n.name,n.span);if(i.range){i.range.every(e=>e>=0&&e<=1)||e.error(`swing=${i.level}:${i.range[0]}..${i.range[1]}: a share's range lies within 0..1 — swing=${i.level}:.5...75 * &k`,i.span);continue}let a=t.get(i.factors[0].name),o=a?.braid.kind===`list`?a.braid.tokens.flatMap(e=>V(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[],s=o.find(e=>!(e>=0&&e<=1));s!==void 0&&e.error(`swing=${i.level}:&${a.name}: a share is 0 to 1, and &${a.name} holds ${s}`,i.span);let c=o[0];c!==void 0&&s===void 0&&t.set(n,{...r,params:{...r.params,swing:c},swing:(r.swing??[]).map(e=>e.level===i.level?{...e,share:c}:e)})}}function Ao(e,t){for(let[n,r]of t){let i=r.bend?.depthMoves;if(!i)continue;for(let n of i.factors)t.has(n.name)||e.unknownCell(n.name,n.span);if(i.range)continue;let a=t.get(i.factors[0].name),o=a?.braid.kind===`list`?a.braid.tokens.flatMap(e=>V(e.atom)).find(e=>e.kind===`note`):void 0;o?.kind===`note`&&t.set(n,{...r,bend:{...r.bend,depth:o.value+o.alter}})}}function jo(e,t){let n=[...t.values()].find(e=>!e.lambda&&!e.base&&e.over?.name.startsWith(`key:λ`))?.name??null;for(let r of[...t.values()])r.over?.name===`key:main`&&(n?(e.warn(`over=key is the old way: name the key, over=&${n} (Migrate rewrites it)`,r.over.span),t.set(r.name,{...r,over:{...r.over,name:n}})):(e.error(`over=key is the old way, and the piece has no main key (the first scale(…) in the text) for it to read: name a key, over=&key, and write it (&key scale(major, C))`,r.over.span),e.broken.add(Fr)));return n}let Mo=`kit:voices`;function No(e){let t=e=>Object.keys(e?.params??{}).some(e=>Z.has(e)),n=n=>t(e.get(n)),r=e=>!e.pick&&!e.shift&&!e.transpose&&!e.degree&&!e.values,i=new Set([...e.values()].flatMap(e=>e.over?[e.over.name]:[])),a=(e,i)=>{if(!e||e.over||e.map||t(e)||e.braid.kind!==`list`||e.braid.tokens.length===0||i.length>256||i.includes(e.name))return!1;let a=!1;for(let t of e.braid.tokens.flatMap(e=>V(e.atom)))if(t.kind!==`rest`){if(t.kind===`ref`&&n(t.name)&&r(t))a=!0;else if(t.kind===`ref`&&!t.shift&&!t.transpose&&!t.values&&s(t.name,[...i,e.name]))a=!0;else if(t.kind===`mix`&&t.exprs.every(e=>e.k===`ref`&&n(e.ref.name)&&r(e.ref)))a=!0;else return!1}return a},o=/* @__PURE__ */ new Map,s=(t,n)=>{if(o.has(t))return o.get(t);let r=e.get(t),s=r?.braid.kind===`list`&&r.braid.tokens.length===1&&r.braid.tokens[0].atom.kind===`mix`,c=!!r&&!r.step&&!s&&!i.has(t)&&a(r,n);return(n.length===0||c)&&o.set(t,c),c},c=[...e.values()].filter(e=>e.step&&a(e,[]));if(!c.length)return null;let l=[],u=(e,t)=>{let n=l.findIndex(t=>t.name===e);return n>=0?n:l.push({name:e,pick:null,shift:0,span:t})-1},d=/* @__PURE__ */ new Map,f=t=>{if(d.has(t.name)||t.braid.kind!==`list`)return;d.set(t.name,[]);let r=t=>{let i=t.atom,a=i;if(i.kind===`ref`&&n(i.name))a={kind:`note`,value:u(i.name,t.span),alter:0};else if(i.kind===`ref`)f(e.get(i.name));else if(i.kind===`mix`){let e=i.exprs,n=e.map(e=>u(e.ref.name,t.span)),r=e.some(e=>e.level!==void 0)?e.map(e=>e.level??1):void 0;a={kind:`chord`,notes:n,alters:n.map(()=>0),...r?{levels:r}:{}}}else i.kind===`seq`&&(a={...i,layers:i.layers.map(e=>e.map(r))});return{...t,atom:a}},i=t.braid.tokens.map(r);d.set(t.name,i)};for(let t of[...e.values()])c.includes(t)&&f(t);return{voices:l,cells:d}}function Po(e,t,n,r){let i=/* @__PURE__ */ new Set,a=(e,t)=>({k:`ref`,ref:{name:e,pick:null,shift:0,span:t}}),o=No(e);for(let s of[...e.values()]){let c=s.params,l=s.braid.kind===`list`?s.braid.tokens:[],u=typeof c.trigger==`string`,d=u?c.trigger:typeof c.play==`string`&&l.length?c.play:null;if(d===null)continue;let f=u?`trigger`:`play`,p=s.paramSpans[f]??s.span,m=u?void 0:s.playMove;u&&r(`&${s.name} is a gate written the old way: play= for trigger=, one level= for velocity=, gate= and gain=, the voices it plays all of as a chord (Migrate rewrites it, decision 023)`,p);let h=e=>e.kind===`ref`&&!e.pick&&!e.shift&&!e.transpose&&!e.values,g=l.length===1&&l[0].atom.kind===`mix`&&l[0].atom.exprs.every(e=>e.k===`ref`&&!e.ref.pick)?l[0].atom.exprs:null,_=l.every(e=>h(e.atom)&&e.repeat===1&&e.subdivide===1&&e.elongate===1);if(!g&&!_){n(`&${s.name} is a gate (${f}=): its braid is what it plays: a voice, a kit, a chord of voices [&lead, &bell], or voices to pick from (&${s.name} ${f}=&${d} &lead)`,s.span);continue}let v=g?g.flatMap(e=>e.k===`ref`?[{name:e.ref.name,span:e.ref.span}]:[]):l.flatMap(e=>e.atom.kind===`ref`?[{name:e.atom.name,span:e.span}]:[]),y=v;if(!g&&!u&&v.length>1){let n=`${s.name}:kit`;e.set(n,{name:n,span:s.span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:s.braid}),t.add(n),y=[{name:n,span:s.span}]}let b=u?[`velocity`,`gate`].flatMap(e=>typeof c[e]==`string`?[{name:c[e],port:e,span:s.paramSpans[e]??s.span}]:[]):(s.paramCells?.level?.factors??[]).map(e=>({name:e.name,port:`level`,span:e.span})),x=u?c.gain:c.level,S=typeof x==`number`?x:1,C=s.paramSpans[u?`gain`:`level`]??s.span,w=(r,i)=>{let a=e.get(r);if(!m||!a)return r;let o=`${r}${qt({pick:null,shift:0,...m})}`,c={name:o,span:s.span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`blank`}},l={kind:`ref`,name:r,pick:null,shift:0,...m.transpose?{transpose:m.transpose}:{},...m.degree?{values:{mul:1,add:m.degree}}:{}};return e.has(o)||e.set(o,{...Wt(c,a,{name:r,pick:null,shift:0,span:i},e=>n(e,i)),shift:null,laps:a.laps??null,braid:{kind:`list`,tokens:[{atom:l,repeat:1,subdivide:1,elongate:1,span:i}]}}),t.add(o),o},T=Fo(e,e.get(d),n);T&&i.add(d);let E=(T??[{line:{name:d,pick:null,shift:0,span:p},by:[]}]).map(({line:e,by:t})=>({line:e.name,plays:w(e.name,e.span),ref:e,by:t,span:e.span})),D=t=>o?.cells.has(t)?Lo(e,t):null,O=E.flatMap(t=>{let r=e.get(t.line),i=D(t.line);return y.map(o=>{let s=Io(e.get(o.name)),c=i&&s?i.filter(e=>!s.includes(e)):[];return c.length&&n(`&${t.line} plays ${c.map(e=>`&`+e).join(`, `)}, which &${o.name} doesn't hold: a kit's lines play its own voices`,t.span),{k:`prod`,span:o.span,factors:[{k:`ref`,ref:{...t.ref,name:t.plays}},...t.by,...b.map(e=>a(e.name,e.span)),...r?.over?.name===o.name||i&&s?[]:[a(o.name,o.span)],...S===1?[]:[{k:`num`,value:S,span:C}]]}})}),k=Object.fromEntries(Object.entries(c).filter(([e])=>![`play`,`trigger`,`velocity`,`gate`,`gain`,`level`].includes(e))),A=Object.fromEntries(Object.entries(s.paramCells??{}).filter(([e])=>e!==`level`));e.set(s.name,{...s,params:k,paramCells:A,gate:{notes:d,...m?{move:m}:{},plays:E[0].plays,...T?{lines:E.map(({line:e,plays:t})=>({line:e,plays:t}))}:{},port:f,levels:b.map(({name:e,port:t})=>({name:e,port:t})),gain:S,receivers:v.map(e=>e.name)},braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:O,gate:s.name},repeat:1,subdivide:1,elongate:1,span:s.span}]}})}let s=new Map([...e.values()].flatMap(e=>e.gate?.lines?[[e.gate.notes,e.name]]:[])),c=e=>e.k===`ref`?[e.ref]:e.k===`sum`?e.items.flatMap(e=>c(e.e)):e.k===`prod`?e.factors.flatMap(c):[];for(let t of e.values())if(!(t.gate||t.braid.kind!==`list`))for(let e of t.braid.tokens.flatMap(e=>V(e.atom))){let r=e.kind===`ref`?[{name:e.name,span:t.span}]:e.kind===`mix`?e.exprs.flatMap(c):[];for(let e of r)s.has(e.name)&&n(`&${e.name} is the part &${s.get(e.name)} plays, a stack of lines and no sound: mix or send &${s.get(e.name)}`,e.span)}return i}function Fo(e,t,n){if(!t||t.map||t.gate||Object.keys(t.params).some(e=>!Cr.has(e))||t.braid.kind!==`list`||t.braid.tokens.length!==1)return null;let r=t.braid.tokens[0].atom;if(r.kind!==`mix`||r.gate||!r.exprs.length)return null;let i=t=>t.k===`num`||t.k===`ref`&&[`amp`,`db`,`lin`].includes(e.get(t.ref.name)?.map?.kind??``),a=r.exprs.map(e=>{if(e.k===`ref`)return`level`in e&&e.level!==void 0?null:{line:e.ref,by:[]};if(e.k!==`prod`)return null;let t=e.factors.filter(e=>!i(e)),n=t.length===1?t[0]:e.factors[0],r=e.factors.filter(e=>e!==n);return n.k!==`ref`||!r.every(e=>e.k===`num`||e.k===`ref`&&!e.ref.pick&&!e.ref.shift)?null:{line:n.ref,by:r}});if(!a.every(e=>e!==null))return null;let o=t=>{let n=e.get(t);return!!n&&(!!n.gate||Object.keys(n.params).some(e=>Z.has(e))||n.braid.kind===`list`&&n.braid.tokens.length===1&&n.braid.tokens[0].atom.kind===`mix`)};return a.map(e=>({line:e.line,by:e.by.filter(e=>e.k!==`ref`||!o(e.ref.name)||(n(`&${t.name} is a stack of lines, each times its levels: &${e.ref.name} is a sound, not a level (a cell with map=amp, map=db or map=lin, or a number)`,e.ref.span),!1))}))}function Io(e){if(!e||e.map||e.gate||e.braid.kind!==`list`||!e.braid.tokens.length)return null;let t=e.braid.tokens.flatMap(e=>e.atom.kind===`ref`?[e.atom.name]:[]);return t.length===e.braid.tokens.length?t:null}function Lo(e,t,n=[]){let r=e.get(t);if(!r||n.includes(t)||r.braid.kind!==`list`)return[];let i=t=>Object.keys(e.get(t)?.params??{}).some(e=>Z.has(e)),a=/* @__PURE__ */ new Set;for(let o of r.braid.tokens.flatMap(e=>V(e.atom))){let r=o.kind===`ref`?[o.name]:o.kind===`mix`?o.exprs.flatMap(e=>e.k===`ref`?[e.ref.name]:[]):[];for(let o of r)for(let r of i(o)?[o]:Lo(e,o,[...n,t]))a.add(r)}return[...a]}function Ro(e,t){let n=e=>!!e&&!e.gate&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`&&mo(e.name,t)===null;for(let r of t.values()){let i=r.over?t.get(r.over.name):void 0;i&&i.braid.kind===`list`&&i.braid.tokens.length&&i.braid.tokens.every(e=>e.atom.kind===`ref`&&n(t.get(e.atom.name)))&&(e.error(`A selector switches sections (decision 016): &${r.name} over=&${i.name} reads mixes. Write &${i.name} step=4n with a section per part (&${i.name} step=4n &keysBar &drumBar), step each part's cells by its section (step=&keysBar), and play the parts straight into the sound card`,r.over.span),e.broken.add(r.name))}}function zo(e,t){let n=/* @__PURE__ */ new Map,r=new Set([...e.values()].flatMap(e=>e.step?.kind===`driven`?[e.step.driver.name]:[])),i=e=>!!e&&!e.step&&!e.over&&!e.map&&(e.braid.kind===`blank`||e.braid.kind===`list`&&!e.braid.tokens.length);for(let a of[...e.values()]){if(!a.step||a.over||a.map||a.braid.kind!==`list`||!a.braid.tokens.length)continue;let o=[];for(let s of a.braid.tokens){let c=s.atom;if(c.kind!==`ref`||c.pick||c.shift||c.transpose||c.values||s.repeat!==1||s.subdivide!==1||s.elongate!==1)break;let l=e.get(c.name);if(l&&!i(l)&&(!l.step||n.has(c.name))){let n=a.braid.tokens.map(e=>e.atom.kind===`ref`?e.atom.name:``).filter(e=>e!==c.name);if(l.step||!n.some(t=>t&&!e.has(t)&&r.has(t)))break;t(`&${c.name} is a section of &${a.name}, so its line can carry attributes only (off, label=, tags=, show=, size=, shift=, restart=), not steps or a table of its own`,l.span),e.set(c.name,{...l,over:null,map:null,braid:{kind:`blank`}})}o.push(c.name)}if(o.length===a.braid.tokens.length&&!o.every(t=>e.has(t)&&!i(e.get(t)))&&o.some(e=>r.has(e))){for(let[t,r]of o.entries()){n.set(r,a.name);let o=e.get(r);if(o&&!i(o))continue;let s=a.braid.tokens[t].span,c={kind:`list`,tokens:[{atom:{kind:`note`,value:0,alter:0},repeat:1,subdivide:1,elongate:1,span:s}]};e.set(r,o?{...o,step:a.step,braid:c}:{name:r,span:s,over:null,shift:null,off:!1,step:a.step,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:c})}e.set(a.name,{...a,step:null})}}return n}let Bo=(e,t,n)=>e.k===`ref`?n.includes(t(e.ref.name)):e.k===`num`?!1:e.k===`prod`?e.factors.some(e=>Bo(e,t,n)):e.items.some(e=>Bo(e.e,t,n));var Vo=class extends Error{span;constructor(e,t){super(e),this.span=t}};let Ho=e=>e.k===`ref`?e.ref.span:e.span,Uo={k:`act`,terms:[],plain:[],offset:0,gain:1},Wo=e=>({ref:e,sign:1,inSum:!1}),Go=(e,t)=>e(t.ref.name)===`volume`||e(t.ref.name)===`plain`&&!t.inSum;function Ko(e,t,n){let r=qo(e,t);if(r.k===`signal`)return[...r.bindings];if(r.k===`num`)throw new Vo(`A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)`,Ho(e));let i=[...r.terms.map(e=>e.ref.name),...r.plain.map(e=>e.name)],a=n?.(i);throw new Vo(`${i.map(e=>`&`+e).join(` * `)} has no voice: a product needs one sound (a voice, a mix, a pattern read through a kit) — &theme * &lead${a?`. ${a}`:``}`,Ho(e))}function qo(e,t,n=`auto`){if(e.k===`num`)return{k:`num`,value:e.value};if(e.k===`ref`){if(e.level!==void 0)throw new Vo(`&${e.ref.name}:0:${+e.level.toFixed(3)} is a hit's gain, in a groove: in a mix, a gain is a number (&${e.ref.name} * ${+e.level.toFixed(3)})`,e.ref.span);let r=t(e.ref.name);return r===`signal`||r===`wave`&&n===`auto`?{k:`signal`,bindings:[{voice:e.ref,pitches:[],offset:0,gain:1}]}:r===`plain`?{...Uo,plain:[e.ref]}:{...Uo,terms:[{ref:e.ref,sign:1,inSum:!1}]}}if(e.k===`prod`){let r=n===`pitch`||Bo(e,t,[`signal`])?`pitch`:`auto`;return e.factors.map(e=>qo(e,t,r)).reduce((t,n,r)=>Jo(t,n,Ho(e.factors[r])))}return Yo(e,t,n)}function Jo(e,t,n){if(e.k===`num`&&t.k===`num`)return{k:`num`,value:e.value*t.value};if(e.k===`signal`&&t.k===`signal`)throw new Vo(`Two sounds can't multiply (&${e.bindings[0].voice.name} * &${t.bindings[0].voice.name}): mix them with + or ,`,n);if(e.k===`signal`||t.k===`signal`){let[n,r,i]=e.k===`signal`?[e,t,!1]:[t,e,!0],a=r.k===`num`?{...Uo,gain:r.value}:r,o=[...a.terms,...a.plain.map(Wo)];return{k:`signal`,bindings:n.bindings.map(e=>({...e,pitches:i?[...o,...e.pitches]:[...e.pitches,...o],offset:e.offset+a.offset,gain:e.gain*a.gain}))}}let r=e.k===`num`?{...Uo,gain:e.value}:e,i=t.k===`num`?{...Uo,gain:t.value}:t;return{k:`act`,terms:[...r.terms,...r.plain.map(Wo),...i.terms,...i.plain.map(Wo)],plain:[],offset:r.offset+i.offset,gain:r.gain*i.gain}}function Yo(e,t,n){let r=n===`pitch`||!Bo(e,t,[`signal`])&&Bo(e,t,[`pitch`,`plain`])?`pitch`:`auto`,i=e.items.map(e=>({t:qo(e.e,t,r),sign:e.sign,span:Ho(e.e)}));if(i.every(e=>e.t.k===`num`))return{k:`num`,value:i.reduce((e,t)=>e+t.sign*t.t.value,0)};if(i.some(e=>e.t.k===`signal`)){let e=[];for(let t of i){if(t.t.k===`num`)throw new Vo(`A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)`,t.span);if(t.t.k===`act`)throw new Vo(`A pitch or a volume can't be added to a sound: it acts on one (&theme * &lead)`,t.span);if(t.sign<0)throw new Vo(`Sounds mix with +; there's no subtracting a voice`,t.span);e.push(...t.t.bindings)}return{k:`signal`,bindings:e}}let a=[],o=0;for(let{t:e,sign:n,span:r}of i){if(e.k===`num`){o+=n*e.value;continue}let i=e;if(i.gain!==1)throw new Vo(`A gain inside a pitch sum: gains multiply the sound — (&theme + 12) * &lead * 0.8`,r);for(let e of i.terms){if(e.inSum===!1&&!Xo(e,t))throw new Vo(`&${e.ref.name} is a volume: it multiplies, it can't be added — &theme * &${e.ref.name} * &lead`,e.ref.span);a.push({...e,sign:e.sign*n,inSum:!0})}for(let e of i.plain)a.push({ref:e,sign:n,inSum:!0});o+=n*i.offset}return{k:`act`,terms:a,plain:[],offset:o,gain:1}}let Xo=(e,t)=>!Go(t,e),Zo=e=>`&${e} is a role: it names the gates that play it, and is no sound to mix, send or play (name its gates here)`;function Qo(e,t,n){let{error:r}=e,i=/* @__PURE__ */ new Map;for(let e of t.values()){if(e.map?.kind!==`role`)continue;let n=e.braid.kind===`list`?e.braid.tokens:[];n.length===0&&r(`&${e.name} is a role: name the gates that play it (&${e.name} map=role &player)`,e.span);for(let a of n){let n=a.atom;if(n.kind!==`ref`){r(`a role's entries are the gates that play it, as written (&${e.name} map=role &player &player2)`,a.span);continue}let o=t.get(n.name);if(!o)continue;if(!o.gate||n.pick||n.shift||n.transpose!==void 0||n.values||a.repeat!==1||a.elongate!==1||a.subdivide!==1){r(`&${n.name}: a role's entries are gates, as written (&player play=&part &voice), and &${n.name} is not one`,a.span);continue}let s=i.get(n.name);s===void 0?i.set(n.name,e.name):s!==e.name&&r(`&${n.name} plays two roles, &${s} and &${e.name}: a gate plays one`,a.span)}}return[...t.values()].flatMap(e=>{if(!e.gate||n.has(e.name))return[];let t=i.get(e.name);return[{name:e.name,...t===void 0?{}:{role:t},part:e.gate.notes,...e.gate.move?{move:e.gate.move}:{},voices:e.gate.receivers}]})}let $o=(e,t)=>{let n=e.get(t);return!!n&&(!!n.gate||n.map?.kind===`role`)};function es(e,t){let n=/* @__PURE__ */ new Map,r=new Set([...t.values()].flatMap(e=>e.over?[e.over.name]:[]));for(let i of r){let r=t.get(i);if(!r||r.map||r.braid.kind!==`list`||!r.braid.tokens.length)continue;let a=r.braid.tokens,o=e=>e.atom.kind===`ref`&&!e.atom.pick&&!e.atom.shift&&e.atom.transpose===void 0&&!e.atom.values&&e.repeat===1&&e.subdivide===1&&e.elongate===1;if(!a.every(e=>o(e)&&e.atom.kind===`ref`&&$o(t,e.atom.name)))continue;let s=a.map(e=>e.atom.kind===`ref`?e.atom.name:``);r.step&&e.warn(`&${i} is a band, a table of performers: it needs no step=, the selector reading it steps (their parts keep their time)`,r.step.span);let c=/* @__PURE__ */ new Map;for(let[n,r]of s.entries()){let o=t.get(r),s=o.gate?[r]:o.braid.kind===`list`?o.braid.tokens.flatMap(e=>e.atom.kind===`ref`&&t.get(e.atom.name)?.gate?[e.atom.name]:[]):[];for(let t of new Set(s)){let o=c.get(t);o!==void 0&&o!==r?e.error(`&${t} is in &${i} twice, as &${o} and as &${r}: a performer is one entry of a band`,a[n].span):c.set(t,r)}}n.set(i,s)}return n}function ts(e,t,n){if(!n.size)return[...e];let r=e=>[...t.values()].filter(t=>t.over===e&&t.clock).map(e=>e.name);return e.map(e=>{let i=[...e.through,...e.via].find(e=>t.get(e)?.gate);if(!i)return e;let a=[],o=[];for(let[e,s]of n){let n=s.findIndex(e=>e===i||t.get(e)?.map?.kind===`role`&&t.get(e).units.some(e=>e.atom.kind===`ref`&&e.atom.name===i));if(!(n<0)){for(let t of r(e))a.push({cell:t,entry:n,part:s[n],performer:!0});o.push(...r(e),e,s[n])}}return a.length?{...e,via:[.../* @__PURE__ */ new Set([...e.via,...o])],select:[...e.select,...a]}:e})}function ns(e,t,n,r){for(let[i,a]of r)for(let r of n.values()){if(r.over!==i||!r.clock)continue;let o=e=>n.get(e)?.params.restart??r.params.restart,s=a.find(e=>o(e)===`restart`||o(e)===`resume`),c=r.step?.tap===`1m`&&r.step.chain.every(e=>e.op===`÷`&&Number.isInteger(e.n)||e.n===1);s&&!c&&e.warn(`&${r.name} switches &${s} with restart=${o(s)} off the bar: its part starts where the switch falls, not on a bar line, so its notes move in the bar. Switch on whole bars (step=1m), or let it run on (restart=free, a performer's default)`,t.get(r.name).span)}}let rs=e=>!!e&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`,is=(e,{decls:t})=>!!e&&!Object.keys(e.params).some(e=>Z.has(e))&&e.braid.kind===`list`&&e.braid.tokens.length>0&&e.braid.tokens.every(e=>e.atom.kind===`ref`&&wr(t.get(e.atom.name)?.params??{})),as=(e,{rateOf:t})=>{if(!e.step||e.step.kind===`driven`||e.step.kind===`tap`)return null;let n=t(e.step),r=e.braid,i=r.kind===`list`?r.tokens.length:r.kind===`scan`?r.steps.length:r.kind===`wave`?r.n:1;return n===null?null:e.step.whole?n:n/Math.max(1,i)},os=(e,{decls:t})=>e.over?t.get(e.over.name):void 0,ss=(e,{decls:t})=>{let n=typeof e.params.play==`string`?t.get(e.params.play):void 0;return!!n&&typeof n.params.write==`string`&&rs(t.get(n.params.write))},cs=e=>t=>{let n=e.decls.get(t);return!!n&&(!!n.gate||Object.keys(n.params).some(e=>Z.has(e))||is(os(n,e),e)||ss(n,e)||(as(n,e)??0)>=20)},ls=(e,t)=>ho(e.name,t.decls,cs(t))!==null,us=[{sort:`signal`,is:`A sound parameter (s=, lpf= …): a voice.`,example:[`&lead s=saw loop=C4`],holds:e=>Object.keys(e.params).some(e=>Z.has(e))},{sort:`pitch`,is:`A product with no sound in it and a pitch: notes with their levels (decision 087). In a product with a sound it is its own product, as written in parentheses: [&cycle * &glass] plays [(&notes * &level) * &glass].`,example:[`&notes step=2 0 4`,`&level map=amp step=2 1 .5`,`&cycle [&notes * &level]`],holds:ls},{sort:`signal`,is:`A mix: an instrument.`,example:[`&a s=saw loop=C4`,`&b s=sine loop=C3`,`&organ [&a, &b]`],holds:(e,{decls:t})=>rs(e)&&mo(e.name,t)===null},{sort:`signal`,is:`A pattern read through a kit (a table of voices).`,example:[`&bd s=sine loop=A1`,`&hh s=white`,`&kit &bd &hh`,`&drums over=&kit step=4 0 1 0 1`],holds:(e,t)=>is(os(e,t),t)},{sort:`signal`,is:`A read head of a sound tape (a tape that records a mix).`,example:[`&lead s=saw loop=C4`,`&mix [&lead]`,`&tape write=&mix step=1 length=4`,`&head play=&tape at=1`],holds:ss},{sort:`wave`,is:`A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere.`,example:[`&square loop=220 0 1`],holds:(e,t)=>(as(e,t)??0)>=20},{sort:`volume`,is:`map=amp, map=db or map=adsr (an envelope).`,example:[`&accent map=amp step=2 1 .5`],holds:e=>e.map?.kind===`amp`||e.map?.kind===`db`||e.map?.kind===`adsr`},{sort:`plain`,is:`map=lin: as a number, it takes its operator's sort — a volume in a product, a pitch in a sum.`,example:[`&swell map=lin loop=.25 .2 1`],holds:e=>e.map?.kind===`lin`},{sort:`pitch`,is:`Anything else: a melody, a cell reading a table, a loop below hearing (a vibrato). In semitones.`,example:[`&vibrato loop=5 0 .1 -.1`],holds:()=>!0}];us.map(e=>W(`sort`,e.sort,e.is,[e.example[e.example.length-1]],`mix.md`));let ds=e=>e.k===`ref`?[e.ref]:e.k===`sum`?e.items.flatMap(e=>ds(e.e)):e.k===`prod`?e.factors.flatMap(ds):[],fs=e=>ds(e).map(e=>e.name);function ps(e,t){let n={decls:t,rateOf:e.rateOf};return e=>{let r=t.get(e);return!!r&&ls(r,n)}}function ms(e,t){let n={decls:t,rateOf:e.rateOf};return e=>{let r=t.get(e);return r?us.find(e=>e.holds(r,n)).sort:`pitch`}}function hs(e,t){let{error:n}=e,r={decls:t,rateOf:e.rateOf},i=ms(e,t),a=e=>{let n=e[e.length-1],i=t.get(n);if(!i)return null;if(i.braid.kind===`list`){let e=e=>e.atom.kind===`ref`&&Object.keys(t.get(e.atom.name)?.params??{}).some(e=>Z.has(e)),r=t=>t.atom.kind===`note`||t.atom.kind===`ref`&&e(t)&&(t.atom.pick||t.atom.shift||t.atom.transpose||t.atom.values),a=i.braid.tokens.flatMap(e=>V(e.atom).map(e=>({atom:e})));if(a.some(e)&&a.some(r))return`&${n} mixes voices with numbers or picks: a groove holds only voices, rests and chords of voices (&bd &hh ~ [&bd, &hh]); to play numbers through voices, read them with over= a kit`}if(i.map?.kind===`midi`)return`&${n} is a MIDI card: it sends what it names to a device, and is no sound to mix or play`;if(is(i,r))return`&${n} is a kit, a table of voices: read a pattern through it (&drums over=&${n}) and mix that`;let a=as(i,r);return a!==null&&a<20?`&${n} loops at ${+a.toFixed(2)} Hz, below hearing: a pitch. A voice loops at an audio rate (loop=C4) or has a sound (s=saw)`:i.step?null:`&${n} has no loop=: a voice loops at an audio rate (loop=C4) or has a sound (s=saw)`},o=/* @__PURE__ */ new WeakMap;return s=>{let c=o.get(s);if(c)return c;c=[];let l=s.gate?e=>is(t.get(e),r)?`signal`:i(e):i,u=s.gate?t.get(s.gate)?.gate:void 0,d=e=>s.exprs.flatMap(ds).find(t=>t.name===e),f=e=>{let n=t.get(e);return!!n&&(!!n.gate||rs(n)&&mo(e,t)===null&&!ls(n,r)||Object.keys(n.params).some(e=>Z.has(e)))},p=u?(u.lines?.map(e=>e.line)??[u.notes]).map(e=>({name:e,port:u.port})):[],m=u&&[...p,...u.levels].find(e=>f(e.name));if(u&&m){let e=p.some(e=>e.name===m.name)?`the notes it plays (a melody, &tune)`:`a level (a volume: a cell with map=amp, map=db or map=lin)`;return n(`${m.port}=&${m.name}: a gate's ${m.port}= takes ${e}, and &${m.name} is a sound (${t.get(m.name)?.gate?`a gate`:rs(t.get(m.name))?`a mix`:`a voice`})`,d(m.name)?.span??t.get(s.gate).span),o.set(s,c),c}let h=e=>t.get(e)?.map?.kind===`role`,g=[...p.map(e=>e.name),...s.exprs.flatMap(fs)].find(h);if(g)return n(Zo(g),d(g)?.span??t.get(s.gate??g).span),o.set(s,c),c;for(let i of s.exprs)try{let o=ds(i).filter(e=>!t.has(e.name));if(o.length){for(let t of o)e.unknownCell(t.name,t.span);continue}let s={named:[],moved:[]},u=_o(i,t,cs(r),s);if(s.moved.length){for(let e of s.moved)n(`&${e.ref.name} is notes with their levels (a product with no voice): it is named whole in a mix, not picked, moved or given a level (decision 087)`,e.ref.span);continue}let d;try{d=Ko(u,l,a)}catch(e){throw e instanceof Vo&&s.named.length&&!ds(u).some(e=>l(e.name)===`signal`||l(e.name)===`wave`)?new Vo(`&${s.named[0]} is notes with their levels: multiply them by a voice ([&${s.named[0]} * &lead]) (decision 087)`,i.k===`ref`?i.ref.span:i.span):e}let f=d.flatMap(e=>e.pitches).find(e=>is(t.get(e.ref.name),r));f?n(`&${f.ref.name} is a kit, a table of voices: a pattern read through it is the sound — mix the pattern alone`,f.ref.span):c.push(...d)}catch(t){if(!(t instanceof Vo))throw t;fs(i).some(t=>e.broken.has(t))||n(t.message,t.span)}return o.set(s,c),c}}let gs=`card:builtin`,_s=e=>e.k===`ref`?[e.ref.name]:e.k===`sum`?e.items.flatMap(e=>_s(e.e)):e.k===`prod`?e.factors.flatMap(_s):[],vs=e=>e.kind===`ref`?[e.name]:e.kind===`mix`?e.exprs.flatMap(_s):e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>vs(e.atom))):[],ys=e=>e.braid.kind===`list`?e.braid.tokens.flatMap(e=>vs(e.atom)):[];function bs(e){let t=[];for(let n of[e.over,e.tonic,e.braid.kind===`scan`?e.braid.mode:null,e.swingFrom,e.base,e.env,e.pitch,e.map?.kind===`table`?e.map.table:null,e.step?.kind===`driven`?e.step.driver:e.step?.kind===`tap`?e.step.meter:null])n&&t.push(n.name);for(let n of Object.values(e.paramCells??{}))t.push(...n.factors.map(e=>e.name));for(let n of Object.values(e.paramClocks??{}))n.kind===`driven`&&t.push(n.driver.name);for(let[n,r]of Object.entries(e.params))typeof r==`string`&&vr[n]?.value===`cell`&&t.push(r);return e.gate&&t.push(e.gate.notes,...e.gate.levels.map(e=>e.name),...e.gate.receivers),t}let xs=e=>[...ys(e),...bs(e)];function Ss(e,t,n=/* @__PURE__ */ new Set){let{decls:r,implicit:i}=t,a={...t,builtin:null};if([...r.values()].some(e=>e.map?.kind===`sample`||e.map?.kind===`midi`))return a;let o=/* @__PURE__ */ new Set;for(let e of r.values())for(let t of xs(e))t!==e.name&&o.add(t);let s=ms(e,r),c=[...r.values()].filter(t=>!i.has(t.name)&&!n.has(t.name)&&!t.lambda&&!o.has(t.name)&&!e.broken.has(t.name)&&(s(t.name)===`signal`||s(t.name)===`wave`));if(!c.length)return a;let l=vo,u=c.map(e=>({k:`ref`,ref:{name:e.name,pick:null,shift:0,span:e.span}})),d={name:gs,span:l,over:null,shift:null,off:!1,step:null,map:{kind:`sample`,span:l},stride:null,cycle:null,params:{postgain:.8},paramSpans:{},braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:u},repeat:1,subdivide:1,elongate:1,span:l}]}};return{...t,decls:new Map([...r,[gs,d]]),implicit:/* @__PURE__ */ new Set([...i,gs]),overOk:new Map([...t.overOk,[gs,!0]]),builtin:gs}}function Cs(e){return(e?.units??[]).flatMap(e=>V(e.atom).flatMap(e=>e.kind===`ref`?[e.name]:[]))}function ws(e){return e.clock===e.name?1:e.rate}function Ts(e,t){let n=e.cells.get(t),r=n?.clock?e.clocks.get(n.clock):void 0;return n&&r?r.perSecond*ws(n):null}let Es=[{note:35,name:`acousticbassdrum`,aliases:[]},{note:36,name:`bd`,aliases:[`kick`,`kd`,`bassdrum`]},{note:37,name:`rim`,aliases:[`rs`,`sidestick`]},{note:38,name:`sd`,aliases:[`snare`,`acousticsnare`]},{note:39,name:`cp`,aliases:[`clap`,`handclap`]},{note:40,name:`electricsnare`,aliases:[]},{note:41,name:`lt`,aliases:[`lo`,`lowfloortom`]},{note:42,name:`hh`,aliases:[`ch`,`closedhihat`]},{note:43,name:`highfloortom`,aliases:[]},{note:44,name:`ph`,aliases:[`pedalhihat`]},{note:45,name:`mt`,aliases:[`tom`,`mid`,`lowtom`]},{note:46,name:`oh`,aliases:[`openhihat`]},{note:47,name:`lowmidtom`,aliases:[]},{note:48,name:`ht`,aliases:[`hi`,`himidtom`]},{note:49,name:`cr`,aliases:[`crash`,`crashcymbal`]},{note:50,name:`hightom`,aliases:[]},{note:51,name:`rd`,aliases:[`ride`,`ridecymbal`]},{note:52,name:`chinesecymbal`,aliases:[]},{note:53,name:`ridebell`,aliases:[]},{note:54,name:`tb`,aliases:[`tambourine`]},{note:55,name:`splashcymbal`,aliases:[]},{note:56,name:`cb`,aliases:[`cowbell`]},{note:57,name:`crashcymbaltwo`,aliases:[]},{note:58,name:`vibraslap`,aliases:[]},{note:59,name:`ridecymbaltwo`,aliases:[]},{note:60,name:`hibongo`,aliases:[]},{note:61,name:`lowbongo`,aliases:[]},{note:62,name:`mutehiconga`,aliases:[]},{note:63,name:`openhiconga`,aliases:[]},{note:64,name:`lowconga`,aliases:[]},{note:65,name:`hightimbale`,aliases:[]},{note:66,name:`lowtimbale`,aliases:[]},{note:67,name:`highagogo`,aliases:[]},{note:68,name:`lowagogo`,aliases:[]},{note:69,name:`cabasa`,aliases:[]},{note:70,name:`sh`,aliases:[`maracas`]},{note:71,name:`shortwhistle`,aliases:[]},{note:72,name:`longwhistle`,aliases:[]},{note:73,name:`shortguiro`,aliases:[]},{note:74,name:`longguiro`,aliases:[]},{note:75,name:`claves`,aliases:[`clave`]},{note:76,name:`hiwoodblock`,aliases:[]},{note:77,name:`lowwoodblock`,aliases:[]},{note:78,name:`mutecuica`,aliases:[]},{note:79,name:`opencuica`,aliases:[]},{note:80,name:`mutetriangle`,aliases:[]},{note:81,name:`opentriangle`,aliases:[]}],Ds=new Map(Es.flatMap(({note:e,name:t,aliases:n})=>[t,...n].map(t=>[t,e])));function Os(e){return Ds.get(e.toLowerCase().replace(/\d+$/,``))??null}function ks(e,t){let n=/* @__PURE__ */ new Map;for(let r of e){let e=t(r);e!=null&&n.set(r,e)}let r=new Set(n.values()),i=36;for(let t of e)if(!n.has(t)){for(;i<=127&&r.has(i);)i++;if(i>127)break;n.set(t,i),r.add(i)}return n}var As=class extends Error{};function js(e){let{braid:t,params:n}=e,{beat:r,pulse:i}=n,a=t.kind===`scan`?bi(t.steps):t.kind===`list`&&t.perBeat!==void 0?vi(t.tokens.map(e=>e.atom.kind===`note`?e.atom.value:0),t.signature):null,o=t.kind===`scan`&&typeof i==`string`?$r(i):null,s=a&&o?ei(a,o):a,c=s&&typeof r==`number`&&r>0?ni(s,r):s,l=c&&e.legato?{...c,legato:e.legato.flatMap(e=>$r(e.level)===null?[]:[{...e,whole:$r(e.level)}])}:c;if(!l||typeof n.swing!=`number`)return l;let u=(e.swing??[{level:oi(l)??``,share:n.swing}]).flatMap(e=>{let t=$r(e.level);return t===null?[]:[{level:e.level,whole:t,share:e.share}]});return e.swingMoves&&u.length?{...l,swing:u}:ii(l,u)}function Ms(e,t,n){let r=js(e),i=e.bend,a=e.paramSpans.bend??e.span;if(!r)return t(`bend= is on a meter: &${e.name} is none`,a),{};let o=$r(i.level),s=r.levels.length,c=o===null?NaN:s*o*r.unit/r.pulses;if(!(c>=1)||!Number.isInteger(c)||s%c!==0)return t(`bend=${i.level}: the bar of &${e.name} has no whole number of ${i.level} nodes to bend`,a),{};let l=n(i.table.name),u=l?.braid.kind===`list`?l.braid.tokens.flatMap(e=>e.atom.kind===`note`?Array.from({length:Math.max(1,e.repeat)},()=>e.atom.value):[NaN]):[];if(!u.length||u.some(e=>!(e>0)))return t(`bend=${i.level}:&${i.table.name}: a table of lengths, each above 0`,a),{};let d=s/c,f=(e,t)=>t?f(t,e%t):e,p=u.length/f(d,u.length),{positions:m,lap:h}=ri(u,c,d,p,i.depth??1),g=i.depthMoves;return{bend:{positions:m,lap:h,bars:p,...g?{depth:{range:g.range,factors:g.factors.map(e=>e.name),table:u,per:c,nodes:d}}:{}}}}let Ns=e=>e?Qr(e)*e.pulses/ti(e):1;function Ps(e,{decls:t,implicit:n,implicitRoot:r,overOk:i,stacks:a},o,s){let c=ps(e,t),{rateOf:l,error:u,warn:d,broken:f,unknownCell:p}=e,m=/* @__PURE__ */ new Map,h=e=>So(t,e),g=e=>Co(t,e),_=[],v=/* @__PURE__ */ new Set,y=(i,b)=>{let x=m.get(i);if(x)return x;if(v.has(i)){for(let e of _)v.add(e),f.add(e);throw new As}let S=t.get(i),C=a.has(i)?null:mo(i,t);if(_.length>=256){v.size||u(`&${_[0]} splices cells into each other more than 256 deep (&${_[0]} → &${_[1]} → … → &${i}): write a long chain as one braid`,b);for(let e of[..._,i])v.add(e),f.add(e);throw new As}if(_.includes(i))throw u(`Circular reference: ${[..._.slice(_.indexOf(i)),i].map(e=>`&`+e).join(` → `)}`,b),new As;_.push(i);let w=g(S),T=/* @__PURE__ */ new Map,E=[],D=S.braid.kind===`list`?S.braid.tokens:[],O=(e,n,r)=>{let i=e.name;if(!t.has(i)){if(f.has(i))for(let e of _)f.add(e);throw p(i,n),new As}let a=y(i,n),o=Jr(a,e.pick);if(o===null)throw u(Yr(i,e.pick,a.units.length),n),new As;return T.set(i,(T.get(i)??0)+r),o};w.forEach((e,t)=>{let n=1,r=D[t]?.span??S.span;e.atom.kind===`ref`&&(n=O(e.atom,r,e.repeat*e.subdivide));let i=/* @__PURE__ */ new Map;for(let t of vt(e.atom))t.atom.kind===`ref`&&i.set(t.atom,O(t.atom,t.span??r,t.repeat*t.subdivide));e.atom.kind===`seq`&&(n=Ft(e.atom,e=>i.get(e)||1)),E.push(n*e.elongate*e.repeat)});let k=E.reduce((e,t)=>e+t,0);_.pop();let A=bo(S),j=S.braid,M={name:i,span:S.span,root:A===null,implicit:i===`fifths12TET`&&r||n.has(i),over:A===null?null:S.over?.name??null,overShift:S.over?.shift??0,context:A??i,cycle:A===null?xo(S):h(i),wrap:S.cycle??null,lambda:S.lambda??null,frees:S.frees??[],show:S.show??null,...S.paramSpans?.show?{showSpan:S.paramSpans.show}:{},laps:S.laps??null,loops:!!S.step?.whole,chance:S.chance??.5,seed:S.seed??0,size:S.size??1,tags:(S.tags??``).split(`,`).map(e=>e.trim()).filter(Boolean),about:(S.about??[]).map(e=>e.name),...S.base?{base:{name:S.base.name,...S.base.transpose?{transpose:S.base.transpose}:{},...S.base.degree?{degree:S.base.degree}:{}}}:{},beat:Ns(js(S)),meter:js(S),...S.swingMoves?{swingMoves:{level:S.swingMoves.level,range:S.swingMoves.range,factors:S.swingMoves.factors.map(e=>e.name)}}:{},label:S.label??null,note:Jt(S),env:S.env?.name??null,pitch:S.pitch?.name??null,braid:A===null?`blank`:j.kind,units:w,scan:j.kind===`scan`?{lap:ge(j.steps).lap,steps:j.steps}:null,...S.bend?Ms(S,d,e=>t.get(e)):{},shift:S.shift??0,...S.tonic?{tonic:S.tonic.name}:{},off:S.off,oneshot:!!S.oneshot,...S.drumNote===void 0?e.parsed.old&&Os(S.name)!==null?{drumNote:Os(S.name)}:{}:{drumNote:S.drumNote},glide:typeof S.params.glide==`number`&&S.params.glide>0?S.params.glide:0,children:T,steps:k,unitSteps:E,hasValues:w.some(e=>V(e.atom).some(e=>e.kind===`note`||e.kind===`chord`)),step:S.step?.kind===`driven`?{driver:S.step.driver.name,cycle:S.step.cycle,whole:S.step.whole,chain:S.step.chain}:null,paramClocks:Object.fromEntries(Object.entries(S.paramClocks??{}).flatMap(([e,t])=>t.kind===`driven`?[[e,{driver:t.driver.name,cycle:t.cycle,whole:t.whole,chain:t.chain}]]:[])),map:S.map?S.map.kind===`table`?{kind:`table`,table:S.map.table.name}:S.map.kind===`edo`?{kind:`edo`,period:S.map.period}:S.map.kind===`ratios`?{kind:`ratios`,ratios:S.braid.kind===`list`?S.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[]}:S.map.kind===`midi`?{kind:`midi`,channel:S.map.channel,port:S.map.port}:{kind:S.map.kind}:null,mix:a.has(i)||c(i)?[]:C?null:w.length>0&&w.every(e=>e.atom.kind===`mix`)&&(w.length===1||S.map?.kind===`sample`)&&S.map?.kind!==`midi`?w.flatMap(e=>e.atom.kind===`mix`?o(e.atom):[]):null,...C?{sum:C}:{},sink:S.map?.kind===`sample`,sort:s(i),...S.map?.kind===`midi`?{chords:w.map(e=>e.atom.kind===`mix`?o(e.atom):null)}:{},clock:null,rate:0,stride:S.stride??1,params:S.params,paramCells:Object.fromEntries(Object.entries(S.paramCells??{}).map(([e,t])=>[e,{range:t.range,factors:t.factors.map(e=>e.name),...t.to===void 0?{}:{to:t.to}}])),voice:Object.keys(S.params).some(e=>Z.has(e)),freq:S.step?.kind===`rate`||S.step?.kind===`env`?S.step.whole?l(S.step)??261.63:(l(S.step)??261.63)/Math.max(1,k):261.63,kit:!1,...S.gate?{gate:S.gate}:{}};return m.set(i,M),M};for(let[e,n]of t)if(i.get(e))try{y(e,n.span)}catch(e){if(!(e instanceof As))throw e;_.length=0}for(let[e,n]of t){let t=m.get(e);if(!t||t.root)continue;let r=t.over??`fifths12TET`;!m.get(r)?.root&&n.braid.kind===`list`&&n.braid.tokens.some(e=>e.atom.kind===`note`&&!Number.isInteger(e.atom.value))&&d(`&${r} is a table, so decimal indexes are rounded down`,n.span)}return m}let Fs=`tutorial`,Is={genre:[`classical`,`jazz`,`electronic`,`experimental`,`world`,`folk`,`ambient`,`dance`,`industrial`,`blues`,`minimal`,`8-bit`],artist:[`Bach`,`Wendy Carlos`,`Stockhausen`,`Neubauten`,`Aphex Twin`,`Brahms`,`Coltrane`,`Pachelbel`,`Kraftwerk`,`Scooter`,`Daft Punk`,`Chemical Brothers`,`Nine Inch Nails`,`Steve Reich`],tutorial:[Fs],topic:[`sound`,`rhythm`,`harmony`,`diatonic`,`tonal`,`modal`,`chromatic`,`microtonal`,`tuning`,`arrangement`,`canon`,`counterpoint`,`motifs`,`pentatonic`,`stereo`,`FM`,`MIDI`,`physics`,`tape`]};function Ls(e){if(e.toLowerCase()===`tutorial`)return{kind:`tutorial`,name:Fs};let t=/^(genre|artist|topic):\s*(.*)$/i.exec(e);return t?{kind:t[1].toLowerCase(),name:t[2]}:{kind:`topic`,name:e}}function Rs(e){if(/^(topic:\s*)?basics$/i.test(e.trim()))return Fs;let{kind:t,name:n}=Ls(e.trim());if(t===`tutorial`)return Fs;let r=e=>Is[e].find(e=>e.toLowerCase()===n.toLowerCase());if(t===`topic`){let t=/^topic:/i.test(e.trim()),i=t?void 0:r(`genre`);if(i)return`genre:${i}`;let a=t?void 0:r(`artist`);return a?`artist:${a}`:n}return`${t}:${r(t)??n}`}let zs=e=>[...e.pitches.map(e=>e.ref.name),e.voice.name].filter(e=>!e.startsWith(`λ`)).join(`*`)||e.voice.name;function Bs(e,t,n,r){let i=ps(e,t),{error:a,warn:o,unknownCell:s}=e,c=new Map(n),l=e=>wr(t.get(e)?.params??{}),u=e=>e.units.length>0&&e.units.every(e=>e.atom.kind===`ref`&&l(e.atom.name));for(let e of[...c.values()])!e.voice&&!e.root&&u(e)&&c.set(e.name,{...e,kit:!0});let d=[...c.values()].filter(e=>e.sink);for(let[e,n]of t){let t=c.get(e);t&&!t.mix&&!t.sum&&!Vr(t)&&t.map?.kind!==`role`&&t.units.some(e=>e.atom.kind===`mix`)&&a(t.sink?`A sound card's channels are all mixes: [left …] [right …], or &left &right`:`A mix is one chord of sounds: &${e} [&a * &v, &b * &w]`,n.span)}let f=(e,t=[])=>{let n=c.get(e.voice.name);return!n?.mix||n.sink?[{b:e,through:t}]:t.includes(n.name)||t.length>16?(a(`&${n.name} plays itself through its mixes`,n.span),[]):n.mix.flatMap(r=>f({voice:r.voice,pitches:[...e.pitches,...r.pitches],offset:e.offset+r.offset,gain:e.gain*r.gain},[...t,n.name]))},p=/* @__PURE__ */ new Map,m=/* @__PURE__ */ new Map,h=(e,t)=>{m.has(e)||m.set(e,[]),m.get(e).push(t)},g=e=>[e.voice.name,e.offset,...e.pitches.map(e=>`${e.sign}${e.ref.name}${JSON.stringify(e.ref.pick)}${e.ref.shift}`)].join(`|`),_=e=>{let n=[...e].filter(e=>{let n=t.get(e);return!!n&&[...Object.keys(n.params),...Object.keys(n.paramCells??{}),...Object.keys(n.paramClocks??{})].some(e=>Z.has(e))});return n.length?`|through:${n.join(`,`)}`:``};for(let n of d){let o=t.get(n.name),s=n.units;s.length===0||s.length>2?a(`The sound card takes one channel (mono) or two (left, right): &${n.name} map=sample &left &right`,o.span):s.forEach((l,u)=>{let d=l.atom.kind===`mix`?r(l.atom):null,m=l.atom.kind===`ref`&&i(l.atom.name)?t.get(l.atom.name)?.braid:void 0;if(m?.kind===`list`&&m.tokens[0]?.atom.kind===`mix`){r(m.tokens[0].atom);return}let v=l.atom.kind===`ref`?c.get(l.atom.name):d?n:void 0,y=d??(l.atom.kind===`ref`&&v?.mix&&!v.sink?v.mix:null);if(!v||!y){if(l.atom.kind===`ref`&&e.broken.has(l.atom.name))return;a(l.atom.kind===`ref`&&v?.map?.kind===`role`?Zo(l.atom.name):`A channel of the sound card is a mix: &mix, or [&theme * &lead] written in place`,o.span)}else for(let{b:e,through:t,top:r,index:i}of y.flatMap((e,t)=>f(e).map(n=>({...n,top:e,index:t})))){let a=g(e)+_(t),o=p.get(a),c=n.implicit?r.voice.span:v.span;o||p.set(a,o={b:e,span:c,gains:[0,0],via:/* @__PURE__ */ new Set,parts:[],through:/* @__PURE__ */ new Set});for(let e of t)o.through.add(e);h(e.voice.name,t);let l=s.length===1?[e.gain,e.gain]:u===0?[e.gain,0]:[0,e.gain];o.gains[0]+=l[0],o.gains[1]+=l[1],o.parts.push({mix:v.name,sink:n.name,gains:l,entry:{channel:u,index:i,label:zs(r)}}),o.via.add(v.name).add(n.name)}})}let v=e=>{let n=t.get(e)?.over?.name;return n&&c.get(n)?.kit?n:null};{let e=new Set([...p.values()].flatMap(e=>e.parts.map(e=>e.mix))),n=/* @__PURE__ */ new Set;for(let r of t.values())for(let t of[`excite`,`write`]){let i=r.params[t];typeof i==`string`&&c.get(i)?.mix&&!e.has(i)&&n.add(i)}for(let e of n){let t=c.get(e);for(let{b:n,through:r}of t.mix.flatMap(e=>f(e))){if(typeof c.get(n.voice.name)?.params.play==`string`)continue;let i=`send:`+g(n)+_(r);p.has(i)||[...p.values()].some(e=>g(e.b)+_(e.through)===g(n)+_(r))||(p.set(i,{b:n,span:t.span,gains:[n.gain,n.gain],via:/* @__PURE__ */ new Set([e]),parts:[],through:new Set(r),silent:!0}),h(n.voice.name,r))}}}let y=[...c.values()].filter(e=>Vr(e));for(let e of y){let n=t.get(e.name),r=e.map;n.step&&a(`A MIDI card doesn't turn: leave out ${n.step.whole?`loop`:`step`}= (&${e.name} map=midi …)`,n.step.span);let i=n.braid.kind===`list`?n.braid.tokens:[],s=e.units.findIndex(e=>e.subdivide!==1||e.elongate!==1);if(s>=0){a(`A MIDI card's entries are channels: x!n repeats one on n channels, but * and @ mean nothing here`,i[s]?.span??n.span);continue}let l=e.units.reduce((e,t)=>e+t.repeat,0);if(r.channel===null&&l>16){a(`A MIDI card has 16 channels, and &${e.name} names ${l}: ~ skips one, map=midi(10) puts them all on one`,n.span);continue}l===0&&o(`&${e.name} is a MIDI card with no channels: write what goes on each, map=midi [&theme * &reed] ~ &groove`,n.map.span);let u=0;e.units.forEach((t,o)=>{let s=i[o]?.span??n.span,l=u;if(u+=t.repeat,t.atom.kind===`rest`)return;let d;if(t.atom.kind===`mix`)d={bindings:e.chords?.[o]??[],mix:null};else if(t.atom.kind===`ref`){let e=t.atom.name,n=c.get(e);if(!n)return;let r={voice:{name:e,pick:t.atom.pick,shift:t.atom.shift,span:s},pitches:[],offset:0,gain:1};if(n.mix&&!n.sink)d={bindings:n.mix,mix:e};else if(v(e)||n.voice||n.kit)d={bindings:[r],mix:null};else{a(n.map?.kind===`role`?Zo(e):Vr(n)?`&${e} is a MIDI card: a card's entries are what it sends (a mix, a mix cell, a pattern read through a kit), not another card — name &${e}'s entries here`:`&${e} is a melody without a voice: a MIDI channel plays notes on a voice, [&${e} * &voice]`,s);return}}else{a(`A MIDI card's entries are channels: a mix ([&theme * &reed]), a mix cell, a pattern read through a kit, or ~ to skip one`,s);return}let{bindings:m,mix:y}=d;for(let n=0;n<t.repeat;n++){let t=r.channel??l+n+1;for(let{b:n,through:i}of m.flatMap(e=>f(e))){let a=g(n)+_(i),o=p.get(a)??[...p.values()].find(e=>g(e.b)===a);o||p.set(a,o={b:n,span:e.span,gains:[0,0],via:/* @__PURE__ */ new Set,parts:[],through:/* @__PURE__ */ new Set});for(let e of i)o.through.add(e);h(n.voice.name,i),(o.midi??=[]).push({card:e.name,mix:y,channel:t,port:r.port,gain:n.gain}),o.via.add(e.name),y&&o.via.add(y)}}})}let b=[...p.values()].map(e=>{let t=v(e.b.voice.name);return t?{...e,b:{...e.b,voice:{name:t,pick:null,shift:0,span:e.b.voice.span},pitches:[{ref:e.b.voice,sign:1},...e.b.pitches]}}:e}),x=e=>{let t=c.get(e),n=t&&typeof t.params.play==`string`?c.get(t.params.play):void 0,r=n&&typeof n.params.write==`string`?c.get(n.params.write):void 0;return!!r?.mix&&!r.sink};for(let{b:e}of b){let t=c.get(e.voice.name);!t||t.root||t.kit||x(t.name)||e.pitches.some(e=>e.ref.name===t.name)||c.set(t.name,{...t,voice:!0})}let S=[...t].find(([,e])=>e.title)?.[0];for(let[e,n]of t){let r=c.get(e);if(!r)continue;if(r.map?.kind===`table`&&!t.has(r.map.table)&&s(r.map.table,n.map.span),n.base&&!t.has(n.base.name)&&s(n.base.name,n.base.span),n.style)for(let e of Vs(n.style))t.has(e.name)||s(e.name,e.span);if(n.about){r.note||a(`about= belongs on a note: a cell with a label= (or title=) and nothing else`,n.about[0].span);for(let e of n.about)t.has(e.name)||s(e.name,e.span)}if(n.tier!=null&&n.title&&!(n.tags??``).split(`,`).some(e=>Rs(e.trim())===`tutorial`)&&o(`tier= puts a piece in a tier of the tutorial; without tags="tutorial" it is ignored`,n.paramSpans.tier??n.span),n.tier!=null&&!n.title&&a(`tier= belongs on a piece’s card: the note with its title=`,n.paramSpans.tier??n.span),e===S&&r.note){let e=[`title`,`tags`,`tier`].filter(e=>n[e]!=null),t=e=>e.length>1?`${e.slice(0,-1).join(`, `)} and ${e.at(-1)}`:e[0],r=e.length>1;o(`${t(e.map(e=>`${e}=`))} on the piece’s card ${r?`go`:`goes`} in its file’s frontmatter now (${e.map(e=>`${e}:`).join(` `)}): Shorten moves ${r?`them`:`it`} there (decision 047)`,n.paramSpans.title??n.span)}if(!r.voice)continue;let i=n.params.s;i!==void 0&&!(String(i)in Ar)&&a(`Unknown sound '${i}' (${Object.keys(Ar).join(`, `)})`,n.paramSpans.s??n.span),i!==void 0&&n.braid.kind!==`blank`&&o(`s=${i} plays a built-in waveform; the braid is ignored`,n.paramSpans.s);let l=Object.keys(n.params).find(e=>Z.has(e)),u=i===void 0&&l?Cs(r).find(t=>t!==e&&(c.get(t)?.voice||c.get(t)?.kit)):void 0;u&&o(`&${e}'s braid names &${u}, a voice: a voice's braid is its waveform, and a voice is none, so &${u} isn't heard. To play it through &${e}'s ${l}=, write the mix: &${e} … [&${u}]`,n.span);for(let[e,t]of Object.entries(n.params))vr[e]?.value===`number`&&typeof t!=`number`&&a(`${e}= takes a number`,n.paramSpans[e]);let d=Object.keys(n.params).find(e=>Z.has(e)),f=d?` (${d}= makes &${e} a voice; a meter takes none)`:``;n.step?.kind===`driven`||n.step?.kind===`tap`?a(`A voice moves at a rate — its pitch, like loop=C4${f}`,n.step.span):n.step&&!n.step.whole&&a(`A voice's pitch is loop= (one turn of its braid per cycle): loop=C4${f}`,n.step.span)}return{cells:c,sinks:d,cards:y,bindings:b,soundHead:x,playings:m}}function Vs(e){let t=e=>e.kind===`cell`?[e.ref]:e.terms.map(e=>e.ref);return[...t(e.from),...e.to?t(e.to):[],...e.curve?[e.curve]:[]]}let Hs=(e,t,n)=>`${e}:${t.written}${n>1?`:${n}`:``}`;function Us(e,t,n,r){let i=r*e/Math.max(1,t),a=i*t,o=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>0,s=e=>o(e)&&Number.isInteger(Math.log2(Math.round(e)))&&Math.round(e)<=64;if(o(1/a))return Math.round(1/a)===1?`1m`:`1m/${Math.round(1/a)}`;if(o(a)){if(s(i*n)&&Math.round(i*n)>1)return`${Math.round(i*n)}n`;if(s(2*i*n/3))return`${Math.round(2*i*n/3)}t`}return`pulse${Ws(i)}`}function Ws(e){if(Math.abs(e-1)<1e-9)return``;let t=Ks(e);return t?t[1]===1?`*${t[0]}`:t[0]===1?`/${t[1]}`:`*${t[0]}/${t[1]}`:`*${+e.toFixed(6)}`}let Gs=e=>e.map(e=>`${e.op===`×`?`*`:`/`}${e.n}`).join(``);function Ks(e){for(let t=1;t<=64;t++){let n=Math.round(e*t);if(n>0&&Math.abs(n/t-e)<1e-9)return[n,t]}return null}function qs(e,t,n){let{rateOf:r,error:i,warn:a,unknownCell:o,broken:s}=e,c=(t,n)=>(e.parsed.old?a:i)(t,n),l=new Map(n),u=/* @__PURE__ */ new Map,d=e=>{let n=e.step;if(n?.kind!==`driven`||n.whole||n.cycle||!l.get(e.name)?.meter)return null;let i=t.get(n.driver.name),a=l.get(n.driver.name);if(i?.step?.kind!==`rate`||i.step.whole||i.braid.kind!==`blank`||!a||a.voice||a.kit||a.meter)return null;let o=r(i.step);return o===null?null:o*n.ratio};for(let[e,n]of t){let t=l.get(e);if(!t||t.voice||t.kit)continue;let i=d(n);if(i===null&&n.step?.kind!==`rate`&&n.step?.kind!==`env`)continue;let o=i??r(n.step);if(o===null||!n.step)continue;n.params.pulse!==void 0&&(n.braid.kind!==`scan`||typeof n.params.pulse!=`string`||$r(n.params.pulse)===null)&&a(`pulse= says the note value of a scan's entries (pulse=16n: sixteenths, its bpm counting quarters); ${n.braid.kind===`scan`?`${n.params.pulse} is not one (16n, 8t, 4n.)`:`on &${e}, not a scan, it does nothing`}`,n.paramSpans?.pulse??n.span);let s=i===null&&n.step.whole,f=(s?o*Math.max(1,t.steps):o)*(s?1:t.beat),p=n.paramSpans?.swing??n.span,m,h=null,g=e=>String(e).replace(/^0\./,`.`);if(typeof n.params.swing==`number`&&t.meter){let r=t.meter;if(!n.swing){let e=oi(r),t=e===null?null:$r(e);t!==null&&si(r,t)===null?c(`swing=${g(n.params.swing)} on a meter is retired: name the level it leans, swing=${e}:${g(n.params.swing)} (Migrate rewrites it)`,p):a(`swing=${g(n.params.swing)} leans the meter cell's own steps, and they are its beats, which swing never moves: name the level it leans, swing=8n:${g(n.params.swing)}`,p)}for(let t of(n.swing??[]).filter(e=>e.share!==.5)){let n=$r(t.level),i=n===null?`${t.level} is not a note value (8n, 16n, 8t)`:si(r,n);i&&a(`swing=${t.level}:${g(t.share)} leans nothing on &${e}: ${i}`,p)}h=_i(r)}else typeof n.params.swing==`number`&&n.swing?a(`swing=${n.swing.map(e=>`${e.level}:${g(e.share)}`).join(`,`)} leans levels of a meter, and &${e} is not one: write swing=${g(n.params.swing)} (pairs of its steps)`,p):typeof n.params.swing==`number`&&n.params.swing!==.5&&(m=n.params.swing);u.set(e,{cell:e,perSecond:f,positional:Zr(t),...m===void 0?{}:{swing:m},...h?{swung:h}:{}})}let f=new Set([...t.values()].flatMap(e=>e.step?.kind===`driven`?[e.step.driver.name]:e.step?.kind===`tap`&&e.step.meter?[e.step.meter.name]:[])),p=/* @__PURE__ */ new Map,m=[],h,g=/* @__PURE__ */ new Map,_=()=>{if(h!==void 0)return h;let e=[...t.values()].filter(e=>u.has(e.name)&&l.get(e.name)?.meter);return h=(e.find(e=>!e.step?.whole)??e[0])?.name??null,h},v=(e,n,r)=>{let a=e.meter?.name??_();if(!a)return i(`${n} taps the piece's main meter, and it has none: write one (&bar meter("4/4") step=100bpm)`,e.span),r(),null;if(!t.has(a))return o(a,e.meter.span),r(),null;if(m.includes(a))return i(`step= loops back: ${[...m.slice(m.indexOf(a)),a].map(e=>`&`+e).join(` → `)}`,e.span),null;let s=b(a);return!l.get(a)?.meter||!s||s.clock!==a?(i(`${n}: &${a} is not a meter that keeps time — a tap reads a meter(…) or scan(…) with a tempo (&${a} meter("4/4") step=100bpm)`,e.meter?.span??e.span),r(),null):a},y=(e,n)=>{let r=`step=${n.meter?`&${n.meter.name}:`:``}${n.tap.written}`,i=v(n,r,()=>s.add(e));if(!i)return null;let a=l.get(i).meter;g.set(e,i);let o=Math.max(1,Math.round(t.get(e)?.cycle??1)),c=a.swing&&Number.isInteger(n.ratio)&&n.ratio>1?n.ratio:1,d=Hs(i,n.tap,o)+(c>1?`*${c}`:``);if(!u.has(d)){let e=Qr(a),t=xi(a,n.tap,o),r=a.pulses*o,s=t.flatMap((e,n)=>Array.from({length:c},()=>((t[n+1]??r)-e)/c)),f=t.flatMap((e,n)=>Array.from({length:c},(i,a)=>e+a*((t[n+1]??r)-e)/c)),p=f.map((t,n)=>di(a,t,s[n])*e),m=f.map(t=>t*e),h=a.levels.length*o;u.set(d,{cell:i,perSecond:u.get(i).perSecond*p.length/h,positional:!1,tap:{meter:i,positions:p,lap:h,...l.get(i).swingMoves?{written:m,grids:s}:m.some((e,t)=>Math.abs(e-p[t])>1e-12)?{written:m}:{}}})}let p=n.ratio/c,m=l.get(e);return(m?.scan||m?.bend)&&f.has(e)?(u.set(e,{cell:e,perSecond:u.get(d).perSecond*p,positional:!0}),{clock:e,rate:1}):m&&typeof t.get(e)?.params.belt==`number`?(u.set(e,{cell:e,perSecond:u.get(d).perSecond*p,positional:!1,belt:{driver:d,rate:p}}),{clock:e,rate:1}):{clock:d,rate:p}},b=e=>{if(p.has(e))return p.get(e);if(u.has(e))return p.set(e,{clock:e,rate:1}),p.get(e);let n=t.get(e)?.step;if(n?.kind===`tap`&&!l.get(e)?.voice){m.push(e);let t=y(e,n);return m.pop(),p.set(e,t),t}if(!n||n.kind!==`driven`||l.get(e)?.voice)return p.set(e,null),null;let r=n.driver.name,s=n.whole?`loop=`:`step=`,d=null;if(!t.has(r))o(r,n.driver.span);else if(m.includes(r)||r===e)i(`${s} loops back: ${[...m.slice(m.indexOf(r)),e,r].map(e=>`&`+e).join(` → `)}`,n.span);else if(l.get(r)?.voice)i(`&${r} is a voice: it moves at audio rate`,n.driver.span);else{m.push(e);let o=b(r);m.pop();let p=l.get(r)?.steps??0,h=l.get(e)?.steps??0;if(o&&!n.whole&&!n.cycle&&l.get(r)?.meter&&u.has(r)){let e=l.get(r).meter,i=Us(e.levels.length,e.pulses,t.get(r)?.step?.kind===`rate`?e.unit:0,n.ratio);c(`step=&${r}${Gs(n.chain)} is retired: a line taps the meter by pulse, beat or a note value, never its cell's own steps (step=${_()===r?``:`&${r}:`}${i}; Migrate rewrites it)`,n.span)}if(!o)a(`&${r} never moves, so &${e} stands still — give &${r} a rate (step=84bpm) or ${s}&cell`,n.driver.span);else if(n.cycle&&p===0)i(`&${r} has no cycle to count`,n.driver.span);else if(n.whole&&h===0)i(`&${e} has no steps to loop`,n.span);else{d={clock:o.clock,rate:o.rate*n.ratio*(n.whole?h:1)/(n.cycle?p:1)};let r=l.get(e);r&&(r.scan||r.bend)&&f.has(e)&&!n.whole?(u.set(e,{cell:e,perSecond:u.get(o.clock).perSecond*d.rate,positional:!0}),d={clock:e,rate:1}):r&&typeof t.get(e)?.params.belt==`number`&&!n.whole&&(u.set(e,{cell:e,perSecond:u.get(o.clock).perSecond*d.rate,positional:!1,belt:{driver:o.clock,rate:d.rate}}),d={clock:e,rate:1})}}return p.set(e,d),d};for(let e of[...l.values()]){let n=b(e.name),r=t.get(e.name)?.step,i=g.get(e.name),a=r?.kind===`tap`?n&&i?{driver:i,cycle:!1,whole:!1,chain:r.chain,tap:r.tap.written}:null:e.step;n?l.set(e.name,{...e,clock:n.clock,rate:n.rate,step:a}):a!==e.step&&l.set(e.name,{...e,step:a})}for(let e of t.values())for(let[t,n]of Object.entries(e.paramClocks??{})){if(n.kind===`tap`){let r=l.get(e.name),i=v(n,`${t}=${n.meter?`&${n.meter.name}:`:``}${n.tap.written}`,()=>{});if(!i||!r)continue;let a=l.get(i).meter,o=a.levels.length/u.get(i).perSecond,s=n.tap.kind===`note`?n.tap.whole*a.unit*o/a.pulses:o/xi(a,n.tap,1).length,c=n.ratio/s;l.set(e.name,{...r,params:{...r.params,[t]:+(1/c).toFixed(6)},paramClocks:{...r.paramClocks,[t]:{driver:i,cycle:!1,whole:!1,chain:n.chain,tap:n.tap.written}}});continue}if(n.kind!==`driven`)continue;let r=b(n.driver.name),a=l.get(e.name);if(!r||!a){i(`${t}=&${n.driver.name}: that cell keeps no time`,n.span);continue}let o=u.get(r.clock).perSecond*r.rate*n.ratio;l.set(e.name,{...a,params:{...a.params,[t]:+(1/o).toFixed(6)}})}return{cells:l,clocks:u,mainMeter:_()}}function Js(e,t,n,r=/* @__PURE__ */ new Map,i=/* @__PURE__ */ new Map){let{error:a,warn:o,unknownCell:s}=e;for(let e of t.values()){let t=e.tonic?n.get(e.tonic.name):void 0;t?.meter&&o(`&${t.name} is a meter: a key's tonic is a note (&tonic D); a meter's first level is read as its pitch class`,e.tonic.span)}let c=/* @__PURE__ */ new Set;for(let e of n.values())if(e.kit)for(let r of e.units){let e=r.atom.kind===`ref`?r.atom.name:null,i=e===null?void 0:t.get(e),a=e===null?null:Os(e);i&&a!==null&&i.drumNote===void 0&&!c.has(e)&&n.get(e)?.voice&&(c.add(e),o(`&${e} is named as General MIDI's drum ${a}, and a name gives no note: write &${e} note=${a} (Migrate writes it, decision 075)`,i.span))}if(e.parsed.old)for(let e of t.values()){let t=n.get(e.name);if(!t||t.voice)continue;let r=[`bass`,`pad`,`stab`,`lead`].includes(e.name)&&t.params.part===void 0,i=[`kick`,`backbeat`,`ghost`,`hat`,`pedal`,`euclid`,`clave`,`fill`].includes(e.name)&&t.params.role===void 0&&!t.map;r?o(`&${e.name} is named as the feel's part ${e.name}, and a name gives none now: write &${e.name} part=${e.name} (Migrate writes it, decision 075)`,e.span):i&&o(`&${e.name} is named as the feel's drum role ${e.name}, and a name gives none now: write &${e.name} role=${e.name} (Migrate writes it, decision 075)`,e.span)}for(let e of n.values()){let r=n=>t.get(e.name)?.paramSpans?.[n]??t.get(e.name).span;if(typeof e.params.body==`string`&&!(e.params.body in zr)&&a(`body=${e.params.body}: one of ${Object.keys(zr).join(`, `)}`,r(`body`)),typeof e.params.board==`string`&&e.params.board!==`none`&&!(e.params.board in zr)&&a(`board=${e.params.board}: none, or one of ${Object.keys(zr).join(`, `)}`,r(`board`)),e.params.ftype!==void 0&&kr(e.params.ftype)===null&&a(`ftype=${e.params.ftype}: its filters' model is one of ${Or.join(`, `)} (or superdough's 0, 1, 2)`,r(`ftype`)),typeof e.params.couple==`string`){let t=n.get(e.params.couple);t?typeof t.params.body!=`string`&&a(`couple=&${t.name}: it couples to another resonator (a cell with body=)`,r(`couple`)):s(e.params.couple,r(`couple`))}typeof e.params.excite==`string`&&!n.get(e.params.excite)?.mix&&a(`excite=&${e.params.excite}: a resonator is driven by sound — a mix`,r(`excite`))}for(let e of n.values()){let r=e.show?.startsWith(`mix:&`)?e.show.slice(5):null;if(r===null)continue;let i=t.get(e.name)?.paramSpans?.show??t.get(e.name).span,a=n.get(r);e.mix?a?a.root||o(`show=mix:&${r}: a mix's colours follow a grid (a cell with map=edo), not &${r}`,i):s(r,i):o(`show=mix:&${r} does nothing on &${e.name}: it names the grid a mix's colours follow, and &${e.name} isn't a mix`,i)}for(let e of n.values()){let r=n=>t.get(e.name)?.paramSpans?.[n]??t.get(e.name).span;if(typeof e.params.write==`string`){let t=n.get(e.params.write);t?t.voice&&a(`write=&${t.name}: a tape records what plays — a melody, not a voice`,r(`write`)):s(e.params.write,r(`write`))}if(typeof e.params.play==`string`){let t=n.get(e.params.play);t?typeof t.params.write!=`string`&&a(`play=&${t.name}: a read head plays a tape — a cell with write= (what it records)`,r(`play`)):s(e.params.play,r(`play`))}}for(let e of n.values()){let r=e.params.fm;if(typeof r!=`string`)continue;let i=t.get(e.name)?.paramSpans?.fm??t.get(e.name).span,o=n.get(r);if(!o)s(r,i);else if(!o.voice)a(`fm=&${r}: a modulator is a voice (s=sine ratio=…)`,i);else{let t=/* @__PURE__ */ new Set([e.name]);for(let e=r;e;e=typeof n.get(e)?.params.fm==`string`?n.get(e).params.fm:void 0){if(t.has(e)){a(`fm=&${r}: the modulators come back round to &${e} — FM chains can't loop`,i);break}t.add(e)}}}let l=ms(e,t),u=ps(e,t);for(let e of t.values())for(let[t,r]of Object.entries(e.paramCells??{})){let i=e.map?.kind===`adsr`&&tt.adsr.includes(t)||e.map?.kind===`style`&&tt.style.includes(t);t===`s`&&r.to!==void 0?[e.params.s,r.to].map(e=>typeof e==`string`?Ar[e]:void 0).some(e=>e===void 0||e===`white`||e===`pink`||e===`brown`)&&a(`s=${e.params.s}..${r.to}: a blend is of two of the waves, sine tri saw square (or their other names)`,r.span):!xr.has(t)&&!i&&a(`${t}= can't move: it takes a number (these can: ${[...xr].join(` `)}; on a map=adsr cell, its slots; on a map=style cell, its axes; s= as a blend of two waves, s=tri..square * &x)`,r.span),r.range&&!(r.range[0]>=0&&r.range[1]>=0)&&a(`${t}=: a range of positive values, low..high`,r.span);let c=0;for(let e of r.factors){let r=n.get(e.name);r?r.map?.kind===`adsr`?c++:u(e.name)?a(`${t}= * &${e.name}: &${e.name} is notes with their levels (a product with no voice), what a voice plays, not a value that moves: multiply it by a voice in a mix`,e.span):l(e.name)===`signal`?o(`${t}= * &${e.name}: &${e.name} is a sound, not a value that moves, and moves nothing here. A CV is a braid: &${e.name} loop=.5 sin(12)`,e.span):l(e.name)===`wave`&&o(`${t}= * &${e.name}: &${e.name} turns at an audio rate, and ${t}= follows a cell turning at most 20 times a second: it is read turning at that. A sound moved at an audio rate is FM's: fm= a voice`,e.span):s(e.name,e.span)}c>1&&a(`${t}=: one envelope (map=adsr) at most — the other factors scale it`,r.span),c&&!r.range&&a(`${t}=&env: an envelope runs 0 to 1 — give it a range: ${t}=200..3000 * &env`,r.span)}for(let e of t.values()){let r=e.params.legato,i=e.paramSpans.legato??e.span,s=e.frees?.find(e=>e.key===`param`&&e.param===`legato`),c=e=>a(`legato=${e}: a share of each note's held length is above 0 (.5 staccato, 1 as written, 1.5 into the next)`,i);typeof r==`string`?a(`legato=${r}: a share (.5), free(.5, .25..2.5) or a cell of shares (&artic)`,i):typeof r==`number`&&!(r>0)?c(String(r)):s&&!(s.lo>0)&&c(`free(${s.value}, ${s.lo}..${s.hi})`);let l=e.legato?.find(e=>!(e.share>0));l&&c(`${l.level}:${l.share}`),e.legato&&!n.get(e.name)?.meter&&o(`legato=${e.legato.map(e=>`${e.level}:${e.share}`).join(`,`)} gives the lines tapping a meter their share: &${e.name} is not a meter, so it does nothing`,i);let u=e.paramCells?.legato;u?.range&&!(u.range[0]>0)&&c(`${u.range[0]}..${u.range[1]}`);for(let e of u&&!u.range?u.factors:[]){let n=t.get(e.name),r=(n?.braid.kind===`list`?n.braid.tokens.flatMap(e=>V(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[]).find(e=>!(e>0));r!==void 0&&c(`&${e.name}: its ${r}`)}}for(let e of t.values())if(e.map?.kind===`adsr`){for(let[n,r]of Object.entries(e.paramCells??{}))if(!r.range&&tt.adsr.includes(n))for(let e of r.factors){let i=t.get(e.name),o=(i&&i.map?.kind!==`adsr`&&i.braid.kind===`list`?i.braid.tokens.flatMap(e=>V(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[]).find(e=>n===`sustain`?!(e>=0&&e<=1):!(e>=0));o!==void 0&&a(n===`sustain`?`sustain=&${e.name}: a sustain is a level, 0 to 1, and &${e.name} holds ${o}`:`${n}=&${e.name}: ${n===`attack`?`an`:`a`} ${n} is seconds, 0 or more, and &${e.name} holds ${o}`,r.span)}}for(let e of t.values())e.stride!==null&&e.step?.kind!==`driven`&&e.step?.kind!==`tap`&&o(`stride= only matters with step=&cell or a tap (step=1m)`,e.paramSpans?.stride??e.span);for(let e of t.values())e.oneshot&&n.get(e.name)&&!n.get(e.name).voice&&o(`oneshot=1 is a voice's: &${e.name} is no voice, so it does nothing (put it on the voice that plays its notes)`,e.span);for(let e of t.values()){let t=n.get(e.name)?.cycle??0;e.step?.kind!==`driven`||e.cycle===null||e.map||t<2||e.cycle<t||e.cycle%t!==0||o(`cycle=${e.cycle} on &${e.name} counts laps: ${e.cycle} of its ${t} steps. Written before v0.16, when it counted steps, it says cycle=${e.cycle/t} (Migrate rewrites it, decision 040)`,e.paramSpans.cycle??e.span)}for(let e of t.values())for(let[t,r]of[[`env`,e.env],[`pitch`,e.pitch]]){if(!r)continue;let e=n.get(r.name);e?t===`env`&&e.map?.kind!==`adsr`&&e.map?.kind!==`amp`&&e.map?.kind!==`lin`&&e.map?.kind!==`db`?a(`env= takes a volume: a cell with map=adsr (an envelope), map=amp, map=db or map=lin`,r.span):t===`pitch`&&(e.map?.kind===`adsr`||e.map?.kind===`amp`||e.map?.kind===`db`)&&a(`pitch= takes a pitch (a vibrato, map=lin to glide), not a volume`,r.span):s(r.name,r.span)}for(let e of t.values()){if(e.map?.kind!==`adsr`)continue;let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];(t.length!==4||t.some(e=>!(e>=0))||t[2]>1)&&a(`map=adsr takes four numbers: attack decay sustain release — seconds, and sustain a level 0…1 (map=adsr .01 .3 .5 .4)`,e.map.span)}for(let e of t.values()){if(e.map?.kind!==`style`)continue;let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];(t.length!==B.length||t.some((e,t)=>!(e>=B[t].range[0]&&e<=B[t].range[1])))&&a(`map=style takes a value for each axis, in order: ${B.map(e=>`${e.name} (${e.range[0]} to ${e.range[1]})`).join(`, `)} (map=style .3 .45 .55 .5, or sync=.3 harm=.45 bite=.55 mood=.5)`,e.map.span)}for(let e of t.values()){if(e.map?.kind!==`ratios`)continue;let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];e.over===null?(t.length<2||t.some((e,n)=>!(e>0)||n>0&&!(e>t[n-1])))&&a(`map=ratios lists one period's tones as rising ratios, the last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`,e.map.span):a(`A grid (map=ratios) reads nothing: its braid is its tones`,e.map.span)}for(let e of t.values())if(e.map?.kind===`edo`){if(e.over!==null||e.braid.kind!==`blank`)a(`A grid (map=edo, map=ed(r)) reads nothing and has no braid: &${e.name} map=edo(19)`,e.map.span);else if(e.cycle!==null&&e.name!==`fifths12TET`){let t=e.map.period===2?`edo(${e.cycle})`:`ed(${e.cycle}, ${Zs(e.map.period)})`,n=e.paramSpans.cycle??e.span;e.cycle===0?a(`A grid has at least one step: its size is its map's, map=edo(19)`,n):e.map.steps===null?o(`cycle= on a grid is the old way: its size is its map's, map=${t} (Migrate rewrites it)`,n):o(`cycle=${e.cycle} does nothing on a grid whose map says its size (map=${e.map.period===2?`edo`:`ed`}(${e.map.steps}…)): leave it out`,n)}}for(let a of t.values()){let t=a.over?n.get(a.over.name):void 0;if(!t||t.kit||i.has(t.name))continue;let s=Cs(t);if(!s.length||s.every(e=>r.get(e)===t.name)||e.broken.has(a.name))continue;let c=[...new Set(s)].map(e=>`&`+e).join(` `);o(`&${t.name} is read as a table, but its cells (${c}) aren't entries: a table is its numbers. To play cells one after another, splice them into a braid (&${a.name} ${c}); choosing a melody per step isn't built yet (#29)`,a.over.span)}for(let[e,i]of r)[...n.values()].some(t=>t.step?.driver===e||Object.values(t.paramClocks).some(t=>t.driver===e))||o(`&${e} is a section of &${i}, but nothing is stepped by it: step=&${e} on what it should play (or a name mistyped)`,t.get(e).span);for(let e of t.values()){let t=e.map?.kind===`table`?n.get(e.map.table.name):void 0;t&&(t.mix||t.sink||Vr(t))&&o(`map=&${t.name}: a map reads a table's numbers, and &${t.name} is ${Vr(t)?`a MIDI card`:t.sink?`the sound card`:`a mix`}, which has none: nothing is mapped`,e.map.span)}for(let e of n.values()){let n=e.map?.kind===`midi`?e.map.channel:null;if(n===null)continue;let r=t.get(e.name);(r?.braid.kind===`list`?r.braid.tokens:[]).forEach(e=>{e.repeat>1&&e.atom.kind!==`rest`&&o(`!${e.repeat} on a card with one channel (map=midi(${n})): each note goes out ${e.repeat.toLocaleString(`en`)} times on it, at once — leave out the !${e.repeat}`,e.span)})}for(let e of new Set(r.values()))if(![...t.values()].some(t=>t.over?.name===e)){let n=[...r].filter(([,t])=>t===e).map(([e])=>e),i=t.get(n[0])?.step,a=i?.kind===`driven`?i.driver.name:`bar`;o(`&${e} declares sections (${n.map(e=>`&`+e).join(` `)}), and nothing selects them: every part plays all the time. A selector reads the table and switches them, a step of the form at a time: &song over=&${e} step=&${a}/16 0 [0,1]`,t.get(e).span)}let d=Math.max(12,...[...n.values()].filter(e=>e.root).map(e=>e.cycle))*Ys;for(let e of n.values()){let r=t.get(e.name);if(!r||e.implicit)continue;let i=r.braid.kind===`list`?r.braid.tokens:[];e.units.forEach((t,r)=>{let a=t.atom;if(a.kind!==`ref`||!a.values||Math.abs(a.values.add)<=d)return;let s=n.get(a.name);o(`degree(${s?.lambda?`&( … )`:`&`+a.name}, ${a.values.add}) moves it ${Math.abs(a.values.add).toLocaleString(`en`)} steps, over a hundred octaves: ${a.values.add>0?`its notes land above 20 kHz and are dropped`:`its notes fall below hearing`}, nothing plays`,i[r]?.span??e.span)});let a=Math.abs(e.shift)/Math.max(1,e.units.length);a>Xs&&o(`shift=${e.shift} turns ${e.lambda?`an unnamed cell &( … )`:`&`+e.name} about ${Math.round(a).toLocaleString(`en`)} laps, and every lap climbs a lap of the grid: its notes leave hearing`,r.paramSpans?.shift??r.span)}}let Ys=100,Xs=20;function Zs(e){if(Number.isInteger(e))return String(e);for(let t=2;t<=1e3;t++){let n=Math.round(e*t);if(Math.abs(n/t-e)<1e-6)return`${n}/${t}`}return String(e)}function Qs(e,t,n,r,{sinks:i,cards:a,bindings:o,soundHead:s}){let{parsed:c,error:l,warn:u,unknownCell:d}=e,f=new Set([...t.values()].flatMap(e=>e.gate?[e.gate.notes,e.gate.plays,...(e.gate.lines??[]).flatMap(e=>[e.line,e.plays])]:[])),p=[],m=[],h=[],g=e=>!!e.clock&&t.get(e.name)?.step?.whole===!1,_=e=>(r.get(e.clock)?.perSecond??0)*e.rate,v=e=>{let t=[...e].sort((e,t)=>_(t.c)-_(e.c)),[n,r]=[_(t[0].c),_(t[1].c)];return n-r>1e-9*Math.max(n,r)?t[0]:null};for(let{b:r,span:i,gains:a,via:c,parts:_,through:y,silent:b,midi:x}of o){let o=e=>t.has(e.name)?!0:(d(e.name,e.span),!1);if(![r.voice,...r.pitches.map(e=>e.ref)].every(o)||[r.voice,...r.pitches.map(e=>e.ref)].some(t=>e.broken.has(t.name)))continue;let S=e=>{n.get(e)?.paramCells.pan&&u(`&${e}'s pan= moves, but it is read at each note's start, and &${e} rings without notes here: it sits in the centre (write a number)`,t.get(e)?.paramSpans.pan??r.voice.span)};if(s(r.voice.name)&&r.pitches.length===0){S(r.voice.name),m.push({head:r.voice.name,tape:n.get(r.voice.name).params.play,gains:[a[0],a[1]],parts:_,through:[...y]});continue}let C=n.get(r.voice.name);if(!C)continue;if(typeof C.params.body==`string`&&r.pitches.length===0){S(C.name);let[e,t]=Br(C.params.pan);h.push({cell:C.name,gains:[a[0]*e,a[1]*t],parts:_.map(n=>({...n,gains:[n.gains[0]*e,n.gains[1]*t]})),through:[...y]});continue}let w=[...c,...y].flatMap(e=>{let t=n.get(e)?.gate;return t?t.lines?.map(e=>e.plays)??[t.plays]:[]}).find(e=>r.pitches.some(t=>t.ref.name===e)),T=C.kit?r.pitches.find(e=>t.get(e.ref.name)?.over?.name===C.name||e.ref.name===w):void 0;if(C.kit&&!T){l(`A kit is a table of voices: read the pattern through it, &drums over=&${C.name}, and mix &drums`,r.voice.span);continue}if(C.root){l(`&${C.name} is a grid, not a voice`,r.voice.span);continue}if(r.voice.pick||r.voice.shift){l(`Pick or shift the melody, not the voice: &theme[0] * &${C.name}`,r.voice.span);continue}if(t.get(C.name)?.step?.kind===`driven`||t.get(C.name)?.step?.kind===`tap`){l(`&${C.name} moves with step=&…, so it can't be a voice: a voice moves at a rate, its pitch (loop=C4)`,r.voice.span);continue}!C.params.s&&C.freq<20&&u(`&${C.name} loops at ${+C.freq.toFixed(2)} Hz, below hearing — is it a pitch? Then leave out its sound parameters: (&theme + &${C.name}) * &lead`,r.voice.span);let E=[...C.env?[{ref:t.get(C.name).env,sign:1,inSum:!1}]:[],...C.pitch?[{ref:t.get(C.name).pitch,sign:1,inSum:!0}]:[]],D=r.pitches.find(e=>e.ref.transpose||e.ref.degree);D?.ref.transpose?l(`&${D.ref.name}^$${D.ref.transpose}: transposing (^$) is for braids — in a mix, add pitch: &${D.ref.name} + ${D.ref.transpose}`,D.ref.span):D&&l(`&${D.ref.name}^${D.ref.degree}: moving by degrees (^) is for braids — in a mix, write a cell that plays it: &u step=&bar &${D.ref.name}^${D.ref.degree}`,D.ref.span);let O=/* @__PURE__ */ new Map,k=[...r.pitches,...E].map(e=>{let t=n.get(e.ref.name),r=t&&typeof t.params.play==`string`?n.get(t.params.play):void 0,i=r&&typeof r.params.write==`string`?n.get(r.params.write):void 0;return t&&r&&i&&(O.set(e,{head:t.name,tape:r.name,at:typeof t.params.at==`number`?t.params.at:0,length:typeof r.params.length==`number`?r.params.length:0,erase:typeof r.params.erase==`number`?Math.min(1,Math.max(0,r.params.erase)):1}),t=i),{t:e,c:t}}).filter(e=>e.c),A=k.filter(e=>e.c.voice);if(A.length){l(`Two sounds can't multiply (&${A[0].c.name} * &${C.name}): &${A[0].c.name} plays as a voice — mix them with + or ,`,A[0].t.ref.span);continue}let j=e=>e.c.map?.kind===`adsr`,M=e=>e.c.map?.kind===`amp`||e.c.map?.kind===`db`||e.c.map?.kind===`lin`&&!e.t.inSum,N=k.filter(j),P=k.filter(e=>!M(e)&&!j(e)),ee=k.filter(e=>M(e));if(N.length>1){l(`One envelope per note: &${N[0].c.name} and &${N[1].c.name} both shape &${C.name}`,N[1].t.ref.span);continue}let te=N.find(e=>e.t.inSum||e.t.sign<0);if(te){l(`&${te.c.name} is an envelope (map=adsr): a volume, it multiplies — keep it out of pitch sums`,te.t.ref.span);continue}let ne=N[0]?Xr(N[0].c):null,re=ee.find(e=>e.t.sign<0);if(re){l(`&${re.c.name} is a volume (map=amp): it multiplies, it can't be subtracted`,re.t.ref.span);continue}let F=P.filter(e=>g(e.c)),ie=F.length===0;ie&&(F=ee.filter(e=>g(e.c)));let[ae,oe]=C.kit?[1,1]:Br(C.params.pan),[se,ce]=[...y].reduce(([e,t],r)=>{let[i,a]=Br(n.get(r)?.params.pan);return[e*i,t*a]},[ae,oe]),I=e=>({cell:e.c.name,pick:e.t.ref.pick,shift:e.t.ref.shift,sign:e.t.sign,...e.t===T?{picks:!0}:{}}),le={voice:C.name,kit:C.kit,offset:r.offset,gains:[a[0]*se,a[1]*ce],parts:_.map(e=>({...e,gains:[e.gains[0]*se,e.gains[1]*ce]})),select:[],...b?{silent:!0}:{},...x?.length?{midi:x}:{},through:[...y],envelope:ne,envelopeCell:N[0]?.c.name??null,via:[...c],span:i},L=new Set(E);if(F.length===0&&!C.kit&&P.every(e=>L.has(e.t))){p.push({id:`${C.name}:${C.name}:${r.voice.span.line}:${r.voice.span.col}`,...le,cell:C.name,pick:null,shift:0,sign:1,gate:!1,drone:!0,mods:P.map(I),levels:ee.map(I)});continue}if(F.length===0){l(k.length?`Nothing starts notes on &${C.name}: give a pitch or a volume (map=amp) step= timing (step=4n); loop= terms only bend`:`&${C.name} has nothing to play: a melody goes before it, like &melody * &${C.name}`,i);continue}if(F.length>1){let e=v(F);if(!e){l(`Both &${F[0].c.name} and &${F[1].c.name} would start notes on &${C.name}, at the same rate — make one coarser (it then holds under the other) or loop= (it then bends or shapes them)`,F[1].t.ref.span);continue}F=[e]}let{t:R,c:z}=F[0],ue=k.find(e=>Jr(e.c,e.t.ref.pick)===null);ue?l(Yr(ue.c.name,ue.t.ref.pick,ue.c.units.length),ue.t.ref.span):Jr(z,R.ref.pick)===0?l(`&${z.name} has no steps to play`,R.ref.span):(!O.has(R)&&!f.has(z.name)&&$s(n,z,R.ref.pick)&&u(`&${z.name}${R.ref.pick?Gt(R.ref.pick):``} plays only rests (~): nothing sounds on &${C.name}`,R.ref.span),p.push({id:`${C.name}:${z.name}:${R.ref.span.line}:${R.ref.span.col}`,...le,cell:z.name,pick:R.ref.pick,shift:R.ref.shift,sign:R.sign,gate:ie,mods:P.filter(e=>e!==F[0]).map(I),levels:ee.filter(e=>e!==F[0]).map(I),...O.has(R)?{tape:O.get(R)}:{}}))}let y=e=>p.some(t=>t.voice===e&&(t.parts.length||t.silent)),b=p.find(e=>e.midi&&!e.parts.length&&!e.silent&&!e.kit&&!y(e.voice)&&Object.keys(t.get(e.voice)?.params??{}).some(e=>Z.has(e)));if(b){let e=t.get(b.voice),n=Object.keys(e.params).filter(e=>Z.has(e));u(`&${b.voice} is only on a MIDI card: its sound (${n.map(e=>`${e}=`).join(` `)}) is heard here but isn't sent — MIDI carries its notes, velocity and bends; the device makes its own`,e.paramSpans[n[0]]??e.span)}return i.length===0&&a.length===0&&c.cells.length>0&&!c.broken?.length&&u(`Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])`,vo),{outputs:p,returns:m,resonances:h}}function $s(e,t,n,r=[]){if(r.includes(t.name)||t.frees.some(e=>e.key===`braid`))return!1;let i=qr(t.units.length,n,t.shift);if(!i?.length)return!1;let a=n=>{if(n.kind===`rest`)return!0;if(n.kind===`seq`)return V(n).every(a);let i=n.kind===`ref`?e.get(n.name):void 0;return!!i&&n.kind===`ref`&&$s(e,i,n.pick,[...r,t.name])};return i.every(e=>a(t.units[e].atom))}function ec(e){let t=new Map(e),n=/* @__PURE__ */ new Map;for(let e of t.values())(e.root||e.over)&&n.set(e.name,e.root?e.name:e.over);for(let e=!0,r=0;e&&r<64;r++){e=!1;for(let r of t.values()){let t=n.get(r.name);if(t)for(let i of r.children.keys())n.has(i)||(n.set(i,t),e=!0)}}for(let e of t.values())t.set(e.name,{...e,context:n.get(e.name)??`fifths12TET`});for(let e of t.values()){if(typeof e.params.body!=`string`)continue;let n=[];for(let r of e.units.flatMap(e=>V(e.atom)))if(r.kind===`note`)n.push({shift:r.value+r.alter,params:{}});else if(r.kind===`ref`){let e=t.get(r.name);if(e)for(let t of e.units)t.atom.kind===`note`&&n.push({shift:t.atom.value+t.atom.alter,params:e.params})}else if(r.kind===`chord`)for(let[e,t]of r.notes.entries())n.push({shift:t+r.alters[e],params:{}});t.set(e.name,{...e,exciters:n.length?n:Array.from({length:12},(e,t)=>({shift:t,params:{}}))})}return t}let tc=[`restart`,`resume`,`free`];function nc(e,{decls:t,implicit:n,sections:r},i,a,o,s=/* @__PURE__ */ new Map,c=/* @__PURE__ */ new Set){let{warn:l}=e,u=new Set([...i.values()].flatMap(e=>typeof e.params.fm==`string`?[e.params.fm]:[])),d=e=>{let t=/* @__PURE__ */ new Set;return e.voice&&t.add(`voice`),a.get(e.name)&&!a.get(e.name).belt&&t.add(`clock`),e.step&&t.add(`driven`),typeof e.params.motor==`number`&&t.add(`motor`),typeof e.params.write==`string`&&t.add(`tape`),typeof e.params.play==`string`&&t.add(`head`),typeof e.params.body==`string`&&t.add(`resonator`),typeof e.params.scope==`string`&&t.add(`scope`),typeof e.params.law==`string`&&t.add(`law`),e.gate&&t.add(`gate`),e.sink&&t.add(`card`),e.note&&t.add(`note`),typeof e.params.fm==`string`&&t.add(`carrier`),u.has(e.name)&&t.add(`modulator`),r.has(e.name)&&t.add(`section`),e.over&&([...r.values()].includes(e.over)||s.has(e.over))&&t.add(`selector`),[...s.values()].some(t=>t.includes(e.name))&&t.add(`performer`),t},f=new Set([...t.values()].flatMap(e=>e.swingFrom?[e.swingFrom.name]:[]));for(let r of t.values()){let t=i.get(r.name);if(!t||n.has(r.name))continue;let a=r.show?.split(`:`)[0];a&&!Oa.includes(a)&&!o.has(a)&&e.error(`show=${a}: not a show (${Oa.join(` `)}), not one of the built-in plugins (${[...o.values()].filter(e=>e.builtin).map(e=>e.name).join(` `)}), and the piece carries no plugin of that name (${eo})`,r.span);let s=d(t),u=[...Object.keys(r.params).map(e=>[e,r.paramSpans[e]??r.span]),...Object.entries(r.paramCells??{}).map(([e,t])=>[e,t.span]),...Object.entries(r.paramClocks??{}).map(([e,t])=>[e,t.span]),...[`env`,`pitch`,`title`].filter(e=>r[e]).map(e=>[e,e===`title`?r.span:r[e].span])];for(let[e,n]of u){let i=vr[e];c.has(r.name)&&Z.has(e)||(e===`anchor`&&s.has(`law`)?l(`anchor= sets the clock a law reads, not the law: write it on ${t.over?`&${t.over}`:`its day (over=&day, a clock loop=1d)`} — the law on &${r.name} doesn't read it`,n):e===`pan`&&(t.mix||t.sink||Vr(t))?l(`pan= places a voice: on ${t.sink?`the sound card`:Vr(t)?`a MIDI card`:`the mix &${r.name}`} it does nothing — put it on the voice (&voice pan=${r.params.pan})`,n):e===`pan`&&typeof r.params.pan==`number`&&(r.params.pan<0||r.params.pan>1)?l(`pan=${r.params.pan}: pan runs from 0 (left) to 1 (right); ${r.params.pan<0?`this plays hard left`:`this plays hard right`}`,n):i?.on&&!i.on.some(e=>s.has(e))&&!(e===`swing`&&f.has(r.name))?l(`${e}= acts on ${Tr(i.on)}: on &${r.name} it does nothing`,n):e===`restart`&&!tc.includes(r.params.restart)?l(`restart=${r.params.restart}: what switching a part on does to its time is restart, resume or free — this plays as restart`,n):i?.value===`number`&&!t.voice&&typeof r.params[e]==`string`&&l(`${e}= takes a number: '${r.params[e]}' does nothing`,n))}if(r.gate){let e=r.step?r.step.whole?`loop`:`step`:null;for(let[t,n]of[[`over`,r.over?.span],[e,r.step?.span],[`shift`,r.shift===null?void 0:r.paramSpans.shift],[`stride`,r.stride===null?void 0:r.paramSpans.stride],[`map`,r.map?.span],[`cycle`,r.cycle===null?void 0:r.span]])t&&n&&l(`${t}= on a gate does nothing: a gate plays with each note of play=&${r.gate.notes}, so it times and reads nothing itself — put it on &${r.gate.notes}`,n);r.gate.gain<0&&l(`${r.gate.port===`trigger`?`gain`:`level`}=${r.gate.gain}: a level is 0 or more, and a negative one doesn't play softer — write ${-r.gate.gain}`,r.paramSpans[r.gate.port===`trigger`?`gain`:`level`]??r.span)}}let p=new Set([...t.values()].flatMap(e=>e.show?[e.show.split(`:`)[0]]:[]));for(let e of o.values())!e.builtin&&!p.has(e.name)&&l(`the piece carries the plugin "${e.name}", but no cell says show=${e.name}`,{line:e.line,col:1,len:`=== plugin ${e.name} ===`.length})}let rc=e=>Number.isFinite(e)?Math.round(e).toLocaleString(`en`):`unboundedly many`,ic=e=>e.lambda?`An unnamed cell &( … )`:`&${e.name}`;function ac(e,t,n,r,i){let{error:a,warn:o}=e,s=/* @__PURE__ */ new Map,c=/* @__PURE__ */ new Set,l=e=>{let t=s.get(e);if(t)return t;if(c.has(e))return[];c.add(e);let r=(n.get(e)?.units??[]).map(e=>bt(e,e=>e.kind===`note`||e.kind===`choice`?1:e.kind===`chord`?e.notes.length:e.kind===`ref`?u(e.name,e.pick):0));return c.delete(e),s.set(e,r),r},u=(e,t=null)=>{let n=l(e);return(Kr(n.length,t)??[]).reduce((e,t)=>e+n[t],0)},d=/* @__PURE__ */ new Set;for(let e of n.values()){if(e.implicit)continue;let n=l(e.name),r=n.reduce((e,t)=>e+t,0);if(r<=5e4||(d.add(e.name),e.units.some(e=>e.atom.kind===`ref`&&u(e.atom.name,e.atom.pick)>5e4)))continue;let i=t.get(e.name),o=i?.braid.kind===`list`?i.braid.tokens:[],s=0,c=o[n.findIndex(e=>(s+=e)>5e4)]?.span??e.span;a(`${ic(e)} expands to ${rc(r)} notes: more than ${rc(Ir)}, the most a cell can hold — repeat less (!n), or let a clock repeat it`,c)}let f=/* @__PURE__ */ new Set,p=/* @__PURE__ */ new Map;for(let e of i){let i=n.get(e.cell);if(!i?.clock||d.has(i.name)||f.has(i.name)||i.params.law!==void 0)continue;let o=r.get(i.clock);if(!o)continue;let s=Math.max(1,i.steps),c=o.perSecond*i.rate*u(i.name)/s,l=o.tap?.meter??i.clock;if(c>(p.get(l)??0)&&p.set(l,c),!(c>2e3))continue;f.add(i.name);let m=t.get(i.name)?.step?.span??t.get(i.clock)?.step?.span??i.span;a(`${ic(i)} would start ${rc(c)} notes a second: more than ${rc(Lr)}, the most a cell can play — slow its step= or loop=`,m)}let m=/* @__PURE__ */ new Set;for(let e of n.values()){let t=r.get(e.name);t&&!p.has(e.name)&&e.frees.some(e=>e.key===`step`||e.key===`loop`)&&(p.set(e.name,t.perSecond*u(e.name)/Math.max(1,e.steps)),m.add(e.name))}for(let[e,t]of p){let r=n.get(e);if(!r||!(t>0)||!Number.isFinite(t))continue;let i=e=>Math.floor(e.value*Lr/t),a=r.frees.filter(e=>(e.key===`step`||e.key===`loop`)&&e.value>0&&e.hi>i(e)&&i(e)>=e.value);if(a.length){r.frees=r.frees.map(e=>a.includes(e)?{...e,hi:i(e)}:e);for(let t of a)o(m.has(e)?`${t.key}=free(…): moved up to ${rc(t.hi)}, &${e} would move what it moves more than ${rc(Lr)} times a second, the most a cell can play: the slider stops at ${rc(i(t))}`:`${t.key}=free(…): moved up to ${rc(t.hi)}, a cell &${e} clocks would start more than ${rc(Lr)} notes a second, the most a cell can play: the slider stops at ${rc(i(t))}`,t.span)}}}function oc(e,t,n){if(!n.size)return[...e];let r=e=>[...t.values()].filter(t=>t.over===e&&t.clock);return e.map(e=>{let i=t.get(e.cell);for(let a=0;i?.step&&a<32;a++){let a=i.step.driver,o=n.get(a);if(o){let n=t.get(o).units.findIndex(e=>e.atom.kind===`ref`&&e.atom.name===a),i=r(o).map(e=>({cell:e.name,entry:n,part:a})),s=[.../* @__PURE__ */ new Set([...e.via,...i.map(e=>e.cell),o,a])];return i.length?{...e,via:s,select:[...e.select,...i]}:e}i=t.get(a)}return e})}function sc(e){let t=new Map(e.cells.map(e=>[e.name,e.map?.kind??(e.style?`style`:null)]));t.has(`style`)||t.set(nt,`style`);let n=[],r=(e,r)=>{let{slot:i,...a}=e,o=a.name,s=a.span??r.span;if(!t.has(o))return{...a,pick:null};let c=t.get(o),l=c?tt[c]:void 0,u=l?.indexOf(i)??-1;return u>=0?{...a,pick:{kind:`at`,i:u,abs:!0}}:(n.push({severity:`error`,message:c===`style`&&(i===`artic`||i===`energy`)?`&${o}[${i}]: ${i} is retired: a style's axes are ${l.join(`, `)}, bite its articulation and energy off the point (decision 076); Migrate rewrites it as &${o}[bite]`:l?`&${o}[${i}]: &${o} (map=${c}) has no slot ${i}; its slots are ${l.join(`, `)}`:`&${o}[${i}]: &${o}'s map names no slots (${c?`map=${c}`:`it has no map=`}); pick by position (&${o}[$0]), name the slots with map=${Object.keys(tt).join(` or map=`)}, or give it a style= (its axes)`,span:s}),{...a,pick:null})},i=(e,t)=>{if(Array.isArray(e)){let n=!1,r=e.map(e=>{let r=i(e,t);return r!==e&&(n=!0),r});return n?r:e}if(typeof e!=`object`||!e)return e;let n=e,a=null;for(let[e,r]of Object.entries(n)){let o=i(r,t);o!==r&&((a??={...n})[e]=o)}let o=a??n;return typeof o.slot==`string`&&typeof o.name==`string`?r(o,t):o},a=!1,o=e.cells.map(e=>{let t=i(e,e);return t!==e&&(a=!0),t});return a?{...e,cells:o,diagnostics:[...e.diagnostics,...n]}:e}function cc(e){let t=new Set(e.cells.map(e=>e.name)),n=/* @__PURE__ */ new Map,r=[];for(let i of e.cells){let e=i.params.play??i.params.trigger;if(typeof e!=`string`||i.braid.kind===`blank`||t.has(e)||n.has(e))continue;let a=so(`&${e} step=1m ~`).cells[0];if(!a)continue;let o=i.paramSpans.play??i.paramSpans.trigger??i.span;n.set(e,{...a,span:o}),r.push({severity:`info`,message:`&${i.name} plays &${e}, which no line writes: it rests`,span:o})}return n.size?{parsed:{...e,cells:[...e.cells,...n.values()],diagnostics:[...e.diagnostics,...r]},rested:new Map([...n].map(([e,t])=>[e,t.span]))}:{parsed:e,rested:/* @__PURE__ */ new Map}}function lc(e,t,n,r,i,a=/* @__PURE__ */ new Set){if(![...t.values()].some(e=>e.gate))return;let o=/* @__PURE__ */ new Set,s=(e,t)=>{if(typeof e==`string`)o.add(e);else if(e&&typeof e==`object`&&!t.has(e)){if(t.add(e),e instanceof Map)for(let[n,r]of e)s(n,t),s(r,t);else if(e instanceof Set)for(let n of e)s(n,t);else for(let n of Object.values(e))s(n,t)}};for(let e of n.values()){let{name:t,...n}=e;s(n,/* @__PURE__ */ new Set)}s(r,/* @__PURE__ */ new Set);for(let e of t.values())e.gate&&s(e.gate,/* @__PURE__ */ new Set);for(let t of n.values())t.clock&&t.units.length&&!o.has(t.name)&&!i.has(t.name)&&!e.broken.has(t.name)&&!a.has(t.name)&&e.info(`&${t.name} is written and nothing plays or reads it: it is silent (a part no performer plays)`,t.span)}let uc=[`lpf`,`lpq`,`hpf`,`hpq`,`bpf`,`bpq`,`ftype`,`room`,`delay`,`delaytime`,`delayfeedback`],dc=[...uc,`pan`,`distort`,`crush`,`drive`],fc=(e,t)=>new Set(e.flatMap(e=>e.through).filter(e=>!!t.get(e)?.mix));function pc(e){let t=/* @__PURE__ */ new Map;for(let n of Object.keys(e.params))Z.has(n)&&t.set(n,e.paramSpans[n]??e.span);for(let[n,r]of Object.entries(e.paramCells??{}))Z.has(n)&&t.set(n,r.span);for(let[n,r]of Object.entries(e.paramClocks??{}))Z.has(n)&&t.set(n,r.span);return t}let mc=(e,t)=>t in e.params||t in e.paramCells||t in e.paramClocks;function hc(e,t,n,r,i){let{error:a}=e,o=fc(r,n),s=/* @__PURE__ */ new Map;for(let e of o){let n=t.get(e);if(!n)continue;let r=pc(n);for(let[t,n]of r)dc.includes(t)||a(`${t}= is a voice's: an instrument (&${e}) processes what its voices play, with ${uc.slice(0,4).map(e=>`${e}=`).join(` `)} …; put ${t}= on a voice`,n);let i=[...r.keys()].filter(e=>uc.includes(e));i.length&&s.set(e,i)}if(!s.size)return n;let c=e=>{let r=n.get(e),i=t.get(e)?.over?.name,a=r?.kit?r:i&&n.get(i)?.kit?n.get(i):null;return a?Cs(a):[e]},l=/* @__PURE__ */ new Map;for(let[e,t]of i)for(let r of t)for(let t of c(e)){let e=n.get(t);if(!e)continue;let i=/* @__PURE__ */ new Map;for(let t of[...r].reverse())for(let n of s.get(t)??[])!mc(e,n)&&!i.has(n)&&i.set(n,t);l.has(t)||l.set(t,[]),l.get(t).push(i)}let u=(e,t)=>e.size===t.size&&[...e].every(([e,n])=>t.get(e)===n),d=new Map(n);for(let[e,t]of l){let r=t[0];if(!r.size||!t.every(e=>u(e,r)))continue;let i=n.get(e),a={...i.params},o={...i.paramCells},s={...i.paramClocks};for(let[e,t]of r){let r=n.get(t);e in r.params&&(a[e]=r.params[e]),e in r.paramCells&&(o[e]=r.paramCells[e]),e in r.paramClocks&&(s[e]=r.paramClocks[e])}d.set(e,{...i,params:a,paramCells:o,paramClocks:s,voice:!0,inherited:Object.fromEntries(r)})}return d}let gc=e=>new Map([...oo,...e.plugins??[]].map(e=>[e.name,e]));function _c(e,t,n=/* @__PURE__ */ new Set){let{parsed:r,rested:i}=cc(sc(e)),a=co(r,t);for(let[e,t]of i)a.unknown.set(e,[t]);let o=Ss(a,wo(a),n),{decls:s,builtin:c}=o,l=hs(a,s),u=ms(a,s),d=es(a,s),f=Bs(a,s,Ps(a,o,l,u),l),p=qs(a,s,f.cells),{clocks:m}=p;Js(a,s,p.cells,o.sections,d),ns(a,s,p.cells,d);let h=Qs(a,s,p.cells,m,f),{returns:g,resonances:_}=h,v=ts(oc(h.outputs,p.cells,o.sections),p.cells,d);ac(a,s,p.cells,m,v),lc(a,s,p.cells,v,m,new Set(r.offers??[]));let y=ec(hc(a,s,p.cells,v,f.playings));nc(a,o,y,m,gc(r),d,fc(v,y));let b=Qo(a,s,o.implicit),{diagnostics:x}=a,S=!x.some(e=>e.severity===`error`);x.sort((e,t)=>e.span.line-t.span.line||e.span.col-t.span.col);let C=(e,t)=>e.line-t.line||e.col-t.col,w=[...a.unknown].map(([e,t])=>({name:e,at:[...t].sort(C)})).sort((e,t)=>C(e.at[0],t.at[0])),T=new Set([...y.values()].filter(e=>e.off).map(e=>`cell:${e.name}`)),E=(e,t,n)=>typeof e.params[t]==`number`?e.params[t]:n;return{ok:S,cells:y,clocks:m,outputs:v,off:T,diagnostics:x,unknown:w,tapes:[...y.values()].filter(e=>typeof e.params.write==`string`&&!!y.get(e.params.write)?.mix).map(e=>({name:e.name,source:e.params.write,length:E(e,`length`,0),erase:Math.min(1,Math.max(0,E(e,`erase`,1))),tone:E(e,`tone`,7e3),drive:E(e,`drive`,.15),hiss:E(e,`hiss`,0),print:E(e,`print`,0),printgap:E(e,`printgap`,.6),dropout:E(e,`dropout`,0),heads:[...y.values()].filter(t=>t.params.play===e.name).map(e=>({head:e.name,at:E(e,`at`,0),wander:E(e,`wander`,0),wanderhz:E(e,`wanderhz`,.2)}))})),returns:g,resonances:_,plugins:gc(r),performers:b,sections:o.sections,...p.mainMeter?{mainMeter:p.mainMeter}:{},...o.mainKey?{mainKey:o.mainKey}:{},...c?{builtinCard:c}:{}}}function vc(e,t,n){let r=e.cells.get(t);return r?r.root?r.cycle:r.scan?r.scan.lap:e.cells.get(r.over??n??r.context)?.cycle??12:12}function yc(e,t,n,r){return bc(e.cells.get(t).units,n,()=>vc(e,t,r))}function bc(e,t,n){let r=e.length;if(r===0||t===0)return[...e];let i=n(),a=Math.floor(t/r),o=t-a*r;return Array.from({length:r},(t,n)=>{let s=e[(n+o)%r],c=i*(a+ +(n+o>=r));if(c===0)return s;let l=yt(s.atom,e=>e.kind===`note`?{...e,value:e.value+c}:e.kind===`choice`?{...e,values:e.values.map(e=>e+c)}:e.kind===`chord`?{...e,notes:e.notes.map(e=>e+c)}:e);return l===s.atom?s:{...s,atom:l}})}let xc=/* @__PURE__ */ new WeakMap;function Sc(e,t){let n=e.cells.get(t);if(!n.units.some(e=>e.atom.kind===`seq`))return n.units;let r=xc.get(e);r||xc.set(e,r=/* @__PURE__ */ new Map);let i=r.get(t);return i||r.set(t,i=n.units.flatMap(e=>e.atom.kind===`seq`?V(e.atom).map(e=>({atom:e,repeat:1,subdivide:1,elongate:1})):[e])),i}let Cc=(e,t)=>{let n=Sc(e,t);return n.length>0&&n.every(e=>e.atom.kind===`chord`)},wc=/* @__PURE__ */ new WeakMap;function Tc(e,t,n,r=!1){let i=wc.get(e);i||wc.set(e,i=/* @__PURE__ */ new Map);let a=r&&Cc(e,t),o=`${t}|${n}${a?`|in force`:``}`,s=i.get(o);if(s)return s;let c=[],l=bc(Sc(e,t),n,()=>vc(e,t));for(let e of(a?l.slice(0,1):l).flatMap(e=>V(e.atom)))e.kind===`note`?c.push({value:e.value,alter:e.alter}):e.kind===`chord`&&e.notes.forEach((t,n)=>c.push({value:t,alter:e.alters[n]}));return i.size>=256&&i.delete(i.keys().next().value),i.set(o,c),c}function Ec(e,t,n,r,i=0){let a=e.cells.get(t);if(a.root)return{value:n+r(t)+i,alter:0};let o=Tc(e,t,r(t)+i,!0);if(o.length===0)return{value:0,alter:0};if(a.wrap===0)return o[0];let s=Math.floor(n),c=Math.floor(s/o.length),l=a.wrap===null||a.step?.tap?c:I(c,a.wrap),u=o[s-c*o.length];return{value:u.value+l*vc(e,t),alter:u.alter}}function Dc(e,t,n,r,i,a){let o=[],s=t,c=n,l=r,u=i;for(let t=0;t<64;t++){let t=e.cells.get(s);if(!t)return{root:s,position:l,path:o};if(t.root){let e=l+u+a(s)+c;return o.push({cell:s,index:Math.round(e)}),{root:s,position:e,path:o}}o.push({cell:s,index:Math.floor(l+c)});let n=Ec(e,s,l,a,c);l=n.value+u,u=n.alter,c=t.over?t.overShift:0,s=t.over??t.context}return{root:s,position:l,path:o}}function Oc(e,t,n){let r=e.cells.get(t);if(r?.map?.kind===`ratios`){let e=r.map.ratios,t=e.length-1,i=e[t]/e[0],a=Math.floor(n/t),o=n-a*t,s=Math.floor(o),c=o-s,l=(e[s]/e[0])**(1-c)*(e[s+1]/e[0])**+c;return 12*Math.log2(i**+a*l)}let i=r?.map?.kind===`edo`?r.map.period:2;return n*12*Math.log2(i)/(r?.cycle??12)}function kc(e,t,n){let r=e.cells.get(t),i=2**(n/12);if(r?.map?.kind===`ratios`){let e=r.map.ratios,t=e.map(t=>t/e[0]),n=t.length-1,a=Math.floor(Math.log(i)/Math.log(t[n])+1e-9),o=i/t[n]**+a,s=0;for(;s<n-1&&t[s+1]<=o+1e-12;)s++;let c=Math.log(o/t[s])/Math.log(t[s+1]/t[s]);return a*n+s+c}let a=r?.map?.kind===`edo`?r.map.period:2;return n*(r?.cycle??12)/(12*Math.log2(a))}function Ac(e,t){let n=[],r=t;for(let t=0;r!==null&&t<64;t++){n.push(r);let t=e.cells.get(r);r=!t||t.root?null:t.over??t.context}return n}let jc=(e,t,n)=>!!n&&!n.abs&&Mc(e,t,n),Mc=(e,t,n)=>!!n&&e.cells.get(t).units.every(e=>e.atom.kind===`note`&&e.repeat===1&&e.subdivide===1&&e.chance===void 0);function Nc(e,t){let n=t;for(let t=0;t<64;t++){let t=e.cells.get(n);if(!t||t.root)return n;n=t.over??t.context}return n}let Pc=.15,Fc=(e,t)=>{let n=null;for(let r of e)r.t<=t&&(n=r);return n&&n.speed!==null&&t<=n.t+.35?n.speed:null},Ic=/* @__PURE__ */ new WeakMap,Lc=(e,t)=>{let n=Ic.get(e);return n||Ic.set(e,n=/* @__PURE__ */ new Set),n.add(t),t},Rc=[],zc=e=>Rc.push(e),Q=.002,Bc=3600,Vc=/* @__PURE__ */ new WeakMap;function Hc(e,t){let n=Vc.get(e);return n||Vc.set(e,n=/* @__PURE__ */ new Map),n.has(t)||n.set(t,Uc(e,t)),n.get(t)}function Uc(e,t){let n=e.cells.get(t),r=(e,t)=>typeof n?.params[e]==`number`?n.params[e]:t;if(!n||typeof n.params.motor!=`number`)return null;let i=Math.max(1e-6,r(`motor`,1)),a=Math.max(1e-6,r(`mass`,1)),o=Math.max(0,r(`friction`,0));for(let n of e.cells.values())n.name!==t&&n.step?.driver===t&&(typeof n.params.mass==`number`&&(a+=n.params.mass),typeof n.params.friction==`number`&&(o+=n.params.friction));let s=r(`wind`,1/0),c=r(`wow`,0),l=[0],u=[0],d=0,f=!1,p=[],m=e=>{for(;!f&&(l.length-1)*Q<Math.min(e,Bc);){let e=(l.length-1)*Q,t=Number.isFinite(s)?Math.max(0,1-(e/s)**4):1,n=1+c*Math.sin(2*Math.PI*.55*e),r=Fc(p,e);d+=(i*(n-d)*t-o*d)/a*Q,r!==null&&(d+=(r-d)*Pc),Number.isFinite(d)||(d=0),d<0&&r===null&&(d=0),l.push(l[l.length-1]+d*Q),u.push(d),t===0&&r===null&&d<.02&&(f=!0)}},h=e=>{let t=Math.max(1,Math.floor(e/Q));t>=l.length||(l.length=t+1,u.length=t+1,d=u[t],f=!1)},g=()=>({t:(l.length-1)*Q,s:l[l.length-1]});return Lc(e,{grab(e,t){h(e),p.push({t:e,speed:t})},cut:h,speed(e){let t=.01;return Math.max(0,(this.nominal(e+t)-this.nominal(Math.max(0,e-t)))/(e+t-Math.max(0,e-t)))},stopsAt(){return Number.isFinite(s)?(m(Bc),f?(l.length-1)*Q:null):null},nominal(e){if(e<=0)return 0;m(e+Q);let t=e/Q;if(t>=l.length-1){let t=g();return f?t.s:t.s+(e-t.t)*d}let n=Math.floor(t);return l[n]+(l[n+1]-l[n])*(t-n)},real(e){if(e<=0)return 0;let t=(l.length-1)*Q+60;for(;!f&&l[l.length-1]<e&&(l.length-1)*Q<Math.min(Bc,t);)m((l.length-1)*Q+10);if(l[l.length-1]<e){if(f||d<=1e-9)return 1/0;let t=g();return t.t+(e-t.s)/d}let n=0,r=l.length-1;for(;r-n>1;){let t=n+r>>1;l[t]<e?n=t:r=t}let i=l[r]-l[n];return(n+(i>0?(e-l[n])/i:0))*Q}})}function Wc(e,t,n,r,i,a){let o=[0],s=[{y:0,v:0,off:0,px:0,stretch:0,slipping:!1}],c=0,l=!1,u=[],d=e=>{for(;!l&&(o.length-1)*Q<Math.min(e,Bc);){let e=(o.length-1)*Q,d=s[s.length-1],{y:f,v:p,off:m}=d,h=a(e+Q),g=(h-d.px)/Q,_=h-m-f,v=!1;if(t*Math.abs(_)>i){let e=Math.sign(_)*i/t;m+=_-e,_=e,v=!0}let y=Fc(u,e);p+=(t*_+r*(g-p))/n*Q,y!==null&&(p+=(y-p)*Pc),Number.isFinite(p)||(p=0),f+=p*Q,o.push(Math.max(o[o.length-1],f)),s.push({y:f,v:p,off:m,px:h,stretch:_,slipping:v}),c=Math.abs(g)<1e-6&&Math.abs(p)<1e-4&&Math.abs(_)<1e-4&&y===null?c+Q:0,c>.5&&(l=!0)}},f=e=>{let t=Math.max(1,Math.floor(e/Q));t>=o.length||(o.length=t+1,s.length=t+1,c=0,l=!1)},p=e=>{if(e<=0)return 0;d(e+Q);let t=Math.min(e/Q,o.length-1),n=Math.floor(t);return n>=o.length-1?o[o.length-1]:o[n]+(o[n+1]-o[n])*(t-n)},m={nominal:p,real(e){if(e<=0)return 0;let t=(o.length-1)*Q+60;for(;!l&&o[o.length-1]<e&&(o.length-1)*Q<Math.min(Bc,t);)d((o.length-1)*Q+10);if(o[o.length-1]<e)return 1/0;let n=0,r=o.length-1;for(;r-n>1;){let t=n+r>>1;o[t]<e?n=t:r=t}let i=o[r]-o[n];return(n+(i>0?(e-o[n])/i:0))*Q},stopsAt:()=>null,speed(e){let t=.01;return Math.max(0,(p(e+t)-p(Math.max(0,e-t)))/(e+t-Math.max(0,e-t)))},grab(e,t){f(e),u.push({t:e,speed:t})},cut:f,state(e){if(e<=0)return{stretch:0,slipping:!1};d(e+Q);let t=Math.min(Math.floor(e/Q),s.length-1),n=!1;for(let e=Math.max(0,t-50);e<=t;e++)s[e].slipping&&(n=!0);return{stretch:s[t].stretch,slipping:n}}};return e?Lc(e,m):m}let Gc=1e-9;function Kc(e,t,n){if(t.tap)return Yc(t.tap,Jc(e,e.clocks.get(t.tap.meter),n),Xc(e,t.tap.meter));let r=Jc(e,t,n);return t.swung?qc(t.swung,r):r}function qc(e,t,n){let r=Math.max(1,e.length),i=(t,i)=>t<r?(n?n(i):e)[t]:r,a=e=>{let t=Math.floor(e),n=Math.floor(t/r),a=t-n*r;return n*r+i(a,n)+(e-t)*(i(a+1,n)-i(a,n))},o=e=>{let t=Math.floor(e/r),n=e-t*r,a=0;for(;a+1<r&&i(a+1,t)<=n;)a++;let o=i(a+1,t)-i(a,t);return t*r+a+(o>0?(n-i(a,t))/o:0)};return{beats:t.beats,q:e=>t.q(a(e)),stepAt:e=>o(t.stepAt(e)),...t.speed?{speed:t.speed}:{}}}function Jc(e,t,n,r){if(!t.positional&&t.swing!==void 0){let e=Math.min(.95,Math.max(.05,t.swing)),n=t.perSecond;return{beats:1,q:t=>{let r=Math.floor(t/2),i=t/2-r;return(2*r+2*(i<.5?i/.5*e:e+(i-.5)/.5*(1-e)))/n},stepAt:t=>{let r=t*n/2,i=Math.floor(r),a=r-i;return 2*(i+(a<e?a/e*.5:.5+(a-e)/(1-e)*.5))}}}if(!t.positional)return{beats:1,q:e=>e/t.perSecond,stepAt:e=>e*t.perSecond};let i=t.cell,a=e.cells.get(i)?.bend,o=a?[...a.positions]:yc(e,i,n(i)).flatMap(e=>e.atom.kind===`note`?[e.atom.value+e.atom.alter]:[]),s=Math.max(1,o.length),c=a?a.lap:vc(e,i),l=s/t.perSecond;if(a&&r){let e=e=>{let t=Math.floor(e/s),n=r(t,t*l);return t+n.positions[e-t*s]/n.lap},t=t=>{let n=Math.floor(t),r=e(n);return(r+(t-n)*(e(n+1)-r))*l};return{beats:s,q:t,stepAt:e=>{let n=Math.floor(e/l)*s;for(;t(n+1)<=e;)n++;for(;n>0&&t(n)>e;)n--;let r=t(n),i=t(n+1);return n+(i>r?(e-r)/(i-r):0)}}}let u=e=>o[I(e,s)]+c*Math.floor(e/s),d=e=>{let t=Math.floor(e),n=u(t);return(n+(e-t)*(u(t+1)-n))/c*l},f=d(0),p=e=>d(e)-f;return{beats:s,q:p,stepAt:e=>{let t=Math.floor(e/l)*s;for(;p(t+1)<=e;)t++;for(;t>0&&p(t)>e;)t--;let n=p(t),r=p(t+1);return t+(r>n?(e-n)/(r-n):0)}}}function Yc(e,t,n=null){let r=n?il(e,t,n):null;if(r)return r;let{positions:i,lap:a}=e,o=Math.max(1,i.length);if(i.every((e,t)=>Math.abs(e-t*a/o)<1e-9))return{beats:o,q:e=>t.q(e*a/o),stepAt:e=>t.stepAt(e)*o/a,...t.speed?{speed:t.speed}:{}};let s=e=>e<o?i[e]:a,c=e=>{let t=Math.floor(e),n=Math.floor(t/o),r=t-n*o;return n*a+s(r)+(e-t)*(s(r+1)-s(r))};return{beats:o,q:e=>t.q(c(e)),stepAt:e=>{let n=t.stepAt(e),r=Math.floor(n/a),i=n-r*a,c=0;for(;c+1<o&&s(c+1)<=i;)c++;let l=s(c+1)-s(c);return r*o+c+(l>0?(i-s(c))/l:0)},...t.speed?{speed:t.speed}:{}}}function Xc(e,t,n){let r=e.cells.get(t)?.meter??void 0,i=r?fi(r):null;if(!r||!i)return null;let a=Qr(r),o=Math.max(1,r.levels.length),s=e=>n?n(Math.floor(e/o+1e-9)):r,c=e=>pi(s(e),e/a)*a,l=e=>mi(s(e),e/a)*a,u=Math.min(...r.swing.map(e=>e.whole*r.unit)),d=e=>{let t=Math.log2(e/a/u);return Math.abs(t-Math.round(t))<1e-9};return{S:c,W:l,at:(e,t)=>d(t)?c(e):di(s(e),e/a,t/a)*a,grain:u*a}}function Zc(e,t,{S:n,at:r},i){let{positions:a,lap:o}=e,s=e.written??a,c=e.grids??[],l=Math.max(1,a.length),u=e=>e<l?s[e]:o,d=(e,t)=>t<l?i(e*o+u(t),c[t]??0)-e*o:o,f=(e,t)=>{let i=Math.floor(e),a=Math.floor(i/l),s=i-a*l;if(e===i)return a*o+d(a,s);let c=a*o+u(s)+(e-i)*(u(s+1)-u(s));return t!==void 0&&t>0?r(c,t*(u(s+1)-u(s))):n(c)};return{beats:l,q:(e,n)=>t.q(f(e,n)),stepAt:e=>{let r=t.stepAt(e),i=Math.floor(r/o),a=r-i*o,s=0;for(;s+1<l&&d(i,s+1)<=a;)s++;let c=i*o+u(s),f=i*o+u(s+1);if(f<=c||a<=d(i,s))return i*l+s;let p=0,m=1;for(let e=0;e<52;e++){let e=(p+m)/2;n(c+e*(f-c))-i*o<=a?p=e:m=e}return i*l+s+p},...t.speed?{speed:t.speed}:{}}}let Qc=/* @__PURE__ */ new WeakMap,$c=/* @__PURE__ */ new WeakMap,el=/* @__PURE__ */ new WeakMap,tl=/* @__PURE__ */ new WeakMap,nl=!1;function rl(e,t,n){let r=Qc.get(e);r||Qc.set(e,r=/* @__PURE__ */ new WeakMap),r.set(t,n),ul.get(e)?.delete(t),$c.get(e)?.delete(t),el.get(e)?.delete(t)}function il(e,t,{S:n,at:r}){let{positions:i,lap:a}=e,o=e.written??i,s=Math.max(1,i.length);if(!i.every((e,t)=>Math.abs(n(o[t])-e)<1e-9))return null;let c=e=>e<s?o[e]:a,l=e=>e<s?i[e]:a,u=(e,t)=>{let i=Math.floor(e),o=Math.floor(i/s),u=i-o*s;if(e===i)return o*a+l(u);let d=c(u)+(e-i)*(c(u+1)-c(u));return o*a+(t!==void 0&&t>0?r(d,t*(c(u+1)-c(u))):n(d))};return{beats:s,q:(e,n)=>t.q(u(e,n)),stepAt:e=>{let r=t.stepAt(e),i=Math.floor(r/a),o=r-i*a,u=0;for(;u+1<s&&l(u+1)<=o;)u++;let d=c(u),f=c(u+1);if(f<=d||o<=l(u))return i*s+u;let p=0,m=1;for(let e=0;e<52;e++){let e=(p+m)/2;n(d+e*(f-d))<=o?p=e:m=e}return i*s+u+p},...t.speed?{speed:t.speed}:{}}}function al(e){let t=ol.get(e);if(t)return t;ol.set(e,t=/* @__PURE__ */ new Set);let n=r=>{if(t.has(r))return;t.add(r);let i=e.cells.get(r);for(let t of i?.children.keys()??[]){let r=i.units.flatMap(e=>e.atom.kind===`ref`&&e.atom.name===t?[e.atom]:[]);r.length&&r.every(n=>Mc(e,t,n.pick))||n(t)}};for(let t of e.outputs)for(let e of[...t.drone?[]:[t],...t.mods,...t.levels])n(e.cell);return t}let ol=/* @__PURE__ */ new WeakMap,sl=/* @__PURE__ */ new WeakMap;function cl(e){let t=sl.get(e);if(t)return t;sl.set(e,t=/* @__PURE__ */ new Set);for(let n of e.cells.values()){n.root&&t.add(n.name),n.over&&t.add(n.over),n.root||t.add(n.context);for(let r of n.units)r.atom.kind===`ref`&&jc(e,r.atom.name,r.atom.pick)&&t.add(r.atom.name)}return t}let ll=/* @__PURE__ */ new WeakMap,ul=/* @__PURE__ */ new WeakMap;zc(e=>{ll.delete(e),ul.delete(e),$c.delete(e)});function dl(e,t){let n=e.cells.get(e.clocks.get(t)?.cell??``)?.params.varispeed;return typeof n==`number`?n:0}function fl(e,t,n=0){let r=ul.get(e);r||ul.set(e,r=/* @__PURE__ */ new WeakMap);let i=r.get(t)??/* @__PURE__ */ new Map;r.set(t,i);let a=Qc.get(e)?.get(t),o=(n,r)=>{let i=e.cells.get(n)?.bend,o=i?.depth;if(!i||!o||!a)return;let s=el.get(e);s||el.set(e,s=/* @__PURE__ */ new WeakMap);let c=s.get(t);c||s.set(t,c=/* @__PURE__ */ new Map);let l=c.get(n);l||c.set(n,l=/* @__PURE__ */ new Map);let u=l,d={positions:[...i.positions],lap:i.lap},f=/* @__PURE__ */ new Map;return(e,t)=>{let s=u.get(e);if(s)return s;if(e<0||nl)return d;nl=!0;let c;try{c=a(n,`depth`,r(t))}finally{nl=!1}let l=Number.isFinite(c)?Math.round(c*1e9)/1e9:null,p=l===null?d:f.get(l);return p||f.set(l,p=ri(o.table,o.per,o.nodes,i.bars,l)),u.set(e,p),p}},s=n=>{let r=e.cells.get(n),i=r?.swingMoves,o=r?.meter;if(!i||!o?.swing||!a)return;let s=$c.get(e);s||$c.set(e,s=/* @__PURE__ */ new WeakMap);let c=s.get(t);c||s.set(t,c=/* @__PURE__ */ new Map);let u=c.get(n);u||c.set(n,u=/* @__PURE__ */ new Map);let d=u,f=tl.get(o);f||tl.set(o,f=/* @__PURE__ */ new Map);let p=f,m=Math.max(1,o.levels.length);return e=>{let t=d.get(e);if(t)return t;if(e<0||nl)return o;let r=l(n).q(e*m);nl=!0;let s;try{s=a(n,`swing`,r)}finally{nl=!1}let c=Number.isFinite(s)?Math.min(.95,Math.max(.05,Math.round(s*1e9)/1e9)):null,u=c===null?o:p.get(c);return u||p.set(c,u={...o,swing:o.swing.map(e=>e.level===i.level?{...e,share:c}:e)}),d.set(e,u),u}},c=t=>{let n=i.get(t);if(!n){let r=e.clocks.get(t),a=s(r.tap?.meter??t);if(r.tap&&a){let t=e.cells.get(r.tap.meter).meter,i=Qr(t),o=Math.max(1,t.levels.length),s=(e,t)=>di(a(Math.floor(e/o+1e-9)),e/i,t)*i,c=Xc(e,r.tap.meter,a);n=c?Zc(r.tap,l(r.tap.meter),c,s):Yc(r.tap,l(r.tap.meter),null)}else if(r.tap)n=Yc(r.tap,l(r.tap.meter),Xc(e,r.tap.meter));else if(a){let r=e.cells.get(t).meter.levels.map((e,t)=>t);n=qc(r,l(t),e=>_i(a(e))??r)}else n=r.swung?qc(r.swung,l(t)):l(t);i.set(t,n)}return n},l=n=>{let r=i.get(`${n}\0plain`);if(!r){let a=e.clocks.get(n);if(a.belt){let i=Kc(e,e.clocks.get(a.belt.driver),t),o=c(a.belt.driver),s=e.cells.get(a.cell),l=(e,t)=>typeof s.params[e]==`number`?s.params[e]:t,u=Math.max(.001,l(`belt`,200)),d=Math.max(.001,l(`mass`,1)),f=l(`damping`,.6*Math.sqrt(u*d)),p=ll.get(e);p||ll.set(e,p=/* @__PURE__ */ new Map);let m=p.get(n);m||p.set(n,m=Wc(e,u,d,f,l(`slip`,1/0),e=>i.q(o.stepAt(e))));let h=m,g=a.belt.rate;r={beats:1,q:e=>h.real(i.q(e/g)),stepAt:e=>i.stepAt(h.nominal(e))*g,speed:e=>h.speed(e)}}else{let n=Hc(e,a.cell),i=Jc(e,a,t,o(a.cell,e=>n?n.real(e):e)),s=Hc(e,a.cell);r=s?{beats:i.beats,q:e=>s.real(i.q(e)),stepAt:e=>i.stepAt(s.nominal(e)),speed:e=>s.speed(e)}:i}i.set(`${n}\0plain`,r)}return r};return{map:c,written:t=>{let n=e.clocks.get(t)?.tap;if(!n?.written)return c(t);let r=i.get(`${t}\0written`);return r||i.set(`${t}\0written`,r=Yc({...n,positions:n.written},l(n.meter))),r},played:t=>{let n=e.clocks.get(t)?.tap?null:Xc(e,t,s(t));if(!n)return c(t);let r=i.get(`${t}\0played`);if(!r){let e=l(t);r={beats:e.beats,q:t=>e.q(n.S(t)),stepAt:t=>n.W(e.stepAt(t)),...e.speed?{speed:e.speed}:{}},i.set(`${t}\0played`,r)}return{...r,q:r.q,stepAt:r.stepAt,grain:n.grain}},swingOf:(t,n)=>{let r=s(t);return(r?r(n):e.cells.get(t)?.meter)?.swing??null},stepOf:e=>c(e).stepAt(Math.max(0,n))}}function pl(e,t,n){let r=fl(e,t,n),i=al(e),a=cl(e),o=/* @__PURE__ */ new Map,s=n=>{let c=t(n),l=e.cells.get(n),u=l?.tonic?e.cells.get(l.tonic):void 0;if(l&&u?.step&&u.clock){let t=yc(e,u.name,s(u.name))[0]?.atom;return t?.kind===`note`?c-l.shift+I(t.value+t.alter,12):c}if(!l||!l.step||!l.clock||e.clocks.has(n)||yl(e,n)||l.loops||i.has(n)&&!a.has(n))return c;let d=o.get(l.clock);if(d===void 0&&o.set(l.clock,d=r.stepOf(l.clock)),l.wrap===0)return c;let{per:f,laps:p}=hl(e,l),m=(f?I(Math.floor(l.rate*d+Gc),f):Math.floor(l.rate*d+Gc))*l.stride,h=vl(e,n);if(!h){let t=p*gl(e,n);return c+(t>0?I(m,t):m)}let g=m+Math.min(.999999999,Math.max(0,l.rate*d-Math.floor(l.rate*d+Gc))),_=p*h.length,v=_>0?I(g,_):g,y=Math.floor(v/h.length);return c+y*h.entries+h.inForce(v-y*h.length,Math.floor(g/h.length))};return s}let ml=(e,t,n)=>r=>r===n?t(r):e(r);function hl(e,t){if(t.wrap===null)return{per:null,laps:1};let n=t.step?.tap&&t.clock?e.clocks.get(t.clock)?.tap:void 0;return n?{per:Math.max(1,Math.round(n.positions.length*t.rate)),laps:0}:{per:null,laps:t.wrap}}let gl=(e,t)=>{let n=e.cells.get(t);return vl(e,t)?.length??(n.units.length||n.cycle)},_l=/* @__PURE__ */ new WeakMap;function vl(e,t){let n=_l.get(e);if(n||_l.set(e,n=/* @__PURE__ */ new Map),n.has(t))return n.get(t);let r=e.cells.get(t).units,i=null;if(r.some(e=>e.repeat!==1||e.elongate!==1||e.atom.kind===`seq`)){let n=[],a=0;for(let e of r)n.push(a),a+=e.atom.kind===`seq`?V(e.atom).length:1;let o=Lt(r,()=>1).filter(e=>!e.chosen||e.chosen.every(e=>e.is===0)).map(e=>{let t=r[e.top],i=n[e.top]+(t.atom.kind===`seq`?V(t.atom).indexOf(e.atom):0);return{at:e.at,index:i,...e.laps?{laps:e.laps}:{}}}).sort((e,t)=>e.at-t.at),s=r.reduce((e,t)=>e+Ft(t.atom,()=>1)*t.elongate*t.repeat,0),c=(e,t)=>!e.laps||I(t,e.laps.of)===e.laps.is,l=Sc(e,t).length;i={length:s,entries:l,inForce(e,t){let n;for(let r of o)r.at<=e+1e-9&&c(r,t)&&(!n||r.at>n.at+1e-9)&&(n=r);if(n)return n.index;for(let e of o)c(e,t-1)&&(!n||e.at>n.at+1e-9)&&(n=e);return n?n.index-l:0}}}return n.set(t,i),i}function yl(e,t){let n=e.cells.get(t)?.over??``,r=e.cells.get(n);return!!r&&r.units.length>0&&r.units.every(t=>t.atom.kind===`ref`&&e.sections?.get(t.atom.name)===n)}function bl(e,t,n){let r=e.cells.get(n),i=r?.clock?e.clocks.get(r.clock):void 0,a=r?.clock&&i?t.map(r.clock):null,o=i?i.perSecond:1,s=e=>a?a.stepAt(Math.max(0,e))/o:e;return{pos:s,real:e=>e<=0?0:a?a.q(e*o):e,speed:e=>Math.max(.001,(s(e+.01)-s(Math.max(0,e-.01)))/(e+.01-Math.max(0,e-.01))),moving:a}}let xl=10080,Sl=xl*12,Cl=[`Ionian`,`Dorian`,`Phrygian`,`Lydian`,`Mixolydian`,`Aeolian`,`Locrian`],wl=[2,2,1,2,2,2,1],Tl=[0,4,1,5,2,6,2,5,1,4,0,3],El=[`the false zenith`,`the first shadow`,`twilight`,`evening`,`late night`,`the nadir`,`the spark`,`deep morning`,`dawn`,`morning`,`mid-morning`,`the earned zenith`],Dl=(e,t)=>(e%t+t)%t;[5,3,1,6,4,2,0].map(e=>e/6);function Ol(e){let t=[0];for(let n=0;n<6;n++)t.push(t[n]+wl[(n+e)%7]);return t}function kl(e){let t=Dl(Math.floor(e),Sl),n=Math.floor(t/xl),r=Math.floor(t%xl/840);return{block:n,key:r,bar:Math.floor(t%840/12),inBar:t%12,mode:Tl[n],tonic:Al(n,r)}}function Al(e,t){return Dl((e<6?7:5)*t,12)}function jl(e,t){let n=[0,4,1,5,2,6,3],r=Tl[e];return n.map((e,i)=>Dl(n[(i+t)%7]+r,7))}function Ml(e){return Ol(e)}function Nl(e,t,n){let r=Math.floor(n/7),i=n%7,a=e.map((t,n)=>e[(n+i)%7]),o=Ml(t);r===1&&(o=o.map((e,t)=>Dl(o[(t+i)%7]-o[i],12)).sort((e,t)=>e-t));let s=[];for(let e=0;e<7;e++){let t=a[e],n=a[(e+2)%7]+1,c=a[(e+4)%7],l=a[(e+6)%7];r===0&&(t=Dl(t+i+1,7)),r===2&&(n=8-n),r===3&&(c=a[(6-e+4)%7]),r===4&&(l=Dl(l*5,7));let u=o[e],d=e<6?o[e+1]:12;s.push({at:u,dur:d-u,degree:t,density:n,dynamic:c,space:l})}return s}function Pl(e,t,n){let r=jl(e,t),i=Tl[e];return n<35?Nl(r,i,n):Nl(r,i,69-n).map(e=>({...e,at:12-(e.at+e.dur),degree:Dl(-e.degree,7)})).sort((e,t)=>e.at-t.at)}let Fl=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],Il=(e,t)=>t>1?`${e}@${t}`:e,Ll=(e,t)=>e.map(e=>Il(t(e),e.dur)).join(` `);function Rl(e,t){let n=kl(e*t);return{...n,bar:Pl(n.block,n.key,n.bar)}}function zl(e,t){if(e===`notes`)return Ll(Rl(t,12).bar,e=>e.density>1?`[${Array.from({length:e.density},(t,n)=>e.degree+2*n).join(`, `)}]`:String(e.degree));if(e===`level`)return Ll(Rl(t,12).bar,e=>String(+(.18+e.dynamic*.11).toFixed(2)));if(e===`space`)return Ll(Rl(t,12).bar,e=>String(e.space));if(e===`mode`)return Cl[kl(t*840).mode??0].toLowerCase();if(e===`tonic`)return Fl[kl(t*840).tonic];if(e===`block`){let e=Dl(t,12);return`${Cl[Tl[e]]} · ${El[e]}`}throw Error(`fiveto12 has no hole ${e}`)}let Bl={id:`fiveto12`,holes:{mode:{lap:840},tonic:{lap:840},notes:{lap:12},level:{lap:12},space:{lap:12},block:{lap:xl,mark:!0}},block:`&notes over=&key step=1 fill()
&level map=amp step=1 fill()
&space map=lin step=1 fill()
&key scale(&mode, &tonic)
&mode fill()
&tonic fill()`,plays:`&notes * &level`,origin:11.55,cycle:Sl,stepSeconds:.7142857142857143,fill:(e,t)=>zl(e,t)},Vl=/* @__PURE__ */ new Map([[Bl.id,Bl]]),Hl=e=>typeof e?.law==`string`&&Vl.get(e.law)||null,Ul=e=>Math.min(...Object.values(e.holes).flatMap(e=>e.lap!==void 0&&!e.mark?[e.lap]:[]));function Wl(e,t,n={}){let r=Ul(e),i=Math.round(e.cycle/r),a=(t%i+i)%i;return e.block.split(`
`).map(t=>{let i=/^&([A-Za-z_][A-Za-z0-9_]*)\b/.exec(t),o=i&&e.holes[i[1]];return!o||!t.includes(`fill()`)?t:t.replace(`fill()`,e.fill(i[1],o.lap?Math.floor(a*r/o.lap):0,n))}).join(`
`)}function Gl(e,t,n,r,i,a=0){if(!r)return yc(e,t,n(t)+a,i);let o=yc(e,t,r.abs?0:n(t),i);return(Kr(o.length,r)??[]).map(e=>o[e])}let Kl=(e,t,n)=>Jr(e.cells.get(t),n)??0,ql=(e,t=0)=>e?Gt(e):`>${t}`;var Jl=class extends Error{};function Yl(e,t,n,r=null,i=()=>!1,a=0,o=Pr){let s=/* @__PURE__ */ new Map,c=(t,r,a,o,l)=>{let u=e.cells.get(t),d=u.root?t:u.over??o,f=u.root?0:u.over?u.overShift:l,p=`${t}|${ql(r,a)}|${d}|${f}`,m=s.get(p);if(m)return m;let h=[];if(!i(t)){let i=jc(e,t,r)?Kr(e.cells.get(t).units.length,r):null,o=Gl(e,t,n,r,d,a),s=t=>t.kind===`ref`&&Kl(e,t.name,t.pick)||1,l=(e,t,n)=>{if(e.kind!==`ref`)return kt(e,t,n);let r=n/s(e);return c(e.name,e.pick,e.shift,d,f).map(n=>({atom:{kind:`spliced`,e:n,ref:e},at:t+n.step*r,dur:n.duration*r,of:n.laps?.of??1,is:n.laps?.is??0,chances:[],picks:(n.chosen??[]).map(e=>({...e,at:t+e.at*r}))}))};for(let{atom:n,at:r,dur:a,chances:c,top:p,level:m,laps:g,chosen:_}of It(o,s,l,`${t}:`)){let o={step:r,duration:a,cell:t,table:d,tableShift:f,...i?{via:{cell:t,index:i[p],ctx:d,mul:1,add:0}}:{},...g?{laps:g}:{},..._?{chosen:_}:{}},s=c.map(e=>e===null?u.chance??.5:e),l={...s.length?{chance:s.length===1?s[0]:1-s.reduce((e,t)=>e*(1-t),1)}:{},...m===void 0?{}:{level:m}},v=t=>({...o,table:Nc(e,d),tableShift:0,value:Math.round(kc(e,Nc(e,d),t)*1e6)/1e6,alter:0});if(n.kind===`note`)h.push(n.pitched?{...v(n.value),...l}:{...o,value:n.value,alter:n.alter,...l});else if(n.kind===`chord`)n.notes.forEach((e,t)=>{let r=n.levels?.[t],i=r===void 0?{}:{level:r*(m??1)};h.push(n.pitched?.[t]?{...v(e),...l,...i}:{...o,value:e,alter:n.alters[t],...l,...i})});else if(n.kind===`choice`)h.push({...o,value:n.values[0],alter:n.alters[0],...l,options:n.values.map((e,t)=>({value:e,alter:n.alters[t]}))});else if(n.kind===`spliced`){let{e,ref:t}=n,i=t.transpose??0,o=t.values,{laps:s,chosen:c,...l}=e;h.push({...l,...o?{value:o.mul*e.value+o.add,alter:o.mul*e.alter,...e.options?{options:e.options.map(e=>({value:o.mul*e.value+o.add,alter:o.mul*e.alter}))}:{},...e.via?{via:{...e.via,mul:o.mul*e.via.mul,add:o.mul*e.via.add+o.add}}:{}}:{},step:r,duration:a,...g?{laps:g}:{},..._?{chosen:_}:{},...i||e.transpose?{transpose:(e.transpose??0)+i}:{},...m===void 0?{}:{level:(e.level??1)*m}})}if(h.length>5e4)throw new Jl(t)}}return s.set(p,h),h};return[...c(t,r,a,o,0)].sort((e,t)=>e.step-t.step||e.value-t.value)}function Xl(e,t,n){if(!t.via)return{value:t.value,alter:t.alter};let r=yc(e,t.via.cell,n(t.via.cell),t.via.ctx)[t.via.index];return r?.atom.kind===`note`?{value:t.via.mul*r.atom.value+t.via.add,alter:t.via.mul*r.atom.alter}:{value:t.value,alter:t.alter}}let $=e=>`cell:${e}`;function Zl(e){let t=3735928559,n=1103547991;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,2654435761),n=Math.imul(n^i,1597334677)}return t=Math.imul(t^t>>>16,2246822507)^Math.imul(n^n>>>13,3266489909),n=Math.imul(n^n>>>16,2246822507)^Math.imul(t^t>>>13,3266489909),((n>>>0)*2**21+(t>>>11)).toString(36)}let Ql=e=>+e.toPrecision(9),$l=/* @__PURE__ */ new WeakMap;function eu(e){let t=$l.get(e);if(t)return t;let n=Hr(e),r=/* @__PURE__ */ new Map,i=(t,a)=>{let o=r.get(t);if(o!==void 0)return o;let s=e.cells.get(t);if(!s)return t;if(a.has(t))return`↺`;let c=/* @__PURE__ */ new Set([...a,t]),l=[];try{l=Yl(e,t,n).map(e=>[Ql(e.step),Ql(e.duration),Ql(e.value+e.alter+(e.transpose??0)),e.chance??null,e.options?.map(e=>e.value+e.alter)??null,e.laps?[e.laps.of,e.laps.is]:null,e.chosen?.map(e=>[Ql(e.at),e.of,e.is,e.lap])??null])}catch{}let u=Object.entries(s.params).sort(([e],[t])=>e.localeCompare(t)).map(([e,t])=>[e,typeof t==`string`&&yr.has(e)?i(t,c):t]),d=Zl(JSON.stringify([s.seed,s.steps,l,u.filter(([e])=>e!==`chance`),s.env?i(s.env,c):null]));return a.size||r.set(t,d),d},a=e=>i(e,/* @__PURE__ */ new Set);return $l.set(e,a),a}let tu=(e,t,n)=>e.drawn?e.drawn(t,n):t;function nu(e,t,n){let r=t.series.reduce((t,r)=>t*du(uu(e,r,n,n+1),n,e=>e.level),1);return t.range?t.range[0]+(t.range[1]-t.range[0])*r:r}function ru(e,t,n,r){let i=e.voiceParams.get(t);if(!i||Object.keys(i).length===0)return;let a={};for(let[t,o]of Object.entries(i)){if(t===`pan`)continue;let i=o.series.map(t=>uu(e,t,n,n+r)),s=e=>i.reduce((t,n)=>t*du(n,e,e=>e.level),1),c=e=>o.range?o.range[0]+(o.range[1]-o.range[0])*e:e;if(o.env&&o.range)a[t]={kind:`env`,from:o.range[0],peak:c(s(n)),...o.env};else{let e=[...new Set(i.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t);a[t]={kind:`points`,points:(e.length?e:[n]).map(e=>({at:e,value:c(s(e)),...i.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}}))}}}return Object.keys(a).length?a:void 0}function iu(e,t,n){let r=pl(e.result,e.statics,n+Gc),i=e.played.has(t.cell)?ml(r,e.statics,t.cell):r,a=Xl(e.result,t,i),o=Dc(e.result,t.table,t.tableShift,a.value,a.alter,i),s=t.transpose?{...o,position:o.position+t.transpose}:o;return Oc(e.result,s.root,s.position)}function au(e,t,n,r){if(t.events.length===0)return[{at:n,semis:0}];if(!t.clock)return[{at:n,semis:t.sign*iu(e,t.events[0],n)}];if(t.lin)return lu(e,t,n,r,(n,r)=>t.sign*iu(e,n,r)).map(e=>({at:e.at,semis:e.v,ramp:e.ramp}));let i=fl(e.result,e.statics).map(t.clock),a=i.stepAt(Math.max(0,n))*t.rate,o=i.stepAt(Math.max(0,r))*t.rate;Number.isFinite(a)||(a=0),Number.isFinite(o)||(o=a);let s=[],c=Math.floor(a/t.period),l=su(t,a);s.push({at:n,semis:l?t.sign*iu(e,l,n):0});for(let n=c;n*t.period<o;n++)for(let r of t.events){let c=n*t.period+r.step;if(c<=a+1e-9||c>=o-1e-9)continue;let l=i.q(c/t.rate);s.push({at:l,semis:t.sign*iu(e,r,l)})}return s}function ou(e,t){return Math.floor((e+Gc)/t)}function su(e,t){let n=ou(t,e.period),r=null;for(let i of[n,n-1]){for(let n of e.events)i*e.period+n.step<=t+1e-9&&(r=n);if(r)break}return r}function cu(e,t,n){if(t.events.length===0)return null;if(!t.clock)return t.events[0];let r=fl(e.result,e.statics).map(t.clock).stepAt(Math.max(0,n))*t.rate;return su(t,Number.isFinite(r)?r:0)}function lu(e,t,n,r,i){let a=fl(e.result,e.statics).map(t.clock),o=[...new Map(t.events.map(e=>[e.step,e])).values()].sort((e,t)=>e.step-t.step),s=e=>a.q(e/t.rate),c=(e,n,r)=>{let a=tu(t,e,n);return a?i(a,r):0},l=e=>{let n=ou(e,t.period),r=e-n*t.period,i=o.length-1;for(let e=0;e<o.length;e++)o[e].step<=r+1e-9&&(i=e);let a=o[i],l=a.step>r+1e-9?a.step-t.period:a.step,u=c(a,l<0?n-1:n,s(n*t.period+l));if(i===o.length-1||l<0)return u;let d=o[i+1];return u+(c(d,n,s(n*t.period+d.step))-u)*(r-l)/Math.max(Gc,d.step-l)},u=a.stepAt(Math.max(0,n))*t.rate,d=a.stepAt(Math.max(0,r))*t.rate;Number.isFinite(u)||(u=0),Number.isFinite(d)||(d=u);let f=[{at:n,v:l(u),ramp:!1}];for(let e=Math.floor(u/t.period);e*t.period<d;e++)for(let n of o){let r=e*t.period+n.step;r>u+1e-9&&r<d-1e-9&&f.push({at:s(r),v:c(n,e,s(r)),ramp:n!==o[0]})}return f.push({at:r,v:l(d-1e-6),ramp:!0}),f}function uu(e,t,n,r,i){if(t.sum){let{terms:a,constant:o}=t.sum,s=a.map(t=>uu(e,t.series,n,r,i)),c=[...new Set(s.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t);return(c.length?c:[n]).map(e=>({at:e,level:Math.min(1,Math.max(0,a.reduce((t,n,r)=>t+n.weight*du(s[r],e,e=>e.level),o))),...s.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}}))}let a=e=>t.db?10**((e.value+e.alter)/20):t.bipolar?Math.max(0,(1+e.value+e.alter)/2):Math.max(0,e.value+e.alter);if(t.events.length===0)return[{at:n,level:0}];if(!t.clock)return[{at:n,level:a(t.events[0])}];if(t.lin)return lu(e,t,n,r,e=>a(e)).map(e=>({at:e.at,level:Math.max(0,e.v),ramp:e.ramp}));let o=fl(e.result,e.statics).map(t.clock),s=o.stepAt(Math.max(0,n))*t.rate,c=o.stepAt(Math.max(0,r))*t.rate;Number.isFinite(s)||(s=0),Number.isFinite(c)||(c=s);let l=e=>{let n=ou(e,t.period),r=e-n*t.period,i=-1;for(let e of t.events){if(!(r>=e.step-1e-9&&r<e.step+e.duration-1e-9))continue;let o=tu(t,e,n);o&&(i=Math.max(i,a(o)))}return i<0?0:i},u=i===void 0?NaN:fl(e.result,e.statics).written(t.clock).stepAt(Math.max(0,i))*t.rate,d=[{at:n,level:l(Number.isFinite(u)?u:s)}],f=/* @__PURE__ */ new Set;for(let e=Math.floor(s/t.period);e*t.period<c;e++)for(let n of t.events)for(let r of[e*t.period+n.step,e*t.period+n.step+n.duration])r>s+1e-9&&r<c-1e-9&&f.add(r);for(let e of[...f].sort((e,t)=>e-t)){let n=l(e+Gc*10);n!==d[d.length-1].level&&d.push({at:o.q(e/t.rate),level:n})}return d}function du(e,t,n){let r=0;for(let n=0;n<e.length;n++)e[n].at<=t+1e-9&&(r=n);let i=e[r+1];return!i?.ramp||Math.abs(e[r].at-t)<1e-9?n(e[r]):n(e[r])+(n(i)-n(e[r]))*(t-e[r].at)/Math.max(Gc,i.at-e[r].at)}let fu={sign:1,lin:!1,db:!1,clock:null,rate:0,period:1,events:[]};function pu(e,t,n){let r=fl(e,t),i=/* @__PURE__ */ new Set,a=[],o=t=>{for(let n=0;t&&!i.has(t)&&n<32;n++){i.add(t);let n=e.cells.get(t);if(!n)return;n.laps&&n.clock&&a.push(r.map(n.clock).q(n.laps*Math.max(1,Kl(e,t,null))/n.rate)),n.clock&&n.clock!==t&&o(n.clock),t=n.step?.driver}};o(n.cell);for(let e of n.select)o(e.cell);return a.length?Math.min(...a):1/0}function mu(e){let t=3735928559,n=1103547991;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,2654435761),n=Math.imul(n^i,1597334677)}return t=Math.imul(t^t>>>16,2246822507)^Math.imul(n^n>>>13,3266489909),n=Math.imul(n^n>>>16,2246822507)^Math.imul(t^t>>>13,3266489909),((n>>>0)*2**21+(t>>>11))/2**53}function hu(e,t,n,r){return gu(e,t.output.cell,n,r)}function gu(e,t,n,r){if(n.laps&&I(r,n.laps.of)!==n.laps.is)return null;if(n.chance===void 0&&!n.options&&!n.chosen)return n;let i=`${e.cells.get(t)?.seed??0}|${eu(e)(t)}`;for(let e of n.chosen??[])if(Math.floor(mu(`${i}|${r+e.lap}|${e.at.toFixed(6)}|${e.id.replace(/^[^:/]*:/,``)}|picks`)*e.of)!==e.is)return null;if(n.chance===void 0&&!n.options)return n;let a=`${i}|${r}|${n.step.toFixed(6)}`;if(n.chance!==void 0&&mu(`${a}|sounds`)>=1-n.chance)return null;if(!n.options)return n;let o=n.options[Math.floor(mu(`${a}|picks`)*n.options.length)];return{...n,value:o.value,alter:o.alter}}function _u(e,t){let n=!1;for(let r of t){let t=e.cells.get(r.part)?.params.restart??e.cells.get(r.cell)?.params.restart;if(t===`resume`||t===`free`)return t;t!==`restart`&&r.performer||(n=!0)}return n?`restart`:`free`}function vu(e,t,n,r){let i=t.series;if(!i.clock||i.events.length===0)return[];let a=fl(e.result,e.statics).map(i.clock),o=a.stepAt(Math.max(0,n))*i.rate,s=a.stepAt(Math.max(0,r))*i.rate;Number.isFinite(o)||(o=0),Number.isFinite(s)||(s=o);let c=[];for(let e=Math.floor(o/i.period)-1;e*i.period<s;e++)for(let n of i.events){if(I(Math.round(n.value+n.alter),t.entries)!==t.entry)continue;let r=e*i.period+n.step,l=r+n.duration;l<=o+1e-9||r>=s-1e-9||c.push({a:a.q(r/i.rate),b:a.q(l/i.rate)})}return c.sort((e,t)=>e.a-t.a)}let yu=(e,t,n)=>Ac(e,t).some(e=>n.has($(e))),bu=(e,t,n)=>{let r=e.cells.get(t);for(let t=0;r?.step&&t<32;t++){if(n.has($(r.step.driver)))return!0;r=e.cells.get(r.step.driver)}return!1};function xu(e,t){let n=e.cells.get(t),r=n?.voice?n.params.gain:void 0;return typeof r==`number`&&Number.isFinite(r)?r:1}function Su(e,t,n){let[r,i]=[1,1];for(let a of t){let t=e.voiceParams.get(a)?.pan;if(!t)continue;let[o,s]=Br(nu(e,t,n));[r,i]=[r*o,i*s]}return[r,i]}function Cu(e,t){return e.silent?e.via.some(n=>t.has($(n))&&!e.midi?.some(e=>e.card===n))?[0,0]:[e.gains[0],e.gains[1]]:Tu(e.parts,t)}function wu(e,t){let n=Cu(e,t);if(e.silent||Eu(n))return n;let r=Ou(e,t).reduce((e,t)=>Math.abs(t.gain)>Math.abs(e)?t.gain:e,0);return[r,r]}function Tu(e,t){let n=[0,0];for(let r of e)!t.has($(r.mix))&&!t.has($(r.sink))&&(n[0]+=r.gains[0],n[1]+=r.gains[1]);return n}let Eu=e=>e[0]!==0||e[1]!==0;function Du(e,t,n){if(!Au(e,t,n))return!1;let r=Cu(t,n);return Eu(r)||ku(t,n)}function Ou(e,t){return(e.midi??[]).filter(e=>!t.has($(e.card))&&!(e.mix&&t.has($(e.mix))))}let ku=(e,t)=>Ou(e,t).length>0;function Au(e,t,n){if(n.has($(t.voice))||n.has($(t.cell)))return!1;if(t.drone)return!t.through.some(e=>n.has($(e)))&&!(t.envelopeCell&&n.has($(t.envelopeCell)));let r=e.cells.get(t.cell);return!(!r?.clock||yu(e,r.clock,n)||bu(e,t.cell,n)||t.through.some(e=>n.has($(e)))||t.envelopeCell&&n.has($(t.envelopeCell))||t.select.some(t=>n.has($(t.cell))||n.has($(t.part))||n.has($(e.cells.get(t.cell).over)))||t.select.some(t=>[...e.cells.get(t.cell).children.keys()].some(e=>n.has($(e)))))}function ju(e,t,n){if(Math.abs(t-n)<1e-9)return{period:t,events:[...e]};let r=[];for(let i=0;i*t<n-Gc;i++)for(let a of e){let e=a.step+i*t;e>=n-1e-9||r.push({...a,step:e,duration:Math.min(a.duration,n-e)})}return{period:n,events:r}}function Mu(e,t,n=/* @__PURE__ */ new Set){if(!e.ok)return{result:e,statics:t,muted:n,tracks:[],drones:[],played:/* @__PURE__ */ new Set,voiceParams:/* @__PURE__ */ new Map,envParams:/* @__PURE__ */ new Map,end:1/0,seriesOf:()=>fu};let r=[],i=[],a=/* @__PURE__ */ new Map,o=(r,i,a,s)=>{let c=e.cells.get(r);if(c.sum)return{sign:s,lin:!1,db:!1,clock:null,rate:0,period:1,events:[],sum:{terms:c.sum.terms.map(e=>({series:o(e.cell,null,0,1),weight:e.weight})),constant:c.sum.constant}};let l=n.has($(r))?[]:Yl(e,r,t,i,e=>n.has($(e)),a).filter(t=>!yu(e,t.table,n)),u=l.some(e=>e.laps||e.chance!==void 0||e.options||e.chosen)?(t,n)=>gu(e,r,t,n):void 0,d=c.map?.kind===`db`,f=!d&&l.some(e=>e.value+e.alter<0||(e.options??[]).some(e=>e.value+e.alter<0)),p=Math.max(1,Kl(e,r,i)),m=hl(e,c).per;return{sign:s,lin:c.map?.kind===`lin`,db:d,clock:c.clock,rate:c.rate,...m?ju(l,p,m):{period:p,events:l},...u?{drawn:u}:{},...f?{bipolar:!0}:{}}},s=(t,n)=>{let r=(Ts(e,n)??0)/t.period;return r>20?{...t,rate:t.rate*20/r}:t},c=/* @__PURE__ */ new Map;for(let t of e.cells.values())if(t.map?.kind===`adsr`&&Object.keys(t.paramCells).length)try{c.set(t.name,Object.fromEntries(Object.entries(t.paramCells).map(([e,t])=>[e,{range:t.range,series:t.factors.map(e=>o(e,null,0,1)),env:null}])))}catch(e){if(!(e instanceof Jl))throw e}for(let c of e.outputs){if(!Du(e,c,n))continue;let l=e.cells.get(c.cell);try{for(let t of[...c.kit?Cs(e.cells.get(c.voice)):[c.voice],...c.through]){if(a.has(t))continue;let n=e.cells.get(t),r={};for(let[t,i]of Object.entries(n?.paramCells??{})){let n=i.factors.find(t=>e.cells.get(t)?.map?.kind===`adsr`);r[t]={range:i.range,series:i.factors.filter(e=>e!==n).map(e=>s(o(e,null,0,1),e)),env:n?Xr(e.cells.get(n)):null}}a.set(t,r)}if(c.drone){i.push({output:c,mods:c.mods.map(e=>o(e.cell,e.pick,e.shift,e.sign)).filter(e=>e.events.length>0),levels:c.levels.map(e=>o(e.cell,e.pick,e.shift,e.sign))});continue}let n=o(c.cell,c.pick,c.shift,c.sign),u=c.mods.filter(e=>!e.picks).map(e=>o(e.cell,e.pick,e.shift,e.sign)).filter(e=>e.events.length>0),d=c.mods.find(e=>e.picks),f=d?o(d.cell,d.pick,d.shift,1):void 0,p=c.levels.map(e=>o(e.cell,e.pick,e.shift,e.sign)),m=c.select.map(t=>({series:o(t.cell,null,0,1),entry:t.entry,entries:e.cells.get(e.cells.get(t.cell).over).units.length})),h=l.paramCells.legato,g=l.step?.tap?e.cells.get(l.step.driver)?.meter:null,_=l.step?.chain.reduce((e,t)=>t.op===`×`?e*t.n:e/t.n,1)??1,v=h?{range:h.range,series:h.factors.map(e=>o(e,null,0,1))}:typeof l.params.legato==`number`?l.params.legato:g?Si(g,l.step.tap,_):1;n.events.length&&r.push({...n,output:c,clock:l.clock,mods:u,...f?{picker:f}:{},levels:p,selects:m,end:pu(e,t,c),share:v})}catch(e){if(!(e instanceof Jl))throw e}}let l=r.map(e=>e.end),u=-1/0;for(let t of e.clocks.values()){let n=Hc(e,t.cell)?.stopsAt();n!=null&&(u=Math.max(u,n))}let d=l.length?Math.max(...l):1/0,f={result:e,statics:t,muted:n,tracks:r,drones:i,played:al(e),voiceParams:a,envParams:c,end:Math.min(d,u>-1/0?u:1/0),seriesOf:t=>e.cells.has(t)?o(t,null,0,1):fu},p={swing:/* @__PURE__ */ new Map,depth:/* @__PURE__ */ new Map};for(let t of e.cells.values()){let e=[[`swing`,t.meter?t.swingMoves:void 0],[`depth`,t.bend?.depth]];for(let[n,r]of e)if(r)try{p[n].set(t.name,{range:r.range,series:r.factors.map(e=>o(e,null,0,1)),env:null})}catch(e){if(!(e instanceof Jl))throw e}}return(p.swing.size||p.depth.size)&&rl(e,t,(e,t,n)=>{let r=p[t].get(e);return r?nu(f,r,n):NaN}),f}function Nu(e,t,n,r){let i=n&&t?e.envParams.get(t):void 0;if(!i)return n;let a={...n};for(let[t,n]of Object.entries(i)){let i=nu(e,n,r);t===`attack`||t===`decay`||t===`release`?a[t]=Math.max(0,i):t===`sustain`&&(a.sustain=Math.min(1,Math.max(0,i)))}return a}function Pu(e,t){let n=e.cells.get(t)?.env,r=n?e.cells.get(n):void 0;return r?.map?.kind===`adsr`?Xr(r):null}function Fu(e,t,n){if(!t.kit)return{voice:t.voice,freq:e.cells.get(t.voice).freq};let r=e.cells.get(t.voice),i=r.units[I(Math.round(n),r.units.length)];return i?.atom.kind===`ref`?{voice:i.atom.name,freq:e.cells.get(i.atom.name).freq}:null}function Iu(e,t,n){let r=e.cells.get(e.cells.get(t)?.over??``)?.params.anchor;if(typeof r!=`number`)return 0;let i=e=>Math.floor(e)*3600+Math.round(e%1*100)*60;return Math.round(((i(r)-i(n.origin))%86400+86400)%86400/n.stepSeconds)}let Lu=/* @__PURE__ */ new Map;function Ru(e,t){let n=`${e.id} ${t}`,r=Lu.get(n);if(r)return r;let i=Ul(e),a=_c(so(`${Wl(e,t)}\n&lapVoice s=sine loop=C4\n&lapOut map=sample [${e.plays} * &lapVoice]`,{old:!1}),Ur);if(!a.ok)throw Error(`law=${e.id}, lap ${t}: ${a.diagnostics.map(e=>e.message).join(`; `)}`);let o=Hr(a),s=a.cells.get(`lapVoice`).freq,c=e.holes.space?Yl(a,`space`,o,null):[],l=e=>{let t=c.find(t=>e>=t.step-1e-9&&e<t.step+t.duration-1e-9);return t?t.value/3-1:0},u=Bu(Mu(a,o),0,i).map(e=>({step:e.at,dur:e.dur,ratio:e.freq/s,level:e.levels[0]?.level??0,pan:l(e.at)})).sort((e,t)=>e.step-t.step||e.ratio-t.ratio);return Lu.size>=96&&Lu.delete(Lu.keys().next().value),Lu.set(n,u),u}function zu(e,t,n){let r=Ul(e),i=[];for(let a=Math.floor(t/r);a*r<n;a++)for(let o of Ru(e,a)){let e=a*r+o.step;e>=t&&e<n&&i.push({...o,step:e})}return i}function Bu(e,t,n,r=!1,i={}){let a=t=>e.result.cells.get(t.output.cell)?.params.law!==void 0,o=e.tracks.filter(e=>!e.output.tape&&!a(e)),s=e.tracks.filter(e=>e.output.tape),c=Ku({...e,tracks:o},t,n,r);e.drones.length&&(c.push(...Ju(e,t,n,r,i)),c.sort((e,t)=>e.at-t.at));for(let i of e.result.outputs){let a=Hl(e.result.cells.get(i.cell)?.params);if(!a)continue;let o=wu(i,e.muted),s=i.midi?Ou(i,e.muted):[],l=Eu(o);if(!l&&!s.length)continue;let u=e.result.cells.get(i.voice)?.freq||261.63,d=Iu(e.result,i.cell,a),f=a.stepSeconds;for(let p of zu(a,Math.ceil(t/f-1e-9)+d,Math.ceil(n/f-1e-9)+d)){let t=(p.step-d)*f;c.push({at:t,dur:p.dur*f,voice:i.voice,freq:u*p.ratio,bends:[],gains:[o[0]*Math.min(1,1-p.pan)*xu(e.result,i.voice),o[1]*Math.min(1,1+p.pan)*xu(e.result,i.voice)],levels:[{at:t,level:p.level}],...l?{}:{unheard:!0},...s.length?{midi:s}:{},...r?{output:i.id}:{}})}}if(!s.length)return c;let l=fl(e.result,e.statics);for(let i of s){let a=i.output.tape,o=e.result.cells.get(a.tape),{pos:s,real:u,speed:d,moving:f}=bl(e.result,l,a.tape),p=typeof o?.params.varispeed==`number`?o.params.varispeed:0,m=1-a.erase,h=a.length>0?Math.min(40,m>0?Math.ceil(Math.log(.02)/Math.log(m)):1):1,g={...i,output:{...i.output,tape:void 0}};for(let i=0;i<h;i++){let o=a.at+i*a.length,l=m**+i,h=u(s(t)-o),_=u(s(n)-o);if(!(_>0)||!Number.isFinite(_))continue;let v=e=>u(s(e)+o);for(let i of Ku({...e,tracks:[g]},Math.max(0,h),_,r)){let e=v(i.at);if(!(e>=t&&e<n)||!Number.isFinite(e))continue;let r=v(i.at+i.dur);if(f&&d(i.at)<.05)continue;let a=p?Math.min(4,Math.max(.25,(d(e)/d(i.at))**+p)):1;c.push({...i,at:e,dur:Math.max(.01,(Number.isFinite(r)?r:e+i.dur)-e),freq:i.freq*a,bends:i.bends.map(e=>({...e,at:v(e.at)})),levels:i.levels.map(e=>({...e,at:v(e.at)})),gains:[i.gains[0]*l,i.gains[1]*l],...i.params?{params:Vu(i.params,v)}:{},...i.through?{through:i.through.map(e=>e.params?{...e,params:Vu(e.params,v)}:e)}:{}})}}}return c.sort((e,t)=>e.at-t.at)}let Vu=(e,t)=>Object.fromEntries(Object.entries(e).map(([e,n])=>[e,n.kind===`points`?{...n,points:n.points.map(e=>({...e,at:t(e.at)}))}:n]));function Hu(e,t,n,r){let i=[...t.through].reverse().filter(t=>{let n=e.result.cells.get(t);return!!n&&[...Object.keys(n.params),...Object.keys(n.paramCells),...Object.keys(n.paramClocks)].some(e=>Z.has(e))}).map(t=>{let i=ru(e,t,n,r);return{instrument:t,...i?{params:i}:{}}});return i.length?{through:i}:{}}function Uu(e){let[t,n,r,i]=[0,1,1,0],a=e;for(let o=0;o<32;o++){let o=Math.floor(a+1e-12);if([t,n]=[n,o*n+t],[r,i]=[i,o*i+r],i>1e4)return[t,r];if(Math.abs(e-n/i)<1e-9)break;a=1/(a-o)}return[n,i]}let Wu=(e,t)=>t===0?e:Wu(t,e%t);function Gu(e,t){let[n,r]=Uu(e-Math.floor(e)),[i,a]=Uu(Math.max(0,t-Math.floor(t))),o=r*a/Wu(r,a);return Wu(Wu(o/r*n,o/a*i),o)/o}function Ku(e,t,n,r){let i=[],{result:a,statics:o}=e,s=fl(a,o);for(let o of e.tracks){let c=s.map(o.clock),l=Math.min(n,o.end);if(l<=t)continue;let u=c.stepAt(Math.max(0,t))*o.rate,d=c.stepAt(Math.max(0,l))*o.rate;if(!Number.isFinite(u)||!Number.isFinite(d)||d<=u)continue;let f=(t,n)=>{let r=o.share;if(typeof r==`number`)return r;let i=r.series.reduce((t,r)=>{let i=cu(e,r,n);return t*(i?i.value+i.alter:1)},1);return r.range?r.range[0]+(r.range[1]-r.range[0])*i:i},p=(t,n,i,l=1/0)=>{let u=Gu(t,n.duration)/o.rate,d=c.q(t/o.rate,u);if(!Number.isFinite(d)||d>=o.end-1e-9)return null;let p=f(t,d),m=Math.min(c.q((p===1?i:t+p*(i-t))/o.rate,u),l<1/0?c.q(l/o.rate):1/0,o.end),h=o.picker?cu(e,o.picker,d):n,g=h&&Fu(a,o.output,h.value);if(!g||e.muted.has($(g.voice)))return null;let _=Nu(e,o.output.envelope?o.output.envelopeCell:o.output.kit?a.cells.get(g.voice)?.env:null,o.output.envelope??(o.output.kit?Pu(a,g.voice):null),d),v=a.cells.get(g.voice)?.oneshot?_??Pu(a,g.voice):null,y=v?v.attack+v.decay:Number.isFinite(m)?m-d:8,b=o.output.kit&&!o.picker||o.output.gate?o.output.offset:o.sign*iu(e,n,d)+o.output.offset,x=[];if(o.mods.length){let t=o.mods.map(t=>au(e,t,d,d+y)),n=t.reduce((e,t)=>e+t[0].semis,0);b+=n;let r=[...new Set(t.flatMap(e=>e.slice(1).map(e=>e.at)))].sort((e,t)=>e-t);for(let e of r){let r=t.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9)),i=t.reduce((t,n)=>t+du(n,e,e=>e.semis),0);x.push({at:e,cents:100*(i-n),...r?{ramp:r}:{}})}}let S=dl(a,o.clock);if(S&&c.speed&&!o.output.gate){let e=e=>Math.max(.001,c.speed(e)),t=e(d);if(t<.05)return null;if(b+=12*S*Math.log2(t),!x.length)for(let n=d+.04,r=0;n<d+y&&r<400;n+=.04,r++){let r=1200*S*Math.log2(e(n)/t);Math.abs(r)>1&&x.push({at:n,cents:r,ramp:!0})}}let C=o.db?10**((n.value+n.alter)/20):Math.max(0,n.value+n.alter),w=[{at:d,level:(o.output.gate?C:1)*(n.level??1)}];if(o.levels.length){let n=s.written(o.clock).q(t/o.rate),r=o.levels.map(t=>uu(e,t,d,d+y,n)),i=[...new Set(r.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t),a=w[0].level;w.length=0;for(let e of i)w.push({at:e,level:a*r.reduce((t,n)=>t*du(n,e,e=>e.level),1),...r.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}})}let T=g.freq*2**(b/12),E=ru(e,g.voice,d,y),D=_,O=e=>{let t=xu(a,g.voice);if(!o.output.kit)return[e[0]*t,e[1]*t];let[n,r]=Br(a.cells.get(g.voice)?.params.pan);return[e[0]*n*t,e[1]*r*t]},[k,A]=Su(e,[g.voice,...o.output.through],d),j=O(wu(o.output,e.muted)),M=[j[0]*k,j[1]*A],N=o.output.midi?Ou(o.output,e.muted):[];return T>0&&T<2e4&&w.some(e=>e.level>0)?{at:d,dur:y,voice:g.voice,freq:T,bends:x,value:n.value+n.alter,gains:M,levels:w,...!o.output.silent&&!Eu(M)?{unheard:!0}:{},...N.length?{midi:N}:{},...D?{env:D}:{},...o.output.through.length?{instrument:o.output.through[0]}:{},...E?{params:E}:{},...Hu(e,o.output,d,y),...r?{output:o.output.id}:{}}:null},m=o.output.kit||o.output.gate?0:a.cells.get(o.output.voice)?.glide??0,h=m>0,g=o.events.length,_=e=>(e===0||o.events[e-1].step!==o.events[e].step)&&(e===g-1||o.events[e+1].step!==o.events[e].step),v=(e,t)=>e>0?[e-1,t]:[g-1,t-1],y=(e,t,n,r,i)=>{if(!h||!_(e)||I(t*g+e,256)===0)return!1;let[s,l]=v(e,t),u=l*o.period+o.events[s].step+o.events[s].duration,d=t*o.period+o.events[e].step;return _(s)&&l>=n&&r+l*o.period+o.events[s].step>=i-1e-9&&Math.abs(u-d)<1e-9&&f(r+l*o.period+o.events[s].step,c.q((r+l*o.period+o.events[s].step)/o.rate,Gu(r+l*o.period+o.events[s].step,o.events[s].duration)/o.rate))>=1-1e-9&&!!hu(a,o,o.events[s],l)},b=(e,t,n,r=-1,s=0,c=0,l=0,u=1/0,d=-1/0)=>{if(r>=0&&y(r,s,l,c,d))return;let f=p(e,t,n,u);if(!f)return;if(r<0||!h||!_(r))return void i.push(f);let v=f,b=[{at:f.at,dur:f.dur,freq:f.freq,bends:f.bends}],[x,S]=[r,s];for(let e=0;e<256;e++){[x,S]=x<g-1?[x+1,S]:[0,S+1];let e=c+S*o.period+o.events[x].step;if(e>=u-1e-9||!y(x,S,l,c,d))break;let t=hu(a,o,o.events[x],S),n=t&&p(e,t,e+o.events[x].duration,u);if(!n)break;let r=1200*Math.log2(n.freq/v.freq),i=v.bends.length?v.bends[v.bends.length-1].cents:0,s=Math.min(m,n.dur);v={...v,dur:n.at+n.dur-v.at,bends:[...v.bends,{at:n.at,cents:i},{at:n.at+s,cents:r,ramp:!0},...n.bends.map(e=>({...e,at:Math.max(e.at,n.at+s),cents:e.cents+r}))],levels:[...v.levels,...n.levels.filter(e=>e.at>=n.at)]},b.push({at:n.at,dur:n.dur,freq:n.freq,bends:n.bends})}i.push(b.length>1?{...v,legato:{glide:m,notes:b}}:v)};if(o.selects.length===0){for(let e=Math.floor(u/o.period)-1;e*o.period<d;e++)for(let[t,n]of o.events.entries()){let r=e*o.period+n.step;if(r<u-1e-9||r>=d-1e-9)continue;let i=hu(a,o,n,e);i&&b(r,i,r+n.duration,t,e)}continue}let x=_u(a,o.output.select),S=e=>e.reduce((e,t)=>{let n=e[e.length-1];return n&&Math.abs(t.a-n.b)<1e-9?e[e.length-1]={a:n.a,b:t.b}:e.push(t),e},[]),C=(t,n)=>{let r=o.output.select[t],i=vu(e,o.selects[t],n,l),s=a.cells.get(r.part)?.params.restart??a.cells.get(r.cell)?.params.restart;return r.performer&&s!==`restart`?S(i):i},w=(e=>{let t=C(0,e);for(let n of o.selects.keys()){if(n===0)continue;let r=C(n,e);t=t.flatMap(e=>r.flatMap(t=>Math.max(e.a,t.a)<Math.min(e.b,t.b)?[{a:Math.max(e.a,t.a),b:Math.min(e.b,t.b)}]:[]))}return x===`restart`?t:S(t)})(x===`resume`?0:t),T=0;for(let e of w){let t=c.stepAt(e.a)*o.rate,n=c.stepAt(e.b)*o.rate,r=x===`free`?0:x===`resume`?t-T:t;T+=n-t;let i=Math.max(u,t),s=Math.min(d,n);if(!(s<=i))for(let e=Math.floor((i-r)/o.period)-1;r+e*o.period<s;e++)for(let[c,l]of o.events.entries()){let u=r+e*o.period+l.step;if(e<0||u<i-1e-9||u>=s-1e-9)continue;let d=hu(a,o,l,e);d&&b(u,d,u+l.duration,c,e,r,0,n,t)}}}return i.sort((e,t)=>e.at-t.at)}function qu(e,t,n,r){let i=[...new Set(e.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t),a=e.map(()=>0),o=[];for(let s of i){let i=r,c=!1;e.forEach((e,r)=>{let o=a[r];for(;o+1<e.length&&e[o+1].at<=s+1e-9;)o++;a[r]=o;let l=e[o],u=e[o+1],d=!u?.ramp||Math.abs(l.at-s)<1e-9?t(l):t(l)+(t(u)-t(l))*(s-l.at)/Math.max(Gc,u.at-l.at);i=n(i,d),l.ramp&&Math.abs(l.at-s)<1e-9&&(c=!0)}),o.push({at:s,value:i,...c?{ramp:c}:{}})}return o}function Ju(e,t,n,r,i){let a=Math.max(0,i.begins??0),o=Math.min(e.end,i.until??1/0),s=[];for(let i=Math.max(0,Math.floor((t-a)/600));a+i*600<Math.min(n,o);i++){let n=a+i*600;if(n<t-1e-9)continue;let c=Math.min(600,o-n);if(c>0)for(let t of e.drones){let i=t.output,a=e.result.cells.get(i.voice);if(!a)continue;let o=qu(t.mods.map(t=>au(e,t,n,n+c)),e=>e.semis,(e,t)=>e+t,0),l=o[0]?.value??0,u=o.slice(1).map(e=>({at:e.at,cents:100*(e.value-l),...e.ramp?{ramp:!0}:{}})),d=t.levels.length?qu(t.levels.map(t=>uu(e,t,n,n+c)),e=>e.level,(e,t)=>e*t,1).map(e=>({at:e.at,level:e.value,...e.ramp?{ramp:!0}:{}})):[{at:n,level:1}],f=a.freq*2**((i.offset+l)/12);if(!(f>0&&f<2e4)||!d.some(e=>e.level>0))continue;let[p,m]=Su(e,[i.voice,...i.through],n),h=wu(i,e.muted),g=[h[0]*p,h[1]*m],_=i.midi?Ou(i,e.muted):[],v=ru(e,i.voice,n,c);s.push({at:n,dur:c,voice:i.voice,freq:f,bends:u,gains:g,levels:d,held:!0,...!i.silent&&!Eu(g)?{unheard:!0}:{},..._.length?{midi:_}:{},...i.envelope?{env:Nu(e,i.envelopeCell,i.envelope,n)}:{},...i.through.length?{instrument:i.through[0]}:{},...v?{params:v}:{},...Hu(e,i,n,c),...r?{output:i.id}:{}})}}return s}function Yu(e){return e.ends===null?e.cycle!==null&&Number.isFinite(e.cycle)&&e.cycle<=1800?e.cycle:e.longest:e.ends}function Xu(e){let[t,n,r,i]=[0n,1n,1n,0n],a=e;for(let o=0;o<32;o++){let o=BigInt(Math.floor(a));if([t,n]=[n,o*n+t],[r,i]=[i,o*i+r],i>10000n)return[t,r];let s=a-Math.floor(a);if(s<1e-9||Math.abs(Number(n)/Number(i)-e)<1e-9*Math.max(1,e))break;a=1/s}return[n,i]}let Zu=(e,t)=>t===0n?e:Zu(t,e%t);function Qu(e,t){let n=[...e.cells.values()].map(e=>Hl(e.params)).find(e=>e!==null);if(n){let e=n.cycle*n.stepSeconds;return{ends:e,cycle:e,chance:!1,longest:e}}let r=Hr(e),i=Mu(e,r),a=fl(e,r),o=(e,t)=>{if(!e)return null;let n=a.map(e),r=n.q(t)-n.q(0);return Number.isFinite(r)&&r>1e-6?r:null},s=[],c=!1,l=t=>{let n=e.clocks.get(t),r=n?.tap?.meter??n?.belt?.driver;return r&&r!==t?l(r):t},u=new Set(i.tracks.map(e=>l(e.clock))),d=e=>u.has(l(e));for(let e of i.tracks){let t=o(e.clock,e.period/e.rate),n=e.events.reduce((e,t)=>t.laps?Number(BigInt(e)*BigInt(t.laps.of)/Zu(BigInt(e),BigInt(t.laps.of))):e,1);t&&s.push(t*n),e.events.some(e=>e.chance!==void 0||e.options||e.chosen)&&(c=!0);for(let t of[...e.mods.filter(e=>e.clock&&d(e.clock)),...e.levels,...e.selects.map(e=>e.series)]){let e=t.clock?o(t.clock,t.period/t.rate):null;e&&s.push(e)}}for(let e of i.voiceParams.values())for(let t of Object.values(e))for(let e of t.series){let t=e.clock&&d(e.clock)?o(e.clock,e.period/e.rate):null;t&&s.push(t)}let f=new Set([...e.cells.values()].flatMap(e=>e.over?[e.over]:[]));for(let t of e.cells.values()){if(!f.has(t.name)||!t.step||!t.clock||t.loops||e.clocks.has(t.name)||!t.cycle)continue;let n=o(t.clock,1/t.rate);if(!n)continue;let r=Math.max(1,Math.abs(Math.round(t.stride||1)));if(t.wrap===0)continue;let{per:i,laps:a}=hl(e,t),c=Math.max(1,Math.round(a*gl(e,t.name))),l=i??c/Number(Zu(BigInt(c),BigInt(r)));s.push(n*l)}t?.push(...s);let p=Number.isFinite(i.end)?i.end:null,m=s.length?Math.max(...s):null;if(s.length===0)return{ends:p,cycle:null,chance:c,longest:m};let h=1n,g=0n;for(let e of s){let[t,n]=Xu(e);t!==0n&&(h=h/Zu(h,t)*t,g=g===0n?n:Zu(g,n))}return{ends:p,cycle:g===0n?null:h/g>10n**18n?1/0:Number(h)/Number(g),chance:c,longest:m}}let $u=e=>{if(!e||e.braid.kind!==`list`)return null;let t=e.braid.tokens.map(e=>e.atom.kind===`note`&&e.repeat===1&&e.elongate===1&&e.subdivide===1?e.atom.value:NaN);return t.some(e=>Number.isNaN(e))?null:t};function ed(e,t){let n=e.atom;return n.kind===`note`?{...e,atom:{...n,value:t(n.value)}}:n.kind===`choice`?{...e,atom:{...n,values:n.values.map(t)}}:n.kind===`seq`?{...e,atom:{...n,layers:n.layers.map(e=>e.map(e=>ed(e,t)))}}:e}function td(e,t,n,r,i){let a=e.braid.kind===`list`?{...e.braid,tokens:e.braid.tokens.map(e=>ed(e,e=>t+(n-t)*e))}:e.braid;return{...e,name:r,span:i,braid:a,label:null,about:void 0,...e.style?{style:void 0}:{}}}let nd=e=>String(Math.round(e*1e9)/1e9);function rd(e,t){let n=new Map(e.cells.map(e=>[e.name,e])),r=[],i=(e,t)=>r.push({severity:`error`,message:e,span:t}),a=e=>{let t=n.get(e.name);if(!t)return null;let r=$u(t);return t.map?.kind!==`style`||!r||r.length!==B.length?(i(`style=&${e.name}: a style is a map=style cell (&${e.name} map=style .3 .45 .55 .55), or a mix of them by weight`,e.span),null):r},o=e=>{if(e.kind===`cell`)return a(e.ref);let t=e.terms.map(e=>({v:a(e.ref),w:e.weight}));return t.some(e=>!e.v)?null:B.map((e,n)=>t.reduce((e,t)=>e+t.w*t.v[n],0))},s=/* @__PURE__ */ new Map;for(let t of e.cells){if(!t.style)continue;let e=o(t.style.from),r=t.style.to?o(t.style.to):null;if(!e||t.style.to&&!r)continue;let a=[e,...r?[r]:[]].flatMap(e=>B.filter((t,n)=>!(e[n]>=t.range[0]-1e-9&&e[n]<=t.range[1]+1e-9)));if(a.length){i(`&${t.name} style=: its style lies outside the axes on ${[...new Set(a.map(e=>e.name))].join(`, `)} (each ${B[0].range[0]} to ${B[0].range[1]}); a mix's weights sum its styles' points`,t.style.span);continue}let c=t.style.curve??null;if(c&&!n.has(c.name))continue;let l=c?n.get(c.name).braid:null;c&&!(l?.kind===`list`&&l.tokens.every(e=>e.atom.kind===`note`))?i(`style=a..b * &${c.name}: a curve is a line of numbers from 0 to 1 (&${c.name} map=lin step=1m 0 .5 1)`,c.span):s.set(t.name,{from:e,to:r,curve:c})}let c=/* @__PURE__ */ new Map,l=!1,u=!1,d=e.cells.some(e=>typeof(e.params.play??e.params.trigger)==`string`&&e.braid.kind!==`blank`),f=e=>{if(!e.pick||e.pick.kind!==`at`||!e.pick.abs)return null;let a=e.pick.i,o=n.get(e.name),f=s.get(e.name),p=null,m=B[a]?.name,h=e=>{let t=n.get(e);return t?.map?.kind===`style`&&m?t.paramCells?.[m]:void 0},g=o?.style,_=g?[g.from,...g.to?[g.to]:[]].flatMap(e=>e.kind===`cell`?[e.ref]:e.terms.map(e=>e.ref)):[],v=o?.map?.kind===`style`?h(e.name):void 0;if(!v&&_.some(e=>h(e.name))&&(g.to||g.from.kind!==`cell`&&g.from.kind!==`mix`))return i(`&${e.name}[${m}]: a range of styles doesn't move with a moving one yet; name the moving style alone, style=&${_.find(e=>h(e.name)).name}`,e.span),null;let y=(t,r,i)=>{let a=e.span,o=(e,t)=>({e:{k:`prod`,factors:[{k:`ref`,ref:{name:e,pick:null,shift:0,span:a}},{k:`num`,value:t,span:a}],span:a},sign:1}),s=[{k:`sum`,items:[...r.map(e=>o(e.cell,e.weight)),...i===0?[]:[{e:{k:`num`,value:i,span:a},sign:1}]],span:a}];return c.set(t,{...c.get(r[0].cell)??n.get(r[0].cell),name:t,span:a,params:{},paramSpans:{},paramCells:void 0,paramClocks:void 0,map:null,step:null,label:null,about:void 0,style:void 0,braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:s},repeat:1,subdivide:1,elongate:1,span:a}]}}),t},b=(e,t,r,a,o)=>{if(c.has(a))return a;let s=mo(e,n);if(s){let e=s.terms.reduce((e,t)=>e+t.weight,0),n=s.terms.map((e,n)=>({cell:b(e.cell,t,r,`${a}_${n}`,o),weight:e.weight}));return n.some(e=>e.cell===null)?null:y(a,n,t*(1-e)+(r-t)*s.constant)}let l=n.get(e);return l?l.braid.kind===`list`?(c.set(a,td(l,t,r,a,o)),a):(i(`${m}=… * &${l.name}: an axis moves by a line of numbers from 0 to 1, like &${l.name} step=1m*8 [0|.25|.5|.75|1], or a sum of them`,o),null):null},x=(e,t)=>{if(e.factors.length!==1||e.factors[0].pick)return i(`${m}=… * &x: an axis moves by one cell, a line of numbers or a sum of them, &drift [&a * .5 + &b * .5] (decision 079)`,e.span),null;let[n,r]=e.range??B[a].range;return b(e.factors[0].name,n,r,t,e.factors[0].span)};if(v)return x(v,`λ${e.name}_${a}`);if(g?.from.kind===`cell`&&!g.to){let e=h(g.from.ref.name);if(e)return x(e,`λ${g.from.ref.name}_${a}`)}if(g?.from.kind===`mix`&&!g.to&&_.some(e=>h(e.name))){let t=`λ${e.name}_${a}`;if(c.has(t))return t;let r=[],i=0;for(let e of g.from.terms){let t=h(e.ref.name);if(t){let n=x(t,`λ${e.ref.name}_${a}`);if(n===null)return null;r.push({cell:n,weight:e.weight})}else i+=e.weight*($u(n.get(e.ref.name))?.[a]??0)}return y(t,r,i)}if(!o&&e.name===`style`)p=nd(rt[a]),!u&&d&&r.push({severity:`info`,message:`no line writes &${nt}: &${nt}[${B[a].name}] reads the centre of style space, ${nd(rt[a])} on each axis (a score names its style as the note &${nt} style=…, decision 063)`,span:e.span}),u=!0;else if(f){let r=f.from[a],i=f.to?f.to[a]:r;f.to&&!f.curve&&(l=!0);let o=f.curve?n.get(f.curve.name):void 0;if(o&&r!==i){let t=`λ${e.name}_${a}`;return c.has(t)||c.set(t,td(o,r,i,t,e.span)),t}if(r===i||!t)p=nd(r);else if(`bars`in t){let e=t.bars*16;p=`map=lin step=1m*16 ${Array.from({length:e},(t,n)=>nd(r+(i-r)*n/e)).join(` `)}`}else p=`map=lin step=${nd(1/t.seconds)}hz ${nd(r)} ${nd(i)}`}else if(o&&(o.map?.kind===`style`||o.map?.kind===`adsr`)){let e=$u(o)?.[a];e!==void 0&&(p=nd(e))}if(p===null)return null;let S=`λ${e.name}_${a}`;if(!c.has(S)){let t=so(`&styleRead lpf=0..1 * &(${p})`).cells.find(e=>e.name!==`styleRead`);t&&c.set(S,{...t,name:S,span:e.span})}return c.has(S)?S:null},p=!1,m=e.cells.map(e=>{if(!e.paramCells)return e;let t=null;for(let[n,r]of Object.entries(e.paramCells)){let i=r.factors.map(e=>{let t=f(e);return t?{name:t,pick:null,shift:0,span:e.span}:e});i.some((e,t)=>e!==r.factors[t])&&((t??={...e.paramCells})[n]={...r,factors:i})}return t?(p=!0,{...e,paramCells:t}):e});return!p&&!r.length?{parsed:e,glides:l}:{parsed:{...e,cells:[...m,...c.values()],diagnostics:[...e.diagnostics,...r]},glides:l}}function id(e,t=Ur,n){let r=sc(e),i=rd(r,null),a=_c(i.parsed,t,n);if(!i.glides)return a;let o=ad(a);return o?_c(rd(r,o).parsed,t,n):a}function ad(e){let t=e.ok?Yu(Qu(e)):null;if(!t||!Number.isFinite(t)||t<=0)return null;let n=e.mainMeter;if(!n||!e.clocks.has(n))return{seconds:t};let r=e.cells.get(n)?.units.length??0;if(!r)return{seconds:t};let i=fl(e,Hr(e)).map(n).stepAt(t)/r;return Math.abs(i-Math.round(i))<1e-6&&Math.round(i)>0?{bars:Math.round(i)}:{seconds:t}}function od(e,t=Ur,n={}){if(!Cn(e))return id(so(e,{old:n.old??!1}),t);let r=Kn(e,n),i=id(so(r.text,{old:n.old??!1}),t,r.given),a=[...r.diagnostics,...i.diagnostics.map(e=>({...e,span:r.through(e.span.line)??e.span}))].sort((e,t)=>e.span.line-t.span.line||e.span.col-t.span.col);return{...i,ok:!a.some(e=>e.severity===`error`),diagnostics:a,takes:r.takes,...r.origins.size?{origins:r.origins}:{}}}2**({cents:.5,db:.1,seconds:25e-5,silent:1e-5}.cents/1200)-1,[...[`1n`,`2n`,`4n`,`8n`,`16n`,`32n`].flatMap(e=>[e,`${e}.`,e.replace(`n`,`t`)])];function sd(e){let t=od(e),n=new Set([...t.cells.values()].filter(e=>e.voice||e.mix||e.sink||e.map||e.note||e.name===`piece`).map(e=>e.name));return e.split(`
`).map(e=>e.replace(/(^|\s)#.*$/,``).replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g,``).replace(/\sabout=(\([^)]*\)|&\w+)/g,``).replace(/[ \t]+/g,` `).trim()).filter(e=>e&&!n.has(/^&(\w+)/.exec(e)?.[1]??``)).join(`
`).length}let cd=(e,t)=>`${e}(${Object.entries(t).map(([e,t])=>`${e}=${t}`).join(`, `)})`;function ld(e,t){let n=wn(e);if(!n)throw Error(`boundText: a template's arguments, but the text has no signature`);let r=Object.keys(t).map(e=>`&${e}`);for(let e of r)if(!n.optional.includes(e))throw Error(`boundText: ${e} is none of the signature's optional parameters (${n.optional.join(`, `)})`);let i=n.optional.filter(e=>!r.includes(e)),a=`${n.names.join(`, `)} from ${i.length?`(${i.join(`, `)}) `:``}${n.main??``}`.trimEnd(),o=new Set(r.filter(t=>RegExp(`base=${t}(?![A-Za-z0-9_])`).test(e))),s=!1;return e.split(`
`).flatMap(e=>{if(/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(e)&&!s&&wn(e))return s=!0,[a];let n=r.find(t=>RegExp(`^\\s*${t}(?![A-Za-z0-9_])`).test(e));return n?o.has(n)?[`${n} ${t[n.slice(1)]}`]:[]:[Object.entries(t).reduce((e,[t,n])=>o.has(`&${t}`)?e:e.replace(RegExp(`&${t}(?![A-Za-z0-9_])`,`g`),n),e)]}).join(`
`)}function ud(e){if(!e.association.some(e=>e.args))return[e];let t=e.association.filter(e=>!e.args),n=/* @__PURE__ */ new Map;for(let t of e.association){if(!t.args)continue;let r=cd(e.id,t.args),{args:i,...a}=t;n.set(r,{args:t.args,points:[...n.get(r)?.points??[],a]})}return[...t.length?[{...e,association:t}]:[],...[...n].map(([t,{args:n,points:r}])=>({id:t,text:ld(e.text,n),association:r}))]}Object.freeze({filed:Object.freeze([]),points:Object.freeze([]),together:Object.freeze([])});let dd=e=>typeof e==`number`&&Number.isFinite(e);function fd(e,t){if(typeof e!=`object`||!e)return[`${t}: not a style point`];let n=Object.entries(e);return n.length?n.flatMap(([e,n])=>dd(n)?[]:[`${t}: ${e} is ${String(n)}, not a number`]):[`${t}: an empty point (no axes)`]}function pd(e){let t=[],{id:n,text:r,association:i}=e;typeof n==`string`&&n.trim()||t.push(`no id`);let a=typeof n==`string`&&n.trim()?n:`(no id)`;return typeof r==`string`&&r.trim()||t.push(`${a}: no text`),!Array.isArray(i)||!i.length?t.push(`${a}: no style point in its association`):i.forEach((e,n)=>t.push(...md(e,`${a}: point ${n+1}`))),t}function md(e,t){let n=[];(!e||!dd(e.weight)||e.weight<=0)&&n.push(`${t}: weight ${String(e?.weight)}, not a number > 0`);let r=e?.facet;return r===void 0||typeof r==`string`&&r.trim()||n.push(`${t}: facet ${String(r)}, not a name`),n.push(...fd(e?.point,t)),n}new Map([...un].reverse().map(([e,t])=>[t,e]));let hd=[`id`,`association`],gd=[`point`,`weight`,`facet`,`args`],_d=(e,t)=>e.entries.find(e=>e.key===t);function vd(e,t){return e.kind===`list`?e.items.map((e,n)=>{let r=`point ${n+1}`;if(e.kind!==`map`)return t.push({line:e.line,message:`${r} is a map (point, weight, facet)`}),{point:{},weight:0};for(let n of e.entries)gd.includes(n.key)||t.push({line:n.line,message:`${r}: ${n.key} is none of point, weight, facet, args`});let i={},a=_d(e,`point`);if(!a)t.push({line:e.line,message:`${r} has no point`});else if(a.value.kind!==`map`||!a.value.entries.length)t.push({line:a.line,message:`${r}: its point is a map of axes to numbers`});else for(let e of a.value.entries)e.value.kind===`scalar`&&typeof e.value.value==`number`?i[e.key]=e.value.value:t.push({line:e.line,message:`${r}: ${e.key} is ${JSON.stringify(ln(e.value))}, not a number`});let o=_d(e,`weight`),s=o?.value.kind===`scalar`?o.value.value:void 0;typeof s!=`number`&&t.push({line:o?.line??e.line,message:`${r}: ${o?`its weight is ${JSON.stringify(ln(o.value))}, not a number`:`no weight`}`});let c=_d(e,`facet`),l=c?.value.kind===`scalar`?c.value.value:void 0;c&&typeof l!=`string`&&t.push({line:c.line,message:`${r}: its facet is ${JSON.stringify(ln(c.value))}, not a name`});let u=_d(e,`args`),d={};if(u&&(u.value.kind!==`map`||!u.value.entries.length))t.push({line:u.line,message:`${r}: its args are a map of parameters to values`});else if(u&&u.value.kind===`map`)for(let e of u.value.entries){let n=e.value.kind===`scalar`?e.value.value:void 0;typeof n==`string`&&/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(n)&&!/[&=]/.test(n)||typeof n==`number`?d[e.key]=String(n):t.push({line:e.line,message:`${r}: its arg ${e.key} is ${JSON.stringify(ln(e.value))}, not a value (a word, a number, 8n:2/3, meter("7/8"))`})}return{point:i,weight:typeof s==`number`?s:0,...typeof l==`string`?{facet:l}:{},...Object.keys(d).length?{args:d}:{}}}):(t.push({line:e.line,message:"the association is a list of points (`- point: …`)"}),[])}function yd(e){let t=e.split(/\r?\n/);if(t[0]!==`---`)return{problems:[{line:1,message:"no frontmatter: a fragment file starts with a line `---`"}]};let n=Yn(e);if(`problems`in n)return{problems:n.problems.map(e=>/^the frontmatter is a map/.test(e.message)?{...e,message:"the frontmatter is a map (`id: …`, `association: …`)"}:e)};let r=t.indexOf(`---`,1),i=cn(t.slice(1,r).join(`
`),2).node,a=[],o=_d(i,`id`),s=o?.value.kind===`scalar`?o.value.value:void 0;o?typeof s!=`string`&&a.push({line:o.line,message:`the id is ${JSON.stringify(ln(o.value))}, not a string: quote it`}):a.push({line:1,message:`no id in the frontmatter`});let c=_d(i,`association`);c||a.push({line:1,message:`no association in the frontmatter`});let l=c?vd(c.value,a):[];if(a.length)return{problems:a.sort((e,t)=>e.line-t.line)};let u={id:s,text:n.text,association:l},d=pd(u);return d.length?{problems:d.map(e=>{let t=/point (\d+)/.exec(e);return{line:t?c.value.items[Number(t[1])-1].line:/no text/.test(e)?(n.map?.[0]?.line??r+2)-1:o.line,message:e}})}:{fragment:u,meta:Object.fromEntries(Object.entries(n.frontmatter).filter(([e])=>!hd.includes(e))),prose:n.prose,layout:n.layout}}function bd(e){let t=[],n=[],r=/* @__PURE__ */ new Map;for(let[i,a]of Object.entries(e)){let e=yd(a);if(`problems`in e){n.push(...e.problems.map(e=>`${i}:${e.line}: ${e.message}`));continue}let{id:o}=e.fragment,s=r.get(o);s===void 0?r.set(o,i):n.push(`${i}:${a.split(`
`).findIndex(e=>/^id:/.test(e))+1}: the id ${o} is given twice (first in ${s})`),t.push({path:i,...e})}return n.length?{problems:n}:{files:t}}let xd={"bands/01-band":"---\nid: band\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 1\n    facet: band\nsource: seed\n---\n\n```cells\n&band, &drums, &bass, &pad, &stab, &lead, &drumsOut, &bassOut, &padOut, &stabOut, &leadOut, &bassV, &padV, &keysV, &leadV, &sound, &midi from (&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style)\n&band &drums &bass &pad &stab &lead\n&drums, &drumsOut from drums_performer &drumlines\n&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV) &bassline\n&pad, &padOut from pad_performer(padLevel=&padLevel, padV=&padV) &padline\n&stab, &stabOut from stab_performer(stabLevel=&stabLevel, keysV=&keysV) &stabline\n&lead, &leadOut from lead_performer(leadLevel=&leadLevel, leadV=&leadV) &leadline\n&bassV from bass(style=&style)\n&padV from pad(style=&style)\n&keysV from keys(style=&style)\n&leadV from lead(style=&style)\n&bassLevel map=amp .8\n&padLevel map=amp .8\n&stabLevel map=amp .8\n&leadLevel map=amp .8\n&sound map=sample [&drumsOut, &bassOut * .8, &padOut * .35, &stabOut * .4, &leadOut * .45]\n&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut\n&drumlines step=1m ~\n&bassline step=1m ~\n&padline step=1m ~\n&stabline step=1m ~\n&leadline step=1m ~\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n```\n\nThe default band (decision 063 §1, #391): who plays a score, on what, and where it goes out. A score ends in `* from band(…)`, the same line on every client, and each client's resolver answers `band` with its own; this is the one cells' library holds.\n\n**Its signature** (decision 065; decision 075, #560): its heads, `&band` and the roles, the gates, the voices and the cards, keep their names in the score; its inputs are optional parameters, `(&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style)`. A score passes what it writes, `* from band(bassline=&bassline, …, style=&style)` (`bandLine(score)`, `src/repository/band.ts`). A part it doesn't pass is a tacet, `&bassline step=1m ~`, and says nothing; a level it doesn't pass is .8; a style it doesn't pass is the centre of style space, `&style map=style sync=.5 harm=.5 bite=.5 mood=.5`. A score that took them by name before passes them now, and Migrate writes it.\n\n**Its head, `&band`,** is decision 061's table of performers: the five role cells, `&drums`, `&bass`, `&pad`, `&stab` and `&lead`, so a score's selector over the band (`&form over=&band step=1m …`) reads the client's players. Who plays when is the score's; who they are, the band's.\n\n**The performers** are the seed library's five (decisions 058 and 061), each a copy taken by its signature (decision 065): its role and its gate, `&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV) &bassline`. The part each plays is the score's, passed as the band's argument (`bassline=&bassline`), and so are its levels (`bassLevel=&bassLevel`). A level the score doesn't pass is the band's own, one level of .8, the performers' default. A part it doesn't pass rests (decision 063 §4).\n\n**The instruments** are the performers' own (`bass`, `keys`, `pad`, `lead`, and 13 of `gm_kit`'s voices), each with a sound. The band takes each pitched one itself, `&bassV from bass(style=&style)`, and passes it to its performer (`bassV=&bassV`), so a score's own `&bassV` is the one played, and `bandAt` replaces the band's line for it. They read the score's style, `&style` (decision 063 §3), passed by the band, which declares it (#560), where Jambot's `timbreOf` reads it (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): the bass's cutoff opens with bite; the lead blends from a triangle to a square as bite rises, its cutoff opening with it; the chords' attack and release shorten as bite rises (decision 066, #411). The section's style is the composer's: the score writes it and passes it; the band's own `&style` is only its default, the centre.\n\n**Which instrument a performer plays at a style** is the band's choice, made by a query at resolution, not by a line: `resolveBand(score)` answers `band` with this text, each pitched voice the first instrument the library ranks at the score's style that defines it, within 0.3 (`INSTRUMENT_REACH`, #540), where that isn't the performer's own (`bandAt`, `src/repository/band.ts`; yggi/jambot#527's rule, moved here). At Synth-pop's, Techno's, Deep house's, Lo-fi hip hop's and Bossa nova's points that is the performer's own instrument, so the band plays as written; at Ambient's the sine bass, at Funk's the brass stab, at Swing jazz's the upright bass and the muted trumpet (#540); at Electro swing's point the upright bass, the brass stab and the clarinet, at Spooky's the round bass, the organ, the celesta and the theremin (#366). Each holds its default's register, so MIDI out sends the same notes. Each is voiced for its own point and reads no `&style`: where one plays, the style moves no cutoff of that voice, as it does the default bass's and lead's. The instruments are found at the score's style where it starts, so a section that glides into or out of Electro swing plays the instruments of its first end throughout. A line can't make that choice: a voice reads a style as a moving parameter, and a wave or a set of envelopes is no such parameter.\n\n**The cards:** a sound card that hears every gate, the drums at full, the bass at .8, the lead at .45 and the chords under it (the pad at .35, the stab at .4), as Jambot's synth balances its parts (`PEAK`, yggi/jambot `apps/web/src/audio/voices.ts` @ 227aa74, its chords' several notes each quieter), and a MIDI card on Jambot's channels: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums. A person with a fifth synth gives the stab its own channel in their band.\n\nA score played on this band sends the MIDI Jambot's section text sends on its single card (channel, note, velocity, onset and end): its twenty sections at the ten presets, seeds 1 and 2, 0 mismatched (`band.slow.test.ts`).\n\nAssociated once as the facet `band` at the centre of style space, at weight 1: it plays every style, reading the style it is given.\n","bass/01-root-bass":`---
id: root_bass
association:
  - point:
      sync: 0
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 1
    facet: bass
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 1
    facet: bass
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 1
    facet: bass
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 1
    facet: bass
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=2n 0 0
\`\`\`

Jambot's bass pattern \`root\`: the root of the chord in force on one and on three, the bar's downbeat and its half (\`bass.ts\` weighs them 1 and 0.6).
Its own lines read the host's \`&harm\` (\`over=&harm\`: each index a tone of the chord sounding) and tap the host's main meter, so it fits any workbench whose \`&bar\` and \`&harm\` are written first; it has no card (#291): it is the part the bass performer plays (\`&bassline\`, decision 058), and the workbench's card sends it.

At the point where the root is all \`bass.ts\` plays: there its blend weighs the pump, the eighths and the funk line 0 (no sync, no energy, legato), so the root's share is 1.
Of the points where it is 1, this is the nearest to Ambient's, the preset where the root's share is greatest (0.68): Ambient's harmony, its sync and energy at 0.
It is also at the three presets where the root is what \`bass.ts\` plays most, as the meters are at theirs (#209): Synth-pop's (0.32, the funk line 0.27), Deep house's (0.31, tied with the funk line, which the root takes as first in \`bass.ts\`'s order) and Ambient's (0.68). A preset plays a blend, and its nearest pattern's point needn't be the pattern it plays most.

What \`bass.ts\` adds that a fixed line doesn't: on three it plays the fifth one section in five and an octave up one in four, by a draw per section and step; it thins the line by the energy (each step sounds when a held draw falls under its weight times 0.55 + 0.6 × energy); the octave, the voice leading and the velocity are the performer's.

**Its signature** (decision 065): \`&bassline from &harm\`. \`&bassline from root_bass &harm\` takes a copy of it, \`&harm\` its main argument.
`,"bass/02-pumping-bass":`---
id: pumping_bass
association:
  - point:
      sync: 0
      harm: 0
      bite: 1
      mood: 0.825
    weight: 1
    facet: bass
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: bass
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=8n ~ 0 ~ 0 ~ 0 ~ 0
\`\`\`

Jambot's bass pattern \`pump\`: the root of the chord in force on the eighth after each beat, and nothing on the beat, not even on a chord change (\`bass.ts\` plays the new root on a change only while the pump weighs under 0.45).
Its own lines read the host's \`&harm\` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (\`&bassline\`, decision 058), and the workbench's card sends it.

At the one point where the pump's share of \`bass.ts\`'s blend is greatest, 0.74: a static vamp, staccato, no sync (each a factor of the pump: \`(1 − harm) × artic × (1 − sync)\`), and no energy, which would bring in the eighths.
That is Techno's harmony and articulation, its sync and energy at 0.
It is also at Techno's, the preset where the pump is what \`bass.ts\` plays most (0.50), as the meters are at theirs (#209).

What \`bass.ts\` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, by a draw per section and step; the thinning by the energy (here 0.55: each offbeat sounds about one section in two); the octave, the voice leading and the velocity, the performer's.

**Its signature** (decision 065): \`&bassline from &harm\`. \`&bassline from pumping_bass &harm\` takes a copy of it, \`&harm\` its main argument.

Also at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1: the eurodance bass of [Hypercell](../../examples/hypercell.md), the root on every offbeat eighth, is this line (#572).
`,"bass/03-eighths-bass":"---\nid: eighths_bass\nassociation:\n  - point:\n      sync: 0\n      harm: 0.3\n      bite: 0\n      mood: 0.45\n    weight: 1\n    facet: bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm\n&bassline over=&harm step=8n 0!8\n```\n\nJambot's bass pattern `eight`: the root of the chord in force on every eighth (`bass.ts` weighs the downbeat 1, the bar's half 0.9, the others 0.8).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt a point where the eighths' share of `bass.ts`'s blend is greatest, 0.63: full energy and no sync (the eighths weigh `0.6 × energy × (1 − funk)`, the funk line weighs the sync), and no pump (legato, or a harmony that moves fully).\nThe eighths are what `bass.ts` plays most at no preset, so unlike the others they sit at no preset's point (#209).\nTechno, the preset where their share is greatest (0.24), is as near two of those points (Techno legato, and Techno with its harmony moving), so it sits at the root bass's point with the energy at 1: there `bass.ts` moves from the root alone to the eighths by the energy alone.\n\nWhat `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, off the downbeat; the thinning by the energy (here 1.15: each eighth sounds but about one in twelve); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from eighths_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/04-funk-bass":`---
id: funk_bass
association:
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: bass
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: bass
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: bass
source: seed
lifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~
&bassNext over=&harm[>>] 0
\`\`\`

Jambot's bass pattern \`funk\`, its line on 4/4's sixteen steps, every step it weighs (\`bass.ts\`'s \`FUNK\`: 1, 0.7, 0.8, 0.4, 0.7, 0.5, 0.3, 0.8): the root of the chord in force, and on the bar's last two sixteenths the next chord's root, anticipated (\`&bassNext\`, over \`&harm[>>]\`).
Its own lines read the host's \`&harm\` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (\`&bassline\`, decision 058), and the workbench's card sends it.

At Funk's point: there the funk line's share of \`bass.ts\`'s blend is the greatest it gets, 0.74 (full sync weighs it 1 and the pump and the eighths 0), and Funk is the preset where its share is greatest.
It is also at the two other presets where the funk line is what \`bass.ts\` plays most, as the meters are at theirs (#209): Lo-fi hip hop's (0.48) and Bossa nova's (0.63).
At full sync \`bass.ts\` anticipates the next chord nine times in ten on a step of the bar's last three that isn't a change (\`0.9 × sync\`), so this line plays the anticipation.

What \`bass.ts\` adds that a fixed line doesn't: the tenth time, the root or the fifth there; the fifth one step in five and an octave up one in four elsewhere off the downbeat; the thinning by each step's weight and the energy (here 1: the 0.3 and the 0.4 sound about one section in three); the octave, the voice leading and the velocity, the performer's.

**Its signature** (decision 065): \`&bassline from &harm\`. \`&bassline from funk_bass &harm\` takes a copy of it, \`&harm\` its main argument.
`,"bass/05-walking-bass":"---\nid: walking_bass\nassociation:\n  - point:\n      sync: 0.35\n      harm: 1\n      bite: 0.3\n      mood: 0.85\n    weight: 1\n    facet: bass\n  - point:\n      sync: 0.55\n      harm: 0.75\n      bite: 0.6\n      mood: 0.5\n    weight: 1\n    facet: bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm\n&bassline over=&harm step=4n 0 1 2 &bassNext^$-1\n&bassNext over=&harm[>>] 0\n```\n\nJambot's bass pattern `walk`, a note on every beat: the root of the chord in force on one, its third and its fifth, and on the last beat the next chord's root a semitone below (`&bassNext^$-1`: the next chord's root, `over=&harm[>>]`, moved a step of the grid, a semitone).\nThe semitone can't be an index: over the chord in force an accidental moves a degree of the key, so `0b` over `&harm[>>]` is a semitone only where the key's degree below the next root is one.\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt Swing jazz's point, under its meter swung on `8n` (`meter(swing=8n:2/3)`): `bass.ts` walks only where the meter swings its eighths (`eighthSwing`) and the harmony moves (`harm ≥ 2/3`), and there the walk's share of its blend is the greatest it gets, 0.74, the funk line, the pump and the eighths all 0.\nThe swing is the meter's, not a style axis, so the point says only the harmony.\nSwing jazz is the only preset where the walk is what `bass.ts` plays most, and this point is Swing jazz's (#209); at the presets whose harmony moves but whose meter doesn't swing, the pattern played most is associated there and is found before the walk.\n\nWhat `bass.ts` draws that a fixed line chooses: the second and third beats each the third, the fifth or the seventh (the fifth twice over where the chord has none), a third each, so this line is one walk it plays, up through the chord; the approach from below or above, half each, so this one from below. Under a harmony that changes on the bar's half it leads into that change too. The octave, the voice leading and the velocity are the performer's.\nAlso at the point proposed for an Electro swing preset (#349), weight 1: the walk [Electro swing, in pieces](../../examples/electroswing.md) plays. It is placed by hand, not by `bass.ts`'s blend, which has no such preset.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from walking_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/06-creeping-bass":`---
id: creeping_bass
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0@2 &creep^$1 0
&creep over=&harm 0
\`\`\`

A bass that creeps: the root of the chord in force held two beats, then a semitone above it, and back (\`&creep^$1\`: the root moved a step of the grid, a semitone, as the walking bass's approach moves \`&bassNext\`), the shark's two notes slowed to a walk on tiptoe.
Its line reads the host's \`&harm\` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (\`&bassline\`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the semitone landing a beat later each time round.
Written by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1, Jambot's to adopt (decision 041).

**Its signature** (decision 065): \`&bassline from &harm\`. \`&bassline from creeping_bass &harm\` takes a copy of it, \`&harm\` its main argument.
`,"bass/07-tiptoe-bass":`---
id: tiptoe_bass
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.25
      mood: 0.3
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0 ~ -1 ~
\`\`\`

A bass on tiptoe: the root of the chord in force, a beat's silence, the fifth below it, and silence again, plucked short, as a cartoon villain sneaks down a corridor.
Its line reads the host's \`&harm\` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (\`&bassline\`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the root landing on a different beat each time round, as \`creeping_bass\` does.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet \`bass\`: what the bass plays when \`creeping_bass\` has tired.

**Its signature** (decision 065): \`&bassline from &harm\`. \`&bassline from tiptoe_bass &harm\` takes a copy of it, \`&harm\` its main argument.
`,"bass/08-acid-bass":`---
id: acid_bass
association:
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=16n 0 0 &r^$12 0 ~ 0 &r^$7 0 &r^$10 ~ 0 &r^$12 0 &r^$3 &r^$5 &r^$7
&r over=&harm 0
\`\`\`

The riff of [Acid-Cell](../../examples/acid.md), its first bar of sixteenths: the root, its octave, the fifth, the minor seventh, the minor third and the fourth, with two rests that let the filter breathe.
The example writes it in A minor's degrees; here it is in semitones above the chord's root (\`&r^$12\` an octave up), so it plays over whatever chord the harmony holds, as a minor riff.
It is the part the bass performer plays (\`&bassline\`, decision 058); its holes are \`&harm\` and a meter.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet \`bass\` (#572).
`,"bass/10-octave-bass":`---
id: octave_bass
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: bass
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=8n 0 3 0 3 0 3 0 3
\`\`\`

The bass of [Zelluläre Aktivität](../../examples/zell.md): the root of the chord in force and its octave, eighth by eighth (\`3\`, a triad's fourth tone, is its root an octave up).
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`bass\` (#572).
`,"bass/11-drone-bass":`---
id: drone_bass
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=1m 0
\`\`\`

The low drone of [Ghost-Cells](../../examples/ghosts.md) as a bass line: the root of the chord in force, held the whole bar.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1), weight 1, as the facet \`bass\` (#572).
`,"bass/12-continuo-bass":`---
id: continuo_bass
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=8n 0 1 2 1 0 1 2 1
\`\`\`

A continuo's broken chord in eighths: the root, the third, the fifth and back, twice a bar, the left hand that keeps a baroque piece moving under its upper voices.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 1, as the facet \`bass\` (#542).
`,"bass/13-blues-walk":`---
id: blues_walk
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0 1 2 3
\`\`\`

The bass of [Swing blues](../../examples/jazz.md): the chord in force walked up, root, third, fifth and seventh, a beat each, moved bar by bar with the changes.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 1, as the facet \`bass\` (#542).
`,"bass/14-quarter-bass":`---
id: quarter_bass
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: bass
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0 0 0 0
\`\`\`

The root of the chord in force on every beat, the stamping bass of a shanty sung on deck, as [Drunken Sailor](../../examples/sailor.md) plays it.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65), weight 1, as the facet \`bass\` (#542).
`,"bass/15-tumbao-bass":`---
id: tumbao_bass
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=8n ~ ~ ~ 2 ~ ~ 0 ~
\`\`\`

The tumbao: the bass rests on the downbeat, plays the fifth on the and of two and the root on four, held across the bar line: the anticipated bass of son and salsa, which leaves the one to the clave.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 1, as the facet \`bass\` (#542).
`,"bass/16-waltz-bass":`---
id: waltz_bass
association:
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0 ~ ~
\`\`\`

The waltz's "oom": the root on the first beat of each bar of 3/4, the two light beats left to the chords.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Waltz's point (sync 0, harm 0.7, bite 0.3, mood 0.9), weight 1, as the facet \`bass\` (#542).
`,"bass/17-oom-pah-bass":`---
id: oom_pah_bass
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=4n 0 2
\`\`\`

The tuba's oom-pah: the root on one, the fifth on two, a march's bass in 2/4.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At March's point (sync 0, harm 0.1, bite 0.75, mood 0.7), weight 1, as the facet \`bass\` (#542).
`,"bass/18-dub-bass":`---
id: dub_bass
association:
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 1
    facet: bass
source: seed
---

\`\`\`cells
&bassline from &harm
&bassline over=&harm step=8n 0@4 ~ 0 2@2
\`\`\`

A dub bass: the root held for half the bar, struck again off the beat and falling back to the fifth, deep and slow under the beat.
It is the part the bass performer plays (\`&bassline\`, decision 058).

At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 1, as the facet \`bass\` (#542).
`,"expression/01-vibrato":`---
id: vibrato
association:
  - point:
      sync: 0.5
      harm: 0.5
      bite: 0.5
    weight: 0.25
    facet: expression
source: seed
---

\`\`\`cells
&vibrato map=lin loop=5 0 .1 0 -.1 0
\`\`\`

A singer's or a string player's vibrato (#196): the pitch rising a tenth of a semitone above the note and falling as far below, five times a second, a voice's \`pitch=\` (\`&lead s=saw loop=C4 pitch=&vibrato\`).
It is the vibrato the examples wrote out most, \`pitch=&(map=lin loop=5 0 .1 0 -.1 0)\` in bossa, BWV 847 and pop and near it in six more (five to six a second, eight to fifteen hundredths of a semitone), which take it from here.
A drift that takes seconds to come round, a flutter, or a vibrato wider or slower on purpose is a piece's own: it writes its own cell, as spooky, baustelle and electroswing do.

It defines a cell and uses nothing, so it fits any workbench. Associated once, as the facet \`expression\`, at the centre of style space, at a quarter weight: what a voice does to its notes is no style's, and a query for an expression finds it there.
`,"expression/02-envelopes":"---\nid: envelopes\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: expression\nsource: seed\n---\n\n```cells\n&click map=adsr 0 .03 0 .02\n&tap map=adsr 0 .08 0 .04\n&snap map=adsr 0 .12 0 .05\n&thump map=adsr 0 .3 0 .05\n&strike map=adsr .005 .15 .5 .05\n&pluck map=adsr .005 .25 .5 .1\n&swell map=adsr .02 .3 .5 .3\n```\n\nThe shapes a note's level takes, by name (#196): a voice's `env=` (`&hh s=white hpf=8000 env=&click`), each attack, decay, sustain and release in seconds and a level, as `map=adsr` reads them.\nThey are the seven the examples wrote out most, each from its most common spelling:\n- **Struck, nothing held:** `&click` (a hat, a rim, a tick, 30 ms), `&tap` (80 ms), `&snap` (a snare, 120 ms), `&thump` (a kick, 300 ms).\n- **Held:** `&strike` (a stab, struck and held at half), `&pluck` (a plucked string, a quarter second to half), `&swell` (a pad: a soft attack, a long release).\n\nAn envelope near one of them, each value within a fifth of it, became it in the examples (the owner, #196: \"collapse … minimal differences … as long as the 'spirit and style of the piece' is preserved\"); one that is a piece's own, slower, longer or shaped otherwise, stays as the piece writes it.\nThe names are no performer's (`&stab`, `&pad`, `&lead`, `&keys` are role cells, decision 061), so a piece that plays those parts takes these too.\n\nIt defines cells and uses nothing, so it fits any workbench. Associated once, as the facet `expression`, as `vibrato` is: at the centre of style space, at a quarter weight.\n","forms/01-call-and-answer":'---\nid: call_and_answer\nassociation:\n  - point:\n      sync: 0.75\n      harm: 0.35\n      bite: 0.65\n    weight: 1\n    facet: form\nsource: seed\n---\n\n```cells\n&phrase from (&answer) &call\n&phrase step=8n &call &answer\n&answer step=8n &call^-2\n```\n\nThe call and its answer: the call, then the call two degrees down, as blues and West African music answer a call, and as Jambot\'s lead lifts a line (an operator on the call, decision 052). Its hole is `&call`; `&answer` is its helper, an operator on the call by default, which a piece overrides by naming it (`use &phrase, &answer from call_and_answer`, decision 059).\nWith a one-bar call it is 2 bars, with a two-bar call 4.\nIt taps the host\'s meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid\'s rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &phrase`), or a piece splices it where it likes.\nAt `sync .75 harm .35 bite .65`, as the facet `form`, weight 1: where its idiom is, a syncopated groove over a harmony that hardly moves, struck, as in funk, the blues, West African music and dance (#371; the owner, 2026-11-09: "form follows idiom"). It names no mood: a form fits any. Of `styles`, Funk and Acid find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&phrase from (&answer) &call`. `&phrase from call_and_answer &motif` takes a copy of it, `&call` its main argument; `&answer` an optional parameter, its line its default (`"call_and_answer"(answer=…)`).\n',"forms/02-sentence":"---\nid: sentence\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.55\n      bite: 0.5\n    weight: 1\n    facet: form\nsource: seed\n---\n\n```cells\n&sentence from (&continuation) &call\n&sentence step=8n &call &call^1 &continuation\n&continuation step=8n inverse(&call) &call[::-1]\n```\n\nCaplin's sentence: a presentation, the idea and the idea moved a degree up, then a continuation as long, here the idea mirrored (`inverse(&call)`) and the idea backwards (`&call[::-1]`), the material broken up as a continuation does. Its hole is `&call`; `&continuation` is its helper, a piece's to override by naming it.\nWith a one-bar call it is 4 bars, with a two-bar call 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &sentence`), or a piece splices it where it likes.\nAt `sync .2 harm .55 bite .5`, as the facet `form`, weight 1: where its idiom is, on the beat, over a harmony that moves on in its continuation, neither legato nor struck, as in a classical theme and a pop verse built on a riff (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Synth-pop, Techno, Deep house, Happy hardcore and Elektro find it first (Techno 0.43 away, past Jambot's miss distance of 0.3; `npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&sentence from (&continuation) &call`. `&sentence from sentence &motif` takes a copy of it, `&call` its main argument; `&continuation` an optional parameter, its line its default (`sentence(continuation=…)`).\n","forms/03-period":"---\nid: period\nassociation:\n  - point:\n      sync: 0.15\n      harm: 0.4\n      bite: 0.3\n    weight: 1\n    facet: form\nsource: seed\n---\n\n```cells\n&period from (&antecedent, &consequent) &call\n&period step=8n &antecedent &consequent\n&antecedent step=8n &call &call^1\n&consequent step=8n &call &call^-1\n```\n\nA period: an antecedent and a consequent, the same start, a different end. The antecedent ends a degree above the call (open), the consequent a degree below (closed). Its hole is `&call`; `&antecedent` and `&consequent` are its helpers, a piece's to override by naming them.\nWith a one-bar call it is 4 bars, with a two-bar call 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &period`), or a piece splices it where it likes.\nAt `sync .15 harm .4 bite .3`, as the facet `form`, weight 1: where its idiom is, on the beat, a half cadence answered by a full one, sung legato, as in a classical period, a folk song and a lullaby (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Ambient and Dark ambient find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&period from (&antecedent, &consequent) &call`. `&period from period &motif` takes a copy of it, `&call` its main argument; `&antecedent`, `&consequent` optional parameters, their lines their defaults (`period(antecedent=…)`).\n","forms/04-aaba":"---\nid: AABA\nassociation:\n  - point:\n      sync: 0.45\n      harm: 0.85\n      bite: 0.4\n    weight: 1\n    facet: form\nsource: seed\n---\n\n```cells\n&chorus from (&b) &a\n&chorus step=8n &a &a &b &a\n&b step=8n &a^3\n```\n\nThe thirty-two-bar song form, AABA, in its letters: an A three times, the bridge before the last. Its holes are `&a`, not `&call`, because an A is often a phrase itself (`&a step=8n &phrase`, the call and answer), and the bridge `&b` is its helper, A moved a fourth up by default, a piece's to override by naming it (`use &chorus, &b from AABA`).\nWith a one-bar A it is 4 bars, with a two-bar A 8.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &chorus`), or a piece splices it where it likes.\nAt `sync .45 harm .85 bite .4`, as the facet `form`, weight 1: where its idiom is, a moving, rich harmony, swung a little and played smoothly, as in the jazz standards and the songs of Tin Pan Alley (#371; the owner, 2026-11-09: \"form follows idiom\"). It names no mood: a form fits any. Of `styles`, Lo-fi hip hop, Bossa nova, Swing jazz, Electro swing and Spooky find it first (`npm run coverage -- --facet form`).\n\n**Its signature** (decision 065): `&chorus from (&b) &a`. `&chorus from AABA &motif` takes a copy of it, `&a` its main argument; `&b` an optional parameter, its line its default (`AABA(b=…)`).\n","forms/05-ternary":"---\nid: ternary\nassociation:\n  - point:\n      sync: 0.1\n      harm: 0.12\n      bite: 0.5\n    weight: 0.5\n    facet: form\nsource: seed\n---\n\n```cells\n&song from (&answer, &bridge) &call\n&song step=8n &call &answer &bridge &bridge &call &answer\n&answer step=8n &call^-2\n&bridge step=8n &answer^1\n```\n\nThe ternary song, A B A, as Twinkle has it: the call and its answer, the bridge twice, then the call and its answer again. Its hole is `&call`; `&answer` is its helper, the call two degrees down by default, and `&bridge` the answer a step up, as Twinkle's middle line is its second a step up. A piece names them to override them: `&song from ternary(answer=&wonder) &twinkle` is Twinkle whole, its bridge *up above the world so high*.\nWith a one-bar call it is 6 bars, with a two-bar call 12.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &song`), or a piece splices it where it likes.\nAt the tune's own point, not the centre of style space (#371): a children's song's form, as the facet `form`, at weight 0.5, so its distance counts double and it is found first only near the tune, not at a preset's point the centre's forms are nearer to (Techno, Ambient).\n\n**Its signature** (decision 065): `&song from (&answer, &bridge) &call`. `&song from ternary &motif` takes a copy of it, `&call` its main argument; &answer, &bridge optional parameters, their lines their defaults.\n","forms/06-rounded-binary":"---\nid: rounded_binary\nassociation:\n  - point:\n      sync: 0.1\n      harm: 0.12\n      bite: 0.6\n    weight: 0.5\n    facet: form\nsource: seed\n---\n\n```cells\n&song from (&answer, &close, &bridge) &call\n&song step=8n &call &answer &call &close &bridge &bridge^1 &call &close\n&answer step=8n &call^1\n&close step=8n &call^-2\n&bridge step=8n &call^-3\n```\n\nThe rounded binary song, A A′ B A′, as Hänschen klein has it: the call and its open answer, the call and its closing answer, a bridge and the bridge a step up, then the call and its close again. Its hole is `&call`; `&answer` (the call a step up), `&close` (two degrees down) and `&bridge` (three down) are its helpers. A piece names them to override them: `&song from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen` is Hänschen klein whole.\nWith a one-bar call it is 8 bars, with a two-bar call 16.\nIt taps the host's meter by the eighth (`step=8n`), and a splice plays its whole line at the splicing braid's rate, so a motif written in eighths keeps its rhythm in it. It has no voice and no card (#291): the lead performer plays it as its `&leadline` (`&leadline step=8n &song`), or a piece splices it where it likes.\nAt the tune's own point, not the centre of style space (#371): a children's song's form, as the facet `form`, at weight 0.5, so its distance counts double and it is found first only near the tune, not at a preset's point the centre's forms are nearer to (Techno, Ambient).\n\n**Its signature** (decision 065): `&song from (&answer, &close, &bridge) &call`. `&song from rounded_binary &motif` takes a copy of it, `&call` its main argument; &answer, &close, &bridge optional parameters, their lines their defaults.\n","harmony/01-tonic-vamp":`---
id: tonic_vamp
association:
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: harmony
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: harmony
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 0.4
    facet: harmony
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!8
\`\`\`

A vamp of Jambot's themes (\`themes.ts\`, \`VAMPS\`), eight bars over the host's key: the triad on the key's first degree for all eight bars: the vamp \`[0]\`, a stack of degrees \`&key\` reads (the chord in force a bass or a comp reads, \`over=&harm\`).
It defines \`&harm\` and uses the host's \`&key\` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
The mode is the host key's, so one text is every mode's vamp that has these degrees: \`aeolian\`, \`dorian\`.

The layout is \`buildTheme\`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (\`chords[1 % n]\`, the first again for a vamp of one).
From 0.15 to 0.33 it lays the same chords two bars each, twice over (\`[0, 0, c, c]\`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.

At the points where \`buildTheme\` plays it: aeolian at Techno's point; dorian at Funk's point. A mode's vamps are drawn alike (\`next() · vamps.length\`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from tonic_vamp &key\` takes a copy of it, \`&key\` its main argument.

Also at Acid's point (sync .45, harm .05, bite .85, mood .35), weight 0.4: Acid holds one chord, and at weight 1 the vamp would be Synth-pop's first harmony, 0.272 away (#572). Likewise at Dark ambient's (sync .35, harm .15, bite .4, mood .1), weight 0.4: its drone holds one chord.
`,"harmony/02-vamp-to-the-seventh":`---
id: vamp_to_the_seventh
association:
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: harmony
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: harmony
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!4 [6,8,10]!4
\`\`\`

A vamp of Jambot's themes (\`themes.ts\`, \`VAMPS\`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its seventh (degree 6) for four: the vamp \`[0, 6]\`, a stack of degrees \`&key\` reads (the chord in force a bass or a comp reads, \`over=&harm\`).
It defines \`&harm\` and uses the host's \`&key\` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
The mode is the host key's, so one text is every mode's vamp that has these degrees: \`aeolian\`, \`dorian\`, \`mixolydian\`. No preset of Jambot's is mixolydian, so mixolydian gives it no point of its own.

The layout is \`buildTheme\`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (\`chords[1 % n]\`, the first again for a vamp of one).
From 0.15 to 0.33 it lays the same chords two bars each, twice over (\`[0, 0, c, c]\`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.

At the points where \`buildTheme\` plays it: aeolian at Techno's point; dorian at Funk's point. A mode's vamps are drawn alike (\`next() · vamps.length\`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from vamp_to_the_seventh &key\` takes a copy of it, \`&key\` its main argument.

Also at Sea shanty's point (sync .1, harm .25, bite .7, mood .65), weight 0.4: *Drunken Sailor* turns on the same two chords, i and VII; at weight 1 the vamp would be Synth-pop's first harmony (#542).
`,"harmony/03-vamp-to-the-fourth":"---\nid: vamp_to_the_fourth\nassociation:\n  - point:\n      sync: 0.12\n      harm: 0\n      bite: 1\n      mood: 0.4\n    weight: 1\n    facet: harmony\n  - point:\n      sync: 1\n      harm: 0.12\n      bite: 0.85\n      mood: 0.65\n    weight: 1\n    facet: harmony\n  - point:\n      sync: 0.05\n      harm: 0.12\n      bite: 0\n      mood: 0.9\n    weight: 1\n    facet: harmony\nsource: seed\nlifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9\n---\n\n```cells\n&harm from &key\n&harm over=&key step=1m cycle=8 [0,2,4]!4 [3,5,7]!4\n```\n\nA vamp of Jambot's themes (`themes.ts`, `VAMPS`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its fourth (degree 3) for four: the vamp `[0, 3]`, a stack of degrees `&key` reads (the chord in force a bass or a comp reads, `over=&harm`).\nIt defines `&harm` and uses the host's `&key` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.\nThe mode is the host key's, so one text is every mode's vamp that has these degrees: `aeolian`, `dorian`, `ionian`, `mixolydian`. No preset of Jambot's is mixolydian, so mixolydian gives it no point of its own.\n\nThe layout is `buildTheme`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (`chords[1 % n]`, the first again for a vamp of one).\nFrom 0.15 to 0.33 it lays the same chords two bars each, twice over (`[0, 0, c, c]`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.\n\nAt the points where `buildTheme` plays it: aeolian at Techno's point; dorian at Funk's point; ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (`next() · vamps.length`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.\n\n**Its signature** (decision 065): `&harm from &key`. `&harm from vamp_to_the_fourth &key` takes a copy of it, `&key` its main argument.\n","harmony/04-vamp-to-the-sixth":`---
id: vamp_to_the_sixth
association:
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: harmony
  - point:
      sync: 0.05
      harm: 0.12
      bite: 0
      mood: 0.9
    weight: 1
    facet: harmony
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!4 [5,7,9]!4
\`\`\`

A vamp of Jambot's themes (\`themes.ts\`, \`VAMPS\`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its sixth (degree 5) for four: the vamp \`[0, 5]\`, a stack of degrees \`&key\` reads (the chord in force a bass or a comp reads, \`over=&harm\`).
It defines \`&harm\` and uses the host's \`&key\` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
The mode is the host key's, so one text is every mode's vamp that has these degrees: \`aeolian\`, \`ionian\`.

The layout is \`buildTheme\`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (\`chords[1 % n]\`, the first again for a vamp of one).
From 0.15 to 0.33 it lays the same chords two bars each, twice over (\`[0, 0, c, c]\`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.

At the points where \`buildTheme\` plays it: aeolian at Techno's point; ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (\`next() · vamps.length\`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from vamp_to_the_sixth &key\` takes a copy of it, \`&key\` its main argument.

**At Trip-hop's point too** (#542), weight 0.4: in a minor key, i to VI, the two chords trip-hop leans on.
`,"harmony/05-vamp-to-the-fifth":`---
id: vamp_to_the_fifth
association:
  - point:
      sync: 0.05
      harm: 0.12
      bite: 0
      mood: 0.9
    weight: 1
    facet: harmony
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 0.5
    facet: harmony
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 0.4
    facet: harmony
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/jambot packages/engine/src/themes.ts @ 0a56da9
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!4 [4,6,8]!4
\`\`\`

A vamp of Jambot's themes (\`themes.ts\`, \`VAMPS\`), eight bars over the host's key: the triad on the key's first degree for four bars, then the one on its fifth (degree 4) for four: the vamp \`[0, 4]\`, a stack of degrees \`&key\` reads (the chord in force a bass or a comp reads, \`over=&harm\`).
It defines \`&harm\` and uses the host's \`&key\` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
The mode is the host key's, so one text is every mode's vamp that has these degrees: \`ionian\`.

The layout is \`buildTheme\`'s under harm 0.15, one chord per four bars: the first four bars the vamp's first chord, the second four its second (\`chords[1 % n]\`, the first again for a vamp of one).
From 0.15 to 0.33 it lays the same chords two bars each, twice over (\`[0, 0, c, c]\`), and over 0.33 it walks the mode's transition table instead, which stays Jambot's generator on a miss.

At the points where \`buildTheme\` plays it: ionian at Ambient's point with its harmony at 0.12. A mode's vamps are drawn alike (\`next() · vamps.length\`), so each weighs 1, and a query for the harmony at a mode's point finds all of that mode's vamps at distance 0.
At \`KINDERLIED\` too (\`styles\`): the tonic and the dominant of a children's song, under Twinkle's and Hänschen klein's motifs, with ionian there (yggi/jambot#547, the owner, 2026-11-04). There at weight 0.5, so its distance counts double: at weight 1 Deep house's point would find it first within 0.3, which the fence of #404 (\`library.test.ts\`) forbids.

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from vamp_to_the_fifth &key\` takes a copy of it, \`&key\` its main argument.

**At Waltz's and March's points too** (#542), weight 0.4: the tonic and the dominant, four bars each, is the harmony of both.
`,"harmony/06-dark-cadence":`---
id: dark_cadence
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.4
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]
\`\`\`

Four bars over the host's key, a chord a bar: the tonic, the sixth, the fourth, the fifth (i, ♭VI, iv, V in a minor key), then round again, the fifth pulling back to the tonic.
In harmonic minor, the key the point finds, the fifth is major (A C♯ E over D), a dominant, and the sixth (B♭ D F) sits a semitone above the fifth's root, so the bass falls B♭, G, A and the chords lean in by semitones.
It defines \`&harm\` and uses the host's \`&key\` and main meter, so it fits any workbench that writes those first; it has no card, and plays only through what reads it.
Its lap is four bars, not the vamps' eight: Jambot's composer reads only progressions of eight (yggi/jambot \`packages/engine/src/harmony-query.ts\`), so it doesn't take this one yet, and where no harmony is near one of its presets (Synth-pop, Deep house, Lo-fi hip hop, Bossa nova, Swing jazz) it generates its harmony as before: this is the nearest there, but beyond the miss distance.
Written by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), Jambot's to adopt (decision 041), at weight 0.4: at weight 1 it was the nearest harmony to five other presets, all within Jambot's miss distance (0.3), so a composer that read four-bar laps would play it there (#404); at 0.4 every other preset is beyond it.

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from dark_cadence &key\` takes a copy of it, \`&key\` its main argument.
`,"harmony/07-haunted-progression":`---
id: haunted_progression
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.25
      mood: 0.3
    weight: 0.4
    facet: harmony
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.5
      mood: 0.1
    weight: 0.5
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4] [2,4,6] [3,5,7] [4,6,8] [5,7,9] [1,3,5] [4,6,8] [0,2,4]
\`\`\`

Eight bars over the host's key, a chord a bar: the tonic, the third, the fourth, the fifth, the sixth, the second, the fifth again and home (i, III+, iv, V, ♭VI, ii°, V, i in a minor key).
In harmonic minor, the key Spooky's point finds, the third is an augmented triad (F A C♯ over D), the ghost-house chord that leans nowhere, and the second a diminished one (E G B♭), so the progression passes through both of the key's unstable triads before the dominant brings it home.
It is eight bars long, a section's, so Jambot's composer reads it as a progression (\`packages/engine/src/harmony-query.ts\`), unlike the four bars of \`dark_cadence\`; its chords are all the key's own triads, the only kind a progression's slot holds there.
It defines \`&harm\` and uses the host's \`&key\` and main meter; it has no card, and plays only through what reads it.
Near Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite (its energy offset, #572), as the facet \`harmony\`, at weight 0.4, as \`dark_cadence\` is, so it is found within Jambot's miss distance (0.3) of Spooky alone, and behind \`dark_cadence\` wherever both are farther: at weight 1 it was the nearest harmony to Synth-pop, Lo-fi hip hop, Bossa nova and Swing jazz (0.18 to 0.3), which find none of their own there and would have played it (#404).

**Its signature** (decision 065): \`&harm from &key\`. \`&harm from haunted_progression &key\` takes a copy of it, \`&key\` its main argument.

**Shared** (#540): near Dark ambient's point, a second harmony behind the tonic vamp.
`,"harmony/08-axis-progression":`---
id: axis_progression
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 0.4
    facet: harmony
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 0.4
    facet: harmony
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.4
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [2,4,6] [6,8,10]
\`\`\`

A minor key's i, VI, III and VII, a bar each: in A minor, A F C G, the progression [Hypercell](../../examples/hypercell.md) and [Zelluläre Aktivität](../../examples/zell.md) both turn on (the axis progression begun on its minor chord, vi IV I V of the relative major).

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) and Elektro's (sync .15, harm .5, bite .85, mood .45), weight 0.4 (a weight of 1 would make it the first harmony within the miss distance at Synth-pop, Deep house and Electro swing, #572), as the facet \`harmony\` (#572): two styles that share a progression and part on bite and mood.

**At Synth-pop's point too** (#540), weight 0.4: i VI III VII is the synth-pop progression as much as it is eurodance's.
`,"harmony/09-fifths-sequence":`---
id: fifths_sequence
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 0.4
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4] [3,5,7] [6,8,10] [2,4,6] [5,7,9] [1,3,5] [4,6,8] [0,2,4]
\`\`\`

The baroque sequence of falling fifths: I IV vii° iii vi ii V I, a bar each, every root a fifth below the last, the progression under countless preludes, chaconnes and concerto episodes, Bach's among them ([Bach, Prelude in C](../../examples/prelude.md) moves through it in its middle bars).

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at styles it was not placed for.
`,"harmony/10-twelve-bar":`---
id: twelve_bar
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=12 [0,2,4,6]!4 [3,5,7,9]!2 [0,2,4,6]!2 [4,6,8,10] [3,5,7,9] [0,2,4,6] [4,6,8,10]
\`\`\`

The 12-bar blues of [Swing blues: 12 bars in C](../../examples/jazz.md): I I I I · IV IV I I · V IV I V, a bar each, every chord with its seventh. In a mixolydian key the I and the IV are dominant sevenths, as the blues plays them; the V is the key's own, minor.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at styles it was not placed for.
`,"harmony/11-korobeiniki-changes":`---
id: korobeiniki_changes
association:
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 0.4
    facet: harmony
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4] [0,2,4] [4,6,8] [0,2,4] [3,5,7] [0,2,4] [4,6,8] [0,2,4]
\`\`\`

The changes of [Korobeiniki](../../examples/korobeiniki.md): i i V i iv i V i, a bar each. In a harmonic minor key its V is major, the leading tone the tune leans on.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55), weight 0.4, as the facet \`harmony\` (#542): at 1 it would be the first harmony within the miss distance at Synth-pop, Deep house and Electro swing.
`,"harmony/12-montuno":`---
id: montuno
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 0.4
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4] [3,5,7] [4,6,8] [3,5,7]
\`\`\`

The montuno's vamp: I IV V IV, a bar each, round and round under the soloists and the coro.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 0.4, as the facet \`harmony\` (#542).
`,"harmony/13-ninth-vamp":`---
id: ninth_vamp
association:
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 1
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4,6,8]!2 [3,5,7,9,11]!2
\`\`\`

Deep house's vamp: the tonic's ninth chord for two bars, then the fourth's for two, round and round. In a dorian key, D, it is Dm9 to G9, the minor ninth over the dorian's major fourth: the warm, unresolved sway of a deep house pad.

At Deep house's point (sync 0.35, harm 0.55, bite 0.65, mood 0.65), weight 1, as the facet \`harmony\` (#540).
`,"harmony/14-ninth-loop":`---
id: ninth_loop
association:
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: harmony
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.3
      mood: 0.25
    weight: 0.5
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [0,2,4,6,8] [5,7,9,11,13] [3,5,7,9,11] [4,6,8,10]
\`\`\`

A lo-fi hip hop loop of ninths: i9, VImaj9, iv9 and v7, a bar each. In A minor, Am9 Fmaj9 Dm9 Em7: the soft, jazzy colour a sampled Rhodes loop gives a beat (the fifth stays a seventh, since its ninth would be a flat ninth in the minor key).

At Lo-fi hip hop's point (sync 0.5, harm 0.75, bite 0.35, mood 0.5), weight 1, as the facet \`harmony\` (#540).

**Shared** (#540): near Trip-hop's point, a second harmony behind its i–VI.
`,"harmony/15-turnaround":`---
id: turnaround
association:
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 1
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=2n cycle=2 [0,2,4,6,8] [5,7,9,11,13] [1,3,5,7,9] [4,6,8,10,12]
\`\`\`

The jazz turnaround: I, vi, ii and V, two to the bar, each a ninth chord. In C, Cmaj9 Am9 Dm9 G9, the changes that close a chorus and lead back to its top, a swing band's harmony moving at its fastest.

At Swing jazz's point (sync 0.35, harm 1, bite 0.3, mood 0.85), weight 1, as the facet \`harmony\` (#540).
`,"harmony/16-ii-v-i":`---
id: ii_v_i
association:
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=4 [1,3,5,7,9] [4,6,8,10,12] [0,2,4,6,8]!2
\`\`\`

The ii–V–I in ninths, a bar each and the tonic held for two: in C, Dm9 G9 Cmaj9 Cmaj9. Bossa nova's cadence, its guitar's soft chords moving by fifths to rest.

At Bossa nova's point (sync 0.75, harm 0.85, bite 0.45, mood 0.9), weight 1, as the facet \`harmony\` (#540).
`,"harmony/17-minor-swing":`---
id: minor_swing
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 1
    facet: harmony
source: seed
---

\`\`\`cells
&harm from &key
&harm over=&key step=1m cycle=8 [0,2,4]!2 [3,5,7]!2 [0,2,4]!2 [4,6,8,10]!2
\`\`\`

Gypsy jazz's minor swing: i and iv, two bars each, then i and the dominant seventh, as Django Reinhardt's *Minor Swing* turns (in A, Am Dm Am E7 in a harmonic minor key). Electro swing's harmony, sampled from the hot club records it loops.

At Electro swing's point (sync 0.55, harm 0.75, bite 0.6, mood 0.5), weight 1, as the facet \`harmony\` (#540).
`,"instruments/01-gm-kit":`---
id: gm_kit
association:
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 1
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: instrument
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: instrument
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: instrument
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 1
    facet: instrument
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: instrument
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 1
    facet: instrument
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: instrument
source: seed
---

\`\`\`cells
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
`,"instruments/03-bass":`---
id: bass
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 0.25
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.25
    facet: instrument
source: seed
---

\`\`\`cells
&bassV from (&style)
&bassV s=saw loop=C2 lpf=450..900 * &style[bite] lpq=4 env=&(map=adsr .005 .2 .7 .05)
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The voice the bass lines play through (decision 054, rung 7's first; #244): \`&bassV\`, whose \`loop=C2\` sets the register, so the lines' MIDI notes on Jambot's bass channel are the notes they were when each line carried its own \`&bassV loop=C2\`.
Its sound is Jambot's bass (\`timbreOf\`, yggi/jambot \`packages/engine/src/sound.ts\` @ 227aa74, and the synth that plays it, \`apps/web/src/audio/voices.ts\`): a saw through a resonant low-pass (\`lpq=4\`) that opens with the section's bite, from 450 Hz where it is paddy to 900 Hz where it is stabby (\`lpf=450..900 * &style[bite]\`), struck with a short attack and held (#391).
It reads the section's style, \`&style\`, the composer's, and declares it (decision 075, #560): its signature, \`&bassV from (&style)\`, makes it an optional parameter, its default the centre of style space, 675 Hz, so the bass heard alone plays there. A performer passes its own (\`&bassV from bass(style=&style)\`).
It sounds within the renderer's first stage (decision 062, R1): a wave, a filter and an envelope. A sound changes no note it sends: MIDI out sends the notes it sent with no sound, and a MIDI card alone says the sound isn't sent (decision 064).
It defines the one voice the five bass lines read and reads nothing it doesn't declare, so it fills their hole on any workbench; the lines no longer carry a voice of their own.

Associated as the facet \`instrument\` at a quarter of the kit's weight; the composer asks for the bass by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno and Funk, a synth bass's styles; weight 0.25. It read \`&style[bite]\`, so it plays each style's bite. It stood at the centre, \`.5 .5 .5 .5\`, for "any style", and was found nearest Synth-pop and farthest from Techno for no musical reason.
`,"instruments/04-keys":`---
id: keys
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 0.25
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.25
    facet: instrument
source: seed
---

\`\`\`cells
&keysV from (&style)
&keysV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The voice Jambot's comp plays its stabs through, and any keyboard part: \`&keysV\`, whose \`loop=C3\` sets the register, where Jambot's section text sounds its comp (\`PIN_VOICES.comp\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so a stab played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's chords (\`timbreOf\`, yggi/jambot \`packages/engine/src/sound.ts\` @ 227aa74): a triangle whose attack shortens from .3 s where the style is paddy to .01 s where it is stabby and its release from .7 s to .12 s, its envelope's slots read from the section's style at each note's start (\`attack=.3..0.01 * &style[bite]\`, decision 066; #391, #411). Where no line writes the style, the centre's: .155 s and .41 s.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (\`play=&part^$12\`).

It declares the style it reads, as \`bass\` does: \`(&style)\`, its default the centre (decision 075, #560).

Associated as \`bass\` is, as the facet \`instrument\` at a quarter of the kit's weight; a performer asks for it by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Swing jazz and Funk, where keys comp; weight 0.25.
`,"instruments/05-pad":`---
id: pad
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 0.25
    facet: instrument
source: seed
---

\`\`\`cells
&padV from (&style)
&padV s=tri loop=C3 env=&(map=adsr attack=.3..0.01 * &style[bite] decay=0 sustain=1 release=.7..0.12 * &style[bite])
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The voice Jambot's pad plays through: \`&padV\`, whose \`loop=C3\` sets the register, where Jambot's section text sounds its comp, pad and stab alike (\`PIN_VOICES.comp\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so a pad played on it sends the MIDI notes it sends today, with no move on its gate. It is a voice of its own beside \`keys\`, though the two sit at one register, so a sound given to one (a pad's slow attack) isn't the other's.
Its sound is the one Jambot gives its pad and its stab alike (\`timbreOf\`, yggi/jambot \`packages/engine/src/sound.ts\` @ 227aa74): a triangle that swells in over .3 s where the style is paddy and .01 s where it is stabby and dies over .7 s to .12 s, as \`keys\` does, its envelope's slots read from the section's style at each note's start (decision 066; #391, #411); the centre's .155 s and .41 s where no line writes the style. A band that wants its pad slower than its stabs gives it its own envelope.
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (\`play=&part^$12\`).

It declares the style it reads, as \`bass\` does: \`(&style)\`, its default the centre (decision 075, #560).

Associated as \`bass\` is, as the facet \`instrument\` at a quarter of the kit's weight; a performer asks for it by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno and Ambient, a pad's styles; weight 0.25.
`,"instruments/06-lead":`---
id: lead
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 0.25
    facet: instrument
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 0.25
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.25
    facet: instrument
source: seed
---

\`\`\`cells
&leadV from (&style)
&leadV s=tri..square * &style[bite] loop=C4 lpf=1400..3600 * &style[bite] env=&(map=adsr attack=.04..0.006 * &style[bite] decay=0 sustain=1 release=.08)
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The voice Jambot's lead plays through: \`&leadV\`, whose \`loop=C4\` sets the register, where Jambot's section text sounds its lead (\`PIN_VOICES.lead\`, E35's C4: yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so a lead played on it sends the MIDI notes it sends today, with no move on its gate.
Its sound is Jambot's lead (\`timbreOf\`, yggi/jambot \`packages/engine/src/sound.ts\` @ 227aa74): a soft triangle where the style is paddy blending to a bright square where it is stabby (\`s=tri..square * &style[bite]\`, decision 066), through a low-pass that opens with the section's bite (energy until decision 076; a reading of intensity may take it, #571), from 1400 Hz to 3600 Hz (\`lpf=1400..3600 * &style[bite]\`), its attack sharpening from 40 ms to 6 ms as bite rises (#391, #411). Jambot weights its triangle 1.8 against the square; the blend holds each wave at its own peak.
It reads the section's style, \`&style\`, the composer's, and declares it (decision 075, #560): \`&leadV from (&style)\`, its default the centre of style space (a blend halfway, 2500 Hz, 23 ms). A performer passes its own (\`&leadV from lead(style=&style)\`).
It sounds within the renderer's first stage (decision 062, R1), and changes no note MIDI out sends.
Its register is its own (decision 058): a performer that plays it higher or lower says so on its gate (\`play=&part^$12\`).

Associated as \`bass\` is, as the facet \`instrument\` at a quarter of the kit's weight; a performer asks for it by its id.

**Where it is found** (#540): on the points of Synth-pop, Deep house, Lo-fi hip hop and Bossa nova, where the centre point it had found it first, and of Techno, Ambient and Funk, a synth lead's styles; weight 0.25.
`,"instruments/07-upright-bass":`---
id: upright_bass
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.55
      mood: 0.9
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

\`\`\`cells
&bassV s=saw loop=C2 lpf=700 env=&(map=adsr .005 .3 .25 .08)
\`\`\`

Electro swing's bass, plucked and dark: a saw closed down to 700 Hz with a short decay and a low sustain, so each note thumps and fades as a slapped string does.
It defines \`&bassV\`, the voice the bass performer plays (\`&bassV from bass\`), so it fills the same hole as the default \`bass\` and can stand in for it.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s \`&bassV\` but for its register: \`loop=C2\`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on \`bass\` (the example's \`loop=C3\` is the piece's own).
It sounds within the renderer's first stage (decision 062, R1): a wave, a low-pass filter and an envelope.

Associated at Electro swing's point (\`ELECTRO_SWING\`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Swing jazz's and Blues shuffle's points, whose bass is an upright, and near Bossa nova's (0.1 off), a second choice behind its own.
`,"instruments/08-brass-stab":`---
id: brass_stab
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

\`\`\`cells
&keysV s=saw loop=C3 lpf=1800 env=&(map=adsr .01 .12 .25 .1)
\`\`\`

Electro swing's stabs, a short brassy chord: a saw opened to 1800 Hz, a fast attack and a quick fall to a low sustain, so the Charleston's chords bite and get out of the way.
It defines \`&keysV\`, the voice the stab performer plays (\`use &keysV from keys\`), so it fills the same hole as the default \`keys\`.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s \`&keysV\` word for word, at the default's register (\`loop=C3\`), so a stab played on it sends the MIDI notes it sends on \`keys\`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Electro swing's point (\`ELECTRO_SWING\`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Funk's and Salsa's points, their horn section's hits.
`,"instruments/09-clarinet":`---
id: clarinet
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.35
      harm: 1
      bite: 0.4
      mood: 0.85
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

\`\`\`cells
&leadV s=square loop=C4 lpf=2400 env=&(map=adsr .02 .2 .7 .15) pitch=&(map=lin loop=5.5 0 .12 0 -.12 0)
\`\`\`

Electro swing's lead: a square wave, the odd harmonics a clarinet's bore gives, softened by a low-pass at 2400 Hz, with a breath of attack and a vibrato of an eighth of a semitone five and a half times a second.
It defines \`&leadV\`, the voice the lead performer plays (\`use &leadV from lead\`), so it fills the same hole as the default \`lead\`.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s \`&leadV\` word for word, at the default's register (\`loop=C4\`), so a line played on it sends the MIDI notes it sends on \`lead\`.
It sounds within the renderer's first stage (decision 062, R1): a wave, a filter, an envelope and a pitch's shape.

Associated at Electro swing's point (\`ELECTRO_SWING\`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): near Swing jazz's point, a second lead behind the muted trumpet.
`,"instruments/10-muted-trumpet":`---
id: muted_trumpet
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.55
      mood: 0.65
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/electroswing.md @ 6d1bfa7
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .03 .1 .6 .12) pitch=&(map=lin loop=4.5 0 .08 0 -.08 0)
\`\`\`

Electro swing's second lead, the trumpet with a mute in it: a saw through a resonant low-pass (1400 Hz, \`lpq=6\`), the mute's nasal peak, with a slower, narrower vibrato than the clarinet's.
It defines \`&leadV\`, the voice the lead performer plays, so it is the other instrument a lead player at this point may take; at the point the two are equally near, and a query lists the clarinet first, by id. A piece with both, as the example, gives the second player a voice of its own.
It is [Electro swing, in pieces](../../examples/electroswing.md)'s \`&trumpetV\`, named for the hole it fills, at the default lead's register (\`loop=C4\`), so a line played on it sends the MIDI notes it sends on \`lead\`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Electro swing's point (\`ELECTRO_SWING\`: sync .55, harm .75, bite .6, mood .5; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Swing jazz's point, its lead, and near Blues shuffle's, a second choice behind its horn.
`,"instruments/11-round-bass":`---
id: round_bass
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

\`\`\`cells
&bassV s=tri loop=C2 lpf=500 env=&(map=adsr .01 .3 .6 .2)
\`\`\`

Spooky's bass, soft and round under the creep: a triangle closed down to 500 Hz, with a held sustain and a slow release, so the root and the semitone above it blur into each other.
It defines \`&bassV\`, the voice the bass performer plays (\`use &bassV from bass\`), so it fills the same hole as the default \`bass\`.
It is [Spooky, in pieces](../../examples/spooky.md)'s \`&bassV\` but for its register: \`loop=C2\`, the default instrument's, so a bass line played on it sends the MIDI notes it sends on \`bass\` (the example's \`loop=C3\` is the piece's own).
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (\`SPOOKY\`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
`,"instruments/12-organ":`---
id: organ
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

\`\`\`cells
&padV s=square loop=C3 lpf=1100 env=&(map=adsr .25 .2 .8 .6)
\`\`\`

Spooky's pad, a church organ in an empty nave: a square, the reedy stop, filtered to 1100 Hz, swelling in over a quarter of a second and hanging on after the chord is let go.
It defines \`&padV\`, the voice the pad performer plays (\`use &padV from pad\`), so it fills the same hole as the default \`pad\`.
It is [Spooky, in pieces](../../examples/spooky.md)'s \`&padV\` word for word, at the default's register (\`loop=C3\`), so a chord played on it sends the MIDI notes it sends on \`pad\`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (\`SPOOKY\`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Blues shuffle's point, its Hammond.
`,"instruments/13-theremin":`---
id: theremin
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

\`\`\`cells
&leadV s=sine loop=C4 env=&(map=adsr .15 .2 .9 .4) pitch=&(map=lin loop=5 0 .25 0 -.25 0)
\`\`\`

Spooky's lead, the theremin of a hundred horror films: a pure sine, fading in and out as a hand nears and leaves the antenna, with a wide vibrato of a quarter of a semitone five times a second.
It defines \`&leadV\`, the voice the lead performer plays (\`use &leadV from lead\`), so it fills the same hole as the default \`lead\`.
It is [Spooky, in pieces](../../examples/spooky.md)'s \`&leadV\` word for word, at the default's register (\`loop=C4\`), so a line played on it sends the MIDI notes it sends on \`lead\`.
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (\`SPOOKY\`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).
`,"instruments/14-celesta":`---
id: celesta
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/spooky.md @ 6d1bfa7
---

\`\`\`cells
&keysV s=sine loop=C3 env=&(map=adsr .002 .7 0 .5)
\`\`\`

Spooky's bell, a celesta's struck tone: a sine that starts at once and dies away over most of a second with nothing held, the music box in the attic.
It defines \`&keysV\`, the voice the stab performer plays (\`use &keysV from keys\`), so it fills the same hole as the default \`keys\`.
It is [Spooky, in pieces](../../examples/spooky.md)'s \`&keysV\` but for its register: \`loop=C3\`, the default instrument's, so a stab played on it sends the MIDI notes it sends on \`keys\`. The example plays it at \`loop=C5\`, where a celesta sits; a player who wants it there says so on its gate (\`play=&stabline^$24\`, decision 058).
It sounds within the renderer's first stage (decision 062, R1).

Associated at Spooky's point (\`SPOOKY\`: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet \`instrument\`, at half the default instruments' weight (0.125), so a query for an instrument finds it first at that point, and the kit and the defaults first at each of the eight presets (#350).

**Shared** (#540): on Baroque's point, where it stands in for the harpsichord.
`,"instruments/15-haunted-pad":"---\nid: haunted_pad\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.25\n      mood: 0.3\n    weight: 0.125\n    facet: instrument\nsource: seed\n---\n\n```cells\n&padV s=tri loop=C3 env=&(map=adsr 1.5 .5 .8 2) pitch=&(map=lin loop=3 0 .1 0 -.1 0)\n```\n\nSpooky's pad: a soft triangle that swells in over a second and a half and fades over two, wavering a tenth of a semitone three times a second, so a held chord rises out of the silence and sinks back into it, the sound a ghost house opens with.\nIt defines `&padV`, the voice the pad performer plays, so it fills the same hole as the default `pad`, at the default's register (`loop=C3`), and sends the MIDI notes it sends.\nAssociated 0.05 below Spooky’s point in bite (its energy offset, #572) (Spooky: sync .2, harm .9, bite .3, mood .3; yggi/jambot#517) as the facet `instrument`, at half the default instruments' weight (0.125), as `theremin` and `celesta` are: at Spooky's point itself it would tie with `organ`, which defines `&padV` there too, and take its place by id, so the organ plays at Spooky and this pad as the style grows quieter.\n","instruments/16-sine-bass":`---
id: sine_bass
association:
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

\`\`\`cells
&bassV s=sine loop=C2 env=&(map=adsr .005 .4 .4 .1)
\`\`\`

The round, soft bass of [Kinderlieder, in pieces](../../examples/kinderlied.md): a sine struck at once, falling to under half in four tenths of a second, as a toy piano's left hand, at the default bass's register (\`loop=C2\`; the example plays it an octave up), so it sends the MIDI notes \`bass\` sends.
It defines \`&bassV\`, the voice the bass performer plays, so it fills the same hole as the default \`bass\`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet \`instrument\`, at half the default instruments' weight (0.125), as Spooky's and Electro swing's own are (#350), so a query for an instrument finds it first there (#572).

**Shared** (#540): on Ambient's point, its soft low end.
`,"instruments/17-recorder":`---
id: recorder
association:
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.6
      mood: 0.85
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/kinderlied.md @ a8de625f
---

\`\`\`cells
&leadV s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
\`\`\`

The lead of [Kinderlieder, in pieces](../../examples/kinderlied.md): a triangle, plain and breathy, a child's recorder, at the default lead's register (\`loop=C4\`; the example plays it an octave up), so it sends the MIDI notes \`lead\` sends.
It defines \`&leadV\`, the voice the lead performer plays, so it fills the same hole as the default \`lead\`.

Associated at Kinderlied's point (sync .1, harm .12, bite .5, mood .95) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): near Baroque's point, a second lead behind the moog.
`,"instruments/18-tb303":`---
id: tb303
association:
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 0.0625
    facet: instrument
  - point:
      sync: 0.12
      harm: 0
      bite: 0.9
      mood: 0.4
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

\`\`\`cells
&bassV s=saw loop=C2 lpf=110..3800 * &(map=adsr .003 .18 .1 .06) lpq=12 env=&(map=adsr .005 .15 .5 .05)
\`\`\`

The 303 of [Acid-Cell](../../examples/acid.md): a saw through a resonant low-pass (\`lpq=12\`) that opens on every note, 3 ms up and 180 ms down (its filter envelope, written in place).
It defines \`&bassV\`, the voice the bass performer plays, so the acid line is played on it as any bass line is.
The example's knobs, which turn the cutoff and the resonance over 16 and 32 bars so the squeal comes and goes, and its accents are its own, a piece's hands on the instrument: an instrument is one voice that sounds alone.

Associated at Acid's point (sync .45, harm .05, bite .85, mood .35) as the facet \`instrument\`, at a quarter of the default instruments' weight (0.0625), so it stays Acid's and Techno, 0.185 away, keeps the default bass (#350, #572).

**Shared** (#540): near Techno's point, a second bass behind the default saw.
`,"instruments/19-rave-lead":`---
id: rave_lead
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
\`\`\`

The hook's saw of [Hypercell](../../examples/hypercell.md): a bright saw, its filter open, a short room on it. The example plays the hook on two, one detuned a few cents against the other; one is what a voice is.
It defines \`&leadV\`, the voice the lead performer plays.

Associated at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).
`,"instruments/20-square-bass":`---
id: square_bass
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&bassV s=square loop=C2 lpf=600 env=&(map=adsr .005 .15 .5 .05)
\`\`\`

The bass of [Zelluläre Aktivität](../../examples/zell.md): a square through a closed low-pass, struck and held at half, the machine bass of German electronic music of the late 1970s.
It defines \`&bassV\`, the voice the bass performer plays, at the default bass's register (\`loop=C2\`; the example's sits a third lower, on A1).

Associated at Elektro's point (sync .15, harm .5, bite .85, mood .45) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): on Chiptune's point, a sound chip's square bass.
`,"instruments/21-prepared-piano":`---
id: prepared_piano
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&leadV s=tri loop=C4 lpf=3000 room=.45 env=&(map=adsr .002 1.6 0 1.8) pitch=&(map=lin loop=.19 0 .05 0 -.05 0)
\`\`\`

The piano of [Ghost-Cells](../../examples/ghosts.md): a triangle struck at once and left to ring for two seconds and more, its pitch wavering a twentieth of a semitone either way, a prepared piano heard in a large room.
It defines \`&leadV\`, the voice the lead performer plays, at the default lead's register (\`loop=C4\`; the example plays it on D4 and panned, with an echo in time).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).
`,"instruments/22-drone-pad":`---
id: drone_pad
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0.1
      mood: 0.9
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&padV s=saw loop=C3 distort=.8 lpf=120..600 * &(map=lin loop=.0435 .15 .7 .3 .15) lpq=3 env=&(map=adsr 4 2 .9 6)
\`\`\`

The drone of [Ghost-Cells](../../examples/ghosts.md): a saw distorted hard, its low-pass breathing between 120 and 600 Hz over 23 seconds, swelling in over four seconds and fading over six.
It defines \`&padV\`, the voice the pad performer plays, at the default pad's register (\`loop=C3\`; the example's drone sits two octaves lower, on D1).

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #572).

**Shared** (#540): near Ambient's point, a second pad behind the default.
`,"instruments/23-moog":`---
id: moog
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/prelude.md @ a8de625f
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=1600 lpq=7 env=&(map=adsr .002 .3 .4 .25)
\`\`\`

The synthesizer of [Bach, Prelude in C: for Wendy](../../examples/prelude.md): a sawtooth through a resonant low-pass (\`lpq=7\`), struck and half held, the sound of Bach played on an old modular synthesizer. The example doubles it with a square an octave down; one is what a voice is.
It defines \`&leadV\`, the voice the lead performer plays, at the default lead's register.

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/24-blues-horn":`---
id: blues_horn
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
\`\`\`

The horn of [Swing blues](../../examples/jazz.md): a saw softened by a low-pass, a little room on it, a brass line's attack.
It defines \`&leadV\`, the voice the lead performer plays.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/25-fiddle":`---
id: fiddle
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 0.125
    facet: instrument
  - point:
      sync: 0
      harm: 0.7
      bite: 0.4
      mood: 0.9
    weight: 0.5
    facet: instrument
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
\`\`\`

The fiddle of [Drunken Sailor](../../examples/sailor.md): a bright saw bowed short, at the default lead's register (\`loop=C4\`; the example plays it an octave up).
It defines \`&leadV\`, the voice the lead performer plays.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).

**Shared** (#540): near Waltz's point, a second lead behind the accordion.
`,"instruments/26-pulse-lead":`---
id: pulse_lead
association:
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 0.125
    facet: instrument
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&leadV s=pulse loop=C4 env=&(map=adsr .002 .05 .8 .05)
\`\`\`

The lead of [Korobeiniki, in Tetris form](../../examples/korobeiniki.md): a pulse wave, struck and held, the voice of an 8-bit console's sound chip. The example draws a pulse of a quarter's width from a braid of its own; \`s=pulse\` is the voice's.
It defines \`&leadV\`, the voice the lead performer plays.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55) as the facet \`instrument\`, at half the default instruments' weight (0.125) (#350, #542).
`,"instruments/27-montuno-piano":`---
id: montuno_piano
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.55
      mood: 0.9
    weight: 0.5
    facet: instrument
source: seed
---

\`\`\`cells
&leadV s=square loop=C4 lpf=2800 env=&(map=adsr .002 .3 .15 .2)
\`\`\`

A bright, struck piano for the montuno: a square wave through an open filter, quick to start and quick to fade.
It defines \`&leadV\`, the voice the lead performer plays.

At Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Bossa nova's point, a second lead behind the default.
`,"instruments/28-accordion":`---
id: accordion
association:
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.8
      mood: 0.65
    weight: 0.5
    facet: instrument
source: seed
---

\`\`\`cells
&leadV s=square loop=C4 lpf=2200 env=&(map=adsr .03 .1 .9 .15) pitch=&(map=lin loop=6 0 .06 0 -.06 0)
\`\`\`

A musette accordion: a reedy square, held while the bellows push, with the slight beating of its detuned reeds as a shallow vibrato.
It defines \`&leadV\`, the voice the lead performer plays.

At Waltz's point (sync 0, harm 0.7, bite 0.3, mood 0.9), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Sea shanty's point, a second lead behind the fiddle.
`,"instruments/29-brass-band":`---
id: brass_band
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.8
      mood: 0.75
    weight: 0.5
    facet: instrument
source: seed
---

\`\`\`cells
&leadV s=saw loop=C4 lpf=2000 lpq=2 env=&(map=adsr .03 .1 .8 .1)
\`\`\`

A brass band's cornet: a saw through a filter half open, its attack a breath slower than a stab's, held for the march's tune.
It defines \`&leadV\`, the voice the lead performer plays.

At March's point (sync 0, harm 0.1, bite 0.75, mood 0.7), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Salsa's point, a second lead behind the montuno piano.
`,"instruments/30-electric-piano":`---
id: electric_piano
association:
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.45
      mood: 0.5
    weight: 0.5
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.75
      mood: 0.65
    weight: 0.5
    facet: instrument
source: seed
---

\`\`\`cells
&leadV s=sine loop=C4 room=.5 env=&(map=adsr .01 .8 .3 .6)
\`\`\`

An electric piano in a large room: a sine struck softly that rings and fades, the Rhodes of a trip-hop record.
It defines \`&leadV\`, the voice the lead performer plays.

At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 0.125, as the facet \`instrument\` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Lo-fi hip hop's and Deep house's points, a second lead behind the default.
`,"meters/meter":`---
id: meter
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: meter
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: meter
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: meter
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
    weight: 1
    facet: meter
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
    weight: 1
    facet: meter
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
    weight: 1
    facet: meter
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
    weight: 1
    facet: meter
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
    weight: 1
    facet: meter
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
    weight: 1
    facet: meter
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
    weight: 1
    facet: meter
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
    weight: 1
    facet: meter
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
    weight: 1
    facet: meter
    args:
      swing: 8n:2/3
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: meter
    args:
      swing: 8n:2/3
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
    weight: 1
    facet: meter
    args:
      swing: 8n:2/3
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: meter
    args:
      swing: 16n:.65
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: meter
    args:
      swing: 16n:.6
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: meter
    args:
      swing: 16n:.6
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: meter
    args:
      swing: 16n:31/60
  - point:
      sync: 0.2
      harm: 0.6
      bite: 0.9
    weight: 0.75
    facet: meter
    args:
      grouping: meter("2/2", 2)
  - point:
      sync: 0
      harm: 0.1
      bite: 0.6
    weight: 0.75
    facet: meter
    args:
      grouping: meter("2/4")
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
    weight: 0.75
    facet: meter
    args:
      grouping: meter("3/4")
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.38
    weight: 0.75
    facet: meter
    args:
      grouping: meter("3/4")
  - point:
      sync: 0.3
      harm: 0.2
      bite: 0.2
    weight: 0.75
    facet: meter
    args:
      grouping: meter("6/8")
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.22
    weight: 0.75
    facet: meter
    args:
      grouping: meter("6/8")
  - point:
      sync: 0.7
      harm: 0.6
      bite: 0
    weight: 0.75
    facet: meter
    args:
      grouping: meter("12/8")
  - point:
      sync: 0.4
      harm: 0.9
      bite: 0.5
    weight: 0.75
    facet: meter
    args:
      grouping: meter("5/4")
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
    weight: 1
    facet: meter
    args:
      grouping: meter("5/4")
  - point:
      sync: 0.8
      harm: 0.6
      bite: 1
    weight: 0.75
    facet: meter
    args:
      grouping: meter("7/8")
  - point:
      sync: 0.6
      harm: 0.9
      bite: 0.8
    weight: 0.75
    facet: meter
    args:
      grouping: meter("10/8")
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
    weight: 1
    facet: meter
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
    weight: 1
    facet: meter
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
    weight: 0.75
    facet: meter
    args:
      grouping: meter("2/4")
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.95
    weight: 0.5
    facet: meter
    args:
      swing: 16n:.6
source: seed
---

\`\`\`cells
&bar from (&grouping, &swing) &tempo
&bar base=&grouping step=&tempo swing=&swing
&grouping meter("4/4")
&swing swing=8n:1/2
\`\`\`

The one meter fragment (#507, decision 072): a bar \`&bar\` at the text's tempo, its grouping and its swing its arguments, each line its default: 4/4, straight.
Its points carry their arguments, one a style, so the style space's meters are this one list: \`meter\` itself at Synth-pop's, Techno's and Bossa nova's points; \`meter(swing=8n:2/3)\` at Swing jazz's and Electro swing's; the sixteenths leaning at Lo-fi's (\`16n:.65\`), at Deep house's and Funk's (\`16n:.6\`) and at Ambient's (\`16n:31/60\`); \`meter(grouping=meter("5/4"))\` at Spooky's, with 6/8 and 3/4 near it; 2/4, 7/8, 10/8, 12/8 and alla breve (\`meter("2/2", 2)\`) at points of their own.

**Its signature** (decision 065): \`&bar from (&grouping, &swing) &tempo\`. \`&bar from meter 120bpm\` takes 4/4; \`&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo\` a 7/8 swung on its pairs (its three straight, decision 071).
\`&grouping\` is a meter, read by \`base=\`: a copy of a meter is a meter (#507), so \`&bar\` is the grouping's meter at the tempo, swung as \`&swing\` says (a cell that is a swing alone, #308).

The meters placed for their own sake (2/2, 2/4, 3/4, 6/8, 12/8, 7/8, 10/8, and the 5/4 off Spooky's point) weigh 0.75, so each is still first where it was placed, and between two presets a preset's own meter is: on decision 076's axes a meter has three, and at weight 1 they crowded that space; at 0.5 they were chosen so rarely that their use stopped settling over a set (\`lockin.slow.test.ts\`) (#572).
`,"modes/01-diatonic":`---
id: diatonic
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 1
    facet: mode
    args:
      mode: dorian
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: mode
    args:
      mode: dorian
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.875
      harm: 0.485
      bite: 0.65
      mood: 0.75
    weight: 1
    facet: mode
    args:
      mode: mixolydian
  - point:
      sync: 0.6
      harm: 0.6
      bite: 0.7
      mood: 0.375
    weight: 1
    facet: mode
    args:
      mode: phrygian
  - point:
      sync: 0.15
      harm: 0.6
      bite: 0.15
      mood: 0.9
    weight: 1
    facet: mode
    args:
      mode: lydian
  - point:
      sync: 0.9
      harm: 1
      bite: 0.6
      mood: 0.3
    weight: 1
    facet: mode
    args:
      mode: locrian
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: mode
    args:
      mode: mixolydian
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: mode
    args:
      mode: dorian
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: mode
    args:
      mode: mixolydian
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: mode
    args:
      mode: ionian
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 1
    facet: mode
    args:
      mode: aeolian
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.5
      mood: 0.1
    weight: 0.5
    facet: mode
    args:
      mode: phrygian
source: seed
---

\`\`\`cells
&key from (&mode) &tonic
&key scale(&mode, &tonic)
&mode major
\`\`\`

The diatonic key, its mode a parameter: the one source of the seven modes (#363, the owner's ruling B; #387, B1). The mode is a number, darkest to brightest, decision 013's phase (locrian 0, phrygian 1, aeolian or minor 2, dorian 3, mixolydian 4, ionian or major 5, lydian 6), and a mode word reads as its number, as a note name does (\`C\` is 0). Major unless the use says otherwise.
Its scale is the diatonic necklace, \`even(7, 12, &mode)\`: the mode's number is even's phase, and \`scale(&mode, …)\` computes its steps so (decision 072); the library's names for the modes are generated by \`even\`, not typed (#507). Writing it as \`scale(even(7, 12, &mode), &tonic)\` is #531's.
It defines \`&key\`, the key (decision 060), and reads \`&tonic\`, its main argument, required: a default tonic plays a wrong key silently (#117). \`&mode\` is optional, its default \`major\`.

**Each point says which mode it is** (\`args: mode: …\`): the mode Jambot's composer plays at a preset's point (\`PRESETS\`' \`mode\`, yggi/jambot packages/engine/src/style.ts), weight 1, so a query for the mode at one of them finds that mode first, at distance 0. A query answers with \`diatonic(mode=aeolian)\`, the fragment with its argument, which is how a \`from\` line takes it: \`&key from diatonic(mode=aeolian) D\`. Aeolian, the natural minor, is the mode the band opens in (\`INITIAL_KEY\`, A aeolian). These were the seven mode fragments (\`aeolian\` … \`locrian\`), which read for one minor version as these (#387).

**Its signature** (decision 065): \`&key from (&mode) &tonic\`. \`&key from diatonic C\` is C major; \`&key from diatonic(mode=dorian) D\` is D dorian; with the piece's own cells, \`&key from diatonic(mode=&mode) &tonic\` binds both, so a host's slider on either keeps working. A stepped mode is not yet a form (\`&mode step=…\` is an error that says so).
`,"modes/05-bell-and-scale":"---\nid: bell_and_scale\nassociation:\n  - point:\n      sync: 0.383\n      harm: 0.717\n      bite: 0.25\n      mood: 0.825\n    weight: 1\n    facet: mode\n  - point:\n      sync: 0.8\n      harm: 0.1\n      bite: 0.9\n    weight: 1\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&key, &bell, &agogo from &tonic\n&key scale(ionian, &tonic) step=1m*7\n&bell step=&key:pulse &highagogo &highagogo:0:.5 &highagogo:0:.7 &highagogo:0:.5 &highagogo:0:.6 &highagogo:0:.5 &highagogo:0:.7\n&agogo [&bell * .5]\n```\n\nThe West African standard bell pattern, x.x.xx.x.x.x, seven strokes over twelve pulses, has the major scale's intervals, 2 2 1 2 2 2 1 (the example `bell_and_scale`): both are `even(7, 12, 5)`, the diatonic necklace at the ionian's phase (decision 072; `even.test.ts`).\nSo one cell is both: `&key` is the major scale, the piece's main key, and stepped seven times a bar, each step as long as its interval, it is the bell's timeline, which `&bell` strikes (`step=&key:pulse`).\nThe repository's first fragment of two facets, a `mode`, ionian, and a `rhythm`, the bell, each at a place of its own: \"the bell is a world-music associated rhythm-facet and a western music associated harmony / scale-facet\" (the owner, decision 046).\n\nA stepped key that nothing plays doesn't turn, so a line over it (`over=&key`) reads the major scale as `&key scale(ionian, &tonic)` does, note for note; the tonic is left to the text that uses it, `&tonic`, as the mode fragments leave it (#290).\n`step=1m*7` lays the bell over the bar of any meter, as twelve twelfths: over 12/8 they are its pulses, the bell as it is played.\n\nSeven strokes of a high agogô (`&highagogo`, General MIDI's 67, a hole the General MIDI kit fills with its line), the example's accents, at half the level; its mix, `&agogo` (the level, no card: where its notes go is the workbench's, #291), is none of the drum bars' or the claves', so it layers on any of them.\nAs a rhythm its point is a timeline's: off the beat (sync 0.8), over one static chord (harm 0.1), struck (artic 0.9), steady and fairly dense (energy 0.6), where no preset is.\nAs a mode it is where the major is played: the centroid of the three presets that play ionian, Ambient's, Bossa nova's and Swing jazz's (each axis their mean, to three decimals), where no preset is, so at each of them the plain `ionian` is found first, at distance 0.\n\n**Its signature** (decision 065): `&key, &bell, &agogo from &tonic`. `&key, &bell, &agogo from bell_and_scale D` takes a copy of it, `&tonic` its main argument.\n","modes/06-harmonic-minor":`---
id: harmonic_minor
association:
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 1
    facet: mode
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 1
    facet: mode
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: mode
source: seed
lifted: yggi/cells examples/electroswing.md @ 2c120d4
---

\`\`\`cells
&key from &tonic
&key scale(harmonic, &tonic)
\`\`\`

The minor with a raised seventh: the gypsy jazz key of [Electro swing, in pieces](../../examples/electroswing.md), whose vamp's fifth is then a major chord, a dominant (\`[4,6,8]\` over D is A C♯ E), and whose line over it is the fifth's phrygian dominant.
It defines \`&key\`, the key (decision 047's interface name, decision 056, named since decision 060), and uses \`&tonic\`, a cell holding the key's tonic (\`&tonic D\`, #290), so it fits any workbench that has no key yet and gives the tonic; the harmonies and the bass lines read it (\`over=&key\`, then \`over=&harm\`).
The tonic is left to the text that uses it, a hole, as the other modes leave theirs.

At a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 1, Jambot's to adopt (decision 041); Jambot's composer has no harmonic minor among its modes yet (\`COMPOSER_MODES\`, yggi/jambot packages/engine/src/key.ts).
Also at the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1: the key of [Spooky, in pieces](../../examples/spooky.md), its augmented second between the sixth and the seventh the sound of a horror film's minor.

**Its signature** (decision 065): \`&key from &tonic\`. \`&key from harmonic_minor D\` takes a copy of it, \`&tonic\` its main argument.
`,"modules/01-osc":"---\nid: osc\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&osc from (&pitch)\n&osc s=saw loop=C3 pitch=&pitch\n&pitch 0\n```\n\nAn oscillator, a modular's VCO (decision 067 §3): a voice, and its jack is its pitch.\nA voice is an oscillator already (`&saw s=saw loop=C2`); this fragment gives it a panel, so that every module of a patch is written, and drawn, alike.\n\n**Its jack**, `&pitch` (default `0`, no bend): a voice's own pitch on every note, in semitones (`pitch=`, sound.md), the input a modular's exponential FM is. Patch a slow wave into it for a drift or a vibrato: `osc(pitch=&(map=lin loop=&bar/4 0 .12 0))`, or the seed's `vibrato`.\n**Its wave and its register** are its head's: a saw on C3 where the use says nothing, and the use's own attributes before `from` where it does (decision 065 §4), `&sub s=square loop=C1 from osc(pitch=&drift)`. A wave is a word, not a cell, so it is no jack.\nIts notes come from the product that plays it, as any voice's do (`[&tune * &osc]`): a modular's 1 V/oct and gate are the melody's pitch and onsets ([nets.md](../../docs/notes/nets.md)).\n\n**Its signature** (decision 065): `&osc from (&pitch)`, no main parameter. `&lead from osc` takes a copy of it, named `&lead`.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight, as an instrument is: a module is no style's. In a patch it is the VCO.\n","modules/02-lowpass":"---\nid: lowpass\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&lowpass from (&cutoff, &res, &eg) &in\n&lowpass lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA resonant low-pass filter, a modular's VCF (decision 067 §3): an instrument whose sound parameters act on what its voices play, in series after each voice's own (decision 067 §1), so one filter follows a mix of oscillators.\n\n**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place, `&vcf from lowpass [&saw, &sub * .5]`.\n**Its jacks**, each a knob at its default when nothing is patched in, each a share from 0 to 1 of its range:\n- `&cutoff` (default `.5`): where the cutoff sits, from 70 Hz to 4800 Hz. Patch a slow wave in for a sweep (`cutoff=&sweep`, with `&sweep loop=&bar/16 from lfo`).\n- `&res` (default `.3`): the resonance, from 4 to 16 (`lpq=`, Web Audio's Q in dB): at the top it rings at the cutoff.\n- `&eg` (default held at 1, no contour): an envelope that opens it on every note, a modular's contour generator (`eg=&contour`, with `&contour map=adsr .002 .2 .1 .1`, or one of the seed's `envelopes`).\nThe three multiply, as a moving parameter's cells do (sound.md): an envelope scaled by the knob, the knob moved by the LFO.\n\n**Its signature** (decision 065): `&lowpass from (&cutoff, &res, &eg) &in`. A cable is a reference argument, the piece's own cell, so a slider on it keeps working through the filter. Patched into nothing, a jack is its knob.\nIts own attributes, before `from`, are the head's: `&vcf delay=.3 delaytime=&bar*3/16 from lowpass …` sends what it filters to an echo.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the VCF.\n","modules/03-highpass":`---
id: highpass
association:
  - point:
      sync: 0.5
      harm: 0.5
      bite: 0.5
    weight: 0.25
    facet: module
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

Associated once, as the facet \`module\`, at the centre of style space, at a quarter weight; in a patch, the high-pass (HPF).
`,"modules/04-amp":"---\nid: amp\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&amp from (&eg, &level) &in\n&amp [&eg * &level * &in]\n&eg map=adsr .005 .2 .7 .1\n&level map=amp 1\n```\n\nAn amplifier, a modular's VCA (decision 067 §3): an instrument with an envelope and a level, the volumes that act on what it plays acting on each of its voices (mix.md: a pitch or a volume on a mix acts on each voice).\nIt is what an instrument with an envelope always was, `[&(map=adsr …) * &saw]`, with jacks.\n\n**Its input**, the main parameter `&in`: what it shapes, a voice, a filter, a mix.\n**Its jacks**:\n- `&eg` (default a struck and held shape: 5 ms up, a fall over .2 s to .7, a release of .1 s): the envelope on every note. An inline one is a cell of its own, `amp(eg=&(map=adsr .002 .3 .5 .06))`, its slots changed where it says; or one of the seed's `envelopes`, `amp(eg=&pluck)`.\n- `&level` (default `1`): a level over time, a volume (`map=amp`, `map=lin`, `map=db`): accents, a swell, a tremolo from a fast LFO.\n\n**Its signature** (decision 065): `&amp from (&eg, &level) &in`.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the VCA.\n","modules/05-lfo":"---\nid: lfo\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&lfo from\n&lfo map=lin loop=.5 sin(12)\n```\n\nA low-frequency oscillator, a modular's LFO (decision 067 §3): a sine, ramped (`map=lin`) through its twelve points, turning once every two seconds. Read by a jack, its −1…1 is a share from 0 to 1, its middle at .5 (decision 067 §5).\nAn LFO is a braid turned slowly, as a voice is one turned fast (sound.md): patched into a jack, it moves what the jack moves (`lowpass(cutoff=&sweep)`, `osc(pitch=&wobble)`).\n\n**Its rate** is its head's `loop=`, as any cell's: a use sets it before `from` (decision 065 §4), in seconds a lap or as a clock, so it keeps time with the piece: `&sweep loop=&bar/16 from lfo` comes round once every eight bars of 4/4, and `&wobble loop=&bar*2 from lfo` once a beat. Its shape is its braid; a use that wants another writes its own cell. A bipolar braid (one that runs below 0: `saw(8)`, `tri(4)`, `square(2)`) is read the same way, as (1 + x)/2; one that stays at 0 or above, as written.\n\n**Its signature** (decision 065): `&lfo from`, the head alone. `&sweep from lfo` takes a copy of it, named `&sweep`.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight; in a patch it is the LFO.\n","modules/06-sh":`---
id: sh
association:
  - point:
      sync: 0.5
      harm: 0.5
      bite: 0.5
    weight: 0.25
    facet: module
source: seed
---

\`\`\`cells
&sh from
&sh step=8n [0|.25|.5|.75|1]
\`\`\`

A sample and hold, a modular's S&H (decision 067 §3): on every eighth a value from 0 to 1 is taken at random and held until the next, patched into a jack, \`lowpass(res=&jitter)\` with \`&jitter from sh\`.
Its randomness is the language's own chance (decision 031): a choice \`[a|b|c]\`, drawn each lap, keyed on the seed, the cell, the lap and the step, so a piece plays the same each time it is played, and \`seed=\` gives another sequence. A level or a parameter draws it as a melody does (#457).

**Its clock** is its head's \`step=\`: a use sets it before \`from\`, \`&jitter step=16n from sh\`, or patches a clock in by tapping another meter. Its five values are its braid: a use that wants others writes its own cell.

**Its signature** (decision 065): \`&sh from\`, the head alone.

Associated once, as the facet \`module\`, at the centre of style space, at a quarter weight; in a patch it is the S&H.
`,"modules/07-bandpass":"---\nid: bandpass\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&bandpass from (&cutoff, &res, &eg) &in\n&bandpass bpf=100..5000 * &eg * &cutoff bpq=.5..12 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA band-pass filter (decision 074): it lets a band around its centre through and takes away what is above and below it, the third of superdough's filters after the low-pass and the high-pass. An instrument, as the `lowpass` module is (decision 067), in series after each voice's own filters.\n\n**Its input**, the main parameter `&in`: what it filters, a voice or a mix written in place, `&vcf from bandpass [&saw, &noise * .3]`.\n**Its jacks**, each a share from 0 to 1 of its range, at its default when nothing is patched in:\n- `&cutoff` (default `.5`): the band's centre, from 100 Hz to 5000 Hz. Patch a slow wave in for a sweep, a wah (`cutoff=&sweep`).\n- `&res` (default `.3`): its Q, from .5 to 12 (`bpq=`, read linearly as Web Audio's band-pass reads it: the centre over the bandwidth). Higher is a narrower band.\n- `&eg` (default held at 1): an envelope that moves the centre on every note.\n\n**Its signature** (decision 065): `&bandpass from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight.\n","modules/08-lowpass24":"---\nid: lowpass24\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n    weight: 0.25\n    facet: module\nsource: seed\n---\n\n```cells\n&lowpass24 from (&cutoff, &res, &eg) &in\n&lowpass24 lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&stage]\n&stage lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]\n&cutoff map=lin .5\n&res map=lin .3\n&eg map=adsr 0 0 1 0\n```\n\nA 24 dB low-pass (decision 074): two of the `lowpass` module's stages in series, each at the same cutoff and resonance, so it falls twice as steeply above its cutoff and rings harder at it. That is superdough's `24db` exactly, written out: two filters in a row are two stages (decision 067), so a steeper slope is a composition, not a new kind of filter.\n\n**Its input**, the main parameter `&in`: what it filters, `&vcf from lowpass24 [&saw, &sub * .5]`.\n**Its jacks** are the `lowpass` module's: `&cutoff` (default `.5`, 70 Hz to 4800 Hz), `&res` (default `.3`, 4 to 16, Web Audio's Q in dB, on each stage) and `&eg` (default held at 1). One cable moves both stages alike.\n**`&stage`** is its first stage, its own: each use of it has its own.\n\n**Its signature** (decision 065): `&lowpass24 from (&cutoff, &res, &eg) &in`, as the `lowpass` module's.\n\nAssociated once, as the facet `module`, at the centre of style space, at a quarter weight.\n","motifs/01-hook":"---\nid: hook\nassociation:\n  - point:\n      sync: 0.3\n      harm: 0.45\n      bite: 0.55\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&hook from &key\n&hook over=&key step=8n 4 4 3 2@2 ~ 0 2\n```\n\nA pop hook: the fifth twice, stepping down to the third and held, a breath, then the tonic and up a step, so it asks to come round again. Written by hand for Synth-pop's minor (aeolian), its sung, fairly short notes.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&hook`), so `use &hook` takes it; a form reads it as its `&call` (`&call step=8n &hook`), the line the form moves and answers.\n\nAt Synth-pop's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&hook from &key`. `&hook from hook &key` takes a copy of it, `&key` its main argument.\n","motifs/02-octaves":"---\nid: octaves\nassociation:\n  - point:\n      sync: 0.12\n      harm: 0\n      bite: 1\n      mood: 0.4\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&octaves from &key\n&octaves over=&key step=8n 0 ~ 7 ~ 0 0 ~ 7\n```\n\nThe tonic and its octave, struck short on and off the beat: the line a techno track rides a filter over, its pitch all in two notes. Written by hand for Techno, where the harmony stands still and every note is staccato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&octaves`), so `use &octaves` takes it; a form reads it as its `&call` (`&call step=8n &octaves`), the line the form moves and answers.\n\nAt Techno's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&octaves from &key`. `&octaves from octaves &key` takes a copy of it, `&key` its main argument.\n","motifs/03-sigh":"---\nid: sigh\nassociation:\n  - point:\n      sync: 0.35\n      harm: 0.55\n      bite: 0.65\n      mood: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&sigh from &key\n&sigh over=&key step=8n 4@3 3 2@2 ~ ~\n```\n\nA sigh: the fifth held, falling by step to the third and held again, then two beats of air. Written by hand for Deep house's dorian, a vocal hook's shape over a vamp.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&sigh`), so `use &sigh` takes it; a form reads it as its `&call` (`&call step=8n &sigh`), the line the form moves and answers.\n\nAt Deep house's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&sigh from &key`. `&sigh from sigh &key` takes a copy of it, `&key` its main argument.\n","motifs/04-rising":"---\nid: rising\nassociation:\n  - point:\n      sync: 0.05\n      harm: 0.3\n      bite: 0\n      mood: 0.9\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&rising from &key\n&rising over=&key step=8n 0@2 2@2 4@4\n```\n\nThe triad rising slowly, tonic, third, fifth, the last held half the bar: the owner's own example of a motif's name (#288). Written by hand for Ambient, legato and sparse.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&rising`), so `use &rising` takes it; a form reads it as its `&call` (`&call step=8n &rising`), the line the form moves and answers.\n\nAt Ambient's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&rising from &key`. `&rising from rising &key` takes a copy of it, `&key` its main argument.\n","motifs/05-lazy":"---\nid: lazy\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.75\n      bite: 0.35\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&lazy from &key\n&lazy over=&key step=8n ~ 2 4 ~ 3@2 2 0\n```\n\nLate in, up to the fifth, then down by step to the tonic, the fourth held: a lazy line behind the beat. Written by hand for Lo-fi hip hop's minor, its swung eighths.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lazy`), so `use &lazy` takes it; a form reads it as its `&call` (`&call step=8n &lazy`), the line the form moves and answers.\n\nAt Lo-fi hip hop's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&lazy from &key`. `&lazy from lazy &key` takes a copy of it, `&key` its main argument.\n","motifs/06-riff":"---\nid: riff\nassociation:\n  - point:\n      sync: 1\n      harm: 0.12\n      bite: 0.85\n      mood: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&riff from &key\n&riff over=&key step=8n 0 ~ 3 0 ~ 4 3 ~\n```\n\nA funk riff: the tonic, the fourth and the fifth, all off and on the beat in short strokes. Written by hand for Funk's dorian, at its most syncopated and staccato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&riff`), so `use &riff` takes it; a form reads it as its `&call` (`&call step=8n &riff`), the line the form moves and answers.\n\nAt Funk's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&riff from &key`. `&riff from riff &key` takes a copy of it, `&key` its main argument.\n","motifs/07-tresillo":"---\nid: tresillo\nassociation:\n  - point:\n      sync: 0.75\n      harm: 0.85\n      bite: 0.45\n      mood: 0.9\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&tresillo from &key\n&tresillo over=&key step=8n 4@3 2@3 0@2\n```\n\nThe fifth, the third and the tonic falling on the tresillo's 3 + 3 + 2. Written by hand for Bossa nova, its melody on the clave's long-long-short.\nIts durations, 3 3 2 eighths, are `even(3, 8, 2)`, three as even as three go over eight (decision 072; `even.test.ts`); the cinquillo is its five, `even(5, 8, 2)`.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&tresillo`), so `use &tresillo` takes it; a form reads it as its `&call` (`&call step=8n &tresillo`), the line the form moves and answers.\n\nAt Bossa nova's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&tresillo from &key`. `&tresillo from tresillo &key` takes a copy of it, `&key` its main argument.\n","motifs/08-bebop":"---\nid: bebop\nassociation:\n  - point:\n      sync: 0.35\n      harm: 1\n      bite: 0.3\n      mood: 0.85\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&bebop from &key\n&bebop over=&key step=8n 0 2 4 6 7@2 6 4\n```\n\nUp the seventh chord to the octave, held, and back down through the seventh: a bebop arpeggio. Written by hand for Swing jazz, where the harmony moves most.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&bebop`), so `use &bebop` takes it; a form reads it as its `&call` (`&call step=8n &bebop`), the line the form moves and answers.\n\nAt Swing jazz's point (`styles`), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&bebop from &key`. `&bebop from bebop &key` takes a copy of it, `&key` its main argument.\n","motifs/09-gypsy":"---\nid: gypsy\nassociation:\n  - point:\n      sync: 0.55\n      harm: 0.75\n      bite: 0.6\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 7622a87\n---\n\n```cells\n&gypsy from &key\n&gypsy over=&key step=8n 4 5 6 7@2 6 4@2\n```\n\nThe clarinet's call of [Electro swing, in pieces](../../examples/electroswing.md): A B♭ C♯ D and back to A in D harmonic minor, the fifth climbing through the minor sixth and the leading note to the octave, gypsy jazz's run.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&gypsy`), so `use &gypsy` takes it; a form reads it as its `&call` (`&call step=8n &gypsy`), the line the form moves and answers.\n\nAt the point proposed for an Electro swing preset (sync 0.55, harm 0.75, bite 0.6, mood 0.5), as the example's other seeds are: Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&gypsy from &key`. `&gypsy from gypsy &key` takes a copy of it, `&key` its main argument.\n","motifs/10-dies-irae":"---\nid: diesIrae\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.3\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&diesIrae from &key\n&diesIrae over=&key step=8n 2 1 2 0 1 -1 0@2\n```\n\nThe head of the *Dies irae*, the plainchant of the day of wrath, which Berlioz, Liszt, Saint-Saëns and a century of horror films quote: the third, the second, the third, the tonic, the second, the note below the tonic, and the tonic held (F E F D E C D in D minor; C♯ in harmonic minor, which makes it darker still). The chant is in the public domain.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&diesIrae`), so `use &diesIrae` takes it; a form reads it as its `&call` (`&call step=8n &diesIrae`), the line the form moves and answers.\nAt the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1, Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&diesIrae from &key`. `&diesIrae from diesIrae &key` takes a copy of it, `&key` its main argument.\n","motifs/11-refrain":"---\nid: refrain\nassociation:\n  - point:\n      sync: 0.3\n      harm: 0.45\n      bite: 0.65\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&refrain from &key\n&refrain over=&key step=8n 2 2 2 4@2 3 2 0\n```\n\nThe refrain under the hook: the third three times, up to the fifth and held, then stepping down home. Written by hand for Synth-pop's minor (aeolian), a sung line that lands where the hook only asks.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&refrain`), so `use &refrain` takes it; a form reads it as its `&call` (`&call step=8n &refrain`), the line the form moves and answers.\n\nNear Synth-pop's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `hook` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&refrain from &key`. `&refrain from refrain &key` takes a copy of it, `&key` its main argument.\n","motifs/12-pulse":"---\nid: pulse\nassociation:\n  - point:\n      sync: 0.12\n      harm: 0\n      bite: 0.9\n      mood: 0.4\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&pulse from &key\n&pulse over=&key step=8n 0 ~ 0 ~ 2 ~ 0 ~\n```\n\nThe tonic struck on every beat and the third once, all short: a line that is mostly rhythm, as a techno lead is. Written by hand for Techno, where the harmony stands still.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&pulse`), so `use &pulse` takes it; a form reads it as its `&call` (`&call step=8n &pulse`), the line the form moves and answers.\n\nNear Techno's point, 0.1 lower in bite (its energy offset, #572, the other way: Techno's bite is 1), so a query there finds `octaves` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&pulse from &key`. `&pulse from pulse &key` takes a copy of it, `&key` its main argument.\n","motifs/13-soul":"---\nid: soul\nassociation:\n  - point:\n      sync: 0.35\n      harm: 0.55\n      bite: 0.75\n      mood: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&soul from &key\n&soul over=&key step=8n 4 ~ 4 3 4@2 2@2\n```\n\nThe fifth twice, a turn through the fourth and back, then down to the third and held: a vocal ad lib over a vamp. Written by hand for Deep house's dorian.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&soul`), so `use &soul` takes it; a form reads it as its `&call` (`&call step=8n &soul`), the line the form moves and answers.\n\nNear Deep house's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `sigh` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&soul from &key`. `&soul from soul &key` takes a copy of it, `&key` its main argument.\n","motifs/14-drift":"---\nid: drift\nassociation:\n  - point:\n      sync: 0.05\n      harm: 0.3\n      bite: 0.1\n      mood: 0.9\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&drift from &key\n&drift over=&key step=8n 4@4 3@4\n```\n\nTwo notes, the fifth and the fourth, half a bar each: a line that barely moves, legato and sparse. Written by hand for Ambient.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&drift`), so `use &drift` takes it; a form reads it as its `&call` (`&call step=8n &drift`), the line the form moves and answers.\n\nNear Ambient's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `rising` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&drift from &key`. `&drift from drift &key` takes a copy of it, `&key` its main argument.\n","motifs/15-dusty":"---\nid: dusty\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.75\n      bite: 0.45\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&dusty from &key\n&dusty over=&key step=8n ~ 0 2 ~ 4 2@3\n```\n\nLate in on the tonic, up through the third to the fifth and back to the third, held to the bar's end: a line that sits behind the beat. Written by hand for Lo-fi hip hop's minor and its swung eighths.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&dusty`), so `use &dusty` takes it; a form reads it as its `&call` (`&call step=8n &dusty`), the line the form moves and answers.\n\nNear Lo-fi hip hop's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `lazy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&dusty from &key`. `&dusty from dusty &key` takes a copy of it, `&key` its main argument.\n","motifs/16-slap":"---\nid: slap\nassociation:\n  - point:\n      sync: 1\n      harm: 0.12\n      bite: 0.95\n      mood: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&slap from &key\n&slap over=&key step=8n 0 0 ~ 6 0 ~ 4 ~\n```\n\nThe tonic twice, the flat seventh off the beat, the tonic, then the fifth: short and syncopated, the bass player's lick taken up by the lead. Written by hand for Funk's dorian.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&slap`), so `use &slap` takes it; a form reads it as its `&call` (`&call step=8n &slap`), the line the form moves and answers.\n\nNear Funk's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `riff` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&slap from &key`. `&slap from slap &key` takes a copy of it, `&key` its main argument.\n","motifs/17-saudade":"---\nid: saudade\nassociation:\n  - point:\n      sync: 0.75\n      harm: 0.85\n      bite: 0.55\n      mood: 0.9\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&saudade from &key\n&saudade over=&key step=8n 2 ~ 3 2 ~ 1 0@2\n```\n\nThe third, the fourth and back, then falling by step to the tonic and held: a sigh between the guitar's chords. Written by hand for Bossa nova.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&saudade`), so `use &saudade` takes it; a form reads it as its `&call` (`&call step=8n &saudade`), the line the form moves and answers.\n\nNear Bossa nova's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `tresillo` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&saudade from &key`. `&saudade from saudade &key` takes a copy of it, `&key` its main argument.\n","motifs/18-blue":"---\nid: blue\nassociation:\n  - point:\n      sync: 0.35\n      harm: 1\n      bite: 0.4\n      mood: 0.85\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&blue from &key\n&blue over=&key step=8n 4 3 2 1 0@2 -2@2\n```\n\nDown the scale from the fifth to the tonic and on to the sixth below, held: the line that ends a chorus on the sixth. Written by hand for Swing jazz.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&blue`), so `use &blue` takes it; a form reads it as its `&call` (`&call step=8n &blue`), the line the form moves and answers.\n\nNear Swing jazz's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `bebop` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&blue from &key`. `&blue from blue &key` takes a copy of it, `&key` its main argument.\n","motifs/19-lindy":"---\nid: lindy\nassociation:\n  - point:\n      sync: 0.55\n      harm: 0.75\n      bite: 0.7\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&lindy from &key\n&lindy over=&key step=8n 0@3 4@3 2@2\n```\n\nThe tonic, the fifth and the third on the Charleston's 3 + 3 + 2, as a Lindy hop dances it: the swing era's dance, which electro swing samples. Written by hand for Electro swing's harmonic minor.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lindy`), so `use &lindy` takes it; a form reads it as its `&call` (`&call step=8n &lindy`), the line the form moves and answers.\n\nNear Electro swing's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `gypsy` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&lindy from &key`. `&lindy from lindy &key` takes a copy of it, `&key` its main argument.\n","motifs/20-toll":"---\nid: toll\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.4\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&toll from &key\n&toll over=&key step=8n 0@4 -3@4\n```\n\nA bell tolling: the tonic, then the fifth below, half a bar each. Written by hand for Spooky, the knell before the chant.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&toll`), so `use &toll` takes it; a form reads it as its `&call` (`&call step=8n &toll`), the line the form moves and answers.\n\nNear Spooky's point, 0.1 higher in bite (its energy offset, #572), so a query there finds `diesIrae` first and this one 0.05 away (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&toll from &key`. `&toll from toll &key` takes a copy of it, `&key` its main argument.\n","motifs/21-waltz":"---\nid: waltzBar\nassociation:\n  - point:\n      sync: 0\n      harm: 0.7\n      bite: 0.3\n      mood: 0.9\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&waltzBar from &key\n&waltzBar over=&key step=8n 0@2 2 4 4@2\n```\n\nThe tonic held on the downbeat, then the third and the fifth, the fifth held into the next bar: a waltz's long first beat and its two light ones.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&waltzBar`), so `&waltzBar from waltzBar &key` takes it; a form reads it as its `&call` (`&call step=8n &waltzBar`), the line the form moves and answers.\n\nAt 3/4's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&waltzBar from &key`. `&waltzBar from waltzBar &key` takes a copy of it, `&key` its main argument.\n","motifs/22-music-box":"---\nid: musicBox\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.38\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&musicBox from &key\n&musicBox over=&key step=8n 4 3 4 1 2@2\n```\n\nThe fifth, the fourth and the fifth again, then down to the second and the third held: a music box running down, in three. Near Spooky, where 3/4 is found.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 3/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&musicBox`), so `use &musicBox` takes it; a form reads it as its `&call` (`&call step=8n &musicBox`), the line the form moves and answers.\n\nAt 3/4's point near Spooky (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&musicBox from &key`. `&musicBox from musicBox &key` takes a copy of it, `&key` its main argument.\n","motifs/23-rocking":"---\nid: rocking\nassociation:\n  - point:\n      sync: 0.3\n      harm: 0.2\n      bite: 0.2\n      mood: 0.825\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&rocking from &key\n&rocking over=&key step=8n 0@2 2 4@2 2\n```\n\nLong, short, long, short: a cradle's rock in two groups of three, from the tonic to the fifth and back to the third.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 6/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&rocking`), so `use &rocking` takes it; a form reads it as its `&call` (`&call step=8n &rocking`), the line the form moves and answers.\n\nAt 6/8's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&rocking from &key`. `&rocking from rocking &key` takes a copy of it, `&key` its main argument.\n","motifs/24-sway":"---\nid: sway\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.22\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&sway from &key\n&sway over=&key step=8n 0@3 -1 -2 -1\n```\n\nThe tonic held for half the bar, then a slow wobble down a step, two steps and back: a candle's flame in 6/8. Near Spooky, where 6/8 is found.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 6/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&sway`), so `use &sway` takes it; a form reads it as its `&call` (`&call step=8n &sway`), the line the form moves and answers.\n\nAt 6/8's point near Spooky (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&sway from &key`. `&sway from sway &key` takes a copy of it, `&key` its main argument.\n","motifs/25-fivefold":"---\nid: fivefold\nassociation:\n  - point:\n      sync: 0.4\n      harm: 0.9\n      bite: 0.5\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&fivefold from &key\n&fivefold over=&key step=8n 0 2 4@4 3 2 1@2\n```\n\nUp the triad to the fifth and held, the bar's first three beats, then down by step through its last two: five beats grouped 3 + 2.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 5/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&fivefold`), so `use &fivefold` takes it; a form reads it as its `&call` (`&call step=8n &fivefold`), the line the form moves and answers.\n\nAt 5/4's first point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&fivefold from &key`. `&fivefold from fivefold &key` takes a copy of it, `&key` its main argument.\n","motifs/26-limp":"---\nid: limp\nassociation:\n  - point:\n      sync: 0.8\n      harm: 0.6\n      bite: 1\n      mood: 0.375\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&limp from &key\n&limp over=&key step=8n 0 ~ 4 ~ 3 2 0\n```\n\nThe tonic, the fifth, then a run down to the tonic: short notes in 7/8's 2 + 2 + 3, the last group the long one.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 7/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&limp`), so `use &limp` takes it; a form reads it as its `&call` (`&call step=8n &limp`), the line the form moves and answers.\n\nAt 7/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&limp from &key`. `&limp from limp &key` takes a copy of it, `&key` its main argument.\n","motifs/27-dancer":"---\nid: dancer\nassociation:\n  - point:\n      sync: 0.6\n      harm: 0.9\n      bite: 0.8\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&dancer from &key\n&dancer over=&key step=8n 0 ~ 2 4 ~ 5 4 2 1 0\n```\n\nTen eighths as 3 + 3 + 2 + 2: a leap up to the sixth in the threes, then stepping home in the twos.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 10/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&dancer`), so `use &dancer` takes it; a form reads it as its `&call` (`&call step=8n &dancer`), the line the form moves and answers.\n\nAt 10/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&dancer from &key`. `&dancer from dancer &key` takes a copy of it, `&key` its main argument.\n","motifs/28-shuffle":"---\nid: shuffle\nassociation:\n  - point:\n      sync: 0.7\n      harm: 0.6\n      bite: 0\n      mood: 0.825\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&shuffle from &key\n&shuffle over=&key step=8n 0@2 2 3@2 4 4@2 2 0@2 ~\n```\n\nLong, short four times over the bar's four beats: the tonic, the third, the fourth, the fifth and back, a slow blues shuffle in 12/8.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 12/8: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&shuffle`), so `use &shuffle` takes it; a form reads it as its `&call` (`&call step=8n &shuffle`), the line the form moves and answers.\n\nAt 12/8's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&shuffle from &key`. `&shuffle from shuffle &key` takes a copy of it, `&key` its main argument.\n","motifs/29-march":`---
id: march
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.6
      mood: 0.45
    weight: 1
    facet: motif
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: motif
source: seed
---

\`\`\`cells
&march from &key
&march over=&key step=8n 4 4 0 ~
\`\`\`

The fifth twice, then the tonic, and a rest: a march's call, two beats to the bar.
It is a line of degrees of the key (\`over=&key\`), in eighths, one bar of 2/4: its hole is \`&key\`, and it taps the host's meter (\`step=8n\`), with no \`&bar\`, no voice and no card (#291).
Its head is named for it (\`&march\`), so \`use &march\` takes it; a form reads it as its \`&call\` (\`&call step=8n &march\`), the line the form moves and answers.

At 2/4's point (#369), weight 1, as the facet \`motif\`.

**Its signature** (decision 065): \`&march from &key\`. \`&march from march &key\` takes a copy of it, \`&key\` its main argument.

**At March's point too** (#542), weight 1, so the style finds it first.
`,"motifs/30-fanfare":"---\nid: fanfare\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.6\n      bite: 0.9\n      mood: 0.6\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&fanfare from &key\n&fanfare over=&key step=8n 0 0 0 2@2 4@2 ~\n```\n\nThe tonic three times, then the third and the fifth held: a fanfare's call, in two half-note beats.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4 alla breve: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&fanfare`), so `use &fanfare` takes it; a form reads it as its `&call` (`&call step=8n &fanfare`), the line the form moves and answers.\n\nAt 4/4 alla breve's point (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&fanfare from &key`. `&fanfare from fanfare &key` takes a copy of it, `&key` its main argument.\n","motifs/31-question":"---\nid: question\nassociation:\n  - point:\n      sync: 0.75\n      harm: 0.35\n      bite: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&question from &key\n&question over=&key step=8n 0 1 2@2 4@4\n```\n\nUp by step to the third, then a leap to the fifth held half the bar: a phrase that ends open, asking for an answer.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&question`), so `use &question` takes it; a form reads it as its `&call` (`&call step=8n &question`), the line the form moves and answers.\n\nWeight 1, as the facet `motif`, where call and answer is (below).\n\n**Its signature** (decision 065): `&question from &key`. `&question from question &key` takes a copy of it, `&key` its main argument.\n\n**Where it is found** (#540): where call and answer's idiom is (its form's point, #655: offbeat, little harmony, struck; naming no mood), since it is a call. It stood at the centre, `.5 .5 .5 .5`, for \"any style\".\n","motifs/32-reply":"---\nid: reply\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.5\n      mood: 0.45\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&reply from &key\n&reply over=&key step=8n 4 3 2@2 0@4\n```\n\nDown by step from the fifth to the third, then home to the tonic held half the bar: the closed answer to `question`. General-purpose.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&reply`), so `use &reply` takes it; a form reads it as its `&call` (`&call step=8n &reply`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in energy (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&reply from &key`. `&reply from reply &key` takes a copy of it, `&key` its main argument.\n","motifs/33-arpeggio":"---\nid: arpeggio\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.3\n      bite: 0.5\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&arpeggio from &key\n&arpeggio over=&key step=8n 0 2 4 7 4 2 0 ~\n```\n\nUp the triad to the octave and back down: the plainest line a chord gives. General-purpose, for plainer harmony.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&arpeggio`), so `use &arpeggio` takes it; a form reads it as its `&call` (`&call step=8n &arpeggio`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in harmony (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&arpeggio from &key`. `&arpeggio from arpeggio &key` takes a copy of it, `&key` its main argument.\n","motifs/34-run":"---\nid: run\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.7\n      bite: 0.5\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&run from &key\n&run over=&key step=8n 0 1 2 3 4 5 6 7\n```\n\nThe scale from the tonic to the octave, one note an eighth: in each mode it walks that mode. General-purpose, for richer harmony.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&run`), so `use &run` takes it; a form reads it as its `&call` (`&call step=8n &run`), the line the form moves and answers.\n\nAt the centre, 0.2 higher in harmony (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&run from &key`. `&run from run &key` takes a copy of it, `&key` its main argument.\n","motifs/35-neighbour":"---\nid: neighbour\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.3\n      mood: 0.5\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&neighbour from &key\n&neighbour over=&key step=8n 0 1 0 -1 0@4\n```\n\nThe tonic, the note above, the tonic, the note below, and the tonic held: the neighbour notes round one pitch. General-purpose, legato.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&neighbour`), so `use &neighbour` takes it; a form reads it as its `&call` (`&call step=8n &neighbour`), the line the form moves and answers.\n\nAt the centre, 0.2 lower in articulation (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&neighbour from &key`. `&neighbour from neighbour &key` takes a copy of it, `&key` its main argument.\n","motifs/36-leap":"---\nid: leap\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.5\n      bite: 0.7\n      mood: 0.65\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&leap from &key\n&leap over=&key step=8n 0@2 4@2 3 2 1 0\n```\n\nThe tonic, a leap to the fifth, then stepping back down the scale: a leap balanced by steps. General-purpose, short notes.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&leap`), so `use &leap` takes it; a form reads it as its `&call` (`&call step=8n &leap`), the line the form moves and answers.\n\nAt the centre, 0.2 higher in articulation (#369), weight 1, as the facet `motif`.\n\n**Its signature** (decision 065): `&leap from &key`. `&leap from leap &key` takes a copy of it, `&key` its main argument.\n","motifs/37-wail":"---\nid: wail\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.27\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&wail from &key\n&wail over=&key step=8n 4@3 3#@2 3@3\n```\n\nA held note that sags: the fifth held, then a semitone lower and a semitone lower again, as a ghost's moan bends down (A, G♯, G in D harmonic minor).\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&wail`), so `use &wail` takes it; a form reads it as its `&call` (`&call step=8n &wail`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.03 lower in bite (#674: its energy offset, #572, would put it on `lament`'s point, 0.05 lower; its articulation above `lament`'s keeps them apart, as on the old axes), weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&wail from &key`. `&wail from wail &key` takes a copy of it, `&key` its main argument.\n","motifs/38-haunt":"---\nid: haunt\nassociation:\n  - point:\n      sync: 0.15\n      harm: 0.9\n      bite: 0.25\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&haunt from &key\n&haunt over=&key step=8n 2 4 6 9 6 4 2@2\n```\n\nThe augmented triad on the third, up and back: the third, the fifth, the raised seventh, the third an octave up, and down again (F A C♯ F C♯ A F in D harmonic minor), each step a major third, so no note sounds like home.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&haunt`), so `use &haunt` takes it; a form reads it as its `&call` (`&call step=8n &haunt`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in sync and bite, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&haunt from &key`. `&haunt from haunt &key` takes a copy of it, `&key` its main argument.\n","motifs/39-lament":"---\nid: lament\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.25\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&lament from &key\n&lament over=&key step=8n 4 3# 3 2# 2 1 0@2\n```\n\nA chromatic descent from the fifth to the tonic, semitone by semitone where the key allows (A G♯ G F♯ F E D in D harmonic minor): the lament's falling line, made to creep.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&lament`), so `use &lament` takes it; a form reads it as its `&call` (`&call step=8n &lament`), the line the form moves and answers.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&lament from &key`. `&lament from lament &key` takes a copy of it, `&key` its main argument.\n","motifs/40-peek":"---\nid: peek\nassociation:\n  - point:\n      sync: 0.3\n      harm: 0.9\n      bite: 0.3\n      mood: 0.3\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&peek from &key\n&peek over=&key step=8n ~ 0 1b 0 ~ ~ -1 0\n```\n\nSomething peeks and hides: a rest, the tonic and the flat second above it and back, a silence, then the leading note below and the tonic (D E♭ D, C♯ D): the semitones on either side of home, the boo that comes when the back is turned.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&peek`), so `use &peek` takes it; a form reads it as its `&call` (`&call step=8n &peek`), the line the form moves and answers.\nIts two rests are written apart (`~ ~`), not held (`~@2`), which plays the same: cells' vary reads no line with a held rest, so it would offer no variation of it, and the recogniser no answer.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.1 higher in sync and 0.05 lower in bite (its energy offset, #572), weight 1, as the facet `motif`: one of the ghost-house idioms, a gesture of the genre and no quotation of any tune.\n\n**Its signature** (decision 065): `&peek from &key`. `&peek from peek &key` takes a copy of it, `&key` its main argument.\n","motifs/47-rave-hook":`---
id: raveHook
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&raveHook from &key
&raveHook over=&key step=8n 11!2 13 11 10 9 10@2
\`\`\`

The hook of [Hypercell](../../examples/hypercell.md), its first bar: an upper note struck twice, a leap a third up, and down by step to rest a beat. The example writes it in semitones over C; here it is in the degrees of a minor key, so it sits in any key it is given.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1, as the facet \`motif\` (#572).
`,"motifs/48-sequencer":`---
id: sequencer
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&sequencer from &key
&sequencer over=&key step=8n 0 2 4 7 0 2 4 7
\`\`\`

The sequencer arpeggio of [Zelluläre Aktivität](../../examples/zell.md): the triad and its octave, up, twice a bar in eighths, the sequencer's figure (the example runs it in sixteenths, four times a bar; a motif is a bar of eighths, as every form reads it).

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`motif\` (#572).
`,"motifs/49-melodie":`---
id: melodie
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.75
      mood: 0.45
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&melodie from &key
&melodie over=&key step=8n 4@2 2 1 0@4
\`\`\`

The melody of [Zelluläre Aktivität](../../examples/zell.md), its first bar: the fifth held, down by step to the tonic, held half the bar, plain over the arpeggio.

Near Elektro's point, 0.1 lower in bite (sync .15, harm .5, bite .75, mood .45), weight 1, as the facet \`motif\`, so a query there finds \`sequencer\` first and this one 0.05 away (#572).
`,"motifs/50-ghost-phrase":`---
id: ghostPhrase
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&ghostPhrase from &key
&ghostPhrase over=&key step=8n 0 4 3 ~ 7 5 ~ ~
\`\`\`

The piano's phrase of [Ghost-Cells](../../examples/ghosts.md): the tonic, the fifth, the fourth, the octave and the sixth, with rests between. The example plays it seven eighths long over a bar of eight, so it comes round a step later each bar; as a motif it is one bar of eighths, its eighth a rest, as every form reads one.

At Dark ambient's point (sync .35, harm .15, bite .4, mood .1), weight 1, as the facet \`motif\` (#572).
`,"motifs/51-royal-theme":`---
id: royalTheme
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/ricercar.md @ 3504291b
---

\`\`\`cells
&royalTheme from &key
&royalTheme over=&key step=8n 0@2 2@2 4@2 5@2
\`\`\`

The King's theme of [Ricercar](../../examples/ricercar.md), its first bar: the tonic, the third, the fifth and the sixth, a quarter each, rising, the subject Frederick the Great gave Bach for the *Musical Offering*. Public domain.

At Baroque's point (sync 0.15, harm 0.8, bite 0.5, mood 0.85), weight 1, as the facet \`motif\` (#542).
`,"motifs/52-blues-riff":`---
id: bluesRiff
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&bluesRiff from &key
&bluesRiff over=&key step=8n 0 2 3 4 ~ 6 4 ~
\`\`\`

The riff of [Swing blues](../../examples/jazz.md), its first bar: up from the tonic to the fifth, a leap to the seventh and back. The example plays it on the blues scale, its blue notes included; here it is in the key's degrees, so a mixolydian key gives it its flat seventh.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45, mood 0.65), weight 1, as the facet \`motif\` (#542).
`,"motifs/53-drunken-sailor":`---
id: drunkenSailor
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&drunkenSailor from &key
&drunkenSailor over=&key step=8n 4 4 4 4 4 4 0 2
\`\`\`

The tune of [Drunken Sailor](../../examples/sailor.md), its first bar: the fifth struck six times, *what shall we do with the*, then down to the tonic and up a third. A traditional sea shanty, public domain, in its dorian key.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7, mood 0.65), weight 1, as the facet \`motif\` (#542).
`,"motifs/54-korobeiniki":`---
id: korobeinikiBar
association:
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: motif
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&korobeinikiBar from &key
&korobeinikiBar over=&key step=8n 7@2 2 3 5@2 3 2
\`\`\`

The tune of [Korobeiniki](../../examples/korobeiniki.md), its first bar: the octave held, a leap down to the third, up by step to the fifth and back. A Russian folk song, public domain, known to many from a falling-blocks video game.

At Chiptune's point (sync 0.3, harm 0.7, bite 1, mood 0.55), weight 1, as the facet \`motif\` (#542).
`,"motifs/55-guajeo":"---\nid: guajeo\nassociation:\n  - point:\n      sync: 0.9\n      harm: 0.5\n      bite: 0.7\n      mood: 0.75\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&guajeo from &key\n&guajeo over=&key step=8n ~ 2 4 ~ 2 4 ~ 7\n```\n\nA guajeo, the piano's ostinato in a montuno: the third and the fifth off the beat, twice, and the octave on the last off-beat, every downbeat left out.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&guajeo`), so `use &guajeo` takes it; a form reads it as its `&call` (`&call step=8n &guajeo`), the line the form moves and answers.\n\nAt Salsa's point (sync 0.9, harm 0.5, bite 0.7, mood 0.75), weight 1, as the facet `motif` (#542).\n\n**Its signature** (decision 065): `&guajeo from &key`. `&guajeo from guajeo &key` takes a copy of it, `&key` its main argument.\n","motifs/56-smoke":"---\nid: smoke\nassociation:\n  - point:\n      sync: 0.7\n      harm: 0.2\n      bite: 0.2\n      mood: 0.25\n    weight: 1\n    facet: motif\nsource: seed\n---\n\n```cells\n&smoke from &key\n&smoke over=&key step=8n 4@3 3 2@2 0 ~\n```\n\nA slow line falling through the minor key, the fifth held, then the fourth, the third and the tonic, and a breath: trip-hop's sung lament.\nIt is a line of degrees of the key (`over=&key`), in eighths, one bar of 4/4: its hole is `&key`, and it taps the host's meter (`step=8n`), with no `&bar`, no voice and no card (#291).\nIts head is named for it (`&smoke`), so `use &smoke` takes it; a form reads it as its `&call` (`&call step=8n &smoke`), the line the form moves and answers.\n\nAt Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 1, as the facet `motif` (#542).\n\n**Its signature** (decision 065): `&smoke from &key`. `&smoke from smoke &key` takes a copy of it, `&key` its main argument.\n","performers/01-drums":`---
id: drums_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: performer
source: seed
---

\`\`\`cells
&drums, &drumsOut from (&kit) &drumlines
&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit
&kit &bd &rim &sd &cp &lt &hh &ph &mt &oh &ht &cr &rd &claves
&drumsOut play=&drumlines &kit
&drums map=role &drumsOut
\`\`\`

The drummer (decisions 058 and 061, #287): a gate, \`&drumsOut\` (named as Jambot's section text names its gates), whose role is \`drums\` (\`&drums map=role &drumsOut\`), playing the part \`&drumlines\` on 13 of the General MIDI kit's voices, which it takes by name.
The part is a stack of lines, one per role, as Jambot's section text writes its drums (yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b, \`drumLines\`): \`&drumlines [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\`.
A gate plays a stack line by line, each as if it were its one line, so every hit still says which line struck it (\`kit:voices:kick:…\`), the drum role the feel reads (\`contracts/feel\` v1.1).
Each line names its own voices, and a hit its level either way, as Strudel has it: its own gain (\`&bd:0:.645 ~ ~ &bd\`, \`s("bd:0:.645 ~ ~ bd")\`), or the line times a line of levels in the stack (\`&euclid * &euclidLevel\`, \`s("rim(7,16)").gain("…")\`), read at each note's written step, so a straight Euclid under a swung meter keeps its levels, and a number (\`&clave * .5\`). So the drummer has no level of its own, and its one hole is the score's: \`&drumlines\`.
Its kit is the drummer's own set-up of those 13 voices, the kick, the side stick, the snare, the clap, three toms, the closed, pedal and open hats, the crash, the ride and the claves, a table (\`&kit\`): a line that strikes a voice the kit doesn't hold is an error.

Associated as the facet \`performer\` at each of Jambot's eight presets' points (\`styles\`), at weight 1: every preset's section text plays its drums the same way, on these 13 voices on channel 10, so the eight share this one drummer, and what a preset's drums sound like is its lines, not its player.

**Its signature** (decision 065): \`&drums, &drumsOut from (&kit) &drumlines\`. \`&drums from drums_performer &groove\` takes a copy of it, \`&drumlines\` its main argument; \`&kit\` an optional parameter, its line its default (\`"drums_performer"(kit=…)\`).
`,"performers/02-bass":`---
id: bass_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: performer
source: seed
---

\`\`\`cells
&bass, &bassOut from (&bassLevel, &bassV, &style) &bassline
&bassV from bass(style=&style)
&bassOut play=&bassline^$-12 level=&bassLevel &bassV
&bass map=role part=bass &bassOut
&bassLevel map=amp .8
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The bass player (decisions 058 and 061): a gate, \`&bassOut\` (Jambot's section text's name for it), whose role is \`bass\` (\`&bass map=role &bassOut\`), playing the part \`&bassline\` on the \`bass\` instrument an octave down.
The instrument holds the register, \`&bassV loop=C2\`, and Jambot's section text sounds its bass at C1 (\`PIN_VOICES.bass\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so the gate moves the part 12 grid steps down (\`^$-12\`), and the bass sends the MIDI notes it sends today.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): \`&bassline\`, the line (degrees over the chord in force or the key, held and shared as the section text writes them), and \`&bassLevel\`, its velocities as written: a line of levels (\`map=amp step=16n\`), or one level where they are all one (\`&bassLevel map=amp .8\`).

Associated as the facet \`performer\` at each of Jambot's eight presets' points (\`styles\`), at weight 1: every preset's section text plays this part the same way (yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): \`&bass, &bassOut from (&bassLevel, &bassV, &style) &bassline\`. \`&bass from bass_performer &line\` takes a copy of it, \`&bassline\` its main argument; \`&bassLevel\` an optional parameter, its line its default (\`"bass_performer"(bassLevel=…)\`).
Its instrument and the style it plays at are optional parameters too (decision 075, #560): \`&bassV\` its default \`&bassV from bass(style=&style)\`, the \`bass\` instrument, and \`&style\` the centre of style space. A piece passes its own (\`bass_performer(bassV=&bassV, style=&style)\`), where it took them by their names before; Migrate writes it.
`,"performers/03-pad":`---
id: pad_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: performer
source: seed
---

\`\`\`cells
&pad, &padOut from (&padLevel, &padV, &style) &padline
&padV from pad(style=&style)
&padOut play=&padline level=&padLevel &padV
&pad map=role part=pad &padOut
&padLevel map=amp .8
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The pad player (decisions 058 and 061): a gate, \`&padOut\` (Jambot's section text's name for it), whose role is \`pad\` (\`&pad map=role &padOut\`), playing the part \`&padline\` on the \`pad\` instrument, at its register (\`&padV loop=C3\`, where Jambot's section text sounds its comp: \`PIN_VOICES.comp\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): \`&padline\`, the line, and \`&padLevel\`, its velocities as written, a line of levels or one level.

Associated as the facet \`performer\` at each of Jambot's eight presets' points (\`styles\`), at weight 1: every preset's section text plays this part the same way (yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): \`&pad, &padOut from (&padLevel, &padV, &style) &padline\`. \`&pad from pad_performer &line\` takes a copy of it, \`&padline\` its main argument; \`&padLevel\` an optional parameter, its line its default (\`"pad_performer"(padLevel=…)\`).
Its instrument and the style it plays at are optional parameters too (decision 075, #560): \`&padV\` its default \`&padV from pad(style=&style)\`, the \`pad\` instrument, and \`&style\` the centre of style space. A piece passes its own (\`pad_performer(padV=&padV, style=&style)\`), where it took them by their names before; Migrate writes it.
`,"performers/04-stab":`---
id: stab_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: performer
source: seed
---

\`\`\`cells
&stab, &stabOut from (&stabLevel, &keysV, &style) &stabline
&keysV from keys(style=&style)
&stabOut play=&stabline level=&stabLevel &keysV
&stab map=role part=stab &stabOut
&stabLevel map=amp .8
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The stab player (decisions 058 and 061): a gate, \`&stabOut\` (Jambot's section text's name for it), whose role is \`stab\` (\`&stab map=role &stabOut\`), playing the part \`&stabline\` on the \`keys\` instrument, at its register (\`&keysV loop=C3\`, where Jambot's section text sounds its comp: \`PIN_VOICES.comp\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): \`&stabline\`, the line, and \`&stabLevel\`, its velocities as written, a line of levels or one level. Jambot sends the pad and the stab on one channel, 3: the score's card puts both gates in one entry (\`[&padOut, &stabOut]\`).

Associated as the facet \`performer\` at each of Jambot's eight presets' points (\`styles\`), at weight 1: every preset's section text plays this part the same way (yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): \`&stab, &stabOut from (&stabLevel, &keysV, &style) &stabline\`. \`&stab from stab_performer &line\` takes a copy of it, \`&stabline\` its main argument; \`&stabLevel\` an optional parameter, its line its default (\`"stab_performer"(stabLevel=…)\`).
Its instrument and the style it plays at are optional parameters too (decision 075, #560): \`&keysV\` its default \`&keysV from keys(style=&style)\`, the \`keys\` instrument, and \`&style\` the centre of style space. A piece passes its own (\`stab_performer(keysV=&keysV, style=&style)\`), where it took them by their names before; Migrate writes it.
`,"performers/05-lead":`---
id: lead_performer
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
    weight: 1
    facet: performer
  - point:
      sync: 0.12
      harm: 0
      bite: 1
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
    weight: 1
    facet: performer
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
    weight: 1
    facet: performer
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
    weight: 1
    facet: performer
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
    weight: 1
    facet: performer
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: performer
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
    weight: 1
    facet: performer
source: seed
---

\`\`\`cells
&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline
&leadV from lead(style=&style)
&leadOut play=&leadline level=&leadLevel &leadV
&lead map=role part=lead &leadOut
&leadLevel map=amp .8
&style map=style sync=.5 harm=.5 bite=.5 mood=.5
\`\`\`

The lead player (decisions 058 and 061): a gate, \`&leadOut\` (Jambot's section text's name for it), whose role is \`lead\` (\`&lead map=role &leadOut\`), playing the part \`&leadline\` on the \`lead\` instrument, at its register (\`&leadV loop=C4\`, where Jambot's section text sounds its lead: \`PIN_VOICES.lead\`, yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b), so with no move.
Its two inputs are the score's (decision 065: the line its main parameter, the level an optional one, one level of .8 by default): \`&leadline\`, the line (degrees over the melodic scale or the key), and \`&leadLevel\`, its velocities as written, a line of levels or one level.

Associated as the facet \`performer\` at each of Jambot's eight presets' points (\`styles\`), at weight 1: every preset's section text plays this part the same way (yggi/jambot \`packages/score/src/section-text.ts\` @ 24a528b: one voice, one register and one channel for all eight), so the eight share this one performer, and what a preset sounds like is its parts, not its players.

**Its signature** (decision 065): \`&lead, &leadOut from (&leadLevel, &leadV, &style) &leadline\`. \`&lead from lead_performer &line\` takes a copy of it, \`&leadline\` its main argument; \`&leadLevel\` an optional parameter, its line its default (\`"lead_performer"(leadLevel=…)\`).
Its instrument and the style it plays at are optional parameters too (decision 075, #560): \`&leadV\` its default \`&leadV from lead(style=&style)\`, the \`lead\` instrument, and \`&style\` the centre of style space. A piece passes its own (\`lead_performer(leadV=&leadV, style=&style)\`), where it took them by their names before; Migrate writes it.
`,"rhythms/01-synth-pop-drums":"---\nid: synth_pop_drums\nassociation:\n  - point:\n      sync: 0.3\n      harm: 0.45\n      bite: 0.55\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh)\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.547833 ~ ~ ~ ~ ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.469279 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.303801 &sd:0:.386943\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.270073 ~ ~ ~ &hh:0:.253953 ~ &hh:0:.201438 ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat]\n```\n\nJambot's E31 bar for Synth-pop (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Synth-pop's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `synth_pop_drums(bd=&mine)`.\n","rhythms/02-techno-drums":"---\nid: techno_drums\nassociation:\n  - point:\n      sync: 0.12\n      harm: 0\n      bite: 1\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh, &oh)\n&bd, &sd, &hh, &oh from gm_kit\n&kick role=kick step=16n &bd:0:.763904 ~ ~ ~ &bd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &bd:0:.524769 ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.607663 ~ ~ ~ ~ ~ ~ ~ &sd:0:.696633 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.155 &sd:0:.201438 &sd:0:.261951 &sd:0:.321409 ~ &sd:0:.469279 &sd:0:.571393 &sd:0:.632463\n&hat role=hat step=16n &hh:0:.367599 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.278319 &hh:0:.155 &hh:0:.367599 &hh:0:.148862 &oh:0:.278319 &hh:0:.148862 &hh:0:.377209 &hh:0:.148862 &oh:0:.270073 &hh:0:.148862\n&groove [&kick, &backbeat, &fill, &hat]\n```\n\nJambot's E31 bar for Techno (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Techno's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `techno_drums(bd=&mine)`.\n","rhythms/03-deep-house-drums":"---\nid: deep_house_drums\nassociation:\n  - point:\n      sync: 0.35\n      harm: 0.55\n      bite: 0.65\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &groove from (&bd, &sd, &hh)\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.595449 ~ ~ ~ ~ ~ ~ ~ &bd:0:.571393 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.502201 ~ ~ ~ ~ ~ ~ ~ &sd:0:.491103 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.161262 &sd:0:.339513 &sd:0:.406783\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.048608 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &hh:0:.321409 ~ &hh:0:.253953 ~ &hh:0:.303801 ~ ~ ~ &hh:0:.286689 ~ ~ ~ &hh:0:.261951 &hh:0:.094302 &hh:0:.230702 ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat]\n```\n\nJambot's E31 bar for Deep house (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Deep house's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `deep_house_drums(bd=&mine)`.\n","rhythms/04-ambient-drums":"---\nid: ambient_drums\nassociation:\n  - point:\n      sync: 0.05\n      harm: 0.3\n      bite: 0\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &hat, &groove from (&bd, &sd, &hh)\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.513423 ~ ~ ~ ~ ~ ~ ~ &bd:0:.502201 ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.386943 ~ ~ ~ ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.0992 &sd:0:.136958 &sd:0:.167648 &sd:0:.194432 ~ &sd:0:.303801 &sd:0:.416889 &sd:0:.396801\n&hat role=hat step=16n &hh:0:.238328 ~ &hh:0:.174158 ~ &hh:0:.261951 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.201438 ~ &hh:0:.261951 ~ &hh:0:.2232 ~\n&groove [&kick, &backbeat, &fill, &hat]\n```\n\nJambot's E31 bar for Ambient (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Ambient's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `ambient_drums(bd=&mine)`.\n","rhythms/05-lo-fi-hip-hop-drums":"---\nid: lo_fi_hip_hop_drums\nassociation:\n  - point:\n      sync: 0.5\n      harm: 0.75\n      bite: 0.35\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh)\n&bd, &rim, &sd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.524769 ~ ~ &bd:0:.286689 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.458553 ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.12555 &sd:0:.321409 &sd:0:.358113\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.041912 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ &hh:0:.278319 ~ ~ ~ &hh:0:.253953 ~ ~ ~ &hh:0:.2232 ~ &hh:0:.215822 ~\n&euclid role=euclid step=1m &rim(5,16,4)\n&euclidLevel map=amp step=16n .201438 0 0 0 .215822 0 0 .161262 0 0 .230702 0 0 .194432 0 0\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Lo-fi hip hop (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Lo-fi hip hop's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `lo_fi_hip_hop_drums(bd=&mine)`.\n","rhythms/06-funk-drums":"---\nid: funk_drums\nassociation:\n  - point:\n      sync: 1\n      harm: 0.12\n      bite: 0.85\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh, &oh)\n&bd, &rim, &sd, &hh, &oh from gm_kit\n&kick role=kick step=16n &bd:0:.645049 ~ ~ &bd:0:.386943 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~ ~ ~ ~ ~ &sd:0:.536239 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.180792 &sd:0:.367599 &sd:0:.447951\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.089528 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &hh:0:.348751 ~ &oh:0:.253953 ~ &hh:0:.330399 &hh:0:.114638 &oh:0:.230702 ~ &hh:0:.312543 ~ ~ ~ &hh:0:.286689 &hh:0:.104222 &oh:0:.215822 ~\n&euclid role=euclid step=1m &rim(7,16,0)\n&euclidLevel map=amp step=16n .253953 0 0 .270073 0 .270073 0 .230702 0 0 .278319 0 .270073 0 .295183 0\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Funk (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Funk's point. The rim's Euclid taps `1m`, and under a swung meter its strokes lean on the sixteenths the meter leans, as the band's rim does (#121).\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `funk_drums(bd=&mine)`.\n","rhythms/07-bossa-nova-drums":"---\nid: bossa_nova_drums\nassociation:\n  - point:\n      sync: 0.75\n      harm: 0.85\n      bite: 0.45\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &euclid, &euclidLevel, &groove from (&bd, &rim, &sd, &hh)\n&bd, &rim, &sd, &hh from gm_kit\n&kick role=kick step=16n &bd:0:.502201 ~ ~ &bd:0:.312543 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~ ~ ~ ~ ~ &sd:0:.427119 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.148862 &sd:0:.278319 &sd:0:.348751\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.063488 ~ ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n ~ ~ ~ ~ ~ ~ ~ ~ &hh:0:.246078 ~ ~ ~ &hh:0:.230702 ~ &hh:0:.18755 ~\n&euclid role=euclid step=1m &rim(5,16,4)\n&euclidLevel map=amp step=16n .201438 0 0 0 .208568 0 0 .180792 0 0 .215822 0 0 .201438 0 0\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &euclid * &euclidLevel]\n```\n\nJambot's E31 bar for Bossa nova (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Bossa nova's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `bossa_nova_drums(bd=&mine)`.\n","rhythms/08-swing-jazz-drums":"---\nid: swing_jazz_drums\nassociation:\n  - point:\n      sync: 0.35\n      harm: 1\n      bite: 0.3\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/jambot packages/score/experiments/drums-in-cells.ts @ 327d6a8\n---\n\n```cells\n&kick, &backbeat, &fill, &ghost, &hat, &pedal, &groove from (&bd, &sd, &ph, &rd)\n&bd, &sd, &ph, &rd from gm_kit\n&kick role=kick step=16n &bd:0:.559551 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~\n&backbeat role=backbeat step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.416889 ~ ~ ~\n&fill role=fill step=16n ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ &sd:0:.109368 &sd:0:.386943 &sd:0:.367599\n&ghost role=ghost step=16n ~ ~ ~ ~ ~ ~ ~ &sd:0:.030008 &sd:0:.0558 ~ ~ ~ ~ ~ ~ ~\n&hat role=hat step=16n &rd:0:.295183 ~ ~ ~ &rd:0:.278319 ~ ~ ~ &rd:0:.230702 ~ ~ ~ &rd:0:.253953 ~ &rd:0:.215822 ~\n&pedal role=pedal step=16n ~ ~ ~ ~ &ph:0:.161262 ~ ~ ~ ~ ~ ~ ~ &ph:0:.201438 ~ ~ ~\n&groove [&kick, &backbeat, &fill, &ghost, &hat, &pedal]\n```\n\nJambot's E31 bar for Swing jazz (yggi/jambot#317): the band's drum part as cells text, without its `&bar` line and its stand-in voices (`&bd s=white` …: the kit fills them, decision 054, rung 2) and its card (its mix is `&groove`, with no `map=midi(10)`: where its notes go is the workbench's and the drummer's, #291), so the host's `&bar`, written first, sets its meter and tempo. At Swing jazz's point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&ph`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &ph, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `swing_jazz_drums(bd=&mine)`.\n","rhythms/09-son-clave-3-2":`---
id: son_clave_3_2
association:
  - point:
      sync: 0.875
      harm: 0.485
      bite: 0.65
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!3 &claves ~!7
&percussion [&clave * .5]
\`\`\`

The son clave, 3-2: x..x..x. ..x.x... over two bars of eighths. It is where the bossa nova clave and Funk's Bo Diddley beat come from, and sits halfway between Bossa nova and Funk.

It is not maximally even: no phase of \`even(5, 16)\` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (\`even.test.ts\`).

Five strokes of a clave (\`&claves\`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). \`&claves\` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (\`&clave\`, \`&percussion\`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`son_clave_3_2(claves=&mine)\`.
`,"rhythms/10-son-clave-2-3":`---
id: son_clave_2_3
association:
  - point:
      sync: 0.95
      harm: 0.35
      bite: 0.75
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n cycle=2 ~!4 &claves ~!3 &claves ~!7 &claves ~!5 &claves ~!5 &claves ~!3
&percussion [&clave * .5]
\`\`\`

The son clave from its other bar, 2-3: it starts off the downbeat, so it sits a step from 3-2 toward Funk, more off the beat and plainer.

It is not maximally even: no phase of \`even(5, 16)\` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (\`even.test.ts\`).

Five strokes of a clave (\`&claves\`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). \`&claves\` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (\`&clave\`, \`&percussion\`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`son_clave_2_3(claves=&mine)\`.
`,"rhythms/11-rumba-clave-3-2":`---
id: rumba_clave_3_2
association:
  - point:
      sync: 1
      harm: 0.2
      bite: 0.75
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!3 &claves ~!7
&percussion [&clave * .5]
\`\`\`

The rumba clave, 3-2: the son's third stroke an eighth later, off the beat; drums and voices over a static harmony, short and dense: near Funk.

It is not maximally even: no phase of \`even(5, 16)\` is it (its gaps run from 2 to 4 eighths), which is what sets it apart from the bossa nova clave (\`even.test.ts\`).

Five strokes of a clave (\`&claves\`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). \`&claves\` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (\`&clave\`, \`&percussion\`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`rumba_clave_3_2(claves=&mine)\`.
`,"rhythms/12-bossa-nova-clave":`---
id: bossa_nova_clave
association:
  - point:
      sync: 0.8
      harm: 0.85
      bite: 0.35
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n cycle=2 &claves ~!5 &claves ~!5 &claves ~!7 &claves ~!5 &claves ~!5
&percussion [&clave * .5]
\`\`\`

The bossa nova clave: the son's last stroke an eighth later. Bossa nova's harmony and articulation, a little more off the beat and sparser than its drum bar: five strokes in two bars.

Its five strokes are \`even(5, 16, 2)\`, as even as five go over sixteen (here sixteen eighths over two bars): a maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; \`even.test.ts\`).

Five strokes of a clave (\`&claves\`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). \`&claves\` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (\`&clave\`, \`&percussion\`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`bossa_nova_clave(claves=&mine)\`.
`,"rhythms/13-bossa-nova-clave-one-bar":`---
id: bossa_nova_clave_one_bar
association:
  - point:
      sync: 0.8
      harm: 0.85
      bite: 0.45
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &percussion from (&claves)
&claves from gm_kit
&clave role=clave step=16n &claves ~!2 &claves ~!2 &claves ~!3 &claves ~!2 &claves ~!2
&percussion [&clave * .5]
\`\`\`

The bossa nova clave in one bar of sixteenths, x..x..x...x..x..: as dense as Bossa nova's drum bar, written in the same sixteenths, so at Bossa nova's energy; off the beat as the two-bar one. Which of the two fits a composition is the fit's to choose (#144), not the association's.

Its five strokes are \`even(5, 16, 2)\`, as even as five go over sixteen: a maximally even necklace, as the cinquillo is over eight and the son and rumba claves are not (decision 072; \`even.test.ts\`).

Five strokes of a clave (\`&claves\`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90). \`&claves\` is the General MIDI kit's own line by default, the line this fragment used to carry word for word (decision 054, rung 2: #244; a parameter since #637). Its other names (\`&clave\`, \`&percussion\`, its mix at that level, with no card: where its notes go is the workbench's, #291) are none of the drum bars', so it layers on any of them in one text.

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`bossa_nova_clave_one_bar(claves=&mine)\`.
`,"rhythms/14-cinquillo":"---\nid: cinquillo\nassociation:\n  - point:\n      sync: 0.85\n      harm: 0.6\n      bite: 0.6\n    weight: 1\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&clave, &percussion from (&claves)\n&claves from gm_kit\n&clave role=clave step=16n &claves ~!3 &claves ~ &claves ~!3 &claves ~ &claves ~!3\n&percussion [&clave * .5]\n```\n\nThe cinquillo, x.xx.xx. over one bar of eighths: the Cuban danzón's rhythm, the habanera's and the tresillo's kin, five strokes as even as five go over eight, `even(5, 8, 2)` (2 1 2 1 2; decision 072). The tresillo is its three, `even(3, 8, 2)`, and the bossa nova clave its five over sixteen, `even(5, 16, 2)`: one generator, three timelines (#507).\nIt is written out, as the claves are, and a test states the identity (`rhythms.test.ts`): a rhythm struck from `even` by its phase, each hit a step long, is #531's.\n\nWhere it sits: no preset is Cuban. It is placed by hand beside the son clave, which grew out of the danzón (off the beat, sync 0.85), a little more harmonic (the danzón's ballroom chords, harm 0.6), and denser than a two-bar clave, five strokes in one bar (energy 0.6).\n\nFive strokes of a clave (`&claves`, General MIDI's 75), a sound of its own beside the drum bar's rim, at half the level (velocity 90), as the other claves: `&claves` is a hole the General MIDI kit fills (decision 054, rung 2: #244). Its other names (`&clave`, `&percussion`) are none of the drum bars', so it layers on any of them in one text.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&claves`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&claves from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `cinquillo(claves=&mine)`.\n","rhythms/15-electro-swing-drums":"---\nid: electro_swing_drums\nassociation:\n  - point:\n      sync: 0.55\n      harm: 0.75\n      bite: 0.6\n    weight: 1\n    facet: rhythm\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 2c120d4\n---\n\n```cells\n&kick, &clap, &hats, &ticks, &groove from (&bd, &sd, &cp, &hh, &oh)\n&bd, &sd, &cp, &hh, &oh from gm_kit\n&kick role=kick step=4n &bd!4\n&clap step=4n ~ &cp:0:.6 ~ &cp:0:.6\n&hats step=8n ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4 ~ &oh:0:.4\n&ticks step=16n &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2?.7 &hh:0:.2 &hh:0:.2? &hh:0:.2 [&hh:0:.2,&sd:0:.03]\n&groove [&kick, &clap, &hats, &ticks]\n```\n\nThe electro swing beat of [Electro swing, in pieces](../../examples/electroswing.md): house's four on the floor and its clap on two and four, under a jazz record's swung eighths, the open hat on every off-beat and a sixteenth hat with some strokes left to chance (`?`, keyed on the seed: decision 031) and a ghost of the snare on the last.\nIt holds no `&bar`, so the host's meter swings it: under `meter(swing=8n:2/3)` (or the example's lighter `swing=8n:.64`) the open hats fall late, the kick and the clap stay on the beat.\nIts lines strike the kit's names (`&bd` `&cp` `&oh` `&hh` `&sd`), holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix, its levels in the hits.\nA piece arranging it takes its limbs by name (`&kick, &clap, &hats, &ticks from electro_swing_drums`), as the example does, each under a level of its own.\n\nAt a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&cp`, `&hh`, `&oh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &cp, &hh, &oh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `electro_swing_drums(bd=&mine)`.\n","rhythms/16-spooky-drums":"---\nid: spooky_drums\nassociation:\n  - point:\n      sync: 0.2\n      harm: 0.9\n      bite: 0.3\n    weight: 1\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&kick, &hat, &euclid, &groove from (&bd, &rim, &rd)\n&bd, &rim, &rd from gm_kit\n&kick role=kick step=16n &bd:0:.55 &bd:0:.3 ~ ~\n&hat role=hat step=4n &rd:0:.12\n&euclid role=euclid step=1m [~ &rim]\n&groove [&kick, &hat, &euclid * .25]\n```\n\nA heartbeat, a clock and a knock: the beat of [Spooky, in pieces](../../examples/spooky.md).\nThe kick is a heartbeat on every beat, its second stroke a sixteenth after the first and softer (lub-dub); the ride ticks each beat, faint, a clock; the rim knocks once, at the middle of the bar, where the heart is between beats in a bar of an odd number of them.\nEvery line fits any meter and lands on its sixteenths: the kick and the ride cycle on a beat (`step=16n` four long, `step=4n` one long), and the rim halves the bar (`step=1m [~ &rim]`), and half of every bar the library's meters make is a whole number of sixteenths (6 in 3/4, 10 in 5/4, 7 in 7/8), so in 5/4 the heart beats five times and the knock falls between the third beat's strokes.\nA Euclid spread over the bar (`step=1m &rim(3,8)`, v0.12.0's) put the knocks between the sixteenths of any bar but 4/4's and 12/8's, where a reader on the bar's sixteenths, as Jambot's drummer is, can't play them; a line on eighths (`step=8n`) lands on them but laps a bar of 4/4, which the fit refuses under the other meters.\nIts lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1: no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `spooky_drums(bd=&mine)`.\n","rhythms/17-ghost-drums":"---\nid: ghost_drums\nassociation:\n  - point:\n      sync: 0.1\n      harm: 0.9\n      bite: 0.3\n    weight: 1\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&kick, &hat, &euclid, &groove from (&bd, &rim, &rd)\n&bd, &rim, &rd from gm_kit\n&kick role=kick step=1m &bd:0:.45\n&hat role=hat step=4n &rd:0:.08\n&euclid role=euclid step=1m [~ &rim]\n&groove [&kick, &hat, &euclid * .2]\n```\n\nAlmost no drums, as a ghost house has: one soft heartbeat at the head of the bar, a clock ticking each beat at the edge of hearing, and a knock at the middle of the bar.\nIt is `spooky_drums` thinned for a quieter, stiller point: the heart beats once a bar, not every beat, so the bar is mostly air.\nEvery line fits any meter and lands on its sixteenths, as `spooky_drums`' do: the kick and the rim on the bar and its half, the ride on the beat.\nIts lines are named by Jambot's drum roles (`kick`, `hat`, `euclid`) and strike only voices its kit holds (`&bd` 36, `&rd` 51, `&rim` 37); they carry no card (#291): `&groove` is the mix.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.1 lower in sync, weight 1, as the facet `rhythm`.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&rim`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &rim, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `ghost_drums(bd=&mine)`.\n","rhythms/18-kinderlied-drums":"---\nid: kinderlied_drums\nassociation:\n  - point:\n      sync: 0.1\n      harm: 0.12\n      bite: 0.5\n    weight: 0.25\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&kick, &backbeat, &hat, &groove from (&bd, &sd, &hh)\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=2n &bd:0:.5\n&backbeat role=backbeat step=2n [~ &sd:0:.35]\n&hat role=hat step=4n &hh:0:.18\n&groove [&kick, &backbeat, &hat]\n```\n\nThe plainest beat there is, for a children's song: the kick on one and three, the snare on two and four, a closed hat on every beat, nothing off it.\nThe kick and the snare cycle on a half note and the hat on a beat, so in 4/4 it is one bar, and in 3/4 or 5/4 the kick and the snare take turns on the halves of each bar; it fits every meter of the library's.\nIts lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for the point proposed for a Kinderlied preset (`KINDERLIED`, `styles`: sync .1, harm .12, bite .5, mood .95), where Twinkle's and Hänschen klein's motifs sit; no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041).\nAt weight 0.25, as the dark cadence is weighted down (#404): its distance counts four times, so a query finds it within Jambot's miss distance (0.3) only within 0.075 of its point, where a Kinderlied preset finds it at distance 0.\nIts weight was chosen against cells' lock-in bound when it was absolute, points added (#533 made it relative, and whether the weight goes back to 1 is #544's): both bounds on lock-in over rhythms (`lockin.slow.test.ts`) sat at their edge without it, 4.99 points against 5 and a spread of 2.48 against 2.5, so a rhythm that the walk away from the presets finds and learns crosses one or the other: at weight 1 the share learning adds rose to 5.55 points; at 0.5, 0.4 and 0.3 it was 5.06, 5.02 and 4.98, the last with a spread of 2.52; at 0.25 4.95 and 2.46. Three beats near it (this one, a march and a swaying one) raised it to 5.98, so this one stands alone.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `kinderlied_drums(bd=&mine)`.\n","rhythms/19-acid-drums":`---
id: acid_drums
association:
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/acid.md @ 014c4c73
---

\`\`\`cells
&kick, &clap, &hat, &groove from (&bd, &cp, &hh, &oh)
&bd, &cp, &hh, &oh from gm_kit
&kick role=kick step=4n &bd:0:.8
&clap step=2n [~ &cp:0:.35]
&hat role=hat step=8n [&hh:0:.3 &oh:0:.5]
&groove [&kick, &clap, &hat]
\`\`\`

The beat of [Acid-Cell](../../examples/acid.md): the kick on every beat, the clap on two and four, the closed hat on the beat and the open hat on the and.

At Acid's point (sync .45, harm .05, bite .85, mood .35), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&cp\`, \`&hh\`, \`&oh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &cp, &hh, &oh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`acid_drums(bd=&mine)\`.
`,"rhythms/20-happy-hardcore-drums":`---
id: happy_hardcore_drums
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&kick, &clap, &hat, &groove from (&bd, &cp, &hh)
&bd, &cp, &hh from gm_kit
&kick role=kick step=4n &bd:0:.8
&clap step=2n [~ &cp:0:.35]
&hat role=hat step=8n [~ &hh:0:.2]
&groove [&kick, &clap, &hat]
\`\`\`

The beat of [Hypercell](../../examples/hypercell.md): four on the floor, the clap on two and four, the closed hat between the kicks.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&cp\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &cp, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`happy_hardcore_drums(bd=&mine)\`.
`,"rhythms/21-elektro-drums":`---
id: elektro_drums
association:
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/zell.md @ 014c4c73
---

\`\`\`cells
&kick, &backbeat, &tick, &groove from (&bd, &sd, &hh)
&bd, &sd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.8
&backbeat role=backbeat step=2n [~ &sd:0:.35]
&tick step=8n &hh:0:.12
&groove [&kick, &backbeat, &tick]
\`\`\`

The beat of [Zelluläre Aktivität](../../examples/zell.md): the kick on one and three, the snare on two and four, a light metallic tick on every eighth.

At Elektro's point (sync .15, harm .5, bite .85, mood .45), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&sd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &sd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`elektro_drums(bd=&mine)\`.
`,"rhythms/22-industrial-drums":`---
id: industrial_drums
association:
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/ghosts.md @ a8de625f
---

\`\`\`cells
&kick, &metal, &groove from (&bd, &hh)
&bd, &hh from gm_kit
&kick role=kick step=8n &bd:0:.8 ~ ~ ~ ~ ~ &bd:0:.6 ~
&metal step=16n ~ ~ &hh:0:.15 ~ ~ ~ ~ &hh:0:.12 ~ ~ ~ &hh:0:.15 ~ ~ ~ ~
&groove [&kick, &metal]
\`\`\`

The percussion of [Ghost-Cells](../../examples/ghosts.md), made plain: a heavy kick on one and on the seventh eighth, and metal ticks scattered over the sixteenths. The example draws its last kick and its ticks by chance, and adds glitches; here each is where it falls most.

At Dark ambient's point (sync .35, harm .15, bite .4), weight 1, as the facet \`rhythm\` (#572).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`industrial_drums(bd=&mine)\`.
`,"rhythms/23-ride-shuffle":`---
id: ride_shuffle
association:
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/jazz.md @ b3c0acea
---

\`\`\`cells
&ride, &kick, &groove from (&bd, &rd)
&bd, &rd from gm_kit
&ride step=8n &rd:0:.9 ~ &rd:0:.6 &rd:0:.5 &rd:0:.9 ~ &rd:0:.6 &rd:0:.5
&kick role=kick step=2n &bd:0:.5
&groove [&ride, &kick]
\`\`\`

The ride of [Swing blues](../../examples/jazz.md): ding, ding-a ding, ding-a, on a swung meter the long and the short of each beat, a light kick under one and three.

At Blues shuffle's point (sync 0.65, harm 0.55, bite 0.45), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&rd\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &rd from gm_kit\`). A piece takes its lines by their names, or renamed (\`&ride2=ride\`), and passes its own drum where it has one: \`ride_shuffle(bd=&mine)\`.
`,"rhythms/24-shanty-drums":`---
id: shanty_drums
association:
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/sailor.md @ 014c4c73
---

\`\`\`cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh)
&bd, &sd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.8
&snare step=2n [~ &sd:0:.5]
&hat role=hat step=8n [~ &hh:0:.3]
&groove [&kick, &snare, &hat]
\`\`\`

The kit of [Drunken Sailor](../../examples/sailor.md): the kick on one and three, the snare on two and four, the hat on every offbeat eighth.

At Sea shanty's point (sync 0.1, harm 0.25, bite 0.7), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&sd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &sd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`shanty_drums(bd=&mine)\`.
`,"rhythms/25-chip-drums":`---
id: chip_drums
association:
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
    weight: 1
    facet: rhythm
source: seed
lifted: yggi/cells examples/korobeiniki.md @ a8de625f
---

\`\`\`cells
&kick, &hats, &groove from (&bd, &hh)
&bd, &hh from gm_kit
&kick role=kick step=2n &bd:0:.6
&hats step=8n &hh:0:.5 &hh:0:.15 &hh &hh:0:.15 &hh:0:.5 &hh:0:.15 &hh &hh:0:.15
&groove [&kick, &hats]
\`\`\`

The drums of [Korobeiniki](../../examples/korobeiniki.md): its noise channel's hats, loud on the beat and soft between, with a kick under one and three.

At Chiptune's point (sync 0.3, harm 0.7, bite 1), weight 1, as the facet \`rhythm\` (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&bd\`, \`&hh\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&bd, &hh from gm_kit\`). A piece takes its lines by their names, or renamed (\`&kick2=kick\`), and passes its own drum where it has one: \`chip_drums(bd=&mine)\`.
`,"rhythms/26-quiet-pulse":`---
id: quiet_pulse
association:
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&tick, &groove from (&claves)
&claves from gm_kit
&tick step=4n &claves:0:.2
&groove [&tick]
\`\`\`

A quiet pulse, the claves softly on every beat: what keeps a band together where the music has no drums, a baroque ensemble's beat felt more than heard.

At Baroque's point (sync .15, harm .8, bite .5), weight 1, as the facet \`rhythm\`, so a band at Baroque plays this and no other style's kit (#542).

**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (\`&claves\`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (\`&claves from gm_kit\`). A piece takes its lines by their names, or renamed (\`&tick2=tick\`), and passes its own drum where it has one: \`quiet_pulse(claves=&mine)\`.
`,"rhythms/27-salsa-drums":`---
id: salsa_drums
association:
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&clave, &tumbao, &cascara, &groove from (&claves, &ht, &lt, &mt, &rd)
&claves, &ht, &lt, &mt, &rd from gm_kit
&clave step=16n cycle=2 &claves:0:.5 ~!5 &claves:0:.5 ~!5 &claves:0:.5 ~!7 &claves:0:.5 ~!3 &claves:0:.5 ~!7
&tumbao step=8n &mt:0:.3 &mt:0:.2 &ht:0:.5 &mt:0:.2 &mt:0:.3 &mt:0:.2 &lt:0:.6 &lt:0:.5
&cascara step=4n &rd:0:.45
&groove [&clave, &tumbao, &cascara]
\`\`\`

A salsa's percussion on a drum kit's voices: the son clave, 3-2, over two bars (as \`son_clave_3_2\` writes it); the conga's tumbao on the toms (the mid tom's muted strokes, the high tom's slap on two, the low tom's two open tones on four and its off-beat); and the bell's quarters on the ride, as a kit drummer plays the cáscara. It strikes only the 13 voices the drummer takes (#244).
At Salsa's point (sync 0.9, harm 0.5, bite 0.7), weight 1, as the facet \`rhythm\` (#542).
`,"rhythms/28-waltz-drums":`---
id: waltz_drums
association:
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&kick, &chick, &groove from (&bd, &ph)
&bd, &ph from gm_kit
&kick step=4n &bd:0:.5 ~ ~
&chick step=4n ~ &ph:0:.3 &ph:0:.25
&groove [&kick, &chick]
\`\`\`

A waltz's oom-pah-pah: the kick on one, the pedal hat on two and three, a little softer on three.
At Waltz's point (sync 0, harm 0.7, bite 0.3), weight 1, as the facet \`rhythm\` (#542).
`,"rhythms/29-march-drums":`---
id: march_drums
association:
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
    weight: 1
    facet: rhythm
source: seed
---

\`\`\`cells
&kick, &snare, &groove from (&bd, &sd)
&bd, &sd from gm_kit
&kick step=4n &bd:0:.7 &bd:0:.5
&snare step=16n &sd:0:.7 ~ &sd:0:.3 &sd:0:.3 &sd:0:.6 ~ &sd:0:.3 &sd:0:.3
&groove [&kick, &snare]
\`\`\`

A march's drums in 2/4: the bass drum on both beats, the snare's strokes and its soft doubles between them, the field drum's rudiment.
At March's point (sync 0, harm 0.1, bite 0.75), weight 1, as the facet \`rhythm\` (#542).
`,"rhythms/30-trip-hop-drums":`---
id: trip_hop_drums
association:
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
    weight: 0.5
    facet: rhythm
source: seed
---

\`\`\`cells
&kick, &snare, &hat, &groove from (&bd, &sd, &hh)
&bd, &sd, &hh from gm_kit
&kick step=16n &bd:0:.8 ~ ~ ~ ~ ~ ~ &bd:0:.5 ~ ~ &bd:0:.6 ~ ~ ~ ~ ~
&snare step=2n ~ &sd:0:.7
&hat step=8n &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35 &hh:0:.2 &hh:0:.35
&groove [&kick, &snare, &hat]
\`\`\`

A trip-hop beat, slow and heavy: the kick on one, its echoes off the beat after it, a hard snare on three (the half-time backbeat), the hats leaning on their off-beats.
At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2), weight 0.5, as the facet \`rhythm\` (#542): it is first at Trip-hop's point, and reaches half as far, so the walk of \`lockin.ts\` still misses at the corner's far edges, where it files fragments of its own (at weight 1 no section of draws 0–31 misses there, at 0.75 none of draws 0–3, and that path loses its witness).
`,"rhythms/31-aksak-drums":"---\nid: aksak_drums\nassociation:\n  - point:\n      sync: 0.8\n      harm: 0.6\n      bite: 1\n    weight: 0.75\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&kick, &ghost, &backbeat, &hat, &groove from (&bd, &sd, &hh)\n&bd, &sd, &hh from gm_kit\n&kick role=kick step=beat &bd:0:.6 ~ ~\n&ghost role=ghost step=beat ~ &sd:0:.12 ~\n&backbeat role=backbeat step=beat ~ ~ &sd:0:.5\n&hat role=hat step=pulse &hh:0:.3\n&groove [&kick, &ghost, &backbeat, &hat]\n```\n\nA drum bar for an aksak, a bar of three unequal beats, twos and a three: the kick on the first beat, a ghost of the snare on the second, the snare on the third, and the hat on every eighth.\nIt is written in the meter's counts, `step=beat` and `step=pulse`, so it lays itself out in whatever grouping the host's meter has: in 7/8 as the family reads it, `meter(\"7/8\")`, 3 + 2 + 2, the snare falls on the sixth eighth and the kick's beat is the long one; in `meter(\"2+2+3\")`, the grouping of the motif `limp`, the snare falls on the fifth and the long beat is the snare's.\nUnder a meter that swings its eighths (`swing=8n:2/3`), the hats of each two lean and those of the three stay even (decision 071); the beats never move.\nIts lines are named by Jambot's drum roles (`kick`, `ghost`, `backbeat`, `hat`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&hh` 42), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nIts three-beat lines lap a bar of three beats, so it fits the meters of three beats (7/8, 3/4) and no other.\nWritten by hand for [Aksak: twos and a three](../../examples/aksak.md), at 7/8's point (sync .8, harm .6, bite 1), weight 0.75 as the meter's own point there, as the facet `rhythm` (#646): where the meter fragment answers 7/8 (`meter(grouping=meter(\"7/8\"))`), this is its drum bar.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&hh`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &hh from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `aksak_drums(bd=&mine)`.\n","rhythms/32-twelve-eight-drums":"---\nid: twelve_eight_drums\nassociation:\n  - point:\n      sync: 0.7\n      harm: 0.6\n      bite: 0\n    weight: 0.25\n    facet: rhythm\nsource: seed\n---\n\n```cells\n&kick, &backbeat, &hat, &groove from (&bd, &sd, &rd)\n&bd, &sd, &rd from gm_kit\n&kick role=kick step=beat &bd:0:.6 ~ &bd:0:.45 ~\n&backbeat role=backbeat step=beat ~ &sd:0:.5 ~ &sd:0:.5\n&hat role=hat step=8n &rd:0:.35 &rd:0:.18 &rd:0:.24\n&groove [&kick, &backbeat, &hat]\n```\n\nA slow blues in 12/8: four beats a bar, each a dotted quarter of three eighths; the kick on one and three, the snare on two and four, and the ride on every eighth, the first of each three the loudest, the second the softest.\nThe kick and the snare tap the beats (`step=beat`); the ride's three eighths make one beat of a compound meter, so it fits 12/8 alone of the library's meters (in 6/8 its four beats are two bars).\nUnder a meter bent on its eighths (`bend=8n:&lean`, decision 080), the ride leans as the bend says, within each beat; the beats never move.\nIts lines are named by Jambot's drum roles (`kick`, `backbeat`, `hat`, the ride its hat as in `swing_jazz_drums`) and strike only voices its kit holds (`&bd` 36, `&sd` 38, `&rd` 51), so the drummer plays it as it is; they strike the kit's names, holes the General MIDI kit fills, and carry no card (#291): `&groove` is the mix.\nWritten by hand for [Twelve-eight: the lean of three](../../examples/twelve.md), at 12/8's point (sync .7, harm .6, bite 0), as the facet `rhythm` (#646): where the meter fragment answers 12/8 (`meter(grouping=meter(\"12/8\"))`), this is its drum bar.\nIt weighs 0.25, as `trip_hop_drums` weighs less than 1 (#542): at 0.5 or more the corner it fills leaves lock-in's walk no section that misses in its witness's draws, and so no witness that it files fragments of its own there; at 0.25 it is still first at its own point.\n\n**Its signature** (decision 075, #637): its lines are its heads, and the drums it strikes (`&bd`, `&sd`, `&rd`) are optional parameters, each the General MIDI kit's own line by default, taken inside it (`&bd, &sd, &rd from gm_kit`). A piece takes its lines by their names, or renamed (`&kick2=kick`), and passes its own drum where it has one: `twelve_eight_drums(bd=&mine)`.\n","stab/01-charleston-stabs":"---\nid: charleston_stabs\nassociation:\n  - point:\n      sync: 0.55\n      harm: 0.75\n      bite: 0.6\n      mood: 0.5\n    weight: 0.4\n    facet: stab\nsource: seed\nlifted: yggi/cells examples/electroswing.md @ 2c120d4\n---\n\n```cells\n&stabline from &harm\n&stabline step=8n cycle=4 &charleston!3 &push\n&charleston over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~@4\n&push over=&harm step=8n [0,1,2] ~ ~ [0,1,2] ~ [0,1,2] ~ &ahead\n&ahead over=&harm[>>] [1,2,3]\n```\n\nThe stabs of [Electro swing, in pieces](../../examples/electroswing.md): the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes: its last stab, on the and of four, is the next chord, its third and fifth with its root on top (`&ahead over=&harm[>>]`, as the funk bass anticipates with `&bassNext`).\nIt is the part the stab performer plays (`&stabline`, decision 058), the first of the facet `stab`, as the bass lines are the bass performer's: its chords are indices into the chord in force (`over=&harm`), so its holes are `&harm` and a meter, and its velocities are the performer's (`&stabLevel`).\n`&charleston`, `&push` and `&ahead` are its helpers: `use &stabline from charleston_stabs` takes them.\nIt is the example's line at the commit it was lifted from, but for that last stab, which there read the chord in force (the owner's review of #305).\n\nAt a point proposed for an Electro swing preset (sync .55, harm .75, bite .6, mood .5), weight 0.4, so no other preset finds it within Jambot's miss distance (0.3; at weight 1 it was the first stab of five, #404): no preset of Jambot's sits there yet, and the axes are Jambot's (decision 041), so the point is this file's, Jambot's to adopt.\n\n**Its signature** (decision 065): `&stabline from &harm`. `&stabline from charleston_stabs &harm` takes a copy of it, `&harm` its main argument.\n","stab/02-spooky-stabs":`---
id: spooky_stabs
association:
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 0.4
    facet: stab
source: seed
lifted: yggi/cells examples/spooky.md @ a8de625f
---

\`\`\`cells
&stabline from &harm
&stabline over=&harm step=8n ~ [0,1,2] ~ ~ ~ ~ [0,1,2] ~ ~ ~
\`\`\`

The stabs of [Spooky, in pieces](../../examples/spooky.md): a chord on the second eighth of a bar of five beats and another on the seventh, so they fall off the heartbeat and never twice in the same place in the beat.
It is the part the stab performer plays (\`&stabline\`, decision 058): its chords are indices into the chord in force (\`over=&harm\`), so its holes are \`&harm\` and a meter of five beats, and its velocities are the performer's (\`&stabLevel\`).

At Spooky's point (sync .2, harm .9, bite .3, mood .3), weight 0.4, so no other preset finds it within the miss distance (Lo-fi hip hop at weight 1, #572), as the facet \`stab\`: Spooky's own stab, as \`charleston_stabs\` is Electro swing's (#572, its parts by facet).
`,"stab/03-rave-stabs":`---
id: rave_stabs
association:
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 0.4
    facet: stab
source: seed
lifted: yggi/cells examples/hypercell.md @ 014c4c73
---

\`\`\`cells
&stabline from &harm
&stabline over=&harm step=8n ~ [0,1,2] ~ [0,1,2] ~ [0,1,2] ~ [0,1,2]
\`\`\`

The rave stabs of [Hypercell](../../examples/hypercell.md): the chord in force on every offbeat eighth, against the four-on-the-floor kick, as 90s happy hardcore and eurodance stab.
It is the part the stab performer plays (\`&stabline\`, decision 058): indices into the chord in force (\`over=&harm\`), its velocities the performer's.

At Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 0.4, so no other preset finds it within the miss distance (Synth-pop, Deep house and Kinderlied at weight 1, #572), as the facet \`stab\` (#572).
`,"styles/01-styles":`---
id: styles
association:
  - point:
      sync: 0.3
      harm: 0.45
      bite: 0.55
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.12
      harm: 0
      bite: 1
      mood: 0.4
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.65
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.05
      harm: 0.3
      bite: 0
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.35
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 1
      harm: 0.12
      bite: 0.85
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.75
      harm: 0.85
      bite: 0.45
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 1
      bite: 0.3
      mood: 0.85
    weight: 1
    facet: style
  - point:
      sync: 0.55
      harm: 0.75
      bite: 0.6
      mood: 0.5
    weight: 1
    facet: style
  - point:
      sync: 0.2
      harm: 0.9
      bite: 0.3
      mood: 0.3
    weight: 1
    facet: style
  - point:
      sync: 0.1
      harm: 0.12
      bite: 0.5
      mood: 0.95
    weight: 1
    facet: style
  - point:
      sync: 0.45
      harm: 0.05
      bite: 0.85
      mood: 0.35
    weight: 1
    facet: style
  - point:
      sync: 0.25
      harm: 0.45
      bite: 0.8
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0.15
      harm: 0.5
      bite: 0.85
      mood: 0.45
    weight: 1
    facet: style
  - point:
      sync: 0.35
      harm: 0.15
      bite: 0.4
      mood: 0.1
    weight: 1
    facet: style
  - point:
      sync: 0.15
      harm: 0.8
      bite: 0.5
      mood: 0.85
    weight: 1
    facet: style
  - point:
      sync: 0.65
      harm: 0.55
      bite: 0.45
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.1
      harm: 0.25
      bite: 0.7
      mood: 0.65
    weight: 1
    facet: style
  - point:
      sync: 0.3
      harm: 0.7
      bite: 1
      mood: 0.55
    weight: 1
    facet: style
  - point:
      sync: 0.9
      harm: 0.5
      bite: 0.7
      mood: 0.75
    weight: 1
    facet: style
  - point:
      sync: 0
      harm: 0.7
      bite: 0.3
      mood: 0.9
    weight: 1
    facet: style
  - point:
      sync: 0
      harm: 0.1
      bite: 0.75
      mood: 0.7
    weight: 1
    facet: style
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 1
    facet: style
source: seed
---

\`\`\`cells
&synthPop map=style label="Synth-pop" step=108bpm sync=.3 harm=.45 bite=.55 mood=.5
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
\`\`\`

The library of styles (decision 063 §3, #391, #537): the twenty-three preset styles, each a \`map=style\` cell at its point, its axes by name (cells' table of axes, \`AXES\`), its display name its \`label=\` and its default tempo its \`step=\`. They are Jambot's eight from the prototype, then Electro swing and Spooky (#349), then Kinderlied (yggi/jambot#547), whose 96 bpm is Twinkle's, then four read from the examples (#572, #542): Acid, from *Acid-Cell* (its 303, its riff and its beat), Happy hardcore, from *Hypercell*, and Elektro, from *Zelluläre Aktivität*. Their moods are placed by hand: Acid's minor hypnotic and tense (.35), Happy hardcore's euphoric though it turns on A minor (.9: the mood goes beyond the mode), Elektro's cool (.45). Dark ambient, from *Ghost-Cells*, is the bottom of the mood axis (.1): a minor drone made menacing. Then four more cut from the examples (#542): Baroque, from the Bach pieces, Blues shuffle, from *Swing blues*, Sea shanty, from *Drunken Sailor*, and Chiptune, from *Korobeiniki*; and four placed by hand, with parts written for them (#542): Salsa (the clave's off-beats, the tumbao, mixolydian), Waltz (where 3/4 and the \`waltz\` motif already sat), March (2/4, stamping and bright) and Trip-hop (.7 .2 .2 .25, the offbeat, static, paddy and dark corner no style held).

This file is the presets' one source: \`STYLES\` (\`src/repository/styles.ts\`) reads each as \`{ id, name, point, tempo }\`, in this order, and a frontend takes its presets from there. Only the library reads the \`step=\`: \`style=\` and a query read the point, so a style has no tempo (decision 037, D6).

A score names its section's style by one of them where the section sits exactly on it, and by its numbers or a mix of them where it doesn't:

\`\`\`text
&funk from styles
&style label="Funk" style=&funk
\`\`\`

The default band reads the style through \`&style\` (\`band\`: its bass's and its lead's cutoff), and so does its choice of instruments (\`resolveBand\`): Spooky's, named, plays the round bass, the organ, the celesta and the theremin, as its numbers do.

The points were lifted from yggi/jambot \`packages/engine/src/style.ts\` @ 7b078e8, with their tempos @ dcc414d. Associated once at each of them, as the facet \`style\`, at weight 1: the style nearest a point is a query (\`{ facet: 'style' }\`), and a test holds the association to the cells' points.
`};function Sd(){let e=bd(xd);if(`problems`in e)throw Error(`The seed library doesn't read: ${e.problems.join(`; `)}`);return e.files}let Cd=Sd(),wd=e=>ud(e.fragment),Td=(e=>Cd.filter(t=>t.path.startsWith(`${e}/`)).flatMap(wd))(`instruments`),Ed=[1,2,3,4,6,8,12,16],Dd=Object.fromEntries(Es.map(e=>[e.note,e.name])),Od=Object.fromEntries(Td.find(e=>e.id===`gm_kit`).text.split(`
`).flatMap(e=>{let t=/^&(\w+) (.*)$/.exec(e);return t?[[t[1],t[2]]]:[]}));function kd(e,t){let n=(e??``).trim().split(/\s+/),r=[];for(let e of n){let t=/^([A-Za-z][A-Za-z0-9]*)(?:\(([A-G][#b]?-?\d|\d+(?:\.\d+)?)\))?$/.exec(e);if(!t)return null;r.push({member:t[1],pitch:t[2]??null})}let i=ks(r.map(e=>e.member),Os),a=/* @__PURE__ */ new Map;for(let{member:e,pitch:t}of r){let n=i.get(e);if(n===void 0)continue;let r=Os(e),o=r===null?void 0:Od[Dd[r]??``],s=(o?o.replace(/ ?loop=\S+/,``):t?`s=sine env=&(map=adsr 0 .3 0 .05)`:`s=white hpf=6000 env=&(map=adsr 0 .1 0 .05)`).replace(/^note=\d+ /,``);a.set(n,{member:e,sound:`note=${n} ${t?s.replace(/^(s=\S+)/,`$1 loop=${t}`):s}`})}return t.every(e=>a.has(e.key))?a:null}let Ad=/* @__PURE__ */ new Set([`out`,`piece`,`tempo`,...Object.keys(Od)]),jd=(e,t=5)=>String(Number(e.toPrecision(t)));function Md(e,t){let n=(e??``).normalize(`NFKD`).replace(/[̀-ͯ]/g,``).split(/[^A-Za-z0-9]+/).filter(Boolean).map((e,t)=>t?e[0].toUpperCase()+e.slice(1):e[0].toLowerCase()+e.slice(1)).join(``);return n&&/^[A-Za-z]/.test(n)||(n=t),n.slice(0,24)}function Nd(e,t){let n=n=>{let r=Math.min(Math.max(1,e/96),n/8);return t.filter(e=>Math.abs(e-Math.round(e/n)*n)>r).length};for(let r of Ed){let i=e/r,a=n(i);if(t.length-a>=.995*t.length)return{step:i,perQuarter:r,moved:a}}return{step:e/4,perQuarter:4,moved:n(e/4)}}function Pd(e,t){let n=[],r=0,i=e=>{for(;e>dr;e-=dr)n.push(`~@${dr}`);e>0&&n.push(e===1?`~`:`~@${e}`)};for(let t of e){i(t.at-r);let e=t.values.length===1?t.values[0]:`[${t.values.join(`,`)}]`;n.push(t.dur===1?e:`${e}@${t.dur}`),r=t.at+t.dur}return i(t-r),n.join(` `)}function Fd(t,n,{free:r=!0,shorten:i=!1,credit:a=[],pitches:o=`auto`,split:s=`auto`,watch:c,story:l=!1}={}){if(i&&s!==`tracks`){let e=zd(t),u=e=>c&&((t,n)=>n.tool!==`done`&&c(t,e?{...n,tool:`${n.tool}, ${e}`}:n)),d={free:r,shorten:i,credit:a,pitches:o,story:l,split:`tracks`},f=s===`voices`&&e?null:Fd(t,n,{...d,watch:u(``)}),p=e&&Fd(e,n,{...d,watch:u(`in voices`)}),m=p?.folded&&(!f||!f.folded||sd(p.source)<sd(f.source))?p:f;return c?.(()=>m.source,{tool:`done`,round:0}),m}let u=[];t.tracks.forEach((e,t)=>{let n=[...new Set(e.notes.map(e=>e.channel))].sort((e,t)=>e-t);for(let r of n){let i=Md(e.name,`track${t+1}`),a=e.notes.filter(e=>e.channel===r),o=r===10?kd(e.name,a):null,s=o?Md([...new Set([...o.values()].map(e=>e.member))].join(` `),`track${t+1}`):i;u.push({name:n.length>1?`${s}Ch${r}`:s,drums:r===10,notes:a,kit:o})}});let d=u.flatMap(e=>e.notes),{step:f,perQuarter:p,moved:m}=Nd(t.ppq,[...d.map(e=>e.tick)]),h=e=>Math.round(e/f),g=Math.max(1,...d.map(e=>Math.max(h(e.tick)+1,h(e.end)))),_=Array.from({length:g},(n,r)=>e(t,(r+1)*f)-e(t,r*f)),v=/* @__PURE__ */ new Map;for(let e of _)v.set(jd(e,6),(v.get(jd(e,6))??0)+1);let y=Number([...v].sort((e,t)=>t[1]-e[1])[0][0]),b=_.map(e=>jd(e/y)),x=[];for(let e=0;e<g;){let t=1;for(;e+t<g&&b[e+t]===b[e];)t++;x.push(t===1?b[e]:`${b[e]}!${t}`),e+=t}let S=_.reduce((e,t)=>e+t,0),C=60*g/(S*p),w=4*p,T=e=>Number.isInteger(e)&&Number.isInteger(Math.log2(e)),E=w===4?``:T(w)?` pulse=${w}n`:T(2*w/3)?` pulse=${2*w/3}t`:` pulse=${w}n`,D=r?`free(${jd(C,6)}bpm, ${Math.floor(C*.6)}..${Math.ceil(C*1.5)})`:`${jd(C,6)}bpm`,O=`&tempo scan(${x.join(` `)})${E} step=${D} laps=1`,j=new Set(Ad),M=e=>{let t=e;for(let n=2;j.has(t);n++)t=`${e}${n}`;return j.add(t),t},N=[],P=[],ee=[],te=/* @__PURE__ */ new Set,ne=/* @__PURE__ */ new Map,re=u.some(e=>e.drums&&!e.kit),F=(e,t)=>{for(let[n,r]of ne)if(r===t&&n.replace(/\d+$/,``)===e)return n;let n=e;for(let t=2;ne.has(n)||j.has(n)&&(re||!(n in Od));t++)n=`${e}${t}`;return j.add(n),ne.set(n,t),n},ie=u.map(e=>e.kit?new Map([...e.kit].map(([e,t])=>[e,F(t.member,t.sound)])):null),oe=0,se=0;for(let[e,n]of u.entries()){let r=[],i=ie[e],a=n.drums?null:Id(n.notes,t);for(let e of a?.notes??[...n.notes].sort((e,t)=>e.tick-t.tick||e.key-t.key)){let t=i?i.get(e.key):n.drums?Dd[e.key]:String(e.key-60);if(t===void 0){oe++;continue}n.drums&&!i&&te.add(t);let a=h(e.tick),o=Math.max(1,h(e.end)-a),s=n.drums?`&${t}`:t,c=r.find(e=>{let t=e[e.length-1];return t.at===a&&t.dur===o&&!t.values.includes(s)||t.at+t.dur<=a}),l=c?.[c.length-1];c&&l.at===a&&l.dur===o?c[c.length-1]={...l,values:[...l.values,s]}:c?c.push({at:a,dur:o,values:[s]}):r.push([{at:a,dur:o,values:[s]}]),se++}if(!r.length)continue;let o=n.drums?null:M(`${n.name}Voice`),s=r.map(()=>M(n.name));r.forEach((e,t)=>N.push({name:s[t],chords:e,length:g})),o&&ee.push(`&${o} s=tri loop=C4${a?` glide=${a.glide}`:``} env=&(map=adsr .005 .2 .6 .15)`);for(let e of s)P.push(o?`&${e} * &${o} * .25`:`&${e} * .4`)}let I=/* @__PURE__ */ new Map,le=(e,t)=>{let n=`Opened from a MIDI file: ${se} notes in ${N.length} line${N.length===1?``:`s`}, ${p} step${p===1?``:`s`} a quarter note, ${t}.`,r=[...a.length?[...a.map(e=>`# ${e}`),``]:[],`# the file's tempo map: a step each ${p===4?`sixteenth`:`1/${p} of a quarter note`}; laps=1, so the piece ends`,O,``,...e,``,...ee,...[...te].sort().map(e=>`&${e} ${Od[e]}`),...[...ne].map(([e,t])=>`&${e} ${t}`),`&out map=sample [${P.join(`, `)}]`,``].join(`
`);return I.set(r,n),r},L=le([`# every note, a line a track (and one beside for notes that overlap); melodies as semitones from C4`,...N.map(e=>`&${e.name} step=pulse ${Pd(e.chords,e.length)}`)],`written out in full: Shorten folds it`),R=L,z=!1,ue=null,de;if(i&&N.length){let e=(e,t,n)=>e===`done`?`folded`:t?`${e}, ${n}`:e,n=(e,t)=>{let{defs:n,lines:r,scales:i}=A(e,`m`,`pulse`,`^$`,t);return le([`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up`,...n,``,`# every note, a line a track; melodies as semitones from C4`,...N.map(e=>`&${e.name} step=pulse${i.get(e.name)===1?``:`/${i.get(e.name)}`} ${r.get(e.name)}`)],`folded (engine/fold)`)},r=[];if(o===`auto`||o===`semitones`){let t=ae(N,c&&((t,r)=>c(()=>n(t()),{...r,tool:e(r.tool,r.round,`in semitones`)})));r.push({source:n(t),key:null,from:N,folded:t,print:n,how:`Every note written out, as semitones from C4`})}let i=Ee(N);if(o!==`semitones`&&i&&N.some(e=>e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`))))){let n=M(`key`),a=(e,t)=>{let{defs:r,lines:a,scales:o}=A(e,`m`,`pulse`,`^`,t);return le([`# the key: the lines read through it, a note its degree (0 the tonic; 6# the seventh raised a semitone)`,`&${n} ${xe(i)}`,``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# every note, a line a track; melodies as degrees of ${Se(i)}`,...N.map(e=>`&${e.name} step=pulse${o.get(e.name)===1?``:`/${o.get(e.name)}`}${e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`)))?` over=&${n}`:``} ${a.get(e.name)}`)],`folded in degrees of ${Se(i)} (engine/fold)`)};if(o===`auto`||o===`degrees`){let t=De(N,i),n=ae(t,c&&((t,n)=>c(()=>a(t()),{...n,tool:e(n.tool,n.round,`in degrees of ${Se(i)}`)})),{degrees:!0});r.push({source:a(n),key:Se(i),from:t,folded:n,print:a,how:`Every note written out, as degrees of ${Se(i)}`})}let s=t.meters[0]??{num:4,den:4},l=Math.max(1,Math.round(p*4*s.num/s.den)),u=o===`auto`||o===`sections`?Ae(N,l):[];if(u.length>1){let t=je(N,u,l),n=t.map(e=>De([e.part],u[e.section].key)[0]),i=[...new Set(u.map(e=>xe(e.key)))],a=new Map(i.map((e,t)=>[e,M(`key${t+1}`)])),o=/* @__PURE__ */ new Map,s=(e,n)=>{let{defs:r,lines:s,scales:c}=A(e,`m`,`pulse`,`^`,n),l=/* @__PURE__ */ new Map,d=[],f=new Map(N.map(e=>[e.name,[]]));for(let e of t){let t=s.get(e.part.name),n=c.get(e.part.name)??1,r=n===1?``:`@${n}`;if(/^~(@\d+)?(!\d+)?$/.test(t)){let t=f.get(e.line),n=/^~(?:@(\d+))?$/.exec(t[t.length-1]??``),r=e.part.length+(n?Number(n[1]??1):0);n&&t.pop(),t.push(r===1?`~`:`~@${r}`);continue}let i=a.get(xe(u[e.section].key)),p=`${i} ${t}`,m=l.get(p);m||(m=o.get(`${e.line}§${e.section}`)??M(`${e.line}${String.fromCharCode(65+e.section%26)}`),o.set(`${e.line}§${e.section}`,m),l.set(p,m),d.push(`&${m} over=&${i} ${t}`)),f.get(e.line).push(`&${m}${r}`)}return le([`# the keys: a section a key, cut where the key changes; a note its degree (0 the tonic; 6# the seventh raised a semitone)`,...i.map(e=>`&${a.get(e)} ${e}`),``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# the sections, a cell each part of a line, read through its section's key: ${u.map(e=>Se(e.key)).join(`, `)}`,...d,``,`# every note, a line a track: its sections in order`,...N.map(e=>`&${e.name} step=pulse ${Vd(f.get(e.name))}`)],`folded in ${u.length} sections by key (engine/fold)`)},d=ae(n,c&&((t,n)=>c(()=>s(t()),{...n,tool:e(n.tool,n.round,`in ${u.length} sections by key`)})),{degrees:!0});r.push({allowance:Bd,source:s(d),key:`${u.length} sections by key (${u.map(e=>Se(e.key)).join(`, `)})`,from:n,folded:d,print:s,how:`Every note written out, in ${u.length} sections by key`})}}let a=e=>{let t=new Map(k(e.folded).map((e,t)=>[e,`m${t+1}`]));return ce(e.from,e.folded).map((n,r)=>{let i=n.came===null?null:e.folded.rules.get(n.came),a=`in ${n.uses} place${n.uses===1?``:`s`}`,o=i?i.of?`&${t.get(n.came)} · a copy of &${t.get(i.of)}, changed · ${a}`:`&${t.get(n.came)} · ${i.kids.length} steps · ${a}`:r===0?e.how:`The lines on their own clocks, figures read over chords`;return{source:e.print(n.folded,t),says:o}})},s=new Map(r.map(e=>[e,sd(e.source)])),u=sd(L);for(let e of r.sort((e,t)=>s.get(e)/(e.allowance??1)-s.get(t)/(t.allowance??1)))if(s.get(e)<u&&Hd(L,e.source)){[R,z,ue]=[e.source,!0,e.key],l&&(de=a(e));break}let d=R;c?.(()=>d,{tool:`done`,round:0})}return{source:R,frontmatter:{title:n,tags:[`midi`],description:I.get(R)},notes:se,lines:N.length,perQuarter:p,moved:m,dropped:oe,folded:z,inKey:ue,...l?{story:de??[{source:R,says:`Every note written out`}]}:{}}}function Id(t,n){let r=[...t].sort((e,t)=>e.tick-t.tick||e.key-t.key);if(r.some((e,t)=>t>0&&e.tick===r[t-1].tick))return null;let i=t=>e(n,t),a=r.flatMap((e,t)=>{let n=r[t+1];if(!n||e.end<=n.tick)return[];let a=r[t+2],o=(a&&a.tick<n.end?i(a.tick):i(n.end))-i(n.tick);return[{i:t,by:i(e.end)-i(n.tick),room:o}]});if(a.length<2)return null;let o=Math.max(...a.map(e=>e.by));if(!a.every(e=>Math.abs(e.by-Math.min(o,e.room))<=Ld))return null;let s=new Set(a.map(e=>e.i));return{notes:r.map((e,t)=>s.has(t)?{...e,end:r[t+1].tick}:e),glide:Math.round(o*1e3)/1e3}}let Ld=.004,Rd={2:[`upper`,`lower`],3:[`upper`,`middle`,`lower`],4:[`soprano`,`alto`,`tenor`,`bass`]};function zd(e){let t=e.tracks.map(e=>e.notes.filter(e=>e.channel!==10)).filter(e=>e.length);if(new Set(e.tracks.filter(e=>e.notes.some(e=>e.channel!==10)).map(e=>e.programs[0]?.program??0)).size>1||t.some(t=>Id(t,e)))return null;let n=t.flat().sort((e,t)=>e.tick-t.tick||t.key-e.key),{voice:r,count:i}=Ne(n.map(e=>({start:e.tick,end:e.end,key:e.key})));if(i<=t.length||i>8)return null;let a=Rd[i]??Array.from({length:i},(e,t)=>`voice${t+1}`),o=n[0].channel,s=a.map((e,t)=>({name:e,notes:n.filter((e,n)=>r[n]===t).map(e=>({...e,channel:o})),bends:[],programs:[]})),c=e.tracks.flatMap(e=>e.notes.some(e=>e.channel===10)?[{...e,notes:e.notes.filter(e=>e.channel===10)}]:[]);return{...e,tracks:[...s.filter(e=>e.notes.length),...c]}}let Bd=1.15;function Vd(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}function Hd(e,t){let n=e=>{let t=od(e);if(!t.ok)return null;let n=Mu(t,Hr(t),t.off);return Bu(n,0,n.end).map(e=>`${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`).sort()},[r,i]=[n(e),n(t)];return!!r&&!!i&&r.length===i.length&&r.every((e,t)=>e===i[t])}self.onmessage=e=>{let{smf:t,title:n,credit:r}=e.data;postMessage({kind:`done`,made:Fd(t,n,{shorten:!0,credit:r,story:!0})})}})();