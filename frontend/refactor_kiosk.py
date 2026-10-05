import os
import re

kiosk_dir = r"c:\Users\hhhen\Documents\Smart Front Desk System\smart-front-desk\frontend\src\components\kiosk"

replacements = {
    r"bg-\[\#0058be\]": "bg-primary",
    r"hover:bg-\[\#2170e4\]": "hover:bg-primary/90",
    r"hover:bg-\[\#004799\]": "hover:bg-primary/90",
    r"hover:bg-\[\#004294\]": "hover:bg-primary/90",
    r"text-\[\#0b1c30\]": "text-foreground",
    r"border-\[\#c6c6cd\]": "border-border",
    r"text-\[\#111827\]": "text-foreground",
    r"bg-\[\#e0e7ff\]": "bg-primary/20",
    r"text-\[\#4f46e5\]": "text-primary",
    r"border-\[\#0058be\]": "border-primary",
    r"focus:border-\[\#0058be\]": "focus:border-primary",
    r"focus:ring-\[\#0058be\]": "focus:ring-primary",
    r"text-\[\#0058be\]": "text-primary",
    r"bg-\[\#eff4ff\]": "bg-primary/10",
    r"bg-\[\#f4f7fa\]": "bg-background",
}

for root, _, files in os.walk(kiosk_dir):
    for file in files:
        if file.endswith(".tsx"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            for old, new in replacements.items():
                content = re.sub(old, new, content)
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print("Kiosk files updated.")
