// Privacy copy is a factual template, not legal advice. Have a qualified lawyer
// review it for the applicable jurisdictions before operating a hosted service.
import { useEffect } from 'react'
import { AudioLines } from 'lucide-react'
import campaignOne from './assets/campaign-1.jpg'
import campaignTwo from './assets/campaign-2.jpg'
import campaignThree from './assets/campaign-3.jpg'
import campaignOneLarge from './assets/campaign-1-large.jpg'
import campaignTwoLarge from './assets/campaign-2-large.jpg'
import campaignThreeLarge from './assets/campaign-3-large.jpg'
import workspaceImage from './assets/workspace-dark.jpg'
import workspacePhone from './assets/workspace-phone.jpg'
import './marketing.css'

export const repository = 'https://github.com/LaurentMaxhuni/motif'
const campaignSizes = '(min-width: 1024px) 350px, (min-width: 640px) calc(100svh - 420px), 270px'

function Wordmark() {
  return <a className="nav__logo motif-brand" href="/" aria-label="Motif home"><AudioLines aria-hidden="true" strokeWidth={2} /><span>motif</span></a>
}

function Header({ privacy }: { privacy: boolean }) {
  return <header className="nav nav--centre"><div className="wrap nav__bar"><a className="skip-link" href="#main">Skip to content</a><Wordmark /><nav className="nav__links" id="site-navigation" aria-label="Main navigation">
    <a className="nav__link" href={privacy ? '/#workspace' : '#workspace'}>Workspace</a>
    <a className="nav__link" href={privacy ? '/#workflow' : '#workflow'}>Workflow</a>
    <a className="nav__link" href={privacy ? '/#open-source' : '#open-source'}>Open source</a>
    <a className="nav__link" href="/privacy">Privacy</a>
  </nav><div className="nav__actions"><a className="btn btn--primary" href="/app">Try Motif</a></div><button className="nav__toggle btn btn--secondary" type="button" aria-label="Toggle navigation" aria-controls="site-navigation" aria-expanded="false"><span aria-hidden="true">Menu</span></button></div></header>
}

function Footer({ privacy = false }: { privacy?: boolean }) {
  const links = <nav aria-label="Footer navigation"><a href="/privacy">Privacy policy</a><a href="https://opensource.org/license/mit">MIT license</a><a href={repository}>GitHub</a><a href={repository + '#run'}>Setup guide</a></nav>
  if (privacy) return <footer className="legal-footer"><div className="wrap"><Wordmark />{links}<span>© 2026 Motif contributors</span></div></footer>
  return <footer className="closing footer--dark" id="start"><div className="wrap"><div className="close-type"><h2>Your models.<br />Your next campaign.</h2><p>One brief. Your brand. Your choice of models.</p><a className="btn btn--primary" href="/app">Try Motif</a></div><div className="footer-directory"><div className="footer-wordmark" aria-hidden="true">motif</div><div className="footer-legal"><Wordmark />{links}<span>© 2026 Motif contributors</span></div></div></div></footer>
}

