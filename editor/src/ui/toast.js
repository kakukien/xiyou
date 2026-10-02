// 轻量 toast：右下角浮条，2.6s 自动消失
export function toast(text) {
  const el = document.createElement('div');
  el.className = 'story-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 2600);
}

// 复制到剪贴板：clipboard API 失败时退回 execCommand，全程不弹原生框
export async function copyText(text, okText = '已复制') {
  try {
    await navigator.clipboard.writeText(text);
    toast(okText);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(okText);
      return true;
    } catch {
      toast('复制失败，请手动复制地址栏链接');
      return false;
    }
  }
}
