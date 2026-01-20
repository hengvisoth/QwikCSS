const CONTAINER_ID = '__qwikcss_root__'
const IFRAME_ID = '__qwikcss_iframe__'
const PANEL_HEIGHT = 280

function mountPanel() {
  if (document.getElementById(CONTAINER_ID)) return

  const container = document.createElement('div')
  container.id = CONTAINER_ID
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.right = '0'
  container.style.bottom = '0'
  container.style.height = `${PANEL_HEIGHT}px`
  container.style.zIndex = '2147483647'
  container.style.background = 'transparent'

  const iframe = document.createElement('iframe')
  iframe.id = IFRAME_ID
  iframe.src = chrome.runtime.getURL('src/ui/panel.html')
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  iframe.style.boxShadow = '0 -8px 24px rgba(0,0,0,0.15)'
  iframe.style.background = 'white'

  container.appendChild(iframe)
  document.documentElement.appendChild(container)
}

function unmountPanel() {
  document.getElementById(CONTAINER_ID)?.remove()
}

// basic messaging from iframe -> page
window.addEventListener('message', (e) => {
if (e?.data?.type === 'QWIKCSS_CLOSE') unmountPanel()
})

mountPanel()
