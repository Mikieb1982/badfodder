from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')
voice='<script src="voice-system.js?v=20261005-1"></script>'
if voice not in text:
    anchor='<script src="adaptive-director.js?v=20261004-1"></script>\n<script src="mission-assets.js"></script>'
    replacement='<script src="adaptive-director.js?v=20261004-1"></script>\n'+voice+'\n<script src="mission-assets.js"></script>'
    if anchor not in text:
        raise SystemExit('voice-system insertion anchor not found')
    text=text.replace(anchor,replacement,1)
    path.write_text(text,encoding='utf-8')
