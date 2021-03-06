"use strict";
// Patch the emscripten build

// We need to deliver the WASM inline with the sqlite.js so it can be linked into the runtime without
// needing to be read from a file.

// FIXME: once WASM interfaces land and are supported by both emscripten and Deno, we probably don't
//        need to wrap things like this anymore.
const wasm = await Deno.readFile(Deno.args[1].replace(".js", ".wasm"));
function hexEncode(bytes) {
  const fragments = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i ++)
    fragments[i] = bytes[i].toString(16).padStart(2, "0");
  return fragments.join("");
}

// Patches (applied consecutively!)
const patches = [
  // write WASM hex
  {regexp: /const wasmHex = "[^"]+";/, replace: `const wasmHex = "${hexEncode(wasm)}";`},
  // fill in file-loading functions
  {regexp: /^/g, replace: `function read() {var d="${hexEncode(wasm)}";var b=new Uint8Array(d.length/2);for(var i=0;i<d.length;i+=2){b[i/2]=parseInt(d.substr(i,2),16);}return b;}\n`},
  // fix some Deno-specific problems with the provided runtime
  {regexp: /var UTF16Decoder ?=[^;]+;/g, replace: "var UTF16Decoder = undefined;"},
  {regexp: /if ?\(.+\) ?throw new Error\('not compiled for this environment[^;]+\);/g, replace: ""},
];

const file = Deno.args[1];
let data = new TextDecoder("utf-8").decode(Deno.readFileSync(file));
data = patches.reduce((acc, {regexp, replace}) => acc.replace(regexp, replace), data);

Deno.writeFileSync(file, new TextEncoder().encode(data));
if (Deno.args[1].indexOf("debug") !== -1)
  Deno.remove(Deno.args[1].replace(".js", ".wasm"));
