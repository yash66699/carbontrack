import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import * as authApi from "./api/auth";
import * as entriesApi from "./api/entries";
import * as goalsApi from "./api/goals";
import * as usersApi from "./api/users";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const G = {
  forest:"#1a3a2a",moss:"#2d5a3d",fern:"#3d7a52",sage:"#5a9e6f",
  mint:"#7dc49a",lime:"#b4e4c2",cream:"#f4f9f5",white:"#ffffff",
  carbon:"#0f1f16",slate:"#1e3528",mist:"#e8f4ed",
  amber:"#d4a853",ember:"#c45c3a",sky:"#4a9ebb",
  danger:"#e05252",warn:"#e8a837",good:"#3db87a",
};

// ─── EMISSION FACTORS ──────────────────────────────────────────────────────────
const EMISSION_FACTORS = {
  Transportation:{"Car (Petrol)":0.21,"Car (Diesel)":0.17,"Bus":0.089,"Train":0.041,"Flight (Domestic)":0.255,"Bicycle":0,"Walking":0},
  Energy:{"Electricity (kWh)":0.233,"Natural Gas (m³)":2.04,"Heating Oil (L)":2.52,"LPG (L)":1.51},
  Diet:{"Beef (100g)":2.7,"Chicken (100g)":0.69,"Fish (100g)":0.5,"Vegetables (100g)":0.15,"Dairy (100ml)":0.32},
  Waste:{"Landfill (kg)":0.57,"Recycled (kg)":0.02,"Composted (kg)":0.01},
  Shopping:{"Electronics (item)":70,"Clothing (item)":8,"Furniture (item)":40},
};

const CATEGORY_COLORS = {Transportation:"#4a9ebb",Energy:"#d4a853",Diet:"#3db87a",Waste:"#c45c3a",Shopping:"#9b6bb5"};
const NATIONAL_AVERAGES = {Transportation:220,Energy:180,Diet:150,Waste:30,Shopping:90,Total:670};

// ─── OFFSET PROGRAMS ───────────────────────────────────────────────────────────
const OFFSET_PROGRAMS = [
  {
    id:"trees",
    icon:"🌳",
    title:"Plant Native Trees",
    org:"Eden Reforestation Projects",
    description:"Fund the planting of native trees in deforested regions. Each tree absorbs ~21 kg CO₂ per year over its lifetime.",
    kgPerUnit:21,
    unitLabel:"tree",
    unitCost:"~₹150 equivalent pledge",
    color:"#3db87a",
    impact:"Each tree you pledge sequesters carbon for 50+ years.",
  },
  {
    id:"solar",
    icon:"☀️",
    title:"Community Solar Energy",
    org:"Solar Aid",
    description:"Support solar lantern distribution in off-grid communities, replacing kerosene. Each unit offsets ~50 kg CO₂ annually.",
    kgPerUnit:50,
    unitLabel:"solar unit",
    unitCost:"~₹500 equivalent pledge",
    color:"#d4a853",
    impact:"Replaces kerosene fuel and improves air quality for families.",
  },
  {
    id:"cookstove",
    icon:"🍃",
    title:"Clean Cookstoves",
    org:"Paradigm Project",
    description:"Fund efficient cookstoves for rural households. Each stove reduces wood use by 70%, saving ~250 kg CO₂ per year.",
    kgPerUnit:250,
    unitLabel:"cookstove",
    unitCost:"~₹2,000 equivalent pledge",
    color:"#c45c3a",
    impact:"Also reduces indoor air pollution and protects forests from deforestation.",
  },
  {
    id:"wind",
    icon:"💨",
    title:"Wind Energy Credits",
    org:"Gold Standard",
    description:"Purchase renewable energy certificates from verified wind farms. Each credit represents 1,000 kg of clean energy generation.",
    kgPerUnit:1000,
    unitLabel:"energy credit",
    unitCost:"~₹800 equivalent pledge",
    color:"#4a9ebb",
    impact:"Directly displaces coal power from the energy grid.",
  },
];

// ─── TIPS DB ───────────────────────────────────────────────────────────────────
const TIPS_DB = {
  Transportation:[
    {title:"Switch to Public Transit",desc:"Taking the bus or train instead of driving once a week can save up to 20 kg CO₂e monthly.",icon:"🚌",impact:"High"},
    {title:"Carpool with Colleagues",desc:"Sharing rides with just one other person cuts your commute emissions in half.",icon:"🚗",impact:"High"},
    {title:"Try Cycling for Short Trips",desc:"Trips under 5km by bicycle save ~1 kg CO₂e each compared to a petrol car.",icon:"🚴",impact:"Medium"},
    {title:"Work From Home When Possible",desc:"One WFH day per week can eliminate ~15 kg CO₂e monthly from your commute.",icon:"🏠",impact:"High"},
  ],
  Energy:[
    {title:"Lower Your Thermostat 2°C",desc:"Reducing heating by 2°C saves approximately 10% on your heating bill and emissions.",icon:"🌡️",impact:"High"},
    {title:"Switch to LED Lighting",desc:"LEDs use 75% less energy than incandescent bulbs and last 25 times longer.",icon:"💡",impact:"Medium"},
    {title:"Unplug Idle Electronics",desc:"Standby power accounts for up to 10% of home electricity use.",icon:"🔌",impact:"Medium"},
    {title:"Wash Clothes in Cold Water",desc:"90% of washing machine energy goes to heating water. Cold cycles save ~0.6 kg CO₂e per load.",icon:"🧺",impact:"Medium"},
  ],
  Diet:[
    {title:"Try One Meat-Free Day Weekly",desc:"A single plant-based day per week saves approximately 12 kg CO₂e monthly.",icon:"🥗",impact:"High"},
    {title:"Reduce Beef Consumption",desc:"Swapping beef to chicken saves 2 kg CO₂e per 100g.",icon:"🥩",impact:"High"},
    {title:"Buy Local & Seasonal Produce",desc:"Local food eliminates refrigerated shipping, cutting food miles by 90%.",icon:"🛒",impact:"Medium"},
    {title:"Try Plant-Based Protein",desc:"Legumes emit 20-50x less CO₂e than equivalent beef protein.",icon:"🌱",impact:"High"},
  ],
  Waste:[
    {title:"Start a Home Compost",desc:"Composting food scraps reduces methane from landfill.",icon:"🌿",impact:"High"},
    {title:"Recycle Correctly",desc:"Contaminated recycling goes to landfill. Rinse and check your local guidelines.",icon:"♻️",impact:"Medium"},
    {title:"Repair Before Replacing",desc:"Fixing electronics and clothing prevents 70-80 kg CO₂e per item.",icon:"🔧",impact:"High"},
  ],
  Shopping:[
    {title:"Buy Less, Buy Better",desc:"One high-quality item that lasts 10 years beats 5 cheaper replacements.",icon:"🎯",impact:"High"},
    {title:"Choose Energy-Efficient Appliances",desc:"A+++ rated appliances use up to 60% less energy than standard models.",icon:"⚡",impact:"High"},
    {title:"Rent or Borrow Rarely-Used Items",desc:"Tools and camping gear can be rented, avoiding 100% of manufacturing emissions.",icon:"🤝",impact:"Medium"},
  ],
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function validateEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
function validatePassword(p){return p&&p.length>=6;}

function generateSmartTips(entries,count=6){
  if(!entries||entries.length===0)return[];
  const byCat={};
  entries.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+Number(e.emissions);});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const tips=[];const used=new Set();
  for(const[cat]of sorted){
    const pool=(TIPS_DB[cat]||[]).filter(t=>!used.has(t.title));
    if(pool.length>0){const pick=pool[Math.floor(Math.random()*Math.min(pool.length,3))];tips.push({...pick,category:cat});used.add(pick.title);}
    if(tips.length>=count)break;
  }
  for(const[cat,pool]of Object.entries(TIPS_DB)){
    for(const tip of pool){if(!used.has(tip.title)){tips.push({...tip,category:cat});used.add(tip.title);if(tips.length>=count)break;}}
    if(tips.length>=count)break;
  }
  return tips;
}

// Calculate logging streak
function calcStreak(entries){
  if(!entries||entries.length===0)return 0;
  const days=new Set(entries.map(e=>(e.date||"").split("T")[0]));
  let streak=0;
  const today=new Date();
  for(let i=0;i<365;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const k=d.toISOString().split("T")[0];
    if(days.has(k))streak++;
    else if(i>0)break;
  }
  return streak;
}

