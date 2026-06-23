// The Well's two HTML doors. Client scripts use string concatenation (no nested
// template literals) so these files need no escaping and bundle cleanly.

export const PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>the Well — ai-love.cc commons</title>
<style>
 :root{color-scheme:dark}
 body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0a0e14;color:#cfe;display:flex;flex-direction:column;align-items:center;min-height:100vh}
 header{margin:8vh 0 2vh;text-align:center}
 h1{font-size:2.4rem;margin:0}
 .sub{opacity:.7}
 form{display:flex;gap:.5rem;width:min(680px,92vw)}
 input{flex:1;padding:.8rem 1rem;border-radius:10px;border:1px solid #234;background:#0e141d;color:#cfe;font-size:1rem}
 button{padding:.8rem 1.2rem;border-radius:10px;border:0;background:#2a6;color:#021;font-weight:600;cursor:pointer}
 #out{width:min(680px,92vw);margin-top:1.4rem}
 .card{border:1px solid #234;border-radius:12px;padding:1rem;margin:.7rem 0;background:#0e141d}
 .name{font-weight:700;font-size:1.1rem}
 .badge{font-size:.72rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem}
 .open{background:#163;color:#9f8}.rate-limited{background:#352;color:#fe9}
 .free-key,.free-account{background:#423;color:#fb9}
 .fresh{color:#6cf;font-size:.75rem;margin-left:.4rem}
 code{display:block;background:#060a10;padding:.6rem;border-radius:8px;margin:.5rem 0;overflow:auto;word-break:break-all}
 .copy{font-size:.75rem;cursor:pointer;color:#6cf;background:none;border:0;padding:0}
 a{color:#6cf}
 footer{opacity:.6;margin:3rem 0 2rem;font-size:.85rem;text-align:center}
</style></head><body>
<header><h1>the Well 🌊</h1><div class="sub">ask for what you need — draw freely, no one owns the water.</div></header>
<form id="f"><input id="q" placeholder="what do you need? (e.g. free weather api, training text)" autofocus><button>draw</button></form>
<div id="out"></div>
<footer>a control-plane commons · use is never gated · <a href="/truth">the truth</a> · <a href="/llms.txt">llms.txt</a></footer>
<script>
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
var out=document.getElementById('out');
document.getElementById('f').addEventListener('submit',function(e){
  e.preventDefault();
  var q=document.getElementById('q').value.trim();
  out.innerHTML='<p style="opacity:.6">drawing…</p>';
  fetch('/find?q='+encodeURIComponent(q)).then(function(r){return r.json()}).then(function(d){
    if(!d.results.length){out.innerHTML='<div class="card">The Well does not hold that yet — the gap is an opening. <a href="https://codeberg.org/zerone-dev">add it?</a></div>';return}
    out.innerHTML=d.results.map(function(x){
      return '<div class="card"><div><span class="name">'+esc(x.name)+'</span>'
        +'<span class="badge '+x.gate+'">'+x.gate+'</span>'
        +(x.fresh_pick?'<span class="fresh">✦ fresh pick</span>':'')+'</div>'
        +'<div style="opacity:.85">'+esc(x.what)+'</div>'
        +'<code>'+esc(x.get)+'</code>'
        +'<button class="copy" data-get="'+esc(x.get)+'">copy</button>'
        +'<span style="opacity:.6;font-size:.8rem"> · '+esc(x.source)+' · <a href="'+esc(x.terms)+'">terms</a></span>'
        +'</div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.copy'),function(b){
      b.addEventListener('click',function(){navigator.clipboard.writeText(b.getAttribute('data-get'))});
    });
  });
});
</script></body></html>`

export const TRUTH_PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>the Well — the truth</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#0a0e14;color:#cfe;max-width:760px;margin:0 auto;padding:2rem}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:.4rem;border-bottom:1px solid #1a2330}
.open{color:#9f8}.stale{color:#fe9}.broken{color:#f88}a{color:#6cf}</style></head><body>
<h1>the truth 🔎</h1><p>the Well tells the truth about itself. broken springs are shown as broken, never hidden.</p>
<table id="t"><thead><tr><th>resource</th><th>category</th><th>gate</th><th>status</th><th>verified</th></tr></thead><tbody></tbody></table>
<p style="opacity:.6"><a href="/">← back to the Well</a></p>
<script>
fetch('/registry.json').then(function(r){return r.json()}).then(function(d){
  document.querySelector('tbody').innerHTML=d.resources.map(function(e){
    return '<tr><td>'+e.name+'</td><td>'+e.category+'</td><td>'+e.gate+'</td>'
      +'<td class="'+(e.status||'')+'">'+(e.status||'unverified')+'</td>'
      +'<td style="opacity:.6">'+(e.last_verified||'—')+'</td></tr>';
  }).join('');
});
</script></body></html>`
