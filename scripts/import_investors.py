"""Build Otto's firm-level investor dataset from DayOne's raise databases.

Usage:
    python scripts/import_investors.py <investor database .xlsx> <investor database .numbers>

Privacy: the source files contain personal contact details (emails, phones, addresses, LinkedIn).
This script deliberately drops every personal contact channel and person name and emits only
firm-level aggregates to public/data/investors.json. Never commit the source spreadsheets.
"""
import html
import json
import re
import sys
from collections import Counter, defaultdict

import numbers_parser
import openpyxl

WIGO, BLK = sys.argv[1], sys.argv[2]

# ---------------------------------------------------------------- normalisation
COUNTRY = {
    'usa': 'United States', 'us': 'United States', 'united states': 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
    'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'england': 'United Kingdom', 'scotland': 'United Kingdom',
    'uae': 'United Arab Emirates', 'united arab emirates': 'United Arab Emirates', 'hong kong': 'Hong Kong', 'korea': 'South Korea',
}
REGION = {
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'LatAm', 'Brazil': 'LatAm', 'Chile': 'LatAm', 'Argentina': 'LatAm', 'Colombia': 'LatAm',
    'United Kingdom': 'Europe', 'Ireland': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Switzerland': 'Europe', 'Netherlands': 'Europe', 'Sweden': 'Europe',
    'Spain': 'Europe', 'Italy': 'Europe', 'Luxembourg': 'Europe', 'Belgium': 'Europe', 'Denmark': 'Europe', 'Norway': 'Europe', 'Finland': 'Europe', 'Austria': 'Europe',
    'Monaco': 'Europe', 'Liechtenstein': 'Europe', 'Portugal': 'Europe', 'Poland': 'Europe', 'Bulgaria': 'Europe', 'Greece': 'Europe', 'Czech Republic': 'Europe', 'Jersey': 'Europe', 'Guernsey': 'Europe',
    'China': 'APAC', 'Japan': 'APAC', 'India': 'APAC', 'Singapore': 'APAC', 'Hong Kong': 'APAC', 'Australia': 'APAC', 'New Zealand': 'APAC', 'South Korea': 'APAC', 'Taiwan': 'APAC', 'Malaysia': 'APAC', 'Indonesia': 'APAC', 'Thailand': 'APAC', 'Philippines': 'APAC',
    'Israel': 'MENA', 'United Arab Emirates': 'MENA', 'Saudi Arabia': 'MENA', 'Qatar': 'MENA', 'Bahrain': 'MENA', 'Kuwait': 'MENA', 'Lebanon': 'MENA', 'Egypt': 'MENA', 'Turkey': 'MENA', 'South Africa': 'MENA', 'Nigeria': 'MENA',
}
COUNTRY_LL = {
    'United States': (39.8, -98.6), 'Canada': (56.1, -106.3), 'United Kingdom': (54.0, -2.0), 'France': (46.6, 2.2), 'Germany': (51.2, 10.4), 'Switzerland': (46.8, 8.2),
    'Netherlands': (52.1, 5.3), 'Sweden': (60.1, 18.6), 'Spain': (40.5, -3.7), 'Italy': (41.9, 12.6), 'Ireland': (53.4, -8.2), 'Luxembourg': (49.8, 6.1), 'China': (35.9, 104.2),
    'Japan': (36.2, 138.3), 'India': (20.6, 79.0), 'Singapore': (1.35, 103.8), 'Hong Kong': (22.3, 114.2), 'Australia': (-25.3, 133.8), 'Israel': (31.0, 34.9), 'Brazil': (-14.2, -51.9),
    'United Arab Emirates': (23.4, 53.8), 'Belgium': (50.5, 4.5), 'Denmark': (56.3, 9.5), 'Norway': (60.5, 8.5), 'Finland': (61.9, 25.7), 'Austria': (47.5, 14.6), 'Monaco': (43.7, 7.4),
    'South Korea': (35.9, 127.8), 'New Zealand': (-40.9, 174.9), 'Mexico': (23.6, -102.6), 'Saudi Arabia': (23.9, 45.1), 'Qatar': (25.4, 51.2), 'Bahrain': (26.0, 50.6),
    'South Africa': (-30.6, 22.9), 'Portugal': (39.4, -8.2), 'Liechtenstein': (47.2, 9.6), 'Taiwan': (23.7, 121.0), 'Malaysia': (4.2, 101.9), 'Kuwait': (29.3, 47.5), 'Lebanon': (33.9, 35.9),
    'Chile': (-35.7, -71.5), 'Argentina': (-38.4, -63.6), 'Turkey': (39.0, 35.2), 'Poland': (51.9, 19.1), 'Greece': (39.1, 21.8), 'Jersey': (49.2, -2.1), 'Guernsey': (49.5, -2.6),
}
CITY_LL = {
    'new york': (40.71, -74.0), 'london': (51.51, -0.13), 'san francisco': (37.77, -122.42), 'boston': (42.36, -71.06), 'chicago': (41.88, -87.63), 'menlo park': (37.45, -122.18),
    'palo alto': (37.44, -122.14), 'los angeles': (34.05, -118.24), 'dallas': (32.78, -96.8), 'houston': (29.76, -95.37), 'toronto': (43.65, -79.38), 'geneva': (46.2, 6.14),
    'zurich': (47.38, 8.54), 'paris': (48.86, 2.35), 'singapore': (1.35, 103.82), 'hong kong': (22.32, 114.17), 'washington': (38.91, -77.04), 'atlanta': (33.75, -84.39),
    'denver': (39.74, -104.99), 'seattle': (47.61, -122.33), 'miami': (25.76, -80.19), 'philadelphia': (39.95, -75.17), 'greenwich': (41.03, -73.63), 'stamford': (41.05, -73.54),
    'minneapolis': (44.98, -93.27), 'austin': (30.27, -97.74), 'san diego': (32.72, -117.16), 'montreal': (45.5, -73.57), 'vancouver': (49.28, -123.12), 'calgary': (51.05, -114.07),
    'stockholm': (59.33, 18.07), 'berlin': (52.52, 13.4), 'munich': (48.14, 11.58), 'frankfurt': (50.11, 8.68), 'amsterdam': (52.37, 4.9), 'madrid': (40.42, -3.7),
    'milan': (45.46, 9.19), 'luxembourg': (49.61, 6.13), 'dublin': (53.35, -6.26), 'tel aviv': (32.09, 34.78), 'tokyo': (35.68, 139.69), 'beijing': (39.9, 116.4),
    'shanghai': (31.23, 121.47), 'shenzhen': (22.54, 114.06), 'mumbai': (19.08, 72.88), 'bangalore': (12.97, 77.59), 'bengaluru': (12.97, 77.59), 'new delhi': (28.61, 77.21),
    'sydney': (-33.87, 151.21), 'melbourne': (-37.81, 144.96), 'dubai': (25.2, 55.27), 'abu dhabi': (24.45, 54.38), 'sao paulo': (-23.55, -46.63), 'são paulo': (-23.55, -46.63),
    'charlotte': (35.23, -80.84), 'nashville': (36.16, -86.78), 'cleveland': (41.5, -81.69), 'pittsburgh': (40.44, -79.99), 'detroit': (42.33, -83.05), 'st. louis': (38.63, -90.2),
    'phoenix': (33.45, -112.07), 'salt lake city': (40.76, -111.89), 'portland': (45.52, -122.68), 'baltimore': (39.29, -76.61), 'richmond': (37.54, -77.44), 'columbus': (39.96, -83.0),
    'cincinnati': (39.1, -84.51), 'indianapolis': (39.77, -86.16), 'milwaukee': (43.04, -87.91), 'kansas city': (39.1, -94.58), 'san jose': (37.34, -121.89), 'redwood city': (37.49, -122.24),
    'mountain view': (37.39, -122.08), 'santa monica': (34.02, -118.49), 'irvine': (33.68, -117.83), 'newport beach': (33.62, -117.93), 'wellesley': (42.3, -71.29), 'waltham': (42.38, -71.24),
    'cambridge': (42.37, -71.11), 'new canaan': (41.15, -73.49), 'westport': (41.14, -73.36), 'princeton': (40.36, -74.66), 'west palm beach': (26.71, -80.05), 'palm beach': (26.71, -80.04),
    'naples': (26.14, -81.79), 'tampa': (27.95, -82.46), 'orlando': (28.54, -81.38), 'raleigh': (35.78, -78.64), 'pasadena': (34.15, -118.14), 'oakland': (37.8, -122.27),
    'brussels': (50.85, 4.35), 'copenhagen': (55.68, 12.57), 'oslo': (59.91, 10.75), 'helsinki': (60.17, 24.94), 'vienna': (48.21, 16.37), 'lisbon': (38.72, -9.14),
    'lugano': (46.0, 8.95), 'basel': (47.56, 7.59), 'lausanne': (46.52, 6.63), 'monaco': (43.74, 7.42), 'edinburgh': (55.95, -3.19), 'manchester': (53.48, -2.24),
    'hamburg': (53.55, 9.99), 'dusseldorf': (51.23, 6.77), 'düsseldorf': (51.23, 6.77), 'cologne': (50.94, 6.96), 'rome': (41.9, 12.5), 'barcelona': (41.39, 2.17),
    'seoul': (37.57, 126.98), 'taipei': (25.03, 121.57), 'kuala lumpur': (3.14, 101.69), 'jakarta': (-6.21, 106.85), 'bangkok': (13.76, 100.5), 'auckland': (-36.85, 174.76),
    'riyadh': (24.71, 46.68), 'doha': (25.29, 51.53), 'manama': (26.23, 50.59), 'kuwait city': (29.38, 47.99), 'mexico city': (19.43, -99.13), 'santiago': (-33.45, -70.67),
    'buenos aires': (-34.6, -58.38), 'johannesburg': (-26.2, 28.05), 'cape town': (-33.92, 18.42), 'ottawa': (45.42, -75.7), 'winnipeg': (49.9, -97.14), 'edmonton': (53.55, -113.49),
}

