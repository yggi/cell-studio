(function(){let e=(e,t,n,r)=>({name:e,range:t,label:n,ends:r,sentence:`${r[0][0].toUpperCase()}${r[0].slice(1)} (${t[0]}) to ${r[1]} (${t[1]}).`}),t=[e(`sync`,[0,1],`Syncopation`,[`on the beat`,`offbeat`]),e(`harm`,[0,1],`Harmony`,[`static`,`moving`]),e(`bite`,[0,1],`Bite`,[`paddy`,`stabby`]),e(`mood`,[0,1],`Mood`,[`darker`,`brighter`])],n=t.map(e=>e.name),r={adsr:[`attack`,`decay`,`sustain`,`release`],style:n},i=`style`,a=t.map(e=>(e.range[0]+e.range[1])/2),o=/&?(scale:|key:)?λ(\d+)_(\d+)/g,s=/&?λ([A-Za-z_][A-Za-z0-9_]*)_(\d+)/g;function c(e){return e.includes(`λ`)?e.replace(o,(e,t,n,r)=>`the ${t?`scale`:`cell`} at line ${n}, column ${r}`).replace(s,(e,t,r)=>`&${t}'s ${n[Number(r)]??`axis ${r}`}`):e}function l(e){return e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>l(e.atom))):[e]}function u(e){return e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>[e,...u(e.atom)])):[]}function d(e,t){return e.kind===`seq`?{...e,layers:e.layers.map(e=>e.map(e=>({...e,atom:d(e.atom,t)})))}:t(e)}function f(e,t){let n=e.atom,r=n.kind===`seq`?n.layers.reduce((e,n)=>e+n.reduce((e,n)=>e+f(n,t),0),0)*(n.euclid?.k??1):t(n);return e.repeat*e.subdivide*r}let p=1e-9,m=e=>Math.floor(e+p),h=(e,t)=>(e%t+t)%t,g=(e,t)=>t===0?e:g(t,e%t),_=(e,t)=>e/g(e,t)*t;function v(e,t){let[n,r,i,a]=[h(e,t),t,1,0];for(;r!==0;){let e=Math.floor(n/r);[n,r,i,a]=[r,n-e*r,a,i-e*a]}return h(i,t)}let y=e=>e.reduce((e,t)=>e+t.elongate*t.repeat,0);function b(e){if(e.kind!==`seq`)return 1;let t=t=>t.reduce((e,t)=>_(e,b(t.atom)),1)*(e.mode===`alt`?y(t):1);return e.layers.reduce((e,n)=>_(e,t(n)),1)*(e.slow??1)}let x=(e,t,n)=>[{atom:e,at:t,dur:n,of:1,is:0,chances:[],picks:[]}];function S(e,t,n,r){return e.map(e=>{let i=t*(e.is+(e.at-n)/r),a=m(i),o=e.of*t;return{...e,at:n+Math.max(0,i-a)*r,dur:e.dur*t,of:o,is:h(a,o),picks:e.picks.map(i=>{let o=t*(e.is+i.lap+(i.at-n)/r)-a,s=m(o);return{...i,lap:s,at:n+Math.max(0,o-s)*r}})}})}function C(e,t,n,r){let i=[];for(let a of t.hits){let o=a/t.n;for(let a of e){let e=(a.at-n)/r,s=a.dur/r;for(let c=0;c<e+s;c++)e<=c+o+p&&c+o<e+s-p&&i.push({...a,at:n+o*r,dur:r/t.n,is:h(a.is+c,a.of),picks:a.picks.map(e=>({...e,lap:e.lap-c}))})}}return i}function w(e,t,n,r,i,a){if(e.kind!==`seq`)return a(e,t,n).map(e=>({...e,chances:[...i.chances,...e.chances],...T(i.level,e.level)}));let o=e.layers.flatMap((o,s)=>{let c=y(o),l=[],u=0;return o.forEach((e,o)=>{l.push(...E(e,t+u*n/c,e.elongate*n/c,`${r}/${s}.${o}`,i,a)),u+=e.elongate*e.repeat}),e.mode===`alt`?S(l,c,t,n):e.mode===`choose`?l.map(n=>({...n,picks:[...n.picks,{id:r,of:e.layers.length,is:s,lap:0,at:t}]})):l});return e.euclid&&(o=C(o,e.euclid,t,n)),e.slow&&e.slow>1&&(o=S(o,e.slow,t,n)),o}let T=(e,t)=>{let n=t===void 0?e:e===void 0?t:t*e;return n===void 0?{}:{level:n}};function E(e,t,n,r,i,a){let o={chances:e.chance===void 0?i.chances:[...i.chances,e.chance],level:e.level===void 0?i.level:e.level*(i.level??1)},s=e.subdivide,c=n/s,l=[];for(let i=0;i<e.repeat;i++)for(let u=0;u<s;u++){let d=t+i*n+u*c;for(let t of w(e.atom,d,c,r,o,a)){if(s===1||t.of===1&&!t.picks.length){l.push(t);continue}let e=g(s,t.of);if(h(t.is-u,e)!==0)continue;let n=t.of/e,r=n===1?0:h((t.is-u)/e*v(s/e,n),n);l.push({...t,of:n,is:r,picks:t.picks.map(e=>{let t=u+e.lap;return{...e,lap:Math.floor(t/s),at:e.at+(h(t,s)-u)*c}})})}}return l}function D(e,t){if(e.kind!==`seq`)return t(e);if(!e.bare)return 1;let n=e.layers[0][0];return D(n.atom,t)*n.elongate}function O(e,t,n,r=``){let i=[],a=0;return e.forEach((e,o)=>{let s=D(e.atom,t)*e.elongate;for(let t of E(e,a,s,`${r}${o}`,{chances:[],level:void 0},n))i.push({atom:t.atom,at:t.at,dur:t.dur,chances:t.chances,top:o,...t.level===void 0?{}:{level:t.level},...t.of>1?{laps:{of:t.of,is:t.is}}:{},...t.picks.length?{chosen:t.picks}:{}});a+=s*e.repeat}),i}let k=(e,t)=>O(e,t,x),A=[`over`,`shift`,`step`,`map`,`stride`,`cycle`,`env`,`pitch`,`show`,`chance`,`seed`,`size`],j=e=>e.flatMap(e=>e.repeat>1?Array.from({length:e.repeat},()=>({...e,repeat:1})):[e]);function M(e,t){let n=t.transpose??0,r=t.degree??0;if(!n&&!r)return e;let i=n+r;switch(e.kind){case`seq`:return d(e,e=>M(e,t));case`note`:return{...e,value:e.value+i};case`chord`:return{...e,notes:e.notes.map(e=>e+i)};case`choice`:return{...e,values:e.values.map(e=>e+i)};case`ref`:return n?{...e,transpose:(e.transpose??0)+n}:{...e,values:{mul:e.values?.mul??1,add:(e.values?.add??0)+r*(e.values?.mul??1)}};default:return e}}function N(e){if(!e.cells.some(e=>e.base||F(e)||P(e)))return e;let t=new Map(e.cells.map(e=>[e.name,e])),n=[...e.diagnostics],r=/* @__PURE__ */ new Map,i=/* @__PURE__ */ new Set,a=(e,t)=>n.push({severity:`error`,message:t,span:e.base?.span??e.span}),o=e=>{let s=r.get(e.name);if(s)return s;let c=e;if(e.base){let n=t.get(e.base.name);n?i.has(e.name)?a(e,`base=&${e.base.name} comes round to &${e.name} itself`):(i.add(e.name),c=I(e,o(n),e.base,t=>a(e,t)),i.delete(e.name)):c=e}else F(e)&&n.push({severity:`error`,message:`= keeps a step of the base: only in a cell with base= (&${e.name} base=&other = 4 =)`,span:e.span});return P(e)&&n.push({severity:`error`,message:`= keeps a whole step of the base, not part of one: write it outside brackets (&${e.name} base=&other = [0 2])`,span:e.span}),r.set(e.name,c),c};return{...e,cells:e.cells.map(o),diagnostics:n}}let P=e=>e.braid.kind===`list`&&e.braid.tokens.some(e=>u(e.atom).some(e=>e.atom.kind===`rest`&&e.atom.keep)),F=e=>e.braid.kind===`list`&&e.braid.tokens.some(e=>e.atom.kind===`rest`&&e.atom.keep);function I(e,t,n,r){let i={};for(let n of A)e[n]==null&&t[n]!=null&&(i[n]=t[n]);let a={...t.params,...e.params},o={...t.paramSpans,...e.paramSpans},s=t.paramCells||e.paramCells?{...t.paramCells,...e.paramCells}:void 0,c=t.paramClocks||e.paramClocks?{...t.paramClocks,...e.paramClocks}:void 0;n.transpose&&(e.over??t.over)&&r(`base=&${n.name}^$${n.transpose}: a cell that reads a table moves by its degrees (^n), not yet by grid steps`);let l=e.braid;if(t.braid.kind===`list`){let i=j(t.braid.tokens),a=e.braid.kind===`list`?j(e.braid.tokens):[],o=[];for(let e=0;e<Math.max(i.length,a.length);e++){let s=i[e],c=a[e];if(!(!c||c.atom.kind===`rest`&&c.atom.keep)){o.push(c);continue}if(!s){r(`= past the end of &${t.name} (${i.length} steps): nothing to keep`);continue}let l=M(s.atom,n);o.push(c&&c.elongate!==1?{...s,atom:l,elongate:c.elongate}:{...s,atom:l})}l={kind:`list`,tokens:o,...t.braid.perBeat!==void 0&&o.length===i.length?{perBeat:t.braid.perBeat,...t.braid.signature?{signature:t.braid.signature}:{}}:{}}}else e.braid.kind===`blank`?l=t.braid:F(e)&&r(`&${t.name} is a ${t.braid.kind}(…), not a braid: = keeps steps of a braid`);return{...e,...i,params:a,paramSpans:o,...s?{paramCells:s}:{},...c?{paramClocks:c}:{},braid:l}}let ee=e=>{if(!e)return``;let t=e.abs?`$`:``;return e.kind===`at`?`[${t}${e.i}]`:`[${t}${e.from??``}:${e.to??``}${e.step?`:${e.step}`:``}]`},te=e=>e===0?``:`[${e<0?`<<`:`>>`}${Math.abs(e)===1?``:Math.abs(e)}]`,ne=e=>(e.slot?`[${e.slot}]`:ee(e.pick)||te(e.shift))+(e.degree?`^${e.degree}`:``)+(e.transpose?`^$${e.transpose}`:``),L=e=>!!e.label&&e.braid.kind===`blank`&&e.over===null&&e.step===null&&e.map===null&&e.cycle===null&&e.shift===null&&e.stride===null&&!e.off&&!e.frees?.length&&!e.env&&!e.pitch&&Object.keys(e.params).length===0,re=/^(`{3,})([^`]*)$/;function ie(e,t){let n=[],r=[],i=[],a=[],o=t;for(;o<e.length;){let t=e[o],s=re.exec(t),c=s?e.findIndex((e,t)=>t>o&&/^`{3,}\s*$/.test(e)&&e.trim().length>=s[1].length):-1;if(s&&s[2].trim()===`cells`){if(c<0)return{problems:[{line:o+1,message:"the ```cells block is never closed (a line ```)"}]};a.push(t),r.push(a),a=[];let s=e.slice(o+1,c);s.forEach((e,t)=>i.push({block:n.length,line:o+2+t})),n.push(s),a.push(e[c]),o=c+1}else if(s){let t=c<0?e.length-1:c;a.push(...e.slice(o,t+1)),o=t+1}else a.push(t),o++}if(!n.length)return{problems:[{line:Math.max(t,1),message:"no ```cells block after the frontmatter"}]};let s=a.slice(1);r.push(a.slice(0,1));let c=s.join(`
`).replace(/^\s*\n/,``).trimEnd();return{text:n.flat().join(`
`),map:i,layout:{blocks:n,gaps:r},head:e.slice(0,t),tail:s,prose:c,raw:!1}}var R=class extends Error{line;constructor(e,t){super(t),this.line=e}};let z=/^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,ae=/^([-+]?0x[0-9a-fA-F]+|[-+]?0o[0-7]+|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN))$/,oe=/^(null|Null|NULL|~)$/,se=/^(true|True|TRUE)$/,ce=/^(false|False|FALSE)$/,B=/^[-?:,[\]{}#&*!|>'"%@`]/,le=e=>e!==``&&!B.test(e)&&!/: |:$| #|^\s|\s$/.test(e)&&!/^[0-9]+$/.test(e)&&!/[\n\r\t]/.test(e);function ue(e,t,n){let[r]=e;if(r===`&`||r===`*`)throw new R(t,`an ${r===`&`?`anchor`:`alias`} (${e}): the subset has none; write the value out`);if(r===`!`)throw new R(t,`a tag (${e}): the subset has none`);if(r===`|`||r===`>`)throw new R(t,`a block scalar (${r}): write the text on one line, quoted, with \\n`);if(r===`{`||r===`[`)throw new R(t,`flow style beyond [a, b] (${e}): write the map or the list as a block`);if(/^([-?:]( |$)|[%@`,\]}])/.test(e))throw new R(t,`${r} can't start a plain value: quote it`);if(r===`#`||e.includes(` #`))throw new R(t,`a comment: the subset has none; say it in the prose or under a key`);if(/: |:$/.test(e))throw new R(t,`a colon and a space in a plain value (${e}): quote it`);if(n&&/[[\]{},]/.test(e))throw new R(t,`flow style beyond [a, b] (${e}): quote an item that holds , [ ] { }`);if(oe.test(e))return null;if(se.test(e))return!0;if(ce.test(e))return!1;if(z.test(e))return Number(e);if(ae.test(e))throw new R(t,`a number the subset doesn't read (${e}): write it in decimal, or quote it`);return e}function de(e,t){if(e[0]===`'`){let t=``;for(let n=1;n<e.length;n++)if(e[n]!==`'`)t+=e[n];else if(e[n+1]===`'`)t+=e[n++];else return{value:t,length:n+1}}else for(let n=1;n<e.length;n++)if(e[n]===`\\`)n++;else if(e[n]===`"`)try{return{value:JSON.parse(e.slice(0,n+1)),length:n+1}}catch{throw new R(t,`an escape the subset doesn't read in ${e.slice(0,n+1)}: it reads JSON's (\\" \\\\ \\n \\t \\uXXXX …)`)}throw new R(t,`a quoted string that isn't closed on its line (${e})`)}function fe(e,t){if(e===`{}`)return{kind:`map`,line:t,entries:[]};if(e[0]===`"`||e[0]===`'`){let{value:n,length:r}=de(e,t);if(e.slice(r).trim())throw new R(t,`text after a quoted string (${e.slice(r).trim()})`);return{kind:`scalar`,line:t,value:n}}if(e[0]===`[`&&e.endsWith(`]`)){let n=[],r=e.slice(1,-1).trim();for(;r;){let i;if(r[0]===`"`||r[0]===`'`){let e=de(r,t);i=e.value,r=r.slice(e.length).trim()}else{let n=r.indexOf(`,`),a=(n<0?r:r.slice(0,n)).trim();if(!a)throw new R(t,`an empty item in ${e}`);i=ue(a,t,!0),r=n<0?``:r.slice(n)}if(n.push({kind:`scalar`,line:t,value:i}),r&&r[0]!==`,`)throw new R(t,`a list item followed by ${r[0]}, not a comma`);if(r=r.slice(1).trim(),!r&&e.slice(1,-1).trim().endsWith(`,`))throw new R(t,`an empty item at the end of ${e}`)}return{kind:`list`,line:t,items:n}}return{kind:`scalar`,line:t,value:ue(e,t,!1)}}function pe(e,t=1){let n=[];try{if(e.split(`
`).forEach((e,r)=>{let i=t+r;if(!e.trim())return;let a=e.length-e.trimStart().length;if(e.slice(0,a).includes(`	`))throw new R(i,`a tab in an indent: indent with spaces`);let o=e.trim();if(/^(---|\.\.\.)(\s|$)/.test(o))throw new R(i,`a second document (${o}): the frontmatter is one`);if(o[0]===`%`)throw new R(i,`a directive (${o}): the subset has none`);if(o[0]===`#`)throw new R(i,`a comment: the subset has none; say it in the prose or under a key`);n.push({line:i,indent:a,text:o})}),!n.length)return{node:{kind:`map`,line:t,entries:[]}};let r=0,i=e=>e.text===`-`||e.text.startsWith(`- `),a=e=>i(n[r])?s(e):c(e),o=(e,t,o,c)=>{let l=n[r];if(e){if(l&&l.indent>o)throw new R(l.line,`a value over two lines, or indented under a value: the subset reads a value on one line`);return fe(e,t)}return l&&l.indent>o?a(l.indent):l&&c&&l.indent===o&&i(l)?s(o):{kind:`scalar`,line:t,value:null}},s=e=>{let t=[],s=n[r].line;for(;r<n.length&&n[r].indent===e&&i(n[r]);){let i=n[r],s=i.text.slice(1).trimStart(),c=e+i.text.length-s.length;s&&(/^-( |$)/.test(s)||/^[^"'[{][^]*?(: |:$)/.test(s))?(n[r]={line:i.line,indent:c,text:s},t.push(a(c))):(r++,t.push(o(s,i.line,e,!1)))}return{kind:`list`,line:s,items:t}},c=e=>{let t=[],a=n[r].line;for(;r<n.length&&n[r].indent===e;){let{line:a,text:s}=n[r];if(i(n[r]))throw new R(a,`a list item where a key was expected`);if(s[0]===`?`)throw new R(a,`a complex key (?): keys are plain words`);let c=s.search(/: |:$/);if(c<0)throw new R(a,`no key: a line in a map is \`key: value\` (${s})`);let l=s.slice(0,c);if(l[0]===`"`||l[0]===`'`)throw new R(a,`a quoted key (${l}): keys are plain words`);if(/^[0-9]+$/.test(l))throw new R(a,`a key that is a number (${l}): keys are words`);if(!le(l))throw new R(a,`a key the subset doesn't read (${l}): keys are plain words`);if(t.some(e=>e.key===l))throw new R(a,`the key ${l} is given twice`);r++,t.push({key:l,line:a,value:o(s.slice(c+1).trim(),a,e,!0)})}return{kind:`map`,line:a,entries:t}},l=a(n[0].indent);if(r<n.length)throw new R(n[r].line,`indented as no key above it is`);return{node:l}}catch(e){if(e instanceof R)return{problems:[{line:e.line,message:e.message}]};throw e}}function me(e){return e.kind===`scalar`?e.value:e.kind===`list`?e.items.map(me):Object.fromEntries(e.entries.map(e=>[e.key,me(e.value)]))}let he=`&[A-Za-z_][A-Za-z0-9_]*`,ge=e=>e.startsWith(`"`)?e.slice(1,-1):e,_e=e=>/^\s*use(?![A-Za-z0-9_])/.test(e);function ve(e){let t=[],n=0,r=!1,i=-1;for(let a=0;a<=e.length;a++){let o=e[a];o===void 0||!r&&n===0&&/\s/.test(o)?(i>=0&&t.push({text:e.slice(i,a),at:i}),i=-1):(i<0&&(i=a),o===`"`?r=!r:!r&&`([{`.includes(o)?n++:!r&&`)]}`.includes(o)&&(n=Math.max(0,n-1)))}return t}function ye(e){if(!e.startsWith(`(`)||!e.endsWith(`)`))return null;let t=e.slice(1,-1),n=[],r=0,i=!1,a=0;for(let e=0;e<=t.length;e++){let o=t[e];o===void 0||o===`,`&&!i&&r===0?(n.push(t.slice(a,e).trim()),a=e+1):o===`"`?i=!i:!i&&`([{`.includes(o)?r++:!i&&`)]}`.includes(o)&&r--}return n.length===1&&n[0]===``?[]:n}let be=`${he}(?:=[A-Za-z_][A-Za-z0-9_]*)?`,xe=RegExp(`^\\s*(\\*|${be}(?:\\s*,\\s*${be})*)(?=\\s|$)`),Se=RegExp(`^${he}$`),Ce=/^[A-Za-z_][A-Za-z0-9_]*/,we=/^"[^"]*\S[^"]*"/,Te=e=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(e);function Ee(e){for(let t=0;t<e.length;t++){if(!Te(e[t]))return!1;e[t].startsWith(`style=`)&&e[t+1]===`*`&&/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(e[t+2]??``)&&(t+=2)}return!0}let De=/* @__PURE__ */ new Set([`off`]);function Oe(e){let t=xe.exec(e);if(!t)return;let n=ve(e),r=t[0].length,i=n.findIndex(e=>e.at>=r&&e.text===`from`);if(i<0)return;let a=t[1]===`*`,o=a?null:t[1].split(`,`).map(e=>e.trim().split(`=`)),s=o?.map(([e,t])=>[e,t===void 0?e:`&${t}`])??null,c=e=>new Set(e).size===e.length;if(s&&o.some(([,e])=>e!==void 0)&&!(c(s.map(([e])=>e))&&c(s.map(([,e])=>e))))return null;let l=s?[...new Map(s)]:null,u=l?l.map(([e])=>e):null,d=l?l.map(([,e])=>e):null,f=n.filter((e,t)=>e.at>=r&&t<i).map(e=>e.text);if(f.some(e=>!Te(e)&&!De.has(e))||a&&f.length)return null;let p=e.slice(n[i].at+4).trim(),m=ve(p).map(e=>e.text);if(a&&!f.length&&Ee(m))return{kind:`declaration`,attributes:m};if(p===``||p.startsWith(`(`)||p.startsWith(`&`)||Ee(m)){if(!u||f.length||d.some((e,t)=>e!==u[t]))return null;let e=m,t=e[0]?.startsWith(`(`)?ye(e[0]):[];if(t===null||t.some(e=>!Se.test(e)))return null;let n=e.slice(+!!e[0]?.startsWith(`(`)),r=n[0]!==void 0&&!Te(n[0])?n[0]:null;if(r!==null&&!Se.test(r))return null;let i=n.slice(r===null?0:1);return Ee(i)?{kind:`signature`,names:u,optional:[...new Set(t)],main:r,...i.length?{attributes:i}:{}}:null}let h=(we.exec(p)??Ce.exec(p))?.[0];if(!h)return null;let g=p.slice(h.length),_=null;if(/^\s*\(/.exec(g)){let e=ve(g.trimStart())[0].text,t=ye(e);if(!t)return null;_=[];for(let e of t){let t=/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S[\s\S]*)$/.exec(e);if(!t||_.some(e=>e.name===t[1]))return null;_.push({name:t[1],value:t[2].trim()})}g=g.trimStart().slice(e.length)}else if(g&&!/^\s/.test(g))return null;let v=g.trim();return{kind:`use`,id:ge(h),names:u,takes:d,head:f,args:_,main:v||null}}let ke=`A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, &kick=bd from gm_kit (the piece’s &kick, the kit’s bd), * from gm_kit; the head’s attributes go before from (&key label="…" from …), the named arguments in parentheses; with no id, a fragment’s signature: &bar from (&swing) &tempo`;function Ae(e){let t=!1;for(let n=0;n<e.length;n++){let r=e[n];if(r===`"`)t=!t;else if(!t&&(r===`/`&&e[n+1]===`/`||r===`#`&&(n===0||/\s/.test(e[n-1]))))return[e.slice(0,n),e.slice(n)]}return[e,``]}let V=(e,t,n)=>({help:e,doc:t,value:`syntax`,...n?{on:n}:{}}),H=(e,t={})=>({help:e,doc:`sound.md`,value:`number`,on:[`voice`],voice:!0,...t}),U=(e,t,n={})=>({help:e,doc:`physics.md`,value:`number`,on:t,...n}),je={over:V(`the table its numbers read`,`tables.md`),base:V(`the cell it is a copy of, changed where it says: its braid step by step over the base’s (= keeps a step), its attributes where it sets none`,`braid.md`),step:V(`what moves it, step by step`,`time.md`),loop:V(`what moves it, the whole braid at a time, read as a signal: each value held, no note started each step (a voice alone sounds as one held note, &a loop=A4)`,`time.md`),shift:V(`how far it is turned`,`tables.md`),stride:V(`how far each step turns it`,`time.md`),map:V(`how its values sound`,`sound.md`),show:V(`how it’s shown: notes, do, scale, pattern … (and everything below it)`,`display.md`),label:V(`a name to show, in quotes — alone on a cell, a note in the graph`,`display.md`),env:V(`a voice’s own volume on every note: an envelope`,`sound.md`,[`voice`]),pitch:{...V(`a voice’s own pitch on every note: a vibrato, or a shape in semitones (pitch=0..30 * &(map=adsr 0 .04 0 0): a drop)`,`sound.md`,[`voice`]),moves:!0},cycle:V(`laps before it comes round: a turning table’s, an index read through it, a tap’s bars; 0 holds the first entry (a grid’s size is its map’s, map=edo(19))`,`tables.md`),size:V(`how large it’s drawn, against the others: 2 twice, .5 half`,`display.md`),laps:V(`how many laps it plays, then it ends`,`time.md`),chance:V(`what a bare x? means here: the probability it is dropped, or free() for a slider`,`cell.md`),seed:V(`the seed a cell's chance is thrown from, which no edit to the cell moves`,`cell.md`),tags:V(`on a cell: its clusters in the graph, comma-separated`,`display.md`),about:V(`on a note: the cells it explains`,`display.md`,[`note`]),style:V(`its style: a map=style cell, &(map=style …), or a mix of them by weight; or a range from one to another over its scope (style=&funk..&bossa). On the note &style, the section’s, read by axis (&style[bite])`,`style.md`)},W={s:H(`sound source: sine tri saw square pulse white pink brown; or a blend of two waves, the share of the second moved by cells: s=tri..square * &style[bite]`,{value:`word`}),lpf:H(`low-pass cutoff, Hz`,{moves:!0,hz:!0}),lpq:H(`low-pass resonance`,{moves:!0}),hpf:H(`high-pass cutoff, Hz`,{moves:!0,hz:!0}),hpq:H(`high-pass resonance`,{moves:!0}),bpf:H(`band-pass centre, Hz (decision 074)`,{moves:!0,hz:!0}),bpq:H(`band-pass Q: the centre over the bandwidth, 1 unless given (decision 074)`,{moves:!0}),ftype:H(`its filters' model (decision 074): 12db (the default, one biquad each), 24db (two in series), ladder (its low-pass a ladder, lpq= its resonance, drive= its drive); or superdough's numbers 0, 2, 1`,{value:`word`}),room:H(`reverb send 0–1`,{moves:!0}),delay:H(`delay send 0–1`,{moves:!0}),delaytime:H(`echo time, seconds — or a clock: &bar*2 (an eighth at the tempo) — or a tap: 8n, 4n.`,{clock:!0}),delayfeedback:H(`echo feedback 0–1`),glide:{help:`tied notes (each starting as the one before ends) play as one: its envelope once, each next a slide there over this many seconds (dough’s glide; 0 or none: each note its own)`,doc:`sound.md`,value:`number`,on:[`voice`]},oneshot:{help:`on a voice: 1 plays each note’s envelope through (its attack and decay), whatever its step, a drum hit on any grid; 0, the default, as long as its step (decision 068: the bare word oneshot, the old way)`,doc:`sound.md`,value:`number`,on:[`voice`]},note:{help:"on a kit’s member: its MIDI note on the kit’s channel (36 a kick, 38 a snare, General MIDI’s drums: `gm_kit` writes each), a whole number 0–127; its name gives none (decision 075). A member with none takes the next free note from 36",doc:`midi.md`,value:`number`,on:[`voice`],form:`note=n (a whole number 0–127)`},legato:{help:`on a line: each note sounds its written length (@n, _) times this share, its end swung as its onset is, Strudel’s legato (.5 staccato, 1 as written, 1.5 into the next): a number, free(), or a cell of shares read at each onset (legato=&artic); nothing cuts a note at the bar line`,doc:`sound.md`,value:`number`,on:[`clock`,`driven`],moves:!0,form:`legato=n · legato=free(n, lo..hi) · legato=&x · legato=lo..hi * &a * &b · on a meter, its lines’ default by level: legato=16n:r,4n:r`},pan:H(`where it sits in stereo: 0 left, .5 centre (as without it), 1 right — the far side fades; it can move, read at each note’s start (pan=&space, pan=0..1 * &lfo); on a line, as legato= is: the place of the notes it plays, after its voice’s own (#739)`,{moves:!0,on:[`voice`,`clock`,`driven`]}),distort:H(`distortion: 0 clean, .3 gritty, 1 and more harsh`),crush:H(`bit depth: 16 clean, 8 grainy, 3 and fewer: rubble`),fm:H(`frequency modulation: the voice that modulates this one (fm=&op); it may have its own fm=`,{doc:`physics.md`,value:`cell`}),ratio:H(`as a modulator: its frequency against its carrier’s (1 the same, 3.5 a bell)`,{doc:`physics.md`,on:[`modulator`]}),index:H(`FM depth: how far the modulator swings the frequency (0 none … 10 bright); it can move`,{doc:`physics.md`,on:[`carrier`],moves:!0}),body:H(`a resonator: what its exciters are — fork, bell, bar, plate, box, tine, pipe, wire, spring; its braid lists them (semitones; the twelve by default), a note plucks the nearest`,{doc:`physics.md`,value:`word`}),ring:H(`a resonator: how long it rings, in seconds`,{doc:`physics.md`}),hard:H(`a resonator: the mallet — 0 felt (dark), 1 steel (bright)`,{doc:`physics.md`}),board:U(`a resonator: the body its exciters share (box by default, an octave below; none: no board)`,[`resonator`],{value:`word`}),couple:U(`a resonator: another it shares a table with (couple=&other) — each sets the other ringing`,[`resonator`],{value:`cell`}),coupling:U(`a resonator: how strongly it is coupled (.01 faint, .05 strong)`,[`resonator`]),excite:U(`a resonator: sound that drives it (excite=&mix) — it answers where the sound meets its modes`,[`resonator`],{value:`cell`}),postgain:{help:`on the sound card: its master, a linear gain after everything (Strudel’s postgain: 1 as it is, .5 half, a negative one inverts the phase; free(.8, 0..1) a slider)`,doc:`mix.md`,value:`number`,on:[`card`]},pulse:{help:`on a scan: the note value of its entries (pulse=16n: sixteenths) — its beats then count quarters, and its taps read note values by it`,doc:`time.md`,value:`word`,on:[`clock`,`driven`]},swing:{help:`on a meter: a level of its bar leans, named by note value — of each pair of its eighths (swing=8n:.67), the second comes this far through their beat (.5 straight, .67 triplet swing), its pairs lean, a group of three straight (decision 071); every beat and bar line stays. Bare (swing=.6), on a list at a rate: pairs of its steps (on a meter, an error that names the level)`,doc:`time.md`,value:`number`,on:[`clock`],form:`swing=8n:r · swing=8n:r,16n:r · swing=8n:free(r, lo..hi) · swing=r`},bend:{help:`on a meter: a level’s nodes played at the lengths a table gives, named by note value — bend=4n:&rubato with &rubato 27 23 26 24 plays the beats 27:23:26:24 of the bar (decision 080); finer levels within each, swung as they would be; a table longer than the bar spans as many bars as it takes, a tempo map. A scan(…) with a rate is its sugar`,doc:`time.md`,value:`cell`,on:[`clock`],form:`bend=4n:&table`},motor:U(`on a meter: it turns physically — a motor this strong pulls it to its tempo (from rest)`,[`clock`]),mass:U(`physics: how heavy it turns (inertia); on a cell a meter drives, load`,[`clock`,`driven`]),friction:U(`physics: drag — the meter sags below its tempo, more with more load`,[`clock`,`driven`]),wind:U(`on a meter with a motor: its spring runs down over this many seconds, and it coasts to a stop`,[`motor`]),wow:U(`on a meter with a motor: its speed swings slowly by this fraction (.01: a tape machine’s wow)`,[`motor`]),varispeed:U(`on a clock: its notes’ pitch follows its speed, as tape does (1 fully, 0 not)`,[`clock`,`driven`]),belt:U(`on a driven cell (step=&x): it follows through a belt this stiff (200 taut, 20 slack) — it lags, swings, catches up`,[`driven`]),damping:U(`a belt’s damping: how soon its swinging dies (0 rings on, high creeps)`,[`driven`]),slip:U(`a belt’s grip: past this pull it slips, and the cell falls behind for good`,[`driven`]),write:U(`a tape: what its write head records (write=&melody); it moves with its step=`,[`tape`],{value:`cell`}),length:U(`a tape: how long its loop is, in seconds of tape (or a clock: length=&bar/4, or a tap: length=1m); none, an open reel`,[`tape`],{clock:!0}),erase:U(`a tape: how much of what was there each pass under the write head wipes (1 all, .3 leaves ghosts)`,[`tape`]),tone:U(`a sound tape: its loss — each pass through the loop darker (Hz: 7000 bright, 1500 worn)`,[`tape`],{hz:!0}),drive:U(`how hard it saturates: a sound tape, each pass (0 clean, .5 warm, 1 crushed); a ladder (ftype=ladder, decision 074), its input pushed by e^drive into its stages, .69 unless given (superdough's)`,[`tape`,`voice`]),hiss:U(`a sound tape: its noise floor (0 none, .02 a cassette)`,[`tape`]),print:U(`a sound tape: print-through — a faint pre-echo before each head (.03 a whisper)`,[`tape`]),printgap:U(`a sound tape: how far before each head the print-through sits (tape-seconds, .6)`,[`tape`]),dropout:U(`a sound tape: brief gaps in the playback, about this many a second`,[`tape`],{hz:!0}),play:U(`a read head: the tape it reads (play=&tape), at= tape-seconds after the write head; a gate: the notes it plays on the voices in its braid (play=&tune)`,[`head`,`gate`],{value:`cell`}),at:U(`a read head: how far after the write head it sits, in seconds of tape (or a clock: at=&bar, or a tap: at=4n)`,[`head`],{clock:!0}),wander:U(`a read head: how far it wanders either way (tape-seconds) — a flying head`,[`head`]),wanderhz:U(`a read head: how fast it wanders (times a second)`,[`head`],{hz:!0}),level:{help:`on a gate: how loud, a product of level cells and a gain (level=&accent*&duck*.4)`,doc:`mix.md`,value:`number`,on:[`gate`]},licence:{help:`on a gate: its performer’s licence, how far it loosens velocity and length, a share of the feel’s (1 as the contract plays; 0 exactly as written)`,doc:`mix.md`,value:`number`,on:[`gate`]},accents:{help:`on a gate: its performer’s own accents, a share of the feel’s (1 as the contract plays; 0 none)`,doc:`mix.md`,value:`number`,on:[`gate`]},part:{help:`the part the default performer plays a line as (feel v3, decision 075): on a role cell, its performer’s part (&low map=role part=bass &lowOut), or on a line (&low part=bass …): bass, pad, stab, lead or drums; a name gives none`,doc:`mix.md`,value:`word`,form:`part=bass (bass, pad, stab, lead or drums)`},role:{help:`a drum line’s role, as the default performer plays it (feel v3, decision 075): kick, backbeat, ghost, hat, pedal, euclid, ostinato, clave or fill (&k role=kick step=16n &bd!4); a name gives none`,doc:`mix.md`,value:`word`,form:`role=kick (kick, backbeat, ghost, hat, pedal, euclid, ostinato, clave or fill)`},gain:{help:`on a voice: its own gain, dough’s, times every gain it is played at (1 by default, a negative one inverts the phase; a kit member’s balance); on a gate written the old way (trigger=): the number in level=`,doc:`sound.md`,value:`number`,on:[`voice`,`gate`]},scope:{help:`a scope: stack, split, xy (in time) — spectrum, waterfall (in frequency, or value); its braid lists its channels`,doc:`display.md`,value:`word`,on:[`scope`]},fold:{help:`a spectrum or waterfall: pitches folded by this stride into as many bins (12: by pitch class, the default)`,doc:`display.md`,value:`number`,on:[`scope`]},bins:{help:`a spectrum or waterfall without a fold: this many bands, low to high (1 a meter, 3 low-mid-high, 20 an equaliser)`,doc:`display.md`,value:`number`,on:[`scope`]},channels:{help:`a spectrum or waterfall: sum (one, the default) or split (each channel its own)`,doc:`display.md`,value:`word`,on:[`scope`]},restart:{help:`what switching a part on does to its time (on a selector: for all its sections) — restart (from its top, the default), resume (where it stopped), free (its time runs on, only its sound is switched; a performer’s default)`,doc:`time.md`,value:`word`,on:[`section`,`performer`,`selector`],stub:!0},law:{help:`a law that computes the notes: written by a built-in plugin-fragment’s block (decision 085); a piece takes it with &cycle from five_to_twelve &day`,doc:`time.md`,value:`word`,on:[`law`],old:`from five_to_twelve &day`},anchor:{help:`a clock (a day meter, loop=1d): the time of day it stands at when play starts (hours.minutes — 11.55); play begins where the clock stands`,doc:`time.md`,value:`number`,on:[`clock`]}},Me={sound:`s`,cutoff:`lpf`,ctf:`lpf`,lp:`lpf`,resonance:`lpq`,hcutoff:`hpf`,hp:`hpf`,hresonance:`hpq`,bandf:`bpf`,bp:`bpf`,bandq:`bpq`,verb:`room`,reverb:`room`,delayt:`delaytime`,dt:`delaytime`,delayfb:`delayfeedback`,dfb:`delayfeedback`,clip:`legato`},Ne={...je,...W},Pe=new Set(Object.keys(W).filter(e=>W[e].value===`cell`)),Fe=new Set(Object.keys(W).filter(e=>W[e].clock)),Ie=new Set(Object.keys(Ne).filter(e=>Ne[e].moves)),Le=new Set(Object.keys(W).filter(e=>W[e].voice)),Re=new Set([...Le].filter(e=>e!==`pan`)),ze=new Set(Object.keys(W).filter(e=>W[e].doc!==`physics.md`&&W[e].on?.every(e=>e===`clock`||e===`driven`))),Be=/* @__PURE__ */ new Set([`part`,`role`]),Ve=/* @__PURE__ */ new Set([`label`,`show`,`size`,`about`,`tags`,...Be]),He=e=>Object.keys(e).some(e=>!ze.has(e)&&!Be.has(e));function Ue(e){let t={voice:`a voice`,clock:`a meter (step= a rate)`,driven:`a driven cell (step=&x)`,motor:`a meter with a motor=`,tape:`a tape (write=)`,head:`a read head (play=)`,resonator:`a resonator (body=)`,scope:`a scope (scope=)`,law:`a law (law=)`,card:`the sound card (map=sample)`,note:`a note (a label= and nothing else)`,carrier:`a voice with fm=`,modulator:`a voice another’s fm= names`,gate:`a gate (play= with a braid)`,section:`a section (a name a stepped table of names declares)`,performer:`a performer (a gate or a role a band names)`,selector:`a selector (over= a table of sections, or a band)`},n=e.map(e=>t[e]);return n.length<2?n[0]??``:`${n.slice(0,-1).join(`, `)} or ${n[n.length-1]}`}function We(e){let t=null,n=e.length<5?2:3;for(let r of Object.keys(Ne)){let i=Ge(e,r);i<n&&([t,n]=[r,i])}return t}function Ge(e,t){let n=Array.from({length:e.length+1},(e,n)=>[n,...Array(t.length).fill(0)]);for(let e=1;e<=t.length;e++)n[0][e]=e;for(let r=1;r<=e.length;r++)for(let i=1;i<=t.length;i++)n[r][i]=Math.min(n[r-1][i]+1,n[r][i-1]+1,n[r-1][i-1]+(e[r-1]===t[i-1]?0:1)),r>1&&i>1&&e[r-1]===t[i-2]&&e[r-2]===t[i-1]&&(n[r][i]=Math.min(n[r][i],n[r-2][i-2]+1));return n[e.length][t.length]}let Ke=[`12db`,`ladder`,`24db`];function qe(e){return e===void 0?`12db`:typeof e==`number`?Number.isInteger(e)&&e>=0&&e<Ke.length?Ke[e]:null:Ke.includes(e)?e:null}let G=(e,t,n,r,i)=>({section:e,form:t,means:n,examples:r,doc:i}),Je={bpm:{times:1,per:60,syntax:G(`rate`,`nbpm`,`n a minute: beats on a meter (a scan’s entries; meter(…)’s beats, by its signature or levels: 6/8 two, 7/8 three unequal).`,[`&bar meter("4/4") step=84bpm`],`time.md`)},hz:{times:1,per:1,syntax:G(`rate`,`nhz`,`n a second (a plain number says the same).`,[`&a loop=440hz`],`time.md`)},min:{times:1,per:60,syntax:G(`rate`,`nmin`,`n a minute (wall-clock time: loop=1min turns once a minute).`,[`&tick scan(1!60) loop=1min`],`time.md`)},h:{times:1,per:3600,syntax:G(`rate`,`nh`,`n an hour.`,[`&hour scan(1!60) loop=1h`],`time.md`)},d:{times:1,per:86400,syntax:G(`rate`,`nd`,`n a day: a day meter, loop=1d (anchor= where it stands when play starts).`,[`&day scan(1!24) loop=1d anchor=11.55`],`time.md`)},wk:{times:1,per:604800,syntax:G(`rate`,`nwk`,`n a week.`,[`&week scan(1!7) loop=1wk`],`time.md`)},k:{times:1e3,per:1,syntax:G(`rate`,`nk`,`n thousand a second: a sample rate.`,[`&out loop=44.1k map=sample &mix`],`mix.md`)}},Ye=new RegExp(Object.keys(Je).sort((e,t)=>t.length-e.length).join(`|`),`y`),Xe=(e,t)=>{let n=t?Je[t]:void 0;return n?e*n.times/n.per:e},Ze={largo:[40,60],larghetto:[60,66],adagio:[66,76],andante:[76,108],moderato:[108,120],allegro:[120,156],vivace:[156,176],presto:[168,200]};`${Object.entries(Ze).map(([e,[t,n]])=>`${e} ${t}–${n}`).join(`, `)}`;let Qe=`free(0 2 4 ~ …), a braid left to the performer, is a cell's whole braid: &riff over=&key free(0 2 4 ~), with nothing else as its braid`,$e=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:\/[1-9][0-9]*)?/y,et=e=>{let[t,n]=e.split(`/`);return n===void 0?parseFloat(t):parseFloat(t)/Number(n)};function tt(e,t,n,r={}){let i=e.i;if(e.match(/free\(/y)===null&&e.fail(`free(…)`),e.skipSpace(),e.peek()===`"`){let t=e.match(/"[^"]*"/y);e.skipSpace(),e.expect(`)`,`')' to close free("…")`);let n={key:`text`,value:0,unit:``,lo:0,hi:0,span:e.place(i),text:t.slice(1,-1)};return e.frees.push(n),n}(/(?:~|\[|-?[0-9.]+[#b]*(?:[@!*][0-9]+)?\s+[^\s,])/y.test(e.text.slice(e.i))||/^-?[0-9.]+[#b]*\)/.test(e.text.slice(e.i)))&&e.fail(Qe,i,e.i-i);let a=e.i,o=t===`shift`||t===`tonic`?e.noteName():null;o!==null&&/[0-9]/.test(e.text.slice(a,e.i))&&e.warn(`free(${e.text.slice(a,e.i)}): a key is a pitch class — the octave is left out: free(${e.text.slice(a,e.i).replace(/-?[0-9]+$/,``)})`,a,e.i-a);let s=o===null?e.match(/[a-z]+/y):null,c,l=``,u,d,f;if(o!==null)c=(o%12+12)%12,[u,d]=[0,11],f=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`];else if(s!==null){let n=Ze[s];(!n||t===`shift`||t===`stride`||t===`gain`||t===`tonic`||r.whole)&&e.fail(`free(${s}): a tempo marking (${Object.keys(Ze).join(`, `)}) — for a rate`,i,e.i-i),[u,d]=n,c=Math.round((u+d)/2),l=`bpm`}else{let t=e.match($e);t===null&&e.fail(`free(default, lo..hi), like free(90bpm, 60..240) or free(.8, 0..1)`),c=et(t),n&&(l=e.match(Ye)??``),e.skipSpace(),e.expect(`,`,`',' then the range, like free(${t}${l}, 60..240)`),e.skipSpace();let r=e.match($e);e.match(/\.\./y)===null&&e.fail(`a range lo..hi, like 60..240`);let a=e.match($e);(r===null||a===null)&&e.fail(`a range lo..hi, like 60..240`),u=et(r),d=et(a),u<d||e.fail(`free(…): the range runs low to high (${u}..${d})`,i,e.i-i),(c<u||c>d)&&e.fail(`free(…): ${c} is outside ${u}..${d}`,i,e.i-i)}e.skipSpace();let p=()=>{if(!/,\s*unit=/y.test(e.text.slice(e.i)))return;let t=e.i;e.i++,e.skipSpace(),e.match(/unit=/y);let r=e.match(/[a-z]+/y)??``,i=r?Je[r]:void 0;n&&i||e.fail(n?`unit=${r}: a rate's unit (${Object.keys(Je).join(`, `)})`:`unit=: a unit is for a rate (step=, loop=)`,t,e.i-t),l&&e.fail(`free(…${l}, …, unit=${r}): the unit is given twice — written after the number, or as unit= with the numbers a second`,t,e.i-t);let a=e=>+(e*i.per/i.times).toPrecision(12);[c,u,d]=[a(c),a(u),a(d)],l=r,e.skipSpace()};p();let m;if(e.peek()===`,`&&!/,\s*unit=/y.test(e.text.slice(e.i))){e.i++,e.skipSpace();let t=e.match(/"[^"]*"/y);t===null&&e.fail(`names for the choices, in quotes: free(0, 0..3, "a b c d")`),m=t.slice(1,-1).trim().split(/\s+/).filter(Boolean);let n=m.length>1?(d-u)/(m.length-1):0;if(o!==null){let n=e.text.lastIndexOf(`,`,e.i-t.length);e.warn(`free(${e.text.slice(a,n).trim()}, ${t}): a key by name has the twelve pitch names as its choices, so these names are ignored (names of your own go on a range: free(3, 0..11, "…"))`,n,e.i-n),m=void 0}else(!Number.isInteger(u)||!Number.isInteger(d)||m.length<2||!Number.isInteger(n)||n<1)&&e.fail(`free(…, "${m.join(` `)}"): the names spread evenly over ${u}..${d} — ${m.length} names need ${m.length-1} equal whole steps (${u}..${u+m.length-1}, or every 2nd: ${u}..${u+2*(m.length-1)})`,i,e.i-i);e.skipSpace()}p(),e.expect(`)`,`')' to close free(…)`),m??=f;let h={key:t,value:c,unit:l,lo:u,hi:d,span:e.place(i),...r.param===void 0?{}:{param:r.param},...r.whole?{whole:!0}:{},...m?{labels:m}:{},...o===null?{}:{byName:!0}};return e.frees.push(h),h}let nt=`fifths12TET`,rt=5e4,it=2e3,at=[`name`,`notes`,`tonic`,`mode`,`steps`,`tempo`,`shift`],ot={fork:[[1,1,1],[6.27,.03,.35]],bell:[[.5,1,.5],[1,.8,1],[1.2,.6,.7],[1.5,.5,.45],[2,.45,.6],[2.5,.3,.35],[2.67,.28,.3],[3,.22,.25]],bar:[[1,1,1],[2.756,.45,.5],[5.404,.22,.3],[8.933,.12,.18]],plate:[[1,1,.8],[1.58,.8,.7],[2.24,.7,.6],[2.92,.55,.55],[3.15,.5,.5],[3.88,.4,.4],[4.47,.35,.35],[5,.3,.3]],box:[[1,1,1],[1.42,.7,.6],[1.91,.5,.45],[2.53,.35,.3]],tine:[[1,1,1],[5.93,.12,.35],[17.6,.03,.12]],pipe:[1,3,5,7,9,11,13].map(e=>[e,1/Math.sqrt(e),1/e]),wire:Array.from({length:12},(e,t)=>t+1).map(e=>[e*Math.sqrt(1+6e-4*e*e),1/(.6+.4*e),1/e]),spring:[[1,1,1]]};function st(e){if(typeof e!=`number`)return[1,1];let t=Math.min(1,Math.max(0,e));return[Math.min(1,2*(1-t)),Math.min(1,2*t)]}let ct=e=>e?.map?.kind===`midi`,lt=e=>t=>e.cells.get(t)?.shift??0,ut={SAMPLE_RATE:48e3,A4:440},dt={C:-9,D:-7,E:-5,F:-4,G:-2,A:0,B:2};function ft(e,t=440){let n=/^([A-G])([#b]?)(-?\d+)$/.exec(e);return n?t*2**((dt[n[1]]+(n[2]===`#`?1:n[2]===`b`?-1:0)+12*(parseInt(n[3],10)-4))/12):null}function pt(e,t){if(!t)return Array.from({length:e},(e,t)=>t);if(t.kind===`at`){let n=t.i<0?e+t.i:t.i;return n>=0&&n<e?[n]:null}let n=t.step??1,r=t=>t<0?e+t:t,i=[];if(n>0){let a=t.from===null?0:Math.max(0,Math.min(e,r(t.from))),o=t.to===null?e:Math.max(0,Math.min(e,r(t.to)));for(let e=a;e<o;e+=n)i.push(e)}else{let a=t.from===null?e-1:Math.max(-1,Math.min(e-1,r(t.from))),o=t.to===null?-1:Math.max(-1,Math.min(e-1,r(t.to)));for(let e=a;e>o;e+=n)i.push(e)}return i.length?i:null}function mt(e,t,n){let r=pt(e,t);return!r||!t||t.abs||!e?r:r.map(t=>((t+n)%e+e)%e)}function ht(e,t){if(!t)return e.steps;let n=mt(e.units.length,t,e.shift);return n?n.reduce((t,n)=>t+e.unitSteps[n],0):null}function gt(e,t,n){let r=`&${e}${ee(t)}`,i=`&${e} has ${n} step${n===1?``:`s`}`;if(!t||t.kind===`at`)return`${r} picks nothing: ${t&&t.i<0?`before the start`:`past the end`}, ${i}`;let a=t.step??1;return a>0&&t.from!==null&&(e=>e<0?n+e:e)(t.from)>=n?`${r} picks nothing: it starts past the end, ${i}`:`${r} picks nothing: ${a>0?`it ends before it starts (a slice runs forwards unless its step is negative: [::-1])`:`it ends after it starts (a negative step runs backwards)`}, ${i}`}function _t(e){if(e.map?.kind!==`adsr`)return null;let t=e.units.map(e=>e.atom.kind===`note`?e.atom.value:NaN);return t.length!==4||t.some(e=>!(e>=0))?null:{attack:t[0],decay:t[1],sustain:Math.min(1,t[2]),release:t[3]}}function vt(e){return e.root||e.scan!==null||!!e.bend}let yt=10080,bt=yt*12,xt=[`Ionian`,`Dorian`,`Phrygian`,`Lydian`,`Mixolydian`,`Aeolian`,`Locrian`],St=[2,2,1,2,2,2,1],Ct=[0,4,1,5,2,6,2,5,1,4,0,3],wt=[`the false zenith`,`the first shadow`,`twilight`,`evening`,`late night`,`the nadir`,`the spark`,`deep morning`,`dawn`,`morning`,`mid-morning`,`the earned zenith`],Tt=(e,t)=>(e%t+t)%t;[5,3,1,6,4,2,0].map(e=>e/6);function Et(e){let t=[0];for(let n=0;n<6;n++)t.push(t[n]+St[(n+e)%7]);return t}function Dt(e){let t=Tt(Math.floor(e),bt),n=Math.floor(t/yt),r=Math.floor(t%yt/840);return{block:n,key:r,bar:Math.floor(t%840/12),inBar:t%12,mode:Ct[n],tonic:Ot(n,r)}}function Ot(e,t){return Tt((e<6?7:5)*t,12)}function kt(e,t){let n=[0,4,1,5,2,6,3],r=Ct[e];return n.map((e,i)=>Tt(n[(i+t)%7]+r,7))}function At(e){return Et(e)}function jt(e,t,n){let r=Math.floor(n/7),i=n%7,a=e.map((t,n)=>e[(n+i)%7]),o=At(t);r===1&&(o=o.map((e,t)=>Tt(o[(t+i)%7]-o[i],12)).sort((e,t)=>e-t));let s=[];for(let e=0;e<7;e++){let t=a[e],n=a[(e+2)%7]+1,c=a[(e+4)%7],l=a[(e+6)%7];r===0&&(t=Tt(t+i+1,7)),r===2&&(n=8-n),r===3&&(c=a[(6-e+4)%7]),r===4&&(l=Tt(l*5,7));let u=o[e],d=e<6?o[e+1]:12;s.push({at:u,dur:d-u,degree:t,density:n,dynamic:c,space:l})}return s}function Mt(e,t,n){let r=kt(e,t),i=Ct[e];return n<35?jt(r,i,n):jt(r,i,69-n).map(e=>({...e,at:12-(e.at+e.dur),degree:Tt(-e.degree,7)})).sort((e,t)=>e.at-t.at)}let Nt=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],Pt=[`0`,`1/6`,`1/3`,`1/2`,`2/3`,`5/6`,`1`],Ft=(e,t)=>t>1?`${e}@${t}`:e,It=(e,t)=>e.map(e=>Ft(t(e),e.dur)).join(` `);function Lt(e,t){let n=Dt(e*t);return{...n,bar:Mt(n.block,n.key,n.bar)}}function Rt(e,t){if(e===`notes`)return It(Lt(t,12).bar,e=>e.density>1?`[${Array.from({length:e.density},(t,n)=>e.degree+2*n).join(`, `)}]`:String(e.degree));if(e===`level`)return It(Lt(t,12).bar,e=>String(+(.18+e.dynamic*.11).toFixed(2)));if(e===`space`)return It(Lt(t,12).bar,e=>Pt[e.space]);if(e===`mode`)return xt[Dt(t*840).mode??0].toLowerCase();if(e===`tonic`)return Nt[Dt(t*840).tonic];if(e===`block`){let e=Tt(t,12);return`${xt[Ct[e]]} · ${wt[e]}`}throw Error(`fiveto12 has no fill ${e}`)}let zt={id:`fiveto12`,fragment:`five_to_twelve`,fills:{mode:{lap:840},tonic:{lap:840},notes:{lap:12},level:{lap:12},space:{lap:12},block:{lap:yt,mark:!0}},origin:11.55,cycle:bt,stepSeconds:.7142857142857143,fill:(e,t)=>Rt(e,t)},Bt=e=>e.levels.length/Math.max(1,e.pulses);function Vt(e){let t=/^([1-9][0-9]*)(n\.?|t)$/.exec(e);if(!t)return null;let n=parseInt(t[1],10);return t[2]===`n.`?3/(2*n):t[2]===`t`?2/(3*n):1/n}function Ht(e,t){let n=1/t,r=n/4;if(!(r>1))return{...e,unit:n};let i=[];for(let t=0;t<e.pulses-1e-9;t+=r)i.push(Math.min(r,e.pulses-t));return{...e,unit:n,beats:i,counted:e.pulses/r}}let Ut=e=>e.counted??Math.max(1,e.beats.length);function Wt(e,t,n,r,i=1){let a=[],o=0;for(let s=0;s<n*r;s++){let n=e[s%e.length],r=i===1?n:n**+i;for(let e=0;e<t;e++)a.push(o+e*r/t);o+=r}return{positions:a,lap:o}}function Gt(e,t){let n=t.filter(e=>e.share!==.5);return n.length?{...e,swing:n}:e}function Kt(e){let t=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>=1&&Number.isInteger(Math.log2(Math.round(e)));return t(1/e)?`${Math.round(1/e)}n`:t(2/(3*e))?`${Math.round(2/(3*e))}t`:t(3/(2*e))?`${Math.round(3/(2*e))}n.`:null}let qt=e=>Kt(1/(e.unit*Bt(e)));function Jt(e,t){let n=t*e.unit;if(!e.beats.some(e=>{let t=e/n;return Math.abs(t-Math.round(t))<1e-9&&Math.round(t)>=2}))return`no beat of this meter divides into two or more of ${Kt(t)??`them`} (its beats: ${e.beats.map(t=>Kt(t/e.unit)??t).join(` `)}), and swing never moves a beat`;let r={...e,swing:[{level:Kt(t)??``,whole:t,share:.6}]};for(let t=0;t*n<e.pulses-1e-9;t++)if(Math.abs(Qt(r,t*n)-t*n)>1e-9)return null;return`every group of ${Kt(t)??`them`} in it is three, and a swing leans pairs alone, its groups of three straight`}let Yt=e=>{for(let t=0,n=e;t<=6;t++,n*=2)if(Math.abs(n-Math.round(n))<1e-9)return!0;return!1};function Xt(e,t){return t!==null&&e===2?[0,Math.min(.95,Math.max(.05,t.share)),1]:Array.from({length:e+1},(t,n)=>n/e)}function Zt(e,t,n,r){let i=Math.min(...n.map(e=>e.len)),a=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>=1,o=r!==void 0&&r>0&&a(t/r)?r:void 0,s=0,c=t,l=0,u=t;for(let t=0;t<16;t++){let t=c/i,r=Math.round(t);if(Math.abs(t-r)>1e-9||r<2)break;let d=r===2||r===3?r:r%3==0?3:r%2==0?2:r,f=c/d,p=(e-s)/c*d;if(o===void 0?!Yt(p):!a(f/o))break;let m=Xt(d,n.find(e=>Math.abs(e.len-f)<1e-9)??null),h=Math.min(d-1,Math.max(0,Math.floor(p+1e-9)));s+=h*f,c=f,l+=m[h]*u,u*=m[h+1]-m[h]}return l+(e-s)/c*u}function Qt(e,t,n){if(!e.swing?.length)return t;let r=e.swing.map(t=>({len:t.whole*e.unit,share:t.share})),i=e.pulses,a=Math.floor(t/i+1e-9),o=t-a*i,s=0,c=0;for(;c<e.beats.length-1&&s+e.beats[c]<=o+1e-9;)s+=e.beats[c++];let l=e.beats[c]??i;return a*i+s+Zt(o-s,l,r,n)}function $t(e){if(!e.swing?.length)return null;let t=Math.min(...e.swing.map(t=>t.whole*e.unit));if(!(t>0))return null;let n=[],r=0;for(let i of e.beats.length?e.beats:[e.pulses]){for(let e=0;e<i-1e-9;e+=t)n.push(r+e);r+=i}return n.push(e.pulses),{written:n,swung:n.map(t=>t>=e.pulses-1e-9?e.pulses:Qt(e,t))}}function en(e,t){return rn(e,t,!1)}function tn(e,t){return rn(e,t,!0)}let nn=/* @__PURE__ */ new WeakMap;function rn(e,t,n){nn.has(e)||nn.set(e,$t(e));let r=nn.get(e);if(!r)return t;let[i,a]=n?[r.swung,r.written]:[r.written,r.swung],o=e.pulses,s=Math.floor(t/o+1e-12),c=t-s*o,l=0;for(;l+2<i.length&&i[l+1]<=c+1e-12;)l++;let u=i[l+1]-i[l];return s*o+a[l]+(u>0?(c-i[l])/u*(a[l+1]-a[l]):0)}function an(e){let t=Bt(e),n=e.levels.map((n,r)=>Qt(e,r/t)*t);return n.some((e,t)=>Math.abs(e-t)>1e-12)?n:null}function on(e,t){let n=t??sn(e);return{levels:e,written:`meter`,pulses:n.pulses,unit:n.unit,beats:n.beats}}function sn(e){let t=e.flatMap((e,t)=>t===0||e<=2?[t]:[]),n=t.map((n,r)=>(t[r+1]??e.length)-n),r=e.length/Math.max(1,n.length),i=Number.isInteger(Math.log2(r))?4*r:8;return{pulses:e.length,unit:i,beats:n}}function cn(e){let t=e.length;return{levels:e.map(()=>1),written:`scan`,pulses:t,unit:4,beats:e.map(()=>1)}}function ln(e,t,n=1){let r=[],i=e.pulses,a=i*Math.max(1,n);if(t.kind===`note`){let n=t.whole*e.unit;for(let e=0;e*n<a-1e-9;e++)r.push(e*n);return r}for(let a=0;a<Math.max(1,n);a++)if(t.kind===`bar`)r.push(a*i);else if(t.kind===`pulse`)for(let e=0;e<i;e++)r.push(a*i+e);else{let t=0;for(let n of e.beats)r.push(a*i+t),t+=n}return r}function un(e,t,n){let r=(t===`pulse`?1:t===`beat`?Math.max(...e.beats):t===`1m`?e.pulses:(Vt(t)??0)*e.unit)/e.unit/n;return(e.legato??[]).filter(e=>e.whole>=r-1e-9).sort((e,t)=>e.whole-t.whole)[0]?.share??1}let dn=`no: read as the piece is built`,K="`&k`, a cell that is one number, or a sum of numbers alone, filled as the piece is built (decision 105)",fn=e=>`not yet: ${e}`,pn="`&k`, `lo..hi * &k`",q=e=>e,J={param:q({form:`lpf=n, and every sound parameter`,name:`param`,cell:`${pn}, on a parameter that moves (postgain= doesn't: the renderer's; pan= is read at each note's start)`,moves:!0,example:`&lead s=saw loop=C4 lpf=free(1200, 200..5000)`}),level:q({form:`level=&a * n (a gate)`,name:`level`,cell:"`&a * &b * n`",moves:!0,example:`&out play=&tune level=&accent*free(.4, 0..1) &tune`}),slot:q({form:`attack=n (an envelope by name)`,name:`slot`,cell:`${pn}: \`&k\` its values as the slot's (seconds; sustain a level), held at 0 until a note reads it`,moves:!0,example:`&env map=adsr attack=free(.01, 0..1) decay=.3 sustain=.5 release=.4`}),axis:q({form:`sync=n (a style by name)`,name:`axis`,cell:`${pn}, within the axis (#576)`,moves:!0,example:`&mine map=style sync=free(.3, 0..1) harm=.45 bite=.55 mood=.5`}),end:q({form:`lo..hi * &k (a moving range’s ends) · c ± r`,name:`end`,cell:fn(`a range’s end is a number or a slider; its cells move what lies between (decision 079)`),example:`&lead s=saw loop=C4 lpf=free(400, 200..800)..free(2400, 1200..4800) * &lfo`}),share:q({form:`swing=8n:n (a swing’s share)`,name:`share`,cell:`${pn}, one level alone, read at each bar line and held through the bar (decision 081)`,moves:!0,example:`&bar meter("4/4") step=90bpm swing=8n:free(.6, .5...75)`}),depth:q({form:`bend=4n:&t:d (a bend’s depth)`,name:`depth`,cell:`${pn}, read at each line of its table’s span, held through it (decision 081)`,moves:!0,example:`&bar meter("*.-.+.-.") step=90bpm bend=4n:&(27 23 26 24):free(1, -1..2)`}),legatoShare:q({form:`legato=8n:n (a legato’s share by level)`,name:`share`,cell:fn(`a meter’s legato by level is its lines’ default; a line moves its own, legato=&artic`),example:`&bar meter("4/4") step=90bpm legato=8n:free(.5, .25..1)`}),gain:q({form:`[&x * n] (a gain in a mix)`,name:`gain`,key:`gain`,cell:"`&k`; a range moved by cells is a cell of its own, `&g [&k * .6 + .2]`, then `[&x * &g]` (decision 079)",moves:!0,example:`&out [&strings * free(.4, 0..1)]`}),hit:q({form:`&x:0:n (a hit’s gain)`,name:`hit`,min:0,cell:"no: a hit’s gain is a number; a moving one is `velocity=&accent`, or a gate’s `level=`",example:`&beat step=8 &bd &hh:0:free(.4, 0..1)`}),weight:q({form:`style=[&a * n, …] (a weight)`,name:`weight`,min:0,cell:"no: a weight is a number; a crossfade is `style=&a..&b * &curve`",example:`&s style=[&funk * free(.8, 0..1), &bossa * .2]`}),tonic:q({form:`scale(name, n) (a tonic)`,name:`tonic`,key:`tonic`,whole:!0,rounds:!0,cell:"`&k` (a note); a tonic is a pitch class, never a range",moves:!0,example:`&key scale(dorian, free(2, 0..11))`}),rate:q({form:`step=n · loop=n (a rate)`,name:`step`,key:`step`,units:!0,cell:"a clock (`step=&bar`): another meaning",moves:!0,example:`&bar meter("4/4") step=free(90bpm, 60..240)`}),by:q({form:`step=&bar*n · step=&bar/n`,name:`by`,min:0,cell:K,fills:{placeholder:1,read:`a rate’s factor`},example:`&fast step=&bar*free(2, 1..4) 0 2`}),shift:q({form:`shift=n`,name:`shift`,key:`shift`,whole:!0,rounds:!0,cell:K,fills:{placeholder:0,read:`shift=`},example:`&key step=cycle(&theme) shift=free(0, 0..11)`}),stride:q({form:`stride=n`,name:`stride`,key:`stride`,whole:!0,rounds:!0,cell:K,fills:{placeholder:0,read:`stride=`},example:`&key step=cycle(&theme) stride=free(0, 0..7)`}),cycle:q({form:`cycle=n`,name:`cycle`,whole:!0,min:0,max:rt,cell:K,fills:{placeholder:0,read:`cycle=`},example:`&wheel cycle=free(1, 0..4) 0 4 7`}),laps:q({form:`laps=n`,name:`laps`,whole:!0,min:1,cell:K,fills:{placeholder:1,read:`laps=`},example:`&bar meter("4/4") step=84bpm laps=free(30, 1..60)`}),chance:q({form:`chance=p`,name:`chance`,key:`chance`,min:0,max:1,cell:K,fills:{placeholder:0,read:`chance=`},example:`&ghost chance=free(.7, 0..1) step=4 0? 0?`}),seed:q({form:`seed=n`,name:`seed`,whole:!0,cell:K,fills:{placeholder:0,read:`seed=`},example:`&ghost seed=free(7, 0..99) step=4 0? 0? 0? 0?`}),size:q({form:`size=x`,name:`size`,min:.25,max:4,cell:K,fills:{placeholder:1,read:`size=`},example:`&theme size=free(2, .25..4) step=2 0 2 4`}),interval:q({form:`scan(n …) (an interval)`,name:`interval`,key:`interval`,cell:dn,example:`&mode scan(2 2 free(1, 1..2) 2 2 2 1)`}),intervals:q({form:`scan(n!k …) (an interval’s repeat)`,name:`repeat`,whole:!0,min:1,cell:dn,example:`&map scan(1!free(4, 1..8) 2)`}),geo:q({form:`geo(r, n, k …)`,name:`geo`,cell:dn,example:`&series scan(geo(free(5, 2..8), 25, 0 10 5))`}),args:q({form:`euclid(k, n, r) · sin(n) …`,name:`arg`,whole:!0,cell:"`&k`, a cell that is one number, filled as the piece is built (decisions 093, 101)",example:`&hits euclid(free(3, 0..8), 8) step=8`}),evenArg:q({form:`even(k, n, phase) (an argument)`,name:`arg`,whole:!0,cell:"`&k`, a cell that is one number, filled as the piece is built (decision 093); a mode’s name only as even(7, 12)’s phase; a key’s phase may step, read at each bar line",moves:!0,example:`&key scale(even(7, 12, free(3, 0..6)), D)`}),fifths:q({form:`fifths(n)`,name:`fifths`,whole:!0,cell:K,fills:{placeholder:0,read:`fifths(n)`},example:`&circle fifths(free(1, 0..11))`}),meter:q({form:`meter(n, n)`,name:`meter`,key:`choice`,cell:'`&k`, filled as the piece is built (decision 101): a text cell for its signature (`&meter "3/4"`), a cell that is one number for its step',example:`&bar meter(free(2, 0..3, "2/4 3/4 4/4 6/8")) step=90bpm`}),grid:q({form:`map=edo(n) · map=ed(n, r) · map=midi(c, p)`,name:`grid`,whole:!0,min:1,cell:K,fills:{placeholder:12,read:`a grid’s size`},example:`&edo map=edo(free(19, 5..31))`}),ratio:q({form:`map=ed(r)`,name:`ratio`,cell:K,fills:{placeholder:2,read:`a grid’s ratio`},example:`&bp map=ed(13, free(3, 1.5..4))`}),step:q({form:`0 2 4 (a step of a braid)`,name:`value`,cell:"a cell plays there (`&k`, spliced)",moves:!0,example:`&tune step=2 0 free(2, 0..7) 4`}),modifier:q({form:`x!n · x@n · x*n · x/n`,name:`count`,whole:!0,min:1,max:4096,cell:K,fills:{placeholder:1,read:`a count`},example:`&beat step=4 0!free(4, 1..8) 2`}),drop:q({form:`x?p`,name:`drop`,min:0,max:1,cell:K,fills:{placeholder:0,read:`x?p`},example:`&hats step=4 0 0?free(.3, 0..1)`}),euclidOn:q({form:`x(k, n, r)`,name:`euclid`,whole:!0,cell:K,fills:{placeholder:1,read:`x(k, n, r)`},example:`&groove step=1 0(free(3, 0..8),8)`}),pick:q({form:`&x[i] · &x[a:b:s] · &x[$i]`,name:`pick`,whole:!0,cell:K,fills:{placeholder:0,read:`a pick`},example:`&tune step=2 &motif[free(0, 0..3)]`}),turn:q({form:`&x[<<n] · &x[>>n]`,name:`turn`,whole:!0,min:0,cell:K,fills:{placeholder:0,read:`a turn`},example:`&canon step=2 &theme[>>free(4, 0..7)]`}),move:q({form:`&x^n · &x^$n · degree(&x, n)`,name:`move`,whole:!0,cell:K,fills:{placeholder:0,read:`a move`},example:`&tune step=2 &motif &motif^free(1, -7..7)`}),hitNumber:q({form:`&x:n (a hit’s number)`,name:`hit`,fixed:`a pitched hit is not yet: it is 0`,cell:dn,example:`&beat step=8 &bd:0`})},mn=(e,t)=>(e%t+t)%t;[`Locrian`,`Phrygian`,`Aeolian`,`Dorian`,`Mixolydian`,`Ionian`,`Lydian`].map((e,t)=>({name:e,intervals:yn(7,12,t)}));let hn=(e,t,n)=>Sn(yn(e,t,n),t),gn={major:{steps:hn(7,12,5),name:`Ionian`},minor:{steps:hn(7,12,2),name:`Aeolian`},ionian:{steps:hn(7,12,5),name:`Ionian`},dorian:{steps:hn(7,12,3),name:`Dorian`},phrygian:{steps:hn(7,12,1),name:`Phrygian`},lydian:{steps:hn(7,12,6),name:`Lydian`},mixolydian:{steps:hn(7,12,4),name:`Mixolydian`},aeolian:{steps:hn(7,12,2),name:`Aeolian`},locrian:{steps:hn(7,12,0),name:`Locrian`},harmonic:{steps:[2,1,2,2,1,3,1],name:`Harmonic minor`},melodic:{steps:[2,1,2,2,2,2,1],name:`Melodic minor`},pentatonic:{steps:hn(5,12,0),name:`Pentatonic`},minorpentatonic:{steps:hn(5,12,3),name:`Minor pentatonic`},blues:{steps:[3,2,1,1,3,2],name:`Blues`},wholetone:{steps:hn(6,12,0),name:`Whole tone`}},_n={locrian:0,phrygian:1,aeolian:2,minor:2,dorian:3,mixolydian:4,ionian:5,major:5,lydian:6},vn=e=>Sn(yn(7,12,e),12);function yn(e,t,n=0,r){let i=r=>Math.floor((r*t+n)/e);return r===void 0?Array.from({length:e},(e,t)=>i(t)):[i(r)]}let bn={"4/4":[0,3.24,6,9.12],"3/4":[0,3.36,7.8]};function xn(e,t){return[...bn[`${e}/${t}`]??Array.from({length:e},(t,n)=>n*12/e)]}function Sn(e,t){return e.map((n,r)=>+((r+1<e.length?e[r+1]:e[0]+t)-n).toFixed(6))}function Cn(e){let t=[],n=0;for(let r of e)t.push(+n.toFixed(6)),n+=r;return{positions:t,lap:+n.toFixed(6)}}function wn(e){let t=/^([A-G])(#|b)?(-?[0-9]+)?$/.exec(e);return t?{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[t[1]]+(t[2]===`#`?1:t[2]===`b`?-1:0)+12*((t[3]===void 0?4:parseInt(t[3],10))-4):null}let Tn=[[`1P 2M 3M 5P 6M`,`major pentatonic`,`pentatonic`],[`1P 2M 3M 4P 5P 6M 7M`,`major`,`ionian`],[`1P 2M 3m 4P 5P 6m 7m`,`minor`,`aeolian`],[`1P 2M 3m 3M 5P 6M`,`major blues`],[`1P 3m 4P 5d 5P 7m`,`minor blues`,`blues`],[`1P 2M 3m 4P 5P 6M 7M`,`melodic minor`],[`1P 2M 3m 4P 5P 6m 7M`,`harmonic minor`],[`1P 2M 3M 4P 5P 6M 7m 7M`,`bebop`],[`1P 2M 3m 4P 5d 6m 6M 7M`,`diminished`,`whole-half diminished`],[`1P 2M 3m 4P 5P 6M 7m`,`dorian`],[`1P 2M 3M 4A 5P 6M 7M`,`lydian`],[`1P 2M 3M 4P 5P 6M 7m`,`mixolydian`,`dominant`],[`1P 2m 3m 4P 5P 6m 7m`,`phrygian`],[`1P 2m 3m 4P 5d 6m 7m`,`locrian`],[`1P 3M 4P 5P 7M`,`ionian pentatonic`],[`1P 3M 4P 5P 7m`,`mixolydian pentatonic`,`indian`],[`1P 2M 4P 5P 6M`,`ritusen`],[`1P 2M 4P 5P 7m`,`egyptian`],[`1P 3M 4P 5d 7m`,`neapolitan major pentatonic`],[`1P 3m 4P 5P 6m`,`vietnamese 1`],[`1P 2m 3m 5P 6m`,`pelog`],[`1P 2m 4P 5P 6m`,`kumoijoshi`],[`1P 2M 3m 5P 6m`,`hirajoshi`],[`1P 2m 4P 5d 7m`,`iwato`],[`1P 2m 4P 5P 7m`,`in-sen`],[`1P 3M 4A 5P 7M`,`lydian pentatonic`,`chinese`],[`1P 3m 4P 6m 7m`,`malkos raga`],[`1P 3m 4P 5d 7m`,`locrian pentatonic`,`minor seven flat five pentatonic`],[`1P 3m 4P 5P 7m`,`minor pentatonic`,`vietnamese 2`],[`1P 3m 4P 5P 6M`,`minor six pentatonic`],[`1P 2M 3m 5P 6M`,`flat three pentatonic`,`kumoi`],[`1P 2M 3M 5P 6m`,`flat six pentatonic`],[`1P 2m 3M 5P 6M`,`scriabin`],[`1P 3M 5d 6m 7m`,`whole tone pentatonic`],[`1P 3M 4A 5A 7M`,`lydian #5p pentatonic`],[`1P 3M 4A 5P 7m`,`lydian dominant pentatonic`],[`1P 3m 4P 5P 7M`,`minor #7m pentatonic`],[`1P 3m 4d 5d 7m`,`super locrian pentatonic`],[`1P 2M 3m 4P 5P 7M`,`minor hexatonic`],[`1P 2A 3M 5P 5A 7M`,`augmented`],[`1P 2M 4P 5P 6M 7m`,`piongio`],[`1P 2m 3M 4A 6M 7m`,`prometheus neapolitan`],[`1P 2M 3M 4A 6M 7m`,`prometheus`],[`1P 2m 3M 5d 6m 7m`,`mystery #1`],[`1P 2m 3M 4P 5A 6M`,`six tone symmetric`],[`1P 2M 3M 4A 5A 6A`,`whole tone`,`messiaen's mode #1`],[`1P 2m 4P 4A 5P 7M`,`messiaen's mode #5`],[`1P 2M 3M 4P 5d 6m 7m`,`locrian major`,`arabian`],[`1P 2m 3M 4A 5P 6m 7M`,`double harmonic lydian`],[`1P 2m 2A 3M 4A 6m 7m`,`altered`,`super locrian`,`diminished whole tone`,`pomeroy`],[`1P 2M 3m 4P 5d 6m 7m`,`locrian #2`,`half-diminished`,`aeolian b5`],[`1P 2M 3M 4P 5P 6m 7m`,`mixolydian b6`,`melodic minor fifth mode`,`hindu`],[`1P 2M 3M 4A 5P 6M 7m`,`lydian dominant`,`lydian b7`,`overtone`],[`1P 2M 3M 4A 5A 6M 7M`,`lydian augmented`],[`1P 2m 3m 4P 5P 6M 7m`,`dorian b2`,`phrygian #6`,`melodic minor second mode`],[`1P 2m 3m 4d 5d 6m 7d`,`ultralocrian`,`superlocrian bb7`,`superlocrian diminished`],[`1P 2m 3m 4P 5d 6M 7m`,`locrian 6`,`locrian natural 6`,`locrian sharp 6`],[`1P 2A 3M 4P 5P 5A 7M`,`augmented heptatonic`],[`1P 2M 3m 4A 5P 6M 7m`,`dorian #4`,`ukrainian dorian`,`romanian minor`,`altered dorian`],[`1P 2M 3m 4A 5P 6M 7M`,`lydian diminished`],[`1P 2M 3M 4A 5A 7m 7M`,`leading whole tone`],[`1P 2M 3M 4A 5P 6m 7m`,`lydian minor`],[`1P 2m 3M 4P 5P 6m 7m`,`phrygian dominant`,`spanish`,`phrygian major`],[`1P 2m 3m 4P 5P 6m 7M`,`balinese`],[`1P 2m 3m 4P 5P 6M 7M`,`neapolitan major`],[`1P 2M 3M 4P 5P 6m 7M`,`harmonic major`],[`1P 2m 3M 4P 5P 6m 7M`,`double harmonic major`,`gypsy`],[`1P 2M 3m 4A 5P 6m 7M`,`hungarian minor`],[`1P 2A 3M 4A 5P 6M 7m`,`hungarian major`],[`1P 2m 3M 4P 5d 6M 7m`,`oriental`],[`1P 2m 3m 3M 4A 5P 7m`,`flamenco`],[`1P 2m 3m 4A 5P 6m 7M`,`todi raga`],[`1P 2m 3M 4P 5d 6m 7M`,`persian`],[`1P 2m 3M 5d 6m 7m 7M`,`enigmatic`],[`1P 2M 3M 4P 5A 6M 7M`,`major augmented`,`major #5`,`ionian augmented`,`ionian #5`],[`1P 2A 3M 4A 5P 6M 7M`,`lydian #9`],[`1P 2m 2M 4P 4A 5P 6m 7M`,`messiaen's mode #4`],[`1P 2m 3M 4P 4A 5P 6m 7M`,`purvi raga`],[`1P 2m 3m 3M 4P 5P 6m 7m`,`spanish heptatonic`],[`1P 2M 3m 3M 4P 5P 6M 7m`,`bebop minor`],[`1P 2M 3M 4P 5P 5A 6M 7M`,`bebop major`],[`1P 2m 3m 4P 5d 5P 6m 7m`,`bebop locrian`],[`1P 2M 3m 4P 5P 6m 7m 7M`,`minor bebop`],[`1P 2M 3M 4P 5d 5P 6M 7M`,`ichikosucho`],[`1P 2M 3m 4P 5P 6m 6M 7M`,`minor six diminished`],[`1P 2m 3m 3M 4A 5P 6M 7m`,`half-whole diminished`,`dominant diminished`,`messiaen's mode #2`],[`1P 3m 3M 4P 5P 6M 7m 7M`,`kafi raga`],[`1P 2M 3M 4P 4A 5A 6A 7M`,`messiaen's mode #6`],[`1P 2M 3m 3M 4P 5d 5P 6M 7m`,`composite blues`],[`1P 2M 3m 3M 4A 5P 6m 7m 7M`,`messiaen's mode #3`],[`1P 2m 2M 3m 4P 4A 5P 6m 6M 7M`,`messiaen's mode #7`],[`1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M`,`chromatic`]];function En(e){let t=/^([1-7])([PMmAd])$/.exec(e);if(!t)throw Error(`not an interval: ${e}`);let n=Number(t[1]);return[0,2,4,5,7,9,11][n-1]+{P:0,M:0,m:-1,A:1,d:n===1||n===4||n===5?-1:-2}[t[2]]}let Dn=Object.fromEntries(Tn.flatMap(([e,...t])=>{let n=e.split(` `).map(En),r=n.map((e,t)=>(n[t+1]??12)-e);return t.map(e=>[e,r])}));function On(e,t){let n=kn(e,t);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),n}function kn(e,t){e.i++;let n=[];for(;e.skipSpace(),e.peek()!==`)`;){let t=e.i;if(e.text.startsWith(`geo(`,e.i)){e.i+=4,e.skipSpace();let r=e.num(`a ratio, like geo(5, 25, 0 10 5)`,J.geo,`ratio`).value;e.skipSpace(),e.expect(`,`,`',' then the steps per ratio: geo(${r}, 25, 0 10 5)`),e.skipSpace();let i=e.int(`the steps per ratio`,{...J.geo,whole:!0,min:1},`steps`);e.skipSpace(),e.expect(`,`,`',' then the exponents: geo(${r}, ${i}, 0 10 5)`);let a=[];for(;e.skipSpace(),e.peek()!==`)`;)a.push(e.num(`an exponent`,J.geo,`exponent`).value);e.i++,(!(r>0)||i<1||a.length===0)&&e.fail(`geo(r, n, k …): r above 0, n ≥ 1, at least one k`,t,e.i-t);for(let e of a)n.push(+(r**+(e/i)).toFixed(9));continue}let r=e.free(J.interval);if(r!==null)r.lo>0||e.fail(`A scan interval stays positive: give free(…) a range above 0`,t,e.i-t),n.push(r.value);else{let r=e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);r!==null&&parseFloat(r)>0||e.fail(`scan(…) takes positive intervals, like scan(2 2 1 2 2 2 1)`,t);let i=1;if(e.peek()===`!`){e.i++;let n=e.freeNumber(J.intervals),r=n===null?e.match(/[0-9]+/y):String(n);r!==null&&parseInt(r,10)>=1||e.fail(`x!n repeats an interval n times: scan(1!4 2)`,t,e.i-t),i=parseInt(r,10)}for(let e=0;e<i;e++)n.push(parseFloat(r))}e.skipSpace(),e.peek()===`,`&&e.i++}return e.expect(`)`,`')' to close scan(…)`),n.length===0&&e.fail(`scan(…) needs at least one interval`,t,e.i-t),{kind:`scan`,steps:n,span:e.span(t)}}function An(e,t){if(e<=0)return Array(t).fill(!1);let n=Array.from({length:e},()=>[!0]),r=Array.from({length:t-e},()=>[!1]);for(;r.length>1;){let e=Math.min(n.length,r.length),t=Array.from({length:e},(e,t)=>[...n[t],...r[t]]),i=n.length>e?n.slice(e):r.slice(e);n=t,r=i}return[...n,...r].flat()}function jn(e,t){e.i++,e.skipSpace();let n;if(e.peek()===`f`)n=tt(e,`text`,!1).text??``;else{let t=e.match(/"[^"]*"/y);t===null&&e.fail(`spell(text, &table, "names"): the text first — "867 5309" or free("867 5309")`),n=t.slice(1,-1)}e.skipSpace(),e.expect(`,`,`',' then the table, like spell("867", &keys, "1 2 3 …")`),e.skipSpace();let r=e.cellRef(`the table its characters pick from, like &keys`,`in spell(…)`);e.skipSpace(),e.expect(`,`,`',' then the names of the table's entries, in quotes`),e.skipSpace();let i=e.match(/"[^"]*"/y);i===null&&e.fail(`the names of the table’s entries, in quotes: "1 2 3 A 4 5 6 B …"`);let a=i.slice(1,-1).trim().split(/\s+/).filter(Boolean);e.skipSpace(),e.expect(`)`,`')' to close spell(…)`);let o=e.span(t);e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);let s={atom:{kind:`rest`},repeat:1,subdivide:1,elongate:1,span:o},c=[...n].flatMap(e=>{let t=a.indexOf(e);return t<0?[s,s]:[{atom:{kind:`ref`,name:r.name,pick:{kind:`at`,i:t,abs:!0},shift:0},repeat:1,subdivide:1,elongate:1,span:o},s]});return c.length||c.push(s),{kind:`list`,tokens:c,span:o}}let Mn=[2,3,4,6];function Nn(e){let t=/^([1-9][0-9]*(?:\+[1-9][0-9]*)+)(?:\/(2|4|8|16|32))?$/.exec(e);if(t){let e=t[1].split(`+`).map(Number);return e.every(e=>Mn.includes(e))?{pulses:e.reduce((e,t)=>e+t,0),unit:Number(t[2]??8),groups:e}:null}let n=/^([1-9][0-9]*)\/(2|4|8|16|32)$/.exec(e);if(!n)return null;let[r,i]=[Number(n[1]),Number(n[2])];if(r<2||r>32)return null;if(i>=8){let e=yn(Math.ceil(r/3),r,Math.ceil(r/3)-1);return{pulses:r,unit:i,groups:e.map((t,n)=>(e[n+1]??r)-t)}}return{pulses:r,unit:i,groups:r%3==0&&r>=6?Array(r/3).fill(3):Array(r).fill(1)}}function Pn(e){let t=Nn(e);return{pulses:t?.pulses??0,unit:t?.unit??4,beats:t?.groups??[]}}function Fn(e){let t=Array(e).fill(1/0),n=(e,r,i)=>{if(t[e]=Math.min(t[e],i),r-e<=3){for(let n=e+1;n<r;n++)t[n]=Math.min(t[n],i+1);return}let a=e+yn(2,r-e,1)[1];n(e,a,i+1),n(a,r,i+1)};return n(0,e,0),t}function In(e,t){let n=e.unit>=8?1:8/e.unit,r=e.groups.map(e=>e*n),i=Fn(r.length),a=Math.max(0,...i),o=r.some(e=>e>=4)?a+1:null,s=(o??a)+1,c=s+1,l=/* @__PURE__ */ new Map;r.reduce((e,t,n)=>{if(l.set(e,i[n]),o!==null&&t>=4)for(let n=2;n<t;n+=2)l.set(e+n,o);return e+t},0);let u=e.unit>=8?t:t*e.unit/8,d=e.pulses*t;return{tiers:Array.from({length:d},(n,r)=>{let i=r/u,a=e=>Math.abs(e-Math.round(e))<1e-9;return a(i)?l.get(Math.round(i))??s:a(2*i)?c:e.unit<=4&&t===3?s:c}),eighth:s,step:c}}let Ln=(e,t,n)=>e===0?`*`:e===n?`,`:e===t?`.`:`+-:;`[Math.min(e-1,3)],Rn=(e,t,n)=>e===0?0:e===n?4:e===t?3:Math.min(e,2),zn=e=>({"*":0,"+":1,"-":2,":":2,";":2,".":3,",":4})[e]??0,Bn=/^[*+\-:;.,]+$/;function Vn(e,t){if(Bn.test(e))return e;let n=Nn(e);if(!n)return``;let{tiers:r,eighth:i,step:a}=In(n,t);return r.map(e=>Ln(e,i,a)).join(``)}function Hn(e,t){if(Bn.test(e))return[...e].map(zn);let n=Nn(e);if(!n)return[];let{tiers:r,eighth:i,step:a}=In(n,t);return r.map(e=>Rn(e,i,a))}function Un(e,t){e.i++,e.skipSpace();let n=t=>{if(e.peek()===`"`)return e.match(/"[^"]*"/y).slice(1,-1);let n=e.free(J.meter);if(n!==null)return n.key===`text`||n.text!==void 0?n.text??``:n.labels?n.labels[Math.round((n.value-n.lo)/((n.hi-n.lo)/Math.max(1,n.labels.length-1)||1))]??``:String(n.value);let r=e.match(/[1-9][0-9]*(?:n\.?|t)(?![0-9A-Za-z])|[0-9]+/y);return r===null&&e.fail(`${t}: in quotes ("4/4"), a number, a note value (16n), a cell (&meter) or free(…)`),r},r=n(`the time signature`);e.skipSpace();let i=null;if(e.peek()===`,`){e.i++,e.skipSpace();let t=e.i;i={text:n(`the step: steps a pulse, or its note value`),at:t},e.skipSpace()}e.expect(`)`,`')' to close meter(…)`);let a=e.span(t);e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);let o=Kn(r,i?.text??null,a);return typeof o==`string`?(i&&o.startsWith(`meter("${r}", ${i.text})`)&&e.fail(o,i.at,i.text.length),e.fail(o,t,a.len)):o}function Wn(e){let{tiers:t}=In(e,1),n=/* @__PURE__ */ new Map;for(let r of[...new Set(t)].sort((e,t)=>e-t)){let i=t.flatMap((e,t)=>e<=r?[t]:[]);n.has(i.length)||n.set(i.length,i.map((t,n)=>(i[n+1]??e.pulses)-t))}return n}let Gn=/^(.*\S)\s+in\s+([0-9]+)$/;function Kn(e,t,n){let r=Gn.exec(e),i=r?r[1]:e,a=Bn.test(i);if(r&&a)return`meter("${e}"): levels say their beats by their marks (+ - : ;), so they are counted as written; "in ${r[2]}" goes on a signature or sizes ("3/4 in 1")`;let o=a?null:Nn(i),s=1,c=null;if(t!==null){let e=Vt(t);if(e!==null){if(o){let n=1/o.unit/e;if(!(Math.abs(n-Math.round(n))<1e-9&&Math.round(n)>=1&&Math.round(n)<=8))return`meter("${i}", ${t}): the step divides the pulse, ${Kt(1/o.unit)??`a 1/${o.unit}`}, into 1 to 8 steps`;s=Math.round(n)}else c=e}else s=Math.max(1,Math.min(8,parseInt(t,10)||1))}let l=Hn(i,s);if(!l.length)return`meter("${i}"): a time signature (x/2 x/4 x/8 x/16: 4/4, 6/8, 7/8, 2/2), groups as sizes ("2+2+3" of eighths, "2+2+3/4" of quarters; each 2, 3, 4 or 6), or levels like "*.-.+.-." (* the bar, + - : ; beats, the higher the stronger, . the eighth, , finer)`;let u=l.map(e=>({atom:{kind:`note`,value:e,alter:0},repeat:1,subdivide:1,elongate:1,span:n})),d=()=>{let e=[...i].flatMap((e,t)=>t===0||e!==`.`&&e!==`,`?[t]:[]);return e.map((t,n)=>(e[n+1]??i.length)-t)},f=o?Pn(i):c===null?void 0:{pulses:i.length,unit:1/c,beats:d()};if(r&&o&&f){let t=Number(r[2]),n=Wn(o),a=n.get(t);if(!a)return`meter("${e}"): ${i} is counted in ${[...n.keys()].join(`, `)} (a tier of its tree: the bar, its beats, the levels between), not ${t}`;f={...f,beats:a}}let p=f?f.beats.length:d().length;return{kind:`list`,tokens:u,span:n,perBeat:l.length/Math.max(1,p),...f?{signature:f}:{}}}function qn(e,t,n){e.i++;let r=[];for(;e.skipSpace(),r.push(e.int(`a number in ${t}(…)`,J.args,t)),e.skipSpace(),e.peek()===`,`;)e.i++;e.expect(`)`,`')' to close ${t}(…)`);let i=e.span(n);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),{args:r,span:i}}function Jn(e,t){let{args:n,span:r}=qn(e,`euclid`,t),[i,a,o=0]=n;(n.length<2||n.length>3||!(a>=1)||!(i>=0&&i<=a))&&e.fail(`euclid(k, n): k hits spread evenly over n steps (0 ≤ k ≤ n), euclid(k, n, shift) turned`,t,r.len);let s=An(i,a);return{kind:`list`,tokens:Array.from({length:a},(e,t)=>{let n=((t-o)%a+a)%a;return{atom:s[n]?{kind:`note`,value:0,alter:0}:{kind:`rest`},repeat:1,subdivide:1,elongate:1,span:r}}),span:r}}let Yn=RegExp(`(?:${Object.keys(_n).join(`|`)})(?![A-Za-z0-9_])`,`y`);function Xn(e,t){let n=$n(e,t);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),n}function Zn(e,t,n){return Number.isInteger(e)&&Number.isInteger(t)&&e>=1&&t>=e?Number.isInteger(n)&&n>=0&&n<e?null:`even(${e}, ${t}, phase): the phase is a mode, 0 to ${e-1}, each one place moved`:`even(k, n): k places spread as evenly as they go over n (1 ≤ k ≤ n), even(k, n, phase) its mode`}let Qn=(e,t,n)=>Sn(yn(e,t,n),t);function $n(e,t){e.i++;let n=[],r=[];for(;;){if(e.skipSpace(),e.peek()===`&`){let t=e.i,r=e.cellRef(`a cell that is one number, like even(7, 12, &mode)`,`in even(…)`);(r.pick||r.shift)&&e.fail(`even(…) reads a whole cell, one number: even(7, 12, &mode)`,t,e.i-t),n.push(r)}else{let t=e.i,i=e.match(Yn);i!==null&&r.push({at:t,len:e.i-t,index:n.length}),n.push(i===null?e.int(`a number in even(…), or a cell that is one (&mode)`,J.evenArg,`even`):_n[i])}if(e.skipSpace(),e.peek()!==`,`)break;e.i++}e.expect(`)`,`')' to close even(…)`);let i=e.span(t),[a,o,s=0]=n;(n.length<2||n.length>3)&&e.fail(Zn(0,0,0),t,i.len);for(let t of r)(t.index!==2||a!==7||o!==12)&&e.fail(t.index===2?`even(…, …, ${e.text.slice(t.at,t.at+t.len)}): a mode's name is a phase of the diatonic, even(7, 12); here write its number (${_n[e.text.slice(t.at,t.at+t.len)]})`:`even(…): a mode's name is a phase, not a size; write a number`,t.at,t.len);let c=e=>typeof e==`number`?e:null,[l,u,d]=[c(a),c(o),c(s)],f=l!==null&&u!==null,p=f?Zn(l,u,d??0):null;if(p&&e.fail(p,t,i.len),f&&d!==null)return{kind:`scan`,steps:Qn(l,u,d),span:i};let m={k:a,n:o,phase:s};return{kind:`scan`,steps:f?Qn(l,u,0):[1],span:i,even:m}}let er={sin:`a sine`,saw:`a saw`,tri:`a triangle`,square:`a square`},tr=e=>(t,n)=>{let r=`${e}(n) or ${e}(n, lo..hi)`;t.i++,t.skipSpace();let i=t.int(`the steps of ${e}(…)`,J.args,e);t.skipSpace();let a;if(t.peek()===`,`){t.i++,t.skipSpace();let o=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y,s=t.match(o);s!==null&&t.text.startsWith(`..`,t.i)||t.fail(`${r}: a range after the steps, as in ${e}(${i}, 0..1)`,n,t.i-n),t.i+=2;let c=t.match(o);c===null&&t.fail(`${r}: a range after the steps, as in ${e}(${i}, 0..1)`,n,t.i-n),a=[parseFloat(s),parseFloat(c)],t.skipSpace()}t.expect(`)`,`')' to close ${e}(…)`);let o=t.span(n);return t.atBoundary()||t.fail(`Unexpected '${t.peek()}'`),i<2&&t.fail(`${r}: one cycle of ${er[e]} in n steps, n ≥ 2, within a range if one is written`,n,o.len),{kind:`wave`,shape:e,n:i,...a?{range:a}:{},span:o}};function nr(e,t,n){let r=t=>e===`sin`?Math.sin(2*Math.PI*t):e===`saw`?2*t-1:e===`tri`?t<.5?4*t-1:3-4*t:Math.floor(2*t)%2?1:-1,i=e=>n?n[0]+(n[1]-n[0])*(1+e)/2:e;return Array.from({length:t},(e,n)=>+i(r(n/t)).toFixed(6)+0)}let rr={C:0,D:2,E:4,F:5,G:7,A:9,B:11};function ir(e,t){e.i++,e.skipSpace();let n,r=0,i=`0`,a=null,o=null,s=null,c=e.match(/"[^"]*"/y);if(c!==null){let a=/^"([A-G](?:#|b)?)([0-9]*)((?::[a-z0-9#'-]+)+)"$/.exec(c);a||e.fail(`scale("tonic:name"): a tonic and a scale's name, as in Strudel — scale("D:minor"), scale("F#:harmonic:minor")`,t,e.i-t),a[2]&&e.fail(`scale("${a[1]}${a[2]}:…"): the octave is the voice's (loop=), not the scale's: scale("${a[1]}${a[3]}")`,t,e.i-t);let o=a[3].slice(1).split(`:`),[s,l]=[o.join(` `),o.join(``)],u=Object.hasOwn(Dn,s)?Dn[s]:Object.hasOwn(gn,l)?gn[l].steps:void 0;u||e.fail(`scale("…${a[3]}"): a scale by name — ours (${Object.keys(gn).join(` `)}) or tonal's, as Strudel reads them (harmonic:minor, minor:pentatonic, whole:tone, diminished, chromatic, bebop … listed in tables.md)`,t,e.i-t),n=[...u];let d=a[1];r=((rr[d[0]]+(d[1]===`#`?1:d[1]===`b`?-1:0))%12+12)%12,i=String(r),e.skipSpace(),e.expect(`)`,`')' to close scale(…)`)}else{let t=e.i;if(e.text.startsWith(`even(`,e.i)||e.text.startsWith(`scan(`,e.i)){let r=e.text.startsWith(`even(`,e.i);e.i+=4;let i=r?$n(e,t):kn(e,t);n=[...i.steps],s=i.even??null}else if(e.peek()===`&`)o=e.cellRef(`the cell that holds the mode, like scale(&mode, &tonic)`,`as the mode`),n=vn(_n.major);else{let r=e.match(/[a-z]+/y),i=r?gn[r]:void 0;i||e.fail(`scale(name, tonic): a scale by name — ${Object.keys(gn).join(` `)}, a table (even(7, 12, &mode), scan(…)) or a cell holding a mode (&mode)`,t,Math.max(1,(r??``).length)),n=[...i.steps]}if(e.skipSpace(),e.peek()===`,`){e.i++,e.skipSpace();let t=e.i,n=e.match(/[A-G](?:#|b)?(?![A-Za-z0-9])/y);if(n!==null)r=((rr[n[0]]+(n[1]===`#`?1:n[1]===`b`?-1:0))%12+12)%12,i=String(r);else if(e.peek()===`&`)a=e.cellRef(`the cell that holds the tonic, like scale(dorian, &tonic)`,`as the tonic`),i=`&${a.name}`;else{let n=e.text.startsWith(`free(`,e.i);r=e.int(`the tonic: a note name (D, F#, Bb), a number, a cell (&tonic) or free(…)`,J.tonic),i=n?e.text.slice(t,e.i):String(r),Math.abs(r)>11&&e.warn(`scale(…, ${r}): the tonic is a pitch class, 0 (C) to 11 (B)`,t,e.i-t)}e.skipSpace()}e.expect(`)`,`')' to close scale(…)`)}let l=e.span(t),u=`key:λ${e.line}_${t+e.offset}`;return e.lambdas.push({name:u,span:l,lambda:`shift=${i}`,over:null,shift:r,...a?{tonic:a}:{},off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`blank`}}),{steps:n,key:{name:u,pick:null,shift:0,span:l},span:l,...o?{mode:o}:{},...s?{even:s}:{}}}function ar(e,t){e.i++,e.skipSpace();let n=0;if(e.peek()!==`)`){let t=e.i,r=e.noteName();if(n=r===null?e.int(`how many fifths round it starts (fifths(1): on G), or the note it starts on: fifths(G)`,J.fifths):(r%12+12)%12*7%12,r===null&&Math.abs(n)>11){let r=Math.trunc(n/12),i=n%12,a=`C G D A E B F# C# Ab Eb Bb F`.split(` `)[(i+12)%12];e.warn(`fifths(${n}): the circle comes round after 12, and a turn past a lap climbs one, as every shift does: fifths(${i}) ${r>0?`up`:`down`} ${Math.abs(r)} octave${Math.abs(r)===1?``:`s`}${i?` (fifths(${a}) names the note, no octave)`:``}`,t,e.i-t)}e.skipSpace()}e.expect(`)`,`')' to close fifths(…)`);let r=e.span(t);return{braid:{kind:`list`,tokens:Array.from({length:12},(e,t)=>({atom:{kind:`note`,value:t*7%12,alter:0},repeat:1,subdivide:1,elongate:1,span:r})),span:r},shift:n}}let or=G(`generator`,`sin(n) · saw(n) · tri(n) · square(n) · sin(n, lo..hi)`,"One cycle of a waveform in n steps, from −1 to 1, as Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step: a sine from 0, a saw rising from −1, a triangle rising from −1 to 1 at the half and falling back, a square −1 then 1. A waveform, or a slow swell. A range after the steps lays the wave within it, `sin(12, 0..1)` (Strudel's `sine.range(0, 1)`): a share a factor reads, as a wave below 0 is cut off at 0.",[`&sine loop=220 sin(12)`,`&ramp loop=220 saw(8)`,`&swell map=lin loop=.25 tri(4)`,`&pulse loop=110 square(2)`,`&lfo map=lin loop=.5 sin(12, 0..1)`],`braid.md`),sr={scan:{parse:On,syntax:G(`generator`,`scan(i …)`,"Running totals of intervals: a scale or a meter. An interval can repeat (`1!4`), be geometric (`geo(r, n, k …)`: r^(k/n) for each k) or be `free(…)`.",[`&major scan(2 2 1 2 2 2 1)`,`&bar scan(27 23 26 24) step=84bpm`,`&tempo scan(1!4 .5!2)`,`&series scan(geo(5, 25, 0 10 5))`,`&mode scan(2 2 free(1, 1..2) 2 2 2 1)`],`braid.md`)},euclid:{parse:Jn,syntax:G(`generator`,`euclid(k, n) · euclid(k, n, shift)`,`k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned right by shift steps, as Strudel's (k, n, r).`,[`&tresillo euclid(3, 8)`,`&clave euclid(5, 16, 2)`],`braid.md`)},even:{parse:Xn,syntax:G(`generator`,`even(k, n) · even(k, n, phase)`,"k places spread as evenly as they go over n: a table (the scan of its intervals), its phase its mode, 0 to k − 1, each one place moved; each argument a number or a cell that is one (`even(7, 12, &mode)`, filled as the piece is built: decision 093), a mode's name the phase only of even(7, 12). The one generator under the diatonic (even(7, 12), its phases the seven modes), the pentatonic, the standard bell, the tresillo and a meter's groups (decision 072); euclid(k, n, r) is its places as a rhythm of n steps, turned as Strudel's.",[`&ionian even(7, 12, 5)`,`&pentatonic even(5, 12)`,`&minorPentatonic even(5, 12, 3)`,`&tresillo even(3, 8, 2)`],`tables.md`)},sin:{parse:tr(`sin`),syntax:or},saw:{parse:tr(`saw`),syntax:or},tri:{parse:tr(`tri`),syntax:or},square:{parse:tr(`square`),syntax:or},scale:{parse:(e,t)=>e.fail(`scale(…) is read by its cell`,t,5),syntax:G(`generator`,`scale(name) · scale(name, tonic) · scale("tonic:name")`,`A scale by name over the 12, turned to its tonic (a note name, a number, a cell holding one, or free(…); C if left out): the scan of its steps over a key of its own. Its name may be a cell holding a diatonic mode (&mode dorian, its phase from the darkest: locrian 0 … lydian 6), or a table: even(k, n, phase) or scan(…), its arguments numbers or cells that are one (decision 093), so any necklace is a key and the names its sugar (scale(dorian) is scale(even(7, 12, 3))). Its shift= walks its modes; the tonic transposes. The names: ${Object.keys(gn).join(` `)}. Strudel's spelling reads the same: scale("D:minor"), its words after colons (scale("F#:harmonic:minor")), with every scale tonal knows (${Object.keys(Dn).length} names: whole:tone, diminished, bebop:major, chromatic …); the octave is the voice's, not the scale's.`,[`&scale scale(minor, D)`,`&blues scale(blues)`,`&scale scale(dorian, free(2, 0..11))`,`&key scale(dorian, &tonic)`,`&key scale(&mode, &tonic)`,`&key scale(even(7, 12, &mode), &tonic)`,`&key scale(even(5, 12, 3), A)`,`&scale scale("F#:harmonic:minor")`],`tables.md`)},fifths:{parse:(e,t)=>e.fail(`fifths(…) is read by its cell`,t,6),syntax:G(`generator`,`fifths() · fifths(n) · fifths(note)`,`The circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C; turned n fifths round, or to start on a note (its shift=: [0] is where it starts, [$0] is C). Drawn round its wheel in its own order.`,[`&circle fifths()`,`&circleG fifths(1)`,`&circleG fifths(G)`],`tables.md`)},meter:{parse:Un,syntax:G(`generator`,`meter("sig") · meter("sig in n") · meter("sig", step) · meter("2+2+3") · meter("2+2+3/4") · meter("levels")`,`A bar as levels, one per step, its numbers its tiers from the ends: 0 the downbeat, 1 a beat, 2 a half's beat (and any tier between), 3 the eighth, 4 finer. A time signature by rule (contracts/meter v2, decision 072): x/8 and x/16 grouped as the canonical even set of ⌈x/3⌉ groups (7/8 is 3+2+2, 8/8 3+3+2), x/4 and x/2 in beats of the denominator, or in threes where x is a multiple of 3 from 6 (6/4). Its step is a number a pulse or a note value (meter("6/8", 16n)). Groups written as sizes, of eighths or of the denominator after a slash (2+2+3, 2+2+3/4), each 2, 3, 4 or 6. Or levels written out (* the bar, + - : ; beats, . the eighth, , finer), with their step's note value. Of four groups or more, each half's start is the stronger: 4/4 is *.-.+.-. (#17). Its bpm counts beats, its groups. Each argument can be free(…).`,[`&bar meter("4/4", 2) step=100bpm`,`&bar meter("6/8") step=60bpm`,`&bar meter("2+2+3") step=90bpm`,`&bar meter("2/2", 2) step=60bpm`,`&bar meter("*.+.+..") step=90bpm`],`time.md`)},spell:{parse:jn,syntax:G(`generator`,`spell("text", &table, "names")`,`A text spelled through a table: each character that is one of the names plays that entry of the table, then a pause; anything else rests as long. The text can be free("…"), a field to type in.`,[`&dial spell("867 5309", &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")`,`&dial spell(free("867 5309"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")`],`braid.md`)}},cr={agogic:(e,t)=>{let{args:n,span:r}=qn(e,`agogic`,t),[i,a]=n,o=xn(i,a).map(e=>Math.round(e/12*100));return e.fail(`agogic(…) is gone: write the beats as a scan, scan(${Sn(o,100).join(` `)})`,t,r.len)}},lr=e=>e in sr||e in cr;function ur(e,t,n){return(sr[t]?.parse??cr[t])(e,n)}let dr={euclid:{0:`number`,1:`number`,2:`number`},sin:{0:`number`},saw:{0:`number`},tri:{0:`number`},square:{0:`number`},meter:{0:`text`,1:`number`},spell:{0:`text`,2:`text`}};function fr(e,t,n){let r=dr[t];if(!r||e.peek()!==`(`)return ur(e,t,n);let i=e.i,a=[],o=0,s=!1,c=i+1,l=-1;for(let t=i+1;t<e.text.length;t++){let n=e.text[t];if(n===`"`)s=!s;else if(s)continue;else if(`([{`.includes(n))o++;else if(`)]}`.includes(n)&&o>0)o--;else if((n===`,`||n===`)`)&&o===0&&(a.push({from:c,to:t}),c=t+1,n===`)`)){l=t;break}}let u=[];if(a.forEach((t,i)=>{let a=r[i],o=e.text.slice(t.from,t.to),s=/^\s*&([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(o);if(!a||!s)return;let c=t.from+o.indexOf(`&`),l=c+1+s[1].length,d=e.i;e.i=l,u.push({ref:{name:s[1],span:e.place(c)},kind:a,from:c-n,to:l-n}),e.i=d}),l<0||!u.length)return ur(e,t,n);e.i=l+1;let d=e.span(n);return e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),{kind:`list`,tokens:[],span:d,deferred:{generator:t,call:e.text.slice(n,l+1),at:d,reads:u}}}let pr={"*":1,"+":.8,"-":.6,":":.6,";":.6,".":.4,",":.2},mr=`*+-.,`;function hr(e,t){let n=e.length,r=(t||n*(e.includes(3)?2:4))/n;if(!Number.isInteger(r)||r&r-1)return null;let i=Math.log2(r);return e.flatMap(e=>Array.from({length:r},(t,n)=>{if(n===0)return mr[e];let r=i-Math.log2(n&-n);return mr[Math.max(e+1,4-(i-r))]})).join(``)}function gr(e,t=0){let n=e.trim().split(/\s+/);if(n.every(e=>/^[0-4]$/.test(e)))return hr(n.map(Number),t);let r=Nn(e.trim());if(!r)return null;let i=t||r.pulses*16/r.unit,a=i/r.pulses;if(!Number.isInteger(a)||a<1)return null;let o=Vn(e.trim(),a);return o.length===i?o:null}function _r(e,t=0){let n=gr(e,t);return n?[...n].map(e=>pr[e]):null}let vr=(e,t)=>Number(e[t]),yr=e=>String(+e.toFixed(3)),br={id:`metric_accent`,fragment:`metric_accent`,fills:{accent:{fuel:64}},origin:0,cycle:0,stepSeconds:0,fill(e,t,n,r=64){if(e!==`accent`)return{refused:`it has no fill ${e}`};let i=vr(n,`steps`),a=n.meter??`4/4`,[o,s,c,l]=[`density`,`sync`,`peak`,`floor`].map(e=>vr(n,e));if(!Number.isInteger(i)||i<0)return{refused:`steps=${n.steps} is no count of steps`};for(let[e,t]of Object.entries({density:o,sync:s,peak:c,floor:l}))if(!(t>=0&&t<=1))return{refused:`${e}=${n[e]} is out of 0 to 1`};let u=_r(a,i);return u?u.length>r?{refused:`${u.length} steps need more than its fuel, ${r}`}:u.map((e,t)=>(1-s)*e+s*u[(t+1)%u.length]).map(e=>e>=1-o-1e-9?yr(l+(c-l)*e):`0`).join(` `):{refused:`meter=${a} is no meter it can weigh at ${i?`${i} step${i===1?``:`s`}`:`a sixteenth a step`}: a signature (7/8), sizes (2+2+3) or a meter cell (&bar), its steps a whole number a pulse`}}},xr=/* @__PURE__ */ new Map([[zt.id,zt]]),Sr=new Map([...xr.values(),br].map(e=>[e.fragment,e])),Cr=(e,t)=>e.pluginFragments?.get(t)??Sr.get(t),wr=e=>[...e.cells.values()].flatMap(t=>{let n=t.fill?.fragment?Cr(e,t.fill.fragment):void 0;return n&&n.fills[t.fill?.name??``]?.lap!==void 0?[{cell:t,law:n}]:[]}),Tr=e=>wr(e)[0]?.law??null,Er=e=>Math.min(...Object.values(e.fills).flatMap(e=>e.lap!==void 0&&!e.mark?[e.lap]:[])),Dr=e=>typeof e==`string`?e:``,Or=e=>e.k===`ref`?[e.ref.name]:e.k===`sum`?e.items.flatMap(e=>Or(e.e)):e.k===`prod`?e.factors.flatMap(Or):[];function kr(e,t){if(t.fill?.fragment)return t.fill.clock;let n=t.units.length===1?t.units[0].atom:null;if(n?.kind===`mix`)for(let t of n.exprs)for(let n of Or(t)){let t=e.get(n)?.fill;if(t?.fragment)return t.clock}}function Ar(e,t){let n=[...e.diagnostics],r=(e,t)=>n.push({severity:`error`,message:e,span:t}),i=(e,t)=>n.push({severity:`warning`,message:e,span:t}),a=(e,t)=>n.push({severity:`info`,message:e,span:t}),o=new Set(e.broken),s=/* @__PURE__ */ new Map,c=(e,t)=>{o.has(e)||(r(`Unknown cell &${e}`,t),s.set(e,[...s.get(e)??[],t]))},l=/* @__PURE__ */ new Set;return{parsed:e,env:t,diagnostics:n,error:r,warn:i,info:a,broken:o,unknown:s,unknownCell:c,rateOf:e=>{if(!e)return null;if(e.kind===`rate`)return e.perSecond;if(e.kind===`env`){let n=t[e.name]??ft(e.name,t.A4??440)??void 0;return typeof n==`number`&&n>0?n:(l.has(e)||r(`Unknown environment value ${e.name} (known: ${Object.keys(t).join(`, `)}, and note names like C4, F#3, Bb2)`,e.span),l.add(e),null)}return null}}}let jr=e=>e&&!e.gate&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`?e.braid.tokens[0].atom.exprs:null;function Mr(e,t){if(e.k===`num`)return{constant:t*e.value};if(e.k===`ref`)return e.ref.pick||e.level!==void 0?null:{term:{cell:e.ref.name,weight:t}};if(e.k===`prod`){if(e.factors.every(e=>e.k===`num`))return{constant:e.factors.reduce((e,t)=>t.k===`num`?e*t.value:e,t)};let n=e.factors.filter(e=>e.k===`ref`);if(n.length!==1||n[0].k!==`ref`||n[0].ref.pick||!e.factors.every(e=>e.k===`ref`||e.k===`num`))return null;let r=e.factors.reduce((e,t)=>t.k===`num`?e*t.value:e,t);return{term:{cell:n[0].ref.name,weight:r}}}return null}let Nr=e=>e.k===`ref`?!0:e.k===`sum`?e.items.some(e=>Nr(e.e)):e.k===`prod`&&e.factors.some(Nr),Pr=(e,t,n)=>e.kind===`note`||e.kind===`rest`||e.kind===`choice`||e.kind===`ref`&&!e.pick&&!e.slot&&!e.values&&!e.transpose&&e.shift===0&&Fr(e.name,t,n)||e.kind===`seq`&&e.layers.every(e=>e.every(e=>Pr(e.atom,t,n)));function Fr(e,t,n){let r=t.get(e);if(!r||n.has(e)||n.size>256)return!1;if(zr(r)!==null)return!0;if(jr(r))return Y(e,t,n)!==null;if(!Ir(e,t,n))return!1;if(r.map&&(r.map.kind===`amp`||r.map.kind===`db`||r.map.kind===`lin`))return!0;let i=/* @__PURE__ */ new Set([...n,e]),a=e=>e.kind===`ref`?Fr(e.name,t,i):e.kind===`seq`&&e.layers.some(e=>e.some(e=>a(e.atom)));return r.braid.kind===`list`&&r.braid.tokens.some(e=>a(e.atom))}function Ir(e,t,n=/* @__PURE__ */ new Set){let r=t.get(e);if(!r||r.gate||r.over||Object.keys(r.params).some(e=>Re.has(e))||n.size>256)return!1;if(jr(r))return Y(e,t,n)!==null;if(r.map&&r.map.kind!==`lin`&&r.map.kind!==`amp`&&r.map.kind!==`db`)return!1;let i=/* @__PURE__ */ new Set([...n,e]);return r.braid.kind===`list`&&r.braid.tokens.length>0&&r.braid.tokens.every(e=>Pr(e.atom,t,i))}function Lr(e,t,n=/* @__PURE__ */ new Set){let r=t.get(e);if(!r||n.has(e)||n.size>256||jr(r)||r.braid.kind!==`list`)return!1;let i=/* @__PURE__ */ new Set([...n,e]),a=e=>e.kind===`ref`?Y(e.name,t)!==null||Lr(e.name,t,i):e.kind===`seq`&&e.layers.some(e=>e.some(e=>a(e.atom)));return r.braid.tokens.some(e=>a(e.atom))}function Y(e,t,n=/* @__PURE__ */ new Set){let r=jr(t.get(e));if(!r||r.length!==1||n.has(e))return null;let i=r[0],a=Vr(i,t),o=a.k===`sum`?a.items:[{e:a,sign:1}],s=[],c=0;for(let e of o){let t=Mr(e.e,e.sign);if(!t)return null;`term`in t?s.push(t.term):c+=t.constant}if(!s.length)return Nr(i)?{terms:s,constant:c}:null;if(i.k!==`sum`&&s.length===1&&s[0].weight===1&&c===0)return null;let l=/* @__PURE__ */ new Set([...n,e]);return s.every(e=>Ir(e.cell,t,l))?{terms:s,constant:c}:null}function Rr(e,t,n,r=/* @__PURE__ */ new Set){let i=jr(t.get(e));if(!i||i.length!==1||r.has(e)||Y(e,t)!==null)return null;let a=i[0];if(a.k!==`prod`)return null;let o=/* @__PURE__ */ new Set([...r,e]),s=!1;for(let e of a.factors){if(e.k===`num`)continue;if(e.k!==`ref`)return null;let r=t.get(e.ref.name);if(!r)return null;if(!(Hr(e)&&zr(r)!==null)&&!(Hr(e)&&Y(e.ref.name,t)!==null)){if(jr(r)){if(!Rr(e.ref.name,t,n,o))return null;s=!0}else if(n(e.ref.name))return null;else(!r.map||r.map.kind!==`amp`&&r.map.kind!==`db`&&r.map.kind!==`adsr`&&r.map.kind!==`lin`)&&(s=!0)}}return s?a:null}function zr(e){if(!e||e.off||e.gate||e.step||e.over||e.map||e.base||e.tonic||e.env||e.pitch||e.shift!==null||e.stride!==null||e.cycle!==null||Object.keys(e.params).length||e.braid.kind!==`list`||e.braid.tokens.length!==1)return null;let t=e.braid.tokens[0];return t.atom.kind!==`note`||t.atom.pitched||t.atom.alter!==0||t.repeat!==1||t.subdivide!==1||t.elongate!==1||t.chance!==void 0||t.level!==void 0?null:t.atom.value}function Br(e,t,n=/* @__PURE__ */ new Set){let r=e.get(t);if(!r||r.step||n.has(t))return null;let i=zr(r);if(i!==null)return i;let a=Y(t,e);if(!a)return null;let o=/* @__PURE__ */ new Set([...n,t]),s=a.constant;for(let t of a.terms){let n=Br(e,t.cell,o);if(n===null)return null;s+=t.weight*n}return Math.round(s*1e9)/1e9}function Vr(e,t){if(e.k===`num`)return e;if(e.k===`sum`)return{...e,items:e.items.map(e=>({...e,e:Vr(e.e,t)}))};if(e.k===`prod`)return{...e,factors:e.factors.map(e=>Vr(e,t))};let n=Hr(e)?zr(t.get(e.ref.name)):null;return n===null?e:{k:`num`,value:n,span:e.ref.span}}let Hr=e=>!e.ref.pick&&!e.ref.slot&&!e.ref.shift&&!e.ref.degree&&!e.ref.transpose&&e.level===void 0;function Ur(e,t,n,r={named:[],moved:[]},i=/* @__PURE__ */ new Set){if(e.k===`num`)return e;if(e.k===`sum`)return{...e,items:e.items.map(e=>({...e,e:Ur(e.e,t,n,r,i)}))};if(e.k===`prod`)return{...e,factors:e.factors.map(e=>Ur(e,t,n,r,i))};let a=Rr(e.ref.name,t,n,i);return a?Hr(e)?(r.named.push(e.ref.name),Ur(a,t,n,r,/* @__PURE__ */ new Set([...i,e.ref.name]))):(r.moved.push(e),e):e}let Wr=/[A-Za-z_][A-Za-z0-9_]*/y,Gr=/-?[0-9]+/y,Kr=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*\*\s*&/y,qr=/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y,Jr=4096;var Yr=class extends Error{col;len;constructor(e,t,n=1){super(e),this.col=t,this.len=n}};function Xr(e,t){let n=e[0];for(let r of e)r.start<=t&&(n=r);return{line:n.line,col:t-n.start+1}}var Zr=class e{text;line;offset;lambdas;parts;warnings;depth;body;holes;i=0;frees=[];constructor(e,t,n=0,r=[],i=[{line:t,start:0}],a=[],o=0,s,c=[]){this.text=e,this.line=t,this.offset=n,this.lambdas=r,this.parts=i,this.warnings=a,this.depth=o,this.body=s,this.holes=c}within(t,n,r=this.depth){return new e(t,this.line,this.offset+n,this.lambdas,this.parts,this.warnings,r,this.body,this.holes)}warn(e,t,n){this.warnings.push({severity:`warning`,message:e,span:{...this.place(t),len:n}})}place(e){return{...Xr(this.parts,e+this.offset),len:Math.max(1,this.i-e)}}skipSpace(){for(;this.i<this.text.length&&/\s/.test(this.text[this.i]);)this.i++}done(){return this.skipSpace(),this.i>=this.text.length}peek(){return this.text[this.i]??``}span(e){return this.place(e)}fail(e,t=this.i,n=1){throw new Yr(e,t+this.offset,n)}match(e){e.lastIndex=this.i;let t=e.exec(this.text);return t?(this.i+=t[0].length,t[0]):null}ident(e){let t=this.match(Wr);return t===null&&this.fail(`Expected ${e}`),t}free(e,t=e.name){if(!this.text.startsWith(`free(`,this.i))return this.builtHole(e)||(this.refuseCell(e),null);let n=this.i;e.fixed&&this.fail(`${e.form}: a number, not free(…) — ${e.fixed}`,n,5);let r=e.key??`param`,i=tt(this,r,!!e.units,{...r===`param`?{param:t}:{},...e.whole?{whole:!0}:{}}),a=this.i-n;return i.text!==void 0&&r!==`choice`&&this.fail(`free("…") is a text, for spell(…) and meter(…): ${e.form} takes free(v, lo..hi)`,n,a),e.whole&&!e.rounds&&![i.lo,i.hi].every(Number.isInteger)&&this.fail(`${e.form} takes a whole number: free(…)'s range whole — free(${Math.round(i.value)}, ${Math.floor(i.lo)}..${Math.ceil(i.hi)})`,n,a),(e.min!==void 0&&i.lo<e.min||e.max!==void 0&&i.hi>e.max)&&this.fail(`${e.form}: free(…) moves within ${e.min??`…`}..${e.max??`…`} — free(${i.value}, ${Math.max(i.lo,e.min??i.lo)}..${Math.min(i.hi,e.max??i.hi)})`,n,a),i}builtHole(e){if(!e.fills||this.peek()!==`&`)return null;let t=/^&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[:^<>$.*/(])/.exec(this.text.slice(this.i));if(!t)return null;let n=this.i;this.i+=t[0].length,this.holes.push({from:this.offset+n,to:this.offset+this.i,ref:{name:t[1],pick:null,shift:0,span:this.span(n)},form:e.form});let r=e.fills.placeholder;return{key:`param`,value:r,unit:``,lo:r,hi:r,span:this.span(n)}}freeNumber(e,t){let n=this.free(e,t);return n===null?null:e.whole?Math.round(n.value):n.value}refuseCell(e){Kr.lastIndex=this.i;let t=Kr.test(this.text);if(!t&&(this.peek()!==`&`||e.moves))return;let n=Math.max(1,/^[^\s,)\]]*/.exec(this.text.slice(this.i))[0].length),r=t?`a range moved by cells`:`a cell`;this.fail(e.fills?`${e.form} is read as the piece is built: a number, a cell that is one number, or free(v, lo..hi), whose slider compiles it again — ${r} moves only a number read while the piece plays (decision 078)`:e.cell.startsWith(`no: read as the piece is built`)?`${e.form} is read as the piece is built: a number, or free(v, lo..hi), whose slider compiles it again — ${r} moves only a number read while the piece plays (decision 078)`:`${e.form} takes a number, or free(v, lo..hi), and ${r} isn't read here: ${e.cell.replace(/^no: /,``)} (decision 078)`,this.i,n)}int(e,t,n){let r=this.freeNumber(t,n);if(r!==null)return r;let i=this.match(Gr);return i===null&&this.fail(`Expected ${e}`),parseInt(i,10)}num(e,t,n){let r=this.freeNumber(t,n);if(r!==null)return{value:r,alter:0};let i=this.match(qr);i===null&&this.fail(`Expected ${e}`);let a=parseFloat(i);if(this.peek()===`/`&&/[0-9.]/.test(this.text[this.i+1]??``)){this.i++;let e=this.match(qr);(e===null||parseFloat(e)===0)&&this.fail(`a fraction needs a denominator, like 9/8`),a/=parseFloat(e)}let o=0;for(;this.peek()===`#`||this.peek()===`b`;)o+=this.text[this.i++]===`#`?1:-1;return{value:a,alter:o}}noteName(){let e=this.match(/[A-G](?:#|b)?(?:-?[0-9]+)?(?![A-Za-z0-9_])/y);return e===null?null:wn(e)}expect(e,t){this.peek()!==e&&this.fail(`Expected ${t}`),this.i++}lambda(){let e=this.i;this.depth>=32&&this.fail(`Unnamed cells &( … ) nest 32 deep at most: name the inner ones (&env …) and refer to them`,e-1,2);let t=0,n=-1;for(let r=e;r<this.text.length;r++)if(this.text[r]===`(`)t++;else if(this.text[r]===`)`&&--t===0){n=r;break}n<0&&this.fail(`')' to close &( … )`,e);let r=`λ${this.line}_${e+this.offset}`;this.body||this.fail(`An unnamed cell &( … ) here has no parser for its body`,e-1,2);let i=this.within(this.text.slice(e+1,n),e+1,this.depth+1),a=this.body(i,{name:r,pick:null,shift:0,span:{...Xr(this.parts,e+this.offset-1),len:n-e+2}});return this.lambdas.push({...a,lambda:this.text.slice(e+1,n).trim()}),this.i=n+1,r}ref(e){let t=this.i;this.expect(`&`,e);let n=this.peek()===`(`?this.lambda():this.ident(`a name after &`),r=null,i=0;if(this.peek()===`[`){this.i++,this.skipSpace();let e=this.match(/<<|>>/y);if(e){this.skipSpace();let a=this.freeNumber(J.turn),o=a===null?this.match(/[0-9]+/y):String(a);return i=(e===`<<`?-1:1)*(o===null?1:parseInt(o,10)),this.skipSpace(),this.expect(`]`,`']' to close &${n}[${e}…]`),{name:n,pick:r,shift:i,...this.transposition(n),span:this.span(t)}}let a=this.match(/[a-z][A-Za-z]*(?=\s*\])/y);if(a!==null)return this.skipSpace(),this.expect(`]`,`']' to close &${n}[${a}]`),{name:n,pick:r,shift:i,slot:a,...this.transposition(n),span:this.span(t)};let o=this.peek()===`$`&&(this.i++,this.skipSpace(),1)?{abs:!0}:{},s=()=>{let e=this.freeNumber(J.pick);return e===null?this.match(Gr):String(e)},c=s();if(this.skipSpace(),this.peek()===`:`){this.i++,this.skipSpace();let e=s();this.skipSpace();let t=null;if(this.peek()===`:`){this.i++,this.skipSpace();let e=this.i,n=s();n!==null&&parseInt(n,10)===0&&this.fail(`A slice step of 0 never moves`,e,n.length),t=n===null?null:parseInt(n,10),this.skipSpace()}r={kind:`slice`,from:c===null?null:parseInt(c,10),to:e===null?null:parseInt(e,10),...t===null?{}:{step:t},...o}}else c===null&&this.fail(`Expected an index like &${n}[0] (&${n}[$0] as written), or a slice like &${n}[1:]`),r={kind:`at`,i:parseInt(c,10),...o};this.expect(`]`,`']' to close &${n}[…]`)}else if((this.peek()===`+`||this.peek()===`-`)&&/[0-9]/.test(this.text[this.i+1]??``)){let e=this.peek(),r=/[0-9]+/.exec(this.text.slice(this.i+1))[0];this.fail(`&${n}${e}${r}: write &${n}^${e===`-`?`-`:``}${r} to move it by its table's steps (in a braid; ^$${e===`-`?`-`:``}${r}: by semitones), &${n} ${e} ${r} to add pitch (in a mix), &${n}[${e===`-`?`<<`:`>>`}${r===`1`?``:r}] to shift it, or &${n}[…] to pick from it`,t,this.i-t+1+r.length)}return{name:n,pick:r,shift:i,...this.transposition(n),span:this.span(t)}}rejectTap(e){if(this.peek()!==`:`)return;let t=/^(?:(?:pulse|beat)(?:\*\d+)?|\d+[nt]\.?|\d*m)(?![\w.])/.exec(this.text.slice(this.i+1));if(!t)return;let n=this.text.slice(e,this.i+1+t[0].length);this.fail(`${n} is a meter's tap, which only step= reads (step=${n}): here it names no cell`,e,n.length)}cellRef(e,t,n=!1){let r=this.i,i=this.ref(e);n||this.rejectTap(r);let a=this.text.lastIndexOf(`^`,this.i-1);return a>=r&&a>this.text.lastIndexOf(`)`,this.i-1)&&this.warn(`${this.text.slice(r,this.i)} ${t}: ^ and ^$ move a cell a braid plays (and base=&cell^n, a copy, and a gate's play=&cell^n); here it is the cell itself, so the move is ignored`,a,this.i-a),i}transposition(e){if(this.peek()!==`^`)return{};let t=this.i;this.i++;let n=this.peek()===`$`;n&&this.i++;let r=this.freeNumber(J.move),i=r===null?this.match(/-?[0-9]+/y):String(r);i===null&&this.fail(`&${e}^n moves it n steps of its table (&${e}^1, a degree up), &${e}^$n n semitones (&${e}^$7, &${e}^$-12)`,t,1),this.peek()===`.`&&/[0-9]/.test(this.text[this.i+1]??``)&&this.fail(`&${e}${this.text.slice(t,this.i)}…: ^ takes a whole number of steps (&${e}^1, &${e}^$-12)`,t,this.i-t+1+/^[0-9]+/.exec(this.text.slice(this.i+1))[0].length),this.peek()===`^`&&this.fail(`&${e}${this.text.slice(t,this.i)}^…: one ^ per reference; nest with degree(…): degree(&${e}${this.text.slice(t,this.i)}, n)`,this.i,1);let a=parseInt(i,10);return a?n?{transpose:a}:{degree:a}:{}}atBoundary(){let e=this.peek();return e===``||/\s/.test(e)}};function Qr(e){let t=!1;for(let n=0;n<e.length;n++){let r=e[n];if(r===`"`)t=!t;else if(!t&&r===`/`&&e[n+1]===`/`)return e.slice(0,n);else if(!t&&r===`#`&&(n===0||/\s/.test(e[n-1])))return e.slice(0,n)}return e}function $r(e,t){return t.step?`&${t.name} is read as ${e}: a stepped one is not yet a form; write one number (&${t.name} 3)`:`&${t.name} is read as ${e}: a cell that is one number, filled as the piece is built (&${t.name} 3)`}function ei(e,t,n){let r=e.get(t.name);if(!r)return{unknown:t};if(r.fill&&r.braid.kind===`blank`)return{blank:!0};let i=Br(e,r.name);return i===null?{problem:$r(n,r),at:r.span}:{value:i,cell:r}}function ti(e,t,n,r){let i=ei(t,n,r);return`value`in i?i:(`unknown`in i?e.unknownCell(i.unknown.name,i.unknown.span):`problem`in i&&e.error(i.problem,i.at),null)}function ni(e,t){return e.whole&&!e.rounds&&!Number.isInteger(t)?`it takes a whole number, not ${t}`:e.min!==void 0&&t<e.min||e.max!==void 0&&t>e.max?`it takes ${e.min??`any`} to ${e.max??`any`}, not ${t}`:null}let ri=new Map(Object.values(J).flatMap(e=>e.fills?[[e.form,e]]:[])),ii=e=>String(Math.round(e*1e9)/1e9).replace(/^(-?)0\./,`$10.`);function ai(e){let t=0,n=e.map(e=>{let n=e.from+t;return t+=e.length-(e.to-e.from),{...e,start:n,end:n+e.length,after:t}});return e=>{let t=0;for(let r of n){if(e<r.start)break;if(e<r.end)return r.from;t=r.after}return e-t}}let oi=e=>!!e&&typeof e==`object`&&typeof e.line==`number`&&typeof e.col==`number`&&typeof e.len==`number`;function si(e,t,n,r=/* @__PURE__ */ new Map){if(!e||typeof e!=`object`)return e;if(r.has(e))return r.get(e);if(Array.isArray(e)){let i=[];r.set(e,i);for(let a of e)i.push(si(a,t,n,r));return i}if(oi(e)&&e.line===t){let t=n(e.col-1),r=n(e.col-1+e.len);return{...e,col:t+1,len:Math.max(1,r-t)}}let i={};r.set(e,i);for(let[a,o]of Object.entries(e))i[a]=si(o,t,n,r);return i}function ci(e,t){let n=[...t].sort((e,t)=>t.hole.from-e.hole.from),r=e.text;for(let e of n)r=r.slice(0,e.hole.from)+e.text+r.slice(e.hole.to);try{let n=cd(e,r);if(e.parts.length>1)return n;let i=ai([...t].sort((e,t)=>e.hole.from-t.hole.from).map(e=>({from:e.hole.from,to:e.hole.to,length:e.text.length})));return{decl:si(n.decl,e.line,i),lambdas:n.lambdas.map(t=>si(t,e.line,i))}}catch(t){if(!(t instanceof Yr))throw t;return{problem:`${e.text.trim()}, filled as ${r.trim()}: ${t.message}`}}}function li(e){if(!e.cells.some(e=>e.built))return e;let t=new Map(e.cells.map(e=>[e.name,e])),n=[...e.diagnostics],r=[],i=/* @__PURE__ */ new Set,a=/* @__PURE__ */ new Map;for(let r of e.cells){let e=r.built;if(!e)continue;let o=[],s=!0;for(let r of e.holes){let e=ri.get(r.form),i=ei(t,r.ref,e.fills.read);if(`problem`in i&&n.push({severity:`error`,message:i.problem,span:i.at}),!(`value`in i)){s=!1;continue}let a=ni(e,i.value);a?(n.push({severity:`error`,message:`&${r.ref.name} is read as ${e.fills.read}: ${a} (${e.form})`,span:r.ref.span}),s=!1):o.push({hole:r,text:ii(e.whole||e.rounds?Math.round(i.value):i.value)})}if(!s)continue;let c=ci(e,o);if(`problem`in c)n.push({severity:`error`,message:c.problem,span:r.span});else{for(let t of e.lambdas)i.add(t);a.set(r.name,[{...c.decl,valueReads:[...c.decl.valueReads??[],...e.holes.map(e=>e.ref.name)]},...c.lambdas])}}for(let t of e.cells){if(i.has(t.name))continue;let e=a.get(t.name);e?r.push(...e):r.push(t)}return{...e,cells:r,diagnostics:n}}function ui(e,t){for(let n of t.values())for(let r of n.built?.holes??[])t.has(r.ref.name)||e.unknownCell(r.ref.name,r.ref.span)}let di={line:1,col:1,len:1},fi=e=>e.over===null&&(e.braid.kind===`blank`&&(e.name===`fifths12TET`||e.map?.kind===`edo`)||e.map?.kind===`ratios`),pi=e=>fi(e)?null:e.over?.name??`fifths12TET`,mi=e=>e.map?.kind===`ratios`&&e.braid.kind===`list`?Math.max(1,e.braid.tokens.length-1):(e.map?.kind===`edo`?e.map.steps:null)??e.cycle??12,hi=(e,t,n=0)=>{let r=e.get(t);if(!r||n>64)return 12;if(pi(r)===null)return mi(r);let i=r.braid;return i.kind===`scan`?i.steps.length:i.kind===`wave`?i.n:i.kind===`list`?i.tokens.reduce((e,t)=>e+l(t.atom).reduce((e,t)=>e+(t.kind===`note`?1:t.kind===`chord`?t.notes.length:0),0),0):hi(e,pi(r),n+1)},gi=(e,t)=>{let n=e=>({atom:e,repeat:1,subdivide:1,elongate:1}),r=e=>n({kind:`note`,value:e,alter:0}),i=t.braid,a=pi(t);return a===null?Array.from({length:mi(t)},(e,t)=>r(t)):i.kind===`list`?i.tokens.map(({atom:e,repeat:t,subdivide:n,elongate:r,chance:i,level:a})=>({atom:e,repeat:t,subdivide:n,elongate:r,...i===void 0?{}:{chance:i},...a===void 0?{}:{level:a}})):i.kind===`scan`?Cn(i.steps).positions.map(r):i.kind===`wave`?nr(i.shape,i.n,i.range).map(r):Array.from({length:hi(e,a)},(e,t)=>r(t))};function _i(e){let{parsed:t,error:n,unknownCell:r}=e,i=/* @__PURE__ */ new Map,a=/* @__PURE__ */ new Set;for(let e of t.cells)i.has(e.name)?n(`&${e.name} is already defined on line ${i.get(e.name).span.line}`,e.span):i.set(e.name,e);let o=Di(i);ui(e,i),bi(e,i),vi(e,i),yi(e,i),xi(e,i),wi(e,i),Ti(e,i),Ei(e,i);let s=Fi(i,n),c=Ai(i,a,n);Pi(e,i);let l=!i.has(nt);for(let e of i.keys())(e.startsWith(`key:`)||e.startsWith(`scale:`))&&a.add(e);let u=ki(i);if(u){i.set(Oi,{name:Oi,span:u.voices[0].span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`list`,tokens:u.voices.map(e=>({atom:{kind:`ref`,name:e.name,pick:null,shift:0},repeat:1,subdivide:1,elongate:1,span:e.span}))}});for(let[e,t]of u.cells)i.set(e,{...i.get(e),over:{name:Oi,pick:null,shift:0,span:i.get(e).span},braid:{kind:`list`,tokens:t}});a.add(Oi)}l&&i.set(nt,{name:nt,span:di,over:null,shift:null,off:!1,step:null,map:{kind:`edo`,period:2,steps:null,span:di},stride:null,cycle:12,params:{},paramSpans:{},braid:{kind:`blank`}});let d=i.get(nt);fi(d)||n(`&${nt} is the default grid: give it only cycle= and shift=`,d.span);let f=/* @__PURE__ */ new Map,p=(e,t)=>{if(f.has(e))return f.get(e);let a=i.get(e),o=pi(a),s=!0;return o!==null&&(i.has(o)?t.includes(o)?(n(`over= loops: ${[...t.slice(t.indexOf(o)),e,o].map(e=>`&`+e).join(` → `)}`,a.over?.span??a.span),s=!1):s=p(o,[...t,e]):(r(o,a.over.span),s=!1)),f.set(e,s),s};for(let e of i.keys())p(e,[]);return{decls:i,implicit:a,implicitRoot:l,overOk:f,sections:s,stacks:c,...o?{mainKey:o}:{}}}function vi(e,t){for(let[n,r]of t){if(!r.tonic)continue;let i=t.get(r.tonic.name);if(!i){e.unknownCell(r.tonic.name,r.tonic.span);continue}if(i.fill&&i.braid.kind===`blank`)continue;let a=i.braid.kind===`list`?i.braid.tokens:[],o=a.every(e=>e.subdivide===1&&e.atom.kind===`note`&&Number.isInteger(e.atom.value))?a:[],s=o[0]?.atom;s?.kind!==`note`||!i.step&&(o.length!==1||o[0].repeat!==1)?e.error(i.step?`&${i.name} holds a key's tonic (scale(…, &${i.name})), stepped: write a note a step, a name or a pitch class (&${i.name} step=1m/8 D F)`:`&${i.name} holds a key's tonic (scale(…, &${i.name})): write one note, a name or a pitch class (&${i.name} D, &${i.name} 2), or step it (&${i.name} step=1m/8 D F)`,i.span):t.set(n,{...r,shift:mn(s.value+s.alter,12)})}}function yi(e,t){for(let[n,r]of t){if(r.braid.kind!==`scan`||!r.braid.mode)continue;let i=t.get(r.braid.mode.name);if(!i){e.unknownCell(r.braid.mode.name,r.braid.mode.span);continue}if(i.fill&&i.braid.kind===`blank`)continue;let a=i.step?null:Ci(i);if(a){t.set(n,{...r,braid:{...r.braid,steps:a}});continue}if(i.step&&i.braid.kind===`list`){let a=Si(e,r,i,7,12,r.braid.mode.span);a!==null&&t.set(n,{...r,valueReads:[i.name],braid:{kind:`scan`,span:r.braid.span,steps:vn(a),phaseCell:{name:i.name,k:7,n:12}}});continue}let o=i.braid.kind===`list`?i.braid.tokens:[],s=o.length===1&&o[0].repeat===1&&o[0].subdivide===1?o[0].atom:null,c=s?.kind===`note`&&!s.pitched&&s.alter===0?s.value:null;i.step||c===null||!Number.isInteger(c)||c<0||c>6?e.error(i.step?`&${i.name} holds a scale's mode (scale(&${i.name}, …)): a stepped mode is not yet a form; write one (&${i.name} dorian)`:`&${i.name} holds a scale's mode (scale(&${i.name}, …)): write one, a name, its phase from the darkest or its table (&${i.name} major, &${i.name} 3, &${i.name} 0 2 3 5 7 8 10)`,i.span):t.set(n,{...r,valueReads:[i.name],braid:{...r.braid,steps:vn(c)}})}}function bi(e,t){for(let[n,r]of t){if(r.braid.kind!==`list`||!r.braid.deferred)continue;let{generator:i,call:a,reads:o,at:s}=r.braid.deferred,c=a,l=!0;for(let n of[...o].sort((e,t)=>t.from-e.from)){if(n.kind===`number`){let r=ti(e,t,n.ref,`${i}(…)'s number`);if(!r){l=!1;continue}c=c.slice(0,n.from)+String(r.value)+c.slice(n.to);continue}let r=t.get(n.ref.name);r?r.fill&&r.braid.kind===`blank`?l=!1:r.step||r.text===void 0?(e.error(`&${r.name} is read as ${i}(…)'s text: a text cell, filled as the piece is built (&${r.name} "3/4")`,r.span),l=!1):c=c.slice(0,n.from)+JSON.stringify(r.text)+c.slice(n.to):(e.unknownCell(n.ref.name,n.ref.span),l=!1)}if(l)try{let e=new Zr(c,s.line,s.col-1);e.i=i.length;let a=ur(e,i,0);t.set(n,{...r,valueReads:[...r.valueReads??[],...o.map(e=>e.ref.name)],braid:a})}catch(t){if(!(t instanceof Yr))throw t;e.error(`${a}, filled as ${c}: ${t.message}`,s)}}let n=new Set([...t.values()].flatMap(e=>e.text===void 0?[]:[e.name]));if(!n.size)return;let r=/* @__PURE__ */ new Set,i=(t,i)=>{n.has(t)&&!r.has(`${t}@${i.line}:${i.col}`)&&(r.add(`${t}@${i.line}:${i.col}`),e.error(`&${t} is a text: a generator's argument reads it as the piece is built (meter(&${t})), nothing else`,i))};for(let e of t.values()){if(e.braid.kind===`list`)for(let t of e.braid.tokens)for(let n of l(t.atom))n.kind===`ref`&&i(n.name,t.span??e.span);for(let t of Object.values(e.paramCells??{}))for(let e of t.factors)i(e.name,e.span)}}function xi(e,t){for(let[n,r]of t){if(r.braid.kind!==`scan`||!r.braid.even)continue;let{even:i,span:a}=r.braid,o=[i.k,i.n,i.phase].flatMap(e=>typeof e==`number`?[]:[e.name]),s=(n,r)=>{if(typeof n==`number`)return{value:n,word:!1,at:a};let i=ti(e,t,n,`even(…)'s ${r}`);if(!i)return null;let o=i.cell.braid.kind===`list`?i.cell.braid.tokens[0]?.atom:null;return{value:i.value,word:o?.kind===`note`&&o.mode===!0,at:n.span}},c=typeof i.phase==`number`?void 0:t.get(i.phase.name);if(c?.step){let[l,u]=[s(i.k,`k`),s(i.n,`n`)];if(!l||!u)continue;let d=Si(e,r,c,l.value,u.value,i.phase.span);d!==null&&t.set(n,{...r,valueReads:o,braid:{kind:`scan`,span:a,steps:Qn(l.value,u.value,d),phaseCell:{name:c.name,k:l.value,n:u.value}}});continue}let[l,u,d]=[s(i.k,`k`),s(i.n,`n`),s(i.phase,`phase`)];if(!l||!u||!d)continue;let f=[l,u].find(e=>e.word)??(d.word&&(l.value!==7||u.value!==12)?d:null);if(f){e.error(f===d?`even(${l.value}, ${u.value}, …): a mode's name is a phase of the diatonic, even(7, 12); here write its number (${d.value})`:`even(…): a mode's name is a phase, not a size; write a number`,f.at);continue}let p=Zn(l.value,u.value,d.value);p?e.error(p,a):t.set(n,{...r,valueReads:o,braid:{kind:`scan`,span:a,steps:Qn(l.value,u.value,d.value)}})}}function Si(e,t,n,r,i,a){if(!t.over?.name.startsWith(`key:λ`)||i!==12)return e.error(i===12?`&${n.name} steps even(…)'s phase: a stepped phase is read in a key, scale(even(${r}, ${i}, &${n.name}), &tonic)`:`&${n.name} steps even(${r}, ${i}, …)'s phase: a stepped phase is a key's, a necklace over the twelve (even(k, 12, &${n.name}))`,a),null;let o=n.braid.kind===`list`?n.braid.tokens.flatMap(e=>l(e.atom)):[],s=[];for(let t of o){if(t.kind===`rest`)continue;let a=t.kind!==`note`||t.pitched||t.alter!==0||!Number.isInteger(t.value)?`&${n.name} steps a scale's phase: each step a number from 0 to ${r-1}${r===7?` or a mode by name`:``} (&${n.name} step=1m 3 5)`:t.mode&&r!==7?`even(${r}, ${i}, &${n.name}): a mode's name is a phase of the diatonic, even(7, 12); here write its number (${t.value})`:Zn(r,i,t.value);if(a)return e.error(a,n.span),null;s.push(t.value)}return s.length?s[0]:(e.error(`&${n.name} steps a scale's phase and holds none: write one a step (&${n.name} step=1m 3 5)`,n.span),null)}function Ci(e){if(e.braid.kind===`scan`&&!e.braid.mode)return e.braid.steps.every(e=>e>0)&&e.braid.steps.reduce((e,t)=>e+t,0)===12?[...e.braid.steps]:null;if(e.braid.kind!==`list`||e.braid.tokens.length<2)return null;let t=[];for(let n of e.braid.tokens){let e=n.atom;if(e.kind!==`note`||e.pitched||n.repeat!==1||n.subdivide!==1||n.elongate!==1)return null;t.push(e.value+e.alter)}return t[0]!==0||t.some((e,n)=>!Number.isInteger(e)||e>=12||n>0&&e<=t[n-1])?null:t.map((e,n)=>(t[n+1]??12)-e)}function wi(e,t){for(let[n,r]of t){let i=r.paramCells?.swing;if(!i)continue;let[a]=i.factors,o=a&&t.get(a.name),{swing:s,...c}=r.paramCells,l=()=>t.set(n,{...r,paramCells:c});i.factors.length!==1||i.range||a.pick||a.shift?(e.error(`swing= reads one cell, a swing alone: swing=&swing, with &swing swing=8n:2/3`,i.span),l()):o?o.braid.kind!==`blank`||o.step||o.over||o.map||typeof o.params.swing!=`number`||!Object.keys(o.params).every(e=>e===`swing`||e===`label`)?(e.error(`&${o.name} holds a meter's swing (swing=&${o.name}): write a swing alone, &${o.name} swing=8n:2/3`,o.span),l()):t.set(n,{...r,params:{...r.params,swing:o.params.swing},paramSpans:{...r.paramSpans,swing:i.span},paramCells:c,...o.swing?{swing:o.swing}:{},...o.swingMoves?{swingMoves:o.swingMoves}:{},swingFrom:a}):(e.unknownCell(a.name,a.span),l())}}function Ti(e,t){for(let[n,r]of t){let i=r.swingMoves;if(!i)continue;for(let n of i.factors)t.has(n.name)||e.unknownCell(n.name,n.span);if(i.range){i.range.every(e=>e>=0&&e<=1)||e.error(`swing=${i.level}:${i.range[0]}..${i.range[1]}: a share's range lies within 0..1 — swing=${i.level}:.5...75 * &k`,i.span);continue}let a=t.get(i.factors[0].name),o=a?.braid.kind===`list`?a.braid.tokens.flatMap(e=>l(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[],s=o.find(e=>!(e>=0&&e<=1));s!==void 0&&e.error(`swing=${i.level}:&${a.name}: a share is 0 to 1, and &${a.name} holds ${s}`,i.span);let c=o[0];c!==void 0&&s===void 0&&t.set(n,{...r,params:{...r.params,swing:c},swing:(r.swing??[]).map(e=>e.level===i.level?{...e,share:c}:e)})}}function Ei(e,t){for(let[n,r]of t){let i=r.bend?.depthMoves;if(!i)continue;for(let n of i.factors)t.has(n.name)||e.unknownCell(n.name,n.span);if(i.range)continue;let a=t.get(i.factors[0].name),o=a?.braid.kind===`list`?a.braid.tokens.flatMap(e=>l(e.atom)).find(e=>e.kind===`note`):void 0;o?.kind===`note`&&t.set(n,{...r,bend:{...r.bend,depth:o.value+o.alter}})}}function Di(e){return[...e.values()].find(e=>!e.lambda&&!e.base&&e.over?.name.startsWith(`key:λ`))?.name??null}let Oi=`kit:voices`;function ki(e){let t=e=>Object.keys(e?.params??{}).some(e=>Re.has(e)),n=n=>t(e.get(n)),r=e=>!e.pick&&!e.shift&&!e.transpose&&!e.degree&&!e.values,i=new Set([...e.values()].flatMap(e=>e.over?[e.over.name]:[])),a=(e,i)=>{if(!e||e.over||e.map||t(e)||e.braid.kind!==`list`||e.braid.tokens.length===0||i.length>256||i.includes(e.name))return!1;let a=!1;for(let t of e.braid.tokens.flatMap(e=>l(e.atom)))if(t.kind!==`rest`){if(t.kind===`ref`&&n(t.name)&&r(t))a=!0;else if(t.kind===`ref`&&!t.shift&&!t.transpose&&!t.values&&s(t.name,[...i,e.name]))a=!0;else if(t.kind===`mix`&&t.exprs.every(e=>e.k===`ref`&&n(e.ref.name)&&r(e.ref)))a=!0;else return!1}return a},o=/* @__PURE__ */ new Map,s=(t,n)=>{if(o.has(t))return o.get(t);let r=e.get(t),s=r?.braid.kind===`list`&&r.braid.tokens.length===1&&r.braid.tokens[0].atom.kind===`mix`,c=!!r&&!r.step&&!s&&!i.has(t)&&a(r,n);return(n.length===0||c)&&o.set(t,c),c},c=[...e.values()].filter(e=>e.step&&a(e,[]));if(!c.length)return null;let u=[],d=(e,t)=>{let n=u.findIndex(t=>t.name===e);return n>=0?n:u.push({name:e,pick:null,shift:0,span:t})-1},f=/* @__PURE__ */ new Map,p=t=>{if(f.has(t.name)||t.braid.kind!==`list`)return;f.set(t.name,[]);let r=t=>{let i=t.atom,a=i;if(i.kind===`ref`&&n(i.name))a={kind:`note`,value:d(i.name,t.span),alter:0};else if(i.kind===`ref`)p(e.get(i.name));else if(i.kind===`mix`){let e=i.exprs,n=e.map(e=>d(e.ref.name,t.span)),r=e.some(e=>e.level!==void 0)?e.map(e=>e.level??1):void 0;a={kind:`chord`,notes:n,alters:n.map(()=>0),...r?{levels:r}:{}}}else i.kind===`seq`&&(a={...i,layers:i.layers.map(e=>e.map(r))});return{...t,atom:a}},i=t.braid.tokens.map(r);f.set(t.name,i)};for(let t of[...e.values()])c.includes(t)&&p(t);return{voices:u,cells:f}}function Ai(e,t,n){let r=/* @__PURE__ */ new Set,i=(e,t)=>({k:`ref`,ref:{name:e,pick:null,shift:0,span:t}}),a=ki(e);for(let o of[...e.values()]){let s=o.params,c=o.braid.kind===`list`?o.braid.tokens:[],l=typeof s.play==`string`&&c.length?s.play:null;if(l===null)continue;let u=`play`,d=o.paramSpans[u]??o.span,f=o.playMove,p=e=>e.kind===`ref`&&!e.pick&&!e.shift&&!e.transpose&&!e.values,m=c.length===1&&c[0].atom.kind===`mix`&&c[0].atom.exprs.every(e=>e.k===`ref`&&!e.ref.pick)?c[0].atom.exprs:null,h=c.every(e=>p(e.atom)&&e.repeat===1&&e.subdivide===1&&e.elongate===1);if(!m&&!h){n(`&${o.name} is a gate (${u}=): its braid is what it plays: a voice, a kit, a chord of voices [&lead, &bell], or voices to pick from (&${o.name} ${u}=&${l} &lead)`,o.span);continue}let g=m?m.flatMap(e=>e.k===`ref`?[{name:e.ref.name,span:e.ref.span}]:[]):c.flatMap(e=>e.atom.kind===`ref`?[{name:e.atom.name,span:e.span}]:[]),_=g;if(!m&&g.length>1){let n=`${o.name}:kit`;e.set(n,{name:n,span:o.span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:o.braid}),t.add(n),_=[{name:n,span:o.span}]}let v=(o.paramCells?.level?.factors??[]).map(e=>({name:e.name,port:`level`,span:e.span})),y=typeof s.level==`number`?s.level:1,b=o.paramSpans.level??o.span,x=(r,i)=>{let a=e.get(r);if(!f||!a)return r;let s=`${r}${ne({pick:null,shift:0,...f})}`,c={name:s,span:o.span,over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:{kind:`blank`}},l={kind:`ref`,name:r,pick:null,shift:0,...f.transpose?{transpose:f.transpose}:{},...f.degree?{values:{mul:1,add:f.degree}}:{}};return e.has(s)||e.set(s,{...I(c,a,{name:r,pick:null,shift:0,span:i},e=>n(e,i)),shift:null,laps:a.laps??null,braid:{kind:`list`,tokens:[{atom:l,repeat:1,subdivide:1,elongate:1,span:i}]}}),t.add(s),s},S=ji(e,e.get(l),n);S&&r.add(l);let C=(S??[{line:{name:l,pick:null,shift:0,span:d},by:[]}]).map(({line:e,by:t})=>({line:e.name,plays:x(e.name,e.span),ref:e,by:t,span:e.span})),w=t=>a?.cells.has(t)?Ni(e,t):null,T=C.flatMap(t=>{let r=e.get(t.line),a=w(t.line);return _.map(o=>{let s=Mi(e.get(o.name)),c=a&&s?a.filter(e=>!s.includes(e)):[];return c.length&&n(`&${t.line} plays ${c.map(e=>`&`+e).join(`, `)}, which &${o.name} doesn't hold: a kit's lines play its own voices`,t.span),{k:`prod`,span:o.span,factors:[{k:`ref`,ref:{...t.ref,name:t.plays}},...t.by,...v.map(e=>i(e.name,e.span)),...r?.over?.name===o.name||a&&s?[]:[i(o.name,o.span)],...y===1?[]:[{k:`num`,value:y,span:b}]]}})}),E=Object.fromEntries(Object.entries(s).filter(([e])=>![`play`,`trigger`,`velocity`,`gate`,`gain`,`level`].includes(e))),D=Object.fromEntries(Object.entries(o.paramCells??{}).filter(([e])=>e!==`level`));e.set(o.name,{...o,params:E,paramCells:D,gate:{notes:l,...f?{move:f}:{},plays:C[0].plays,...S?{lines:C.map(({line:e,plays:t})=>({line:e,plays:t}))}:{},port:u,levels:v.map(({name:e,port:t})=>({name:e,port:t})),gain:y,receivers:g.map(e=>e.name)},braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:T,gate:o.name},repeat:1,subdivide:1,elongate:1,span:o.span}]}})}let o=new Map([...e.values()].flatMap(e=>e.gate?.lines?[[e.gate.notes,e.name]]:[])),s=e=>e.k===`ref`?[e.ref]:e.k===`sum`?e.items.flatMap(e=>s(e.e)):e.k===`prod`?e.factors.flatMap(s):[];for(let t of e.values())if(!(t.gate||t.braid.kind!==`list`))for(let e of t.braid.tokens.flatMap(e=>l(e.atom))){let r=e.kind===`ref`?[{name:e.name,span:t.span}]:e.kind===`mix`?e.exprs.flatMap(s):[];for(let e of r)o.has(e.name)&&n(`&${e.name} is the part &${o.get(e.name)} plays, a stack of lines and no sound: mix or send &${o.get(e.name)}`,e.span)}return r}function ji(e,t,n){if(!t||t.map||t.gate||Object.keys(t.params).some(e=>!Be.has(e))||t.braid.kind!==`list`||t.braid.tokens.length!==1)return null;let r=t.braid.tokens[0].atom;if(r.kind!==`mix`||r.gate||!r.exprs.length)return null;let i=t=>t.k===`num`||t.k===`ref`&&[`amp`,`db`,`lin`].includes(e.get(t.ref.name)?.map?.kind??``),a=r.exprs.map(e=>{if(e.k===`ref`)return`level`in e&&e.level!==void 0?null:{line:e.ref,by:[]};if(e.k!==`prod`)return null;let t=e.factors.filter(e=>!i(e)),n=t.length===1?t[0]:e.factors[0],r=e.factors.filter(e=>e!==n);return n.k!==`ref`||!r.every(e=>e.k===`num`||e.k===`ref`&&!e.ref.pick&&!e.ref.shift)?null:{line:n.ref,by:r}});if(!a.every(e=>e!==null))return null;let o=t=>{let n=e.get(t);return!!n&&(!!n.gate||Object.keys(n.params).some(e=>Re.has(e))||n.braid.kind===`list`&&n.braid.tokens.length===1&&n.braid.tokens[0].atom.kind===`mix`)};return a.map(e=>({line:e.line,by:e.by.filter(e=>e.k!==`ref`||!o(e.ref.name)||(n(`&${t.name} is a stack of lines, each times its levels: &${e.ref.name} is a sound, not a level (a cell with map=amp, map=db or map=lin, or a number)`,e.ref.span),!1))}))}function Mi(e){if(!e||e.map||e.gate||e.braid.kind!==`list`||!e.braid.tokens.length)return null;let t=e.braid.tokens.flatMap(e=>e.atom.kind===`ref`?[e.atom.name]:[]);return t.length===e.braid.tokens.length?t:null}function Ni(e,t,n=[]){let r=e.get(t);if(!r||n.includes(t)||r.braid.kind!==`list`)return[];let i=t=>Object.keys(e.get(t)?.params??{}).some(e=>Re.has(e)),a=/* @__PURE__ */ new Set;for(let o of r.braid.tokens.flatMap(e=>l(e.atom))){let r=o.kind===`ref`?[o.name]:o.kind===`mix`?o.exprs.flatMap(e=>e.k===`ref`?[e.ref.name]:[]):[];for(let o of r)for(let r of i(o)?[o]:Ni(e,o,[...n,t]))a.add(r)}return[...a]}function Pi(e,t){let n=e=>!!e&&!e.gate&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`&&Y(e.name,t)===null;for(let r of t.values()){let i=r.over?t.get(r.over.name):void 0;i&&i.braid.kind===`list`&&i.braid.tokens.length&&i.braid.tokens.every(e=>e.atom.kind===`ref`&&n(t.get(e.atom.name)))&&(e.error(`A selector switches sections (decision 016): &${r.name} over=&${i.name} reads mixes. Write &${i.name} step=4n with a section per part (&${i.name} step=4n &keysBar &drumBar), step each part's cells by its section (step=&keysBar), and play the parts straight into the sound card`,r.over.span),e.broken.add(r.name))}}function Fi(e,t){let n=/* @__PURE__ */ new Map,r=new Set([...e.values()].flatMap(e=>e.step?.kind===`driven`?[e.step.driver.name]:[])),i=e=>!!e&&!e.step&&!e.over&&!e.map&&(e.braid.kind===`blank`||e.braid.kind===`list`&&!e.braid.tokens.length);for(let a of[...e.values()]){if(!a.step||a.over||a.map||a.braid.kind!==`list`||!a.braid.tokens.length)continue;let o=[];for(let s of a.braid.tokens){let c=s.atom;if(c.kind!==`ref`||c.pick||c.shift||c.transpose||c.values||s.repeat!==1||s.subdivide!==1||s.elongate!==1)break;let l=e.get(c.name);if(l&&!i(l)&&(!l.step||n.has(c.name))){let n=a.braid.tokens.map(e=>e.atom.kind===`ref`?e.atom.name:``).filter(e=>e!==c.name);if(l.step||!n.some(t=>t&&!e.has(t)&&r.has(t)))break;t(`&${c.name} is a section of &${a.name}, so its line can carry attributes only (off, label=, tags=, show=, size=, shift=, restart=), not steps or a table of its own`,l.span),e.set(c.name,{...l,over:null,map:null,braid:{kind:`blank`}})}o.push(c.name)}if(o.length===a.braid.tokens.length&&!o.every(t=>e.has(t)&&!i(e.get(t)))&&o.some(e=>r.has(e))){for(let[t,r]of o.entries()){n.set(r,a.name);let o=e.get(r);if(o&&!i(o))continue;let s=a.braid.tokens[t].span,c={kind:`list`,tokens:[{atom:{kind:`note`,value:0,alter:0},repeat:1,subdivide:1,elongate:1,span:s}]};e.set(r,o?{...o,step:a.step,braid:c}:{name:r,span:s,over:null,shift:null,off:!1,step:a.step,map:null,stride:null,cycle:null,params:{},paramSpans:{},braid:c})}e.set(a.name,{...a,step:null})}}return n}let Ii=(e,t,n)=>e.k===`ref`?n.includes(t(e.ref.name)):e.k===`num`?!1:e.k===`prod`?e.factors.some(e=>Ii(e,t,n)):e.items.some(e=>Ii(e.e,t,n));var Li=class extends Error{span;constructor(e,t){super(e),this.span=t}};let Ri=e=>e.k===`ref`?e.ref.span:e.span,zi={k:`act`,terms:[],plain:[],offset:0,gain:1},Bi=e=>({ref:e,sign:1,inSum:!1}),Vi=(e,t)=>e(t.ref.name)===`volume`||e(t.ref.name)===`plain`&&!t.inSum;function Hi(e,t,n){let r=Ui(e,t);if(r.k===`signal`)return[...r.bindings];if(r.k===`num`)throw new Li(`A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)`,Ri(e));let i=[...r.terms.map(e=>e.ref.name),...r.plain.map(e=>e.name)],a=n?.(i);throw new Li(`${i.map(e=>`&`+e).join(` * `)} has no voice: a product needs one sound (a voice, a mix, a pattern read through a kit) — &theme * &lead${a?`. ${a}`:``}`,Ri(e))}function Ui(e,t,n=`auto`){if(e.k===`num`)return{k:`num`,value:e.value};if(e.k===`ref`){if(e.level!==void 0)throw new Li(`&${e.ref.name}:0:${+e.level.toFixed(3)} is a hit's gain, in a groove: in a mix, a gain is a number (&${e.ref.name} * ${+e.level.toFixed(3)})`,e.ref.span);let r=t(e.ref.name);return r===`signal`||r===`wave`&&n===`auto`?{k:`signal`,bindings:[{voice:e.ref,pitches:[],offset:0,gain:1}]}:r===`plain`?{...zi,plain:[e.ref]}:{...zi,terms:[{ref:e.ref,sign:1,inSum:!1}]}}if(e.k===`prod`){let r=n===`pitch`||Ii(e,t,[`signal`])?`pitch`:`auto`;return e.factors.map(e=>Ui(e,t,r)).reduce((t,n,r)=>Wi(t,n,Ri(e.factors[r])))}return Gi(e,t,n)}function Wi(e,t,n){if(e.k===`num`&&t.k===`num`)return{k:`num`,value:e.value*t.value};if(e.k===`signal`&&t.k===`signal`)throw new Li(`Two sounds can't multiply (&${e.bindings[0].voice.name} * &${t.bindings[0].voice.name}): mix them with + or ,`,n);if(e.k===`signal`||t.k===`signal`){let[n,r,i]=e.k===`signal`?[e,t,!1]:[t,e,!0],a=r.k===`num`?{...zi,gain:r.value}:r,o=[...a.terms,...a.plain.map(Bi)];return{k:`signal`,bindings:n.bindings.map(e=>({...e,pitches:i?[...o,...e.pitches]:[...e.pitches,...o],offset:e.offset+a.offset,gain:e.gain*a.gain}))}}let r=e.k===`num`?{...zi,gain:e.value}:e,i=t.k===`num`?{...zi,gain:t.value}:t;return{k:`act`,terms:[...r.terms,...r.plain.map(Bi),...i.terms,...i.plain.map(Bi)],plain:[],offset:r.offset+i.offset,gain:r.gain*i.gain}}function Gi(e,t,n){let r=n===`pitch`||!Ii(e,t,[`signal`])&&Ii(e,t,[`pitch`,`plain`])?`pitch`:`auto`,i=e.items.map(e=>({t:Ui(e.e,t,r),sign:e.sign,span:Ri(e.e)}));if(i.every(e=>e.t.k===`num`))return{k:`num`,value:i.reduce((e,t)=>e+t.sign*t.t.value,0)};if(i.some(e=>e.t.k===`signal`)){let e=[];for(let t of i){if(t.t.k===`num`)throw new Li(`A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)`,t.span);if(t.t.k===`act`)throw new Li(`A pitch or a volume can't be added to a sound: it acts on one (&theme * &lead)`,t.span);if(t.sign<0)throw new Li(`Sounds mix with +; there's no subtracting a voice`,t.span);e.push(...t.t.bindings)}return{k:`signal`,bindings:e}}let a=[],o=0;for(let{t:e,sign:n,span:r}of i){if(e.k===`num`){o+=n*e.value;continue}let i=e;if(i.gain!==1)throw new Li(`A gain inside a pitch sum: gains multiply the sound — (&theme + 12) * &lead * 0.8`,r);for(let e of i.terms){if(e.inSum===!1&&!Ki(e,t))throw new Li(`&${e.ref.name} is a volume: it multiplies, it can't be added — &theme * &${e.ref.name} * &lead`,e.ref.span);a.push({...e,sign:e.sign*n,inSum:!0})}for(let e of i.plain)a.push({ref:e,sign:n,inSum:!0});o+=n*i.offset}return{k:`act`,terms:a,plain:[],offset:o,gain:1}}let Ki=(e,t)=>!Vi(t,e),qi=e=>`&${e} is a role: it names the gates that play it, and is no sound to mix, send or play (name its gates here)`;function Ji(e,t,n){let{error:r}=e,i=/* @__PURE__ */ new Map;for(let e of t.values()){if(e.map?.kind!==`role`)continue;let n=e.braid.kind===`list`?e.braid.tokens:[];n.length===0&&r(`&${e.name} is a role: name the gates that play it (&${e.name} map=role &player)`,e.span);for(let a of n){let n=a.atom;if(n.kind!==`ref`){r(`a role's entries are the gates that play it, as written (&${e.name} map=role &player &player2)`,a.span);continue}let o=t.get(n.name);if(!o)continue;if(!o.gate||n.pick||n.shift||n.transpose!==void 0||n.values||a.repeat!==1||a.elongate!==1||a.subdivide!==1){r(`&${n.name}: a role's entries are gates, as written (&player play=&part &voice), and &${n.name} is not one`,a.span);continue}let s=i.get(n.name);s===void 0?i.set(n.name,e.name):s!==e.name&&r(`&${n.name} plays two roles, &${s} and &${e.name}: a gate plays one`,a.span)}}return[...t.values()].flatMap(e=>{if(!e.gate||n.has(e.name))return[];let t=i.get(e.name);return[{name:e.name,...t===void 0?{}:{role:t},part:e.gate.notes,...e.gate.move?{move:e.gate.move}:{},voices:e.gate.receivers}]})}let Yi=(e,t)=>{let n=e.get(t);return!!n&&(!!n.gate||n.map?.kind===`role`)};function Xi(e,t){let n=/* @__PURE__ */ new Map,r=new Set([...t.values()].flatMap(e=>e.over?[e.over.name]:[]));for(let i of r){let r=t.get(i);if(!r||r.map||r.braid.kind!==`list`||!r.braid.tokens.length)continue;let a=r.braid.tokens,o=e=>e.atom.kind===`ref`&&!e.atom.pick&&!e.atom.shift&&e.atom.transpose===void 0&&!e.atom.values&&e.repeat===1&&e.subdivide===1&&e.elongate===1;if(!a.every(e=>o(e)&&e.atom.kind===`ref`&&Yi(t,e.atom.name)))continue;let s=a.map(e=>e.atom.kind===`ref`?e.atom.name:``);r.step&&e.warn(`&${i} is a band, a table of performers: it needs no step=, the selector reading it steps (their parts keep their time)`,r.step.span);let c=/* @__PURE__ */ new Map;for(let[n,r]of s.entries()){let o=t.get(r),s=o.gate?[r]:o.braid.kind===`list`?o.braid.tokens.flatMap(e=>e.atom.kind===`ref`&&t.get(e.atom.name)?.gate?[e.atom.name]:[]):[];for(let t of new Set(s)){let o=c.get(t);o!==void 0&&o!==r?e.error(`&${t} is in &${i} twice, as &${o} and as &${r}: a performer is one entry of a band`,a[n].span):c.set(t,r)}}n.set(i,s)}return n}function Zi(e,t,n){if(!n.size)return[...e];let r=e=>[...t.values()].filter(t=>t.over===e&&t.clock).map(e=>e.name);return e.map(e=>{let i=[...e.through,...e.via].find(e=>t.get(e)?.gate);if(!i)return e;let a=[],o=[];for(let[e,s]of n){let n=s.findIndex(e=>e===i||t.get(e)?.map?.kind===`role`&&t.get(e).units.some(e=>e.atom.kind===`ref`&&e.atom.name===i));if(!(n<0)){for(let t of r(e))a.push({cell:t,entry:n,part:s[n],performer:!0});o.push(...r(e),e,s[n])}}return a.length?{...e,via:[.../* @__PURE__ */ new Set([...e.via,...o])],select:[...e.select,...a]}:e})}function Qi(e,t,n,r){for(let[i,a]of r)for(let r of n.values()){if(r.over!==i||!r.clock)continue;let o=e=>n.get(e)?.params.restart??r.params.restart,s=a.find(e=>o(e)===`restart`||o(e)===`resume`),c=r.step?.tap===`1m`&&r.step.chain.every(e=>e.op===`÷`&&Number.isInteger(e.n)||e.n===1);s&&!c&&e.warn(`&${r.name} switches &${s} with restart=${o(s)} off the bar: its part starts where the switch falls, not on a bar line, so its notes move in the bar. Switch on whole bars (step=1m), or let it run on (restart=free, a performer's default)`,t.get(r.name).span)}}let $i=e=>!!e&&e.map?.kind!==`sample`&&e.map?.kind!==`midi`&&e.braid.kind===`list`&&e.braid.tokens.length===1&&e.braid.tokens[0].atom.kind===`mix`,ea=(e,{decls:t})=>!!e&&!Object.keys(e.params).some(e=>Re.has(e))&&e.braid.kind===`list`&&e.braid.tokens.length>0&&e.braid.tokens.every(e=>e.atom.kind===`ref`&&He(t.get(e.atom.name)?.params??{})),ta=(e,{rateOf:t})=>{if(!e.step||e.step.kind===`driven`||e.step.kind===`tap`)return null;let n=t(e.step),r=e.braid,i=r.kind===`list`?r.tokens.length:r.kind===`scan`?r.steps.length:r.kind===`wave`?r.n:1;return n===null?null:e.step.whole?n:n/Math.max(1,i)},na=(e,{decls:t})=>e.over?t.get(e.over.name):void 0,ra=(e,{decls:t})=>{let n=typeof e.params.play==`string`?t.get(e.params.play):void 0;return!!n&&typeof n.params.write==`string`&&$i(t.get(n.params.write))},ia=e=>t=>{let n=e.decls.get(t);return!!n&&(!!n.gate||Object.keys(n.params).some(e=>Re.has(e))||ea(na(n,e),e)||ra(n,e)||(ta(n,e)??0)>=20)},aa=(e,t)=>Rr(e.name,t.decls,ia(t))!==null,oa=[{sort:`signal`,is:`A sound parameter (s=, lpf= …): a voice.`,example:[`&lead s=saw loop=C4`],holds:e=>Object.keys(e.params).some(e=>Re.has(e))},{sort:`pitch`,is:`A product with no sound in it and a pitch: notes with their levels (decision 087). In a product with a sound it is its own product, as written in parentheses: [&cycle * &glass] plays [(&notes * &level) * &glass].`,example:[`&notes step=2 0 4`,`&level map=amp step=2 1 .5`,`&cycle [&notes * &level]`],holds:aa},{sort:`signal`,is:`A mix: an instrument.`,example:[`&a s=saw loop=C4`,`&b s=sine loop=C3`,`&organ [&a, &b]`],holds:(e,{decls:t})=>$i(e)&&Y(e.name,t)===null},{sort:`signal`,is:`A pattern read through a kit (a table of voices).`,example:[`&bd s=sine loop=A1`,`&hh s=white`,`&kit &bd &hh`,`&drums over=&kit step=4 0 1 0 1`],holds:(e,t)=>ea(na(e,t),t)},{sort:`signal`,is:`A read head of a sound tape (a tape that records a mix).`,example:[`&lead s=saw loop=C4`,`&mix [&lead]`,`&tape write=&mix step=1 length=4`,`&head play=&tape at=1`],holds:ra},{sort:`wave`,is:`A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere.`,example:[`&square loop=220 0 1`],holds:(e,t)=>(ta(e,t)??0)>=20},{sort:`volume`,is:`map=amp, map=db or map=adsr (an envelope).`,example:[`&accent map=amp step=2 1 .5`],holds:e=>e.map?.kind===`amp`||e.map?.kind===`db`||e.map?.kind===`adsr`},{sort:`plain`,is:`A cell that is one number and nothing else (decision 088): named in a mix it is that number, a gain in a product, semitones in a sum.`,example:[`&vol .5`],holds:e=>zr(e)!==null},{sort:`plain`,is:`A sum of values (decision 079): in a product a level, its weighted sum held to 0…1 (decision 088).`,example:[`&a map=amp step=1 1 .2`,`&b map=amp step=2 1 0`,`&fade [&a * .7 + &b * .3]`],holds:(e,{decls:t})=>$i(e)&&Y(e.name,t)!==null},{sort:`plain`,is:`map=lin: as a number, it takes its operator's sort — a volume in a product, a pitch in a sum.`,example:[`&swell map=lin loop=.25 .2 1`],holds:e=>e.map?.kind===`lin`},{sort:`pitch`,is:`Anything else: a melody, a cell reading a table, a loop below hearing (a vibrato). In semitones.`,example:[`&vibrato loop=5 0 .1 -.1`],holds:()=>!0}];oa.map(e=>G(`sort`,e.sort,e.is,[e.example[e.example.length-1]],`mix.md`));let sa=e=>e.k===`ref`?[e.ref]:e.k===`sum`?e.items.flatMap(e=>sa(e.e)):e.k===`prod`?e.factors.flatMap(sa):[],ca=e=>sa(e).map(e=>e.name);function la(e,t){let n={decls:t,rateOf:e.rateOf};return e=>{let r=t.get(e);return!!r&&aa(r,n)}}function ua(e,t){let n={decls:t,rateOf:e.rateOf};return e=>{let r=t.get(e);return r?oa.find(e=>e.holds(r,n)).sort:`pitch`}}function da(e,t){let{error:n}=e,r={decls:t,rateOf:e.rateOf},i=ua(e,t),a=e=>{let n=e[e.length-1],i=t.get(n);if(!i)return null;if(i.braid.kind===`list`){let e=e=>e.atom.kind===`ref`&&Object.keys(t.get(e.atom.name)?.params??{}).some(e=>Re.has(e)),r=t=>t.atom.kind===`note`||t.atom.kind===`ref`&&e(t)&&(t.atom.pick||t.atom.shift||t.atom.transpose||t.atom.values),a=i.braid.tokens.flatMap(e=>l(e.atom).map(e=>({atom:e})));if(a.some(e)&&a.some(r))return`&${n} mixes voices with numbers or picks: a groove holds only voices, rests and chords of voices (&bd &hh ~ [&bd, &hh]); to play numbers through voices, read them with over= a kit`}if(i.map?.kind===`midi`)return`&${n} is a MIDI card: it sends what it names to a device, and is no sound to mix or play`;if(ea(i,r))return`&${n} is a kit, a table of voices: read a pattern through it (&drums over=&${n}) and mix that`;let a=ta(i,r);return a!==null&&a<20?`&${n} loops at ${+a.toFixed(2)} Hz, below hearing: a pitch. A voice loops at an audio rate (loop=C4) or has a sound (s=saw)`:i.step?null:`&${n} has no loop=: a voice loops at an audio rate (loop=C4) or has a sound (s=saw)`},o=/* @__PURE__ */ new WeakMap;return s=>{let c=o.get(s);if(c)return c;c=[];let l=s.gate?e=>ea(t.get(e),r)?`signal`:i(e):i,u=s.gate?t.get(s.gate)?.gate:void 0,d=e=>s.exprs.flatMap(sa).find(t=>t.name===e),f=e=>{let n=t.get(e);return!!n&&(!!n.gate||$i(n)&&Y(e,t)===null&&!aa(n,r)||Object.keys(n.params).some(e=>Re.has(e)))},p=u?(u.lines?.map(e=>e.line)??[u.notes]).map(e=>({name:e,port:u.port})):[],m=u&&[...p,...u.levels].find(e=>f(e.name));if(u&&m){let e=p.some(e=>e.name===m.name)?`the notes it plays (a melody, &tune)`:`a level (a volume: a cell with map=amp, map=db or map=lin)`;return n(`${m.port}=&${m.name}: a gate's ${m.port}= takes ${e}, and &${m.name} is a sound (${t.get(m.name)?.gate?`a gate`:$i(t.get(m.name))?`a mix`:`a voice`})`,d(m.name)?.span??t.get(s.gate).span),o.set(s,c),c}let h=e=>t.get(e)?.map?.kind===`role`,g=[...p.map(e=>e.name),...s.exprs.flatMap(ca)].find(h);if(g)return n(qi(g),d(g)?.span??t.get(s.gate??g).span),o.set(s,c),c;for(let i of s.exprs)try{let o=sa(i).filter(e=>!t.has(e.name));if(o.length){for(let t of o)e.unknownCell(t.name,t.span);continue}let s={named:[],moved:[]},u=(e,n)=>e.k===`ref`?n&&!e.ref.pick&&!e.ref.shift&&zr(t.get(e.ref.name))===0&&!t.get(e.ref.name)?.frees?.length?e.ref:null:e.k===`prod`?e.factors.map(e=>u(e,!0)).find(e=>e)??null:e.k===`sum`?e.items.map(t=>u(t.e,e.items.length===1&&n)).find(e=>e)??null:null,d=u(i,!0);d&&e.warn(`&${d.name} is the number 0: as a factor it is a gain of 0, silence (decision 088) — a note is a step of a line with a clock (&${d.name} step=4n 0)`,d.span);let f=Vr(Ur(i,t,ia(r),s),t);if(s.moved.length){for(let e of s.moved)n(`&${e.ref.name} is notes with their levels (a product with no voice): it is named whole in a mix, not picked, moved or given a level (decision 087)`,e.ref.span);continue}let p;try{p=Hi(f,l,a)}catch(e){throw e instanceof Li&&s.named.length&&!sa(f).some(e=>l(e.name)===`signal`||l(e.name)===`wave`)?new Li(`&${s.named[0]} is notes with their levels: multiply them by a voice ([&${s.named[0]} * &lead]) (decision 087)`,i.k===`ref`?i.ref.span:i.span):e}let m=p.flatMap(e=>e.pitches).find(e=>ea(t.get(e.ref.name),r)),h=p.flatMap(e=>e.pitches).find(e=>e.inSum&&Y(e.ref.name,t)!==null),g=p.flatMap(e=>e.pitches).find(e=>l(e.ref.name)!==`volume`&&!(l(e.ref.name)===`plain`&&!e.inSum)&&Lr(e.ref.name,t));m?n(`&${m.ref.name} is a kit, a table of voices: a pattern read through it is the sound — mix the pattern alone`,m.ref.span):h?n(`&${h.ref.name} is a sum of values: in a product it is a level (&theme * &${h.ref.name} * &lead), and a pitch sum adds lines, not it — add its terms there (decision 088)`,h.ref.span):g?n(`&${g.ref.name} splices a sum of values: a step that does is the sum's value while it lasts, a level (&theme * &${g.ref.name} * &lead) or a moving value (lpf=0..1000 * &${g.ref.name}), not notes (decision 097)`,g.ref.span):c.push(...p)}catch(t){if(!(t instanceof Li))throw t;ca(i).some(t=>e.broken.has(t))||n(t.message,t.span)}return o.set(s,c),c}}let fa=`card:builtin`,pa=e=>e.k===`ref`?[e.ref.name]:e.k===`sum`?e.items.flatMap(e=>pa(e.e)):e.k===`prod`?e.factors.flatMap(pa):[],ma=e=>e.kind===`ref`?[e.name]:e.kind===`mix`?e.exprs.flatMap(pa):e.kind===`seq`?e.layers.flatMap(e=>e.flatMap(e=>ma(e.atom))):[],ha=e=>e.braid.kind===`list`?e.braid.tokens.flatMap(e=>ma(e.atom)):[];function ga(e){let t=[];for(let n of[e.over,e.tonic,e.braid.kind===`scan`?e.braid.mode:null,e.swingFrom,e.base,e.env,e.pitch,e.map?.kind===`table`?e.map.table:null,e.step?.kind===`driven`?e.step.driver:e.step?.kind===`tap`?e.step.meter:null])n&&t.push(n.name);if(e.braid.kind===`scan`&&e.braid.even)for(let n of Object.values(e.braid.even))typeof n!=`number`&&t.push(n.name);for(let n of Object.values(e.paramCells??{}))t.push(...n.factors.map(e=>e.name));for(let n of Object.values(e.paramClocks??{}))n.kind===`driven`&&t.push(n.driver.name);for(let[n,r]of Object.entries(e.params))typeof r==`string`&&Ne[n]?.value===`cell`&&t.push(r);return e.gate&&t.push(e.gate.notes,...e.gate.levels.map(e=>e.name),...e.gate.receivers),t}let _a=e=>[...ha(e),...ga(e)];function va(e,t,n=/* @__PURE__ */ new Set){let{decls:r,implicit:i}=t,a={...t,builtin:null};if([...r.values()].some(e=>e.map?.kind===`sample`||e.map?.kind===`midi`))return a;let o=/* @__PURE__ */ new Set;for(let e of r.values())for(let t of _a(e))t!==e.name&&o.add(t);let s=ua(e,r),c=[...r.values()].filter(t=>!i.has(t.name)&&!n.has(t.name)&&!t.lambda&&!o.has(t.name)&&!e.broken.has(t.name)&&(s(t.name)===`signal`||s(t.name)===`wave`));if(!c.length)return a;let l=di,u=c.map(e=>({k:`ref`,ref:{name:e.name,pick:null,shift:0,span:e.span}})),d={name:fa,span:l,over:null,shift:null,off:!1,step:null,map:{kind:`sample`,span:l},stride:null,cycle:null,params:{postgain:.8},paramSpans:{},braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:u},repeat:1,subdivide:1,elongate:1,span:l}]}};return{...t,decls:new Map([...r,[fa,d]]),implicit:/* @__PURE__ */ new Set([...i,fa]),overOk:new Map([...t.overOk,[fa,!0]]),builtin:fa}}Object.fromEntries(Object.entries(W).map(([e,t])=>[e,t.help]));let ya={sine:`sine`,tri:`triangle`,triangle:`triangle`,saw:`sawtooth`,sawtooth:`sawtooth`,square:`square`,pulse:`square`,white:`white`,pink:`pink`,brown:`brown`},ba=e=>`${e}= is gone: an envelope is a cell — in the mix, &theme * &(map=adsr .01 .3 .5 .4) * &lead, or an instrument, &lead [&(map=adsr .01 .3 .5 .4) * &saw]; on the envelope, its slots by name: &(map=adsr attack=.01 decay=.3 sustain=.5 release=.4)`,xa=e=>`${e}= is gone: a pitch drop is a pitch shape, an envelope in semitones — penv=30 pdec=.04 is pitch=0..30 * &(map=adsr 0 .04 0 0)`,Sa={attack:ba(`attack`),decay:ba(`decay`),sustain:ba(`sustain`),release:ba(`release`),penv:xa(`penv`),pdec:xa(`pdec`)};function Ca(e){return(e?.units??[]).flatMap(e=>l(e.atom).flatMap(e=>e.kind===`ref`?[e.name]:[]))}function wa(e){return e.clock===e.name?1:e.rate}function Ta(e,t){let n=e.cells.get(t),r=n?.clock?e.clocks.get(n.clock):void 0;return n&&r?r.perSecond*wa(n):null}let Ea=e=>[...e.pitches.map(e=>e.ref.name),e.voice.name].filter(e=>!e.startsWith(`λ`)).join(`*`)||e.voice.name;function Da(e,t,n,r){let i=la(e,t),{error:a,warn:o,unknownCell:s}=e,c=new Map(n),l=e=>He(t.get(e)?.params??{}),u=e=>e.units.length>0&&e.units.every(e=>e.atom.kind===`ref`&&l(e.atom.name));for(let e of[...c.values()])!e.voice&&!e.root&&u(e)&&c.set(e.name,{...e,kit:!0});let d=[...c.values()].filter(e=>e.sink);for(let[e,n]of t){let t=c.get(e);t&&!t.mix&&!t.sum&&!ct(t)&&t.map?.kind!==`role`&&t.units.some(e=>e.atom.kind===`mix`)&&a(t.sink?`A sound card's channels are all mixes: [left …] [right …], or &left &right`:`A mix is one chord of sounds: &${e} [&a * &v, &b * &w]`,n.span)}let f=(e,t=[])=>{let n=c.get(e.voice.name);return!n?.mix||n.sink?[{b:e,through:t}]:t.includes(n.name)||t.length>16?(a(`&${n.name} plays itself through its mixes`,n.span),[]):n.mix.flatMap(r=>f({voice:r.voice,pitches:[...e.pitches,...r.pitches],offset:e.offset+r.offset,gain:e.gain*r.gain},[...t,n.name]))},p=/* @__PURE__ */ new Map,m=/* @__PURE__ */ new Map,h=(e,t)=>{m.has(e)||m.set(e,[]),m.get(e).push(t)},g=e=>[e.voice.name,e.offset,...e.pitches.map(e=>`${e.sign}${e.ref.name}${JSON.stringify(e.ref.pick)}${e.ref.shift}`)].join(`|`),_=e=>{let n=[...e].filter(e=>{let n=t.get(e);return!!n&&[...Object.keys(n.params),...Object.keys(n.paramCells??{}),...Object.keys(n.paramClocks??{})].some(e=>Le.has(e))});return n.length?`|through:${n.join(`,`)}`:``};for(let n of d){let o=t.get(n.name),s=n.units;s.length===0||s.length>2?a(`The sound card takes one channel (mono) or two (left, right): &${n.name} map=sample &left &right`,o.span):s.forEach((l,u)=>{let d=l.atom.kind===`mix`?r(l.atom):null,m=l.atom.kind===`ref`&&i(l.atom.name)?t.get(l.atom.name)?.braid:void 0;if(m?.kind===`list`&&m.tokens[0]?.atom.kind===`mix`){r(m.tokens[0].atom);return}let v=l.atom.kind===`ref`?c.get(l.atom.name):d?n:void 0,y=d??(l.atom.kind===`ref`&&v?.mix&&!v.sink?v.mix:null);if(!v||!y){if(l.atom.kind===`ref`&&e.broken.has(l.atom.name))return;a(l.atom.kind===`ref`&&v?.map?.kind===`role`?qi(l.atom.name):`A channel of the sound card is a mix: &mix, or [&theme * &lead] written in place`,o.span)}else for(let{b:e,through:t,top:r,index:i}of y.flatMap((e,t)=>f(e).map(n=>({...n,top:e,index:t})))){let a=g(e)+_(t),o=p.get(a),c=n.implicit?r.voice.span:v.span;o||p.set(a,o={b:e,span:c,gains:[0,0],via:/* @__PURE__ */ new Set,parts:[],through:/* @__PURE__ */ new Set});for(let e of t)o.through.add(e);h(e.voice.name,t);let l=s.length===1?[e.gain,e.gain]:u===0?[e.gain,0]:[0,e.gain];o.gains[0]+=l[0],o.gains[1]+=l[1],o.parts.push({mix:v.name,sink:n.name,gains:l,entry:{channel:u,index:i,label:Ea(r)}}),o.via.add(v.name).add(n.name)}})}let v=e=>{let n=t.get(e)?.over?.name;return n&&c.get(n)?.kit?n:null};{let e=new Set([...p.values()].flatMap(e=>e.parts.map(e=>e.mix))),n=/* @__PURE__ */ new Set;for(let r of t.values())for(let t of[`excite`,`write`]){let i=r.params[t];typeof i==`string`&&c.get(i)?.mix&&!e.has(i)&&n.add(i)}for(let e of n){let t=c.get(e);for(let{b:n,through:r}of t.mix.flatMap(e=>f(e))){if(typeof c.get(n.voice.name)?.params.play==`string`)continue;let i=`send:`+g(n)+_(r);p.has(i)||[...p.values()].some(e=>g(e.b)+_(e.through)===g(n)+_(r))||(p.set(i,{b:n,span:t.span,gains:[n.gain,n.gain],via:/* @__PURE__ */ new Set([e]),parts:[],through:new Set(r),silent:!0}),h(n.voice.name,r))}}}let y=[...c.values()].filter(e=>ct(e));for(let e of y){let n=t.get(e.name),r=e.map;n.step&&a(`A MIDI card doesn't turn: leave out ${n.step.whole?`loop`:`step`}= (&${e.name} map=midi …)`,n.step.span);let i=n.braid.kind===`list`?n.braid.tokens:[],s=e.units.findIndex(e=>e.subdivide!==1||e.elongate!==1);if(s>=0){a(`A MIDI card's entries are channels: x!n repeats one on n channels, but * and @ mean nothing here`,i[s]?.span??n.span);continue}let l=e.units.reduce((e,t)=>e+t.repeat,0);if(r.channel===null&&l>16){a(`A MIDI card has 16 channels, and &${e.name} names ${l}: ~ skips one, map=midi(10) puts them all on one`,n.span);continue}l===0&&o(`&${e.name} is a MIDI card with no channels: write what goes on each, map=midi [&theme * &reed] ~ &groove`,n.map.span);let u=0;e.units.forEach((t,o)=>{let s=i[o]?.span??n.span,l=u;if(u+=t.repeat,t.atom.kind===`rest`)return;let d;if(t.atom.kind===`mix`)d={bindings:e.chords?.[o]??[],mix:null};else if(t.atom.kind===`ref`){let e=t.atom.name,n=c.get(e);if(!n)return;let r={voice:{name:e,pick:t.atom.pick,shift:t.atom.shift,span:s},pitches:[],offset:0,gain:1};if(n.mix&&!n.sink)d={bindings:n.mix,mix:e};else if(v(e)||n.voice||n.kit)d={bindings:[r],mix:null};else{a(n.map?.kind===`role`?qi(e):ct(n)?`&${e} is a MIDI card: a card's entries are what it sends (a mix, a mix cell, a pattern read through a kit), not another card — name &${e}'s entries here`:`&${e} is a melody without a voice: a MIDI channel plays notes on a voice, [&${e} * &voice]`,s);return}}else{a(`A MIDI card's entries are channels: a mix ([&theme * &reed]), a mix cell, a pattern read through a kit, or ~ to skip one`,s);return}let{bindings:m,mix:y}=d;for(let n=0;n<t.repeat;n++){let t=r.channel??l+n+1;for(let{b:n,through:i}of m.flatMap(e=>f(e))){let a=g(n)+_(i),o=p.get(a)??[...p.values()].find(e=>g(e.b)===a);o||p.set(a,o={b:n,span:e.span,gains:[0,0],via:/* @__PURE__ */ new Set,parts:[],through:/* @__PURE__ */ new Set});for(let e of i)o.through.add(e);h(n.voice.name,i),(o.midi??=[]).push({card:e.name,mix:y,channel:t,port:r.port,gain:n.gain}),o.via.add(e.name),y&&o.via.add(y)}}})}let b=[...p.values()].map(e=>{let t=v(e.b.voice.name);return t?{...e,b:{...e.b,voice:{name:t,pick:null,shift:0,span:e.b.voice.span},pitches:[{ref:e.b.voice,sign:1},...e.b.pitches]}}:e}),x=e=>{let t=c.get(e),n=t&&typeof t.params.play==`string`?c.get(t.params.play):void 0,r=n&&typeof n.params.write==`string`?c.get(n.params.write):void 0;return!!r?.mix&&!r.sink};for(let{b:e}of b){let t=c.get(e.voice.name);!t||t.root||t.kit||x(t.name)||e.pitches.some(e=>e.ref.name===t.name)||c.set(t.name,{...t,voice:!0})}for(let[e,n]of t){let r=c.get(e);if(!r)continue;if(r.map?.kind===`table`&&!t.has(r.map.table)&&s(r.map.table,n.map.span),n.base&&!t.has(n.base.name)&&s(n.base.name,n.base.span),n.style)for(let e of Oa(n.style))t.has(e.name)||s(e.name,e.span);if(n.about){r.note||a(`about= belongs on a note: a cell with a label= and nothing else`,n.about[0].span);for(let e of n.about)t.has(e.name)||s(e.name,e.span)}if(!r.voice)continue;let i=n.params.s;i!==void 0&&!(String(i)in ya)&&a(`Unknown sound '${i}' (${Object.keys(ya).join(`, `)})`,n.paramSpans.s??n.span),i!==void 0&&n.braid.kind!==`blank`&&o(`s=${i} plays a built-in waveform; the braid is ignored`,n.paramSpans.s);let l=Object.keys(n.params).find(e=>Re.has(e)),u=i===void 0&&l?Ca(r).find(t=>t!==e&&(c.get(t)?.voice||c.get(t)?.kit)):void 0;u&&o(`&${e}'s braid names &${u}, a voice: a voice's braid is its waveform, and a voice is none, so &${u} isn't heard. To play it through &${e}'s ${l}=, write the mix: &${e} … [&${u}]`,n.span);for(let[e,t]of Object.entries(n.params))Ne[e]?.value===`number`&&typeof t!=`number`&&a(`${e}= takes a number`,n.paramSpans[e]);let d=Object.keys(n.params).find(e=>Re.has(e)),f=d?` (${d}= makes &${e} a voice; a meter takes none)`:``;n.step?.kind===`driven`||n.step?.kind===`tap`?a(`A voice moves at a rate — its pitch, like loop=C4${f}`,n.step.span):n.step&&!n.step.whole&&a(`A voice's pitch is loop= (one turn of its braid per cycle): loop=C4${f}`,n.step.span)}return{cells:c,sinks:d,cards:y,bindings:b,soundHead:x,playings:m}}function Oa(e){let t=e=>e.kind===`cell`?[e.ref]:e.terms.map(e=>e.ref);return[...e.set?e.set.flatMap(e=>t(e.point)):t(e.from),...e.to?t(e.to):[],...e.curve?[e.curve]:[]]}var ka=class extends Error{};function Aa(e){let{braid:t,params:n}=e,{pulse:r}=n,i=t.kind===`scan`?cn(t.steps):t.kind===`list`&&t.perBeat!==void 0?on(t.tokens.map(e=>e.atom.kind===`note`?e.atom.value:0),t.signature):null,a=t.kind===`scan`&&typeof r==`string`?Vt(r):null,o=i&&a?Ht(i,a):i,s=o&&e.legato?{...o,legato:e.legato.flatMap(e=>Vt(e.level)===null?[]:[{...e,whole:Vt(e.level)}])}:o;if(!s||typeof n.swing!=`number`)return s;let c=(e.swing??[{level:qt(s)??``,share:n.swing}]).flatMap(e=>{let t=Vt(e.level);return t===null?[]:[{level:e.level,whole:t,share:e.share}]});return e.swingMoves&&c.length?{...s,swing:c}:Gt(s,c)}function ja(e,t,n){let r=Aa(e),i=e.bend,a=e.paramSpans.bend??e.span;if(!r)return t(`bend= is on a meter: &${e.name} is none`,a),{};let o=Vt(i.level),s=r.levels.length,c=o===null?NaN:s*o*r.unit/r.pulses;if(!(c>=1)||!Number.isInteger(c)||s%c!==0)return t(`bend=${i.level}: the bar of &${e.name} has no whole number of ${i.level} nodes to bend`,a),{};let l=n(i.table.name),u=l?.braid.kind===`list`?l.braid.tokens.flatMap(e=>e.atom.kind===`note`?Array.from({length:Math.max(1,e.repeat)},()=>e.atom.value):[NaN]):[];if(!u.length||u.some(e=>!(e>0)))return t(`bend=${i.level}:&${i.table.name}: a table of lengths, each above 0`,a),{};let d=s/c,f=(e,t)=>t?f(t,e%t):e,p=u.length/f(d,u.length),{positions:m,lap:h}=Wt(u,c,d,p,i.depth??1),g=i.depthMoves;return{bend:{positions:m,lap:h,bars:p,tableCell:i.table.name,...g?{depth:{range:g.range,factors:g.factors.map(e=>e.name),table:u,per:c,nodes:d}}:{}}}}let Ma=e=>e?Bt(e)*e.pulses/Ut(e):1;function Na(e,t,n){if(Y(e.name,t)!==null)return[];let r=e.braid.kind===`list`?e.braid.tokens.flatMap(e=>e.atom.kind===`mix`?e.atom.exprs:[]):[],i=[],a=(e,r)=>{if(e.k===`ref`){let a=e.ref.name;if(!t.has(a)||Y(a,t)!==null)return;(r||zr(t.get(a))!==null||n(a))&&i.push(a)}else if(e.k===`sum`)for(let t of e.items)a(t.e,r);else if(e.k===`prod`)for(let t of e.factors)a(t,r)},o=n(e.name);for(let e of r)a(e,o);return i}function Pa(e,{decls:t,implicit:n,implicitRoot:r,overOk:i,stacks:a},o,s){let c=la(e,t),{rateOf:d,error:f,warn:p,broken:m,unknownCell:h}=e,g=/* @__PURE__ */ new Map,_=e=>hi(t,e),v=e=>gi(t,e),y=[],b=/* @__PURE__ */ new Set,x=(e,i)=>{let S=g.get(e);if(S)return S;if(b.has(e)){for(let e of y)b.add(e),m.add(e);throw new ka}let C=t.get(e),w=a.has(e)?null:Y(e,t);if(y.length>=256){b.size||f(`&${y[0]} splices cells into each other more than 256 deep (&${y[0]} → &${y[1]} → … → &${e}): write a long chain as one braid`,i);for(let t of[...y,e])b.add(t),m.add(t);throw new ka}if(y.includes(e))throw f(`Circular reference: ${[...y.slice(y.indexOf(e)),e].map(e=>`&`+e).join(` → `)}`,i),new ka;y.push(e);let T=v(C),E=/* @__PURE__ */ new Map,O=[],k=C.braid.kind===`list`?C.braid.tokens:[],A=(e,n,r)=>{let i=e.name;if(!t.has(i)){if(m.has(i))for(let e of y)m.add(e);throw h(i,n),new ka}let a=x(i,n),o=ht(a,e.pick);if(o===null)throw f(gt(i,e.pick,a.units.length),n),new ka;return E.set(i,(E.get(i)??0)+r),o};T.forEach((e,t)=>{let n=1,r=k[t]?.span??C.span;e.atom.kind===`ref`&&(n=A(e.atom,r,e.repeat*e.subdivide));let i=/* @__PURE__ */ new Map;for(let t of u(e.atom))t.atom.kind===`ref`&&i.set(t.atom,A(t.atom,t.span??r,t.repeat*t.subdivide));e.atom.kind===`seq`&&(n=D(e.atom,e=>i.get(e)||1)),O.push(n*e.elongate*e.repeat)});let j=O.reduce((e,t)=>e+t,0);y.pop();let M=pi(C),N=C.braid,P={name:e,span:C.span,root:M===null,implicit:e===`fifths12TET`&&r||n.has(e),over:M===null?null:C.over?.name??null,overShift:C.over?.shift??0,context:M??e,cycle:M===null?mi(C):_(e),wrap:C.cycle??null,lambda:C.lambda??null,frees:C.frees??[],show:C.show??null,...C.paramSpans?.show?{showSpan:C.paramSpans.show}:{},laps:C.laps??null,loops:!!C.step?.whole,chance:C.chance??.5,seed:C.seed??0,seeded:C.seed!==null&&C.seed!==void 0,size:C.size??1,tags:(C.tags??``).split(`,`).map(e=>e.trim()).filter(Boolean),about:(C.about??[]).map(e=>e.name),...C.base?{base:{name:C.base.name,...C.base.transpose?{transpose:C.base.transpose}:{},...C.base.degree?{degree:C.base.degree}:{}}}:{},beat:Ma(Aa(C)),meter:Aa(C),...C.swingMoves?{swingMoves:{level:C.swingMoves.level,range:C.swingMoves.range,factors:C.swingMoves.factors.map(e=>e.name)}}:{},label:C.label??null,note:L(C),env:C.env?.name??null,pitch:C.pitch?.name??null,braid:M===null?`blank`:N.kind,units:T,scan:N.kind===`scan`?{lap:Cn(N.steps).lap,steps:N.steps}:null,...C.bend?ja(C,p,e=>t.get(e)):{},...C.readsSlot?{readsSlot:C.readsSlot}:{},...C.swingFrom?{swingFrom:C.swingFrom.name}:{},...(()=>{let e=[.../* @__PURE__ */ new Set([...C.valueReads??[],...Na(C,t,c)])];return e.length?{valueReads:e}:{}})(),...C.style?{styleReads:[...new Set(Oa(C.style).map(e=>e.name))]}:{},shift:C.shift??0,...C.tonic?{tonic:C.tonic.name}:{},...N.kind===`scan`&&N.phaseCell&&C.over?{phase:{cell:N.phaseCell.name,k:N.phaseCell.k,n:N.phaseCell.n,key:C.over.name}}:{},off:C.off,oneshot:!!C.oneshot,...C.drumNote===void 0?{}:{drumNote:C.drumNote},glide:typeof C.params.glide==`number`&&C.params.glide>0?C.params.glide:0,children:E,steps:j,unitSteps:O,hasValues:T.some(e=>l(e.atom).some(e=>e.kind===`note`||e.kind===`chord`)),step:C.step?.kind===`driven`?{driver:C.step.driver.name,cycle:C.step.cycle,whole:C.step.whole,chain:C.step.chain}:null,paramClocks:Object.fromEntries(Object.entries(C.paramClocks??{}).flatMap(([e,t])=>t.kind===`driven`?[[e,{driver:t.driver.name,cycle:t.cycle,whole:t.whole,chain:t.chain}]]:[])),map:C.map?C.map.kind===`table`?{kind:`table`,table:C.map.table.name}:C.map.kind===`edo`?{kind:`edo`,period:C.map.period}:C.map.kind===`ratios`?{kind:`ratios`,ratios:C.braid.kind===`list`?C.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[]}:C.map.kind===`midi`?{kind:`midi`,channel:C.map.channel,port:C.map.port}:{kind:C.map.kind}:null,mix:a.has(e)||c(e)?[]:w?null:T.length>0&&T.every(e=>e.atom.kind===`mix`)&&(T.length===1||C.map?.kind===`sample`)&&C.map?.kind!==`midi`?T.flatMap(e=>e.atom.kind===`mix`?o(e.atom):[]):null,...w?{sum:w}:{},sink:C.map?.kind===`sample`,sort:s(e),...C.fill?{fill:C.fill}:{},...C.text===void 0?{}:{text:C.text},...C.map?.kind===`midi`?{chords:T.map(e=>e.atom.kind===`mix`?o(e.atom):null)}:{},clock:null,rate:0,stride:C.stride??1,params:C.params,paramCells:Object.fromEntries(Object.entries(C.paramCells??{}).map(([e,t])=>[e,{range:t.range,factors:t.factors.map(e=>e.name),...t.to===void 0?{}:{to:t.to}}])),voice:Object.keys(C.params).some(e=>Re.has(e)),freq:C.step?.kind===`rate`||C.step?.kind===`env`?C.step.whole?d(C.step)??261.63:(d(C.step)??261.63)/Math.max(1,j):261.63,kit:!1,...C.gate?{gate:C.gate}:{}};return g.set(e,P),P};for(let[e,n]of t)if(i.get(e))try{x(e,n.span)}catch(e){if(!(e instanceof ka))throw e;y.length=0}for(let[e,n]of t){let t=g.get(e);if(!t||t.root)continue;let r=t.over??`fifths12TET`;!g.get(r)?.root&&n.braid.kind===`list`&&n.braid.tokens.some(e=>e.atom.kind===`note`&&!Number.isInteger(e.atom.value))&&p(`&${r} is a table, so decimal indexes are rounded down`,n.span)}return g}let Fa=(e,t,n)=>`${e}:${t.written}${n>1?`:${n}`:``}`;function Ia(e,t){let n=e.perSecond/Bt(e.meter),r=(t.scan?t.perSecond:t.perSecond/Math.max(1e-12,t.beat))/n;if(!(r>0)||!Number.isFinite(r))return null;let[i,a,o,s]=[0,1,1,0],c=r;for(let e=0;e<40;e++){let e=Math.floor(c);if([i,a,o,s]=[o,s,e*o+i,e*s+a],s>1e5)return null;if(Math.abs(o/s-r)<=1e-9*r||c-e<1e-12)break;c=1/(c-e)}return Math.abs(o/s-r)>1e-9*r?null:`pulse${o===1?``:`*${o}`}${s===1?``:`/${s}`}`}function La(e,t,n,r){let i=r*e/Math.max(1,t),a=i*t,o=e=>Math.abs(e-Math.round(e))<1e-9&&Math.round(e)>0,s=e=>o(e)&&Number.isInteger(Math.log2(Math.round(e)))&&Math.round(e)<=64;if(o(1/a))return Math.round(1/a)===1?`1m`:`1m/${Math.round(1/a)}`;if(o(a)){if(s(i*n)&&Math.round(i*n)>1)return`${Math.round(i*n)}n`;if(s(2*i*n/3))return`${Math.round(2*i*n/3)}t`}return`pulse${Ra(i)}`}function Ra(e){if(Math.abs(e-1)<1e-9)return``;let t=Ba(e);return t?t[1]===1?`*${t[0]}`:t[0]===1?`/${t[1]}`:`*${t[0]}/${t[1]}`:`*${+e.toFixed(6)}`}let za=e=>e.map(e=>`${e.op===`×`?`*`:`/`}${e.n}`).join(``);function Ba(e){for(let t=1;t<=64;t++){let n=Math.round(e*t);if(n>0&&Math.abs(n/t-e)<1e-9)return[n,t]}return null}function Va(e,t,n){let{rateOf:r,error:i,warn:a,unknownCell:o,broken:s}=e,c=new Map(n),l=/* @__PURE__ */ new Map,u=e=>{let n=e.step;if(n?.kind!==`driven`||n.whole||n.cycle||!c.get(e.name)?.meter)return null;let i=t.get(n.driver.name),a=c.get(n.driver.name);if(i?.step?.kind!==`rate`||i.step.whole||i.braid.kind!==`blank`||!a||a.voice||a.kit||a.meter)return null;let o=r(i.step);return o===null?null:o*n.ratio};for(let[e,n]of t){let t=c.get(e);if(!t||t.voice||t.kit)continue;let o=u(n);if(o===null&&n.step?.kind!==`rate`&&n.step?.kind!==`env`)continue;let s=o??r(n.step);if(s===null||!n.step)continue;n.params.pulse!==void 0&&(n.braid.kind!==`scan`||typeof n.params.pulse!=`string`||Vt(n.params.pulse)===null)&&a(`pulse= says the note value of a scan's entries (pulse=16n: sixteenths, its bpm counting quarters); ${n.braid.kind===`scan`?`${n.params.pulse} is not one (16n, 8t, 4n.)`:`on &${e}, not a scan, it does nothing`}`,n.paramSpans?.pulse??n.span);let d=o===null&&n.step.whole,f=(d?s*Math.max(1,t.steps):s)*(d?1:t.beat),p=n.paramSpans?.swing??n.span,m,h=null,g=e=>String(e).replace(/^0\./,`.`);if(typeof n.params.swing==`number`&&t.meter){let r=t.meter;if(!n.swing){let e=qt(r),t=e===null?null:Vt(e);t!==null&&Jt(r,t)===null?i(`swing=${g(n.params.swing)} on a meter needs the level it leans: swing=${e}:${g(n.params.swing)}`,p):a(`swing=${g(n.params.swing)} leans the meter cell's own steps, and they are its beats, which swing never moves: name the level it leans, swing=8n:${g(n.params.swing)}`,p)}for(let t of(n.swing??[]).filter(e=>e.share!==.5)){let n=Vt(t.level),i=n===null?`${t.level} is not a note value (8n, 16n, 8t)`:Jt(r,n);i&&a(`swing=${t.level}:${g(t.share)} leans nothing on &${e}: ${i}`,p)}h=an(r)}else typeof n.params.swing==`number`&&n.swing?a(`swing=${n.swing.map(e=>`${e.level}:${g(e.share)}`).join(`,`)} leans levels of a meter, and &${e} is not one: write swing=${g(n.params.swing)} (pairs of its steps)`,p):typeof n.params.swing==`number`&&n.params.swing!==.5&&(m=n.params.swing);l.set(e,{cell:e,perSecond:f,positional:vt(t),...m===void 0?{}:{swing:m},...h?{swung:h}:{}})}let d=new Set([...t.values()].flatMap(e=>[...e.step?.kind===`driven`?[e.step.driver.name]:e.step?.kind===`tap`&&e.step.meter?[e.step.meter.name]:[],...Object.values(e.paramClocks??{}).flatMap(e=>e.kind===`tap`&&e.meter?[e.meter.name]:[])])),f=/* @__PURE__ */ new Map,p=[],m=[...t.values()].filter(e=>l.has(e.name)&&c.get(e.name)?.meter),h=m.filter(e=>!e.step?.whole);for(let e of h.slice(1)){let[t,n]=[c.get(h[0].name),c.get(e.name)],r=Ia({meter:t.meter,perSecond:l.get(t.name).perSecond},{beat:n.beat,scan:!!n.scan,perSecond:l.get(e.name).perSecond});i(`&${e.name} is a second meter with a tempo of its own, and a piece has one (&${t.name}): a second meter is derived from it${r?`, step=${r}`:` by a tap (step=beat/2, step=pulse*5/4)`} — read as any meter is, and it follows &${t.name}'s tempo (decision 095)`,e.step?.span??e.span)}let g=(h.length?h:m).map(e=>e.name),_=/* @__PURE__ */ new Map,v=()=>g[0]??null,y=(e,n,r)=>{let a=e.meter?.name??v();if(!e.meter&&g.length>1&&!h.length)return i(`${n} names no meter, and the piece has ${g.length} with a tempo of their own (${g.map(e=>`&`+e).join(`, `)}): name the one it taps, ${n.slice(0,n.indexOf(`=`)+1)}&${g[0]}:${n.slice(n.indexOf(`=`)+1)} (decision 091)`,e.span),r(),null;if(!a)return i(`${n} taps the piece's main meter, and it has none: write one (&bar meter("4/4") step=100bpm)`,e.span),r(),null;if(!t.has(a))return o(a,e.meter.span),r(),null;if(p.includes(a))return i(`step= loops back: ${[...p.slice(p.indexOf(a)),a].map(e=>`&`+e).join(` → `)}`,e.span),null;let s=x(a);return!c.get(a)?.meter||!s||s.clock!==a?(i(`${n}: &${a} is not a meter that keeps time — a tap reads a meter(…) or scan(…) with a tempo (&${a} meter("4/4") step=100bpm)`,e.meter?.span??e.span),r(),null):a},b=(e,n)=>{let r=`step=${n.meter?`&${n.meter.name}:`:``}${n.tap.written}`,i=y(n,r,()=>s.add(e));if(!i)return null;let a=c.get(i).meter;_.set(e,i);let o=Math.max(1,Math.round(t.get(e)?.cycle??1)),u=a.swing&&Number.isInteger(n.ratio)&&n.ratio>1?n.ratio:1,f=Fa(i,n.tap,o)+(u>1?`*${u}`:``);if(!l.has(f)){let e=Bt(a),t=ln(a,n.tap,o),r=a.pulses*o,s=t.flatMap((e,n)=>Array.from({length:u},()=>((t[n+1]??r)-e)/u)),d=t.flatMap((e,n)=>Array.from({length:u},(i,a)=>e+a*((t[n+1]??r)-e)/u)),p=d.map((t,n)=>Qt(a,t,s[n])*e),m=d.map(t=>t*e),h=a.levels.length*o;l.set(f,{cell:i,perSecond:l.get(i).perSecond*p.length/h,positional:!1,tap:{meter:i,positions:p,lap:h,...c.get(i).swingMoves?{written:m,grids:s}:m.some((e,t)=>Math.abs(e-p[t])>1e-12)?{written:m}:{}}})}let p=n.ratio/u,m=c.get(e);return(m?.scan||m?.bend)&&d.has(e)?(l.set(e,{cell:e,perSecond:l.get(f).perSecond*p,positional:!0}),{clock:e,rate:1}):m?.meter&&!m.scan&&!m.bend&&d.has(e)?(l.set(e,{cell:e,perSecond:l.get(f).perSecond*p*m.beat,positional:vt(m)}),{clock:e,rate:1}):m&&typeof t.get(e)?.params.belt==`number`?(l.set(e,{cell:e,perSecond:l.get(f).perSecond*p,positional:!1,belt:{driver:f,rate:p}}),{clock:e,rate:1}):{clock:f,rate:p}},x=e=>{if(f.has(e))return f.get(e);if(l.has(e))return f.set(e,{clock:e,rate:1}),f.get(e);let n=t.get(e)?.step;if(n?.kind===`tap`&&!c.get(e)?.voice){p.push(e);let t=b(e,n);return p.pop(),f.set(e,t),t}if(!n||n.kind!==`driven`||c.get(e)?.voice)return f.set(e,null),null;let r=n.driver.name,s=n.whole?`loop=`:`step=`,u=null;if(!t.has(r))o(r,n.driver.span);else if(p.includes(r)||r===e)i(`${s} loops back: ${[...p.slice(p.indexOf(r)),e,r].map(e=>`&`+e).join(` → `)}`,n.span);else if(c.get(r)?.voice)i(`&${r} is a voice: it moves at audio rate`,n.driver.span);else{p.push(e);let o=x(r);p.pop();let f=c.get(r)?.steps??0,m=c.get(e)?.steps??0;if(o&&!n.whole&&!n.cycle&&c.get(r)?.meter&&l.has(r)){let e=c.get(r).meter,a=La(e.levels.length,e.pulses,t.get(r)?.step?.kind===`rate`?e.unit:0,n.ratio);i(`step=&${r}${za(n.chain)}: a line taps a meter by pulse, beat or a note value, never its cell's own steps (step=${v()===r?``:`&${r}:`}${a})`,n.span)}if(!o)a(`&${r} never moves, so &${e} stands still — give &${r} a rate (step=84bpm) or ${s}&cell`,n.driver.span);else if(n.cycle&&f===0)i(`&${r} has no cycle to count`,n.driver.span);else if(n.whole&&m===0)i(`&${e} has no steps to loop`,n.span);else{u={clock:o.clock,rate:o.rate*n.ratio*(n.whole?m:1)/(n.cycle?f:1)};let r=c.get(e);r&&(r.scan||r.bend)&&d.has(e)&&!n.whole?(l.set(e,{cell:e,perSecond:l.get(o.clock).perSecond*u.rate,positional:!0}),u={clock:e,rate:1}):r&&typeof t.get(e)?.params.belt==`number`&&!n.whole&&(l.set(e,{cell:e,perSecond:l.get(o.clock).perSecond*u.rate,positional:!1,belt:{driver:o.clock,rate:u.rate}}),u={clock:e,rate:1})}}return f.set(e,u),u};for(let e of[...c.values()]){let n=x(e.name),r=t.get(e.name)?.step,i=_.get(e.name),a=r?.kind===`tap`?n&&i?{driver:i,cycle:!1,whole:!1,chain:r.chain,tap:r.tap.written}:null:e.step;n?c.set(e.name,{...e,clock:n.clock,rate:n.rate,step:a}):a!==e.step&&c.set(e.name,{...e,step:a})}for(let e of t.values())for(let[t,n]of Object.entries(e.paramClocks??{})){if(n.kind===`tap`){let r=c.get(e.name),i=y(n,`${t}=${n.meter?`&${n.meter.name}:`:``}${n.tap.written}`,()=>{});if(!i||!r)continue;let a=c.get(i).meter,o=a.levels.length/l.get(i).perSecond,s=n.tap.kind===`note`?n.tap.whole*a.unit*o/a.pulses:o/ln(a,n.tap,1).length,u=n.ratio/s;c.set(e.name,{...r,params:{...r.params,[t]:+(1/u).toFixed(6)},paramClocks:{...r.paramClocks,[t]:{driver:i,cycle:!1,whole:!1,chain:n.chain,tap:n.tap.written}}});continue}if(n.kind!==`driven`)continue;let r=x(n.driver.name),a=c.get(e.name);if(!r||!a){i(`${t}=&${n.driver.name}: that cell keeps no time`,n.span);continue}let o=l.get(r.clock).perSecond*r.rate*n.ratio;c.set(e.name,{...a,params:{...a.params,[t]:+(1/o).toFixed(6)}})}return{cells:c,clocks:l,mainMeter:v(),meters:g}}function Ha(e,n,i,a=/* @__PURE__ */ new Map,o=/* @__PURE__ */ new Map){let{error:s,warn:c,unknownCell:u}=e;for(let e of n.values()){let t=e.tonic?i.get(e.tonic.name):void 0;t?.meter&&c(`&${t.name} is a meter: a key's tonic is a note (&tonic D); a meter's first level is read as its pitch class`,e.tonic.span)}for(let e of i.values()){let t=t=>n.get(e.name)?.paramSpans?.[t]??n.get(e.name).span;if(typeof e.params.body==`string`&&!(e.params.body in ot)&&s(`body=${e.params.body}: one of ${Object.keys(ot).join(`, `)}`,t(`body`)),typeof e.params.board==`string`&&e.params.board!==`none`&&!(e.params.board in ot)&&s(`board=${e.params.board}: none, or one of ${Object.keys(ot).join(`, `)}`,t(`board`)),e.params.ftype!==void 0&&qe(e.params.ftype)===null&&s(`ftype=${e.params.ftype}: its filters' model is one of ${Ke.join(`, `)} (or superdough's 0, 1, 2)`,t(`ftype`)),typeof e.params.couple==`string`){let n=i.get(e.params.couple);n?typeof n.params.body!=`string`&&s(`couple=&${n.name}: it couples to another resonator (a cell with body=)`,t(`couple`)):u(e.params.couple,t(`couple`))}typeof e.params.excite==`string`&&!i.get(e.params.excite)?.mix&&s(`excite=&${e.params.excite}: a resonator is driven by sound — a mix`,t(`excite`))}for(let e of i.values()){let t=e.show?.startsWith(`mix:&`)?e.show.slice(5):null;if(t===null)continue;let r=n.get(e.name)?.paramSpans?.show??n.get(e.name).span,a=i.get(t);e.mix?a?a.root||c(`show=mix:&${t}: a mix's colours follow a grid (a cell with map=edo), not &${t}`,r):u(t,r):c(`show=mix:&${t} does nothing on &${e.name}: it names the grid a mix's colours follow, and &${e.name} isn't a mix`,r)}for(let e of i.values()){let t=t=>n.get(e.name)?.paramSpans?.[t]??n.get(e.name).span;if(typeof e.params.write==`string`){let n=i.get(e.params.write);n?n.voice&&s(`write=&${n.name}: a tape records what plays — a melody, not a voice`,t(`write`)):u(e.params.write,t(`write`))}if(typeof e.params.play==`string`){let n=i.get(e.params.play);n?typeof n.params.write!=`string`&&s(`play=&${n.name}: a read head plays a tape — a cell with write= (what it records)`,t(`play`)):u(e.params.play,t(`play`))}}for(let e of i.values()){let t=e.params.fm;if(typeof t!=`string`)continue;let r=n.get(e.name)?.paramSpans?.fm??n.get(e.name).span,a=i.get(t);if(!a)u(t,r);else if(!a.voice)s(`fm=&${t}: a modulator is a voice (s=sine ratio=…)`,r);else{let n=/* @__PURE__ */ new Set([e.name]);for(let e=t;e;e=typeof i.get(e)?.params.fm==`string`?i.get(e).params.fm:void 0){if(n.has(e)){s(`fm=&${t}: the modulators come back round to &${e} — FM chains can't loop`,r);break}n.add(e)}}}let d=ua(e,n),f=la(e,n);for(let e of n.values())for(let[t,n]of Object.entries(e.paramCells??{})){let a=e.map?.kind===`adsr`&&r.adsr.includes(t)||e.map?.kind===`style`&&r.style.includes(t);t===`s`&&n.to!==void 0?[e.params.s,n.to].map(e=>typeof e==`string`?ya[e]:void 0).some(e=>e===void 0||e===`white`||e===`pink`||e===`brown`)&&s(`s=${e.params.s}..${n.to}: a blend is of two of the waves, sine tri saw square (or their other names)`,n.span):!Ie.has(t)&&!a&&s(`${t}= can't move: it takes a number (these can: ${[...Ie].join(` `)}; on a map=adsr cell, its slots; on a map=style cell, its axes; s= as a blend of two waves, s=tri..square * &x)`,n.span),n.range&&!(n.range[0]>=0&&n.range[1]>=0)&&s(`${t}=: a range of positive values, low..high`,n.span);let o=0;for(let e of n.factors){let n=i.get(e.name);n?n.map?.kind===`adsr`?o++:f(e.name)?s(`${t}= * &${e.name}: &${e.name} is notes with their levels (a product with no voice), what a voice plays, not a value that moves: multiply it by a voice in a mix`,e.span):d(e.name)===`signal`?c(`${t}= * &${e.name}: &${e.name} is a sound, not a value that moves, and moves nothing here. A CV is a braid: &${e.name} loop=.5 sin(12)`,e.span):d(e.name)===`wave`&&c(`${t}= * &${e.name}: &${e.name} turns at an audio rate, and ${t}= follows a cell turning at most 20 times a second: it is read turning at that. A sound moved at an audio rate is FM's: fm= a voice`,e.span):u(e.name,e.span)}o>1&&s(`${t}=: one envelope (map=adsr) at most — the other factors scale it`,n.span),o&&!n.range&&s(`${t}=&env: an envelope runs 0 to 1 — give it a range: ${t}=200..3000 * &env`,n.span)}for(let e of n.values()){let t=e.params.legato,r=e.paramSpans.legato??e.span,a=e.frees?.find(e=>e.key===`param`&&e.param===`legato`),o=e=>s(`legato=${e}: a share of each note's held length is above 0 (.5 staccato, 1 as written, 1.5 into the next)`,r);typeof t==`string`?s(`legato=${t}: a share (.5), free(.5, .25..2.5) or a cell of shares (&artic)`,r):typeof t==`number`&&!(t>0)?o(String(t)):a&&!(a.lo>0)&&o(`free(${a.value}, ${a.lo}..${a.hi})`);let u=e.legato?.find(e=>!(e.share>0));u&&o(`${u.level}:${u.share}`),e.legato&&!i.get(e.name)?.meter&&c(`legato=${e.legato.map(e=>`${e.level}:${e.share}`).join(`,`)} gives the lines tapping a meter their share: &${e.name} is not a meter, so it does nothing`,r);let d=e.paramCells?.legato;d?.range&&!(d.range[0]>0)&&o(`${d.range[0]}..${d.range[1]}`);for(let e of d&&!d.range?d.factors:[]){let t=n.get(e.name),r=(t?.braid.kind===`list`?t.braid.tokens.flatMap(e=>l(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[]).find(e=>!(e>0));r!==void 0&&o(`&${e.name}: its ${r}`)}}for(let e of n.values())if(e.map?.kind===`adsr`){for(let[t,i]of Object.entries(e.paramCells??{}))if(!i.range&&r.adsr.includes(t))for(let e of i.factors){let r=n.get(e.name),a=(r&&r.map?.kind!==`adsr`&&r.braid.kind===`list`?r.braid.tokens.flatMap(e=>l(e.atom)).flatMap(e=>e.kind===`note`?[e.value+e.alter]:e.kind===`chord`?e.notes:[]):[]).find(e=>t===`sustain`?!(e>=0&&e<=1):!(e>=0));a!==void 0&&s(t===`sustain`?`sustain=&${e.name}: a sustain is a level, 0 to 1, and &${e.name} holds ${a}`:`${t}=&${e.name}: ${t===`attack`?`an`:`a`} ${t} is seconds, 0 or more, and &${e.name} holds ${a}`,i.span)}}for(let e of n.values())e.stride!==null&&e.step?.kind!==`driven`&&e.step?.kind!==`tap`&&c(`stride= only matters with step=&cell or a tap (step=1m)`,e.paramSpans?.stride??e.span);for(let e of n.values())e.oneshot&&i.get(e.name)&&!i.get(e.name).voice&&c(`oneshot=1 is a voice's: &${e.name} is no voice, so it does nothing (put it on the voice that plays its notes)`,e.span);for(let e of n.values())for(let[t,n]of[[`env`,e.env],[`pitch`,e.pitch]]){if(!n)continue;let e=i.get(n.name);e?t===`env`&&e.map?.kind!==`adsr`&&e.map?.kind!==`amp`&&e.map?.kind!==`lin`&&e.map?.kind!==`db`?s(`env= takes a volume: a cell with map=adsr (an envelope), map=amp, map=db or map=lin`,n.span):t===`pitch`&&(e.map?.kind===`adsr`||e.map?.kind===`amp`||e.map?.kind===`db`)&&s(`pitch= takes a pitch (a vibrato, map=lin to glide), not a volume`,n.span):u(n.name,n.span)}for(let e of n.values()){if(e.map?.kind!==`adsr`)continue;let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];(t.length!==4||t.some(e=>!(e>=0))||t[2]>1)&&s(`map=adsr takes four numbers: attack decay sustain release — seconds, and sustain a level 0…1 (map=adsr .01 .3 .5 .4)`,e.map.span)}for(let e of n.values()){if(e.map?.kind!==`style`)continue;let n=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];(n.length!==t.length||n.some((e,n)=>!(e>=t[n].range[0]&&e<=t[n].range[1])))&&s(`map=style takes a value for each axis, in order: ${t.map(e=>`${e.name} (${e.range[0]} to ${e.range[1]})`).join(`, `)} (map=style .3 .45 .55 .5, or sync=.3 harm=.45 bite=.55 mood=.5)`,e.map.span)}for(let e of n.values()){if(e.map?.kind!==`ratios`)continue;let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];e.over===null?(t.length<2||t.some((e,n)=>!(e>0)||n>0&&!(e>t[n-1])))&&s(`map=ratios lists one period's tones as rising ratios, the last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`,e.map.span):s(`A grid (map=ratios) reads nothing: its braid is its tones`,e.map.span)}for(let e of n.values())if(e.map?.kind===`edo`){if(e.over!==null||e.braid.kind!==`blank`)s(`A grid (map=edo, map=ed(r)) reads nothing and has no braid: &${e.name} map=edo(19)`,e.map.span);else if(e.cycle!==null&&e.name!==`fifths12TET`){let t=e.map.period===2?`edo(${e.cycle})`:`ed(${e.cycle}, ${Ga(e.map.period)})`,n=e.paramSpans.cycle??e.span;e.cycle===0?s(`A grid has at least one step: its size is its map's, map=edo(19)`,n):e.map.steps===null?s(`a grid's size is its map's, map=${t}: cycle= does not say it`,n):c(`cycle=${e.cycle} does nothing on a grid whose map says its size (map=${e.map.period===2?`edo`:`ed`}(${e.map.steps}…)): leave it out`,n)}}for(let t of n.values()){let n=t.over?i.get(t.over.name):void 0;if(!n||n.kit||o.has(n.name))continue;let r=Ca(n);if(!r.length||r.every(e=>a.get(e)===n.name)||e.broken.has(t.name))continue;let s=[...new Set(r)].map(e=>`&`+e).join(` `);c(`&${n.name} is read as a table, but its cells (${s}) aren't entries: a table is its numbers. To play cells one after another, splice them into a braid (&${t.name} ${s}); choosing a melody per step isn't built yet (#29)`,t.over.span)}for(let[e,t]of a)[...i.values()].some(t=>t.step?.driver===e||Object.values(t.paramClocks).some(t=>t.driver===e))||c(`&${e} is a section of &${t}, but nothing is stepped by it: step=&${e} on what it should play (or a name mistyped)`,n.get(e).span);for(let e of n.values()){let t=e.map?.kind===`table`?i.get(e.map.table.name):void 0;t&&(t.mix||t.sink||ct(t))&&c(`map=&${t.name}: a map reads a table's numbers, and &${t.name} is ${ct(t)?`a MIDI card`:t.sink?`the sound card`:`a mix`}, which has none: nothing is mapped`,e.map.span)}for(let e of i.values()){let t=e.map?.kind===`midi`?e.map.channel:null;if(t===null)continue;let r=n.get(e.name);(r?.braid.kind===`list`?r.braid.tokens:[]).forEach(e=>{e.repeat>1&&e.atom.kind!==`rest`&&c(`!${e.repeat} on a card with one channel (map=midi(${t})): each note goes out ${e.repeat.toLocaleString(`en`)} times on it, at once — leave out the !${e.repeat}`,e.span)})}for(let e of new Set(a.values()))if(![...n.values()].some(t=>t.over?.name===e)){let t=[...a].filter(([,t])=>t===e).map(([e])=>e),r=n.get(t[0])?.step,i=r?.kind===`driven`?r.driver.name:`bar`;c(`&${e} declares sections (${t.map(e=>`&`+e).join(` `)}), and nothing selects them: every part plays all the time. A selector reads the table and switches them, a step of the form at a time: &song over=&${e} step=&${i}/16 0 [0,1]`,n.get(e).span)}let p=Math.max(12,...[...i.values()].filter(e=>e.root).map(e=>e.cycle))*Ua;for(let e of i.values()){let t=n.get(e.name);if(!t||e.implicit)continue;let r=t.braid.kind===`list`?t.braid.tokens:[];e.units.forEach((t,n)=>{let a=t.atom;if(a.kind!==`ref`||!a.values||Math.abs(a.values.add)<=p)return;let o=i.get(a.name);c(`degree(${o?.lambda?`&( … )`:`&`+a.name}, ${a.values.add}) moves it ${Math.abs(a.values.add).toLocaleString(`en`)} steps, over a hundred octaves: ${a.values.add>0?`its notes land above 20 kHz and are dropped`:`its notes fall below hearing`}, nothing plays`,r[n]?.span??e.span)});let a=Math.abs(e.shift)/Math.max(1,e.units.length);a>Wa&&c(`shift=${e.shift} turns ${e.lambda?`an unnamed cell &( … )`:`&`+e.name} about ${Math.round(a).toLocaleString(`en`)} laps, and every lap climbs a lap of the grid: its notes leave hearing`,t.paramSpans?.shift??t.span)}}let Ua=100,Wa=20;function Ga(e){if(Number.isInteger(e))return String(e);for(let t=2;t<=1e3;t++){let n=Math.round(e*t);if(Math.abs(n/t-e)<1e-6)return`${n}/${t}`}return String(e)}function Ka(e,t,n,r,{sinks:i,cards:a,bindings:o,soundHead:s}){let{parsed:c,error:l,warn:u,unknownCell:d}=e,f=new Set([...t.values()].flatMap(e=>e.gate?[e.gate.notes,e.gate.plays,...(e.gate.lines??[]).flatMap(e=>[e.line,e.plays])]:[])),p=[],m=[],h=[],g=e=>!!e.clock&&t.get(e.name)?.step?.whole===!1,_=e=>(r.get(e.clock)?.perSecond??0)*e.rate,v=e=>{let t=[...e].sort((e,t)=>_(t.c)-_(e.c)),[n,r]=[_(t[0].c),_(t[1].c)];return n-r>1e-9*Math.max(n,r)?t[0]:null};for(let{b:r,span:i,gains:a,via:c,parts:_,through:y,silent:b,midi:x}of o){let o=e=>t.has(e.name)?!0:(d(e.name,e.span),!1);if(![r.voice,...r.pitches.map(e=>e.ref)].every(o)||[r.voice,...r.pitches.map(e=>e.ref)].some(t=>e.broken.has(t.name)))continue;let S=e=>{n.get(e)?.paramCells.pan&&u(`&${e}'s pan= moves, but it is read at each note's start, and &${e} rings without notes here: it sits in the centre (write a number)`,t.get(e)?.paramSpans.pan??r.voice.span)};if(s(r.voice.name)&&r.pitches.length===0){S(r.voice.name),m.push({head:r.voice.name,tape:n.get(r.voice.name).params.play,gains:[a[0],a[1]],parts:_,through:[...y]});continue}let C=n.get(r.voice.name);if(!C)continue;if(typeof C.params.body==`string`&&r.pitches.length===0){S(C.name);let[e,t]=st(C.params.pan);h.push({cell:C.name,gains:[a[0]*e,a[1]*t],parts:_.map(n=>({...n,gains:[n.gains[0]*e,n.gains[1]*t]})),through:[...y]});continue}let w=[...c,...y].flatMap(e=>{let t=n.get(e)?.gate;return t?t.lines?.map(e=>e.plays)??[t.plays]:[]}).find(e=>r.pitches.some(t=>t.ref.name===e)),T=C.kit?r.pitches.find(e=>t.get(e.ref.name)?.over?.name===C.name||e.ref.name===w):void 0;if(C.kit&&!T){l(`A kit is a table of voices: read the pattern through it, &drums over=&${C.name}, and mix &drums`,r.voice.span);continue}if(C.root){l(`&${C.name} is a grid, not a voice`,r.voice.span);continue}if(r.voice.pick||r.voice.shift){l(`Pick or shift the melody, not the voice: &theme[0] * &${C.name}`,r.voice.span);continue}if(t.get(C.name)?.step?.kind===`driven`||t.get(C.name)?.step?.kind===`tap`){l(`&${C.name} moves with step=&…, so it can't be a voice: a voice moves at a rate, its pitch (loop=C4)`,r.voice.span);continue}!C.params.s&&C.freq<20&&u(`&${C.name} loops at ${+C.freq.toFixed(2)} Hz, below hearing — is it a pitch? Then leave out its sound parameters: (&theme + &${C.name}) * &lead`,r.voice.span);let E=[...C.env?[{ref:t.get(C.name).env,sign:1,inSum:!1}]:[],...C.pitch?[{ref:t.get(C.name).pitch,sign:1,inSum:!0}]:[]],D=r.pitches.find(e=>e.ref.transpose||e.ref.degree);D?.ref.transpose?l(`&${D.ref.name}^$${D.ref.transpose}: transposing (^$) is for braids — in a mix, add pitch: &${D.ref.name} + ${D.ref.transpose}`,D.ref.span):D&&l(`&${D.ref.name}^${D.ref.degree}: moving by degrees (^) is for braids — in a mix, write a cell that plays it: &u step=&bar &${D.ref.name}^${D.ref.degree}`,D.ref.span);let O=/* @__PURE__ */ new Map,k=[...r.pitches,...E].map(e=>{let t=n.get(e.ref.name),r=t&&typeof t.params.play==`string`?n.get(t.params.play):void 0,i=r&&typeof r.params.write==`string`?n.get(r.params.write):void 0;return t&&r&&i&&(O.set(e,{head:t.name,tape:r.name,at:typeof t.params.at==`number`?t.params.at:0,length:typeof r.params.length==`number`?r.params.length:0,erase:typeof r.params.erase==`number`?Math.min(1,Math.max(0,r.params.erase)):1}),t=i),{t:e,c:t}}).filter(e=>e.c),A=k.filter(e=>e.c.voice);if(A.length){l(`Two sounds can't multiply (&${A[0].c.name} * &${C.name}): &${A[0].c.name} plays as a voice — mix them with + or ,`,A[0].t.ref.span);continue}let j=e=>e.c.map?.kind===`adsr`,M=e=>e.c.map?.kind===`amp`||e.c.map?.kind===`db`||(e.c.map?.kind===`lin`||!!e.c.sum)&&!e.t.inSum,N=k.filter(j),P=k.filter(e=>!M(e)&&!j(e)),F=k.filter(e=>M(e));if(N.length>1){l(`One envelope per note: &${N[0].c.name} and &${N[1].c.name} both shape &${C.name}`,N[1].t.ref.span);continue}let I=N.find(e=>e.t.inSum||e.t.sign<0);if(I){l(`&${I.c.name} is an envelope (map=adsr): a volume, it multiplies — keep it out of pitch sums`,I.t.ref.span);continue}let te=N[0]?_t(N[0].c):null,ne=F.find(e=>e.t.sign<0);if(ne){l(`&${ne.c.name} is a volume (map=amp): it multiplies, it can't be subtracted`,ne.t.ref.span);continue}let L=P.filter(e=>g(e.c)),re=L.length===0;re&&(L=F.filter(e=>g(e.c)));let[ie,R]=C.kit?[1,1]:st(C.params.pan),[z,ae]=[...y].reduce(([e,t],r)=>{let[i,a]=st(n.get(r)?.params.pan);return[e*i,t*a]},[ie,R]),oe=e=>({cell:e.c.name,pick:e.t.ref.pick,shift:e.t.ref.shift,sign:e.t.sign,...e.t===T?{picks:!0}:{}}),se={voice:C.name,kit:C.kit,offset:r.offset,gains:[a[0]*z,a[1]*ae],parts:_.map(e=>({...e,gains:[e.gains[0]*z,e.gains[1]*ae]})),select:[],...b?{silent:!0}:{},...x?.length?{midi:x}:{},through:[...y],envelope:te,envelopeCell:N[0]?.c.name??null,via:[...c],span:i},ce=new Set(E);if(L.length===0&&!C.kit&&P.every(e=>ce.has(e.t))){p.push({id:`${C.name}:${C.name}:${r.voice.span.line}:${r.voice.span.col}`,...se,cell:C.name,pick:null,shift:0,sign:1,gate:!1,drone:!0,mods:P.map(oe),levels:F.map(oe)});continue}if(L.length===0){l(k.length?`Nothing starts notes on &${C.name}: give a pitch or a volume (map=amp) step= timing (step=4n); loop= terms only bend`:`&${C.name} has nothing to play: a melody goes before it, like &melody * &${C.name}`,i);continue}if(L.length>1){let e=v(L);if(!e){l(`Both &${L[0].c.name} and &${L[1].c.name} would start notes on &${C.name}, at the same rate — make one coarser (it then holds under the other) or loop= (it then bends or shapes them)`,L[1].t.ref.span);continue}L=[e]}let{t:B,c:le}=L[0],ue=k.find(e=>ht(e.c,e.t.ref.pick)===null);ue?l(gt(ue.c.name,ue.t.ref.pick,ue.c.units.length),ue.t.ref.span):ht(le,B.ref.pick)===0?l(`&${le.name} has no steps to play`,B.ref.span):(!O.has(B)&&!f.has(le.name)&&qa(n,le,B.ref.pick)&&u(`&${le.name}${B.ref.pick?ee(B.ref.pick):``} plays only rests (~): nothing sounds on &${C.name}`,B.ref.span),p.push({id:`${C.name}:${le.name}:${B.ref.span.line}:${B.ref.span.col}`,...se,cell:le.name,pick:B.ref.pick,shift:B.ref.shift,sign:B.sign,gate:re,mods:P.filter(e=>e!==L[0]).map(oe),levels:F.filter(e=>e!==L[0]).map(oe),...O.has(B)?{tape:O.get(B)}:{}}))}let y=e=>p.some(t=>t.voice===e&&(t.parts.length||t.silent)),b=p.find(e=>e.midi&&!e.parts.length&&!e.silent&&!e.kit&&!y(e.voice)&&Object.keys(t.get(e.voice)?.params??{}).some(e=>Le.has(e)));if(b){let e=t.get(b.voice),n=Object.keys(e.params).filter(e=>Le.has(e));u(`&${b.voice} is only on a MIDI card: its sound (${n.map(e=>`${e}=`).join(` `)}) is heard here but isn't sent — MIDI carries its notes, velocity and bends; the device makes its own`,e.paramSpans[n[0]]??e.span)}return i.length===0&&a.length===0&&c.cells.length>0&&!c.broken?.length&&u(`Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])`,di),{outputs:p,returns:m,resonances:h}}function qa(e,t,n,r=[]){if(r.includes(t.name)||t.frees.some(e=>e.key===`braid`))return!1;let i=mt(t.units.length,n,t.shift);if(!i?.length)return!1;let a=n=>{if(n.kind===`rest`)return!0;if(n.kind===`seq`)return l(n).every(a);let i=n.kind===`ref`?e.get(n.name):void 0;return!!i&&n.kind===`ref`&&qa(e,i,n.pick,[...r,t.name])};return i.every(e=>a(t.units[e].atom))}function Ja(e){let t=new Map(e),n=/* @__PURE__ */ new Map;for(let e of t.values())(e.root||e.over)&&n.set(e.name,e.root?e.name:e.over);for(let e=!0,r=0;e&&r<64;r++){e=!1;for(let r of t.values()){let t=n.get(r.name);if(t)for(let i of r.children.keys())n.has(i)||(n.set(i,t),e=!0)}}for(let e of t.values())t.set(e.name,{...e,context:n.get(e.name)??`fifths12TET`});for(let e of t.values()){if(typeof e.params.body!=`string`)continue;let n=[];for(let r of e.units.flatMap(e=>l(e.atom)))if(r.kind===`note`)n.push({shift:r.value+r.alter,params:{}});else if(r.kind===`ref`){let e=t.get(r.name);if(e)for(let t of e.units)t.atom.kind===`note`&&n.push({shift:t.atom.value+t.atom.alter,params:e.params})}else if(r.kind===`chord`)for(let[e,t]of r.notes.entries())n.push({shift:t+r.alters[e],params:{}});t.set(e.name,{...e,exciters:n.length?n:Array.from({length:12},(e,t)=>({shift:t,params:{}}))})}return t}let Ya=(e,t)=>e.params[t]!==void 0,Xa=e=>{let t=e.units.map(e=>e.atom.kind===`ref`?e.atom.name:null);return t.length&&t.every(e=>e!==null)?t:null},Za=(e,t)=>{let n=Xa(e);return!n||e.step||e.gate||e.map||t.clocks.has(e.name)?!1:n.every(e=>{let n=t.cells.get(e);return!!n&&(!!n.gate||n.map?.kind===`role`)})},Qa=e=>e.units.length===1&&e.units[0].atom.kind===`mix`,$a=[{kind:`note`,is:`A label= and nothing that plays: an explanation in the graph.`,example:[`&why label="The bass walks down a fifth each bar."`],holds:e=>e.note},{kind:`card`,is:`map=sample: the sound card, its entries its channels.`,example:[`&a loop=A4`,`&out map=sample [&a]`],holds:e=>e.sink},{kind:`midi card`,is:`map=midi: a MIDI card, its entries MIDI channels.`,example:[`&a loop=A4`,`&t step=2 0 2`,`&synth map=midi [&t * &a]`],holds:e=>e.map?.kind===`midi`},{kind:`gate`,is:`play= with a braid of voices: a product with a name, where notes become sound.`,example:[`&a loop=A4`,`&t step=2 0 2`,`&leadOut play=&t &a`],holds:e=>!!e.gate},{kind:`role`,is:`map=role: its name is the role, its entries the gates that play it.`,example:[`&a loop=A4`,`&t step=2 0 2`,`&violin play=&t &a`,`&lead map=role &violin`],holds:e=>e.map?.kind===`role`},{kind:`style`,is:`map=style: a point in style space; it doesn’t sound.`,example:[`&funk map=style .3 .45 .55 .5`],holds:e=>e.map?.kind===`style`},{kind:`scope`,is:`scope=: a picture of the cells its braid lists.`,example:[`&a loop=A4`,`&screen scope=stack &a`],holds:e=>Ya(e,`scope`)},{kind:`fill`,is:`fill(…): a plugin-fragment’s code writes its braid (decision 085).`,example:[`&day scan(1!24) loop=1d`,`&cycle_mode fill(five_to_twelve, mode, &day) ionian`],holds:e=>e.fill!==void 0},{kind:`tape`,is:`write=: it records what its write head names.`,example:[`&t step=2 0 2`,`&tape write=&t step=1 length=4`],holds:e=>Ya(e,`write`)},{kind:`head`,is:`play= with no braid: a read head of a tape.`,example:[`&t step=2 0 2`,`&tape write=&t step=1 length=4`,`&echo play=&tape at=1`],holds:e=>Ya(e,`play`)},{kind:`sum`,is:`A mix of cells with no voice: the sum of their values (decision 079).`,example:[`&a step=1 1 .2`,`&b step=2 1 0`,`&drift [&a * .7 + &b * .3]`],holds:e=>!!e.sum},{kind:`phrase`,is:`A product with no voice and a pitch, named: notes with their levels (decision 087).`,example:[`&t step=2 0 2`,`&accent map=amp step=2 1 .5`,`&phrase [&t * &accent]`],holds:e=>Qa(e)&&e.sort===`pitch`},{kind:`mix`,is:`A mix of sounds with a name: played as one voice, an instrument.`,example:[`&a s=saw loop=C4`,`&b s=sine loop=C3`,`&organ [&a, &b]`],holds:e=>!!e.mix},{kind:`resonator`,is:`body=: a struck or driven body, its braid its exciters.`,example:[`&fork body=fork loop=A4 ring=3`],holds:e=>Ya(e,`body`)},{kind:`wave`,is:`A braid turning at an audio rate with no sound parameter: alone in a product the sound, beside one a pitch (FM).`,example:[`&square loop=220 0 1`],holds:e=>e.sort===`wave`},{kind:`voice`,is:`A sound parameter (s=, lpf= …): it sounds.`,example:[`&lead s=saw loop=C4`],holds:e=>e.voice},{kind:`kit`,is:`An unstepped braid of voices: a table of them, a number picking one.`,example:[`&bd s=sine loop=A1`,`&hh s=white`,`&kit &bd &hh`],holds:e=>e.kit},{kind:`band`,is:`An unstepped braid of gates and roles: a table of performers (decision 061).`,example:[`&a loop=A4`,`&t step=2 0 2`,`&violin play=&t &a`,`&viola play=&t &a`,`&band &violin &viola`],holds:(e,{bands:t})=>t.has(e.name)},{kind:`meter`,is:`A meter(…) or a scan(…) with a rate: it keeps time, and lines tap it.`,example:[`&bar meter("4/4") step=84bpm`],holds:(e,{result:t})=>!!e.meter&&t.clocks.has(e.name)},{kind:`tempo`,is:`A rate alone, no braid: a tempo a meter reads (step=&tempo), or a clock.`,example:[`&tempo step=84bpm`],holds:(e,{result:t})=>t.clocks.has(e.name)&&e.braid===`blank`},{kind:`groove`,is:`A line of hits: a pattern read through a kit, or a stepped braid of voices.`,example:[`&bd s=sine loop=A1`,`&hh s=white`,`&kit &bd &hh`,`&drums over=&kit step=4 0 1 0 1`],holds:e=>e.sort===`signal`},{kind:`grid`,is:`map=edo, ed(r) or ratios: how positions become frequencies.`,example:[`&edo19 map=edo(19)`],holds:e=>e.map?.kind===`edo`||e.map?.kind===`ratios`},{kind:`envelope`,is:`map=adsr: a level over each note.`,example:[`&pluck map=adsr .01 .3 .5 .4`],holds:e=>e.map?.kind===`adsr`},{kind:`ramp`,is:`map=lin: values that ramp to the next, a level in a product and a pitch in a sum.`,example:[`&swell map=lin loop=.25 .2 1`],holds:e=>e.map?.kind===`lin`},{kind:`volume`,is:`map=amp, db or a table: values read as a level.`,example:[`&accent map=amp step=2 1 .5`],holds:e=>e.map?.kind===`amp`||e.map?.kind===`db`||e.map?.kind===`table`},{kind:`sections`,is:`A stepped table of names: it declares the sections of an arrangement (decision 016).`,example:[`&bar meter("4/4") step=84bpm`,`&tune step=&tuneBar 0 2 4 5`,`&song over=&sections step=1m 0`,`&sections step=4n &tuneBar`],holds:(e,{sectionTables:t})=>t.has(e.name)},{kind:`selector`,is:`over= a table of sections or a band: it switches them.`,example:[`&bar meter("4/4") step=84bpm`,`&tune step=&tuneBar 0 2 4 5`,`&sections step=4n &tuneBar`,`&song over=&sections step=1m 0`],holds:(e,{sectionTables:t,bands:n})=>!!e.over&&(t.has(e.over)||n.has(e.over))},{kind:`number`,is:`One number and nothing else: named in a mix it is that number (decision 088).`,example:[`&vol .5`],holds:e=>e.sort===`plain`&&!e.map},{kind:`line`,is:`A braid with a clock (step=, loop= below hearing): it plays its steps in time.`,example:[`&tune step=2 0 2 4`],holds:(e,{result:t})=>!!e.step||t.clocks.has(e.name)},{kind:`table`,is:`A generator with no clock (scan, scale, even, fifths, a wave): a table to read through.`,example:[`&major scan(2 2 1 2 2 2 1)`],holds:e=>e.braid!==`list`&&e.braid!==`blank`},{kind:`text`,is:`One text in quotes: a generator’s argument reads it as the piece is built, meter(&meter) (decision 101); it plays nothing.`,example:[`&meter "3/4"`],holds:e=>e.text!==void 0},{kind:`blank`,is:`No braid and no clock: the table below it as it is, turned or set by its attributes (a key, a swing).`,example:[`&key shift=2`],holds:e=>e.braid===`blank`},{kind:`steps`,is:`Anything else: a list of steps with no clock of its own, a phrase to splice or a table to read through.`,example:[`&motif 0 2 4`],holds:()=>!0}];function eo(e){let t={result:e,sectionTables:new Set(e.sections?.values()??[]),bands:new Set([...e.cells.values()].filter(t=>Za(t,e)).map(e=>e.name))},n=/* @__PURE__ */ new Map;return r=>{if(!n.has(r)){let i=e.cells.get(r);n.set(r,i?$a.find(e=>e.holds(i,t)).kind:null)}return n.get(r)}}let to=[`restart`,`resume`,`free`],no={tape:`tape`,head:`head`,resonator:`resonator`,scope:`scope`,gate:`gate`,card:`card`,note:`note`};function ro({cells:e,clocks:t,sections:n,bands:r=/* @__PURE__ */ new Map}){let i=new Set([...e.values()].flatMap(e=>typeof e.params.fm==`string`?[e.params.fm]:[])),a=eo({cells:e,clocks:t,sections:n});return o=>{let s=/* @__PURE__ */ new Set,c=no[a(o.name)??`steps`];return c&&s.add(c),o.voice&&s.add(`voice`),t.get(o.name)&&!t.get(o.name).belt&&s.add(`clock`),o.step&&s.add(`driven`),typeof o.params.motor==`number`&&s.add(`motor`),(typeof o.params.law==`string`||kr(e,o)!==void 0)&&s.add(`law`),typeof o.params.fm==`string`&&s.add(`carrier`),i.has(o.name)&&s.add(`modulator`),n.has(o.name)&&s.add(`section`),o.over&&([...n.values()].includes(o.over)||r.has(o.over))&&s.add(`selector`),[...r.values()].some(e=>e.includes(o.name))&&s.add(`performer`),s}}function io(e,{decls:t,implicit:n,sections:r},i,a,o,s=/* @__PURE__ */ new Map,c=/* @__PURE__ */ new Set){let{warn:l}=e,u=ro({cells:i,clocks:a,sections:r,bands:s}),d=new Set([...t.values()].flatMap(e=>e.swingFrom?[e.swingFrom.name]:[]));for(let e of t.values()){let t=i.get(e.name);if(!t||n.has(e.name))continue;let r=u(t),a=[...Object.keys(e.params).map(t=>[t,e.paramSpans[t]??e.span]),...Object.entries(e.paramCells??{}).map(([e,t])=>[e,t.span]),...Object.entries(e.paramClocks??{}).map(([e,t])=>[e,t.span]),...[`env`,`pitch`].filter(t=>e[t]).map(t=>[t,e[t].span])];for(let[n,o]of a){let a=Ne[n];c.has(e.name)&&Le.has(n)||(n===`anchor`&&r.has(`law`)?l(`anchor= sets the clock a law reads, not the law: write it on ${t.over?`&${t.over}`:kr(i,t)?`&${kr(i,t)}`:`its day (over=&day, a clock loop=1d)`} — the law on &${e.name} doesn't read it`,o):n===`pan`&&(t.mix||t.sink||ct(t))?l(`pan= places a voice: on ${t.sink?`the sound card`:ct(t)?`a MIDI card`:`the mix &${e.name}`} it does nothing — put it on the voice (&voice pan=${e.params.pan})`,o):n===`pan`&&typeof e.params.pan==`number`&&(e.params.pan<0||e.params.pan>1)?l(`pan=${e.params.pan}: pan runs from 0 (left) to 1 (right); ${e.params.pan<0?`this plays hard left`:`this plays hard right`}`,o):a?.on&&!a.on.some(e=>r.has(e))&&!(n===`swing`&&d.has(e.name))?l(`${n}= acts on ${Ue(a.on)}: on &${e.name} it does nothing`,o):n===`restart`&&!to.includes(e.params.restart)?l(`restart=${e.params.restart}: what switching a part on does to its time is restart, resume or free — this plays as restart`,o):a?.value===`number`&&!t.voice&&typeof e.params[n]==`string`&&l(`${n}= takes a number: '${e.params[n]}' does nothing`,o))}if(e.gate){let t=e.step?e.step.whole?`loop`:`step`:null;for(let[n,r]of[[`over`,e.over?.span],[t,e.step?.span],[`shift`,e.shift===null?void 0:e.paramSpans.shift],[`stride`,e.stride===null?void 0:e.paramSpans.stride],[`map`,e.map?.span],[`cycle`,e.cycle===null?void 0:e.span]])n&&r&&l(`${n}= on a gate does nothing: a gate plays with each note of play=&${e.gate.notes}, so it times and reads nothing itself — put it on &${e.gate.notes}`,r);e.gate.gain<0&&l(`${e.gate.port===`trigger`?`gain`:`level`}=${e.gate.gain}: a level is 0 or more, and a negative one doesn't play softer — write ${-e.gate.gain}`,e.paramSpans[e.gate.port===`trigger`?`gain`:`level`]??e.span)}}let f=new Set([...t.values()].flatMap(e=>e.show?[e.show.split(`:`)[0]]:[]));for(let e of o.values())f.has(e.name)||l(`the piece carries the plugin "${e.name}", but no cell says show=${e.name}`,{line:e.line,col:1,len:`=== plugin ${e.name} ===`.length})}let ao=e=>Number.isFinite(e)?Math.round(e).toLocaleString(`en`):`unboundedly many`,oo=e=>e.lambda?`An unnamed cell &( … )`:`&${e.name}`;function so(e,t,n,r,i){let{error:a,warn:o}=e,s=/* @__PURE__ */ new Map,c=/* @__PURE__ */ new Set,l=e=>{let t=s.get(e);if(t)return t;if(c.has(e))return[];c.add(e);let r=(n.get(e)?.units??[]).map(e=>f(e,e=>e.kind===`note`||e.kind===`choice`?1:e.kind===`chord`?e.notes.length:e.kind===`ref`?u(e.name,e.pick):0));return c.delete(e),s.set(e,r),r},u=(e,t=null)=>{let n=l(e);return(pt(n.length,t)??[]).reduce((e,t)=>e+n[t],0)},d=/* @__PURE__ */ new Set;for(let e of n.values()){if(e.implicit)continue;let n=l(e.name),r=n.reduce((e,t)=>e+t,0);if(r<=5e4||(d.add(e.name),e.units.some(e=>e.atom.kind===`ref`&&u(e.atom.name,e.atom.pick)>5e4)))continue;let i=t.get(e.name),o=i?.braid.kind===`list`?i.braid.tokens:[],s=0,c=o[n.findIndex(e=>(s+=e)>5e4)]?.span??e.span;a(`${oo(e)} expands to ${ao(r)} notes: more than ${ao(rt)}, the most a cell can hold — repeat less (!n), or let a clock repeat it`,c)}let p=/* @__PURE__ */ new Set,m=/* @__PURE__ */ new Map;for(let e of i){let i=n.get(e.cell);if(!i?.clock||d.has(i.name)||p.has(i.name)||i.params.law!==void 0||i.fill?.fragment)continue;let o=r.get(i.clock);if(!o)continue;let s=Math.max(1,i.steps),c=o.perSecond*i.rate*u(i.name)/s,l=o.tap?.meter??i.clock;if(c>(m.get(l)??0)&&m.set(l,c),!(c>2e3))continue;p.add(i.name);let f=t.get(i.name)?.step?.span??t.get(i.clock)?.step?.span??i.span;a(`${oo(i)} would start ${ao(c)} notes a second: more than ${ao(it)}, the most a cell can play — slow its step= or loop=`,f)}let h=/* @__PURE__ */ new Set;for(let e of n.values()){let t=r.get(e.name);t&&!m.has(e.name)&&e.frees.some(e=>e.key===`step`||e.key===`loop`)&&(m.set(e.name,t.perSecond*u(e.name)/Math.max(1,e.steps)),h.add(e.name))}for(let[e,t]of m){let r=n.get(e);if(!r||!(t>0)||!Number.isFinite(t))continue;let i=e=>Math.floor(e.value*it/t),a=r.frees.filter(e=>(e.key===`step`||e.key===`loop`)&&e.value>0&&e.hi>i(e)&&i(e)>=e.value);if(a.length){r.frees=r.frees.map(e=>a.includes(e)?{...e,hi:i(e)}:e);for(let t of a)o(h.has(e)?`${t.key}=free(…): moved up to ${ao(t.hi)}, &${e} would move what it moves more than ${ao(it)} times a second, the most a cell can play: the slider stops at ${ao(i(t))}`:`${t.key}=free(…): moved up to ${ao(t.hi)}, a cell &${e} clocks would start more than ${ao(it)} notes a second, the most a cell can play: the slider stops at ${ao(i(t))}`,t.span)}}}function co(e,t,n){if(!n.size)return[...e];let r=e=>[...t.values()].filter(t=>t.over===e&&t.clock);return e.map(e=>{let i=t.get(e.cell);for(let a=0;i?.step&&a<32;a++){let a=i.step.driver,o=n.get(a);if(o){let n=t.get(o).units.findIndex(e=>e.atom.kind===`ref`&&e.atom.name===a),i=r(o).map(e=>({cell:e.name,entry:n,part:a})),s=[.../* @__PURE__ */ new Set([...e.via,...i.map(e=>e.cell),o,a])];return i.length?{...e,via:s,select:[...e.select,...i]}:e}i=t.get(a)}return e})}function lo(e){let t=new Map(e.cells.map(e=>[e.name,e.map?.kind??(e.style?`style`:null)]));t.has(`style`)||t.set(i,`style`);let n=[],a=(e,i)=>{let{slot:a,...o}=e,s=o.name,c=o.span??i.span;if(!t.has(s))return{...o,pick:null};let l=t.get(s),u=l?r[l]:void 0,d=u?.indexOf(a)??-1;return d>=0?{...o,slot:a,pick:{kind:`at`,i:d,abs:!0}}:(n.push({severity:`error`,message:u?`&${s}[${a}]: &${s} (map=${l}) has no slot ${a}; its slots are ${u.join(`, `)}`:`&${s}[${a}]: &${s}'s map names no slots (${l?`map=${l}`:`it has no map=`}); pick by position (&${s}[$0]), name the slots with map=${Object.keys(r).join(` or map=`)}, or give it a style= (its axes)`,span:c}),{...o,pick:null})},o=(e,t)=>{if(Array.isArray(e)){let n=!1,r=e.map(e=>{let r=o(e,t);return r!==e&&(n=!0),r});return n?r:e}if(typeof e!=`object`||!e)return e;let n=e,r=null;for(let[e,i]of Object.entries(n)){let a=o(i,t);a!==i&&((r??={...n})[e]=a)}let i=r??n;return typeof i.slot==`string`&&typeof i.name==`string`?a(i,t):i},s=!1,c=e.cells.map(e=>{let t=o(e,e);return t!==e&&(s=!0),t});return s?{...e,cells:c,diagnostics:[...e.diagnostics,...n]}:e}function uo(e){let t=new Set(e.cells.map(e=>e.name)),n=/* @__PURE__ */ new Map,r=[];for(let i of e.cells){let e=i.params.play??i.params.trigger;if(typeof e!=`string`||i.braid.kind===`blank`||t.has(e)||n.has(e))continue;let a=ld(`&${e} step=1m ~`).cells[0];if(!a)continue;let o=i.paramSpans.play??i.paramSpans.trigger??i.span;n.set(e,{...a,span:o}),r.push({severity:`info`,message:`&${i.name} plays &${e}, which no line writes: it rests`,span:o})}return n.size?{parsed:{...e,cells:[...e.cells,...n.values()],diagnostics:[...e.diagnostics,...r]},rested:new Map([...n].map(([e,t])=>[e,t.span]))}:{parsed:e,rested:/* @__PURE__ */ new Map}}function fo(e,t,n,r,i,a=/* @__PURE__ */ new Set){if(![...t.values()].some(e=>e.gate))return;let o=/* @__PURE__ */ new Set,s=(e,t)=>{if(typeof e==`string`)o.add(e);else if(e&&typeof e==`object`&&!t.has(e)){if(t.add(e),e instanceof Map)for(let[n,r]of e)s(n,t),s(r,t);else if(e instanceof Set)for(let n of e)s(n,t);else for(let n of Object.values(e))s(n,t)}};for(let e of n.values()){let{name:t,...n}=e;s(n,/* @__PURE__ */ new Set)}s(r,/* @__PURE__ */ new Set);for(let e of t.values())e.gate&&s(e.gate,/* @__PURE__ */ new Set);for(let t of n.values())t.clock&&t.units.length&&!o.has(t.name)&&!i.has(t.name)&&!e.broken.has(t.name)&&!a.has(t.name)&&e.info(`&${t.name} is written and nothing plays or reads it: it is silent (a part no performer plays)`,t.span)}let po=[`lpf`,`lpq`,`hpf`,`hpq`,`bpf`,`bpq`,`ftype`,`room`,`delay`,`delaytime`,`delayfeedback`],mo=[...po,`pan`,`distort`,`crush`,`drive`],ho=(e,t)=>new Set(e.flatMap(e=>e.through).filter(e=>!!t.get(e)?.mix));function go(e){let t=/* @__PURE__ */ new Map;for(let n of Object.keys(e.params))Le.has(n)&&t.set(n,e.paramSpans[n]??e.span);for(let[n,r]of Object.entries(e.paramCells??{}))Le.has(n)&&t.set(n,r.span);for(let[n,r]of Object.entries(e.paramClocks??{}))Le.has(n)&&t.set(n,r.span);return t}let _o=(e,t)=>t in e.params||t in e.paramCells||t in e.paramClocks;function vo(e,t,n,r,i){let{error:a}=e,o=ho(r,n),s=/* @__PURE__ */ new Map;for(let e of o){let n=t.get(e);if(!n)continue;let r=go(n);for(let[t,n]of r)mo.includes(t)||a(`${t}= is a voice's: an instrument (&${e}) processes what its voices play, with ${po.slice(0,4).map(e=>`${e}=`).join(` `)} …; put ${t}= on a voice`,n);let i=[...r.keys()].filter(e=>po.includes(e));i.length&&s.set(e,i)}if(!s.size)return n;let c=e=>{let r=n.get(e),i=t.get(e)?.over?.name,a=r?.kit?r:i&&n.get(i)?.kit?n.get(i):null;return a?Ca(a):[e]},l=/* @__PURE__ */ new Map;for(let[e,t]of i)for(let r of t)for(let t of c(e)){let e=n.get(t);if(!e)continue;let i=/* @__PURE__ */ new Map;for(let t of[...r].reverse())for(let n of s.get(t)??[])!_o(e,n)&&!i.has(n)&&i.set(n,t);l.has(t)||l.set(t,[]),l.get(t).push(i)}let u=(e,t)=>e.size===t.size&&[...e].every(([e,n])=>t.get(e)===n),d=new Map(n);for(let[e,t]of l){let r=t[0];if(!r.size||!t.every(e=>u(e,r)))continue;let i=n.get(e),a={...i.params},o={...i.paramCells},s={...i.paramClocks};for(let[e,t]of r){let r=n.get(t);e in r.params&&(a[e]=r.params[e]),e in r.paramCells&&(o[e]=r.paramCells[e]),e in r.paramClocks&&(s[e]=r.paramClocks[e])}d.set(e,{...i,params:a,paramCells:o,paramClocks:s,voice:!0,inherited:Object.fromEntries(r)})}return d}let yo=e=>new Map((e.plugins??[]).map(e=>[e.name,e]));function bo(e,t,n=/* @__PURE__ */ new Set){let{parsed:r,rested:i}=uo(lo(e)),a=Ar(r,t);for(let[e,t]of i)a.unknown.set(e,[t]);let o=va(a,_i(a),n),{decls:s,builtin:c}=o,l=da(a,s),u=ua(a,s),d=Xi(a,s),f=Da(a,s,Pa(a,o,l,u),l),p=Va(a,s,f.cells),{clocks:m}=p;Ha(a,s,p.cells,o.sections,d),Qi(a,s,p.cells,d);let h=Ka(a,s,p.cells,m,f),{returns:g,resonances:_}=h,v=Zi(co(h.outputs,p.cells,o.sections),p.cells,d);so(a,s,p.cells,m,v),fo(a,s,p.cells,v,m,new Set(r.offers??[]));let y=Ja(vo(a,s,p.cells,v,f.playings));io(a,o,y,m,yo(r),d,ho(v,y));let b=Ji(a,s,o.implicit),{diagnostics:x}=a,S=!x.some(e=>e.severity===`error`);x.sort((e,t)=>e.span.line-t.span.line||e.span.col-t.span.col);let C=(e,t)=>e.line-t.line||e.col-t.col,w=[...a.unknown].map(([e,t])=>({name:e,at:[...t].sort(C)})).sort((e,t)=>C(e.at[0],t.at[0])),T=new Set([...y.values()].filter(e=>e.off).map(e=>`cell:${e.name}`)),E=(e,t,n)=>typeof e.params[t]==`number`?e.params[t]:n;return{ok:S,cells:y,clocks:m,outputs:v,off:T,diagnostics:x,unknown:w,tapes:[...y.values()].filter(e=>typeof e.params.write==`string`&&!!y.get(e.params.write)?.mix).map(e=>({name:e.name,source:e.params.write,length:E(e,`length`,0),erase:Math.min(1,Math.max(0,E(e,`erase`,1))),tone:E(e,`tone`,7e3),drive:E(e,`drive`,.15),hiss:E(e,`hiss`,0),print:E(e,`print`,0),printgap:E(e,`printgap`,.6),dropout:E(e,`dropout`,0),heads:[...y.values()].filter(t=>t.params.play===e.name).map(e=>({head:e.name,at:E(e,`at`,0),wander:E(e,`wander`,0),wanderhz:E(e,`wanderhz`,.2)}))})),returns:g,resonances:_,plugins:yo(r),performers:b,sections:o.sections,...p.mainMeter?{mainMeter:p.mainMeter}:{},...p.meters.length>1?{meters:p.meters}:{},...o.mainKey?{mainKey:o.mainKey}:{},...c?{builtinCard:c}:{}}}function xo(e,t,n){let r=e.cells.get(t);return r?r.root?r.cycle:r.scan?r.scan.lap:e.cells.get(r.over??n??r.context)?.cycle??12:12}function So(e,t,n,r){return Co(e.cells.get(t).units,n,()=>xo(e,t,r))}function Co(e,t,n){let r=e.length;if(r===0||t===0)return[...e];let i=n(),a=Math.floor(t/r),o=t-a*r;return Array.from({length:r},(t,n)=>{let s=e[(n+o)%r],c=i*(a+ +(n+o>=r));if(c===0)return s;let l=d(s.atom,e=>e.kind===`note`?{...e,value:e.value+c}:e.kind===`choice`?{...e,values:e.values.map(e=>e+c)}:e.kind===`chord`?{...e,notes:e.notes.map(e=>e+c)}:e);return l===s.atom?s:{...s,atom:l}})}let wo=/* @__PURE__ */ new WeakMap;function To(e,t){let n=e.cells.get(t);if(!n.units.some(e=>e.atom.kind===`seq`))return n.units;let r=wo.get(e);r||wo.set(e,r=/* @__PURE__ */ new Map);let i=r.get(t);return i||r.set(t,i=n.units.flatMap(e=>e.atom.kind===`seq`?l(e.atom).map(e=>({atom:e,repeat:1,subdivide:1,elongate:1})):[e])),i}let Eo=(e,t)=>{let n=To(e,t);return n.length>0&&n.every(e=>e.atom.kind===`chord`)},Do=/* @__PURE__ */ new WeakMap;function Oo(e,t,n,r=!1){let i=Do.get(e);i||Do.set(e,i=/* @__PURE__ */ new Map);let a=r&&Eo(e,t),o=`${t}|${n}${a?`|in force`:``}`,s=i.get(o);if(s)return s;let c=[],u=Co(To(e,t),n,()=>xo(e,t));for(let e of(a?u.slice(0,1):u).flatMap(e=>l(e.atom)))e.kind===`note`?c.push({value:e.value,alter:e.alter}):e.kind===`chord`&&e.notes.forEach((t,n)=>c.push({value:t,alter:e.alters[n]}));return i.size>=256&&i.delete(i.keys().next().value),i.set(o,c),c}function ko(e,t,n,r,i=0){let a=e.cells.get(t);if(a.root)return{value:n+r(t)+i,alter:0};let o=Oo(e,t,r(t)+i,!0);if(o.length===0)return{value:0,alter:0};if(a.wrap===0)return o[0];let s=Math.floor(n),c=Math.floor(s/o.length),l=a.wrap===null||a.step?.tap?c:mn(c,a.wrap),u=o[s-c*o.length];return{value:u.value+l*xo(e,t),alter:u.alter}}function Ao(e,t,n,r,i,a){let o=[],s=t,c=n,l=r,u=i;for(let t=0;t<64;t++){let t=e.cells.get(s);if(!t)return{root:s,position:l,path:o};if(t.root){let e=l+u+a(s)+c;return o.push({cell:s,index:Math.round(e)}),{root:s,position:e,path:o}}o.push({cell:s,index:Math.floor(l+c)});let n=ko(e,s,l,a,c);l=n.value+u,u=n.alter,c=t.over?t.overShift:0,s=t.over??t.context}return{root:s,position:l,path:o}}function jo(e,t,n){let r=e.cells.get(t);if(r?.map?.kind===`ratios`){let e=r.map.ratios,t=e.length-1,i=e[t]/e[0],a=Math.floor(n/t),o=n-a*t,s=Math.floor(o),c=o-s,l=(e[s]/e[0])**(1-c)*(e[s+1]/e[0])**+c;return 12*Math.log2(i**+a*l)}let i=r?.map?.kind===`edo`?r.map.period:2;return n*12*Math.log2(i)/(r?.cycle??12)}function Mo(e,t,n){let r=e.cells.get(t),i=2**(n/12);if(r?.map?.kind===`ratios`){let e=r.map.ratios,t=e.map(t=>t/e[0]),n=t.length-1,a=Math.floor(Math.log(i)/Math.log(t[n])+1e-9),o=i/t[n]**+a,s=0;for(;s<n-1&&t[s+1]<=o+1e-12;)s++;let c=Math.log(o/t[s])/Math.log(t[s+1]/t[s]);return a*n+s+c}let a=r?.map?.kind===`edo`?r.map.period:2;return n*(r?.cycle??12)/(12*Math.log2(a))}function No(e,t){let n=[],r=t;for(let t=0;r!==null&&t<64;t++){n.push(r);let t=e.cells.get(r);r=!t||t.root?null:t.over??t.context}return n}let Po=(e,t,n)=>!!n&&!n.abs&&Fo(e,t,n),Fo=(e,t,n)=>!!n&&e.cells.get(t).units.every(e=>e.atom.kind===`note`&&e.repeat===1&&e.subdivide===1&&e.chance===void 0);function Io(e,t){let n=t;for(let t=0;t<64;t++){let t=e.cells.get(n);if(!t||t.root)return n;n=t.over??t.context}return n}let Lo=.15,Ro=(e,t)=>{let n=null;for(let r of e)r.t<=t&&(n=r);return n&&n.speed!==null&&t<=n.t+.35?n.speed:null},zo=/* @__PURE__ */ new WeakMap,Bo=(e,t)=>{let n=zo.get(e);return n||zo.set(e,n=/* @__PURE__ */ new Set),n.add(t),t},Vo=[],Ho=e=>Vo.push(e),X=.002,Uo=3600,Wo=/* @__PURE__ */ new WeakMap;function Go(e,t){let n=Wo.get(e);return n||Wo.set(e,n=/* @__PURE__ */ new Map),n.has(t)||n.set(t,Ko(e,t)),n.get(t)}function Ko(e,t){let n=e.cells.get(t),r=(e,t)=>typeof n?.params[e]==`number`?n.params[e]:t;if(!n||typeof n.params.motor!=`number`)return null;let i=Math.max(1e-6,r(`motor`,1)),a=Math.max(1e-6,r(`mass`,1)),o=Math.max(0,r(`friction`,0));for(let n of e.cells.values())n.name!==t&&n.step?.driver===t&&(typeof n.params.mass==`number`&&(a+=n.params.mass),typeof n.params.friction==`number`&&(o+=n.params.friction));let s=r(`wind`,1/0),c=r(`wow`,0),l=[0],u=[0],d=0,f=!1,p=[],m=e=>{for(;!f&&(l.length-1)*X<Math.min(e,Uo);){let e=(l.length-1)*X,t=Number.isFinite(s)?Math.max(0,1-(e/s)**4):1,n=1+c*Math.sin(2*Math.PI*.55*e),r=Ro(p,e);d+=(i*(n-d)*t-o*d)/a*X,r!==null&&(d+=(r-d)*Lo),Number.isFinite(d)||(d=0),d<0&&r===null&&(d=0),l.push(l[l.length-1]+d*X),u.push(d),t===0&&r===null&&d<.02&&(f=!0)}},h=e=>{let t=Math.max(1,Math.floor(e/X));t>=l.length||(l.length=t+1,u.length=t+1,d=u[t],f=!1)},g=()=>({t:(l.length-1)*X,s:l[l.length-1]});return Bo(e,{grab(e,t){h(e),p.push({t:e,speed:t})},cut:h,speed(e){let t=.01;return Math.max(0,(this.nominal(e+t)-this.nominal(Math.max(0,e-t)))/(e+t-Math.max(0,e-t)))},stopsAt(){return Number.isFinite(s)?(m(Uo),f?(l.length-1)*X:null):null},nominal(e){if(e<=0)return 0;m(e+X);let t=e/X;if(t>=l.length-1){let t=g();return f?t.s:t.s+(e-t.t)*d}let n=Math.floor(t);return l[n]+(l[n+1]-l[n])*(t-n)},real(e){if(e<=0)return 0;let t=(l.length-1)*X+60;for(;!f&&l[l.length-1]<e&&(l.length-1)*X<Math.min(Uo,t);)m((l.length-1)*X+10);if(l[l.length-1]<e){if(f||d<=1e-9)return 1/0;let t=g();return t.t+(e-t.s)/d}let n=0,r=l.length-1;for(;r-n>1;){let t=n+r>>1;l[t]<e?n=t:r=t}let i=l[r]-l[n];return(n+(i>0?(e-l[n])/i:0))*X}})}function qo(e,t,n,r,i,a){let o=[0],s=[{y:0,v:0,off:0,px:0,stretch:0,slipping:!1}],c=0,l=!1,u=[],d=e=>{for(;!l&&(o.length-1)*X<Math.min(e,Uo);){let e=(o.length-1)*X,d=s[s.length-1],{y:f,v:p,off:m}=d,h=a(e+X),g=(h-d.px)/X,_=h-m-f,v=!1;if(t*Math.abs(_)>i){let e=Math.sign(_)*i/t;m+=_-e,_=e,v=!0}let y=Ro(u,e);p+=(t*_+r*(g-p))/n*X,y!==null&&(p+=(y-p)*Lo),Number.isFinite(p)||(p=0),f+=p*X,o.push(Math.max(o[o.length-1],f)),s.push({y:f,v:p,off:m,px:h,stretch:_,slipping:v}),c=Math.abs(g)<1e-6&&Math.abs(p)<1e-4&&Math.abs(_)<1e-4&&y===null?c+X:0,c>.5&&(l=!0)}},f=e=>{let t=Math.max(1,Math.floor(e/X));t>=o.length||(o.length=t+1,s.length=t+1,c=0,l=!1)},p=e=>{if(e<=0)return 0;d(e+X);let t=Math.min(e/X,o.length-1),n=Math.floor(t);return n>=o.length-1?o[o.length-1]:o[n]+(o[n+1]-o[n])*(t-n)},m={nominal:p,real(e){if(e<=0)return 0;let t=(o.length-1)*X+60;for(;!l&&o[o.length-1]<e&&(o.length-1)*X<Math.min(Uo,t);)d((o.length-1)*X+10);if(o[o.length-1]<e)return 1/0;let n=0,r=o.length-1;for(;r-n>1;){let t=n+r>>1;o[t]<e?n=t:r=t}let i=o[r]-o[n];return(n+(i>0?(e-o[n])/i:0))*X},stopsAt:()=>null,speed(e){let t=.01;return Math.max(0,(p(e+t)-p(Math.max(0,e-t)))/(e+t-Math.max(0,e-t)))},grab(e,t){f(e),u.push({t:e,speed:t})},cut:f,state(e){if(e<=0)return{stretch:0,slipping:!1};d(e+X);let t=Math.min(Math.floor(e/X),s.length-1),n=!1;for(let e=Math.max(0,t-50);e<=t;e++)s[e].slipping&&(n=!0);return{stretch:s[t].stretch,slipping:n}}};return e?Bo(e,m):m}let Jo=1e-9;function Yo(e,t,n){if(t.tap)return Qo(t.tap,Zo(e,e.clocks.get(t.tap.meter),n),$o(e,t.tap.meter));let r=Zo(e,t,n);return t.swung?Xo(t.swung,r):r}function Xo(e,t,n){let r=Math.max(1,e.length),i=(t,i)=>t<r?(n?n(i):e)[t]:r,a=e=>{let t=Math.floor(e),n=Math.floor(t/r),a=t-n*r;return n*r+i(a,n)+(e-t)*(i(a+1,n)-i(a,n))},o=e=>{let t=Math.floor(e/r),n=e-t*r,a=0;for(;a+1<r&&i(a+1,t)<=n;)a++;let o=i(a+1,t)-i(a,t);return t*r+a+(o>0?(n-i(a,t))/o:0)};return{beats:t.beats,q:e=>t.q(a(e)),stepAt:e=>o(t.stepAt(e)),...t.speed?{speed:t.speed}:{}}}function Zo(e,t,n,r){if(!t.positional&&t.swing!==void 0){let e=Math.min(.95,Math.max(.05,t.swing)),n=t.perSecond;return{beats:1,q:t=>{let r=Math.floor(t/2),i=t/2-r;return(2*r+2*(i<.5?i/.5*e:e+(i-.5)/.5*(1-e)))/n},stepAt:t=>{let r=t*n/2,i=Math.floor(r),a=r-i;return 2*(i+(a<e?a/e*.5:.5+(a-e)/(1-e)*.5))}}}if(!t.positional)return{beats:1,q:e=>e/t.perSecond,stepAt:e=>e*t.perSecond};let i=t.cell,a=e.cells.get(i)?.bend,o=a?[...a.positions]:So(e,i,n(i)).flatMap(e=>e.atom.kind===`note`?[e.atom.value+e.atom.alter]:[]),s=Math.max(1,o.length),c=a?a.lap:xo(e,i),l=s/t.perSecond;if(a&&r){let e=e=>{let t=Math.floor(e/s),n=r(t,t*l);return t+n.positions[e-t*s]/n.lap},t=t=>{let n=Math.floor(t),r=e(n);return(r+(t-n)*(e(n+1)-r))*l};return{beats:s,q:t,stepAt:e=>{let n=Math.floor(e/l)*s;for(;t(n+1)<=e;)n++;for(;n>0&&t(n)>e;)n--;let r=t(n),i=t(n+1);return n+(i>r?(e-r)/(i-r):0)}}}let u=e=>o[mn(e,s)]+c*Math.floor(e/s),d=e=>{let t=Math.floor(e),n=u(t);return(n+(e-t)*(u(t+1)-n))/c*l},f=d(0),p=e=>d(e)-f;return{beats:s,q:p,stepAt:e=>{let t=Math.floor(e/l)*s;for(;p(t+1)<=e;)t++;for(;t>0&&p(t)>e;)t--;let n=p(t),r=p(t+1);return t+(r>n?(e-n)/(r-n):0)}}}function Qo(e,t,n=null){let r=n?ss(e,t,n):null;if(r)return r;let{positions:i,lap:a}=e,o=Math.max(1,i.length);if(i.every((e,t)=>Math.abs(e-t*a/o)<1e-9))return{beats:o,q:e=>t.q(e*a/o),stepAt:e=>t.stepAt(e)*o/a,...t.speed?{speed:t.speed}:{}};let s=e=>e<o?i[e]:a,c=e=>{let t=Math.floor(e),n=Math.floor(t/o),r=t-n*o;return n*a+s(r)+(e-t)*(s(r+1)-s(r))};return{beats:o,q:e=>t.q(c(e)),stepAt:e=>{let n=t.stepAt(e),r=Math.floor(n/a),i=n-r*a,c=0;for(;c+1<o&&s(c+1)<=i;)c++;let l=s(c+1)-s(c);return r*o+c+(l>0?(i-s(c))/l:0)},...t.speed?{speed:t.speed}:{}}}function $o(e,t,n){let r=e.cells.get(t)?.meter??void 0,i=r?$t(r):null;if(!r||!i)return null;let a=Bt(r),o=Math.max(1,r.levels.length),s=e=>n?n(Math.floor(e/o+1e-9)):r,c=e=>en(s(e),e/a)*a,l=e=>tn(s(e),e/a)*a,u=Math.min(...r.swing.map(e=>e.whole*r.unit)),d=e=>{let t=Math.log2(e/a/u);return Math.abs(t-Math.round(t))<1e-9};return{S:c,W:l,at:(e,t)=>d(t)?c(e):Qt(s(e),e/a,t/a)*a,grain:u*a}}function es(e,t,{S:n,at:r},i){let{positions:a,lap:o}=e,s=e.written??a,c=e.grids??[],l=Math.max(1,a.length),u=e=>e<l?s[e]:o,d=(e,t)=>t<l?i(e*o+u(t),c[t]??0)-e*o:o,f=(e,t)=>{let i=Math.floor(e),a=Math.floor(i/l),s=i-a*l;if(e===i)return a*o+d(a,s);let c=a*o+u(s)+(e-i)*(u(s+1)-u(s));return t!==void 0&&t>0?r(c,t*(u(s+1)-u(s))):n(c)};return{beats:l,q:(e,n)=>t.q(f(e,n)),stepAt:e=>{let r=t.stepAt(e),i=Math.floor(r/o),a=r-i*o,s=0;for(;s+1<l&&d(i,s+1)<=a;)s++;let c=i*o+u(s),f=i*o+u(s+1);if(f<=c||a<=d(i,s))return i*l+s;let p=0,m=1;for(let e=0;e<52;e++){let e=(p+m)/2;n(c+e*(f-c))-i*o<=a?p=e:m=e}return i*l+s+p},...t.speed?{speed:t.speed}:{}}}let ts=/* @__PURE__ */ new WeakMap,ns=/* @__PURE__ */ new WeakMap,rs=/* @__PURE__ */ new WeakMap,is=/* @__PURE__ */ new WeakMap,as=!1;function os(e,t,n){let r=ts.get(e);r||ts.set(e,r=/* @__PURE__ */ new WeakMap),r.set(t,n),ps.get(e)?.delete(t),ns.get(e)?.delete(t),rs.get(e)?.delete(t)}function ss(e,t,{S:n,at:r}){let{positions:i,lap:a}=e,o=e.written??i,s=Math.max(1,i.length);if(!i.every((e,t)=>Math.abs(n(o[t])-e)<1e-9))return null;let c=e=>e<s?o[e]:a,l=e=>e<s?i[e]:a,u=(e,t)=>{let i=Math.floor(e),o=Math.floor(i/s),u=i-o*s;if(e===i)return o*a+l(u);let d=c(u)+(e-i)*(c(u+1)-c(u));return o*a+(t!==void 0&&t>0?r(d,t*(c(u+1)-c(u))):n(d))};return{beats:s,q:(e,n)=>t.q(u(e,n)),stepAt:e=>{let r=t.stepAt(e),i=Math.floor(r/a),o=r-i*a,u=0;for(;u+1<s&&l(u+1)<=o;)u++;let d=c(u),f=c(u+1);if(f<=d||o<=l(u))return i*s+u;let p=0,m=1;for(let e=0;e<52;e++){let e=(p+m)/2;n(d+e*(f-d))<=o?p=e:m=e}return i*s+u+p},...t.speed?{speed:t.speed}:{}}}function cs(e){let t=ls.get(e);if(t)return t;ls.set(e,t=/* @__PURE__ */ new Set);let n=r=>{if(t.has(r))return;t.add(r);let i=e.cells.get(r);for(let t of i?.children.keys()??[]){let r=i.units.flatMap(e=>e.atom.kind===`ref`&&e.atom.name===t?[e.atom]:[]);r.length&&r.every(n=>Fo(e,t,n.pick))||n(t)}};for(let t of e.outputs)for(let e of[...t.drone?[]:[t],...t.mods,...t.levels])n(e.cell);return t}let ls=/* @__PURE__ */ new WeakMap,us=/* @__PURE__ */ new WeakMap;function ds(e){let t=us.get(e);if(t)return t;us.set(e,t=/* @__PURE__ */ new Set);for(let n of e.cells.values()){n.root&&t.add(n.name),n.over&&t.add(n.over),n.root||t.add(n.context);for(let r of n.units)r.atom.kind===`ref`&&Po(e,r.atom.name,r.atom.pick)&&t.add(r.atom.name)}return t}let fs=/* @__PURE__ */ new WeakMap,ps=/* @__PURE__ */ new WeakMap;Ho(e=>{fs.delete(e),ps.delete(e),ns.delete(e)});function ms(e,t){let n=e.cells.get(e.clocks.get(t)?.cell??``)?.params.varispeed;return typeof n==`number`?n:0}function hs(e,t,n=0){let r=ps.get(e);r||ps.set(e,r=/* @__PURE__ */ new WeakMap);let i=r.get(t)??/* @__PURE__ */ new Map;r.set(t,i);let a=ts.get(e)?.get(t),o=(n,r)=>{let i=e.cells.get(n)?.bend,o=i?.depth;if(!i||!o||!a)return;let s=rs.get(e);s||rs.set(e,s=/* @__PURE__ */ new WeakMap);let c=s.get(t);c||s.set(t,c=/* @__PURE__ */ new Map);let l=c.get(n);l||c.set(n,l=/* @__PURE__ */ new Map);let u=l,d={positions:[...i.positions],lap:i.lap},f=/* @__PURE__ */ new Map;return(e,t)=>{let s=u.get(e);if(s)return s;if(e<0||as)return d;as=!0;let c;try{c=a(n,`depth`,r(t))}finally{as=!1}let l=Number.isFinite(c)?Math.round(c*1e9)/1e9:null,p=l===null?d:f.get(l);return p||f.set(l,p=Wt(o.table,o.per,o.nodes,i.bars,l)),u.set(e,p),p}},s=n=>{let r=e.cells.get(n),i=r?.swingMoves,o=r?.meter;if(!i||!o?.swing||!a)return;let s=ns.get(e);s||ns.set(e,s=/* @__PURE__ */ new WeakMap);let c=s.get(t);c||s.set(t,c=/* @__PURE__ */ new Map);let u=c.get(n);u||c.set(n,u=/* @__PURE__ */ new Map);let d=u,f=is.get(o);f||is.set(o,f=/* @__PURE__ */ new Map);let p=f,m=Math.max(1,o.levels.length);return e=>{let t=d.get(e);if(t)return t;if(e<0||as)return o;let r=l(n).q(e*m);as=!0;let s;try{s=a(n,`swing`,r)}finally{as=!1}let c=Number.isFinite(s)?Math.min(.95,Math.max(.05,Math.round(s*1e9)/1e9)):null,u=c===null?o:p.get(c);return u||p.set(c,u={...o,swing:o.swing.map(e=>e.level===i.level?{...e,share:c}:e)}),d.set(e,u),u}},c=t=>{let n=i.get(t);if(!n){let r=e.clocks.get(t),a=s(r.tap?.meter??t);if(r.tap&&a){let t=e.cells.get(r.tap.meter).meter,i=Bt(t),o=Math.max(1,t.levels.length),s=(e,t)=>Qt(a(Math.floor(e/o+1e-9)),e/i,t)*i,c=$o(e,r.tap.meter,a);n=c?es(r.tap,l(r.tap.meter),c,s):Qo(r.tap,l(r.tap.meter),null)}else if(r.tap)n=Qo(r.tap,l(r.tap.meter),$o(e,r.tap.meter));else if(a){let r=e.cells.get(t).meter.levels.map((e,t)=>t);n=Xo(r,l(t),e=>an(a(e))??r)}else n=r.swung?Xo(r.swung,l(t)):l(t);i.set(t,n)}return n},l=n=>{let r=i.get(`${n}\0plain`);if(!r){let a=e.clocks.get(n);if(a.belt){let i=Yo(e,e.clocks.get(a.belt.driver),t),o=c(a.belt.driver),s=e.cells.get(a.cell),l=(e,t)=>typeof s.params[e]==`number`?s.params[e]:t,u=Math.max(.001,l(`belt`,200)),d=Math.max(.001,l(`mass`,1)),f=l(`damping`,.6*Math.sqrt(u*d)),p=fs.get(e);p||fs.set(e,p=/* @__PURE__ */ new Map);let m=p.get(n);m||p.set(n,m=qo(e,u,d,f,l(`slip`,1/0),e=>i.q(o.stepAt(e))));let h=m,g=a.belt.rate;r={beats:1,q:e=>h.real(i.q(e/g)),stepAt:e=>i.stepAt(h.nominal(e))*g,speed:e=>h.speed(e)}}else{let n=Go(e,a.cell),i=Zo(e,a,t,o(a.cell,e=>n?n.real(e):e)),s=Go(e,a.cell);r=s?{beats:i.beats,q:e=>s.real(i.q(e)),stepAt:e=>i.stepAt(s.nominal(e)),speed:e=>s.speed(e)}:i}i.set(`${n}\0plain`,r)}return r};return{map:c,written:t=>{let n=e.clocks.get(t)?.tap;if(!n?.written)return c(t);let r=i.get(`${t}\0written`);return r||i.set(`${t}\0written`,r=Qo({...n,positions:n.written},l(n.meter))),r},played:t=>{let n=e.clocks.get(t)?.tap?null:$o(e,t,s(t));if(!n)return c(t);let r=i.get(`${t}\0played`);if(!r){let e=l(t);r={beats:e.beats,q:t=>e.q(n.S(t)),stepAt:t=>n.W(e.stepAt(t)),...e.speed?{speed:e.speed}:{}},i.set(`${t}\0played`,r)}return{...r,q:r.q,stepAt:r.stepAt,grain:n.grain}},swingOf:(t,n)=>{let r=s(t);return(r?r(n):e.cells.get(t)?.meter)?.swing??null},stepOf:e=>c(e).stepAt(Math.max(0,n))}}function gs(e,t,n){let r=hs(e,t,n),i=cs(e),a=ds(e),o=/* @__PURE__ */ new Map,s=vs(e),c=i=>{let a=e.cells.get(i),o=a?.phase?a:s.get(i);if(!o?.phase)return l(i);let c=ys(e,t,o,n,r,l);return l(i)+(o===a?c.degrees:-c.semitones)},l=n=>{let s=t(n),l=e.cells.get(n),u=l?.tonic?e.cells.get(l.tonic):void 0;if(l&&u?.step&&u.clock){let t=So(e,u.name,c(u.name))[0]?.atom;return t?.kind===`note`?s-l.shift+mn(t.value+t.alter,12):s}if(!l||!l.step||!l.clock||e.clocks.has(n)||Ts(e,n)||l.loops||i.has(n)&&!a.has(n))return s;let d=o.get(l.clock);if(d===void 0&&o.set(l.clock,d=r.stepOf(l.clock)),l.wrap===0)return s;let{per:f,laps:p}=xs(e,l),m=(f?mn(Math.floor(l.rate*d+Jo),f):Math.floor(l.rate*d+Jo))*l.stride,h=ws(e,n);if(!h){let t=p*Ss(e,n);return s+(t>0?mn(m,t):m)}let g=m+Math.min(.999999999,Math.max(0,l.rate*d-Math.floor(l.rate*d+Jo))),_=p*h.length,v=_>0?mn(g,_):g,y=Math.floor(v/h.length);return s+y*h.entries+h.inForce(v-y*h.length,Math.floor(g/h.length))};return c}let _s=/* @__PURE__ */ new WeakMap;function vs(e){let t=_s.get(e);if(!t){t=/* @__PURE__ */ new Map;for(let n of e.cells.values())n.phase&&t.set(n.phase.key,n);_s.set(e,t)}return t}function ys(e,t,n,r,i,a){let{cell:o,k:s,n:c}=n.phase,l={degrees:0,semitones:0},u=n.scan?.steps??[];if(u.length!==s)return l;let d=e.mainMeter,f=d?Math.max(1,e.cells.get(d)?.meter?.levels.length??0):0,p=r;if(d&&f){let e=i.map(d);p=e.q(Math.floor(e.stepAt(r)/f+Jo)*f)}let m=So(e,o,Math.abs(p-r)<1e-9?a(o):gs(e,t,p)(o))[0]?.atom;if(m?.kind!==`note`||!Number.isInteger(m.value)||m.value<0||m.value>=s)return l;let h=[0];for(let e of u.slice(0,-1))h.push(h[h.length-1]+e);let g=yn(s,c,m.value);for(let e=0;e<s;e++)if(g.every((t,n)=>mn(h[(n+e)%s]-h[e],c)===t))return{degrees:e,semitones:h[e]};return l}let bs=(e,t,n)=>r=>r===n?t(r):e(r);function xs(e,t){if(t.wrap===null)return{per:null,laps:1};let n=t.step?.tap&&t.clock?e.clocks.get(t.clock)?.tap:void 0;return n?{per:Math.max(1,Math.round(n.positions.length*t.rate)),laps:0}:{per:null,laps:t.wrap}}let Ss=(e,t)=>{let n=e.cells.get(t);return ws(e,t)?.length??(n.units.length||n.cycle)},Cs=/* @__PURE__ */ new WeakMap;function ws(e,t){let n=Cs.get(e);if(n||Cs.set(e,n=/* @__PURE__ */ new Map),n.has(t))return n.get(t);let r=e.cells.get(t).units,i=null;if(r.some(e=>e.repeat!==1||e.elongate!==1||e.atom.kind===`seq`)){let n=[],a=0;for(let e of r)n.push(a),a+=e.atom.kind===`seq`?l(e.atom).length:1;let o=k(r,()=>1).filter(e=>!e.chosen||e.chosen.every(e=>e.is===0)).map(e=>{let t=r[e.top],i=n[e.top]+(t.atom.kind===`seq`?l(t.atom).indexOf(e.atom):0);return{at:e.at,index:i,...e.laps?{laps:e.laps}:{}}}).sort((e,t)=>e.at-t.at),s=r.reduce((e,t)=>e+D(t.atom,()=>1)*t.elongate*t.repeat,0),c=(e,t)=>!e.laps||mn(t,e.laps.of)===e.laps.is,u=To(e,t).length;i={length:s,entries:u,inForce(e,t){let n;for(let r of o)r.at<=e+1e-9&&c(r,t)&&(!n||r.at>n.at+1e-9)&&(n=r);if(n)return n.index;for(let e of o)c(e,t-1)&&(!n||e.at>n.at+1e-9)&&(n=e);return n?n.index-u:0}}}return n.set(t,i),i}function Ts(e,t){let n=e.cells.get(t)?.over??``,r=e.cells.get(n);return!!r&&r.units.length>0&&r.units.every(t=>t.atom.kind===`ref`&&e.sections?.get(t.atom.name)===n)}function Es(e,t,n){let r=e.cells.get(n),i=r?.clock?e.clocks.get(r.clock):void 0,a=r?.clock&&i?t.map(r.clock):null,o=i?i.perSecond:1,s=e=>a?a.stepAt(Math.max(0,e))/o:e;return{pos:s,real:e=>e<=0?0:a?a.q(e*o):e,speed:e=>Math.max(.001,(s(e+.01)-s(Math.max(0,e-.01)))/(e+.01-Math.max(0,e-.01))),moving:a}}function Ds(e,t,n,r,i,a=0){if(!r)return So(e,t,n(t)+a,i);let o=So(e,t,r.abs?0:n(t),i);return(pt(o.length,r)??[]).map(e=>o[e])}let Os=(e,t,n)=>ht(e.cells.get(t),n)??0,ks=(e,t=0)=>e?ee(e):`>${t}`;function As(e,t,n,r,i){let a=e.cells.get(t);if(!a||a.root)return null;let o=Math.max(1,Oo(e,t,i(t)+n,!0).length),s=(r,a=0)=>Ao(e,t,n,r,a,i).position,c=(e,t)=>Math.abs(e-t)<1e-6,l=0,u=16*o;for(;l<u&&s(l+1)<=r+1e-6;)l++;for(;l>-u&&s(l)>r+1e-6;)l--;if(c(s(l),r))return{value:l,alter:0};if(s(l)>r||s(l+1)<=r)return null;for(let e=1;e<=12;e++){let t=s(l,e);if(c(t,r))return{value:l,alter:e};if(t>r)break}return null}var js=class extends Error{};function Ms(e,t,n,r=null,i=()=>!1,a=0,o=nt){let s=/* @__PURE__ */ new Map,c=(t,r,a,o,l)=>{let u=e.cells.get(t),d=u.root?t:u.over??o,f=u.root?0:u.over?u.overShift:l,p=`${t}|${ks(r,a)}|${d}|${f}`,m=s.get(p);if(m)return m;let h=[];if(u.sum&&!i(t))h.push({step:0,duration:1,value:0,alter:0,cell:t,table:d,tableShift:f,reads:t});else if(!i(t)){let i=Po(e,t,r)?pt(e.cells.get(t).units.length,r):null,o=Ds(e,t,n,r,d,a),s=t=>t.kind===`ref`&&Os(e,t.name,t.pick)||1,l=(e,t,n)=>{if(e.kind!==`ref`)return x(e,t,n);let r=n/s(e);return c(e.name,e.pick,e.shift,d,f).map(n=>({atom:{kind:`spliced`,e:n,ref:e},at:t+n.step*r,dur:n.duration*r,of:n.laps?.of??1,is:n.laps?.is??0,chances:[],picks:(n.chosen??[]).map(e=>({...e,at:t+e.at*r}))}))};for(let{atom:r,at:a,dur:c,chances:p,top:m,level:g,laps:_,chosen:v}of O(o,s,l,`${t}:`)){let o={step:a,duration:c,cell:t,table:d,tableShift:f,...i?{via:{cell:t,index:i[m],ctx:d,mul:1,add:0}}:{},..._?{laps:_}:{},...v?{chosen:v}:{}},s=p.map(e=>e===null?u.chance??.5:e),l={...s.length?{chance:s.length===1?s[0]:1-s.reduce((e,t)=>e*(1-t),1)}:{},...g===void 0?{}:{level:g}},y=t=>({...o,table:Io(e,d),tableShift:0,value:Math.round(Mo(e,Io(e,d),t)*1e6)/1e6,alter:0,...d===Io(e,d)?{}:{named:{table:d,tableShift:f}}});if(r.kind===`note`)h.push(r.pitched?{...y(r.value),...l}:{...o,value:r.value,alter:r.alter,...l});else if(r.kind===`chord`)r.notes.forEach((e,t)=>{let n=r.levels?.[t],i=n===void 0?{}:{level:n*(g??1)};h.push(r.pitched?.[t]?{...y(e),...l,...i}:{...o,value:e,alter:r.alters[t],...l,...i})});else if(r.kind===`choice`)h.push({...o,value:r.values[0],alter:r.alters[0],...l,options:r.values.map((e,t)=>({value:e,alter:r.alters[t]}))});else if(r.kind===`spliced`){let{e:t,ref:i}=r,o=i.transpose??0,s=i.values,{laps:l,chosen:u,...d}=t,f=s&&t.named?As(e,t.named.table,t.named.tableShift,t.value,n):null,{named:p,...m}=d,y=f?{...m,table:t.named.table,tableShift:t.named.tableShift,value:f.value,alter:f.alter}:d;h.push({...y,...s?{value:s.mul*y.value+s.add,alter:s.mul*y.alter,...t.options?{options:t.options.map(e=>({value:s.mul*e.value+s.add,alter:s.mul*e.alter}))}:{},...t.via?{via:{...t.via,mul:s.mul*t.via.mul,add:s.mul*t.via.add+s.add}}:{}}:{},step:a,duration:c,..._?{laps:_}:{},...v?{chosen:v}:{},...o||t.transpose?{transpose:(t.transpose??0)+o}:{},...g===void 0?{}:{level:(t.level??1)*g}})}if(h.length>5e4)throw new js(t)}}return s.set(p,h),h};return[...c(t,r,a,o,0)].sort((e,t)=>e.step-t.step||e.value-t.value)}function Ns(e,t,n){if(!t.via)return{value:t.value,alter:t.alter};let r=So(e,t.via.cell,n(t.via.cell),t.via.ctx)[t.via.index];return r?.atom.kind===`note`?{value:t.via.mul*r.atom.value+t.via.add,alter:t.via.mul*r.atom.alter}:{value:t.value,alter:t.alter}}let Z=e=>`cell:${e}`;function Ps(e){let t=3735928559,n=1103547991;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,2654435761),n=Math.imul(n^i,1597334677)}return t=Math.imul(t^t>>>16,2246822507)^Math.imul(n^n>>>13,3266489909),n=Math.imul(n^n>>>16,2246822507)^Math.imul(t^t>>>13,3266489909),((n>>>0)*2**21+(t>>>11)).toString(36)}let Fs=e=>+e.toPrecision(9),Is=/* @__PURE__ */ new WeakMap;function Ls(e){let t=Rs(e);return n=>{let r=e.cells.get(n);return`${r&&!r.seeded?r.seed:0}|${t(n)}`}}function Rs(e){let t=Is.get(e);if(t)return t;let n=lt(e),r=/* @__PURE__ */ new Map,i=(t,a)=>{let o=r.get(t);if(o!==void 0)return o;let s=e.cells.get(t);if(!s)return t;if(s.seeded)return s.seed.toString(36);if(a.has(t))return`↺`;let c=/* @__PURE__ */ new Set([...a,t]),l=[];try{l=Ms(e,t,n).map(e=>[Fs(e.step),Fs(e.duration),Fs(e.value+e.alter+(e.transpose??0)),e.chance??null,e.options?.map(e=>e.value+e.alter)??null,e.laps?[e.laps.of,e.laps.is]:null,e.chosen?.map(e=>[Fs(e.at),e.of,e.is,e.lap])??null])}catch{}let u=Object.entries(s.params).sort(([e],[t])=>e.localeCompare(t)).map(([e,t])=>[e,typeof t==`string`&&Pe.has(e)?i(t,c):t]),d=Ps(JSON.stringify([s.seed,s.steps,l,u.filter(([e])=>e!==`chance`&&!Ve.has(String(e))),s.env?i(s.env,c):null]));return a.size||r.set(t,d),d},a=e=>i(e,/* @__PURE__ */ new Set);return Is.set(e,a),a}let zs=(e,t,n)=>e.drawn?e.drawn(t,n):t;function Bs(e,t,n){let r=t.series.reduce((t,r)=>t*Xs(Js(e,r,n,n+1),n,e=>e.level),1);return t.range?t.range[0]+(t.range[1]-t.range[0])*r:r}function Vs(e,t,n,r){let i=e.voiceParams.get(t);if(!i||Object.keys(i).length===0)return;let a={};for(let[t,o]of Object.entries(i)){if(t===`pan`)continue;let i=o.series.map(t=>Js(e,t,n,n+r)),s=e=>i.reduce((t,n)=>t*Xs(n,e,e=>e.level),1),c=e=>o.range?o.range[0]+(o.range[1]-o.range[0])*e:e;if(o.env&&o.range)a[t]={kind:`env`,from:o.range[0],peak:c(s(n)),...o.env};else{let e=[...new Set(i.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t);a[t]={kind:`points`,points:(e.length?e:[n]).map(e=>({at:e,value:c(s(e)),...i.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}}))}}}return Object.keys(a).length?a:void 0}function Hs(e,t,n){let r=gs(e.result,e.statics,n+Jo),i=e.played.has(t.cell)?bs(r,e.statics,t.cell):r,a=Ns(e.result,t,i),o=Ao(e.result,t.table,t.tableShift,a.value,a.alter,i),s=t.transpose?{...o,position:o.position+t.transpose}:o;return jo(e.result,s.root,s.position)}function Us(e,t,n,r){if(t.events.length===0)return[{at:n,semis:0}];if(!t.clock)return[{at:n,semis:t.sign*Hs(e,t.events[0],n)}];if(t.lin)return qs(e,t,n,r,(n,r)=>t.sign*Hs(e,n,r)).map(e=>({at:e.at,semis:e.v,ramp:e.ramp}));let i=hs(e.result,e.statics).map(t.clock),a=i.stepAt(Math.max(0,n))*t.rate,o=i.stepAt(Math.max(0,r))*t.rate;Number.isFinite(a)||(a=0),Number.isFinite(o)||(o=a);let s=[],c=Math.floor(a/t.period),l=Gs(t,a);s.push({at:n,semis:l?t.sign*Hs(e,l,n):0});for(let n=c;n*t.period<o;n++)for(let r of t.events){let c=n*t.period+r.step;if(c<=a+1e-9||c>=o-1e-9)continue;let l=i.q(c/t.rate);s.push({at:l,semis:t.sign*Hs(e,r,l)})}return s}function Ws(e,t){return Math.floor((e+Jo)/t)}function Gs(e,t){let n=Ws(t,e.period),r=null;for(let i of[n,n-1]){for(let n of e.events)i*e.period+n.step<=t+1e-9&&(r=n);if(r)break}return r}function Ks(e,t,n){if(t.events.length===0)return null;if(!t.clock)return t.events[0];let r=hs(e.result,e.statics).map(t.clock).stepAt(Math.max(0,n))*t.rate;return Gs(t,Number.isFinite(r)?r:0)}function qs(e,t,n,r,i){let a=hs(e.result,e.statics).map(t.clock),o=[...new Map(t.events.map(e=>[e.step,e])).values()].sort((e,t)=>e.step-t.step),s=e=>a.q(e/t.rate),c=(e,n,r)=>{let a=zs(t,e,n);return a?i(a,r):0},l=e=>{let n=Ws(e,t.period),r=e-n*t.period,i=o.length-1;for(let e=0;e<o.length;e++)o[e].step<=r+1e-9&&(i=e);let a=o[i],l=a.step>r+1e-9?a.step-t.period:a.step,u=c(a,l<0?n-1:n,s(n*t.period+l));if(i===o.length-1||l<0)return u;let d=o[i+1];return u+(c(d,n,s(n*t.period+d.step))-u)*(r-l)/Math.max(Jo,d.step-l)},u=a.stepAt(Math.max(0,n))*t.rate,d=a.stepAt(Math.max(0,r))*t.rate;Number.isFinite(u)||(u=0),Number.isFinite(d)||(d=u);let f=[{at:n,v:l(u),ramp:!1}];for(let e=Math.floor(u/t.period);e*t.period<d;e++)for(let n of o){let r=e*t.period+n.step;r>u+1e-9&&r<d-1e-9&&f.push({at:s(r),v:c(n,e,s(r)),ramp:n!==o[0]})}return f.push({at:r,v:l(d-1e-6),ramp:!0}),f}function Js(e,t,n,r,i,a=!1){if(t.sum){let{terms:a,constant:o}=t.sum,s=a.map(t=>Js(e,t.series,n,r,i,!0)),c=[...new Set(s.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t);return(c.length?c:[n]).map(e=>({at:e,level:Math.min(1,Math.max(0,a.reduce((t,n,r)=>t+n.weight*Xs(s[r],e,e=>e.level),o))),...s.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}}))}let o=e=>t.db?10**((e.value+e.alter)/20):a?e.value+e.alter:Math.max(0,e.value+e.alter),s=a?-1/0:-1;if(t.events.length===0)return[{at:n,level:0}];if(t.reads?.size)return Ys(e,t,n,r,i,o,s);if(!t.clock)return[{at:n,level:o(t.events[0])}];if(t.lin)return qs(e,t,n,r,e=>o(e)).map(e=>({at:e.at,level:a?e.v:Math.max(0,e.v),ramp:e.ramp}));let c=hs(e.result,e.statics).map(t.clock),l=c.stepAt(Math.max(0,n))*t.rate,u=c.stepAt(Math.max(0,r))*t.rate;Number.isFinite(l)||(l=0),Number.isFinite(u)||(u=l);let d=e=>{let n=Ws(e,t.period),r=e-n*t.period,i=s;for(let e of t.events){if(!(r>=e.step-1e-9&&r<e.step+e.duration-1e-9))continue;let a=zs(t,e,n);a&&(i=Math.max(i,o(a)))}return i===s?0:i},f=i===void 0?NaN:hs(e.result,e.statics).written(t.clock).stepAt(Math.max(0,i))*t.rate,p=[{at:n,level:d(Number.isFinite(f)?f:l)}],m=/* @__PURE__ */ new Set;for(let e=Math.floor(l/t.period);e*t.period<u;e++)for(let n of t.events)for(let r of[e*t.period+n.step,e*t.period+n.step+n.duration])r>l+1e-9&&r<u-1e-9&&m.add(r);for(let e of[...m].sort((e,t)=>e-t)){let n=d(e+Jo*10);n!==p[p.length-1].level&&p.push({at:c.q(e/t.rate),level:n})}return p}function Ys(e,t,n,r,i,a,o=-1){let s=new Map([...t.reads].map(([t,a])=>[t,Js(e,a,n,r,i)])),c=e=>Math.min(1,Math.max(0,e)),l=t.clock?hs(e.result,e.statics).map(t.clock):null,u=e=>l?l.stepAt(Math.max(0,e))*t.rate:0,d=e=>{let n=u(e)+Jo*10,r=Ws(n,t.period),i=n-r*t.period,d=o,f=!1;for(let n of l?t.events:t.events.slice(0,1)){if(l&&!(i>=n.step-1e-9&&i<n.step+n.duration-1e-9))continue;let o=zs(t,n,r);if(!o)continue;let u=o.reads?s.get(o.reads):void 0,p=u?c(Xs(u,e,e=>e.level)):a(o);p>d&&([d,f]=[p,!!u&&u.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9)])}return{level:d===o?0:d,ramp:f}},f=/* @__PURE__ */ new Set([n]);for(let e of s.values())for(let t of e)t.at>n+1e-9&&t.at<r-1e-9&&f.add(t.at);if(l){let e=u(n),i=u(r);for(let n=Math.floor(e/t.period);n*t.period<i;n++)for(let r of t.events)for(let a of[n*t.period+r.step,n*t.period+r.step+r.duration])a>e+1e-9&&a<i-1e-9&&f.add(l.q(a/t.rate))}let p=[];for(let e of[...f].sort((e,t)=>e-t)){let{level:t,ramp:n}=d(e),r=p[p.length-1];(!r||t!==r.level||n)&&p.push({at:e,level:t,...n?{ramp:!0}:{}})}return p}function Xs(e,t,n){let r=0;for(let n=0;n<e.length;n++)e[n].at<=t+1e-9&&(r=n);let i=e[r+1];return!i?.ramp||Math.abs(e[r].at-t)<1e-9?n(e[r]):n(e[r])+(n(i)-n(e[r]))*(t-e[r].at)/Math.max(Jo,i.at-e[r].at)}let Zs={sign:1,lin:!1,db:!1,clock:null,rate:0,period:1,events:[]};function Qs(e,t,n){let r=hs(e,t),i=/* @__PURE__ */ new Set,a=[],o=t=>{for(let n=0;t&&!i.has(t)&&n<32;n++){i.add(t);let n=e.cells.get(t);if(!n)return;n.laps&&n.clock&&a.push(r.map(n.clock).q(n.laps*Math.max(1,Os(e,t,null))/n.rate)),n.clock&&n.clock!==t&&o(n.clock),t=n.step?.driver}};o(n.cell);for(let e of n.select)o(e.cell);return a.length?Math.min(...a):1/0}function $s(e){let t=3735928559,n=1103547991;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,2654435761),n=Math.imul(n^i,1597334677)}return t=Math.imul(t^t>>>16,2246822507)^Math.imul(n^n>>>13,3266489909),n=Math.imul(n^n>>>16,2246822507)^Math.imul(t^t>>>13,3266489909),((n>>>0)*2**21+(t>>>11))/2**53}function ec(e,t,n,r){return tc(e,t.output.cell,n,r)}function tc(e,t,n,r){if(n.laps&&mn(r,n.laps.of)!==n.laps.is)return null;if(n.chance===void 0&&!n.options&&!n.chosen)return n;let i=Ls(e)(t);for(let e of n.chosen??[])if(Math.floor($s(`${i}|${r+e.lap}|${e.at.toFixed(6)}|${e.id.replace(/^[^:/]*:/,``)}|picks`)*e.of)!==e.is)return null;if(n.chance===void 0&&!n.options)return n;let a=`${i}|${r}|${n.step.toFixed(6)}`;if(n.chance!==void 0&&$s(`${a}|sounds`)>=1-n.chance)return null;if(!n.options)return n;let o=n.options[Math.floor($s(`${a}|picks`)*n.options.length)];return{...n,value:o.value,alter:o.alter}}function nc(e,t){let n=!1;for(let r of t){let t=e.cells.get(r.part)?.params.restart??e.cells.get(r.cell)?.params.restart;if(t===`resume`||t===`free`)return t;t!==`restart`&&r.performer||(n=!0)}return n?`restart`:`free`}function rc(e,t,n,r){let i=t.series;if(!i.clock||i.events.length===0)return[];let a=hs(e.result,e.statics).map(i.clock),o=a.stepAt(Math.max(0,n))*i.rate,s=a.stepAt(Math.max(0,r))*i.rate;Number.isFinite(o)||(o=0),Number.isFinite(s)||(s=o);let c=[];for(let e=Math.floor(o/i.period)-1;e*i.period<s;e++)for(let n of i.events){if(mn(Math.round(n.value+n.alter),t.entries)!==t.entry)continue;let r=e*i.period+n.step,l=r+n.duration;l<=o+1e-9||r>=s-1e-9||c.push({a:a.q(r/i.rate),b:a.q(l/i.rate)})}return c.sort((e,t)=>e.a-t.a)}let ic=(e,t,n)=>No(e,t).some(e=>n.has(Z(e))),ac=(e,t,n)=>{let r=e.cells.get(t);for(let t=0;r?.step&&t<32;t++){if(n.has(Z(r.step.driver)))return!0;r=e.cells.get(r.step.driver)}return!1};function oc(e,t){let n=e.cells.get(t),r=n?.voice?n.params.gain:void 0;return typeof r==`number`&&Number.isFinite(r)?r:1}function sc(e,t,n){let[r,i]=[1,1];for(let a of t){let t=e.voiceParams.get(a)?.pan;if(!t)continue;let[o,s]=st(Bs(e,t,n));[r,i]=[r*o,i*s]}return[r,i]}function cc(e,t){return e.silent?e.via.some(n=>t.has(Z(n))&&!e.midi?.some(e=>e.card===n))?[0,0]:[e.gains[0],e.gains[1]]:uc(e.parts,t)}function lc(e,t){let n=cc(e,t);if(e.silent||dc(n))return n;let r=pc(e,t).reduce((e,t)=>Math.abs(t.gain)>Math.abs(e)?t.gain:e,0);return[r,r]}function uc(e,t){let n=[0,0];for(let r of e)!t.has(Z(r.mix))&&!t.has(Z(r.sink))&&(n[0]+=r.gains[0],n[1]+=r.gains[1]);return n}let dc=e=>e[0]!==0||e[1]!==0;function fc(e,t,n){if(!hc(e,t,n))return!1;let r=cc(t,n);return dc(r)||mc(t,n)}function pc(e,t){return(e.midi??[]).filter(e=>!t.has(Z(e.card))&&!(e.mix&&t.has(Z(e.mix))))}let mc=(e,t)=>pc(e,t).length>0;function hc(e,t,n){if(n.has(Z(t.voice))||n.has(Z(t.cell)))return!1;if(t.drone)return!t.through.some(e=>n.has(Z(e)))&&!(t.envelopeCell&&n.has(Z(t.envelopeCell)));let r=e.cells.get(t.cell);return!(!r?.clock||ic(e,r.clock,n)||ac(e,t.cell,n)||t.through.some(e=>n.has(Z(e)))||t.envelopeCell&&n.has(Z(t.envelopeCell))||t.select.some(t=>n.has(Z(t.cell))||n.has(Z(t.part))||n.has(Z(e.cells.get(t.cell).over)))||t.select.some(t=>[...e.cells.get(t.cell).children.keys()].some(e=>n.has(Z(e)))))}function gc(e,t,n){if(Math.abs(t-n)<1e-9)return{period:t,events:[...e]};let r=[];for(let i=0;i*t<n-Jo;i++)for(let a of e){let e=a.step+i*t;e>=n-1e-9||r.push({...a,step:e,duration:Math.min(a.duration,n-e)})}return{period:n,events:r}}function _c(e,t,n=/* @__PURE__ */ new Set){if(!e.ok)return{result:e,statics:t,muted:n,tracks:[],drones:[],played:/* @__PURE__ */ new Set,voiceParams:/* @__PURE__ */ new Map,envParams:/* @__PURE__ */ new Map,end:1/0,seriesOf:()=>Zs};let r=[],i=[],a=/* @__PURE__ */ new Map,o=(r,i,a,s)=>{let c=e.cells.get(r);if(c.sum)return{sign:s,lin:!1,db:!1,clock:null,rate:0,period:1,events:[],sum:{terms:c.sum.terms.map(e=>({series:o(e.cell,null,0,1),weight:e.weight})),constant:c.sum.constant}};let l=n.has(Z(r))?[]:Ms(e,r,t,i,e=>n.has(Z(e)),a).filter(t=>!ic(e,t.table,n)),u=l.some(e=>e.laps||e.chance!==void 0||e.options||e.chosen)?(t,n)=>tc(e,r,t,n):void 0,d=c.map?.kind===`db`,f=Math.max(1,Os(e,r,i)),p=[...new Set(l.flatMap(e=>e.reads?[e.reads]:[]))],m=xs(e,c).per;return{sign:s,lin:c.map?.kind===`lin`,db:d,clock:c.clock,rate:c.rate,...m?gc(l,f,m):{period:f,events:l},...u?{drawn:u}:{},...p.length?{reads:new Map(p.map(e=>[e,o(e,null,0,1)]))}:{}}},s=(t,n)=>{let r=(Ta(e,n)??0)/t.period;return r>20?{...t,rate:t.rate*20/r}:t},c=/* @__PURE__ */ new Map;for(let t of e.cells.values())if(t.map?.kind===`adsr`&&Object.keys(t.paramCells).length)try{c.set(t.name,Object.fromEntries(Object.entries(t.paramCells).map(([e,t])=>[e,{range:t.range,series:t.factors.map(e=>o(e,null,0,1)),env:null}])))}catch(e){if(!(e instanceof js))throw e}for(let c of e.outputs){if(!fc(e,c,n))continue;let l=e.cells.get(c.cell);try{for(let t of[...c.kit?Ca(e.cells.get(c.voice)):[c.voice],...c.through]){if(a.has(t))continue;let n=e.cells.get(t),r={};for(let[t,i]of Object.entries(n?.paramCells??{})){let n=i.factors.find(t=>e.cells.get(t)?.map?.kind===`adsr`);r[t]={range:i.range,series:i.factors.filter(e=>e!==n).map(e=>s(o(e,null,0,1),e)),env:n?_t(e.cells.get(n)):null}}a.set(t,r)}if(c.drone){i.push({output:c,mods:c.mods.map(e=>o(e.cell,e.pick,e.shift,e.sign)).filter(e=>e.events.length>0),levels:c.levels.map(e=>o(e.cell,e.pick,e.shift,e.sign))});continue}let n=o(c.cell,c.pick,c.shift,c.sign),u=c.mods.filter(e=>!e.picks).map(e=>o(e.cell,e.pick,e.shift,e.sign)).filter(e=>e.events.length>0),d=c.mods.find(e=>e.picks),f=d?o(d.cell,d.pick,d.shift,1):void 0,p=c.levels.map(e=>o(e.cell,e.pick,e.shift,e.sign)),m=c.select.map(t=>({series:o(t.cell,null,0,1),entry:t.entry,entries:e.cells.get(e.cells.get(t.cell).over).units.length})),h=l.paramCells.legato,g=l.step?.tap?e.cells.get(l.step.driver)?.meter:null,_=l.step?.chain.reduce((e,t)=>t.op===`×`?e*t.n:e/t.n,1)??1,v=h?{range:h.range,series:h.factors.map(e=>o(e,null,0,1))}:typeof l.params.legato==`number`?l.params.legato:g?un(g,l.step.tap,_):1,y=c.cell===c.voice?void 0:l.paramCells.pan,b=y?{range:y.range,series:y.factors.map(e=>o(e,null,0,1))}:c.cell!==c.voice&&typeof l.params.pan==`number`?l.params.pan:null;n.events.length&&r.push({...n,output:c,clock:l.clock,mods:u,...f?{picker:f}:{},levels:p,selects:m,end:Qs(e,t,c),share:v,place:b})}catch(e){if(!(e instanceof js))throw e}}let l=r.map(e=>e.end),u=-1/0;for(let t of e.clocks.values()){let n=Go(e,t.cell)?.stopsAt();n!=null&&(u=Math.max(u,n))}let d=l.length?Math.max(...l):1/0,f={result:e,statics:t,muted:n,tracks:r,drones:i,played:cs(e),voiceParams:a,envParams:c,end:Math.min(d,u>-1/0?u:1/0),seriesOf:t=>e.cells.has(t)?o(t,null,0,1):Zs},p={swing:/* @__PURE__ */ new Map,depth:/* @__PURE__ */ new Map};for(let t of e.cells.values()){let e=[[`swing`,t.meter?t.swingMoves:void 0],[`depth`,t.bend?.depth]];for(let[n,r]of e)if(r)try{p[n].set(t.name,{range:r.range,series:r.factors.map(e=>o(e,null,0,1)),env:null})}catch(e){if(!(e instanceof js))throw e}}return(p.swing.size||p.depth.size)&&os(e,t,(e,t,n)=>{let r=p[t].get(e);return r?Bs(f,r,n):NaN}),f}function vc(e,t,n,r){let i=n&&t?e.envParams.get(t):void 0;if(!i)return n;let a={...n};for(let[t,n]of Object.entries(i)){let i=Bs(e,n,r);t===`attack`||t===`decay`||t===`release`?a[t]=Math.max(0,i):t===`sustain`&&(a.sustain=Math.min(1,Math.max(0,i)))}return a}function yc(e,t){let n=e.cells.get(t)?.env,r=n?e.cells.get(n):void 0;return r?.map?.kind===`adsr`?_t(r):null}function bc(e,t,n){if(!t.kit)return{voice:t.voice,freq:e.cells.get(t.voice).freq};let r=e.cells.get(t.voice),i=r.units[mn(Math.round(n),r.units.length)];return i?.atom.kind===`ref`?{voice:i.atom.name,freq:e.cells.get(i.atom.name).freq}:null}function xc(e,t,n){let r=t?e.cells.get(t)?.params.anchor:void 0;if(typeof r!=`number`)return 0;let i=e=>Math.floor(e)*3600+Math.round(e%1*100)*60;return Math.round(((i(r)-i(n.origin))%86400+86400)%86400/n.stepSeconds)}let Sc=/* @__PURE__ */ new WeakMap,Cc=/* @__PURE__ */ new WeakMap,wc=e=>(Cc.has(e)||Cc.set(e,Tc.n++),Cc.get(e)),Tc={n:0};function Ec(e,t){if(Sc.has(t))return Sc.get(t);let n=(()=>{let n=e.cells.get(t.cell)?.fill,r=n?.fragment?Cr(e,n.fragment):void 0,i=e.codes;if(!n||!r||!i||r.fills[n.name??``]?.lap===void 0)return null;let a=t.levels.map(e=>e.cell).filter(t=>e.cells.get(t)?.fill?.fragment===n.fragment),o=/(^|\s)fill\([^)]*\).*$/,s=e=>[...(i.get(e)??``).replace(o,``).matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map(e=>e[1]).filter(t=>t!==e&&i.has(t)),c=[];for(let e=[t.cell,...a];e.length;){let t=e.shift();c.includes(t)||(c.push(t),e.push(...s(t)))}let l=c.map(t=>({name:t,code:i.get(t),fill:e.cells.get(t)?.fill?.name??null}));return{law:r,clock:n.clock,head:t.cell,levels:a,cells:l,key:`${r.fragment}#${wc(r)}\n${l.map(e=>e.code).join(`
`)}`}})();return Sc.set(t,n),n}let Dc=/* @__PURE__ */ new Map;function Oc(e,t){let n=Er(e.law),r=Math.round(e.law.cycle/n),i=(t%r+r)%r,a=`${e.key}\n${i}`,o=Dc.get(a);if(o)return o;let s=e.cells.map(({code:t,fill:r})=>{let a=r===null?void 0:e.law.fills[r]?.lap;if(r===null)return t;let o=Dr(e.law.fill(r,a?Math.floor(i*n/a):0,{}));return t.replace(/(^|\s)step=\S+/,`$1step=1`).replace(/(^|\s)fill\([^)]*\).*$/,`$1${o}`)}),c=[e.head,...e.levels,`lapVoice`].map(e=>`&${e}`).join(` * `),l=bo(ld(`${s.join(`
`)}\n&lapVoice s=sine loop=C4\n&lapOut map=sample [${c}]`),ut);if(!l.ok)throw Error(`${e.law.fragment}, lap ${i}: ${l.diagnostics.map(e=>e.message).join(`; `)}`);let u=lt(l),d=l.cells.get(`lapVoice`).freq,f=Ac(_c(l,u),0,n).map(e=>({step:e.at,dur:e.dur,ratio:e.freq/d,level:e.levels[0]?.level??0,gains:e.gains})).sort((e,t)=>e.step-t.step||e.ratio-t.ratio);return Dc.size>=96&&Dc.delete(Dc.keys().next().value),Dc.set(a,f),f}function kc(e,t,n){let r=Er(e.law),i=[];for(let a=Math.floor(t/r);a*r<n;a++)for(let o of Oc(e,a)){let e=a*r+o.step;e>=t&&e<n&&i.push({...o,step:e})}return i}function Ac(e,t,n,r=!1,i={}){let a=t=>Ec(e.result,t.output)!==null,o=e.tracks.filter(e=>!e.output.tape&&!a(e)),s=e.tracks.filter(e=>e.output.tape),c=Ic({...e,tracks:o},t,n,r);e.drones.length&&(c.push(...Rc(e,t,n,r,i)),c.sort((e,t)=>e.at-t.at));for(let i of e.result.outputs){let a=Ec(e.result,i);if(!a)continue;let o=a.law,s=lc(i,e.muted),l=i.midi?pc(i,e.muted):[],u=dc(s);if(!u&&!l.length)continue;let d=e.result.cells.get(i.voice)?.freq||261.63,f=xc(e.result,a.clock,o),p=o.stepSeconds;for(let o of kc(a,Math.ceil(t/p-1e-9)+f,Math.ceil(n/p-1e-9)+f)){let t=(o.step-f)*p;c.push({at:t,dur:o.dur*p,voice:i.voice,freq:d*o.ratio,bends:[],gains:[s[0]*o.gains[0]*oc(e.result,i.voice),s[1]*o.gains[1]*oc(e.result,i.voice)],levels:[{at:t,level:o.level}],...u?{}:{unheard:!0},...l.length?{midi:l}:{},...r?{output:i.id}:{}})}}if(!s.length)return c;let l=hs(e.result,e.statics);for(let i of s){let a=i.output.tape,o=e.result.cells.get(a.tape),{pos:s,real:u,speed:d,moving:f}=Es(e.result,l,a.tape),p=typeof o?.params.varispeed==`number`?o.params.varispeed:0,m=1-a.erase,h=a.length>0?Math.min(40,m>0?Math.ceil(Math.log(.02)/Math.log(m)):1):1,g={...i,output:{...i.output,tape:void 0}};for(let i=0;i<h;i++){let o=a.at+i*a.length,l=m**+i,h=u(s(t)-o),_=u(s(n)-o);if(!(_>0)||!Number.isFinite(_))continue;let v=e=>u(s(e)+o);for(let i of Ic({...e,tracks:[g]},Math.max(0,h),_,r)){let e=v(i.at);if(!(e>=t&&e<n)||!Number.isFinite(e))continue;let r=v(i.at+i.dur);if(f&&d(i.at)<.05)continue;let a=p?Math.min(4,Math.max(.25,(d(e)/d(i.at))**+p)):1;c.push({...i,at:e,dur:Math.max(.01,(Number.isFinite(r)?r:e+i.dur)-e),freq:i.freq*a,bends:i.bends.map(e=>({...e,at:v(e.at)})),levels:i.levels.map(e=>({...e,at:v(e.at)})),gains:[i.gains[0]*l,i.gains[1]*l],...i.params?{params:jc(i.params,v)}:{},...i.through?{through:i.through.map(e=>e.params?{...e,params:jc(e.params,v)}:e)}:{}})}}}return c.sort((e,t)=>e.at-t.at)}let jc=(e,t)=>Object.fromEntries(Object.entries(e).map(([e,n])=>[e,n.kind===`points`?{...n,points:n.points.map(e=>({...e,at:t(e.at)}))}:n]));function Mc(e,t,n,r){let i=[...t.through].reverse().filter(t=>{let n=e.result.cells.get(t);return!!n&&[...Object.keys(n.params),...Object.keys(n.paramCells),...Object.keys(n.paramClocks)].some(e=>Le.has(e))}).map(t=>{let i=Vs(e,t,n,r);return{instrument:t,...i?{params:i}:{}}});return i.length?{through:i}:{}}function Nc(e){let[t,n,r,i]=[0,1,1,0],a=e;for(let o=0;o<32;o++){let o=Math.floor(a+1e-12);if([t,n]=[n,o*n+t],[r,i]=[i,o*i+r],i>1e4)return[t,r];if(Math.abs(e-n/i)<1e-9)break;a=1/(a-o)}return[n,i]}let Pc=(e,t)=>t===0?e:Pc(t,e%t);function Fc(e,t){let[n,r]=Nc(e-Math.floor(e)),[i,a]=Nc(Math.max(0,t-Math.floor(t))),o=r*a/Pc(r,a);return Pc(Pc(o/r*n,o/a*i),o)/o}function Ic(e,t,n,r){let i=[],{result:a,statics:o}=e,s=hs(a,o);for(let o of e.tracks){let c=s.map(o.clock),l=Math.min(n,o.end);if(l<=t)continue;let u=c.stepAt(Math.max(0,t))*o.rate,d=c.stepAt(Math.max(0,l))*o.rate;if(!Number.isFinite(u)||!Number.isFinite(d)||d<=u)continue;let f=(t,n)=>{let r=o.share;if(typeof r==`number`)return r;let i=r.series.reduce((t,r)=>{let i=Ks(e,r,n);return t*(i?i.value+i.alter:1)},1);return r.range?r.range[0]+(r.range[1]-r.range[0])*i:i},p=t=>{let n=o.place;return n===null?[1,1]:st(typeof n==`number`?n:Bs(e,{range:n.range,series:n.series,env:null},t))},m=(t,n,i,l=1/0)=>{let u=Fc(t,n.duration)/o.rate,d=c.q(t/o.rate,u);if(!Number.isFinite(d)||d>=o.end-1e-9)return null;let m=f(t,d),h=Math.min(c.q((m===1?i:t+m*(i-t))/o.rate,u),l<1/0?c.q(l/o.rate):1/0,o.end),g=o.picker?Ks(e,o.picker,d):n,_=g&&bc(a,o.output,g.value);if(!_||e.muted.has(Z(_.voice)))return null;let v=vc(e,o.output.envelope?o.output.envelopeCell:o.output.kit?a.cells.get(_.voice)?.env:null,o.output.envelope??(o.output.kit?yc(a,_.voice):null),d),y=a.cells.get(_.voice)?.oneshot?v??yc(a,_.voice):null,b=y?y.attack+y.decay:Number.isFinite(h)?h-d:8,x=o.output.kit&&!o.picker||o.output.gate?o.output.offset:o.sign*Hs(e,n,d)+o.output.offset,S=[];if(o.mods.length){let t=o.mods.map(t=>Us(e,t,d,d+b)),n=t.reduce((e,t)=>e+t[0].semis,0);x+=n;let r=[...new Set(t.flatMap(e=>e.slice(1).map(e=>e.at)))].sort((e,t)=>e-t);for(let e of r){let r=t.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9)),i=t.reduce((t,n)=>t+Xs(n,e,e=>e.semis),0);S.push({at:e,cents:100*(i-n),...r?{ramp:r}:{}})}}let C=ms(a,o.clock);if(C&&c.speed&&!o.output.gate){let e=e=>Math.max(.001,c.speed(e)),t=e(d);if(t<.05)return null;if(x+=12*C*Math.log2(t),!S.length)for(let n=d+.04,r=0;n<d+b&&r<400;n+=.04,r++){let r=1200*C*Math.log2(e(n)/t);Math.abs(r)>1&&S.push({at:n,cents:r,ramp:!0})}}let w=o.db?10**((n.value+n.alter)/20):Math.max(0,n.value+n.alter),T=[{at:d,level:(o.output.gate?w:1)*(n.level??1)}];if(o.levels.length){let n=s.written(o.clock).q(t/o.rate),r=o.levels.map(t=>Js(e,t,d,d+b,n)),i=[...new Set(r.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t),a=T[0].level;T.length=0;for(let e of i)T.push({at:e,level:a*r.reduce((t,n)=>t*Xs(n,e,e=>e.level),1),...r.some(t=>t.some(t=>t.ramp&&Math.abs(t.at-e)<1e-9))?{ramp:!0}:{}})}let E=_.freq*2**(x/12),D=Vs(e,_.voice,d,b),O=v,k=e=>{let t=oc(a,_.voice);if(!o.output.kit)return[e[0]*t,e[1]*t];let[n,r]=st(a.cells.get(_.voice)?.params.pan);return[e[0]*n*t,e[1]*r*t]},[A,j]=sc(e,[_.voice,...o.output.through],d),[M,N]=p(d),P=k(lc(o.output,e.muted)),F=[P[0]*A*M,P[1]*j*N],I=o.output.midi?pc(o.output,e.muted):[];return E>0&&E<2e4&&T.some(e=>e.level>0)?{at:d,dur:b,voice:_.voice,freq:E,bends:S,value:n.value+n.alter,gains:F,levels:T,...!o.output.silent&&!dc(F)?{unheard:!0}:{},...I.length?{midi:I}:{},...O?{env:O}:{},...o.output.through.length?{instrument:o.output.through[0]}:{},...D?{params:D}:{},...Mc(e,o.output,d,b),...r?{output:o.output.id}:{}}:null},h=o.output.kit||o.output.gate?0:a.cells.get(o.output.voice)?.glide??0,g=h>0,_=o.events.length,v=e=>(e===0||o.events[e-1].step!==o.events[e].step)&&(e===_-1||o.events[e+1].step!==o.events[e].step),y=(e,t)=>e>0?[e-1,t]:[_-1,t-1],b=(e,t,n,r,i)=>{if(!g||!v(e)||mn(t*_+e,256)===0)return!1;let[s,l]=y(e,t),u=l*o.period+o.events[s].step+o.events[s].duration,d=t*o.period+o.events[e].step;return v(s)&&l>=n&&r+l*o.period+o.events[s].step>=i-1e-9&&Math.abs(u-d)<1e-9&&f(r+l*o.period+o.events[s].step,c.q((r+l*o.period+o.events[s].step)/o.rate,Fc(r+l*o.period+o.events[s].step,o.events[s].duration)/o.rate))>=1-1e-9&&!!ec(a,o,o.events[s],l)},x=(e,t,n,r=-1,s=0,c=0,l=0,u=1/0,d=-1/0)=>{if(r>=0&&b(r,s,l,c,d))return;let f=m(e,t,n,u);if(!f)return;if(r<0||!g||!v(r))return void i.push(f);let p=f,y=[{at:f.at,dur:f.dur,freq:f.freq,bends:f.bends}],[x,S]=[r,s];for(let e=0;e<256;e++){[x,S]=x<_-1?[x+1,S]:[0,S+1];let e=c+S*o.period+o.events[x].step;if(e>=u-1e-9||!b(x,S,l,c,d))break;let t=ec(a,o,o.events[x],S),n=t&&m(e,t,e+o.events[x].duration,u);if(!n)break;let r=1200*Math.log2(n.freq/p.freq),i=p.bends.length?p.bends[p.bends.length-1].cents:0,s=Math.min(h,n.dur);p={...p,dur:n.at+n.dur-p.at,bends:[...p.bends,{at:n.at,cents:i},{at:n.at+s,cents:r,ramp:!0},...n.bends.map(e=>({...e,at:Math.max(e.at,n.at+s),cents:e.cents+r}))],levels:[...p.levels,...n.levels.filter(e=>e.at>=n.at)]},y.push({at:n.at,dur:n.dur,freq:n.freq,bends:n.bends})}i.push(y.length>1?{...p,legato:{glide:h,notes:y}}:p)};if(o.selects.length===0){for(let e=Math.floor(u/o.period)-1;e*o.period<d;e++)for(let[t,n]of o.events.entries()){let r=e*o.period+n.step;if(r<u-1e-9||r>=d-1e-9)continue;let i=ec(a,o,n,e);i&&x(r,i,r+n.duration,t,e)}continue}let S=nc(a,o.output.select),C=e=>e.reduce((e,t)=>{let n=e[e.length-1];return n&&Math.abs(t.a-n.b)<1e-9?e[e.length-1]={a:n.a,b:t.b}:e.push(t),e},[]),w=(t,n)=>{let r=o.output.select[t],i=rc(e,o.selects[t],n,l),s=a.cells.get(r.part)?.params.restart??a.cells.get(r.cell)?.params.restart;return r.performer&&s!==`restart`?C(i):i},T=(e=>{let t=w(0,e);for(let n of o.selects.keys()){if(n===0)continue;let r=w(n,e);t=t.flatMap(e=>r.flatMap(t=>Math.max(e.a,t.a)<Math.min(e.b,t.b)?[{a:Math.max(e.a,t.a),b:Math.min(e.b,t.b)}]:[]))}return S===`restart`?t:C(t)})(S===`resume`?0:t),E=0;for(let e of T){let t=c.stepAt(e.a)*o.rate,n=c.stepAt(e.b)*o.rate,r=S===`free`?0:S===`resume`?t-E:t;E+=n-t;let i=Math.max(u,t),s=Math.min(d,n);if(!(s<=i))for(let e=Math.floor((i-r)/o.period)-1;r+e*o.period<s;e++)for(let[c,l]of o.events.entries()){let u=r+e*o.period+l.step;if(e<0||u<i-1e-9||u>=s-1e-9)continue;let d=ec(a,o,l,e);d&&x(u,d,u+l.duration,c,e,r,0,n,t)}}}return i.sort((e,t)=>e.at-t.at)}function Lc(e,t,n,r){let i=[...new Set(e.flatMap(e=>e.map(e=>e.at)))].sort((e,t)=>e-t),a=e.map(()=>0),o=[];for(let s of i){let i=r,c=!1;e.forEach((e,r)=>{let o=a[r];for(;o+1<e.length&&e[o+1].at<=s+1e-9;)o++;a[r]=o;let l=e[o],u=e[o+1],d=!u?.ramp||Math.abs(l.at-s)<1e-9?t(l):t(l)+(t(u)-t(l))*(s-l.at)/Math.max(Jo,u.at-l.at);i=n(i,d),l.ramp&&Math.abs(l.at-s)<1e-9&&(c=!0)}),o.push({at:s,value:i,...c?{ramp:c}:{}})}return o}function Rc(e,t,n,r,i){let a=Math.max(0,i.begins??0),o=Math.min(e.end,i.until??1/0),s=[];for(let i=Math.max(0,Math.floor((t-a)/600));a+i*600<Math.min(n,o);i++){let n=a+i*600;if(n<t-1e-9)continue;let c=Math.min(600,o-n);if(c>0)for(let t of e.drones){let i=t.output,a=e.result.cells.get(i.voice);if(!a)continue;let o=Lc(t.mods.map(t=>Us(e,t,n,n+c)),e=>e.semis,(e,t)=>e+t,0),l=o[0]?.value??0,u=o.slice(1).map(e=>({at:e.at,cents:100*(e.value-l),...e.ramp?{ramp:!0}:{}})),d=t.levels.length?Lc(t.levels.map(t=>Js(e,t,n,n+c)),e=>e.level,(e,t)=>e*t,1).map(e=>({at:e.at,level:e.value,...e.ramp?{ramp:!0}:{}})):[{at:n,level:1}],f=a.freq*2**((i.offset+l)/12);if(!(f>0&&f<2e4)||!d.some(e=>e.level>0))continue;let[p,m]=sc(e,[i.voice,...i.through],n),h=lc(i,e.muted),g=[h[0]*p,h[1]*m],_=i.midi?pc(i,e.muted):[],v=Vs(e,i.voice,n,c);s.push({at:n,dur:c,voice:i.voice,freq:f,bends:u,gains:g,levels:d,held:!0,...!i.silent&&!dc(g)?{unheard:!0}:{},..._.length?{midi:_}:{},...i.envelope?{env:vc(e,i.envelopeCell,i.envelope,n)}:{},...i.through.length?{instrument:i.through[0]}:{},...v?{params:v}:{},...Mc(e,i,n,c),...r?{output:i.id}:{}})}}return s}function zc(e){return e.ends===null?e.cycle!==null&&Number.isFinite(e.cycle)&&e.cycle<=1800?e.cycle:e.longest:e.ends}function Bc(e){let[t,n,r,i]=[0n,1n,1n,0n],a=e;for(let o=0;o<32;o++){let o=BigInt(Math.floor(a));if([t,n]=[n,o*n+t],[r,i]=[i,o*i+r],i>10000n)return[t,r];let s=a-Math.floor(a);if(s<1e-9||Math.abs(Number(n)/Number(i)-e)<1e-9*Math.max(1,e))break;a=1/s}return[n,i]}let Vc=(e,t)=>t===0n?e:Vc(t,e%t);function Hc(e,t){let n=Tr(e);if(n){let e=n.cycle*n.stepSeconds;return{ends:e,cycle:e,chance:!1,longest:e}}let r=lt(e),i=_c(e,r),a=hs(e,r),o=(e,t)=>{if(!e)return null;let n=a.map(e),r=n.q(t)-n.q(0);return Number.isFinite(r)&&r>1e-6?r:null},s=[],c=!1,l=t=>{let n=e.clocks.get(t),r=n?.tap?.meter??n?.belt?.driver;return r&&r!==t?l(r):t},u=new Set(i.tracks.map(e=>l(e.clock))),d=e=>u.has(l(e));for(let e of i.tracks){let t=o(e.clock,e.period/e.rate),n=e.events.reduce((e,t)=>t.laps?Number(BigInt(e)*BigInt(t.laps.of)/Vc(BigInt(e),BigInt(t.laps.of))):e,1);t&&s.push(t*n),e.events.some(e=>e.chance!==void 0||e.options||e.chosen)&&(c=!0);for(let t of[...e.mods.filter(e=>e.clock&&d(e.clock)),...e.levels,...e.selects.map(e=>e.series)]){let e=t.clock?o(t.clock,t.period/t.rate):null;e&&s.push(e)}}for(let e of i.voiceParams.values())for(let t of Object.values(e))for(let e of t.series){let t=e.clock&&d(e.clock)?o(e.clock,e.period/e.rate):null;t&&s.push(t)}let f=new Set([...e.cells.values()].flatMap(e=>e.over?[e.over]:[]));for(let t of e.cells.values()){if(!f.has(t.name)||!t.step||!t.clock||t.loops||e.clocks.has(t.name)||!t.cycle)continue;let n=o(t.clock,1/t.rate);if(!n)continue;let r=Math.max(1,Math.abs(Math.round(t.stride||1)));if(t.wrap===0)continue;let{per:i,laps:a}=xs(e,t),c=Math.max(1,Math.round(a*Ss(e,t.name))),l=i??c/Number(Vc(BigInt(c),BigInt(r)));s.push(n*l)}t?.push(...s);let p=Number.isFinite(i.end)?i.end:null,m=s.length?Math.max(...s):null;if(s.length===0)return{ends:p,cycle:null,chance:c,longest:m};let h=1n,g=0n;for(let e of s){let[t,n]=Bc(e);t!==0n&&(h=h/Vc(h,t)*t,g=g===0n?n:Vc(g,n))}return{ends:p,cycle:g===0n?null:h/g>10n**18n?1/0:Number(h)/Number(g),chance:c,longest:m}}let Uc=[{note:35,name:`acousticbassdrum`,aliases:[]},{note:36,name:`bd`,aliases:[`kick`,`kd`,`bassdrum`]},{note:37,name:`rim`,aliases:[`rs`,`sidestick`]},{note:38,name:`sd`,aliases:[`snare`,`acousticsnare`]},{note:39,name:`cp`,aliases:[`clap`,`handclap`]},{note:40,name:`electricsnare`,aliases:[]},{note:41,name:`lt`,aliases:[`lo`,`lowfloortom`]},{note:42,name:`hh`,aliases:[`ch`,`closedhihat`]},{note:43,name:`highfloortom`,aliases:[]},{note:44,name:`ph`,aliases:[`pedalhihat`]},{note:45,name:`mt`,aliases:[`tom`,`mid`,`lowtom`]},{note:46,name:`oh`,aliases:[`openhihat`]},{note:47,name:`lowmidtom`,aliases:[]},{note:48,name:`ht`,aliases:[`hi`,`himidtom`]},{note:49,name:`cr`,aliases:[`crash`,`crashcymbal`]},{note:50,name:`hightom`,aliases:[]},{note:51,name:`rd`,aliases:[`ride`,`ridecymbal`]},{note:52,name:`chinesecymbal`,aliases:[]},{note:53,name:`ridebell`,aliases:[]},{note:54,name:`tb`,aliases:[`tambourine`]},{note:55,name:`splashcymbal`,aliases:[]},{note:56,name:`cb`,aliases:[`cowbell`]},{note:57,name:`crashcymbaltwo`,aliases:[]},{note:58,name:`vibraslap`,aliases:[]},{note:59,name:`ridecymbaltwo`,aliases:[]},{note:60,name:`hibongo`,aliases:[]},{note:61,name:`lowbongo`,aliases:[]},{note:62,name:`mutehiconga`,aliases:[]},{note:63,name:`openhiconga`,aliases:[]},{note:64,name:`lowconga`,aliases:[]},{note:65,name:`hightimbale`,aliases:[]},{note:66,name:`lowtimbale`,aliases:[]},{note:67,name:`highagogo`,aliases:[]},{note:68,name:`lowagogo`,aliases:[]},{note:69,name:`cabasa`,aliases:[]},{note:70,name:`sh`,aliases:[`maracas`]},{note:71,name:`shortwhistle`,aliases:[]},{note:72,name:`longwhistle`,aliases:[]},{note:73,name:`shortguiro`,aliases:[]},{note:74,name:`longguiro`,aliases:[]},{note:75,name:`claves`,aliases:[`clave`]},{note:76,name:`hiwoodblock`,aliases:[]},{note:77,name:`lowwoodblock`,aliases:[]},{note:78,name:`mutecuica`,aliases:[]},{note:79,name:`opencuica`,aliases:[]},{note:80,name:`mutetriangle`,aliases:[]},{note:81,name:`opentriangle`,aliases:[]}],Wc=new Map(Uc.flatMap(({note:e,name:t,aliases:n})=>[t,...n].map(t=>[t,e])));new Map(Uc.map(({note:e,name:t})=>[e,t]));function Gc(e){return Wc.get(e.toLowerCase().replace(/\d+$/,``))??null}function Kc(e,t){let n=/* @__PURE__ */ new Map;for(let r of e){let e=t(r);e!=null&&n.set(r,e)}let r=new Set(n.values()),i=36;for(let t of e)if(!n.has(t)){for(;i<=127&&r.has(i);)i++;if(i>127)break;n.set(t,i),r.add(i)}return n}2**({cents:.5,db:.1,seconds:25e-5,silent:1e-5}.cents/1200)-1;function qc(e){let t=e.split(`
`),n=Jc(e),r=[],i=e=>t[e.span.line-1]?.substr(e.span.col-1,e.span.len)??``,a=(e,n)=>{if(e.span.col-1+e.span.len>(t[e.span.line-1]?.length??0)||n&&e.atom.kind===`ref`)return null;let r=i(e);if(e.repeat>1){if(!r.endsWith(`!${e.repeat}`))return null;r=r.slice(0,-`!${e.repeat}`.length)}let a=/^([^\s*!@]+)\*([0-9]+)$/.exec(r);return{base:a&&e.subdivide>1&&e.atom.kind!==`ref`?`[${a[1]}!${a[2]}]`:r,n:e.repeat}},o=(e,n)=>{for(let i=0;i<e.length;){let s=e[i],c=a(s,n),l=i+1,u=c?.n??1;if(c)for(;l<e.length;l++){let r=e[l],i=a(r,n),o=e[l-1],s=r.span.line===o.span.line&&r.span.col>=o.span.col+o.span.len?t[r.span.line-1].slice(o.span.col-1+o.span.len,r.span.col-1):null;if(!i||i.base!==c.base||s===null||s.trim())break;u+=i.n}let d=e[l-1],f=c?`${c.base}${u>1?`!${u}`:``}`:null,p=d.span.col-1+d.span.len-(s.span.col-1);if(f!==null&&d.span.line===s.span.line&&f!==t[s.span.line-1].substr(s.span.col-1,p))r.push({line:s.span.line,col:s.span.col,len:p,to:f});else if(l===i+1&&s.atom.kind===`seq`)for(let e of s.atom.layers)o(e,!0);i=l}},s=/* @__PURE__ */ new Set([`adsr`,`ratios`,`role`,`style`,`table`]);for(let t of ld(e).cells)t.braid.kind===`list`&&!n.has(t.name)&&t.cycle===null&&!(t.map&&s.has(t.map.kind))&&o(t.braid.tokens,!1);r.sort((e,t)=>t.line-e.line||t.col-e.col);for(let e of r){let n=t[e.line-1];t[e.line-1]=n.slice(0,e.col-1)+e.to+n.slice(e.col-1+e.len)}return t.join(`
`)}let Jc=e=>new Set([...e.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)\[/g)].map(e=>e[1])),Yc=e=>{let t=e;return!!t&&typeof t==`object`&&typeof t.name==`string`&&typeof t.span?.line==`number`&&!(`braid`in t)&&!(`units`in t)},Xc=e=>{let t=e;return!!t&&typeof t==`object`&&t.kind===`ref`&&typeof t.name==`string`},Zc=e=>{let t=e?.span;return t&&typeof t.line==`number`?t:void 0},Qc=e=>e.split(`.`).filter(e=>!/^\d+$/.test(e)).slice(0,2).join(`.`);function $c(e){let t=[],n=/* @__PURE__ */ new Set,r=(e,i,a)=>{if(!e||typeof e!=`object`||n.has(e))return;n.add(e);let o=i.join(`.`);if(Yc(e)){t.push({name:e.name,path:o,form:Qc(o),ref:e,span:e.span});return}if(Xc(e)){t.push({name:e.name,path:o,form:Qc(o),ref:e,span:a});return}let s=Zc(e)??a;for(let[t,n]of Object.entries(e))t!==`span`&&t!==`paramSpans`&&r(n,[...i,t],s)};return r(e,[],e.span),t}let el=`__wire_arg`,tl=/^(-?(\d+(\.\d+)?|\.\d+)(\/\d+)?|[A-Za-z_][A-Za-z0-9_#-]*)$/;function nl(e){for(let t=1;t<=64;t++){let n=Math.round(e*t);if(Math.abs(n/t-e)<1e-9)return t===1?String(n):`${n}/${t}`}return null}let rl=e=>{let t=nl(e.value),n=e.alter+(e.transpose??0);return t===null||!Number.isInteger(n)?null:`${t}${n>0?`#`.repeat(n):`b`.repeat(-n)}`};function il(e,t){if(tl.test(e))return{text:e};if(/\bfree\(/.test(e))return{refused:`free() is a hand, and a plugin is handed no hands (wire 1)`};let n,r;try{let i=ld(`${t}\n&${el} ${e}`);r=new Map(i.cells.map(e=>[e.name,e])),n=bo(i,ut)}catch(t){return{refused:`${e} doesn't read: ${t instanceof Error?t.message:String(t)}`}}let i=t.split(`
`).length+1,a=n.diagnostics.filter(e=>e.severity===`error`&&e.span.line===i);if(a.length||!n.cells.has(el))return{refused:`${e} doesn't read: ${a[0]?.message??`no cell`}`};let o=[...n.cells.values()].find(t=>t.fill&&RegExp(`&${t.name}(?![A-Za-z0-9_])`).test(e));if(o)return{refused:`&${o.name} is a fill with no answer to hand (a stream's, or one refused): a braid fill is handed answers (wire 1)`};let s=lt(n),c;try{c=Ms(n,el,s)}catch(t){return{refused:`${e} doesn't read: ${t instanceof Error?t.message:String(t)}`}}let l=Os(n,el,null);if(c.some(e=>e.chance!==void 0||e.options||e.chosen))return{refused:`${e} draws by chance, and a plugin can't draw cells' (wire 1)`};if(c.some(e=>e.named))return{refused:`${e} names a note: write it as a degree (wire 1)`};if(c.some(e=>e.laps||e.via||e.reads))return{refused:`${e} changes from lap to lap, or reads a value as it moves: a braid fill is filled once (wire 1)`};if(c.some(e=>(n.cells.get(e.cell)?.frees.length??0)>0))return{refused:`free() is a hand, and a plugin is handed no hands (wire 1)`};let u=[...new Set(c.map(e=>e.step))].sort((e,t)=>e-t),d=[],f=0;for(let t of u){let n=c.filter(e=>e.step===t),r=n[0].duration;if(n.some(e=>Math.abs(e.duration-r)>1e-9)||t<f-1e-9)return{refused:`${e} overlaps its own notes: a flat braid can't write it (wire 1)`};t>f+1e-9&&d.push(`~${al(t-f)}`);let i=n.map(rl);if(i.some(e=>e===null)||nl(r)===null||nl(t)===null)return{refused:`${e} has a step the wire can't write`};d.push(`${i.length===1?i[0]:`[${i.join(`, `)}]`}${al(r)}`),f=t+r}l>f+1e-9&&d.push(`~${al(l-f)}`);let p=d.join(` `),m=[...new Set(c.map(e=>`${e.table}|${e.tableShift}`))];if(m.length>1)return{refused:`${e} is read over ${m.length} keys: a plugin is handed one (wire 1)`};let h=c[0]?.table,g=h?n.cells.get(h):void 0;if(!h||!g||g.root)return{text:p};if(ol(No(n,h),r))return{refused:`${e} is read over a key that moves, and a plugin is handed one key (wire 1)`};let _=c[0].tableShift;return{text:p,key:Array.from({length:Oo(n,h,0).length},(e,t)=>{let r=Ao(n,h,_,t,0,s);return nl(jo(n,r.root,r.position))??String(jo(n,r.root,r.position))}).join(` `)}}let al=e=>Math.abs(e-1)<1e-9?``:`@${nl(e)??e}`;function ol(e,t){let n=/* @__PURE__ */ new Set;for(let r=[...e];r.length;){let e=r.shift();if(n.has(e))continue;n.add(e);let i=t.get(e);if(i){if(i.step)return!0;r.push(...$c(i).map(e=>e.name))}}return!1}let sl=e=>`a1:${wl(JSON.stringify(Object.keys(e).sort().map(t=>[t,e[t]])))}`;function cl(e,t,n){let r=e.map((e,n)=>t(n)?(e.from.names??[]).map(e=>e.slice(1)):[]),i=e.map(e=>[...[...(e.from.args??[]).map(e=>e.value),e.from.main??``].join(` `).matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map(e=>e[1])),a=e.map((t,n)=>e.flatMap((e,t)=>t!==n&&r[t].some(e=>i[n].includes(e))?[t]:[])),o=[],s=new Set(e.map((e,t)=>t));for(;s.size;){let t=[...s].find(e=>a[e].every(e=>!s.has(e)));if(t===void 0){let t=[...s];for(let r of t){let t=a[r].find(e=>s.has(e));t!==void 0&&n(r,`${Q(e[r].id)} and ${Q(e[t].id)} read each other's fills: neither can be answered first (decision 085 §8.3)`)}o.push(...t);break}o.push(t),s.delete(t)}return o}let ll=e=>e.split(`
`).filter(e=>!Oe(Ae(e)[0].trim())).join(`
`),ul=/(^|\s)fill\(\s*\)/,dl=(e,t)=>e.map(e=>({...e,origin:[t,...e.origin??[]]})),fl=/^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/,pl=/&([A-Za-z_][A-Za-z0-9_]*)/g,ml=/[+*,[]\s*$/;function hl(e){let t=[],n=null;return e.split(`
`).forEach((e,r)=>{let i=Ae(e)[0];if(n??={written:[],code:[],line:r+1},n.written.push(e),n.code.push(i),ml.test(i))return;let a=n.code.join(` `).trim().split(/\s+/).join(` `);a&&t.push(gl(a,n.written.join(`
`),n.line)),n=null}),t}function gl(e,t=e,n=0){let r=Oe(e);if(r!==void 0)return{name:null,from:r,reads:[],written:t,code:e,line:n};let i=fl.exec(e),a=i?[...new Set([...e.slice(i[0].length).matchAll(pl)].map(e=>e[1]))]:[];return{name:i?.[1]??null,reads:a,written:t,code:e,line:n}}function _l(e,t){let n=hl(e),r=yl(n.flatMap(e=>e.from?.kind===`signature`?[{line:e,sig:e.from}]:[]),e=>e.sig),i=r.find(e=>e.sig.names.includes(`&${t}`));if(!i)return null;if(r.length===1)return e;let{line:a,sig:o}=i,s=o.main?o.main.slice(1):null,c=/* @__PURE__ */ new Map;for(let e of n)if(e.name)c.set(e.name,e);else if(e.from?.kind===`use`)for(let t of e.from.names??[])c.set(t.slice(1),e);let l=e=>e.from?.kind===`use`?[...e.code.slice(e.code.search(/\sfrom\s/)).matchAll(pl)].map(e=>e[1]):e.reads,u=/* @__PURE__ */ new Set,d=/* @__PURE__ */ new Set;for(let e=[...o.names,...o.optional].map(e=>e.slice(1));e.length;){let t=e.shift();if(d.has(t)||t===s)continue;d.add(t);let n=c.get(t);n&&!u.has(n)&&(u.add(n),e.push(...l(n)))}return[a.written.trim(),...n.filter(e=>u.has(e)).map(e=>e.written)].join(`
`)}let vl=e=>yl(hl(e).flatMap(e=>e.from?.kind===`signature`?[e.from]:[])).map(e=>e.names.map(e=>e.slice(1)));function yl(e,t=e=>e){let n=/* @__PURE__ */ new Set;return e.filter(e=>{let r=t(e),i=JSON.stringify([r.names,r.optional,r.main]);return!n.has(i)&&(n.add(i),!0)})}function bl(e,t,n,r){let i=vl(t);if(i.length<2)return{text:t};let a=i.map(e=>e.map(e=>`&${e}`).join(`, `)).join(` · `),o=(n.takes??n.names)?.[0]?.slice(1);if(!o)return r(`${Q(e)} gives ${i.length} parts, each taken by its head (${a}): name one, not *`),null;let s=_l(t,o);return s===null?(r(`${Q(e)} gives no part headed &${o}: its parts are ${a}`),null):{text:s,part:o}}let xl=e=>/^\s*(?:\*|&[A-Za-z_][A-Za-z0-9_]*)(?=[\s,=]).*\sfrom(?:\s|$)/m.test(e),Sl=e=>e.split(`
`).flatMap(e=>{let t=Oe(Ae(e)[0].trim());return t?.kind===`signature`?t.names:[]});function Cl(e){for(let t of hl(e))if(t.from?.kind===`signature`)return t.from;return null}function wl(e){let t=2166136261,n=1523705862;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);t=Math.imul(t^i,16777619),n=Math.imul(n^i,16777619)^n>>>15}return(t>>>0).toString(16).padStart(8,`0`)+(n>>>0).toString(16).padStart(8,`0`)}let Tl=e=>`e1:${wl(hl(e).map(e=>e.code).join(`
`))}`;function El(e){let t=ve(e),n=t.findIndex(e=>e.text===`from`);if(n<1)return e;let r=t.slice(n+1),i=e=>r[e]?.text===`*`&&r[e-1]?.text.startsWith(`style=`)||r[e-1]?.text===`*`&&r[e-2]?.text.startsWith(`style=`);if(t[0].text===`*`&&n===1&&r.every((e,t)=>Te(e.text)||i(t)))return null;if(r.length&&!r[0].text.startsWith(`(`)&&!r[0].text.startsWith(`&`)&&!Te(r[0].text))return e;let a=r.filter((e,t)=>!Te(e.text)&&!(e.text===`*`&&r[t-1]?.text.startsWith(`style=`))&&!(r[t-1]?.text===`*`&&r[t-2]?.text.startsWith(`style=`)));return a.length===r.length?e:[...t.slice(0,n+1),...a].map(e=>e.text).join(` `)}let Dl=/&([A-Za-z_][A-Za-z0-9_]*)/g;function Ol(e){let t=/* @__PURE__ */ new Set,n=hl(e).flatMap(e=>{let n=El(e.code);return n===null||Oe(n)!==void 0&&t.has(n)?[]:(t.add(n),[{code:n,name:e.name}])}),r=Cl(n.map(e=>e.code).join(`
`)),i=new Set(r?[...r.names,...r.optional,...r.main?[r.main]:[]].map(e=>e.slice(1)):[]),a=r?[...new Set(n.flatMap(e=>e.name&&!i.has(e.name)?[e.name]:[]))]:[],o=new Map(a.map((e,t)=>[e,t+1]));return qc(n.map(e=>e.code).join(`
`)).split(`
`).map(e=>e.replace(Dl,(e,t)=>o.has(t)?`&#${o.get(t)}`:e)).join(`
`)}function kl(e){let t=ve(e),n=t.some(e=>e.text===`map=role`),r=t.filter(e=>!(Te(e.text)&&Ve.has(Bl(e.text))&&!(n&&/^(?:part|role)=/.test(e.text))));return r.length===t.length?e:r.map(e=>e.text).join(` `)}function Al(e,t=`interface`){let n=/* @__PURE__ */ new Set,r=hl(e).flatMap(e=>{let t=El(e.code);return t===null||Oe(t)!==void 0&&n.has(t)?[]:(n.add(t),[{code:kl(t),name:e.name}])}),i=Cl(r.map(e=>e.code).join(`
`)),a=new Set(i?[...i.names,...i.optional,...i.main?[i.main]:[]].map(e=>e.slice(1)):[]),o=new Set(r.flatMap(e=>(i||t===`free`)&&e.name&&!a.has(e.name)?[e.name]:[])),s=qc(r.map(e=>e.code).join(`
`)).split(`
`),c=r.map((e,t)=>({name:e.name,code:s[t]})),l=/* @__PURE__ */ new Map,u=(e,t,n)=>e.replace(Dl,(e,r)=>o.has(r)?`&#${r===t?``:d(r,n)}`:e),d=(e,t)=>{let n=l.get(e);if(n!==void 0)return n;if(t.has(e))return`↺`;let r=/* @__PURE__ */ new Set([...t,e]),i=wl(c.filter(t=>t.name===e).map(t=>u(t.code,e,r)).sort().join(`
`));return t.size||l.set(e,i),i},f=new Map([...o].map(e=>[e,d(e,/* @__PURE__ */ new Set)]));return{hash:`e3:${wl(c.map(e=>u(e.code,e.name,/* @__PURE__ */ new Set)).sort().join(`
`))}`,cells:f}}let jl=/* @__PURE__ */ new Map,Ml=e=>`e2:${wl(Ol(e))}`,Nl=e=>{let t=jl.get(e);if(t!==void 0)return t;let n=Al(e).hash;return jl.size>=4096&&jl.clear(),jl.set(e,n),n},Pl=(e,t)=>e===(e.startsWith(`e1:`)?Tl(t):e.startsWith(`e2:`)?Ml(t):Nl(t)),Q=e=>JSON.stringify(e),Fl=e=>e.map(Q).join(` → `);function Il(e,t,n,r){let a=new Set(e.flatMap(e=>e.name?[e.name]:[])),o=new Set(e.flatMap(e=>e.reads)),s=/* @__PURE__ */ new Map,c=e.filter(e=>e.name);return{lines:c,per:t.map(({id:e,names:t,lines:l,resolved:u},d)=>{let f=/* @__PURE__ */ new Map;for(let e of l)e.name&&!f.has(e.name)&&f.set(e.name,e);if(t&&u){let r=[...t].filter(e=>!f.has(e));for(let t of r)n(d,`&${t} is not in ${Q(e)}: it defines ${[...f.keys()].map(e=>`&${e}`).join(`, `)}`)}let p=/* @__PURE__ */ new Set;if(!t)for(let e=!0;e;){e=!1;for(let t of f.keys()){if(a.has(t)||p.has(t)||o.has(t))continue;let n=l.filter(e=>e.name&&e.name!==t&&e.reads.includes(t));n.length&&n.every(e=>a.has(e.name)||p.has(e.name))&&(p.add(t),e=!0)}}let m=t??new Set([...f.keys()].filter(e=>!p.has(e))),h=[...m].filter(e=>f.has(e)&&a.has(e)).map(e=>`&${e}`),g=/* @__PURE__ */ new Set,_=/* @__PURE__ */ new Set,v=[...m].filter(e=>f.has(e)&&!a.has(e));for(let t=v.shift();t!==void 0;t=v.shift())if(!g.has(t)){g.add(t);for(let i of f.get(t).reads)if(!(!f.has(i)||g.has(i)||m.has(i)||_.has(i))){if(!a.has(i))v.push(i);else if(i===`style`)continue;else _.add(i),n(d,`&${i} is ${Q(e)}'s, read by its &${t}, and ${r}'s too: rename ${r}'s, or name &${i} in the use to override it`)}}f.has(`style`)&&n(d,`&${i} is the composer's, the section's style: ${Q(e)} defines it, where a fragment only reads it (the score writes &${i} style=…; a reader with none plays the centre)`);let y=/* @__PURE__ */ new Set;for(let t of l){if(!t.name||!g.has(t.name)||t.name===`style`)continue;let r=s.get(t.name);r?r.id!==e&&r.code===t.code?y.add(`&${t.name}`):r.id!==e&&n(d,`&${t.name} is defined by ${Q(r.id)} and by ${Q(e)}, by different lines: write it in the piece, or drop one use`):(s.set(t.name,{id:e,code:t.code}),y.add(`&${t.name}`),c.push(t))}let b=h.filter(e=>[...g].some(t=>f.get(t).reads.includes(e.slice(1))));return{gave:[...y],overrode:h,read:b}})}}let Ll=e=>e.names?new Set(e.names.map(e=>e.slice(1))):null,Rl=e=>e.from?.kind===`use`?{id:e.from.id,names:e.from.names,from:e.from}:null,zl=(e,t)=>e.replace(/"[^"]*"|&([A-Za-z_][A-Za-z0-9_]*)/g,(e,n)=>n&&t.has(n)?`&${t.get(n)}`:e),Bl=e=>e.slice(0,e.indexOf(`=`));function Vl(e,t){let n=t.filter(e=>De.has(e)),r=t.filter(e=>!De.has(e)),i=new Set(r.map(Bl)),[a,...o]=ve(e).map(e=>e.text);return[a,...n,...o.filter(e=>!(Te(e)&&i.has(Bl(e)))&&!n.includes(e)),...r].join(` `)}function Hl(e,t,n){let r=new Set(ve(n).flatMap(e=>Te(e.text)?[Bl(e.text)]:[])),i=ve(t).slice(1).flatMap(e=>Te(e.text)&&!r.has(Bl(e.text))?[e.text]:[]);return[`&${e}`,...i,n].join(` `)}function Ul(e){let t=e.trim();if(!t.startsWith(`&(`)||!t.endsWith(`)`))return e;let n=0,r=!1;for(let i=1;i<t.length;i++){let a=t[i];if(a===`"`&&(r=!r),!r){if(a===`(`)n++;else if(a===`)`&&--n===0&&i<t.length-1)return e}}return t.slice(2,-1).trim()}let Wl=/* @__PURE__ */ new Set([`step`,`loop`,`swing`]);function Gl(e,t,n){if(ve(e).some(e=>Te(e.text)))return e;let r=/* @__PURE__ */ new Set,i=!1,a=RegExp(`&${t}(?![A-Za-z0-9_])`);for(let e of n)for(let n of ve(e.code).slice(1)){if(!a.test(n.text))continue;let e=RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${t}(?![A-Za-z0-9_])`).exec(n.text);e?r.add(e[1]):i=!0}let[o]=r;return r.size===1&&!i&&Wl.has(o)?`${o}=${e}`:e}function Kl(e,t){let n=[],r=[!1],i=!1,a=!0;for(let o=0;o<e.length;o++){let s=e[o];if(s===`"`&&(i=!i),i||s===`"`)continue;let c=n.every(e=>e===`lambda`);if(/\s/.test(s)){c&&(r[r.length-1]=!1),a=!0;continue}if(a&&c&&/^[A-Za-z_][A-Za-z0-9_]*=/.test(e.slice(o))&&(r[r.length-1]=!0),a=!1,s===`(`){let t=e[o-1]??``,i=t===`&`?`lambda`:/[A-Za-z0-9_]/.test(t)?`call`:`group`;n.push(i),i===`lambda`&&(r.push(r.at(-1)),a=!0);continue}if(s===`)`){n.pop()===`lambda`&&r.pop();continue}if(s!==`&`)continue;let l=/^&([A-Za-z_][A-Za-z0-9_]*)/.exec(e.slice(o));if(l?.[1]!==t)continue;let u=e[o+l[0].length];if(r.some(Boolean)||n.includes(`call`)||u===`^`||u===`[`)return!0}return!1}function ql(e,t,n,r){if(!e.names||!e.takes||e.takes.every((t,n)=>t===e.names[n]))return null;let i=new Set(t.flatMap(e=>e.name?[e.name]:[])),a=/* @__PURE__ */ new Map,o=/* @__PURE__ */ new Set;return e.names.forEach((t,s)=>{let[c,l]=[t.slice(1),e.takes[s].slice(1)];i.has(l)?c!==l&&(i.has(c)&&!e.takes.includes(`&${c}`)&&r(`&${c}=${l}: ${Q(n)} defines &${c} too, by its own line: take &${l} under another name`),a.set(l,c)):(r(`&${l} is not in ${Q(n)}: it defines ${[...i].map(e=>`&${e}`).join(`, `)}`),o.add(c))}),{names:a,lacking:o}}let Jl=e=>e.map(e=>e.shared?e:{...e,shared:!0});function Yl(e,t,n,r,i,a,o,s){let{id:c,from:l}=e,u=yl(hl(n).flatMap(e=>e.from?.kind===`signature`?[e.from]:[]));if(!u.length){(l.head.length||l.args||l.main!==null)&&a(`${Q(c)} has no signature, so it takes no arguments: a collection gives the cells it defines by name (${e.names?e.names.join(`, `):`*`} from ${l.id})`);let o=Jl(Ql(t,n,r,i,a)),s=ql(l,o,c,a);if(!s)return{taken:{id:c,names:Ll(e),lines:o,resolved:!0},copy:[]};let u=new Set(l.names.map(e=>e.slice(1)).filter(e=>!s.lacking.has(e))),d=e=>e.name!==null&&s.names.has(e.name)||e.reads.some(e=>s.names.has(e)),f=o.map(e=>d(e)?{...gl(zl(e.code,s.names),zl(e.written,s.names),e.line),...e.origin?{origin:e.origin}:{}}:e);return{taken:{id:c,names:u,lines:Jl(f),resolved:!0},copy:[]}}return u.length>1&&a(`${Q(c)} has ${u.length} signatures: a fragment has one (&head from (&optional) &main)`),Xl(l,c,u[0],t,n,r,i,a,o,s)}function Xl(e,t,n,r,i,a,o,s,c,l){let u=Ql(r,i,a,o,s),d=u.filter(e=>!e.shared&&e.name),f=u.filter(e=>e.shared&&e.name),p=new Set(d.map(e=>e.name)),m=new Set(u.flatMap(e=>e.name?[e.name]:[])),h=e=>e.slice(1),g=n.names.map(h),_=n.optional.map(h),v=n.main?h(n.main):null;for(let e of g)p.has(e)||s(`${Q(t)}'s signature names &${e} its head, and it doesn't define it`);for(let e of _)m.has(e)||s(`${Q(t)}'s &${e} is an optional parameter: its line in the fragment is its default, and it has none`);v&&m.has(v)&&s(`${Q(t)}'s &${v} is its main parameter: it has no line, the argument is it`);let y=/* @__PURE__ */ new Map,b=e.takes?.map(h)??g,x=e.names?.map(h)??g;x.length===1&&g.length===1&&(b[0]===x[0]||b[0]===g[0])?y.set(g[0],x[0]):b.forEach((e,n)=>{g.includes(e)?y.set(e,x[n]):s(`&${e} is not a head of ${Q(t)}: its head${g.length>1?`s are`:` is`} ${g.map(e=>`&${e}`).join(`, `)}`)});let S=y.size===1;e.head.length&&!S&&s(`The attributes before from are the head's, and this line takes ${y.size} heads from ${Q(t)}: write them on each head's own line`);let C=new Map((e.args??[]).map(e=>[e.name,e.value]));for(let e of C.keys())_.includes(e)||s(`${Q(t)} takes no ${e}=: ${_.length?`its optional parameters are ${_.map(e=>`${e}=`).join(`, `)}`:`it has no optional parameters`}`);v&&e.main===null&&s(`${Q(t)} needs its main argument, &${v}, after its id: ${e.names?.[0]??`&${g[0]}`} from ${e.id} …`),!v&&e.main!==null&&s(`${Q(t)} takes no main argument: its signature has none (&${g[0]} from ${n.optional.length?`(${n.optional.join(`, `)})`:``})`);let w=/^&([A-Za-z_][A-Za-z0-9_]*)$/,T=/* @__PURE__ */ new Map;for(let[e,t]of C)_.includes(e)&&T.set(e,Ul(t));v&&e.main!==null&&T.set(v,Ul(e.main));let E=/* @__PURE__ */ new Set;for(let[e,t]of T){let n=w.exec(t);n&&(y.set(e,n[1]),E.add(e))}let D=/* @__PURE__ */ new Set,O=new Map(u.flatMap(e=>e.name?[[e.name,e]]:[])),k=t=>{let n=O.get(t);return n?g.includes(t)&&e.head.length&&S?gl(Vl(n.code,e.head)).reads:n.reads:[]};for(let e=[...g.filter(e=>y.has(e))];e.length;){let t=e.shift();if(!D.has(t)&&(D.add(t),!E.has(t)))for(let n of k(t))O.has(n)&&e.push(n)}let A=y.get(g[0])??[...y.values()][0]??g[0];for(let e of[...y.values()])c.add(e);let j=_.filter(e=>!p.has(e)&&T.has(e)&&!E.has(e));for(let e of[...p,...v?[v]:[],...j]){if(y.has(e))continue;let t=`${A}_${e}`;for(let n=2;c.has(t)||m.has(t);n++)t=`${A}${n}_${e}`;c.add(t),y.set(e,t)}let M=/* @__PURE__ */ new Set([...m,...v?[v]:[]]),N=/* @__PURE__ */ new Set;for(let e of d)for(let n of e.reads)!M.has(n)&&!N.has(n)&&Kl(e.code,n)&&(N.add(n),s(`${Q(t)}'s &${e.name} reads &${n}, which it neither defines nor declares: name it in its signature (&${g[0]} from (&${n}) …), or define it`));let P=e.names===null&&l?g.filter(e=>l.defines.has(e)):[];if(P.length){let e=new Map([...y].map(([e,t])=>[t,e]));D.clear();let t=[...l.reads.values()].flat(),n=[...g.filter(e=>!P.includes(e)),...t.flatMap(t=>e.get(t)??(O.has(t)&&!p.has(t)?[t]:[]))];for(let e=n.filter(e=>!P.includes(e));e.length;){let t=e.shift();if(!(D.has(t)||P.includes(t))&&(D.add(t),!E.has(t)))for(let n of k(t))O.has(n)&&e.push(n)}}let F=()=>{let e={},n=o.plugins.get(t)?.wire??1;if(n>1)return{refused:`it reads wire ${n}, and cells speaks wire 1 (docs/language/plugin-wire.md)`};for(let t of[..._,...v?[v]:[]]){let n=T.get(t),r=n??O.get(t)?.code.replace(RegExp(`^&${t}\\s*`),``).trim();if(r===void 0)continue;let a=il(r,n===void 0?ll(i):o.context);if(`refused`in a)return{refused:`its ${t}= ${a.refused}`};e[t]=a.text,a.key!==void 0&&(e[`${t}:key`]=a.key)}return{args:e}},I=o.plugins.get(t),ee=e=>!E.has(e.name)&&D.has(e.name)&&!P.includes(e.name),te=d.filter(e=>ee(e)&&ul.test(e.code)).map(e=>e.name),ne=I?Object.keys(I.fills).filter(e=>te.includes(e)):[],L=/* @__PURE__ */ new Map;for(let e of[...ne,...te.filter(e=>!ne.includes(e))]){let n=I?.fills[e];if(I?n&&n.lap===void 0:o.locked.some(n=>n.id===t&&n.fill===e)){let r=F(),i=`args`in r?null:r;if(`args`in r){let a=sl(r.args),c=o.locked.find(n=>n.id===t&&n.fill===e&&n.args===a);i=c?c.text:I&&n?Zl(t,e,()=>n.fuel===void 0?{refused:`its fill ${e} declares no fuel, and a braid fill must (decision 085 §8)`}:I.fill(e,0,r.args,n.fuel),s):null,typeof i==`string`&&o.made.push({id:t,fill:e,args:a,text:i})}i&&typeof i!=`string`&&o.warn(`${Q(t)} refused: ${i.refused}`),L.set(e,{braid:i})}else if(I&&n?.lap!==void 0){let n=Zl(t,e,()=>I.fill(e,0,{}),s);L.set(e,{first:typeof n==`string`?n:``})}}let re=[];for(let n of d){let r=n.name;if(!ee(n))continue;let i=zl(n.code,y);if(ul.test(i)){let e=L.get(r);if(typeof e?.braid==`string`)i=i.replace(ul,`$1${e.braid}`);else{let n=e?.first??``;i=i.replace(ul,`$1fill(${t}, ${r}${v&&y.has(v)?`, &${y.get(v)}`:``})${n?` ${n}`:``}`)}}T.has(r)&&(i=Hl(y.get(r),i,Gl(T.get(r),r,d))),g.includes(r)&&e.head.length&&S&&(i=Vl(i,e.head)),re.push({...gl(i),...n.origin?{origin:n.origin}:{}})}v&&e.main!==null&&!E.has(v)&&re.push(gl(`&${y.get(v)} ${Gl(T.get(v),v,d)}`));for(let e of j)re.push({...gl(Hl(y.get(e),O.get(e).code,Gl(T.get(e),e,d))),origin:O.get(e).origin??[]});if(l?.warn)for(let n of _)!p.has(n)&&!T.has(n)&&l.defines.has(n)&&D.has(n)&&l.codes.get(n)!==O.get(n)?.code&&l.warn(`The piece defines &${n}, and ${Q(t)} takes its &${n} from a collection by default: pass yours, ${e.id}(${n}=&${n}), or rename it`);let ie=f.filter(e=>D.has(e.name)&&!E.has(e.name)&&!j.includes(e.name));return{taken:{id:t,names:new Set(ie.map(e=>e.name)),lines:ie,resolved:!0},copy:re,args:Object.fromEntries(T),overrode:P.map(e=>`&${e}`)}}function Zl(e,t,n,r){try{return n()}catch(n){return r(`${Q(e)}'s code failed on its fill ${t}: ${n instanceof Error?n.message:String(n)}`),null}}function Ql(e,t,n,r,i){let a=e.at(-1),o=hl(t).map(e=>({...e,origin:[{id:a,line:e.line}]})),s=` (in ${Fl(e)})`,c=e=>i(`${e}${s}`),l=new Set(o.flatMap(e=>e.name?[e.name]:[])),u=[],d=o.flatMap(o=>{if(o.from===null)return c(ke),[];let d=Rl(o);if(!d)return[];let{id:f}=d,p=Ll(d),m=[...e,f];if(e.includes(f))i(`use ${Q(f)} is a cycle: ${Fl(m)}`);else if(m.length>8)i(`use ${Q(f)} nests past 8 deep: ${Fl(m)}`);else{let e=n(f),p=e===null?null:bl(f,e,d.from,c)?.text??null;if(e===null)c(`No fragment ${Q(f)} to use`);else if(p!==null){let e=Yl(d,m,p,n,{...r,warn:e=>r.warn(`${e}${s}`),context:ll(t)},i,l),c={id:a,line:o.line};return u.push(...dl(e.copy,c)),[{...e.taken,lines:dl(e.taken.lines,c)}]}}return[{id:f,names:p,lines:[],resolved:!1}]});return Il([...o,...u],d,(e,t)=>c(t),Q(e.at(-1))).lines}function $l(e,{resolve:t,locked:n=[],plugins:r=[],answers:i=[]}={}){let a=r.length?new Map([...Sr,...r.map(e=>[e.fragment,e])]):Sr,o=hl(e),s=o.flatMap(e=>{let t=Rl(e);return t?[{line:e,...t}]:[]}),c=[],l=e=>{let t=e.written.split(`
`)[0]??``,n=t.search(/\S/);return{line:e.line,col:n+1,len:t.trimEnd().length-n}},u=[],d=[],f=[],p=[],m=[],h=s.map(()=>[]),g=new Set(o.flatMap(e=>e.name?[e.name]:[])),_=[],v={defines:new Set(g),reads:new Map(o.flatMap(e=>e.name?[[e.name,e.reads]]:[])),codes:new Map(o.flatMap(e=>e.name?[[e.name,e.code]]:[]))},y=(r,o)=>{let{id:s}=r,y=Ll(r),b=l(r.line),x=e=>c.push({severity:`error`,message:e,span:b}),S=(r.from.takes??r.from.names)?.[0]?.slice(1),C=(n.find(e=>S!==void 0&&e.id===`${s}/${S}`)??n.find(e=>e.id===s))?.hash,w=t?t(s,...C?[C]:[]):null,T=w===null?null:bl(s,w,r.from,x),E=T?.text??null;if(m[o]=T?.part,E===null)return w===null&&x(t?`No fragment ${Q(s)} to use`:`No library to use ${Q(s)} from: compileSource(text, env, { resolve })`),u[o]=null,d[o]=[],f[o]=void 0,{id:s,names:y,lines:[],resolved:!1};let D=C&&Pl(C,E)?C:Nl(E);u[o]=D,C&&!Pl(C,E)&&c.push({severity:`warning`,message:`${Q(s)} has changed since this piece was saved: its current version plays`,span:b});let O=Yl(r,[s],E,t,{plugins:a,warn:e=>c.push({severity:`warning`,message:e,span:b}),context:[ll(e),..._].join(`
`),locked:i,made:h[o]},x,g,{...v,warn:e=>c.push({severity:`warning`,message:e,span:b})}),k={id:null,line:r.line.line};return d[o]=dl(O.copy,k),f[o]=O.args,p[o]=O.overrode??[],_.push(...O.copy.map(e=>e.code)),{...O.taken,lines:dl(O.taken.lines,k)}},b=[];for(let e of cl(s,e=>a.has(s[e].id),(e,t)=>c.push({severity:`error`,message:t,span:l(s[e].line)})))b[e]=y(s[e],e);let x=Il([...o,...d.flat()],b,(e,t)=>c.push({severity:`error`,message:t,span:l(s[e].line)}),`the piece`);s.forEach((e,t)=>{let{gave:n,overrode:r,read:i}=x.per[t];if(!b[t].resolved||f[t])return;let a=t=>c.push({severity:`warning`,message:t,span:l(e.line)}),{id:o,names:u}=e,d=s.findIndex(e=>e.id===o&&!f[s.indexOf(e)]);if(!n.length&&d<t)a(`${Q(o)} is used already, on line ${s[d].line.line}: this use adds nothing`);else if(u)for(let e of r.filter(e=>!i.includes(e)))a(`The piece defines ${e}, so taking it from ${Q(o)} adds nothing`);else!n.length&&r.length&&a(`The piece defines all ${Q(o)} gives (${r.join(`, `)}): this use adds nothing`)});let S=e.split(`
`).length,C=new Map([...d.flatMap((e,t)=>e.map(e=>[e,t])),...b.flatMap((e,t)=>e.lines.map(e=>[e,t]))]),w=x.lines.filter(e=>C.has(e)),T=[];for(let e of w)for(let t=e.written.split(`
`).length;t>0;t--)T.push(l(s[C.get(e)].line));return{text:w.length?[e,...w.map(e=>e.written)].join(`
`):e,takes:s.map((e,t)=>{let n=d[t].filter(e=>C.get(e)===t&&e.name).map(e=>`&${e.name}`),r=f[t]?(e.names??[]).filter(e=>n.includes(e)):[];return{id:e.id,names:e.names,span:l(e.line),hash:u[t]??null,gave:f[t]?[.../* @__PURE__ */ new Set([...r,...n,...x.per[t].gave])]:x.per[t].gave,overrode:[.../* @__PURE__ */ new Set([...x.per[t].overrode,...p[t]??[]])],...f[t]?{args:f[t]}:{},...m[t]?{part:m[t]}:{},...h[t].length?{answers:h[t]}:{}}}),given:new Set(w.flatMap(e=>e.name&&e.shared?[e.name]:[])),diagnostics:c,through:e=>e>S?T[e-S-1]??null:null,origins:new Map(w.flatMap(e=>e.name&&e.origin?[[e.name,e.origin]]:[]))}}let eu=/^`{3,}\s*cells\s*$/m;function tu(e){let t=[];for(let{key:n,line:r,value:i}of e.entries){let e=me(i);n!==`title`||typeof e==`string`&&e.trim()||t.push({line:r,message:`the title is ${JSON.stringify(e)}, not a text: title: "A name"`}),n===`description`&&typeof e!=`string`&&t.push({line:r,message:`the description is ${JSON.stringify(e)}, not a text: description: "What it is"`}),n===`tags`&&!(Array.isArray(e)&&e.every(e=>typeof e==`string`&&e.trim()))&&t.push({line:r,message:`the tags are ${JSON.stringify(e)}, not a list of names: tags: [genre:jazz, rhythm]`}),n===`tier`&&!(typeof e==`number`&&Number.isInteger(e)&&e>=1&&e<=9999)&&t.push({line:r,message:`the tier is ${JSON.stringify(e)}: a tier of the tutorial is a whole number, 1 to 9999`}),n===`uses`&&!(Array.isArray(e)&&e.every(ru))&&t.push({line:r,message:`the uses are ${JSON.stringify(e)}, not a lockfile: uses: a list of - id: gm_kit, hash: e2:…`}),n===`answers`&&!(Array.isArray(e)&&e.every(iu))&&t.push({line:r,message:`the answers are ${JSON.stringify(e)}, not a lockfile's: answers: a list of - id: …, fill: …, args: a1:…, text: …`})}return t}function nu(e){let t=e.split(/\r?\n/);if(t[0]!==`---`){if(!eu.test(e))return{problems:[{line:1,message:"no frontmatter: a piece file starts with a line `---`, or holds a ```cells block"}]};let n=ie(t,0);return`problems`in n?n:{frontmatter:{},text:n.text,prose:n.prose,map:n.map,layout:n.layout,bare:!0}}let n=t.indexOf(`---`,1);if(n<0)return{problems:[{line:1,message:"the frontmatter is never closed: no second line `---`"}]};let r=pe(t.slice(1,n).join(`
`),2);if(`problems`in r)return r;let i=r.node;if(i.kind!==`map`)return{problems:[{line:i.line,message:"the frontmatter is a map (`title: …`, `tags: […]`)"}]};let a=ie(t,n+1),o=[...tu(i),...`problems`in a?a.problems:[]];return`problems`in a||o.length?{problems:o.sort((e,t)=>e.line-t.line)}:{frontmatter:me(i),text:a.text,prose:a.prose,map:a.map,layout:a.layout}}function ru(e){if(typeof e!=`object`||!e||Array.isArray(e))return!1;let t=e;return Object.keys(t).sort().join()===`hash,id`&&typeof t.id==`string`&&typeof t.hash==`string`}function iu(e){if(typeof e!=`object`||!e||Array.isArray(e))return!1;let t=e;return Object.keys(t).sort().join()===`args,fill,id,text`&&[`id`,`fill`,`args`,`text`].every(e=>typeof t[e]==`string`)}function au(e){if(e.peek()!==`:`)return;e.rejectTap(e.text.slice(0,e.i).search(/&[^\s:,[\]()*+&]*$/)),e.i++;let t=e.i;e.free(J.hitNumber);let n=e.match(/[0-9]+/y);if(n===null)return e.fail(`A hit is &bd:n:gain, its number first: &bd:0:.3`,t,1);if(parseInt(n,10)!==0&&e.fail(`&bd:${n} would be a pitched hit, ${n} up its table: not yet (write &bd:0:gain)`,t,n.length),e.peek()!==`:`)return;e.i++;let r=e.i,i=e.freeNumber(J.hit),a=i===null?e.match(/[0-9]*\.[0-9]+|[0-9]+/y):String(i);return a===null?e.fail(`A hit’s gain: a number, &bd:0:.3 (1 as it is)`,r,1):parseFloat(a)}function ou(e,t){let n=0,r=!1,i=[[]],a=``,o=()=>{a&&i[i.length-1].push(a),a=``};for(let s=t;s<e.length;s++){let t=e[s];if(t===`&`&&(r=!0),t===`[`||t===`(`){if(n++===0)continue}else if(t===`]`||t===`)`){if(--n===0)break}else if(n===1&&t===`,`){o(),i.push([]);continue}else if(n===1&&/\s/.test(t)){o();continue}a+=t}if(o(),!r)return!1;let s=e=>/^[*+(-]|[*+-]$/.test(e);return!i.some(e=>e.length>1&&!e.some(s)||e.length===1&&e[0].startsWith(`[`))}function su(e){e.i++;let t=[];for(;;){if(t.push(cu(e,0)),e.skipSpace(),e.peek()===`,`){e.i++;continue}let n=e.peek();return n===`|`&&e.fail(`',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); a choice [a|b] picks between numbers in a braid (&x [0|2]), not between cells`,e.i,1),(n===`[`||n===`&`)&&e.fail(`',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); one term is a product or a sum, its parts joined by * or +`,e.i,1),e.expect(`]`,`',' or ']' in the mix`),{kind:`mix`,exprs:t}}}function cu(e,t){let n=e.i,r=[{e:lu(e,t),sign:1}];for(;;){e.skipSpace();let n=e.peek();if(n!==`+`&&n!==`-`)break;e.i++,r.push({e:lu(e,t),sign:n===`-`?-1:1})}return r.length===1?r[0].e:{k:`sum`,items:r,span:e.span(n)}}function lu(e,t){e.skipSpace();let n=e.i,r=[uu(e,t)];for(;e.skipSpace(),e.peek()===`*`;)e.i++,r.push(uu(e,t));return r.length===1?r[0]:{k:`prod`,factors:r,span:e.span(n)}}function uu(e,t){e.skipSpace();let n=e.i;if(e.peek()===`(`){t>=32&&e.fail(`Parentheses in a mix nest 32 deep at most: name a part (&part [ … ]) and use it`,n),e.i++;let r=cu(e,t+1);return e.skipSpace(),e.expect(`)`,`')' to close the group`),r}if(e.peek()===`&`){let t=e.ref(`a cell, like &theme`),n=au(e);return n===void 0?{k:`ref`,ref:t}:{k:`ref`,ref:t,level:n}}let r=e.free(J.gain);if(r!==null)return{k:`num`,value:r.value,span:e.span(n)};let i=e.match(qr);return i===null?(e.match(/gate\(/y)&&e.fail(`gate(…) is planned but not built yet: for now a step= term articulates, loop= terms bend`,n,5),e.fail(`Expected a cell, a number or '(' here`)):{k:`num`,value:parseFloat(i),span:e.span(n)}}let du=RegExp(`(?:${Object.keys(_n).join(`|`)})(?![A-Za-z0-9_])`,`y`),fu=[`degree`,`inverse`],pu=/(degree|inverse)\(/y;function mu(e){let t=e.match(pu);if(t===null){let t=e.ref(`a cell like &motif`);return{kind:`ref`,name:t.name,pick:t.pick,shift:t.shift,...t.slot?{slot:t.slot}:{},...t.transpose?{transpose:t.transpose}:{},...t.degree?{values:{mul:1,add:t.degree}}:{}}}let n=t.slice(0,-1);e.skipSpace(),e.peek()!==`&`&&!e.text.startsWith(`degree(`,e.i)&&!e.text.startsWith(`inverse(`,e.i)&&e.fail(n===`degree`?`degree(&cell, n): a cell, then how many steps of its table up (−n down)`:`inverse(&cell): a cell, mirrored round 0`,e.i);let r=mu(e);e.skipSpace();let i=r.values??{mul:1,add:0},a;if(n===`degree`){e.expect(`,`,`',' then the steps: degree(&${r.name}, 1)`),e.skipSpace();let t=e.freeNumber(J.move),n=t===null?e.match(/[-+]?\s*[0-9]+(?![0-9.])/y):String(t);n===null&&e.fail(`degree(&${r.name}, n) moves it n whole steps of its table, a whole number: degree(&${r.name}, 1), degree(&${r.name}, -2)`,e.i),a={mul:i.mul,add:i.add+parseInt(n.replace(/\s+/g,``),10)}}else a={mul:i.mul===1?-1:1,add:-i.add};return e.skipSpace(),e.expect(`)`,`')' to close ${n}(…)`),{kind:`ref`,name:r.name,pick:r.pick,shift:r.shift,...r.slot?{slot:r.slot}:{},...r.transpose?{transpose:r.transpose}:{},...a.mul===1&&a.add===0?{}:{values:a}}}function hu(e,t){let n=e.peek();if(n===`&`||e.text.startsWith(`degree(`,e.i)||e.text.startsWith(`inverse(`,e.i))return mu(e);if(n===`~`)return e.i++,{kind:`rest`};if(n===`=`)return e.i++,{kind:`rest`,keep:!0};if(n===`_`)return e.i++,{kind:`rest`,hold:!0};if(n===`[`)return ou(e.text,e.i)?su(e):gu(e,t);if(n===`<`)return _u(e,t);if(n===`-`||n===`.`||n>=`0`&&n<=`9`||e.text.startsWith(`free(`,e.i)){let t=e.num(`a number`,J.step),n=e.match(/[#bsf]+(?![A-Za-z0-9_])/y)??``,r=t.alter+[...n].reduce((e,t)=>e+(t===`#`||t===`s`?1:-1),0);return{kind:`note`,value:t.value,alter:r}}let r=e.noteName();if(r!==null)return{kind:`note`,value:r,alter:0,pitched:!0};let i=e.match(du);return i===null?e.fail(`Unexpected '${n}' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value`):{kind:`note`,value:_n[i],alter:0,mode:!0}}function gu(e,t){let n=e.i;t>=32&&e.fail(`Brackets nest 32 deep at most: name the inner steps (&inner 0 2) and splice them`,n,1),e.i++;let r=[[]],i=null;for(;;){e.skipSpace();let a=e.peek();if(a===`]`)break;a===``&&e.fail(i===`|`?`']' to close the choice: [0|4|7]`:`']' to close the bracket: [0 2] · [0, 4]`,n,e.i-n),a===`,`||a===`|`?(i!==null&&i!==a&&e.fail(`A bracket is a chord or a stack (commas) or a choice (bars), not both: [0, 4] · [0|4]`,e.i,1),r[r.length-1].length||e.fail(a===`,`?`A step before the comma: [0, 4]`:`A step before the bar: [0|4] · [0 2|4]`,e.i,1),i=a,r.push([]),e.i++):xu(e,r[r.length-1],Cu(e,t+1))}e.i++,r[r.length-1].length||e.fail(i===null?`Empty brackets: [0 2] is a subsequence, [0, 2] a chord`:i===`,`?`A step after the comma: [0, 4]`:`A step after the bar: [0|4] · [0 2|4]`,n,e.i-n);let a=e=>e.repeat===1&&e.subdivide===1&&e.elongate===1&&e.chance===void 0,o=r.every(e=>e.length===1&&a(e[0])&&e[0].atom.kind===`note`),s=r.map(e=>e[0].atom);if(i===`|`)return o&&!s.some(e=>e.pitched)?{kind:`choice`,values:s.map(e=>e.value),alters:s.map(e=>e.alter)}:{kind:`seq`,layers:r,mode:`choose`};if(o){let e=s.map(e=>!!e.pitched);return{kind:`chord`,notes:s.map(e=>e.value),alters:s.map(e=>e.alter),...e.some(Boolean)?{pitched:e}:{}}}return{kind:`seq`,layers:r}}function _u(e,t){let n=e.i;t>=32&&e.fail(`Brackets nest 32 deep at most: name the inner steps (&inner 0 2) and splice them`,n,1),e.i++;let r=[[]];for(;;){e.skipSpace();let i=e.peek();if(i===`>`)break;i===``&&e.fail(`'>' to close the alternation: <0 2 4>`,n,e.i-n),i===`|`&&e.fail(`An alternation takes steps, stacked with commas (<0 2, 4 5>); a choice goes in square brackets: [0 2|4]`,e.i,1),i===`,`?(r[r.length-1].length||e.fail(`A step before the comma: <0 2, 4 5>`,e.i,1),r.push([]),e.i++):xu(e,r[r.length-1],Cu(e,t+1))}return e.i++,r[r.length-1].length||e.fail(r.length>1?`A step after the comma: <0 2, 4 5>`:`An empty alternation: <0 2 4> plays one of its steps a lap`,n,e.i-n),{kind:`seq`,layers:r,mode:`alt`}}function vu(e){let t=e.i;if(e.i++,e.skipSpace(),e.text.startsWith(`even(`,e.i))return yu(e,t);let n=[];for(;e.skipSpace(),n.push(e.int(`a whole number in x(k, n, r)`,J.euclidOn)),e.skipSpace(),e.peek()===`,`;)e.i++;e.expect(`)`,`')' to close x(k, n, r)`);let[r,i,a=0]=n;(n.length<2||n.length>3||!(i>=1&&i<=4096)||!(r>=0&&r<=i))&&e.fail(`x(k, n, r): k hits spread evenly over n parts of the step (0 ≤ k ≤ n), turned right by r: 0(3,8), &bd(3,8,2)`,t,e.i-t);let o=An(r,i);return{k:r,n:i,r:a,hits:Array.from({length:i},(e,t)=>t).filter(e=>o[((e-a)%i+i)%i])}}function yu(e,t){e.i+=5;let n=[];for(;e.skipSpace(),n.push(e.int(`a whole number in x(even(k, n, p))`,J.euclidOn)),e.skipSpace(),e.peek()===`,`;)e.i++;e.expect(`)`,`')' to close even(k, n, p)`),e.skipSpace(),e.expect(`)`,`')' to close x(even(k, n, p))`);let[r,i,a=0]=n;return(n.length<2||n.length>3||!(i>=1&&i<=4096)||!(r>=1&&r<=i)||!(a>=0&&a<r))&&e.fail(`x(even(k, n, p)): even(k, n)'s k places in n parts of the step (1 ≤ k ≤ n), at its phase p, 0 to k − 1: &claves(even(5,16,2))`,t,e.i-t),{k:r,n:i,r:a,even:!0,hits:yn(r,i,a)}}let bu=1e4;function xu(e,t,n){if(!(n.atom.kind===`rest`&&n.atom.hold)){t.push(n);return}let r=n.span.col-1-e.offset,i=t[t.length-1];(n.repeat!==1||n.subdivide!==1||n.elongate!==1||n.chance!==void 0)&&e.fail(`_ lengthens the step before it by one, and takes no modifiers: 0 _ _ is 0@3`,r,n.span.len),i||e.fail(`_ lengthens the step before it: 0 _ _ is 0@3 (in a cell with base=, = keeps a step of the base)`,r,n.span.len),i.repeat!==1&&e.fail(`_ after x!n would lengthen only the last copy: write the copies out, or x@n`,r,n.span.len),t[t.length-1]={...i,elongate:i.elongate+1,span:{...i.span,len:n.span.col-i.span.col+n.span.len}}}let Su={"!":{field:`repeat`,syntax:G(`modifier`,`x!n`,`Repeat: n copies of the step, each as long as one.`,[`&beat step=4 0!4 2!2`],`cell.md`)},"*":{field:`subdivide`,syntax:G(`modifier`,`x*n`,`Ratchet: the step played n times within its own length.`,[`&hats step=2 0 0*2 0 0*3`],`cell.md`)},"@":{field:`elongate`,syntax:G(`modifier`,`x@n`,`Hold: the step lasts n steps.`,[`&tune step=2 0@2 2 4@3`],`cell.md`)}};function Cu(e,t=0){let n=e.i,r=hu(e,t),i=e.span(n),a={repeat:1,subdivide:1,elongate:1},o,s,c,l=/* @__PURE__ */ new Set;r.kind===`ref`&&(s=au(e));let u=e.peek()===`(`?vu(e):void 0;for(;e.peek()in Su||e.peek()===`?`||e.peek()===`/`;){if(e.peek()===`/`){c!==void 0&&e.fail(`'/' can only appear once per step`),e.i++;let t=e.i,n=e.int(`a count after /`,J.modifier,`slow`);(n<1||n>4096)&&e.fail(`Count must be between 1 and ${Jr}`,t,e.i-t),c=n;continue}if(e.peek()===`?`){o!==void 0&&e.fail(`'?' can only appear once per step`),e.i++;let t=e.i,n=e.freeNumber(J.drop),r=n===null?e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y):String(n);o=r===null?null:parseFloat(r),r===null&&/[0-9]/.test(e.peek()??``)&&e.fail(`A probability is from 0 to 1: x?.3`,t,1);continue}let t=e.peek();l.has(t)&&e.fail(`'${t}' can only appear once per step`),l.add(t),e.i++;let n=e.i,r=e.int(`a count after ${t}`,J.modifier,Su[t].field);(r<1||r>4096)&&e.fail(`Count must be between 1 and ${Jr}`,n,e.i-n),a[Su[t].field]=r}if(e.peek()===`(`&&e.fail(`A euclid goes straight after its step, before its other modifiers: 0(3,8)*2`),!e.atBoundary()&&!(t>0&&/[\],|>]/.test(e.peek()))&&e.fail(`Unexpected '${e.peek()}' — separate steps with spaces`),u||c!==void 0){r.kind===`rest`&&(r.hold||r.keep)&&e.fail(`${r.hold?`_`:`=`} takes no euclid and no /n: put them on the step it stands for`,n,e.i-n);let t={...u?{euclid:u}:{},...c===void 0?{}:{slow:c}};r=r.kind===`seq`&&!r.bare?{...r,...t}:{kind:`seq`,layers:[[{atom:r,repeat:1,subdivide:1,elongate:1,span:i}]],...t,bare:!0}}return b(r)>bu&&e.fail(`A step comes round after ${bu.toLocaleString(`en`)} laps at most: its <…> and /n multiplied out`,n,e.i-n),{atom:r,...a,...o===void 0?{}:{chance:o},...s===void 0?{}:{level:s},span:e.span(n)}}let wu=e=>/^(?:pulse|beat|1m|(?:1|2|4|8|16|32|64)(?:n\.?|t))(?![A-Za-z0-9_.])/.test(e.text.slice(e.i));function Tu(e){let t=e.match(/(?:pulse|beat|1m|(?:1|2|4|8|16|32|64)(?:n\.?|t))(?![A-Za-z0-9_.])/y);if(t===null)return null;if(t===`pulse`||t===`beat`)return{written:t,kind:t};if(t===`1m`)return{written:t,kind:`bar`};let n=parseInt(t,10);return{written:t,kind:`note`,whole:t.endsWith(`.`)?3/(2*n):t.endsWith(`t`)?2/(3*n):1/n}}function Eu(e){let t=1,n=[];for(;e.peek()===`*`||e.peek()===`/`;){let r=e.text[e.i++],i=e.i,a=e.freeNumber(J.by),o=a===null?e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y):String(a);o!==null&&parseFloat(o)>0||e.fail(`a positive number after ${r}`,i),t=r===`*`?t*parseFloat(o):t/parseFloat(o),n.push({op:r===`*`?`×`:`÷`,n:parseFloat(o)})}return{ratio:t,chain:n}}function Du(e,t){let n=e.i,r=t?`loop`:`step`,i=t?null:Tu(e);if(i)return{whole:t,kind:`tap`,meter:null,tap:i,...Eu(e),span:e.span(n)};let a=e.free(t?{...J.rate,key:`loop`}:J.rate);if(a!==null){let r=Xe(a.value,a.unit);return r>0||e.fail(`A rate must be positive`,n,e.i-n),{whole:t,kind:`rate`,perSecond:r,span:e.span(n),free:a}}let o=e.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);if(o!==null){let i=Xe(parseFloat(o),e.match(Ye));if(i>0||e.fail(`A rate must be positive`,n,e.i-n),/[A-Za-z.]/.test(e.peek())){let i=/^[^\s,\])]+/.exec(e.text.slice(n))[0];e.fail(t?`${r}=${i} is no rate: a number with its unit (loop=100bpm, loop=2hz)`:`${r}=${i} is no rate or tap: a tap reads a note value (1n 2n 4n 8n 16n 32n), a triplet (4t 8t 16t), a dotted one (2n. 4n. 8n.), 1m, pulse, beat, or another meter's (&bar2:16n)`,n,i.length)}return{whole:t,kind:`rate`,perSecond:i,span:e.span(n)}}let s=e.match(/[A-Z](?:[#b]?-?[0-9]+|[A-Z0-9_]*)(?![A-Za-z0-9_#])/y);if(s!==null)return{whole:t,kind:`env`,name:s,span:e.span(n)};e.peek()===`{`&&e.fail(`{&x} is now written cycle(&x)`);let c=e.match(/cycle\(/y)!==null,l=e.cellRef(c?`a cell inside cycle( ), like cycle(&theme)`:`a cell or a rate after ${r}=, like ${r}=&meter`,`in ${r}=`,!0);if((l.pick||l.shift)&&e.fail(`${r}= takes a whole cell`,l.span.col-1,l.span.len),c&&e.expect(`)`,`')' to close cycle(&${l.name})`),!c&&!t&&e.peek()===`:`){e.i++;let r=Tu(e);return r||e.fail(`&${l.name}: taps a meter by pulse, beat or a note value (&${l.name}:pulse, &${l.name}:beat, &${l.name}:16n, &${l.name}:1m)`),{whole:t,kind:`tap`,meter:l,tap:r,...Eu(e),span:e.span(n)}}return{whole:t,kind:`driven`,driver:l,cycle:c,...Eu(e),span:e.span(n)}}let Ou={amp:G(`map`,`map=amp`,`A volume: its values multiply the level (on a voice, the braid as a waveform, its range onto −1…1; the default).`,[`&accent map=amp step=16n 1 .4 .8 .4`],`sound.md`),lin:G(`map`,`map=lin`,`As amp, ramping from each value to the next: a glide, a triangle. In a mix it is plain: a volume in a product, a pitch in a sum.`,[`&swell map=lin loop=&bar/8 .2 1`],`sound.md`),db:G(`map`,`map=db`,`A volume in decibels (0 as it is, −6 about half).`,[`&fade map=db step=&bar 0 -6 -12`],`sound.md`),adsr:G(`map`,`map=adsr a d s r`,`An envelope: attack, decay, release in seconds, sustain a level; one per note.`,[`&pluck map=adsr .01 .3 .5 .4`],`sound.md`),sample:G(`map`,`map=sample`,`The sound card: its entries are channels, one (mono) or two (left, right).`,[`&out loop=SAMPLE_RATE map=sample &left &right`],`mix.md`),midi:G(`map`,`map=midi`,`A MIDI card: its entries are MIDI channels, in order (~ skips one); a voice only here is sent and heard, at its entry's gain.`,[`&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`],`midi.md`),edo:G(`map`,`map=edo`,`A grid: n equal steps to the octave, written map=edo(n).`,[`&edo19 map=edo(19)`],`tuning.md`),ratios:G(`map`,`map=ratios`,`A grid of ratios: one period's tones, then the period (the last).`,[`&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`],`tuning.md`),style:G(`map`,`map=style`,`A style: a point in style space, one value an axis in the table's order (sync harm bite mood, each 0 to 1), or each by its name (sync=.3); it doesn't sound. A pick reads an axis by name: &funk[bite].`,[`&funk map=style .3 .45 .55 .5`,`&funk map=style sync=.3 harm=.45 bite=.55 mood=.5`],`style.md`),role:G(`map`,`map=role`,`A role: its name is the role, its entries the gates that play it (two entries, two players); a gate no role names plays as written.`,[`&comp map=role &violin2 &viola`],`mix.md`)},ku=new RegExp(Object.keys(Ou).sort((e,t)=>t.length-e.length).join(`|`),`y`);function Au(e,t,n){return t>5e4&&e.fail(`${t} steps: at most ${rt.toLocaleString(`en`)}, the most a grid can hold to its period`,n,String(t).length),t}function ju(e){let t=e.i;if(e.peek()===`&`){let n=e.cellRef(`a table cell, like map=&curve`,`after map=`);return(n.pick||n.shift)&&e.fail(`map= takes a whole table`,n.span.col-1,n.span.len),{kind:`table`,table:n,span:e.span(t)}}if(e.match(/sin\b/y)&&e.fail(`map=sin is gone: write the sine as the braid, sin(12) — or map=&table`,t,3),e.match(/ed\(/y)){let n=()=>{let t=e.i,n=e.freeNumber(J.ratio),r=n===null?e.match(/[0-9]+(?:\.[0-9]+)?(?:\/[0-9]+(?:\.[0-9]+)?)?/y):String(n),[i,a=`1`]=(r??``).split(`/`),o=parseFloat(i)/parseFloat(a);return r!==null&&o>1||e.fail(`ed(r) divides a ratio above 1: ed(2) is the octave, ed(3/2) the fifth, ed(7, 3/2) seven steps to it`,t),o},r=e.i,i=/^(?:[0-9]+|free\([^()]*\))\s*,/.test(e.text.slice(e.i))?e.int(`the steps, ed(n, r)`,J.grid,`steps`):null;i!==null&&e.match(/\s*,\s*/y);let a=i===null?null:Au(e,i,r);a!==null&&a<1&&e.fail(`ed(n, r): n steps to the ratio, at least 1`,r);let o=n();return e.expect(`)`,`')' to close ed(…)`),{kind:`edo`,period:o,steps:a,span:e.span(t)}}let n=e.match(ku);if(n===null&&e.fail(`map= takes ${Object.keys(Ou).join(`, `)}, ed(r), midi(c, p) or a table cell (&curve)`),n===`edo`){let n=null;if(e.peek()===`(`){e.i++;let t=e.i,r=e.freeNumber(J.grid,`steps`),i=r===null?e.match(/[0-9]+/y):String(r);(i===null||parseInt(i,10)<1)&&e.fail(`edo(n): n equal steps to the octave, edo(19)`,t),n=Au(e,parseInt(i,10),t),e.expect(`)`,`')' to close edo(…)`)}return{kind:`edo`,period:2,steps:n,span:e.span(t)}}return n===`midi`?Mu(e,t):{kind:n,span:e.span(t)}}function Mu(e,t){if(e.peek()!==`(`)return{kind:`midi`,channel:null,port:1,span:e.span(t)};e.i++;let n=(t,n)=>{let r=e.i,i=e.freeNumber({...J.grid,max:16},t===`A MIDI channel`?`channel`:`port`),a=i===null?e.match(/[0-9]+(?:\.[0-9]+)?/y):String(i),o=a===null?NaN:parseFloat(a);return Number.isInteger(o)&&o>=1&&o<=16||e.fail(`${t} is a whole number from 1 to 16: ${n}`,r,Math.max(1,a?.length??1)),o},r=n(`A MIDI channel`,`map=midi(10)`),i=1;return e.match(/\s*,\s*/y)!==null&&(i=n(`A MIDI output slot`,`map=midi(10, 2)`)),e.expect(`)`,`')' to close midi(…)`),{kind:`midi`,channel:r,port:i,span:e.span(t)}}let Nu=r.adsr,Pu=e=>(t,n,r,i)=>{n[e]=t.int(`a whole number after ${e}=`,J[e]),n.paramSpans[e]=t.place(i)},Fu=(e,t)=>(n,r,i,a)=>{let o=n.i,s=n.match(/"([^"]*)"/y);if(s===null&&n.fail(`${e}= takes a text in quotes: ${t}`),r[e]=s.slice(1,-1),e!==`label`&&(r.paramSpans[e]=n.place(a)),e===`label`)for(let e of s.matchAll(/\{(?:&[A-Za-z_][A-Za-z0-9_]*:)?([A-Za-z_][A-Za-z0-9_]*)\}/g))at.includes(e[1])||n.warn(`{${e[1]}} isn't a label field: it shows as written (the fields: ${at.map(e=>`{${e}}`).join(` `)})`,o+e.index,e[0].length)},Iu=e=>(t,n)=>{n[e]=t.cellRef(`a cell after ${e}=, like ${e}=&pluck or ${e}=&(map=adsr .01 .3 .5 .4)`,`after ${e}=`)},Lu=(e,t,n)=>{t.step=Du(e,n===`loop`)},Ru={over:null,shift:null,off:!1,step:null,map:null,stride:null,cycle:null,params:{},paramSpans:{}},zu={over:{form:`over=&table · over=&table[<<n] · over=scale(name, tonic)`,examples:[`&tune over=&major step=2 0 2 4`,`&mode over=&major[<<2] 0 2 4`,`&tune over=scale(minor, A) step=2 0 2 4`,`&bass over=&key step=16n 0 4 7`],read:(e,t)=>{if(e.text.startsWith(`scale(`,e.i)){let n=e.i;e.i+=5;let r=ir(e,n),i=`scale:λ${e.line}_${n+e.offset}`;e.lambdas.push({...Ru,name:i,span:r.span,lambda:e.text.slice(n,e.i),over:r.key,braid:{kind:`scan`,steps:r.steps,span:r.span,...r.mode?{mode:r.mode}:{},...r.even?{even:r.even}:{}}}),t.over={name:i,pick:null,shift:0,span:r.span}}else t.over=e.cellRef(`a cell or scale(name, tonic) after over=, like over=&key or over=scale(minor, A)`,`after over=`);t.over.pick&&e.fail(`over= takes a whole table (shifting it is fine: over=&scale[<<])`,t.over.span.col-1,t.over.span.len)}},base:{form:`base=&cell · base=&cell^$n · base=&cell^n`,examples:[`&answer base=&subject^$7 =!3 12@2`,`&last base=&subject =!21 3@2`],read:(e,t)=>{t.base=e.ref(`a cell after base=, like base=&subject or base=&subject^$7`),t.base.pick&&e.fail(`base= takes a whole cell (transposing it is fine: base=&subject^$7)`,t.base.span.col-1,t.base.span.len)}},step:{form:`step=…`,examples:[`&tune step=4n 0 2 4`,`&tune step=&clock 0 2 4`],read:Lu},loop:{form:`loop=…`,examples:[`&lead s=saw loop=C4`],read:Lu},shift:{form:`shift=n · shift=free(n, lo..hi)`,examples:[`&mode over=&major shift=5 0 2 4`,`&key shift=free(0, 0..11)`],read:Pu(`shift`)},stride:{form:`stride=n · stride=free(n, lo..hi)`,examples:[`&key step=cycle(&theme) stride=7`],read:Pu(`stride`)},map:{form:`map=…`,examples:[`&accent map=amp step=&bar 1 .5`],read:(e,t)=>t.map=ju(e)},show:{form:`show=kind · show=notes:convention · show=do:convention · show=mix:&grid`,examples:[`&tune show=notes step=2 0 2 4`,`&tune show=notes:german step=2 0 2 4`,`&tune show=do:movable step=2 0 2 4`,`&band show=mix:&edo19 [&a, &b]`],read:(e,t)=>{let n=e.i,r=e.match(/[a-z]+/y);r===null&&e.fail(`show= takes a word, what the cell is drawn as (show=notes, show=sun): which words is the frontend's`,n,1);let i=``;if(r===`mix`&&e.peek()===`:`&&!e.text.startsWith(`:&`,e.i)&&e.fail(`show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19 (no space after the colon)`,n,e.i+1-n),r===`mix`&&e.text.startsWith(`:&`,e.i)){e.i+=2;let r=e.match(Wr);r===null&&e.fail(`show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19`,n,e.i-n),t.show=`mix:&${r}`,t.paramSpans.show=e.span(n)}else{if(e.peek()===`:`){e.i++;let t=e.match(/[a-z]+/y);t===null&&e.fail(`show=${r}: a word after the colon, its convention (show=notes:german)`,n,e.i-n),i=`:${t}`}t.show=r+i,t.paramSpans.show=e.span(n)}}},label:{form:`label="text"`,examples:[`&theme label="the King's theme" step=2 0 2 4`,`&note label="A note in the graph: alone on its cell."`],read:Fu(`label`,`label="the King's theme"`)},env:{form:`env=&envelope`,examples:[`&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)`],read:Iu(`env`)},pitch:{form:`pitch=&vibrato · pitch=lo..hi * &shape`,examples:[`&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)`,`&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0)`],read:(e,t,n,r)=>/^[0-9.]+\.\./.test(e.text.slice(e.i))?Yu(e,t,n):Iu(`pitch`)(e,t,n,r)},cycle:{form:`cycle=n`,examples:[`&key step=cycle(&theme) stride=2 cycle=2`,`&wheel cycle=1 0 4 7`,`&drone cycle=0 0 4 7`],read:(e,t,n,r)=>{let i=e.i;t.cycle=e.int(`a whole number after cycle=`,J.cycle),t.cycle<0&&e.fail(`cycle= counts laps: 0 or more`,i,e.i-i),t.paramSpans.cycle=e.place(r),t.cycle>5e4&&e.fail(`cycle=${t.cycle}: at most ${rt.toLocaleString(`en`)}, the most steps a cell can hold (a grid's to its period, a table's turns before it comes round)`,i,e.i-i)}},size:{form:`size=x`,examples:[`&theme size=2 step=2 0 2 4`],read:(e,t)=>{let n=e.i,r=e.freeNumber(J.size),i=r===null?e.match(/[0-9]*\.?[0-9]+/y):String(r);i!==null&&+i>=.25&&+i<=4||e.fail(`size= is how large it is drawn, from .25 to 4: size=2`,n,Math.max(1,(i??``).length)),t.size=+i}},laps:{form:`laps=n`,examples:[`&bar meter("4/4") step=84bpm laps=30`],read:(e,t,n,r)=>{let i=e.freeNumber(J.laps),a=i===null?e.match(/[0-9]+/y):String(i);a!==null&&parseInt(a,10)>=1||e.fail(`laps= takes a count of laps, 1 or more: laps=1`,r,n.length+1),t.laps=parseInt(a,10)}},chance:{form:`chance=p · chance=free(p, 0..1)`,examples:[`&ghost chance=.8 step=4 0? 0? 0? 0?`,`&ghost chance=free(.7, 0..1) step=4 0? 0?`],read:(e,t)=>{let n=e.freeNumber(J.chance);if(n!==null)t.chance=n;else{let n=e.i,r=e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);r===null&&e.fail(`chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)`,n,1),t.chance=parseFloat(r)}}},seed:{form:`seed=n`,examples:[`&ghost seed=7 step=4 0? 0? 0? 0?`],read:(e,t)=>t.seed=e.int(`a whole number after seed=`,J.seed)},tags:{form:`tags="tag, tag"`,examples:[`&lead tags="melody" s=saw loop=C4`,`&beam tags="metal" map=ratios 1 2.756 5.404`],read:Fu(`tags`,`tags="jazz, blues"`)},style:{form:`style=&s · style=[&a * w, &b * w] · style=a..b · style=a..b * &curve`,examples:[`&style label="Funk" style=&funk`,`&style label="close to Funk, then Bossa nova" style=[&funk * .8, &bossa * .2]..&bossa`],read:(e,t,n,r)=>{if(e.peek()===`(`){e.i++;let n=[];for(;;){e.skipSpace();let t=Uu(e);e.skipSpace();let r=1;if(e.peek()===`*`&&(e.i++,e.skipSpace(),r=e.num(`a weight after * in style=( … ): style=(&funk | &bossa * .5)`,J.weight).value,e.skipSpace()),n.push({point:t,weight:r}),e.peek()===`|`)e.i++;else{e.expect(`)`,`')' to close style=( … | … ), a set of styles`);break}}t.style={from:n[0].point,to:null,set:n,span:e.place(r)};return}let i=Uu(e),a=null,o=null;e.text.startsWith(`..`,e.i)&&(e.i+=2,a=Uu(e),/^\s*\*\s*&/.test(e.text.slice(e.i))&&(e.skipSpace(),e.i++,e.skipSpace(),o=e.cellRef(`a curve after style=a..b *, like * &rise`,`in style=`))),t.style={from:i,to:a,...o?{curve:o}:{},span:e.place(r)}}},about:{form:`about=&cell · about=(&a &b …)`,examples:[`&fenvNote label="The filter opens on every note." about=&fenv`,`&why label="Two cells at once." about=(&fenv &accent)`],read:(e,t,n,r)=>{let i=`a cell after about=, like about=&fenv or about=(&fenv &accent)`,a=[];if(t.about=a,e.peek()===`(`){for(e.i++,e.skipSpace();e.peek()!==`)`;)e.done()&&e.fail(`')' to close about=(…)`),a.push(e.cellRef(i,`in about=`)),e.skipSpace();e.i++,a.length===0&&e.fail(i,r,n.length+1)}else a.push(e.cellRef(i,`in about=`))}}},Bu=/^\(\s*(?:-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)[a-z]*\s*,)/;function Vu(e,t){let n=e.i,r=e.frees.length,i=t=>{if(e.text.startsWith(`free(`,e.i))return e.free(J.end,t).value;let n=e.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9])/y);return n===null?null:parseFloat(n)},a=()=>(e.i=n,e.frees.length=r,null),o=i(`${t} low`);if(o===null)return a();if(e.text.startsWith(`..`,e.i)){e.i+=2;let n=i(`${t} high`);return n===null&&e.fail(`${t}=: a range's other end, a number or a slider — ${t}=200..3000 * &a`),[o,n]}let s=/\s*(?:±|\+-)\s*/y;if(s.lastIndex=e.i,s.test(e.text)){e.i=s.lastIndex,e.frees.length>r&&(e.frees[r].param=t);let n=i(`${t} reach`);(n===null||n<0)&&e.fail(`${t}=c ± r: a reach, a number or a slider, 0 or more — ${t}=free(.6, 0..1) ± free(.2, 0..0.5) * &a`);let a=e=>Math.round(e*0xe8d4a51000)/0xe8d4a51000;return[Math.max(0,a(o-n)),a(o+n)]}return a()}function Hu(e,n){let r=e.i,i=e.free(J.axis,n),[a,o]=t.find(e=>e.name===n).range;return(i.lo<a||i.hi>o)&&e.fail(`${n}=free(…) moves within the axis, ${a} to ${o}: ${n}=free(${i.value}, ${a}..${o})`,r,e.i-r),i}function Uu(e){let t=`a style after style=, like style=&funk, style=&(map=style .3 .45 .55 .55) or style=[&funk * .8, &bossa * .2]`;if(e.peek()!==`[`)return{kind:`cell`,ref:e.cellRef(t,`in style=`)};e.i++;let n=[];for(;;){e.skipSpace();let r=e.cellRef(t,`in style=[…]`);if(e.skipSpace(),e.expect(`*`,`'*' and a weight after &${r.name}: style=[&${r.name} * .8, …]`),e.skipSpace(),n.push({ref:r,weight:e.num(`a weight after &${r.name} *`,J.weight).value}),e.skipSpace(),e.peek()===`,`)e.i++;else return e.expect(`]`,`']' to close style=[…]`),{kind:`mix`,terms:n}}}let Wu={fm:`a voice after fm=, like fm=&op`,write:`what the tape records, like write=&melody`,play:`the tape it reads, like play=&tape, or the notes a gate plays, like play=&tune`,couple:`the resonator it shares a table with, like couple=&fork`,excite:`what drives it, like excite=&mix`,trigger:`the melody whose notes it plays with, like trigger=&tune`,velocity:`a level cell, like velocity=&accent`,gate:`a level cell, like gate=&duck`},Gu=(e,t,n)=>{if(n===`play`)return Ku(e,t);let r=e.cellRef(Wu[n],`after ${n}=`);t.params[n]=r.name,t.paramSpans[n]=r.span};function Ku(e,t){let n=e.i,r=e.ref(Wu.play);if(e.rejectTap(n),t.params.play=r.name,t.paramSpans.play=r.span,r.transpose||r.degree){let i=e.text.lastIndexOf(`^`,e.i-1);t.playMove={...r.transpose?{transpose:r.transpose}:{},...r.degree?{degree:r.degree}:{},at:i,len:e.i-i,as:e.text.slice(n,e.i)}}}let qu=(e,t)=>{let n=e.i,r=e.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);r===null&&e.fail(`a level and a table after bend=, the lengths of its nodes: bend=4n:&rubato`),e.i++;let i=e.cellRef(`a table after bend=4n:, the lengths of its nodes: bend=4n:&rubato`,`after bend=4n:`),a,o=null;if(e.peek()===`:`){e.i++;let t=e.i;o=Xu(e,`depth`,t),a=o?o.range?o.range[0]:1:e.num(`a depth after bend=${r}:&${i.name}:, how far its table applies (1 as written, 0 even, -1 inverted): bend=${r}:&${i.name}:.5`,J.depth).value}t.bend={level:r,table:i,...a===void 0?{}:{depth:a},...o?{depthMoves:o}:{}},t.paramSpans.bend=e.place(n)},Ju=(e,t,n)=>{if(!/^[1-9][0-9]*(?:n\.?|t):/.test(e.text.slice(e.i)))return Yu(e,t,n);let r=e.i,i=[];for(;;){let a=e.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);a===null&&e.fail(`a level after the comma, a note value and a share: ${n}=8n:.6,16n:.55`),e.i++;let o,s=n===`swing`?Xu(e,`swing`,e.i):null;if(s){(i.length||e.peek()===`,`||e.peek()===`:`)&&e.fail(`a share moved by cells is one level alone: swing=8n:&lean, swing=8n:.5...75 * &k`,r,e.i-r),t.swingMoves={level:a,...s},i.push({level:a,share:s.range?s.range[0]:.5});break}let c=e.free(n===`swing`?J.share:J.legatoShare,n);if(c!==null)o=c.value,(i.length||e.peek()===`,`)&&e.fail(`a share left free(…) is one level alone: ${n}=8n:free(.5, .5..75)`,r,e.i-r);else if(n===`legato`){let t=e.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9.])/y);t===null&&e.fail(`a share after ${a}:, of each note's held length (.5 staccato, 1 as written): legato=${a}:.5`),o=parseFloat(t)}else{let t=e.i,n=e.match(/[0-9]+\/[0-9]+(?![0-9.])/y);if(n!==null){let[r,i]=n.split(`/`).map(Number);i===0&&e.fail(`a share's denominator can't be 0: swing=${a}:2/3`,t,n.length),r>i&&e.fail(`a share is from 0 to 1, and ${n} is above it: swing=${a}:2/3`,t,n.length),o=r/i}else{let t=e.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);t===null&&e.fail(`a share after ${a}:, from 0 to 1, a decimal or a fraction (.5 straight, .67 or 2/3 the triplet swing): swing=${a}:2/3`),o=parseFloat(t)}}if(e.peek()===`:`){let t=e.i;e.i++;let n=e.match(/[a-z]+/y);e.fail(`a share takes no word after it: a swing leans a level's pairs alone and keeps its groups of three straight (swing=${a}:2/3)`,t,1+(n?.length??0))}if(i.push({level:a,share:o}),e.peek()!==`,`)break;e.i++}n===`legato`?t.legato=i:(t.swing=i,t.params[n]=i[0].share),t.paramSpans[n]=e.span(r)};function Yu(e,t,n){let r=e.i;if(n===`level`&&(e.peek()===`&`||/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+|free\([^()]*\))\s*\*/.test(e.text.slice(e.i)))){let i=[],a=1;for(let t=!0;;t=!1){let n=e.i;if(!t){if(e.skipSpace(),e.peek()!==`*`){e.i=n;break}e.i++,e.skipSpace()}let r=e.freeNumber(J.level),o=r===null?e.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y):String(r);o===null?i.push(e.cellRef(`a level cell or a number, like level=&accent*&duck*.4`,`in level=`)):a*=parseFloat(o)}t.paramCells[n]={range:null,factors:i,span:e.span(r)},a!==1&&(t.params[n]=a),t.paramSpans[n]=e.span(r);return}if((e.peek()===`&`||wu(e))&&Fe.has(n)){let i=Du(e,!1);i.kind!==`driven`&&i.kind!==`tap`&&e.fail(`${n}= takes seconds, a clock or a tap: ${n}=&bar*2, ${n}=8n`,r,e.i-r),t.paramClocks[n]=i,t.paramSpans[n]=e.span(r);return}let i=n===`s`?e.text.slice(e.i).match(/^([A-Za-z]+)\.\.([A-Za-z]+)/):null;if(i){e.i+=i[0].length;let n=[];for(;;){let t=e.i;if(e.skipSpace(),e.peek()!==`*`){e.i=t;break}e.i++,e.skipSpace(),n.push(e.cellRef(`a cell after *, like s=${i[0]} * &style[bite]`,`in s=`))}n.length===0&&e.fail(`s=${i[0]}: a blend of two waves is moved by cells, the share of the second: s=${i[0]} * &style[bite]`,r,e.i-r),t.params.s=i[1],t.paramCells.s={range:[0,1],factors:n,span:e.span(r),to:i[2]},t.paramSpans.s=e.span(r);return}let a=Xu(e,n,r);if(a){t.paramCells[n]=a,t.paramSpans[n]=e.span(r);return}let o=e.free(J.param,n);if(o!==null){t.params[n]=o.value,t.paramSpans[n]=e.span(r);return}let s=e.match(/-?[A-Za-z0-9_.]+/y);s===null&&e.fail(`Expected a value after ${n}=`);let c=/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(s)?parseFloat(s):s;t.params[n]=n===`ftype`&&typeof c==`number`?qe(c)??c:c,t.paramSpans[n]=e.span(r)}function Xu(e,t,n){let r=Vu(e,t);if(e.peek()!==`&`&&!r)return null;let i=[];for(r||i.push(e.cellRef(`a cell after ${t}=`,`in ${t}=`));;){let n=e.i;if(e.skipSpace(),e.peek()!==`*`){e.i=n;break}e.i++,e.skipSpace(),i.push(e.cellRef(`a cell after *, like ${t}=200..3000 * &fenv`,`in ${t}=`))}return r&&i.length===0&&e.fail(`${t}=${e.text.slice(n,e.i)}: a range is scaled by cells — ${t}=${e.text.slice(n,e.i)} * &fenv`,n,e.i-n),!r&&i.length>1&&e.fail(`${t}=: several cells multiply a range — ${t}=200..3000 * &a * &b`,n,e.i-n),{range:r,factors:i,span:e.span(n)}}let Zu={init:`init= is now shift=`,out:`out= is now a command: out(voice, &cell) / step(&meter, bpm=…)`,time:`time= is now a command: out(voice, &cell) / step(&meter, bpm=…)`,rung:"rung= is retired: a piece’s tier is `tier:` in its file’s frontmatter",title:"title= is retired: a piece’s title is `title:` in its file’s frontmatter",tier:"tier= is retired: a piece’s tier is `tier:` in its file’s frontmatter",...Sa};function Qu(e){let t=e.i;e.i+=5,e.peek()===`"`&&e.fail(`free("…") is a text, for spell(…): a braid left free is steps, free(0 2 4 ~)`,t,6);let n=e.text.indexOf(`)`,e.i);n<0&&e.fail(`')' to close free(…)`,t,e.i-t);let r=e.within(e.text.slice(e.i,n),e.i),i=[];for(;r.skipSpace(),!r.done();){let e=r.i,t=Cu(r);l(t.atom).some(e=>e.kind!==`note`&&e.kind!==`rest`&&e.kind!==`chord`)&&r.fail(`A braid left free holds steps: numbers, rests (~), chords ([0,4]) and subsequences of them ([0 2]), held (@n) or repeated (!n)`,e,r.i-e),xu(r,i,t)}i.length||e.fail(`free(…) around a braid needs steps: free(0 2 4 ~)`,t,n-t+1),e.i=n+1;let a=i.reduce((e,t)=>e+t.repeat*t.elongate,0);return e.frees.push({key:`braid`,value:0,unit:``,lo:0,hi:a,span:e.place(t),braid:r.text.trim().replace(/\s+/g,` `)}),{kind:`list`,tokens:i}}function $u(e,r){let i={over:null,base:null,shift:null,cycle:null,step:null,map:null,stride:null,env:null,pitch:null,show:null,label:null,laps:null,tags:null,about:null,style:null,reach:null,chance:null,seed:null,size:null,swing:null,bend:null,swingMoves:null,legato:null,params:{},paramSpans:{},paramCells:{},paramClocks:{},playMove:null},a=/* @__PURE__ */ new Map,o=!1,s=!1,c=[],l=null,u=null,d=null,f=!1,p=null,m=-1,h=``,g=/* @__PURE__ */ new Map,_=/* @__PURE__ */ new Map,v=null;for(;!e.done();){let r=e.i;if(e.peek()===`"`){let t=e.match(/"[^"]*"/y);t===null&&e.fail(`A text in quotes ends with a quote: "3/4"`,r,1),(v!==null||l||c.length)&&e.fail(`A text cell is one text alone, &meter "3/4": a cell has one braid`,r,t.length),e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`),v=t.slice(1,-1);continue}let s=e.match(Wr);if(s!==null&&e.peek()===`=`){e.i++;let o=s in zu||s in W?s:Me[s]??null;if(o===null&&Nu.includes(s)){_.has(s)&&e.fail(`${s}= is given twice`,r,s.length),_.set(s,r),Yu(e,i,s),e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);continue}if(o===null&&n.includes(s)){g.has(s)&&e.fail(`${s}= is given twice`,r,s.length);let n=e.i,a=/^(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))\s*(?:±|\+-)\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9.])(?!\s*\*)/.exec(e.text.slice(e.i));if(a){g.set(s,{value:a[1],at:r}),i.reach={...i.reach??{},[s]:parseFloat(a[2])},e.i+=a[0].length,e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);continue}let o=/^(?:free\([^)]*\)|-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))\s*(?:\.\.|±|\+-)/.test(e.text.slice(e.i));if(e.text.startsWith(`free(`,e.i)&&!o)g.set(s,{value:String(Hu(e,s).value),at:r});else if(e.peek()===`&`||o){let a=e.frees.length;Yu(e,i,s);let o=i.paramCells[s];o||e.fail(`${s}=: a moving axis is a range within it and the cell that moves it, ${s}=0..1 * &walk`,n,e.i-n);let[c,l]=t.find(e=>e.name===s).range;for(let t of e.frees.slice(a))t.param!==`${s} reach`&&(t.lo<c||t.hi>l)&&e.fail(`${s}=: a window's end moves within the axis, ${c} to ${l}: free(${t.value}, ${Math.max(c,t.lo)}..${Math.min(l,t.hi)})`,n,e.i-n);let u=/±|\+-/.test(e.text.slice(n,e.i)),[d,f]=o.range??[c,l];u?[d,f]=[Math.min(l,Math.max(c,d)),Math.min(l,Math.max(c,f))]:d>=c&&d<=l&&f>=c&&f<=l||e.fail(`${s}= moves within the axis, ${c} to ${l}: ${s}=${c}..${l} * &walk`,n,e.i-n),o.range&&(i.paramCells[s]={...o,range:[d,f]}),g.set(s,{value:String(d),at:r})}else e.num(`a number after ${s}= (an axis of a style, 0 to 1), or a slider, ${s}=free(.3, 0..1)`,J.axis,s),g.set(s,{value:e.text.slice(n,e.i),at:r});e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`);continue}if(o===null){s in Zu&&e.fail(Zu[s],r,s.length);let t=We(s);e.fail(`Unknown attribute ${s}=${t?` — did you mean ${t}=?`:``} (a cell: ${Object.keys(je).join(` `)}; a sound or a physical cell: ${Object.keys(W).join(` `)})`,r,s.length)}let c=o===`loop`?`step`:o;if(a.has(c)){let t=a.get(c);e.fail(c===`step`&&i.step.whole!==(s===`loop`)?`step= and loop= say the same thing two ways — pick one`:t===s?`${s}= is given twice`:`${s}= and ${t}= are one parameter, ${o}= — given twice`,r,s.length)}a.set(c,s),s===`clip`&&e.warn(`clip= is Strudel's name for legato= — write legato= (Normalise rewrites it)`,r,s.length),(zu[o]?.read??(o===`swing`||o===`legato`?Ju:o===`bend`?qu:Pe.has(o)?Gu:Yu))(e,i,o,r),e.atBoundary()||e.fail(`Unexpected '${e.peek()}'`)}else if(s===`free`&&e.peek()===`(`&&i.map?.kind===`style`&&/^\(\s*[^,()]*,/.test(e.text.slice(e.i))){let t=n[c.length];t===void 0&&e.fail(`A style has ${n.length} axes (${n.join(` `)}): this value is one more`,r,s.length),e.i=r;let i=e.within(String(Hu(e,t).value),r);xu(i,c,Cu(i))}else if(s===`free`&&e.peek()===`(`&&Bu.test(e.text.slice(e.i)))l&&e.fail(f?Qe:`A cell has one braid: a generator or a list of steps`,r,s.length),e.i=r,xu(e,c,Cu(e));else if(s===`free`&&e.peek()===`(`)(l||c.length)&&e.fail(Qe,r,s.length),e.i=r,l=Qu(e),f=!0,m=e.i,h=e.text.slice(r+5,e.i-1).trim();else if(s===`fill`&&e.peek()===`(`){(l||c.length)&&e.fail(`A cell has one braid: fill() is all of it`,r,s.length),e.i++;let t=[];for(;e.skipSpace(),e.peek()!==`)`;){let n=e.i;for(;e.i<e.text.length&&!/[\s,)]/.test(e.text[e.i]);)e.i++;e.i===n&&e.fail(`fill(…): a fragment's id, a fill's name and the clock it reads, by commas`,n,1),t.push(e.text.slice(n,e.i)),e.skipSpace(),e.peek()===`,`&&e.i++}e.i++,(t.length>3||t[2]!==void 0&&!t[2].startsWith(`&`))&&e.fail(`fill(id, name, &clock): at most three, the clock a cell`,r,e.i-r),p={fragment:t[0]??null,name:t[1]??null,clock:t[2]?.slice(1)??null}}else if(s!==null&&lr(s)&&e.peek()===`(`){if((l||c.length||v!==null)&&e.fail(f?Qe:`A cell has one braid: a generator or a list of steps`,r,s.length),s===`fifths`){let t=ar(e,r);l=t.braid,d=t.shift}else if(s===`scale`){let t=ir(e,r);l={kind:`scan`,steps:t.steps,span:t.span,...t.mode?{mode:t.mode}:{},...t.even?{even:t.even}:{}},u=t.key}else l=fr(e,s,r)}else if(s!==null&&fu.includes(s)&&e.peek()===`(`)l&&e.fail(f?Qe:`A cell has one braid: a generator or a list of steps`),e.i=r,xu(e,c,Cu(e));else if(s===`off`&&e.atBoundary())o&&e.fail(`off is given twice`,r,s.length),o=!0;else{if(s!==null&&(/^[A-G](?:b?-?[0-9]*)$/.test(s)||s===`_`||Object.hasOwn(_n,s))?e.i=r:s!==null&&e.fail(`Unexpected '${s}'`,r,s.length),l&&f&&e.peek()===`)`&&e.fail(`A ')' with nothing to close: free(${h}) ends at its first ')'`,r,1),l&&r===m&&/[@!*/?:]/.test(e.peek())){let t=/^\S+/.exec(e.text.slice(r))[0];e.fail(`free(${h})${t}: a modifier goes on its steps, inside the parentheses: free([${h}]${t})`,r,t.length)}l&&e.fail(f?Qe:`A cell has one braid: a generator or a list of steps`,r,1),v!==null&&e.fail(`A text cell is one text alone, &meter "3/4": a cell has one braid`,r,1),xu(e,c,Cu(e))}}if(g.size){let[t,{at:r}]=[...g][0];i.map?.kind!==`style`&&e.fail(`${t}= is an axis of a style: it goes on a map=style cell (&funk map=style sync=.3 harm=.45 bite=.55 mood=.5)`,r,t.length),(l||c.length)&&e.fail(`A style writes its axes by name (sync=.3) or in order (.3 .45 .55 .5), not both`,r,t.length);let a=n.filter(e=>!g.has(e));a.length&&e.fail(`A style names every axis: ${a.map(e=>`${e}=`).join(` `)} ${a.length===1?`is`:`are`} missing (its axes: ${n.join(` `)})`,r,t.length);for(let t of n){let{value:n,at:r}=g.get(t),i=e.within(n,r+t.length+1);xu(i,c,Cu(i))}}if(_.size){let[t,n]=[..._][0];i.map?.kind!==`adsr`&&e.fail(Zu[t]??`${t}= is a slot of an envelope: it goes on a map=adsr cell`,n,t.length),(l||c.length)&&e.fail(`An envelope writes its slots by name (attack=.01) or in order (.01 .3 .5 .4), not both`,n,t.length);let r=Nu.filter(e=>!_.has(e));r.length&&e.fail(`An envelope names every slot: ${r.map(e=>`${e}=`).join(` `)} ${r.length===1?`is`:`are`} missing (its slots: ${Nu.join(` `)})`,n,t.length);for(let t of Nu){let n=_.get(t),r=i.paramCells[t],a=r?String(r.range?.[0]??0):i.params[t];typeof a!=`number`&&typeof a!=`string`&&e.fail(`${t}= takes a number, a range scaled by cells, or a cell`,n,t.length),delete i.params[t];let o=e.within(String(a),n+t.length+1);xu(o,c,Cu(o))}}let y=l??(c.length?{kind:`list`,tokens:c}:{kind:`blank`});if(i.params.oneshot!==void 0){let t=i.paramSpans.oneshot,n=i.params.oneshot;n!==0&&n!==1&&e.fail(`oneshot= is 1 (each note played through) or 0 (as its step, the default)`,t?t.col-1:0,7),s&&e.fail(`oneshot is given twice: write oneshot=1 alone`,t?t.col-1:0,7),s=n===1,delete i.params.oneshot,delete i.paramSpans.oneshot}let b;if(i.params.note!==void 0){let t=i.paramSpans.note,n=i.params.note;(typeof n!=`number`||!Number.isInteger(n)||n<0||n>127)&&e.fail(`note= is a MIDI note, a whole number from 0 to 127 (36 a kick, 38 a snare)`,t?t.col-1:0,4),b=n,delete i.params.note,delete i.paramSpans.note}if(s&&typeof i.params.glide==`number`&&i.params.glide>0){let t=i.paramSpans.glide;e.fail(`oneshot or glide=: a voice plays each note through, or ties them as one`,t?t.col-1:0,5)}d!==null&&d!==0&&(i.shift!==null&&e.fail(`fifths(n) turns it already: write fifths() and shift=, or fifths(n) alone`),i.shift=d),u&&(i.over&&e.fail(`scale(…) reads through a key of its own: drop over=, or write the key as a cell (&mode over=&key scan(…))`,i.over.span.col-1,i.over.span.len),i.over=u),i.playMove&&y.kind===`blank`&&e.warn(`${i.playMove.as} after play=: ^ and ^$ move what a gate plays (one with a braid: &out play=${i.playMove.as} &lead); a read head reads the tape itself, so the move is ignored`,i.playMove.at,i.playMove.len);let x=i.playMove&&y.kind!==`blank`?{...i.playMove.transpose?{transpose:i.playMove.transpose}:{},...i.playMove.degree?{degree:i.playMove.degree}:{}}:null,{over:S,base:C,shift:w,step:T,map:E,stride:D,cycle:O,env:k,pitch:A,show:j,label:M,tags:N,about:P,style:F,laps:I,chance:ee,seed:te,size:ne,swing:L,bend:re,swingMoves:ie,legato:R,params:z,paramSpans:ae,paramCells:oe,paramClocks:se}=i;return{name:r.name,span:r.span,over:S,...C?{base:C}:{},...i.reach?{reach:i.reach}:{},shift:w,off:o,...s?{oneshot:s}:{},...b===void 0?{}:{drumNote:b},step:T,map:E,stride:D,cycle:O,env:k,pitch:A,show:j,label:M,tags:N,about:P??void 0,...F?{style:F}:{},laps:I,chance:ee,seed:te,size:ne,...L?{swing:L}:{},...re?{bend:re}:{},...ie?{swingMoves:ie}:{},...R?{legato:R}:{},params:z,paramSpans:ae,paramCells:oe,paramClocks:se,...x?{playMove:x}:{},braid:y,...p?{fill:p}:{},...v===null?{}:{text:v},frees:[...e.frees]}}function ed(e){e.skipSpace(),e.text.startsWith(`&(`,e.i)&&e.fail(`An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …`);let t=e.cellRef(`a cell name like &theme`,`names the line`);return(t.pick||t.shift)&&e.fail(`Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here`,t.span.col-1,t.span.len),e.peek()===`(`&&e.fail(`&name(…) is gone — write over=&…`),$u(e,t)}let td=/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%\s,/]{1,40}\)|var\(--[a-z0-9-]{1,40}\))$/,nd=/^=== plugin ([a-z]+) ===\s*$/,rd=/^=== end ===\s*$/,id=/^=== plugin /m;function ad(e,t=[],n=!1){if(!id.test(e))return{text:e,plugins:[],diagnostics:[]};let r=e.split(`
`),i=[],a=[],o=(e,t,n=`error`)=>a.push({severity:n,message:t,span:{line:e,col:1,len:Math.max(1,r[e-1]?.length??1)}});for(let e=0;e<r.length;e++){let a=nd.exec(r[e]);if(!a){rd.test(r[e])&&o(e+1,`=== end === without a plugin block before it (=== plugin name === … === end ===)`);continue}let s=e,c=s+1;for(;c<r.length&&!rd.test(r[c]);)c++;let l=r.slice(s+1,c).join(`
`);c<r.length||o(s+1,`plugin ${a[1]} has no === end === line`);let u=a[1];if(t.includes(u))o(s+1,`${u} is a show of its own: a plugin needs another name`);else if(i.some(e=>e.name===u))o(s+1,`plugin ${u} is written twice`);else{let e=sd(u,l,s+1,n);typeof e==`string`?o(s+1,`plugin ${u}: ${e}`):i.push(e)}for(let e=s;e<=Math.min(c,r.length-1);e++)r[e]=``;e=c}return{text:r.join(`
`),plugins:i,diagnostics:a}}function od(e){let t=e.indexOf(`{`);if(t<0||e.slice(0,t).trim())return null;let n=0,r=!1;for(let i=t;i<e.length;i++){let a=e[i];if(r)a===`\\`?i++:a===`"`&&(r=!1);else if(a===`"`)r=!0;else if(a===`{`)n++;else if(a===`}`&&--n===0)return{json:e.slice(t,i+1),rest:e.slice(i+1)}}return null}function sd(e,t,n,r){let i=od(t);if(!i)return`starts with its manifest, a { … } of JSON: { "fits": ["meter"], "size": 200 }`;let a;try{a=JSON.parse(i.json)}catch(e){return`its manifest is not JSON (${e.message})`}if(typeof a!=`object`||!a||Array.isArray(a))return`its manifest is an object`;let o=a,s=[`fits`,`size`,`rim`,`meaning`,`dial`,`tokens`],c=Object.keys(o).find(e=>!s.includes(e));if(c)return`its manifest has no "${c}" (it has: ${s.join(`, `)})`;if(!Array.isArray(o.fits)||!o.fits.length||!o.fits.every(e=>typeof e==`string`))return`"fits" lists the kinds of cell it shows: ["meter"]`;let l=o.size??200;if(typeof l!=`number`||!(l>=60&&l<=400))return`"size" is a number from 60 to 400`;if(o.rim!==void 0&&typeof o.rim!=`boolean`)return`"rim" is true or false`;if(o.meaning!==void 0&&typeof o.meaning!=`string`)return`"meaning" is a text`;let u=null;if(o.dial!==void 0){let e=o.dial;if(!(e&&typeof e==`object`&&typeof e.label==`string`&&typeof e.turn==`number`&&e.turn>0&&typeof e.key==`number`&&e.key>0))return`"dial" is { "label": "The day", "turn": 86400, "key": 3600 }: a name, seconds for a turn, seconds for a key press`;u={label:e.label,turn:e.turn,key:e.key}}let d={};if(o.tokens!==void 0){let e=o.tokens;if(!e||typeof e!=`object`||Object.values(e).some(e=>typeof e!=`string`||!td.test(e)))return`"tokens" maps names to colours (#rgb, rgb(…), hsl(…), a name, var(--x)): { "sun": "#ffd84a" }`;if(Object.keys(e).includes(`__proto__`))return`"tokens": a token can't be called __proto__`;Object.assign(d,e)}return{name:e,fits:o.fits,size:l,rim:o.rim!==!1,meaning:o.meaning??``,dial:u,tokens:d,code:i.rest.replace(/^\n+|\s+$/g,``),builtin:r,line:n}}function cd(e,t){let n=new Zr(t,e.line,0,[],e.parts,[],0,$u);return{decl:ed(n),lambdas:n.lambdas}}function ld(e){let t=[],n=[],r=[],{text:i,plugins:a,diagnostics:o}=ad(e),s=[...o],c=[],l=[],u=null;return i.split(`
`).forEach((e,t)=>{let n=Qr(e);u?(u.text+=` `,u.parts.push({line:t+1,start:u.text.length}),u.text+=n):u={text:n,line:t+1,parts:[{line:t+1,start:0}]},/[+*,[]\s*$/.test(u.text)||(l.push(u),u=null)}),u&&l.push(u),l.forEach(({text:e,line:i,parts:a})=>{let o=e,l=new Zr(o,i,0,[],a,s,0,$u);if(l.done())return;if(_e(o)){let e=o.search(/\S/);s.push({severity:`error`,message:`use is retired (decision 065): a line says where its cells come from, &bd, &sd from gm_kit (a collection, by name) or &key from diatonic(mode=dorian) D (a template, with its arguments)`,span:{line:i,col:e+1,len:o.trimEnd().length-e}});return}let u=Oe(o);if(u!==void 0){let e=o.search(/\S/),t={line:i,col:e+1,len:o.trimEnd().length-e};if(u===null?s.push({severity:`error`,message:ke,span:t}):u.kind===`use`?n.push({id:u.id,names:u.names,span:t}):u.kind===`signature`&&r.push(...u.names.map(e=>e.slice(1))),u&&u.kind!==`use`)for(let e of u.attributes??[]){let n=/^([A-Za-z_][A-Za-z0-9_]*)=/.exec(e)?.[1];if(!n||n===`style`||n===`facet`)continue;let r=u.kind===`signature`?u.optional.map(e=>e.slice(1)):[];r.includes(n)||s.push({severity:`error`,message:u.kind===`declaration`?`${n}=: a collection's declaration says where it is found, style= and facet= (decision 089)`:`${n}= is no optional parameter of this template: a declaration's arguments are its optional parameters (${r.length?r.map(e=>`${e}=`).join(` `):`it has none`}), beside style= and facet=`,span:t})}}else try{let e=l.i,n=l.match(Wr);if(n===`step`&&l.peek()===`(`)l.fail(`step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm`,e,4);else if(n===`out`&&/^\s*[(=]/.test(l.text.slice(l.i)))l.fail(`out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix`,e,3);else if(n===`cell`)l.fail(`The cell keyword is gone: a line starting with &name declares a cell`,e,4);else if(n===null){l.i=e;let n=ed(l);if(l.holes.length&&n.base){s.push({severity:`error`,message:`base= and a cell read as the piece is built (seed=&s, 0!&n) are not yet one line: write the number, or the cell without base=`,span:n.base.span});return}let r=l.holes.length?{text:o,line:i,parts:a,lambdas:l.lambdas.map(e=>e.name),holes:[...l.holes]}:void 0;t.push(r?{...n,built:r}:n,...l.lambdas)}else l.fail(`A line declares a cell: &name …`,e,n.length)}catch(e){if(!(e instanceof Yr))throw e;let n=/^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(o);if(l.holes.length&&n){let e=o.indexOf(`&`),r={name:n[1],pick:null,shift:0,span:{...Xr(a,e),len:n[0].length-n[0].indexOf(`&`)}};t.push({...$u(new Zr(``,i,0,[],a,[],0,$u),r),built:{text:o,line:i,parts:a,lambdas:[],holes:[...l.holes]}});return}s.push({severity:`error`,message:e.message,span:{...Xr(a,e.col),len:e.len}});let r=/^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(o)?.[1];r&&c.push(r)}}),N({cells:t,diagnostics:s,broken:c,plugins:a,...n.length?{takes:n}:{},...r.length?{offers:r}:{}})}let ud=e=>{if(!e||e.braid.kind!==`list`)return null;let t=e.braid.tokens.map(e=>e.atom.kind===`note`&&e.repeat===1&&e.elongate===1&&e.subdivide===1?e.atom.value:NaN);return t.some(e=>Number.isNaN(e))?null:t};function dd(e,t){let n=e.atom;return n.kind===`note`?{...e,atom:{...n,value:t(n.value)}}:n.kind===`choice`?{...e,atom:{...n,values:n.values.map(t)}}:n.kind===`seq`?{...e,atom:{...n,layers:n.layers.map(e=>e.map(e=>dd(e,t)))}}:e}let fd=e=>Math.min(1,Math.max(0,e));function pd(e,t,n,r,i){let a=e.braid.kind===`list`?{...e.braid,tokens:e.braid.tokens.map(e=>dd(e,e=>t+(n-t)*fd(e)))}:e.braid;return{...e,name:r,span:i,braid:a,label:null,about:void 0,...e.style?{style:void 0}:{}}}let md=e=>String(Math.round(e*1e9)/1e9);function hd(e,n){let r=new Map(e.cells.map(e=>[e.name,e])),o=[],s=(e,t)=>o.push({severity:`error`,message:e,span:t}),c=e=>{let n=r.get(e.name);if(!n)return null;let i=ud(n);return n.map?.kind!==`style`||!i||i.length!==t.length?(s(`style=&${e.name}: a style is a map=style cell (&${e.name} map=style .3 .45 .55 .55), or a mix of them by weight`,e.span),null):i},l=e=>{if(e.kind===`cell`)return c(e.ref);let n=e.terms.map(e=>({v:c(e.ref),w:e.weight}));return n.some(e=>!e.v)?null:t.map((e,t)=>n.reduce((e,n)=>e+n.w*n.v[t],0))},u=/* @__PURE__ */ new Map;for(let n of e.cells){if(!n.style)continue;if(n.style.set){for(let e of n.style.set)l(e.point);n.name===`style`&&s(`&${i} style=( … | … ): the section's style is one point, not a set (a set says where a cell belongs: &${i} style=&funk)`,n.style.span);continue}let e=l(n.style.from),a=n.style.to?l(n.style.to):null;if(!e||n.style.to&&!a)continue;let o=[e,...a?[a]:[]].flatMap(e=>t.filter((t,n)=>!(e[n]>=t.range[0]-1e-9&&e[n]<=t.range[1]+1e-9)));if(o.length){s(`&${n.name} style=: its style lies outside the axes on ${[...new Set(o.map(e=>e.name))].join(`, `)} (each ${t[0].range[0]} to ${t[0].range[1]}); a mix's weights sum its styles' points`,n.style.span);continue}let c=n.style.curve??null;if(c&&!r.has(c.name))continue;let d=c?r.get(c.name).braid:null;c&&!(d?.kind===`list`&&d.tokens.every(e=>e.atom.kind===`note`))?s(`style=a..b * &${c.name}: a curve is a line of numbers from 0 to 1 (&${c.name} map=lin step=1m 0 .5 1)`,c.span):u.set(n.name,{from:e,to:a,curve:c})}let d=/* @__PURE__ */ new Map,f=!1,p=!1,m=e.cells.some(e=>typeof(e.params.play??e.params.trigger)==`string`&&e.braid.kind!==`blank`),h=e=>{if(!e.pick||e.pick.kind!==`at`||!e.pick.abs)return null;let c=e.pick.i,l=r.get(e.name),h=u.get(e.name),g=null,_=t[c]?.name,v=e=>{let t=r.get(e);return t?.map?.kind===`style`&&_?t.paramCells?.[_]:void 0},y=l?.style;if(y?.set)return s(`&${e.name}[${t[c]?.name??c}]: a set has no one value: pick from one of its styles`,e.span),null;let b=y?[y.from,...y.to?[y.to]:[]].flatMap(e=>e.kind===`cell`?[e.ref]:e.terms.map(e=>e.ref)):[],x=l?.map?.kind===`style`?v(e.name):void 0;if(!x&&b.some(e=>v(e.name))&&(y.to||y.from.kind!==`cell`&&y.from.kind!==`mix`))return s(`&${e.name}[${_}]: a range of styles doesn't move with a moving one yet; name the moving style alone, style=&${b.find(e=>v(e.name)).name}`,e.span),null;let S=(t,n,i)=>{let a=e.span,o=(e,t)=>({e:{k:`prod`,factors:[{k:`ref`,ref:{name:e,pick:null,shift:0,span:a}},{k:`num`,value:t,span:a}],span:a},sign:1}),s=[{k:`sum`,items:[...n.map(e=>o(e.cell,e.weight)),...i===0?[]:[{e:{k:`num`,value:i,span:a},sign:1}]],span:a}];return d.set(t,{...d.get(n[0].cell)??r.get(n[0].cell),name:t,span:a,params:{},paramSpans:{},paramCells:void 0,paramClocks:void 0,map:null,step:null,label:null,about:void 0,style:void 0,braid:{kind:`list`,tokens:[{atom:{kind:`mix`,exprs:s},repeat:1,subdivide:1,elongate:1,span:a}]}}),t},C=(e,t,n,i,a)=>{if(d.has(i))return i;let o=Y(e,r);if(o&&!o.terms.length){let a=r.get(e).span;return d.set(i,{...r.get(e),name:i,span:a,params:{},paramSpans:{},paramCells:void 0,paramClocks:void 0,map:null,step:null,label:null,about:void 0,style:void 0,braid:{kind:`list`,tokens:[{atom:{kind:`note`,value:t+(n-t)*fd(o.constant),alter:0},repeat:1,subdivide:1,elongate:1,span:a}]}}),i}if(o){let e=o.terms.reduce((e,t)=>e+t.weight,0),r=o.terms.map((e,r)=>({cell:C(e.cell,t,n,`${i}_${r}`,a),weight:e.weight}));return r.some(e=>e.cell===null)?null:S(i,r,t*(1-e)+(n-t)*o.constant)}let c=r.get(e);if(!c)return null;if(c.braid.kind!==`list`)return s(`${_}=… * &${c.name}: an axis moves by a line of numbers from 0 to 1, like &${c.name} step=1m*8 [0|.25|.5|.75|1], or a sum of them`,a),null;let l=e=>{let r=e.atom;if(r.kind===`ref`){if(r.pick||r.slot||r.values||r.transpose)return e;let o=C(r.name,t,n,`${i}_${r.name}`,a);return o===null?null:{...e,atom:{...r,name:o}}}if(r.kind!==`seq`)return e;let o=r.layers.map(e=>e.map(l));return o.some(e=>e.some(e=>e===null))?null:{...e,atom:{...r,layers:o}}},u=c.braid.tokens.map(l);return u.some(e=>e===null)?null:(d.set(i,pd({...c,braid:{...c.braid,tokens:u}},t,n,i,a)),i)},w=(e,n)=>{if(e.factors.length!==1||e.factors[0].pick)return s(`${_}=… * &x: an axis moves by one cell, a line of numbers or a sum of them, &drift [&a * .5 + &b * .5] (decision 079)`,e.span),null;let[r,i]=e.range??t[c].range;return C(e.factors[0].name,r,i,n,e.factors[0].span)};if(x)return w(x,`λ${e.name}_${c}`);if(y?.from.kind===`cell`&&!y.to){let e=v(y.from.ref.name);if(e)return w(e,`λ${y.from.ref.name}_${c}`)}if(y?.from.kind===`mix`&&!y.to&&b.some(e=>v(e.name))){let t=`λ${e.name}_${c}`;if(d.has(t))return t;let n=[],i=0;for(let e of y.from.terms){let t=v(e.ref.name);if(t){let r=w(t,`λ${e.ref.name}_${c}`);if(r===null)return null;n.push({cell:r,weight:e.weight})}else i+=e.weight*(ud(r.get(e.ref.name))?.[c]??0)}return S(t,n,i)}if(!l&&e.name===`style`)g=md(a[c]),!p&&m&&o.push({severity:`info`,message:`no line writes &${i}: &${i}[${t[c].name}] reads the centre of style space, ${md(a[c])} on each axis (a score names its style as the note &${i} style=…, decision 063)`,span:e.span}),p=!0;else if(h){let t=h.from[c],i=h.to?h.to[c]:t;h.to&&!h.curve&&(f=!0);let a=h.curve?r.get(h.curve.name):void 0;if(a&&t!==i){let n=`λ${e.name}_${c}`;return d.has(n)||d.set(n,pd(a,t,i,n,e.span)),n}if(t===i||!n)g=md(t);else if(`bars`in n){let e=n.bars*16;g=`map=lin step=1m*16 ${Array.from({length:e},(n,r)=>md(t+(i-t)*r/e)).join(` `)}`}else g=`map=lin step=${md(1/n.seconds)}hz ${md(t)} ${md(i)}`}else if(l&&(l.map?.kind===`style`||l.map?.kind===`adsr`)){let e=ud(l)?.[c];e!==void 0&&(g=md(e))}if(g===null)return null;let T=`λ${e.name}_${c}`;if(!d.has(T)){let t=ld(`&styleRead lpf=0..1 * &(${g})`).cells.find(e=>e.name!==`styleRead`);t&&d.set(T,{...t,name:T,span:e.span})}return d.has(T)?T:null},g=/* @__PURE__ */ new Map,_=!1,v=(e,t)=>{if(e.k===`sum`){let n=e.items.map(e=>{let n=v(e.e,t);return n===e.e?e:{...e,e:n}});return n.every((t,n)=>t===e.items[n])?e:{...e,items:n}}if(e.k===`prod`){let n=e.factors.map(e=>v(e,t));return n.every((t,n)=>t===e.factors[n])?e:{...e,factors:n}}if(e.k!==`ref`||e.ref.pick?.kind!==`at`||!e.ref.pick.abs)return e;let n=r.get(e.ref.name);if(!n||n.map?.kind!==`style`&&!n.style)return e;let i=h(e.ref);return i?(g.set(i,{cell:e.ref.name,slot:e.ref.pick.i,...e.ref.slot?{named:e.ref.slot}:{}}),{...e,ref:{...e.ref,name:i,pick:null,slot:void 0}}):e},y=/* @__PURE__ */ new Map;for(let t of e.cells){if(t.braid.kind!==`list`||!t.braid.tokens.some(e=>e.atom.kind===`mix`))continue;let e=!1,n=t.braid.tokens.map(n=>{let r=n.atom;if(r.kind!==`mix`)return n;let i=r.exprs.map(e=>v(e,t));return i.every((e,t)=>e===r.exprs[t])?n:(e=!0,{...n,atom:{...r,exprs:i}})});if(!e)continue;let i={...t,braid:{...t.braid,tokens:n}};y.set(t.name,i),r.set(t.name,i)}let b=e.cells.map(e=>{let t=y.get(e.name)??e;if(t!==e&&(_=!0),!t.paramCells)return t;let n=null;for(let[e,r]of Object.entries(t.paramCells)){let i=r.factors.map(e=>{let t=h(e);return t&&e.pick?.kind===`at`&&g.set(t,{cell:e.name,slot:e.pick.i,...e.slot?{named:e.slot}:{}}),t?{name:t,pick:null,shift:0,span:e.span}:e});i.some((e,t)=>e!==r.factors[t])&&((n??={...t.paramCells})[e]={...r,factors:i})}return n?(_=!0,{...t,paramCells:n}):t});return!_&&!o.length?{parsed:e,glides:f}:{parsed:{...e,cells:[...b,...[...d].map(([e,t])=>g.has(e)?{...t,readsSlot:g.get(e)}:t)],diagnostics:[...e.diagnostics,...o]},glides:f}}function gd(e,t=ut,n){let r=lo(li(e)),i=hd(r,null),a=bo(i.parsed,t,n);if(!i.glides)return a;let o=_d(a);return o?bo(hd(r,o).parsed,t,n):a}function _d(e){let t=e.ok?zc(Hc(e)):null;if(!t||!Number.isFinite(t)||t<=0)return null;let n=e.mainMeter;if(!n||!e.clocks.has(n))return{seconds:t};let r=e.cells.get(n)?.units.length??0;if(!r)return{seconds:t};let i=hs(e,lt(e)).map(n).stepAt(t)/r;return Math.abs(i-Math.round(i))<1e-6&&Math.round(i)>0?{bars:Math.round(i)}:{seconds:t}}function vd(e,t=ut,n={}){return yd(bd(e,t,n))}function yd(e){return e.diagnostics.some(e=>e.message.includes(`λ`))?{...e,diagnostics:e.diagnostics.map(e=>({...e,message:c(e.message)}))}:e}function bd(e,t,n){let r=e;if(!xl(r))return xd(gd(ld(r),t),r,n.plugins);let i=$l(r,n),a=xd(gd(ld(i.text),t,i.given),i.text,n.plugins),o=[...i.diagnostics,...a.diagnostics.map(e=>({...e,span:i.through(e.span.line)??e.span}))].sort((e,t)=>e.span.line-t.span.line||e.span.col-t.span.col);return{...a,ok:!o.some(e=>e.severity===`error`),diagnostics:o,takes:i.takes,...i.origins.size?{origins:i.origins}:{}}}function xd(e,t,n=[]){if(![...e.cells.values()].some(e=>e.fill))return e;let r=t.split(`
`),i=new Map([...e.cells.values()].map(e=>[e.name,Ae(r[e.span.line-1]??``)[0].trim()]));return{...e,codes:i,...n.length?{pluginFragments:new Map(n.map(e=>[e.fragment,e]))}:{}}}function Sd(e,t){let n=e.base??t.base,r=e.base===null?null:e.base-n,i=t.base===null?null:t.base-n,a=e=>e.stretch?`${e.key}@${e.stretch}`:e.key;return{key:`${a(e)}/${r}|${a(t)}/${i}`,base:n,offA:r,offB:i}}function Cd(e,t){let n=/* @__PURE__ */ new Map;e.forEach((e,r)=>{let i=t[r],a=``,o=-2;for(let t=0;t+1<e.length;t++){if(i&&(i[t]||i[t+1]))continue;let r=Sd(e[t],e[t+1]).key;(r!==a||o!==t-1)&&(n.set(r,(n.get(r)??0)+1),a=r,o=t)}});let r=null;for(let[e,t]of n)t>=2&&(!r||t>r.count)&&(r={key:e,count:t});return r}let wd=(e,t)=>{let n=/* @__PURE__ */ new Map;for(let t of e.rules.values())t.of&&n.set(t.of,[...n.get(t.of)??[],t]);let r=[...e.rules.values()].filter(e=>!e.of).map(e=>e.key),i=[...e.lines.map(e=>[...e.toks]),...r.map(t=>e.rules.get(t).kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}})))],a=[...e.lines.map(()=>null),...r.map(t=>{let r=n.get(t);return r?e.rules.get(t).kids.map((e,t)=>r.some(e=>e.patched[t])):null})],o=new Map([...n].map(([e,t])=>[e,t.map(e=>({...e,kids:[...e.kids],patched:[...e.patched]}))])),s=new Map(e.rules),c=0,l=Math.max(0,...[...s.keys()].map(e=>Number(e.slice(1))||0))+1;for(let n=Cd(i,a);n;n=Cd(i,a)){let d=`s${l++}`,f=null,p=[];i=i.map((t,i)=>{let s=a[i],c=i>=e.lines.length?o.get(r[i-e.lines.length]):void 0,l=[],u=[],m=c?.map(()=>({kids:[],patched:[]}));for(let e=0;e<t.length;e++){if(e+1<t.length&&!(s&&(s[e]||s[e+1]))){let r=Sd(t[e],t[e+1]);if(r.key===n.key){f??={key:d,kids:[{key:t[e].key,off:r.offA,...t[e].stretch?{stretch:t[e].stretch}:{}},{key:t[e+1].key,off:r.offB,...t[e+1].stretch?{stretch:t[e+1].stretch}:{}}]},l.push({key:d,base:r.base}),u.push(!1),c?.forEach((t,n)=>{let[r,i]=[t.kids[e],t.kids[e+1]],a=Sd({key:r.key,base:r.off},{key:i.key,base:i.off});m[n].kids.push({key:d,off:a.base}),m[n].patched.push(!1)}),e++;continue}}l.push(t[e]),u.push(s?.[e]??!1),c?.forEach((t,n)=>{m[n].kids.push(t.kids[e]),m[n].patched.push(t.patched[e])})}return c?.forEach((e,t)=>Object.assign(e,m[t])),p.push(s?u:null),l}),a=p,s.set(d,f),c++,t?.(u)}return c?u():null;function u(){let t=new Map(s);r.forEach((n,r)=>t.set(n,{key:n,kids:i[e.lines.length+r].map(e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}))}));for(let e of o.values())for(let n of e)t.set(n.key,{...n,kids:[...n.kids],patched:[...n.patched]});return{lines:e.lines.map((e,t)=>({...e,toks:i[t]})),rules:t,looks:e.looks}}},Td=e=>`r${e}`,Ed=e=>{let t=/^(-?\d+)([#b]*)$/.exec(e);return t?{n:Number(t[1]),acc:t[2]}:null};function Dd(e){let t=e.values.map(Ed);if(t.some(e=>e===null))return{key:`d${e.dur}:${[...e.values].sort().join(`,`)}`,base:null};let n=Math.min(...t.map(e=>e.n));return{key:`n${e.dur}:${t.map(e=>`${e.n-n}${e.acc}`).join(`,`)}`,base:n}}function Od(e){let t=[],n=0;for(let r of[...e.chords].sort((e,t)=>e.at-t.at))r.at>n&&t.push({key:Td(r.at-n),base:null}),t.push(Dd(r)),n=r.at+r.dur;return e.length>n&&t.push({key:Td(e.length-n),base:null}),t}let kd=(e,t)=>e.replace(/^([rdn])(\d+)/,(e,n,r)=>`${n}${Number(r)*t}`),$=e=>/^[rdn]\d/.test(e),Ad=e=>/^f\d/.test(e);function jd(e,t){let n=/^([rdn])(\d+)(?::(.*))?$/.exec(e),r=Number(n[2]),i=r===1?``:`@${r}`;if(n[1]===`r`)return`~${i}`;let a=n[1]===`d`?n[3].split(`,`):n[3].split(`,`).map(e=>{let n=Ed(e);return`${n.n+(t??0)}${n.acc}`});return`${a.length===1?a[0]:`[${a.join(`,`)}]`}${i}`}new Set(Uc.flatMap(e=>[e.name,...e.aliases]));let Md=String.raw`&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?`;new RegExp(String.raw`^(?:${Md}|inverse\(${Md}\)|degree\((?:${Md}|inverse\(${Md}\)),\s*-?\d+\))$`);let Nd=[`rotate`,`drop`,`add`],Pd=[`transpose`,`invert`,`reverse`,`bend`,`trim`],Fd=[`rotate`,`reverse`,`third`,`dominant`,`swap`,`substitute`];[.../* @__PURE__ */ new Set([...Nd,...Pd,...Fd,`shift`,`split`])];let Id=[3,4,5,6,7,8,9,10,12,16],Ld=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),Rd=e=>e.key.startsWith(`r`)?null:/^n\d+:0$/.test(e.key)?e.base:void 0;function zd(e){let t=e.map(Rd);if(t.some(e=>e===void 0))return null;let n=[...new Set(t.filter(e=>e!==null))];return n.length<2?null:{sig:e.map((e,r)=>`${Ld(e)}:${t[r]===null?`~`:n.indexOf(t[r])}`).join(` `),chord:n}}let Bd=e=>{let t=new Map(e.looks??[]),n=0,r=e.lines.map(e=>{let r=e.toks;if(r.some(e=>!$(e.key)))return e;let i=[];r.reduce((e,t)=>(i.push(e),e+Ld(t)),0);let a=[];for(let e of Id)for(let t=0;t+e*3<=r.length;t++){let n=zd(r.slice(t,t+e));if(!n)continue;let o=r.slice(t,t+e).reduce((e,t)=>e+Ld(t),0);if(i[t]%o!==0)continue;let s=[n.chord];for(;t+e*(s.length+1)<=r.length;){let i=zd(r.slice(t+e*s.length,t+e*(s.length+1)));if(!i||i.sig!==n.sig||i.chord.length!==n.chord.length)break;s.push(i.chord)}if(s.length<3||s.length*e<12||s.filter((e,t)=>t>0&&e.join()!==s[t-1].join()).length<(s.length-1)/2)continue;let c=r.slice(t,t+e*s.length).reduce((e,t)=>e+jd(t.key,t.base).length+1,0),l=30+s.reduce((e,t)=>e+t.join(`,`).length+3,0)+2*(i[t]/o)+30+2*e+8;l<c&&a.push({from:t,size:e,count:s.length,chords:s,sig:n.sig,dur:o,gain:c-l})}a.sort((e,t)=>t.gain-e.gain||e.from-t.from);let o=[],s=a.filter(e=>{let[t,n]=[e.from,e.from+e.size*e.count];return!o.some(([e,r])=>t<r&&e<n)&&(o.push([t,n]),!0)});if(!s.length)return e;let c=[],l=0;for(let a of s.sort((e,t)=>e.from-t.from)){c.push(...r.slice(l,a.from));let o=`f${t.size+1}`,s={pattern:a.sig.split(` `).map(e=>{let[t,n]=e.split(`:`);return n===`~`?{key:`r${t}`,base:null}:{key:`n${t}:0`,base:Number(n)}}),chords:a.chords,dur:a.dur,start:i[a.from],scale:e.scale??1};t.set(o,s),c.push({key:o,base:null}),l=a.from+a.size*a.count,n++}return c.push(...r.slice(l)),{...e,toks:c}});return n?{lines:r,rules:e.rules,looks:t}:null},Vd=(e,t)=>t?Vd(t,e%t):e,Hd=e=>{let t=0,n=e.lines.map(e=>{if(e.toks.some(e=>!$(e.key)))return e;let n=e.toks.reduce((e,t)=>Vd(e,Number(/^[rdn](\d+)/.exec(t.key)[1])),0);if(n<=1)return e;t++;let r=e.toks.map(e=>({...e,key:e.key.replace(/^([rdn])(\d+)/,(e,t,r)=>`${t}${Number(r)/n}`)}));return{name:e.name,toks:r,scale:(e.scale??1)*n}});return t?{...e,lines:n}:null},Ud=(e,t)=>t?Ud(t,e%t):e,Wd=e=>Number(/^[rdn](\d+)/.exec(e.key)[1]),Gd=(e,t)=>{let n=new Map(e.rules),r=/* @__PURE__ */ new Map,i=Math.max(0,...[...n.keys()].map(e=>Number(e.slice(1))||0))+1,a=0,o=e.lines.map(e=>{if(e.toks.every(e=>$(e.key))&&e.toks.reduce((e,t)=>Ud(e,Wd(t)),0)>=2)return e;let t=[],o=e.toks;for(let e=0;e<o.length;){let s=0,c=e;for(;c<o.length&&$(o[c].key)&&Ud(s,Wd(o[c]))>=2;)s=Ud(s,Wd(o[c++]));let l=o.slice(e,c);if(l.length<12||!l.some(e=>e.base!==null)){t.push(o[e]),e++;continue}let u=l.find(e=>e.base!==null).base,d=l.map(e=>({key:kd(e.key,1/s),off:e.base===null?null:e.base-u})),f=d.map(e=>`${e.key}/${e.off}`).join(` `),p=l.reduce((e,t)=>e+jd(t.key,t.base).length+1,0),m=d.reduce((e,t)=>e+jd(t.key,t.off).length+1,0),h=r.get(f);if(!h&&p-11-(5+m)<=0){t.push(o[e]),e++;continue}let g=h;if(!g){g=`s${i++}`;let e={key:g,kids:d};n.set(g,e),r.set(f,g)}t.push({key:g,base:u,stretch:s}),a++,e=c}return{...e,toks:t}});if(!a)return null;let s={...e,lines:o,rules:n};return t?.(()=>s),s},Kd=e=>Math.max(2,Math.floor(e/4)),qd=(e,t)=>{let n=e.lines.map(e=>[...e.toks]),r=n.map(e=>e.map(()=>!1)),i=new Map(e.rules),a=Math.max(0,...[...i.keys()].map(e=>Number(e.slice(1))||0))+1,o=0,s=e=>jd(e.key,e.base).length+1,c=(e,t,i)=>{let a=n[e.line],o=n[t.line],s=r[e.line],c=r[t.line];if(e.i+i>a.length||t.i+i>o.length)return null;let l=Kd(i),u=0;for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];if(!$(r.key)||!$(i.key)||s[e.i+n]||c[t.i+n]||r.key!==i.key&&++u>l)return null}let d=/* @__PURE__ */ new Map;for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];r.key===i.key&&r.base!==null&&i.base!==null&&d.set(i.base-r.base,(d.get(i.base-r.base)??0)+1)}let f=0,p=-1;for(let[e,t]of d)t>p&&([f,p]=[e,t]);let m=0,h=Array(i);for(let n=0;n<i;n++){let r=a[e.i+n],i=o[t.i+n];if(h[n]=r.key!==i.key||r.base===null!=(i.base===null)||r.base!==null&&i.base-r.base!==f,h[n]&&++m>l)return null}return{diff:h,by:f}};for(let e=0;e<32;e++){let e=/* @__PURE__ */ new Map;n.forEach((t,n)=>{for(let i=0;i+5<=t.length;i++){let a=t.slice(i,i+5);if(a.some((e,t)=>!$(e.key)||r[n][i+t]))continue;let o=a.find(e=>e.base!==null)?.base??0,s=a.map(e=>`${e.key}/${e.base===null?``:e.base-o}`).join(` `);e.set(s,[...e.get(s)??[],{line:n,i}])}});let u=/* @__PURE__ */ new Map;for(let t of e.values()){if(t.length<2||t.length>48)continue;let e=t[0],i=n[e.line];for(let a of t.slice(1)){if(a.line===e.line&&a.i<e.i+5)continue;let t=n[a.line],o=i.slice(e.i,e.i+5).findIndex(e=>e.base!==null),s=o<0?0:t[a.i+o].base-i[e.i+o].base,l=5,d=0;for(;;){let[n,o]=[i[e.i+l],t[a.i+l]];if(!n||!o||!$(n.key)||!$(o.key)||r[e.line][e.i+l]||r[a.line][a.i+l]||a.line===e.line&&e.i+l+1>a.i)break;let c=n.key!==o.key||n.base===null!=(o.base===null)||n.base!==null&&o.base-n.base!==s;if(c&&d+1>Kd(l+1))break;d+=+c,l++}for(;l>5&&c(e,a,l)?.diff[l-1];)l--;if(l<12)continue;let f=`${e.line}:${e.i}:${l}`,p=u.get(f);u.set(f,{proto:e,n:l,score:(p?.score??l)+l})}}let d=null,f=(e,t)=>{let r=[];return n.forEach((n,i)=>{for(let a=0;a+t<=n.length;a++){if(i===e.line&&a<e.i+t&&a+t>e.i)continue;let n=c(e,{line:i,i:a},t);n&&(r.push({at:{line:i,i:a},...n}),a+=t-1)}}),r},p=(e,t,r)=>{let i=n[e.line].slice(e.i,e.i+t).reduce((e,t)=>e+s(t),0),a=r.reduce((e,r)=>{let i=r.diff.filter(Boolean).length;return e+(i?22+6*i+n[r.at.line].slice(r.at.i,r.at.i+t).reduce((e,t,n)=>e+(r.diff[n]?s(t):0),0):9)},9+i+6);return(r.length+1)*i-a+2*t*r.length};for(let e of[...u.values()].sort((e,t)=>t.score-e.score).slice(0,4)){let{proto:t,n:r}=e,i=f(t,r),a=(e,r)=>{let a=null;for(let o of[t,...i.map(e=>e.at)]){let t={line:o.line,i:o.i+r};if(t.i<0||t.i+e>n[t.line].length)continue;let i=f(t,e),s=i.reduce((e,t)=>e+t.diff.filter(Boolean).length,0);(!a||i.length>a.returns.length||i.length===a.returns.length&&s<a.apart)&&(a={proto:t,returns:i,apart:s})}return a},o=a(r,0);o&&([t,i]=[o.proto,o.returns]);let s=(e,t)=>e.some(e=>e.diff.some(Boolean))?t:-1/0,c={proto:t,n:r,returns:i,gain:s(i,p(t,r,i))},l=i.length;for(;r<64;){let e=null;for(let t of[0,-1]){let n=a(r+1,t);n&&n.returns.length&&(!e||n.returns.length>e.returns.length)&&(e=n)}if(!e||2*e.returns.length<l)break;[t,i]=[e.proto,e.returns],r++;let n=s(i,p(t,r,i));n>c.gain&&(c={proto:t,n:r,returns:i,gain:n})}c.gain>0&&(!d||c.gain>d.gain)&&(d=c)}if(!d)break;let{proto:m,n:h}=d,g=n[m.line].slice(m.i,m.i+h),_=g.find(e=>e.base!==null)?.base??null,v=(e,t)=>e.map(e=>({key:e.key,off:e.base===null?null:e.base-(t??0)})),y={key:`s${a++}`,kids:v(g,_)};i.set(y.key,y);let b=[{at:m,tok:{key:y.key,base:_}}];for(let e of d.returns){let t=n[e.at.line].slice(e.at.i,e.at.i+h);if(!e.diff.some(Boolean)){b.push({at:e.at,tok:{key:y.key,base:_===null?null:_+e.by}});continue}let r=t.find(e=>e.base!==null)?.base??null,o={key:`s${a++}`,kids:v(t,r),of:y.key,patched:e.diff};i.set(o.key,o),b.push({at:e.at,tok:{key:o.key,base:r}})}for(let{at:e,tok:t}of b.sort((e,t)=>t.at.line-e.at.line||t.at.i-e.at.i))n[e.line].splice(e.i,h,t),r[e.line].splice(e.i,h,!0);o++,t?.(l)}return o?l():null;function l(){return{...e,lines:e.lines.map((e,t)=>({...e,toks:[...n[t]]})),rules:new Map(i)}}};function Jd(e,t,n=`^$`){return $(e.key)?jd(e.key,e.base):Ad(e.key)?`&${t.get(e.key)??e.key}`:`&${t.get(e.key)??e.key}${e.base?`${n}${e.base}`:``}${e.stretch&&e.stretch!==1?`@${e.stretch}`:``}`}function Yd(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}let Xd=(e,t,n=`^$`)=>Yd(e.map(e=>Jd(e,t,n)));function Zd(e,t,n,r){let i=e.kids.findIndex((n,r)=>!e.patched[r]&&n.off!==null&&t.kids[r].off!==null),a=i<0?0:e.kids[i].off-t.kids[i].off,o=e.kids.map((t,i)=>e.patched[i]?Jd({key:t.key,base:t.off},n,r):`=`);for(;o.length&&o[o.length-1]===`=`;)o.pop();return`base=&${n.get(t.key)??t.key}${a?`${r}${a}`:``} ${Yd(o)}`}let Qd=e=>e.kids.map(e=>({key:e.key,base:e.off,...e.stretch?{stretch:e.stretch}:{}}));function $d(e){let t=[],n=/* @__PURE__ */ new Set,r=i=>{for(let a of i)if(!$(a.key)&&!Ad(a.key)&&!n.has(a.key)){n.add(a.key),t.push(a.key);let i=e.rules.get(a.key);r(i.of?[{key:i.of,base:null}]:Qd(i))}};for(let t of e.lines)r(t.toks);return t}function ef(e,t=`m`,n=`pulse`,r=`^$`,i){let a=$d(e),o=i?[...i.keys()].filter(e=>a.includes(e)):a,s=new Map(i?o.map(e=>[e,i.get(e)]):o.map((e,n)=>[e,`${t}${n+1}`])),c=o.map(t=>{let n=e.rules.get(t);return`&${s.get(t)} ${n.of?Zd(n,e.rules.get(n.of),s,r):Xd(Qd(n),s,r)}`}),l=/* @__PURE__ */ new Map,u=0;for(let[t,r]of e.looks??[]){u++;let e=1;for(let t=2;t<=r.pattern.length;t++){let n=r.pattern.length/t;Number.isInteger(n)&&r.pattern.every((e,t)=>e.key===r.pattern[t%n].key&&e.base===r.pattern[t%n].base)&&(e=t)}let i=Xd(r.pattern.slice(0,r.pattern.length/e),s);l.has(i)||(l.set(i,`figure${l.size+1}`),c.push(`&${l.get(i)} ${i}`));let a=e=>`[${e.join(`,`)}]`,o=Math.round(r.start/r.dur),d=[...Array(o).fill(`0`),...r.chords.map(a)],f=`chords${u}`;c.push(`&${f} step=${n}/${r.dur*(r.scale??1)} ${d.join(` `)}`),s.set(t,`run${u}`),c.push(`&run${u} over=&${f} &${l.get(i)}!${r.chords.length*e}`)}return{defs:c,lines:new Map(e.lines.map(e=>[e.name,Xd(e.toks,s,r)])),scales:new Map(e.lines.map(e=>[e.name,e.scale??1]))}}function tf(e){let t=/* @__PURE__ */ new Map,n=e=>{e.forEach((n,r)=>{if($(n.key)||Ad(n.key))return;let i=t.get(n.key)??[],a=e[r-1];a&&a.key===n.key&&a.base===n.base&&a.stretch===n.stretch?i[i.length-1].run++:i.push({run:1,stretch:n.stretch??1}),t.set(n.key,i)})};for(let t of e.lines)n(t.toks);for(let t of e.rules.values())n(t.of?[{key:t.of,base:null}]:Qd(t));return t}function nf(e,t,n=1){return e.kids.map(e=>{let r=e.off===null?null:(t??0)+e.off;if($(e.key))return{key:n===1?e.key:kd(e.key,n),base:r};let i=(e.stretch??1)*n;return{key:e.key,base:r,...i===1?{}:{stretch:i}}})}let rf=e=>({key:e.key,off:e.base,...e.stretch?{stretch:e.stretch}:{}}),af=(e,t)=>e.reduce((e,n)=>e+Jd(n,t).length+1,0);function of(e,t){let n=e.rules.get(t),r=e=>e.flatMap(e=>e.key===t?nf(n,e.base,e.stretch??1):[e]),i=/* @__PURE__ */ new Map;for(let[a,o]of e.rules)if(a!==t){if(o.of){let e=[],r=[];o.kids.forEach((i,a)=>{for(let s of i.key===t?nf(n,i.off,i.stretch??1):[{key:i.key,base:i.off,...i.stretch?{stretch:i.stretch}:{}}])e.push(rf(s)),r.push(o.patched[a])}),i.set(a,o.of===t?{key:a,kids:e}:{...o,kids:e,patched:r})}else i.set(a,{key:a,kids:r(Qd(o)).map(rf)})}return{...e,lines:e.lines.map(e=>({...e,toks:r(e.toks)})),rules:i}}let sf=(e,t)=>{let n=e,r=!1;for(;;){let e=tf(n),i=new Map([...n.rules.keys()].map(e=>[e,`m00`])),a=null;for(let[t,r]of n.rules){let n=af(Qd(r),i),o=5+(r.kids.some(e=>e.off!==null)?4:0),s=r.of?22+af(Qd(r).filter((e,t)=>r.patched[t]),i):5+n,c=e=>e===1?n:af(nf(r,0,e),i),l=(e.get(t)??[]).reduce((e,t)=>e+t.run*c(t.stretch)-o-(t.stretch>1?2:0)-(t.run>1?2:0),0)-s;l<=0&&(!a||l<a.gain)&&(a={key:t,gain:l})}if(!a)break;n=of(n,a.key),r=!0;let o=n;t?.(()=>o)}return r?n:null},cf=[Hd,Bd,Gd,qd,wd,sf],lf=/* @__PURE__ */ new Map([[Hd,`clocks`],[Bd,`figures`],[qd,`phrases and their variants`],[wd,`pairs`],[Gd,`passages at another speed`],[sf,`taking back what doesn’t pay`]]),uf=(e,t)=>{let{defs:n,lines:r}=ef(e,`m`,`pulse`,t);return[...n,...r.values()].reduce((e,t)=>e+t.length+1,0)};function df(e,t,n,r){let i={lines:e.map(e=>({name:e.name,toks:Od(e)})),rules:/* @__PURE__ */ new Map},a=i;r?.(()=>a,{tool:`start`,round:0});let o=uf(i,n);for(let e=0;e<8;e++){let a=i;for(let n of t){let t={tool:lf.get(n)??`a tool`,round:e+1},i=r&&(e=>r(e,t)),o=n(a,i);o&&o!==a&&(a=o,i?.(()=>o))}let s=uf(a,n);if(s>=o)break;[i,o]=[a,s]}return{f:i,size:o}}function ff(e,t,{degrees:n=!1}={}){let r=n?`^`:`^$`,i=n?cf.filter(e=>e!==Bd):cf,a=df(e,i,r,t),o=df(e,i.filter(e=>e!==qd),r),s=a.size<=o.size*1.15?a.f:o.f;return t?.(()=>s,{tool:`done`,round:0}),s}function pf(e,t){let n=0,r=0,i=5e5;for(let a of e.tempos){if(a.tick>=t)break;n+=(a.tick-r)*i/e.ppq/1e6,r=a.tick,i=a.micros}return n+(t-r)*i/e.ppq/1e6}function mf(e){let t=/* @__PURE__ */ new Map,n=r=>{if($(r)||Ad(r))return 0;let i=t.get(r);if(i!==void 0)return i;t.set(r,0);let a=e.rules.get(r),o=[...a.kids.map(e=>e.key),...a.of?[a.of]:[]],s=1+Math.max(0,...o.map(n));return t.set(r,s),s};for(let t of e.rules.keys())n(t);return t}function hf(e,t){let n=e=>e.filter((n,r)=>n.key===t&&!(r>0&&e[r-1].key===t&&e[r-1].base===n.base)).length;return e.lines.reduce((e,t)=>e+n(t.toks),0)+[...e.rules.values()].reduce((e,r)=>e+n(r.of===t?[{key:t,base:null}]:Qd(r)),0)}function gf(e,t){let n=mf(t),r=$d(t),i=new Map(r.map((e,t)=>[e,t])),a=[...r].sort((e,t)=>n.get(e)-n.get(t)||i.get(e)-i.get(t)),o=[t];for(let e of[...a].reverse())o.push(of(o[o.length-1],e));let s=o[o.length-1],c=[{folded:{lines:e.map(e=>({name:e.name,toks:Od(e)})),rules:/* @__PURE__ */ new Map},came:null,uses:0}];return(s.looks?.size||s.lines.some(e=>(e.scale??1)!==1))&&c.push({folded:s,came:null,uses:0}),a.forEach((e,t)=>{let n=o[o.length-2-t];c.push({folded:n,came:e,uses:hf(n,e)})}),c}let _f=[`major`,`minor`,`harmonic`],vf=[`C`,`C#`,`D`,`Eb`,`E`,`F`,`F#`,`G`,`Ab`,`A`,`Bb`,`B`],yf=(e,t)=>{let n=[0];for(let t of gn[e].steps.slice(0,-1))n.push(n[n.length-1]+t);return{name:e,tonic:t,positions:n}},bf=e=>`scale(${e.name}, ${vf[e.tonic]})`,xf=e=>`${vf[e.tonic]} ${e.name===`harmonic`||e.name===`melodic`?`${e.name} minor`:e.name}`;function Sf(e,t){let n=e.positions.length,r=Math.floor(t/n);return e.tonic+e.positions[t-r*n]+12*r}function Cf(e,t){let n=e.positions.length,r=Math.floor((t-e.tonic)/12),i=t-e.tonic-12*r,a=0;for(;a+1<n&&e.positions[a+1]<=i;)a++;let o=r*n+a,s=t-Sf(e,o);if(s===0)return{degree:o,alter:0};let c=t-Sf(e,o+1);return-c<s?{degree:o+1,alter:c}:{degree:o,alter:s}}let wf=({degree:e,alter:t})=>`${e}${t>0?`#`.repeat(t):`b`.repeat(-t)}`;function Tf(e){let t=e.flatMap(e=>e.chords.flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))));if(!t.length)return null;let n=e.flatMap(e=>e.chords.filter(e=>e.values.some(e=>Number.isInteger(Number(e))))),r=Math.max(...n.map(e=>e.at+e.dur)),i=(Math.min(...n.filter(e=>e.at+e.dur===r).flatMap(e=>e.values.map(Number).filter(e=>Number.isInteger(e))))%12+12)%12,a=null;for(let e of _f)for(let n=0;n<12;n++){let r=yf(e,n),o=t.reduce((e,t)=>e+Math.abs(Cf(r,t).alter),0);(!a||o<a.cost||o===a.cost&&n===i&&a.key.tonic!==i)&&(a={key:r,cost:o})}return a.key}function Ef(e,t){return e.map(e=>({...e,chords:e.chords.map(e=>({...e,values:e.values.map(e=>Number.isInteger(Number(e))?wf(Cf(t,Number(e))):e)}))}))}let Df=e=>e.values.map(Number).filter(e=>Number.isInteger(e));function Of(e,t,n){return e.map(e=>({...e,length:n-t,chords:e.chords.filter(e=>e.at>=t&&e.at<n).map(e=>({...e,at:e.at-t}))}))}function kf(e,t){let n=Math.max(0,...e.map(e=>e.length)),r=Math.ceil(n/t),i=[];for(let e=0;e<12;e++)i.push(yf(`major`,e),yf(`harmonic`,e),yf(`melodic`,e));let a=Array.from({length:r},()=>Array(i.length).fill(0));for(let n of e)for(let e of n.chords)for(let n of Df(e)){let o=Math.min(r-1,Math.floor(e.at/t));i.forEach((e,t)=>a[o][t]+=Math.abs(Cf(e,n).alter))}if(!r)return[];let o=a.map(()=>Array(i.length).fill(0)),s=a.map(()=>Array(i.length).fill(0));o[0]=[...a[0]];for(let e=1;e<r;e++){let t=o[e-1],n=0;for(let e=1;e<t.length;e++)t[e]<t[n]&&(n=e);for(let r=0;r<i.length;r++){let i=t[r],c=t[n]+12;[o[e][r],s[e][r]]=i<=c?[i+a[e][r],r]:[c+a[e][r],n]}}let c=Array(r),l=0;for(let e=1;e<i.length;e++)o[r-1][e]<o[r-1][l]&&(l=e);for(let e=r-1;e>=0;e--)c[e]=l,l=s[e][l];let u=[];for(let e=0;e<r;e++){let t=u[u.length-1];t&&t.k===c[e]?t.to=e+1:u.push({from:e,to:e+1,k:c[e]})}let d=[];for(let e of u){let t=d[d.length-1];t&&(e.to-e.from<2||t.to-t.from<2)?(e.to-e.from>t.most&&([t.k,t.most]=[e.k,e.to-e.from]),t.to=e.to):d.push({...e,most:e.to-e.from})}let f=d.map(r=>{let[a,o]=[r.from*t,Math.min(n,r.to*t)],s=i[r.k];if(s.name!==`major`)return{from:a,to:o,key:s};let c=Of(e,a,o).flatMap(e=>e.chords.filter(e=>Df(e).length)),l=e=>{let t=c.filter(t=>t.at===e);return t.length?(Math.min(...t.flatMap(Df))%12+12)%12:null},u=c.length?[l(Math.min(...c.map(e=>e.at))),l(Math.max(...c.map(e=>e.at)))]:[],d=(s.tonic+9)%12;return{from:a,to:o,key:u.includes(d)&&!u.includes(s.tonic)?yf(`minor`,d):s}}),p=e=>e.name!==`major`,m=[];for(let e of f){let t=m[m.length-1],n=t&&t.key.tonic===e.key.tonic&&(t.key.name===e.key.name||p(t.key)&&p(e.key));t&&n?m[m.length-1]={from:t.from,to:e.to,key:e.to-e.from>t.to-t.from?e.key:t.key}:m.push(e)}return m}function Af(e,t,n){let r=[];for(let i of e){let e=e=>!i.chords.some(t=>t.at<e&&t.at+t.dur>e),a=t=>{for(let r=0;r<=n;r++){if(t+r<=i.length&&e(t+r))return t+r;if(t-r>=0&&e(t-r))return t-r}return null},o=[0];for(let e of t.slice(1)){let t=a(e.from);t!==null&&t>o[o.length-1]?o.push(t):o.push(o[o.length-1])}o.push(i.length),t.forEach((e,t)=>{let[n,a]=[o[t],o[t+1]];a<=n||r.push({line:i.name,section:t,part:{name:`${i.name}§${t}`,length:a-n,chords:i.chords.filter(e=>e.at>=n&&e.at<a).map(e=>({...e,at:e.at-n}))}})})}return r}function jf(e){let t=e.flatMap(e=>[[e.start,1],[e.end,-1]]);t.sort((e,t)=>e[0]-t[0]||e[1]-t[1]);let n=/* @__PURE__ */ new Map,r=0;for(let e=0;e<t.length;e++){r+=t[e][1];let i=t[e+1]?.[0]??t[e][0];n.set(r,(n.get(r)??0)+i-t[e][0])}let i=[...n.values()].reduce((e,t)=>e+t,0),a=Math.max(0,...n.keys()),o=0;for(;a>1&&o+(n.get(a)??0)<=.06*i;)o+=n.get(a--)??0;return a}function Mf(e){let t=jf(e),n=Array(e.length).fill(0);if(t<=1)return{voice:n,count:t};let r=e.map((e,t)=>t).sort((t,n)=>e[t].start-e[n].start||e[n].key-e[t].key),i=Nf(e,r,t),a=Array(t).fill(null),o=Array(t).fill(-1/0),s=Array(t).fill(0);for(let c=0;c<r.length;){let l=c,u=e[r[c]].start;for(;l<r.length&&e[r[l]].start===u;)l++;let d=r.slice(c,l),f=[...Array(t).keys()].filter(e=>o[e]<=u);for(let e of[...Array(t).keys()].filter(e=>!f.includes(e)).sort((e,t)=>o[e]-o[t])){if(f.length>=d.length)break;f.push(e)}f.sort((e,t)=>e-t);let p=d.splice(f.length),m=Pf(d.map(t=>e[t].key),f,(e,n)=>{let r=a[n]===null?7+Math.abs(e-i[n]):Math.abs(e-a[n]);for(let i=0;i<t;i++)o[i]>u&&(i<n&&s[i]<e||i>n&&s[i]>e)&&(r+=12);return r});for(let t of p){let r=m[m.length-1];n[t]=r,o[r]=Math.max(o[r],e[t].end)}d.forEach((t,r)=>{let i=m[r];n[t]=i,a[i]=e[t].key,s[i]=e[t].key,o[i]=Math.max(o[i],e[t].end)}),c=l}return{voice:n,count:t}}function Nf(e,t,n){for(let r of t){let t=e[r].start,i=e.filter(e=>e.start<=t&&e.end>t).map(e=>e.key);if(i.length>=n)return i.sort((e,t)=>t-e).slice(0,n)}let r=e.map(e=>e.key),[i,a]=[Math.max(...r),Math.min(...r)];return Array.from({length:n},(e,t)=>i-(i-a)*t/(n-1))}function Pf(e,t,n){let[r,i]=[e.length,t.length],a=Array.from({length:r+1},()=>Array(i+1).fill(1/0));for(let e=0;e<=i;e++)a[r][e]=0;for(let o=r-1;o>=0;o--)for(let s=i-(r-o);s>=0;s--)a[o][s]=Math.min(a[o][s+1],n(e[o],t[s])+a[o+1][s+1]);let o=[];for(let i=0,s=0;i<r;s++)a[i][s]===n(e[i],t[s])+a[i+1][s+1]&&(o.push(t[s]),i++);return o}function Ff(e){let t=vd(e),n=new Set([...t.cells.values()].filter(e=>e.voice||e.mix||e.sink||e.map||e.note||e.name===`piece`).map(e=>e.name));return e.split(`
`).map(e=>e.replace(/(^|\s)#.*$/,``).replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g,``).replace(/\sabout=(\([^)]*\)|&\w+)/g,``).replace(/[ \t]+/g,` `).trim()).filter(e=>e&&!n.has(/^&(\w+)/.exec(e)?.[1]??``)).join(`
`).length}let If={bands:`band`,bass:`bass`,counts:`count`,endings:`ending`,expression:`expression`,fills:`fill`,forms:`form`,harmony:`harmony`,instruments:`instrument`,laws:`law`,melodic:`melodic`,meters:`meter`,modes:`mode`,modules:`module`,motifs:`motif`,performers:`performer`,rhythms:`rhythm`,sections:`section`,songs:`song`,stab:`stab`,styles:`style`},Lf=Object.fromEntries([`meter`,`rhythm`,`performer`,`module`,`form`].map(e=>[e,n.filter(e=>e!==`mood`)])),Rf=(e,t)=>{let n=t===void 0?void 0:Lf[t];return n?Object.fromEntries(Object.entries(e).filter(([e])=>n.includes(e))):e},zf=/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/,Bf=/^&[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*&[A-Za-z_][A-Za-z0-9_]*)*$/;function Vf(e){let t=ve(e),n=t.findIndex(e=>e.text===`from`);if(n<1)return null;let r=e.slice(0,t[n].at).trim(),i=t.slice(n+1).map(e=>e.text),a=e=>/^[A-Za-z_][A-Za-z0-9_]*=/.test(e)||e===`*`||zf.test(e);if(r===`*`)return i.every(a)?i:null;if(!Bf.test(r))return null;let o=0;return i[o]?.startsWith(`(`)&&o++,i[o]?.startsWith(`&`)&&!i[o].startsWith(`&(`)&&o++,o===0&&i.length&&!a(i[0])?null:i.slice(o).every(a)?i.slice(o):null}function Hf(e,t,n){let r=Gf(e.slice(1,-1),`+`).map(e=>e.trim());if(r.length<2||r.some(e=>!e))return`style=${e}: a sum of points, [&acid + &(map=style bite=.1)]`;let i={};for(let a of r){let r=Uf(a,t,n);if(typeof r==`string`)return r;if(r.reach)return`style=${e}: a term of a sum has no reach (± r)`;for(let[e,t]of Object.entries(r.point))i[e]=(i[e]??0)+t}for(let e of Object.keys(i))i[e]=Math.round(Math.min(1,Math.max(0,i[e]))*1e9)/1e9;return{point:i}}function Uf(e,t,r){if(/^\[[\s\S]*\]$/.test(e))return Hf(e,t,r);if(/^&[A-Za-z_][A-Za-z0-9_]*$/.test(e)){let n=t.get(e.slice(1));return n?{point:Rf(n,r)}:`style=${e}: no style of that name in styles`}let i=/^&\(\s*map=style\s+([\s\S]*)\)$/.exec(e);if(!i)return`style=${e}: a style, &funk, an inline one, &(map=style sync=.3 bite=.55), or a sum, [&acid + &(map=style bite=.1)]`;let a=i[1].trim(),o=a.split(/\s+/);if(o.length===n.length&&o.every(e=>zf.test(e)))return{point:Object.fromEntries(n.map((e,t)=>[e,parseFloat(o[t])]))};let s={},c={},l=/([A-Za-z_]+)=(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))(?:\s*(?:±|\+-)\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+))?/y,u=0;for(;u<a.length;){for(;a[u]===` `;)u++;if(u>=a.length)break;l.lastIndex=u;let t=l.exec(a);if(!t)return`style=${e}: an axis by name, sync=.3, or one ± a reach, bite=.55 ± .1`;let[,r,i,o]=t;if(!n.includes(r))return`style=${e}: ${r} is no axis (the axes: ${n.join(` `)})`;if(r in s)return`style=${e}: ${r}= twice`;s[r]=parseFloat(i),o!==void 0&&(c[r]=parseFloat(o)),u=l.lastIndex}return Object.keys(s).length?Object.keys(c).length?{point:s,reach:c}:{point:s}:`style=${e}: a point names an axis at least`}function Wf(e,t,n){let r=/^\(([\s\S]*)\)$/.exec(e),i=r?Gf(r[1],`|`):[e],a=[];for(let r of i){let i=/^([\s\S]*?)(?:\s*\*\s*(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)))?$/.exec(r.trim()),o=Uf(i[1].trim(),t,n);if(typeof o==`string`)return o;let s=i[2]===void 0?1:parseFloat(i[2]);if(!(s>0))return`style=${e}: a weight is a number above 0`;a.push({...o,weight:s})}return a}function Gf(e,t){let n=[],r=0,i=0;for(let a=0;a<e.length;a++){let o=e[a];o===`(`||o===`[`?r++:o===`)`||o===`]`?r--:o===t&&r===0&&(n.push(e.slice(i,a)),i=a+1)}return n.push(e.slice(i)),n}function Kf(e,t){let n=Vf(e);if(n===null)return null;let r=[],i=null,a=t.facet,o={};for(let e=0;e<n.length;e++){let s=n[e],c=s.indexOf(`=`);if(c<0){r.push(`${s}: an attribute, name=value`);continue}let l=s.slice(0,c),u=s.slice(c+1);l===`style`&&n[e+1]===`*`&&zf.test(n[e+2]??``)&&(u=`${u} * ${n[e+2]}`,e+=2),l===`style`?i=u:l===`facet`?a=u:t.template?/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(u)&&!/[&=]/.test(u)?o[l]=u:r.push(`${l}=${u}: an argument is a value (a word, a number, 8n:2/3, meter("7/8"))`):r.push(`${l}=: a collection's declaration has no arguments (style= and facet= only)`)}let s={...a===void 0?{}:{facet:a},...Object.keys(o).length?{args:o}:{}};if(i===null)return{points:[{point:{},weight:1,...s}],problems:r};let c=Wf(i,t.styles,a);return typeof c==`string`?{points:[],problems:[...r,c]}:{points:c.map(({point:e,weight:t,reach:n})=>({point:e,weight:t,...s,...n?{reach:n}:{}})),problems:r}}function qf(e,t){let n=e.split(`
`).map(e=>Ae(e)[0].trim()),r=n.some(e=>Vf(e)!==null&&!e.startsWith(`*`)),i=[],a=[],o=!1,s=!1;for(let e of n){let n=Kf(e,{...t,template:r});n&&(o=!0,(e.startsWith(`*`)||Vf(e).length)&&(s=!0),i.push(...n.points),a.push(...n.problems))}return o?{association:i,problems:a,explicit:s}:null}let Jf=(e,t)=>`${e}(${Object.entries(t).map(([e,t])=>`${e}=${t}`).join(`, `)})`;function Yf(e,t){let n=Cl(e);if(!n)throw Error(`boundText: a template's arguments, but the text has no signature`);let r=Object.keys(t).map(e=>`&${e}`);for(let e of r)if(!n.optional.includes(e))throw Error(`boundText: ${e} is none of the signature's optional parameters (${n.optional.join(`, `)})`);let i=n.optional.filter(e=>!r.includes(e)),a=`${n.names.join(`, `)} from ${i.length?`(${i.join(`, `)}) `:``}${n.main??``}`.trimEnd(),o=new Set(r.filter(t=>RegExp(`base=${t}(?![A-Za-z0-9_])`).test(e))),s=!1;return e.split(`
`).flatMap(e=>{if(/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(e)&&Cl(e))return s?[]:(s=!0,[a]);let n=r.find(t=>RegExp(`^\\s*${t}(?![A-Za-z0-9_])`).test(e));return n?o.has(n)?[`${n} ${t[n.slice(1)]}`]:[]:[Object.entries(t).reduce((e,[t,n])=>o.has(`&${t}`)?e:e.replace(RegExp(`&${t}(?![A-Za-z0-9_])`,`g`),n),e)]}).join(`
`)}function Xf(e){if(!e.association.some(e=>e.args))return[e];let t=e.association.filter(e=>!e.args),n=/* @__PURE__ */ new Map;for(let t of e.association){if(!t.args)continue;let r=Jf(e.id,t.args),{args:i,...a}=t;n.set(r,{args:t.args,points:[...n.get(r)?.points??[],a]})}return[...t.length?[{...e,association:t}]:[],...[...n].map(([t,{args:n,points:r}])=>({id:t,text:Yf(e.text,n),association:r}))]}let Zf=/* @__PURE__ */ new Map([[`creeping bass`,`creeping_bass`],[`walking bass`,`walking_bass`],[`eighths bass`,`eighths_bass`],[`funk bass`,`funk_bass`],[`pumping bass`,`pumping_bass`],[`root bass`,`root_bass`],[`tiptoe bass`,`tiptoe_bass`],[`lead performer`,`lead_performer`],[`stab performer`,`stab_performer`],[`pad performer`,`pad_performer`],[`drums performer`,`drums_performer`],[`bass performer`,`bass_performer`],[`Charleston stabs`,`charleston_stabs`],[`Synth-pop drums`,`synth_pop_drums`],[`Funk drums`,`funk_drums`],[`Spooky drums`,`spooky_drums`],[`Lo-fi hip hop drums`,`lo_fi_hip_hop_drums`],[`Ghost drums`,`ghost_drums`],[`rumba clave 3-2`,`rumba_clave_3_2`],[`bossa nova clave`,`bossa_nova_clave`],[`Techno drums`,`techno_drums`],[`Kinderlied drums`,`kinderlied_drums`],[`Bossa nova drums`,`bossa_nova_drums`],[`Deep house drums`,`deep_house_drums`],[`son clave 3-2`,`son_clave_3_2`],[`Swing jazz drums`,`swing_jazz_drums`],[`son clave 2-3`,`son_clave_2_3`],[`bossa nova clave (one bar)`,`bossa_nova_clave_one_bar`],[`Ambient drums`,`ambient_drums`],[`Electro swing drums`,`electro_swing_drums`],[`7/8`,`odd_meter(meter="7/8")`],[`4/4 leaning lightly on 16n`,`funk_meter`],[`3/4`,`bar(meter="3/4")`],[`6/8`,`bar(meter="6/8")`],[`4/4 alla breve`,`bar(meter="4/4 in 2")`],[`4/4 swung on 8n`,`swing_meter`],[`10/8`,`odd_meter(meter="10/8")`],[`2/4`,`bar(meter="2/4")`],[`4/4`,`bar`],[`12/8`,`bar(meter="12/8")`],[`5/4`,`odd_meter`],[`4/4 leaning on 16n`,`lofi_meter`],[`vamp to the seventh`,`vamp_to_the_seventh`],[`vamp to the fifth`,`vamp_to_the_fifth`],[`vamp to the sixth`,`vamp_to_the_sixth`],[`tonic vamp`,`tonic_vamp`],[`vamp to the fourth`,`vamp_to_the_fourth`],[`haunted progression`,`haunted_progression`],[`dark cadence`,`dark_cadence`],[`muted trumpet`,`muted_trumpet`],[`round bass`,`round_bass`],[`haunted pad`,`haunted_pad`],[`brass stab`,`brass_stab`],[`upright bass`,`upright_bass`],[`bell and scale`,`bell_and_scale`],[`harmonic minor`,`harmonic_minor`],[`rounded binary`,`rounded_binary`],[`call and answer`,`call_and_answer`],[`meter_7_8`,`odd_meter(meter="7/8")`],[`meter_4_4_leaning_lightly_on_16n`,`funk_meter`],[`meter_3_4`,`bar(meter="3/4")`],[`meter_6_8`,`bar(meter="6/8")`],[`meter_4_4_alla_breve`,`bar(meter="4/4 in 2")`],[`meter_4_4_swung_on_8n`,`swing_meter`],[`meter_10_8`,`odd_meter(meter="10/8")`],[`meter_2_4`,`bar(meter="2/4")`],[`meter_4_4`,`bar`],[`meter_12_8`,`bar(meter="12/8")`],[`meter_5_4`,`odd_meter`],[`meter_4_4_leaning_on_16n`,`lofi_meter`],[`aeolian`,`diatonic(mode=aeolian)`],[`dorian`,`diatonic(mode=dorian)`],[`ionian`,`diatonic(mode=ionian)`],[`mixolydian`,`diatonic(mode=mixolydian)`],[`phrygian`,`diatonic(mode=phrygian)`],[`lydian`,`diatonic(mode=lydian)`],[`locrian`,`diatonic(mode=locrian)`]]);Object.freeze({filed:Object.freeze([]),points:Object.freeze([]),together:Object.freeze([])});let Qf=e=>typeof e==`number`&&Number.isFinite(e);function $f(e,t){return typeof e!=`object`||!e?[`${t}: not a style point`]:Object.entries(e).flatMap(([e,n])=>Qf(n)?[]:[`${t}: ${e} is ${String(n)}, not a number`])}function ep(e){let t=[],{id:n,text:r,association:i}=e;typeof n==`string`&&n.trim()||t.push(`no id`);let a=typeof n==`string`&&n.trim()?n:`(no id)`;return typeof r==`string`&&r.trim()||t.push(`${a}: no text`),!Array.isArray(i)||!i.length?t.push(`${a}: no style point in its association`):i.forEach((e,n)=>t.push(...tp(e,`${a}: point ${n+1}`))),t}function tp(e,t){let n=[];(!e||!Qf(e.weight)||e.weight<=0)&&n.push(`${t}: weight ${String(e?.weight)}, not a number > 0`);let r=e?.facet;return r===void 0||typeof r==`string`&&r.trim()||n.push(`${t}: facet ${String(r)}, not a name`),n.push(...$f(e?.point,t)),n}new Map([...Zf].reverse().map(([e,t])=>[t,e]));let np=[`id`,`association`],rp=[`point`,`weight`,`facet`,`args`],ip=(e,t)=>e.entries.find(e=>e.key===t);function ap(e,t){return e.kind===`list`?e.items.map((e,n)=>{let r=`point ${n+1}`;if(e.kind!==`map`)return t.push({line:e.line,message:`${r} is a map (point, weight, facet)`}),{point:{},weight:0};for(let n of e.entries)rp.includes(n.key)||t.push({line:n.line,message:`${r}: ${n.key} is none of point, weight, facet, args`});let i={},a=ip(e,`point`);if(!a)ip(e,`facet`)||t.push({line:e.line,message:`${r} has no point and no facet: a fragment of no style names the facet it is found as`});else if(a.value.kind!==`map`||!a.value.entries.length)t.push({line:a.line,message:`${r}: its point is a map of axes to numbers`});else for(let e of a.value.entries)e.value.kind===`scalar`&&typeof e.value.value==`number`?i[e.key]=e.value.value:t.push({line:e.line,message:`${r}: ${e.key} is ${JSON.stringify(me(e.value))}, not a number`});let o=ip(e,`weight`),s=o?.value.kind===`scalar`?o.value.value:!o&&!a?1:void 0;typeof s!=`number`&&t.push({line:o?.line??e.line,message:`${r}: ${o?`its weight is ${JSON.stringify(me(o.value))}, not a number`:`no weight`}`});let c=ip(e,`facet`),l=c?.value.kind===`scalar`?c.value.value:void 0;c&&typeof l!=`string`&&t.push({line:c.line,message:`${r}: its facet is ${JSON.stringify(me(c.value))}, not a name`});let u=ip(e,`args`),d={};if(u&&(u.value.kind!==`map`||!u.value.entries.length))t.push({line:u.line,message:`${r}: its args are a map of parameters to values`});else if(u&&u.value.kind===`map`)for(let e of u.value.entries){let n=e.value.kind===`scalar`?e.value.value:void 0;typeof n==`string`&&/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(n)&&!/[&=]/.test(n)||typeof n==`number`?d[e.key]=String(n):t.push({line:e.line,message:`${r}: its arg ${e.key} is ${JSON.stringify(me(e.value))}, not a value (a word, a number, 8n:2/3, meter("7/8"))`})}return{point:i,weight:typeof s==`number`?s:0,...typeof l==`string`?{facet:l}:{},...Object.keys(d).length?{args:d}:{}}}):(t.push({line:e.line,message:"the association is a list of points (`- point: …`)"}),[])}function op(e,t={}){let n=e.split(/\r?\n/);if(n[0]!==`---`)return{problems:[{line:1,message:"no frontmatter: a fragment file starts with a line `---`"}]};let r=nu(e);if(`problems`in r)return{problems:r.problems.map(e=>/^the frontmatter is a map/.test(e.message)?{...e,message:"the frontmatter is a map (`id: …`, `association: …`)"}:e)};let i=n.indexOf(`---`,1),a=pe(n.slice(1,i).join(`
`),2).node,o=[],s=ip(a,`id`),c=s?.value.kind===`scalar`?s.value.value:void 0;s?typeof c!=`string`&&o.push({line:s.line,message:`the id is ${JSON.stringify(me(s.value))}, not a string: quote it`}):o.push({line:1,message:`no id in the frontmatter`});let l=ip(a,`association`),u=qf(r.text,{...t.facet===void 0?{}:{facet:t.facet},styles:t.styles??/* @__PURE__ */ new Map}),d=(r.map?.[0]?.line??i+2)-1;l&&u?.explicit?o.push({line:l.line,message:`the association is written twice: in the frontmatter and in the text’s declarations (decision 089): keep the declarations`}):!l&&!u&&o.push({line:1,message:"no association: no declaration in the text (`* from style=…`, a signature with style=) and none in the frontmatter"}),u&&!l&&o.push(...u.problems.map(e=>({line:d,message:e})));let f=l?ap(l.value,o):u?.association??[];if(o.length)return{problems:o.sort((e,t)=>e.line-t.line)};let p={id:c,text:r.text,association:f},m=ep(p);return m.length?{problems:m.map(e=>{let t=/point (\d+)/.exec(e);return{line:t&&l?l.value.items[Number(t[1])-1].line:/no text/.test(e)?(r.map?.[0]?.line??i+2)-1:s.line,message:e}})}:{fragment:p,meta:Object.fromEntries(Object.entries(r.frontmatter).filter(([e])=>!np.includes(e))),prose:r.prose,layout:r.layout}}function sp(e){let t=[],n=[],r=/* @__PURE__ */ new Map,i=cp(e);for(let[a,o]of Object.entries(e)){let e=If[a.split(`/`)[0]],s=op(o,{...e===void 0||!a.includes(`/`)?{}:{facet:e},styles:i});if(`problems`in s){n.push(...s.problems.map(e=>`${a}:${e.line}: ${e.message}`));continue}let{id:c}=s.fragment,l=r.get(c);l===void 0?r.set(c,a):n.push(`${a}:${o.split(`
`).findIndex(e=>/^id:/.test(e))+1}: the id ${c} is given twice (first in ${l})`),t.push({path:a,...s})}return n.length?{problems:n}:{files:t}}function cp(e){for(let t of Object.values(e)){if(!/^id: styles$/m.test(t.slice(0,t.indexOf(`
---`,3)+1)))continue;let e=nu(t);return`problems`in e?/* @__PURE__ */ new Map:new Map(ld(e.text).cells.flatMap(e=>{let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];return e.map?.kind===`style`&&t.length===n.length&&t.every(Number.isFinite)?[[e.name,Object.fromEntries(n.map((e,n)=>[e,t[n]]))]]:[]}))}return/* @__PURE__ */ new Map}let lp={"bands/01-band":"---\nid: band\nsource: seed\n---\n\n```cells\n&band, &drums, &bass, &pad, &stab, &lead, &drumsOut, &bassOut, &padOut, &stabOut, &leadOut, &bassV, &padV, &keysV, &leadV, &sound, &midi from (&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style, &intensity) style=&(map=style sync=.5 harm=.5 bite=.5)\n&band &drums &bass &pad &stab &lead\n&drums, &drumsOut from drums_performer(drumsDrive=&drumsDrive) &drumlines\n&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV, bassDrive=&bassDrive, style=&style) &bassline\n&pad, &padOut from pad_performer(padLevel=&padLevel, padV=&padV, style=&style) &padline\n&stab, &stabOut from stab_performer(stabLevel=&stabLevel, keysV=&keysV, stabDrive=&stabDrive, style=&style) &stabline\n&lead, &leadOut from lead_performer(leadLevel=&leadLevel, leadV=&leadV, style=&style) &leadline\n&bassV from bass(style=&style)\n&padV from pad(style=&style)\n&keysV from keys(style=&style)\n&leadV from lead(style=&style)\n&bassLevel map=amp .8\n&padLevel map=amp .8\n&stabLevel map=amp .8\n&leadLevel map=amp .8\n&drumsDrive [&intensity * .35 + .65]\n&bassDrive [&intensity * .25 + .75]\n&stabDrive [&intensity * .2222 + .7778]\n&sound map=sample [&drumsOut, &bassOut * .8, &padOut * .35, &stabOut * .4, &leadOut * .45]\n&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut\n&drumlines step=1m ~\n&bassline step=1m ~\n&padline step=1m ~\n&stabline step=1m ~\n&leadline step=1m ~\n&style map=style sync=.5 harm=.5 bite=.5 mood=.5\n&intensity 1\n```\n\nThe default band (decision 063 §1, #391): who plays a score, on what, and where it goes out. A score ends in `* from band(…)`, the same line on every client, and each client's resolver answers `band` with its own; this is the one cells' library holds.\n\n**Its signature** (decision 065; decision 075, #560): its heads, `&band` and the roles, the gates, the voices and the cards, keep their names in the score; its inputs are optional parameters, `(&drumlines, &bassline, &padline, &stabline, &leadline, &bassLevel, &padLevel, &stabLevel, &leadLevel, &style, &intensity)`. A score passes what it writes, `* from band(bassline=&bassline, …, style=&style)` (`bandLine(score)`, `src/repository/band.ts`). A part it doesn't pass is a tacet, `&bassline step=1m ~`, and says nothing; a level it doesn't pass is .8; a style it doesn't pass is the centre of style space, `&style map=style sync=.5 harm=.5 bite=.5 mood=.5`. A score that took them by name before passes them now, and Migrate writes it.\n\n**Its head, `&band`,** is decision 061's table of performers: the five role cells, `&drums`, `&bass`, `&pad`, `&stab` and `&lead`, so a score's selector over the band (`&form over=&band step=1m …`) reads the client's players. Who plays when is the score's; who they are, the band's.\n\n**The performers** are the seed library's five (decisions 058 and 061), each a copy taken by its signature (decision 065): its role and its gate, `&bass, &bassOut from bass_performer(bassLevel=&bassLevel, bassV=&bassV, style=&style) &bassline`. The pitched four take the band's `&style` too, as their instruments do (the drummer has none: its sounds are its kit's, and style reaches its drums through the score's lines). The part each plays is the score's, passed as the band's argument (`bassline=&bassline`), and so are its levels (`bassLevel=&bassLevel`). A level the score doesn't pass is the band's own, one level of .8, the performers' default. A part it doesn't pass rests (decision 063 §4).\n\n**Its intensity** (decision 096): `&intensity`, an optional parameter, the section's from 0 to 1 (the song's plus its kind's offset, a sum the score writes: `&intensity [&song + -.45]` for a breakdown), its own 1. The band drives three of its performers by it, each a sum on the velocity's scale, Jambot's dynamics lifted (yggi/jambot `packages/engine/src/dynamics.ts` @ 602cb26, `baseVelocityOf`): the drums `[&intensity * .35 + .65]`, the bass `[&intensity * .25 + .75]`, the stab `[&intensity * .2222 + .7778]` (its 70 + 20e over 90). The pad's velocity reads the bite beside the energy, and the lead's no energy, so neither is driven. At its own 1 every drive is 1: a score that writes no intensity plays its levels as written.\n\n**The instruments** are the performers' own (`bass`, `keys`, `pad`, `lead`, and 13 of `gm_kit`'s voices), each with a sound. The band takes each pitched one itself, `&bassV from bass(style=&style)`, and passes it to its performer (`bassV=&bassV`), so a score's own `&bassV` is the one played, and `bandAt` replaces the band's line for it. They read the score's style, `&style` (decision 063 §3), passed by the band, which declares it (#560), where Jambot's `timbreOf` reads it (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): the bass's cutoff opens with bite; the lead blends from a triangle to a square as bite rises, its cutoff opening with it; the chords' attack and release shorten as bite rises (decision 066, #411). The section's style is the composer's: the score writes it and passes it; the band's own `&style` is only its default, the centre.\n\n**Which instrument a performer plays at a style** is the band's choice, made by a query at resolution, not by a line: `resolveBand(score)` answers `band` with this text, each pitched voice the first instrument the library ranks at the score's style that defines it, within 0.3 (`INSTRUMENT_REACH`, #540), where that isn't the performer's own (`bandAt`, `src/repository/band.ts`; yggi/jambot#527's rule, moved here). At Synth-pop's, Techno's, Deep house's, Lo-fi hip hop's and Bossa nova's points that is the performer's own instrument, so the band plays as written; at Ambient's the sine bass, at Funk's the brass stab, at Swing jazz's the upright bass and the muted trumpet (#540); at Electro swing's point the upright bass, the brass stab and the clarinet, at Spooky's the round bass, the organ, the celesta and the theremin (#366). Each holds its default's register, so MIDI out sends the same notes. Each is voiced for its own point and reads no `&style`: where one plays, the style moves no cutoff of that voice, as it does the default bass's and lead's. The instruments are found at the score's style where it starts, so a section that glides into or out of Electro swing plays the instruments of its first end throughout. A line can't make that choice: a voice reads a style as a moving parameter, and a wave or a set of envelopes is no such parameter.\n\n**The cards:** a sound card that hears every gate, the drums at full, the bass at .8, the lead at .45 and the chords under it (the pad at .35, the stab at .4), as Jambot's synth balances its parts (`PEAK`, yggi/jambot `apps/web/src/audio/voices.ts` @ 227aa74, its chords' several notes each quieter), and a MIDI card on Jambot's channels: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums. A person with a fifth synth gives the stab its own channel in their band.\n\nA score played on this band sends the MIDI Jambot's section text sends on its single card (channel, note, velocity, onset and end): its twenty sections at the ten presets, seeds 1 and 2, 0 mismatched (`band.slow.test.ts`).\n\nAssociated once as the facet `band` at the centre of style space, at weight 1: it plays every style, reading the style it is given.\n","bass/01-root-bass":"---\nid: root_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&(map=style sync=0 harm=.3 bite=0 mood=.9) | &synthPop | &deepHouse | &ambient | &kinderlied | &pop)\n&bassline over=&harm step=2n 0 0\n```\n\nJambot's bass pattern `root`: the root of the chord in force on one and on three, the bar's downbeat and its half (`bass.ts` weighs them 1 and 0.6).\nIts own lines read the host's `&harm` (`over=&harm`: each index a tone of the chord sounding) and tap the host's main meter, so it fits any workbench whose `&bar` and `&harm` are written first; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt the point where the root is all `bass.ts` plays: there its blend weighs the pump, the eighths and the funk line 0 (no sync, no energy, legato), so the root's share is 1.\nOf the points where it is 1, this is the nearest to Ambient's, the preset where the root's share is greatest (0.68): Ambient's harmony, its sync and energy at 0.\nIt is also at the three presets where the root is what `bass.ts` plays most, as the meters are at theirs (#209): Synth-pop's (0.32, the funk line 0.27), Deep house's (0.31, tied with the funk line, which the root takes as first in `bass.ts`'s order) and Ambient's (0.68). And at Pop's (#947), the root on each chord a pop song's bass plays. A preset plays a blend, and its nearest pattern's point needn't be the pattern it plays most.\n\nWhat `bass.ts` adds that a fixed line doesn't: on three it plays the fifth one section in five and an octave up one in four, by a draw per section and step; it thins the line by the energy (each step sounds when a held draw falls under its weight times 0.55 + 0.6 × energy); the octave, the voice leading and the velocity are the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from root_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/02-pumping-bass":"---\nid: pumping_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&(map=style sync=0 harm=0 bite=1 mood=.825) | &techno | &happyHardcore)\n&bassline over=&harm step=8n ~ 0 ~ 0 ~ 0 ~ 0\n```\n\nJambot's bass pattern `pump`: the root of the chord in force on the eighth after each beat, and nothing on the beat, not even on a chord change (`bass.ts` plays the new root on a change only while the pump weighs under 0.45).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt the one point where the pump's share of `bass.ts`'s blend is greatest, 0.74: a static vamp, staccato, no sync (each a factor of the pump: `(1 − harm) × artic × (1 − sync)`), and no energy, which would bring in the eighths.\nThat is Techno's harmony and articulation, its sync and energy at 0.\nIt is also at Techno's, the preset where the pump is what `bass.ts` plays most (0.50), as the meters are at theirs (#209).\n\nWhat `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, by a draw per section and step; the thinning by the energy (here 0.55: each offbeat sounds about one section in two); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from pumping_bass &harm` takes a copy of it, `&harm` its main argument.\n\nAlso at Happy hardcore's point (sync .25, harm .45, bite .8, mood .9), weight 1: the eurodance bass of [Hypercell](../../examples/hypercell.md), the root on every offbeat eighth, is this line (#572).\n","bass/03-eighths-bass":"---\nid: eighths_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=&(map=style sync=0 harm=.3 bite=0 mood=.45)\n&bassline over=&harm step=8n 0!8\n```\n\nJambot's bass pattern `eight`: the root of the chord in force on every eighth (`bass.ts` weighs the downbeat 1, the bar's half 0.9, the others 0.8).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt a point where the eighths' share of `bass.ts`'s blend is greatest, 0.63: full energy and no sync (the eighths weigh `0.6 × energy × (1 − funk)`, the funk line weighs the sync), and no pump (legato, or a harmony that moves fully).\nThe eighths are what `bass.ts` plays most at no preset, so unlike the others they sit at no preset's point (#209).\nTechno, the preset where their share is greatest (0.24), is as near two of those points (Techno legato, and Techno with its harmony moving), so it sits at the root bass's point with the energy at 1: there `bass.ts` moves from the root alone to the eighths by the energy alone.\n\nWhat `bass.ts` adds that a fixed line doesn't: the fifth one step in five and an octave up one in four, off the downbeat; the thinning by the energy (here 1.15: each eighth sounds but about one in twelve); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from eighths_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/04-funk-bass":"---\nid: funk_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&funk | &lofi | &bossaNova)\n&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~\n&bassNext over=&harm[>>] 0\n```\n\nJambot's bass pattern `funk`, its line on 4/4's sixteen steps, every step it weighs (`bass.ts`'s `FUNK`: 1, 0.7, 0.8, 0.4, 0.7, 0.5, 0.3, 0.8): the root of the chord in force, and on the bar's last two sixteenths the next chord's root, anticipated (`&bassNext`, over `&harm[>>]`).\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt Funk's point: there the funk line's share of `bass.ts`'s blend is the greatest it gets, 0.74 (full sync weighs it 1 and the pump and the eighths 0), and Funk is the preset where its share is greatest.\nIt is also at the two other presets where the funk line is what `bass.ts` plays most, as the meters are at theirs (#209): Lo-fi hip hop's (0.48) and Bossa nova's (0.63).\nAt full sync `bass.ts` anticipates the next chord nine times in ten on a step of the bar's last three that isn't a change (`0.9 × sync`), so this line plays the anticipation.\n\nWhat `bass.ts` adds that a fixed line doesn't: the tenth time, the root or the fifth there; the fifth one step in five and an octave up one in four elsewhere off the downbeat; the thinning by each step's weight and the energy (here 1: the 0.3 and the 0.4 sound about one section in three); the octave, the voice leading and the velocity, the performer's.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from funk_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/05-walking-bass":"---\nid: walking_bass\nsource: seed\nlifted: yggi/jambot packages/engine/src/bass.ts @ 1037a80\n---\n\n```cells\n&bassline from &harm style=(&swingJazz | &electroSwing)\n&bassline over=&harm step=4n 0 1 2 &bassNext^$-1\n&bassNext over=&harm[>>] 0\n```\n\nJambot's bass pattern `walk`, a note on every beat: the root of the chord in force on one, its third and its fifth, and on the last beat the next chord's root a semitone below (`&bassNext^$-1`: the next chord's root, `over=&harm[>>]`, moved a step of the grid, a semitone).\nThe semitone can't be an index: over the chord in force an accidental moves a degree of the key, so `0b` over `&harm[>>]` is a semitone only where the key's degree below the next root is one.\nIts own lines read the host's `&harm` and tap the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058), and the workbench's card sends it.\n\nAt Swing jazz's point, under its meter swung on `8n` (`swing_meter`): `bass.ts` walks only where the meter swings its eighths (`eighthSwing`) and the harmony moves (`harm ≥ 2/3`), and there the walk's share of its blend is the greatest it gets, 0.74, the funk line, the pump and the eighths all 0.\nThe swing is the meter's, not a style axis, so the point says only the harmony.\nSwing jazz is the only preset where the walk is what `bass.ts` plays most, and this point is Swing jazz's (#209); at the presets whose harmony moves but whose meter doesn't swing, the pattern played most is associated there and is found before the walk.\n\nWhat `bass.ts` draws that a fixed line chooses: the second and third beats each the third, the fifth or the seventh (the fifth twice over where the chord has none), a third each, so this line is one walk it plays, up through the chord; the approach from below or above, half each, so this one from below. Under a harmony that changes on the bar's half it leads into that change too. The octave, the voice leading and the velocity are the performer's.\nAlso at the point proposed for an Electro swing preset (#349), weight 1: the walk [Electro swing, in pieces](../../examples/electroswing.md) plays. It is placed by hand, not by `bass.ts`'s blend, which has no such preset.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from walking_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/06-creeping-bass":"---\nid: creeping_bass\nsource: seed\n---\n\n```cells\n&bassline from &harm style=&spooky\n&bassline over=&harm step=4n 0@2 &creep^$1 0\n&creep over=&harm 0\n```\n\nA bass that creeps: the root of the chord in force held two beats, then a semitone above it, and back (`&creep^$1`: the root moved a step of the grid, a semitone, as the walking bass's approach moves `&bassNext`), the shark's two notes slowed to a walk on tiptoe.\nIts line reads the host's `&harm` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the semitone landing a beat later each time round.\nWritten by hand for the point proposed for a Spooky preset (sync .2, harm .9, bite .3, mood .3; #349), weight 1, Jambot's to adopt (decision 041).\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from creeping_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/07-tiptoe-bass":"---\nid: tiptoe_bass\nsource: seed\n---\n\n```cells\n&bassline from &harm style=&(map=style sync=.2 harm=.9 bite=.25 mood=.3)\n&bassline over=&harm step=4n 0 ~ -1 ~\n```\n\nA bass on tiptoe: the root of the chord in force, a beat's silence, the fifth below it, and silence again, plucked short, as a cartoon villain sneaks down a corridor.\nIts line reads the host's `&harm` and taps the host's main meter; it has no card (#291): it is the part the bass performer plays (`&bassline`, decision 058). It is four beats long, so in 5/4 it turns against the bar, the root landing on a different beat each time round, as `creeping_bass` does.\nNear Spooky's point (sync .2, harm .9, bite .3, mood .3; yggi/jambot#517), 0.05 lower in bite, weight 1, as the facet `bass`: what the bass plays when `creeping_bass` has tired.\n\n**Its signature** (decision 065): `&bassline from &harm`. `&bassline from tiptoe_bass &harm` takes a copy of it, `&harm` its main argument.\n","bass/08-acid-bass":`---
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
`};function up(){let e=sp(lp);if(`problems`in e)throw Error(`The seed library doesn't read: ${e.problems.join(`; `)}`);return e.files}let dp=up(),fp=e=>Xf(e.fragment),pp=e=>dp.filter(t=>t.path.startsWith(`${e}/`)).flatMap(fp),mp=pp(`instruments`),hp=[1,2,3,4,6,8,12,16],gp=Object.fromEntries(Uc.map(e=>[e.note,e.name])),_p=Object.fromEntries(mp.find(e=>e.id===`gm_kit`).text.split(`
`).flatMap(e=>{let t=/^&(\w+) (.*)$/.exec(e);return t?[[t[1],t[2]]]:[]}));function vp(e,t){let n=(e??``).trim().split(/\s+/),r=[];for(let e of n){let t=/^([A-Za-z][A-Za-z0-9]*)(?:\(([A-G][#b]?-?\d|\d+(?:\.\d+)?)\))?$/.exec(e);if(!t)return null;r.push({member:t[1],pitch:t[2]??null})}let i=Kc(r.map(e=>e.member),Gc),a=/* @__PURE__ */ new Map;for(let{member:e,pitch:t}of r){let n=i.get(e);if(n===void 0)continue;let r=Gc(e),o=r===null?void 0:_p[gp[r]??``],s=(o?o.replace(/ ?loop=\S+/,``):t?`s=sine env=&(map=adsr 0 .3 0 .05)`:`s=white hpf=6000 env=&(map=adsr 0 .1 0 .05)`).replace(/^note=\d+ /,``);a.set(n,{member:e,sound:`note=${n} ${t?s.replace(/^(s=\S+)/,`$1 loop=${t}`):s}`})}return t.every(e=>a.has(e.key))?a:null}let yp=/* @__PURE__ */ new Set([`out`,`piece`,`tempo`,`bar`,...Object.keys(_p)]),bp=(e,t=5)=>String(Number(e.toPrecision(t)));function xp(e,t){let n=(e??``).normalize(`NFKD`).replace(/[̀-ͯ]/g,``).split(/[^A-Za-z0-9]+/).filter(Boolean).map((e,t)=>t?e[0].toUpperCase()+e.slice(1):e[0].toLowerCase()+e.slice(1)).join(``);return n&&/^[A-Za-z]/.test(n)||(n=t),n.slice(0,24)}function Sp(e,t){let n=n=>{let r=Math.min(Math.max(1,e/96),n/8);return t.filter(e=>Math.abs(e-Math.round(e/n)*n)>r).length};for(let r of hp){let i=e/r,a=n(i);if(t.length-a>=.995*t.length)return{step:i,perQuarter:r,moved:a}}return{step:e/4,perQuarter:4,moved:n(e/4)}}function Cp(e,t){let n=[],r=0,i=e=>{for(;e>Jr;e-=Jr)n.push(`~@${Jr}`);e>0&&n.push(e===1?`~`:`~@${e}`)};for(let t of e){i(t.at-r);let e=t.values.length===1?t.values[0]:`[${t.values.join(`,`)}]`;n.push(t.dur===1?e:`${e}@${t.dur}`),r=t.at+t.dur}return i(t-r),n.join(` `)}function wp(e,t,{free:n=!0,shorten:r=!1,credit:i=[],pitches:a=`auto`,split:o=`auto`,watch:s,story:c=!1}={}){if(r&&o!==`tracks`){let l=Op(e),u=e=>s&&((t,n)=>n.tool!==`done`&&s(t,e?{...n,tool:`${n.tool}, ${e}`}:n)),d={free:n,shorten:r,credit:i,pitches:a,story:c,split:`tracks`},f=o===`voices`&&l?null:wp(e,t,{...d,watch:u(``)}),p=l&&wp(l,t,{...d,watch:u(`in voices`)}),m=p?.folded&&(!f||!f.folded||Ff(p.source)<Ff(f.source))?p:f;return s?.(()=>m.source,{tool:`done`,round:0}),m}let l=[];e.tracks.forEach((e,t)=>{let n=[...new Set(e.notes.map(e=>e.channel))].sort((e,t)=>e-t);for(let r of n){let i=xp(e.name,`track${t+1}`),a=e.notes.filter(e=>e.channel===r),o=r===10?vp(e.name,a):null,s=o?xp([...new Set([...o.values()].map(e=>e.member))].join(` `),`track${t+1}`):i;l.push({name:n.length>1?`${s}Ch${r}`:s,drums:r===10,notes:a,kit:o})}});let u=l.flatMap(e=>e.notes),{step:d,perQuarter:f,moved:p}=Sp(e.ppq,[...u.map(e=>e.tick)]),m=e=>Math.round(e/d),h=Math.max(1,...u.map(e=>Math.max(m(e.tick)+1,m(e.end)))),g=Array.from({length:h},(t,n)=>pf(e,(n+1)*d)-pf(e,n*d)),_=/* @__PURE__ */ new Map;for(let e of g)_.set(bp(e,6),(_.get(bp(e,6))??0)+1);let v=Number([..._].sort((e,t)=>t[1]-e[1])[0][0]),y=g.map(e=>bp(e/v)),b=[];for(let e=0;e<h;){let t=1;for(;e+t<h&&y[e+t]===y[e];)t++;b.push(t===1?y[e]:`${y[e]}!${t}`),e+=t}let x=g.reduce((e,t)=>e+t,0),S=60*h/(x*f),C=4*f,w=e=>Number.isInteger(e)&&Number.isInteger(Math.log2(e)),T=C===4?``:w(C)?` pulse=${C}n`:w(2*C/3)?` pulse=${2*C/3}t`:` pulse=${C}n`,E=n?`free(${bp(S,6)}bpm, ${Math.floor(S*.6)}..${Math.ceil(S*1.5)})`:`${bp(S,6)}bpm`,D=`&tempo scan(${b.join(` `)})${T} step=${E} laps=1`,O=Fp(e,f,y.map(Number),Number(bp(S,6)),h,n),k=new Set(yp),A=e=>{let t=e;for(let n=2;k.has(t);n++)t=`${e}${n}`;return k.add(t),t},j=[],M=[],N=[],P=/* @__PURE__ */ new Set,F=/* @__PURE__ */ new Map,I=l.some(e=>e.drums&&!e.kit),ee=(e,t)=>{for(let[n,r]of F)if(r===t&&n.replace(/\d+$/,``)===e)return n;let n=e;for(let t=2;F.has(n)||k.has(n)&&(I||!(n in _p));t++)n=`${e}${t}`;return k.add(n),F.set(n,t),n},te=l.map(e=>e.kit?new Map([...e.kit].map(([e,t])=>[e,ee(t.member,t.sound)])):null),ne=0,L=0;for(let[t,n]of l.entries()){let r=[],i=te[t],a=n.drums?null:Tp(n.notes,e);for(let e of a?.notes??[...n.notes].sort((e,t)=>e.tick-t.tick||e.key-t.key)){let t=i?i.get(e.key):n.drums?gp[e.key]:String(e.key-60);if(t===void 0){ne++;continue}n.drums&&!i&&P.add(t);let a=m(e.tick),o=Math.max(1,m(e.end)-a),s=n.drums?`&${t}`:t,c=r.find(e=>{let t=e[e.length-1];return t.at===a&&t.dur===o&&!t.values.includes(s)||t.at+t.dur<=a}),l=c?.[c.length-1];c&&l.at===a&&l.dur===o?c[c.length-1]={...l,values:[...l.values,s]}:c?c.push({at:a,dur:o,values:[s]}):r.push([{at:a,dur:o,values:[s]}]),L++}if(!r.length)continue;let o=n.drums?null:A(`${n.name}Voice`),s=r.map(()=>A(n.name));r.forEach((e,t)=>j.push({name:s[t],chords:e,length:O?O.steps:h})),o&&N.push(`&${o} s=tri loop=C4${a?` glide=${a.glide}`:``} env=&(map=adsr .005 .2 .6 .15)`);for(let e of s)M.push(o?`&${e} * &${o} * .25`:`&${e} * .4`)}let re=/* @__PURE__ */ new Map,ie=(e,t)=>{let n=`Opened from a MIDI file: ${L} notes in ${j.length} line${j.length===1?``:`s`}, ${f} step${f===1?``:`s`} a quarter note, ${t}.`,r=[...i.length?[...i.map(e=>`# ${e}`),``]:[],...z.lines.length?z.lines:[`# the file's tempo map: a step each ${f===4?`sixteenth`:`1/${f} of a quarter note`}; laps=1, so the piece ends`,D],``,...e,``,...N,...[...P].sort().map(e=>`&${e} ${_p[e]}`),...[...F].map(([e,t])=>`&${e} ${t}`),`&out map=sample [${M.join(`, `)}]`,``].join(`
`);return re.set(r,n),r},R=()=>ie([`# every note, a line a track (and one beside for notes that overlap); melodies as semitones from C4`,...j.map(e=>`&${e.name} step=${z.tap} ${Cp(e.chords,e.length)}`)],`written out in full: Shorten folds it`),z={lines:[],tap:`pulse`},ae=R(),oe=ae;for(let e of O?.options??[]){Object.assign(z,{lines:e,tap:O.tap});let t=R();if(Mp(ae,t)){oe=t;break}Object.assign(z,{lines:[],tap:`pulse`})}let se=oe,ce=!1,B=null,le;if(r&&j.length){let t=(e,t,n)=>e===`done`?`folded`:t?`${e}, ${n}`:e,n=(e,t)=>{let{defs:n,lines:r,scales:i}=ef(e,`m`,z.tap,`^$`,t);return ie([`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up`,...n,``,`# every note, a line a track; melodies as semitones from C4`,...j.map(e=>`&${e.name} step=${z.tap}${i.get(e.name)===1?``:`/${i.get(e.name)}`} ${r.get(e.name)}`)],`folded (engine/fold)`)},r=[];if(a===`auto`||a===`semitones`){let e=ff(j,s&&((e,r)=>s(()=>n(e()),{...r,tool:t(r.tool,r.round,`in semitones`)})));r.push({source:n(e),key:null,from:j,folded:e,print:n,how:`Every note written out, as semitones from C4`})}let i=Tf(j);if(a!==`semitones`&&i&&j.some(e=>e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`))))){let n=A(`key`),o=(e,t)=>{let{defs:r,lines:a,scales:o}=ef(e,`m`,z.tap,`^`,t);return ie([`# the key: the lines read through it, a note its degree (0 the tonic; 6# the seventh raised a semitone)`,`&${n} ${bf(i)}`,``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# every note, a line a track; melodies as degrees of ${xf(i)}`,...j.map(e=>`&${e.name} step=${z.tap}${o.get(e.name)===1?``:`/${o.get(e.name)}`}${e.chords.some(e=>e.values.some(e=>!e.startsWith(`&`)))?` over=&${n}`:``} ${a.get(e.name)}`)],`folded in degrees of ${xf(i)} (engine/fold)`)};if(a===`auto`||a===`degrees`){let e=Ef(j,i),n=ff(e,s&&((e,n)=>s(()=>o(e()),{...n,tool:t(n.tool,n.round,`in degrees of ${xf(i)}`)})),{degrees:!0});r.push({source:o(n),key:xf(i),from:e,folded:n,print:o,how:`Every note written out, as degrees of ${xf(i)}`})}let c=e.meters[0]??{num:4,den:4},l=Math.max(1,Math.round(f*4*c.num/c.den)),u=a===`auto`||a===`sections`?kf(j,l):[];if(u.length>1){let e=Af(j,u,l),n=e.map(e=>Ef([e.part],u[e.section].key)[0]),i=[...new Set(u.map(e=>bf(e.key)))],a=new Map(i.map((e,t)=>[e,A(`key${t+1}`)])),o=/* @__PURE__ */ new Map,c=(t,n)=>{let{defs:r,lines:s,scales:c}=ef(t,`m`,z.tap,`^`,n),l=/* @__PURE__ */ new Map,d=[],f=new Map(j.map(e=>[e.name,[]]));for(let t of e){let e=s.get(t.part.name),n=c.get(t.part.name)??1,r=n===1?``:`@${n}`;if(/^~(@\d+)?(!\d+)?$/.test(e)){let e=f.get(t.line),n=/^~(?:@(\d+))?$/.exec(e[e.length-1]??``),r=t.part.length+(n?Number(n[1]??1):0);n&&e.pop(),e.push(r===1?`~`:`~@${r}`);continue}let i=a.get(bf(u[t.section].key)),p=`${i} ${e}`,m=l.get(p);m||(m=o.get(`${t.line}§${t.section}`)??A(`${t.line}${String.fromCharCode(65+t.section%26)}`),o.set(`${t.line}§${t.section}`,m),l.set(p,m),d.push(`&${m} over=&${i} ${e}`)),f.get(t.line).push(`&${m}${r}`)}return ie([`# the keys: a section a key, cut where the key changes; a note its degree (0 the tonic; 6# the seventh raised a semitone)`,...i.map(e=>`&${a.get(e)} ${e}`),``,`# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up`,...r,``,`# the sections, a cell each part of a line, read through its section's key: ${u.map(e=>xf(e.key)).join(`, `)}`,...d,``,`# every note, a line a track: its sections in order`,...j.map(e=>`&${e.name} step=${z.tap} ${Ap(f.get(e.name))}`)],`folded in ${u.length} sections by key (engine/fold)`)},d=ff(n,s&&((e,n)=>s(()=>c(e()),{...n,tool:t(n.tool,n.round,`in ${u.length} sections by key`)})),{degrees:!0});r.push({allowance:kp,source:c(d),key:`${u.length} sections by key (${u.map(e=>xf(e.key)).join(`, `)})`,from:n,folded:d,print:c,how:`Every note written out, in ${u.length} sections by key`})}}let o=e=>{let t=new Map($d(e.folded).map((e,t)=>[e,`m${t+1}`]));return gf(e.from,e.folded).map((n,r)=>{let i=n.came===null?null:e.folded.rules.get(n.came),a=`in ${n.uses} place${n.uses===1?``:`s`}`,o=i?i.of?`&${t.get(n.came)} · a copy of &${t.get(i.of)}, changed · ${a}`:`&${t.get(n.came)} · ${i.kids.length} steps · ${a}`:r===0?e.how:`The lines on their own clocks, figures read over chords`;return{source:e.print(n.folded,t),says:o}})},l=new Map(r.map(e=>[e,Ff(e.source)])),u=Ff(oe);for(let e of r.sort((e,t)=>l.get(e)/(e.allowance??1)-l.get(t)/(t.allowance??1)))if(l.get(e)<u&&jp(oe,e.source)){[se,ce,B]=[e.source,!0,e.key],c&&(le=o(e));break}let d=se;s?.(()=>d,{tool:`done`,round:0})}return{source:se,frontmatter:{title:t,tags:[`midi`],description:re.get(se)},notes:L,lines:j.length,perQuarter:f,moved:p,dropped:ne,folded:ce,inKey:B,...c?{story:le??[{source:se,says:`Every note written out`}]}:{}}}function Tp(e,t){let n=[...e].sort((e,t)=>e.tick-t.tick||e.key-t.key);if(n.some((e,t)=>t>0&&e.tick===n[t-1].tick))return null;let r=e=>pf(t,e),i=n.flatMap((e,t)=>{let i=n[t+1];if(!i||e.end<=i.tick)return[];let a=n[t+2],o=(a&&a.tick<i.end?r(a.tick):r(i.end))-r(i.tick);return[{i:t,by:r(e.end)-r(i.tick),room:o}]});if(i.length<2)return null;let a=Math.max(...i.map(e=>e.by));if(!i.every(e=>Math.abs(e.by-Math.min(a,e.room))<=Ep))return null;let o=new Set(i.map(e=>e.i));return{notes:n.map((e,t)=>o.has(t)?{...e,end:n[t+1].tick}:e),glide:Math.round(a*1e3)/1e3}}let Ep=.004,Dp={2:[`upper`,`lower`],3:[`upper`,`middle`,`lower`],4:[`soprano`,`alto`,`tenor`,`bass`]};function Op(e){let t=e.tracks.map(e=>e.notes.filter(e=>e.channel!==10)).filter(e=>e.length);if(new Set(e.tracks.filter(e=>e.notes.some(e=>e.channel!==10)).map(e=>e.programs[0]?.program??0)).size>1||t.some(t=>Tp(t,e)))return null;let n=t.flat().sort((e,t)=>e.tick-t.tick||t.key-e.key),{voice:r,count:i}=Mf(n.map(e=>({start:e.tick,end:e.end,key:e.key})));if(i<=t.length||i>8)return null;let a=Dp[i]??Array.from({length:i},(e,t)=>`voice${t+1}`),o=n[0].channel,s=a.map((e,t)=>({name:e,notes:n.filter((e,n)=>r[n]===t).map(e=>({...e,channel:o})),bends:[],programs:[]})),c=e.tracks.flatMap(e=>e.notes.some(e=>e.channel===10)?[{...e,notes:e.notes.filter(e=>e.channel===10)}]:[]);return{...e,tracks:[...s.filter(e=>e.notes.length),...c]}}let kp=1.15;function Ap(e){let t=[];for(let n=0;n<e.length;){let r=1;for(;n+r<e.length&&e[n+r]===e[n];)r++;t.push(r===1?e[n]:`${e[n]}!${r}`),n+=r}return t.join(` `)}function jp(e,t){let n=e=>{let t=vd(e);if(!t.ok)return null;let n=_c(t,lt(t),t.off);return Ac(n,0,n.end).map(e=>`${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`).sort()},[r,i]=[n(e),n(t)];return!!r&&!!i&&r.length===i.length&&r.every((e,t)=>e===i[t])}function Mp(e,t){let n=e=>{let t=vd(e);if(!t.ok)return null;let n=_c(t,lt(t),t.off);return Ac(n,0,n.end).sort((e,t)=>e.at-t.at||e.freq-t.freq||e.voice.localeCompare(t.voice))},[r,i]=[n(e),n(t)],a=(e,t)=>Math.abs(e-t)<=1e-6;return!!r&&!!i&&r.length===i.length&&r.every((e,t)=>e.voice===i[t].voice&&a(e.at,i[t].at)&&a(e.dur,i[t].dur)&&a(e.freq,i[t].freq))}let Np={.5:`2n`,1:`4n`,2:`8n`,3:`8t`,4:`16n`,6:`16t`,8:`32n`,12:`32t`,16:`64n`},Pp=(e,t=6)=>String(Number(e.toFixed(t))).replace(/^0\./,`.`);function Fp(e,t,n,r,i,a){let o=Np[t],s=[...new Set(e.meters.map(e=>`${e.num}/${e.den}`))];if(!o||s.length!==1||e.meters[0].tick!==0)return null;let c=s[0],{num:l,den:u}=e.meters[0],d=t*4*l/u,f=vd(`&bar meter("${c}") step=60bpm`).cells.get(`bar`)?.meter;if(!f||!Number.isInteger(d)||d<1||i<d)return null;let p=(e,t)=>Math.abs(e-t)<=1e-4*Math.max(e,t),m=[...Array(d).keys()].map(e=>e+1).find(e=>d%e===0&&n.every((t,r)=>p(t,n[r%e])));if(!m)return null;let h=n.slice(0,m),g=Np[t/2],_=e=>m===1?``:m===2?` swing=${o}:${Pp(h[0]/(h[0]+h[1]),e)}`:m===4&&g&&p(h[0],h[1])&&p(h[2],h[3])?` swing=${g}:${Pp((h[0]+h[1])/(h[0]+h[1]+h[2]+h[3]),e)}`:` bend=${o}:&(${h.map(t=>Pp(t,e)).join(` `)})`,v=[.../* @__PURE__ */ new Set([_(3),_(6)])],y=r*f.beats.length/(4*l/u),b=a?`free(${bp(y,9)}bpm, ${Math.floor(y*.6)}..${Math.ceil(y*1.5)})`:`${bp(y,9)}bpm`;return{tap:o,steps:Math.ceil(i/d)*d,options:v.map(e=>[`# the file's meter, ${c}${e?`, its lean repeating each ${m===d?`bar`:`${m} ${o} steps`}`:``}; laps=, its bars, so the piece ends`,`&bar meter("${c}") step=${b}${e} laps=${Math.ceil(i/d)}`])}}let Ip=2048;(()=>{let e=new Float64Array(Ip);for(let t=0;t<Ip;t++)e[t]=Math.sin(2*Math.PI*t/Ip);return e})(),Math.log(3.8)/Math.log(200);let Lp=/* @__PURE__ */ `oscillator.tone.rests.semitones.twovoices.steps.clock.voice.effects.band-pass.transpose.twinkle.chords.rhythm.drums.swing.advanced-meter.strudel.breve.canon.mirrors.variations.chance.fifths.cycle.circle.arrangement.stereo.waveforms.moving.style.grids.metronome.fm.musicbox.automaton.kalimba.sympathy.harmonograph.echotape.worn.dtmf.daytime.gate.play-in.midi-out.lullaby.jazz.funk.drumtrack.ending.twelve.five.aksak.waltz.sailor.royal.pertonos.ricercar.korobeiniki.coltrane.bossa.bell.prelude.pachelbel.pop.idm.alpha.studie.just.bwv847.acid.patchbay.zell.cellscape.cellscape2.baustelle.focus.hypercell.onemore.electroswing.spooky.kinderlied.radio.song.brothers.ghosts.tines.phase.in-c.tape.soundtape.testtones.forks.resonanz.fiveto12`.split(`.`),Rp={acid:`---
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
`},zp=Object.fromEntries(Lp.map(e=>{let t=Rp[e];if(t===void 0)throw Error(`examples/${e}.md is missing`);let n=nu(t);if(`problems`in n)throw Error(`examples/${e}.md: ${n.problems.map(e=>`line ${e.line}: ${e.message}`).join(`; `)}`);return[e,{source:n.text,file:t}]})),Bp=cp(lp),Vp=[`meters`,`rhythms`,`fills`,`counts`,`endings`,`bass`,`harmony`,`instruments`,`expression`,`modes`,`melodic`,`performers`,`stab`,`motifs`,`forms`,`sections`,`songs`,`bands`,`styles`,`modules`,`laws`],Hp=Object.entries(zp).flatMap(([e,t])=>Sl(t.source).flatMap(n=>{let r=n.slice(1),i=_l(t.source,r);if(i===null)return[];let a=qf(i.split(`
`).filter(e=>!e.trim().startsWith(`*`)).join(`
`),{styles:Bp});if(!a?.explicit)return[];let o={id:`${e}/${r}`,text:i,association:a.association},s=[...a.problems,...ep(o)];if(s.length)throw Error(`examples/${e}.md, part &${r}: ${s.join(`; `)}`);return[o]})),Up=[...Vp.flatMap(e=>pp(e)),...Hp],Wp=e=>Up.filter(t=>t.association.some(t=>t.facet===e)),Gp=new Map([...dp.map(e=>[e.fragment.id,e.fragment.text]),...Up.map(e=>[e.id,e.text])]),Kp=Object.entries(zp).map(([e,t])=>[e,t.source]);new Map([...Kp,...Gp]),Up.filter(e=>e.association.some(e=>e.facet===`section`)).map(e=>e.id),[...new Set(Up.flatMap(e=>e.association.flatMap(e=>e.facet===void 0?[]:[e.facet])))],new Set(Up.map(e=>e.id));let qp=pp(`styles`);function Jp(e){let t=e.braid.kind===`list`?e.braid.tokens.map(e=>e.atom.kind===`note`?e.atom.value:NaN):[];if(e.map?.kind!==`style`||t.length!==n.length||!t.every(Number.isFinite))throw Error(`styles: &${e.name} is not a style cell with a value on each axis`);if(!e.label)throw Error(`styles: &${e.name} has no label=, its display name`);if(e.step?.kind!==`rate`)throw Error(`styles: &${e.name} has no step= in bpm, its default tempo`);return{id:e.name,name:e.label,point:Object.fromEntries(n.map((e,n)=>[e,t[n]])),tempo:Math.round(e.step.perSecond*60*1e9)/1e9,...e.reach?{reach:{...e.reach}}:{}}}let Yp=ld(qp.find(e=>e.id===`styles`).text).cells.map(Jp);function Xp(e){let t=Yp.find(t=>t.id===e);if(!t)throw Error(`styles: no style ${e} (there are ${Yp.map(e=>e.id).join(`, `)})`);return t.point}Xp(`synthPop`),Xp(`techno`),Xp(`deepHouse`),Xp(`ambient`),Xp(`lofi`),Xp(`funk`),Xp(`bossaNova`),Xp(`swingJazz`),Xp(`electroSwing`),Xp(`spooky`),Xp(`kinderlied`),Xp(`pop`),pp(`instruments`),Object.fromEntries(t.map((e,t)=>[e.name,a[t]])),[.../* @__PURE__ */ new Set([...Nd,...Pd,`third`,`dominant`])],Wp(`motif`),Wp(`form`),self.onmessage=e=>{let{smf:t,title:n,credit:r}=e.data;postMessage({kind:`done`,made:wp(t,n,{shorten:!0,credit:r,story:!0})})}})();