(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{
    const preferred=localStorage.getItem('motif-theme')||'system';
    document.documentElement.dataset.theme=preferred==='dark'||preferred==='system'&&media.matches?'dark':'light';
  };
  media.addEventListener('change',apply);window.addEventListener('storage',event=>{if(event.key==='motif-theme')apply();});window.addEventListener('motif-theme',apply);apply();
})();
