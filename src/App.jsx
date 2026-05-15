import { useState, useEffect, useRef, useCallback } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";

/* ── Nightrun canvas background ── */
function NightrunBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H;
    const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const lines = Array.from({length:20}, () => ({
      x: Math.random() * (typeof W !== 'undefined' ? W : window.innerWidth),
      speed: 0.5 + Math.random() * 1.5,
      opacity: Math.random() * 0.08 + 0.02,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(W/2, H*0.4, 0, W/2, H*0.4, W*0.6);
      grad.addColorStop(0, "rgba(180,50,255,0.04)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      lines.forEach(l => {
        ctx.beginPath(); ctx.moveTo(l.x, 0); ctx.lineTo(l.x - 1, H);
        ctx.strokeStyle = `rgba(160,80,255,${l.opacity})`; ctx.lineWidth = 0.5; ctx.stroke();
        l.x -= l.speed; if (l.x < 0) l.x = W;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}} />;
}

/* ── Constants ── */
const TEAM        = ["Austin","Maya","Jordan","Sam","Riley"];
const PRIORITIES  = ["H+","H","M","L","L-"];
const STATUSES    = ["Todo","In Progress","In Review","Blocked","Done"];
const MILESTONES  = ["Sprint 1","Sprint 2","Backlog"];
const LABELS      = ["feature","bug","infra","docs","debt"];
const EXT_STATUSES= ["Pending","In Review","Approved","Rejected","On Hold"];

const PRIORITY_META = {
  "H+": { color:"#ef4444", bg:"#3a1515", label:"Highest"  },
  "H":  { color:"#f97316", bg:"#2a1a0a", label:"High"     },
  "M":  { color:"#eab308", bg:"#2a2004", label:"Medium"   },
  "L":  { color:"#3b82f6", bg:"#0d1e3a", label:"Low"      },
  "L-": { color:"#6b7280", bg:"#100820", label:"Lowest"   },
};

const LABEL_META = {
  feature:{ color:"#cc99ff", bg:"#1e1040" },
  bug:    { color:"#f87171", bg:"#2a0e0e" },
  infra:  { color:"#34d399", bg:"#052018" },
  docs:   { color:"#60a5fa", bg:"#0a1e38" },
  debt:   { color:"#fb923c", bg:"#251208" },
};

const STATUS_META = {
  "Todo":        { color:"#5a4870", dot:"#5a4870", line:"#5a4870" },
  "In Progress": { color:"#00d4ff", dot:"#00d4ff", line:"#00d4ff" },
  "In Review":   { color:"#cc99ff", dot:"#b44fff", line:"#b44fff" },
  "Blocked":     { color:"#ff3d6e", dot:"#ff3d6e", line:"#ff3d6e" },
  "Done":        { color:"#6ee7b7", dot:"#10b981", line:"#10b981" },
};

const EXT_STATUS_META = {
  "Pending":   { color:"#9ca3af", bg:"#9ca3af18" },
  "In Review": { color:"#cc99ff", bg:"#cc99ff18" },
  "Approved":  { color:"#6ee7b7", bg:"#6ee7b718" },
  "Rejected":  { color:"#fca5a5", bg:"#fca5a518" },
  "On Hold":   { color:"#f97316", bg:"#f9731618" },
};

function uid() { return Math.random().toString(36).slice(2,9); }
const mkTask=(o={})=>({id:uid(),title:"",assignee:TEAM[0],priority:"M",status:"Todo",milestone:MILESTONES[0],deps:[],reqDeps:[],notes:"",label:"",startDate:"",endDate:"",emoji:"",checklist:[],lastMoved:new Date().toISOString(),...o});

/* ── Seed data ── */
const now=new Date();
const days=(d)=>new Date(now.getTime()+d*86400000).toISOString();
const S0=mkTask({title:"Design auth service API",      assignee:"Austin",priority:"H+",status:"Done",       milestone:"Sprint 1",notes:"OAuth2 + JWT",            startDate:"2025-01-06",endDate:"2025-01-10",label:"feature",lastMoved:days(-15)});
const S1=mkTask({title:"Implement token refresh logic",assignee:"Maya",  priority:"H+",status:"In Progress",milestone:"Sprint 1",notes:"",                        startDate:"2025-01-10",endDate:"2025-01-17",label:"feature",dueDate:new Date(now.getTime()+2*86400000).toISOString().slice(0,10),lastMoved:days(-3)});
const S2=mkTask({title:"Set up ArgoCD pipelines",     assignee:"Austin",priority:"H", status:"In Progress",milestone:"Sprint 1",notes:"Blocked on cluster access",startDate:"2025-01-08",endDate:"2025-01-20",label:"infra",lastMoved:days(-10)});
const S3=mkTask({title:"Write integration tests",     assignee:"Jordan",priority:"H", status:"Blocked",    milestone:"Sprint 1",notes:"Needs auth done",          startDate:"2025-01-15",endDate:"2025-01-22",label:"bug",lastMoved:days(-5)});
const S4=mkTask({title:"Deploy staging environment",  assignee:"Sam",   priority:"H", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-20",endDate:"2025-01-27",label:"infra",dueDate:new Date(now.getTime()-1*86400000).toISOString().slice(0,10),lastMoved:days(-1)});
const S5=mkTask({title:"Prometheus metrics setup",    assignee:"Riley", priority:"M", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-22",endDate:"2025-01-29",label:"infra",lastMoved:days(-2)});
const S6=mkTask({title:"Frontend dashboard MVP",      assignee:"Maya",  priority:"H", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-24",endDate:"2025-02-05",label:"feature",lastMoved:days(-1)});
const S7=mkTask({title:"Load testing",                assignee:"Jordan",priority:"L", status:"Todo",       milestone:"Backlog", notes:"",                        startDate:"2025-02-03",endDate:"2025-02-10",label:"bug",lastMoved:days(-1)});
S1.deps=[S0.id]; S3.deps=[S1.id]; S4.deps=[S2.id]; S6.deps=[S4.id]; S7.deps=[S3.id,S5.id];
const SEED_TASKS=[S0,S1,S2,S3,S4,S5,S6,S7];

const mkReq=(o={})=>({id:uid(),title:"",team:"",assignee:TEAM[0],status:"Pending",notes:"",created:new Date().toISOString().slice(0,10),link:"",...o});
const R0=mkReq({title:"API access to DataWarehouse",team:"Data Platform",assignee:"Austin",status:"In Review",notes:"Submitted Jan 8", created:"2025-01-08",link:"https://jira.example.com/DATA-1234"});
const R1=mkReq({title:"Cloud budget increase Q1",   team:"FinOps",       assignee:"Sam",   status:"Pending",  notes:"Awaiting director sign-off",created:"2025-01-12",link:"https://jira.example.com/FIN-567"});
const R2=mkReq({title:"SSL cert renewal",           team:"SecOps",       assignee:"Riley", status:"Approved", notes:"Approved Jan 15",created:"2025-01-10",link:"https://jira.example.com/SEC-890"});
// Wire S2 to depend on R0 (can't deploy ArgoCD without DataWarehouse API access)
S2.reqDeps=[R0.id];
const SEED_REQS=[R0,R1,R2];

/* ═══════════════════════════════════════════════════════════════
   GLOBAL CSS — animation lives here once, never re-injected
═══════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter+Tight:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#1e1430;border-radius:2px;}

/* Single global dashflow — one animation, never restarted */
@keyframes dashflow{from{stroke-dashoffset:24;}to{stroke-dashoffset:0;}}
.dep-flow{stroke-dasharray:8 5;animation:dashflow 0.9s linear infinite;will-change:stroke-dashoffset;}

@keyframes nr-streak{from{transform:translateX(-140%)}to{transform:translateX(280%)}}
.nr-streak{animation:nr-streak 2.8s linear infinite;}

.vbtn{background:none;border:1px solid transparent;cursor:pointer;padding:6px 16px;border-radius:4px;font-family:inherit;font-size:14px;font-weight:600;color:#b8a8d0;transition:all .15s;letter-spacing:.08em;}
.vbtn.act{background:rgba(180,79,255,0.15);border-color:rgba(180,79,255,0.333);color:#b44fff;}
.vbtn:hover:not(.act){color:#c4b5ff;border-color:rgba(180,79,255,0.15);}

.card{background:#0c0818;border:1px solid #1e1430;border-radius:10px;padding:12px 14px;transition:border-color .2s,box-shadow .2s,transform .15s;cursor:pointer;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;top:0;left:0;bottom:0;width:2px;background:currentColor;opacity:0;transition:opacity .2s;}
.card:hover{border-color:#b44fff55;transform:translateY(-1px);box-shadow:0 4px 24px rgba(180,79,255,.18);}
.lsrc{border-color:#b44fff!important;box-shadow:0 0 0 2px rgba(180,79,255,.3)!important;}
.ltgt:hover{border-color:#10b981!important;box-shadow:0 0 0 2px rgba(16,185,129,.3)!important;}

.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .15s;letter-spacing:.04em;}
.p{background:linear-gradient(135deg,#b44fff,#00d4ff);color:#fff;border:none;text-shadow:0 1px 4px rgba(0,0,0,.3);}.p:hover{background:linear-gradient(135deg,#a040e8,#00bfee);box-shadow:0 0 20px rgba(180,79,255,.4);}
.g{background:#140f22;color:#d0c8e8;border:1px solid #1e1430;}.g:hover{background:#1a1430;color:#f0e8ff;}
.dr{background:#1e1010;color:#ef4444;border:1px solid #3a1515;}.dr:hover{background:#2a1515;}
.sm{padding:4px 10px!important;font-size:12px!important;border-radius:5px!important;}

.fl{display:flex;flex-direction:column;gap:5px;}
.fl label{font-size:11px;font-weight:600;color:#b8a8d0;text-transform:uppercase;letter-spacing:.06em;}
.inp{background:#100820;border:1px solid #1e1430;border-radius:7px;color:#f0e8ff;font-family:inherit;font-size:13px;padding:8px 12px;width:100%;outline:none;transition:border .15s;}
.inp:focus{border-color:#b44fff;box-shadow:0 0 0 2px rgba(180,79,255,.15);}
select.inp option{background:#100820;}
textarea.inp{resize:vertical;min-height:64px;}

.mbg{position:fixed;inset:0;background:rgba(4,2,14,.85);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(8px);}
.mbox{background:#0c0818;border:1px solid #1e1430;border-radius:14px;padding:24px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.6);}

.pb{height:4px;background:#140f22;border-radius:2px;overflow:hidden;}
.pf{height:100%;border-radius:2px;background:linear-gradient(90deg,#b44fff,#00d4ff);transition:width .4s;}
.dc{border-color:#b44fff!important;background:#0e0820!important;}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0;}
.badge{display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;letter-spacing:.06em;font-family:'Rajdhani',sans-serif;flex-shrink:0;min-width:26px;}
.chip{display:inline-flex;align-items:center;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.06em;font-family:'Rajdhani',sans-serif;}
`;

/* ═══════════════════════════════════════════════════════════════
   KONAMI CODE EASTER EGG
═══════════════════════════════════════════════════════════════ */
function KonamiBlast(){
  const [blasts,setBlasts]=useState([]);
  
  useEffect(()=>{
    const interval=setInterval(()=>{
      const x=Math.random()*window.innerWidth;
      const y=Math.random()*window.innerHeight;
      const id=Date.now();
      setBlasts(prev=>[...prev,{id,x,y}]);
      setTimeout(()=>setBlasts(prev=>prev.filter(b=>b.id!==id)),3000);
    },300);
    return()=>clearInterval(interval);
  },[]);
  
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}}>
      {blasts.map(blast=>(
        <EmojiBlast key={blast.id} x={blast.x} y={blast.y} />
      ))}
    </div>
  );
}

function EmojiBlast({x,y}){
  const emojis=["🎉","🚀","✨","🎊","⭐","💫","🌟","🔥","🎯","💥","🎈","🎁","🏆","👾","🕹️"];
  const particles=Array.from({length:15},(_,i)=>{
    const angle=Math.random()*Math.PI*2;
    const velocity=100+Math.random()*150;
    const vx=Math.cos(angle)*velocity;
    const vy=Math.sin(angle)*velocity-100;
    return {
      id:i,
      emoji:emojis[Math.floor(Math.random()*emojis.length)],
      vx,vy,
      duration:1.5+Math.random()*0.5
    };
  });
  
  return particles.map(p=>(
    <div key={p.id} style={{position:"absolute",left:x,top:y,fontSize:20,animation:`kblast-${x}-${p.id} ${p.duration}s ease-out forwards`}}>
      {p.emoji}
      <style>{`@keyframes kblast-${x}-${p.id}{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(${p.vx}px,${p.vy+300}px) rotate(${Math.random()*720-360}deg) scale(0.3);opacity:0}}`}</style>
    </div>
  ));
}

/* ═══════════════════════════════════════════════════════════════
   CELEBRATION OVERLAY
═══════════════════════════════════════════════════════════════ */
function CelebrationOverlay({taskTitle,originX,originY}){
  const emojis=["🎉","🚀","✨","🎊","⭐","💫","🌟","✨","🎯","🔥"];
  const particles=Array.from({length:30},(_,i)=>{
    const angle=Math.random()*Math.PI*2;
    const velocity=150+Math.random()*200; // Increased velocity
    const vx=Math.cos(angle)*velocity;
    const vy=Math.sin(angle)*velocity-150; // More upward initial velocity
    return {
      id:i,
      emoji:emojis[Math.floor(Math.random()*emojis.length)],
      vx,
      vy,
      delay:Math.random()*0.1,
      duration:2+Math.random()*1 // Longer duration
    };
  });
  
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}}>
      {particles.map(p=>(
        <div key={p.id} 
          style={{
            position:"absolute",
            left:originX,
            top:originY,
            fontSize:24,
            animation:`explode-${p.id} ${p.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s forwards`
          }}>
          {p.emoji}
          <style>{`
            @keyframes explode-${p.id} {
              0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
              30% { transform: translate(${p.vx*0.5}px, ${p.vy*0.5}px) rotate(${Math.random()*180-90}deg) scale(1.2); opacity: 1; }
              100% { transform: translate(${p.vx}px, ${p.vy+400}px) rotate(${Math.random()*720-360}deg) scale(0.3); opacity: 0; }
            }
          `}</style>
        </div>
      ))}
      <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",background:"rgba(180,79,255,0.95)",color:"#fff",padding:"12px 24px",borderRadius:8,fontSize:14,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
        ✅ {taskTitle}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [tasks,    setTasks]    = useState(SEED_TASKS);
  const [requests, setRequests] = useState(SEED_REQS);
  const [view,     setView]     = useState("board");
  const [linkMode, setLinkMode] = useState(null); // {sourceId, sourceType:"task"|"req"}
  const [editTask, setEditTask] = useState(null);
  const [newTask,  setNewTask]  = useState(false);
  const [editReq,  setEditReq]  = useState(null);
  const [newReq,   setNewReq]   = useState(false);
  const [filterBy, setFilterBy] = useState("All");
  const [exportOpen,setExportOpen]=useState(false);
  const [standupOpen,setStandupOpen]=useState(false);
  const [powerupsOpen,setPowerupsOpen]=useState(false);
  const [powerUps,setPowerUps]=useState({
    autoReview:false,
    staleAlert:true,
    staleDays:7,
    autoAssign:false,
    autoAssignee:"",
    cascadeBlock:true,
    dueSoon:true,
    dueDays:3
  });
  const [celebration,setCelebration]=useState(null);
  const [konamiActive,setKonamiActive]=useState(false);

  // Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
  useEffect(()=>{
    const konamiCode=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let konamiIndex=0;
    const handleKey=(e)=>{
      if(e.key.toLowerCase()===konamiCode[konamiIndex].toLowerCase()){
        konamiIndex++;
        if(konamiIndex===konamiCode.length){
          setKonamiActive(true);
          setTimeout(()=>setKonamiActive(false),5000);
          konamiIndex=0;
        }
      }else{
        konamiIndex=0;
      }
    };
    window.addEventListener('keydown',handleKey);
    return()=>window.removeEventListener('keydown',handleKey);
  },[]);

  useEffect(()=>{
    const PMAP={"P0":"H+","P1":"H","P2":"M"};
    const migrate=t=>({...t, priority: PMAP[t.priority]||t.priority, deps:t.deps||[], reqDeps:t.reqDeps||[]});
    try{ const r=localStorage.getItem("mx-tasks"); if(r) setTasks(JSON.parse(r).map(migrate)); }catch{}
    try{ const r=localStorage.getItem("mx-reqs");  if(r) setRequests(JSON.parse(r)); }catch{}
    try{ const p=localStorage.getItem("mx-powerups"); if(p) setPowerUps(JSON.parse(p)); }catch{}
  },[]);

  const saveTasks=useCallback(t=>{ setTasks(t); try{localStorage.setItem("mx-tasks",JSON.stringify(t));}catch{} },[]);
  const saveReqs =useCallback(r=>{ setRequests(r); try{localStorage.setItem("mx-reqs", JSON.stringify(r));}catch{} },[]);
  
  // Save power-ups to localStorage whenever they change
  useEffect(()=>{
    try{ localStorage.setItem("mx-powerups",JSON.stringify(powerUps)); }catch{}
  },[powerUps]);

  // Compute badge properties for a task based on power-up settings
  const computeBadges=(task,allTasks,powerups)=>{
    const badges={};
    const now=new Date();
    
    // Stale detection
    if(powerups.staleAlert && task.lastMoved){
      const lastMovedDate=new Date(task.lastMoved);
      const daysSince=Math.floor((now-lastMovedDate)/(1000*60*60*24));
      if(daysSince>=powerups.staleDays && task.status!=="Done" && task.status!=="Blocked"){
        badges._stale=true;
      }
    }
    
    // Due date warnings
    if(powerups.dueSoon && task.dueDate){
      const dueDate=new Date(task.dueDate);
      const daysUntil=Math.floor((dueDate-now)/(1000*60*60*24));
      if(daysUntil<0){
        badges._overdue=true;
      } else if(daysUntil<=powerups.dueDays){
        badges._dueSoon=daysUntil;
      }
    }
    
    // Cascade block warning (check if any dependencies are blocked)
    if(powerups.cascadeBlock && task.deps?.length>0){
      const hasBlockedDep=task.deps.some(depId=>{
        const dep=allTasks.find(t=>t.id===depId);
        return dep?.status==="Blocked";
      });
      if(hasBlockedDep){
        badges._cascadeWarning=true;
      }
    }
    
    return {...task,...badges};
  };

  const updateTask=(id,p)=>{
    const oldTask=tasks.find(t=>t.id===id);
    const statusChanged=p.status&&oldTask&&p.status!==oldTask.status;
    let newTask={...oldTask,...p,lastMoved:statusChanged?new Date().toISOString():oldTask?.lastMoved};
    
    // Auto-assign when moving to In Progress
    if(powerUps.autoAssign && statusChanged && p.status==="In Progress"){
      newTask.assignee = powerUps.autoAssignee || TEAM[0];
    }
    
    // Compute badge properties based on power-up settings
    newTask = computeBadges(newTask, tasks, powerUps);
    
    // Apply cascade warnings if this task becomes Blocked
    let updatedTasks = tasks.map(t=>t.id===id?newTask:t);
    if(powerUps.cascadeBlock && statusChanged && p.status==="Blocked"){
      updatedTasks = updatedTasks.map(t=>{
        const dependsOnBlocked = (t.deps||[]).includes(id);
        return dependsOnBlocked ? {...t, _cascadeWarning:true} : t;
      });
    } else if(statusChanged && oldTask?.status==="Blocked" && p.status!=="Blocked"){
      // Clear cascade warnings when unblocking
      updatedTasks = updatedTasks.map(t=>{
        const dependedOnThis = (t.deps||[]).includes(id);
        return dependedOnThis ? {...t, _cascadeWarning:false} : t;
      });
    }
    
    saveTasks(updatedTasks);
  };
  const addTask   =(d)  =>saveTasks([...tasks,{...mkTask(),...d}]);
  const deleteTask=(id) =>saveTasks(tasks.filter(t=>t.id!==id).map(t=>({...t,deps:t.deps.filter(d=>d!==id)})));
  const unlinkDep =(tid,did)=>updateTask(tid,{deps:(tasks.find(t=>t.id===tid)?.deps||[]).filter(d=>d!==did)});
  const unlinkReqDep=(tid,rid)=>updateTask(tid,{reqDeps:(tasks.find(t=>t.id===tid)?.reqDeps||[]).filter(d=>d!==rid)});

  const updateReq=(id,p)=>saveReqs(requests.map(r=>r.id===id?{...r,...p}:r));
  const addReq   =(d)  =>saveReqs([...requests,{...mkReq(),...d}]);
  const deleteReq=(id) =>saveReqs(requests.filter(r=>r.id!==id));

  // Universal card click handler — supports cross-type linking
  const handleCardClick=(itemId, itemType="task")=>{
    if(linkMode){
      if(linkMode.sourceId===itemId){setLinkMode(null);return;}
      if(linkMode.sourceType==="task" && itemType==="task"){
        // task → task dep: toggle link
        const tgt=tasks.find(t=>t.id===itemId);
        if(tgt){
          const isLinked=tgt.deps.includes(linkMode.sourceId);
          updateTask(itemId,{deps:isLinked?tgt.deps.filter(d=>d!==linkMode.sourceId):[...tgt.deps,linkMode.sourceId]});
        }
      } else if(linkMode.sourceType==="req" && itemType==="task"){
        // req → task: task blocked by request (toggle)
        const tgt=tasks.find(t=>t.id===itemId);
        const cur=tgt?.reqDeps||[];
        if(tgt){
          const isLinked=cur.includes(linkMode.sourceId);
          updateTask(itemId,{reqDeps:isLinked?cur.filter(d=>d!==linkMode.sourceId):[...cur,linkMode.sourceId]});
        }
      } else if(linkMode.sourceType==="task" && itemType==="req"){
        // task → req: task blocked by request (toggle)
        const tgt=tasks.find(t=>t.id===linkMode.sourceId);
        const cur=tgt?.reqDeps||[];
        if(tgt){
          const isLinked=cur.includes(itemId);
          updateTask(linkMode.sourceId,{reqDeps:isLinked?cur.filter(d=>d!==itemId):[...cur,itemId]});
        }
      }
      setLinkMode(null);
    } else {
      if(itemType==="task") setEditTask(tasks.find(t=>t.id===itemId));
      else setEditReq(requests.find(r=>r.id===itemId));
    }
  };

  const exportMd=()=>{
    const now=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    const total=tasks.length;
    const done=tasks.filter(t=>t.status==="Done").length;
    const blocked=tasks.filter(t=>t.status==="Blocked").length;
    const inProg=tasks.filter(t=>t.status==="In Progress").length;
    const pendingReqs=requests.filter(r=>r.status==="Pending"||r.status==="In Review").length;

    const lines=[
      `# Project Tracker`,
      `> Generated ${now}`,
      "",
      `## Summary`,
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total tasks | ${total} |`,
      `| Done | ${done} (${total?Math.round(done/total*100):0}%) |`,
      `| In Progress | ${inProg} |`,
      `| Blocked | ${blocked} |`,
      `| Open external requests | ${pendingReqs} |`,
    ];

    // Tasks grouped by milestone
    const tasksByMilestone={};
    tasks.forEach(t=>{
      const ms=t.milestone||"Unassigned";
      if(!tasksByMilestone[ms]) tasksByMilestone[ms]=[];
      tasksByMilestone[ms].push(t);
    });

    // Preserve milestone order, append any extras
    const msOrder=[...MILESTONES];
    Object.keys(tasksByMilestone).forEach(ms=>{ if(!msOrder.includes(ms)) msOrder.push(ms); });

    msOrder.forEach(ms=>{
      const mt=tasksByMilestone[ms]; if(!mt?.length) return;
      lines.push("","---","",`## ${ms}`,"");
      lines.push("| | Task | Assignee | Priority | Label | Dates | Blocked by |");
      lines.push("|---|------|----------|----------|-------|-------|------------|");
      mt.forEach(t=>{
        const icon=t.status==="Done"?"✅":t.status==="Blocked"?"🚫":t.status==="In Progress"?"🔄":"⬜";
        const taskDeps=(t.deps||[]).map(d=>tasks.find(x=>x.id===d)?.title||"(deleted)");
        const reqDeps=(t.reqDeps||[]).map(d=>`[REQ] ${requests.find(r=>r.id===d)?.title||"(deleted)"}`);
        const blockedBy=[...taskDeps,...reqDeps].join(", ")||"—";
        const dates=t.startDate&&t.endDate?`${t.startDate} → ${t.endDate}`:"—";
        const label=t.label||"—";
        lines.push(`| ${icon} | **${t.title}** | ${t.assignee} | ${t.priority} | ${label} | ${dates} | ${blockedBy} |`);
        if(t.notes) lines.push(`| | _${t.notes}_ | | | | | |`);
      });
    });

    // Blocked tasks callout
    const blockedTasks=tasks.filter(t=>t.status==="Blocked");
    if(blockedTasks.length){
      lines.push("","---","","## 🚫 Blocked — Needs Attention","");
      blockedTasks.forEach(t=>{
        const taskDeps=(t.deps||[]).map(d=>tasks.find(x=>x.id===d)?.title||"(deleted)");
        const reqDeps=(t.reqDeps||[]).map(d=>requests.find(r=>r.id===d)?.title||"(deleted)");
        const waiting=[...taskDeps,...reqDeps].join(", ")||"unknown";
        lines.push(`- **${t.title}** (${t.assignee}) — waiting on: ${waiting}`);
      });
    }

    // External requests
    if(requests.length){
      lines.push("","---","","## External Requests","");
      lines.push("| Status | Request | Team | Owner | Submitted | Notes |");
      lines.push("|--------|---------|------|-------|-----------|-------|");
      requests.forEach(r=>{
        const notes=r.notes?r.notes.replace(/\|/g,"\\|"):"—";
        lines.push(`| ${r.status} | ${r.title} | ${r.team} | ${r.assignee} | ${r.created||"—"} | ${notes} |`);
      });

      // Which tasks each request is blocking
      const reqsWithTasks=requests.filter(r=>tasks.some(t=>(t.reqDeps||[]).includes(r.id)));
      if(reqsWithTasks.length){
        lines.push("","### Request → Task Dependencies","");
        reqsWithTasks.forEach(r=>{
          const blocked=tasks.filter(t=>(t.reqDeps||[]).includes(r.id));
          lines.push(`- **${r.title}** (${r.status}) blocks: ${blocked.map(t=>t.title).join(", ")}`);
        });
      }
    }

    return lines.join("\n");
  };

  return(
    <div style={{fontFamily:"'Rajdhani','Inter Tight','Helvetica Neue',sans-serif",background:"#06040f",minHeight:"100vh",color:"#f0e8ff",position:"relative"}}>
      <style>{GLOBAL_CSS}</style>
      <NightrunBg />

      {/* Static gradient top bar */}
      <div style={{height:2,background:"linear-gradient(90deg,#b44fff,#00d4ff)",zIndex:51}} />

      {/* Header */}
      <div style={{borderBottom:"1px solid #1e1430",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:2,background:"rgba(6,4,15,0.92)",backdropFilter:"blur(12px)",zIndex:50}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:12}}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <defs><linearGradient id="hdr-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#b44fff"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs>
            <path d="M14 2 L26 24 L14 19 L2 24 Z" fill="none" stroke="url(#hdr-grad)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M14 2 L14 19" stroke="url(#hdr-grad)" strokeWidth="1" opacity="0.5"/>
          </svg>
          <div>
            <div style={{fontWeight:700,fontSize:16,letterSpacing:"0.18em",textTransform:"uppercase",background:"linear-gradient(90deg,#b44fff,#00d4ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Slipstream</div>
            <div style={{fontSize:9,color:"#5a4870",letterSpacing:"0.25em",textTransform:"uppercase",marginTop:3,fontFamily:"'Inter Tight',sans-serif"}}>zero friction · max velocity</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(6,4,15,0.7)",border:"1px solid #1e1430",borderRadius:8,padding:3}}>
          {[["board","⬚ Board"],["plan","⬡ Plan"],["requests","⇄ Requests"],["lead","◈ The Bridge"]].map(([v,l])=>(
            <button key={v} className={`vbtn${view===v?" act":""}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button className="btn g" onClick={()=>setStandupOpen(true)}>🎙 Standup</button>
          <button className="btn g" onClick={()=>setPowerupsOpen(true)}>⚡ Power-ups</button>
          <button className="btn g" onClick={()=>setExportOpen(true)}>↓ Export</button>
          {view==="requests"
            ?<button className="btn p" onClick={()=>setNewReq(true)}>+ New request</button>
            :<button className="btn p" onClick={()=>setNewTask(true)}>+ New task</button>}
        </div>
      </div>

      {/* Celebration overlay */}
      {celebration&&<CelebrationOverlay taskTitle={celebration.title||celebration} originX={celebration.x||window.innerWidth/2} originY={celebration.y||window.innerHeight/2} />}

      {/* Konami code easter egg */}
      {konamiActive&&<KonamiBlast />}

      {/* Floating link mode banner - absolutely positioned to avoid layout shift */}
      {linkMode&&(
        <div style={{position:"absolute",top:120,left:0,right:0,display:"flex",justifyContent:"center",zIndex:100,pointerEvents:"none"}}>
          <div style={{background:"rgba(26,13,58,0.95)",backdropFilter:"blur(8px)",border:"1px solid #5b21b6",borderRadius:8,padding:"8px 16px",display:"flex",alignItems:"center",gap:10,fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.3)",pointerEvents:"auto"}}>
            <span style={{color:"#cc99ff",fontWeight:500}}>🔗</span>
            <span style={{color:"#d0c8e8"}}>
              {linkMode.sourceType==="req"
                ? <>Link to <strong style={{color:"#cc99ff"}}>{requests.find(r=>r.id===linkMode.sourceId)?.title}</strong></>
                : <>Link to <strong style={{color:"#cc99ff"}}>{tasks.find(t=>t.id===linkMode.sourceId)?.title}</strong></>}
            </span>
            <button className="btn g sm" style={{padding:"3px 10px",fontSize:11}} onClick={()=>setLinkMode(null)}>✕</button>
          </div>
        </div>
      )}

      <div style={{padding:"20px 24px",position:"relative",zIndex:1}}>
        {view==="board"    &&<BoardView    tasks={tasks} requests={requests} updateTask={updateTask} filterBy={filterBy} setFilterBy={setFilterBy} onCardClick={handleCardClick} linkMode={linkMode} powerUps={powerUps} computeBadges={computeBadges} setCelebration={setCelebration} />}
        {view==="plan"     &&<PlanView     tasks={tasks} requests={requests} onCardClick={handleCardClick} linkMode={linkMode} setLinkMode={setLinkMode} unlinkDep={unlinkDep} unlinkReqDep={unlinkReqDep} powerUps={powerUps} computeBadges={computeBadges} />}
        {view==="requests" &&<RequestsView requests={requests} tasks={tasks} onEdit={r=>handleCardClick(r.id,"req")} linkMode={linkMode} />}
        {view==="lead"     &&<LeaderView   tasks={tasks} requests={requests} />}
      </div>

      {newTask  &&<TaskModal task={null}    tasks={tasks} requests={requests} onSave={d=>{addTask(d);setNewTask(false);}}              onClose={()=>setNewTask(false)} updateTask={updateTask} powerups={powerUps} />}
      {editTask &&<TaskModal task={editTask} tasks={tasks} requests={requests} onSave={d=>{updateTask(editTask.id,d);setEditTask(null);}} onDelete={()=>{deleteTask(editTask.id);setEditTask(null);}} onLink={()=>{setLinkMode({sourceId:editTask.id,sourceType:"task"});setEditTask(null);}} unlinkDep={unlinkDep} unlinkReqDep={unlinkReqDep} onClose={()=>setEditTask(null)} updateTask={updateTask} powerups={powerUps} />}
      {newReq   &&<ReqModal  req={null}    tasks={tasks} onToggleTask={(tid,rid,on)=>{ const t=tasks.find(x=>x.id===tid); if(!t) return; const cur=t.reqDeps||[]; updateTask(tid,{reqDeps:on?[...cur,rid]:cur.filter(d=>d!==rid)}); }} onSave={d=>{addReq(d);setNewReq(false);}} onClose={()=>setNewReq(false)} />}
      {editReq  &&<ReqModal  req={editReq} tasks={tasks} onToggleTask={(tid,rid,on)=>{ const t=tasks.find(x=>x.id===tid); if(!t) return; const cur=t.reqDeps||[]; updateTask(tid,{reqDeps:on?[...cur,rid]:cur.filter(d=>d!==rid)}); }} onSave={d=>{updateReq(editReq.id,d);setEditReq(null);}} onDelete={()=>{deleteReq(editReq.id);setEditReq(null);}} onClose={()=>setEditReq(null)} />}
      {exportOpen&&<ExportModal md={exportMd()} onClose={()=>setExportOpen(false)} />}
      {powerupsOpen&&<PowerupsModal powerups={powerUps} setPowerups={setPowerUps} onClose={()=>setPowerupsOpen(false)} />}
      {standupOpen&&<StandupModal tasks={tasks} onClose={()=>setStandupOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOARD
═══════════════════════════════════════════════════════════════ */
function BoardView({ tasks, requests, updateTask, filterBy, setFilterBy, onCardClick, linkMode, powerUps, computeBadges, setCelebration }) {
  const [activeId, setActiveId] = useState(null);
  const cardRefs = useRef({});
  const tasksWithBadges = tasks.map(t=>computeBadges(t,tasks,powerUps));
  const filtered = filterBy==="All" ? tasksWithBadges : tasksWithBadges.filter(t=>t.assignee===filterBy);
  const cols = STATUSES.map(s=>({key:s, label:s, items:filtered.filter(t=>t.status===s), dot:STATUS_META[s].dot}));
  const activeTask = tasksWithBadges.find(t=>t.id===activeId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:6 } }));

  return(
    <DndContext
      sensors={sensors}
      onDragStart={({active})=>setActiveId(active.id)}
      onDragEnd={({active,over})=>{
        const oldStatus = tasks.find(t=>t.id===active.id)?.status;
        if(over && over.id !== oldStatus) {
          updateTask(active.id,{status:over.id});
          // Wait a frame for DOM to update, then get card position
          if(over.id === "Done") {
            setTimeout(()=>{
              const cardEl = cardRefs.current[active.id];
              if(cardEl) {
                const rect = cardEl.getBoundingClientRect();
                setCelebration({
                  title: tasks.find(t=>t.id===active.id)?.title,
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2
                });
                setTimeout(()=>setCelebration(null),3000);
              }
            },50);
          }
        }
        setActiveId(null);
      }}
      onDragCancel={()=>setActiveId(null)}
    >
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"#d0c8e8"}}>Assignee:</span>
          {["All",...TEAM].map(a=>(
            <button key={a} onClick={()=>setFilterBy(a)} style={{padding:"4px 12px",borderRadius:6,border:"1px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .15s",background:filterBy===a?"#b44fff":"#100820",borderColor:filterBy===a?"#b44fff":"#1e1430",color:filterBy===a?"#fff":"#d0c8e8"}}>{a}</button>
          ))}
          <span style={{marginLeft:"auto",fontSize:12,color:"#b8a8d0"}}>{filtered.length} tasks</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${cols.length},1fr)`,gap:12}}>
          {cols.map(col=>(
            <DroppableColumn key={col.key} col={col} requests={requests} linkMode={linkMode} onCardClick={onCardClick} activeId={activeId} cardRefs={cardRefs} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <BoardCardContent task={activeTask} requests={requests} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ col, requests, linkMode, onCardClick, activeId, cardRefs }) {
  const {setNodeRef, isOver} = useDroppable({id: col.key});
  return(
    <div ref={setNodeRef} className={isOver?"dc":""} style={{background:"#080610",border:`1px solid ${isOver?"#b44fff55":"#140f22"}`,borderRadius:12,padding:12,minHeight:280,transition:"border-color .15s, box-shadow .15s",boxShadow:isOver?"0 0 0 1px #b44fff33, inset 0 0 20px rgba(180,79,255,0.04)":"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:"1px solid #140f22"}}>
        <span className="dot" style={{background:col.dot}}></span>
        <span style={{fontSize:12,fontWeight:600,color:"#d0c8e8",letterSpacing:".05em",textTransform:"uppercase"}}>{col.label}</span>
        <span style={{marginLeft:"auto",background:"#140f22",borderRadius:4,padding:"1px 7px",fontSize:11,color:"#b8a8d0"}}>{col.items.length}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {col.items.map(task=>(
          <DraggableCard key={task.id} task={task} requests={requests} linkMode={linkMode} onCardClick={onCardClick} isDragging={activeId===task.id} cardRefs={cardRefs} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ task, requests, linkMode, onCardClick, isDragging, cardRefs }) {
  const {attributes, listeners, setNodeRef} = useDraggable({id: task.id});
  return(
    <div
      ref={el=>{setNodeRef(el);if(cardRefs?.current)cardRefs.current[task.id]=el;}}
      {...listeners}
      {...attributes}
      style={{opacity: isDragging ? 0.35 : 1, cursor:"grab", touchAction:"none", outline:"none"}}
      onClick={()=>!isDragging && onCardClick(task.id,"task")}
    >
      <BoardCardContent task={task} requests={requests} linkMode={linkMode} />
    </div>
  );
}

function BoardCardContent({ task, requests, linkMode, isOverlay }) {
  const pm=PRIORITY_META[task.priority]||PRIORITY_META["M"];
  const lm=task.label?LABEL_META[task.label]:null;
  const isSrc=linkMode?.sourceId===task.id;
  const isTgt=linkMode&&!isSrc;
  const blockedReqs=(task.reqDeps||[]).map(rid=>requests.find(r=>r.id===rid)).filter(Boolean);
  const sm=STATUS_META[task.status];
  
  const hasBadges = task._stale || task._cascadeWarning || task._dueSoon || task._overdue || (task.deps||[]).length>0 || blockedReqs.length>0;
  
  return(
    <div className={`card${isSrc?" lsrc":""}${isTgt?" ltgt":""}`} style={isOverlay?{boxShadow:"0 12px 40px rgba(180,79,255,0.3)",border:"1px solid #b44fff88",cursor:"grabbing"}:{}}>
      {/* Status-colored left glow bar */}
      <div style={{position:"absolute",top:0,left:0,bottom:0,width:2,background:sm.line,boxShadow:`0 0 8px ${sm.line}`,borderRadius:"10px 0 0 10px"}} />
      
      <div style={{paddingLeft:8}}>
        {/* Title & Priority */}
        <div style={{display:"flex",justifyContent:"space-between",gap:6,marginBottom:8}}>
          <span style={{fontFamily:"'Inter Tight',sans-serif",fontSize:12,fontWeight:500,lineHeight:1.4,color:task.status==="Done"?"#3a3055":"#f0e8ff",textDecoration:task.status==="Done"?"line-through":"none",flex:1}}>
            {task.emoji&&<span style={{marginRight:6}}>{task.emoji}</span>}
            {task.title}
          </span>
          <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:700,color:pm.color,flexShrink:0}}>{task.priority}</span>
        </div>
        
        {/* Bottom row: Assignee on left, chips/badges on right */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,color:"#5a4870",letterSpacing:"0.08em"}}>{task.assignee}</span>
          
          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {lm&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:lm.color,background:lm.bg,padding:"2px 7px",borderRadius:3,letterSpacing:"0.06em",lineHeight:1,display:"inline-block"}}>{task.label}</span>}
            {(task.deps||[]).length>0&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#b44fff",background:"rgba(180,79,255,0.094)",padding:"3px 6px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"2px"}}>⬡{task.deps.length}</span>}
            {blockedReqs.length>0&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#f97316",background:"rgba(249,115,22,0.094)",padding:"3px 6px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"2px"}}>⇄{blockedReqs.length}</span>}
            {task._stale&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-block"}}>⏱</span>}
            {task._cascadeWarning&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-block"}}>⚠</span>}
            {task._dueSoon&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"1px"}}>⏰{task._dueSoon}d</span>}
            {task._overdue&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#ef4444",background:"rgba(239,68,68,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"1px"}}>⏰!</span>}
          </div>
        </div>
        
        {blockedReqs.map(r=>(
          <div key={r.id} style={{fontSize:11,color:"#f97316",background:"#1e1208",padding:"2px 8px",borderRadius:4,marginTop:6,display:"flex",alignItems:"center",gap:4}}>
            <span>⇄</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
          </div>
        ))}
        
        {task.notes&&<div style={{marginTop:7,fontSize:11,color:"#b8a8d0",lineHeight:1.4,borderTop:"1px solid #140f22",paddingTop:7}}>{task.notes}</div>}
        
        {task.checklist&&task.checklist.length>0&&(
          <div style={{marginTop:7,borderTop:"1px solid #140f22",paddingTop:7}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:10,color:"#b8a8d0"}}>
                {task.checklist.filter(c=>c.done).length}/{task.checklist.length}
              </span>
              <span style={{fontSize:10,color:"#b8a8d0"}}>
                {Math.round(task.checklist.filter(c=>c.done).length/task.checklist.length*100)}%
              </span>
            </div>
            <div style={{height:4,background:"#140f22",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"linear-gradient(90deg,#b44fff,#00d4ff)",width:`${task.checklist.filter(c=>c.done).length/task.checklist.length*100}%`,transition:"width .3s"}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLAN VIEW — smooth animation via stable SVG element keys
═══════════════════════════════════════════════════════════════ */
function PlanView({ tasks, requests, onCardClick, linkMode, setLinkMode, unlinkDep, unlinkReqDep, powerUps, computeBadges }) {
  const [layout,setLayout]=useState({});
  const [reqLayout,setReqLayout]=useState({});
  const [hov,setHov]=useState(null);
  const CW=280,CH=105,RW=230,RH=70,HG=100,VG=38;
  
  const tasksWithBadges = tasks.map(t=>computeBadges(t,tasks,powerUps));

  useEffect(()=>{
    // Topo sort tasks
    const lvl={};
    tasksWithBadges.forEach(t=>{lvl[t.id]=0;});
    let ch=true;
    while(ch){ch=false;tasksWithBadges.forEach(t=>(t.deps||[]).forEach(d=>{if((lvl[d]||0)>=(lvl[t.id]||0)){lvl[t.id]=(lvl[d]||0)+1;ch=true;}}));}
    const byLvl={};
    tasksWithBadges.forEach(t=>{const l=lvl[t.id]||0;if(!byLvl[l])byLvl[l]=[];byLvl[l].push(t.id);});
    const pos={};
    Object.entries(byLvl).forEach(([l,ids])=>{
      const x=40+Number(l)*(CW+HG);
      ids.forEach((id,i)=>{pos[id]={x,y:40+i*(CH+VG)};});
    });
    setLayout(pos);

    // Place requests in a row at bottom, below tasks
    const maxTaskY=Math.max(...Object.values(pos).map(p=>p.y+CH),0);
    const rpos={};
    requests.forEach((r,i)=>{rpos[r.id]={x:40+i*(RW+20),y:maxTaskY+60};});
    setReqLayout(rpos);
  },[tasksWithBadges,requests]);

  const allPos={...layout,...reqLayout};
  const maxX=Math.max(...Object.values(allPos).map(p=>p.x+Math.max(CW,RW)),600)+60;
  const maxY=Math.max(...Object.values(allPos).map(p=>p.y+Math.max(CH,RH)),400)+60;

  // Build edges: task→task and req→task
  const taskEdges=[];
  tasksWithBadges.forEach(t=>(t.deps||[]).forEach(did=>{
    const dep=tasksWithBadges.find(x=>x.id===did);
    if(dep) taskEdges.push({fromId:did,toId:t.id,fromType:"task",toType:"task",color:STATUS_META[dep.status].line});
  }));
  const reqEdges=[];
  tasksWithBadges.forEach(t=>(t.reqDeps||[]).forEach(rid=>{
    const req=requests.find(r=>r.id===rid);
    if(req) reqEdges.push({fromId:rid,toId:t.id,fromType:"req",toType:"task",color:"#f97316"});
  }));
  const allEdges=[...taskEdges,...reqEdges];

  const curvePath=(fid,tid,fType,tType)=>{
    const fp=allPos[fid], tp=allPos[tid]; if(!fp||!tp) return "";
    const fw=fType==="req"?RW:CW, fh=fType==="req"?RH:CH;
    const tw=tType==="req"?RW:CW, th=tType==="req"?RH:CH;
    const x1=fp.x+fw, y1=fp.y+fh/2;
    const x2=tp.x,    y2=tp.y+th/2;
    const cx=(x1+x2)/2;
    return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  };

  const midPoint=(fid,tid,fType,tType)=>{
    const fp=allPos[fid],tp=allPos[tid]; if(!fp||!tp) return {mx:0,my:0};
    const fw=fType==="req"?RW:CW,fh=fType==="req"?RH:CH,th=tType==="req"?RH:CH;
    return {mx:(fp.x+fw+tp.x)/2, my:(fp.y+fh/2+tp.y+th/2)/2};
  };

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:13,color:"#b8a8d0"}}>Line color = source status. Hover to unlink. Orange lines = request blockers.</span>
        <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          {Object.entries(STATUS_META).map(([s,m])=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#b8a8d0"}}>
              <span style={{display:"block",width:18,height:2,background:m.line,borderRadius:1}}></span>{s}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#f97316"}}>
            <span style={{display:"block",width:18,height:2,background:"#f97316",borderRadius:1}}></span>Request
          </div>
        </div>
      </div>
      {requests.length>0&&<div style={{fontSize:11,color:"#b8a8d0",marginBottom:10}}>⇄ Requests shown below tasks — orange lines connect them to blocked tasks.</div>}

      <div style={{overflow:"auto",position:"relative",minHeight:420}}>
        <svg width={maxX} height={maxY} style={{display:"block",position:"absolute",top:0,left:0,pointerEvents:"none"}}>
          <defs>
            {/* One marker per unique color so arrowheads always match the line */}
            {[...new Set(allEdges.map(e=>e.color)), "#ef4444"].map(color=>(
              <marker key={color} id={`arr-${color.replace("#","")}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            ))}
          </defs>

          {allEdges.map((e,i)=>{
            const key=`${e.fromId}-${e.toId}`;
            const isH=hov===key;
            const d=curvePath(e.fromId,e.toId,e.fromType,e.toType);
            const {mx,my}=midPoint(e.fromId,e.toId,e.fromType,e.toType);
            const lineColor=isH?"#ef4444":e.color;
            const markerId=`arr-${lineColor.replace("#","")}`;
            return(
              <g key={key} style={{pointerEvents:"stroke",cursor:"pointer"}}
                onMouseEnter={()=>setHov(key)} onMouseLeave={()=>setHov(null)}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={16} style={{pointerEvents:"stroke"}}/>
                {isH&&<path d={d} fill="none" stroke="#ef4444" strokeWidth={8} opacity={.12} strokeLinecap="round"/>}
                <path d={d} fill="none"
                  stroke={lineColor}
                  strokeWidth={isH?2.5:1.5}
                  className="dep-flow"
                  opacity={isH?1:0.8}
                  markerEnd={`url(#${markerId})`}/>
                {isH&&(
                  <g style={{pointerEvents:"all",cursor:"pointer"}} onClick={()=>{
                    if(e.fromType==="req") unlinkReqDep(e.toId,e.fromId);
                    else unlinkDep(e.toId,e.fromId);
                    setHov(null);
                  }}>
                    <rect x={mx-24} y={my-12} width={48} height={24} rx={12} fill="#2a1010" stroke="#ef4444" strokeWidth={1}/>
                    <text x={mx} y={my+4} textAnchor="middle" fontSize={11} fill="#ef4444" fontFamily="DM Sans,sans-serif">unlink</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <div style={{position:"relative",width:maxX,height:maxY}}>
          {/* Task cards */}
          {tasksWithBadges.map(task=>{
            const pos=layout[task.id]; if(!pos) return null;
            const isSrc=linkMode?.sourceId===task.id, isTgt=linkMode&&!isSrc;
            const pm=PRIORITY_META[task.priority]||PRIORITY_META["M"];
            const sm=STATUS_META[task.status];
            const lm=task.label?LABEL_META[task.label]:null;
            return(
              <div key={task.id} style={{position:"absolute",left:pos.x,top:pos.y,width:CW,background:"#0c0818",border:`1px solid ${isSrc?"#b44fff":isTgt?"#10b981":"#23232e"}`,borderRadius:9,padding:"10px 12px",cursor:"pointer",transition:"border-color .15s,box-shadow .15s",boxShadow:isSrc?"0 0 0 2px rgba(180,79,255,.3)":isTgt?"0 0 0 2px rgba(16,185,129,.2)":""}}
                onClick={()=>onCardClick(task.id,"task")}>
                {/* Title & Priority */}
                <div style={{display:"flex",justifyContent:"space-between",gap:6,marginBottom:8}}>
                  <span style={{fontFamily:"'Inter Tight',sans-serif",fontSize:12,fontWeight:500,lineHeight:1.4,color:task.status==="Done"?"#3a3055":"#e0ddf0",flex:1}}>
                    {task.emoji&&<span style={{marginRight:4}}>{task.emoji}</span>}
                    {task.title}
                  </span>
                  <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:700,color:pm.color,flexShrink:0}}>{task.priority}</span>
                </div>
                
                {/* Bottom row: Status on left, chips on right */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span className="dot" style={{background:sm.dot,width:6,height:6}}></span>
                    <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,color:"#5a4870",letterSpacing:"0.08em"}}>{task.assignee}</span>
                  </div>
                  
                  <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {lm&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:lm.color,background:lm.bg,padding:"2px 7px",borderRadius:3,letterSpacing:"0.06em",lineHeight:1,display:"inline-block"}}>{task.label}</span>}
                    {(task.deps||[]).length>0&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#b44fff",background:"rgba(180,79,255,0.094)",padding:"3px 6px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"2px"}}>⬡{task.deps.length}</span>}
                    {(task.reqDeps||[]).length>0&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#f97316",background:"rgba(249,115,22,0.094)",padding:"3px 6px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"2px"}}>⇄{task.reqDeps.length}</span>}
                    {task._stale&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-block"}}>⏱</span>}
                    {task._cascadeWarning&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:11,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-block"}}>⚠</span>}
                    {task._dueSoon&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#f59e0b",background:"rgba(245,158,11,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"1px"}}>⏰{task._dueSoon}d</span>}
                    {task._overdue&&<span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:"#ef4444",background:"rgba(239,68,68,0.094)",padding:"3px 5px",borderRadius:3,lineHeight:1,display:"inline-flex",alignItems:"center",gap:"1px"}}>⏰!</span>}
                    {!linkMode&&(
                      <button
                        className="btn g sm"
                        style={{fontSize:10,padding:"2px 7px",color:"#b44fff",borderColor:"#2a1e3a",marginLeft:2}}
                        onClick={e=>{e.stopPropagation();setLinkMode({sourceId:task.id,sourceType:"task"});}}>
                        🔗
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Request nodes */}
          {requests.map(req=>{
            const pos=reqLayout[req.id]; if(!pos) return null;
            const sm=EXT_STATUS_META[req.status];
            const isSrc=linkMode?.sourceId===req.id;
            const isTgt=linkMode&&linkMode.sourceType==="task"&&!isSrc;
            const handleClick=()=>{
              if(linkMode){
                if(isTgt) onCardClick(req.id,"req");
              } else {
                onCardClick(req.id,"req");
              }
            };
            return(
              <div key={req.id} style={{position:"absolute",left:pos.x,top:pos.y,width:RW,background:"#14120a",border:`1px solid ${isSrc?"#b44fff":isTgt?"#10b981":"#2a1e0a"}`,borderRadius:8,padding:"10px 12px",cursor:linkMode&&!isTgt&&!isSrc?"default":"pointer",transition:"border-color .15s,box-shadow .15s",boxShadow:isTgt?"0 0 0 2px rgba(16,185,129,.2)":isSrc?"0 0 0 2px rgba(180,79,255,.3)":""}}>
                <div style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,color:"#6b5a30",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>⇄ Request</div>
                
                {/* Title */}
                <div style={{fontFamily:"'Inter Tight',sans-serif",fontSize:12,fontWeight:500,color:"#e0c97a",lineHeight:1.4,marginBottom:8}}>{req.title}</div>
                
                {req.link&&(
                  <a href={req.link} target="_blank" rel="noopener noreferrer" 
                    style={{display:"block",fontSize:9,color:"#8a7340",textDecoration:"none",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                    onClick={e=>e.stopPropagation()}>
                    🔗 {req.link.replace(/^https?:\/\//,'')}
                  </a>
                )}
                
                {/* Bottom row: Team on left, status/link on right */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,color:"#5a4870",letterSpacing:"0.08em"}}>{req.assignee}</span>
                  
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,fontWeight:600,color:sm.color,background:sm.bg,padding:"2px 7px",borderRadius:3,letterSpacing:"0.06em",lineHeight:1,display:"inline-block"}}>{req.status}</span>
                    {!linkMode&&(
                      <button
                        className="btn g sm"
                        style={{fontSize:10,padding:"2px 7px",color:"#f97316",borderColor:"#3a2010"}}
                        onClick={e=>{e.stopPropagation();setLinkMode({sourceId:req.id,sourceType:"req"});}}>
                        🔗
                      </button>
                    )}
                    {isTgt&&<div style={{fontFamily:"Rajdhani,sans-serif",fontSize:10,color:"#10b981"}}>Click to link</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REQUESTS VIEW
═══════════════════════════════════════════════════════════════ */
function RequestsView({ requests, tasks, onEdit, linkMode }) {
  const [filter,setFilter]=useState("All");
  const counts=EXT_STATUSES.reduce((a,s)=>({...a,[s]:requests.filter(r=>r.status===s).length}),{});
  const filtered=filter==="All"?requests:requests.filter(r=>r.status===filter);

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["All",requests.length],...EXT_STATUSES.map(s=>[s,counts[s]])].map(([s,n])=>{
          const m=s==="All"?{color:"#8a80a8",bg:"#100820"}:EXT_STATUS_META[s];
          const act=filter===s;
          return(
            <button key={s} onClick={()=>setFilter(s)} style={{padding:"4px 12px",borderRadius:4,border:"1px solid",fontSize:11,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,letterSpacing:"0.06em",transition:"all .15s",background:act?m.bg:"transparent",borderColor:act?m.color:"#1e1430",color:act?m.color:"#b8a8d0",display:"flex",alignItems:"center",gap:6}}>
              {s}<span style={{background:"#140f22",padding:"0 5px",borderRadius:3,fontSize:11}}>{n}</span>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {!filtered.length&&<div style={{color:"#3a3a50",fontSize:13,padding:"40px 0",textAlign:"center"}}>No requests with this status.</div>}
        {filtered.map(req=>{
          const m=EXT_STATUS_META[req.status];
          const linkedTasks=tasks.filter(t=>(t.reqDeps||[]).includes(req.id));
          return(
            <div key={req.id} className="card" onClick={()=>onEdit(req)} style={{background:"#0c0818",border:`1px solid #1e1430`,borderRadius:10,padding:"14px 18px",position:"relative",overflow:"hidden"}}>
              {/* Status left glow bar */}
              <div style={{position:"absolute",top:0,left:0,bottom:0,width:2,background:m.color,boxShadow:`0 0 8px ${m.color}`,borderRadius:"10px 0 0 10px"}} />
              <div style={{paddingLeft:8,display:"flex",alignItems:"flex-start",gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:linkedTasks.length||req.notes?6:0}}>
                    <span style={{fontWeight:600,fontSize:14,color:"#f0e8ff"}}>{req.title}</span>
                    <span style={{fontSize:11,color:"#d0c8e8",background:"#100820",padding:"2px 8px",borderRadius:4,border:"1px solid #1e1430"}}>{req.team}</span>
                  </div>
                  {req.notes&&<div style={{fontSize:12,color:"#8a80a8",marginBottom:linkedTasks.length?6:0}}>{req.notes}</div>}
                  {linkedTasks.length>0&&(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#5a4870"}}>Blocking:</span>
                      {linkedTasks.map(t=>(
                        <span key={t.id} style={{fontSize:11,color:"#cc99ff",background:"#1a1040",padding:"2px 8px",borderRadius:4,border:"1px solid #2a1a60"}}>⬡ {t.title}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                  <span style={{padding:"1px 7px",borderRadius:3,fontSize:10,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:"0.06em",background:m.bg,color:m.color,border:`1px solid ${m.color}55`}}>{req.status}</span>
                  <span style={{fontSize:12,color:"#8a80a8"}}>{req.assignee}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEADERSHIP
═══════════════════════════════════════════════════════════════ */
function LeaderView({ tasks, requests }) {
  const [tab,setTab]=useState("overview");
  const total=tasks.length;
  const done=tasks.filter(t=>t.status==="Done").length;
  const blocked=tasks.filter(t=>t.status==="Blocked").length;
  const inProg=tasks.filter(t=>t.status==="In Progress").length;
  const todo=tasks.filter(t=>t.status==="Todo").length;
  const pendingReqs=requests.filter(r=>r.status==="Pending"||r.status==="In Review").length;
  const overallPct=total?Math.round(done/total*100):0;

  // Progress by label
  const labelRows=LABELS.map(lbl=>{
    const lt=tasks.filter(t=>t.label===lbl);
    if(!lt.length) return null;
    const ld=lt.filter(t=>t.status==="Done").length;
    const lb=lt.filter(t=>t.status==="Blocked").length;
    const lip=lt.filter(t=>t.status==="In Progress").length;
    const pct=Math.round(ld/lt.length*100);
    return {lbl,total:lt.length,done:ld,blocked:lb,inProg:lip,pct};
  }).filter(Boolean);

  // Blocked tasks with their blockers listed
  const blockedTasks=tasks.filter(t=>t.status==="Blocked");

  // Team workload — just counts, no task lists
  const teamRows=TEAM.map(p=>{
    const mine=tasks.filter(t=>t.assignee===p);
    return {
      name:p,
      total:mine.length,
      active:mine.filter(t=>t.status==="In Progress").length,
      blocked:mine.filter(t=>t.status==="Blocked").length,
      done:mine.filter(t=>t.status==="Done").length,
      todo:mine.filter(t=>t.status==="Todo").length,
    };
  });

  return(
    <div>
      <div style={{display:"flex",gap:4,background:"#040210",border:"1px solid #140f22",borderRadius:8,padding:3,width:"fit-content",marginBottom:20}}>
        {[["overview","Overview"],["timeline","Timeline"]].map(([t,l])=>(
          <button key={t} className={`vbtn${tab===t?" act":""}`} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      {tab==="overview"&&(
        <div>
          {/* ── Health metrics ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:28}}>
            {[
              {l:"Overall",   v:`${overallPct}%`, c:overallPct===100?"#10b981":"#cc99ff"},
              {l:"Done",      v:`${done}/${total}`,c:"#10b981"},
              {l:"In flight", v:inProg,            c:"#b44fff"},
              {l:"Blocked",   v:blocked,           c:blocked>0?"#ef4444":"#10b981"},
              {l:"Open reqs", v:pendingReqs,       c:pendingReqs>0?"#f97316":"#10b981"},
            ].map(m=>(
              <div key={m.l} style={{background:"#080610",border:"1px solid #140f22",borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontSize:11,color:"#5a4870",marginBottom:8,textTransform:"uppercase",letterSpacing:".06em"}}>{m.l}</div>
                <div style={{fontSize:28,fontWeight:600,color:m.c,letterSpacing:"-0.03em"}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* ── Overall flow bar ── */}
          <div style={{background:"#080610",border:"1px solid #140f22",borderRadius:10,padding:"14px 18px",marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:500,fontSize:13}}>Overall flow</span>
              <div style={{display:"flex",gap:14}}>
                {[["Todo",todo,"#6b7280"],["In Progress",inProg,"#b44fff"],["Blocked",blocked,"#ef4444"],["Done",done,"#10b981"]].map(([s,n,c])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:c}}>
                    <span className="dot" style={{background:c,width:6,height:6}}></span>{n} {s}
                  </div>
                ))}
              </div>
            </div>
            {/* Stacked bar */}
            <div style={{height:8,borderRadius:4,overflow:"hidden",display:"flex",background:"#140f22"}}>
              {total>0&&[
                {n:done,   c:"#10b981"},
                {n:inProg, c:"#b44fff"},
                {n:blocked,c:"#ef4444"},
                {n:todo,   c:"#2a2a3a"},
              ].map((seg,i)=>seg.n>0&&(
                <div key={i} style={{width:`${seg.n/total*100}%`,background:seg.c,transition:"width .4s"}}></div>
              ))}
            </div>
          </div>

          {/* ── Progress by feature area ── */}
          {labelRows.length>0&&(
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,color:"#5a4870",textTransform:"uppercase",letterSpacing:".07em",marginBottom:14}}>Progress by area</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {labelRows.map(({lbl,total:lt,done:ld,blocked:lb,inProg:lip,pct})=>{
                  const lm=LABEL_META[lbl];
                  return(
                    <div key={lbl} style={{background:"#080610",border:"1px solid #140f22",borderRadius:10,padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span className="chip" style={{background:lm.bg,color:lm.color,border:`1px solid ${lm.color}44`}}>{lbl}</span>
                        <div style={{flex:1}}></div>
                        {lb>0&&<span style={{fontSize:11,color:"#ef4444"}}>🚫 {lb}</span>}
                        {lip>0&&<span style={{fontSize:11,color:"#b44fff"}}>▶ {lip}</span>}
                        <span style={{fontSize:12,color:"#5a4870"}}>{ld}/{lt}</span>
                        <span style={{fontSize:12,fontWeight:600,color:pct===100?"#10b981":lm.color,minWidth:34,textAlign:"right"}}>{pct}%</span>
                      </div>
                      <div className="pb">
                        <div style={{height:"100%",borderRadius:2,background:pct===100?"#10b981":lm.color,width:`${pct}%`,transition:"width .4s"}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Blocked items ── */}
          {blockedTasks.length>0&&(
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,color:"#ef4444",textTransform:"uppercase",letterSpacing:".07em",marginBottom:14}}>🚫 Blocked — needs attention</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {blockedTasks.map(t=>{
                  const depNames=(t.deps||[]).map(d=>tasks.find(x=>x.id===d)?.title).filter(Boolean);
                  const reqNames=(t.reqDeps||[]).map(d=>requests.find(r=>r.id===d)?.title).filter(Boolean);
                  return(
                    <div key={t.id} style={{background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{flex:1}}>
                        <span style={{fontSize:13,fontWeight:500,color:"#fca5a5"}}>{t.title}</span>
                        {(depNames.length>0||reqNames.length>0)&&(
                          <div style={{fontSize:11,color:"#6b3030",marginTop:4}}>
                            Waiting on: {[...depNames,...reqNames.map(n=>`[req] ${n}`)].join(", ")}
                          </div>
                        )}
                      </div>
                      <span style={{fontSize:11,color:"#5a4870",flexShrink:0}}>{t.assignee}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Team workload ── */}
          <div>
            <div style={{fontSize:12,color:"#5a4870",textTransform:"uppercase",letterSpacing:".07em",marginBottom:14}}>Team workload</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {teamRows.map(({name,total:tot,active,blocked:blk,done:dn,todo:td})=>{
                const pct=tot?Math.round(dn/tot*100):0;
                return(
                  <div key={name} style={{background:"#080610",border:`1px solid ${blk>0?"#3a1515":"#140f22"}`,borderRadius:9,padding:"10px 16px",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#2d1e5a,#b44fff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#cc99ff",flexShrink:0}}>{name[0]}</div>
                    <span style={{fontWeight:500,fontSize:13,width:60,flexShrink:0}}>{name}</span>
                    {/* Stacked workload bar */}
                    <div style={{flex:1,height:6,borderRadius:3,overflow:"hidden",display:"flex",background:"#140f22",minWidth:60}}>
                      {tot>0&&[{n:dn,c:"#10b981"},{n:active,c:"#b44fff"},{n:blk,c:"#ef4444"},{n:td,c:"#2a2a3a"}].map((s,i)=>s.n>0&&(
                        <div key={i} style={{width:`${s.n/tot*100}%`,background:s.c}}></div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:10,flexShrink:0}}>
                      {active>0&&<span style={{fontSize:11,color:"#cc99ff"}}>▶ {active}</span>}
                      {blk>0&&<span style={{fontSize:11,color:"#ef4444"}}>🚫 {blk}</span>}
                      {td>0&&<span style={{fontSize:11,color:"#5a4870"}}>⬜ {td}</span>}
                      {dn>0&&<span style={{fontSize:11,color:"#10b981"}}>✓ {dn}</span>}
                      {tot===0&&<span style={{fontSize:11,color:"#3a3a50",fontStyle:"italic"}}>unassigned</span>}
                    </div>
                    <span style={{fontSize:11,color:pct===100?"#10b981":"#5a4870",width:32,textAlign:"right",flexShrink:0}}>{tot>0?`${pct}%`:""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==="timeline"&&<TimelineView tasks={tasks} requests={requests} />}
    </div>
  );
}

function TimelineView({ tasks, requests }) {
  const withDates=tasks.filter(t=>t.startDate&&t.endDate).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  if(!withDates.length) return <div style={{color:"#5a4870",fontSize:13,padding:"40px 0",textAlign:"center"}}>No tasks have start/end dates. Edit tasks to add them.</div>;

  const allD=withDates.flatMap(t=>[t.startDate,t.endDate]);
  const minD=new Date(allD.reduce((a,b)=>a<b?a:b));
  const maxD=new Date(allD.reduce((a,b)=>a>b?a:b));
  const span=Math.max((maxD-minD)/86400000,1);
  const pct=d=>Math.max(0,Math.min(100,(new Date(d)-minD)/86400000/span*100));

  const ticks=[]; const cur=new Date(minD);
  while(cur<=maxD){ticks.push(new Date(cur));cur.setDate(cur.getDate()+7);}

  const todayStr=new Date().toISOString().slice(0,10);
  const todayP=pct(todayStr);
  const showToday=todayP>=0&&todayP<=100;

  const LABEL_W=190, ROW_H=30, CHART_GAP=4;

  // Flat row index for dep arrows
  const rowIndex={};
  withDates.forEach((t,i)=>{rowIndex[t.id]=i;});

  // Dep arrows: from end of dep bar to start of dependent bar.
  // If the dependent task starts before the dep ends, that's a scheduling violation —
  // we still draw from dep.endDate but flag it red.
  const depArrows=[];
  withDates.forEach(task=>{
    (task.deps||[]).forEach(did=>{
      const dep=withDates.find(t=>t.id===did);
      if(!dep) return;
      const fromRow=rowIndex[did], toRow=rowIndex[task.id];
      if(fromRow===undefined||toRow===undefined) return;
      const violation=task.startDate<dep.endDate; // starts before dep finishes
      depArrows.push({
        x1:pct(dep.endDate), y1:fromRow,
        x2:pct(violation?dep.endDate:task.startDate), y2:toRow,
        color:violation?"#ef4444":STATUS_META[dep.status].line,
        violation,
      });
    });
  });

  const renderRows=(taskList)=>taskList.map((task)=>{
    const sm=STATUS_META[task.status];
    const lm=task.label?LABEL_META[task.label]:null;
    const left=pct(task.startDate),right=pct(task.endDate),width=Math.max(right-left,.5);
    return(
      <div key={task.id} style={{display:"flex",alignItems:"center",marginBottom:CHART_GAP,height:ROW_H}}>
        <div style={{width:LABEL_W-2,flexShrink:0,fontSize:12,color:"#8a80a8",textAlign:"right",paddingRight:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
          {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,border:`1px solid ${lm.color}55`}}>{task.label}</span>}
          <span title={task.title}>{task.title}</span>
        </div>
        <div style={{flex:1,position:"relative",height:ROW_H}}>
          <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"#140f22",transform:"translateY(-50%)"}}></div>
          <div title={`${task.startDate} → ${task.endDate} · ${task.assignee}`} style={{position:"absolute",top:(ROW_H-16)/2,left:`${left}%`,width:`${width}%`,height:16,background:sm.line,borderRadius:4,opacity:.85,display:"flex",alignItems:"center",paddingLeft:5,overflow:"hidden",minWidth:4}}>
            <span style={{fontSize:10,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.assignee}</span>
          </div>
          {showToday&&<div style={{position:"absolute",top:0,left:`${todayP}%`,width:1,height:ROW_H,background:"#ef4444",opacity:.7}}></div>}
        </div>
      </div>
    );
  });

  const chartH=withDates.length*(ROW_H+CHART_GAP);

  return(
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:700}}>
        {/* Week headers */}
        <div style={{display:"flex",marginBottom:8,paddingLeft:LABEL_W}}>
          <div style={{flex:1,position:"relative",height:18}}>
            {ticks.map((d,i)=>(
              <span key={i} style={{position:"absolute",left:`${pct(d.toISOString().slice(0,10))}%`,fontSize:10,color:"#444458",whiteSpace:"nowrap",transform:"translateX(-50%)"}}>
                {d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}
              </span>
            ))}
          </div>
        </div>

        {/* Chart rows + dep arrow SVG overlay */}
        <div style={{position:"relative"}}>
          {renderRows(withDates)}
          {depArrows.length>0&&(
            <svg style={{position:"absolute",top:0,left:LABEL_W,right:0,width:`calc(100% - ${LABEL_W}px)`,height:chartH,pointerEvents:"none",overflow:"visible"}}>
              <defs>
                <marker id="tl-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="#5a4870" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </marker>
              </defs>
              {depArrows.map((a,i)=>{
                const y1=(a.y1+0.5)*(ROW_H+CHART_GAP);
                const y2=(a.y2+0.5)*(ROW_H+CHART_GAP);
                return(
                  <g key={i}>
                    <line
                      x1={`${a.x1}%`} y1={y1}
                      x2={`${a.x2}%`} y2={y2}
                      stroke={a.color} strokeWidth={a.violation?1.5:1} strokeDasharray={a.violation?"none":"4 3"} opacity={0.7}
                      markerEnd="url(#tl-arr)"/>
                    {a.violation&&(
                      <circle cx={`${a.x2}%`} cy={y2} r={4} fill="#ef4444" opacity={0.8}>
                        <title>Scheduling conflict: task starts before dependency ends</title>
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div style={{display:"flex",gap:14,paddingLeft:LABEL_W,marginTop:10,flexWrap:"wrap"}}>
          {Object.entries(STATUS_META).map(([s,m])=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#5a4870"}}>
              <span style={{display:"block",width:12,height:10,background:m.line,borderRadius:2,opacity:.85}}></span>{s}
            </div>
          ))}
          {showToday&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#ef4444"}}><span style={{display:"inline-block",width:1,height:12,background:"#ef4444",marginRight:2}}></span>Today</div>}
          {depArrows.some(a=>a.violation)&&(
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#ef4444"}}>
              <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#ef4444"}}></span>Scheduling conflict
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════════════════ */
function F({label,children}){return <div className="fl"><label>{label}</label>{children}</div>;}

const EMOJI_OPTIONS=["","🚀","🐛","⚡","🔥","✅","🎯","💡","🔧","📋","⚠️","🎉","🔒","📦","🌐"];

function TaskModal({ task, tasks, requests, onSave, onDelete, onLink, unlinkDep, unlinkReqDep, onClose, updateTask, powerups }) {
  const isEdit=!!task;
  const [form,setForm]=useState(isEdit?{...task}:{title:"",assignee:TEAM[0],priority:"M",status:"Todo",milestone:MILESTONES[0],deps:[],reqDeps:[],notes:"",label:"",startDate:"",endDate:"",dueDate:"",checklist:[],emoji:""});
  const [newItem,setNewItem]=useState("");
  const [showEmoji,setShowEmoji]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const depNames=(form.deps||[]).map(id=>({id,title:tasks.find(t=>t.id===id)?.title||id}));
  const reqDepNames=(form.reqDeps||[]).map(id=>({id,title:requests.find(r=>r.id===id)?.title||id}));

  const cl=form.checklist||[];
  const clDone=cl.filter(i=>i.done).length;

  const addItem=()=>{
    if(!newItem.trim()) return;
    const updated=[...cl,{id:uid(),text:newItem.trim(),done:false}];
    set("checklist",updated);
    setNewItem("");
  };

  const toggleItem=(itemId)=>{
    const updated=cl.map(i=>i.id===itemId?{...i,done:!i.done}:i);
    set("checklist",updated);
    if(powerups?.autoReview && updated.every(i=>i.done) && updated.length>0 && form.status==="In Progress"){
      set("status","In Review");
    }
  };

  const removeItem=(itemId)=>set("checklist",cl.filter(i=>i.id!==itemId));

  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox" style={{width:560}}>
        <div style={{fontWeight:600,fontSize:16,marginBottom:20}}>{isEdit?"Edit task":"New task"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Title + emoji */}
          <F label="Title">
            <div style={{display:"flex",gap:8,position:"relative"}}>
              <button onClick={()=>setShowEmoji(s=>!s)} style={{background:"#1a1a24",border:"1px solid #2a2a38",borderRadius:7,padding:"8px 10px",fontSize:16,cursor:"pointer",flexShrink:0}}>
                {form.emoji||"☐"}
              </button>
              <input className="inp" placeholder="Task title" value={form.title} onChange={e=>set("title",e.target.value)} autoFocus />
              {showEmoji&&(
                <div style={{position:"absolute",top:"100%",left:0,zIndex:10,background:"#1a1a24",border:"1px solid #2a2a38",borderRadius:8,padding:8,display:"flex",flexWrap:"wrap",gap:4,width:240,marginTop:4}}>
                  {EMOJI_OPTIONS.map(e=>(
                    <button key={e||"none"} onClick={()=>{set("emoji",e);setShowEmoji(false);}} style={{background:"none",border:"1px solid #2a2a38",borderRadius:4,padding:"4px 6px",fontSize:14,cursor:"pointer",minWidth:32}}>
                      {e||"∅"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </F>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <F label="Assignee">
              <select className="inp" value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{TEAM.map(a=><option key={a}>{a}</option>)}</select>
            </F>
            <F label="Priority">
              <select className="inp" value={form.priority} onChange={e=>set("priority",e.target.value)}>
                {PRIORITIES.map(p=><option key={p} value={p}>{p} — {PRIORITY_META[p].label}</option>)}
              </select>
            </F>
            <F label="Status">
              <select className="inp" value={form.status} onChange={e=>set("status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </F>
            <F label="Milestone">
              <select className="inp" value={form.milestone} onChange={e=>set("milestone",e.target.value)}>{MILESTONES.map(m=><option key={m}>{m}</option>)}</select>
            </F>
            <F label="Label">
              <select className="inp" value={form.label||""} onChange={e=>set("label",e.target.value)}>
                <option value="">None</option>{LABELS.map(l=><option key={l}>{l}</option>)}
              </select>
            </F>
            <F label="Due date"><input type="date" className="inp" value={form.dueDate||""} onChange={e=>set("dueDate",e.target.value)} style={{colorScheme:"dark"}} /></F>
            <F label="Start date"><input type="date" className="inp" value={form.startDate||""} onChange={e=>set("startDate",e.target.value)} style={{colorScheme:"dark"}} /></F>
            <F label="End date"><input type="date" className="inp" value={form.endDate||""} onChange={e=>set("endDate",e.target.value)} style={{colorScheme:"dark"}} /></F>
          </div>

          <F label="Notes"><textarea className="inp" placeholder="Optional notes…" value={form.notes} onChange={e=>set("notes",e.target.value)} /></F>

          {/* Checklist */}
          <F label={`Checklist${cl.length?` (${clDone}/${cl.length})`:""}${powerups?.autoReview&&cl.length?" · auto → In Review when all done":""}`}>
            <div style={{background:"#1a1a24",borderRadius:7,border:"1px solid #2a2a38",overflow:"hidden"}}>
              {cl.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid #22222e"}}>
                  <div onClick={()=>toggleItem(item.id)} style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${item.done?"#b44fff":"#3a3a50"}`,background:item.done?"#b44fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
                    {item.done&&<span style={{fontSize:10,color:"#fff"}}>✓</span>}
                  </div>
                  <span style={{fontSize:12,flex:1,color:item.done?"#484860":"#c4c0d8",textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                  <button onClick={()=>removeItem(item.id)} style={{background:"none",border:"none",color:"#3a3a50",cursor:"pointer",fontSize:14,padding:"0 4px"}}>×</button>
                </div>
              ))}
              <div style={{display:"flex",gap:0}}>
                <input className="inp" placeholder="Add item…" value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()}
                  style={{border:"none",borderRadius:0,background:"transparent",fontSize:12,padding:"8px 12px"}} />
                <button onClick={addItem} className="btn p sm" style={{borderRadius:0,borderLeft:"1px solid #2a2a38"}}>+</button>
              </div>
            </div>
            {cl.length>0&&(
              <div style={{height:3,background:"#1e1e2a",borderRadius:0,overflow:"hidden",marginTop:0}}>
                <div style={{height:"100%",background:clDone===cl.length?"#10b981":"linear-gradient(90deg,#b44fff,#00d4ff)",width:`${cl.length?clDone/cl.length*100:0}%`,transition:"width .3s"}}></div>
              </div>
            )}
          </F>
          {depNames.length>0&&(
            <F label="Task dependencies">
              <div style={{background:"#100820",borderRadius:7,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
                {depNames.map(({id,title})=>(
                  <div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span style={{fontSize:12,color:"#cc99ff"}}>⬡ {title}</span>
                    {isEdit&&<button className="btn dr sm" onClick={()=>{unlinkDep&&unlinkDep(task.id,id);set("deps",(form.deps||[]).filter(d=>d!==id));}}>unlink</button>}
                  </div>
                ))}
              </div>
            </F>
          )}
          {reqDepNames.length>0&&(
            <F label="Blocked by requests">
              <div style={{background:"#1a1208",borderRadius:7,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
                {reqDepNames.map(({id,title})=>(
                  <div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span style={{fontSize:12,color:"#f97316"}}>⇄ {title}</span>
                    {isEdit&&<button className="btn dr sm" onClick={()=>{unlinkReqDep&&unlinkReqDep(task.id,id);set("reqDeps",(form.reqDeps||[]).filter(d=>d!==id));}}>unlink</button>}
                  </div>
                ))}
              </div>
            </F>
          )}
        </div>
        <div style={{display:"flex",gap:8,marginTop:20,flexWrap:"wrap"}}>
          {isEdit&&<button className="btn dr" onClick={onDelete}>Delete</button>}
          {isEdit&&onLink&&<button className="btn g" onClick={onLink} style={{color:"#cc99ff",borderColor:"#3a2a6a"}}>🔗 Link dep</button>}
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button className="btn g" onClick={onClose}>Cancel</button>
            <button className="btn p" onClick={()=>form.title&&onSave(form)}>{isEdit?"Save":"Create task"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReqModal({ req, tasks, onToggleTask, onSave, onDelete, onClose }) {
  const isEdit=!!req;
  const [form,setForm]=useState(isEdit?{...req}:{title:"",team:"",assignee:TEAM[0],status:"Pending",notes:"",created:new Date().toISOString().slice(0,10),link:""});
  const [taskSearch,setTaskSearch]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  // Which tasks are currently blocked by this request
  const blockedByThis=isEdit?tasks.filter(t=>(t.reqDeps||[]).includes(req.id)):[];
  const blockedIds=new Set(blockedByThis.map(t=>t.id));

  const filtered=tasks.filter(t=>!taskSearch||t.title.toLowerCase().includes(taskSearch.toLowerCase()));

  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox" style={{width:560}}>
        <div style={{fontWeight:600,fontSize:16,marginBottom:20}}>{isEdit?"Edit request":"New external request"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <F label="Request title"><input className="inp" placeholder="What are you requesting?" value={form.title} onChange={e=>set("title",e.target.value)} autoFocus /></F>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <F label="External team"><input className="inp" placeholder="e.g. Data Platform, SecOps" value={form.team} onChange={e=>set("team",e.target.value)} /></F>
            <F label="Owner (us)">
              <select className="inp" value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{TEAM.map(a=><option key={a}>{a}</option>)}</select>
            </F>
            <F label="Status">
              <select className="inp" value={form.status} onChange={e=>set("status",e.target.value)}>{EXT_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
            </F>
            <F label="Date submitted"><input type="date" className="inp" value={form.created||""} onChange={e=>set("created",e.target.value)} style={{colorScheme:"dark"}} /></F>
          </div>
          <F label="Link (Jira, ServiceNow, etc.)"><input className="inp" placeholder="https://..." value={form.link||""} onChange={e=>set("link",e.target.value)} /></F>
          <F label="Notes"><textarea className="inp" placeholder="Context, ticket numbers, follow-up needed…" value={form.notes} onChange={e=>set("notes",e.target.value)} /></F>

          {/* Task linker — only meaningful once the request exists */}
          <F label={`Tasks blocked by this request${blockedByThis.length?` (${blockedByThis.length})`:""}`}>
            {!isEdit
              ? <div style={{fontSize:12,color:"#444458",padding:"8px 12px",background:"#100820",borderRadius:7}}>Save the request first, then link tasks to it.</div>
              : <div style={{background:"#100820",borderRadius:7,overflow:"hidden",border:"1px solid #1e1430"}}>
                  <div style={{padding:"8px 10px",borderBottom:"1px solid #1e1430"}}>
                    <input className="inp" style={{background:"transparent",border:"none",padding:"0",fontSize:12}} placeholder="Filter tasks…" value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} />
                  </div>
                  <div style={{height:180,overflowY:"auto",padding:"4px 0"}}>
                    {filtered.length===0&&<div style={{fontSize:12,color:"#3a3a50",padding:"8px 12px"}}>No tasks match.</div>}
                    {filtered.map(t=>{
                      const isLinked=blockedIds.has(t.id);
                      const sm=STATUS_META[t.status];
                      const lm=t.label?LABEL_META[t.label]:null;
                      return(
                        <div key={t.id} onClick={()=>onToggleTask(t.id,req.id,!isLinked)}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",cursor:"pointer",transition:"background .1s",background:isLinked?"#1a1040":"transparent"}}
                          onMouseEnter={e=>e.currentTarget.style.background=isLinked?"#1e1448":"#140f22"}
                          onMouseLeave={e=>e.currentTarget.style.background=isLinked?"#1a1040":"transparent"}>
                          {/* Checkbox */}
                          <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${isLinked?"#b44fff":"#3a3a50"}`,background:isLinked?"#b44fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                            {isLinked&&<span style={{fontSize:10,color:"#fff",lineHeight:1}}>✓</span>}
                          </div>
                          <span className="dot" style={{background:sm.dot,width:6,height:6,flexShrink:0}}></span>
                          <span style={{fontSize:12,flex:1,color:isLinked?"#cc99ff":"#8a80a8"}}>{t.title}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                            {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,border:`1px solid ${lm.color}55`}}>{t.label}</span>}
                            <span style={{fontSize:11,color:"#3a3055"}}>{t.assignee}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {blockedByThis.length>0&&(
                    <div style={{padding:"6px 12px",borderTop:"1px solid #1e1430",fontSize:11,color:"#5a4870"}}>
                      {blockedByThis.length} task{blockedByThis.length!==1?"s":""} waiting on this request
                    </div>
                  )}
                </div>
            }
          </F>
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          {isEdit&&<button className="btn dr" onClick={onDelete}>Delete</button>}
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button className="btn g" onClick={onClose}>Close</button>
            <button className="btn p" onClick={()=>form.title&&form.team&&onSave(form)}>{isEdit?"Save":"Add request"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ md, onClose }) {
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(md);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox" style={{width:640}}>
        <div style={{fontWeight:600,fontSize:16,marginBottom:16}}>Export to Markdown</div>
        <textarea value={md} readOnly style={{background:"#06040f",border:"1px solid #1e1430",borderRadius:7,color:"#7a9e7a",fontFamily:"'DM Mono',monospace",fontSize:12,padding:14,width:"100%",height:300,resize:"none",outline:"none"}} />
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
          <button className="btn g" onClick={onClose}>Close</button>
          <button className="btn p" onClick={copy}>{copied?"✓ Copied!":"Copy to clipboard"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POWER-UPS MODAL
═══════════════════════════════════════════════════════════════ */
function PowerupsModal({ powerups, setPowerups, onClose }) {
  const set=(k,v)=>setPowerups(p=>({...p,[k]:v}));
  const Toggle=({k,label,desc})=>(
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,padding:"12px 0",borderBottom:"1px solid #1e1430"}}>
      <div>
        <div style={{fontSize:13,fontWeight:500,color:"#e8e6f0",marginBottom:2}}>{label}</div>
        <div style={{fontSize:11,color:"#b8a8d0"}}>{desc}</div>
      </div>
      <div onClick={()=>set(k,!powerups[k])} style={{width:36,height:20,borderRadius:10,background:powerups[k]?"#b44fff":"#2a2a38",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0,marginTop:2}}>
        <div style={{position:"absolute",top:2,left:powerups[k]?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}></div>
      </div>
    </div>
  );
  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <span style={{fontSize:20}}>⚡</span>
          <span style={{fontWeight:600,fontSize:16}}>Power-ups</span>
        </div>
        <Toggle k="autoReview"  label="Auto → In Review"    desc="When all checklist items are checked, automatically move card to In Review" />
        <Toggle k="staleAlert"    label="Stale alert"         desc={`Flag cards with no activity after ${powerups.staleDays} days`} />
        {powerups.staleAlert&&(
          <div style={{padding:"8px 0 12px 0",borderBottom:"1px solid #1e1430",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,color:"#b8a8d0"}}>Stale after</span>
            {[3,5,7,14].map(d=>(
              <button key={d} onClick={()=>set("staleDays",d)} style={{padding:"3px 10px",borderRadius:5,border:"1px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",background:powerups.staleDays===d?"#b44fff":"#1a1a24",borderColor:powerups.staleDays===d?"#b44fff":"#2a2a38",color:powerups.staleDays===d?"#fff":"#d0c8e8"}}>{d}d</button>
            ))}
          </div>
        )}
        <Toggle k="autoAssign"    label="Auto-assign on In Progress" desc="When a card moves to In Progress, assign it to a specific person" />
        {powerups.autoAssign&&(
          <div style={{padding:"8px 0 12px 0",borderBottom:"1px solid #1e1430",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,color:"#b8a8d0"}}>Assign to</span>
            <select className="inp" style={{width:"auto"}} value={powerups.autoAssignee||TEAM[0]} onChange={e=>set("autoAssignee",e.target.value)}>
              {TEAM.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        )}
        <Toggle k="cascadeBlock"  label="Cascade block warning" desc="When a card is blocked, highlight dependent tasks with warning badge" />
        <div style={{padding:"12px 0",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:"#e8e6f0",marginBottom:2}}>Due soon warning</div>
            <div style={{fontSize:11,color:"#b8a8d0"}}>Show warning badge N days before due date</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {[1,2,3,5].map(d=>(
              <button key={d} onClick={()=>set("dueDays",d)} style={{padding:"3px 10px",borderRadius:5,border:"1px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",background:powerups.dueDays===d?"#b44fff":"#1a1a24",borderColor:powerups.dueDays===d?"#b44fff":"#2a2a38",color:powerups.dueDays===d?"#fff":"#d0c8e8"}}>{d}d</button>
            ))}
          </div>
        </div>
        <div style={{marginTop:16,textAlign:"right"}}>
          <button className="btn p" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STANDUP MODAL
═══════════════════════════════════════════════════════════════ */
function StandupModal({ tasks, onClose }) {
  const [copied,setCopied]=useState(false);
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);

  const lines=["# Standup Report","",`> ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}`,""];

  TEAM.forEach(person=>{
    const mine=tasks.filter(t=>t.assignee===person);
    if(!mine.length) return;
    const active=mine.filter(t=>t.status==="In Progress");
    const inReview=mine.filter(t=>t.status==="In Review");
    const blocked=mine.filter(t=>t.status==="Blocked");
    const recentDone=mine.filter(t=>t.status==="Done"&&t.lastMoved&&new Date(t.lastMoved).toISOString().slice(0,10)>=yesterday);
    lines.push(`### ${person}`);
    if(recentDone.length) { lines.push("**Yesterday:**"); recentDone.forEach(t=>lines.push(`- ✅ ${t.title}`)); }
    if(active.length) { lines.push("**Today:**"); active.forEach(t=>lines.push(`- 🔄 ${t.title}`)); }
    if(inReview.length) { lines.push("**In Review:**"); inReview.forEach(t=>lines.push(`- 👀 ${t.title}`)); }
    if(blocked.length) { lines.push("**Blocked:**"); blocked.forEach(t=>lines.push(`- 🚫 ${t.title}`)); }
    lines.push("");
  });

  const md=lines.join("\n");
  const copy=()=>{ navigator.clipboard.writeText(md); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox" style={{width:560}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:20}}>🎙</span>
          <span style={{fontWeight:600,fontSize:16}}>Standup Report</span>
          <button className="btn g sm" style={{marginLeft:"auto"}} onClick={copy}>{copied?"✓ Copied!":"Copy"}</button>
          <button className="btn g sm" onClick={onClose}>Close</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {TEAM.map(person=>{
            const mine=tasks.filter(t=>t.assignee===person);
            if(!mine.length) return null;
            const active=mine.filter(t=>t.status==="In Progress");
            const inReview=mine.filter(t=>t.status==="In Review");
            const blocked=mine.filter(t=>t.status==="Blocked");
            const recentDone=mine.filter(t=>t.status==="Done"&&t.lastMoved&&new Date(t.lastMoved).toISOString().slice(0,10)>=yesterday);
            if(!active.length&&!inReview.length&&!blocked.length&&!recentDone.length) return null;
            return(
              <div key={person} style={{background:"#12121a",border:"1px solid #1e1430",borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#2d1e5a,#b44fff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#c4b5fd"}}>{person[0]}</div>
                  <span style={{fontWeight:500,fontSize:14}}>{person}</span>
                </div>
                {recentDone.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:10,color:"#10b981",fontWeight:600,marginBottom:3}}>✅ YESTERDAY</div>{recentDone.map(t=><div key={t.id} style={{fontSize:12,color:"#6ee7b7",paddingLeft:8}}>{t.title}</div>)}</div>}
                {active.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:10,color:"#b44fff",fontWeight:600,marginBottom:3}}>▶ TODAY</div>{active.map(t=><div key={t.id} style={{fontSize:12,color:"#c4c0d8",paddingLeft:8}}>{t.title}</div>)}</div>}
                {inReview.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:10,color:"#f59e0b",fontWeight:600,marginBottom:3}}>👀 IN REVIEW</div>{inReview.map(t=><div key={t.id} style={{fontSize:12,color:"#fde68a",paddingLeft:8}}>{t.title}</div>)}</div>}
                {blocked.length>0&&<div><div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginBottom:3}}>🚫 BLOCKED</div>{blocked.map(t=><div key={t.id} style={{fontSize:12,color:"#fca5a5",paddingLeft:8}}>{t.title}</div>)}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