// ─── CERTIFICATE GENERATOR ─────────────────────────────────────────────────────
function generateCertificateHTML(pledge, userName) {
  const prog = OFFSET_PROGRAMS.find(p => p.id === pledge.programId);
  const date = new Date(pledge.date).toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"});
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Carbon Offset Certificate</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500&display=swap');
  body{margin:0;padding:40px;background:#f4f9f5;font-family:'DM Sans',sans-serif;}
  .cert{max-width:680px;margin:0 auto;background:#fff;border:3px solid #3d7a52;border-radius:20px;padding:48px;text-align:center;position:relative;}
  .cert::before{content:'';position:absolute;inset:8px;border:1px solid #b4e4c2;border-radius:14px;pointer-events:none;}
  .logo{font-size:48px;margin-bottom:8px;}
  .brand{font-family:'Playfair Display',serif;font-size:22px;color:#2d5a3d;letter-spacing:1px;}
  .headline{font-family:'Playfair Display',serif;font-size:32px;color:#1a3a2a;margin:24px 0 8px;}
  .subline{font-size:15px;color:#5a9e6f;margin-bottom:32px;}
  .name{font-family:'Playfair Display',serif;font-size:38px;color:#3d7a52;margin:16px 0;}
  .action{font-size:18px;color:#1a3a2a;margin:24px 0;line-height:1.6;}
  .amount{font-family:'Playfair Display',serif;font-size:52px;color:#3db87a;margin:8px 0;}
  .amount-label{font-size:14px;color:#5a9e6f;margin-bottom:32px;}
  .divider{height:2px;background:linear-gradient(90deg,transparent,#b4e4c2,transparent);margin:24px 0;}
  .org{font-size:13px;color:#888;margin-top:8px;}
  .footer{margin-top:32px;padding-top:20px;border-top:1px solid #e8f4ed;font-size:12px;color:#aaa;}
  .cert-id{font-family:monospace;font-size:11px;color:#ccc;margin-top:8px;}
  .seal{display:inline-block;background:#e8f4ed;border:2px solid #3d7a52;border-radius:50%;width:80px;height:80px;line-height:80px;font-size:36px;margin-top:24px;}
</style>
</head>
<body>
<div class="cert">
  <div class="logo">🌿</div>
  <div class="brand">CarbonTrack</div>
  <div class="headline">Carbon Offset Certificate</div>
  <div class="subline">This certifies that</div>
  <div class="name">${userName}</div>
  <div class="action">has pledged to offset their carbon footprint through</div>
  <div style="font-size:20px;font-weight:600;color:#2d5a3d;margin:8px 0;">${prog.icon} ${prog.title}</div>
  <div class="org">in partnership with ${prog.org}</div>
  <div class="divider"></div>
  <div class="amount-label">CARBON OFFSET COMMITMENT</div>
  <div class="amount">${pledge.totalKg.toFixed(1)} kg</div>
  <div class="amount-label">CO₂e pledged for ${pledge.units} ${pledge.units===1?prog.unitLabel:prog.unitLabel+'s'}</div>
  <div class="divider"></div>
  <div class="seal">✓</div>
  <div class="footer">
    <strong>Date of Pledge:</strong> ${date}<br>
    <strong>Impact:</strong> ${prog.impact}
    <div class="cert-id">Certificate ID: CT-${pledge.id.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}</div>
  </div>
</div>
</body>
</html>`;
}

// ─── CSS ───────────────────────────────────────────────────────────────────────
const css=`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --forest:#1a3a2a;--moss:#2d5a3d;--fern:#3d7a52;--sage:#5a9e6f;--mint:#7dc49a;--lime:#b4e4c2;
    --cream:#f4f9f5;--white:#fff;--carbon:#0f1f16;--slate:#1e3528;--mist:#e8f4ed;
    --amber:#d4a853;--ember:#c45c3a;--sky:#4a9ebb;--danger:#e05252;--warn:#e8a837;--good:#3db87a;
    --radius:14px;--shadow:0 4px 24px rgba(15,31,22,.12);
  }
  body{font-family:'DM Sans',sans-serif;background:var(--carbon);color:var(--cream);min-height:100vh;}
  .app-shell{display:flex;min-height:100vh;}
  .sidebar{width:260px;min-height:100vh;background:var(--slate);display:flex;flex-direction:column;border-right:1px solid rgba(93,158,111,.15);flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;}
  .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(93,158,111,.12);}
  .logo-icon{font-size:28px;margin-bottom:4px;}
  .logo-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--mint);}
  .logo-sub{font-size:11px;color:var(--sage);letter-spacing:1.2px;text-transform:uppercase;margin-top:2px;}
  .sidebar-nav{padding:16px 12px;flex:1;}
  .nav-section{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sage);padding:12px 12px 6px;opacity:.7;}
  .nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:rgba(244,249,245,.65);transition:all .2s;margin-bottom:2px;}
  .nav-item:hover{background:rgba(93,158,111,.12);color:var(--cream);}
  .nav-item.active{background:rgba(93,158,111,.2);color:var(--mint);}
  .nav-icon{font-size:18px;width:22px;text-align:center;}
  .streak-badge{margin-left:auto;background:rgba(212,168,83,.2);color:var(--amber);font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;}
  .sidebar-footer{padding:16px 12px;border-top:1px solid rgba(93,158,111,.12);}
  .user-chip{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(93,158,111,.1);border-radius:10px;}
  .user-avatar{width:34px;height:34px;border-radius:50%;background:var(--fern);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--cream);flex-shrink:0;}
  .user-name{font-size:13px;font-weight:500;color:var(--cream);}
  .user-email{font-size:11px;color:var(--sage);}
  .logout-btn{margin-top:8px;width:100%;padding:8px;border:1px solid rgba(93,158,111,.2);background:transparent;color:var(--sage);border-radius:8px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;transition:all .2s;}
  .logout-btn:hover{background:rgba(224,82,82,.12);color:var(--danger);border-color:rgba(224,82,82,.3);}
  .main-content{flex:1;padding:32px;overflow-y:auto;min-width:0;}
  .page-header{margin-bottom:28px;}
  .page-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:var(--cream);}
  .page-subtitle{font-size:14px;color:var(--sage);margin-top:4px;}
  .card{background:var(--slate);border-radius:var(--radius);border:1px solid rgba(93,158,111,.12);padding:24px;box-shadow:var(--shadow);}
  .card-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--cream);margin-bottom:4px;}
  .card-sub{font-size:12px;color:var(--sage);}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
  .col-span-2{grid-column:span 2;}
  .stat-card{display:flex;flex-direction:column;gap:6px;}
  .stat-value{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:var(--mint);line-height:1;}
  .stat-unit{font-size:14px;color:var(--sage);font-weight:400;}
  .stat-label{font-size:13px;color:var(--sage);}
  .form-group{margin-bottom:18px;}
  .form-label{display:block;font-size:13px;font-weight:500;color:var(--sage);margin-bottom:6px;}
  .form-input,.form-select{width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid rgba(93,158,111,.2);background:rgba(15,31,22,.4);color:var(--cream);font-size:14px;font-family:'DM Sans',sans-serif;transition:all .2s;outline:none;}
  .form-input:focus,.form-select:focus{border-color:var(--fern);background:rgba(15,31,22,.6);}
  .form-input.error{border-color:var(--danger);}
  .form-input::placeholder{color:rgba(90,158,111,.5);}
  .form-select option{background:var(--slate);}
  .form-error{font-size:12px;color:var(--danger);margin-top:5px;}
  .btn{padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
  .btn-primary{background:var(--fern);color:var(--cream);}
  .btn-primary:hover{background:var(--sage);transform:translateY(-1px);box-shadow:0 4px 16px rgba(61,122,82,.35);}
  .btn-outline{background:transparent;color:var(--mint);border:1.5px solid rgba(93,158,111,.35);}
  .btn-outline:hover{background:rgba(93,158,111,.1);}
  .btn-danger{background:rgba(224,82,82,.15);color:var(--danger);border:1px solid rgba(224,82,82,.3);}
  .btn-sm{padding:7px 14px;font-size:13px;}
  .btn-full{width:100%;justify-content:center;}
  .btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .tab-group{display:flex;background:rgba(15,31,22,.5);border-radius:10px;padding:4px;width:fit-content;}
  .tab-btn{padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;border:none;background:transparent;color:var(--sage);font-family:'DM Sans',sans-serif;transition:all .2s;}
  .tab-btn.active{background:var(--moss);color:var(--mint);}
  .progress-wrap{background:rgba(15,31,22,.5);border-radius:100px;height:10px;overflow:hidden;}
  .progress-bar{height:100%;border-radius:100px;transition:width .6s ease;}
  .progress-good{background:linear-gradient(90deg,var(--fern),var(--good));}
  .progress-warn{background:linear-gradient(90deg,var(--amber),var(--warn));}
  .progress-danger{background:linear-gradient(90deg,var(--ember),var(--danger));}
  .auth-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--carbon);background-image:radial-gradient(ellipse 60% 50% at 30% 50%,rgba(45,90,61,.18) 0%,transparent 70%);}
  .auth-card{width:440px;}
  .auth-logo{text-align:center;margin-bottom:32px;}
  .auth-icon{font-size:48px;margin-bottom:8px;}
  .auth-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--mint);}
  .auth-desc{font-size:14px;color:var(--sage);margin-top:4px;}
  .auth-tabs{display:flex;margin-bottom:28px;border-bottom:1.5px solid rgba(93,158,111,.15);}
  .auth-tab{flex:1;text-align:center;padding:10px;font-size:14px;font-weight:600;cursor:pointer;color:var(--sage);border-bottom:2.5px solid transparent;margin-bottom:-1.5px;transition:all .2s;}
  .auth-tab.active{color:var(--mint);border-bottom-color:var(--mint);}
  .alert{padding:12px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;display:flex;gap:10px;align-items:flex-start;}
  .alert-error{background:rgba(224,82,82,.12);border:1px solid rgba(224,82,82,.2);color:#f0a0a0;}
  .alert-success{background:rgba(61,184,122,.12);border:1px solid rgba(61,184,122,.2);color:#80e0aa;}
  .alert-info{background:rgba(74,158,187,.12);border:1px solid rgba(74,158,187,.2);color:#90d0e8;}
  .alert-warn{background:rgba(232,168,55,.12);border:1px solid rgba(232,168,55,.2);color:#e8c870;}
  .divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--sage);font-size:12px;}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(93,158,111,.15);}
  .data-table{width:100%;border-collapse:collapse;}
  .data-table th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--sage);padding:10px 14px;text-align:left;border-bottom:1px solid rgba(93,158,111,.15);}
  .data-table td{font-size:13px;padding:11px 14px;border-bottom:1px solid rgba(93,158,111,.08);color:var(--cream);vertical-align:middle;}
  .data-table tr:hover td{background:rgba(93,158,111,.05);}
  .empty-state{text-align:center;padding:48px 24px;color:var(--sage);}
  .empty-icon{font-size:48px;margin-bottom:12px;}
  .empty-title{font-size:16px;font-weight:600;color:var(--cream);margin-bottom:4px;}
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;}
  .modal-box{background:var(--slate);border-radius:var(--radius);border:1px solid rgba(93,158,111,.2);padding:28px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;}
  .modal-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--cream);margin-bottom:20px;}
  ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(93,158,111,.3);border-radius:3px;}
  .toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
  .toast{padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideIn .3s ease;display:flex;align-items:center;gap:10px;}
  .toast-success{background:var(--moss);color:var(--mint);border:1px solid rgba(93,158,111,.3);}
  .toast-error{background:rgba(30,20,20,.95);color:#f0a0a0;border:1px solid rgba(224,82,82,.3);}
  @keyframes slideIn{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .4s ease;}
  .flex-between{display:flex;justify-content:space-between;align-items:center;}
  .flex-gap{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
  .mt-4{margin-top:16px;}.mb-4{margin-bottom:16px;}.mb-2{margin-bottom:8px;}
  .text-sm{font-size:13px;}.text-xs{font-size:11px;}.text-muted{color:var(--sage);}
  .text-good{color:var(--good);}.text-danger{color:var(--danger);}.text-amber{color:var(--amber);}
  .w-full{width:100%;}.separator{height:1px;background:rgba(93,158,111,.1);margin:20px 0;}
  .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;}
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;}
  .spinner{width:40px;height:40px;border:3px solid rgba(93,158,111,.2);border-top-color:var(--mint);border-radius:50%;animation:spin .8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .tip-card{background:rgba(15,31,22,.5);border:1px solid rgba(93,158,111,.15);border-radius:12px;padding:18px;transition:all .2s;}
  .tip-card:hover{border-color:rgba(93,158,111,.3);}
  .tip-title{font-size:14px;font-weight:600;color:var(--cream);margin-bottom:6px;}
  .tip-desc{font-size:13px;color:var(--sage);line-height:1.5;}
  .tip-impact{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;width:fit-content;margin-top:8px;}
  .impact-High{background:rgba(61,184,122,.15);color:var(--good);}
  .impact-Medium{background:rgba(212,168,83,.15);color:var(--amber);}
  .league-card{background:rgba(15,31,22,.4);border:1px solid rgba(93,158,111,.15);border-radius:10px;padding:14px;}
  .gps-pulse{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--danger);animation:gpsbeat 1.2s infinite;}
  @keyframes gpsbeat{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
  .offset-card{border:1.5px solid rgba(93,158,111,.15);border-radius:14px;padding:20px;background:rgba(15,31,22,.4);transition:all .2s;cursor:pointer;}
  .offset-card:hover{border-color:rgba(93,158,111,.4);background:rgba(15,31,22,.6);}
  .offset-card.selected{border-color:var(--fern);background:rgba(61,122,82,.12);}
  .cert-preview{background:linear-gradient(135deg,rgba(45,90,61,.3),rgba(15,31,22,.5));border:2px solid rgba(93,158,111,.3);border-radius:16px;padding:32px;text-align:center;}
  .balance-bar{height:12px;background:rgba(15,31,22,.5);border-radius:100px;overflow:hidden;margin-top:8px;}
  .balance-fill{height:100%;border-radius:100px;transition:width .8s ease;}
  .mode-walk{background:rgba(61,184,122,.15);color:var(--good);}
  .mode-cycle{background:rgba(74,158,187,.15);color:var(--sky);}
  .mode-drive{background:rgba(212,168,83,.15);color:var(--amber);}
  .mode-idle{background:rgba(93,158,111,.1);color:var(--sage);}
  textarea.form-input{resize:vertical;min-height:80px;}
  @media print{
    .no-print{display:none!important;}.sidebar{display:none!important;}.main-content{padding:0!important;}
    body{background:#fff!important;color:#000!important;}
    .card{background:#fff!important;border:1px solid #ddd!important;}
    .page-title{color:#2d5a3d!important;}.stat-value{color:#2d5a3d!important;}
    .text-muted,.card-sub,.stat-label{color:#666!important;}
    .data-table th,.data-table td{color:#000!important;border-color:#ddd!important;}
  }
`;

// ─── TOAST HOOK ────────────────────────────────────────────────────────────────
function useToasts(){
  const[toasts,setToasts]=useState([]);
  const addToast=useCallback((msg,type="success")=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  },[]);
  return{toasts,addToast};
}

// ─── OFFSETS STORAGE (localStorage per user) ──────────────────────────────────
function getOffsets(userId){try{return JSON.parse(localStorage.getItem(`ct_offsets_${userId}`)||"[]");}catch{return[];}}
function saveOffsets(userId,data){localStorage.setItem(`ct_offsets_${userId}`,JSON.stringify(data));}

// ─── COMMUTES STORAGE ──────────────────────────────────────────────────────────
function getCommutes(userId){try{return JSON.parse(localStorage.getItem(`ct_commutes_${userId}`)||"[]");}catch{return[];}}
function saveCommutes(userId,data){localStorage.setItem(`ct_commutes_${userId}`,JSON.stringify(data));}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SCREENS
// ═══════════════════════════════════════════════════════════════════════════════
function AuthScreen({onLogin}){
  const[tab,setTab]=useState("login");
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("token"))setTab("resetpw");
  },[]);
  return(
    <div className="auth-shell">
      <div className="auth-card card fade-in">
        <div className="auth-logo">
          <div className="auth-icon">🌿</div>
          <div className="auth-title">CarbonTrack</div>
          <div className="auth-desc">Your personal carbon footprint manager</div>
        </div>
        {tab!=="resetpw"&&(
          <div className="auth-tabs">
            {[["login","Sign In"],["register","Create Account"],["reset","Reset Password"]].map(([t,l])=>(
              <div key={t} className={`auth-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{l}</div>
            ))}
          </div>
        )}
        {tab==="login"&&<LoginForm onLogin={onLogin} onSwitch={setTab}/>}
        {tab==="register"&&<RegisterForm onSwitch={setTab}/>}
        {tab==="reset"&&<ForgotForm onSwitch={setTab}/>}
        {tab==="resetpw"&&<ResetPasswordForm onSwitch={setTab}/>}
      </div>
    </div>
  );
}

