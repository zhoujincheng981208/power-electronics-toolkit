# -*- coding: utf-8 -*-
"""
PCS 网侧 LCL 滤波电感设计计算内核
所有公式集中于此，Excel / 复算脚本 / 网页共用同一套逻辑。
"""
import math

# ============ 输入区 ============
# 工况（用户给定）
P_KW      = 430.0     # 额定功率 kW
VLL       = 690.0     # 网侧线电压 V (RMS)
FGRID     = 50.0      # 电网频率 Hz
VDC       = 1100.0    # 直流母线 V
FSW_KHZ   = 5.0       # 开关频率 kHz
PF        = 0.99      # 功率因数
KRIPPLE   = 0.30      # 电流纹波率 (相对额定相电流)
J         = 6.0       # 电流密度 A/mm^2

# 磁芯与材料（参考值 / 查证值，需按实际料号核对）
OD        = 150.0     # 环形外径 mm（给定）
ID        = 90.0      # 环形内径 mm（参考）
H         = 30.0      # 环形高度 mm（参考）
MU_E      = 60.0      # 有效磁导率（给定 60μ）
STACK_K   = 0.95      # 叠片/填充系数（参考）
BSAT      = 1.0       # 饱和磁密 T（Kool Mu 60μ 查证值）
B_DESIGN  = 0.60      # 设计峰值磁密 T（降额取值）
KU_TARGET = 0.40      # 目标窗口利用率
S_KU      = 0.50      # 窗口利用率上限
S_SAT     = 0.80      # 饱和裕度上限 Bpk/Bsat
KAC       = 1.30      # 交流铜损系数（5kHz 多股并绕参考）
RHO_CU    = 1.72e-8   # 铜电阻率 Ω·m @20°C
ALPHA_CU  = 0.00393   # 铜温度系数 /K
T_RISE    = 40.0      # 电阻温升参考 K（热态电阻）
STEIN_A   = 18.01     # Steinmetz a (mW/cm^3, B:T, f:kHz) Kool Mu 60μ
STEIN_B   = 1.602
STEIN_C   = 1.401
RTH       = 0.030     # 磁芯-环境热阻 K/W（强制风冷+风道参考，需实测）
DT_LIMIT  = 50.0      # 稳态温升上限 K


def calc():
    r = {}
    # --- 电气 ---
    iphase = P_KW * 1000 / (math.sqrt(3) * VLL * PF)          # 额定相电流 A
    dip_pp = KRIPPLE * iphase                                  # 纹波峰峰值 A
    L = VDC / (4 * FSW_KHZ * 1000 * dip_pp)                    # 电感 H (用户公式)
    zbase = VLL ** 2 / (P_KW * 1000)                           # 基准阻抗 Ω
    lbase = zbase / (2 * math.pi * FGRID)                      # 基准电感 H
    lpu = L / lbase                                            # 标幺值 pu
    ipk = iphase * math.sqrt(2) + dip_pp / 2                   # 峰值电感电流 A

    # --- 磁芯几何 ---
    Ae = (OD - ID) / 2 * H * STACK_K * 1e-6                    # 单芯截面积 m^2
    le = math.pi * (OD + ID) / 2 * 1e-3                        # 平均磁路长 m
    Ve = Ae * le * 1e6                                         # 单芯体积 cm^3
    Aw_single = math.pi * (ID / 2) ** 2                        # 单芯内孔面积 mm^2（参考）
    Awire = iphase / J                                         # 每匝导体截面 mm^2（全电流过绕组）

    # --- 安匝积与分配 ---
    # n 个磁芯叠堆成一体（磁路并联，截面 n·Ae），绕组共绕 N 匝，承载全部相电流
    # 磁动势平衡: B = μ0·μe·N·Ipk/le  →  N·n = L·Ipk/(B·Ae)
    AN = L * ipk / (B_DESIGN * Ae)                             # N·n 安匝积
    # 叠堆后绕组穿过的有效窗口 = 内径 × 叠堆高度 (矩形通道)
    # 约束: N·Awire ≤ Ku·ID·(n·H)  →  AN·Awire ≤ Ku·ID·H·n²
    n_min = math.sqrt(AN * Awire / (KU_TARGET * ID * H))       # 最小并联芯数
    n = math.ceil(n_min)                                       # 并联芯数（向上取整）
    N = round(AN / n)                                          # 绕组匝数
    bpk = L * ipk / (N * n * Ae)                               # 实际峰值磁密 T
    Aw_stack = ID * (n * H)                                    # 叠堆有效窗口 mm^2
    ku_act = N * Awire / Aw_stack                              # 实际窗口利用率

    # --- 铜损 ---
    stack_h = n * H                                            # 叠堆高度 mm
    mlt = (2 * stack_h + (OD - ID) + 20) * 1e-3                # 平均每匝长 m（含端部）
    rdc = RHO_CU * (1 + ALPHA_CU * T_RISE) * N * mlt / (Awire * 1e-6)
    rac = KAC * rdc
    pcu = iphase ** 2 * rac                                    # 铜损 W（单相电感）

    # --- 铁损 (Steinmetz) ---
    db_pp = L * dip_pp / (N * n * Ae)                          # 交流磁密峰峰值 T
    bac = db_pp / 2                                            # 交流磁密幅值 T
    pv = STEIN_A * bac ** STEIN_B * FSW_KHZ ** STEIN_C         # mW/cm^3
    pfe = pv * (n * Ve) / 1000                                 # 铁损 W
    ptotal = pcu + pfe
    dt = ptotal * RTH                                          # 温升 K

    r.update(
        iphase=iphase, dip_pp=dip_pp, L=L, L_uH=L * 1e6,
        zbase=zbase, lbase=lbase, lpu=lpu, lpu_pct=lpu * 100, ipk=ipk,
        Ae=Ae, Ae_mm2=Ae * 1e6, le=le, le_mm=le * 1e3, Ve=Ve,
        Aw_single=Aw_single, Aw_stack=Aw_stack, Awire=Awire,
        AN=AN, n_min=n_min, n=n, N=N, stack_h=stack_h,
        bpk=bpk, sat_margin=bpk / BSAT, ku_act=ku_act,
        mlt=mlt, rdc=rdc, rac=rac, pcu=pcu,
        db_pp=db_pp, bac=bac, pv=pv, pfe=pfe, ptotal=ptotal, dt=dt,
        AL=MU_E * 4 * math.pi * 1e-7 * Ae / le * 1e9,  # nH/turn^2 单芯
    )
    return r


