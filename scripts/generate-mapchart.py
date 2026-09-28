"""Extract state geometry from the user's MapChart SVG and pair it with MapChart's 1936 setup.

Run: python3 scripts/generate-mapchart.py 'upload/MapChart_Map(4).svg'
The 1936 setup is saved in src/mapchart1936.js, with an explicitly corrected
Free City of Danzig. MapChart's game start data is a baseline, not a guarantee
of complete historical accuracy.
"""
import json
import sys
from pathlib import Path
from lxml import etree

source = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/mapchart-source.svg')
base = json.loads(Path('src/mapchart1936.js').read_text().split('export default ', 1)[1].rstrip(';\n'))
by_id = {name: (label, color) for name, label, color in base}
if len(by_id) != len(base):
    raise ValueError('The MapChart baseline contains duplicate state IDs')

european = {
    'United Kingdom':'GBR','Ireland':'IRL','Netherlands':'NLD','Belgium':'BEL',
    'Luxembourg':'LUX','France':'FRA','Switzerland':'CHE','Spain':'ESP',
    'Portugal':'PRT','German Reich':'GER','Poland':'POL','Austria':'AUT',
    'Kingdom of Hungary':'HUN','Czechoslovakia':'CZE','Italy':'ITA',
    'Albania':'ALB','Yugoslavia':'YUG','Kingdom of Greece':'GRC',
    'Bulgaria':'BGR','Romania':'ROU','Soviet Union':'SOV','Estonia':'EST',
    'Latvia':'LVA','Lithuania':'LTU','Finland':'FIN','Sweden':'SWE',
    'Norway':'NOR','Denmark':'DNK','Turkey':'TUR','Iraq':'IRQ','Iran':'IRN',
    'Republic of Syria':'SYR','Lebanese Republic':'LBN',
    'Mandatory Palestine':'PAL','Emirate of Transjordan':'JOR',
    'Sheikhdom of Kuwait':'KWT',
}
corrections = {'Danzig':'DAN'}
paths = etree.parse(str(source)).xpath('//*[local-name()="svg" and @id="map"]/*[local-name()="path"]')
states = []
for path in paths:
    name, shape = path.get('id'), path.get('d')
    if not name or not shape or name not in by_id:
        raise ValueError(f'Unmatched MapChart state: {name}')
    label, color = by_id[name]
    states.append([name, shape, corrections.get(name, european.get(label, label)), color])
if len(states) != len(by_id):
    raise ValueError('Source SVG and the 1936 configuration have different state sets')
Path('src/mapchart.js').write_text(
    '/* User-supplied MapChart SVG + MapChart 1936 setup, CC BY-SA 4.0. */\nexport default ' +
    json.dumps(states, ensure_ascii=False, separators=(',', ':')) + ';\n'
)
print(f'Extracted {len(states)} state paths and starting owners.')