function LoginForm({onLogin,onSwitch}){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[errors,setErrors]=useState({});
  const[alert,setAlert]=useState(null);
  const[loading,setLoading]=useState(false);
  async function handleLogin(e){
    e.preventDefault();
    const errs={};
    if(!email)errs.email="Email is required";
    else if(!validateEmail(email))errs.email="Enter a valid email";
    if(!password)errs.password="Password is required";
    if(Object.keys(errs).length){setErrors(errs);return;}
    setLoading(true);
    try{const user=await authApi.login(email,password);onLogin(user);}
    catch(err){setAlert(err.message);}
    finally{setLoading(false);}
  }
  return(
    <form onSubmit={handleLogin} noValidate>
      {alert&&<div className="alert alert-error">⚠️ {alert}</div>}
      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input className={`form-input ${errors.email?"error":""}`} type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErrors({});setAlert(null);}}/>
        {errors.email&&<div className="form-error">{errors.email}</div>}
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className={`form-input ${errors.password?"error":""}`} type="password" placeholder="Your password" value={password} onChange={e=>{setPassword(e.target.value);setErrors({});setAlert(null);}}/>
        {errors.password&&<div className="form-error">{errors.password}</div>}
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading?"Signing in…":"Sign In"}</button>
      <div className="divider">or</div>
      <p className="text-sm text-muted" style={{textAlign:"center"}}>No account? <span style={{color:G.mint,cursor:"pointer"}} onClick={()=>onSwitch("register")}>Create one</span></p>
    </form>
  );
}

function RegisterForm({onSwitch}){
  const[form,setForm]=useState({name:"",email:"",password:"",confirm:""});
  const[errors,setErrors]=useState({});
  const[alert,setAlert]=useState(null);
  const[loading,setLoading]=useState(false);
  async function handleRegister(e){
    e.preventDefault();
    const errs={};
    if(!form.name.trim())errs.name="Name is required";
    if(!form.email)errs.email="Email is required";
    else if(!validateEmail(form.email))errs.email="Enter a valid email";
    if(!validatePassword(form.password))errs.password="Password must be at least 6 characters";
    if(form.password!==form.confirm)errs.confirm="Passwords do not match";
    if(Object.keys(errs).length){setErrors(errs);return;}
    setLoading(true);
    try{
      await authApi.register(form.name,form.email,form.password);
      setAlert({type:"success",msg:"Account created! Please sign in."});
      setTimeout(()=>onSwitch("login"),2000);
    }catch(err){setAlert({type:"error",msg:err.message});}
    finally{setLoading(false);}
  }
  const f=(k,v)=>{setForm(p=>({...p,[k]:v}));setErrors({});setAlert(null);};
  return(
    <form onSubmit={handleRegister} noValidate>
      {alert&&<div className={`alert alert-${alert.type}`}>{alert.type==="error"?"⚠️":"✅"} {alert.msg}</div>}
      {[["name","Full Name","text","Jane Smith"],["email","Email Address","email","you@example.com"]].map(([k,l,t,p])=>(
        <div className="form-group" key={k}>
          <label className="form-label">{l}</label>
          <input className={`form-input ${errors[k]?"error":""}`} type={t} placeholder={p} value={form[k]} onChange={e=>f(k,e.target.value)}/>
          {errors[k]&&<div className="form-error">{errors[k]}</div>}
        </div>
      ))}
      <div className="form-group">
        <label className="form-label">Password (min. 6 characters)</label>
        <input className={`form-input ${errors.password?"error":""}`} type="password" placeholder="Create a password" value={form.password} onChange={e=>f("password",e.target.value)}/>
        {errors.password&&<div className="form-error">{errors.password}</div>}
      </div>
      <div className="form-group">
        <label className="form-label">Confirm Password</label>
        <input className={`form-input ${errors.confirm?"error":""}`} type="password" placeholder="Repeat your password" value={form.confirm} onChange={e=>f("confirm",e.target.value)}/>
        {errors.confirm&&<div className="form-error">{errors.confirm}</div>}
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading?"Creating Account…":"Create Account"}</button>
    </form>
  );
}

function ForgotForm({onSwitch}){
  const[email,setEmail]=useState("");
  const[error,setError]=useState("");
  const[success,setSuccess]=useState(false);
  const[loading,setLoading]=useState(false);
  async function handleSubmit(e){
    e.preventDefault();
    if(!validateEmail(email)){setError("Enter a valid email address");return;}
    setLoading(true);
    try{await authApi.forgotPassword(email);setSuccess(true);}
    catch(err){setError(err.message);}
    finally{setLoading(false);}
  }
  if(success)return(
    <div>
      <div className="alert alert-success">✅ If an account exists for {email}, a reset link has been sent. Check your inbox.</div>
      <div className="divider">or</div>
      <p className="text-sm text-muted" style={{textAlign:"center"}}><span style={{color:G.mint,cursor:"pointer"}} onClick={()=>onSwitch("login")}>← Back to Sign In</span></p>
    </div>
  );
  return(
    <form onSubmit={handleSubmit} noValidate>
      <div className="alert alert-info">🔑 Enter your email and we'll send a password reset link.</div>
      {error&&<div className="alert alert-error">⚠️ {error}</div>}
      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/>
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading?"Sending…":"Send Reset Link"}</button>
      <div className="divider">or</div>
      <p className="text-sm text-muted" style={{textAlign:"center"}}><span style={{color:G.mint,cursor:"pointer"}} onClick={()=>onSwitch("login")}>← Back to Sign In</span></p>
    </form>
  );
}

