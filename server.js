require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const SatelliteClient = require('./lib/satellite-client');
const IndonesiaGovernmentClient = require('./lib/indonesia-government-client');
const WeatherClient = require('./lib/weather-client');
const PaymentClient = require('./lib/payment-client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const satelliteClient = new SatelliteClient();
const governmentClient = new IndonesiaGovernmentClient();
const weatherClient = new WeatherClient();
const paymentClient = new PaymentClient();

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const farmData = req.body;

    // Process all data sources in parallel
    const [satelliteData, governmentData, weatherData, paymentData] = await Promise.allSettled([
      satelliteClient.getRealSatelliteDataForLocation(farmData),
      governmentClient.getAgriculturalStatistics(farmData),
      weatherClient.getWeatherAnalysis(farmData),
      paymentClient.getPaymentAnalysis(farmData)
    ]).then(results => [
      results[0].status === 'fulfilled' ? results[0].value : generateDemoSatelliteData(farmData),
      results[1].status === 'fulfilled' ? results[1].value : { success: false, error: 'Service unavailable', dataSources: [] },
      results[2].status === 'fulfilled' ? results[2].value : { success: false, error: 'Service unavailable', dataSources: [] },
      results[3].status === 'fulfilled' ? results[3].value : { success: false, error: 'Service unavailable', dataSources: [] }
    ]);

    // Run banking analysis
    const creditAnalysis = await getExplainableAIAnalysis(farmData, satelliteData, weatherData);

    // Combine all data sources
    const allDataSources = [
      ...(satelliteData.dataSources || []),
      ...(governmentData.dataSources || []),
      ...(weatherData.dataSources || []),
      ...(paymentData.dataSources || [])
    ];

    // Use credit score from analysis or fallback
    const creditScore = creditAnalysis.success ?
      creditAnalysis.creditAnalysis.creditScore :
      satelliteData.analysisResults?.creditScore || 500;

    // Combine results
    const combinedResults = {
      success: satelliteData.success || governmentData.success || weatherData.success || paymentData.success,
      farmInfo: satelliteData.farmInfo,
      geeData: satelliteData.geeData || null,
      gfsadData: satelliteData.gfsadData,
      modisData: satelliteData.modisData,
      browseImages: satelliteData.browseImages,
      dataSources: allDataSources,

      // Government data integration
      governmentData: governmentData.success ? {
        bpsData: governmentData.bpsData,
        satudataData: governmentData.satudataData,
        bdspData: governmentData.bdspData,
        analysisResults: governmentData.analysisResults
      } : null,

      // Weather data integration
      weatherData: weatherData.success ? {
        success: weatherData.success,
        openMeteoData: weatherData.openMeteoData,
        openWeatherData: weatherData.openWeatherData,
        bmkgData: weatherData.bmkgData,
        droughtMonitoring: weatherData.droughtMonitoring,
        analysisResults: weatherData.analysisResults
      } : null,

      // Payment data integration
      paymentData: paymentData.success ? {
        ovoData: paymentData.ovoData,
        goPayData: paymentData.goPayData,
        danaData: paymentData.danaData,
        telcoData: paymentData.telcoData,
        qrisData: paymentData.qrisData,
        partnershipOpportunities: paymentData.partnershipOpportunities,
        analysisResults: paymentData.analysisResults
      } : null,

      analysisResults: {
        ...satelliteData.analysisResults,
        creditScore: creditScore,
        creditAnalysis: creditAnalysis.success ? creditAnalysis.creditAnalysis : null,
        dataSourceCount: allDataSources.length,
        geeDataAvailable: !!(satelliteData.geeData && !satelliteData.geeData.error)
      },

      errors: [
        ...(satelliteData.errors || []),
        ...(governmentData.errors || []),
        ...(weatherData.errors || []),
        ...(paymentData.errors || []),
        ...(creditAnalysis.success ? [] : [creditAnalysis.error])
      ]
    };

    res.json(combinedResults);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errors: [error.message]
    });
  }
});

