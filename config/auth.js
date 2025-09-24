require('dotenv').config();

class NASAAuth {
  constructor() {
    this.token = process.env.NASA_TOKEN;
    this.cmrBaseUrl = process.env.CMR_BASE_URL || 'https://cmr.earthdata.nasa.gov';
    this.earthdataBaseUrl = process.env.EARTHDATA_BASE_URL || 'https://search.earthdata.nasa.gov';
  }

  getAuthHeaders() {
    if (!this.token) {
      throw new Error('NASA_TOKEN not found in environment variables');
    }
    
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NASA-Earthdata-Prototype/1.0'
    };
  }

  getCMREndpoint(endpoint) {
    return `${this.cmrBaseUrl}${endpoint}`;
  }

  getEarthdataEndpoint(endpoint) {
    return `${this.earthdataBaseUrl}${endpoint}`;
  }

  isTokenValid() {
    if (!this.token) return false;
    
    try {
      const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error validating token:', error.message);
      return false;
    }
  }

  getTokenInfo() {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
      return {
        userId: payload.uid,
        issuer: payload.iss,
        expirationDate: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        isValid: payload.exp > Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      console.error('Error parsing token:', error.message);
      return null;
    }
  }
}

module.exports = NASAAuth;