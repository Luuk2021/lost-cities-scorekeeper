const COLORS=[
 {key:"red",name:"Red Expedition"},
 {key:"green",name:"Green Expedition"},
 {key:"blue",name:"Blue Expedition"},
 {key:"yellow",name:"Yellow Expedition"},
 {key:"white",name:"White Expedition"}
];
const CARD_VALUES=[2,3,4,5,6,7,8,9,10];
const STORAGE="lost-cities-scorekeeper-v2";
let activePlayer=0;
let activeExpedition=0;
let roundComplete=false;
let currentDraft=null;
let viewingPrevious=false;
let editingRoundIndex=-1;

function emptyExp(){return{wagers:0,counts:Object.fromEntries(CARD_VALUES.map(v=>[v,0]))}}
function emptyPlayer(){return{expeditions:COLORS.map(emptyExp)}}
function fresh(){return{names:["You","Opponent"],rounds:[],current:[emptyPlayer(),emptyPlayer()]}}
function load(){
 try{
   const x=JSON.parse(localStorage.getItem(STORAGE));
   if(x?.current&&x?.rounds){
     const normalizePlayer=p=>{
       p.expeditions=p.expeditions||[];
       while(p.expeditions.length<COLORS.length)p.expeditions.push(emptyExp());
       p.expeditions.forEach(e=>{
         e.counts=e.counts||{};
         CARD_VALUES.forEach(v=>e.counts[v]=Boolean(e.counts[v]));
       });
     };
     x.current.forEach(normalizePlayer);
     x.rounds.forEach(r=>r.current?.forEach(normalizePlayer));
     return x
   }
 }catch(e){}
 return fresh()
}
const state=load();
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state))}

