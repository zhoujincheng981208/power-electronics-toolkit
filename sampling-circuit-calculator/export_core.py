# -*- coding: utf-8 -*-
"""导出 Python 内核结果为 JSON，供 verify_web.js 比对"""
import json
import calc_core as c

print(json.dumps({
    'div': c.calc_divider(c.P_DIV),
    'ct':  c.calc_ct(c.P_CT),
    'hall': c.calc_hall(c.P_HALL),
}, ensure_ascii=False))
