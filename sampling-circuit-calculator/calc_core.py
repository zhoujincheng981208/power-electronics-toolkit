# -*- coding: utf-8 -*-
"""
采样电路参数计算内核
==========================================
三类采样电路，链路统一为：
  输入范围 → ADC满量程 → 分压比/变比/量程 → 电阻( burden )选型 → 精度 + 功耗校验

  1) 分压电阻：电压采样（母线电压、相电压）
  2) CT       ：交流电流采样（电流互感器）
  3) 霍尔     ：直流/交流电流采样（霍尔传感器）

说明：所有参数为工程演示值，实际使用请按所选器件手册修改。
网页 index.html 的计算逻辑必须与本内核逐项一致（verify_web.js 校验）。
"""
import math


def rss(*errs):
    """误差均方根合成（RSS）：各项独立误差的统计合成"""
    return math.sqrt(sum(e * e for e in errs))


def adc_quant_err(bits):
    """ADC 量化相对误差(%)，按 ±0.5 LSB / 满量程"""
    return 100.0 / (2 * (2 ** bits))


# ==========================================================
# 类1：分压电阻（电压采样）
# ==========================================================
def calc_divider(p):
    Vin  = p['Vin_max']     # 最大输入电压 V
    Vfs  = p['Vadc_fs']     # ADC 满量程电压 V
    kuse = p['k_use']       # ADC 使用率（最大输入时占用满量程的比例）
    R2   = p['R2_k'] * 1e3  # 下臂（低压侧）电阻 Ω
    tol1 = p['tol_R1']      # 上臂精度 %
    tol2 = p['tol_R2']      # 下臂精度 %
    tcr1 = p['TCR1']        # 上臂温漂 ppm/℃
    tcr2 = p['TCR2']        # 下臂温漂 ppm/℃
    dT   = p['dT']          # 温升 ℃
    bits = p['adc_bits']    # ADC 位数
    Prat = p['P_rated']     # 单个电阻额定功率 W
    elim = p['err_limit']   # 总误差限值 %

    Vt   = Vfs * kuse               # 目标：最大输入时 ADC 电压
    K    = Vin / Vt                 # 衰减倍数 = (R1+R2)/R2
    R1   = (K - 1) * R2             # 上臂电阻 Ω
    Rtot = R1 + R2
    Idiv = Vin / Rtot               # 分压支路电流 A
    P1   = Idiv ** 2 * R1           # 上臂功耗 W
    P2   = Idiv ** 2 * R2           # 下臂功耗 W
    Ptot = Vin ** 2 / Rtot          # 总功耗 W
    w1, w2 = R1 / Rtot, R2 / Rtot   # 两电阻在总阻值中的权重

    # 误差链
    e_tol  = w1 * tol1 + w2 * tol2          # 阻值精度引起的比例误差(最坏, %)
    e_temp = abs(tcr1 - tcr2) * dT * 1e-4   # 温漂失配引起的比例误差(%)
    e_adc  = adc_quant_err(bits)            # ADC 量化误差(%)
    e_tot  = rss(e_tol, e_temp, e_adc)

    n_series1 = math.ceil(P1 / Prat) if P1 > Prat else 1  # 上臂需串联个数

    checks = {
        '上臂功耗':   (P1 <= Prat,   f'{P1:.3f} W ≤ {Prat} W'),
        '下臂功耗':   (P2 <= Prat,   f'{P2:.3f} W ≤ {Prat} W'),
        '分压比精度': (e_tot <= elim, f'{e_tot:.3f}% ≤ {elim}%'),
    }
    return dict(
        Vt=Vt, K=K, R1=R1, R2=R2, Rtot=Rtot, Idiv=Idiv,
        P1=P1, P2=P2, Ptot=Ptot, Rin=Rtot,
        e_tol=e_tol, e_temp=e_temp, e_adc=e_adc, e_tot=e_tot,
        n_series1=n_series1, checks=checks)


# ==========================================================
# 类2：CT（交流电流采样）
# ==========================================================
def calc_ct(p):
    Ipri = p['Ipri_max']   # 一次侧最大电流 A (RMS)
    n    = p['ct_ratio_n'] # CT 变比 n:1
    Vfs  = p['Vadc_fs']    # ADC 满量程 V
    kuse = p['k_use']      # ADC 使用率
    Rb   = p['Rb_ohm']     # burden 负载电阻 Ω
    Rw   = p['Rw_ohm']     # 绕组 + 导线等效阻抗 Ω
    VAr  = p['VA_rated']   # CT 额定负荷 VA
    cls  = p['ct_class']   # CT 精度等级 %
    tol  = p['tol_Rb']     # burden 精度 %
    tcr  = p['tcr_Rb']     # burden 温漂 ppm/℃
    dT   = p['dT']         # 温升 ℃
    bits = p['adc_bits']   # ADC 位数
    elim = p['err_limit']  # 总误差限值 %

    Isec    = Ipri / n                 # 二次侧电流 A
    Vt      = Vfs * kuse               # 目标 ADC 电压
    Rb_need = Vt / Isec                # 理论所需 burden Ω
    Vadc    = Isec * Rb                # 实际 burden 输出 V
    Rtot    = Rb + Rw                  # 二次回路总阻抗 Ω
    VA      = Isec ** 2 * Rtot         # CT 实际负荷 VA
    P_rb    = Isec ** 2 * Rb           # burden 功耗 W
    scale   = n / Rb                   # 比例尺：一次电流 = Vadc × scale (A/V)

    e_ct   = cls                       # CT 比差(%)
    e_rb   = tol                       # burden 精度(%)
    e_temp = tcr * dT * 1e-4           # burden 温漂(%)
    e_adc  = adc_quant_err(bits)
    e_tot  = rss(e_ct, e_rb, e_temp, e_adc)

    checks = {
        'ADC量程': (Vadc <= Vfs,  f'{Vadc:.3f} V ≤ {Vfs} V'),
        'CT负荷':  (VA <= VAr,    f'{VA:.3f} VA ≤ {VAr} VA'),
        '总精度':  (e_tot <= elim, f'{e_tot:.3f}% ≤ {elim}%'),
    }
    return dict(
        Isec=Isec, Vt=Vt, Rb_need=Rb_need, Rb=Rb, Vadc=Vadc, Rtot=Rtot,
        VA=VA, P_rb=P_rb, scale=scale,
        e_ct=e_ct, e_rb=e_rb, e_temp=e_temp, e_adc=e_adc, e_tot=e_tot,
        checks=checks)


