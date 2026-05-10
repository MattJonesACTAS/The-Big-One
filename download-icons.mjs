import fs from 'fs';

async function download() {
  console.log("Downloading 192");
  const res192 = await fetch("https://placehold.co/192x192/1D9E75/ffffff/png?text=BO");
  const buf192 = await res192.arrayBuffer();
  fs.writeFileSync("public/icon-192.png", Buffer.from(buf192));

  console.log("Downloading 512");
  const res512 = await fetch("https://placehold.co/512x512/1D9E75/ffffff/png?text=BO");
  const buf512 = await res512.arrayBuffer();
  fs.writeFileSync("public/icon-512.png", Buffer.from(buf512));

  console.log("Downloading 180");
  const res180 = await fetch("https://placehold.co/180x180/1D9E75/ffffff/png?text=BO");
  const buf180 = await res180.arrayBuffer();
  fs.writeFileSync("public/apple-touch-icon.png", Buffer.from(buf180));
}

download().catch(console.error);
