/**
 * 验证网页 JS 计算逻辑与 Python 内核逐项一致
 */
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const pyOut = cp.execSync('python export_core.py', {cwd: __dirname}).toString().trim();
const pyRes = JSON.parse(pyOut);

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('未找到 core 脚本'); process.exit(1); }
eval(m[1]);

const js = solveQR(DEMO);
let pass = 0, fail = 0;
const TOL = 1e-6;
console.log('===== QR 反激网页 vs 内核 =====');
for (const k of Object.keys(pyRes)) {
  if (k === 'checks' || k === 'hist' || k === 'converged') continue;
  if (typeof pyRes[k] !== 'number') continue;
  const a = js[k], b = pyRes[k];
  const ok = Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
  console.log(`  [${ok?'OK':'XX'}] ${k.padEnd(12)} js=${a.toPrecision(9)}  py=${b.toPrecision(9)}`);
  ok ? pass++ : fail++;
}
for (const name of Object.keys(pyRes.checks)) {
  const ok = pyRes.checks[name][0] === js.checks[name][0];
  console.log(`  [${ok?'OK':'XX'}] 校核:${name.padEnd(8)} js=${js.checks[name][0]}  py=${pyRes.checks[name][0]}`);
  ok ? pass++ : fail++;
}
// 迭代序列逐项比对
const pyHist = JSON.parse(cp.execSync('python -c "import json,calc_core as c; print(json.dumps(c.solve_qr(c.P_DEMO)[\'hist\']))"', {cwd: __dirname}).toString().trim());
const hn = Math.min(pyHist.length, js.hist.length);
let hpass = 0, hfail = 0;
for (let i = 0; i < hn; i++) {
  for (const kk of ['Fg','Ipk','Ton','Treset','Tres','Ts','Fc','err']) {
    const ok = Math.abs(js.hist[i][kk] - pyHist[i][kk]) <= TOL*Math.max(1,Math.abs(pyHist[i][kk]));
    ok ? hpass++ : hfail++;
    if (!ok) console.log(`  [XX] hist[${i}].${kk} js=${js.hist[i][kk]} py=${pyHist[i][kk]}`);
  }
}
console.log(`  迭代序列: ${hpass} 项一致 / ${hfail} 项不一致（共 ${hn} 步）`);
fail += hfail; pass += hpass;
console.log(`\n===== 合计: ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
