import type { ReactNode } from 'react'
import { ArrowDown, ArrowUpRight, AudioLines } from 'lucide-react'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import campaignArt from '@/assets/motif-campaign.webp'
import './welcome-landing.css'

const steps = [
  { title: 'Find your voice', description: 'Use your website or write your own Brand DNA. Review the details before saving.' },
  { title: 'Make a campaign', description: 'Turn a brief into on-brand copy and artwork with your chosen models.' },
  { title: 'Make it yours', description: 'Revise, compare saved versions, and export the creative when it’s ready.' },
]

export function WelcomeLanding({ children }: { children: ReactNode }) {
  return <div className="welcome">
    <header className="welcome-masthead">
      <div className="welcome-wordmark"><AudioLines aria-hidden="true" />motif</div>
      <nav aria-label="Welcome">
        <a className="welcome-nav-link" href="#how-motif-works">How it works</a>
        <a className="welcome-cta welcome-cta-small" href="#brand-setup">Set up my brand <ArrowUpRight aria-hidden="true" /></a>
      </nav>
    </header>

    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-intro">
        <p className="welcome-eyebrow">Your local creative studio</p>
        <h1 id="welcome-title">Make it <em>unmistakably</em> yours.</h1>
        <p className="welcome-lede">Give your brand a voice, then make the campaign only you could make. Research, create, and review from one local workspace.</p>
        <a className="welcome-cta" href="#brand-setup">Set up my brand <ArrowDown aria-hidden="true" /></a>
      </div>
      <figure className="welcome-figure">
        <div className="welcome-poster">
          <img src={campaignArt} alt="Cobalt ceramic mug and sculptural handle on an orange plinth" fetchPriority="high" />
          <p aria-hidden="true">Form &amp; Field<span>Objects for slow mornings.</span></p>
        </div>
        <figcaption><span>Form &amp; Field</span><span>Example campaign</span></figcaption>
      </figure>
    </section>

    <section className="welcome-process" id="how-motif-works" tabIndex={-1} aria-labelledby="welcome-process-title">
      <h2 id="welcome-process-title">From brand to campaign</h2>
      <ol>
        {steps.map(step => <li key={step.title}>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </li>)}
      </ol>
    </section>

    <section className="welcome-setup" id="brand-setup" tabIndex={-1} aria-labelledby="welcome-setup-title">
      <div>
        <h2 id="welcome-setup-title">Start with your brand.</h2>
        <p>Bring a public website to research, or enter your brand details yourself.</p>
      </div>
      {children}
    </section>
  </div>
}
