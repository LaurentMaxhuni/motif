import { deflateSync } from 'node:zlib';

export const fixtureDesign={
  html:'<main class="ad"><header>{{brand}}</header><div class="art"><img data-asset="artwork"></div><section class="copy"><h1>{{headline}}</h1><p>{{subhead}}</p><strong>{{cta}}</strong></section><small>Thoughtfully made. Every day.</small></main>',
  css:'.ad{width:1080px;height:1080px;position:relative;background:#e9e9da;color:#253c35;font-family:Arial,sans-serif;padding:64px;overflow:hidden}.ad header{font-size:26px;letter-spacing:3px}.art{position:absolute;right:-80px;top:250px;width:760px;height:760px;border-radius:50%;overflow:hidden}.art img{width:100%;height:100%;object-fit:cover}.copy{position:relative;width:650px;padding-top:105px}.copy h1{font-family:Georgia,serif;font-size:114px;line-height:1.03;letter-spacing:-6px;margin:0 0 32px}.copy p{font-size:25px;max-width:420px;line-height:1.5}.copy strong{display:inline-block;background:#253c35;color:white;padding:20px 32px;border-radius:40px;font-size:22px;margin-top:20px}.ad small{position:absolute;bottom:60px;left:64px;font-size:18px}',
  imagePrompt:'Abstract sculptural objects in terracotta and muted pink, studio lighting, no text.'
};

// A deterministic PNG fixture, not model output. Avoid an external image dependency in tests.
export function fixturePNG(){
  const size=256,raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*(size*4+1)+1+x*4;const sphere=(x-125)**2+(y-140)**2<78**2;raw[i]=sphere?197:236;raw[i+1]=sphere?106+Math.floor(x/8):187-Math.floor(y/12);raw[i+2]=sphere?89+Math.floor(y/12):173;raw[i+3]=255;}
  const crc32=buffer=>{let crc=0xffffffff;for(const b of buffer){crc^=b;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const type=Buffer.from(name);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length,0);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([type,data])),data.length+8);return out;};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
