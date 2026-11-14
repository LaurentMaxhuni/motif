// Motif marketing site — small progressive enhancements. Everything works without it.
(() => {
  const root = document.documentElement
  root.classList.add('js')

  const store = {
    get(key) { try { return localStorage.getItem(key) } catch { return null } },
    set(key, value) { try { localStorage.setItem(key, value) } catch { /* storage unavailable */ } },
  }

  // Theme: explicit choice wins, otherwise follow the system.
  const saved = store.get('motif-site-theme')
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved
  const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches
  const currentTheme = () => root.dataset.theme || (systemDark() ? 'dark' : 'light')

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const sync = () => button.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
      sync()
      button.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark'
        root.dataset.theme = next
        store.set('motif-site-theme', next)
        sync()
      })
    })

    // Mobile menu
    const menuButton = document.querySelector('.menu-toggle')
    const links = document.getElementById('nav-links')
    if (menuButton && links) {
      const setOpen = open => {
        links.classList.toggle('is-open', open)
        menuButton.setAttribute('aria-expanded', String(open))
      }
      menuButton.addEventListener('click', () => setOpen(!links.classList.contains('is-open')))
      links.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false) })
      document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false) })
      window.matchMedia('(min-width: 861px)').addEventListener('change', event => { if (event.matches) setOpen(false) })
    }

    // Header border once scrolled
    const header = document.querySelector('.site-header')
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Copy buttons for terminal blocks
    document.querySelectorAll('[data-copy]').forEach(button => {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.dataset.copy)
        if (!target) return
        const text = [...target.querySelectorAll('[data-cmd]')].map(line => line.textContent).join('\n') || target.textContent
        const label = button.querySelector('span')
        try {
          await navigator.clipboard.writeText(text)
          if (label) label.textContent = 'Copied'
        } catch {
          if (label) label.textContent = 'Select & copy'
        }
        setTimeout(() => { if (label) label.textContent = 'Copy' }, 1800)
      })
    })

    // Reveal on scroll
    const reveals = document.querySelectorAll('.reveal')
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target) }
        })
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
      reveals.forEach(element => observer.observe(element))
    } else {
      reveals.forEach(element => element.classList.add('is-in'))
    }

    // Highlight the active in-page section in sub-navs and tables of contents
    const tocLinks = [...document.querySelectorAll('.subnav a[href^="#"], .toc a[href^="#"]')]
    if (tocLinks.length && 'IntersectionObserver' in window) {
      const byId = new Map(tocLinks.map(link => [link.getAttribute('href').slice(1), link]))
      const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          tocLinks.forEach(link => link.classList.remove('is-active'))
          byId.get(entry.target.id)?.classList.add('is-active')
        })
      }, { rootMargin: '-30% 0px -60% 0px' })
      byId.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section) })
    }

    document.querySelectorAll('[data-year]').forEach(element => { element.textContent = String(new Date().getFullYear()) })
  })
})()
