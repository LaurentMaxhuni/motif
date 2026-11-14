// This function runs as a standalone browser script before the app loads.
export function initializeTheme() {
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{
    const preferred=localStorage.getItem('motif-theme')||'system';
    document.documentElement.dataset.theme=preferred==='dark'||preferred==='system'&&media.matches?'dark':'light';
    document.documentElement.classList.toggle('dark',document.documentElement.dataset.theme==='dark');
  };
  media.addEventListener('change',apply);window.addEventListener('storage',event=>{if(event.key==='motif-theme')apply();});window.addEventListener('motif-theme',apply);apply();
}