/*
  Scoring:
  - expedition not started (0 wagers AND 0 number cards) = 0
  - otherwise: (sum of number-card values - 20) * (wagers + 1)
  - then +20 when TOTAL cards on expedition >= 8
    (number cards + wager cards)
*/
function scoreExp(e){
 const cardCount=CARD_VALUES.reduce((s,v)=>s+(Number(e.counts[v])||0),0);
 const sum=CARD_VALUES.reduce((s,v)=>s+v*(Number(e.counts[v])||0),0);
 const wagers=Number(e.wagers)||0;
 if(cardCount===0&&wagers===0)return{score:0,cardCount:0,sum:0,wagers:0,multiplier:0,bonus:false,started:false};
 const multiplier=wagers+1;
 const base=(sum-20)*multiplier;
 const bonus=cardCount+wagers>=8;
 return{score:base+(bonus?20:0),cardCount,sum,wagers,multiplier,bonus,started:true};
}
function playerScore(p){return p.expeditions.reduce((s,e)=>s+scoreExp(e).score,0)}
function gameTotal(i){return state.rounds.reduce((s,r)=>s+r.scores[i],0)+playerScore(state.current[i])}
function fmt(n){return n>0?"+"+n:String(n)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function render(){
 document.getElementById("player1").value=state.names[0];
 document.getElementById("player2").value=state.names[1];
 document.getElementById("p1Label").textContent=state.names[0];
 document.getElementById("p2Label").textContent=state.names[1];
 document.getElementById("p1Total").textContent=gameTotal(0);
 document.getElementById("p2Total").textContent=gameTotal(1);
 document.querySelectorAll(".tab").forEach((b,i)=>{b.textContent=state.names[i];b.classList.toggle("active",i===activePlayer)});
 document.getElementById("undoBtn").disabled=!state.rounds.length;
 renderExpeditions();renderHistory()
}

function renderExpeditions(){
 const player=state.current[activePlayer];
 const otherPlayer=state.current[activePlayer===0?1:0];
 document.getElementById("stepProgress").textContent=editingRoundIndex>=0?`Editing round ${editingRoundIndex+1}`:`Round ${state.rounds.length+1} · ${state.names[activePlayer]}`;
 document.getElementById("nextRoundBtn").textContent=editingRoundIndex>=0?"Go to current round":"Next round";
 document.querySelector(".round-actions").classList.toggle("editing",editingRoundIndex>=0);
 document.getElementById("expeditions").innerHTML=COLORS.map((c,expeditionIndex)=>{
   const e=player.expeditions[expeditionIndex],s=scoreExp(e),otherExpedition=otherPlayer.expeditions[expeditionIndex];
   const wagerButtons=[1,2,3].map(n=>`<button class="wager ${e.wagers===n?"active":""}" data-exp="${expeditionIndex}" data-wager="${n}" ${n>3-otherExpedition.wagers&&e.wagers!==n?"disabled":""}>Doubler ${n}</button>`).join("");
   const cards=CARD_VALUES.map(v=>{
     const selected=Boolean(e.counts[v]),taken=Boolean(otherExpedition.counts[v]);
     return `<button class="card-cell qty ${selected?"selected":""}" type="button" data-exp="${expeditionIndex}" data-card="${v}" ${taken&&!selected?"disabled":""} aria-label="${c.name} ${v} card${taken&&!selected?" already used":""}"><span>${v}</span><strong>${selected?"✓":"□"}</strong></button>`
   }).join("");
   return `<article class="expedition ${c.key}">
    <div class="exp-head"><h3>${c.name}</h3><span class="exp-score">${fmt(s.score)}</span></div>
    <div class="exp-body">
      <div class="field-title">Doubler cards</div><div class="wagers">${wagerButtons}</div>
      <div class="field-title">Number cards (2–10)</div><div class="card-grid">${cards}</div>
      <div class="details">
       <div><span>Number cards</span><strong>${s.cardCount}</strong></div>
       <div><span>Card value</span><strong>${s.sum}</strong></div>
       <div><span>Calculation</span><strong>${s.started?`(${s.sum} − 20) × ${s.multiplier}`:"Not started"}</strong></div>
       <div><span>8-card bonus</span><strong>${s.bonus?"+20":"—"} ${s.started?`(${s.cardCount+s.wagers} total cards)`:""}</strong></div>
      </div>
    </div></article>`
 }).join("");

 document.querySelectorAll(".wager").forEach(b=>b.onclick=()=>{
   const expedition=+b.dataset.exp;
   const n=+b.dataset.wager;
   const expeditionData=state.current[activePlayer].expeditions[expedition];
   const otherExpeditionData=otherPlayer.expeditions[expedition];
   if(n>3-otherExpeditionData.wagers&&expeditionData.wagers!==n)return;
   expeditionData.wagers=expeditionData.wagers===n?n-1:n;
  persistEditedRound();render()
 });
 document.querySelectorAll(".qty").forEach(button=>button.onclick=()=>{
   const expedition=+button.dataset.exp;
   const c=+button.dataset.card;
   const expeditionData=state.current[activePlayer].expeditions[expedition];
   expeditionData.counts[c]=expeditionData.counts[c]?0:1;
  persistEditedRound();render()
 });
}

function renderHistory(){
 const host=document.getElementById("historyContent");
 if(!state.rounds.length){host.innerHTML='<div class="empty">No saved rounds yet.</div>';return}
 const totals=state.names.map((_,i)=>state.rounds.reduce((sum,r)=>sum+r.scores[i],0));
 host.innerHTML=`<table><thead><tr><th>Round</th><th>${esc(state.names[0])}</th><th>${esc(state.names[1])}</th><th>Action</th></tr></thead><tbody>${
   state.rounds.map((r,i)=>`<tr><td>${i+1}</td><td>${fmt(r.scores[0])}</td><td>${fmt(r.scores[1])}</td><td><button class="edit-round" data-round="${i}">Edit</button></td></tr>`).join("")
 }</tbody><tfoot><tr><th>Total</th><th>${fmt(totals[0])}</th><th>${fmt(totals[1])}</th><th></th></tr></tfoot></table>`
 document.querySelectorAll(".edit-round").forEach(button=>button.onclick=()=>editRound(+button.dataset.round));
}

function hasCards(){
 return state.current.some(p=>p.expeditions.some(e=>e.wagers||CARD_VALUES.some(v=>e.counts[v])))
}
function toast(msg){
 const x=document.getElementById("toast");x.textContent=msg;x.classList.add("show");
 clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("show"),1700)
}
function scrollToFirstExpedition(){
 const firstExpedition=document.querySelector(".expedition");
 if(firstExpedition)window.scrollTo({top:Math.max(0,firstExpedition.offsetTop-72),behavior:"instant"});
}
function nextRound(){
 if(editingRoundIndex>=0){goToCurrentRound();return}
 const round={scores:[playerScore(state.current[0]),playerScore(state.current[1])],current:JSON.parse(JSON.stringify(state.current)),at:Date.now()};
 state.rounds.push(round);state.current=[emptyPlayer(),emptyPlayer()];activePlayer=0;activeExpedition=0;persist();render();scrollToFirstExpedition();toast("Next round")
}
function persistEditedRound(){
 if(editingRoundIndex<0){persist();return}
 state.rounds[editingRoundIndex]={scores:[playerScore(state.current[0]),playerScore(state.current[1])],current:JSON.parse(JSON.stringify(state.current)),at:state.rounds[editingRoundIndex].at};
 persist()
}
function goToCurrentRound(){
 state.current=currentDraft||[emptyPlayer(),emptyPlayer()];currentDraft=null;editingRoundIndex=-1;activePlayer=0;activeExpedition=0;persist();render();scrollToFirstExpedition();toast("Current round")
}
function clearCurrent(){
 state.current=[emptyPlayer(),emptyPlayer()];editingRoundIndex=-1;activePlayer=0;activeExpedition=0;persist();render();toast("Current round cleared")
}
function nextExpedition(){
 if(roundComplete)return;
 if(activeExpedition<COLORS.length-1){activeExpedition++;render();return}
 if(activePlayer===0){activePlayer=1;activeExpedition=0;render();toast(`${state.names[1]} turn`);return}
 roundComplete=true;render();toast("Round scored")
}
function newGame(){
 if(!confirm("Start a new game? This clears the score history."))return;
 state.rounds=[];state.current=[emptyPlayer(),emptyPlayer()];editingRoundIndex=-1;activePlayer=0;activeExpedition=0;persist();render();toast("New game started")
}

