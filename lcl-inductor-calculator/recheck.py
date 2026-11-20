# -*- coding: utf-8 -*-
"""
独立复算脚本：不复用 calc_core.calc()，按公式独立重算，
再与内核 + Excel 输入单元格逐项核对，验证三者一致。
运行: python recheck.py
"""
import math
from openpyxl import load_workbook
import calc_core as core

# ---------- 1. 从 Excel 读回输入值（验证表内输入被正确写入） ----------
wb = load_workbook("LCL电感计算表.xlsx", data_only=False)
ws = wb["LCL电感计算表"]

# 依据 build_excel.py 写入顺序，输入从第4行开始，共29项
INPUT_ROWS = {
    "P":5,"Vll":6,"fg":7,"Vdc":8,"fsw":9,"pf":10,"kr":11,"J":12,
    "OD":13,"ID":14,"H":15,"mue":16,"kst":17,"Bsat":18,"Bdes":19,
    "Kut":20,"Kumax":21,"Smax":22,"kac":23,"rho":24,"acu":25,"dTcu":26,
    "sa":27,"sb":28,"sc":29,"Rth":30,"DTmax":31,"Lpumin":32,"Lpumax":33,
}
xl = {k: ws.cell(row, 4).value for k, row in INPUT_ROWS.items()}

# 与内核参数核对
kernel_params = {
    "P":core.P_KW,"Vll":core.VLL,"fg":core.FGRID,"Vdc":core.VDC,
    "fsw":core.FSW_KHZ,"pf":core.PF,"kr":core.KRIPPLE,"J":core.J,
    "OD":core.OD,"ID":core.ID,"H":core.H,"mue":core.MU_E,"kst":core.STACK_K,
    "Bsat":core.BSAT,"Bdes":core.B_DESIGN,"Kut":core.KU_TARGET,
    "Kumax":core.S_KU,"Smax":core.S_SAT,"kac":core.KAC,"rho":core.RHO_CU,
    "acu":core.ALPHA_CU,"dTcu":core.T_RISE,"sa":core.STEIN_A,"sb":core.STEIN_B,
    "sc":core.STEIN_C,"Rth":core.RTH,"DTmax":core.DT_LIMIT,
    "Lpumin":0.05,"Lpumax":0.20,
}
print("=" * 64)
print("【1】Excel 输入区 vs 内核参数核对")
bad = 0
for k, v in kernel_params.items():
    ok = math.isclose(xl[k], v, rel_tol=1e-9, abs_tol=1e-12)
    if not ok: bad += 1
    print(f"  {k:8s} Excel={xl[k]:<12.6g} 内核={v:<12.6g} {'OK' if ok else '不一致 ✗'}")
assert bad == 0, "输入区与内核参数不一致"

# ---------- 2. 独立重算（不调用 calc()） ----------
p = xl
iphase = p["P"]*1000/(math.sqrt(3)*p["Vll"]*p["pf"])
dipp   = p["kr"]*iphase
L      = p["Vdc"]/(4*p["fsw"]*1000*dipp)
zbase  = p["Vll"]**2/(p["P"]*1000)
lbase  = zbase/(2*math.pi*p["fg"])
lpu    = L/lbase
ipk    = iphase*math.sqrt(2)+dipp/2
Ae     = (p["OD"]-p["ID"])/2*p["H"]*p["kst"]/1e6
le     = math.pi*(p["OD"]+p["ID"])/2/1000
Ve     = Ae*le*1e6
Awire  = iphase/p["J"]
AN     = L*ipk/(p["Bdes"]*Ae)
nmin   = math.sqrt(AN*Awire/(p["Kut"]*p["ID"]*p["H"]))
n      = math.ceil(nmin)
N      = round(AN/n)
Awst   = p["ID"]*(n*p["H"])
stackh = n*p["H"]
bpk    = L*ipk/(N*n*Ae)
margin = bpk/p["Bsat"]
ku     = N*Awire/Awst
mlt    = (2*stackh+(p["OD"]-p["ID"])+20)/1000
rdc    = p["rho"]*(1+p["acu"]*p["dTcu"])*N*mlt/(Awire/1e6)
rac    = p["kac"]*rdc
pcu    = iphase**2*rac
dB     = L*dipp/(N*n*Ae)
Bac    = dB/2
pv     = p["sa"]*Bac**p["sb"]*p["fsw"]**p["sc"]
pfe    = pv*(n*Ve)/1000
ptot   = pcu+pfe
dt     = ptot*p["Rth"]

