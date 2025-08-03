const crypto = require('crypto');

class AuthUtils {
  static createSignature(timestamp, method, requestPath, body, secret) {
    const prehash = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', secret).update(prehash).digest('base64');
  }
  
  static getTimestamp() {
    return Date.now() / 1000;
  }
  
  static createAuthHeaders(config) {
    const timestamp = this.getTimestamp();
    const method = 'GET';
    const requestPath = '/users/self/verify';
    const body = '';
    
    const signature = this.createSignature(timestamp, method, requestPath, body, config.api.secret);
    
    return {
      'OK-ACCESS-KEY': config.api.key,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': config.api.passphrase
    };
  }
}

module.exports = AuthUtils;