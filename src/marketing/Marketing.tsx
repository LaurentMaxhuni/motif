// Privacy copy is a factual template, not legal advice. Have a qualified lawyer
// review it for the applicable jurisdictions before operating a hosted service.
import { AudioLines } from 'lucide-react'
import creativeImage from './assets/creatives.png'
import mobileCreative from './assets/creative-mobile.png'
import brandImage from './assets/brand.png'
import mobileBrand from './assets/brand-mobile.png'
import studioImage from './assets/studio.png'
import mobileStudio from './assets/studio-mobile.png'
import './marketing.css'

export const repository = 'https://github.com/LaurentMaxhuni/motif'

function Wordmark() {
  return <a className="m-wordmark" href="/" aria-label="Motif home"><AudioLines aria-hidden="true" strokeWidth={2.5} /><span>motif</span></a>
}

function Header({ privacy }: { privacy: boolean }) {
  return <header className="m-header m-container"><Wordmark /><nav aria-label="Main navigation">
    <a href={privacy ? '/#workflow' : '#workflow'}>Workflow</a>
    <a href={repository}>Source code</a>
    <a className="m-button m-button-small" href="/app">Open studio</a>
  </nav></header>
}

function Footer() {
  return <footer className="m-footer m-container"><Wordmark /><nav aria-label="Footer navigation"><a href="/privacy">Privacy policy</a><a href="https://opensource.org/license/mit">MIT license</a><a href={repository}>GitHub</a></nav><span className="m-copyright">© 2026 Motif contributors</span></footer>
}

function Landing() {
  return <main id="main">
    <section className="m-hero m-container" aria-labelledby="hero-heading">
      <div className="m-hero-copy"><h1 id="hero-heading">Your local<br />creative studio.</h1><div className="m-hero-aside"><p>Make AI creatives with your brand context and your choice of models.</p><div className="m-actions"><a className="m-button" href="/app">Open your studio</a><a className="m-text-link" href={repository}>View source</a></div></div></div>
      <figure className="m-product"><picture><source media="(max-width: 680px)" srcSet={mobileStudio} width="537" height="842" /><img src={studioImage} alt="The real Motif studio with an example creative brief, content type, variations, and create controls" width="870" height="581" fetchPriority="high" /></picture><figcaption>The studio, with an example brief. Connect your models to create.</figcaption></figure>
    </section>
    <section id="workflow" className="m-walkthrough m-container" aria-labelledby="workflow-heading">
      <div className="m-section-head"><h2 id="workflow-heading">A brief, a revision,<br />a finished creative.</h2><p>Keep the context, drafts, and final files in one workspace.</p></div>
      <div className="m-preview-layout"><fieldset className="m-preview-select"><legend className="m-visually-hidden">Explore the workflow</legend>
        <label><input type="radio" name="walkthrough" value="brief" /><span>Start with a brief</span><small>Describe the idea and choose a content type. Your models make the copy, composition, and artwork.</small></label>
        <label><input type="radio" name="walkthrough" value="brand" defaultChecked /><span id="brand-heading">Keep your Brand DNA close</span><small>Add your colors, voice, and audience, or extract a public website. Review before saving.</small></label>
        <label><input type="radio" name="walkthrough" value="review" /><span>Revise, save, export</span><small>Ask for changes. Keep or replace artwork, undo a revision, then save a PNG or self-contained HTML.</small></label>
      </fieldset><div className="m-preview-images" aria-live="polite">
        <figure data-preview="brief"><picture><source media="(max-width: 680px)" srcSet={mobileStudio} width="537" height="842" /><img src={studioImage} alt="Motif’s creative brief and generation controls" width="870" height="581" loading="lazy" /></picture><figcaption>A brief is the starting point. Example content shown.</figcaption></figure>
        <figure data-preview="brand"><picture><source media="(max-width: 680px)" srcSet={mobileBrand} width="462" height="942" /><img src={brandImage} alt="The real Brand DNA screen with sample business context" width="1095" height="582" loading="lazy" /></picture><figcaption>Your saved business context travels with the brief.</figcaption></figure>
        <figure data-preview="review"><picture><source media="(max-width: 680px)" srcSet={mobileCreative} width="533" height="740" /><img src={creativeImage} alt="Example templates in Motif’s creative workspace" width="1656" height="528" loading="lazy" /></picture><figcaption>Example templates, ready to review in the workspace.</figcaption></figure>
      </div></div>
    </section>
    <section id="open-source" className="m-source m-container" aria-labelledby="source-heading"><div className="m-source-layout"><div><h2 id="source-heading">A workspace you can own.</h2><p>Motif is MIT licensed. Read, change, share.</p><a className="m-text-link" href={repository}>Explore the repository</a></div><dl>
      <div><dt>Stored locally</dt><dd>Your brands and creations stay in your local workspace.</dd></div>
      <div><dt>Your choice of AI</dt><dd>Use local models or configured cloud providers. Their costs and policies apply.</dd></div>
      <div><dt>Clear data boundaries</dt><dd>Optional services receive information when you choose to use them. <a href="/privacy">Read the privacy policy</a>.</dd></div>
    </dl></div></section>
    <section className="m-faq m-container" aria-labelledby="faq-heading"><div className="m-section-head"><h2 id="faq-heading">Before you start.</h2><p>Setup, models, and publishing.</p></div><div className="m-questions">
      <details><summary>What do I need to run Motif?<span aria-hidden="true">+</span></summary><p>Node.js 22.13 or later and Chrome, Chromium, or Edge. Install dependencies, then run <code>npm start</code>. The <a href={`${repository}#run`}>setup guide</a> has the commands.</p></details>
      <details><summary>Does it include an AI model?<span aria-hidden="true">+</span></summary><p>No model is bundled. Connect your text and image providers in Settings. Use local servers or supported cloud providers. Cloud services may charge separately.</p></details>
      <details><summary>Does it publish automatically?<span aria-hidden="true">+</span></summary><p>No. Optional social connections require an explicit delivery action. The local calendar alone does not publish your work.</p></details>
      <details><summary>Can I use it without an account?<span aria-hidden="true">+</span></summary><p>Motif needs no account. Your chosen AI providers or social services may require their own accounts and credentials.</p></details>
    </div></section>
    <section className="m-close m-container" aria-labelledby="close-heading"><h2 id="close-heading">Open the studio when you’re ready.</h2><div className="m-close-actions"><a className="m-button" href="/app">Open your studio</a><a className="m-text-link" href={`${repository}#run`}>Read the setup guide</a></div></section>
  </main>
}