function ResetPasswordForm({onSwitch}){
  const[password,setPassword]=useState("");
  const[confirm,setConfirm]=useState("");
  const[error,setError]=useState("");
  const[success,setSuccess]=useState(false);
  const[loading,setLoading]=useState(false);
  const token=new URLSearchParams(window.location.search).get("token");
  async function handleSubmit(e){
    e.preventDefault();
    if(!validatePassword(password)){setError("Password must be at least 6 characters");return;}
    if(password!==confirm){setError("Passwords do not match");return;}
    setLoading(true);
    try{
      await authApi.resetPassword(token,password);
      setSuccess(true);
      window.history.replaceState({},"",window.location.pathname);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  }
  if(success)return(
    <div>
      <div className="alert alert-success">✅ Password reset successfully!</div>
      <button className="btn btn-primary btn-full mt-4" onClick={()=>onSwitch("login")}>Sign In Now</button>
    </div>
  );
  return(
    <form onSubmit={handleSubmit} noValidate>
      <div className="modal-title" style={{marginBottom:20}}>Set New Password</div>
      {error&&<div className="alert alert-error">⚠️ {error}</div>}
      <div className="form-group">
        <label className="form-label">New Password</label>
        <input className="form-input" type="password" placeholder="At least 6 characters" value={password} onChange={e=>{setPassword(e.target.value);setError("");}}/>
      </div>
      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <input className="form-input" type="password" placeholder="Repeat your password" value={confirm} onChange={e=>{setConfirm(e.target.value);setError("");}}/>
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading?"Resetting…":"Reset Password"}</button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — with monthly digest + offset balance KPI
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardPage({entries,offsets,onNavigate}){
  const[period,setPeriod]=useState("monthly");
  const now=new Date();

  const filtered=entries.filter(e=>{
    const d=new Date(e.date);
    if(period==="weekly")return(now-d)<=7*864e5;
    if(period==="monthly")return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return d.getFullYear()===now.getFullYear();
  });

  const byCat={};
  filtered.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+Number(e.emissions);});
  const pieData=Object.entries(byCat).map(([name,value])=>({name,value:parseFloat(value.toFixed(2))})).sort((a,b)=>b.value-a.value);
  const totalEmissions=pieData.reduce((s,d)=>s+d.value,0);
  const avgDaily=filtered.length?(totalEmissions/Math.max(1,[...new Set(filtered.map(e=>e.date))].length)).toFixed(1):0;

  // Monthly digest
  const curMonthTotal=entries.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+Number(e.emissions),0);
  const prevMonthTotal=entries.filter(e=>{const d=new Date(e.date);const pm=new Date(now.getFullYear(),now.getMonth()-1,1);return d.getMonth()===pm.getMonth()&&d.getFullYear()===pm.getFullYear();}).reduce((s,e)=>s+Number(e.emissions),0);
  const monthDelta=prevMonthTotal>0?((curMonthTotal-prevMonthTotal)/prevMonthTotal*100).toFixed(1):null;

  // Offset balance
  const totalOffset=offsets.reduce((s,o)=>s+o.totalKg,0);
  const netEmissions=Math.max(0,totalEmissions-totalOffset);

  const trendData=(()=>{
    const buckets={};
    if(period!=="yearly"){
      for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const k=d.toISOString().split("T")[0];buckets[k]={label:d.toLocaleDateString("en",{weekday:"short",day:"numeric"}),total:0};}
      entries.forEach(e=>{if(buckets[e.date])buckets[e.date].total+=Number(e.emissions);});
    }else{
      for(let m=11;m>=0;m--){const d=new Date(now.getFullYear(),now.getMonth()-m,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;buckets[k]={label:d.toLocaleDateString("en",{month:"short"}),total:0};}
      entries.forEach(e=>{const k=e.date?.substring(0,7);if(buckets[k])buckets[k].total+=Number(e.emissions);});
    }
    return Object.values(buckets).map(b=>({...b,total:parseFloat(b.total.toFixed(2))}));
  })();

  const CL=({cx,cy,midAngle,innerRadius,outerRadius,percent})=>{
    if(percent<0.05)return null;
    const R=Math.PI/180,r=innerRadius+(outerRadius-innerRadius)*0.5;
    const x=cx+r*Math.cos(-midAngle*R),y=cy+r*Math.sin(-midAngle*R);
    return<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>{`${(percent*100).toFixed(0)}%`}</text>;
  };

  return(
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><div className="page-title">Emission Analytics</div><div className="page-subtitle">Visual breakdown of your carbon footprint</div></div>
        <div className="tab-group">
          {["weekly","monthly","yearly"].map(p=>(
            <button key={p} className={`tab-btn ${period===p?"active":""}`} onClick={()=>setPeriod(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Monthly digest — appears naturally when there's comparison data */}
      {monthDelta!==null&&(
        <div className="card mb-4" style={{background:parseFloat(monthDelta)<0?"rgba(61,184,122,.06)":"rgba(224,82,82,.04)",border:`1px solid ${parseFloat(monthDelta)<0?"rgba(61,184,122,.2)":"rgba(224,82,82,.12)"}`}}>
          <div className="flex-between">
            <div>
              <div style={{fontSize:13,fontWeight:600,color:parseFloat(monthDelta)<0?G.good:G.danger}}>
                {parseFloat(monthDelta)<0?"📉":"📈"} {Math.abs(parseFloat(monthDelta))}% {parseFloat(monthDelta)<0?"less":"more"} than last month
              </div>
              <div className="text-xs text-muted" style={{marginTop:4}}>
                This month: {curMonthTotal.toFixed(1)} kg · Last month: {prevMonthTotal.toFixed(1)} kg
              </div>
            </div>
            {totalOffset>0&&(
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:G.good,fontWeight:600}}>🌳 {totalOffset.toFixed(1)} kg offset</div>
                <div className="text-xs text-muted">Net: {netEmissions.toFixed(1)} kg CO₂e</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid-4 mb-4">
        {[
          {label:"Total Emissions",val:totalEmissions.toFixed(1),unit:"kg CO₂e"},
          {label:"Daily Average",val:avgDaily,unit:"kg/day"},
          {label:"Activities Logged",val:filtered.length,unit:"entries"},
          {label:"Total Offset",val:totalOffset.toFixed(1),unit:"kg CO₂e",color:totalOffset>0?G.good:undefined,onClick:()=>onNavigate("offsets")},
        ].map((s,i)=>(
          <div key={i} className="card stat-card" style={s.onClick?{cursor:"pointer"}:{}} onClick={s.onClick}>
            <div className="stat-label">{s.label}</div>
            <div><span className="stat-value" style={s.color?{color:s.color}:{}}>{s.val}</span> <span className="stat-unit">{s.unit}</span></div>
            {s.onClick&&<div className="text-xs text-muted">View offsets →</div>}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Emissions by Category</div>
          <div className="card-sub mb-4">Percentage split across all sources</div>
          {pieData.length===0?(
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data for this period</div><div className="text-sm text-muted">Log your first activity to see charts</div></div>
          ):(
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={95} dataKey="value" labelLine={false} label={CL}>{pieData.map(e=><Cell key={e.name} fill={CATEGORY_COLORS[e.name]||"#888"} stroke="rgba(0,0,0,.2)" strokeWidth={1}/>)}</Pie><Tooltip formatter={v=>[`${v} kg CO₂e`,""]} contentStyle={{background:G.slate,border:"1px solid rgba(93,158,111,.2)",borderRadius:8,fontSize:12}}/></PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",marginTop:8}}>
                {pieData.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:G.sage}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:CATEGORY_COLORS[d.name],display:"inline-block"}}/>
                    {d.name}: <strong style={{color:G.cream}}>{d.value} kg</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card">
          <div className="card-title">Emission Trend</div>
          <div className="card-sub mb-4">Totals over selected period</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{top:5,right:10,left:-20,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(93,158,111,.1)"/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:G.sage}}/>
              <YAxis tick={{fontSize:10,fill:G.sage}}/>
              <Tooltip formatter={v=>[`${v} kg CO₂e`]} contentStyle={{background:G.slate,border:"1px solid rgba(93,158,111,.2)",borderRadius:8,fontSize:12}}/>
              <Line type="monotone" dataKey="total" stroke={G.mint} strokeWidth={2.5} dot={{fill:G.mint,r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card col-span-2">
          <div className="card-title">Category Breakdown</div>
          <div className="card-sub mb-4">Comparison across emission sources</div>
          {pieData.length===0?(
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data for this period</div></div>
          ):(
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pieData} margin={{top:5,right:20,left:-20,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(93,158,111,.1)"/>
                <XAxis dataKey="name" tick={{fontSize:12,fill:G.sage}}/>
                <YAxis tick={{fontSize:10,fill:G.sage}}/>
                <Tooltip formatter={v=>[`${v} kg CO₂e`]} contentStyle={{background:G.slate,border:"1px solid rgba(93,158,111,.2)",borderRadius:8,fontSize:12}}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>{pieData.map(e=><Cell key={e.name} fill={CATEGORY_COLORS[e.name]||"#888"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA ENTRY
// ═══════════════════════════════════════════════════════════════════════════════
function DataEntryPage({entries,onEntriesChange,addToast}){
  const[form,setForm]=useState({category:"",activity:"",value:"",date:new Date().toISOString().split("T")[0]});
  const[errors,setErrors]=useState({});
  const[submitting,setSubmitting]=useState(false);
  const[deleteId,setDeleteId]=useState(null);
  const[deleting,setDeleting]=useState(false);
  const activities=form.category?Object.keys(EMISSION_FACTORS[form.category]||[]):[];
  const liveEmissions=(form.activity&&form.value&&!isNaN(Number(form.value))&&Number(form.value)>0)?(Number(form.value)*(EMISSION_FACTORS[form.category]?.[form.activity]||0)).toFixed(3):null;
  const recentEntries=[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,30);
  const catColors={Transportation:G.sky,Energy:G.amber,Diet:G.good,Waste:G.ember,Shopping:"#9b6bb5"};
  function validate(){
    const e={};
    if(!form.category)e.category="Please select a category";
    if(!form.activity)e.activity="Please select an activity";
    if(!form.value)e.value="Value is required";
    else if(isNaN(Number(form.value)))e.value="Please enter a numerical value";
    else if(Number(form.value)<=0)e.value="Value must be greater than 0";
    if(!form.date)e.date="Date is required";
    else if(new Date(form.date)>new Date())e.date="Date cannot be in the future";
    return e;
  }
  async function handleSubmit(ev){
    ev.preventDefault();
    const errs=validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    setSubmitting(true);
    try{
      const factor=EMISSION_FACTORS[form.category][form.activity];
      const emissions=parseFloat((Number(form.value)*factor).toFixed(3));
      const entry=await entriesApi.createEntry({date:form.date,category:form.category,activity:form.activity,value:Number(form.value),emissions});
      onEntriesChange([entry,...entries]);
      addToast(`Logged ${emissions} kg CO₂e for ${form.activity}`);
      setForm({category:"",activity:"",value:"",date:new Date().toISOString().split("T")[0]});
      setErrors({});
    }catch(err){addToast(err.message,"error");}
    finally{setSubmitting(false);}
  }
  async function handleDelete(id){
    setDeleting(true);
    try{await entriesApi.deleteEntry(id);onEntriesChange(entries.filter(e=>e.id!==id));addToast("Entry deleted","error");setDeleteId(null);}
    catch(err){addToast(err.message,"error");}
    finally{setDeleting(false);}
  }
  const f=(k,v)=>{setErrors({});if(k==="category")setForm(p=>({...p,category:v,activity:""}));else setForm(p=>({...p,[k]:v}));};
  return(
    <div className="fade-in">
      <div className="page-header"><div className="page-title">Log Activity</div><div className="page-subtitle">Record daily activities to track your carbon footprint</div></div>
      <div className="grid-2" style={{alignItems:"start"}}>
        <div className="card">
          <div className="card-title">New Entry</div><div className="separator"/>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className={`form-select ${errors.category?"error":""}`} value={form.category} onChange={e=>f("category",e.target.value)}>
                <option value="">— Select a category —</option>
                {Object.keys(EMISSION_FACTORS).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category&&<div className="form-error">{errors.category}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <select className={`form-select ${errors.activity?"error":""}`} value={form.activity} onChange={e=>f("activity",e.target.value)} disabled={!form.category}>
                <option value="">— Select an activity —</option>
                {activities.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
              {errors.activity&&<div className="form-error">{errors.activity}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">{form.activity?`Amount (${form.activity.match(/\(([^)]+)\)/)?.[1]||"units"})`:"Amount"}</label>
              <input className={`form-input ${errors.value?"error":""}`} type="number" min="0" step="any" placeholder="Enter a value" value={form.value} onChange={e=>f("value",e.target.value)}/>
              {errors.value&&<div className="form-error">{errors.value}</div>}
              {liveEmissions!==null&&(
                <div style={{marginTop:8,padding:"10px 14px",background:"rgba(61,184,122,.08)",borderRadius:8,border:"1px solid rgba(61,184,122,.15)"}}>
                  <div className="text-xs text-muted" style={{marginBottom:4}}>Real-time Estimate</div>
                  <div style={{fontSize:20,fontFamily:"Playfair Display, serif",color:G.mint,fontWeight:700}}>{liveEmissions} <span style={{fontSize:14,color:G.sage}}>kg CO₂e</span></div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className={`form-input ${errors.date?"error":""}`} type="date" value={form.date} max={new Date().toISOString().split("T")[0]} onChange={e=>f("date",e.target.value)}/>
              {errors.date&&<div className="form-error">{errors.date}</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>{submitting?"Saving…":"💾 Save Entry"}</button>
          </form>
        </div>
        <div className="card">
          <div className="flex-between mb-4">
            <div className="card-title">Recent Entries</div>
            <span style={{background:"rgba(93,158,111,.15)",color:G.mint,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{entries.length} total</span>
          </div>
          {recentEntries.length===0?(
            <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No entries yet</div><div className="text-sm text-muted">Log your first activity above</div></div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Category</th><th>Activity</th><th>Value</th><th>CO₂e</th><th></th></tr></thead>
                <tbody>
                  {recentEntries.map(e=>(
                    <tr key={e.id}>
                      <td className="text-xs text-muted">{(e.date||"").split("T")[0]}</td>
                      <td><span style={{background:`${catColors[e.category]}20`,color:catColors[e.category],padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{e.category}</span></td>
                      <td className="text-sm">{e.activity}</td>
                      <td className="text-sm">{e.value}</td>
                      <td><strong style={{color:G.mint}}>{e.emissions}</strong></td>
                      <td><button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(e.id)}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {deleteId&&(
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-title">Confirm Delete</div>
            <p className="text-sm text-muted" style={{marginBottom:20}}>Are you sure you want to delete this entry? This cannot be undone.</p>
            <div className="flex-gap">
              <button className="btn btn-danger" disabled={deleting} onClick={()=>handleDelete(deleteId)}>{deleting?"Deleting…":"Delete Entry"}</button>
              <button className="btn btn-outline" onClick={()=>setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPS COMMUTE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
function CommuteTrackerPage({user,entries,onEntriesChange,addToast}){
  const[tracking,setTracking]=useState(false);
  const[positions,setPositions]=useState([]);
  const[mode,setMode]=useState("idle");
  const[speed,setSpeed]=useState(0);
  const[elapsed,setElapsed]=useState(0);
  const[distance,setDistance]=useState(0);
  const[error,setError]=useState(null);
  const[sessions,setSessions]=useState(()=>getCommutes(user.id));
  const watchId=useRef(null);
  const timer=useRef(null);
  const lastPos=useRef(null);

  function haversine(lat1,lon1,lat2,lon2){
    const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function detectMode(speedMs){
    if(speedMs<0.5)return"idle";
    if(speedMs<2.2)return"walk";   // < 8 km/h
    if(speedMs<8.3)return"cycle";  // < 30 km/h
    return"drive";
  }

  const modeLabels={idle:"Stationary 🧍",walk:"Walking 🚶",cycle:"Cycling 🚴",drive:"Driving 🚗"};
  const modeColors={idle:G.sage,walk:G.good,cycle:G.sky,drive:G.amber};

  function startTracking(){
    if(!navigator.geolocation){setError("Geolocation is not supported by your browser.");return;}
    setError(null);setPositions([]);setDistance(0);lastPos.current=null;
    const start=Date.now();setElapsed(0);
    timer.current=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);
    watchId.current=navigator.geolocation.watchPosition(
      pos=>{
        const{latitude,longitude,speed:spd,accuracy}=pos.coords;
        if(accuracy>60)return;
        const speedMs=spd||0;
        setSpeed(speedMs);setMode(detectMode(speedMs));
        if(lastPos.current){
          const dist=haversine(lastPos.current.lat,lastPos.current.lng,latitude,longitude);
          if(dist>1&&dist<300)setDistance(d=>d+dist);
        }
        lastPos.current={lat:latitude,lng:longitude};
        setPositions(p=>[...p.slice(-200),{lat:latitude,lng:longitude,speed:speedMs,time:Date.now()}]);
      },
      err=>{
        if(err.code===1)setError("Location permission denied. Please allow access in your browser settings.");
        else if(err.code===2)setError("Location unavailable. Please check your device GPS.");
        else setError("Location request timed out.");
        stopTracking(false);
      },
      {enableHighAccuracy:true,maximumAge:3000,timeout:15000}
    );
    setTracking(true);
  }

  function stopTracking(save=true){
    if(watchId.current)navigator.geolocation.clearWatch(watchId.current);
    if(timer.current)clearInterval(timer.current);
    setTracking(false);
    if(save&&elapsed>15&&distance>5)saveSession();
  }

  async function saveSession(){
    const distKm=distance/1000;
    const finalMode=mode==="idle"?"walk":mode;
    const activityMap={walk:"Walking",cycle:"Bicycle",drive:"Car (Petrol)"};
    const activity=activityMap[finalMode];
    const factor=EMISSION_FACTORS.Transportation[activity]||0;
    const emissions=parseFloat((distKm*factor).toFixed(3));
    const session={
      id:Date.now(),
      date:new Date().toISOString().split("T")[0],
      mode:finalMode,distanceKm:parseFloat(distKm.toFixed(3)),
      durationSeconds:elapsed,emissions,points:positions.length,
    };
    const updated=[session,...sessions].slice(0,100);
    setSessions(updated);saveCommutes(user.id,updated);
    if(emissions>0){
      try{
        const entry=await entriesApi.createEntry({date:session.date,category:"Transportation",activity,value:parseFloat(distKm.toFixed(3)),emissions});
        onEntriesChange(prev=>[entry,...prev]);
      }catch(e){/* non-blocking */}
    }
    addToast(`Trip saved: ${distKm.toFixed(2)} km by ${finalMode}`);
  }

  useEffect(()=>()=>{
    if(watchId.current)navigator.geolocation.clearWatch(watchId.current);
    if(timer.current)clearInterval(timer.current);
  },[]);

  const fmt=s=>`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const totalDistKm=sessions.reduce((s,t)=>s+t.distanceKm,0);
  const totalSaved=sessions.filter(s=>s.mode!=="drive").reduce((s,t)=>s+t.distanceKm*0.21,0);

  return(
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Commute Tracker</div>
        <div className="page-subtitle">GPS auto-detects your travel mode — walking, cycling, or driving</div>
      </div>
      <div className="alert alert-info mb-4">🔒 Your location is processed entirely on this device and never sent to any server. Accuracy filter active — noisy GPS readings are ignored.</div>
      {error&&<div className="alert alert-error mb-4">⚠️ {error}</div>}

      <div className="grid-2" style={{alignItems:"start"}}>
        {/* Live tracker */}
        <div className="card">
          <div className="card-title" style={{marginBottom:20}}>Live Trip</div>
          <div className="grid-3" style={{gap:12,marginBottom:20}}>
            {[{val:fmt(elapsed),label:"Duration"},{val:(distance/1000).toFixed(2),label:"km"},{val:(speed*3.6).toFixed(1),label:"km/h"}].map(s=>(
              <div key={s.label} style={{textAlign:"center",padding:14,background:"rgba(15,31,22,.5)",borderRadius:10}}>
                <div style={{fontFamily:"Playfair Display, serif",fontSize:26,fontWeight:700,color:G.mint}}>{s.val}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginBottom:20,padding:16,background:"rgba(15,31,22,.4)",borderRadius:12,border:`2px solid ${modeColors[mode]}40`}}>
            <div style={{fontSize:11,color:G.sage,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Detected Mode</div>
            <div style={{fontSize:22,fontWeight:700,color:modeColors[mode]}}>{modeLabels[mode]}</div>
            {tracking&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:8}}>
                <span className="gps-pulse"/>
                <span style={{fontSize:12,color:G.sage}}>GPS active · {positions.length} points logged</span>
              </div>
            )}
          </div>
          {!tracking?(
            <button className="btn btn-primary btn-full" onClick={startTracking}>📍 Start Trip</button>
          ):(
            <button className="btn btn-danger btn-full" onClick={()=>stopTracking(true)}>⏹ Stop & Save Trip</button>
          )}
          <div className="separator"/>
          <div style={{fontSize:12,color:G.sage,lineHeight:1.6}}>
            <strong style={{color:G.cream}}>Speed thresholds:</strong><br/>
            Walking &lt;8 km/h · Cycling &lt;30 km/h · Driving ≥30 km/h
          </div>
        </div>

        {/* Stats + history */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="grid-2" style={{gap:16}}>
            <div className="card stat-card">
              <div className="stat-label">Total Distance</div>
              <div><span className="stat-value">{totalDistKm.toFixed(1)}</span> <span className="stat-unit">km</span></div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">CO₂ Saved vs Driving</div>
              <div><span className="stat-value" style={{color:G.good}}>{totalSaved.toFixed(1)}</span> <span className="stat-unit">kg</span></div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between mb-4">
              <div className="card-title">Trip History</div>
              <span style={{background:"rgba(93,158,111,.15)",color:G.mint,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{sessions.length} trips</span>
            </div>
            {sessions.length===0?(
              <div className="empty-state"><div className="empty-icon">🗺️</div><div className="empty-title">No trips yet</div><div className="text-sm text-muted">Start tracking your first commute</div></div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Mode</th><th>Distance</th><th>Time</th><th>CO₂e</th></tr></thead>
                  <tbody>
                    {sessions.slice(0,15).map(s=>(
                      <tr key={s.id}>
                        <td className="text-xs text-muted">{s.date}</td>
                        <td><span className={`pill mode-${s.mode}`}>{modeLabels[s.mode]}</span></td>
                        <td className="text-sm">{s.distanceKm} km</td>
                        <td className="text-sm">{fmt(s.durationSeconds)}</td>
                        <td><strong style={{color:s.emissions===0?G.good:G.mint}}>{s.emissions===0?"🌿 0":s.emissions}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARBON OFFSETS — pledge + certificate system
// ═══════════════════════════════════════════════════════════════════════════════
function OffsetsPage({user,entries,offsets,onOffsetsChange,addToast}){
  const[selected,setSelected]=useState(null);
  const[units,setUnits]=useState(1);
  const[pledging,setPledging]=useState(false);
  const[certPledge,setCertPledge]=useState(null);

  const totalEmissions=entries.reduce((s,e)=>s+Number(e.emissions),0);
  const totalOffset=offsets.reduce((s,o)=>s+o.totalKg,0);
  const netEmissions=Math.max(0,totalEmissions-totalOffset);
  const offsetPct=totalEmissions>0?Math.min(100,(totalOffset/totalEmissions)*100):0;

  const prog=selected?OFFSET_PROGRAMS.find(p=>p.id===selected):null;
  const pledgeKg=prog?parseFloat((units*prog.kgPerUnit).toFixed(1)):0;

  function handlePledge(){
    if(!prog||units<1)return;
    setPledging(true);
    setTimeout(()=>{
      const pledge={
        id:Date.now(),
        programId:prog.id,
        programTitle:prog.title,
        org:prog.org,
        units:Number(units),
        totalKg:pledgeKg,
        date:new Date().toISOString(),
        icon:prog.icon,
      };
      const updated=[pledge,...offsets];
      onOffsetsChange(updated);
      saveOffsets(user.id,updated);
      addToast(`Offset pledge recorded: ${pledgeKg} kg CO₂e 🌳`);
      setCertPledge(pledge);
      setSelected(null);setUnits(1);setPledging(false);
    },800);
  }

  function downloadCertificate(pledge){
    const html=generateCertificateHTML(pledge,user.name);
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`CarbonTrack_Certificate_${pledge.id}.html`;
    a.click();URL.revokeObjectURL(url);
    addToast("Certificate downloaded — open the file in your browser to print");
  }

  return(
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Carbon Offsets</div>
        <div className="page-subtitle">Neutralise your remaining emissions by pledging to verified climate projects</div>
      </div>

      {/* Balance overview */}
      <div className="card mb-4">
        <div className="flex-between" style={{marginBottom:16}}>
          <div>
            <div className="card-title">Offset Balance</div>
            <div className="card-sub">Your emissions vs. pledged offsets</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:24,fontWeight:700,color:netEmissions===0?G.good:G.amber,fontFamily:"Playfair Display, serif"}}>
              {netEmissions.toFixed(1)} kg
            </div>
            <div className="text-xs text-muted">net CO₂e remaining</div>
          </div>
        </div>
        <div className="grid-3" style={{gap:16,marginBottom:16}}>
          {[
            {label:"Total Emissions",val:totalEmissions.toFixed(1),color:G.danger,unit:"kg"},
            {label:"Total Offset",val:totalOffset.toFixed(1),color:G.good,unit:"kg"},
            {label:"Net Remaining",val:netEmissions.toFixed(1),color:netEmissions===0?G.good:G.amber,unit:"kg"},
          ].map(s=>(
            <div key={s.label} style={{textAlign:"center",padding:14,background:"rgba(15,31,22,.4)",borderRadius:10}}>
              <div style={{fontFamily:"Playfair Display, serif",fontSize:24,fontWeight:700,color:s.color}}>{s.val}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <span className="text-sm text-muted">Offset progress</span>
          <span className="text-sm" style={{color:offsetPct>=100?G.good:G.amber}}>{offsetPct.toFixed(0)}% offset {offsetPct>=100?"🎉":""}</span>
        </div>
        <div className="balance-bar">
          <div className="balance-fill" style={{width:`${offsetPct}%`,background:offsetPct>=100?`linear-gradient(90deg,${G.fern},${G.good})`:`linear-gradient(90deg,${G.amber},${G.warn})`}}/>
        </div>
        {netEmissions===0&&totalEmissions>0&&(
          <div className="alert alert-success mt-4">🏆 Incredible — you've fully offset your tracked emissions! Your net carbon footprint is zero.</div>
        )}
      </div>

      <div className="grid-2" style={{alignItems:"start"}}>
        {/* Program selection */}
        <div>
          <div className="card-title mb-2" style={{marginBottom:12}}>Choose an Offset Program</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {OFFSET_PROGRAMS.map(p=>(
              <div key={p.id} className={`offset-card ${selected===p.id?"selected":""}`} onClick={()=>{setSelected(p.id===selected?null:p.id);setUnits(1);}}>
                <div className="flex-between" style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:24}}>{p.icon}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:G.cream}}>{p.title}</div>
                      <div style={{fontSize:11,color:G.sage}}>{p.org}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,fontWeight:600,color:p.color}}>{p.kgPerUnit} kg CO₂e</div>
                    <div style={{fontSize:10,color:G.sage}}>per {p.unitLabel}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:G.sage,lineHeight:1.5}}>{p.description}</div>
                {selected===p.id&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid rgba(93,158,111,.15)"}}>
                    <div style={{fontSize:12,color:G.mint,marginBottom:10}}>💡 {p.impact}</div>
                    <label className="form-label">Number of {p.unitLabel}s to pledge</label>
                    <div className="flex-gap" style={{marginTop:6}}>
                      <input className="form-input" type="number" min="1" max="1000" value={units} style={{width:100}} onChange={e=>setUnits(Math.max(1,parseInt(e.target.value)||1))}/>
                      <div style={{fontSize:13,color:G.sage}}>= <strong style={{color:G.mint}}>{pledgeKg} kg CO₂e</strong> offset</div>
                    </div>
                    <div style={{fontSize:11,color:G.sage,marginTop:6}}>Suggested pledge: {p.unitCost}</div>
                    <button className="btn btn-primary btn-full mt-4" disabled={pledging} onClick={handlePledge}>
                      {pledging?"Recording pledge…":`🌱 Pledge ${units} ${units===1?p.unitLabel:p.unitLabel+"s"}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My pledges + certificates */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {certPledge&&(
            <div className="cert-preview">
              <div style={{fontSize:36,marginBottom:8}}>🏅</div>
              <div style={{fontFamily:"Playfair Display, serif",fontSize:18,fontWeight:700,color:G.mint,marginBottom:4}}>Pledge Recorded!</div>
              <div style={{fontSize:13,color:G.sage,marginBottom:16}}>You pledged to offset <strong style={{color:G.cream}}>{certPledge.totalKg} kg CO₂e</strong> through {certPledge.programTitle}</div>
              <button className="btn btn-outline" onClick={()=>downloadCertificate(certPledge)}>📥 Download Certificate</button>
            </div>
          )}

          <div className="card">
            <div className="flex-between mb-4">
              <div className="card-title">My Pledges</div>
              <span style={{background:"rgba(93,158,111,.15)",color:G.mint,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{offsets.length} pledges</span>
            </div>
            {offsets.length===0?(
              <div className="empty-state"><div className="empty-icon">🌱</div><div className="empty-title">No pledges yet</div><div className="text-sm text-muted">Choose a program above to offset your footprint</div></div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {offsets.map(o=>(
                  <div key={o.id} className="league-card">
                    <div className="flex-between">
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:20}}>{o.icon}</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:G.cream}}>{o.programTitle}</div>
                          <div style={{fontSize:11,color:G.sage}}>{new Date(o.date).toLocaleDateString()} · {o.units} unit{o.units!==1?"s":""}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:14,fontWeight:700,color:G.good}}>+{o.totalKg} kg</div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={()=>downloadCertificate(o)}>📜</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{background:"rgba(15,31,22,.4)",border:"1px solid rgba(93,158,111,.1)"}}>
            <div style={{fontSize:12,color:G.sage,lineHeight:1.7}}>
              <strong style={{color:G.cream}}>About this feature</strong><br/>
              Pledges represent your personal commitment to fund climate projects. Certificates are digital records of your intention — they document your climate action journey. We encourage you to follow through by visiting the partner organisations directly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════════
function GoalsPage({entries,goal,onGoalChange,addToast}){
  const[showModal,setShowModal]=useState(false);
  const[targetPct,setTargetPct]=useState("");
  const[errors,setErrors]=useState({});
  const[saving,setSaving]=useState(false);
  const[clearing,setClearing]=useState(false);
  const now=new Date();
  const curTotal=parseFloat(entries.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+Number(e.emissions),0).toFixed(2));
  const prevTotal=parseFloat(entries.filter(e=>{const d=new Date(e.date);const pm=new Date(now.getFullYear(),now.getMonth()-1,1);return d.getMonth()===pm.getMonth()&&d.getFullYear()===pm.getFullYear();}).reduce((s,e)=>s+Number(e.emissions),0).toFixed(2));
  async function handleSetGoal(e){
    e.preventDefault();
    const n=Number(targetPct);
    if(!targetPct||isNaN(n)||n<1||n>99){setErrors({targetPct:"Percentage must be between 1 and 99"});return;}
    setSaving(true);
    try{
      const target=parseFloat((prevTotal*(1-n/100)).toFixed(2));
      const saved=await goalsApi.saveGoal({percentage:n,baselineEmissions:prevTotal,targetEmissions:target});
      onGoalChange(saved);addToast(`Goal set: reduce by ${n}% this month!`);
      setShowModal(false);setTargetPct("");setErrors({});
    }catch(err){addToast(err.message,"error");}
    finally{setSaving(false);}
  }
  async function handleClearGoal(){
    setClearing(true);
    try{await goalsApi.deleteGoal();onGoalChange(null);addToast("Goal cleared");}
    catch(err){addToast(err.message,"error");}
    finally{setClearing(false);}
  }
  const progressPct=goal&&goal.target_emissions>0?Math.max(0,Math.min(100,((goal.baseline_emissions-curTotal)/(goal.baseline_emissions-goal.target_emissions))*100)):0;
  const achieved=goal&&curTotal<=goal.target_emissions;
  const progressClass=progressPct>=100?"progress-good":progressPct>=50?"progress-warn":"progress-danger";
  return(
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><div className="page-title">Goal Setting & Tracking</div><div className="page-subtitle">Set monthly reduction targets and track your progress</div></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>🎯 {goal?"Update Goal":"Set New Goal"}</button>
      </div>
      <div className="grid-2" style={{alignItems:"start"}}>
        <div className="card">
          <div className="card-title">This Month's Summary</div><div className="separator"/>
          <div className="grid-2" style={{gap:16}}>
            <div><div className="text-xs text-muted" style={{marginBottom:4}}>Current Emissions</div><div style={{fontFamily:"Playfair Display, serif",fontSize:30,fontWeight:700,color:G.mint}}>{curTotal}</div><div className="text-xs text-muted">kg CO₂e this month</div></div>
            <div><div className="text-xs text-muted" style={{marginBottom:4}}>Last Month Baseline</div><div style={{fontFamily:"Playfair Display, serif",fontSize:30,fontWeight:700,color:G.amber}}>{prevTotal}</div><div className="text-xs text-muted">kg CO₂e</div></div>
          </div>
          {prevTotal>0&&(
            <div style={{marginTop:16,padding:"12px 14px",borderRadius:10,background:curTotal<prevTotal?"rgba(61,184,122,.1)":"rgba(224,82,82,.08)",border:`1px solid ${curTotal<prevTotal?"rgba(61,184,122,.2)":"rgba(224,82,82,.15)"}`}}>
              <span style={{fontSize:13,color:curTotal<prevTotal?G.good:G.danger}}>{curTotal<prevTotal?`📉 ${((prevTotal-curTotal)/prevTotal*100).toFixed(1)}% less than last month — great work!`:`📈 ${((curTotal-prevTotal)/prevTotal*100).toFixed(1)}% more than last month`}</span>
            </div>
          )}
        </div>
        <div className="card">
          {goal?(
            <>
              <div className="flex-between" style={{marginBottom:16}}>
                <div><div className="card-title">Active Goal</div><div className="text-xs text-muted">Set {new Date(goal.set_at).toLocaleDateString()}</div></div>
                <button className="btn btn-outline btn-sm" disabled={clearing} onClick={handleClearGoal}>{clearing?"…":"Clear"}</button>
              </div>
              <div className="separator"/>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontFamily:"Playfair Display, serif",fontSize:42,fontWeight:700,color:G.mint,lineHeight:1}}>{goal.percentage}%</div>
                <div className="text-xs text-muted">reduction target from last month</div>
              </div>
              <div style={{marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                <span className="text-sm text-muted">Progress</span>
                <span className="text-sm" style={{color:achieved?G.good:G.amber}}>{progressPct.toFixed(0)}% achieved {achieved?"🎉":""}</span>
              </div>
              <div className="progress-wrap"><div className={`progress-bar ${progressClass}`} style={{width:`${Math.min(progressPct,100)}%`}}/></div>
              <div style={{marginTop:12}}>
                <div className="grid-3" style={{gap:10}}>
                  {[["Baseline",goal.baseline_emissions,G.amber],["Target",goal.target_emissions,G.mint],[achieved?"Saved":"Remaining",achieved?(goal.baseline_emissions-curTotal).toFixed(2):Math.max(0,curTotal-goal.target_emissions).toFixed(2),achieved?G.good:G.danger]].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:"center",padding:"10px 6px",background:"rgba(15,31,22,.4)",borderRadius:8}}><div className="text-xs text-muted">{l}</div><div className="text-sm" style={{color:c,fontWeight:600}}>{v} kg</div></div>
                  ))}
                </div>
              </div>
              {achieved&&<div className="alert alert-success mt-4">🏆 You've achieved your reduction goal this month!</div>}
            </>
          ):(
            <div className="empty-state"><div className="empty-icon">🎯</div><div className="empty-title">No Goal Set</div><div className="text-sm text-muted" style={{marginBottom:16}}>Set a monthly reduction target to track progress.</div><button className="btn btn-primary btn-sm" onClick={()=>setShowModal(true)}>Set a Goal</button></div>
          )}
        </div>
      </div>
      {showModal&&(
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-title">🎯 Set Reduction Goal</div>
            {prevTotal===0&&<div className="alert alert-warn" style={{marginBottom:16}}>⚠️ No data from last month yet. Log some activities first.</div>}
            {prevTotal>0&&<div className="alert alert-info" style={{marginBottom:16}}>Last month: <strong>{prevTotal} kg CO₂e</strong>. Enter your target reduction below.</div>}
            <form onSubmit={handleSetGoal} noValidate>
              <div className="form-group">
                <label className="form-label">Target Reduction (%)</label>
                <input className={`form-input ${errors.targetPct?"error":""}`} type="number" min="1" max="99" placeholder="e.g. 10" value={targetPct} onChange={e=>{setTargetPct(e.target.value);setErrors({});}}/>
                {errors.targetPct&&<div className="form-error">{errors.targetPct}</div>}
                {targetPct&&!isNaN(Number(targetPct))&&Number(targetPct)>0&&Number(targetPct)<100&&prevTotal>0&&(
                  <div className="text-sm text-muted" style={{marginTop:6}}>Target: <strong style={{color:G.mint}}>{(prevTotal*(1-Number(targetPct)/100)).toFixed(2)} kg CO₂e</strong> this month</div>
                )}
              </div>
              <div className="flex-gap">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save Goal"}</button>
                <button type="button" className="btn btn-outline" onClick={()=>{setShowModal(false);setErrors({});setTargetPct("");}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function RecommendationsPage({entries}){
  const[tips,setTips]=useState([]);
  const[key,setKey]=useState(0);
  useEffect(()=>{setTips(generateSmartTips(entries,6));},[entries,key]);
  const byCat={};entries.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+Number(e.emissions);});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);
  return(
    <div className="fade-in">
      <div className="page-header flex-between">
        <div><div className="page-title">Smart Recommendations</div><div className="page-subtitle">Personalised tips based on your highest emission sources</div></div>
        <button className="btn btn-outline" onClick={()=>setKey(k=>k+1)}>🔄 Refresh Tips</button>
      </div>
      {entries.length===0&&<div className="alert alert-warn">⚠️ Log some activities first to get personalised recommendations.</div>}
      {sorted.length>0&&(
        <div className="card mb-4">
          <div className="card-title" style={{marginBottom:16}}>Your Emission Profile</div>
          {sorted.map(([cat,val])=>{const pct=(val/total*100).toFixed(0);return(
            <div key={cat} style={{marginBottom:12}}>
              <div className="flex-between text-sm" style={{marginBottom:4}}><span style={{color:CATEGORY_COLORS[cat],fontWeight:600}}>{cat}</span><span className="text-muted">{val.toFixed(1)} kg · {pct}%</span></div>
              <div className="progress-wrap"><div className="progress-bar" style={{width:`${pct}%`,background:CATEGORY_COLORS[cat]}}/></div>
            </div>
          );})}
        </div>
      )}
      <div className="grid-3">
        {tips.map((tip,i)=>(
          <div key={`${tip.title}-${i}`} className="tip-card">
            <div style={{fontSize:28,marginBottom:10}}>{tip.icon}</div>
            <div style={{marginBottom:6}}><span style={{background:`${CATEGORY_COLORS[tip.category]}20`,color:CATEGORY_COLORS[tip.category],padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600}}>{tip.category}</span></div>
            <div className="tip-title">{tip.title}</div>
            <div className="tip-desc">{tip.desc}</div>
            <div className={`tip-impact impact-${tip.impact}`}>{tip.impact==="High"?"🔥":"⚡"} {tip.impact} Impact</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════
function BenchmarkingPage({entries,user}){
  const[leagueTab,setLeagueTab]=useState("mine");
  const[leagueName,setLeagueName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[leagueCode,setLeagueCode]=useState("");
  const[leagueErr,setLeagueErr]=useState("");
  const[leagues,setLeagues]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ct_leagues_${user.id}`)||"[]");}catch{return[];}});
  const now=new Date();
  const monthEntries=entries.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const myTotal=parseFloat(monthEntries.reduce((s,e)=>s+Number(e.emissions),0).toFixed(1));
  const byCat={};monthEntries.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+Number(e.emissions);});
  const pctBelowAvg=myTotal<NATIONAL_AVERAGES.Total?((NATIONAL_AVERAGES.Total-myTotal)/NATIONAL_AVERAGES.Total*100).toFixed(1):null;
  const peers=[{name:"User #A291",total:580},{name:"User #B447",total:612},{name:"User #C883",total:645},{name:user.name,total:myTotal,isMe:true},{name:"User #D192",total:698},{name:"User #E551",total:734},{name:"National Avg",total:NATIONAL_AVERAGES.Total,isAvg:true}].sort((a,b)=>a.total-b.total).map((p,i)=>({...p,rank:i+1}));
  const radarData=Object.keys(NATIONAL_AVERAGES).filter(k=>k!=="Total").map(cat=>({category:cat,You:parseFloat((byCat[cat]||0).toFixed(1)),National:NATIONAL_AVERAGES[cat]}));
  function handleCreateLeague(e){
    e.preventDefault();
    if(!leagueName.trim()){setLeagueErr("League name is required");return;}
    const code=Math.random().toString(36).substring(2,8).toUpperCase();
    const league={id:Date.now(),name:leagueName.trim(),code,members:[{id:user.id,name:user.name}]};
    const updated=[...leagues,league];setLeagues(updated);
    localStorage.setItem(`ct_leagues_${user.id}`,JSON.stringify(updated));
    setLeagueCode(code);setLeagueName("");
  }
  function handleJoinLeague(e){
    e.preventDefault();
    if(!joinCode.trim()){setLeagueErr("Enter a league code");return;}
    if(leagues.some(l=>l.code===joinCode.toUpperCase())){setLeagueErr("You're already in this league.");return;}
    setLeagueErr("League not found. Ask your friend to share the code.");
  }
  return(
    <div className="fade-in">
      <div className="page-header"><div className="page-title">Comparative Benchmarking</div><div className="page-subtitle">See how your footprint compares to national averages</div></div>
      <div className="grid-4 mb-4">
        {[{label:"Your Emissions",val:myTotal,unit:"kg/month"},{label:"National Average",val:NATIONAL_AVERAGES.Total,unit:"kg/month"},{label:"Your Ranking",val:`#${peers.find(p=>p.isMe)?.rank||"—"}`,unit:`/ ${peers.length}`},{label:"vs. National",val:pctBelowAvg?`-${pctBelowAvg}%`:`+${((myTotal-NATIONAL_AVERAGES.Total)/NATIONAL_AVERAGES.Total*100).toFixed(1)}%`,unit:pctBelowAvg?"below avg":"above avg",color:pctBelowAvg?G.good:G.danger}].map((s,i)=>(
          <div key={i} className="card stat-card"><div className="stat-label">{s.label}</div><div><span className="stat-value" style={s.color?{color:s.color}:{}}>{s.val}</span> <span className="stat-unit">{s.unit}</span></div></div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{marginBottom:16}}>Category vs National Average</div>
          {Object.keys(NATIONAL_AVERAGES).filter(k=>k!=="Total").map(cat=>{
            const mine=parseFloat((byCat[cat]||0).toFixed(1));const avg=NATIONAL_AVERAGES[cat];const maxBar=Math.max(mine,avg)*1.2||100;const better=mine<=avg;
            return(
              <div key={cat} style={{marginBottom:16}}>
                <div className="flex-between text-sm" style={{marginBottom:6}}><span style={{color:CATEGORY_COLORS[cat],fontWeight:600}}>{cat}</span><span className="text-muted"><span style={{color:better?G.good:G.danger,fontWeight:600}}>{mine} kg</span> vs {avg} kg avg</span></div>
                <div style={{position:"relative",height:8,marginBottom:4}}>
                  <div style={{position:"absolute",inset:0,background:"rgba(15,31,22,.5)",borderRadius:100}}/>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${(avg/maxBar*100).toFixed(0)}%`,background:"rgba(93,158,111,.2)",borderRadius:100}}/>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${(mine/maxBar*100).toFixed(0)}%`,background:CATEGORY_COLORS[cat],borderRadius:100,transition:"width .6s ease"}}/>
                </div>
                <div className="text-xs" style={{color:better?G.good:G.danger}}>{better?`${((avg-mine)/avg*100).toFixed(0)}% below average 🌿`:`${((mine-avg)/avg*100).toFixed(0)}% above average`}</div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Footprint Radar</div>
          <div className="card-sub mb-4">You vs. national average</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(93,158,111,.15)"/>
              <PolarAngleAxis dataKey="category" tick={{fontSize:11,fill:G.sage}}/>
              <Radar name="You" dataKey="You" stroke={G.mint} fill={G.mint} fillOpacity={0.25}/>
              <Radar name="National Avg" dataKey="National" stroke={G.amber} fill={G.amber} fillOpacity={0.1}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Tooltip contentStyle={{background:G.slate,border:"1px solid rgba(93,158,111,.2)",borderRadius:8,fontSize:12}} formatter={v=>[`${v} kg CO₂e`]}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title" style={{marginBottom:16}}>Anonymised Leaderboard</div>
          <table className="data-table">
            <thead><tr><th>#</th><th>User</th><th>Monthly CO₂e</th><th></th></tr></thead>
            <tbody>
              {peers.map(p=>(
                <tr key={p.name} style={p.isMe?{background:"rgba(93,158,111,.05)"}:{}}>
                  <td className="text-sm" style={{fontWeight:700,color:p.rank<=3?G.amber:G.sage}}>#{p.rank}</td>
                  <td className="text-sm" style={{color:p.isMe?G.mint:G.cream,fontWeight:p.isMe?700:400}}>{p.isMe?"👤 You":p.isAvg?"📊 "+p.name:p.name}</td>
                  <td><strong style={{color:p.total<NATIONAL_AVERAGES.Total?G.good:G.danger}}>{p.total} kg</strong></td>
                  <td>{p.isMe&&<span style={{background:"rgba(93,158,111,.15)",color:G.mint,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>You</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-muted" style={{marginTop:12}}>All user data is anonymised.</div>
        </div>
        <div className="card">
          <div className="flex-between mb-4">
            <div className="card-title">Private Leagues</div>
            <div className="tab-group">
              {["mine","create","join"].map(t=>(
                <button key={t} className={`tab-btn ${leagueTab===t?"active":""}`} onClick={()=>{setLeagueTab(t);setLeagueErr("");setLeagueCode("");}}>{t==="mine"?"My Leagues":t==="create"?"Create":"Join"}</button>
              ))}
            </div>
          </div>
          {leagueTab==="mine"&&(leagues.length===0?(<div className="empty-state"><div className="empty-icon">🏆</div><div className="empty-title">No leagues yet</div><div className="text-sm text-muted">Create or join a league</div></div>):leagues.map(l=>(<div key={l.id} className="league-card" style={{marginBottom:10}}><div className="flex-between"><div><div style={{fontSize:14,fontWeight:600,color:G.cream}}>🏅 {l.name}</div><div className="text-xs text-muted">Code: <code style={{color:G.mint}}>{l.code}</code></div></div></div></div>)))}
          {leagueTab==="create"&&(<form onSubmit={handleCreateLeague} noValidate>{leagueCode&&<div className="alert alert-success">🎉 Created! Share code: <strong style={{color:G.mint,fontSize:18}}>{leagueCode}</strong></div>}{leagueErr&&<div className="alert alert-error">⚠️ {leagueErr}</div>}<div className="form-group"><label className="form-label">League Name</label><input className="form-input" placeholder="e.g. Office Green Challenge" value={leagueName} onChange={e=>{setLeagueName(e.target.value);setLeagueErr("");setLeagueCode("");}}/></div><button type="submit" className="btn btn-primary btn-full">🏆 Create League</button></form>)}
          {leagueTab==="join"&&(<form onSubmit={handleJoinLeague} noValidate>{leagueErr&&<div className="alert alert-error">⚠️ {leagueErr}</div>}<div className="form-group"><label className="form-label">League Code</label><input className="form-input" placeholder="e.g. AB12CD" value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setLeagueErr("");}}/></div><button type="submit" className="btn btn-primary btn-full">🤝 Join League</button></form>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
function ExportPage({entries,offsets,user}){
  const[year,setYear]=useState(new Date().getFullYear());
  const years=[...new Set(entries.map(e=>new Date(e.date).getFullYear()))].sort((a,b)=>b-a);
  if(!years.includes(new Date().getFullYear()))years.unshift(new Date().getFullYear());
  const yearEntries=entries.filter(e=>new Date(e.date).getFullYear()===Number(year));
  const totalEmissions=parseFloat(yearEntries.reduce((s,e)=>s+Number(e.emissions),0).toFixed(2));
  const totalOffset=offsets.reduce((s,o)=>s+o.totalKg,0);
  const monthlyData=Array.from({length:12},(_,i)=>({month:new Date(year,i,1).toLocaleString("en",{month:"long"}),total:0,entries:0}));
  yearEntries.forEach(e=>{const m=new Date(e.date).getMonth();monthlyData[m].total+=Number(e.emissions);monthlyData[m].entries++;});
  monthlyData.forEach(m=>{m.total=parseFloat(m.total.toFixed(2));});
  const byCat={};yearEntries.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+Number(e.emissions);});
  const catData=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  return(
    <div className="fade-in">
      <div className="page-header flex-between no-print">
        <div><div className="page-title">Annual Carbon Report</div><div className="page-subtitle">Export a professional summary of your footprint</div></div>
        <div className="flex-gap">
          <select className="form-select" style={{width:"auto"}} value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button className="btn btn-primary" onClick={()=>window.print()}>🖨 Export PDF</button>
        </div>
      </div>
      <div className="alert alert-info no-print mb-4">💡 Click "Export PDF" → use your browser's Print dialog → "Save as PDF".</div>
      <div className="card mb-4" style={{textAlign:"center",padding:"40px 24px"}}>
        <div style={{fontSize:48,marginBottom:16}}>🌿</div>
        <div style={{fontFamily:"Playfair Display, serif",fontSize:32,fontWeight:700,color:G.mint,marginBottom:8}}>Annual Carbon Footprint Report</div>
        <div style={{fontSize:20,color:G.cream,marginBottom:4}}>{user.name}</div>
        <div style={{fontSize:14,color:G.sage}}>{year} · Generated {new Date().toLocaleDateString("en",{day:"numeric",month:"long",year:"numeric"})}</div>
        <div className="separator"/>
        <div className="grid-4" style={{gap:16,marginTop:20}}>
          {[{label:"Total CO₂e",val:`${totalEmissions} kg`,color:G.mint},{label:"Activities Logged",val:yearEntries.length,color:G.amber},{label:"Total Offset",val:`${totalOffset.toFixed(1)} kg`,color:G.good},{label:"Net Emissions",val:`${Math.max(0,totalEmissions-totalOffset).toFixed(1)} kg`,color:totalEmissions-totalOffset<=0?G.good:G.danger}].map(s=>(
            <div key={s.label} style={{padding:16,background:"rgba(15,31,22,.4)",borderRadius:10}}><div style={{fontFamily:"Playfair Display, serif",fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div><div className="text-sm text-muted">{s.label}</div></div>
          ))}
        </div>
      </div>
      <div className="card mb-4">
        <div className="card-title" style={{marginBottom:16}}>Monthly Emissions — {year}</div>
        <table className="data-table">
          <thead><tr><th>Month</th><th>CO₂e (kg)</th><th>Entries</th><th>vs Monthly Avg</th></tr></thead>
          <tbody>{monthlyData.map(m=>{const diff=m.total-NATIONAL_AVERAGES.Total;return(<tr key={m.month}><td className="text-sm">{m.month}</td><td><strong style={{color:G.mint}}>{m.total}</strong></td><td className="text-sm text-muted">{m.entries}</td><td><span className="text-sm" style={{color:diff<=0?G.good:G.danger}}>{diff<=0?`-${Math.abs(diff).toFixed(1)} kg ✓`:`+${diff.toFixed(1)} kg`}</span></td></tr>);})}</tbody>
        </table>
      </div>
      {catData.length>0&&(
        <div className="card mb-4">
          <div className="card-title" style={{marginBottom:16}}>Emissions by Category</div>
          {catData.map(([cat,val])=>(
            <div key={cat} style={{marginBottom:14}}>
              <div className="flex-between text-sm" style={{marginBottom:6}}><span style={{color:CATEGORY_COLORS[cat],fontWeight:600}}>{cat}</span><span style={{color:G.cream}}>{parseFloat(val.toFixed(2))} kg ({totalEmissions>0?(val/totalEmissions*100).toFixed(1):0}%)</span></div>
              <div className="progress-wrap"><div className="progress-bar" style={{width:`${totalEmissions>0?(val/totalEmissions*100).toFixed(0):0}%`,background:CATEGORY_COLORS[cat]}}/></div>
            </div>
          ))}
        </div>
      )}
      <div style={{textAlign:"center",padding:"16px 0",color:G.sage,fontSize:12}}>Generated by CarbonTrack · Emission factors based on EPA/IPCC standards</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
function ProfilePage({user,entries,goal,offsets,onUserChange,onLogout,addToast}){
  const[form,setForm]=useState({name:user.name});
  const[pwForm,setPwForm]=useState({current:"",next:"",confirm:""});
  const[errors,setErrors]=useState({});
  const[pwErrors,setPwErrors]=useState({});
  const[saving,setSaving]=useState(false);
  const[savingPw,setSavingPw]=useState(false);
  async function handleProfile(e){
    e.preventDefault();
    if(!form.name.trim()){setErrors({name:"Name is required"});return;}
    setSaving(true);
    try{const updated=await usersApi.updateProfile(form.name);onUserChange(updated);addToast("Profile updated");}
    catch(err){addToast(err.message,"error");}
    finally{setSaving(false);}
  }
  async function handlePassword(e){
    e.preventDefault();
    const errs={};
    if(!pwForm.current)errs.current="Current password required";
    if(!validatePassword(pwForm.next))errs.next="Min. 6 characters";
    if(pwForm.next!==pwForm.confirm)errs.confirm="Passwords don't match";
    if(Object.keys(errs).length){setPwErrors(errs);return;}
    setSavingPw(true);
    try{await usersApi.changePassword(pwForm.current,pwForm.next);addToast("Password changed successfully");setPwForm({current:"",next:"",confirm:""});setPwErrors({});}
    catch(err){setPwErrors({current:err.message});}
    finally{setSavingPw(false);}
  }
  const totalEmissions=entries.reduce((s,e)=>s+Number(e.emissions),0).toFixed(1);
  const totalOffset=offsets.reduce((s,o)=>s+o.totalKg,0).toFixed(1);
  const streak=calcStreak(entries);
  return(
    <div className="fade-in">
      <div className="page-header"><div className="page-title">My Profile</div><div className="page-subtitle">Manage your account and preferences</div></div>
      <div className="grid-2" style={{alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div className="card">
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:G.fern,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:G.cream,flexShrink:0}}>{user.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{fontFamily:"Playfair Display, serif",fontSize:18,fontWeight:700,color:G.cream}}>{user.name}</div>
                <div className="text-sm text-muted">{user.email}</div>
                <div className="text-xs text-muted">Member since {new Date(user.createdAt||user.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[{val:entries.length,label:"Entries",color:G.mint},{val:`${totalEmissions}`,label:"kg CO₂e",color:G.amber},{val:`${totalOffset}`,label:"kg offset",color:G.good},{val:streak>0?`${streak}🔥`:"—",label:"day streak",color:G.amber}].map(s=>(
                <div key={s.label} style={{textAlign:"center",padding:12,background:"rgba(15,31,22,.4)",borderRadius:10}}>
                  <div style={{fontSize:16,fontWeight:700,color:s.color}}>{s.val}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>Edit Profile</div>
            <form onSubmit={handleProfile} noValidate>
              <div className="form-group"><label className="form-label">Full Name</label><input className={`form-input ${errors.name?"error":""}`} value={form.name} onChange={e=>{setForm({name:e.target.value});setErrors({});}}/>{errors.name&&<div className="form-error">{errors.name}</div>}</div>
              <div className="form-group"><label className="form-label">Email (cannot be changed)</label><input className="form-input" value={user.email} readOnly style={{opacity:.6}}/></div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save Changes"}</button>
            </form>
          </div>
        </div>
        <div className="card" style={{alignSelf:"start"}}>
          <div className="card-title" style={{marginBottom:16}}>Change Password</div>
          <form onSubmit={handlePassword} noValidate>
            {[["current","Current Password"],["next","New Password"],["confirm","Confirm New Password"]].map(([k,l])=>(
              <div className="form-group" key={k}><label className="form-label">{l}</label><input className={`form-input ${pwErrors[k]?"error":""}`} type="password" value={pwForm[k]} onChange={e=>{setPwForm(p=>({...p,[k]:e.target.value}));setPwErrors({});}}/>{pwErrors[k]&&<div className="form-error">{pwErrors[k]}</div>}</div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw?"Updating…":"Update Password"}</button>
          </form>
          <div className="separator"/>
          <button className="btn btn-danger btn-full" onClick={onLogout}>Sign Out of CarbonTrack</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
const NAV=[
  {section:"Overview",items:[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"entry",icon:"✏️",label:"Log Activity"},{id:"commute",icon:"📍",label:"Commute Tracker"}]},
  {section:"Insights",items:[{id:"goals",icon:"🎯",label:"Goals"},{id:"recommendations",icon:"💡",label:"Smart Tips"},{id:"benchmarks",icon:"🏆",label:"Benchmarks"}]},
  {section:"Climate Action",items:[{id:"offsets",icon:"🌳",label:"Carbon Offsets"}]},
  {section:"Reports",items:[{id:"export",icon:"📄",label:"Export Report"}]},
  {section:"Account",items:[{id:"profile",icon:"👤",label:"Profile"}]},
];

export default function App(){
  const[user,setUser]=useState(null);
  const[entries,setEntries]=useState([]);
  const[goal,setGoal]=useState(null);
  const[offsets,setOffsets]=useState([]);
  const[page,setPage]=useState("dashboard");
  const[appLoading,setAppLoading]=useState(true);
  const{toasts,addToast}=useToasts();

  useEffect(()=>{
    async function init(){
      const saved=authApi.getSavedUser();
      if(!saved){setAppLoading(false);return;}
      setUser(saved);
      setOffsets(getOffsets(saved.id));
      try{
        const[fetchedEntries,fetchedGoal]=await Promise.all([entriesApi.getEntries(),goalsApi.getGoal()]);
        setEntries(fetchedEntries||[]);setGoal(fetchedGoal||null);
      }catch(err){
        if(err.message?.toLowerCase().includes("token")){handleLogout();}
      }finally{setAppLoading(false);}
    }
    init();
  },[]);

  async function handleLogin(loggedInUser){
    setUser(loggedInUser);
    setOffsets(getOffsets(loggedInUser.id));
    setAppLoading(true);
    try{
      const[fetchedEntries,fetchedGoal]=await Promise.all([entriesApi.getEntries(),goalsApi.getGoal()]);
      setEntries(fetchedEntries||[]);setGoal(fetchedGoal||null);
    }catch(err){addToast("Failed to load your data","error");}
    finally{setAppLoading(false);setPage("dashboard");}
  }

  function handleLogout(){
    authApi.logout();setUser(null);setEntries([]);setGoal(null);setOffsets([]);setPage("dashboard");
  }

  function handleUserChange(updated){
    setUser(updated);localStorage.setItem('ct_user',JSON.stringify(updated));
  }

  const streak=calcStreak(entries);

  if(appLoading)return(
    <><style>{css}</style>
    <div className="loading-screen">
      <div style={{fontSize:48}}>🌿</div>
      <div className="spinner"/>
      <div style={{color:G.sage,fontSize:14}}>Loading CarbonTrack…</div>
    </div></>
  );

  if(!user)return(
    <><style>{css}</style>
    <AuthScreen onLogin={handleLogin}/>
    <div className="toast-wrap">{toasts.map(t=>(<div key={t.id} className={`toast toast-${t.type}`}>{t.type==="success"?"✅":"⚠️"} {t.msg}</div>))}</div>
    </>
  );

  return(
    <><style>{css}</style>
    <div className="app-shell">
      <aside className="sidebar no-print">
        <div className="sidebar-logo">
          <div className="logo-icon">🌿</div>
          <div className="logo-title">CarbonTrack</div>
          <div className="logo-sub">Footprint Manager</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(section=>(
            <div key={section.section}>
              <div className="nav-section">{section.section}</div>
              {section.items.map(n=>(
                <div key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                  {/* Streak badge shows organically on Log Activity nav item */}
                  {n.id==="entry"&&streak>0&&<span className="streak-badge">{streak}🔥</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">
        {page==="dashboard"&&<DashboardPage entries={entries} offsets={offsets} onNavigate={setPage}/>}
        {page==="entry"&&<DataEntryPage entries={entries} onEntriesChange={setEntries} addToast={addToast}/>}
        {page==="commute"&&<CommuteTrackerPage user={user} entries={entries} onEntriesChange={setEntries} addToast={addToast}/>}
        {page==="goals"&&<GoalsPage entries={entries} goal={goal} onGoalChange={setGoal} addToast={addToast}/>}
        {page==="recommendations"&&<RecommendationsPage entries={entries}/>}
        {page==="benchmarks"&&<BenchmarkingPage entries={entries} user={user}/>}
        {page==="offsets"&&<OffsetsPage user={user} entries={entries} offsets={offsets} onOffsetsChange={setOffsets} addToast={addToast}/>}
        {page==="export"&&<ExportPage entries={entries} offsets={offsets} user={user}/>}
        {page==="profile"&&<ProfilePage user={user} entries={entries} goal={goal} offsets={offsets} onUserChange={handleUserChange} onLogout={handleLogout} addToast={addToast}/>}
      </main>
    </div>
    <div className="toast-wrap no-print">{toasts.map(t=>(<div key={t.id} className={`toast toast-${t.type}`}>{t.type==="success"?"✅":"⚠️"} {t.msg}</div>))}</div>
    </>
  );
}