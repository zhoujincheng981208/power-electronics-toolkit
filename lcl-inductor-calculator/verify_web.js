// 抽取网页 calc() 的纯计算逻辑，与 Python 内核比对，验证网页公式无误
const S = {
  P:430, Vll:690, fg:50, Vdc:1100, fsw:5, pf:0.99, kr:0.30, J:6,
  OD:150, ID:90, H:30, kst:0.95, Bsat:1.0, Bdes:0.60,
  Kut:0.40, kac:1.30, rho:1.72e-8, acu:0.00393,
  dTcu:40, sa:18.01, sb:1.602, sc:1.401, Rth:0.030
};
function webcalc(){
  const {P,Vll,fg,Vdc,fsw,pf,kr,J,OD,ID,H,kst,Bdes,Kut,kac,rho,acu,dTcu,sa,sb,sc,Rth}=S;
  const iphase=P*1000/(Math.sqrt(3)*Vll*pf);
  const dipp=kr*iphase;
  const L=Vdc/(4*fsw*1000*dipp);
  const zbase=Vll*Vll/(P*1000), lbase=zbase/(2*Math.PI*fg);
  const lpu=L/lbase;
  const ipk=iphase*Math.SQRT2+dipp/2;
  const Ae=(OD-ID)/2*H*kst/1e6;
  const le=Math.PI*(OD+ID)/2/1000;
  const Ve=Ae*le*1e6;
  const Awire=iphase/J;
  const AN=L*ipk/(Bdes*Ae);
  const n=Math.ceil(Math.sqrt(AN*Awire/(Kut*ID*H)));
  const N=Math.round(AN/n);
  const stackh=n*H;
  const Aw=ID*stackh;
  const bpk=L*ipk/(N*n*Ae);
  const ku=N*Awire/Aw;
  const mlt=(2*stackh+(OD-ID)+20)/1000;
  const rdc=rho*(1+acu*dTcu)*N*mlt/(Awire/1e6);
  const rac=kac*rdc;
  const pcu=iphase*iphase*rac;
  const dB=L*dipp/(N*n*Ae);
  const bac=dB/2;
  const pv=sa*Math.pow(bac,sb)*Math.pow(fsw,sc);
  const pfe=pv*(n*Ve)/1000;
  const ptot=pcu+pfe;
  const dt=ptot*Rth;
  return {iphase,dipp,L,lpu,ipk,Ae,le,Ve,Awire,AN,n,N,stackh,Aw,bpk,ku,mlt,rdc,rac,pcu,bac,pv,pfe,ptot,dt};
}

// Python 内核输出（由 calc_core.py 打印后固化于此，作为基准）
const PY = {
  iphase:363.4323,dipp:109.0297,L:0.000504450,lpu:0.143132,ipk:568.4858,
  Ae:0.000855,le:0.376991,Ve:322.32741,Awire:60.57205,AN:559.0107,
  n:6,N:93,stackh:180,Aw:16200,bpk:0.60109,ku:0.34773,mlt:0.44,
  rdc:0.0134462,rac:0.0174801,pcu:2308.8230,bac:0.05764,pv:1.77609,
  pfe:3.43489,ptot:2312.2579,dt:69.3677
};
const w = webcalc();
console.log("=".repeat(58));
console.log("网页 JS vs Python 内核 逐项比对");
console.log("=".repeat(58));
let bad=0;
for(const k of Object.keys(PY)){
  const ok=Math.abs(w[k]-PY[k])<=Math.max(1e-4,Math.abs(PY[k])*1e-4);
  if(!ok)bad++;
  console.log(`  ${k.padEnd(10)} JS=${w[k].toFixed(6).padStart(12)} PY=${PY[k].toFixed(6).padStart(12)} ${ok?'OK':'不一致 ✗'}`);
}
console.log("=".repeat(58));
console.log(bad===0 ? "结论：网页计算与内核完全一致 ✓" : `结论：${bad} 项不一致 ✗`);
process.exit(bad===0?0:1);
