with open('src/components/ElyAuthModal.tsx', 'r') as f:
    content = f.read()

# Fix authMethod type
import re
content = re.sub(r"useState\<'password' \| 'oauth'\>\('password'\)", "useState<'password' | 'oauth' | 'offline'>('offline')", content)
content = re.sub(r"useState\<'password' \| 'oauth'\>\('offline'\)", "useState<'password' | 'oauth' | 'offline'>('offline')", content)

with open('src/components/ElyAuthModal.tsx', 'w') as f:
    f.write(content)
