# Agri-Access File Structure

**Hackathon Deliverable Structure**

## Root Directory
```
agri-access/
├── README.md               # 🏆 Main hackathon presentation
├── DEVELOPER_README.md     # 🔧 Setup guide for judges
├── requirements.txt        # 📦 Python dependencies
├── index.html              # 🌐 Web interface
├── app.js                  # 🎛️ Frontend logic
├── basel_iii_api.py       # 🚀 Flask API server
├── banking_credit_model.py # 🤖 ML model & Basel III
├── styles.css             # 🎨 Main styling
├── shared.css             # 🎨 Common styles
├── shared.js              # 🔧 Shared utilities
├── credit-score-arc.js    # 📊 Credit score visualization
├── shap-visualization.js  # 📈 SHAP waterfall charts
├── docs/                  # 📚 Technical documentation
└── references/            # 📋 Background materials
```

## Core Components

### Frontend (Web Interface)
- **index.html**: Main application interface
- **app.js**: Core application logic, satellite integration, API calls
- **styles.css**: UI styling and responsive design
- **shared.css**: Common styling components
- **shared.js**: Utility functions

### Backend (API Server)
- **basel_iii_api.py**: Flask server with ML pipeline integration
- **banking_credit_model.py**: Random Forest model and Basel III calculations

### Visualizations
- **credit-score-arc.js**: D3.js credit score arc component
- **shap-visualization.js**: SHAP waterfall chart component

### Documentation
- **README.md**: Hackathon presentation focused on policy impact
- **DEVELOPER_README.md**: Technical setup guide for judges
- **docs/README.md**: Comprehensive technical documentation
- **requirements.txt**: Python package dependencies

### Reference Materials
- **references/**: Background research and policy documents

## Key Features

### 1. Satellite Data Integration (app.js)
- 6 real-time satellite data sources
- Image URL generation and processing
- Feature extraction from satellite tiles

### 2. Machine Learning Pipeline (basel_iii_api.py)
- Random Forest multi-target prediction
- SHAP explainability integration
- Basel III calculations (PD, LGD, EAD, ECL)

### 3. Indonesian Banking Compliance
- SLIK credit scale conversion (1-5 system)
- OJK 29/2024 alternative credit scoring
- NPL risk integration

### 4. Interactive Visualizations
- Credit score arc with risk rating
- SHAP waterfall charts for transparency
- Satellite imagery grid display

## Dependencies

### Python Backend
```
flask==2.3.3
flask-cors==4.0.0
numpy==1.24.3
scikit-learn==1.3.0
```

### Frontend Libraries (CDN)
- Leaflet.js (mapping)
- D3.js (visualizations)
- Standard HTML/CSS/JavaScript

## API Endpoints

### Core APIs
- `POST /api/analyze`: Main credit analysis
- `GET /api/model-status`: ML model health check
- `GET /api/test`: Basic connectivity test

### Static Files
- `/`: Serves index.html
- `/<filename>`: Serves static assets (CSS, JS, etc.)

## Data Flow

```
User Input → Frontend (app.js) → API (basel_iii_api.py) → ML Model → Basel III → Response
    ↓              ↓                     ↓                  ↓           ↓          ↓
Farm Data → Satellite URLs → Feature Extraction → RF Prediction → Risk Calc → SHAP + Display
```

## Performance

- **Response Time**: 3-5 seconds for complete analysis
- **Memory Usage**: ~150MB baseline, 300MB under load
- **Dependencies**: Python 3.8+, 2GB RAM minimum
- **Network**: Internet required for satellite tile services

---

**Ready for Hackathon Demo** | **Production Architecture** | **Banking Compliant**