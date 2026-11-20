# -*- coding: utf-8 -*-
"""生成三区结构 Excel 计算表：输入区(黄)/计算区(灰,联动公式)/校核区(绿,自动PASS-FAIL)"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule, FormulaRule

wb = Workbook()
ws = wb.active
ws.title = "LCL电感计算表"

# ============ 样式 ============
F_TITLE = Font(name="微软雅黑", size=16, bold=True, color="FFFFFF")
F_SEC   = Font(name="微软雅黑", size=11, bold=True, color="FFFFFF")
F_HEAD  = Font(name="微软雅黑", size=10, bold=True, color="222222")
F_NORM  = Font(name="微软雅黑", size=10, color="222222")
F_NOTE  = Font(name="微软雅黑", size=9, italic=True, color="888888")
F_BOLD  = Font(name="微软雅黑", size=10, bold=True, color="222222")

FILL_TITLE = PatternFill("solid", fgColor="1F3864")
FILL_IN    = PatternFill("solid", fgColor="FFF2CC")   # 黄：输入
FILL_CALC  = PatternFill("solid", fgColor="E7E6E6")   # 灰：计算
FILL_CHK   = PatternFill("solid", fgColor="E2EFDA")   # 绿：校核
FILL_SEC_IN   = PatternFill("solid", fgColor="BF8F00")
FILL_SEC_CALC = PatternFill("solid", fgColor="808080")
FILL_SEC_CHK  = PatternFill("solid", fgColor="548235")
FILL_HEAD  = PatternFill("solid", fgColor="D9E1F2")

thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT   = Alignment(horizontal="left", vertical="center", wrap_text=True)

for col, w in {"A":6, "B":26, "C":12, "D":16, "E":12, "F":40, "G":30}.items():
    ws.column_dimensions[col].width = w

r = 1
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
c = ws.cell(r, 1, "PCS 网侧 LCL 滤波电感设计计算表")
c.font = F_TITLE; c.fill = FILL_TITLE; c.alignment = CENTER
ws.row_dimensions[r].height = 30
r += 1
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
c = ws.cell(r, 1, "图例：黄色=输入区（可修改）　灰色=计算区（联动公式，勿改）　绿色=校核区（自动 PASS/FAIL）")
c.font = F_NOTE; c.alignment = LEFT
r += 1

inputs = {}   # key -> (cell_addr, value)

def section(title, fill):
    global r
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
    c = ws.cell(r, 1, title); c.font = F_SEC; c.fill = fill; c.alignment = LEFT
    r += 1

def header():
    global r
    for j, h in enumerate(["序号", "项目", "符号", "数值", "单位", "公式/依据", "备注"], 1):
        c = ws.cell(r, j, h); c.font = F_HEAD; c.fill = FILL_HEAD; c.alignment = CENTER; c.border = BORDER
    r += 1

def add_input(key, name, sym, val, unit, basis, note=""):
    global r
    vals = [len(inputs)+1, name, sym, val, unit, basis, note]
    for j, v in enumerate(vals, 1):
        c = ws.cell(r, j, v)
        c.font = F_NORM; c.alignment = LEFT if j in (2,6,7) else CENTER
        c.border = BORDER
        if j == 4: c.fill = FILL_IN; c.font = F_BOLD
    inputs[key] = f"D{r}"
    r += 1

# ================= 输入区 =================
section("一、输入区（黄色单元格可修改）", FILL_SEC_IN)
header()
add_input("P",      "额定功率", "P", 430.0, "kW", "工况给定")
add_input("Vll",    "网侧线电压", "Vll", 690.0, "V", "工况给定", "RMS 线电压")
add_input("fg",     "电网频率", "fg", 50.0, "Hz", "工况给定")
add_input("Vdc",    "直流母线电压", "Vdc", 1100.0, "V", "工况给定")
add_input("fsw",    "开关频率", "fsw", 5.0, "kHz", "工况给定")
add_input("pf",     "功率因数", "pf", 0.99, "-", "工况给定")
add_input("kr",     "电流纹波率", "kr", 0.30, "-", "工况给定", "ΔIpp / I相额定")
add_input("J",      "电流密度", "J", 6.0, "A/mm²", "工况给定")
add_input("OD",     "环形外径", "OD", 150.0, "mm", "工况给定")
add_input("ID",     "环形内径", "ID", 90.0, "mm", "参考值", "按实际料号核对")
add_input("H",      "单芯高度", "H", 30.0, "mm", "参考值", "按实际料号核对")
add_input("mue",    "有效磁导率", "μe", 60.0, "-", "工况给定", "Kool Mu 60μ")
add_input("kst",    "叠片/填充系数", "kst", 0.95, "-", "参考值")
add_input("Bsat",   "饱和磁密", "Bsat", 1.0, "T", "Kool Mu 60μ 查证", "10500 Gauss")
add_input("Bdes",   "设计峰值磁密", "Bdesign", 0.60, "T", "降额取值", "通常 0.5~0.7T")
add_input("Kut",    "目标窗口利用率", "Ku_t", 0.40, "-", "设计取值")
add_input("Kumax",  "窗口利用率上限", "Ku_max", 0.50, "-", "校核阈值")
add_input("Smax",   "饱和裕度上限", "S_max", 0.80, "-", "校核阈值", "Bpk/Bsat")
add_input("kac",    "交流电阻系数", "kac", 1.30, "-", "5kHz 多股并绕参考")
add_input("rho",    "铜电阻率@20℃", "ρcu", 1.72e-8, "Ω·m", "材料常数")
add_input("acu",    "铜温度系数", "αcu", 0.00393, "/K", "材料常数")
add_input("dTcu",   "电阻温升参考", "ΔTcu", 40.0, "K", "参考值", "热态电阻估算")
add_input("sa",     "Steinmetz a", "a", 18.01, "-", "Kool Mu 60μ", "P[mW/cm³]=a·B^b·f^c")
add_input("sb",     "Steinmetz b", "b", 1.602, "-", "Kool Mu 60μ")
add_input("sc",     "Steinmetz c", "c", 1.401, "-", "Kool Mu 60μ")
add_input("Rth",    "磁芯-环境热阻", "Rth", 0.030, "K/W", "参考值", "强制风冷+风道，需实测")
add_input("DTmax",  "稳态温升上限", "ΔTmax", 50.0, "K", "校核阈值")
add_input("Lpumin", "标幺值下限", "Lpu_min", 0.05, "pu", "工程经验")
add_input("Lpumax", "标幺值上限", "Lpu_max", 0.20, "pu", "工程经验")

def I(k): return inputs[k]

# ================= 计算区 =================
section("二、计算区（灰色为联动公式，请勿手动修改）", FILL_SEC_CALC)
header()

def add_calc(key, name, sym, formula, unit, basis, fmt="0.000", note=""):
    global r
    vals = [len(inputs)+1, name, sym, formula, unit, basis, note]
    for j, v in enumerate(vals, 1):
        c = ws.cell(r, j, v)
        c.font = F_NORM; c.alignment = LEFT if j in (2,6,7) else CENTER
        c.border = BORDER
        if j == 4:
            c.fill = FILL_CALC; c.font = F_BOLD; c.number_format = fmt
    calc[key] = f"D{r}"
    r += 1

calc = {}
add_calc("Iphase", "额定相电流", "Iph",
    f"={I('P')}*1000/(SQRT(3)*{I('Vll')}*{I('pf')})", "A", "P/(√3·Vll·pf)", "0.00")
add_calc("dIpp", "纹波电流峰峰值", "ΔIpp",
    f"={I('kr')}*{calc['Iphase']}", "A", "kr·Iph", "0.00")
add_calc("L", "所需电感量", "L",
    f"={I('Vdc')}/(4*{I('fsw')}*1000*{calc['dIpp']})", "H", "Vdc/(4·fsw·ΔIpp)", "0.000000")
add_calc("L_uH", "所需电感量", "L", f"={calc['L']}*1e6", "μH", "L×10⁶", "0.0")
add_calc("zbase", "基准阻抗", "Zb",
    f"={I('Vll')}^2/({I('P')}*1000)", "Ω", "Vll²/P", "0.000")
add_calc("lbase", "基准电感", "Lb",
    f"={calc['zbase']}/(2*PI()*{I('fg')})", "H", "Zb/(2π·fg)", "0.000000")
add_calc("lpu", "电感标幺值", "Lpu",
    f"={calc['L']}/{calc['lbase']}", "pu", "L/Lb", "0.0000")
add_calc("lpu_pct", "电感标幺值", "Lpu", f"={calc['lpu']}*100", "%", "Lpu×100", "0.00")
add_calc("ipk", "峰值电感电流", "Ipk",
    f"={calc['Iphase']}*SQRT(2)+{calc['dIpp']}/2", "A", "√2·Iph + ΔIpp/2", "0.00")
add_calc("Ae", "单芯截面积", "Ae",
    f"=({I('OD')}-{I('ID')})/2*{I('H')}*{I('kst')}/1e6", "m²", "(OD-ID)/2·H·kst", "0.000000")
add_calc("Ae_mm2", "单芯截面积", "Ae",
    f"={calc['Ae']}*1e6", "mm²", "Ae×10⁶", "0.0")
add_calc("le", "平均磁路长", "le",
    f"=PI()*({I('OD')}+{I('ID')})/2/1000", "m", "π(OD+ID)/2", "0.000")
add_calc("le_mm", "平均磁路长", "le", f"={calc['le']}*1000", "mm", "le×10³", "0.0")
add_calc("Ve", "单芯体积", "Ve",
    f"={calc['Ae']}*{calc['le']}*1e6", "cm³", "Ae·le", "0.0")
add_calc("Awire", "每匝导体截面", "Awire",
    f"={calc['Iphase']}/{I('J')}", "mm²", "Iph/J", "0.00")
add_calc("AN", "安匝积 N·n", "N·n",
    f"={calc['L']}*{calc['ipk']}/({I('Bdes')}*{calc['Ae']})", "A·turn", "L·Ipk/(Bdesign·Ae)", "0.0")
add_calc("n_min", "理论最小并联芯数", "n_min",
    f"=SQRT({calc['AN']}*{calc['Awire']}/({I('Kut')}*{I('ID')}*{I('H')}))", "-",
    "√(N·n·Awire/(Ku_t·ID·H))", "0.00")
add_calc("n", "并联磁芯数", "n", f"=CEILING({calc['n_min']},1)", "-", "向上取整", "0")
add_calc("N", "绕组匝数", "N", f"=ROUND({calc['AN']}/{calc['n']},0)", "turn", "N·n/n 取整", "0")
add_calc("Aw_stack", "叠堆有效窗口", "Aw",
    f"={I('ID')}*({calc['n']}*{I('H')})", "mm²", "ID·(n·H)", "0")
add_calc("stack_h", "叠堆高度", "h", f"={calc['n']}*{I('H')}", "mm", "n·H", "0")
add_calc("bpk", "实际峰值磁密", "Bpk",
    f"={calc['L']}*{calc['ipk']}/({calc['N']}*{calc['n']}*{calc['Ae']})", "T",
    "L·Ipk/(N·n·Ae)", "0.000")
add_calc("sat_margin", "饱和裕度", "Bpk/Bsat",
    f"={calc['bpk']}/{I('Bsat')}", "-", "Bpk/Bsat", "0.000")
add_calc("ku_act", "实际窗口利用率", "Ku",
    f"={calc['N']}*{calc['Awire']}/{calc['Aw_stack']}", "-", "N·Awire/Aw", "0.000")
add_calc("mlt", "平均每匝长", "MLT",
    f"=(2*{calc['stack_h']}+({I('OD')}-{I('ID')})+20)/1000", "m", "2h+(OD-ID)+余量", "0.000")
add_calc("rdc", "直流电阻", "Rdc",
    f"={I('rho')}*(1+{I('acu')}*{I('dTcu')})*{calc['N']}*{calc['mlt']}/({calc['Awire']}/1e6)",
    "Ω", "ρ(1+α·ΔT)·N·MLT/Awire", "0.000000")
add_calc("rac", "交流电阻", "Rac", f"={I('kac')}*{calc['rdc']}", "Ω", "kac·Rdc", "0.000000")
add_calc("pcu", "铜损", "Pcu", f"={calc['Iphase']}^2*{calc['rac']}", "W", "Iph²·Rac", "0.0")
add_calc("db_pp", "交流磁密峰峰值", "ΔB",
    f"={calc['L']}*{calc['dIpp']}/({calc['N']}*{calc['n']}*{calc['Ae']})", "T",
    "L·ΔIpp/(N·n·Ae)", "0.0000")
add_calc("bac", "交流磁密幅值", "Bac", f"={calc['db_pp']}/2", "T", "ΔB/2", "0.0000")
add_calc("pv", "铁损密度", "Pv",
    f"={I('sa')}*{calc['bac']}^{I('sb')}*{I('fsw')}^{I('sc')}", "mW/cm³",
    "a·Bac^b·fsw^c", "0.000")
add_calc("pfe", "铁损", "Pfe", f"={calc['pv']}*({calc['n']}*{calc['Ve']})/1000", "W",
    "Pv·(n·Ve)/1000", "0.00")
add_calc("ptotal", "总损耗", "Ploss", f"={calc['pcu']}+{calc['pfe']}", "W", "Pcu+Pfe", "0.0")
add_calc("dt", "稳态温升", "ΔT", f"={calc['ptotal']}*{I('Rth')}", "K", "Ploss·Rth", "0.0")

# ================= 校核区 =================
section("三、校核区（绿色，自动 PASS / FAIL）", FILL_SEC_CHK)
for j, h in enumerate(["序号", "校核项", "条件", "实测值", "判据", "结果", "说明"], 1):
    c = ws.cell(r, j, h); c.font = F_HEAD; c.fill = FILL_HEAD; c.alignment = CENTER; c.border = BORDER
r += 1

chk_rows = []
def add_check(name, cond, value_formula, judge_formula, note=""):
    global r
    idx = len(chk_rows) + 1
    row = [idx, name, cond, value_formula, "", judge_formula, note]
    for j, v in enumerate(row, 1):
        c = ws.cell(r, j, v)
        c.font = F_NORM; c.alignment = LEFT if j in (2,7) else CENTER; c.border = BORDER
        if j in (3,4,5,6): c.fill = FILL_CHK
    chk_rows.append(r)
    r += 1

add_check("标幺值区间", "5% ≤ Lpu ≤ 20%", f"={calc['lpu_pct']}",
    f'=IF(AND({calc["lpu"]}>={I("Lpumin")},{calc["lpu"]}<={I("Lpumax")}),"PASS","FAIL")',
    "网侧电感量级合理性")
add_check("饱和裕度", "Bpk/Bsat < 0.8", f"={calc['sat_margin']}",
    f'=IF({calc["sat_margin"]}<{I("Smax")},"PASS","FAIL")', "避免磁芯饱和")
add_check("窗口利用率", "Ku < 0.5", f"={calc['ku_act']}",
    f'=IF({calc["ku_act"]}<{I("Kumax")},"PASS","FAIL")', "绕组可绕下")
add_check("稳态温升", "ΔT < 50 K", f"={calc['dt']}",
    f'=IF({calc["dt"]}<{I("DTmax")},"PASS","FAIL")', "强制风冷散热能力")

# 综合结论
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
c = ws.cell(r, 1, "综合结论"); c.font = F_BOLD; c.fill = FILL_CHK; c.alignment = CENTER; c.border = BORDER
first_chk, last_chk = chk_rows[0], chk_rows[-1]
c = ws.cell(r, 6, f'=IF(COUNTIF(F{first_chk}:F{last_chk},"FAIL")=0,"全部通过","存在未通过项")')
c.font = F_BOLD; c.fill = FILL_CHK; c.alignment = CENTER; c.border = BORDER
c = ws.cell(r, 7, "任一校核项 FAIL 即提示"); c.font = F_NORM; c.alignment = LEFT; c.border = BORDER
conclusion_row = r
r += 1

# 条件格式：FAIL 红字红底，PASS 绿字
red_fill = PatternFill("solid", fgColor="FFC7CE")
red_font = Font(name="微软雅黑", size=10, bold=True, color="9C0006")
green_font = Font(name="微软雅黑", size=10, bold=True, color="006100")
fcol = f"F{first_chk}:F{conclusion_row}"
ws.conditional_formatting.add(fcol, CellIsRule(operator="equal", formula=['"FAIL"'], fill=red_fill, font=red_font))
ws.conditional_formatting.add(fcol, CellIsRule(operator="equal", formula=['"PASS"'], font=green_font))
ws.conditional_formatting.add(f"F{conclusion_row}", CellIsRule(operator="equal", formula=['"存在未通过项"'], fill=red_fill, font=red_font))
ws.conditional_formatting.add(f"F{conclusion_row}", CellIsRule(operator="equal", formula=['"全部通过"'], font=green_font))

r += 1
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
c = ws.cell(r, 1, "注：Kool Mu 60μ 材料常数 Bsat=1.0T、Steinmetz(a,b,c)=(18.01,1.602,1.401) 来源于 Magnetics 官方手册；ID/H/Rth/kac 为工程参考值，请按实际料号与散热条件核对后填入。")
c.font = F_NOTE; c.alignment = LEFT
ws.row_dimensions[r].height = 30

ws.freeze_panes = "A4"

# ================= 案例说明与方法 =================
ws2 = wb.create_sheet("案例说明与方法")
for col, w in {"A":4, "B":30, "C":95}.items():
    ws2.column_dimensions[col].width = w
rr = 1
def title2(t):
    global rr
    ws2.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=3)
    c = ws2.cell(rr, 1, t); c.font = F_TITLE; c.fill = FILL_TITLE; c.alignment = CENTER
    ws2.row_dimensions[rr].height = 28
    rr += 1
def sec2(t):
    global rr
    ws2.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=3)
    c = ws2.cell(rr, 1, t); c.font = F_SEC; c.fill = FILL_SEC_CALC; c.alignment = LEFT
    rr += 1
def kv(k, v):
    global rr
    c = ws2.cell(rr, 2, k); c.font = F_BOLD; c.alignment = LEFT; c.border = BORDER
    c = ws2.cell(rr, 3, v); c.font = F_NORM; c.alignment = LEFT; c.border = BORDER
    ws2.row_dimensions[rr].height = max(20, 16 * (1 + v.count("\n")))
    rr += 1

title2("PCS 网侧 LCL 滤波电感 — 案例说明与方法")
sec2("1. 设计目标")
kv("任务", "由纹波率确定网侧 LCL 滤波电感量，用峰值磁密法完成 Kool Mu 60μ 环形磁芯的选型（并联芯数与匝数），并做饱和、窗口、温升三项校验。")
kv("工况", "430kW / 690V(线) / 50Hz / 母线1100V / 开关5kHz / pf0.99 / 纹波率0.30 / 电流密度6A·mm⁻² / 强制风冷 / Kool Mu 60μ 环形 OD150")
sec2("2. 计算流程与公式依据")
kv("① 额定电流", "Iph = P/(√3·Vll·pf)。三相功率按线电压计算，得额定相电流（RMS）。")
kv("② 纹波电流", "ΔIpp = kr·Iph，纹波率相对额定相电流。")
kv("③ 电感量", "L = Vdc/(4·fsw·ΔIpp)。单相/两电平近似下电感电压伏秒平衡的工程估算式，适合初设与量级校验。")
kv("④ 标幺值", "Zb=Vll²/P，Lb=Zb/(2π·fg)，Lpu=L/Lb。网侧电感通常取 5%~20%，用于确认量级合理。")
kv("⑤ 峰值电流", "Ipk = √2·Iph + ΔIpp/2，为饱和校验用的最坏情况峰值。")
kv("⑥ 安匝积", "N·n = L·Ipk/(Bdesign·Ae)。由法拉第定律与磁动势平衡推导，是峰值磁密法的核心。")
kv("⑦ 并联芯数 n", "由窗口约束 N·Awire ≤ Ku·ID·(n·H) 与 ⑥ 联立得 n ≥ √(N·n·Awire/(Ku·ID·H))，向上取整；再由 N=(N·n)/n 求匝数。")
kv("⑧ 峰值磁密", "Bpk = L·Ipk/(N·n·Ae)，校验 Bpk/Bsat<0.8，留饱和裕度。")
kv("⑨ 铜损", "Rdc=ρ(1+α·ΔT)·N·MLT/Awire，Rac=kac·Rdc，Pcu=Iph²·Rac。kac 计入趋肤/邻近效应（5kHz 多股并绕取 1.3）。")
kv("⑩ 铁损", "Steinmetz：Pv=a·Bac^b·fsw^c [mW/cm³]，Bac=ΔB/2，ΔB=L·ΔIpp/(N·n·Ae)。Pfe=Pv·(n·Ve)/1000。Kool Mu 60μ 系数取手册值。")
kv("⑪ 温升", "Ptotal=Pcu+Pfe，ΔT=Ptotal·Rth。Rth 为磁芯-环境热阻，强风冷需按风道实测。")
sec2("3. 材料常数来源")
kv("Bsat", "Kool Mu（FeSiAl）60μ 饱和磁密 1.0T（10500 Gauss），来源 Magnetics Powder Core Catalog / Kool Mu Bulletin。")
kv("Steinmetz", "60μ 环形：P[mW/cm³]=a·B^b·f^c，a=18.01, b=1.602, c=1.401（B单位T，f单位kHz），来源 Magnetics 官方损耗曲线拟合系数。")
kv("需核对项", "磁芯内径 ID、高度 H 为 OD150 系列的工程参考值；热阻 Rth、交流系数 kac、设计磁密 Bdesign 均为设计假设，最终以选定料号手册与热测试为准。")
sec2("4. 三区结构使用说明")
kv("输入区（黄）", "只改黄色单元格。改完计算区、校核区通过公式自动联动更新。")
kv("计算区（灰）", "全部为联动公式，请勿手动覆盖。")
kv("校核区（绿）", "自动判定 PASS/FAIL，FAIL 显示红底红字；综合结论给出总体结论。")
kv("复算脚本", "同目录 recheck.py 独立实现同一套公式，用于对全部输出量逐项复算核对。")

wb.save("LCL电感计算表.xlsx")
print("已生成 LCL电感计算表.xlsx")
print("输入单元格:", len(inputs), "计算单元格:", len(calc), "校核项:", len(chk_rows))
print("关键地址:", {k: inputs[k] for k in ["Bsat","Rth","fsw"]})