SUFFIX = re.compile(r'\b(llc|l\.l\.c|inc|ltd|limited|lp|l\.p|llp|plc|gmbh|ag|sa|s\.a|co|corp|corporation|company|the|ab|bv|nv|as|aps|sarl|sas)\b\.?', re.I)


def clean(v):
    if v is None:
        return ''
    s = html.unescape(html.unescape(str(v))).replace('\xa0', ' ').strip()
    return '' if s.lower() in ('n/a', 'na', 'none', '-', 'x', 'nan') else s


def norm_firm(name):
    s = SUFFIX.sub(' ', clean(name).lower())
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def norm_country(c):
    c = clean(c)
    return COUNTRY.get(c.lower(), c) if c else ''


def money(v):
    """Parse '$1.5B', '$231M', '1000.0' (millions), '27 billion' into USD millions."""
    s = clean(v).lower().replace(',', '')
    if not s:
        return None
    m = re.search(r'([\d.]+)\s*(b|bn|billion|m|mm|mil|million|k|thousand)?', s)
    if not m:
        return None
    try:
        n = float(m.group(1))
    except ValueError:
        return None
    unit = m.group(2) or ''
    if not unit and n >= 1e6:  # raw dollar figure rather than millions
        n /= 1e6
    if unit.startswith('b'):
        n *= 1000
    elif unit.startswith('k') or unit.startswith('t'):
        n /= 1000
    return round(n, 1) if n > 0 else None


