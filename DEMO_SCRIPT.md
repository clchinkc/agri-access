# Agri-Access Technical Demo Script (3-4 minutes)

## Demo Setup (10 seconds)
"Let me demonstrate our functional prototype using real Indonesian farm data: Indramayu rice farmer at -6.3276, 108.3249."

## Live Processing Demo (80 seconds)
"When I click 'Analyze Credit Risk', watch the real-time execution. NASA satellite imagery loads - you can see the actual tiles. The Prithvi foundation model extracts agricultural features from multiple spectral bands. OpenWeatherMap provides live weather data for this exact location.

Our machine learning approach combines Random Forest for stability with XGBoost for accuracy. The ensemble processes satellite features, weather patterns, and farm characteristics to predict credit risk. Processing completes in under 5 seconds with results: Credit score 685, default probability 3.24%."

## SHAP Explainability Focus (70 seconds)
"The key technical innovation is our explainability system using SHAP TreeExplainer. Watch this waterfall chart - it shows exactly how each factor influenced the credit decision. The baseline model prediction is 0.6364, representing a 650 credit score. Farm size contributed positively, adding 0.23 normalized impact. Weather conditions had mixed impacts - temperature helped, but humidity created negative risk.

Our ensemble uses Random Forest for stability and XGBoost for accuracy, with 70%-30% weighting. We process 320 features simultaneously - 256 from Prithvi satellite analysis, 64 from weather data. The SHAP values are normalized to 0-1 scale for consistent interpretation. Banks can see that satellite-derived vegetation indices were the strongest positive factors, while certain weather patterns increased risk. This transparency meets Basel III and Indonesian OJK 29/2024 requirements."

## Technical Robustness (20 seconds)
"The system handles real-world challenges: when APIs fail, we fallback to climate models. When satellite data is unavailable, synthetic features maintain predictions. All results are deterministic and reproducible for audit compliance."

---

## Timing Breakdown
- **Demo Setup**: 0:00-0:10
- **Live Processing**: 0:10-1:30
- **SHAP Explainability**: 1:30-2:40
- **Technical Robustness**: 2:40-3:00

## Key Points for Q&A
- **Why Random Forest + XGBoost?** RF provides stability, XGBoost adds accuracy
- **SHAP implementation?** TreeExplainer for exact feature attributions
- **Fallback strategy?** Graceful degradation maintains service availability
- **Real-time performance?** Sub-5-second processing with live API calls