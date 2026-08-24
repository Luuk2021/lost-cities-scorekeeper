const COLORS=[
 {key:"red",name:"Red Expedition"},
 {key:"green",name:"Green Expedition"},
 {key:"blue",name:"Blue Expedition"},
 {key:"yellow",name:"Yellow Expedition"}
];
const CARD_VALUES=[2,3,4,5,6,7,8,9,10];
const STORAGE="lost-cities-scorekeeper-v2";
let activePlayer=0;
let activeExpedition=0;
let roundComplete=false;

function emptyExp(){return{wagers:0,counts:Object.fromEntries(CARD_VALUES.map(v=>[v,0]))}}
function emptyPlayer(){return{expeditions:COLORS.map(emptyExp)}}
function fresh(){return{names:["You","Opponent"],rounds:[],current:[emptyPlayer(),emptyPlayer()]}}
function load(){
 try{
   const x=JSON.parse(localStorage.getItem(STORAGE));
   if(x?.current&&x?.rounds){
     x.current.forEach(p=>p.expeditions.forEach(e=>CARD_VALUES.forEach(v=>e.counts[v]=Boolean(e.counts[v]))));
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
 if(roundComplete){renderScoreReview();return}
 const player=state.current[activePlayer];
 const otherPlayer=state.current[activePlayer===0?1:0];
 const c=COLORS[activeExpedition],e=player.expeditions[activeExpedition],s=scoreExp(e);
 document.getElementById("stepProgress").textContent=roundComplete?"Round complete":`${state.names[activePlayer]} · Expedition ${activeExpedition+1} of ${COLORS.length}`;
 document.getElementById("nextRoundActions").hidden=true;
 document.getElementById("nextExpeditionBtn").hidden=false;
 document.getElementById("expeditions").innerHTML=(()=>{
   const wagerButtons=[1,2,3].map(n=>`<button class="wager ${e.wagers>=n?"active":""}" data-wager="${n}">Wager ${n}</button>`).join("");
   const cards=CARD_VALUES.map(v=>{
     const selected=Boolean(e.counts[v]),taken=Boolean(otherPlayer.expeditions[activeExpedition].counts[v]);
     return `<button class="card-cell qty ${selected?"selected":""}" type="button" data-card="${v}" ${taken&&!selected?"disabled":""} aria-label="${c.name} ${v} card${taken&&!selected?" already used":""}"><span>${v}</span><strong>${selected?"✓":"□"}</strong></button>`
   }).join("");
   return `<article class="expedition ${c.key}">
    <div class="exp-head"><h3>${c.name}</h3><span class="exp-score">${fmt(s.score)}</span></div>
    <div class="exp-body">
      <div class="field-title">Wager cards</div><div class="wagers">${wagerButtons}</div>
      <div class="field-title">Number cards (2–10)</div><div class="card-grid">${cards}</div>
      <div class="details">
       <div><span>Number cards</span><strong>${s.cardCount}</strong></div>
       <div><span>Card value</span><strong>${s.sum}</strong></div>
       <div><span>Calculation</span><strong>${s.started?`(${s.sum} − 20) × ${s.multiplier}`:"Not started"}</strong></div>
       <div><span>8-card bonus</span><strong>${s.bonus?"+20":"—"} ${s.started?`(${s.cardCount+s.wagers} total cards)`:""}</strong></div>
      </div>
    </div></article>`
 })();

 document.querySelectorAll(".wager").forEach(b=>b.onclick=()=>{
   const n=+b.dataset.wager;
   state.current[activePlayer].expeditions[activeExpedition].wagers=
     state.current[activePlayer].expeditions[activeExpedition].wagers===n?n-1:n;
   persist();render()
 });
 document.querySelectorAll(".qty").forEach(button=>button.onclick=()=>{
   const c=+button.dataset.card;
   const current=state.current[activePlayer].expeditions[activeExpedition].counts[c];
  state.current[activePlayer].expeditions[activeExpedition].counts[c]=current?0:1;
   persist();render()
 });
}

function renderScoreReview(){
 document.getElementById("stepProgress").textContent="Check round score";
 document.getElementById("nextExpeditionBtn").hidden=true;
 document.getElementById("nextRoundActions").hidden=false;
 document.getElementById("expeditions").innerHTML=`<section class="score-review">
  <div class="review-head"><p class="eyebrow">ROUND COMPLETE</p><h2>Check scores before next round</h2></div>
  <div class="review-grid">${state.names.map((name,i)=>`<article class="review-player"><h3>${esc(name)}</h3>${state.current[i].expeditions.map((e,index)=>{const s=scoreExp(e);return `<div class="review-row"><span>${COLORS[index].name.replace(" Expedition","")}</span><strong>${fmt(s.score)}</strong></div>`}).join("")}<div class="review-total"><span>Round total</span><strong>${fmt(playerScore(state.current[i]))}</strong></div></article>`).join("")}</div>
 </section>`;
}

function renderHistory(){
 const host=document.getElementById("historyContent");
 if(!state.rounds.length){host.innerHTML='<div class="empty">No saved rounds yet.</div>';return}
 const totals=state.names.map((_,i)=>state.rounds.reduce((sum,r)=>sum+r.scores[i],0));
 host.innerHTML=`<table><thead><tr><th>Round</th><th>${esc(state.names[0])}</th><th>${esc(state.names[1])}</th></tr></thead><tbody>${
   state.rounds.map((r,i)=>`<tr><td>${i+1}</td><td>${fmt(r.scores[0])}</td><td>${fmt(r.scores[1])}</td></tr>`).join("")
 }</tbody><tfoot><tr><th>Total</th><th>${fmt(totals[0])}</th><th>${fmt(totals[1])}</th></tr></tfoot></table>`
}

function hasCards(){
 return state.current.some(p=>p.expeditions.some(e=>e.wagers||CARD_VALUES.some(v=>e.counts[v])))
}
function toast(msg){
 const x=document.getElementById("toast");x.textContent=msg;x.classList.add("show");
 clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("show"),1700)
}
function nextRound(){
 state.rounds.push({scores:[playerScore(state.current[0]),playerScore(state.current[1])],at:Date.now()});
 state.current=[emptyPlayer(),emptyPlayer()];activePlayer=0;activeExpedition=0;roundComplete=false;persist();render();toast("Next round")
}
function clearCurrent(){
 state.current=[emptyPlayer(),emptyPlayer()];activePlayer=0;activeExpedition=0;roundComplete=false;persist();render();toast("Current round cleared")
}
function nextExpedition(){
 if(roundComplete)return;
 if(activeExpedition<COLORS.length-1){activeExpedition++;render();return}
 if(activePlayer===0){activePlayer=1;activeExpedition=0;render();toast(`${state.names[1]} turn`);return}
 roundComplete=true;render();toast("Round scored")
}
function previousExpedition(){
 if(roundComplete){roundComplete=false;render();return}
 if(activeExpedition>0){activeExpedition--;render();return}
 if(activePlayer===1){activePlayer=0;activeExpedition=COLORS.length-1;render();toast(`${state.names[0]} turn`);return}
 toast("Already at first expedition")
}
function newGame(){
 if(!confirm("Start a new game? This clears the score history."))return;
 state.rounds=[];state.current=[emptyPlayer(),emptyPlayer()];activePlayer=0;activeExpedition=0;roundComplete=false;persist();render();toast("New game started")
}

document.querySelectorAll(".tab").forEach((b,i)=>b.onclick=()=>{activePlayer=i;render()});
document.getElementById("backExpeditionBtn").onclick=previousExpedition;
document.getElementById("nextExpeditionBtn").onclick=nextExpedition;
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
 state.names[i]=e.target.value.trim()||(i?"Opponent":"You");persist();render()
});
render();
