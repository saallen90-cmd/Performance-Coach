const STORE_KEY="seebo_strength_v2";const LEGACY_KEYS=["seebo_strength_v15","sam_performance_coach_v5"];
function uid(p="id"){return p+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)}
function clone(o){return JSON.parse(JSON.stringify(o||{}))}
function todayKey(d=new Date()){return d.toISOString().slice(0,10)}
function kg(x){return(Number(x)||0).toFixed((Number(x)||0)%1?1:0)+"kg"}
function round2_5(x){return Math.round(x/2.5)*2.5}
function normaliseExercise(ex){
 ex=ex||{};
 const targetReps=+ex.targetReps||+ex.repMin||8;
 const type=ex.type||"custom";
 let repMin=+ex.repMin||targetReps||8;
 let repMax=+ex.repMax||Math.max(repMin,targetReps>=12?15:targetReps+4);
 if(repMax<repMin) repMax=repMin+4;
 let category=ex.category||"General";
 if(!ex.category){
   const m=(ex.muscle||"").toLowerCase();
   if(m.includes("chest")) category="Chest";
   else if(m.includes("back")||m.includes("lat")) category="Back";
   else if(m.includes("shoulder")||m.includes("delt")) category="Shoulders";
   else if(m.includes("leg")||m.includes("quad")||m.includes("glute")||m.includes("hamstring")||m.includes("calf")) category="Legs";
   else if(m.includes("bicep")||m.includes("tricep")) category="Arms";
   else if(m.includes("core")||m.includes("abs")) category="Core";
 }
 return {
  name:ex.name||"Exercise",
  key:ex.key||("custom_"+Date.now()+"_"+Math.random().toString(36).slice(2,6)),
  category,
  muscle:ex.muscle||category,
  type,
  pattern:ex.pattern||type,
  targetSets:+ex.targetSets||3,
  repMin,
  repMax,
  weight:+ex.weight||0,
  inc:+ex.inc||2.5,
  rest:+ex.rest||((type==="barbell"||ex.pattern?.includes("Push")||ex.pattern?.includes("Pull"))?150:90)
 }
}
function normaliseProgram(program){
 const p=program||BASE_PROGRAM, out={};
 Object.keys(p).forEach(k=>out[k]=(p[k]||[]).map(normaliseExercise));
 return out;
}
function buildLibrary(p){let seen={},a=[];Object.values(p).flat().forEach(e=>{if(!seen[e.key]){seen[e.key]=1;a.push(clone(e))}});return a}
function def(){let p=normaliseProgram(BASE_PROGRAM);return{schemaVersion:2,appVersion:"2.0.1",week:1,dayOverrides:{},customProgram:p,exerciseLibrary:buildLibrary(p),workoutSessions:[],runs:[],recovery:[],weights:[],alignment:[],targets:{},oneRM:{bench:105,squat:130,ohp:50,row:90},settings:{units:"kg",deloadWeeks:6}}}
function normaliseWorkoutSession(w){
 return{id:w.id||uid("workout"),date:w.date||new Date().toISOString(),name:w.name||"Workout",notes:w.notes||"",readiness:w.readiness||w.readinessId||null,stretchCompleted:w.stretchCompleted||[],volume:+w.volume||0,exercises:(w.exercises||[]).map(e=>{let ne=normaliseExercise(e);return{...ne,id:e.id||uid("ex"),progression:e.progression||null,volume:+e.volume||0,sets:(e.sets||[]).map((s,i)=>({id:s.id||uid("set"),set:i+1,weight:+s.weight||0,reps:+s.reps||0,rpe:+s.rpe||0}))}})}
}
function migrate(s){
 let d=def(); s={...d,...(s||{})}; s.schemaVersion=2; s.appVersion="2.0.1";
 s.customProgram=normaliseProgram(s.customProgram||BASE_PROGRAM);
 s.exerciseLibrary=(s.exerciseLibrary&&s.exerciseLibrary.length?s.exerciseLibrary:buildLibrary(s.customProgram)).map(normaliseExercise);
 if(!s.workoutSessions&&s.workouts)s.workoutSessions=s.workouts.map(normaliseWorkoutSession);
 s.workoutSessions=(s.workoutSessions||[]).map(normaliseWorkoutSession);
 s.runs=s.runs||[]; s.recovery=s.recovery||[]; s.weights=s.weights||[]; s.alignment=s.alignment||[]; s.dayOverrides=s.dayOverrides||{};
 s.oneRM={bench:+(s.oneRM?.bench||105),squat:+(s.oneRM?.squat||130),ohp:+(s.oneRM?.ohp||50),row:+(s.oneRM?.row||90)};
 s.settings=s.settings||d.settings;
 initTargets(s);
 localStorage.setItem(STORE_KEY,JSON.stringify(s));
 return s
}
function loadState(){
 try{
  let s=JSON.parse(localStorage.getItem(STORE_KEY)||"null"); if(s)return migrate(s);
  for(const k of LEGACY_KEYS){let o=JSON.parse(localStorage.getItem(k)||"null"); if(o)return migrate(o)}
 }catch(e){console.error("loadState failed",e)}
 return migrate(def())
}
function initTargets(s=state){
 s.targets=s.targets||{};
 Object.values(s.customProgram||{}).flat().concat(s.exerciseLibrary||[]).forEach(ex=>{
  if(!s.targets[ex.key])s.targets[ex.key]={};
  s.targets[ex.key].weight=+(s.targets[ex.key].weight ?? ex.weight ?? 0);
  s.targets[ex.key].currentRepTarget=+(s.targets[ex.key].currentRepTarget ?? ex.repMin ?? ex.targetReps ?? 8);
  s.targets[ex.key].lastReason=s.targets[ex.key].lastReason||"Initial programme weight.";
  s.targets[ex.key].lastAction=s.targets[ex.key].lastAction||"hold";
 });
}
function save(){initTargets(state);localStorage.setItem(STORE_KEY,JSON.stringify(state))}
function exportBackup(){return JSON.stringify(state,null,2)}
function importBackup(txt){state=migrate(JSON.parse(txt));save();return state}
let state=loadState();