if __name__ == "__main__":
    r = calc()
    print("=" * 60)
    print("PCS 网侧 LCL 滤波电感计算结果")
    print("=" * 60)
    def show(name, val, unit=""):
        print(f"{name:28s} {val:12.4f}  {unit}")
    show("额定相电流 Iphase", r["iphase"], "A")
    show("纹波峰峰 ΔIpp", r["dip_pp"], "A")
    show("电感 L", r["L_uH"], "μH")
    show("标幺值 Lpu", r["lpu_pct"], "%")
    show("峰值电感电流 Ipk", r["ipk"], "A")
    show("单芯截面积 Ae", r["Ae_mm2"], "mm²")
    show("平均磁路长 le", r["le_mm"], "mm")
    show("叠堆有效窗口 Aw", r["Aw_stack"], "mm²")
    show("安匝积 N·n", r["AN"], "A·turn")
    show("并联芯数 n", r["n"])
    show("每芯匝数 N", r["N"])
    show("叠堆高度", r["stack_h"], "mm")
    show("实际峰值磁密 Bpk", r["bpk"], "T")
    show("饱和裕度 Bpk/Bsat", r["sat_margin"], "")
    show("实际窗口利用率 Ku", r["ku_act"], "")
    show("平均每匝长 MLT", r["mlt"] * 1000, "mm")
    show("直流电阻 Rdc", r["rdc"] * 1000, "mΩ")
    show("交流电阻 Rac", r["rac"] * 1000, "mΩ")
    show("铜损 Pcu", r["pcu"], "W")
    show("交流磁密幅值 Bac", r["bac"], "T")
    show("铁损密度 Pv", r["pv"], "mW/cm³")
    show("铁损 Pfe", r["pfe"], "W")
    show("总损耗 Ptotal", r["ptotal"], "W")
    show("稳态温升 ΔT", r["dt"], "K")
    print("-" * 60)
    print("校验:")
    print(f"  标幺值 5%~20%:        {'PASS' if 0.05 <= r['lpu'] <= 0.20 else 'FAIL'}")
    print(f"  饱和裕度 <0.8:        {'PASS' if r['sat_margin'] < S_SAT else 'FAIL'}")
    print(f"  窗口利用率 <0.5:      {'PASS' if r['ku_act'] < S_KU else 'FAIL'}")
    print(f"  稳态温升 <50K:        {'PASS' if r['dt'] < DT_LIMIT else 'FAIL'}")