PII = [
    re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+'),                                # emails
    re.compile(r'https?://(www\.)?linkedin\.com/(in|pub)/\S+', re.I),        # personal LinkedIn
    re.compile(r'(\+?\d[\d\s().-]{7,}\d)'),                                  # phone-like digit runs
]


def scrub(text):
    for rx in PII:
        text = rx.sub('', text)
    return re.sub(r'\s{2,}', ' ', text).strip(' ,;')


STAGE_TAGS = [
    ('Seed', r'seed|start ?up|pre-seed|angel'), ('Early stage', r'early|series a'), ('Growth', r'growth|expansion|series [bc]|later stage'),
    ('Buyout', r'buyout|recap|mbo|management buy|control'), ('Real estate', r'real estate|property'), ('Credit', r'mezzanine|debt|credit|lend'),
]

SENIOR = re.compile(r'partner|managing director|\bmd\b|founder|chief|ceo|cio|president|principal|chair|head|general partner|owner|director', re.I)

# ---------------------------------------------------------------- firm accumulator
firms = {}


def firm(name, ftype, source):
    key = norm_firm(name)
    if not key or len(key) < 2 or '@' in clean(name) or PII[2].fullmatch(clean(name)):
        return None
    f = firms.get(key)
    if not f:
        f = firms[key] = {
            'name': clean(name).rstrip(' ,'), 'types': Counter(), 'sources': set(), 'cities': Counter(), 'countries': Counter(),
            'contacts': 0, 'senior': 0, 'titles': Counter(), 'aum': None, 'founded': None, 'focus': '', 'about': '', 'website': '',
            'checkMin': None, 'checkMax': None, 'stage': '', 'wigo': None,
        }
    f['types'][ftype] += 1
    f['sources'].add(source)
    return f


