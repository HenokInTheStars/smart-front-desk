import os
import glob
import re

PORTAL_COMPONENTS_DIR = "c:/Users/hhhen/Documents/Smart Front Desk System/smart-front-desk/frontend/src/components/portal"

replacements = {
    r'\bbg-white\b': 'bg-card',
    r'\bbg-slate-50\b': 'bg-muted/30',
    r'\bborder-slate-200\b': 'border-border',
    r'\bborder-slate-100\b': 'border-border/50',
    r'\bborder-indigo-200\b': 'border-primary/20',
    r'\btext-slate-900\b': 'text-foreground',
    r'\btext-slate-800\b': 'text-foreground',
    r'\btext-slate-700\b': 'text-foreground/90',
    r'\btext-slate-600\b': 'text-muted-foreground',
    r'\btext-slate-500\b': 'text-muted-foreground',
    r'\btext-slate-400\b': 'text-muted-foreground/70',
    r'\bbg-indigo-50\b': 'bg-primary/10',
    r'\bbg-indigo-100\b': 'bg-primary/20',
    r'\bbg-indigo-600\b': 'bg-primary',
    r'\bbg-indigo-700\b': 'bg-primary/90',
    r'\bhover:bg-indigo-700\b': 'hover:bg-primary/90',
    r'\btext-indigo-600\b': 'text-primary',
    r'\btext-indigo-700\b': 'text-primary',
    r'\bbg-rose-50\b': 'bg-destructive/10',
    r'\bbg-rose-600\b': 'bg-destructive',
    r'\btext-rose-600\b': 'text-destructive',
    r'\btext-rose-700\b': 'text-destructive',
    r'\bborder-rose-200\b': 'border-destructive/20',
    r'\bbg-emerald-50\b': 'bg-emerald-500/10',
    r'\bbg-emerald-600\b': 'bg-emerald-600',
    r'\btext-emerald-700\b': 'text-emerald-700',
    r'\btext-emerald-600\b': 'text-emerald-600',
    r'\bborder-emerald-200\b': 'border-emerald-500/20',
    r'\bbg-blue-50\b': 'bg-primary/10',
    r'\bbg-blue-600\b': 'bg-primary',
    r'\btext-blue-600\b': 'text-primary',
    r'\bhover:bg-slate-50\b': 'hover:bg-muted/30',
    r'\bhover:bg-slate-100\b': 'hover:bg-muted',
    r'\bdivide-slate-200\b': 'divide-border',
    r'\bring-slate-200\b': 'ring-border',
    r'\bfocus:border-indigo-500\b': 'focus:border-primary',
    r'\bfocus:border-blue-500\b': 'focus:border-primary',
    r'\bfocus:ring-indigo-500\b': 'focus:ring-primary',
    r'\bfocus:ring-blue-500\b': 'focus:ring-primary',
    r'\bshadow-sm\b': 'shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
    r'\bshadow-md\b': 'shadow-[0_4px_12px_rgba(0,0,0,0.03)]',
}

files = glob.glob(os.path.join(PORTAL_COMPONENTS_DIR, "*.tsx"))

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Refactored {os.path.basename(file_path)}")

print("Done refactoring UI components!")
