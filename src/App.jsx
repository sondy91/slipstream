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
const STATUSES    = ["Todo","In Progress","Blocked","Done"];
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
  "Todo":        { color:"#9ca3af", dot:"#6b7280", line:"#6b7280" },
  "In Progress": { color:"#cc99ff", dot:"#b44fff", line:"#b44fff" },
  "Blocked":     { color:"#fca5a5", dot:"#ef4444", line:"#ef4444" },
  "Done":        { color:"#6ee7b7", dot:"#10b981", line:"#10b981" },
};

const EXT_STATUS_META = {
  "Pending":   { color:"#9ca3af", bg:"#140f22" },
  "In Review": { color:"#cc99ff", bg:"#1a1030" },
  "Approved":  { color:"#6ee7b7", bg:"#0a2018" },
  "Rejected":  { color:"#fca5a5", bg:"#2a1010" },
  "On Hold":   { color:"#f97316", bg:"#1e1208" },
};

function uid() { return Math.random().toString(36).slice(2,9); }
const mkTask=(o={})=>({id:uid(),title:"",assignee:TEAM[0],priority:"M",status:"Todo",milestone:MILESTONES[0],deps:[],reqDeps:[],notes:"",label:"",startDate:"",endDate:"",...o});

/* ── Seed data ── */
const S0=mkTask({title:"Design auth service API",      assignee:"Austin",priority:"H+",status:"Done",       milestone:"Sprint 1",notes:"OAuth2 + JWT",            startDate:"2025-01-06",endDate:"2025-01-10",label:"feature"});
const S1=mkTask({title:"Implement token refresh logic",assignee:"Maya",  priority:"H+",status:"In Progress",milestone:"Sprint 1",notes:"",                        startDate:"2025-01-10",endDate:"2025-01-17",label:"feature"});
const S2=mkTask({title:"Set up ArgoCD pipelines",     assignee:"Austin",priority:"H", status:"In Progress",milestone:"Sprint 1",notes:"Blocked on cluster access",startDate:"2025-01-08",endDate:"2025-01-20",label:"infra"  });
const S3=mkTask({title:"Write integration tests",     assignee:"Jordan",priority:"H", status:"Blocked",    milestone:"Sprint 1",notes:"Needs auth done",          startDate:"2025-01-15",endDate:"2025-01-22",label:"bug"    });
const S4=mkTask({title:"Deploy staging environment",  assignee:"Sam",   priority:"H", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-20",endDate:"2025-01-27",label:"infra"  });
const S5=mkTask({title:"Prometheus metrics setup",    assignee:"Riley", priority:"M", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-22",endDate:"2025-01-29",label:"infra"  });
const S6=mkTask({title:"Frontend dashboard MVP",      assignee:"Maya",  priority:"H", status:"Todo",       milestone:"Sprint 2",notes:"",                        startDate:"2025-01-24",endDate:"2025-02-05",label:"feature"});
const S7=mkTask({title:"Load testing",                assignee:"Jordan",priority:"L", status:"Todo",       milestone:"Backlog", notes:"",                        startDate:"2025-02-03",endDate:"2025-02-10",label:"bug"    });
S1.deps=[S0.id]; S3.deps=[S1.id]; S4.deps=[S2.id]; S6.deps=[S4.id]; S7.deps=[S3.id,S5.id];
const SEED_TASKS=[S0,S1,S2,S3,S4,S5,S6,S7];

const mkReq=(o={})=>({id:uid(),title:"",team:"",assignee:TEAM[0],status:"Pending",notes:"",created:new Date().toISOString().slice(0,10),...o});
const R0=mkReq({title:"API access to DataWarehouse",team:"Data Platform",assignee:"Austin",status:"In Review",notes:"Submitted Jan 8", created:"2025-01-08"});
const R1=mkReq({title:"Cloud budget increase Q1",   team:"FinOps",       assignee:"Sam",   status:"Pending",  notes:"Awaiting director sign-off",created:"2025-01-12"});
const R2=mkReq({title:"SSL cert renewal",           team:"SecOps",       assignee:"Riley", status:"Approved", notes:"Approved Jan 15",created:"2025-01-10"});
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

.vbtn{background:none;border:none;cursor:pointer;padding:6px 14px;border-radius:6px;font-family:inherit;font-size:13px;font-weight:600;color:#5a4870;transition:all .15s;letter-spacing:.04em;}
.vbtn.act{background:#140f22;color:#f0e8ff;}
.vbtn:hover:not(.act){color:#c4b5ff;}

.card{background:#0c0818;border:1px solid #1e1430;border-radius:10px;padding:12px 14px;transition:border-color .2s,box-shadow .2s,transform .15s;cursor:pointer;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;top:0;left:0;bottom:0;width:2px;background:currentColor;opacity:0;transition:opacity .2s;}
.card:hover{border-color:#b44fff55;transform:translateY(-1px);box-shadow:0 4px 24px rgba(180,79,255,.18);}
.lsrc{border-color:#b44fff!important;box-shadow:0 0 0 2px rgba(180,79,255,.3)!important;}
.ltgt:hover{border-color:#10b981!important;box-shadow:0 0 0 2px rgba(16,185,129,.3)!important;}

.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .15s;letter-spacing:.04em;}
.p{background:linear-gradient(135deg,#b44fff,#00d4ff);color:#fff;border:none;text-shadow:0 1px 4px rgba(0,0,0,.3);}.p:hover{background:linear-gradient(135deg,#a040e8,#00bfee);box-shadow:0 0 20px rgba(180,79,255,.4);}
.g{background:#140f22;color:#8a80a8;border:1px solid #1e1430;}.g:hover{background:#1a1430;color:#f0e8ff;}
.dr{background:#1e1010;color:#ef4444;border:1px solid #3a1515;}.dr:hover{background:#2a1515;}
.sm{padding:4px 10px!important;font-size:12px!important;border-radius:5px!important;}

.fl{display:flex;flex-direction:column;gap:5px;}
.fl label{font-size:11px;font-weight:600;color:#5a4870;text-transform:uppercase;letter-spacing:.06em;}
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
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;font-family:'Rajdhani',sans-serif;}
.chip{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.04em;}
`;

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

  useEffect(()=>{
    const PMAP={"P0":"H+","P1":"H","P2":"M"};
    const migrate=t=>({...t, priority: PMAP[t.priority]||t.priority, deps:t.deps||[], reqDeps:t.reqDeps||[]});
    try{ const r=localStorage.getItem("mx-tasks"); if(r) setTasks(JSON.parse(r).map(migrate)); }catch{}
    try{ const r=localStorage.getItem("mx-reqs");  if(r) setRequests(JSON.parse(r)); }catch{}
  },[]);

  const saveTasks=useCallback(t=>{ setTasks(t); try{localStorage.setItem("mx-tasks",JSON.stringify(t));}catch{} },[]);
  const saveReqs =useCallback(r=>{ setRequests(r); try{localStorage.setItem("mx-reqs", JSON.stringify(r));}catch{} },[]);

  const updateTask=(id,p)=>saveTasks(tasks.map(t=>t.id===id?{...t,...p}:t));
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
        // task → task dep
        const tgt=tasks.find(t=>t.id===itemId);
        if(tgt&&!tgt.deps.includes(linkMode.sourceId)) updateTask(itemId,{deps:[...tgt.deps,linkMode.sourceId]});
      } else if(linkMode.sourceType==="req" && itemType==="task"){
        // req → task: task blocked by request
        const tgt=tasks.find(t=>t.id===itemId);
        const cur=tgt?.reqDeps||[];
        if(tgt&&!cur.includes(linkMode.sourceId)) updateTask(itemId,{reqDeps:[...cur,linkMode.sourceId]});
      } else if(linkMode.sourceType==="task" && itemType==="req"){
        // task → req: task blocked by request
        const tgt=tasks.find(t=>t.id===linkMode.sourceId);
        const cur=tgt?.reqDeps||[];
        if(tgt&&!cur.includes(itemId)) updateTask(linkMode.sourceId,{reqDeps:[...cur,itemId]});
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

      {/* Animated streak bar */}
      <div style={{height:2,position:"relative",overflow:"hidden",background:"#0c0818",zIndex:51}}>
        <div className="nr-streak" style={{position:"absolute",top:0,width:"35%",height:"100%",background:"linear-gradient(90deg,transparent,#b44fff,#00d4ff,transparent)"}} />
      </div>

      {/* Header */}
      <div style={{borderBottom:"1px solid #1e1430",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:2,background:"rgba(6,4,15,0.92)",backdropFilter:"blur(12px)",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
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
          {[["board","⬚ Board"],["plan","⬡ Plan"],["requests","⇄ Requests"],["lead","◈ Leadership"]].map(([v,l])=>(
            <button key={v} className={`vbtn${view===v?" act":""}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn g" onClick={()=>setExportOpen(true)}>↓ Export</button>
          {view==="requests"
            ?<button className="btn p" onClick={()=>setNewReq(true)}>+ New request</button>
            :<button className="btn p" onClick={()=>setNewTask(true)}>+ New task</button>}
        </div>
      </div>

      {linkMode&&(
        <div style={{background:"#1a0d3a",borderBottom:"1px solid #5b21b6",padding:"10px 24px",display:"flex",alignItems:"center",gap:12,fontSize:13}}>
          <span style={{color:"#cc99ff"}}>🔗 Link mode —</span>
          <span style={{color:"#cc99ff"}}>
            {linkMode.sourceType==="req"
              ? <>Click a <strong>task</strong> to mark it as blocked by request "<strong>{requests.find(r=>r.id===linkMode.sourceId)?.title}</strong>"</>
              : <>Click any card to link to "<strong>{tasks.find(t=>t.id===linkMode.sourceId)?.title}</strong>"</>}
          </span>
          <button className="btn g sm" style={{marginLeft:"auto"}} onClick={()=>setLinkMode(null)}>Cancel</button>
        </div>
      )}

      <div style={{padding:"20px 24px",position:"relative",zIndex:1}}>
        {view==="board"    &&<BoardView    tasks={tasks} requests={requests} updateTask={updateTask} filterBy={filterBy} setFilterBy={setFilterBy} onCardClick={handleCardClick} linkMode={linkMode} />}
        {view==="plan"     &&<PlanView     tasks={tasks} requests={requests} onCardClick={handleCardClick} linkMode={linkMode} setLinkMode={setLinkMode} unlinkDep={unlinkDep} unlinkReqDep={unlinkReqDep} />}
        {view==="requests" &&<RequestsView requests={requests} tasks={tasks} onEdit={r=>handleCardClick(r.id,"req")} linkMode={linkMode} />}
        {view==="lead"     &&<LeaderView   tasks={tasks} requests={requests} />}
      </div>

      {newTask  &&<TaskModal task={null}    tasks={tasks} requests={requests} onSave={d=>{addTask(d);setNewTask(false);}}              onClose={()=>setNewTask(false)} />}
      {editTask &&<TaskModal task={editTask} tasks={tasks} requests={requests} onSave={d=>{updateTask(editTask.id,d);setEditTask(null);}} onDelete={()=>{deleteTask(editTask.id);setEditTask(null);}} onLink={()=>{setLinkMode({sourceId:editTask.id,sourceType:"task"});setEditTask(null);}} unlinkDep={unlinkDep} unlinkReqDep={unlinkReqDep} onClose={()=>setEditTask(null)} />}
      {newReq   &&<ReqModal  req={null}    tasks={tasks} onToggleTask={(tid,rid,on)=>{ const t=tasks.find(x=>x.id===tid); if(!t) return; const cur=t.reqDeps||[]; updateTask(tid,{reqDeps:on?[...cur,rid]:cur.filter(d=>d!==rid)}); }} onSave={d=>{addReq(d);setNewReq(false);}} onClose={()=>setNewReq(false)} />}
      {editReq  &&<ReqModal  req={editReq} tasks={tasks} onToggleTask={(tid,rid,on)=>{ const t=tasks.find(x=>x.id===tid); if(!t) return; const cur=t.reqDeps||[]; updateTask(tid,{reqDeps:on?[...cur,rid]:cur.filter(d=>d!==rid)}); }} onSave={d=>{updateReq(editReq.id,d);setEditReq(null);}} onDelete={()=>{deleteReq(editReq.id);setEditReq(null);}} onClose={()=>setEditReq(null)} />}
      {exportOpen&&<ExportModal md={exportMd()} onClose={()=>setExportOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOARD
═══════════════════════════════════════════════════════════════ */
function BoardView({ tasks, requests, updateTask, filterBy, setFilterBy, onCardClick, linkMode }) {
  const [activeId, setActiveId] = useState(null);
  const filtered = filterBy==="All" ? tasks : tasks.filter(t=>t.assignee===filterBy);
  const cols = STATUSES.map(s=>({key:s, label:s, items:filtered.filter(t=>t.status===s), dot:STATUS_META[s].dot}));
  const activeTask = tasks.find(t=>t.id===activeId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:6 } }));

  return(
    <DndContext
      sensors={sensors}
      onDragStart={({active})=>setActiveId(active.id)}
      onDragEnd={({active,over})=>{
        if(over && over.id !== tasks.find(t=>t.id===active.id)?.status) updateTask(active.id,{status:over.id});
        setActiveId(null);
      }}
      onDragCancel={()=>setActiveId(null)}
    >
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"#5a4870"}}>Assignee:</span>
          {["All",...TEAM].map(a=>(
            <button key={a} onClick={()=>setFilterBy(a)} style={{padding:"4px 12px",borderRadius:6,border:"1px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .15s",background:filterBy===a?"#b44fff":"#100820",borderColor:filterBy===a?"#b44fff":"#1e1430",color:filterBy===a?"#fff":"#7a7890"}}>{a}</button>
          ))}
          <span style={{marginLeft:"auto",fontSize:12,color:"#444458"}}>{filtered.length} tasks</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${cols.length},1fr)`,gap:12}}>
          {cols.map(col=>(
            <DroppableColumn key={col.key} col={col} requests={requests} linkMode={linkMode} onCardClick={onCardClick} activeId={activeId} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <BoardCardContent task={activeTask} requests={requests} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ col, requests, linkMode, onCardClick, activeId }) {
  const {setNodeRef, isOver} = useDroppable({id: col.key});
  return(
    <div ref={setNodeRef} className={isOver?"dc":""} style={{background:"#080610",border:`1px solid ${isOver?"#b44fff55":"#140f22"}`,borderRadius:12,padding:12,minHeight:280,transition:"border-color .15s, box-shadow .15s",boxShadow:isOver?"0 0 0 1px #b44fff33, inset 0 0 20px rgba(180,79,255,0.04)":"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:"1px solid #140f22"}}>
        <span className="dot" style={{background:col.dot}}></span>
        <span style={{fontSize:12,fontWeight:600,color:"#8a80a8",letterSpacing:".05em",textTransform:"uppercase"}}>{col.label}</span>
        <span style={{marginLeft:"auto",background:"#140f22",borderRadius:4,padding:"1px 7px",fontSize:11,color:"#5a4870"}}>{col.items.length}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {col.items.map(task=>(
          <DraggableCard key={task.id} task={task} requests={requests} linkMode={linkMode} onCardClick={onCardClick} isDragging={activeId===task.id} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ task, requests, linkMode, onCardClick, isDragging }) {
  const {attributes, listeners, setNodeRef} = useDraggable({id: task.id});
  return(
    <div
      ref={setNodeRef}
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
  return(
    <div className={`card${isSrc?" lsrc":""}${isTgt?" ltgt":""}`} style={isOverlay?{boxShadow:"0 12px 40px rgba(180,79,255,0.3)",border:"1px solid #b44fff88",cursor:"grabbing"}:{}}>
      {/* Status-colored left glow bar */}
      <div style={{position:"absolute",top:0,left:0,bottom:0,width:2,background:sm.line,boxShadow:`0 0 8px ${sm.line}`,borderRadius:"10px 0 0 10px"}} />
      <div style={{paddingLeft:6,display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
        <span style={{fontSize:13,fontWeight:500,lineHeight:1.4,color:task.status==="Done"?"#3a3055":"#f0e8ff",textDecoration:task.status==="Done"?"line-through":"none",flex:1}}>{task.title}</span>
        <span className="badge" style={{background:pm.bg,color:pm.color,flexShrink:0}}>{task.priority}</span>
      </div>
      <div style={{paddingLeft:6,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:blockedReqs.length?6:0}}>
        <span style={{fontSize:11,color:"#5a4870",background:"#100820",padding:"2px 8px",borderRadius:4}}>{task.assignee}</span>
        {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,border:`1px solid ${lm.color}44`}}>{task.label}</span>}
        {(task.deps||[]).length>0&&<span style={{fontSize:11,color:"#b44fff"}}>⬡ {task.deps.length}</span>}
        {blockedReqs.length>0&&<span style={{fontSize:11,color:"#f97316"}}>⇄ {blockedReqs.length}</span>}
      </div>
      {blockedReqs.map(r=>(
        <div key={r.id} style={{fontSize:11,color:"#f97316",background:"#1e1208",padding:"2px 8px",borderRadius:4,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
          <span>⇄</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
        </div>
      ))}
      {task.notes&&<div style={{marginTop:7,fontSize:11,color:"#3a3055",lineHeight:1.4,borderTop:"1px solid #140f22",paddingTop:7}}>{task.notes}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLAN VIEW — smooth animation via stable SVG element keys
═══════════════════════════════════════════════════════════════ */
function PlanView({ tasks, requests, onCardClick, linkMode, setLinkMode, unlinkDep, unlinkReqDep }) {
  const [layout,setLayout]=useState({});
  const [reqLayout,setReqLayout]=useState({});
  const [hov,setHov]=useState(null);
  const CW=210,CH=78,RW=170,RH=52,HG=80,VG=28;

  useEffect(()=>{
    // Topo sort tasks
    const lvl={};
    tasks.forEach(t=>{lvl[t.id]=0;});
    let ch=true;
    while(ch){ch=false;tasks.forEach(t=>(t.deps||[]).forEach(d=>{if((lvl[d]||0)>=(lvl[t.id]||0)){lvl[t.id]=(lvl[d]||0)+1;ch=true;}}));}
    const byLvl={};
    tasks.forEach(t=>{const l=lvl[t.id]||0;if(!byLvl[l])byLvl[l]=[];byLvl[l].push(t.id);});
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
  },[tasks,requests]);

  const allPos={...layout,...reqLayout};
  const maxX=Math.max(...Object.values(allPos).map(p=>p.x+Math.max(CW,RW)),600)+60;
  const maxY=Math.max(...Object.values(allPos).map(p=>p.y+Math.max(CH,RH)),400)+60;

  // Build edges: task→task and req→task
  const taskEdges=[];
  tasks.forEach(t=>(t.deps||[]).forEach(did=>{
    const dep=tasks.find(x=>x.id===did);
    if(dep) taskEdges.push({fromId:did,toId:t.id,fromType:"task",toType:"task",color:STATUS_META[dep.status].line});
  }));
  const reqEdges=[];
  tasks.forEach(t=>(t.reqDeps||[]).forEach(rid=>{
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
        <span style={{fontSize:13,color:"#7a7890"}}>Line color = source status. Hover to unlink. Orange lines = request blockers.</span>
        <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          {Object.entries(STATUS_META).map(([s,m])=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#7a7890"}}>
              <span style={{display:"block",width:18,height:2,background:m.line,borderRadius:1}}></span>{s}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#f97316"}}>
            <span style={{display:"block",width:18,height:2,background:"#f97316",borderRadius:1}}></span>Request
          </div>
        </div>
      </div>
      {requests.length>0&&<div style={{fontSize:11,color:"#5a4870",marginBottom:10}}>⇄ Requests shown below tasks — orange lines connect them to blocked tasks.</div>}

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
          {tasks.map(task=>{
            const pos=layout[task.id]; if(!pos) return null;
            const isSrc=linkMode?.sourceId===task.id, isTgt=linkMode&&!isSrc;
            const pm=PRIORITY_META[task.priority]||PRIORITY_META["M"];
            const sm=STATUS_META[task.status];
            const lm=task.label?LABEL_META[task.label]:null;
            return(
              <div key={task.id} style={{position:"absolute",left:pos.x,top:pos.y,width:CW,background:"#0c0818",border:`1px solid ${isSrc?"#b44fff":isTgt?"#10b981":"#23232e"}`,borderRadius:9,padding:"10px 12px",cursor:"pointer",transition:"border-color .15s,box-shadow .15s",boxShadow:isSrc?"0 0 0 2px rgba(180,79,255,.3)":isTgt?"0 0 0 2px rgba(16,185,129,.2)":""}}
                onClick={()=>onCardClick(task.id,"task")}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:500,lineHeight:1.35,color:task.status==="Done"?"#3a3055":"#e0ddf0",flex:1}}>{task.title}</span>
                  <span className="badge" style={{background:pm.bg,color:pm.color,fontSize:10}}>{task.priority}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span className="dot" style={{background:sm.dot,width:6,height:6}}></span>
                  <span style={{fontSize:11,color:sm.color}}>{task.status}</span>
                  {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,fontSize:10}}>{task.label}</span>}
                  <span style={{marginLeft:"auto",fontSize:11,color:"#3a3055"}}>{task.assignee}</span>
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
              <div key={req.id} style={{position:"absolute",left:pos.x,top:pos.y,width:RW,background:"#14120a",border:`1px solid ${isSrc?"#b44fff":isTgt?"#10b981":"#2a1e0a"}`,borderRadius:8,padding:"8px 10px",cursor:linkMode&&!isTgt&&!isSrc?"default":"pointer",transition:"border-color .15s,box-shadow .15s",boxShadow:isTgt?"0 0 0 2px rgba(16,185,129,.2)":isSrc?"0 0 0 2px rgba(180,79,255,.3)":""}}>
                <div style={{fontSize:10,color:"#6b5a30",textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>⇄ Request</div>
                <div style={{fontSize:11,fontWeight:500,color:"#e0c97a",lineHeight:1.3,marginBottom:5}}>{req.title}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:sm.bg,color:sm.color}}>{req.status}</span>
                  {!linkMode&&(
                    <button
                      className="btn g sm"
                      style={{fontSize:10,padding:"2px 7px",color:"#f97316",borderColor:"#3a2010"}}
                      onClick={e=>{e.stopPropagation();setLinkMode({sourceId:req.id,sourceType:"req"});}}>
                      🔗
                    </button>
                  )}
                  {isTgt&&<div style={{fontSize:10,color:"#10b981"}}>Click to link</div>}
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
            <button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 14px",borderRadius:20,border:"1px solid",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .15s",background:act?m.bg:"transparent",borderColor:act?m.color:"#1e1430",color:act?m.color:"#5a4870",display:"flex",alignItems:"center",gap:6}}>
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
            <div key={req.id} className="card" onClick={()=>onEdit(req)} style={{background:"#080610",border:"1px solid #140f22",borderRadius:10,padding:"14px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:linkedTasks.length||req.notes?6:0}}>
                    <span style={{fontWeight:500,fontSize:14}}>{req.title}</span>
                    <span style={{fontSize:11,color:"#5a4870",background:"#100820",padding:"2px 8px",borderRadius:4}}>{req.team}</span>
                  </div>
                  {req.notes&&<div style={{fontSize:12,color:"#3a3055",marginBottom:linkedTasks.length?6:0}}>{req.notes}</div>}
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
                  <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,background:m.bg,color:m.color,border:`1px solid ${m.color}55`}}>{req.status}</span>
                  <span style={{fontSize:12,color:"#5a4870"}}>{req.assignee}</span>
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
          {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,fontSize:9}}>{task.label}</span>}
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

function TaskModal({ task, tasks, requests, onSave, onDelete, onLink, unlinkDep, unlinkReqDep, onClose }) {
  const isEdit=!!task;
  const [form,setForm]=useState(isEdit?{...task}:{title:"",assignee:TEAM[0],priority:"M",status:"Todo",milestone:MILESTONES[0],deps:[],reqDeps:[],notes:"",label:"",startDate:"",endDate:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const depNames=(form.deps||[]).map(id=>({id,title:tasks.find(t=>t.id===id)?.title||id}));
  const reqDepNames=(form.reqDeps||[]).map(id=>({id,title:requests.find(r=>r.id===id)?.title||id}));

  return(
    <div className="mbg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox">
        <div style={{fontWeight:600,fontSize:16,marginBottom:20}}>{isEdit?"Edit task":"New task"}</div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <F label="Title"><input className="inp" placeholder="Task title" value={form.title} onChange={e=>set("title",e.target.value)} autoFocus /></F>
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
            <div></div>
            <F label="Start date"><input type="date" className="inp" value={form.startDate||""} onChange={e=>set("startDate",e.target.value)} style={{colorScheme:"dark"}} /></F>
            <F label="End date"><input type="date" className="inp" value={form.endDate||""} onChange={e=>set("endDate",e.target.value)} style={{colorScheme:"dark"}} /></F>
          </div>
          <F label="Notes"><textarea className="inp" placeholder="Optional notes…" value={form.notes} onChange={e=>set("notes",e.target.value)} /></F>
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
  const [form,setForm]=useState(isEdit?{...req}:{title:"",team:"",assignee:TEAM[0],status:"Pending",notes:"",created:new Date().toISOString().slice(0,10)});
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
                            {lm&&<span className="chip" style={{background:lm.bg,color:lm.color,fontSize:10}}>{t.label}</span>}
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
