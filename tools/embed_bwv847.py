"""Put tools/bwv847.py's output (source and layout) into presets.ts — escaped for a template literal."""
import re, json, subprocess
src = subprocess.run(['python3', 'tools/bwv847.py'], capture_output=True, text=True, check=True).stdout.rstrip('\n')
lay = json.load(open('/tmp/bwv847.layout.json'))
esc = src.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')   # backslashes first: a label's \n stays \n
lay_ts = ',\n'.join(f'      {k}: [{x}, {y}]' for k, (x, y) in lay.items())
p = 'src/engine/presets.ts'
s = open(p).read()
m = re.search(r"  bwv847: \{\n    source: `(?:[^`\\]|\\.)*`,\n(?:    layout: \{\n(?:.*\n)*?    \},\n)?  \},\n", s)
s = s.replace(m.group(0), f"  bwv847: {{\n    source: `{esc}`,\n  }},\n")  # (no layout: the layers lay it out)
open(p, 'w').write(s)
