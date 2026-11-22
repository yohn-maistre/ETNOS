"""Optional DOCX export: requires python-docx and lxml; no network or runtime mutation."""
import json,re,zipfile,hashlib,shutil
from pathlib import Path
from docx import Document
from docx.shared import Pt,RGBColor
from docx.enum.text import WD_BREAK
from lxml import etree
import argparse
parser=argparse.ArgumentParser(description='Preserve the original foundation and append the current plan/ledger.')
parser.add_argument('--source',type=Path,required=True,help='Unchanged uploaded DOCX')
parser.add_argument('--output-dir',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'docs'/'foundation'
share=args.output_dir.resolve()
share.mkdir(parents=True,exist_ok=True)
original=args.source.resolve()
if original.parent != share:
 shutil.copy2(original,share/original.name)
assert hashlib.sha256(original.read_bytes()).hexdigest()=='dafd2ef03407443d0647f0d391bd26f08e9a731e7cf549ed9bb31a4c0eb2440a'
doc=Document(original)
# New export styles leave every source paragraph and style untouched.
from docx.enum.style import WD_STYLE_TYPE
for name,size,bold in [('ExecutionTitle',24,True),('ExecutionHeading',16,True),('ExecutionSubheading',12,True),('ExecutionBody',10,False)]:
 if name not in doc.styles:
  s=doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH); s.font.name='Calibri'; s.font.size=Pt(size); s.font.bold=bold
  s.paragraph_format.space_after=Pt(7)
  if bold:s.font.color.rgb=RGBColor.from_string('155A80')
doc.add_page_break()
doc.add_paragraph('IMPLEMENTATION ADDENDUM',style='ExecutionTitle')
doc.add_paragraph('11 November 2026 · Complete source retained · Planning checkpoint',style='ExecutionBody')
doc.add_paragraph('This export preserves the entire original foundation before this addendum. The source is a living design reference, not automatic authority to enable sensitive powers. The versioned Markdown plan, feature ledger and decision amendments are the working implementation layer. No new runtime feature or deployment is claimed by this export.',style='ExecutionBody')
text=(root/'execution-plan.md').read_text()
for line in text.splitlines():
 if not line.strip():continue
 if line.startswith('|'): # Tables become compact readable text without losing cells.
  if re.fullmatch(r'[| :\-]+',line):continue
  doc.add_paragraph(line.strip('|').replace(' | ','  •  '),style='ExecutionBody');continue
 if line.startswith('#'):
  title=re.sub(r'^#+\s*','',line)
  doc.add_paragraph(title,style='ExecutionHeading' if line.startswith('# ') or line.startswith('## ') else 'ExecutionSubheading')
 else:doc.add_paragraph(line.replace('**','').replace('`',''),style='ExecutionBody')
doc.add_page_break();doc.add_paragraph('FULL-SCOPE FEATURE LEDGER',style='ExecutionTitle')
features=json.loads((root/'feature-ledger.json').read_text())['features']
for f in features:
 doc.add_paragraph(f['id']+' · '+f['title'],style='ExecutionSubheading')
 for s in [f"{f['status']} · Workstream {f['workstream']} · Source sections {', '.join(map(str,f['source_sections']))}", 'Current evidence: '+f['current_evidence'],'Acceptance: '+f['acceptance'],'Gate: '+f['release_gate'],'Dependencies: '+(', '.join(f['depends_on']) or 'existing baseline')]:doc.add_paragraph(s,style='ExecutionBody')
doc.add_paragraph('CURRENT AMENDMENTS',style='ExecutionHeading')
for a in json.loads((root/'decision-ledger.json').read_text())['amendments']:
 doc.add_paragraph(a['id']+' · '+a['decision'],style='ExecutionSubheading');doc.add_paragraph(a['source']+'. '+a['interpretation'],style='ExecutionBody')
out=share/'ETNOS_Living_Commons_with_Implementation_Plan_2026-11-11.docx'
doc.save(out)
# Compare the entire original body XML (excluding final section properties) as parsed trees.
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def children(path):
 with zipfile.ZipFile(path) as z:tree=etree.fromstring(z.read('word/document.xml'))
 return list(tree.find('w:body',ns))
def normalized(e):
 return (e.tag,tuple(sorted(e.attrib.items())),e.text,e.tail,tuple(normalized(x) for x in e))
old=children(original); new=children(out)
old=[x for x in old if x.tag!='{'+ns['w']+'}sectPr']
assert len(new)>len(old)
assert [normalized(x) for x in old]==[normalized(x) for x in new[:len(old)]], 'Original body changed'
for name in ['README.md','living-commons.md','execution-plan.md','feature-ledger.md','feature-ledger.json','decision-ledger.json','review-notes.md','source-manifest.json','source-paragraphs.json','validation-receipt.json']:
 shutil.copy2(root/name,share/name)
receipt={'source_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'export_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'original_body_elements_preserved':len(old),'original_source_blocks':672,'feature_entries':len(features),'source_unchanged':True,'runtime_deployment':False}
(share/'export-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
with zipfile.ZipFile(share/'ETNOS_Living_Commons_Plan_2026-11-11.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(share.iterdir()):
  if p.suffix!='.zip':z.write(p,p.name)
print(json.dumps({'export':str(out),'source_preserved':True,'original_body_elements':len(old),'bundle_bytes':(share/'ETNOS_Living_Commons_Plan_2026-11-11.zip').stat().st_size}))
