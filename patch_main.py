import re

with open('src/main.tsx', 'r') as f:
    content = f.read()

pattern = r'  // Intercept console\.error.*?  }, true\);\n'
new_content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('src/main.tsx', 'w') as f:
    f.write(new_content)
