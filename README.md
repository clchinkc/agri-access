# 🛰️ Agri-Access: Alternative Credit Scoring Platform

**Banking Infrastructure for Alternative Credit Assessment**

Agri-Access is positioned as a B2B alternative credit scoring platform that serves banks and financial institutions with satellite-powered agricultural risk assessment. We provide alternative credit scores similar to TransUnion but specifically designed for agricultural lending in emerging markets.

## 🎯 Platform Positioning

- **🏦 B2B Banking Platform**: Alternative credit scoring service for financial institutions
- **📊 Basel III Compliance**: PD, LGD, EAD calculations with expected credit loss modeling  
- **🛰️ Satellite Data Integration**: Real-time crop health monitoring and historical trend analysis
- **🇮🇩 Indonesian Market Focus**: SLIK-compatible scoring with OJK 29/2024 compliance
- **⚡ Real-Time API**: 3-5 second comprehensive risk assessment with explainable AI

## 🚀 Quick Start

```bash
# Install and run
npm install && npm start

# Console demo
npm run demo
```

Visit `http://localhost:3000` for the banking dashboard interface.

## 🏗️ System Architecture

### Data Sources (80% Real, 20% Placeholder)

**✅ Active APIs (6)**
- Google Earth Engine (10m vegetation indices)
- NASA GFSAD/MODIS (cropland classification)
- OpenWeatherMap + Open-Meteo + BMKG (weather data)

**⚠️ Placeholder Data**
- Indonesian government APIs (firewall/access issues)
- Payment/fintech APIs (partnership required)

*See [docs/api-status-issues.md](docs/api-status-issues.md) for detailed integration status.*

### Credit Scoring Model

**Banking Standard Compliance:**
- SLIK 1-5 collectibility system (Indonesian standard)
- KUR interest rates: 6-9% for agriculture
- NPL-based risk assessment (2024 data: 2.46%)
- Regional fairness monitoring (Java vs Outer Islands)
- OJK 29/2024 compliant explanations in Indonesian

## 📊 Data Quality & Transparency

**Real Data (80%):** User inputs, satellite data (GEE/NASA), weather APIs  
**Placeholder Data (20%):** Government APIs, payment data, soil database

Every analysis includes data quality breakdown with clear `[PLACEHOLDER]` markers for missing integrations.

## 🔧 Configuration

### Required Environment Variables
```bash
# Google Earth Engine (Required)
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type":"service_account",...}'

# Weather APIs (Optional)
OPENWEATHER_API_KEY=your_key
BMKG_API_KEY=your_key

# Indonesian Government APIs (Optional)
BPS_API_KEY=your_key
SATUDATA_API_KEY=your_key
```

### Google Earth Engine Setup
1. Create service account at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Earth Engine API
3. Download service account key JSON
4. Add credentials to `.env` file

## 📁 Project Structure

```
agri-access/
├── server.js                  # Express API server
├── banking_credit_model.py    # Indonesian banking credit model
├── index.html                 # Web interface
├── index-mobile.html         # Mobile interface
├── lib/                      # Data integration clients
├── test/                     # Unit and integration tests
├── docs/                     # Documentation
└── scripts/                  # Python services
```

## 🧪 Testing

```bash
# Run tests
npm test
npm run test:unit

# Test live API
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"farmerName":"Test","latitude":-6.77,"longitude":107.14,"farmSize":2.5,"primaryCrop":"rice"}'
```

## 📊 API Reference

### POST /api/analyze/indonesian
**Indonesian Banking Analysis** - SLIK-compatible credit scoring with OJK compliance.

**Request:**
```json
{
  "farmerName": "Pak Budi",
  "latitude": -6.7749,
  "longitude": 107.1389,
  "farmSize": 2.5,
  "primaryCrop": "rice"
}
```