function editRound(index){
 const round=state.rounds[index];
 if(!round.current){toast("This round cannot be edited");return}
 currentDraft=JSON.parse(JSON.stringify(state.current));
 state.current=JSON.parse(JSON.stringify(round.current));editingRoundIndex=index;activePlayer=0;activeExpedition=0;render();scrollToFirstExpedition();toast(`Editing round ${index+1}`)
}

document.querySelectorAll(".tab").forEach((b,i)=>b.onclick=()=>{activePlayer=i;render()});
document.getElementById("nextRoundBtn").onclick=nextRound;
document.getElementById("clearRoundBtn").onclick=clearCurrent;
document.getElementById("newGameBtn").onclick=newGame;
document.getElementById("clearHistoryBtn").onclick=()=>{
 if(!state.rounds.length)return;
 if(confirm("Clear all saved rounds?")){state.rounds=[];persist();render();toast("History cleared")}
};
document.getElementById("undoBtn").onclick=()=>{
 if(!state.rounds.length)return;
 state.rounds.pop();persist();render();toast("Last round removed")
};
["player1","player2"].forEach((id,i)=>document.getElementById(id).oninput=e=>{
 state.names[i]=e.target.value;persist();
 document.getElementById(`p${i+1}Label`).textContent=e.target.value||(i?"Opponent":"You");
 document.querySelectorAll(".tab")[i].textContent=e.target.value||(i?"Opponent":"You");
});
render();
