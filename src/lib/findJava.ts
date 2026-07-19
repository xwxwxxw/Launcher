import fs from 'fs';
import path from 'path';
import os from 'os';

export function findJavaPaths(): string[] {
    const paths: Set<string> = new Set();
    const isWin = os.platform() === 'win32';
    
    if (isWin) {
        const basePaths = [
            process.env.ProgramFiles,
            process.env['ProgramFiles(x86)'],
            process.env.LocalAppData,
            process.env.ProgramW6432
        ].filter(Boolean) as string[];

        const javaDirs = [
            'Java',
            'Eclipse Adoptium',
            'BellSoft',
            'Amazon Corretto',
            'Microsoft\\jdk',
            'Zulu',
            'AdoptOpenJDK',
            'ojdkbuild',
            'Semeru'
        ];

        for (const base of basePaths) {
            for (const dir of javaDirs) {
                const searchPath = path.join(base, dir);
                if (fs.existsSync(searchPath)) {
                    try {
                        const subdirs = fs.readdirSync(searchPath);
                        for (const sub of subdirs) {
                            const javaExe = path.join(searchPath, sub, 'bin', 'java.exe');
                            if (fs.existsSync(javaExe)) {
                                paths.add(javaExe);
                            }
                            const jreJavaExe = path.join(searchPath, sub, 'jre', 'bin', 'java.exe');
                            if (fs.existsSync(jreJavaExe)) {
                                paths.add(jreJavaExe);
                            }
                        }
                    } catch (e) {}
                }
            }
        }
        
        // Also check if java is in PATH
        const envPath = process.env.PATH || '';
        const pathDirs = envPath.split(path.delimiter);
        for (const p of pathDirs) {
            const javaExe = path.join(p, 'java.exe');
            if (fs.existsSync(javaExe)) {
                paths.add(javaExe);
            }
        }

    } else {
        // Mac / Linux paths
        const searchPaths = [
            '/usr/bin/java',
            '/usr/local/bin/java',
            '/opt/homebrew/bin/java',
            '/usr/lib/jvm'
        ];
        
        for (const p of searchPaths) {
            if (p.endsWith('java') && fs.existsSync(p)) {
                paths.add(p);
            } else if (fs.existsSync(p)) {
                try {
                    const subdirs = fs.readdirSync(p);
                    for (const sub of subdirs) {
                        const javaBin = path.join(p, sub, 'bin', 'java');
                        if (fs.existsSync(javaBin)) {
                            paths.add(javaBin);
                        }
                    }
                } catch (e) {}
            }
        }
    }
    
    return Array.from(paths);
}