# ==========================================================
# 类3：霍尔（直流/交流电流采样）
# ==========================================================
def calc_hall(p):
    Ipri   = p['Ipri_max']    # 被测最大电流 A
    In     = p['In_rated']    # 霍尔额定量程 A
    Vzero  = p['Vzero']       # 零点输出 V
    swing  = p['Vout_swing']  # 满量程输出摆幅（±）V
    Vfs    = p['Vadc_fs']     # ADC 满量程 V
    bits   = p['adc_bits']    # ADC 位数
    margin = p['margin']      # 量程裕量系数
    lin    = p['linearity']   # 线性度 %FS
    off    = p['offset_mV']   # 零点失调 mV
    off_t  = p['offset_drift']# 零点温漂 mV/℃
    sen_t  = p['sens_drift']  # 灵敏度温漂 %/℃
    dT     = p['dT']          # 温升 ℃
    elim   = p['err_limit']   # 总误差限值 %

    S      = swing / In                    # 灵敏度 V/A
    LSB    = Vfs / (2 ** bits)             # ADC 一个 LSB 的电压 V
    Ires   = LSB / S                       # 电流分辨率 A/LSB
    Vsig   = S * Ipri                      # 最大电流对应的信号电压 V
    Vhi    = Vzero + Vsig                  # 输出上界 V
    Vlo    = Vzero - Vsig                  # 输出下界 V

    # 误差链（线性度按 %FS 给出，折算到实际读数需乘 In/Ipri）
    e_lin  = lin * (In / Ipri)
    e_off  = (off / 1000.0) / (S * Ipri) * 100.0
    e_offt = (off_t * dT / 1000.0) / (S * Ipri) * 100.0
    e_st   = sen_t * dT
    e_adc  = adc_quant_err(bits)
    e_tot  = rss(e_lin, e_off, e_offt, e_st, e_adc)

    checks = {
        '量程覆盖':  (In >= Ipri * margin, f'{In} A ≥ {Ipri*margin:.0f} A'),
        '输出不越界': (Vhi <= Vfs and Vlo >= 0, f'{Vlo:.2f}~{Vhi:.2f} V ∈ 0~{Vfs} V'),
        '总精度':    (e_tot <= elim, f'{e_tot:.3f}% ≤ {elim}%'),
    }
    return dict(
        S=S, LSB=LSB, Ires=Ires, Vsig=Vsig, Vhi=Vhi, Vlo=Vlo,
        e_lin=e_lin, e_off=e_off, e_offt=e_offt, e_st=e_st, e_adc=e_adc, e_tot=e_tot,
        checks=checks)


# ==========================================================
# 演示参数（网页默认值与此处一致）
# ==========================================================
P_DIV = dict(Vin_max=700, Vadc_fs=3.3, k_use=0.85, R2_k=10,
             tol_R1=0.1, tol_R2=0.1, TCR1=25, TCR2=25, dT=20,
             adc_bits=12, P_rated=0.25, err_limit=1.0)

P_CT  = dict(Ipri_max=1000, ct_ratio_n=1000, Vadc_fs=3.3, k_use=0.85,
             Rb_ohm=2.7, Rw_ohm=0.1, VA_rated=5, ct_class=0.5,
             tol_Rb=0.1, tcr_Rb=25, dT=20, adc_bits=12, err_limit=1.0)

P_HALL= dict(Ipri_max=500, In_rated=600, Vzero=2.5, Vout_swing=2.0,
             Vadc_fs=5, adc_bits=12, margin=1.2, linearity=0.5,
             offset_mV=10, offset_drift=0.2, sens_drift=0.03, dT=20,
             err_limit=1.5)


def show(title, r):
    print(f'\n===== {title} =====')
    for k, v in r.items():
        if k == 'checks':
            continue
        if isinstance(v, float):
            print(f'  {k:12s} = {v:.4g}')
        else:
            print(f'  {k:12s} = {v}')
    print('  -- 校核 --')
    for name, (ok, desc) in r['checks'].items():
        print(f'  [{"PASS" if ok else "FAIL"}] {name:8s} {desc}')


if __name__ == '__main__':
    show('分压电阻（电压采样）', calc_divider(P_DIV))
    show('CT（交流电流采样）',   calc_ct(P_CT))
    show('霍尔（直流电流采样）', calc_hall(P_HALL))