def add_contact(f, title='', city='', country=''):
    if f is None:
        return
    f['contacts'] += 1
    t = clean(title)
    if t:
        f['titles'][t] += 1
        if SENIOR.search(t):
            f['senior'] += 1
    if clean(city):
        f['cities'][clean(city).title() if clean(city).isupper() else clean(city)] += 1
    if norm_country(country):
        f['countries'][norm_country(country)] += 1


def setif(f, k, v):
    if f is not None and v and not f.get(k):
        f[k] = v


def table(sheet):
    rows = sheet.tables[0].rows(values_only=True)
    return rows[0], [r for r in rows[1:] if any(clean(v) for v in r)]


def col(h, *names):
    low = [clean(x).lower() for x in h]
    for n in names:
        for i, x in enumerate(low):
            if x.startswith(n.lower()):
                return i
    return None


# ---------------------------------------------------------------- Wigo (xlsx)
wb = openpyxl.load_workbook(WIGO, read_only=True, data_only=True)
rows = list(wb['Master List'].iter_rows(values_only=True))
h = rows[0]
ix = {name: i for i, name in enumerate(h)}
TEMP_RANK = {'Hot': 3, 'Warm': 2, 'Cold': 1}
BET_RANK = {'Green': 3, 'Yellow': 2, 'Brown': 1}
for r in rows[1:]:
    if not any(r):
        continue
    f = firm(r[ix['Firm']], 'Private capital (Wigo list)', 'Wigo Energy')
    add_contact(f, r[ix['Title']], r[ix['City']], r[ix['Country']])
    if f is None:
        continue
    w = f['wigo'] or {'temperature': 'Cold', 'bestBet': 'Brown', 'shortTerm': 'Brown', 'longTerm': 'Brown', 'category': '', 'research': '', 'verification': ''}
    t = clean(r[ix['Temperature']]) or 'Cold'
    if TEMP_RANK.get(t, 0) > TEMP_RANK.get(w['temperature'], 0):
        w['temperature'] = t
    for k, c in (('bestBet', 'Overall Best Bet'), ('shortTerm', 'Short-Term Fit (30-60d)'), ('longTerm', 'Long-Term Fit (180d+/Post-MVP)')):
        v = clean(r[ix[c]]) or 'Brown'
        if BET_RANK.get(v, 0) > BET_RANK.get(w[k], 0):
            w[k] = v
    cat = clean(r[ix['Firm Category']])
    if cat and cat != 'No Sector Signal':
        w['category'] = cat
    res = clean(r[ix['Sentiment / Latest Research']])
    if res:
        w['research'] = res[:320]
    ver = clean(r[ix['Verification Status']])
    if ver and ver != 'Not Sector-Flagged':
        w['verification'] = ver
    f['wigo'] = w

# ---------------------------------------------------------------- family office / institutional database (numbers)
doc = numbers_parser.Document(BLK)
S = {s.name.strip(): s for s in doc.sheets}

# MFO (no header row) — col 0 firm, 3 title, 9 city, 12 country, 14 focus, 15 founded, 16 AUM, 19 website, 20 about
_, data = table(S['MFO'])
for r in data:
    f = firm(r[0], 'Multi-family office', 'DayOne')
    add_contact(f, r[3], r[9], r[12])
    setif(f, 'focus', clean(r[14])); setif(f, 'aum', money(r[16])); setif(f, 'website', clean(r[19])); setif(f, 'about', clean(r[20])[:300])
    if f is not None and clean(r[15]):
        setif(f, 'founded', int(float(r[15])) if re.match(r'^\d{4}(\.0)?$', clean(r[15])) else None)

