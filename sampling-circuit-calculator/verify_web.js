/**
 * 验证网页JS计算逻辑与Python内核(calc_core.py)逐项一致
 * 方法：运行 Python 内核导出 JSON，用 Node 抽取网页 id=core 的脚本执行，逐项比对
 */
const fs = require('fs');
const cp = require('child_process');

// 1) 取 Python 内核结果（由 export_core.py 输出 JSON）
const pyOut = cp.execSync('python export_core.py', {cwd: __dirname}).toString().trim();
const pyRes = JSON.parse(pyOut);

// 2) 抽取网页 core 脚本并 eval
const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!m) { console.error('未找到 core 脚本'); process.exit(1); }
eval(m[1]);

// 3) 映射：网页 key -> python key（仅键名相同的比对数值）
const calls = {
  div: calcDivider(DEMO.div),
  ct:  calcCT(DEMO.ct),
  hall:calcHall(DEMO.hall),
};

let pass = 0, fail = 0;
const TOL = 1e-6;
for (const tab of ['div','ct','hall']) {
  const js = calls[tab], py = pyRes[tab];
  console.log('\n===== ' + tab + ' =====');
  for (const k of Object.keys(py)) {
    if (k === 'checks') continue;
    if (typeof py[k] !== 'number') continue;
    if (!(k in js)) { console.log(`  [缺] ${k}: 网页无此键`); fail++; continue; }
    const a = js[k], b = py[k];
    const ok = Math.abs(a-b) <= TOL*Math.max(1,Math.abs(b));
    console.log(`  [${ok?'OK':'XX'}] ${k.padEnd(12)} js=${a.toPrecision(8)}  py=${b.toPrecision(8)}`);
    ok ? pass++ : fail++;
  }
  // 校核项判定比对
  for (const name of Object.keys(py.checks)) {
    const pyOK = py.checks[name][0];
    const jsOK = js.checks[name][0];
    const ok = pyOK === jsOK;
    console.log(`  [${ok?'OK':'XX'}] 校核:${name.padEnd(8)} js=${jsOK}  py=${pyOK}`);
    ok ? pass++ : fail++;
  }
}
console.log(`\n===== 合计: ${pass} 通过 / ${fail} 失败 =====`);
process.exit(fail ? 1 : 0);
