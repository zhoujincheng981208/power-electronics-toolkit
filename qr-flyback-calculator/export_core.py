# -*- coding: utf-8 -*-
"""导出内核结果 JSON，供 verify_web.js 比对"""
import json, calc_core as c
r = c.solve_qr(c.P_DEMO)
out = {k: v for k, v in r.items() if k not in ('hist',)}
print(json.dumps(out, ensure_ascii=False))