h, data = table(S['SFO'])
for r in data:
    f = firm(r[0], 'Single-family office', 'DayOne')
    add_contact(f, r[4])
    setif(f, 'focus', clean(r[6]))

h, data = table(S['Angel Investors'])
angels_independent = 0
for r in data:
    if not clean(r[0]):
        angels_independent += 1
        continue
    f = firm(r[0], 'Angel network', 'DayOne')
    add_contact(f, r[3], r[8], r[11])
    setif(f, 'aum', money(r[13])); setif(f, 'focus', clean(r[14])); setif(f, 'website', clean(r[16]))

h, data = table(S['Mixed'])
for r in data:
    t = clean(r[1])
    f = firm(r[0], 'Wealth manager' if t == 'Wealth Manager' else 'Multi-family office' if 'Multi' in t else 'Single-family office', 'DayOne')
    if f is not None:
        f['cities'][clean(r[2])] += 1 if clean(r[2]) else 0
        f['countries'][norm_country(r[3])] += 1 if norm_country(r[3]) else 0
        setif(f, 'aum', money(r[4])); setif(f, 'website', clean(r[9]))
        setif(f, 'founded', int(float(r[15])) if re.match(r'^\d{4}(\.0)?$', clean(r[15])) else None)

h, data = table(S['Mixed 2'])
for r in data:
    t = clean(r[3])
    f = firm(r[2], 'Wealth manager' if t == 'Wealth Manager' else 'Multi-family office' if 'Multi' in t else 'Single-family office', 'DayOne')
    add_contact(f, r[5], r[8], r[10])

h, data = table(S['FO & Investment firms'])
for r in data:
    ot = clean(r[2])
    f = firm(r[4], 'Multi-family office' if ot == 'MFO' else 'Single-family office' if ot == 'SFO' else 'Family office', 'DayOne')
    add_contact(f, r[7], r[14], r[17])
    setif(f, 'aum', money(r[19])); setif(f, 'focus', clean(r[24])[:200]); setif(f, 'website', clean(r[18]))
    if f is not None and clean(r[22]):
        setif(f, 'stage', clean(r[22]))

h, data = table(S['Funding firms'])
for r in data:
    it = clean(r[8]) or 'Investment firm'
    ftype = 'Venture capital' if 'Venture' in it else 'Private equity' if 'Private Equity' in it else 'Angel network' if 'Angel' in it else it
    f = firm(r[0], ftype, 'DayOne')
    if f is None:
        continue
    f['contacts'] += 1
    setif(f, 'aum', money(f"{float(r[1]) / 1e6}m") if clean(r[1]) and re.match(r'^\d+(\.\d+)?$', clean(r[1])) else None)
    for k, i in (('checkMin', 2), ('checkMax', 3)):
        v = clean(r[i])
        if re.match(r'^\d+(\.\d+)?$', v):
            setif(f, k, round(float(v) / 1e6, 2))
    setif(f, 'stage', clean(r[6])); setif(f, 'focus', clean(r[7])[:200])

h, data = table(S['PERE'])
for r in data:
    f = firm(r[0], 'Real estate PE', 'DayOne')
    add_contact(f, r[3], r[8], r[11])
    setif(f, 'aum', money(r[14])); setif(f, 'website', clean(r[16])); setif(f, 'about', clean(r[17])[:300])
    if f is not None and re.match(r'^\d{4}(\.0)?$', clean(r[13])):
        setif(f, 'founded', int(float(r[13])))

h, data = table(S['Investment Consultants'])
for r in data:
    f = firm(r[0], 'Investment consultant', 'DayOne')
    add_contact(f, r[4], r[9], r[12])
    setif(f, 'aum', money(r[15])); setif(f, 'website', clean(r[14])); setif(f, 'about', clean(r[16])[:300])

h, data = table(S['VC Firms'])
for r in data:
    f = firm(r[1], 'Venture capital', 'DayOne')
    add_contact(f, r[4], r[10], r[13])
    setif(f, 'focus', clean(r[15])[:200]); setif(f, 'aum', money(r[17])); setif(f, 'website', clean(r[20])); setif(f, 'about', clean(r[21])[:300])
    if f is not None and re.match(r'^\d{4}(\.0)?$', clean(r[16])):
        setif(f, 'founded', int(float(r[16])))

