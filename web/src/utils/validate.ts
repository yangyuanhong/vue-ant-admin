/**
 * @param {string} path
 * @returns {Boolean}
 */
export function isExternal(path: string) { 
  return /^(https?:|mailto:|tel:)/.test(path) 
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function isString(str:string) {
  if (typeof str === 'string') {
    return true
  }
  return false
}

/**
 * @param {Array} arg
 * @returns {Boolean}
 */
export function isArray(arg:any) {
  if (typeof Array.isArray === 'undefined') {
    return Object.prototype.toString.call(arg) === '[object Array]'
  }
  return Array.isArray(arg)
}