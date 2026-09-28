import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Replace 'http://localhost:8000/...' with `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/...`
    # Match fetch('http://localhost:8000... or fetch(`http://localhost:8000...
    
    # Pattern 1: string literals with single quotes
    content = re.sub(
        r"'http://localhost:8000(/[^']*)'",
        r"`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}\1`",
        content
    )
    
    # Pattern 2: string literals with double quotes
    content = re.sub(
        r'"http://localhost:8000(/[^"]*)"',
        r"`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}\1`",
        content
    )
    
    # Pattern 3: already template literals starting with http://localhost:8000
    content = re.sub(
        r"`http://localhost:8000(/[^`]*)`",
        r"`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}\1`",
        content
    )

    # Pattern 4: loose references not inside quotes, like let url = 'http://localhost:8000/appointments'; 
    # The first patterns should catch this if it's inside quotes.

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    src_dir = os.path.join('frontend', 'src')
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