h, data = table(S['WM'])
for r in data:
    f = firm(r[1], 'Wealth manager', 'DayOne')
    add_contact(f, r[4], r[10], r[13])
    setif(f, 'aum', money(r[17])); setif(f, 'website', clean(r[20])); setif(f, 'about', clean(r[21])[:300]); setif(f, 'focus', clean(r[15])[:200])

h, data = table(S['Hedge Funds'])
for r in data:
    f = firm(r[0], 'Hedge fund', 'DayOne')
    add_contact(f, r[2], r[14], r[17])
    if f is not None and clean(r[8]):
        add_contact(f, r[9])
    setif(f, 'aum', money(r[18])); setif(f, 'website', clean(r[19])); setif(f, 'about', clean(r[20])[:300])

h, data = table(S['Endowment Funds'])
for r in data:
    f = firm(r[1], 'Endowment', 'DayOne')
    add_contact(f, r[4], r[8], r[11])
    setif(f, 'aum', money(f"{clean(r[12])}m") if clean(r[12]) else None); setif(f, 'website', clean(r[14]))

h, data = table(S['Private equity firms'])
for r in data:
    f = firm(r[0], 'Private equity', 'DayOne')
    setif(f, 'website', clean(r[1]))

# ---------------------------------------------------------------- emit
out = []
for key, f in firms.items():
    country = f['countries'].most_common(1)[0][0] if f['countries'] else ''
    city = f['cities'].most_common(1)[0][0] if f['cities'] else ''
    ll = CITY_LL.get(city.lower()) or COUNTRY_LL.get(country)
    types = f['types']
    # Prefer a specific type over the generic Wigo label when both lists include the firm.
    specific = [t for t, _ in types.most_common() if t != 'Private capital (Wigo list)']
    ftype = specific[0] if specific else 'Private capital'
    rec = {
        'id': re.sub(r'\s+', '-', key)[:60],
        'name': f['name'],
        'type': ftype,
        'city': city,
        'country': country or 'Unknown',
        'region': REGION.get(country, 'Other') if country else 'Unknown',
        'contacts': f['contacts'],
        'senior': f['senior'],
        'roles': [t for t, _ in f['titles'].most_common(3)],
    }
    if ll:
        rec['lat'], rec['lng'] = ll
    for k in ('aum', 'founded', 'checkMin', 'checkMax'):
        if f[k]:
            rec[k] = f[k]
    for k, n in (('focus', 110), ('about', 180), ('stage', 60)):
        if f[k]:
            v = scrub(f[k])[:n]
            if v:
                rec[k] = v
    site = re.sub(r'^https?://(www\.)?', '', f['website']).rstrip('/')
    if site and 'linkedin.com/in' not in site and '@' not in site:
        rec['website'] = site[:80]
    rec['roles'] = [scrub(t) for t in rec['roles'] if scrub(t)]
    stage_text = f"{f['stage']} {f['focus']} {f['about']}".lower()
    stages = [label for label, rx in STAGE_TAGS if re.search(rx, stage_text)]
    if stages:
        rec['stages'] = stages
    if f['wigo']:
        w = {k: (scrub(v) if isinstance(v, str) else v) for k, v in f['wigo'].items() if v}
        rec['wigo'] = w
    out.append(rec)

out.sort(key=lambda r: (-(r.get('aum') or 0), -r['contacts']))
meta = {
    'generated': __import__('datetime').date.today().isoformat(),
    'firms': len(out),
    'contacts': sum(r['contacts'] for r in out) + angels_independent,
    'independentAngels': angels_independent,
    'note': 'Firm-level aggregates only. Personal contact details are intentionally excluded.',
}
with open('public/data/investors.json', 'w', encoding='utf-8') as fh:
    json.dump({'meta': meta, 'firms': out}, fh, ensure_ascii=False, separators=(',', ':'))
print(json.dumps(meta, indent=1))
print('types', Counter(r['type'] for r in out).most_common())
print('geo coverage', sum('lat' in r for r in out), '/', len(out))
