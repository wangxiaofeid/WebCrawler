function isImage(url = '') {
  return url.endsWith('jpg') || url.endsWith('png') || url.endsWith('jpeg') || url.endsWith('gif') || url.endsWith('webp')
}

function isFont(url = '') {
  return url.endsWith('svg') || url.endsWith('eot') || url.endsWith('woff') || url.endsWith('woff2') || url.endsWith('ttf') || url.endsWith('TTF') || url.endsWith('otf') || url.endsWith('OTF')
}

function isCss(url = '') {
  return url.endsWith('css')
}

function isJs(url = '') {
  return url.endsWith('js')
}

function getType(url = '') {
  if (isImage(url)) {
    return 'img'
  }
  if (isFont(url)) {
    return 'fonts'
  }
  if (isCss(url)) {
    return 'css'
  }
  if (isJs(url)) {
    return 'js'
  }
  return ''
}

export default {
  isImage,
  isFont,
  isCss,
  isJs,
  getType
};