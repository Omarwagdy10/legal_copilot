from pathlib import Path
from textwrap import dedent
out=Path(__file__).parent/'contracts'; out.mkdir(exist_ok=True)
clauses=[
('Probation','The probation period shall not exceed three months.'),
('Confidentiality','Confidentiality obligations shall have a defined duration.'),
('Termination','Termination notice procedures shall be clear and written.'),
('Intellectual Property','Intellectual property rights and ownership shall be clearly defined.')]
for i in range(30):
    lines=[f'Synthetic Employment Contract {i+1}', 'This document contains synthetic data for evaluation only.']
    for title,text in clauses: lines += [f'{title}: {text}', 'The parties shall comply with applicable internal policies.']
    (out/f'contract_{i+1:02d}.txt').write_text('\n'.join(lines),encoding='utf-8')
print('Generated 30 synthetic contracts.')
