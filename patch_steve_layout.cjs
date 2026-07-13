const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

code = code.replace(
  '            <div className="relative w-40 h-80 flex justify-center items-center opacity-40 grayscale group-hover:grayscale-[0.5] group-hover:opacity-70 transition-all duration-700">',
  '            <div className="relative w-full flex justify-center items-center min-h-[300px] opacity-40 grayscale group-hover:grayscale-[0.5] group-hover:opacity-70 transition-all duration-700">'
);

fs.writeFileSync('src/components/HomeTab.tsx', code);
