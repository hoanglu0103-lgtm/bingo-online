const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

const rooms = new Map();
const MAX_PLAYERS = 20;
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function makeCard() {
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const cols = ranges.map(([lo,hi]) => {
    const a = Array.from({length: hi-lo+1}, (_,i)=>lo+i);
    for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a.slice(0,5);
  });
  const grid = Array.from({length:5}, (_,r)=>Array.from({length:5}, (_,c)=>cols[c][r]));
  grid[2][2] = 0;
  return grid;
}
function publicState(room) {
  return {
    code: room.code, hostName: room.hostName, status: room.status,
    drawMode: room.drawMode, called: room.called, last: room.called.at(-1) || null,
    entryFee: room.entryFee, prizePool: room.prizePool,
    players: [...room.players.values()].map(p=>({id:p.id,name:p.name,card:p.card,marked:p.marked,claimed:p.claimed,balance:p.balance})),
    winner: room.winner, maxPlayers: MAX_PLAYERS
  };
}
function emitRoom(room) { io.to(room.code).emit("state", publicState(room)); }
function checkWin(card, marked) {
  const has = (r,c) => card[r][c] === 0 || marked.includes(card[r][c]);
  for (let r=0;r<5;r++) if ([0,1,2,3,4].every(c=>has(r,c))) return true;
  for (let c=0;c<5;c++) if ([0,1,2,3,4].every(r=>has(r,c))) return true;
  if ([0,1,2,3,4].every(i=>has(i,i))) return true;
  if ([0,1,2,3,4].every(i=>has(i,4-i))) return true;
  return false;
}
function draw(room) {
  if (room.status !== "playing" || room.called.length >= 75) return null;
  const remaining = Array.from({length:75},(_,i)=>i+1).filter(n=>!room.called.includes(n));
  const n = remaining[Math.floor(Math.random()*remaining.length)];
  room.called.push(n);
  return n;
}

io.on("connection", socket => {
  socket.on("createRoom", ({name, drawMode}, cb) => {
    const code = makeCode();
    const room = {code, hostId:socket.id, hostName:String(name||"Quản trò").slice(0,24),
      status:"lobby", drawMode:drawMode==="manual"?"manual":"auto", called:[],
      players:new Map(), winner:null, timer:null, entryFee:100, prizePool:0};
    rooms.set(code, room); socket.join(code);
    cb?.({ok:true,code,role:"host"}); emitRoom(room);
  });

  socket.on("joinRoom", ({code,name}, cb) => {
    code=String(code||"").trim().toUpperCase();
    const room=rooms.get(code);
    if(!room) return cb?.({ok:false,error:"Không tìm thấy phòng."});
    if(room.players.size>=MAX_PLAYERS) return cb?.({ok:false,error:"Phòng đã đủ 20 người chơi."});
    if(room.status==="finished") return cb?.({ok:false,error:"Ván chơi đã kết thúc."});
    const entryFee = room.entryFee;
    const player={id:socket.id,name:String(name||"Người chơi").slice(0,24),card:makeCard(),marked:[],claimed:false,balance:1000};
    if(player.balance < entryFee) return cb?.({ok:false,error:"Bạn không đủ điểm ảo để vào phòng."});
    player.balance -= entryFee; room.prizePool += entryFee;
    room.players.set(socket.id,player); socket.join(code);
    cb?.({ok:true,role:"player",code}); emitRoom(room);
  });

  socket.on("startGame", ({code}, cb) => {
    const room=rooms.get(String(code||"").toUpperCase());
    if(!room || room.hostId!==socket.id) return cb?.({ok:false,error:"Chỉ quản trò mới được bắt đầu."});
    if(!room.players.size) return cb?.({ok:false,error:"Cần ít nhất một người chơi."});
    room.status="playing"; emitRoom(room); cb?.({ok:true});
    if(room.drawMode==="auto") {
      room.timer=setInterval(()=>{
        const n=draw(room);
        if(n===null){clearInterval(room.timer);return;}
        emitRoom(room);
        if(room.called.length===75){room.status="finished";clearInterval(room.timer);emitRoom(room);}
      },5000);
    }
  });

  socket.on("drawNumber", ({code}, cb) => {
    const room=rooms.get(String(code||"").toUpperCase());
    if(!room || room.hostId!==socket.id) return cb?.({ok:false,error:"Chỉ quản trò mới được gọi số."});
    const n=draw(room);
    if(n===null) return cb?.({ok:false,error:"Không còn số hoặc ván chưa bắt đầu."});
    if(room.called.length===75) room.status="finished";
    emitRoom(room); cb?.({ok:true,number:n});
  });

  socket.on("toggleMark", ({code,number}, cb) => {
    const room=rooms.get(String(code||"").toUpperCase());
    const p=room?.players.get(socket.id);
    if(!room || !p || room.status!=="playing") return cb?.({ok:false,error:"Chưa thể đánh dấu."});
    if(!room.called.includes(number)) return cb?.({ok:false,error:"Số này chưa được gọi."});
    p.marked=p.marked.includes(number)?p.marked.filter(n=>n!==number):[...p.marked,number];
    emitRoom(room); cb?.({ok:true});
  });

  socket.on("claimBingo", ({code}, cb) => {
    const room=rooms.get(String(code||"").toUpperCase());
    const p=room?.players.get(socket.id);
    if(!room || !p || room.status!=="playing") return cb?.({ok:false,error:"Không thể báo Bingo lúc này."});
    if(checkWin(p.card,p.marked)) {
      p.claimed=true; room.winner=p.name; room.status="finished";
      p.balance += room.prizePool;
      room.prizePool = 0;
      if(room.timer) clearInterval(room.timer);
      emitRoom(room); cb?.({ok:true,prize:p.balance});
    } else cb?.({ok:false,error:"Chưa đủ 5 số thành một hàng, cột hoặc đường chéo."});
  });

  socket.on("disconnect",()=>{
    for(const room of rooms.values()){
      if(room.players.has(socket.id)){room.players.delete(socket.id);emitRoom(room);}
      if(room.hostId===socket.id){
        if(room.timer) clearInterval(room.timer);
        room.status="finished"; room.winner="Quản trò đã rời phòng"; emitRoom(room);
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", ()=>console.log(`Bingo server running on ${PORT}`));
