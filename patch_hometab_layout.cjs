const fs = require('fs');
let code = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');

// Replace the layout classes in the right sidebar
code = code.replace(
  '      <div className="w-80 h-full border-l border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md flex-shrink-0 flex flex-col items-center justify-center p-8 relative z-20 shadow-2xl">',
  '      <div className="w-80 h-full overflow-y-auto border-l border-zinc-800/40 bg-zinc-900/40 backdrop-blur-md flex-shrink-0 flex flex-col items-center py-10 px-6 relative z-20 shadow-2xl">'
);

code = code.replace(
  '          <div className="flex flex-col items-center group relative z-10">',
  '          <div className="flex flex-col items-center group relative z-10 w-full">'
);

code = code.replace(
  '            <div className="relative w-40 h-80 flex justify-center items-center">',
  '            <div className="relative w-full flex justify-center items-center min-h-[300px]">'
);

code = code.replace(
  '          <div className="flex flex-col items-center group relative z-10 w-full">',
  '          <div className="flex flex-col items-center group relative z-10 w-full mt-4">'
); // Might replace twice, let's just do a manual replace using string index if needed.

fs.writeFileSync('src/components/HomeTab.tsx', code);