function Landing() {
  return <main id="main">
    <section className="hero hero--centred" id="hero" aria-labelledby="hero-heading"><div className="wrap"><div className="hero-text">
      <div className="hero__c"><h1 id="hero-heading">AI creatives for<br />your brand.</h1><p className="hero__lead">Turn briefs into 1080 × 1080 creatives with your own models.</p><div className="btn-row"><a className="btn btn--primary" href="/app">Try Motif</a><a className="btn btn--secondary" href={repository}>Read source</a></div></div>
      <div className="hero-art" data-visual="campaigns"><div className="campaign-grid">
        <a className="campaign-card m-zoom" href="/app" aria-label="Try Motif to create social posts"><img src={campaignOne} srcSet={`${campaignOne} 640w, ${campaignOneLarge} 1080w`} sizes={campaignSizes} alt="Motif campaign with orange poppy artwork and the words Give your ideas room" width="640" height="640" fetchPriority="high" /></a>
        <a className="campaign-card m-zoom" href="/app" aria-label="Try Motif to create ad creatives"><img src={campaignTwo} srcSet={`${campaignTwo} 640w, ${campaignTwoLarge} 1080w`} sizes={campaignSizes} alt="Motif campaign with cream typography and an orange poppy detail" width="640" height="640" /></a>
        <a className="campaign-card m-zoom" href="/app" aria-label="Try Motif to create email creatives"><img src={campaignThree} srcSet={`${campaignThree} 640w, ${campaignThreeLarge} 1080w`} sizes={campaignSizes} alt="Motif campaign in blue-gray with the words Your brand Your way" width="640" height="640" /></a>
      </div></div>
    </div></div></section>
    <section className="section workspace-section" id="workspace" aria-labelledby="workspace-heading"><div className="wrap">
      <div className="section-head"><h2 id="workspace-heading">Briefs, drafts, and exports.</h2><p>Keep your briefs, brand context, and finished creatives together. Review every draft before you send it.</p></div>
      <div className="app-frame fill" data-visual="workspace"><picture><source media="(max-width: 639px)" srcSet={workspacePhone} /><img src={workspaceImage} alt="The real Motif workspace showing original Motif brand campaigns, drafts, search, and review controls" width="1440" height="1000" loading="lazy" decoding="async" /></picture></div>
    </div></section>
    <section className="section workflow-section" id="workflow" aria-labelledby="workflow-heading"><div className="wrap">
      <h2 id="workflow-heading">Brand DNA and revisions.</h2><div className="workflow-cards">
        <article className="card card--open m-nolift"><h3>Your Brand DNA.</h3><p>Your voice, colors, and audience. Extract a public website, then review before saving.</p><div className="workflow-visual brand-context" data-visual="brand" role="img" aria-label="Motif brand context: direct, considered voice, independent creators, cream and forest palette"><div className="context-name"><AudioLines aria-hidden="true" /><span>motif</span></div><dl><div><dt>Voice</dt><dd>Direct, considered, practical.</dd></div><div><dt>Audience</dt><dd>Independent brands and creators.</dd></div><div><dt>Palette</dt><dd className="brand-colors"><span className="swatch swatch-cream">Cream</span><span className="swatch swatch-forest">Forest</span></dd></div></dl></div></article>
        <article className="card card--open m-nolift"><h3>Creative revisions.</h3><p>Describe a change, keep or regenerate artwork, undo, then export PNG or HTML.</p><div className="workflow-visual revision-context" data-visual="revision"><div className="revision-instruction"><span>Revision instruction</span><p>Give the headline more space and keep the artwork.</p><span className="artwork-choice">Artwork: keep existing</span></div><img src={campaignOne} alt="The current Motif brand creative whose artwork is kept for the revision" width="640" height="640" loading="lazy" decoding="async" /></div></article>
      </div>
    </div></section>
    <section className="section source-section" id="open-source" aria-labelledby="source-heading"><div className="wrap">
      <div className="section-head"><h2 id="source-heading">Open source.<br />Locally yours.</h2><p>MIT licensed. Your workspace stays local. Connect providers when you need them.</p></div>
      <div className="source-grid"><div className="source-code" data-visual="source"><div className="source-code-title"><span>Run Motif locally</span><a className="link" href={repository}>Read source</a></div><pre><code>{'npm ci\nnpm start'}</code></pre><a className="link" href={repository + '#run'}>Read the setup guide</a></div>
      <dl className="setup-questions"><div><dt>What do I need?</dt><dd>Node.js 22.13+ and Chrome, Chromium, or Edge.</dd></div><div><dt>Are models included?</dt><dd>No. Motif needs no account. Provider costs and policies apply.</dd></div><div><dt>Does Motif publish automatically?</dt><dd>No. Connections require your explicit delivery action. Calendar entries stay local.</dd></div></dl></div>
    </div></section>
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
  useEffect(() => {
    void import('./taste/system.js').then(() => import('./taste/motion/motion.js'))
  }, [])
  return <div className="marketing"><Header privacy={privacy} />{privacy ? <Privacy /> : <Landing />}<Footer privacy={privacy} /></div>
}