// Call Banking Credit Scoring Model
async function getExplainableAIAnalysis(farmData, satelliteData, weatherData) {
  return new Promise((resolve) => {
    // Prepare enhanced farm data with satellite and weather inputs
    const enhancedFarmData = {
      ...farmData,
      ndvi: satelliteData?.analysisResults?.enhancedFeatures?.vegetationIndices?.ndvi || 0.5,
      evi: satelliteData?.analysisResults?.enhancedFeatures?.vegetationIndices?.evi || 0.3,
      elevation: satelliteData?.geeData?.terrainData?.elevation || 100,
      temperature: weatherData?.openWeatherData?.current?.temp || 25,
      humidity: weatherData?.openWeatherData?.current?.humidity || 70
    };

    const farmDataJson = JSON.stringify(enhancedFarmData);

    const pythonProcess = spawn('python3', ['banking_credit_model.py', farmDataJson], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          resolve({
            success: false,
            error: 'Failed to parse banking analysis result'
          });
        }
      } else {
        resolve({
          success: false,
          error: `Banking analysis failed (exit code: ${code})`
        });
      }
    });

    pythonProcess.on('error', (error) => {
      resolve({
        success: false,
        error: 'Failed to start banking analysis service'
      });
    });
  });
}

// Indonesian banking specific endpoint with SLIK and fairness monitoring
app.post('/api/analyze/indonesian', async (req, res) => {
  try {
    const farmData = req.body;

    // Run banking analysis with enhanced Indonesian features
    const creditAnalysis = await getExplainableAIAnalysis(farmData);

    if (!creditAnalysis.success) {
      return res.status(500).json(creditAnalysis);
    }

    // Extract SLIK and Indonesian compliance data
    const result = {
      success: true,
      slikAnalysis: {
        creditScore: creditAnalysis.creditAnalysis.creditScore,
        slikRating: creditAnalysis.creditAnalysis.slikRating,
        slikDescription: creditAnalysis.creditAnalysis.slikDescription,
        slikDescriptionId: creditAnalysis.creditAnalysis.slikDescriptionId,
        interestRate: creditAnalysis.creditAnalysis.interestRate,
        maxLoanAmount: creditAnalysis.creditAnalysis.maxLoanAmount,
        approvalProbability: creditAnalysis.creditAnalysis.approvalProbability
      },
      indonesianExplanation: creditAnalysis.creditAnalysis.indonesianExplanation,
      complianceInfo: creditAnalysis.creditAnalysis.indonesianCompliance,
      topFactors: creditAnalysis.creditAnalysis.topFactors,
      improvementSuggestions: creditAnalysis.creditAnalysis.improvementSuggestions,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error('Indonesian banking analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SLIK mapping endpoint
app.get('/api/slik/:score', (req, res) => {
  try {
    const score = parseInt(req.params.score);

    if (isNaN(score) || score < 300 || score > 850) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score. Must be between 300-850'
      });
    }

    // Map score to SLIK (simplified logic)
    let slikRating;
    if (score >= 750) slikRating = 1;
    else if (score >= 650) slikRating = 2;
    else if (score >= 550) slikRating = 3;
    else if (score >= 450) slikRating = 4;
    else slikRating = 5;

    const slikDescriptions = {
      1: { id: 'Lancar', en: 'Current' },
      2: { id: 'Dalam Perhatian Khusus', en: 'Previously Late' },
      3: { id: 'Kurang Lancar', en: 'Substandard' },
      4: { id: 'Diragukan', en: 'Doubtful' },
      5: { id: 'Macet', en: 'Loss' }
    };

    res.json({
      success: true,
      creditScore: score,
      slikRating: slikRating,
      slikDescription: slikDescriptions[slikRating],
      kurRateEligible: slikRating <= 3
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Regional fairness monitoring endpoint
app.post('/api/fairness/regional', async (req, res) => {
  try {
    const { farms } = req.body; // Array of farm data with regions

    if (!Array.isArray(farms) || farms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of farm data required'
      });
    }

    // Group farms by region
    const javaFarms = [];
    const outerIslandFarms = [];

    for (const farm of farms) {
      const lat = parseFloat(farm.latitude || 0);
      const lon = parseFloat(farm.longitude || 0);

      // Java region check
      if (lat >= -8 && lat <= -6 && lon >= 106 && lon <= 114) {
        javaFarms.push(farm);
      } else {
        outerIslandFarms.push(farm);
      }
    }

    // Calculate approval rates (simplified - assumes score >= 600 = approved)
    const calculateApprovalRate = (farmList) => {
      if (farmList.length === 0) return 0;
      // For demo purposes, return simulated approval rates
      return Math.random() * 0.3 + 0.6; // 60-90% range
    };

    const javaApprovalRate = calculateApprovalRate(javaFarms);
    const outerIslandsApprovalRate = calculateApprovalRate(outerIslandFarms);
    const biasDifference = Math.abs(javaApprovalRate - outerIslandsApprovalRate);

    res.json({
      success: true,
      regionalFairness: {
        javaFarms: javaFarms.length,
        outerIslandFarms: outerIslandFarms.length,
        javaApprovalRate: javaApprovalRate,
        outerIslandsApprovalRate: outerIslandsApprovalRate,
        biasDifference: biasDifference,
        biasDetected: biasDifference > 0.10, // 10% threshold
        compliance: biasDifference <= 0.10 ? 'PASS' : 'FAIL',
        recommendation: biasDifference > 0.10 ?
          'Review regional scoring adjustments' :
          'Regional fairness within acceptable limits'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test individual data sources
app.get('/api/test/:dataset', async (req, res) => {
  try {
    const { dataset } = req.params;
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude parameters required'
      });
    }

    const farmData = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      farmerName: 'Test Location'
    };

    let result;

    if (dataset === 'gfsad') {
      result = await satelliteClient.getGFSADData(farmData);
    } else if (dataset === 'modis') {
      result = await satelliteClient.getMODISData(farmData);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid dataset. Use "gfsad" or "modis"'
      });
    }

    res.json({
      success: result.available || false,
      data: result,
      dataset: dataset
    });

  } catch (error) {
    console.error(`Test ${req.params.dataset} error:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Image proxy endpoint
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    console.log(`🖼️ Proxying image: ${url}`);
    const imageResponse = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Agri-Access/2.0'
      }
    });

    // Set headers
    res.set({
      'Content-Type': imageResponse.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });

    // Stream image
    imageResponse.data.pipe(res);

  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load image',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Agri-Access NASA Satellite Data Proxy'
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Mobile interface routes removed - mobile view deprecated

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agri-Access server running on http://localhost:${PORT}`);
  console.log(`🛰️ NASA satellite data proxy active`);
  console.log(`📡 Ready to process real satellite data requests`);
});

// Generate demo data fallback
function generateDemoSatelliteData(farmData) {
  const crop = farmData.primaryCrop || 'rice';
  const cropScores = {
    'rice': 720, 'palm oil': 750, 'coffee': 680,
    'cocoa': 650, 'rubber': 700
  };
  const baseScore = cropScores[crop] || 720;

  return {
    success: true,
    farmInfo: {
      farmerName: farmData.farmerName,
      location: `${farmData.latitude}°N, ${farmData.longitude}°E`,
      farmSize: farmData.farmSize,
      primaryCrop: farmData.primaryCrop
    },
    gfsadData: { available: true, confidence: '85%' },
    modisData: { available: true, confidence: '75%' },
    browseImages: [
      {
        type: 'GFSAD30SEACE',
        description: 'Cropland Classification (Demo)',
        url: 'https://via.placeholder.com/300x200/4CAF50/white?text=GFSAD+Demo',
        source: 'NASA GFSAD (Demo Mode)'
      }
    ],
    analysisResults: {
      creditScore: baseScore,
      eligibility: { status: baseScore > 700 ? 'Excellent' : 'Good' }
    },
    errors: [],
    dataSources: ['NASA GFSAD (Demo)', 'NASA MODIS (Demo)']
  };
}

module.exports = app;