with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("if (authName && authUuid && authAccess) {\\n    const injectorPath = path.join(DATA_DIR, 'authlib-injector.jar');",
                          "if (authName && authUuid && authAccess && authAccess !== 'offline-token') {\\n    const injectorPath = path.join(DATA_DIR, 'authlib-injector.jar');")

with open('server.ts', 'w') as f:
    f.write(content)
