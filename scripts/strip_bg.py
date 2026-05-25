import re
path = r"c:\phpstudy_pro\WWW\mario\js\levels.js"
text = open(path, encoding="utf-8").read()
text = re.sub(r"\n    bg: '[^']+',", "", text)
open(path, "w", encoding="utf-8").write(text)
print("done")