indep = dict(
    iphase=iphase, dipp=dipp, L=L, lpu=lpu, ipk=ipk, Ae=Ae, le=le, Ve=Ve,
    Awire=Awire, AN=AN, n=n, N=N, Awst=Awst, stackh=stackh, bpk=bpk,
    margin=margin, ku=ku, mlt=mlt, rdc=rdc, rac=rac, pcu=pcu, dB=dB,
    Bac=Bac, pv=pv, pfe=pfe, ptot=ptot, dt=dt,
)

# ---------- 3. 与内核逐项比对 ----------
res = core.calc()
print("\n" + "=" * 64)
print("【2】独立复算 vs 内核 calc() 逐项核对")
pairs = [
    ("额定相电流 A", "iphase", "iphase"),
    ("纹波峰峰值 A", "dipp", "dip_pp"),
    ("电感量 H", "L", "L"),
    ("标幺值 pu", "lpu", "lpu"),
    ("峰值电流 A", "ipk", "ipk"),
    ("单芯截面 m²", "Ae", "Ae"),
    ("磁路长 m", "le", "le"),
    ("单芯体积 cm³", "Ve", "Ve"),
    ("导体截面 mm²", "Awire", "Awire"),
    ("安匝积 A·turn", "AN", "AN"),
    ("并联芯数 n", "n", "n"),
    ("匝数 N", "N", "N"),
    ("叠堆窗口 mm²", "Awst", "Aw_stack"),
    ("叠堆高度 mm", "stackh", "stack_h"),
    ("峰值磁密 T", "bpk", "bpk"),
    ("饱和裕度", "margin", "sat_margin"),
    ("窗口利用率", "ku", "ku_act"),
    ("匝长 m", "mlt", "mlt"),
    ("直流电阻 Ω", "rdc", "rdc"),
    ("交流电阻 Ω", "rac", "rac"),
    ("铜损 W", "pcu", "pcu"),
    ("磁密峰峰 T", "dB", "db_pp"),
    ("磁密幅值 T", "Bac", "bac"),
    ("铁损密度 mW/cm³", "pv", "pv"),
    ("铁损 W", "pfe", "pfe"),
    ("总损耗 W", "ptot", "ptotal"),
    ("温升 K", "dt", "dt"),
]
mismatch = 0
for label, ik, rk in pairs:
    a, b = indep[ik], res[rk]
    ok = math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)
    if not ok: mismatch += 1
    print(f"  {label:20s} 复算={a:12.5f} 内核={b:12.5f} {'OK' if ok else '不一致 ✗'}")
assert mismatch == 0, "复算与内核不一致"

# ---------- 4. 校核区判定复算 ----------
print("\n" + "=" * 64)
print("【3】校核项独立判定")
checks = [
    ("标幺值 5%~20%", 0.05 <= lpu <= 0.20, f"{lpu*100:.2f}%"),
    ("饱和裕度 <0.8", margin < p["Smax"], f"{margin:.4f}"),
    ("窗口利用率 <0.5", ku < p["Kumax"], f"{ku:.4f}"),
    ("稳态温升 <50K", dt < p["DTmax"], f"{dt:.2f}K"),
]
failed = []
for name, ok, val in checks:
    print(f"  {name:20s} 实测={val:>10s}  {'PASS' if ok else 'FAIL'}")
    if not ok: failed.append(name)

print("\n" + "=" * 64)
print("【4】未通过项及调整建议")
if not failed:
    print("  全部校核项通过。")
else:
    for f in failed:
        print(f"  ✗ {f}")
    print("\n  调整建议（针对温升超标）：")
    print("   - 降低设计磁密 Bdesign（0.60→0.50T）：匝数与铜损同步下降，但电感体积增大；")
    print("   - 提高并联芯数 n：降低每芯磁密与铜损，代价是体积与成本；")
    print("   - 降低电流纹波率 kr：ΔIpp 减小→所需电感增大，但铜损按 Iph 计基本不变；")
    print("   - 减小 Rth：加强风道/增大散热面积/提高风速，或改强迫液冷；")
    print("   - 增大导体截面（降低 J）：铜损下降，但窗口利用率上升，需再平衡 n。")

print("\n结论：输入区、复算、内核三者一致；" +
      ("全部通过。" if not failed else f"{len(failed)} 项未通过，见上。"))
