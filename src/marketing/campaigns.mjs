// Original Motif campaign studies, rendered by the app's actual design pipeline.
// Artwork was generated for this project; no customer, metric or testimonial is implied.
export const campaignBrand = {
  name: 'Motif', website: '', description: 'An open-source, local AI creative studio.',
  product: 'AI posters, ad creatives, and marketing copy',
  audience: 'Independent brands and creators', voice: 'Direct, considered, practical.',
  colors: ['#ebd7c2', '#243d2c'], source: 'Motif brand materials',
}

const base = '*{box-sizing:border-box}body{margin:0}.ad{position:relative;width:1080px;height:1080px;overflow:hidden}.brand{position:absolute;font:38px Arial,sans-serif;letter-spacing:-2px}.cta{position:absolute;font:24px Arial,sans-serif}.headline{position:absolute;margin:0;white-space:pre-line;font-weight:400;letter-spacing:-6px;line-height:1.01}'

export const campaigns = [
  {
    title: 'Room for ideas', headline: 'Give your\nideas room.', cta: 'Make your next creative', kind: 'Social post', channel: 'Instagram',
    design: {
      html: '<main class="ad"><img data-asset="artwork"/><div class="brand">{{brand}}</div><h1 class="headline">{{headline}}</h1><div class="cta">{{cta}}</div></main>',
      css: base + '.ad{background:#112313;color:#f1dfc8}.ad>img{position:absolute;width:1080px;height:1080px;object-fit:cover}.brand{left:64px;top:58px}.headline{left:64px;top:176px;font-family:Georgia,serif;font-size:125px}.cta{left:64px;bottom:58px}',
      imagePrompt: 'An orange poppy on a deep forest-green background with clear space for typography.',
    },
  },
  {
    title: 'A point of view', headline: 'A brief.\nA point\nof view.', cta: 'Create with Motif', kind: 'Ad creative', channel: 'Facebook',
    design: {
      html: '<main class="ad"><div class="brand">{{brand}}</div><h1 class="headline">{{headline}}</h1><img data-asset="artwork"/><div class="cta">{{cta}}</div></main>',
      css: base + '.ad{background:#eddbc6;color:#252720}.brand{left:60px;top:54px}.headline{left:60px;top:154px;font-family:Arial,sans-serif;font-size:144px;z-index:1}.ad>img{position:absolute;right:60px;bottom:60px;width:500px;height:500px;object-fit:cover;border-radius:250px}.cta{left:60px;bottom:64px;width:320px}',
      imagePrompt: 'An orange poppy in dark green, cropped as a round campaign artwork detail.',
    },
  },
  {
    title: 'Your brand your way', headline: 'Your brand.\nYour way.', cta: 'Your models. Your creative studio.', kind: 'Email', channel: 'Email',
    design: {
      html: '<main class="ad"><div class="brand">{{brand}}</div><img data-asset="artwork"/><h1 class="headline">{{headline}}</h1><div class="cta">{{cta}}</div></main>',
      css: base + '.ad{background:#96a9b2;color:#202e31}.brand{left:60px;top:42px}.ad>img{position:absolute;left:60px;top:124px;width:960px;height:520px;object-fit:cover;object-position:center 65%}.headline{left:60px;top:690px;font-family:Arial,sans-serif;font-size:120px}.cta{left:60px;bottom:40px}',
      imagePrompt: 'An editorial crop of orange poppy artwork, presented within a blue-gray composition.',
    },
  },
]
