import csv
import json
from collections import defaultdict
from pathlib import Path

BUDGET_JSON_PATH = Path('/tmp/budget_january.json')
WALLET_CSV_PATH = Path('/Users/kacsorzsolt/Downloads/wallet_records (1).csv')

budget_data = json.loads(BUDGET_JSON_PATH.read_text())

wallet_to_budget = {}
for category in budget_data:
    for wc in category.get('walletCategories') or []:
        main_cat = (wc.get('mainCategory') or '').strip()
        if main_cat:
            wallet_to_budget.setdefault(main_cat, category['name'])
        for sub in wc.get('subCategories') or []:
            sub = sub.strip()
            if sub:
                wallet_to_budget.setdefault(sub, category['name'])

alias_map = {
    'Élelmiszerek': 'Bevásárlás',
    'Drogéria': 'Gyógyszertár, drogéria',
    'Egészség, szépség': 'Egészségügyi ellátás, orvos',
    'Ajándékok, örömök': 'Ajándékok, örömök',
    'Ruházat és lábbelik': 'Ruházat és cipő',
    'Jármű karbantartás': 'Jármű karbantartása',
    'Jótékonyság, ajándékok': 'Jótékonyság, ajándékok',
    'Bár, kávézó': 'Bár, kávézó',
    'Internet': 'Szolgáltatások'
}

manual_budget_map = {
    'Ajándékok, örömök': 'Szórakozás',
    'Bár, kávézó': 'Szórakozás',
    'Jótékonyság, ajándékok': 'Mama',
    'Kultúra, sportesemények': 'Szórakozás',
    'Nyaralás, kirándulások, szállodák': 'Szórakozás',
    'Jelzáloghitel': 'Hitel',
    'Kölcsönök, törlesztőrészletek': 'Hitel',
    'Díjak': 'Hitel',
    'Internet': 'Rezsi',
    'Szolgáltatások': 'Rezsi',
    'Ruházat és lábbelik': 'Háztartás',
    'Ajándékok, örömök (egyéb)': 'Szórakozás',
    'Egyéb': 'Egyéb',
    'Nyaralás': 'Szórakozás',
    'Járműbiztosítás': 'Autó'
}

expenses_by_budget = defaultdict(float)
expenses_by_wallet = defaultdict(float)
income_by_wallet = defaultdict(float)
unmapped_expenses = []
category_breakdown = defaultdict(lambda: defaultdict(float))

with WALLET_CSV_PATH.open(newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        if not row['date'].startswith('2026-01'):
            continue
        try:
            amount = float(row['amount'])
        except ValueError:
            continue
        wallet_cat = row['category'].strip()
        wallet_key = alias_map.get(wallet_cat, wallet_cat)
        budget_cat = wallet_to_budget.get(wallet_key)
        if not budget_cat:
            budget_cat = manual_budget_map.get(wallet_key) or manual_budget_map.get(wallet_cat)
        transfer_flag = row['transfer'].lower() == 'true'
        entry = {
            'account': row['account'],
            'wallet_category': wallet_cat,
            'amount': amount,
            'type': row['type'],
            'note': row['note'],
            'date': row['date'],
            'transfer': transfer_flag
        }
        if row['type'] == 'Kiadás':
            if transfer_flag:
                continue
            expenses_by_wallet[wallet_cat] += amount
            if budget_cat:
                expenses_by_budget[budget_cat] += amount
                category_breakdown[budget_cat][wallet_cat] += amount
            else:
                unmapped_expenses.append(entry)
        elif row['type'] == 'Bevétel':
            if transfer_flag:
                continue
            income_by_wallet[wallet_cat] += amount

planned_by_budget = {cat['name']: sum(item['amount'] for item in cat['items']) for cat in budget_data}

summary_rows = []
for cat_name, planned in planned_by_budget.items():
    actual = expenses_by_budget.get(cat_name, 0.0)
    variance = actual - planned
    breakdown = sorted(category_breakdown.get(cat_name, {}).items(), key=lambda kv: kv[1], reverse=True)
    summary_rows.append({
        'category': cat_name,
        'planned': planned,
        'actual': actual,
        'variance': variance,
        'breakdown': breakdown
    })

def fmt(value: float) -> str:
    return f"{value:,.0f}".replace(',', ' ')

print('CATEGORY | PLANNED | ACTUAL | VARIANCE')
for row in summary_rows:
    print(f"{row['category']} | {fmt(row['planned'])} | {fmt(row['actual'])} | {fmt(row['variance'])}")
    if row['breakdown']:
        details = ', '.join(f"{name}: {fmt(amount)}" for name, amount in row['breakdown'])
        print(f"  - {details}")

print('\nTop expense wallet categories (excl. transfers):')
for wallet_cat, total in sorted(expenses_by_wallet.items(), key=lambda kv: kv[1], reverse=True)[:20]:
    print(f"{wallet_cat}: {fmt(total)}")

print('\nIncome totals (non-transfer):')
for wallet_cat, total in sorted(income_by_wallet.items(), key=lambda kv: kv[1], reverse=True):
    print(f"{wallet_cat}: {fmt(total)}")

unmapped_total = sum(e['amount'] for e in unmapped_expenses)
print(f"\nUnmapped expenses: {len(unmapped_expenses)} rows, total {fmt(unmapped_total)}")
for entry in unmapped_expenses[:15]:
    print(entry)