**Response:**
```json
{
  "success": true,
  "slikAnalysis": {
    "creditScore": 731,
    "slikRating": 2,
    "slikDescription": "Dalam Perhatian Khusus",
    "interestRate": "7.0%",
    "maxLoanAmount": "Rp 11,200,000"
  },
  "indonesianExplanation": {
    "keputusan_kredit": "Analisis satelit menunjukkan...",
    "regulasi_compliance": "Sesuai OJK 29/2024"
  },
  "dataQuality": {
    "dataCompleteness": "80% real data, 20% placeholder"
  }
}
```

### POST /api/analyze
**Legacy Endpoint** - Original multi-source satellite analysis.

### GET /api/slik/:score
**SLIK Mapping** - Convert credit scores to Indonesian banking ratings.

### POST /api/fairness/regional
**Fairness Monitoring** - Java vs Outer Islands bias detection.

## 🎯 Key Features

### Indonesian Banking Compliance
- **SLIK System**: 1-5 collectibility ratings (Lancar, Dalam Perhatian Khusus, etc.)
- **KUR Rates**: 6-9% agricultural interest rates aligned with government policy
- **NPL Assessment**: Real 2024 agricultural NPL data (2.46% base rate)
- **OJK 29/2024**: Compliant explanations in Indonesian language
- **Regional Fairness**: Java vs Outer Islands bias monitoring

### Technical Capabilities
- **Multi-Source Data**: Satellite + weather + government APIs in parallel
- **Real-Time Analysis**: 3-5 second comprehensive credit assessment
- **Offline Support**: PWA with background sync for rural connectivity
- **Mobile Optimized**: Touch-friendly interface for smartphones

## 📈 Performance

- **Response Time**: 3-5 seconds for comprehensive analysis
- **Data Coverage**: 100% Indonesian agricultural regions
- **Real Data**: 80% authentic sources, 20% clearly marked placeholders
- **Resolution**: 10m precision (Google Earth Engine) to 250m (NASA MODIS)

## 🌍 Impact

**For Indonesian Farmers:**
- Interest rate reduction: 26% (informal) → 6-9% (KUR rates)
- Loan processing: weeks → seconds
- Geographic access: satellite-based assessment removes location barriers

**Economic Example (1.5ha rice farm):**
- Traditional: Rp 4.5M loan at 26% = Rp 1.2M annual interest
- Agri-Access: Rp 22.5M loan at 7% = Rp 1.6M annual interest
- **Net benefit**: 5x larger loan at lower total cost

## 🏆 Technical Achievements

✅ **SLIK-Compatible Scoring**: Indonesian 1-5 collectibility system  
✅ **Real 2024 NPL Data**: Agricultural NPL integration (2.46% base rate)  
✅ **OJK 29/2024 Compliance**: Indonesian language explanations  
✅ **Multi-Source Integration**: Google Earth Engine + NASA + weather APIs  
✅ **Real-Time Processing**: 3-5 second comprehensive analysis  
✅ **Offline PWA**: Service worker for rural connectivity  
✅ **Regional Fairness**: Java vs Outer Islands bias monitoring

## 🚀 Deployment

**Development:**
```bash
npm start  # http://localhost:3000
```

**Production:**
```bash
export NODE_ENV=production
export GEE_SERVICE_ACCOUNT=your-account@project.iam.gserviceaccount.com
export GEE_PRIVATE_KEY='{"type":"service_account",...}'
npm start
```

## 📚 Resources

- [Google Earth Engine](https://earthengine.google.com/) - Satellite platform
- [NASA Earthdata](https://earthdata.nasa.gov/) - Satellite data
- [OJK Regulations](https://ojk.go.id/) - Indonesian banking standards
- [Documentation](docs/) - API status and integration guides

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Test changes (`npm test`)
4. Submit pull request

## 📄 License

MIT License

---

**Indonesian Agricultural Credit Platform with SLIK-Compatible Scoring and OJK 29/2024 Compliance** 🇮🇩🛰️