function Privacy() {
  return <main id="main" className="m-policy m-container">
    <div className="m-policy-heading"><h1>Privacy policy.</h1><p>This policy describes the local version of Motif in this repository.</p><p><time dateTime="2026-11-07">Updated November 7, 2026</time></p></div>
    <div className="m-policy-layout"><nav aria-label="Privacy contents"><a href="#local-data">Your local data</a><a href="#providers">External services</a><a href="#browser-storage">Browser storage</a><a href="#your-control">Your control</a><a href="#questions">Questions</a></nav><article>
      <section id="local-data"><h2>Your workspace lives on your machine.</h2><p>Motif stores brand details, briefs, generated content, settings, and workflow records in a SQLite database on the computer running the app. It does not require a Motif account and includes no app analytics, advertising trackers, or telemetry.</p><p>The local server listens on the loopback address. Brand and creative data are used to provide the workflows you request. They are not automatically uploaded to a central Motif service.</p></section>
      <section id="providers"><h2>You choose what leaves it.</h2><p>Configured AI providers receive the information needed for an action you start. Text generation can include your brief, Brand DNA, and creative content. Image generation sends an artwork prompt. CLI providers use their configured model services; Cloudflare image generation uses Cloudflare. Provider terms, retention, and processing locations apply.</p><p>Local model endpoints are restricted to loopback addresses. A separate local server or CLI can still forward requests to another service; review its configuration.</p><p>Website analysis contacts the public website you supply and permitted related pages to extract brand information. Optional AI interpretation sends supplied excerpts to your selected provider. Optional social connections contact their services when you explicitly test, discover accounts, or deliver content. A scheduled delivery instructs that service to publish later.</p></section>
      <section id="browser-storage"><h2>Preferences, without tracking.</h2><p>Your browser stores your appearance preference, selected brand, and unfinished onboarding details in local storage. A functional sidebar cookie remembers whether the sidebar is open. Motif does not use these for advertising or analytics. Fonts and product images are served locally.</p><p>Following a GitHub or other external link takes you to a separate service with its own privacy practices.</p></section>
      <section id="your-control"><h2>Keep, export, or remove.</h2><p>Workspace data remains until you delete it. Use Settings to export a workspace backup and app controls to edit or delete brands and creations. Exported copies and third-party records remain separate.</p><p>For a complete local reset, stop Motif, then remove its data folder and clear this site’s browser storage. This permanently removes the local workspace and credentials. Make any backup you need first.</p><p>Image-provider and social-connection credentials are encrypted separately from workspace documents. The encryption key is stored on the same machine. Workspace JSON exports exclude these credentials; physical database backups contain encrypted secrets and need protection.</p></section>
      <section id="questions"><h2>Questions about this version?</h2><p>The project’s <a href={repository}>public repository</a> provides the source and a route for reporting software issues. Do not post private workspace data or credentials in public issues.</p><p>Motif has no dedicated children’s data collection or age-verification flow. If you run it for other people, you are responsible for the information you process and the services you configure.</p><p>This notice covers the local app, not a separately hosted service. A hosted version needs its own operator identity, private contact channel, hosting and logging details, retention policy, and applicable regional disclosures. Changes to this local notice will be recorded here with an updated date.</p></section>
    </article></div>
  </main>
}

export default function Marketing({ privacy = false }: { privacy?: boolean }) {
  return <div className="marketing"><a className="m-skip" href="#main">Skip to content</a><Header privacy={privacy} />{privacy ? <Privacy /> : <Landing />}<Footer /></div>
}
