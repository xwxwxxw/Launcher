with open('vite.config.ts', 'r') as f:
    content = f.read()

content = content.replace("hmr: process.env.DISABLE_HMR !== 'true',", "hmr: true,")
content = content.replace("watch: process.env.DISABLE_HMR === 'true' ? null : {},", "watch: {},")

with open('vite.config.ts', 'w') as f:
    f.write(content)
