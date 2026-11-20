# -*- coding: utf-8 -*-
"""
QR 反激满载开关频率计算内核（逐次逼近 + 解析解对照）
=============================================================
物理前提：QR/DCM，一周期储能全部转移，电流过零后 Lm 与 Cr 谐振，
在第一个谷底开通（ZVS）；暂不考虑频率钳位、跳谷、死区/消隐。

耦合关系：功率固定 -> Fs 越高 Ipk 越小 -> Ton/Treset 越短 -> Ts 越短 -> Fs 越高。
故用定点迭代：猜 Fs -> 算 Ipk/各段时间 -> 得 Fcalc=1/Ts -> 用 Fcalc 作下一次猜测，
直到 |Fcalc-Fguess|/Fguess < 收敛判据。

解析解（对照用）：代入 Ipk 后 1/F = A/sqrt(F) + B，令 x=sqrt(F) 得
B*x^2 + A*x - 1 = 0，取正根 x=(-A+sqrt(A^2+4B))/(2B)，F=x^2。

网页 index.html 的计算逻辑必须与本内核逐项一致（verify_web.js 校验）。
"""
import math


def solve_qr(p, max_iter=50):
    Vin   = p['Vin_max']       # 最大输入母线电压 V
    Vo    = p['Vo']            # 输出电压 V
    Vd    = p['Vd']            # 整流二极管压降 V
    n     = p['n']             # 变压器匝比（原:副）
    Po    = p['Po']            # 输出功率 W
    eta   = p['eta']           # 效率
    Lm    = p['Lm_uh'] * 1e-6  # 励磁电感 H
    Cr    = p['Cr_pf'] * 1e-12 # 谐振电容 F（MOSFET Coss + 绕组电容）
    tw    = p['twin_us'] * 1e-6# 检测/驱动窗口修正 s
    F0    = p['F0_khz'] * 1e3  # 初猜频率 Hz
    tol   = p['tol_pct'] / 100 # 收敛相对判据
    Vdss  = p['Vdss']          # MOSFET 额定耐压 V（校核用）

    Vor = n * (Vo + Vd)                 # 反射电压 V
    sqrt_lcr = math.sqrt(Lm * Cr)       # sqrt(Lm*Cr) s
    Tres = math.pi * sqrt_lcr + tw      # 谐振到第一谷底的时间 s（含窗口）
    coef = math.sqrt(2 * Po / (eta * Lm))  # Ipk = coef/sqrt(F)

    # ---- 逐次逼近（定点迭代 F_{k+1} = 1/Ts(F_k)）----
    hist = []
    F = F0
    for k in range(1, max_iter + 1):
        Ipk     = coef / math.sqrt(F)       # 峰值电流 A
        Ton     = Lm * Ipk / Vin             # 导通储能时间 s
        Treset  = Lm * Ipk / Vor             # 去磁复位时间 s
        Ts      = Ton + Treset + Tres        # 周期 s
        Fcalc   = 1.0 / Ts                   # 回算频率 Hz
        err     = (Fcalc - F) / F            # 相对误差
        hist.append(dict(it=k, Fg=F, Ipk=Ipk, Ton=Ton, Treset=Treset,
                         Tres=Tres, Ts=Ts, Fc=Fcalc, err=err))
        if abs(err) < tol:
            break
        F = Fcalc                            # 更新猜测

    last = hist[-1]
    Fsol = last['Fc']
    converged = abs(last['err']) < tol

    # ---- 解析解对照 ----
    A = Lm * (1.0 / Vin + 1.0 / Vor) * coef   # 1/F = A/sqrt(F) + B
    B = Tres
    x = (-A + math.sqrt(A * A + 4 * B)) / (2 * B)   # x = sqrt(F)
    Fana = x * x

    # ---- 收敛点派生量（用解析解/最终 F 重算一套，保证展示值自洽）----
    Ipk_s = coef / math.sqrt(Fsol)
    Ton_s = Lm * Ipk_s / Vin
    Tres_s = Tres
    Treset_s = Lm * Ipk_s / Vor
    Ts_s = Ton_s + Treset_s + Tres_s
    duty = Ton_s / Ts_s                       # 占空比
    Vvalley = Vin - Vor                       # 谷底电压 V
    Vstress = Vin + Vor                       # 关断电压应力 V

    # ---- 校核 ----
    checks = {
        '迭代收敛':   (converged,        f"末次相对误差 {last['err']*100:+.3f}% < {tol*100:.1f}%"),
        '电压应力':   (Vstress <= 0.8 * Vdss, f"{Vstress:.0f} V ≤ 0.8×{Vdss:.0f}V = {0.8*Vdss:.0f} V"),
        '谷底电压为正': (Vvalley > 0,      f"{Vvalley:.1f} V > 0 V"),
        '占空比<0.5': (duty < 0.5,        f"D={duty*100:.1f}% < 50%"),
    }
    return dict(
        Vor=Vor, sqrt_lcr=sqrt_lcr, Tres=Tres, coef=coef,
        A=A, B=B, Fana=Fana, Fsol=Fsol, iters=len(hist), converged=converged,
        Ipk=Ipk_s, Ton=Ton_s, Treset=Treset_s, Ts=Ts_s,
        duty=duty, Vvalley=Vvalley, Vstress=Vstress,
        hist=hist, checks=checks)


# 演示参数（用户给定工况；Vdss 为 MOSFET 耐压，工程常用 800V，可改）
P_DEMO = dict(Vin_max=600.0, Vo=13.0, Vd=0.7, n=6.0,
              Po=42.9, eta=0.88, Lm_uh=250.0, Cr_pf=120.0,
              twin_us=0.0, F0_khz=150.0, tol_pct=1.0, Vdss=800.0)


if __name__ == '__main__':
    r = solve_qr(P_DEMO)
    print(f"Vor={r['Vor']:.2f} V   sqrt(LmCr)={r['sqrt_lcr']*1e6:.4f} us   Tres={r['Tres']*1e6:.4f} us")
    print(f"解析解 Fana={r['Fana']/1e3:.2f} kHz   迭代解 Fsol={r['Fsol']/1e3:.2f} kHz   "
          f"迭代 {r['iters']} 次   收敛={r['converged']}")
    print(f"Ipk={r['Ipk']:.3f} A  Ton={r['Ton']*1e6:.3f} us  Treset={r['Treset']*1e6:.3f} us  "
          f"Tres={r['Tres']*1e6:.3f} us  Ts={r['Ts']*1e6:.3f} us  D={r['duty']*100:.1f}%")
    print("\n迭代序列:")
    for h in r['hist']:
        print(f"  #{h['it']:2d} Fg={h['Fg']/1e3:8.2f}kHz -> Ipk={h['Ipk']:.3f}A "
              f"Ton={h['Ton']*1e6:.3f}us Trst={h['Treset']*1e6:.3f}us "
              f"Ts={h['Ts']*1e6:.3f}us -> Fc={h['Fc']/1e3:8.2f}kHz err={h['err']*100:+.2f}%")
    print("\n校核:")
    for name, (ok, desc) in r['checks'].items():
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:8s} {desc}")
