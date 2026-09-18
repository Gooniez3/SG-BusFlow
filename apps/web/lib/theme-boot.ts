export const THEME_STORAGE_KEY = "busflow-theme";

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="dark"&&t!=="light")t="light";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.dataset.theme=t;r.style.colorScheme=t;}catch(e){}})();`;
