const socket=io();
const $=id=>document.getElementById(id);
let roomCode=null, role=null, myId=null, latest=null, myName="", lastSpoken=null, speechReady=false;
socket.on("connect",()=>{$("connection").textContent="Đã kết nối";$("connection").style.background="#e1f8ec";$("connection").style.color="#087b4c";myId=socket.id});
socket.on("disconnect",()=>{$("connection").textContent="Mất kết nối";$("connection").style.background="#ffe8e8";$("connection").style.color="#b42318"});
function showGame(){ $("home").classList.add("hidden");$("game").classList.remove("hidden");$("code").textContent=roomCode;$("playerLabel").textContent=myName+(role==="host"?" · Quản trò":"");$("hostControls").classList.toggle("hidden",role!=="host"); }
function result(r){if(!r?.ok){alert(r?.error||"Có lỗi xảy ra");return false}return true}
$("createForm").onsubmit=e=>{e.preventDefault();myName=$("hostName").value.trim();socket.emit("createRoom",{name:myName,drawMode:$("drawMode").value},r=>{if(result(r)){roomCode=r.code;role="host";showGame()}})};
$("joinForm").onsubmit=e=>{e.preventDefault();myName=$("playerName").value.trim();const code=$("roomCode").value.trim().toUpperCase();socket.emit("joinRoom",{name:myName,code},r=>{if(result(r)){roomCode=r.code;role="player";showGame()}})};
$("start").onclick=()=>socket.emit("startGame",{code:roomCode},result);
$("draw").onclick=()=>socket.emit("drawNumber",{code:roomCode},r=>{if(result(r))$("message").textContent="Đã gọi số "+r.number});
$("claim").onclick=()=>socket.emit("claimBingo",{code:roomCode},r=>{$("message").textContent=r.ok?"Bingo hợp lệ!":r.error});
$("copyCode").onclick=()=>navigator.clipboard?.writeText(roomCode).then(()=>$("copyCode").textContent="Đã sao chép");
$("leave").onclick=()=>location.reload();
function renderCard(p,called,status){
 const el=$("card");el.innerHTML="";
 ["B","I","N","G","O"].forEach(x=>{const d=document.createElement("div");d.className="cell head";d.textContent=x;el.append(d)});
 p.card.forEach((row,r)=>row.forEach((n,c)=>{
  const d=document.createElement("div");const marked=n===0||p.marked.includes(n);
  d.className="cell"+(n===0?" free":"")+(marked?" marked":"");d.textContent=n===0?"FREE":n;
  if(n!==0&&called.includes(n)&&status==="playing")d.title="Số đã được gọi — bấm để đánh dấu";
  d.onclick=()=>{if(n!==0&&called.includes(n)&&status==="playing")socket.emit("toggleMark",{code:roomCode,number:n},r=>{if(!r.ok)$("message").textContent=r.error})};
  el.append(d);
 }));
}
socket.on("state",s=>{
 latest=s;$("count").textContent=s.players.length+"/20";
 const me=s.players.find(p=>p.id===myId);
 if(me)renderCard(me,s.called,s.status);
 $("last").textContent=s.last||"—";
 if(s.last && s.last!==lastSpoken && $("voiceToggle").checked){ speakNumber(s.last); lastSpoken=s.last; }
 $("gameStatus").textContent=s.status==="lobby"?"Đang chờ":s.status==="playing"?"Đang chơi":"Đã kết thúc";
 $("start").disabled=s.status!=="lobby"||s.players.length===0;
 $("draw").disabled=s.status!=="playing"||s.drawMode!=="manual";
 $("claim").disabled=s.status!=="playing"||!me;
 $("called").innerHTML=Array.from({length:75},(_,i)=>{const n=i+1;return `<span class="${s.called.includes(n)?"on":""}">${n}</span>`}).join("");
 $("players").innerHTML=s.players.map(p=>`<li>${escapeHtml(p.name)}${p.claimed?" 🏆":""}</li>`).join("");
 if(s.status==="playing")$("message").textContent="Chạm vào số đã được gọi trên bảng của bạn để đánh dấu.";
 if(s.winner){$("winner").classList.remove("hidden");$("winner").textContent="🏆 "+escapeHtml(s.winner)+" — Chiến thắng!";}
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function speakNumber(number){
  if(!("speechSynthesis" in window)) return;
  const synth=window.speechSynthesis;
  synth.cancel();
  const utter=new SpeechSynthesisUtterance("Số "+number);
  utter.lang="vi-VN"; utter.rate=0.88; utter.pitch=0.82; utter.volume=1;
  const voices=synth.getVoices();
  const vietnamese=voices.filter(v=>v.lang && v.lang.toLowerCase().startsWith("vi"));
  // Browser voice catalogs vary; prefer a Vietnamese voice with a masculine-sounding name if offered.
  const male=vietnamese.find(v=>/male|nam|man/i.test(v.name));
  if(male) utter.voice=male; else if(vietnamese[0]) utter.voice=vietnamese[0];
  synth.speak(utter);
}
if("speechSynthesis" in window){
  window.speechSynthesis.onvoiceschanged=()=>{speechReady=true;};
  window.speechSynthesis.getVoices();
}
