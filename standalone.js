import { compress, decompress } from "./compress.js";
import {
  outputAlphabetASCII,
  outputAlphabetQR,
  outputAlphabetEmoji
} from "./alphabets.js";

// The domain used in generated links. Override with the HAMR_DOMAIN
// environment variable, e.g. HAMR_DOMAIN=example.com node standalone.js ...
const domain = (process.env.HAMR_DOMAIN || "ha.mr")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .split("/")[0];

const input = process.argv[2]?.trim();
const alphabetName = process.argv[3]?.trim() || "ascii";
if (!input) {
  console.error(`Usage: hamr <link> [ascii|qr|emoji]`);
  process.exit(1);
}

// Decode an existing compressed link, e.g. http://<domain>#<payload> or
// https://<domain>/<payload> (or <domain>#<payload> without a scheme).
let payload = "";
const lowerInput = input.toLowerCase();
for (const prefix of [`http://${domain}`, `https://${domain}`, domain]) {
  if (lowerInput.startsWith(prefix)) {
    const rest = input.slice(prefix.length);
    // Only treat it as a compressed link if a payload delimiter follows.
    if (rest === "" || rest[0] === "#" || rest[0] === "/") {
      payload = rest;
      break;
    }
  }
}

if (payload) {
  // Hash links carry an ASCII/emoji payload, path links carry a QR payload.
  const isQRCode = payload[0] === "/";
  payload = payload.slice(1);
  const useEmoji = Array.from(payload).some(c => !outputAlphabetASCII.includes(c));
  if (isQRCode) console.log(decompress(payload, outputAlphabetQR));
  else console.log(decompress(payload, useEmoji ? outputAlphabetEmoji : outputAlphabetASCII));
  process.exit(0);
}

let alphabet = outputAlphabetASCII;
if (alphabetName === "qr") alphabet = outputAlphabetQR;
else if (alphabetName === "emoji") alphabet = outputAlphabetEmoji;
else if (alphabetName !== "ascii") {
  console.error(`Unknown alphabet "${alphabetName}".`);
  console.error("Select one of: ascii, qr, emoji");
  process.exit(2);
}

if (alphabetName === "qr") {
  console.log(`HTTP://${domain.toUpperCase()}/${compress(input, alphabet)}`);
} else {
  console.log(`http://${domain}#${compress(input, alphabet)}`);
}
